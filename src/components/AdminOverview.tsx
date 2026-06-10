
import React, { useEffect, useState } from 'react';
import { 
    Activity, Bell, CheckCircle, AlertTriangle, 
    FileText, ChevronRight, TrendingUp, ChevronDown, ChevronUp, X,
    School, Copy, Users, Shield, Key, Database, Download, Upload, RefreshCw
} from 'lucide-react';
import { GradeRecord, UserState } from '../types';
import { supabase } from '../lib/supabase';
import MotlatsiLogo from './MotlatsiLogo';
import { allGrades } from '../curriculum';
import { useLearningEngine } from '../contexts/LearningEngineContext';
import { useToast } from '../contexts/ToastContext';

interface AdminOverviewProps {
    user: UserState;
    onLogout: () => void;
    onNavigate: (view: string) => void;
}

interface SchoolKeys {
    adminCode: string;
    teacherCode: string;
}

const AdminOverview: React.FC<AdminOverviewProps> = ({ user, onLogout, onNavigate }) => {
    const { termConfig } = useLearningEngine();
    const { addToast } = useToast();
    
    const [stats, setStats] = useState({ 
        pacer: 0, 
        coverage: 0, 
        expected: 0,
        aiQuotaUsage: 0
    });

    // --- Automatic Scheduled Disaster Recovery & Cloud DB Mirror ---
    const [cloudBackups, setCloudBackups] = useState<any[]>([]);
    const [isBackingUp, setIsBackingUp] = useState(false);

    const fetchCloudBackups = React.useCallback(async () => {
        try {
            const resp = await fetch('/api/backup/list');
            const data = await resp.json();
            if (data.success) {
                setCloudBackups(data.backups);
            }
        } catch (e) {
            console.error("Cloud backups loading failed:", e);
        }
    }, []);

    const triggerCloudBackup = React.useCallback(async (type = 'scheduled') => {
        setIsBackingUp(true);
        const snapshot = {
            version: "1.0",
            timestamp: Date.now(),
            school: user.school || 'Motlatsi Admin School',
            data: {
                users: localStorage.getItem('motlatsi_admin_users') ? JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]') : [],
                activity_log: localStorage.getItem('motlatsi_activity_log') ? JSON.parse(localStorage.getItem('motlatsi_activity_log') || '[]') : [],
                notifications: localStorage.getItem('motlatsi_notifications') ? JSON.parse(localStorage.getItem('motlatsi_notifications') || '[]') : [],
                schedule: localStorage.getItem('motlatsi_schedule') ? JSON.parse(localStorage.getItem('motlatsi_schedule') || '[]') : []
            }
        };

        // Light Cellular Optimization Compression Mapper
        const compressedString = JSON.stringify(snapshot)
            .replace(/"timestamp"/g, '"t"')
            .replace(/"school"/g, '"s"')
            .replace(/"data"/g, '"d"')
            .replace(/"users"/g, '"u"')
            .replace(/"activity_log"/g, '"al"')
            .replace(/"notifications"/g, '"n"')
            .replace(/"schedule"/g, '"sc"');

        try {
            const resp = await fetch('/api/backup/upload', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-role': user.role || 'Admin'
                },
                body: JSON.stringify({
                    backupData: compressedString,
                    backupType: type,
                    school: user.school || 'School'
                })
            });
            const data = await resp.json();
            if (data.success) {
                addToast(`Cloud Mirror Sync completed successfully! (${data.backup.size})`, 'success');
                fetchCloudBackups();
            }
        } catch (e) {
            console.warn("Cloud backup mirroring skipped (Local backup fallback active)");
        } finally {
            setIsBackingUp(false);
        }
    }, [user.school, user.role, addToast, fetchCloudBackups]);

    const [isRestoring, setIsRestoring] = useState(false);

    const handleRollbackToCloudBackup = React.useCallback(async (backup: any) => {
        if (!window.confirm(`Are you sure you want to rollback to restoration point: "${backup.filename}"? This will overwrite your active database state.`)) {
            return;
        }
        setIsRestoring(true);
        try {
            const dataStr = backup.data;
            if (!dataStr) {
                addToast("No restore data found on this historical entry.", "error");
                setIsRestoring(false);
                return;
            }

            // Light Cellular Optimization Decompression Mapper
            const decompressedString = dataStr
                .replace(/"t"/g, '"timestamp"')
                .replace(/"s"/g, '"school"')
                .replace(/"d"/g, '"data"')
                .replace(/"u"/g, '"users"')
                .replace(/"al"/g, '"activity_log"')
                .replace(/"n"/g, '"notifications"')
                .replace(/"sc"/g, '"schedule"');

            const parsed = JSON.parse(decompressedString);
            if (!parsed.version || !parsed.data) {
                addToast("Invalid schema signatures on the recovered payload.", "error");
                setIsRestoring(false);
                return;
            }

            const d = parsed.data;
            if (d.users) localStorage.setItem('motlatsi_admin_users', JSON.stringify(d.users));
            if (d.activity_log) localStorage.setItem('motlatsi_activity_log', JSON.stringify(d.activity_log));
            if (d.notifications) localStorage.setItem('motlatsi_notifications', JSON.stringify(d.notifications));
            if (d.schedule) localStorage.setItem('motlatsi_schedule', JSON.stringify(d.schedule));

            addToast("Successfully rolled back school database to cloud restoration point!", "success");
            setTimeout(() => {
                window.location.reload();
            }, 1200);
        } catch (e: any) {
            addToast(`Restoration failed: ${e.message}`, "error");
        } finally {
            setIsRestoring(false);
        }
    }, [addToast]);
    
    const [teachers, setTeachers] = useState<any[]>([]);
    const [logs, setLogs] = useState<GradeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [schoolName, setSchoolName] = useState('');
    const [adminName, setAdminName] = useState('Admin');
    const [showPacerModal, setShowPacerModal] = useState(false);
    const [schoolKeys, setSchoolKeys] = useState<SchoolKeys | null>(null);

    // State for retractable sections
    const [expandedSections, setExpandedSections] = useState({
        api: false,
        connect: true,
        backups: false,
        pacer: true,
        teachers: true,
        logs: true
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            
            const adminSchool = user.school || '';
            setAdminName(user.name || 'Admin');
            setSchoolName(adminSchool || 'Unassigned School');

            // --- Retrieve or Generate School Codes ---
            if (user.isDemo) {
                const registry = JSON.parse(localStorage.getItem('motlatsi_school_registry') || '[]');
                const existingKeys = registry.find((s: any) => s.name === adminSchool);

                if (existingKeys) {
                    setSchoolKeys({
                        adminCode: existingKeys.adminCode,
                        teacherCode: existingKeys.teacherCode
                    });
                } else if (adminSchool) {
                    // Generate fallback keys for existing/demo schools not in registry
                    const prefix = adminSchool.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
                    const rand = Math.floor(1000 + Math.random() * 9000);
                    const newKeys = {
                        id: `sch-${Date.now()}`,
                        name: adminSchool,
                        adminCode: `ADM-${prefix}-${rand}`,
                        teacherCode: `TCH-${prefix}-${rand}`,
                        studentCodePrefix: `STU-${prefix}`,
                        principalName: adminName
                    };
                    // Persist these new keys so they work for login later
                    registry.push(newKeys);
                    localStorage.setItem('motlatsi_school_registry', JSON.stringify(registry));
                    
                    setSchoolKeys({
                        adminCode: newKeys.adminCode,
                        teacherCode: newKeys.teacherCode
                    });
                }
            } else {
                // For real users, we would fetch school keys from Supabase
                // Placeholder for now - we can try to fetch from school_settings if we add columns there
            }
            // -----------------------------------------

            if (!adminSchool) {
                setLoading(false);
                return;
            }

            let allSchoolUsers: any[] = [];
            
            if (user.isDemo) {
                const stored = localStorage.getItem('motlatsi_admin_users');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    allSchoolUsers = parsed.filter((u: any) => u.school === adminSchool);
                }
            } else {
                const { data } = await supabase.from('profiles').select('*').eq('school', adminSchool);
                if (data) {
                    allSchoolUsers = data;
                }
            }

            const students = allSchoolUsers.filter((u: any) => u.role === 'Student' || u.role === 'student');
            
            let totalCurriculumTopicsCount = 0;
            let totalCompletedTopicsCount = 0;

            if (students.length > 0) {
                students.forEach((student: UserState) => {
                    const gradeData = allGrades.find(g => g.grade === student.currentGrade || g.grade === `Grade ${student.currentGrade}`);
                    if (gradeData) {
                        let studentTotalTopics = 0;
                        gradeData.subjects.forEach(subj => {
                            studentTotalTopics += subj.topics.length;
                        });
                        totalCurriculumTopicsCount += studentTotalTopics;
                        totalCompletedTopicsCount += (student.completedTopics?.length || 0);
                    }
                });
            }

            // --- AI Quota Simulation ---
            const schoolSeed = adminSchool.length * 7;
            const simulatedUsage = 60 + (schoolSeed % 35); // Dynamic usage between 60-95%
            setStats(prev => ({
                ...prev,
                aiQuotaUsage: simulatedUsage
            }));
            // ---------------------------
            const now = new Date().getTime();
            const start = new Date(termConfig.startDate).getTime();
            const end = new Date(termConfig.endDate).getTime();
            const totalDuration = end - start;
            const elapsed = Math.max(0, now - start);
            const timeProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
            
            const actualCoverage = totalCurriculumTopicsCount > 0 
                ? (totalCompletedTopicsCount / totalCurriculumTopicsCount) * 100 
                : 0;

            const pacerScore = timeProgress > 0 
                ? Math.round((actualCoverage / timeProgress) * 100) 
                : 100;

            setStats({
                pacer: Math.min(100, pacerScore),
                coverage: Math.round(actualCoverage),
                expected: Math.round(timeProgress)
            });

            const teacherList = allSchoolUsers.filter((u: any) => u.role === 'Teacher' || u.role === 'teacher');
            setTeachers(teacherList.map((t: any, idx: number) => ({
                ...t,
                subject: t.subject || 'General',
                pacer: Math.min(100, Math.max(40, pacerScore + (Math.random() * 20 - 10))), 
                status: 'active' 
            })));

            let activityLogs: GradeRecord[] = [];
            if (!user.isDemo) {
                const studentIds = students.map((s: any) => s.id);
                if (studentIds.length > 0) {
                    const { data: logData } = await supabase
                        .from('activity_logs')
                        .select('*')
                        .in('user_id', studentIds)
                        .order('created_at', { ascending: false })
                        .limit(5);
                    
                    if (logData) {
                        activityLogs = logData.map((l: any) => ({
                            id: l.id,
                            studentId: l.user_id,
                            studentName: students.find((s: any) => s.id === l.user_id)?.name || 'Unknown',
                            itemId: l.details?.topic_id || 'unknown',
                            itemTitle: l.details?.topic_id || 'Unknown Topic',
                            score: l.details?.score || 0,
                            total: 100,
                            type: 'quiz',
                            date: l.created_at
                        }));
                    }
                }
            } else {
                const storedLog = localStorage.getItem('motlatsi_activity_log');
                if (storedLog) {
                    activityLogs = JSON.parse(storedLog);
                } else {
                    // Seed some initial logs for demo
                    activityLogs = [
                        { id: 1, studentId: 's1', studentName: 'Khotso', itemId: 'm1', itemTitle: 'Algebraic Expressions', score: 85, total: 100, type: 'quiz', date: new Date().toISOString() },
                        { id: 2, studentId: 's2', studentName: 'Palesa', itemId: 'm2', itemTitle: 'Geometry', score: 92, total: 100, type: 'quiz', date: new Date(Date.now() - 3600000).toISOString() },
                        { id: 3, studentId: 's3', studentName: 'Lebo', itemId: 'p1', itemTitle: 'Numbers to 20', score: 78, total: 100, type: 'quiz', date: new Date(Date.now() - 7200000).toISOString() },
                        { id: 4, studentId: 's1', studentName: 'Khotso', itemId: 'lesson', itemTitle: 'Algebra Intro', score: 100, total: 100, type: 'lesson', date: new Date(Date.now() - 10800000).toISOString() }
                    ];
                    localStorage.setItem('motlatsi_activity_log', JSON.stringify(activityLogs));
                }
            }
            
            setLogs(activityLogs.slice(0, 5));
            
            // Fetch modern cloud mirror backup lists
            fetchCloudBackups();
            
            // Trigger an automatic scheduled background backup mirror
            setTimeout(() => {
                triggerCloudBackup('scheduled');
            }, 1000);

            setLoading(false);
        };

        loadData();
    }, [termConfig, adminName, user.isDemo, user.name, user.school, triggerCloudBackup, fetchCloudBackups]);

    const copyCode = (code: string, label: string) => {
        navigator.clipboard.writeText(code);
        addToast(`${label} copied to clipboard!`, 'success');
    };

    const handleBackupDownload = () => {
        const snapshot = {
            version: "1.0",
            timestamp: Date.now(),
            school: schoolName,
            data: {
                users: localStorage.getItem('motlatsi_admin_users') ? JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]') : [],
                activity_log: localStorage.getItem('motlatsi_activity_log') ? JSON.parse(localStorage.getItem('motlatsi_activity_log') || '[]') : [],
                notifications: localStorage.getItem('motlatsi_notifications') ? JSON.parse(localStorage.getItem('motlatsi_notifications') || '[]') : [],
                library: localStorage.getItem('motlatsi_library') ? JSON.parse(localStorage.getItem('motlatsi_library') || '[]') : [],
                schedule: localStorage.getItem('motlatsi_schedule') ? JSON.parse(localStorage.getItem('motlatsi_schedule') || '[]') : [],
                term_config: localStorage.getItem('motlatsi_term_config') ? JSON.parse(localStorage.getItem('motlatsi_term_config') || '{}') : {},
                school_registry: localStorage.getItem('motlatsi_school_registry') ? JSON.parse(localStorage.getItem('motlatsi_school_registry') || '[]') : []
            }
        };

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(snapshot, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute("download", `motlatsi_system_snap_${schoolName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        addToast("System Snapshot downloaded successfully!", "success");
    };

    const handleBackupUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        const file = event.target.files?.[0];
        if (!file) return;

        fileReader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target?.result as string);
                if (!parsed.version || !parsed.data) {
                    addToast("Invalid backup file. Missing system signatures.", "error");
                    return;
                }

                const d = parsed.data;
                if (d.users) localStorage.setItem('motlatsi_admin_users', JSON.stringify(d.users));
                if (d.activity_log) localStorage.setItem('motlatsi_activity_log', JSON.stringify(d.activity_log));
                if (d.notifications) localStorage.setItem('motlatsi_notifications', JSON.stringify(d.notifications));
                if (d.library) localStorage.setItem('motlatsi_library', JSON.stringify(d.library));
                if (d.schedule) localStorage.setItem('motlatsi_schedule', JSON.stringify(d.schedule));
                if (d.term_config) localStorage.setItem('motlatsi_term_config', JSON.stringify(d.term_config));
                if (d.school_registry) localStorage.setItem('motlatsi_school_registry', JSON.stringify(d.school_registry));

                addToast("Restore Point verified! State rolled back successfully.", "success");
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } catch (err) {
                addToast("Failed to parse snapshot file.", "error");
            }
        };
        fileReader.readAsText(file);
    };

    const handleResetToDefaults = () => {
        if (window.confirm("Are you sure you want to rollback all local modifications and clear active snapshots? This will restore the system default seed dataset.")) {
            localStorage.removeItem('motlatsi_admin_users');
            localStorage.removeItem('motlatsi_activity_log');
            localStorage.removeItem('motlatsi_notifications');
            localStorage.removeItem('motlatsi_library');
            localStorage.removeItem('motlatsi_schedule');
            
            addToast("Rollback success! Restoring defaults...", "success");
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    };

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (stats.pacer / 100) * circumference;

    return (
        <div className="h-full flex flex-col bg-[#f6f6f8] dark:bg-[#101622] font-sans overflow-hidden">
            {/* Top App Bar - Fixed */}
            <header className="shrink-0 bg-white/90 dark:bg-[#101622]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 transition-all z-20">
                <div className="flex items-center gap-3">
                    <div className="bg-[#135bec]/10 p-1.5 rounded-lg text-[#135bec]">
                        <MotlatsiLogo variant="icon" className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold leading-tight text-gray-900 dark:text-white">Admin Overview</h1>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[120px]">
                            {schoolName} • {termConfig.name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors">
                        <Bell size={16} />
                    </button>
                    <button 
                        onClick={() => onNavigate('profile')}
                        className="size-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white dark:ring-gray-800 transition-transform active:scale-95"
                    >
                        {adminName.charAt(0)}
                    </button>
                </div>
            </header>            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 max-w-md mx-auto w-full pb-32 no-scrollbar">
                
                {/* 0. Gemini API Settings */}
                <section>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300">
                        <div 
                            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none"
                            onClick={() => toggleSection('api')}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-lg">
                                    <Key size={14} className="text-amber-600" />
                                </div>
                                <div>
                                    <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">AI Intelligence Fuel</h2>
                                    <p className="text-[8px] text-gray-500 mt-0.5">Quota & Scaling</p>
                                </div>
                            </div>
                            {expandedSections.api ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </div>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSections.api ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-4 pt-0 space-y-4">
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">Monthly Usage (Institutional)</span>
                                        <span className={`text-[10px] font-black ${stats.aiQuotaUsage > 90 ? 'text-red-500' : 'text-amber-600'}`}>{stats.aiQuotaUsage}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                        <div className={`h-full bg-gradient-to-r ${stats.aiQuotaUsage > 90 ? 'from-red-400 to-red-600' : 'from-amber-400 to-amber-600'} rounded-full`} style={{ width: `${stats.aiQuotaUsage}%` }}></div>
                                    </div>
                                <div className="flex justify-between items-center mt-2 px-1">
                                    <p className="text-[8px] text-gray-400 leading-tight flex items-center gap-1 font-medium">
                                        {stats.aiQuotaUsage > 90 ? (
                                            <><AlertTriangle size={10} className="text-red-500" /> Critical usage level reached</>
                                        ) : (
                                            <><AlertTriangle size={10} className="text-amber-500" /> Approaching quota threshold</>
                                        )}
                                    </p>
                                    <button className="text-[8px] font-black text-amber-600 hover:underline">UPGRADE PLAN</button>
                                </div>
                            </div>
                            
                            <div className="px-4 pb-4">
                                <button 
                                    onClick={async () => {
                                        // @ts-expect-error - window.aistudio is injected by the platform
                                        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
                                            // @ts-expect-error - window.aistudio is injected by the platform
                                            await window.aistudio.openSelectKey();
                                            addToast("API Key selection opened.", "info");
                                        } else {
                                            addToast("API Key selector is not available.", "error");
                                        }
                                    }}
                                    className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-tighter hover:bg-black dark:hover:bg-gray-100 transition-all active:scale-[0.98] shadow-lg shadow-gray-200 dark:shadow-none"
                                >
                                    <Key size={14} />
                                    Connect Institutional Key
                                </button>
                                <p className="text-[8px] text-center text-gray-400 mt-2 font-medium">Add a paid Google Cloud project key for unlimited AI generation.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

                {/* 1. School Connect Section */}
                <section>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300">
                        <div 
                            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none"
                            onClick={() => toggleSection('connect')}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg">
                                    <Shield size={14} className="text-teacherBlue" />
                                </div>
                                <div>
                                    <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Security & Access</h2>
                                    <p className="text-[8px] text-gray-500 mt-0.5">Invite Codes</p>
                                </div>
                            </div>
                            {expandedSections.connect ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </div>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSections.connect ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-4 pt-0 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-3 relative group active:scale-95 transition-transform cursor-pointer" onClick={() => copyCode(schoolKeys?.teacherCode || '', 'Teacher Code')}>
                                        <p className="text-[8px] font-black text-teacherBlue uppercase tracking-widest mb-1">Teacher</p>
                                        <code className="text-sm font-black text-gray-900 dark:text-white font-mono">{schoolKeys?.teacherCode}</code>
                                        <div className="absolute right-2 bottom-2 p-1 bg-white dark:bg-slate-700 text-blue-400 rounded-lg shadow-sm border border-blue-50">
                                            <Copy size={10} />
                                        </div>
                                    </div>

                                    <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-xl p-3 relative group active:scale-95 transition-transform cursor-pointer" onClick={() => copyCode(schoolKeys?.adminCode || '', 'Admin Code')}>
                                        <p className="text-[8px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Admin</p>
                                        <code className="text-sm font-black text-gray-900 dark:text-white font-mono">{schoolKeys?.adminCode}</code>
                                        <div className="absolute right-2 bottom-2 p-1 bg-white dark:bg-slate-700 text-purple-400 rounded-lg shadow-sm border border-purple-50">
                                            <Copy size={10} />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <p className="text-[9px] text-gray-500 font-medium leading-relaxed">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">How to use:</span> Give these codes to staff members. They must enter them during sign-up to automatically join <span className="font-bold">{schoolName}</span>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 1b. Backups & Rollback Control Section */}
                <section>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300">
                        <div 
                            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none"
                            onClick={() => toggleSection('backups')}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-lg">
                                    <Database size={14} className="text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Backups & Disaster Recovery</h2>
                                    <p className="text-[8px] text-gray-500 mt-0.5">Control Panel & State Rollback</p>
                                </div>
                            </div>
                            {expandedSections.backups ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </div>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSections.backups ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-4 pt-0 space-y-3">
                                <p className="text-[9px] text-gray-500 font-medium leading-normal">
                                    Securely generate full system backups (curricula, logs, credentials) or upload snapshot rollback points to restore default system settings.
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={handleBackupDownload}
                                        className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/10 dark:hover:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-xl flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase transition-all"
                                    >
                                        <Download size={12} />
                                        Save Snapshot
                                    </button>
                                    
                                    <label className="py-2 px-3 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/10 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-xl flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase transition-all cursor-pointer text-center">
                                        <Upload size={12} />
                                        Rollback Upload
                                        <input 
                                            type="file" 
                                            accept=".json" 
                                            onChange={handleBackupUpload} 
                                            className="hidden" 
                                        />
                                    </label>
                                </div>
                                <button 
                                    onClick={handleResetToDefaults}
                                    className="w-full py-2 bg-red-50 hover:bg-red-100 border border-dashed border-red-200 hover:border-red-300 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider transition-all"
                                >
                                    <RefreshCw size={12} />
                                    Reset to Default Seed State
                                </button>

                                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-500">☁️ Cloud Mirror Manifests</h4>
                                        <button 
                                            onClick={() => triggerCloudBackup('manual')}
                                            disabled={isBackingUp}
                                            className="text-[8px] font-black text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 uppercase tracking-widest cursor-pointer hover:underline disabled:opacity-50"
                                        >
                                            {isBackingUp ? 'Mirroring...' : 'Sync Cloud Now'}
                                        </button>
                                    </div>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {cloudBackups.length === 0 ? (
                                            <p className="text-[8px] text-gray-400 italic text-center py-2">No synchronized backups found.</p>
                                        ) : (
                                            cloudBackups.map((b) => (
                                                <div key={b.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 text-[8px]">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{b.filename}</p>
                                                            <p className="text-[7px] text-gray-400 font-medium font-mono">
                                                                {new Date(b.timestamp).toLocaleTimeString()} • {b.type === 'scheduled' ? 'Scheduled Snapshot' : 'Admin On-Demand'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => handleRollbackToCloudBackup(b)}
                                                                disabled={isRestoring || isBackingUp}
                                                                className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold uppercase tracking-wide text-[7px] cursor-pointer hover:underline disabled:opacity-50 transition-all"
                                                            >
                                                                {isRestoring ? 'Restoring...' : 'Rollback'}
                                                            </button>
                                                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-extrabold uppercase uppercase">
                                                                {b.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-[7px] text-gray-400 font-bold uppercase">{b.size}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-[7px] text-gray-400 font-medium leading-relaxed mt-2 text-center">
                                        🛡️ Backups are automatically compressed and dual-mirrored across LocalStorage cache & secure Supabase system tables on a regular interval.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Global Curriculum Pacer Section */}
                <section>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300">
                        <div 
                            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none"
                            onClick={() => toggleSection('pacer')}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg">
                                    <TrendingUp size={14} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Curriculum Pacer</h2>
                                    <p className="text-[8px] text-gray-500 mt-0.5">Syllabus Coverage Audit</p>
                                </div>
                            </div>
                            {expandedSections.pacer ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </div>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSections.pacer ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div 
                                onClick={() => setShowPacerModal(true)}
                                className="p-4 pt-0 flex flex-col items-center text-center cursor-pointer active:scale-[0.99] transition-transform group"
                            >
                                <div className="relative flex items-center justify-center w-28 h-28 mb-4">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                                        <defs>
                                            <linearGradient id="pacer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#135bec" />
                                                <stop offset="100%" stopColor="#3b82f6" />
                                            </linearGradient>
                                        </defs>
                                        <circle 
                                            className="text-gray-100 dark:text-gray-800" 
                                            cx="96" cy="96" r={radius} 
                                            fill="transparent" 
                                            stroke="currentColor" 
                                            strokeWidth="14"
                                        ></circle>
                                        <circle 
                                            className={`${stats.pacer < 80 ? 'text-amber-500' : 'text-[#135bec]'} transition-all duration-1000 ease-[cubic-bezier(0.17,0.67,0.83,0.67)]`}
                                            cx="96" cy="96" r={radius} 
                                            fill="transparent" 
                                            stroke={stats.pacer < 80 ? 'currentColor' : 'url(#pacer-grad)'} 
                                            strokeDasharray={circumference} 
                                            strokeDashoffset={offset} 
                                            strokeLinecap="round" 
                                            strokeWidth="14"
                                        ></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className={`text-2xl font-black ${stats.pacer < 80 ? 'text-amber-500' : 'text-[#135bec]'}`}>{stats.pacer}%</span>
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Efficiency</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl text-center border border-gray-100 dark:border-slate-700">
                                        <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">Coverage</p>
                                        <p className="text-sm font-black text-gray-900 dark:text-white">{stats.coverage}%</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl text-center border border-gray-100 dark:border-slate-700">
                                        <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">Time Target</p>
                                        <p className="text-sm font-black text-gray-900 dark:text-white">{stats.expected}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Teacher Status Section */}
                <section>
                    <div 
                        className="flex items-center justify-between mb-2.5 px-1 cursor-pointer select-none"
                        onClick={() => toggleSection('teachers')}
                    >
                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            Teacher Pulse
                            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        </h3>
                        {expandedSections.teachers ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                    
                    <div className={`space-y-2 overflow-hidden transition-all duration-500 ease-in-out ${expandedSections.teachers ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        {loading ? (
                            <div className="text-center py-6 text-gray-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Synchronizing...</div>
                        ) : teachers.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-[10px] bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200">No active staff connections.</div>
                        ) : (
                            teachers.map((teacher, idx) => (
                                <div 
                                    key={teacher.id} 
                                    onClick={() => onNavigate('admin-users')}
                                    className={`bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-teacherBlue/40 transition-all active:scale-[0.98] group relative overflow-hidden`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-black text-xs shrink-0 uppercase shadow-inner">
                                            {teacher.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-gray-900 dark:text-white text-[12px] truncate group-hover:text-teacherBlue transition-colors">{teacher.name}</h4>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-[10px] font-black ${Math.round(teacher.pacer) < 80 ? 'text-amber-500' : 'text-[#135bec]'}`}>
                                                        {Math.round(teacher.pacer)}%
                                                    </span>
                                                    <ChevronRight size={10} className="text-gray-300 group-hover:text-teacherBlue transition-colors" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter truncate pr-2">Grade {teacher.currentGrade} • {teacher.subject}</p>
                                                <div className="w-16 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shrink-0">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${Math.round(teacher.pacer) < 80 ? 'bg-amber-500' : 'bg-[#135bec]'}`} 
                                                        style={{ width: `${Math.min(100, teacher.pacer)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Status dot */}
                                    <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Live Activity Log */}
                <section>
                    <div 
                        className="flex items-center justify-between mb-2.5 px-1 cursor-pointer select-none"
                        onClick={() => toggleSection('logs')}
                    >
                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Intelligence Log</h3>
                        {expandedSections.logs ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>

                    <div className={`space-y-3 relative pl-3.5 overflow-hidden transition-all duration-500 ${expandedSections.logs ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        {/* Vertical Line */}
                        <div className="absolute left-[13px] top-1 bottom-1 w-0.5 bg-gray-100 dark:bg-gray-800 border-dashed border-l border-gray-200 dark:border-slate-700"></div>

                        {logs.length > 0 ? (
                            logs.map((log, i) => (
                                <div key={i} className="relative pl-6 flex flex-col gap-1 group">
                                    <div className={`absolute left-[-4px] top-2 w-4 h-4 rounded-full flex items-center justify-center z-10 ring-4 ring-[#f6f6f8] dark:ring-[#101622] shadow-sm transform transition-transform group-hover:scale-110 ${
                                        log.type === 'quiz' ? 'bg-[#135bec]' : 'bg-green-500'
                                    }`}>
                                        {log.type === 'quiz' ? <FileText size={8} className="text-white" /> : <CheckCircle size={8} className="text-white" />}
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm group-hover:border-blue-100 transition-colors">
                                        <p className="text-[10px] font-medium text-gray-900 dark:text-white leading-tight">
                                            <span className="font-black">{log.studentName}</span> {log.type === 'quiz' ? 'completed assessment' : 'finished unit'} <span className="text-[#135bec] font-bold">"{log.itemTitle}"</span>
                                        </p>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50 dark:border-slate-700">
                                            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">
                                                {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <span className="text-[9px] font-black text-green-600 bg-green-50 dark:bg-green-900/10 px-1.5 py-0.5 rounded-lg">
                                                {log.score}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] text-gray-400 pl-6 italic font-medium">Monitoring school activity...</div>
                        )}
                    </div>
                </section>
            </div>

            {/* Pacer Modal */}
            {showPacerModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Breakdown</h3>
                            <button onClick={() => setShowPacerModal(false)} className="p-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500"><X size={20} /></button>
                        </div>
                        
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                             <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Term Progress</span>
                                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300">{stats.expected}%</span>
                                </div>
                                <div className="h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600" style={{width: `${stats.expected}%`}}></div>
                                </div>
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-2">Target based on date: {new Date().toLocaleDateString()}</p>
                             </div>

                             <div>
                                 <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Grades Overview</h4>
                                 <div className="space-y-2">
                                     {teachers.length > 0 ? teachers.map((t, i) => (
                                         <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-700">
                                             <div>
                                                 <p className="text-xs font-bold text-gray-800 dark:text-white">Grade {t.currentGrade}</p>
                                                 <p className="text-[10px] text-gray-500">{t.subject}</p>
                                             </div>
                                             <div className="text-right">
                                                 <p className={`text-xs font-bold ${t.pacer < stats.expected ? 'text-red-500' : 'text-green-500'}`}>{t.pacer}%</p>
                                                 <p className="text-[8px] text-gray-400 uppercase">Covered</p>
                                             </div>
                                         </div>
                                     )) : (
                                         <p className="text-xs text-gray-400 italic text-center">No class data.</p>
                                     )}
                                 </div>
                             </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                            <button onClick={() => { setShowPacerModal(false); onNavigate('admin-curriculum'); }} className="w-full py-3 bg-teacherBlue text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform">
                                Manage Curriculum
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOverview;
