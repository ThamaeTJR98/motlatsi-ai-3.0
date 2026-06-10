import React, { useEffect, useState } from 'react';
import { PhaseProps } from './types';
import { ArrowRight, CheckCircle, Target, Timer, RefreshCw, Star, Trophy, Zap, Share2 } from 'lucide-react';

interface SummaryProps extends PhaseProps {
    onNavigate: (view: string) => void;
    onComplete: () => void;
    stats?: {
        score: number;
        xp: number;
        time: string;
        accuracy: number;
    };
}

export const DeepDiveSummary: React.FC<SummaryProps> = ({ content, onNavigate, onComplete, onBack, stats }) => {
    const [animatedScore, setAnimatedScore] = useState(0);
    
    const finalStats = stats || {
        score: 88,
        xp: 450,
        time: "14m",
        accuracy: 92
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedScore(finalStats.score);
        }, 300);
        return () => clearTimeout(timer);
    }, [finalStats.score]);

    const masteryItems = content.narrative
        .filter(item => item.type === 'chapter')
        .map(chapter => ({
            title: chapter.title || "Concept",
            stars: 3
        }));

    const performanceMessage = finalStats.score >= 90 ? "Outstanding!" : finalStats.score >= 80 ? "Excellent Work!" : "Good Job!";

    return (
        <div className="flex flex-col h-full bg-[#FBFBF8] font-['Manrope',_sans-serif] text-slate-900 overflow-hidden">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@500;700&family=Manrope:wght@400;500;700&display=swap');
                .editorial-title { font-family: 'Epilogue', sans-serif; }
            `}</style>
            
            <header className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-[#E0E4E7] bg-[#FBFBF8]/90 backdrop-blur-sm z-20">
                <h1 className="editorial-title text-xl font-bold tracking-tight text-slate-900">Lesson Complete</h1>
                <div aria-label={`Gained ${finalStats.xp} experience points`} className="flex items-center gap-1 bg-[#D1A447]/10 px-3 py-1 rounded-full border border-[#D1A447]/20 animate-in zoom-in duration-500">
                    <Trophy size={14} className="text-[#D1A447]" aria-hidden="true" />
                    <span className="text-xs font-bold text-[#D1A447] uppercase tracking-wide">+{finalStats.xp} XP</span>
                </div>
            </header>

            <main className="flex-1 px-4 py-4 overflow-y-auto pb-6">
                
                <section aria-labelledby="summary-heading" className="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl shadow-sm border border-[#E0E4E7]">
                    <div 
                        role="progressbar"
                        aria-valuenow={animatedScore}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${animatedScore}% Mastery`}
                        className="relative size-20 shrink-0"
                    >
                        <svg className="size-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                            <path className="text-[#E0E4E7]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                            <path 
                                className="text-[#347db2] transition-all duration-1000 ease-out" 
                                strokeDasharray={`${animatedScore}, 100`} 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-[#347db2] leading-none">{animatedScore}%</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Mastery</span>
                        </div>
                    </div>
                    <div>
                        <h2 id="summary-heading" className="editorial-title text-xl font-bold leading-tight mb-1 text-slate-900" aria-live="polite">
                            {performanceMessage}
                        </h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            You've demonstrated {finalStats.score >= 90 ? "exceptional" : "strong"} understanding of {content.title}.
                        </p>
                    </div>
                </section>

                <section aria-labelledby="stats-grid-heading">
                    <h2 id="stats-grid-heading" className="sr-only">Performance Statistics</h2>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white p-3 rounded-xl border border-[#E0E4E7] flex flex-col gap-0.5 shadow-sm hover:border-[#347db2]/30 transition-colors">
                            <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                                <Target size={14} aria-hidden="true" />
                                <h3 id="accuracy-label" className="text-[10px] font-bold uppercase tracking-wider">Accuracy</h3>
                            </div>
                            <p aria-labelledby="accuracy-label" className="text-2xl font-bold text-slate-900">{finalStats.accuracy}%</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-[#E0E4E7] flex flex-col gap-0.5 shadow-sm hover:border-[#347db2]/30 transition-colors">
                            <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                                <Timer size={14} aria-hidden="true" />
                                <h3 id="time-label" className="text-[10px] font-bold uppercase tracking-wider">Time</h3>
                            </div>
                            <p aria-labelledby="time-label" className="text-2xl font-bold text-slate-900">{finalStats.time}</p>
                        </div>
                    </div>
                </section>

                <section aria-labelledby="mastery-heading">
                    <h3 id="mastery-heading" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Concept Mastery</h3>
                    <ul className="space-y-2">
                        {masteryItems.map((item, i) => (
                            <li key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E0E4E7] shadow-sm">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-5 rounded-full bg-green-100 flex items-center justify-center text-green-600" aria-hidden="true">
                                        <CheckCircle size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">{item.title}</span>
                                </div>
                                <div role="img" aria-label={`${item.stars} out of 3 stars`} className="flex items-center gap-1">
                                    <span className="sr-only">{item.stars} out of 3 stars</span>
                                    {[...Array(3)].map((_, starI) => (
                                        <Star 
                                            key={starI} 
                                            size={10} 
                                            className={`${starI < item.stars ? "text-yellow-500 fill-yellow-500" : "text-slate-200 fill-slate-200"}`} 
                                            aria-hidden="true"
                                        />
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                <div className="mt-6 space-y-2.5">
                    <button 
                        onClick={onComplete}
                        className="w-full bg-[#347db2] hover:bg-[#2c6a8c] text-white font-bold h-12 rounded-xl shadow-lg shadow-[#347db2]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"
                    >
                        <span>Complete Lesson</span>
                        <CheckCircle size={16} aria-hidden="true" />
                    </button>
                    <button 
                        onClick={() => onNavigate('student-hub')}
                        className="w-full bg-white text-slate-500 font-bold h-12 rounded-xl border border-[#E0E4E7] flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm hover:text-slate-900 hover:border-slate-300"
                    >
                        <RefreshCw size={16} aria-hidden="true" />
                        <span>Sync to Manage Hub</span>
                    </button>
                </div>

            </main>
        </div>
    );
};
