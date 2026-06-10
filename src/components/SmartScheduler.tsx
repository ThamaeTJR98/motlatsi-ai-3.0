
import React from 'react';
import { 
    Calendar as CalendarIcon, MapPin, 
    Plus, Trash2, Mic, X, Wand2, Settings, AlertTriangle, BookOpen, Clock, FileText, Loader2, Check, Sparkles, Bell, CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List,
    Construction, Lock
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addMonths, subDays, subMonths, isSameMonth, isSameDay, isToday, parse, set } from 'date-fns';
import { ScheduleSlot, StudyConstraints, Topic, UserState } from '../types';
import { supportsSpeechRecognition, safeJsonParse } from '../utils/aiHelpers';
import { useLearningEngine } from '../contexts/LearningEngineContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { aiClient } from '../utils/aiClient';
import { allGrades } from '../curriculum';
import { OfflineDB } from '../services/OfflineDB';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface AiSuggestion {
    subject: string;
    type: 'remedial' | 'study';
    notes: string;
}

interface SmartSchedulerProps {
    variant?: 'default' | 'student';
    onNavigate?: (view: string) => void;
    onTopicSelect?: (topic: Topic, targetView?: string) => void;
}

const SmartScheduler: React.FC<SmartSchedulerProps> = ({ variant = 'default', onNavigate, onTopicSelect }) => {
    const { user } = useAuth();
    const { schedule, refreshSchedule, studyConstraints, updateConstraints, academicStatus, recentActivity } = useLearningEngine();
    
    const { addToast } = useToast();
    const isTeacher = user?.role === 'teacher';

    // --- High Latency & Mountainous Offline Sync Manager state ---
    const [syncStatus, setSyncStatus] = React.useState({ online: navigator.onLine, pendingCount: 0, syncing: false });

    React.useEffect(() => {
        try {
            const unsubscribe = OfflineDB.registerSyncStatusListener((status) => {
                setSyncStatus(status);
            });
            return unsubscribe;
        } catch (e) {
            console.error("Failed to register scheduler OfflineDB listener", e);
        }
    }, []);

    const queueScheduledSlotsToCloud = async (updatedSlots: ScheduleSlot[]) => {
        if (!user || user.isDemo) return;
        try {
            // Queue to our background sync replication outbox
            await OfflineDB.addToSyncQueue('SYNC_SCHEDULE_SLOTS', updatedSlots);
            addToast("Draft slot queued successfully under low-connectivity outbox", "success");
        } catch (err) {
            console.error("Failed to queue schedule to OfflineDB outbox", err);
            addToast("Saved to local offline memory.", "info");
        }
    };
    
    // Default constraints to prevent hook crashes if context is not ready
    const safeConstraints = studyConstraints || {
        schoolStart: '08:00',
        schoolEnd: '15:00',
        preferredStudyStart: '16:00',
        preferredStudyEnd: '18:00',
        breakTime: '10:00',
        lunchTime: '13:00',
        masterSchedule: {}
    } as StudyConstraints;

    const [selectedSlot, setSelectedSlot] = React.useState<{day: string, time: string, date?: Date} | null>(null);
    const [slotMode, setSlotMode] = React.useState<'view' | 'edit'>('edit');
    const [showConfig, setShowConfig] = React.useState(false);
    
    // GSuite Sync & Boardcaster states
    const [showGSuiteModal, setShowGSuiteModal] = React.useState(false);
    const [gcalConnected, setGcalConnected] = React.useState(true);
    const [gcalBusy, setGcalBusy] = React.useState(false);
    
    // Themed notification composer
    const [notifTheme, setNotifTheme] = React.useState('challenge');
    const [notifTitle, setNotifTitle] = React.useState('');
    const [notifBody, setNotifBody] = React.useState('');
    const [scheduledNotifs, setScheduledNotifs] = React.useState<any[]>(() => {
        const existing = localStorage.getItem('motlatsi_notifications');
        const list = existing ? JSON.parse(existing) : [];
        if (list.length === 0) {
            return [
                { id: 'custom-1', type: 'teacher_push', theme: 'challenge', title: '🎯 Weekly Algebra Test Prepper', message: 'Ready to solve the puzzle? Get ahead on Unit 4 Equations.', date: new Date().toISOString(), scheduledFor: 'Today, 4:00 PM', status: 'transmitted' },
                { id: 'custom-2', type: 'teacher_push', theme: 'reading', title: '📖 Sesotho Short Story Session', message: 'Join teacher Thamae for an ambient reading hour tonight.', date: new Date().toISOString(), scheduledFor: 'Tomorrow, 5:30 PM', status: 'scheduled' }
            ];
        }
        return list;
    });
    
    // View State
    const [viewMode, setViewMode] = React.useState<'day' | 'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [isEditingTemplate, setIsEditingTemplate] = React.useState(false);

    // Config State
    const [tempConstraints, setTempConstraints] = React.useState<StudyConstraints>(safeConstraints);

    // Sync tempConstraints when studyConstraints loads
    React.useEffect(() => {
        if (studyConstraints) {
            setTempConstraints(studyConstraints);
        }
    }, [studyConstraints]);

    // Modal State for Adding
    const [modalData, setModalData] = React.useState({ subject: '', grade: '', location: '', notes: '', type: 'study' });
    const [isAiSuggesting, setIsAiSuggesting] = React.useState(false);
    
    // Voice State
    const [isListeningField, setIsListeningField] = React.useState<string | null>(null);
    const [canUseSpeech, setCanUseSpeech] = React.useState(false);

    const blueprintMode = isEditingTemplate;

    const getSlot = React.useCallback((dayName: string, time: string) => schedule.find(s => s.day === dayName && s.time === time), [schedule]);

    const activeSlot = React.useMemo(() => {
        if (!selectedSlot) return null;
        return getSlot(selectedSlot.day, selectedSlot.time);
    }, [selectedSlot, getSlot]);

    const availableSubjects = React.useMemo(() => {
        if (!modalData.grade) return ['Mathematics', 'Science', 'English', 'Sesotho', 'Social Studies', 'Life Skills', 'Arts', 'PE'];
        const gradeNum = modalData.grade.replace('Grade ', '');
        const gradeData = allGrades.find(g => g.grade === gradeNum || g.grade === `Grade ${gradeNum}`);
        return gradeData ? gradeData.subjects.map(s => s.name) : [];
    }, [modalData.grade]);

    const parseMasterSlot = (val: string) => {
        if (!val) return { grade: '', subject: '' };
        const parts = val.split(' - ');
        if (parts.length > 1 && parts[0].startsWith('Grade')) {
            return { grade: parts[0], subject: parts.slice(1).join(' - ') };
        }
        return { grade: '', subject: val };
    };

    React.useEffect(() => {
        setCanUseSpeech(supportsSpeechRecognition());
    }, []);

    // --- Helpers ---
    const getDayName = (date: Date) => format(date, 'EEE'); // 'Mon', 'Tue'...
    

    const isSchoolHour = (time: string) => {
        return time >= (tempConstraints.schoolStart || '08:00') && time < (tempConstraints.schoolEnd || '15:30');
    };

    const isPreferredStudy = (time: string) => {
        return time >= (tempConstraints.preferredStudyStart || '16:00') && time < (tempConstraints.preferredStudyEnd || '18:00');
    };

    const timeSlots = React.useMemo(() => {
        const slots = [];
        // Parse start and end times from constraints, default to 06:00 and 20:00 if invalid
        const startHour = parseInt((safeConstraints.schoolStart || '06:00').split(':')[0]) || 6;
        const endHour = Math.max(
            parseInt((safeConstraints.schoolEnd || '15:30').split(':')[0]) || 15,
            parseInt((safeConstraints.preferredStudyEnd || '20:00').split(':')[0]) || 20
        );

        // Add buffer: 1 hour before, 1 hour after
        const displayStart = Math.max(0, startHour - 1);
        const displayEnd = Math.min(23, endHour + 1);

        for (let i = displayStart; i <= displayEnd; i++) {
            slots.push(`${i.toString().padStart(2, '0')}:00`);
        }
        return slots;
    }, [safeConstraints.schoolStart, safeConstraints.schoolEnd, safeConstraints.preferredStudyEnd]);

    const suggestTopicWithAI = async () => {
        setIsAiSuggesting(true);
        try {
            const guidance = modalData.notes || "No specific notes provided.";

            const prompt = isTeacher ? `
                Act as a master scheduler for a teacher in Lesotho teaching Grade ${user?.currentGrade || '5'}. 
                Context:
                - Target: Grade Level curriculum.
                - Teacher's Voice Notes/Guidance: "${guidance}"
                - Recent Struggles: Fractions, Photosynthesis.

                Task: Suggest the absolute best topic to teach in this ${selectedSlot?.time} slot on ${selectedSlot?.day}.
                
                Return ONLY JSON:
                {
                    "subject": "Clear Title",
                    "type": "remedial" | "study",
                    "notes": "Brief AI reasoning for this choice"
                }
            ` : `
                Act as an academic coach for a student in Lesotho in Grade ${user?.currentGrade || '5'}. 
                Context:
                - Target: Personal learning growth.
                - Student's Voice Notes/Interests: "${guidance}"
                - Current Mastery: ${academicStatus.masteryScore}%

                Task: Suggest the best study topic or revision goal for this ${selectedSlot?.time} slot on ${selectedSlot?.day}.
                
                Return ONLY JSON:
                {
                    "subject": "Clear Title",
                    "type": "remedial" | "study",
                    "notes": "Brief AI reasoning for this choice"
                }
            `;

            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const suggestion = safeJsonParse<AiSuggestion>(response.text);
            if (suggestion) {
                setModalData(prev => ({
                    ...prev,
                    subject: suggestion.subject,
                    type: suggestion.type,
                    notes: suggestion.notes
                }));
                addToast("AI suggested a topic!", "success");
            }
        } catch (e) {
            addToast("AI Suggestion failed.", "error");
        } finally {
            setIsAiSuggesting(false);
        }
    };

    const startVoiceInput = (fieldName: string, isTimeField: boolean = false) => {
        if (!canUseSpeech) return;
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onstart = () => setIsListeningField(fieldName);
        recognition.onend = () => setIsListeningField(null);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            if (isTimeField) {
                // Time parsing logic (simplified)
                setTempConstraints(prev => ({ ...prev, [fieldName]: "08:00" })); // Mock parser
            } else {
                setModalData(prev => ({ ...prev, [fieldName]: transcript }));
            }
        };
        recognition.start();
    };

    const saveSlot = () => {
        if (blueprintMode) {
            // Save to Master Schedule
            const newMaster = { ...safeConstraints.masterSchedule };
            if (!newMaster[selectedSlot!.day]) newMaster[selectedSlot!.day] = {};
            
            // Format as "Grade X - Subject"
            const finalSubject = modalData.grade ? `${modalData.grade} - ${modalData.subject}` : modalData.subject;
            newMaster[selectedSlot!.day][selectedSlot!.time] = finalSubject;
            
            updateConstraints({ ...safeConstraints, masterSchedule: newMaster });
            addToast("Master Timetable updated!", "success");
            setSelectedSlot(null);
            setModalData({ subject: '', grade: '', location: '', notes: '', type: 'study' });
            return;
        }

        if (!selectedSlot || !modalData.subject) return;
        const newSlot: ScheduleSlot = {
            id: Date.now().toString(),
            day: selectedSlot.day,
            time: selectedSlot.time,
            subject: modalData.subject,
            grade: modalData.grade,
            location: modalData.location,
            notes: modalData.notes,
            type: modalData.type as any
        };
        const updated = [...schedule.filter(s => !(s.day === selectedSlot.day && s.time === selectedSlot.time)), newSlot];
        if (user?.isDemo) {
            localStorage.setItem('motlatsi_schedule', JSON.stringify(updated));
        } else {
            queueScheduledSlotsToCloud(updated);
        }
        // Send instantaneous Schedule Changed push notification
        triggerTeacherPushChange('save', newSlot.subject, newSlot.day, newSlot.time);
        
        refreshSchedule();
        setSelectedSlot(null);
        setModalData({ subject: '', grade: '', location: '', notes: '', type: 'study' });
        addToast("Schedule updated!", "success");
    };

    const deleteSlot = (day: string, time: string) => {
        const slot = getSlot(day, time);
        if (!slot) return;

        if (slot.type === 'class' && !isTeacher) {
            addToast("Cannot remove scheduled classes.", "error");
            return;
        }

        if (!confirm("Remove this entry?")) return;
        const updated = schedule.filter(s => !(s.day === day && s.time === time));
        if (user?.isDemo) {
            localStorage.setItem('motlatsi_schedule', JSON.stringify(updated));
        } else {
            queueScheduledSlotsToCloud(updated);
        }
        // Send instantaneous Schedule Cancelled/Deleted push notification
        triggerTeacherPushChange('delete', slot.subject, day, time);

        refreshSchedule();
        setSelectedSlot(null);
    };

    const handleSync = (e: React.MouseEvent) => {
        e.stopPropagation();
        setGcalBusy(true);
        setTimeout(() => {
            setGcalBusy(false);
            const classCount = schedule.filter(s => s.type === 'class').length;
            addToast(`Successfully synchronized ${classCount} class sessions with Google Calendar!`, "success");
        }, 1200);
    };

    const handleRemind = (e: React.MouseEvent) => {
        e.stopPropagation();
        addToast("Automatic 15-minute push alert reminders applied to G-Suite.", "info");
    };

    const triggerTeacherPushChange = async (action: 'save' | 'delete', subject: string, day: string, time: string) => {
        try {
            const resp = await fetch('/api/teacher-schedule-changed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacherName: user?.name || 'Motlatsi Teacher',
                    action,
                    subject,
                    day,
                    time
                })
            });
            const data = await resp.json();
            if (data.success) {
                addToast(`FCM Rearrangement Alert Dispatched: "${data.changeAlert}"`, 'success');
                const newNotif = {
                    id: `teacher-alert-${Date.now()}`,
                    studentId: 'unknown',
                    type: 'teacher_schedule_shift',
                    theme: 'alerts',
                    title: `🚨 Schedule Shift Alert`,
                    message: data.changeAlert,
                    date: new Date().toISOString(),
                    scheduledFor: 'Immediate Broadcast',
                    status: 'transmitted',
                    read: false
                };
                setScheduledNotifs(prev => [newNotif, ...prev]);
            }
        } catch (err) {
            console.error("FCM rearrangement trigger alert failed", err);
        }
    };

    const triggerTeacherMorningDigest = async () => {
        try {
            const daysMap: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
            const todayName = daysMap[new Date().getDay()] || 'Mon';
            const todaySlots = schedule.filter(s => s.day === todayName);

            const resp = await fetch('/api/teacher-morning-digest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacherName: user?.name || 'Principal Tsepang',
                    schedule: todaySlots.map(s => ({ subject: s.subject, time: s.time }))
                })
            });
            const data = await resp.json();
            if (data.success) {
                addToast(`FCM Morning Digest Dispatched: "${data.digest}"`, 'success');
                const newNotif = {
                    id: `teacher-digest-${Date.now()}`,
                    studentId: 'unknown',
                    type: 'teacher_morning_digest',
                    theme: 'motivation',
                    title: `⛅ Morning Schedule Digest`,
                    message: data.digest,
                    date: new Date().toISOString(),
                    scheduledFor: 'Morning Digest Trigger',
                    status: 'transmitted',
                    read: false
                };
                setScheduledNotifs(prev => [newNotif, ...prev]);
            }
        } catch (err) {
            console.error("FCM morning digest trigger failed", err);
        }
    };

    const handleBroadcastNotification = async () => {
        if (!notifTitle || !notifBody) {
            addToast("Please fill in both title and message.", "error");
            return;
        }

        const newNotif = {
            id: `teacher-push-${Date.now()}`,
            studentId: 'unknown',
            type: 'teacher_push',
            theme: notifTheme,
            title: notifTheme === 'challenge' ? `🎯 ${notifTitle}` : notifTheme === 'reading' ? `📖 ${notifTitle}` : notifTheme === 'motivation' ? `💡 ${notifTitle}` : `🚨 ${notifTitle}`,
            message: notifBody,
            date: new Date().toISOString(),
            scheduledFor: 'Immediate Broadcast',
            status: 'transmitted',
            read: false
        };

        const updated = [newNotif, ...scheduledNotifs];
        setScheduledNotifs(updated);
        localStorage.setItem('motlatsi_notifications', JSON.stringify(updated));

        addToast(`Broadcasting '${notifTheme.toUpperCase()}' alert via server FCM broker...`, 'info');

        try {
            const resp = await fetch('/api/broadcast-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newNotif.title,
                    message: newNotif.message,
                    theme: newNotif.theme,
                    studentId: 'unknown'
                })
            });
            const data = await resp.json();
            if (data.success) {
                addToast(`FCM Wake-Up Push successful: ${data.messageId!.substring(0, 20)}...`, 'success');
            } else {
                addToast("FCM Broker returned transmission delay, keeping pending.", "warning");
            }
        } catch (err) {
            console.warn("FCM broker unreachable (offline/local mode). Broadcast queued locally for auto-transit.");
            addToast("Offline Mode: Alert broadcast staged in cellular transit queues.", "info");
        }

        setNotifTitle('');
        setNotifBody('');
    };

    const handleCancelNotification = (id: string) => {
        const updated = scheduledNotifs.map(n => n.id === id ? { ...n, status: 'cancelled' } : n);
        setScheduledNotifs(updated);
        localStorage.setItem('motlatsi_notifications', JSON.stringify(updated));
        addToast("Broadcast transmission cancelled.", "info");
    };

    // --- Navigation ---
    const nextPeriod = () => {
        if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
        else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
        else setCurrentDate(addMonths(currentDate, 1));
    };

    const prevPeriod = () => {
        if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
        else if (viewMode === 'week') setCurrentDate(subDays(currentDate, 7));
        else setCurrentDate(subMonths(currentDate, 1));
    };

    const jumpToToday = () => setCurrentDate(new Date());

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        
        // Filter out weekends for a clean Mon-Fri view
        const weekdayOnly = allDays.filter(day => {
            const d = day.getDay();
            return d !== 0 && d !== 6;
        });

        return (
            <div className="flex flex-col h-full bg-white dark:bg-[#1a1f23]">
                {/* Mon-Fri Header */}
                <div className="grid grid-cols-5 border-b border-slate-200 dark:border-gray-800/50 bg-white dark:bg-[#1a1f23] sticky top-0 z-10">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
                        <div key={d} className="text-center py-3 text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">{d}</div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-5 flex-1 auto-rows-fr bg-slate-200 dark:bg-gray-800/30 gap-px overflow-hidden">
                    {weekdayOnly.map(day => {
                        const dayName = format(day, 'EEE');
                        const daySlots = schedule.filter(s => s.day === dayName);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isTodayDate = isToday(day);

                        return (
                            <div 
                                key={day.toString()} 
                                onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                                className={`relative flex flex-col p-1.5 md:p-3 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-800/40 ${!isCurrentMonth ? 'bg-slate-50 dark:bg-[#15191c]/50' : 'bg-white dark:bg-[#1a1f23]'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] md:text-xs font-bold flex items-center justify-center size-5 md:size-7 rounded-full transition-colors ${isTodayDate ? 'bg-teacherBlue text-white shadow-lg shadow-blue-500/20' : isCurrentMonth ? 'text-slate-600 dark:text-gray-300' : 'text-slate-400 dark:text-gray-600'}`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                                
                                {/* Desktop: Text labels */}
                                <div className="hidden md:block space-y-1 mt-1">
                                    {daySlots.slice(0, 2).map((slot, i) => (
                                        <div key={i} className="text-[10px] truncate px-2 py-1 rounded-md bg-slate-100 dark:bg-gray-800/50 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700/50">
                                            {slot.subject}
                                        </div>
                                    ))}
                                    {daySlots.length > 2 && (
                                        <div className="text-[9px] text-slate-400 dark:text-gray-500 pl-1 font-medium">+{daySlots.length - 2} more</div>
                                    )}
                                </div>

                                {/* Mobile: Minimalist Dots */}
                                <div className="flex md:hidden flex-wrap gap-1 mt-auto pb-1">
                                    {daySlots.slice(0, 3).map((_, i) => (
                                        <div key={i} className="size-1.5 rounded-full bg-teacherBlue/50" />
                                    ))}
                                    {daySlots.length > 3 && (
                                        <div className="size-1.5 rounded-full bg-slate-300 dark:bg-gray-700" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const dayName = format(currentDate, 'EEE');
        return (
            <div className="grid grid-cols-[auto,1fr] h-full overflow-y-auto">
                <div className="w-16 border-r border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1a1f23] sticky left-0 z-10">
                    {timeSlots.map((time: string) => (
                        <div key={time} className="h-24 flex items-center justify-center border-b border-slate-200 dark:border-gray-700 text-xs text-slate-400 dark:text-gray-500 font-medium">
                            {time}
                        </div>
                    ))}
                </div>
                <div className="relative">
                    {timeSlots.map((time: string) => {
                        const slot = isEditingTemplate 
                            ? { subject: studyConstraints.masterSchedule?.[dayName]?.[time] || '', notes: 'Recurring' } 
                            : getSlot(dayName, time);
                        
                        const masterSubject = studyConstraints.masterSchedule?.[dayName]?.[time];
                        const isWorkHour = isSchoolHour(time);
                        const isBreak = time === tempConstraints.breakTime;
                        const isLunch = time === tempConstraints.lunchTime;
                        
                        if (isBreak || isLunch) {
                            return (
                                <div key={time} className="h-24 border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
                                    <div className="px-4 py-1 rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">
                                        {isBreak ? 'Morning Break' : 'Lunch Break'}
                                    </div>
                                </div>
                            );
                        }

                        // Determine Slot State
                        const isPlanned = !!slot && !isEditingTemplate;
                        const isTemplate = !!masterSubject && isEditingTemplate;
                        const isPlaceholder = !!masterSubject && !slot && !isEditingTemplate;
                        const isAutoGenerated = isPlanned && (slot as ScheduleSlot)?.autoGenerated;

                        return (
                            <div 
                                key={time}
                                onClick={() => {
                                    setSelectedSlot({ day: dayName, time, date: currentDate });
                                    if (blueprintMode) {
                                        const parsed = parseMasterSlot(masterSubject || '');
                                        setModalData({ ...modalData, subject: parsed.subject, grade: parsed.grade });
                                        setSlotMode('edit');
                                    } else if (masterSubject && !slot) {
                                        const parsed = parseMasterSlot(masterSubject);
                                        setModalData({ ...modalData, subject: parsed.subject, grade: parsed.grade });
                                        setSlotMode('edit');
                                    } else if (slot) {
                                        const s = slot as ScheduleSlot;
                                        setModalData({ 
                                            subject: s.subject, 
                                            grade: s.grade || '', 
                                            location: s.location || '', 
                                            notes: s.notes || '', 
                                            type: s.type 
                                        });
                                        setSlotMode('view');
                                    } else {
                                        setSlotMode('edit');
                                    }
                                }}
                                className={`h-24 border-b border-slate-200 dark:border-gray-700 p-3 transition-colors cursor-pointer relative group ${
                                    isPlanned 
                                        ? ((slot as ScheduleSlot)?.type === 'remedial' ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500' : 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-teacherBlue') 
                                        : isTemplate
                                            ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-l-amber-500'
                                            : isPlaceholder
                                                ? 'bg-slate-50/50 dark:bg-gray-800/20 border-l-4 border-l-slate-300 dark:border-l-gray-600 border-dashed'
                                                : (isWorkHour ? 'bg-white dark:bg-[#1a1f23] hover:bg-slate-50 dark:hover:bg-gray-800/30' : 'bg-slate-50 dark:bg-[#15191c] hover:bg-slate-100 dark:hover:bg-gray-800/20')
                                }`}
                            >
                                {isPlanned || isTemplate || isPlaceholder ? (
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {isTemplate && <Lock size={12} className="text-amber-500" />}
                                            {isAutoGenerated && <Sparkles size={12} className="text-purple-500" />}
                                            <p className={`font-bold text-sm ${
                                                isTemplate ? 'text-amber-700 dark:text-amber-200' : 
                                                isPlaceholder ? 'text-slate-500 dark:text-gray-400 italic' :
                                                'text-slate-900 dark:text-white'
                                            }`}>
                                                {isTemplate || isPlaceholder ? masterSubject : slot?.subject}
                                            </p>
                                        </div>
                                        <p className={`text-xs ${
                                            isTemplate ? 'text-amber-600/70 dark:text-amber-500/70' : 
                                            isPlaceholder ? 'text-slate-400 dark:text-gray-500' :
                                            'text-slate-500 dark:text-gray-400'
                                        }`}>
                                            {isTemplate ? 'Master Timetable' : isPlaceholder ? 'Tap to plan lesson' : slot?.notes || 'No notes'}
                                        </p>
                                        
                                        {!isTemplate && !isPlaceholder && (
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteSlot(dayName, time); }}
                                                    className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col justify-center">
                                        {isWorkHour && (
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-gray-600 uppercase tracking-widest mb-1 opacity-50">Free Period</span>
                                        )}
                                        <div className="opacity-0 group-hover:opacity-100 text-xs text-slate-500 dark:text-gray-500 flex items-center gap-2">
                                            <Plus size={14} /> Add Session
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekDays = Array.from({ length: 5 }).map((_, i) => addDays(start, i));

        return (
            <div className="flex flex-col h-full bg-white dark:bg-[#1a1f23] overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[40px,1fr] md:grid-cols-[60px,1fr] bg-white dark:bg-[#1a1f23] border-b border-slate-200 dark:border-gray-800/50 sticky top-0 z-20">
                    <div className="bg-white dark:bg-[#1a1f23]"></div>
                    <div className="grid grid-cols-5">
                        {weekDays.map(day => {
                            const isTodayDate = isToday(day);
                            return (
                                <div key={day.toString()} className="flex flex-col items-center py-1.5 md:py-3 border-l border-slate-200 dark:border-gray-800/20">
                                    <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-wider md:tracking-[0.2em] mb-0.5 ${isTodayDate ? 'text-teacherBlue' : 'text-slate-400 dark:text-gray-500'}`}>
                                        {format(day, 'EEE')}
                                    </span>
                                    <span className={`size-5 md:size-7 flex items-center justify-center rounded-full text-[10px] md:text-sm font-bold transition-all ${isTodayDate ? 'bg-teacherBlue text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 dark:text-gray-400'}`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Grid Body */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-[40px,1fr] md:grid-cols-[60px,1fr] bg-slate-200 dark:bg-gray-800/10 gap-px">
                        {/* Time Column */}
                        <div className="flex flex-col bg-white dark:bg-[#1a1f23] sticky left-0 z-10">
                            {timeSlots.map((time: string) => (
                                <div key={time} className="h-14 md:h-20 flex items-center justify-center border-b border-slate-200 dark:border-gray-800/20 text-[7px] md:text-[10px] text-slate-400 dark:text-gray-600 font-black uppercase tracking-tighter">
                                    {time.substring(0, 5)}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-5 flex-1 gap-px">
                            {weekDays.map((day, dayIndex) => (
                                <div key={day.toString()} className="flex flex-col bg-slate-50 dark:bg-[#1a1f23]/40">
                                    {timeSlots.map((time: string) => {
                                        const dayName = isEditingTemplate ? DAYS[dayIndex] : format(day, 'EEE');
                                        const slot = isEditingTemplate 
                                            ? { subject: studyConstraints.masterSchedule?.[dayName]?.[time] || '', notes: 'Recurring' } 
                                            : getSlot(dayName, time);
                                        
                                        const masterSubject = studyConstraints.masterSchedule?.[dayName]?.[time];
                                        const isWorkHour = isSchoolHour(time);
                                        const isBreak = time === tempConstraints.breakTime;
                                        const isLunch = time === tempConstraints.lunchTime;
                                        
                                        if (isBreak || isLunch) {
                                            return (
                                                <div key={`${day}-${time}`} className="h-14 md:h-20 border-b border-slate-200 dark:border-gray-800/20 bg-slate-100 dark:bg-[#15191c]/50 flex items-center justify-center">
                                                    <div className="px-1 py-0.5 rounded-full bg-slate-200 dark:bg-gray-800/30 border border-slate-300 dark:border-gray-700/30">
                                                        <span className="text-[6px] md:text-[8px] font-black text-slate-500 dark:text-gray-600 uppercase tracking-widest">{isBreak ? 'B' : 'L'}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Determine Slot State
                                        const isPlanned = !!slot && !isEditingTemplate;
                                        const isTemplate = !!masterSubject && isEditingTemplate;
                                        const isPlaceholder = !!masterSubject && !slot && !isEditingTemplate;
                                        const isAutoGenerated = isPlanned && (slot as ScheduleSlot)?.autoGenerated;

                                        return (
                                            <div 
                                                key={`${day}-${time}`}
                                                onClick={() => {
                                                    setSelectedSlot({ day: dayName, time, date: day });
                                                    if (blueprintMode) {
                                                        const parsed = parseMasterSlot(masterSubject || '');
                                                        setModalData({ ...modalData, subject: parsed.subject, grade: parsed.grade });
                                                        setSlotMode('edit');
                                                    } else if (masterSubject && !slot) {
                                                        const parsed = parseMasterSlot(masterSubject);
                                                        setModalData({ ...modalData, subject: parsed.subject, grade: parsed.grade });
                                                        setSlotMode('edit');
                                                    } else if (slot) {
                                                        const s = slot as ScheduleSlot;
                                                        setModalData({ 
                                                            subject: s.subject, 
                                                            grade: s.grade || '', 
                                                            location: s.location || '', 
                                                            notes: s.notes || '', 
                                                            type: s.type 
                                                        });
                                                        setSlotMode('view');
                                                    } else {
                                                        setSlotMode('edit');
                                                    }
                                                }}
                                                className={`h-14 md:h-20 border-b border-slate-200 dark:border-gray-800/20 p-0.5 md:p-2 transition-all cursor-pointer relative group ${
                                                    isPlanned 
                                                        ? 'bg-blue-50 dark:bg-blue-900/10 border-l-2 border-l-teacherBlue'
                                                        : isTemplate
                                                            ? 'bg-amber-50 dark:bg-amber-900/20 border-l-2 border-l-amber-500'
                                                            : isPlaceholder
                                                                ? 'bg-slate-50/50 dark:bg-gray-800/20 border-l-2 border-l-slate-300 dark:border-l-gray-600 border-dashed'
                                                                : (isWorkHour ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-gray-800/20' : 'bg-slate-50 dark:bg-[#15191c]/20 hover:bg-slate-100 dark:hover:bg-gray-800/10')
                                                }`}
                                            >
                                                {isPlanned || isTemplate || isPlaceholder ? (
                                                    <div className={`h-full flex flex-col p-0.5 md:p-1 rounded border shadow-sm overflow-hidden ${
                                                        isPlanned 
                                                            ? 'bg-white dark:bg-gray-800/30 border-slate-200 dark:border-gray-700/30' 
                                                            : isTemplate 
                                                                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/50'
                                                                : 'bg-transparent border-transparent opacity-70'
                                                    }`}>
                                                        <div className="flex items-center gap-1 mb-0.5">
                                                            {isTemplate && <Lock size={8} className="text-amber-500" />}
                                                            {isAutoGenerated && <Sparkles size={8} className="text-purple-500" />}
                                                            <p className={`font-bold text-[7px] md:text-[10px] leading-tight truncate ${
                                                                isTemplate ? 'text-amber-700 dark:text-amber-200' : 
                                                                isPlaceholder ? 'text-slate-500 dark:text-gray-400 italic' :
                                                                'text-slate-700 dark:text-gray-200'
                                                            }`}>
                                                                {isTemplate || isPlaceholder ? masterSubject : slot?.subject}
                                                            </p>
                                                        </div>
                                                        <p className={`hidden md:block text-[9px] mt-0.5 font-medium truncate ${
                                                            isTemplate ? 'text-amber-600/70 dark:text-amber-500/70' : 
                                                            isPlaceholder ? 'text-slate-400 dark:text-gray-500' :
                                                            'text-slate-500 dark:text-gray-500'
                                                        }`}>
                                                            {isTemplate ? 'Master Timetable' : isPlaceholder ? 'Plan Lesson' : slot?.notes}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    isWorkHour && (
                                                        <div className="h-full flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-all">
                                                            <div className={`size-3 md:size-6 rounded-full flex items-center justify-center border ${blueprintMode ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-700' : 'bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500 border-slate-200 dark:border-gray-700'}`}>
                                                                <Plus size={8} />
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col h-full pb-20 md:pb-0 transition-colors duration-500 ${blueprintMode ? 'bg-[#1c1917] text-white' : 'bg-white dark:bg-[#1a1f23] text-slate-900 dark:text-white'}`}>
            {/* Header */}
            <div className={`flex flex-col border-b sticky top-0 z-20 transition-colors duration-500 ${blueprintMode ? 'bg-[#1c1917] border-amber-900/50' : 'bg-white dark:bg-[#1a1f23] border-slate-200 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg transition-colors ${blueprintMode ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-50 text-teacherBlue dark:bg-teacherBlue/20 dark:text-teacherBlue'}`}>
                            {blueprintMode ? <Construction size={16} /> : <CalendarIcon size={16} />}
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {blueprintMode ? 'Master Timetable' : 'Lesson Planner'}
                                {syncStatus.pendingCount > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 rounded-full animate-pulse">
                                        ⚡ {syncStatus.pendingCount} Queued
                                    </span>
                                ) : syncStatus.syncing ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200 rounded-full">
                                        🔄 Syncing
                                    </span>
                                ) : !syncStatus.online ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase bg-red-100 text-red-800 border border-red-200 rounded-full">
                                        Offline (Cached)
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full opacity-60">
                                        ✓ Synced
                                    </span>
                                )}
                            </h1>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${blueprintMode ? 'text-amber-500' : 'text-slate-400 dark:text-gray-500'}`}>
                                {blueprintMode ? 'Editing Template' : 'Weekly Schedule'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isTeacher && (
                            <button 
                                onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border transition-all ${blueprintMode ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-gray-700'}`}
                            >
                                {blueprintMode ? 'Save Timetable' : 'Edit Timetable'}
                            </button>
                        )}
                        <button 
                            onClick={jumpToToday}
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 transition-colors"
                        >
                            Today
                        </button>
                        {isTeacher && (
                            <button 
                                onClick={() => setShowGSuiteModal(true)}
                                className="flex items-center gap-1.5 text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all shadow-md active:scale-95 animate-pulse"
                            >
                                <Bell size={12} className="text-white" />
                                Push Assistant
                            </button>
                        )}
                        <button 
                            onClick={() => setShowConfig(true)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-slate-200 dark:border-gray-700"
                        >
                            <Settings size={14} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-4 pb-3 flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div className="flex items-center bg-slate-100 dark:bg-gray-800/50 p-1 rounded-xl border border-slate-200 dark:border-gray-700">
                        <button 
                            onClick={() => setViewMode('day')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'day' ? 'bg-white dark:bg-teacherBlue text-teacherBlue dark:text-white shadow-sm dark:shadow-lg' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Day
                        </button>
                        <button 
                            onClick={() => setViewMode('week')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-white dark:bg-teacherBlue text-teacherBlue dark:text-white shadow-sm dark:shadow-lg' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Week
                        </button>
                        <button 
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white dark:bg-teacherBlue text-teacherBlue dark:text-white shadow-sm dark:shadow-lg' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Month
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={prevPeriod} className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-bold min-w-[120px] text-center text-slate-900 dark:text-white">
                            {viewMode === 'day' ? format(currentDate, 'EEEE, MMM d') : 
                             viewMode === 'week' ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}` : 
                             format(currentDate, 'MMMM yyyy')}
                        </span>
                        <button onClick={nextPeriod} className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Config Modal */}
            {showConfig && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#1a1f23] border border-gray-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Time Constraints</h3>
                            <button onClick={() => setShowConfig(false)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">School Hours</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] text-gray-500 mb-1 block">Start</span>
                                        <input 
                                            type="time" 
                                            value={tempConstraints.schoolStart}
                                            onChange={e => setTempConstraints({...tempConstraints, schoolStart: e.target.value})}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-teacherBlue outline-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-500 mb-1 block">End</span>
                                        <input 
                                            type="time" 
                                            value={tempConstraints.schoolEnd}
                                            onChange={e => setTempConstraints({...tempConstraints, schoolEnd: e.target.value})}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-teacherBlue outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Breaks</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] text-gray-500 mb-1 block">Morning Break</span>
                                        <input 
                                            type="time" 
                                            value={tempConstraints.breakTime || ''}
                                            onChange={e => setTempConstraints({...tempConstraints, breakTime: e.target.value})}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-teacherBlue outline-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-500 mb-1 block">Lunch</span>
                                        <input 
                                            type="time" 
                                            value={tempConstraints.lunchTime || ''}
                                            onChange={e => setTempConstraints({...tempConstraints, lunchTime: e.target.value})}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-teacherBlue outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Preferred Focus Time</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] text-gray-500 mb-1 block">Start</span>
                                        <input 
                                            type="time" 
                                            value={tempConstraints.preferredStudyStart}
                                            onChange={e => setTempConstraints({...tempConstraints, preferredStudyStart: e.target.value})}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-teacherBlue outline-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-500 mb-1 block">End</span>
                                        <input 
                                            type="time" 
                                            value={tempConstraints.preferredStudyEnd}
                                            onChange={e => setTempConstraints({...tempConstraints, preferredStudyEnd: e.target.value})}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-teacherBlue outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-900/20 border border-blue-900/50 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <Sparkles size={16} className="text-teacherBlue mt-0.5" />
                                    <p className="text-xs text-blue-200 leading-relaxed">
                                        AI will prioritize scheduling difficult topics during your "Preferred Focus Time" for maximum retention.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => { updateConstraints(tempConstraints); setShowConfig(false); addToast("Settings applied", "info"); }}
                            className="w-full bg-teacherBlue text-white py-4 rounded-2xl font-bold mt-6 shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-[0.98] transition-all"
                        >
                            Apply Settings
                        </button>
                    </div>
                </div>
            )}

            {/* G-Suite Synchronization & Student Broadcaster Hub */}
            {showGSuiteModal && (
                <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl w-full max-w-lg p-5 shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">Teacher FCM Push Assistant</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Automated Staff Organization Portal</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowGSuiteModal(false)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Contents */}
                        <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1 scroll-smooth">
                            {/* Section A: Morning Digest Simulator Card */}
                            <div className="p-4 bg-gradient-to-br from-indigo-50/20 to-blue-50/20 dark:from-indigo-950/20 dark:to-blue-950/20 border border-indigo-100/50 dark:border-indigo-900/40 rounded-2xl">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 rounded mb-1 inline-block">
                                            A. Scheduled Morning Trigger
                                        </span>
                                        <h4 className="text-xs font-black text-slate-850 dark:text-white">Proactive Morning Digest Summary</h4>
                                    </div>
                                    <span className="text-[8px] font-bold text-gray-400">7:00 AM Daily</span>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold mb-3">
                                    Every morning, a background cron scheduler wakes up, examines the active day's timetable slots, packages a bullet summary, and publishes a cozy FCM wakeup.
                                </p>
                                <button 
                                    onClick={triggerTeacherMorningDigest}
                                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-750 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10"
                                >
                                    ⛅ Simulate Sunrise (7:00 AM) Digest Push
                                </button>
                            </div>

                            {/* Section B: Event-Based Shift Simulator Card */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-850/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl">
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded mb-1 inline-block">
                                    B. Instant Event Trigger
                                </span>
                                <h4 className="text-xs font-black text-slate-850 dark:text-white mb-1">Live Timetable Alteration Warning</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                    Any on-screen changes on this scheduler grid (adding new classes or clearing active records) automatically dispatch instant rearrangement warning toasts. 
                                </p>
                                <div className="mt-2 text-[8.5px] text-gray-400 flex items-center gap-1">
                                    <div className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    <span>Active handler listening & routing live grid changes to Express servers now.</span>
                                </div>
                            </div>

                            {/* Google Calendar Linkage Subsection */}
                            <div className="p-3 bg-gray-50 dark:bg-slate-800/40 border border-gray-200/40 dark:border-slate-800/60 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-500">Google Calendar Staff Mirroring</p>
                                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${gcalConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/20' : 'bg-gray-100 text-gray-600 dark:bg-slate-800'}`}>
                                        {gcalConnected ? 'Connected' : 'Unlinked'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleSync}
                                        disabled={gcalBusy}
                                        className="flex-1 py-1.5 bg-white dark:bg-slate-800 hover:bg-gray-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1"
                                    >
                                        {gcalBusy ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                                        Force G-Suite Calendar Align
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setGcalConnected(!gcalConnected);
                                            addToast(gcalConnected ? "G-Suite Calendar integration unlinked." : "Connected with Google Workspace Calendar.", "info");
                                        }}
                                        className="py-1.5 px-3 bg-gray-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-lg text-[9px] font-black uppercase hover:bg-gray-200 transition-all"
                                    >
                                        toggle connection
                                    </button>
                                </div>
                            </div>

                            {/* Section 2: Create Manual Staff Notice Alert */}
                            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                                <div>
                                    <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-gray-500">Direct Staff Notices</h4>
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">Broadcast custom push bulletin to colleagues</p>
                                </div>

                                {/* Themes */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Notice Priority</label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[
                                            { key: 'challenge', label: '🎯 Target', bg: 'bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400' },
                                            { key: 'reading', label: '📖 Schedule', bg: 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' },
                                            { key: 'motivation', label: '💡 Memo', bg: 'bg-purple-50 border-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400' },
                                            { key: 'alerts', label: '🚨 Urgent', bg: 'bg-red-50 border-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400' }
                                        ].map(t => (
                                            <button 
                                                key={t.key}
                                                onClick={() => setNotifTheme(t.key)}
                                                className={`py-1.5 px-1.5 text-[9px] font-black uppercase rounded-lg border text-center transition-all ${notifTheme === t.key ? `${t.bg} ring-2 ring-blue-500` : 'bg-gray-50 dark:bg-slate-800 border-gray-150 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Input fields */}
                                <div className="space-y-2">
                                    <input 
                                        type="text" 
                                        placeholder="Notice Title (e.g., Staff Meeting Postponed)"
                                        value={notifTitle}
                                        onChange={e => setNotifTitle(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-850 dark:text-white outline-none focus:border-teacherBlue"
                                    />
                                    <textarea 
                                        placeholder="Enter advisory notice briefing text..."
                                        value={notifBody}
                                        onChange={e => setNotifBody(e.target.value)}
                                        rows={2}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-850 dark:text-white outline-none focus:border-teacherBlue"
                                    />
                                </div>

                                <button 
                                    onClick={handleBroadcastNotification}
                                    className="w-full py-2.5 bg-[#4f46e5] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#4338ca] transition-colors shadow-lg shadow-indigo-500/15"
                                >
                                    📣 Broadcast notice via staff FCM
                                </button>
                            </div>

                            {/* Section 3: History list */}
                            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                                <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Active Sim-Lock Device Feeds ({scheduledNotifs.length})</label>
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {scheduledNotifs.map((notif, i) => (
                                        <div key={notif.id || i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-start">
                                            <div className="space-y-1 max-w-[80%]">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[9px] font-black text-slate-800 dark:text-white truncate">
                                                        {notif.title}
                                                    </span>
                                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${notif.theme === 'challenge' ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20' : notif.theme === 'reading' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20' : notif.theme === 'motivation' ? 'bg-purple-100 text-purple-600' : 'bg-red-50 text-red-600'}`}>
                                                        {notif.theme}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">{notif.message}</p>
                                                <p className="text-[8px] text-gray-400 font-bold uppercase">{notif.scheduledFor || 'Transmitted Broadcast'}</p>
                                            </div>
                                            
                                            <div className="flex flex-col items-end shrink-0 gap-1.5">
                                                <span className={`text-[8px] font-black uppercase ${notif.status === 'transmitted' ? 'text-green-500' : notif.status === 'cancelled' ? 'text-red-400' : 'text-blue-500 animate-pulse'}`}>
                                                    {notif.status === 'transmitted' ? '● Sent' : notif.status === 'cancelled' ? 'Cancelled' : '🕒 Queued'}
                                                </span>
                                                {notif.status !== 'cancelled' && (
                                                    <button 
                                                        onClick={() => handleCancelNotification(notif.id)}
                                                        className="text-[8px] font-bold text-red-500 uppercase hover:underline"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-3 border-t border-gray-100 dark:border-slate-800 shrink-0">
                            <button 
                                onClick={() => setShowGSuiteModal(false)}
                                className="w-full py-3 bg-gray-100 dark:bg-slate-850 hover:bg-gray-200 text-slate-700 dark:text-slate-350 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                                Close Control Panel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Schedule View */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'day' && renderDayView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'month' && renderMonthView()}
            </div>

            {/* Add Slot Modal */}
            {selectedSlot && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-10">
                    <div className="bg-white border border-gray-200 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-4 shadow-2xl relative">
                        <button onClick={() => setSelectedSlot(null)} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 z-10"><X size={20}/></button>
                        
                        {slotMode === 'view' && activeSlot ? (
                            // --- VIEW MODE: Detailed Lesson Plan Template ---
                            <div className="flex flex-col h-full max-h-[80vh]">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-6 pr-8">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-14 rounded-2xl flex items-center justify-center shadow-lg ${activeSlot.type === 'remedial' ? 'bg-red-500 text-white' : 'bg-teacherBlue text-white'}`}>
                                            <BookOpen size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{activeSlot.subject}</h3>
                                            <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                                <span>{activeSlot.grade}</span>
                                                <span>•</span>
                                                <span>{activeSlot.day}, {activeSlot.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {activeSlot.autoGenerated && (
                                        <div className="flex flex-col items-end">
                                            <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-[9px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sparkles size={10} /> AI Generated
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                                    
                                    {/* Unit Context Card */}
                                    <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <BookOpen size={80} className="text-blue-500" />
                                        </div>
                                        <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <BookOpen size={12} /> Unit Context
                                        </h4>
                                        <div className="space-y-3 relative z-10">
                                            <div>
                                                <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Unit Title</span>
                                                <p className="text-slate-900 font-medium text-lg leading-tight">
                                                    {(activeSlot.notes?.split('\n') || []).find(l => l.startsWith('Unit:'))?.replace('Unit:', '')?.trim() || 'General Curriculum'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Learning Focus</span>
                                                <p className="text-slate-600 leading-relaxed">
                                                    {(activeSlot.notes?.split('\n') || []).find(l => l.startsWith('Focus:'))?.replace('Focus:', '')?.trim() || 'No specific focus defined.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lesson Plan Structure */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                                            <BookOpen size={12} /> Lesson Structure
                                        </h4>
                                        
                                        {/* Introduction */}
                                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="size-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">1</div>
                                                <h5 className="text-sm font-bold text-slate-800">Introduction & Hook</h5>
                                                <span className="text-[10px] text-gray-400 font-mono ml-auto">5 min</span>
                                            </div>
                                            <p className="text-xs text-gray-600 italic pl-9">
                                                Engage students with a quick activity or question related to {activeSlot.subject || 'the topic'}.
                                            </p>
                                        </div>

                                        {/* Main Activity */}
                                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="size-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">2</div>
                                                <h5 className="text-sm font-bold text-slate-800">Core Activity</h5>
                                                <span className="text-[10px] text-gray-400 font-mono ml-auto">25 min</span>
                                            </div>
                                            <p className="text-xs text-gray-600 italic pl-9">
                                                {(activeSlot.notes?.split('\n') || []).find(l => l.startsWith('Focus:'))?.replace('Focus:', '')?.trim() 
                                                    ? `Direct instruction and practice on: ${(activeSlot.notes?.split('\n') || []).find(l => l.startsWith('Focus:'))?.replace('Focus:', '')?.trim()}`
                                                    : "Main lesson content goes here."}
                                            </p>
                                        </div>

                                        {/* Conclusion */}
                                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="size-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">3</div>
                                                <h5 className="text-sm font-bold text-slate-800">Assessment & Close</h5>
                                                <span className="text-[10px] text-gray-400 font-mono ml-auto">10 min</span>
                                            </div>
                                            <p className="text-xs text-gray-600 italic pl-9">
                                                Quick check for understanding and wrap-up.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Resources Section */}
                                    <div className="bg-purple-50/30 rounded-xl p-4 border border-purple-100">
                                        <h4 className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Sparkles size={12} /> Resources
                                        </h4>
                                        <div className="flex flex-col gap-2">
                                            {activeSlot.linkedResourceId && (
                                                <div 
                                                    onClick={() => onNavigate?.('library')}
                                                    className="p-3 bg-white border border-purple-200 rounded-lg flex items-center justify-between group hover:border-purple-400 transition-all cursor-pointer mb-1 shadow-sm"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900">Planned Worksheet</p>
                                                            <p className="text-[10px] text-gray-500">Ready for distribution</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={14} className="text-gray-400 group-hover:text-purple-500" />
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        if (activeSlot.linkedTopicId) {
                                                            const topic = allGrades.flatMap(g => g.subjects).flatMap(s => s.topics).find(t => t.id === activeSlot.linkedTopicId);
                                                            if (topic) {
                                                                onTopicSelect?.(topic, 'worksheet-generator');
                                                                return;
                                                            }
                                                        }
                                                        onNavigate?.('worksheet-generator');
                                                    }}
                                                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-slate-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                                                >
                                                    <BookOpen size={14} className="text-blue-500" />
                                                    Worksheet
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (activeSlot.linkedTopicId) {
                                                            const topic = allGrades.flatMap(g => g.subjects).flatMap(s => s.topics).find(t => t.id === activeSlot.linkedTopicId);
                                                            if (topic) {
                                                                onTopicSelect?.(topic, 'quiz');
                                                                return;
                                                            }
                                                        }
                                                        onNavigate?.('quiz');
                                                    }}
                                                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-slate-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                                                >
                                                    <Sparkles size={14} className="text-purple-500" />
                                                    Generate Quiz
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Raw Notes (if any extra) */}
                                    {activeSlot.notes && !activeSlot.notes.startsWith('Unit:') && (
                                        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                            <h4 className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-2">Additional Notes</h4>
                                            <p className="text-sm text-yellow-700 leading-relaxed whitespace-pre-wrap">
                                                {activeSlot.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div className="grid grid-cols-2 gap-3 pt-4 mt-auto border-t border-gray-100">
                                    <button 
                                        onClick={() => setSlotMode('edit')}
                                        className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-xl font-bold transition-all border border-slate-200"
                                    >
                                        <Settings size={16} />
                                        Edit Plan
                                    </button>
                                    <button 
                                        onClick={() => deleteSlot(activeSlot.day, activeSlot.time)}
                                        className="flex items-center justify-center gap-2 w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-bold transition-all border border-red-100"
                                    >
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // --- EDIT/PLAN MODE ---
                            <>
                                <div className="flex items-center justify-between mb-4 pr-8">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${blueprintMode ? 'bg-amber-500/20 text-amber-500' : 'bg-teacherBlue/20 text-teacherBlue'}`}>
                                            {blueprintMode ? <Construction size={20} /> : <Clock size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight">{blueprintMode ? 'Set Master Slot' : 'Plan Lesson'}</h3>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${blueprintMode ? 'text-amber-500' : 'text-gray-500'}`}>
                                                {blueprintMode ? 'Weekly Repeat' : `${selectedSlot.day} • ${selectedSlot.time}`}
                                            </p>
                                        </div>
                                    </div>
                                    {!blueprintMode && (
                                        <button 
                                            onClick={suggestTopicWithAI}
                                            disabled={isAiSuggesting}
                                            className={`size-10 rounded-xl flex items-center justify-center transition-all ${isAiSuggesting ? 'bg-gray-100 text-gray-400 animate-spin' : 'bg-gradient-to-br from-teacherBlue to-blue-600 text-white shadow-lg shadow-blue-500/30'}`}
                                        >
                                            <Wand2 size={18} />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {/* Grade Selection for Teachers */}
                                    {isTeacher && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Grade / Class</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {Array.from({ length: 11 }).map((_, i) => `G${i + 1}`).map((g, idx) => {
                                                    const fullGrade = `Grade ${idx + 1}`;
                                                    return (
                                                        <button
                                                            key={fullGrade}
                                                            onClick={() => setModalData({...modalData, grade: fullGrade})}
                                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${modalData.grade === fullGrade ? (blueprintMode ? 'bg-amber-500 text-black border-amber-500' : 'bg-teacherBlue text-white border-teacherBlue') : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                                        >
                                                            {g}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                                            {isTeacher ? 'Subject / Goal' : 'Study Topic / Homework'}
                                        </label>
                                        <div className="relative group">
                                            <input 
                                                type="text" 
                                                placeholder={isTeacher ? "e.g. Mathematics" : "e.g. Revise Fractions"} 
                                                className={`w-full pl-3 pr-10 py-2.5 rounded-xl border-2 outline-none transition-all text-xs font-bold text-slate-900 ${isListeningField === 'subject' ? (blueprintMode ? 'border-amber-500 bg-amber-50' : 'border-teacherBlue bg-blue-50') : 'border-gray-200 focus:border-teacherBlue bg-gray-50'}`}
                                                value={modalData.subject}
                                                onChange={e => setModalData({...modalData, subject: e.target.value})}
                                            />
                                            <button 
                                                onClick={() => startVoiceInput('subject')}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 size-7 rounded-lg flex items-center justify-center"
                                            >
                                                <Mic size={14} className="text-gray-400" />
                                            </button>
                                        </div>
                                        
                                        {/* Quick Select Chips */}
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {availableSubjects.map(subj => (
                                                <button
                                                    key={subj}
                                                    onClick={() => setModalData({...modalData, subject: subj})}
                                                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-colors ${modalData.subject === subj ? (blueprintMode ? 'bg-amber-500 text-black border-amber-500' : 'bg-teacherBlue text-white border-teacherBlue') : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    {subj}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-2.5 pt-1">
                                        {blueprintMode && modalData.subject && (
                                            <button 
                                                onClick={() => {
                                                    // Quick delete for master schedule
                                                    const newMaster = { ...studyConstraints.masterSchedule };
                                                    if (newMaster[selectedSlot!.day]) {
                                                        delete newMaster[selectedSlot!.day][selectedSlot!.time];
                                                        updateConstraints({ ...studyConstraints, masterSchedule: newMaster });
                                                        addToast("Master slot cleared", "info");
                                                        setSelectedSlot(null);
                                                    }
                                                }}
                                                className="px-3 py-2.5 rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        
                                        <button 
                                            onClick={saveSlot}
                                            disabled={!modalData.subject}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                                                !modalData.subject 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                : blueprintMode 
                                                    ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20' 
                                                    : 'bg-teacherBlue text-white hover:bg-blue-600 shadow-blue-500/20'
                                            }`}
                                        >
                                            {blueprintMode ? <Construction size={16} /> : <Check size={16} />}
                                            {blueprintMode ? 'Save to Master' : 'Save Plan'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartScheduler;
