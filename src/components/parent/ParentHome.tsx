
import React, { useState } from 'react';
import { UserState } from '../../types';
import { 
    Plus, ChevronRight, GraduationCap, 
    TrendingUp, Bell, Search, Star, Info, X, Trophy, BookOpen
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ParentHomeProps {
    user: UserState;
    children: any[];
    onLinkChild: () => void;
    onSelectChild: (child: any) => void;
}

const ParentHome: React.FC<ParentHomeProps> = ({ user, children, onLinkChild, onSelectChild }) => {
    const { addToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [showTipModal, setShowTipModal] = useState(false);
    const [showMasteryModal, setShowMasteryModal] = useState(false);
    const [showBadgesModal, setShowBadgesModal] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
    };

    const handleNotificationClick = () => {
        addToast("You have no new notifications.", "info");
    };

    const filteredChildren = children.filter(child => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return child.name.toLowerCase().includes(query) || 
               `grade ${child.currentGrade}`.toLowerCase().includes(query) ||
               (child.school && child.school.toLowerCase().includes(query));
    });

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] font-sans">
            <header className="p-4 md:p-6 pt-6 md:pt-8 pb-3 md:pb-4">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Welcome back,</p>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-display">{user.name}</h1>
                    </div>
                    <button 
                        onClick={handleNotificationClick}
                        className="size-9 md:size-11 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                    >
                        <Bell size={18} />
                    </button>
                </div>

                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                        <Search size={16} />
                    </div>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search student reports..." 
                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl md:rounded-2xl py-2.5 md:py-3.5 pl-10 md:pl-12 pr-4 text-[13px] font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm dark:text-white"
                    />
                </form>
            </header>

            <main className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 space-y-4 md:space-y-8 no-scrollbar">
                {/* Linked Students Section */}
                <section>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-slate-900 dark:text-white text-base md:text-lg font-bold font-display">Student Records</h2>
                        <button 
                            onClick={onLinkChild}
                            className="bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                        >
                            <Plus size={14} />
                            <span className="text-[10px] font-bold">Add New</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {children.length > 0 ? (
                            filteredChildren.length > 0 ? (
                                filteredChildren.map((child) => (
                                    <button 
                                        key={child.id}
                                        onClick={() => onSelectChild(child)}
                                        className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left group"
                                    >
                                        <div className="size-11 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0 relative overflow-hidden">
                                            <GraduationCap size={22} />
                                            <div className="absolute bottom-0 right-0 p-0.5">
                                                <div className="size-1.5 bg-green-500 rounded-full border border-white dark:border-slate-800"></div>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{child.name}</h3>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Grade {child.currentGrade} • Motlatsi Student</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded-lg text-slate-400 group-hover:text-primary group-hover:bg-primary/5 transition-all">
                                            <ChevronRight size={14} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-400 text-xs italic">
                                    No students match your search filter.
                                </div>
                            )
                        ) : (
                            <div className="text-center py-10 px-6 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                <div className="size-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                    <TrendingUp size={24} />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">No Students Linked</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                    Use the student's unique sync code to begin tracking their educational journey.
                                </p>
                                <button 
                                    onClick={onLinkChild}
                                    className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold text-xs shadow-lg shadow-primary/25 active:scale-95"
                                >
                                    Connect Student
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Quick Stats Section */}
                {children.length > 0 && (
                    <section className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setShowMasteryModal(true)}
                            className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-left active:scale-[0.98] transition-transform cursor-pointer"
                        >
                            <div className="flex bg-emerald-50 dark:bg-emerald-900/10 p-1.5 rounded-lg w-fit mb-3">
                                <TrendingUp size={14} className="text-emerald-500" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-0.5">84%</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Avg Mastery</p>
                        </button>
                        <button 
                            onClick={() => setShowBadgesModal(true)}
                            className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-left active:scale-[0.98] transition-transform cursor-pointer"
                        >
                            <div className="flex bg-blue-50 dark:bg-blue-900/10 p-1.5 rounded-lg w-fit mb-3">
                                <Star size={14} className="text-blue-500" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-0.5">12</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Badges Earned</p>
                        </button>
                    </section>
                )}

                {/* Parent Hub Tips */}
                <section className="bg-gradient-to-br from-indigo-500 to-primary p-5 rounded-2xl text-white overflow-hidden relative shadow-lg shadow-primary/20">
                    <div className="relative z-10">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5 opacity-80 flex items-center gap-1.5">
                            <Info size={9} /> Parent Tip
                        </p>
                        <h3 className="text-base font-bold mb-2 leading-tight">Support Learning at Home</h3>
                        <p className="text-xs text-indigo-50 font-medium leading-relaxed opacity-90 mb-3">
                            Try checking the "Pulse" tab daily to see where you can offer extra learning support.
                        </p>
                        <button 
                            onClick={() => setShowTipModal(true)}
                            className="bg-white text-primary px-3.5 py-1.5 rounded-lg text-[11px] font-bold shadow-sm active:scale-95 transition-all"
                        >
                            Learn More
                        </button>
                    </div>
                    {/* Abstract SVG shapes for decoration */}
                    <svg className="absolute -bottom-10 -right-10 w-32 h-32 opacity-20" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="50" fill="white" />
                    </svg>
                </section>
            </main>

            {/* Tip Modal */}
            {showTipModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <Info size={28} />
                            </div>
                            <button 
                                onClick={() => setShowTipModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 font-display">How to use "Pulse"</h3>
                        <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed pb-8">
                             <p>
                                The Pulse tool uses AI to analyze your child's progress. If they are falling behind, it generates a <span className="font-bold text-primary">"Smart Intervention"</span>.
                             </p>
                             <p>
                                You can launch these action plans directly to assign remedial concepts and support their learning journey.
                             </p>
                        </div>
                        <button 
                            onClick={() => setShowTipModal(false)}
                            className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}

            {/* Mastery detail modal */}
            {showMasteryModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-12 bg-emerald-50 dark:bg-emerald-950/10 rounded-2xl flex items-center justify-center text-emerald-500">
                                <TrendingUp size={24} />
                            </div>
                            <button 
                                onClick={() => setShowMasteryModal(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 font-display">Academic Mastery</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-4 uppercase tracking-widest">Subject-by-Subject Status</p>
                        
                        <div className="space-y-4 mb-6">
                            {[
                                { name: 'Sesotho Literature', score: 90, color: 'bg-indigo-500', note: 'Exceptional native prose' },
                                { name: 'Mathematics', score: 85, color: 'bg-emerald-500', note: 'Strong arithmetic, reviewing fractions' },
                                { name: 'English Vocabulary', score: 84, color: 'bg-blue-500', note: 'Expanded reading comprehension' },
                                { name: 'Natural Science', score: 78, color: 'bg-amber-500', note: 'Improving in Ecosystem modules' },
                            ].map((sub, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-700 dark:text-slate-300">{sub.name}</span>
                                        <span className="text-slate-950 dark:text-white">{sub.score}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                        <div className={`h-full ${sub.color}`} style={{ width: `${sub.score}%` }} />
                                    </div>
                                    <p className="text-[9px] text-slate-400 italic">{sub.note}</p>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => setShowMasteryModal(false)}
                            className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/25 active:scale-[0.98] transition-all text-xs"
                        >
                            Return to Parent Hub
                        </button>
                    </div>
                </div>
            )}

            {/* Badges detail modal */}
            {showBadgesModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-12 bg-blue-50 dark:bg-blue-950/10 rounded-2xl flex items-center justify-center text-blue-500">
                                <Trophy size={24} />
                            </div>
                            <button 
                                onClick={() => setShowBadgesModal(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 font-display">Student Badges Record</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-4 uppercase tracking-widest">12 Total Rewards Earned</p>
                        
                        <div className="space-y-3 mb-6">
                            {[
                                { title: 'Socrates Junior', desc: 'Completed 10 consecutive quizzes with perfect scores', date: 'Earned May 12', unlocked: true, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' },
                                { title: 'Morabaraba Master', desc: 'Won 5 mental math battles in the arcade mode', date: 'Earned May 28', unlocked: true, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' },
                                { title: 'Thaba-Bosiu Climber', desc: 'Explored 8 distinct syllabus topics in the study library', date: 'Earned Today', unlocked: true, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20' },
                                { title: 'Weekly Fire Streak', desc: 'Study 5 consecutive school days to trigger active multipliers', date: 'Locked: 4/5 days', unlocked: false, color: 'bg-slate-50 text-slate-400 dark:bg-slate-900/50' },
                            ].map((badge, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-start gap-2.5 ${badge.unlocked ? 'opacity-100' : 'opacity-60'}`}>
                                    <div className={`p-2 rounded-lg shrink-0 ${badge.color}`}>
                                        <Trophy size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{badge.title}</h4>
                                            {badge.unlocked && <span className="text-[8px] bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30 px-1 py-0.5 rounded font-extrabold uppercase font-mono">Unlocked</span>}
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">{badge.desc}</p>
                                        <p className="text-[8px] text-slate-400 font-semibold mt-1 font-mono">{badge.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => setShowBadgesModal(false)}
                            className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/25 active:scale-[0.98] transition-all text-xs"
                        >
                            Return to Parent Hub
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentHome;
