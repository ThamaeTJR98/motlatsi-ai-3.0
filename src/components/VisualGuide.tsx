
import React, { useState, useEffect, useRef } from 'react';
import { Topic } from '../types';
import { aiClient } from '../utils/aiClient';
import { safeJsonParse } from '../utils/aiHelpers';
import { 
    ChevronLeft, RotateCw, Share2, Star, Sparkles, Touchpad, 
    Leaf, Zap, Globe, Heart, Volume2, ArrowLeft, BookOpen, 
    Lightbulb, Cpu, Music, PenTool, Calculator
} from 'lucide-react';

interface VisualGuideProps {
    topic: Topic;
    onBack: () => void;
    onComplete: () => void;
    onNavigate: (view: string) => void;
    onObjectivesCovered?: (objectives: string[]) => void;
}

interface ConceptCard {
    term: string;
    definition: string;
    analogy: string;
    category: 'nature' | 'tech' | 'culture' | 'abstract';
}

const VisualGuide: React.FC<VisualGuideProps> = ({ topic, onBack, onComplete, onObjectivesCovered }) => {
    const [cards, setCards] = useState<ConceptCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const backOfCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isFlipped) {
            backOfCardRef.current?.focus();
        }
    }, [isFlipped]);
    
    // Generate content on mount
    useEffect(() => {
        const generateConcepts = async () => {
            setLoading(true);
            try {
                // Simplified, highly structured prompt to prevent hallucination
                const prompt = `
                    Topic: "${topic.title}" (${topic.description}).
                    Task: Create 5 fundamental concept cards for a primary school student (ages 6-13) in Lesotho.
                    
                    Use LAYMAN'S TERMS. No difficult words.
                    Use relatable scenarios, stories, and cultural references from Lesotho (e.g., mountains, cattle, papa, village life, school games like morabaraba).

                    Return a JSON Array with exactly 5 objects. No markdown.
                    Format:
                    [
                        {
                            "term": "Key Term (simple)",
                            "definition": "Simple definition (1 short sentence).",
                            "analogy": "A relatable analogy using everyday life in Lesotho (farming, school, home, mountains, cattle).",
                            "category": "nature" OR "tech" OR "culture" OR "abstract"
                        }
                    ]
                `;

                const response = await aiClient.generate({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                    config: { responseMimeType: 'application/json' },
                    cacheKey: `visual_guide_${topic.id}`
                });

                const parsed = safeJsonParse<ConceptCard[]>(response.text);
                
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                    setCards(parsed);
                    // Report that we are covering the intro objectives
                    if (onObjectivesCovered && topic.learningObjectives) {
                        onObjectivesCovered(topic.learningObjectives.slice(0, 2));
                    }
                } else {
                    throw new Error("Invalid format");
                }
            } catch (e) {
                console.error("AI Error, using fallback:", e);
                // Resilient Fallback
                setCards([
                    { term: topic.title, definition: topic.description, analogy: "Think of this as the foundation of the subject.", category: "abstract" },
                    { term: "Key Concept 1", definition: "The first main idea of this topic.", analogy: "Like the first brick in a wall.", category: "culture" },
                    { term: "Key Concept 2", definition: "The second main idea.", analogy: "Like the roof of the house.", category: "tech" }
                ]);
            } finally {
                setLoading(false);
            }
        };

        generateConcepts();
    }, [topic, onObjectivesCovered]);

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < cards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(c => c + 1), 200);
        } else {
            onComplete();
            onBack();
        }
    };

    const speak = (text: string, e: React.MouseEvent) => {
        e.stopPropagation();
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(u);
    };

    // Helper to map category to visuals
    const getCardStyle = (category: string) => {
        switch(category) {
            case 'nature': return { bg: 'bg-emerald-500', icon: <Leaf size={48} className="text-white" /> };
            case 'tech': return { bg: 'bg-blue-500', icon: <Cpu size={48} className="text-white" /> };
            case 'culture': return { bg: 'bg-orange-500', icon: <Globe size={48} className="text-white" /> };
            default: return { bg: 'bg-indigo-500', icon: <Sparkles size={48} className="text-white" /> };
        }
    };

    if (loading) return (
        <div role="status" aria-live="polite" className="flex flex-col items-center justify-center h-screen bg-[#fafaf9] dark:bg-[#18181b]">
            <Sparkles className="animate-spin text-teacherBlue mb-4" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Building Foundations...</p>
        </div>
    );

    const card = cards[currentIndex];
    const style = getCardStyle(card.category);
    const progress = ((currentIndex + 1) / cards.length) * 100;

    return (
        <main className="bg-gray-100 dark:bg-slate-900 min-h-screen flex flex-col font-sans">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between">
                <button onClick={onBack} aria-label="Go back" className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"><ArrowLeft size={20} /></button>
                <div className="flex flex-col items-center" role="status" aria-live="polite">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500" aria-hidden="true">Foundations</span>
                    <div className="h-1 w-24 bg-gray-200 rounded-full mt-1 overflow-hidden" aria-hidden="true">
                        <div className="h-full bg-teacherBlue transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="sr-only">Card {currentIndex + 1} of {cards.length}</p>
                </div>
                <div className="w-10"></div>
            </header>

            {/* Card Area */}
            <section aria-labelledby="card-heading" className="flex-1 flex items-center justify-center p-6 perspective-1000">
                <h2 id="card-heading" className="sr-only">Interactive Flashcard: {card.term}</h2>
                <div 
                    aria-live="polite"
                    className={`relative w-full max-w-sm aspect-[3/4] transition-all duration-500 transform-style-3d focus:outline-none focus:ring-4 focus:ring-teacherBlue/50 rounded-3xl ${isFlipped ? 'rotate-y-180' : ''}`}
                >
                    <div
                        role="button"
                        tabIndex={0}
                        aria-label={isFlipped ? `Card back showing definition of ${card.term}. Click to flip to front.` : `Card front showing term: ${card.term}. Click to flip to back.`}
                        onClick={() => setIsFlipped(!isFlipped)}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setIsFlipped(!isFlipped); }}}
                        className="absolute inset-0 w-full h-full cursor-pointer rounded-3xl"
                    ></div>
                    {/* FRONT */}
                    <div aria-hidden={isFlipped} className="absolute inset-0 backface-hidden bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 border border-gray-100 dark:border-slate-700">
                        <div className={`w-24 h-24 rounded-3xl ${style.bg} flex items-center justify-center shadow-lg mb-8`} aria-hidden="true">
                            {style.icon}
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white text-center leading-tight mb-2">{card.term}</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-auto animate-pulse flex items-center gap-2" aria-hidden="true">
                            <Touchpad size={14} /> Tap to Flip
                        </p>
                    </div>

                    {/* BACK */}
                    <div ref={backOfCardRef} tabIndex={-1} aria-hidden={!isFlipped} className="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 flex flex-col border-t-4 border-teacherBlue focus:outline-none focus:ring-4 focus:ring-teacherBlue/50">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-left">{card.term}</h3>
                            <button 
                                onClick={(e) => speak(card.definition, e)}
                                aria-label="Read definition aloud"
                                className="p-2 bg-blue-50 dark:bg-slate-700 rounded-full text-teacherBlue"
                            >
                                <Volume2 size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 space-y-6">
                            <div>
                                <p id="definition-heading" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Definition</p>
                                <p aria-labelledby="definition-heading" className="text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                    {card.definition}
                                </p>
                            </div>
                            
                            <div role="note" className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800">
                                <div className="flex items-center gap-2 mb-1">
                                    <Lightbulb size={14} className="text-yellow-600" aria-hidden="true" />
                                    <p id="analogy-heading" className="text-[10px] font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-wider">Think of it like...</p>
                                </div>
                                <p aria-labelledby="analogy-heading" className="text-sm text-gray-800 dark:text-gray-200 italic">
                                    "{card.analogy}"
                                </p>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 flex gap-3">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                className="w-full py-3 bg-teacherBlue hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors"
                            >
                                {currentIndex < cards.length - 1 ? 'Next Card' : 'Finish'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default VisualGuide;
