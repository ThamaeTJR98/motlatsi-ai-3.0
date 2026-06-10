
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserState, GradeRecord, ScheduleSlot, StudentNotification, TermConfig, StudyConstraints, TopicStatus, Topic } from '../types';
import { allGrades } from '../curriculum';
import { aiClient } from '../utils/aiClient';
import { useAuth } from './AuthContext';
import { OfflineDB } from '../services/OfflineDB';

// --- Types ---

interface AcademicStatus {
    totalTopics: number;
    completedTopics: number;
    masteryScore: number; // 0-100
    pacerStatus: 'ahead' | 'on-track' | 'behind';
    daysUntilTermEnd: number;
    projectedCompletionDate: string;
}

interface LearningEngineContextType {
    // State
    academicStatus: AcademicStatus;
    schedule: ScheduleSlot[];
    recentActivity: GradeRecord[];
    termConfig: TermConfig;
    studyConstraints: StudyConstraints;
    downloadProgress: { isDownloading: boolean; progress: number; total: number };
    lastSynced: string | null;
    isInitialized: boolean;
    learningProfile: string; 
    
    // Actions
    processGameResult: (topicId: string, xpEarned: number, topicTitle: string) => Promise<void>;
    processQuizResult: (topicId: string, score: number, total: number, topicTitle: string, masteredObjectives?: string[]) => Promise<void>;
    refreshSchedule: () => void;
    generateDailyPlan: () => void;
    downloadTermContent: () => Promise<void>;
    updateConstraints: (constraints: StudyConstraints) => void;
    getTopicStatus: (topicId: string, prerequisites?: string[]) => TopicStatus;
    updateLearningProfile: (notes: string) => void;
}

const LearningEngineContext = createContext<LearningEngineContextType | undefined>(undefined);

export const LearningEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, updateUser } = useAuth();
    const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
    const [recentActivity, setRecentActivity] = useState<GradeRecord[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [learningProfile, setLearningProfile] = useState(""); 

    // Default Term: Lesotho Schools
    const [termConfig, setTermConfig] = useState<TermConfig>({
        id: 'term-1-2024',
        name: 'Term 1',
        startDate: '2024-01-15',
        endDate: '2024-04-15',
        isActive: true
    });

    const [studyConstraints, setStudyConstraints] = useState<StudyConstraints>({
        preferredDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        maxHoursPerDay: 2,
        focusSubjects: ["Mathematics", "Science"],
        schoolStart: "08:00",
        schoolEnd: "15:30",
        preferredStudyStart: "16:00",
        preferredStudyEnd: "18:00",
        studyDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        masterSchedule: {
            'Mon': { '08:00': 'Mathematics', '09:00': 'English', '10:00': 'Science', '11:00': 'Sesotho', '12:00': 'Social Studies' },
            'Tue': { '08:00': 'Science', '09:00': 'Mathematics', '10:00': 'English', '11:00': 'Life Skills', '12:00': 'Arts' },
            'Wed': { '08:00': 'English', '09:00': 'Sesotho', '10:00': 'Mathematics', '11:00': 'Science', '12:00': 'PE' },
            'Thu': { '08:00': 'Mathematics', '09:00': 'Social Studies', '10:00': 'English', '11:00': 'Science', '12:00': 'Sesotho' },
            'Fri': { '08:00': 'Life Skills', '09:00': 'Arts', '10:00': 'Mathematics', '11:00': 'English', '12:00': 'Sports' }
        }
    });

    const [downloadProgress, setDownloadProgress] = useState({ isDownloading: false, progress: 0, total: 0 });
    const [lastSynced, setLastSynced] = useState<string | null>(null);

    const [academicStatus, setAcademicStatus] = useState<AcademicStatus>({
        totalTopics: 0,
        completedTopics: 0,
        masteryScore: 0,
        pacerStatus: 'on-track',
        daysUntilTermEnd: 90,
        projectedCompletionDate: ''
    });

    // Sync student progress to Firestore
    const syncStudentProgressToFirestore = async (userId: string, currentLogs: GradeRecord[]) => {
        try {
            const { isFirebaseConfigured, db } = await import('../lib/firebase');
            if (!isFirebaseConfigured()) return;

            const { doc, setDoc } = await import('firebase/firestore');
            
            // Backup document in Firestore
            const backupRef = doc(db, 'profiles', userId);
            
            console.log(`[Firestore Sync] Backing up activity logs for user ${userId} to Firestore...`);
            
            // Backup profiles metadata (XP, Level)
            await setDoc(backupRef, {
                id: userId,
                name: user?.name || 'Student',
                role: user?.role || 'student',
                xp: user?.xp || 0,
                level: user?.level || 1,
                current_grade: user?.currentGrade || '1',
                email: user?.email || '',
                updated_at: new Date().toISOString()
            }, { merge: true });

            // Write each recent record to 'activity_logs' collection in Firestore
            for (const log of currentLogs.slice(0, 10)) {
                const logRef = doc(db, 'activity_logs', `${userId}_${log.id}`);
                await setDoc(logRef, {
                    id: log.id,
                    user_id: userId,
                    action_type: log.type || 'quiz',
                    details: {
                        itemId: log.itemId,
                        itemTitle: log.itemTitle,
                        score: log.score,
                        total: log.total,
                        date: log.date,
                        topicId: log.topicId || ''
                    },
                    created_at: log.date || new Date().toISOString()
                }, { merge: true });
            }

            console.log('[Firestore Sync] Backup completed successfully.');
            setLastSynced(new Date().toISOString());
        } catch (err) {
            console.error('[Firestore Sync] Failed to back up student activity logs:', err);
        }
    };

    // --- 1. Initialization: Data Separation Logic ---
    useEffect(() => {
        const initEngine = async () => {
            if (!user) {
                setSchedule([]);
                setRecentActivity([]);
                setIsInitialized(false);
                return;
            }

            let loadedActivity: GradeRecord[] = [];
            let loadedSchedule: ScheduleSlot[] = [];

            if (user.isDemo) {
                // Load demo data from localStorage
                const seedLogs = localStorage.getItem('motlatsi_activity_log');
                if (seedLogs) {
                    try { loadedActivity = JSON.parse(seedLogs); } catch (e) { console.error("Error parsing seed logs", e); }
                }

                const seedSchedule = localStorage.getItem('motlatsi_schedule');
                if (seedSchedule) {
                    try { loadedSchedule = JSON.parse(seedSchedule); } catch (e) { console.error("Error parsing seed schedule", e); }
                }

                const savedConstraints = localStorage.getItem('motlatsi_study_constraints');
                if (savedConstraints) {
                    try { setStudyConstraints(JSON.parse(savedConstraints)); } catch (e) { console.error("Error parsing constraints", e); }
                }
            } else {
                // Real User: Fetch from Supabase
                try {
                    const { supabase } = await import('../lib/supabase');
                    
                    // Fetch activity logs from student_activity table
                    const { data: logs, error: logsError } = await supabase
                        .from('student_activity')
                        .select('*')
                        .eq('student_id', user.id)
                        .order('created_at', { ascending: false });
                    
                    if (!logsError && logs) {
                        loadedActivity = logs.map((l: any) => ({
                            id: l.id,
                            studentId: l.student_id,
                            studentName: user.name,
                            itemId: l.topic_id || 'unknown',
                            itemTitle: l.activity_type === 'quiz' ? `Quiz: ${l.topic_id}` : 'Activity',
                            score: l.score || 0,
                            total: 10, // Default total for mapping
                            type: l.activity_type as 'quiz' | 'lesson',
                            date: l.created_at,
                            topicId: l.topic_id
                        }));
                    }

                    // Sync any offline data
                    syncOfflineData();

                    // Fetch schedule from schedules table
                    const { data: schedData, error: schedError } = await supabase
                        .from('schedules')
                        .select('*')
                        .eq('user_id', user.id);
                    
                    if (!schedError && schedData) {
                        loadedSchedule = schedData.map((s: any) => ({
                            id: s.id,
                            day: s.day,
                            time: s.time,
                            subject: s.subject,
                            type: s.type as 'study' | 'class' | 'remedial',
                            notes: s.notes,
                            autoGenerated: s.is_auto_generated,
                            linkedTopicId: s.linked_topic_id
                        }));
                    }
                } catch (err) {
                    console.error("Failed to fetch real user data from Supabase", err);
                }
            }

            // --- Sync and Load historical backups from Firestore if configured ---
            try {
                const { isFirebaseConfigured, db } = await import('../lib/firebase');
                if (isFirebaseConfigured() && user?.id) {
                    const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
                    const q = query(
                        collection(db, 'activity_logs'),
                        where('user_id', '==', String(user.id)),
                        limit(15)
                    );
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const firestoreLogs: GradeRecord[] = [];
                        querySnapshot.forEach((docSnapshot) => {
                            const d = docSnapshot.data();
                            const details = d.details || {};
                            firestoreLogs.push({
                                id: d.id || docSnapshot.id,
                                studentId: d.user_id,
                                studentName: user.name,
                                itemId: details.itemId || 'unknown',
                                itemTitle: details.itemTitle || 'Activity',
                                score: details.score || 0,
                                total: details.total || 10,
                                type: d.action_type || 'quiz',
                                date: d.created_at || new Date().toISOString(),
                                topicId: details.topicId || ''
                            });
                        });

                        // Sort documents by date descending
                        firestoreLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        // Merge Firestore logs with local logs
                        const existingIds = new Set(loadedActivity.map(l => l.id));
                        const uniqueFirestoreLogs = firestoreLogs.filter(l => !existingIds.has(l.id));
                        loadedActivity = [...uniqueFirestoreLogs, ...loadedActivity];
                        
                        console.log(`[Firestore Sync] Restored ${uniqueFirestoreLogs.length} activity keys from cloud Firestore backup!`);
                    }
                }
            } catch (err) {
                console.warn('[Firestore Sync] Load skip / fallback active:', err);
            }

            setSchedule(loadedSchedule);
            setRecentActivity(loadedActivity);
            setIsInitialized(true);

            // Start automated IndexedDB PouchDB-style offline worker
            try {
                OfflineDB.startAutoSyncWorker();
            } catch (err) {
                console.error("Failed to start OfflineDB worker", err);
            }
        };

        const syncOfflineData = async () => {
            // First run OfflineDB trigger
            try {
                OfflineDB.triggerSync();
            } catch (err) {
                console.error("OfflineDB sync attempt failed", err);
            }

            let queue = [];
            try {
                queue = JSON.parse(localStorage.getItem('motlatsi_sync_queue') || '[]');
            } catch (e) {
                console.error("Failed to parse sync queue", e);
                localStorage.removeItem('motlatsi_sync_queue');
            }
            if (queue.length === 0) return;

            try {
                const { supabase } = await import('../lib/supabase');
                const { error } = await supabase
                    .from('student_activity')
                    .insert(queue.map((item: any) => ({
                        student_id: item.student_id,
                        topic_id: item.topic_id,
                        activity_type: item.activity_type,
                        score: item.score,
                        created_at: item.created_at
                    })));

                if (!error) {
                    localStorage.removeItem('motlatsi_sync_queue');
                    setLastSynced(new Date().toISOString());
                }
            } catch (e) {
                console.error("Offline sync failed", e);
            }
        };

        initEngine();
    }, [user]);

    // --- 3. Academic Logic ---
    useEffect(() => {
        if (!user) return;
        
        const gradeTopics: Topic[] = [];
        const gradeStr = user.currentGrade;
        const gradeCurriculum = allGrades.find((g: any) => g.grade === gradeStr || g.grade === `Grade ${gradeStr}`);
        if (gradeCurriculum) {
            gradeCurriculum.subjects.forEach((s: any) => gradeTopics.push(...s.topics));
        }

        const totalTopics = gradeTopics.length;
        const completed = user.completedTopics?.length || 0;
        
        const start = new Date(termConfig.startDate).getTime();
        const end = new Date(termConfig.endDate).getTime();
        const now = new Date().getTime();
        const totalTermDuration = end - start;
        const elapsedDuration = now - start;
        const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 3600 * 24)));

        const timeProgress = Math.max(0, Math.min(1, elapsedDuration / totalTermDuration));
        const academicProgress = totalTopics > 0 ? completed / totalTopics : 0;

        let status: 'ahead' | 'on-track' | 'behind' = 'on-track';
        if (academicProgress < (timeProgress - 0.1)) status = 'behind';
        else if (academicProgress > (timeProgress + 0.05)) status = 'ahead';

        const quizzes = recentActivity.filter(a => a.type === 'quiz');
        const mastery = quizzes.length > 0 
            ? Math.round(quizzes.reduce((acc, q) => acc + (q.score / q.total) * 100, 0) / quizzes.length)
            : 0;

        setAcademicStatus({
            totalTopics,
            completedTopics: completed,
            masteryScore: mastery,
            pacerStatus: status,
            daysUntilTermEnd: daysLeft,
            projectedCompletionDate: new Date(end).toDateString() 
        });

    }, [user, recentActivity, termConfig]);

    // --- 4. Daily Plan Generator ---

    const generateDailyPlan = useCallback(async () => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const newSlots: ScheduleSlot[] = [];
        const failedRecords = recentActivity.filter(r => (r.score / r.total) < 0.6 && !r.teacherReviewed);
        const failedTopicIds = [...new Set(failedRecords.map(r => r.topicId))].filter((t): t is string => !!t); 
        let remedialIndex = 0;

        // 1. Identify existing slots to avoid overlaps
        const existingSlotsMap = new Map();
        schedule.forEach(s => existingSlotsMap.set(`${s.day}-${s.time}`, s));

        days.forEach(day => {
            if (!(studyConstraints.studyDays || []).includes(day)) return;

            // 2. Check Master Schedule (Recurring Timetable)
            const masterDay = (studyConstraints.masterSchedule as any)?.[day];
            if (masterDay) {
                Object.entries(masterDay).forEach(([time, subject]) => {
                    const key = `${day}-${time}`;
                    if (existingSlotsMap.has(key)) return;

                    newSlots.push({
                        id: `auto-${Date.now()}-${day}-${time}`,
                        day,
                        time,
                        subject: subject as string,
                        type: 'class',
                        autoGenerated: true,
                        notes: "Recurring Class"
                    });
                });
            }

            // 3. Insert Remedial/Study sessions in available gaps
            const slotTime = studyConstraints.preferredStudyStart || '16:00';
            const key = `${day}-${slotTime}`;
            
            if (!existingSlotsMap.has(key) && !newSlots.some(s => s.day === day && s.time === slotTime)) {
                if (remedialIndex < failedTopicIds.length) {
                    const topicId = failedTopicIds[remedialIndex];
                    const record = failedRecords.find(r => r.topicId === topicId);
                    newSlots.push({
                        id: `auto-${Date.now()}-${day}`,
                        day,
                        time: slotTime,
                        subject: record?.itemTitle || 'Remedial Session',
                        type: 'remedial',
                        autoGenerated: true,
                        notes: "AI Assigned: Focus on weak areas.",
                        linkedTopicId: topicId
                    });
                    remedialIndex++;
                } else {
                    const subjects = ['Mathematics', 'Science', 'English', 'Sesotho'];
                    const subject = subjects[days.indexOf(day) % subjects.length];
                    newSlots.push({
                        id: `auto-${Date.now()}-${day}`,
                        day,
                        time: slotTime,
                        subject: `Study: ${subject}`,
                        type: 'study',
                        autoGenerated: true,
                        notes: "Routine study session."
                    });
                }
            }
        });

        if (newSlots.length > 0) {
            const updatedSchedule = [...schedule, ...newSlots];
            setSchedule(updatedSchedule);
            
            if (user?.isDemo) {
                localStorage.setItem('motlatsi_schedule', JSON.stringify(updatedSchedule));
            } else if (user) {
                // Real User: Persist new auto-generated slots to Supabase
                try {
                    const { supabase } = await import('../lib/supabase');
                    await supabase.from('schedules').insert(newSlots.map(s => ({
                        user_id: user.id,
                        day: s.day,
                        time: s.time,
                        subject: s.subject,
                        type: s.type,
                        notes: s.notes,
                        linked_topic_id: s.linkedTopicId,
                        is_auto_generated: true
                    })));
                } catch (e) {
                    console.error("Failed to persist auto-schedule", e);
                }
            }
        }
    }, [user, schedule, recentActivity, studyConstraints]);

    useEffect(() => {
        if (isInitialized && user && schedule.length === 0) {
            generateDailyPlan();
        }
    }, [isInitialized, user, schedule.length, generateDailyPlan]);

    // --- 5. Actions ---

    const updateLearningProfile = async (notes: string) => {
        const newProfile = learningProfile + "\n" + notes;
        setLearningProfile(newProfile);
        // Removed OfflineDB sync
    };

    const processGameResult = async (topicId: string, xpEarned: number, topicTitle: string) => {
        if (!user) return;

        // 1. Log as Activity
        const newRecord: GradeRecord = {
            id: Date.now().toString(),
            studentId: String(user.id),
            studentName: user.name,
            itemId: `game-${topicId}`,
            itemTitle: `Arcade: ${topicTitle}`,
            score: xpEarned,
            total: 20, // Theoretical max for game XP
            type: 'quiz', // Using quiz type to show in activity logs for now
            date: new Date().toISOString(),
            topicId
        };

        const updatedActivity = [newRecord, ...recentActivity];
        setRecentActivity(updatedActivity);
        localStorage.setItem('motlatsi_activity_log', JSON.stringify(updatedActivity));
        
        // Dynamic remote sync to Firestore cloud DB
        syncStudentProgressToFirestore(String(user.id), updatedActivity);

        // 2. Add XP to User Profile
        const currentXp = user.xp || 0;
        const newXp = currentXp + xpEarned;
        
        // Handle Level Up (assuming 100 XP per level for simplicity here)
        const currentLevel = user.level || 1;
        const newLevel = Math.floor(newXp / 100) + 1;
        
        const updates: Partial<UserState> = { xp: newXp };
        if (newLevel > currentLevel) {
            updates.level = newLevel;
            pushNotification('success', 'Level Up!', `You've reached Level ${newLevel}! Warrior status increasing.`);
        }

        updateUser(updates);

        if (user.isDemo) {
            localStorage.setItem('motlatsi_user', JSON.stringify({ ...user, ...updates }));
        }

        // 3. Persist to Supabase if real user
        if (!user.isDemo) {
            try {
                const { supabase } = await import('../lib/supabase');
                const { error: actError } = await supabase
                    .from('student_activity')
                    .insert({
                        student_id: user.id,
                        topic_id: topicId,
                        activity_type: 'game',
                        score: xpEarned
                    });
                
                if (actError) throw actError;

                await supabase
                    .from('profiles')
                    .update({ xp: newXp, level: newLevel })
                    .eq('id', user.id);
                
                setLastSynced(new Date().toISOString());
            } catch (err) {
                console.warn("Saving game result to Supabase failed, queuing in OfflineDB outbox", err);
                // Save seamlessly into our IndexedDB structured queue
                try {
                    await OfflineDB.addToSyncQueue('LOG_ACTIVITY', {
                        studentId: user.id,
                        topicId,
                        type: 'game',
                        score: xpEarned,
                        date: new Date().toISOString()
                    });
                } catch (dbErr) {
                    console.error("Critical: OfflineDB queue entry failed", dbErr);
                }
            }
        }

        pushNotification('info', 'XP Earned', `+${xpEarned} XP for playing ${topicTitle}!`);
    };

    const processQuizResult = async (topicId: string, score: number, total: number, topicTitle: string, masteredObjectives?: string[]) => {
        const percentage = (score / total) * 100;
        const passed = percentage >= 60;

        const newRecord: GradeRecord = {
            id: Date.now().toString(),
            studentId: user?.id ? String(user.id) : 'unknown',
            studentName: user?.name || 'Student',
            itemId: `quiz-${topicId}`,
            itemTitle: topicTitle,
            score,
            total,
            type: 'quiz',
            date: new Date().toISOString(),
            topicId
        };

        const updatedActivity = [newRecord, ...recentActivity];
        setRecentActivity(updatedActivity);
        
        // Always save to local activity log for immediate UI feedback
        localStorage.setItem('motlatsi_activity_log', JSON.stringify(updatedActivity));

        // Dynamic remote sync to Firestore cloud DB
        if (user?.id) {
            syncStudentProgressToFirestore(String(user.id), updatedActivity);
        }

        if (user && !user.isDemo) {
            // Real User: Save to Supabase with Offline Support
            try {
                const { supabase } = await import('../lib/supabase');
                const { error } = await supabase
                    .from('student_activity')
                    .insert({
                        student_id: user.id,
                        topic_id: topicId,
                        activity_type: 'quiz',
                        score: score
                    });

                if (error) throw error;
                setLastSynced(new Date().toISOString());
            } catch (err) {
                console.warn("Saving to Supabase failed, queuing for offline sync in OfflineDB outbox", err);
                try {
                    await OfflineDB.addToSyncQueue('LOG_ACTIVITY', {
                        studentId: user.id,
                        topicId,
                        type: 'quiz',
                        score: score,
                        date: new Date().toISOString()
                    });
                } catch (dbErr) {
                    console.error("Critical: Failed to queue quiz result in OfflineDB", dbErr);
                }
            }
        }

        if (user) {
            const updates: Partial<UserState> = {};
            
            // Update completed topics if passed
            if (passed && !user.completedTopics.includes(topicId)) {
                updates.completedTopics = [...user.completedTopics, topicId];
                pushNotification('success', 'Topic Mastered!', `Great job on ${topicTitle}. You are moving ahead!`);
            }

            // Update mastered objectives
            if (masteredObjectives && masteredObjectives.length > 0) {
                const currentMastery = user.masteredObjectives || {};
                const topicMastery = currentMastery[topicId] || [];
                
                // Merge and unique
                const newTopicMastery = [...new Set([...topicMastery, ...masteredObjectives])];
                updates.masteredObjectives = {
                    ...currentMastery,
                    [topicId]: newTopicMastery
                };
            }

            if (Object.keys(updates).length > 0) {
                updateUser(updates);
                if (user.isDemo) {
                    localStorage.setItem('motlatsi_user', JSON.stringify({ ...user, ...updates }));
                }
            }
        }

        if (!passed) {
            triggerRemedialAction(topicId, topicTitle);
            updateLearningProfile(`Struggled with ${topicTitle}. Needs simpler examples.`);
        } else {
            updateLearningProfile(`Mastered ${topicTitle}. Ready for advanced concepts.`);
        }
    };

    const triggerRemedialAction = async (topicId: string, topicTitle: string) => {
         const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
         const todayIdx = new Date().getDay() - 1; 
         let targetDay = days[(todayIdx + 1) % 5];
         if (todayIdx === -1 || todayIdx > 4) targetDay = 'Mon'; 
         const slotTime = studyConstraints.preferredStudyStart; 
         const isTaken = schedule.some(s => s.day === targetDay && s.time === slotTime);
         const finalTime = (isTaken ? studyConstraints.preferredStudyEnd : slotTime) || '16:00';
         const newSlot: ScheduleSlot = {
             id: `remedial-${Date.now()}`,
             day: targetDay,
             time: finalTime,
             subject: `Review: ${topicTitle}`,
             location: 'Home',
             type: 'remedial',
             autoGenerated: true,
             linkedTopicId: topicId,
             notes: "AI assigned: Score < 60%"
         };
         const updatedSchedule = [...schedule, newSlot];
         setSchedule(updatedSchedule);
         
         if (user?.isDemo) {
             localStorage.setItem('motlatsi_schedule', JSON.stringify(updatedSchedule));
         } else if (user) {
             // Real User: Persist remedial slot to Supabase
             try {
                 const { supabase } = await import('../lib/supabase');
                 await supabase.from('schedules').insert({
                     user_id: user.id,
                     day: targetDay,
                     time: finalTime,
                     subject: `Review: ${topicTitle}`,
                     type: 'remedial',
                     linked_topic_id: topicId,
                     notes: "AI assigned: Score < 60%",
                     is_auto_generated: true
                 });
             } catch (e) {
                 console.error("Failed to persist remedial slot", e);
             }
         }
         pushNotification('alert', 'Schedule Updated', `Remedial session added for ${topicTitle} on ${targetDay}.`);
    };

    const downloadTermContent = async () => {
         if (!user) return;
         setDownloadProgress({ isDownloading: true, progress: 0, total: 0 });
         const allTopics: Topic[] = [];
         allGrades.forEach((g: any) => {
             if (g.grade === user.currentGrade || g.grade === `Grade ${user.currentGrade}`) {
                 g.subjects.forEach((s: any) => allTopics.push(...s.topics));
             }
         });
         const targetTopics = allTopics.filter(t => {
             const isDone = user.completedTopics.includes(t.id);
             return !isDone;
         }).slice(0, 5);
         
         setDownloadProgress({ isDownloading: true, progress: 0, total: targetTopics.length });
         
         // Loop with delay to prevent rate limit errors (429)
         for (let i = 0; i < targetTopics.length; i++) {
             const topic = targetTopics[i];
             const cacheKey = `motlatsi_lesson_session_${topic.id}_intro`;
             
             if (!localStorage.getItem(cacheKey)) {
                 try {
                     // Add delay before request to be nice to the API
                     await new Promise(r => setTimeout(r, 1500));
                     
                     const prompt = `Create a Beginner Visual Guide for "${topic.title}". Context: Lesotho Curriculum. Format as JSON: [{"term": "Concept", "definition": "Definition", "analogy": "Analogy", "category": "abstract"}]`;
                     
                     // Using aiClient which now has retry logic
                     const result = await aiClient.generate({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
                     
                     localStorage.setItem(cacheKey, JSON.stringify({ content: JSON.parse(result.text || '[]') }));
                 } catch (e) { 
                     console.error(`Failed to download ${topic.title}`, e); 
                 }
             }
             // Update progress
             setDownloadProgress(prev => ({ ...prev, progress: i + 1 }));
         }
         
         setDownloadProgress({ isDownloading: false, progress: 0, total: 0 });
         pushNotification('success', 'Download Complete', 'Term content is now available offline.');
    };

    const pushNotification = (type: 'alert' | 'success' | 'info', title: string, message: string) => {
        if (!user) return;
        const notif: StudentNotification = {
            id: Date.now().toString(),
            studentId: user?.id ? String(user.id) : 'unknown',
            type: type === 'alert' ? 'alert' : 'system',
            title,
            message,
            date: new Date().toISOString(),
            read: false
        };
        let existing = [];
        if (user.isDemo) {
            try {
                existing = JSON.parse(localStorage.getItem('motlatsi_notifications') || '[]');
            } catch (e) {
                console.error("Failed to parse notifications", e);
                localStorage.removeItem('motlatsi_notifications');
            }
        }
        if (user.isDemo) {
            localStorage.setItem('motlatsi_notifications', JSON.stringify([notif, ...existing]));
        }
        window.dispatchEvent(new Event('storage'));
    };

    const refreshSchedule = async () => {
        // Force refresh from storage (both local and IDB check)
        if (user?.isDemo) {
            const localSched = JSON.parse(localStorage.getItem('motlatsi_schedule') || '[]');
            setSchedule(localSched);
        }
    };
    
    const updateConstraints = (c: StudyConstraints) => {
        setStudyConstraints(c);
        if (user?.isDemo) {
            localStorage.setItem('motlatsi_study_constraints', JSON.stringify(c));
        }
        generateDailyPlan();
    };

    const getTopicStatus = (topicId: string, prerequisites: string[] = []): TopicStatus => {
        if (user?.completedTopics && user.completedTopics.includes(topicId)) return 'mastered';
        
        const failed = recentActivity.some(r => r.topicId === topicId && (r.score/r.total) < 0.6);
        if (failed) return 'remedial-needed';
        
        if (prerequisites.length > 0) {
            const allPreReqsDone = prerequisites.every(pid => user?.completedTopics && user.completedTopics.includes(pid));
            if (!allPreReqsDone) return 'locked';
        }
        return 'ready';
    };

    return (
        <LearningEngineContext.Provider value={{
            academicStatus,
            schedule,
            recentActivity,
            termConfig,
            studyConstraints,
            downloadProgress,
            lastSynced,
            isInitialized,
            learningProfile,
            processGameResult,
            processQuizResult,
            refreshSchedule,
            generateDailyPlan,
            downloadTermContent,
            updateConstraints,
            getTopicStatus,
            updateLearningProfile
        }}>
            {children}
        </LearningEngineContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLearningEngine = () => {
    const context = useContext(LearningEngineContext);
    if (!context) {
        throw new Error('useLearningEngine must be used within an LearningEngineProvider');
    }
    return context;
};
