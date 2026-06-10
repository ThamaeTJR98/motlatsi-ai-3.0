
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Topic, AccessibilitySettings } from '../types';
import { aiClient } from '../utils/aiClient';
import { safeJsonParse } from '../utils/aiHelpers';
import { 
    X, MoreHorizontal, Volume2, RotateCw, 
    ArrowLeft, ArrowRight, Lightbulb, RefreshCw, 
    Share2, Star, Sparkles, Touchpad, Check, Repeat
} from 'lucide-react';

interface InclusiveFlashcardProps {
    topic: Topic;
    onBack: () => void;
    settings: AccessibilitySettings;
}

interface Flashcard {
    term: string;
    mnemonicPhrase: string;
    imageKeyword: string;
    explanation: string;
}

const InclusiveFlashcard: React.FC<InclusiveFlashcardProps> = ({ topic, onBack, settings }) => {
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [savedCards, setSavedCards] = useState<number[]>([]);

    // Persistence Key to save API calls
    const SESSION_KEY = `motlatsi_flashcards_${topic.id}`;

    const generateCards = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const systemInstruction = `
                You are an educational assistant creating flashcards for students in Lesotho.
                Create 5 educational flashcards for the provided topic.
                
                Each flashcard must include:
                - term: The concept name.
                - mnemonicPhrase: A short memory aid or simple analogy relevant to Lesotho context.
                - imageKeyword: A single visual noun describing the concept.
                - explanation: One clear sentence definition in simple words.
                
                Format: Strictly a JSON array of objects.
            `;

            const prompt = `Create flashcards for the topic: "${topic.title}".`;
            
            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    temperature: 0.3,
                    systemInstruction
                },
                cacheKey: `flashcards_${topic.id}`
            });

            const text = response.text;
            if (!text) {
                console.error("AI returned empty response for flashcards");
                throw new Error("Empty response");
            }

            const parsed = safeJsonParse<Flashcard[]>(text);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                setCards(parsed);
                localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
            } else {
                console.error("Invalid flashcard format received:", text);
                throw new Error("Invalid response");
            }
        } catch (e: any) {
            console.error("Flashcard Generation Error:", e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [topic.id, topic.title, SESSION_KEY]);

    useEffect(() => {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
            try {
                setCards(JSON.parse(saved));
                setLoading(false);
            } catch (e) {
                generateCards();
            }
        } else {
            generateCards();
        }
    }, [topic, SESSION_KEY, generateCards]);

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < cards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(c => c + 1), 150);
        } else {
            onBack(); // Finish
        }
    };

    const handleReview = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        // For now, reviewing simply keeps you on the card or moves to next without "mastered" state
        // In a real app, this would queue the card for later
        handleNext(); 
    };

    const toggleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedCards(prev => 
            prev.includes(currentIndex) 
                ? prev.filter(i => i !== currentIndex) 
                : [...prev, currentIndex]
        );
    };

    const speak = (text: string, e: React.MouseEvent) => {
        e.stopPropagation();
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(u);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#fafaf9] dark:bg-[#18181b] font-display">
            <div className="relative">
                <div className="absolute inset-0 bg-[#304fe8]/20 rounded-full animate-ping opacity-75"></div>
                <RefreshCw className="relative animate-spin text-[#304fe8]" size={40} />
            </div>
            <p className="mt-6 font-bold text-zinc-500 animate-pulse tracking-widest uppercase text-xs">Generating Concepts...</p>
        </div>
    );

    if (error || cards.length === 0) return (
        <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-[#fafaf9] dark:bg-[#18181b] font-display">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                <X className="text-red-500" size={32} />
            </div>
            <p className="text-zinc-800 dark:text-white font-bold text-lg">Unable to load cards</p>
            <button onClick={generateCards} className="mt-4 bg-[#304fe8] text-white px-6 py-2 rounded-xl shadow-lg hover:opacity-90 transition-opacity">Retry</button>
            <button onClick={onBack} className="mt-4 text-zinc-400 text-sm hover:underline">Go Back</button>
        </div>
    );

    const card = cards[currentIndex];
    const isSaved = savedCards.includes(currentIndex);
    const progress = ((currentIndex) / cards.length) * 100; // Progress for back card

    // --- FRONT TEMPLATE ---
    if (!isFlipped) {
        return (
            <div className="bg-[#fafaf9] dark:bg-[#18181b] font-display text-[#0e101b] dark:text-white min-h-screen flex flex-col overflow-hidden relative">
                {/* Background Decoration */}
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-40 dark:opacity-10 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#304fe8]/10 rounded-full blur-[80px]"></div>
                    <div className="absolute bottom-[20%] left-[-10%] w-64 h-64 bg-[#a29053]/10 rounded-full blur-[60px]"></div>
                </div>

                {/* Top Nav */}
                <header className="safe-top flex items-center justify-between px-6 pt-6 pb-4 relative z-10">
                    <button onClick={onBack} className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                        <ArrowLeft size={20} className="text-zinc-700 dark:text-zinc-200" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">Progress</span>
                        <h2 className="text-sm font-bold leading-tight tracking-tight">Card {currentIndex + 1}/{cards.length}</h2>
                    </div>
                    <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                        <MoreHorizontal size={20} className="text-zinc-700 dark:text-zinc-200" />
                    </button>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8 relative z-10">
                    {/* Section Indicator */}
                    <div className="px-4 py-1.5 rounded-full bg-[#304fe8]/10 dark:bg-[#304fe8]/20">
                        <p className="text-[#304fe8] dark:text-[#5c73e8] text-[10px] font-extrabold tracking-[0.15em] uppercase">Intro: Key Concepts</p>
                    </div>

                    {/* The Flashcard */}
                    <div 
                        onClick={() => setIsFlipped(true)}
                        className="relative w-full max-w-sm aspect-[3/4] group cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-[0_20px_50px_rgba(48,79,232,0.05),0_10px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center border border-zinc-100 dark:border-zinc-800 p-8 text-center transition-transform hover:scale-[1.01] active:scale-[0.98]">
                            {/* Abstract Concept Icon */}
                            <div className="mb-8 w-20 h-20 rounded-2xl bg-gradient-to-br from-[#304fe8]/5 to-[#304fe8]/20 flex items-center justify-center">
                                <Sparkles className="text-[#304fe8] w-10 h-10" strokeWidth={1.5} />
                            </div>
                            
                            {/* Main Term */}
                            <h1 className="text-4xl font-extrabold tracking-[-0.03em] mb-4 text-[#0e101b] dark:text-white">
                                {card.term}
                            </h1>

                            {/* Hint/Interaction Cue */}
                            <div className="mt-4 flex flex-col items-center gap-2">
                                <Touchpad className="animate-bounce text-zinc-300" size={24} />
                                <p className="text-zinc-400 text-xs font-medium tracking-widest uppercase">Tap to Reveal</p>
                            </div>

                            {/* Decorative Detail */}
                            <div className="absolute bottom-6 left-6 right-6 h-px bg-gradient-to-r from-transparent via-zinc-100 dark:via-zinc-800 to-transparent"></div>
                            <div className="absolute bottom-3 text-[9px] text-zinc-300 dark:text-zinc-600 tracking-widest uppercase">Motlatsi • Learn Your Way</div>
                        </div>
                    </div>

                    {/* Secondary Actions Bar */}
                    <div className="flex items-center justify-center gap-4 w-full max-w-sm">
                        <div className="flex flex-col items-center gap-2 group">
                            <button 
                                onClick={toggleSave}
                                className="rounded-full bg-white dark:bg-zinc-800 p-4 shadow-md transition-all hover:bg-[#a29053]/10 active:scale-90"
                            >
                                <Star className={isSaved ? "fill-[#a29053] text-[#a29053]" : "text-zinc-400"} size={24} strokeWidth={1.5} />
                            </button>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Save</p>
                        </div>

                        <button 
                            onClick={() => setIsFlipped(true)}
                            className="flex-1 flex min-w-[140px] cursor-pointer items-center justify-center rounded-xl h-14 bg-[#304fe8] text-white text-base font-bold tracking-widest uppercase shadow-lg shadow-[#304fe8]/30 transition-all hover:opacity-90 active:scale-95 gap-2"
                        >
                            <span>Flip</span>
                            <RotateCw size={20} />
                        </button>

                        <div className="flex flex-col items-center gap-2 group">
                            <button className="rounded-full bg-white dark:bg-zinc-800 p-4 shadow-md transition-all hover:bg-[#304fe8]/10 active:scale-90">
                                <Share2 className="text-zinc-400" size={24} strokeWidth={1.5} />
                            </button>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Share</p>
                        </div>
                    </div>
                </main>

                {/* Bottom Navigation Bar (Visual Only for Template fidelity) */}
                <nav className="bg-white/80 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 px-6 pt-4 pb-8 backdrop-blur-md">
                    <div className="flex justify-between items-end max-w-md mx-auto">
                        <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                            <span className="material-symbols-outlined text-2xl">home</span>
                            <p className="text-[10px] font-bold tracking-tight">Home</p>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-[#304fe8]">
                            <span className="material-symbols-outlined text-2xl">explore</span>
                            <p className="text-[10px] font-bold tracking-tight">Journey</p>
                            <div className="w-1 h-1 bg-[#304fe8] rounded-full mt-0.5"></div>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                            <span className="material-symbols-outlined text-2xl">swords</span>
                            <p className="text-[10px] font-bold tracking-tight">Battle</p>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                            <span className="material-symbols-outlined text-2xl">folder_shared</span>
                            <p className="text-[10px] font-bold tracking-tight">Manage</p>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                            <span className="material-symbols-outlined text-2xl">key</span>
                            <p className="text-[10px] font-bold tracking-tight">Access</p>
                        </div>
                    </div>
                </nav>
            </div>
        );
    }

    // --- BACK TEMPLATE ---
    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131c1f] font-display text-[#101719] dark:text-white transition-colors min-h-screen flex flex-col overflow-hidden relative">
            <div className="relative flex h-full w-full flex-col max-w-[430px] mx-auto bg-[#f6f7f8] dark:bg-[#131c1f] flex-1">
                
                {/* Top Progress Indicator */}
                <div className="w-full pt-4 px-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#1f637a]/60 dark:text-[#1f637a]/80">Intro Section: {currentIndex + 1} of {cards.length}</span>
                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#1f637a]">{Math.round(((currentIndex + 1) / cards.length) * 100)}%</span>
                    </div>
                    <div className="h-1 w-full bg-[#1f637a]/10 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1f637a] transition-all duration-500" style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}></div>
                    </div>
                </div>

                {/* Top App Bar */}
                <div className="flex items-center px-4 py-6 justify-between">
                    <button onClick={() => setIsFlipped(false)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowLeft size={24} className="text-zinc-700 dark:text-white" />
                    </button>
                    <h2 className="text-sm font-bold tracking-[0.1em] uppercase">Key Concepts</h2>
                    <div className="w-10 h-10 flex items-center justify-center">
                        <MoreHorizontal size={24} className="text-zinc-700 dark:text-white" />
                    </div>
                </div>

                {/* Main Content Area (Flashcard) */}
                <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
                    <div className="w-full bg-white dark:bg-[#1c272b] rounded-xl shadow-[0_10px_40px_-10px_rgba(31,99,122,0.12)] p-8 flex flex-col relative aspect-[4/5] max-h-[480px]">
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <span className="text-[11px] font-bold text-[#1f637a] dark:text-[#1f637a]/80 tracking-widest uppercase mb-1 block">Concept</span>
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{card.term}</h1>
                            </div>
                            <button 
                                onClick={(e) => speak(card.term + ". " + card.explanation, e)}
                                className="flex items-center justify-center w-11 h-11 rounded-full bg-[#1f637a]/5 dark:bg-[#1f637a]/20 text-[#1f637a] hover:bg-[#1f637a]/10 transition-colors"
                            >
                                <Volume2 size={24} />
                            </button>
                        </div>

                        {/* Card Body (Definition) */}
                        <div className="flex-1 overflow-y-auto pr-2">
                            <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-300 font-normal">
                                {card.explanation}
                            </p>
                        </div>

                        {/* Mnemonic Section */}
                        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <Lightbulb className="text-[#1f637a]" size={20} />
                                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase">Mnemonic Aid</span>
                            </div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 italic">
                                “{card.mnemonicPhrase}”
                            </p>
                        </div>

                        {/* Subtle Card Texture/Graphic */}
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                            <Sparkles size={120} />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-8">
                    <div className="flex gap-4">
                        <button 
                            onClick={handleReview}
                            className="flex-1 flex flex-col items-center justify-center gap-1 h-16 rounded-xl border-2 border-[#E37B7B]/20 dark:border-[#E37B7B]/10 text-[#E37B7B] font-bold hover:bg-[#E37B7B]/5 transition-colors"
                        >
                            <span className="text-base">Review Again</span>
                            <span className="text-[10px] uppercase tracking-tighter opacity-70 font-normal">I'm still learning</span>
                        </button>
                        <button 
                            onClick={handleNext}
                            className="flex-1 flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-[#47B268] text-white font-bold shadow-lg shadow-[#47B268]/20 hover:brightness-105 transition-all"
                        >
                            <span className="text-base">Got it</span>
                            <span className="text-[10px] uppercase tracking-tighter opacity-80 font-normal">Mastered</span>
                        </button>
                    </div>
                </div>

                {/* Bottom Navigation Bar (Visual Only) */}
                <div className="mt-auto bg-white/80 dark:bg-[#131c1f]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 px-4 pb-8 pt-2">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-gray-400 dark:text-gray-500">
                            <span className="material-symbols-outlined">home</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[#304fe8]">
                            <span className="material-symbols-outlined fill">auto_stories</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Journey</span>
                            <div className="w-1 h-1 rounded-full bg-[#304fe8] mt-0.5"></div>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-gray-400 dark:text-gray-500">
                            <span className="material-symbols-outlined">swords</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Battle</span>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-gray-400 dark:text-gray-500">
                            <span className="material-symbols-outlined">settings</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Manage</span>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-gray-400 dark:text-gray-500">
                            <span className="material-symbols-outlined">workspace_premium</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Access</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InclusiveFlashcard;
