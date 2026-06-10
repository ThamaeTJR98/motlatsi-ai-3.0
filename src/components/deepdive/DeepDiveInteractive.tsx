import React, { useState, useEffect, useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { PhaseProps, Hotspot, LabItem } from './types';
import { 
    ArrowLeft, ArrowRight, X, Volume2, 
    Sparkles, CheckCircle, GripVertical, RotateCcw, 
    Zap, Layers, Box, Cpu, Play, Pause
} from 'lucide-react';

type Mode = 'explore' | 'practice';

export const DeepDiveInteractive: React.FC<PhaseProps> = ({ content, onNext, onBack, initialMode }) => {
    const [mode, setMode] = useState<Mode>(initialMode || 'explore');
    const [isComplete, setIsComplete] = useState(false);
    
    // --- Explore State ---
    const slide = content.slide;
    const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
    const [narrationPlaying, setNarrationPlaying] = useState(false);
    

    // --- Practice State ---
    const lab = content.lab;
    const [deckItems, setDeckItems] = useState<LabItem[]>(lab.items);
    const [zone1Items, setZone1Items] = useState<LabItem[]>([]);
    const [zone2Items, setZone2Items] = useState<LabItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [showAiSheet, setShowAiSheet] = useState(false);
    const [aiMessage, setAiMessage] = useState("Tap an item, then choose its correct zone.");

    const hotspotRef = useFocusTrap(!!activeHotspot);
    const successRef = useFocusTrap(showAiSheet);

    // --- Explore Logic ---


    const handleSpeechToggle = () => {
        if (narrationPlaying) {
            window.speechSynthesis.cancel();
            setNarrationPlaying(false);
        } else {
            const u = new SpeechSynthesisUtterance(slide.narrationText);
            u.onend = () => setNarrationPlaying(false);
            window.speechSynthesis.speak(u);
            setNarrationPlaying(true);
        }
    };

    const speakHotspot = (text: string) => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(u);
    }

    // --- Practice Logic ---
    const handleSelect = (id: string) => {
        setSelectedItem(id === selectedItem ? null : id);
        setFeedback(null);
        setAiMessage("Now select the correct zone above.");
    };

    const handleZoneSelect = (zone: 'zone1' | 'zone2') => {
        if (!selectedItem) {
            setAiMessage("Please select an item from the Knowledge Deck first.");
            return;
        }

        const item = deckItems.find(i => i.id === selectedItem);
        if (!item) return;

        if (item.correctZone === zone) {
            // Correct
            if (zone === 'zone1') setZone1Items([...zone1Items, item]);
            else setZone2Items([...zone2Items, item]);
            
            setDeckItems(prev => prev.filter(i => i.id !== selectedItem));
            setFeedback({ type: 'success', message: 'Correct match!' });
            setAiMessage("Great job! Keep going.");
            setSelectedItem(null);

            // Check completion
            if (deckItems.length === 1) { // This was the last item
                setIsComplete(true);
                setAiMessage("Lab Complete! Review your work or continue.");
                setShowAiSheet(true); // Show success sheet
            }
        } else {
            // Incorrect
            setFeedback({ type: 'error', message: 'Try again!' });
            setAiMessage(`That doesn't seem right. "${item.label}" doesn't belong in ${zone === 'zone1' ? lab.zone1Label : lab.zone2Label}.`);
        }
    };

    const renderExplore = () => (
        <section aria-labelledby="explore-heading" className="flex-1 flex flex-col px-5 pb-24 overflow-y-auto pt-4">
            {/* Title */}
            <div className="mb-6 text-center">
                <h2 id="explore-heading" className="editorial-title text-2xl font-bold tracking-tight text-slate-900 leading-tight mb-1">Interactive System</h2>
                <p className="text-xs text-slate-500">Tap the nodes to explore components.</p>
            </div>

            {/* CSS Schematic Diagram */}
            <div className="relative w-full aspect-square max-w-[280px] mx-auto mb-6">
                {/* Central Node */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div role="img" aria-label="Central Processing Unit icon" className="size-24 rounded-full bg-gradient-to-br from-[#347db2] to-[#2c6a8c] shadow-2xl shadow-[#347db2]/30 flex items-center justify-center z-10 relative">
                        <Cpu className="text-white" size={36} />
                        <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-pulse"></div>
                    </div>
                    
                    {/* Orbit Rings */}
                    <div className="absolute size-56 rounded-full border border-dashed border-[#E0E4E7] animate-[spin_20s_linear_infinite]" aria-hidden="true"></div>
                    <div className="absolute size-40 rounded-full border border-[#E0E4E7]" aria-hidden="true"></div>
                </div>

                {/* Hotspots */}
                {slide.hotspots.map((hs, i) => {
                    const angle = (i / slide.hotspots.length) * 2 * Math.PI - (Math.PI / 2);
                    const radius = 42; // percentage
                    const x = 50 + radius * Math.cos(angle);
                    const y = 50 + radius * Math.sin(angle);

                    return (
                        <button
                            key={i}
                            aria-label={`Explore ${hs.label}`}
                            aria-describedby="narration-text"
                            onClick={() => setActiveHotspot(hs)}
                            className="absolute size-12 z-20 cursor-pointer transition-transform hover:scale-110 active:scale-95 group flex items-center justify-center"
                            style={{ top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' }}
                        >
                            <span className="absolute inset-0 rounded-full bg-[#347db2]/40 animate-ping" aria-hidden="true"></span>
                            <span className="absolute inset-0 rounded-full bg-[#347db2]/20 animate-pulse" aria-hidden="true"></span>
                            <span className="relative size-10 rounded-full bg-white shadow-xl border-2 border-[#347db2] flex items-center justify-center z-10" aria-hidden="true">
                                {i === 0 ? <Zap size={18} className="text-[#347db2]" /> : 
                                 i === 1 ? <Layers size={18} className="text-[#347db2]" /> : 
                                 <Box size={18} className="text-[#347db2]" />}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Narration Card */}
            <div className="bg-white p-4 rounded-xl border border-[#E0E4E7] soft-shadow relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#347db2]/10 rounded-lg text-[#347db2]" aria-hidden="true">
                            <Volume2 size={14} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">System Overview</span>
                    </div>
                    <button 
                        onClick={handleSpeechToggle}
                        aria-label={narrationPlaying ? 'Pause narration' : 'Play narration'}
                        className="size-7 rounded-full bg-[#347db2] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform hover:bg-[#347db2]/90"
                    >
                        {narrationPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                    </button>
                </div>
                <p id="narration-text" className="text-xs text-slate-600 leading-relaxed">
                    {slide.narrationText}
                </p>
            </div>

            {/* CTA to Next Phase */}
            <div className="mt-4">
                <button 
                    onClick={onNext}
                    className="w-full bg-[#347db2] hover:bg-[#347db2]/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#347db2]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    <span>Continue to Practice</span>
                    <ArrowRight size={16} aria-hidden="true" />
                </button>
            </div>
        </section>
    );

    const renderPractice = () => (
        <section aria-labelledby="practice-heading" className="flex-1 flex flex-col px-4 pt-2 pb-6 overflow-y-auto min-h-0">
            <h2 id="practice-heading" className="sr-only">Knowledge Lab: Sort items into the correct categories.</h2>
            {/* Zones Container */}
            <div className="relative w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E0E4E7] flex flex-col h-[40vh] mb-3 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-[#347db2]/5 to-[#D1A447]/5 pointer-events-none" aria-hidden="true"></div>
                
                <div className="relative z-10 flex flex-row h-full p-2 gap-2">
                    {/* Zone 1 */}
                    <button 
                        onClick={() => handleZoneSelect('zone1')}
                        aria-label={`Drop selected item into ${lab.zone1Label}`}
                        disabled={!selectedItem}
                        className={`flex-1 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-start py-2 relative overflow-y-auto no-scrollbar
                            ${selectedItem ? 'border-[#347db2] bg-[#347db2]/5 animate-pulse' : 'border-[#E0E4E7] bg-white/40'}
                        `}
                    >
                        <span className="text-[9px] font-bold text-[#347db2] uppercase tracking-widest mb-1.5 bg-white px-2 py-0.5 rounded-full shadow-sm border border-[#E0E4E7]">{lab.zone1Label}</span>
                        <div className="flex flex-col gap-1 w-full px-1">
                            {zone1Items.map((item) => (
                                <div key={item.id} className="w-full bg-white p-1.5 rounded-lg shadow-sm text-[9px] font-bold text-center border border-[#E0E4E7] animate-in zoom-in text-slate-700">
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </button>

                    {/* Zone 2 */}
                    <button 
                        onClick={() => handleZoneSelect('zone2')}
                        aria-label={`Drop selected item into ${lab.zone2Label}`}
                        disabled={!selectedItem}
                        className={`flex-1 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-start py-2 relative overflow-y-auto no-scrollbar
                            ${selectedItem ? 'border-[#347db2] bg-[#347db2]/5 animate-pulse' : 'border-[#E0E4E7] bg-white/40'}
                        `}
                    >
                        <span className="text-[9px] font-bold text-[#347db2] uppercase tracking-widest mb-1.5 bg-white px-2 py-0.5 rounded-full shadow-sm border border-[#E0E4E7]">{lab.zone2Label}</span>
                        <div className="flex flex-col gap-1 w-full px-1">
                            {zone2Items.map((item) => (
                                <div key={item.id} className="w-full bg-white p-1.5 rounded-lg shadow-sm text-[9px] font-bold text-center border border-[#E0E4E7] animate-in zoom-in text-slate-700">
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </button>
                </div>
            </div>

            {/* AI Helper */}
            <div role="status" aria-live="polite" className="mb-3 px-1">
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${feedback?.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : feedback?.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-[#347db2]/5 border-[#347db2]/10 text-[#347db2]'}`}>
                    <div className="shrink-0" aria-hidden="true">
                        {feedback?.type === 'error' ? <RotateCcw size={14} /> : feedback?.type === 'success' ? <CheckCircle size={14} /> : <Sparkles size={14} />}
                    </div>
                    <p className="text-[11px] font-medium leading-tight">{aiMessage}</p>
                </div>
            </div>

            {/* Deck */}
            <div className="flex-1 overflow-y-auto">
                <h3 id="deck-heading" className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1.5 px-1">Knowledge Deck</h3>
                {deckItems.length > 0 ? (
                    <ul aria-labelledby="deck-heading" className="space-y-1.5">
                        {deckItems.map((item) => (
                            <li key={item.id}>
                                <button 
                                    onClick={() => handleSelect(item.id)}
                                    aria-pressed={selectedItem === item.id}
                                    className={`flex w-full items-center justify-between gap-2 p-2.5 rounded-xl border transition-all active:scale-[0.98] 
                                        ${selectedItem === item.id 
                                            ? 'bg-[#347db2] text-white border-[#347db2] shadow-lg shadow-[#347db2]/30' 
                                            : 'bg-white text-slate-900 border-[#E0E4E7] shadow-sm hover:border-[#347db2]/30'
                                        }
                                    `}
                                >
                                    <span className="text-xs font-bold">{item.label}</span>
                                    <GripVertical size={14} className={selectedItem === item.id ? 'text-white/70' : 'text-slate-300'} aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div role="status" className="h-16 flex flex-col items-center justify-center text-center text-slate-400 border-2 border-dashed border-[#E0E4E7] rounded-xl bg-slate-50">
                        <CheckCircle size={16} className="mb-0.5 text-green-500" aria-hidden="true" />
                        <p className="text-[10px] font-bold">All items sorted!</p>
                    </div>
                )}
            </div>
        </section>
    );

    return (
        <main className="bg-[#FBFBF8] text-slate-900 min-h-screen flex flex-col font-['Manrope',_sans-serif]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@500;700&family=Manrope:wght@400;500;700&display=swap');
                .editorial-title { font-family: 'Epilogue', sans-serif; }
                .soft-shadow { box-shadow: 0 10px 30px -5px rgba(52, 125, 178, 0.05), 0 4px 12px -4px rgba(52, 125, 178, 0.03); }
            `}</style>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#FBFBF8]/80 backdrop-blur-md border-b border-[#E0E4E7]/50 px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                    <button onClick={onBack} aria-label="Go back to previous phase" className="text-[#347db2] hover:bg-[#347db2]/10 p-2 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    
                    {/* Mode Switcher - Hidden if initialMode is provided */}
                    {!initialMode && (
                        <div role="tablist" aria-label="Lesson Mode" className="flex bg-[#E0E4E7]/50 p-1 rounded-full">
                            <button 
                                role="tab"
                                aria-selected={mode === 'explore'}
                                onClick={() => setMode('explore')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${mode === 'explore' ? 'bg-white text-[#347db2] shadow-sm' : 'text-slate-500'}`}
                            >
                                Explore
                            </button>
                            <button 
                                role="tab"
                                aria-selected={mode === 'practice'}
                                onClick={() => setMode('practice')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${mode === 'practice' ? 'bg-white text-[#347db2] shadow-sm' : 'text-slate-500'}`}
                            >
                                Practice
                            </button>
                        </div>
                    )}

                    {initialMode && (
                        <div className="flex flex-col items-center">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#347db2] mb-0.5">
                                {initialMode === 'explore' ? 'Phase 2' : 'Phase 3'}
                            </p>
                            <h1 className="text-sm font-bold text-slate-900 leading-none">
                                {initialMode === 'explore' ? 'Interactive Explore' : 'Knowledge Lab'}
                            </h1>
                        </div>
                    )}

                    <div className="w-9"></div> {/* Spacer for alignment */}
                </div>
            </header>

            {mode === 'explore' ? renderExplore() : renderPractice()}

            {/* Hotspot Modal */}
            {activeHotspot && (
                <div ref={hotspotRef} role="dialog" aria-modal="true" aria-labelledby="hotspot-heading" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveHotspot(null)}>
                    <div className="bg-white w-full max-w-xs md:max-w-sm rounded-3xl p-6 shadow-2xl border border-white/50 animate-in zoom-in-95 duration-300 relative" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 id="hotspot-heading" className="editorial-title text-xl font-bold text-slate-900 mb-1">{activeHotspot.label}</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#347db2] bg-[#347db2]/10 px-2 py-0.5 rounded">Key Component</p>
                            </div>
                            <button onClick={() => setActiveHotspot(null)} aria-label="Close modal" className="p-1 bg-[#E0E4E7]/50 rounded-full text-slate-500 hover:bg-[#E0E4E7]">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-6">
                            {activeHotspot.description}
                        </p>
                        <button 
                            onClick={() => speakHotspot(activeHotspot.description)}
                            aria-label="Listen to description"
                            className="w-full bg-[#347db2] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#347db2]/20 active:scale-[0.98] hover:bg-[#347db2]/90 transition-colors"
                        >
                            <Volume2 size={18} />
                            <span>Listen</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Success Sheet */}
            {showAiSheet && (
                <div ref={successRef} role="dialog" aria-modal="true" aria-labelledby="success-heading" className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl p-8 animate-in slide-in-from-bottom-full">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="size-20 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-4 shadow-sm border border-green-100" aria-hidden="true">
                                <Sparkles size={40} />
                            </div>
                            <h2 id="success-heading" className="editorial-title text-3xl font-bold mb-2 text-slate-900">Lab Mastered!</h2>
                            <p className="text-slate-500">You've successfully categorized all items.</p>
                        </div>
                        <button 
                            onClick={onNext}
                            className="w-full bg-[#347db2] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#347db2]/20 mb-3 flex items-center justify-center gap-2 hover:bg-[#347db2]/90 transition-colors"
                        >
                            <span>Complete Lesson</span>
                            <ArrowRight size={20} aria-hidden="true" />
                        </button>
                        <button 
                            onClick={() => {
                                setZone1Items([]);
                                setZone2Items([]);
                                setDeckItems(lab.items);
                                setIsComplete(false);
                                setShowAiSheet(false);
                                setAiMessage("Let's try that again. Tap an item to start.");
                            }}
                            className="w-full py-3 text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors"
                        >
                            Restart Lab
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
};
