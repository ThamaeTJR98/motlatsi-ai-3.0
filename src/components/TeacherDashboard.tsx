
import React, { useState, useMemo, useEffect } from 'react';
import { UserState, GradeRecord, ScheduleSlot, SavedItem } from '../types';
import { 
    Bell, BarChart3, Sparkles, 
    CheckCircle, TrendingUp, User, 
    BookOpen, ChevronRight, Plus, Layers,
    Library, Calendar, Clock, MapPin, X, FileText, Target, List,
    Zap, AlertTriangle, FastForward, Gauge, RefreshCw, PenTool, LayoutTemplate
} from 'lucide-react';
import MotlatsiLogo from './MotlatsiLogo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLearningEngine } from '../contexts/LearningEngineContext';
import { allGrades } from '../curriculum';

interface TeacherDashboardProps {
    user: UserState;
    onNavigate: (view: string) => void;
    onLogout: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onNavigate, onLogout }) => {
    const { schedule, termConfig, recentActivity } = useLearningEngine();
    const queryClient = useQueryClient();
    
    // Defaulting to 'All Classes' since filter UI is removed with the gaps section
    const [selectedClass] = useState<string>('All Classes');
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>(() => {
        if (user.isDemo) {
            const notes = JSON.parse(localStorage.getItem('motlatsi_notifications') || '[]');
            return notes.filter((n: any) => n.studentId === user.id || n.studentId === 'unknown' || n.type === 'system');
        }
        return [];
    });
    
    // Planner State
    const [selectedPlannerGrade, setSelectedPlannerGrade] = useState('All');
    const [viewingLesson, setViewingLesson] = useState<ScheduleSlot | null>(null);
    const [isPlannerCollapsed, setIsPlannerCollapsed] = useState(false);

    // Invalidate analytics when activity changes to ensure "Pulse" effect
    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ['teacher-analytics'] });
    }, [recentActivity, queryClient]);

    // Look up full lesson plan when a lesson is clicked
    const lessonPlanData = useMemo(() => {
        if (viewingLesson) {
            let library: SavedItem[] = [];
            if (user.isDemo) {
                library = JSON.parse(localStorage.getItem('motlatsi_library') || '[]');
            }
            const match = library.find(item => 
                item && 
                (item.type === 'lesson' || item.type === 'worksheet') && (
                    (viewingLesson.linkedTopicId && item.data?.linkedTopicId === viewingLesson.linkedTopicId) ||
                    (viewingLesson.linkedResourceId && item.id === viewingLesson.linkedResourceId) ||
                    (item.title && item.title === viewingLesson.subject) || 
                    (item.title && viewingLesson.notes?.includes(item.title))
                )
            );
            
            return match?.data || null;
        }
        return null;
    }, [viewingLesson, user.isDemo]);

    const markAllRead = () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    // --- Data Processing Helpers ---
    const allUsers = useMemo(() => {
        if (user.isDemo) {
            return JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]');
        }
        return [];
    }, [user.isDemo]);
    const myStudents = useMemo(() => 
        allUsers.filter((u: any) => (user.linkedStudentIds || []).includes(u.id.toString())),
    [allUsers, user.linkedStudentIds]);

    // --- Planned Lessons Logic ---
    const plannerGrades = useMemo(() => {
        const grades = new Set<string>();
        
        // 1. From Schedule (What is actually scheduled)
        schedule.forEach(s => {
            if (s.grade) {
                grades.add(`Grade ${s.grade}`);
            } else {
                const match = s.subject.match(/Grade \d+/i);
                if (match) grades.add(match[0]);
            }
        });

        // 2. From Portfolio (What the teacher is configured to teach)
        if (user.teachingSubjects && user.teachingSubjects.length > 0) {
            user.teachingSubjects.forEach(assign => {
                assign.grades.forEach(g => grades.add(`Grade ${g}`));
            });
        } else if (user.currentGrade) {
            // Fallback for legacy data or simple setup
            grades.add(`Grade ${user.currentGrade}`);
        }

        // 3. From Linked Students (Context aware of actual students)
        if (myStudents && myStudents.length > 0) {
            myStudents.forEach((student: any) => {
                if (student.currentGrade) {
                    grades.add(`Grade ${student.currentGrade}`);
                }
            });
        }

        const sortedGrades = Array.from(grades).sort((a, b) => {
             const numA = parseInt(a.replace(/\D/g, '')) || 0;
             const numB = parseInt(b.replace(/\D/g, '')) || 0;
             return numA - numB;
        });
        
        return ['All', ...sortedGrades];
    }, [schedule, user.teachingSubjects, user.currentGrade, myStudents]);

    const plannedLessons = useMemo(() => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
        const todayIdx = days.indexOf(today) !== -1 ? days.indexOf(today) : 0;

        let filtered = schedule.filter(s => s.type === 'class');
        
        if (selectedPlannerGrade !== 'All') {
            filtered = filtered.filter(s => {
                const gradeStr = s.grade ? `Grade ${s.grade}` : '';
                return gradeStr === selectedPlannerGrade || s.subject.includes(selectedPlannerGrade);
            });
        }

        return filtered.sort((a, b) => {
            const dayA = days.indexOf(a.day);
            const dayB = days.indexOf(b.day);
            if (dayA !== dayB) return dayA - dayB;
            return a.time.localeCompare(b.time);
        }).map(s => ({
            ...s,
            status: (days.indexOf(s.day) < todayIdx ? 'done' : days.indexOf(s.day) === todayIdx ? 'today' : 'upcoming') as 'done' | 'today' | 'upcoming'
        }));
    }, [schedule, selectedPlannerGrade]);

    // --- Real-time Analytics Engine ---
    const { data: analyticsData } = useQuery({
        queryKey: ['teacher-analytics', user.id, selectedClass],
        queryFn: async () => {
            let logs: GradeRecord[] = [];
            if (user.isDemo) {
                logs = JSON.parse(localStorage.getItem('motlatsi_activity_log') || '[]');
            } else {
                // Real User: recentActivity is already synced in LearningEngineContext
                logs = recentActivity;
            }
            
            const filteredStudents = selectedClass === 'All Classes' 
                ? myStudents 
                : myStudents.filter((s: any) => `Grade ${s.currentGrade}` === selectedClass);
            
            const filteredStudentIds = filteredStudents.map((s: any) => s.id.toString());
            const relevantLogs = logs.filter(l => filteredStudentIds.includes(l.studentId));

            // Topic Stats
            const topicStats: Record<string, { totalScore: number; count: number }> = {};
            relevantLogs.forEach(l => {
                if (!topicStats[l.itemTitle]) topicStats[l.itemTitle] = { totalScore: 0, count: 0 };
                topicStats[l.itemTitle].totalScore += (l.score / l.total) * 100;
                topicStats[l.itemTitle].count++;
            });

            const gapAnalysis = Object.keys(topicStats).map(title => {
                const avg = Math.round(topicStats[title].totalScore / topicStats[title].count);
                return {
                    topic: title,
                    avgScore: avg,
                    status: avg < 50 ? 'critical' : avg < 70 ? 'average' : 'good'
                };
            }).sort((a, b) => a.avgScore - b.avgScore);

            const classAvgMastery = gapAnalysis.length > 0 
                ? Math.round(gapAnalysis.reduce((acc, curr) => acc + curr.avgScore, 0) / gapAnalysis.length)
                : 0;

            // --- SMART PACER LOGIC ---
            const start = new Date(termConfig.startDate).getTime();
            const end = new Date(termConfig.endDate).getTime();
            const now = new Date().getTime();
            const totalDays = (end - start) / (1000 * 60 * 60 * 24);
            const daysElapsed = (now - start) / (1000 * 60 * 60 * 24);
            // 0 to 1 progress based on date
            const timeProgress = Math.max(0, Math.min(1, daysElapsed / totalDays));

            // Calculate Total Topics for Context (Curriculum Size)
            let totalTopicsCount = 0;
            const gradesInScope = selectedClass === 'All Classes' 
                ? Array.from(new Set(myStudents.map((s:any) => s.currentGrade)))
                : [selectedClass.replace('Grade ', '')];
            
            gradesInScope.forEach(gStr => {
                const gData = allGrades.find(g => g.grade === gStr || g.grade === `Grade ${gStr}`);
                gData?.subjects.forEach(s => totalTopicsCount += s.topics.length);
            });
            if (totalTopicsCount === 0) totalTopicsCount = 1;

            // Calculate "Completed" topics (Simplistic: >60% mastery by class)
            // In real app, this would be more robust.
            const masteredTopicsCount = Object.values(topicStats).filter((stat:any) => (stat.totalScore / stat.count) >= 60).length;
            const curriculumProgress = masteredTopicsCount / totalTopicsCount;
            
            // Delta: +Ahead, -Behind (in terms of %)
            const deltaPercent = curriculumProgress - timeProgress;
            // Convert % delta to estimated days
            const daysDelta = Math.round(deltaPercent * totalDays);

            let pacerStatus: 'lagging' | 'rushing' | 'cruising' = 'cruising';
            
            if (daysDelta < -2) {
                pacerStatus = 'lagging';
            } else if (daysDelta > 2 && classAvgMastery < 60) {
                // Ahead of schedule but mastery is low -> Rushing
                pacerStatus = 'rushing';
            } else {
                pacerStatus = 'cruising';
            }

            return { 
                classAvgMastery, 
                gapAnalysis: gapAnalysis.slice(0, 3),
                pacer: {
                    daysDelta,
                    status: pacerStatus,
                    mastery: classAvgMastery
                }
            };
        },
        enabled: true
    });

    const pacerData = analyticsData?.pacer || { daysDelta: 0, status: 'cruising', mastery: 0 };

    // --- Pacer Visual Config ---
    const pacerConfig = {
        lagging: {
            bg: 'bg-gradient-to-br from-orange-500 to-red-600',
            icon: <Clock className="text-orange-100 opacity-20" size={120} />,
            statusLabel: 'Lagging',
            statusBadge: 'bg-red-400/20 text-red-100 border-red-400/30',
            actionBtn: 'bg-white/10 hover:bg-white/20 text-white',
            actionText: 'Plan Catch-up',
            subtext: `Class is ${Math.abs(pacerData.daysDelta)} days behind schedule.`,
            color: 'text-orange-100'
        },
        rushing: {
            bg: 'bg-gradient-to-br from-purple-500 to-pink-600',
            icon: <FastForward className="text-purple-100 opacity-20" size={120} />,
            statusLabel: 'Pace Warning',
            statusBadge: 'bg-purple-400/20 text-purple-100 border-purple-400/30',
            actionBtn: 'bg-white/10 hover:bg-white/20 text-white',
            actionText: 'Review Topic',
            subtext: `Ahead, but mastery is low (${pacerData.mastery}%).`,
            color: 'text-purple-100'
        },
        cruising: {
            bg: 'bg-gradient-to-br from-teacherBlue to-blue-800',
            icon: <Gauge className="text-blue-200 opacity-20" size={120} />,
            statusLabel: 'On Track',
            statusBadge: 'bg-green-400/20 text-green-100 border-green-400/30',
            actionBtn: 'bg-white/10 hover:bg-white/20 text-white',
            actionText: 'Boost Speed',
            subtext: pacerData.daysDelta > 0 
                ? `${pacerData.daysDelta} Days Ahead of schedule.` 
                : 'Pacing aligns perfectly with term plan.',
            color: 'text-blue-100'
        }
    };
    
    const activeConfig = pacerConfig[pacerData.status as keyof typeof pacerConfig];

    return (
        <div className="bg-[#f8fafc] h-full overflow-y-auto font-sans animate-in fade-in duration-500 relative scroll-smooth" onClick={() => setShowNotifications(false)}>
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm transition-all">
                <div className="flex items-center px-4 py-3 justify-between max-w-5xl mx-auto w-full">
                    <div className="flex items-center gap-3">
                        <div className="bg-teacherBlue/10 p-1.5 rounded-lg shadow-inner">
                            <MotlatsiLogo variant="icon" className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black leading-none text-slate-900 tracking-tight">Lumela, {user.name.split(' ')[0]}</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{user.school || 'Motlatsi Academy'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }}
                            className={`flex size-9 items-center justify-center rounded-full transition-all relative ${unreadCount > 0 ? 'bg-orange-50 text-orange-500 shadow-sm' : 'hover:bg-slate-50 text-slate-400'}`}
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
                            )}
                        </button>
                        <button 
                            onClick={() => onNavigate('profile')} 
                            className="flex size-9 items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-teacherBlue transition-all"
                        >
                            <User size={18} />
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div 
                                className="absolute top-12 right-0 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50 animate-in slide-in-from-top-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notifications</h3>
                                    <button onClick={markAllRead} className="text-[10px] text-teacherBlue font-bold hover:underline">Mark all read</button>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-gray-400 text-xs">No notifications.</div>
                                    ) : (
                                        notifications.map((note, i) => (
                                            <div key={i} className={`p-3 border-b border-gray-50 last:border-0 ${!note.read ? 'bg-blue-50/30' : ''}`}>
                                                <div className="flex gap-2">
                                                    <div className={`mt-1 size-2 rounded-full shrink-0 ${!note.read ? 'bg-teacherBlue' : 'bg-gray-300'}`}></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 leading-tight">{note.title}</p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{note.message}</p>
                                                        <p className="text-[9px] text-slate-400 mt-1">{new Date(note.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto w-full p-2.5 md:p-4 space-y-3">
                
                {/* 1. Smart Pacer Card */}
                <section 
                    className={`${activeConfig.bg} rounded-xl p-3 md:p-4 text-white shadow-lg shadow-blue-500/10 relative overflow-hidden transition-all duration-500 group cursor-default`}
                >
                    <div className="absolute -top-4 -right-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700 scale-50 md:scale-75 origin-top-right">
                        {activeConfig.icon}
                    </div>
                    
                    <div className="flex flex-col gap-2 relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider opacity-80 mb-0.5">Live Pacer</p>
                                <h2 className="text-lg md:text-2xl font-black tracking-tight leading-none">
                                    {pacerData.daysDelta === 0 ? 'On Time' : 
                                        `${Math.abs(pacerData.daysDelta)} Day${Math.abs(pacerData.daysDelta) !== 1 ? 's' : ''} ${pacerData.daysDelta > 0 ? 'Ahead' : 'Behind'}`
                                    }
                                </h2>
                                <p className={`text-[9px] md:text-xs mt-0.5 font-medium ${activeConfig.color} opacity-90`}>{activeConfig.subtext}</p>
                            </div>
                            <span className={`text-[7px] md:text-[8px] font-bold px-2 py-0.5 rounded-full border ${activeConfig.statusBadge}`}>
                                {activeConfig.statusLabel.toUpperCase()}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                            <button 
                                onClick={() => onNavigate('wizard')}
                                className={`flex-1 py-1.5 md:py-2 rounded-lg text-[9px] md:text-xs font-bold flex items-center justify-center gap-1.5 backdrop-blur-sm border border-white/20 shadow-sm transition-all active:scale-95 ${activeConfig.actionBtn}`}
                            >
                                {pacerData.status === 'lagging' ? <Zap size={10} /> : pacerData.status === 'rushing' ? <RefreshCw size={10} /> : <TrendingUp size={10} />}
                                {activeConfig.actionText}
                            </button>
                            <div className="px-2 py-1 md:px-3 md:py-1.5 bg-black/20 rounded-lg text-center backdrop-blur-sm border border-white/10">
                                <p className="text-[6px] md:text-[7px] font-bold uppercase opacity-60">Mastery</p>
                                <p className="text-xs font-black">{pacerData.mastery}%</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Quick Actions */}
                <section className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => onNavigate('library')}
                        className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2 hover:border-teacherBlue/30 transition-all active:scale-95 group"
                    >
                        <div className="size-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <Library size={14} />
                        </div>
                        <div className="text-left overflow-hidden">
                            <h3 className="text-[11px] font-bold text-slate-800 truncate">Library</h3>
                            <p className="text-[8px] text-slate-400 font-medium">Resources</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => onNavigate('wizard')}
                        className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2 hover:border-teacherBlue/30 transition-all active:scale-95 group"
                    >
                        <div className="size-7 rounded-lg bg-blue-50 text-teacherBlue flex items-center justify-center shrink-0">
                            <Sparkles size={14} />
                        </div>
                        <div className="text-left overflow-hidden">
                            <h3 className="text-[11px] font-bold text-slate-800 truncate">Planner</h3>
                            <p className="text-[8px] text-slate-400 font-medium">Create New</p>
                        </div>
                    </button>
                </section>

                {/* 3. Weekly Planner */}
                <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-3 py-2 border-b border-slate-50 bg-slate-50/30">
                         <div className="flex items-center justify-between mb-1.5">
                             <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIsPlannerCollapsed(!isPlannerCollapsed)}>
                                 <Calendar size={14} className="text-teacherBlue" />
                                 <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Weekly Plan</h3>
                                 <div className={`transition-transform duration-300 ${isPlannerCollapsed ? '-rotate-90' : ''}`}>
                                     <ChevronRight size={12} className="text-slate-400" />
                                 </div>
                             </div>
                             <div className="flex items-center gap-2">
                                 <button onClick={() => onNavigate('scheduler')} className="text-[8px] font-bold text-slate-400 hover:text-teacherBlue bg-white border border-slate-100 px-1.5 py-0.5 rounded-full transition-colors">
                                     Manage
                                 </button>
                             </div>
                         </div>
                         
                         {!isPlannerCollapsed && (
                             <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 animate-in fade-in slide-in-from-top-1">
                                 {plannerGrades.map(grade => (
                                     <button
                                         key={grade}
                                         onClick={() => setSelectedPlannerGrade(grade)}
                                         className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold whitespace-nowrap transition-all border ${
                                             selectedPlannerGrade === grade 
                                             ? 'bg-slate-800 text-white border-slate-800' 
                                             : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                         }`}
                                     >
                                         {grade}
                                     </button>
                                 ))}
                             </div>
                         )}
                    </div>
                    
                    {!isPlannerCollapsed && (
                        <div className="divide-y divide-slate-50 min-h-[140px] max-h-[50vh] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                            {plannedLessons.length > 0 ? (
                                plannedLessons.map((lesson, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => setViewingLesson(lesson)}
                                        className={`p-2.5 flex gap-2.5 cursor-pointer hover:bg-gray-50 transition-colors items-center ${lesson.status === 'done' ? 'opacity-60 bg-gray-50/50' : 'bg-white'}`}
                                    >
                                        <div className="flex flex-col items-center justify-center min-w-[2.2rem] bg-slate-50 rounded-lg py-1 border border-slate-100">
                                            <span className="text-[7px] font-black uppercase text-slate-400">{lesson.day}</span>
                                            <span className="text-[10px] font-bold text-slate-800">{lesson.time}</span>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0">
                                                <h4 className={`text-[11px] font-bold truncate pr-1 ${lesson.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{lesson.subject}</h4>
                                                {lesson.status === 'today' && <div className="size-1.5 rounded-full bg-blue-500 shrink-0"></div>}
                                            </div>
                                            <p className="text-[9px] text-slate-400 line-clamp-1">{lesson.notes || 'No description'}</p>
                                        </div>
                                        
                                        <div className="flex items-center justify-center size-5 shrink-0">
                                            {lesson.status === 'done' ? (
                                                <CheckCircle size={12} className="text-green-500" />
                                            ) : (
                                                <ChevronRight size={12} className="text-slate-200" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center flex flex-col items-center justify-center">
                                    <p className="text-[9px] text-gray-400 mb-1.5">No lessons scheduled.</p>
                                    <button onClick={() => onNavigate('wizard')} className="text-[9px] font-bold text-teacherBlue hover:underline">
                                        Create Plan
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </section>
                
                <div className="h-32 w-full block md:hidden"></div>
            </main>

            {/* Lesson Detail Modal */}
            {viewingLesson && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-start mb-6 shrink-0">
                             <div>
                                <div className="flex items-center gap-2 text-teacherBlue mb-1">
                                    <BookOpen size={18} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Lesson Plan</span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight pr-4">
                                    {viewingLesson.subject}
                                </h2>
                             </div>
                             <button 
                                onClick={() => setViewingLesson(null)} 
                                className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 hover:bg-gray-200"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                            {/* Meta */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Clock size={14} />
                                        <span className="text-[9px] font-bold uppercase">Time</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">{viewingLesson.day}, {viewingLesson.time}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <MapPin size={14} />
                                        <span className="text-[9px] font-bold uppercase">Location</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">{viewingLesson.location || 'Classroom'}</p>
                                </div>
                            </div>

                            {/* Plan Content */}
                            {lessonPlanData ? (
                                <div className="space-y-4">
                                    {/* Handle worksheets specifically */}
                                    {lessonPlanData.sections ? (
                                        <div className="bg-teal-50 dark:bg-teal-900/10 p-4 rounded-xl border border-teal-100 dark:border-teal-900/30">
                                            <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase mb-2">
                                                <FileText size={14} /> Worksheet Content
                                            </div>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 italic mb-2">{lessonPlanData.objective}</p>
                                            <div className="space-y-2">
                                                {lessonPlanData.sections.map((s: any, i: number) => (
                                                    <div key={i} className="text-xs">
                                                        <p className="font-bold">{s.title}</p>
                                                        <p className="text-slate-500 pl-2">{s.items.length} Questions</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Standard Lesson Plan Fields */}
                                            {lessonPlanData.objectives && (
                                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                                    <h4 className="text-xs font-bold text-teacherBlue uppercase tracking-wider mb-2 flex items-center gap-2"><Target size={14} /> Objectives</h4>
                                                    <ul className="list-disc pl-4 space-y-1">
                                                        {lessonPlanData.objectives.map((obj: string, idx: number) => (
                                                            <li key={idx} className="text-xs text-slate-700 dark:text-slate-300">{obj}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {lessonPlanData.introduction && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2"><Sparkles size={14} className="text-orange-500" /> Introduction ({lessonPlanData.introduction.time})</h4>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">{lessonPlanData.introduction.content}</p>
                                                </div>
                                            )}

                                            {lessonPlanData.development && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2"><List size={14} className="text-purple-500" /> Development ({lessonPlanData.development.time})</h4>
                                                    <div className="space-y-2">
                                                        {lessonPlanData.development.steps ? (
                                                            lessonPlanData.development.steps.map((step: string, idx: number) => (
                                                                <div key={idx} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl">
                                                                    <span className="font-bold text-teacherBlue">{idx + 1}.</span>
                                                                    <p>{step}</p>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">{lessonPlanData.development.content}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                        <FileText size={16} />
                                        <span className="text-xs font-bold uppercase">Notes</span>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {viewingLesson.notes || "No detailed notes available."}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4 shrink-0">
                            <button 
                                onClick={() => {
                                    setViewingLesson(null);
                                    // Navigate appropriately based on type
                                    onNavigate('wizard');
                                }}
                                className="flex-1 bg-white border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors text-xs"
                            >
                                Edit Plan
                            </button>
                            <button 
                                onClick={() => setViewingLesson(null)}
                                className="flex-1 bg-teacherBlue text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-colors text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
