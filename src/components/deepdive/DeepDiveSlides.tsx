import React, { useState, useRef, useEffect } from 'react';
import { PhaseProps } from './types';
import { 
    ArrowLeft, 
    Lightbulb, 
    RotateCw, 
    Bookmark, 
    Share2, 
    ChevronRight,
    ChevronLeft,
    Check
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export const DeepDiveSlides: React.FC<PhaseProps> = ({ content, onNext, onBack }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [savedSlides, setSavedSlides] = useState<Set<string>>(new Set());
    const { addToast } = useToast();
    const backOfCardRef = useRef<HTMLDivElement>(null);
    
    const slides = content.slides;
    const currentSlide = slides[currentIndex];
    const progress = ((currentIndex + 1) / slides.length) * 100;

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
        setShowHint(false);
    };

    useEffect(() => {
        if (isFlipped) {
            backOfCardRef.current?.focus();
        }
    }, [isFlipped]);

    const handleNextSlide = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
            setShowHint(false);
        } else {
            onNext();
        }
    };

    const handlePrevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsFlipped(false);
            setShowHint(false);
        } else {
            onBack();
        }
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        const slideId = currentSlide.id;
        const newSaved = new Set(savedSlides);
        if (newSaved.has(slideId)) {
            newSaved.delete(slideId);
            addToast('Removed from Library', 'info');
        } else {
            newSaved.add(slideId);
            addToast('Saved to Library', 'success');
        }
        setSavedSlides(newSaved);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (navigator.share) {
            navigator.share({
                title: `Learning about ${content.title}`,
                text: `Check out this concept: ${currentSlide.question}`,
                url: window.location.href
            }).catch(() => {
                addToast('Link Copied', 'info');
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            addToast('Link Copied', 'info');
        }
    };

    return (
        <div className="bg-[#FBFBF8] text-slate-900 min-h-screen flex flex-col font-['Manrope',_sans-serif] overflow-hidden relative">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@500;700&family=Manrope:wght@400;500;700&display=swap');
                .editorial-title { font-family: 'Epilogue', sans-serif; }
                
                .perspective-1000 {
                    perspective: 1000px;
                }
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>

            {/* Header Section */}
            <header className="flex items-center justify-between p-4 w-full max-w-2xl mx-auto z-10">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        aria-label="Back to narrative"
                        className="flex items-center justify-center p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-900"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">Deep Dive</h1>
                        <p className="text-[10px] font-bold text-[#347db2] uppercase tracking-wider">{content.title}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2" role="status" aria-live="polite">
                    <span className="text-xs font-bold text-slate-400">Card {currentIndex + 1} of {slides.length}</span>
                </div>
            </header>

            {/* Progress Indicator */}
            <div className="w-full max-w-2xl mx-auto px-6 mb-4 z-10" role="status" aria-live="polite">
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden" aria-hidden="true">
                    <div 
                        className="h-full bg-[#347db2] transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <p className="sr-only">Progress: {Math.round(progress)}%</p>
            </div>

            {/* Main Flashcard Container */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12 w-full max-w-2xl mx-auto z-10">
                <section aria-labelledby="flashcard-heading" className="w-full aspect-[4/5] md:aspect-[3/4] perspective-1000 relative">
                    <h2 id="flashcard-heading" className="sr-only">Interactive flashcard. Current card: {currentIndex + 1} of {slides.length}.</h2>
                    <div 
                        role="button"
                        tabIndex={0}
                        aria-label={isFlipped ? `Card back: ${currentSlide.question}` : `Card front: ${currentSlide.question}`}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleFlip(); }}}
                        className={`w-full h-full transition-transform duration-700 preserve-3d cursor-pointer focus:outline-none focus:ring-4 focus:ring-teacherBlue/50 rounded-2xl ${isFlipped ? 'rotate-y-180' : ''}`}
                        onClick={handleFlip}
                    >
                        {/* Front Side */}
                        <div aria-hidden={isFlipped} className="absolute inset-0 bg-white rounded-2xl shadow-xl border border-[#E0E4E7] flex flex-col backface-hidden overflow-hidden">
                            {/* Hint Icon */}
                            {currentSlide.hint && (
                                <div className="absolute top-4 right-4 z-20">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowHint(!showHint);
                                        }}
                                        aria-label={showHint ? 'Hide hint' : 'Show hint'}
                                        aria-expanded={showHint}
                                        className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${showHint ? 'bg-yellow-100 text-yellow-600' : 'bg-[#347db2]/10 text-[#347db2] hover:bg-[#347db2]/20'}`}
                                    >
                                        <Lightbulb size={20} />
                                    </button>
                                </div>
                            )}

                            {/* Question Content */}
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <span className="text-slate-400 font-bold mb-4 uppercase tracking-[0.2em] text-[10px]">Question</span>
                                <h3 className="editorial-title text-2xl md:text-3xl font-bold text-slate-900 leading-snug">
                                    {currentSlide.question}
                                </h3>
                                <div className="mt-8 w-16 h-1 bg-[#347db2]/20 rounded-full"></div>
                                
                                <div hidden={!showHint} role="tooltip" className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100 animate-in fade-in slide-in-from-top-2">
                                    <p className="text-xs text-yellow-800 italic">
                                        <span className="font-bold uppercase text-[9px] block mb-1">Hint</span>
                                        {currentSlide.hint}
                                    </p>
                                </div>
                            </div>

                            {/* Action Area */}
                            <div className="p-8 pt-0 flex flex-col items-center gap-4">
                                <p className="text-slate-400 text-xs font-medium" aria-hidden="true">
                                    Think of the answer before flipping.
                                </p>
                            </div>
                        </div>

                        {/* Back Side */}
                        <div ref={backOfCardRef} tabIndex={-1} aria-hidden={!isFlipped} className="absolute inset-0 bg-white rounded-2xl shadow-xl border border-[#E0E4E7] flex flex-col backface-hidden rotate-y-180 overflow-hidden focus:outline-none focus:ring-4 focus:ring-teacherBlue/50">
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <span className="text-slate-400 font-bold mb-4 uppercase tracking-[0.2em] text-[10px]">Answer</span>
                                <div className="w-full max-h-[60%] overflow-y-auto px-2">
                                    <p className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed">
                                        {currentSlide.answer}
                                    </p>
                                </div>
                                <div className="mt-8 w-16 h-1 bg-green-500/20 rounded-full"></div>
                            </div>

                            {/* Action Area */}
                            <div className="p-8 pt-0 flex flex-col items-center gap-4">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleNextSlide();
                                    }}
                                    aria-label={currentIndex === slides.length - 1 ? 'Finish Slides' : 'Next Card'}
                                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
                                >
                                    <span>{currentIndex === slides.length - 1 ? 'Finish Slides' : 'Next Card'}</span>
                                    <ChevronRight size={20} />
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsFlipped(false);
                                    }}
                                    className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
                                >
                                    Back to Question
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Quick Interaction Bar */}
                <section aria-label="Card actions" className="mt-8 flex gap-8 w-full justify-center items-center text-slate-400">
                    <button 
                        onClick={handleSave}
                        aria-label={savedSlides.has(currentSlide.id) ? 'Remove from saved' : 'Save this card'}
                        className={`flex flex-col items-center gap-1 transition-colors group ${savedSlides.has(currentSlide.id) ? 'text-teacherBlue' : 'hover:text-[#347db2]'}`}
                    >
                        {savedSlides.has(currentSlide.id) ? <Check size={20} /> : <Bookmark size={20} className="group-hover:fill-[#347db2]/20" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider">{savedSlides.has(currentSlide.id) ? 'Saved' : 'Save'}</span>
                    </button>
                    <button 
                        onClick={handleShare}
                        aria-label="Share this card"
                        className="flex flex-col items-center gap-1 hover:text-[#347db2] transition-colors group"
                    >
                        <Share2 size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Share</span>
                    </button>
                </section>
            </main>

            {/* Navigation Controls (Floating) */}
            <nav aria-label="Slide navigation" className="fixed bottom-6 left-0 right-0 flex justify-center gap-4 px-6 z-20">
                <button 
                    onClick={handlePrevSlide}
                    disabled={currentIndex === 0}
                    aria-label="Previous card"
                    className={`size-12 rounded-full flex items-center justify-center shadow-lg transition-all ${currentIndex === 0 ? 'bg-slate-100 text-slate-300' : 'bg-white text-slate-600 hover:bg-slate-50 active:scale-95'}`}
                >
                    <ChevronLeft size={24} />
                </button>
                <button 
                    onClick={handleNextSlide}
                    aria-label="Skip to next card"
                    className="flex-1 max-w-[200px] bg-white text-slate-900 font-bold rounded-full shadow-lg border border-[#E0E4E7] flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                    <span className="text-sm">Skip to Next</span>
                    <ChevronRight size={18} />
                </button>
                <button 
                    onClick={handleNextSlide}
                    aria-label="Next card"
                    className="size-12 rounded-full bg-[#347db2] text-white flex items-center justify-center shadow-lg shadow-[#347db2]/20 hover:bg-[#2c6a8c] active:scale-95 transition-all"
                >
                    <ChevronRight size={24} />
                </button>
            </nav>

            {/* Background Layer (Fixed) */}
            <div aria-hidden="true" className="fixed inset-0 -z-10 bg-[#FBFBF8] overflow-hidden">
                <div className="absolute top-0 right-0 p-24 opacity-5 pointer-events-none">
                    <div className="w-96 h-96 border-[40px] border-[#347db2] rounded-full"></div>
                </div>
                <div className="absolute bottom-0 left-0 p-24 opacity-5 pointer-events-none">
                    <div className="w-64 h-64 bg-[#347db2] rounded-full"></div>
                </div>
            </div>
        </div>
    );
};
