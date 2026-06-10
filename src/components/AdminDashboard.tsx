import React, { useEffect, useState } from 'react';
import { 
    Activity, Users, Bell, CheckCircle, AlertTriangle, 
    Clock, FileText, ChevronRight, TrendingUp 
} from 'lucide-react';
import { GradeRecord } from '../types';

interface AdminDashboardProps {
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
    const [stats, setStats] = useState({ 
        pacer: 84, 
        planned: 91, 
        taught: 77 
    });
    const [teachers, setTeachers] = useState<any[]>(() => {
        // 1. Load Teachers
        const allUsers = JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]');
        const teacherList = allUsers.filter((u: any) => u.role === 'Teacher');
        
        // If no teachers in DB, seed with template data for visualization
        if (teacherList.length === 0) {
            return [
                { id: 't1', name: 'Mrs. Molefe', role: 'Teacher', email: 'molefe@school.ls', currentGrade: '10', subject: 'Mathematics', status: 'ahead', pacer: 92 },
                { id: 't2', name: 'Mr. Khumalo', role: 'Teacher', email: 'khumalo@school.ls', currentGrade: '12', subject: 'Physical Science', status: 'behind', pacer: 78 },
                { id: 't3', name: 'Ms. Naidoo', role: 'Teacher', email: 'naidoo@school.ls', currentGrade: '8', subject: 'English', status: 'on-track', pacer: 85 }
            ];
        } else {
            // Enhance real teachers with mock stats for the dashboard demo
            return teacherList.map((t: any, idx: number) => ({
                ...t,
                subject: idx % 2 === 0 ? 'Mathematics' : 'Science', // Mock subject if missing
                pacer: 70 + Math.floor(Math.random() * 30), // Mock pacer score
                status: Math.random() > 0.3 ? 'ahead' : 'behind'
            }));
        }
    });

    const [logs, setLogs] = useState<GradeRecord[]>(() => {
        // 2. Load Activity Log
        const activity = JSON.parse(localStorage.getItem('motlatsi_activity_log') || '[]');
        return activity.slice(0, 5); // Top 5 recent
    });

    // SVG Gauge Calculations
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (stats.pacer / 100) * circumference;

    return (
        <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#101622] font-sans pb-24">
            {/* Top App Bar - Compact */}
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#101622]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="bg-[#135bec]/10 p-2 rounded-lg text-[#135bec]">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold leading-tight text-gray-900 dark:text-white">Teacher Performance</h1>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Term 3 • Week 6</p>
                    </div>
                </div>
                <button className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors">
                    <Bell size={18} />
                </button>
            </header>

            <main className="p-3 space-y-4 max-w-md mx-auto">
                {/* Global Curriculum Pacer Section - Compact */}
                <section>
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
                        <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Global Curriculum Pacer</h2>
                        
                        {/* Gauge - Reduced Size */}
                        <div className="relative flex items-center justify-center w-36 h-36 mb-4">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                                {/* Background Circle */}
                                <circle 
                                    className="text-gray-100 dark:text-gray-800" 
                                    cx="96" cy="96" r={radius} 
                                    fill="transparent" 
                                    stroke="currentColor" 
                                    strokeWidth="12"
                                ></circle>
                                {/* Progress Circle */}
                                <circle 
                                    className="text-[#135bec] transition-all duration-1000 ease-out" 
                                    cx="96" cy="96" r={radius} 
                                    fill="transparent" 
                                    stroke="currentColor" 
                                    strokeDasharray={circumference} 
                                    strokeDashoffset={offset} 
                                    strokeLinecap="round" 
                                    strokeWidth="12"
                                ></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-extrabold text-[#135bec]">{stats.pacer}%</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">SCHOOL-WIDE</span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-300 max-w-[200px] leading-relaxed">
                            Overall term content planned and taught across all grades.
                        </p>

                        <div className="mt-4 flex gap-4 w-full pt-4 border-t border-gray-50 dark:border-gray-800">
                            <div className="flex-1">
                                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Planned</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.planned}%</p>
                            </div>
                            <div className="w-px bg-gray-100 dark:bg-gray-800"></div>
                            <div className="flex-1">
                                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Taught</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.taught}%</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Teacher Status Section - Compact */}
                <section>
                    <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Teacher Status</h3>
                        <button className="text-[#135bec] text-[10px] font-bold uppercase tracking-wider hover:underline">View All</button>
                    </div>
                    
                    <div className="space-y-3">
                        {teachers.map((teacher) => (
                            <div key={teacher.id} className={`bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 ${teacher.status === 'behind' ? 'opacity-100' : 'opacity-100'}`}>
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-sm shrink-0">
                                        {teacher.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{teacher.name}</h4>
                                            <span className={`text-[10px] font-bold ${teacher.status === 'behind' ? 'text-amber-500' : 'text-[#135bec]'}`}>{teacher.pacer}%</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 font-medium">Grade {teacher.currentGrade} • {teacher.subject}</p>
                                        
                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${teacher.status === 'behind' ? 'bg-amber-500' : 'bg-[#135bec]'}`} 
                                                style={{ width: `${teacher.pacer}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <div className={`mt-3 p-2 rounded-lg flex items-center gap-2 border ${
                                    teacher.status === 'behind' 
                                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400' 
                                    : 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400'
                                }`}>
                                    {teacher.status === 'behind' ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                                    <p className="text-[10px] font-bold leading-tight">
                                        {teacher.status === 'behind' ? 'Action: Assessment delayed' : 'On track, 2 lessons ahead'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Live Activity Log Section - Compact */}
                <section className="pt-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 px-1">Live Activity Log</h3>
                    <div className="space-y-4 relative pl-4">
                        {/* Vertical Line */}
                        <div className="absolute left-[21px] top-2 bottom-4 w-px bg-gray-200 dark:bg-gray-800"></div>

                        {logs.length > 0 ? (
                            logs.map((log, i) => (
                                <div key={i} className="relative pl-8 flex flex-col gap-0.5">
                                    <div className={`absolute left-0 top-0.5 w-5 h-5 rounded-full flex items-center justify-center z-10 ring-4 ring-[#f6f6f8] dark:ring-[#101622] ${
                                        log.type === 'quiz' ? 'bg-[#135bec]' : 'bg-green-500'
                                    }`}>
                                        {log.type === 'quiz' ? <FileText size={10} className="text-white" /> : <CheckCircle size={10} className="text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-900 dark:text-white leading-snug">
                                            <span className="font-bold">{log.studentName}</span> {log.type === 'quiz' ? 'completed' : 'accessed'} <span className="text-[#135bec]">{log.itemTitle}</span>
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                            {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Mock Logs if empty
                            <>
                                <div className="relative pl-8 flex flex-col gap-0.5">
                                    <div className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-[#135bec] flex items-center justify-center z-10 ring-4 ring-[#f6f6f8] dark:ring-[#101622]">
                                        <FileText size={10} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-900 dark:text-white leading-snug">
                                            <span className="font-bold">Mrs. Molefe</span> uploaded Gr 10 Math Assessment
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">2 min ago</p>
                                    </div>
                                </div>
                                <div className="relative pl-8 flex flex-col gap-0.5">
                                    <div className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center z-10 ring-4 ring-[#f6f6f8] dark:ring-[#101622]">
                                        <CheckCircle size={10} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-900 dark:text-white leading-snug">
                                            <span className="font-bold">Mr. Khumalo</span> marked 32 assignments
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">15 min ago</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AdminDashboard;