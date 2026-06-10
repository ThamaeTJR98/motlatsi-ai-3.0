
import React, { useState } from 'react';
import { GradeRecord } from '../../types';
import { 
    ArrowLeft, Calendar, Filter, 
    BookOpen, Zap, Trophy, MessageCircle, MoreVertical,
    Clock, CheckCircle, AlertCircle, X, Heart, Star
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ParentActivityProps {
    child: any | null;
    activityLog: GradeRecord[];
    onBack: () => void;
}

const ParentActivity: React.FC<ParentActivityProps> = ({ child, activityLog, onBack }) => {
    const { addToast } = useToast();
    const [selectedActivity, setSelectedActivity] = useState<GradeRecord | null>(null);
    const [filterMenuOpen, setFilterMenuOpen] = useState(false);

    // Sort activity by date (newest first)
    const sortedActivity = [...activityLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleSendPraise = (activity: GradeRecord) => {
        addToast(`Great job! Praise sent to ${child.name} for ${activity.itemTitle}.`, "success");
    };

    const handleSeeRewards = (activity: GradeRecord) => {
        addToast("Checking educational rewards wallet...", "info");
        setTimeout(() => {
            setSelectedActivity(activity);
        }, 600);
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] font-sans">
            <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 p-3 pt-6 md:p-4 md:pt-8">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors active:scale-90">
                            <ArrowLeft size={18} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <h1 className="text-base font-bold text-slate-900 dark:text-white font-display">Activity Feed</h1>
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                            className={`p-1.5 rounded-lg transition-all ${filterMenuOpen ? 'bg-primary text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                        >
                            <Filter size={16} />
                        </button>
                        {filterMenuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 p-1.5 animate-in fade-in zoom-in-95 origin-top-right">
                                {['All Activity', 'Quizzes', 'Battles', 'Mastery'].map((f) => (
                                    <button 
                                        key={f}
                                        onClick={() => {
                                            setFilterMenuOpen(false);
                                            addToast(`Filtering by ${f}...`, "info");
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300"
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {child && (
                    <div className="flex items-center gap-1.5 mt-1 ml-8 md:ml-10">
                        <div className="size-1.5 bg-primary rounded-full animate-pulse"></div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tracking: {child.name}</p>
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-6 pb-24 no-scrollbar">
                {!child ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 text-slate-400">
                            <Calendar size={32} />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">Select a Student</h3>
                        <p className="text-[11px] text-slate-500 max-w-[180px] mt-1.5">Go back to Home to select a student and view their activity feed.</p>
                    </div>
                ) : sortedActivity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 text-slate-400">
                            <Clock size={32} />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">No Activity Yet</h3>
                        <p className="text-[11px] text-slate-500 max-w-[180px] mt-1.5">Activity will appear here as {child.name.split(' ')[0]} completes lessons and quizzes.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedActivity.map((activity, idx) => {
                            const isPassing = (activity.score / activity.total) >= 0.6;
                            const date = new Date(activity.date);
                            const relativeDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

                            return (
                                <div key={activity.id || idx} className="relative pl-8 group">
                                    {/* Timeline line */}
                                    {idx !== sortedActivity.length - 1 && (
                                        <div className="absolute left-[15px] top-8 bottom-[-16px] w-0.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/20 transition-colors"></div>
                                    )}
                                    
                                    {/* Timeline dot */}
                                    <div className={`absolute left-0 top-1 size-8 rounded-full border-[3px] border-[#f8fafc] dark:border-[#0f172a] flex items-center justify-center z-10 shadow-sm transition-transform active:scale-90 ${
                                        activity.type === 'quiz' ? 'bg-primary' : 
                                        activity.type === 'battle' ? 'bg-orange-500' : 'bg-green-500'
                                    }`}>
                                        {activity.type === 'quiz' ? <BookOpen size={14} className="text-white" /> : 
                                         activity.type === 'battle' ? <Zap size={14} className="text-white" /> : 
                                         <CheckCircle size={14} className="text-white" />}
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-50 dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="min-w-0">
                                                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                                    {activity.type === 'quiz' ? 'Quiz Completed' : 
                                                     activity.type === 'battle' ? 'Battle Finished' : 'Assignment Done'}
                                                </h4>
                                                <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                                                    <Calendar size={8} /> {relativeDate} • {activity.itemTitle}
                                                </p>
                                            </div>
                                            <div className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold ${
                                                isPassing ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'
                                            }`}>
                                                {Math.round((activity.score / activity.total) * 100)}%
                                            </div>
                                        </div>

                                        <div className="flex bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl items-center justify-between mt-2">
                                            <div className="flex gap-1 overflow-hidden">
                                                {Array.from({ length: activity.total }).map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`size-1 rounded-full ${i < activity.score ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                    ></div>
                                                ))}
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400">{activity.score} / {activity.total}</p>
                                        </div>

                                        <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-slate-50 dark:border-slate-700/50">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => handleSeeRewards(activity)}
                                                    className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-primary transition-colors active:scale-95"
                                                >
                                                    <Trophy size={12} /> Rewards
                                                </button>
                                                <button 
                                                    onClick={() => handleSendPraise(activity)}
                                                    className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-primary transition-colors active:scale-95"
                                                >
                                                    <MessageCircle size={12} /> Praise
                                                </button>
                                            </div>
                                            <button className="text-slate-300 hover:text-slate-600 active:scale-90 transition-transform">
                                                <MoreVertical size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Rewards Modal Overlay */}
            {selectedActivity && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
                        <button 
                            onClick={() => setSelectedActivity(null)}
                            className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                        >
                            <X size={20} className="text-slate-400" />
                        </button>
                        
                        <div className="text-center">
                            <div className="size-20 bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] flex items-center justify-center text-amber-500 mx-auto mb-6 shadow-sm border border-amber-100 dark:border-amber-900/30">
                                <Trophy size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 font-display">Badge Earned!</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 px-4">
                                {child?.name.split(' ')[0]} earned the <span className="font-bold text-amber-600">"Topic Master"</span> badge for their performance in {selectedActivity.itemTitle}.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl">
                                    <div className="flex justify-center mb-1 text-primary">
                                        <Star size={16} fill="currentColor" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">+50</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl">
                                    <div className="flex justify-center mb-1 text-red-500">
                                        <Heart size={16} fill="currentColor" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Streak</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">2 Days</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => {
                                    handleSendPraise(selectedActivity);
                                    setSelectedActivity(null);
                                }}
                                className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
                            >
                                Send a Message
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentActivity;
