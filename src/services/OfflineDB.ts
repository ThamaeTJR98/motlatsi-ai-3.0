
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { GradeRecord, ScheduleSlot, UserState } from '../types';

interface MotlatsiDB extends DBSchema {
  system: {
    key: string;
    value: any;
  };
  activity_logs: {
    key: string;
    value: GradeRecord;
    indexes: { 'by-date': string };
  };
  schedule: {
    key: string;
    value: ScheduleSlot;
  };
  sync_queue: {
    key: number;
    value: { type: string; payload: any; timestamp: number; retries: number };
    autoIncrement: true;
  };
  assets: {
    key: string;
    value: { blob: Blob; mimeType: string; timestamp: number };
  };
}

const DB_NAME = 'motlatsi_db';
const DB_VERSION = 1;

class OfflineStorageService {
  private dbPromise: Promise<IDBPDatabase<MotlatsiDB>>;

  constructor() {
    this.dbPromise = openDB<MotlatsiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // System store for random key-values (settings, user profile cache)
        if (!db.objectStoreNames.contains('system')) {
          db.createObjectStore('system');
        }
        
        // Activity Logs (Quiz results, etc)
        if (!db.objectStoreNames.contains('activity_logs')) {
          const store = db.createObjectStore('activity_logs', { keyPath: 'id' });
          store.createIndex('by-date', 'date');
        }

        // Schedule
        if (!db.objectStoreNames.contains('schedule')) {
          db.createObjectStore('schedule', { keyPath: 'id' });
        }

        // Sync Queue (The Outbox)
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'key', autoIncrement: true });
        }

        // Assets (Images/Audio blobs)
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets');
        }
      },
    });
  }

  // --- System/User ---
  async saveUser(user: UserState) {
    return (await this.dbPromise).put('system', user, 'user_profile');
  }

  async getUser(): Promise<UserState | undefined> {
    return (await this.dbPromise).get('system', 'user_profile');
  }

  // --- Activity Logs ---
  async logActivity(record: GradeRecord) {
    const db = await this.dbPromise;
    await db.put('activity_logs', record);
    // Add to sync queue automatically
    await this.addToSyncQueue('LOG_ACTIVITY', record);
  }

  async getRecentActivity(limit = 50): Promise<GradeRecord[]> {
    const db = await this.dbPromise;
    const all = await db.getAllFromIndex('activity_logs', 'by-date');
    return all.reverse().slice(0, limit);
  }

  // --- Schedule ---
  async saveSchedule(slots: ScheduleSlot[]) {
    const db = await this.dbPromise;
    const tx = db.transaction('schedule', 'readwrite');
    // Clear old schedule first (simple strategy)
    await tx.store.clear();
    await Promise.all(slots.map(slot => tx.store.put(slot)));
    await tx.done;
  }

  async getSchedule(): Promise<ScheduleSlot[]> {
    return (await this.dbPromise).getAll('schedule');
  }

// --- Sync Queue (The "Outbox") ---
  async addToSyncQueue(type: string, payload: any) {
    const item = { type, payload, timestamp: Date.now(), retries: 0 };
    const key = await (await this.dbPromise).add('sync_queue', item);
    this.notifyStatusListeners();
    // Trigger sync run immediately if online
    this.triggerSync();
    return key;
  }

  async getSyncQueue() {
    const db = await this.dbPromise;
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const items = [];
    let cursor = await store.openCursor();
    while (cursor) {
      items.push({ ...cursor.value, key: cursor.key });
      cursor = cursor.continue();
    }
    return items;
  }

  async removeFromQueue(key: number) {
    const db = await this.dbPromise;
    await db.delete('sync_queue', key);
    this.notifyStatusListeners();
  }

  // --- RxDB/PouchDB-Style Automatic Background Synchronization Engine ---
  private statusListeners: Array<(status: { online: boolean; pendingCount: number; syncing: boolean }) => void> = [];
  private isSyncing = false;
  private syncTimer: any = null;

  public registerSyncStatusListener(cb: (status: { online: boolean; pendingCount: number; syncing: boolean }) => void) {
    this.statusListeners.push(cb);
    // Initial call
    this.getPendingCount().then(count => {
      cb({ online: navigator.onLine, pendingCount: count, syncing: this.isSyncing });
    });
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== cb);
    };
  }

  private async notifyStatusListeners() {
    const count = await this.getPendingCount();
    const isOnline = navigator.onLine;
    this.statusListeners.forEach(cb => {
      cb({ online: isOnline, pendingCount: count, syncing: this.isSyncing });
    });
  }

  public async getPendingCount(): Promise<number> {
    try {
      const db = await this.dbPromise;
      return await db.count('sync_queue');
    } catch {
      return 0;
    }
  }

  public startAutoSyncWorker() {
    if (this.syncTimer) return;

    // Listen to network state switches
    window.addEventListener('online', () => {
      console.log('[OfflineDB Sync Worker] Network Restored. Re-triggering chunked queue upload.');
      this.notifyStatusListeners();
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineDB Sync Worker] Connection Dropped. Retaining items in local DB outbox.');
      this.notifyStatusListeners();
    });

    // Run continuous cycle every 15 seconds to sync chunks
    this.syncTimer = setInterval(() => {
      this.triggerSync();
    }, 15000);

    // Run initial cycle
    this.triggerSync();
  }

  public async triggerSync() {
    if (this.isSyncing || !navigator.onLine) {
      return;
    }

    const count = await this.getPendingCount();
    if (count === 0) return;

    this.isSyncing = true;
    this.notifyStatusListeners();

    try {
      await this.processQueueInChunks();
    } catch (e) {
      console.warn('[OfflineDB Sync Worker] Sync pass aborted:', e);
    } finally {
      this.isSyncing = false;
      this.notifyStatusListeners();
    }
  }

  private async processQueueInChunks() {
    const CHUNK_SIZE = 5; // Chunked upload limits cellular packet overload
    const db = await this.dbPromise;
    const allQueueItems = await this.getSyncQueue();
    
    if (allQueueItems.length === 0) return;

    // Take the first chunk (up to 5 items)
    const chunk = allQueueItems.slice(0, CHUNK_SIZE);
    console.log(`[OfflineDB Sync Worker] Uploading chunk of ${chunk.length} items out of ${allQueueItems.length} total queued.`);

    try {
      const { supabase } = await import('../lib/supabase');
      
      for (const item of chunk) {
        let success = false;
        
        try {
          if (item.type === 'LOG_ACTIVITY') {
            const act = item.payload;
            const { error } = await supabase
              .from('student_activity')
              .insert([{
                student_id: act.studentId,
                topic_id: act.topicId || act.itemId || 'unknown',
                activity_type: act.type,
                score: act.score,
                created_at: act.date || new Date().toISOString()
              }]);

            if (!error) success = true;
            else console.error('[OfflineDB Sync Worker] Supabase activity save error:', error);
          } else if (item.type === 'UPDATE_CONSTRAINTS') {
            // Simulated syncing other configuration state
            success = true; 
          } else if (item.type === 'SYNC_SCHEDULE_SLOTS') {
            const slots = item.payload;
            // Clear and overwrite teacher slots on table
            const { error } = await supabase
              .from('schedules')
              .upsert(slots.map((s: any) => ({
                id: s.id,
                teacher_id: s.teacherId,
                subject: s.subject,
                type: s.type,
                notes: s.notes || '',
                is_auto_generated: s.autoGenerated || false,
                linked_topic_id: s.linkedTopicId || null
              })));
            if (!error) success = true;
            else console.error('[OfflineDB Sync Worker] Supabase schedules save error:', error);
          } else {
            // Unhandled custom types get safe bypass
            success = true;
          }
        } catch (singleItemError) {
          console.error('[OfflineDB Sync Worker] Single item sync crash:', singleItemError);
        }

        if (success) {
          // Successfully transmitted; clear from IndexedDB outbox
          await this.removeFromQueue(item.key);
        } else {
          // Sync failure: Increment retry counter with backoff
          const tx = db.transaction('sync_queue', 'readwrite');
          const store = tx.objectStore('sync_queue');
          const currentItem = await store.get(item.key);
          if (currentItem) {
            currentItem.retries = (currentItem.retries || 0) + 1;
            // Max out retries at 15 for safety, else purge
            if (currentItem.retries > 15) {
              console.warn('[OfflineDB Sync Worker] Max retries reached for key. Purging item:', item.key);
              await store.delete(item.key);
            } else {
              await store.put(currentItem, item.key);
            }
          }
          await tx.done;
        }
      }

      // Check if more items exist. If yes, trigger next cycle soon
      const remainingCount = await this.getPendingCount();
      if (remainingCount > 0) {
        setTimeout(() => this.triggerSync(), 1000);
      }
    } catch (importOrSupabaseErr) {
      console.warn('[OfflineDB Sync Worker] Transit error (Supabase unreachable). Waiting for next cycle.', importOrSupabaseErr);
    }
  }

  // --- Assets (The "Cache") ---
  async saveAsset(id: string, blob: Blob) {
    return (await this.dbPromise).put('assets', { 
        blob, 
        mimeType: blob.type, 
        timestamp: Date.now() 
    }, id);
  }

  async getAsset(id: string): Promise<string | null> {
    const entry = await (await this.dbPromise).get('assets', id);
    if (!entry) return null;
    return URL.createObjectURL(entry.blob);
  }
}

export const OfflineDB = new OfflineStorageService();
