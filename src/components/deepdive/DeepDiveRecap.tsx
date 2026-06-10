import React, { useState, useEffect, useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { PhaseProps } from './types';
import { 
    ArrowLeft, MoreHorizontal, AudioWaveform, RotateCcw, 
    Play, Pause, CheckCircle, Mic, ArrowRight, FileText, Download, X,
    Send, Sparkles, MessageSquare
} from 'lucide-react';

export const DeepDiveRecap: React.FC<PhaseProps> = ({ content, onNext, onBack }) => {
    const recap = content.recap;
    const [audioProgress, setAudioProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showMenu, setShowMenu] = useState(false);
    const [showTutor, setShowTutor] = useState(false);
    const [tutorQuery, setTutorQuery] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const tutorInputRef = useRef<HTMLInputElement>(null);

    const menuTrapRef = useFocusTrap(showMenu);
    const tutorTrapRef = useFocusTrap(showTutor);
    

    // Parse duration string (e.g., "3:45") to seconds
    const parseDuration = (dur: string) => {
        const parts = dur.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 225; // Default to 3:45
    };
    const totalSeconds = parseDuration(recap.duration);



    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Audio Playback Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (isPlaying) {
            if (!window.speechSynthesis.speaking) {
                const text = `Lesson Recap: ${recap.title}. ${recap.points.map((p, i) => `Point ${i+1}: ${p.title}. ${p.desc}`).join('. ')}`;
                const u = new SpeechSynthesisUtterance(text);
                u.rate = playbackSpeed;
                u.onend = () => setIsPlaying(false);
                window.speechSynthesis.speak(u);
            }

            interval = setInterval(() => {
                setAudioProgress(prev => {
                    if (prev >= 100) {
                        setIsPlaying(false);
                        window.speechSynthesis.cancel();
                        return 100;
                    }
                    const step = (100 / (totalSeconds * 10)) * playbackSpeed; 
                    return prev + step;
                });
            }, 100);
        } else {
            window.speechSynthesis.cancel();
        }

        return () => {
            clearInterval(interval);
            window.speechSynthesis.cancel();
        };
    }, [isPlaying, totalSeconds, playbackSpeed, recap]);

    const handleRewind = () => {
        setAudioProgress(prev => Math.max(0, prev - (10 / totalSeconds * 100)));
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            setTimeout(() => setIsPlaying(true), 100);
        }
    };

    const toggleSpeed = () => {
        const speeds = [1, 1.25, 1.5, 2];
        const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
        setPlaybackSpeed(speeds[nextIdx]);
    };

    const formatTime = (percent: number) => {
        const currentSeconds = Math.floor((percent / 100) * totalSeconds);
        const m = Math.floor(currentSeconds / 60);
        const s = currentSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-[#FBFBF8] text-slate-900 min-h-screen flex flex-col font-['Manrope',_sans-serif]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@500;700&family=Manrope:wght@400;500;700&display=swap');
                .editorial-title { font-family: 'Epilogue', sans-serif; }
                .soft-shadow { box-shadow: 0 10px 30px -5px rgba(52, 125, 178, 0.05), 0 4px 12px -4px rgba(52, 125, 178, 0.03); }
            `}</style>
            
            <header className="shrink-0 z-20 bg-[#FBFBF8]/95 backdrop-blur-md px-4 pt-2 pb-1 border-b border-[#E0E4E7]">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={onBack} aria-label="Go back to lesson phases" className="p-1.5 -ml-1.5 text-slate-600 hover:bg-[#E0E4E7] rounded-full transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-[11.5px] font-bold tracking-tight text-center flex-1 uppercase text-slate-400">Lesson Recap</h1>
                    <div className="relative" ref={menuRef}>
                        <button 
                            onClick={() => setShowMenu(!showMenu)}
                            aria-haspopup="true"
                            aria-expanded={showMenu}
                            aria-controls="options-menu"
                            aria-label="More options"
                            className="p-1.5 -mr-1.5 text-slate-600 hover:bg-[#E0E4E7] rounded-full transition-colors"
                        >
                            <MoreHorizontal size={16} />
                        </button>
                        {showMenu && (
                            <div id="options-menu" ref={menuTrapRef} role="menu" className="absolute top-full right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-[#E0E4E7] p-1 animate-in fade-in zoom-in-95 origin-top-right z-50">
                                <button role="menuitem" className="w-full flex items-center gap-2 px-3 py-1.5 text-[10.5px] font-bold text-slate-700 hover:bg-[#FBFBF8] rounded-lg transition-colors">
                                    <FileText size={10} className="text-[#347db2]" aria-hidden="true" />
                                    <span>Transcript</span>
                                </button>
                                <button role="menuitem" className="w-full flex items-center gap-2 px-3 py-1.5 text-[10.5px] font-bold text-slate-700 hover:bg-[#FBFBF8] rounded-lg transition-colors">
                                    <Download size={10} className="text-[#347db2]" aria-hidden="true" />
                                    <span>Download</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <section aria-labelledby="audio-player-heading" className="bg-white rounded-xl shadow-sm border border-[#E0E4E7] p-2 mb-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="bg-[#347db2]/10 rounded-lg size-8 flex items-center justify-center text-[#347db2]" aria-hidden="true">
                            <AudioWaveform size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 id="audio-player-heading" className="text-[13.5px] font-bold truncate text-slate-900">{recap.title}</h2>
                            <p className="text-slate-500 text-[9.5px] font-medium uppercase tracking-wider">Audio • {recap.duration}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-1.5 justify-center">
                        <button 
                            onClick={handleRewind}
                            aria-label="Rewind 10 seconds"
                            className="text-slate-400 hover:text-[#347db2] transition-colors p-1 active:scale-90"
                        >
                            <RotateCcw size={14} />
                        </button>
                        <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                            className="bg-[#347db2] text-white size-8 rounded-full flex items-center justify-center shadow-md shadow-[#347db2]/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                        </button>
                        <button 
                            onClick={toggleSpeed}
                            aria-label={`Change playback speed. Current speed: ${playbackSpeed}x`}
                            className="text-slate-500 font-bold text-[9.5px] w-6 text-center hover:text-[#347db2] transition-colors bg-[#FBFBF8] rounded px-1 py-0.5"
                        >
                            {playbackSpeed}x
                        </button>
                    </div>

                    <div className="space-y-1">
                        <div 
                            role="slider"
                            aria-label="Audio progress"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={audioProgress}
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowRight') {
                                    setAudioProgress(p => Math.min(100, p + 5));
                                } else if (e.key === 'ArrowLeft') {
                                    setAudioProgress(p => Math.max(0, p - 5));
                                }
                            }}
                            className="relative w-full h-1 bg-[#E0E4E7] rounded-full overflow-hidden cursor-pointer"
                        >
                            <div 
                                className="absolute top-0 left-0 h-full bg-[#347db2] rounded-full transition-all duration-100" 
                                style={{ width: `${audioProgress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[8.5px] font-bold text-slate-400" aria-hidden="true">
                            <span>{formatTime(audioProgress)}</span>
                            <span>{recap.duration}</span>
                        </div>
                    </div>
                </section>
            </header>

            <main className="flex-1 px-4 pb-20 overflow-y-auto scroll-smooth">
                <div className="mb-2 mt-1 flex items-center justify-between">
                    <h3 id="takeaways-heading" className="editorial-title text-base font-bold text-slate-900 leading-tight">Key Takeaways</h3>
                    <p className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-[#D1A447]/10 text-[#D1A447] border border-[#D1A447]/20">
                        CORE CONCEPTS
                    </p>
                </div>

                <ol aria-labelledby="takeaways-heading" className="space-y-1.5">
                    {recap.points.map((point, i) => (
                        <li key={i} className="bg-white rounded-lg p-2.5 shadow-sm border border-[#E0E4E7] flex gap-2.5 items-start hover:border-[#347db2]/30 transition-colors">
                            <div className="flex-shrink-0 size-4 rounded-full bg-[#347db2]/10 flex items-center justify-center text-[#347db2] font-bold text-[9px] mt-0.5" aria-hidden="true">
                                {i + 1}
                            </div>
                            <div className="space-y-0.5 flex-1">
                                <h4 className="text-xs font-bold text-slate-900">{point.title}</h4>
                                <p className="text-slate-500 text-[10px] leading-relaxed">
                                    {point.desc}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>
            </main>

            <div className="fixed bottom-16 right-4 z-30">
                <button 
                    onClick={() => setShowTutor(true)}
                    aria-label="Ask Motlatsi AI Tutor"
                    className="size-10 bg-[#347db2] text-white rounded-full flex items-center justify-center shadow-xl shadow-[#347db2]/30 hover:scale-105 active:scale-95 transition-all border-2 border-white"
                >
                    <Mic size={16} />
                </button>
            </div>

            {showTutor && (
                <div ref={tutorTrapRef} role="dialog" aria-modal="true" aria-labelledby="tutor-heading" className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E0E4E7] overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                        <header className="p-2.5 border-b border-[#E0E4E7] flex items-center justify-between bg-[#347db2]/5">
                            <div className="flex items-center gap-2">
                                <div className="size-6 rounded-lg bg-[#347db2] flex items-center justify-center text-white" aria-hidden="true">
                                    <Sparkles size={12} />
                                </div>
                                <div>
                                    <h3 id="tutor-heading" className="text-xs font-bold text-slate-900">Ask Motlatsi Tutor</h3>
                                    <p className="text-[9px] text-slate-500">I'm here to help you understand</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTutor(false)} aria-label="Close AI Tutor" className="p-1 hover:bg-[#E0E4E7] rounded-full transition-colors text-slate-500">
                                <X size={14} />
                            </button>
                        </header>
                        
                        <div className="p-2.5 space-y-2.5 max-h-[35vh] overflow-y-auto">
                            <div className="flex gap-2">
                                <div className="size-5 rounded-full bg-[#347db2]/10 flex items-center justify-center text-[#347db2] shrink-0" aria-hidden="true">
                                    <MessageSquare size={10} />
                                </div>
                                <div className="bg-[#FBFBF8] p-2 rounded-xl rounded-tl-none text-[10.5px] leading-relaxed text-slate-700 border border-[#E0E4E7]">
                                    Hi! I've summarized the key points of {recap.title}. Do you have any specific questions?
                                </div>
                            </div>
                        </div>

                        <div className="p-2.5 bg-[#FBFBF8] border-t border-[#E0E4E7]">
                            <form onSubmit={(e) => e.preventDefault()} className="relative">
                                <label htmlFor="tutor-input" className="sr-only">Ask a question</label>
                                <input 
                                    id="tutor-input"
                                    ref={tutorInputRef}
                                    type="text" 
                                    placeholder="Ask a question..." 
                                    value={tutorQuery}
                                    onChange={(e) => setTutorQuery(e.target.value)}
                                    className="w-full bg-white border border-[#E0E4E7] rounded-lg py-1.5 pl-2.5 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-[#347db2]/20 focus:border-[#347db2] transition-all text-slate-900 placeholder:text-slate-400"
                                />
                                <button type="submit" aria-label="Send question" className="absolute right-1 top-1/2 -translate-y-1/2 size-6 bg-[#347db2] text-white rounded-md flex items-center justify-center shadow-sm active:scale-95 transition-transform hover:bg-[#347db2]/90">
                                    <Send size={10} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E0E4E7] px-4 py-2 z-40">
                <button 
                    onClick={onNext}
                    className="w-full bg-[#347db2] hover:bg-[#2c6a8c] text-white font-bold h-10 rounded-xl shadow-lg shadow-[#347db2]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"
                >
                    <span>Continue</span>
                    <ArrowRight size={16} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
};
