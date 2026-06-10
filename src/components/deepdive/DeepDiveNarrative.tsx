import React, { useState, useEffect, useRef } from 'react';
import { PhaseProps, NarrativeItem } from './types';
import parse from 'html-react-parser';
import { 
    ArrowLeft, Bookmark, BookOpen, Info, Lightbulb, 
    Database, Zap, Star, ArrowRight, Volume2, Pause, 
    ChevronDown, ChevronUp
} from 'lucide-react';

export const DeepDiveNarrative: React.FC<PhaseProps> = ({ content, onNext, onBack }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [expandedChapter, setExpandedChapter] = useState<string | null>(() => {
        const firstChapter = content.narrative.find(item => item.type === 'chapter');
        return firstChapter ? firstChapter.id : null;
    });
    const [progress, setProgress] = useState(0);
    const mainRef = useRef<HTMLDivElement>(null);
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Sync expanded chapter if narrative changes and nothing is expanded
    useEffect(() => {
        if (!expandedChapter) {
            const firstChapter = content.narrative.find(item => item.type === 'chapter');
            if (firstChapter) {
                const timer = setTimeout(() => {
                    setExpandedChapter(firstChapter.id);
                }, 0);
                return () => clearTimeout(timer);
            }
        }
    }, [content.narrative, expandedChapter]);

    // Scroll Progress Logic
    useEffect(() => {
        const handleScroll = () => {
            if (mainRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
                const scrollProgress = (scrollTop / (scrollHeight - clientHeight)) * 100;
                setProgress(Math.min(100, Math.max(0, scrollProgress)));
            }
        };

        const mainElement = mainRef.current;
        if (mainElement) {
            mainElement.addEventListener('scroll', handleScroll);
            // Trigger once to set initial state
            handleScroll();
        }

        return () => {
            if (mainElement) {
                mainElement.removeEventListener('scroll', handleScroll);
            }
        };
    }, [mainRef]);

    // Read Aloud Logic
    useEffect(() => {
        return () => {
            if (speechRef.current) {
                window.speechSynthesis.cancel();
            }
        };
    }, [speechRef]);

    const handleReadAloud = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        } else {
            // Construct full text from narrative items
            const fullText = content.narrative
                .map(item => `${item.title || ''}. ${item.text}`)
                .join(' ');
            
            const u = new SpeechSynthesisUtterance(fullText);
            u.onend = () => setIsPlaying(false);
            speechRef.current = u;
            window.speechSynthesis.speak(u);
            setIsPlaying(true);
        }
    };

    const toggleChapter = (id: string) => {
        const newExpandedChapter = expandedChapter === id ? null : id;
        setExpandedChapter(newExpandedChapter);
        if (newExpandedChapter) {
            setTimeout(() => {
                const element = document.getElementById(`chapter-content-${id}`);
                element?.focus();
            }, 300); // Delay to allow for animation
        }
    };

    const renderNarrativeItem = (item: NarrativeItem) => {
        switch (item.type) {
            case 'intro':
                return (
                    <section key={item.id} aria-labelledby={`intro-heading-${item.id}`} className="text-center space-y-2 mb-6">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#D1A447]/10 text-[#D1A447] rounded-full">
                            <BookOpen size={10} />
                            <span className="text-[9px] font-bold uppercase tracking-wide">{item.duration || '3 min read'}</span>
                        </div>
                        <h1 id={`intro-heading-${item.id}`} className="editorial-title text-xl md:text-2xl font-bold leading-tight text-slate-900">
                            {item.title}
                        </h1>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                            {item.text}
                        </p>
                    </section>
                );
            
            case 'chapter': {
                const isExpanded = expandedChapter === item.id;
                return (
                    <div 
                        key={item.id}
                        className={`bg-white rounded-xl soft-shadow border border-[#E0E4E7]/50 overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-[#347db2]/20' : ''}`}
                    >
                        <h2 className="editorial-title text-base font-bold flex items-center gap-3 text-slate-900 m-0">
                            <button 
                                onClick={() => toggleChapter(item.id)}
                                aria-expanded={isExpanded}
                                aria-controls={`chapter-content-${item.id}`}
                                className="w-full p-4 flex items-center justify-between text-left"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="size-5 rounded-full bg-[#347db2]/10 text-[#347db2] flex items-center justify-center text-[10px] font-bold" aria-hidden="true">
                                        {item.chapterNumber}
                                    </span>
                                    {item.title}
                                </span>
                                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </button>
                        </h2>
                        
                        <section 
                            ref={(el: HTMLDivElement | null) => {
                                if (item.chapterNumber) {
                                    // You can still store the ref if needed, but the focus logic will be handled in toggleChapter
                                }
                            }}
                            id={`chapter-content-${item.id}`}
                            hidden={!isExpanded}
                            tabIndex={-1}
                            className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                        >
                            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">{parse(item.text)}</div>
                            
                            {item.tags && item.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2" aria-label="Key vocabulary">
                                    {item.tags.map((tag, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 bg-[#E0E4E7]/30 px-2 py-0.5 rounded-lg border border-[#E0E4E7]/50">
                                            <Database size={12} className="text-slate-400" aria-label="Key vocabulary icon" />
                                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wide">{tag.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                );
            }

            case 'fact':
                return (
                    <div role="note" key={item.id} className="flex justify-center -my-1.5 relative z-10">
                        <div className="bg-[#FBFBF8] border border-[#347db2]/20 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm">
                            <Lightbulb size={14} className="text-[#347db2]" aria-hidden="true" />
                            <p className="text-[10px] text-slate-600">
                                <span className="font-bold text-[#347db2]">{item.title || 'Quick Fact'}:</span> {item.text}
                            </p>
                        </div>
                    </div>
                );

            case 'mastery':
                return (
                    <section key={item.id} aria-labelledby={`mastery-heading-${item.id}`} className="bg-gradient-to-br from-[#D1A447]/10 to-[#D1A447]/5 border border-[#D1A447]/20 rounded-xl p-3 flex gap-3 items-center mt-4">
                        <div className="bg-[#D1A447] rounded-full p-1.5 text-white shrink-0 shadow-sm" aria-hidden="true">
                            <Star size={14} />
                        </div>
                        <div>
                            <h2 id={`mastery-heading-${item.id}`} className="font-bold text-slate-800 text-[10px] uppercase tracking-wide mb-0.5">{item.title || 'Concept Mastery'}</h2>
                            <p className="text-[10px] text-slate-600 leading-normal">{item.text}</p>
                        </div>
                    </section>
                );

            default:
                return null;
        }
    };

    return (
        <div className="bg-[#FBFBF8] text-slate-900 h-screen flex flex-col font-['Manrope',_sans-serif] overflow-hidden">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@500;700&family=Manrope:wght@400;500;700&display=swap');
                .editorial-title { font-family: 'Epilogue', sans-serif; }
                .soft-shadow { box-shadow: 0 10px 30px -5px rgba(52, 125, 178, 0.05), 0 4px 12px -4px rgba(52, 125, 178, 0.03); }
            `}</style>
            
            {/* Progress Header - Responsive & Live */}
            <header className="sticky top-0 z-50 bg-[#FBFBF8]/95 backdrop-blur-md border-b border-[#E0E4E7]/50 px-4 py-2.5 shrink-0">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                    <button onClick={onBack} aria-label="Go back to lesson phases" className="text-[#347db2] hover:bg-[#347db2]/10 p-1.5 rounded-full transition-colors active:scale-95">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1 flex flex-col gap-1" role="status" aria-live="polite">
                        <div className="flex justify-between items-end">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#347db2]/70" aria-hidden="true">The Journey</span>
                            <span className="text-[9px] font-bold text-[#347db2]" aria-hidden="true">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1 w-full bg-[#E0E4E7] rounded-full overflow-hidden" aria-hidden="true">
                            <div 
                                className="h-full bg-[#347db2] rounded-full transition-all duration-300 ease-out" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="sr-only">Lesson progress: {Math.round(progress)}%</p>
                    </div>
                    <button 
                        onClick={handleReadAloud}
                        aria-label={isPlaying ? 'Pause reading aloud' : 'Read lesson aloud'}
                        className={`p-1.5 rounded-full transition-colors active:scale-95 ${isPlaying ? 'bg-[#347db2] text-white shadow-md shadow-[#347db2]/20' : 'text-slate-400 hover:text-[#347db2] hover:bg-[#347db2]/5'}`}
                    >
                        {isPlaying ? <Pause size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>
            </header>

            {/* Main Narrative Content - Scrollable */}
            <main 
                ref={mainRef}
                className="flex-1 overflow-y-auto px-4 pt-4 pb-20 scroll-smooth"
            >
                <article className="max-w-xl mx-auto space-y-4">
                    {content.narrative.map(renderNarrativeItem)}

                    {/* Primary Action */}
                    <div className="pt-4 pb-8">
                        <button 
                            onClick={onNext}
                            className="w-full bg-[#347db2] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#347db2]/20 hover:bg-[#347db2]/90 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] text-sm"
                        >
                            <span>Start Deep Dive</span>
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                        </button>
                    </div>
                </article>
            </main>
        </div>
    );
};
