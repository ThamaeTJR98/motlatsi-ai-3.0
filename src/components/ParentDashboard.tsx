
import React, { useState, useEffect } from 'react';
import { UserState } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Home, MessageSquare, School, User, ArrowLeft, RefreshCw, GraduationCap } from 'lucide-react';
import ParentHome from './parent/ParentHome';
import ParentActivity from './parent/ParentActivity';
import ParentPacer from './parent/ParentPacer';
import ParentProfile from './parent/ParentProfile';

interface ParentDashboardProps {
    user: UserState;
    onLogout: () => void;
}

type ParentView = 'hub' | 'linking' | 'activity' | 'pacer' | 'profile';

const ParentDashboard: React.FC<ParentDashboardProps> = ({ user, onLogout }) => {
    const [view, setView] = useState<ParentView>('hub');
    const { updateUser } = useAuth();
    const children = React.useMemo(() => {
        try {
            let allUsers: any[] = [];
            if (user.isDemo) {
                allUsers = JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]');
            }
            const linkedIds = user.linkedStudentIds || [];
            return Array.isArray(allUsers) ? allUsers.filter((u: any) => linkedIds.includes(u.id.toString())) : [];
        } catch (e) {
            return [];
        }
    }, [user.linkedStudentIds, user.isDemo]);

    const [selectedChild, setSelectedChild] = useState<any>(() => {
        if (children.length > 0) return children[0];
        return null;
    });
    const [linkingCode, setLinkingCode] = useState<string[]>(new Array(6).fill(''));
    const { addToast } = useToast();

    // Sync selectedChild when children change if none selected
    useEffect(() => {
        if (children.length > 0 && !selectedChild) {
            const timer = setTimeout(() => {
                setSelectedChild(children[0]);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [children, selectedChild]);

    // Handle selecting a child from Home -> Pacer
    const handleSelectChild = (child: any) => {
        setSelectedChild(child);
        setView('pacer');
    };

    const handleLinkChild = () => {
        const code = linkingCode.join('').trim().toUpperCase();
        if (code.length < 6) {
            addToast("Enter the full 6-digit code.", "error");
            return;
        }
        
        addToast("Linking student record...", "info");
        
        setTimeout(() => {
            const allUsers = JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]');
            let targetStudent: any = null;
            
            if (code === '777777' || code === '000007' || code === 'PAL777') {
                targetStudent = allUsers.find((u: any) => u.id === '7');
            } else if (code === '111111' || code === '000001' || code === 'KHO111' || code === 'KHO666') {
                targetStudent = allUsers.find((u: any) => u.id === 'student-1');
            } else {
                // Look up any student matching id/containing id, or match by character
                targetStudent = allUsers.find((u: any) => u.role === 'student' && (
                    code.includes(u.id.toUpperCase()) || 
                    u.id.toUpperCase().includes(code)
                ));
            }
            
            if (!targetStudent) {
                addToast("No student found. For demo, try entering '777777' for Palesa Masoabi.", "error");
                return;
            }
            
            const currentLinked = user.linkedStudentIds || [];
            if (currentLinked.includes(targetStudent.id.toString())) {
                addToast(`${targetStudent.name} is already linked to your account!`, "info");
                setView('hub');
                return;
            }
            
            const updatedLinked = [...currentLinked, targetStudent.id.toString()];
            
            // 1. Update active state in React and localStorage via updateUser hook
            updateUser({ linkedStudentIds: updatedLinked });
            
            // 2. Persist in the users database so it loads correctly on refresh
            const updatedUsers = allUsers.map((u: any) => {
                if (u.id === user.id) {
                    return { ...u, linkedStudentIds: updatedLinked };
                }
                return u;
            });
            localStorage.setItem('motlatsi_admin_users', JSON.stringify(updatedUsers));
            
            // Clear code input digits
            setLinkingCode(new Array(6).fill(''));
            
            // Select the newly linked child active
            setSelectedChild(targetStudent);
            addToast(`Successfully linked ${targetStudent.name}!`, "success");
            setView('hub');
        }, 1200);
    };

    const getLogs = () => {
        if (user.isDemo) {
            return JSON.parse(localStorage.getItem('motlatsi_activity_log') || '[]')
                .filter((l: any) => selectedChild && l.studentId === selectedChild.id.toString());
        }
        return [];
    };

    return (
        <div className="w-full max-w-[430px] mx-auto h-[100dvh] bg-[#F9F9FB] dark:bg-[#0f0d09] font-sans relative flex flex-col shadow-2xl overflow-hidden md:rounded-[3rem] md:my-4 md:border-[8px] md:border-black">
            <div className="flex-1 overflow-hidden relative">
                {view === 'hub' && (
                    <ParentHome 
                        user={user} 
                        children={children} 
                        onLinkChild={() => setView('linking')} 
                        onSelectChild={handleSelectChild} 
                    />
                )}
                {view === 'activity' && (
                    <ParentActivity 
                        child={selectedChild} 
                        activityLog={getLogs()} 
                        onBack={() => setView('hub')} 
                    />
                )}
                {view === 'pacer' && (
                    <ParentPacer 
                        child={selectedChild} 
                        activityLog={getLogs()} 
                        onBack={() => setView('hub')} 
                    />
                )}
                {view === 'profile' && (
                    <ParentProfile 
                        user={user} 
                        onLogout={onLogout} 
                    />
                )}
                {view === 'linking' && (
                    <div className="flex flex-col h-full bg-white dark:bg-[#1c1810]">
                        <div className="flex items-center p-4 pb-2 justify-between mt-4">
                            <button onClick={() => setView('hub')} className="text-[#181611] dark:text-white p-2">
                                <ArrowLeft size={24} />
                            </button>
                            <h2 className="text-[#181611] dark:text-white text-lg font-bold flex-1 text-center font-display">Add a Student</h2>
                            <div className="w-10"></div>
                        </div>
                        
                        <div className="px-6 pt-10 text-center flex-1">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <GraduationCap className="text-primary" size={40} />
                            </div>
                            <h2 className="text-[#181611] dark:text-white text-2xl font-bold mb-3 font-display">Enter Student Code</h2>
                            <p className="text-[#6b614d] dark:text-gray-400 text-sm mb-8 px-2">
                                Sync your child's progress by entering the unique 6-digit code found in their Student Profile.
                            </p>
                            
                            <div className="flex justify-center gap-2 px-4 mb-10">
                                {linkingCode.map((val, idx) => (
                                    <input
                                        key={idx}
                                        type="text"
                                        maxLength={1}
                                        value={val}
                                        autoFocus={idx === 0}
                                        onChange={(e) => {
                                            const next = [...linkingCode];
                                            next[idx] = e.target.value.toUpperCase();
                                            setLinkingCode(next);
                                            if (e.target.value && e.target.nextSibling) {
                                                (e.target.nextSibling as HTMLInputElement).focus();
                                            }
                                        }}
                                        className="flex h-14 w-11 text-center bg-gray-50 dark:bg-zinc-800 rounded-xl border-2 border-transparent focus:border-primary focus:ring-0 text-xl font-bold dark:text-white transition-all shadow-inner"
                                        placeholder="•"
                                    />
                                ))}
                            </div>

                            <button onClick={handleLinkChild} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                <RefreshCw size={18} className={linkingCode.join('').length === 6 ? "" : "opacity-0"} />
                                <span>Sync Student</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Nav - Fixed at bottom of container */}
            {view !== 'linking' && (
                <nav className="shrink-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 pb-safe-parent pt-2 px-6 flex justify-between items-center z-50 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
                    <NavIcon 
                        icon={<Home />} 
                        label="Home" 
                        active={view === 'hub'} 
                        onClick={() => setView('hub')} 
                    />
                    <NavIcon 
                        icon={<MessageSquare />} 
                        label="Activity" 
                        active={view === 'activity'} 
                        onClick={() => {
                            if (children.length > 0 && !selectedChild) setSelectedChild(children[0]);
                            setView('activity');
                        }} 
                    />
                    <NavIcon 
                        icon={<School />} 
                        label="Pulse" 
                        active={view === 'pacer'} 
                        onClick={() => {
                            if (children.length > 0 && !selectedChild) setSelectedChild(children[0]);
                            setView('pacer');
                        }}
                    />
                    <NavIcon 
                        icon={<User />} 
                        label="Profile" 
                        active={view === 'profile'} 
                        onClick={() => setView('profile')} 
                    />
                </nav>
            )}
        </div>
    );
};

const NavIcon = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 ${active ? 'text-primary' : 'text-[#a1a1aa] dark:text-[#52525b] hover:text-gray-500'}`}
    >
        <div className={`p-1 rounded-xl transition-all duration-300 ${active ? 'bg-primary/10 -translate-y-0.5' : ''}`}>
            {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { 
                size: 22, 
                strokeWidth: active ? 2.5 : 2,
                fill: active ? "currentColor" : "none",
                className: active ? "fill-primary/20" : ""
            })}
        </div>
        <span className={`text-[9px] font-bold tracking-tight transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
);

export default ParentDashboard;
