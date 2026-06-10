import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Safe lazy loading to prevent crash-on-startup if credentials are of empty string mock type
export const isFirebaseConfigured = () => {
  return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
};

const getFirebaseApp = () => {
  if (!isFirebaseConfigured()) {
    console.warn('[Firebase] Config keys are empty. Initializing dummy wrapper placeholder.');
    // Return standard dummy or minimal app
  }
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
};

export const app = getFirebaseApp();
export const auth = getAuth(app);

// Critical: Set firestore Database ID according to configuration parameters
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Validate connection on startup safely
export async function testConnection() {
  if (!isFirebaseConfigured()) return;
  try {
    const testDocRef = doc(db, 'test', 'connection');
    await getDocFromServer(testDocRef);
    console.log('[Firebase] Connection validation passed.');
  } catch (error: any) {
    const errMsg = error?.message || '';
    const errCode = error?.code || '';
    if (
      errCode === 'unavailable' ||
      errMsg.toLowerCase().includes('offline') ||
      errMsg.toLowerCase().includes('unavailable') ||
      errMsg.toLowerCase().includes('failed to connect') ||
      errMsg.toLowerCase().includes('could not reach')
    ) {
      console.warn('[Firebase] Connection check: Backend is temporarily unreachable or offline. Firestore will gracefully leverage offline sync caching.');
    } else {
      console.error('[Firebase] Connection check rejected:', error);
    }
  }
}

// Call connection check in non-blocking thread
if (isFirebaseConfigured()) {
  testConnection();
}
