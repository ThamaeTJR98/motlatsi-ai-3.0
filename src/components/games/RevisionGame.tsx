import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Trophy, Star, Play, Pause, ChevronRight, Brain, Zap, BookOpen } from 'lucide-react';
import { Topic, Grade } from '../../types';
import { allGrades } from '../../curriculum';
import { useLearningEngine } from '../../contexts/LearningEngineContext';
import { useToast } from '../../contexts/ToastContext';

interface RevisionGameProps {
    topic: Topic;
    onBack: () => void;
    onComplete: (score: number) => void;
}

interface GameState {
    status: 'menu' | 'playing' | 'paused' | 'gameover' | 'victory';
    score: number;
    streak: number;
    level: number;
    lives: number;
}

interface Keyword {
    id: string;
    term: string;
    definition: string;
    category: 'concept' | 'vocabulary' | 'process';
}

interface SnakeSegment {
    x: number;
    y: number;
}

interface FoodItem {
    x: number;
    y: number;
    keyword: Keyword;
    isCorrect: boolean;
    type: 'target' | 'distractor';
}

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;

const RevisionGame: React.FC<RevisionGameProps> = ({ topic, onBack, onComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { addToast } = useToast();
    const { processQuizResult } = useLearningEngine();
    
    // Game State
    const [gameState, setGameState] = useState<GameState>({
        status: 'menu',
        score: 0,
        streak: 0,
        level: 1,
        lives: 3
    });
    
    const [currentQuestion, setCurrentQuestion] = useState<Keyword | null>(null);
    
    // Refs for game loop to avoid closure staleness
    const snakeRef = useRef<SnakeSegment[]>([{ x: 10, y: 10 }]);
    const directionRef = useRef<{ x: number, y: number }>({ x: 1, y: 0 });
    const nextDirectionRef = useRef<{ x: number, y: number }>({ x: 1, y: 0 });
    const foodRef = useRef<FoodItem[]>([]);
    const gameLoopRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const speedRef = useRef<number>(INITIAL_SPEED);
    const scoreRef = useRef<number>(0);

    // Initialize Keywords from Topic
    const [keywords, setKeywords] = useState<Keyword[]>(() => {
        // Extract keywords from topic data
        const topicKeywords: Keyword[] = [];
        
        // From keyVocabulary
        if (topic.keyVocabulary) {
            topic.keyVocabulary.forEach((term, idx) => {
                const termStr = typeof term === 'string' ? term : (term as any).term;
                const defStr = typeof term === 'string' ? `Definition for ${term}` : (term as any).definition;
                topicKeywords.push({
                    id: `vocab-${idx}`,
                    term: termStr,
                    definition: defStr,
                    category: 'vocabulary'
                });
            });
        }

        // From learningObjectives (extract key terms)
        if (topic.learningObjectives) {
            topic.learningObjectives.forEach((obj, idx) => {
                // Simple extraction of first 3-4 words as a concept
                const words = obj.split(' ');
                if (words.length > 2) {
                    topicKeywords.push({
                        id: `obj-${idx}`,
                        term: words.slice(0, 3).join(' '),
                        definition: obj,
                        category: 'process'
                    });
                }
            });
        }

        // Fallback if no keywords found
        if (topicKeywords.length < 4) {
            ['Concept A', 'Concept B', 'Concept C', 'Concept D'].forEach((t, i) => {
                topicKeywords.push({
                    id: `fallback-${i}`,
                    term: t,
                    definition: `Placeholder definition for ${t}`,
                    category: 'concept'
                });
            });
        }

        return topicKeywords;
    });

    // Update keywords if topic changes
    useEffect(() => {
        const topicKeywords: Keyword[] = [];
        
        // From keyVocabulary
        if (topic.keyVocabulary) {
            topic.keyVocabulary.forEach((term, idx) => {
                const termStr = typeof term === 'string' ? term : (term as any).term;
                const defStr = typeof term === 'string' ? `Definition for ${term}` : (term as any).definition;
                topicKeywords.push({
                    id: `vocab-${idx}`,
                    term: termStr,
                    definition: defStr,
                    category: 'vocabulary'
                });
            });
        }

        // From learningObjectives (extract key terms)
        if (topic.learningObjectives) {
            topic.learningObjectives.forEach((obj, idx) => {
                // Simple extraction of first 3-4 words as a concept
                const words = obj.split(' ');
                if (words.length > 2) {
                    topicKeywords.push({
                        id: `obj-${idx}`,
                        term: words.slice(0, 3).join(' '),
                        definition: obj,
                        category: 'process'
                    });
                }
            });
        }

        // Fallback if no keywords found
        if (topicKeywords.length < 4) {
            ['Concept A', 'Concept B', 'Concept C', 'Concept D'].forEach((t, i) => {
                topicKeywords.push({
                    id: `fallback-${i}`,
                    term: t,
                    definition: `Placeholder definition for ${t}`,
                    category: 'concept'
                });
            });
        }
        setKeywords(topicKeywords);
    }, [topic]);

    // Game Logic Functions
    const spawnFood = useCallback(() => {
        if (!currentQuestion && keywords.length > 0) {
            // Pick a new target question
            const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
            setCurrentQuestion(randomKeyword);
            
            // Spawn 1 Correct Answer + 2 Distractors
            const newFood: FoodItem[] = [];
            
            // Helper to get random empty position
            const getEmptyPos = () => {
                let x: number, y: number;
                do {
                    x = Math.floor(Math.random() * (canvasRef.current?.width || 400) / GRID_SIZE);
                    y = Math.floor(Math.random() * (canvasRef.current?.height || 400) / GRID_SIZE);
                } while (
                    snakeRef.current.some(s => s.x === x && s.y === y) || 
                    newFood.some(f => f.x === x && f.y === y)
                );
                return { x, y };
            };

            // 1. Correct Answer
            const pos1 = getEmptyPos();
            newFood.push({ ...pos1, keyword: randomKeyword, isCorrect: true, type: 'target' });

            // 2. Distractors
            const distractors = keywords.filter(k => k.id !== randomKeyword.id);
            for (let i = 0; i < Math.min(2, distractors.length); i++) {
                const d = distractors[Math.floor(Math.random() * distractors.length)];
                const pos = getEmptyPos();
                newFood.push({ ...pos, keyword: d, isCorrect: false, type: 'distractor' });
            }

            foodRef.current = newFood;
        }
    }, [keywords, currentQuestion]);

    const startGame = () => {
        setGameState(prev => ({ ...prev, status: 'playing', score: 0, lives: 3 }));
        snakeRef.current = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        directionRef.current = { x: 1, y: 0 };
        nextDirectionRef.current = { x: 1, y: 0 };
        scoreRef.current = 0;
        speedRef.current = INITIAL_SPEED;
        spawnFood();
        // Use Date.now() or just 0, the loop will handle the delta
        lastTimeRef.current = 0; 
        gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    const gameOver = () => {
        setGameState(prev => ({ ...prev, status: 'gameover' }));
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        
        // Save score
        processQuizResult(topic.id, scoreRef.current, 100, topic.title); // Normalize score to 100 for tracking
    };

    const gameLoop = (time: number) => {
        if (gameState.status !== 'playing') return;

        const deltaTime = time - lastTimeRef.current;
        
        if (deltaTime > speedRef.current) {
            update();
            lastTimeRef.current = time;
        }
        
        draw();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    const update = () => {
        // Move Snake
        directionRef.current = nextDirectionRef.current;
        const head = { ...snakeRef.current[0] };
        head.x += directionRef.current.x;
        head.y += directionRef.current.y;

        // Wall Collision (Wrap around or Die? Let's do Die for now)
        const cols = (canvasRef.current?.width || 400) / GRID_SIZE;
        const rows = (canvasRef.current?.height || 400) / GRID_SIZE;

        if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || snakeRef.current.some(s => s.x === head.x && s.y === head.y)) {
            gameOver();
            return;
        }

        // Check Food Collision
        const eatenFoodIndex = foodRef.current.findIndex(f => f.x === head.x && f.y === head.y);
        
        if (eatenFoodIndex !== -1) {
            const eaten = foodRef.current[eatenFoodIndex];
            
            if (eaten.isCorrect) {
                // Correct!
                scoreRef.current += 10;
                setGameState(prev => ({ 
                    ...prev, 
                    score: scoreRef.current,
                    streak: prev.streak + 1 
                }));
                speedRef.current = Math.max(50, speedRef.current - SPEED_INCREMENT);
                
                // Grow snake
                snakeRef.current.unshift(head);
                
                // Reset for next question
                setCurrentQuestion(null);
                foodRef.current = [];
                setTimeout(spawnFood, 100); // Small delay before next question
                
            } else {
                // Wrong!
                setGameState(prev => {
                    const newLives = prev.lives - 1;
                    if (newLives <= 0) {
                        gameOver();
                        return prev;
                    }
                    return { ...prev, lives: newLives, streak: 0 };
                });
                // Shrink or penalty?
                snakeRef.current.pop(); // Move tail
                snakeRef.current.unshift(head); // Move head
            }
        } else {
            // Just moving
            snakeRef.current.pop();
            snakeRef.current.unshift(head);
        }
    };

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#1a1f23'; // Dark bg
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Grid (Subtle)
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= canvas.width; i += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for (let i = 0; i <= canvas.height; i += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
        }

        // Draw Snake
        snakeRef.current.forEach((seg, i) => {
            ctx.fillStyle = i === 0 ? '#3b82f6' : '#60a5fa'; // Head vs Body
            ctx.beginPath();
            ctx.roundRect(seg.x * GRID_SIZE + 1, seg.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2, 4);
            ctx.fill();
        });

        // Draw Food
        foodRef.current.forEach(f => {
            // Orb
            ctx.fillStyle = f.type === 'target' ? '#10b981' : '#f59e0b'; // Green vs Amber (hidden logic, visually distinct?) 
            // Actually, in a quiz snake, usually all look same or distinct? 
            // Let's make them look distinct colors so user has to match TEXT not color.
            ctx.fillStyle = '#ffffff'; 
            
            ctx.beginPath();
            ctx.arc(f.x * GRID_SIZE + GRID_SIZE/2, f.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2 - 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Text label above orb (simple A/B/C or short term)
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(f.keyword.term.substring(0, 3), f.x * GRID_SIZE + GRID_SIZE/2, f.y * GRID_SIZE - 4);
        });
    };

    // Controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch(e.key) {
                case 'ArrowUp': if (directionRef.current.y === 0) nextDirectionRef.current = { x: 0, y: -1 }; break;
                case 'ArrowDown': if (directionRef.current.y === 0) nextDirectionRef.current = { x: 0, y: 1 }; break;
                case 'ArrowLeft': if (directionRef.current.x === 0) nextDirectionRef.current = { x: -1, y: 0 }; break;
                case 'ArrowRight': if (directionRef.current.x === 0) nextDirectionRef.current = { x: 1, y: 0 }; break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Touch Controls
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;

        const touchEnd = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY
        };

        const dx = touchEnd.x - touchStartRef.current.x;
        const dy = touchEnd.y - touchStartRef.current.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            if (Math.abs(dx) > 30) { // Threshold
                if (dx > 0 && directionRef.current.x === 0) nextDirectionRef.current = { x: 1, y: 0 };
                else if (dx < 0 && directionRef.current.x === 0) nextDirectionRef.current = { x: -1, y: 0 };
            }
        } else {
            // Vertical
            if (Math.abs(dy) > 30) {
                if (dy > 0 && directionRef.current.y === 0) nextDirectionRef.current = { x: 0, y: 1 };
                else if (dy < 0 && directionRef.current.y === 0) nextDirectionRef.current = { x: 0, y: -1 };
            }
        }
        touchStartRef.current = null;
    };

    // Initial Spawn
    useEffect(() => {
        if (gameState.status === 'playing' && !currentQuestion) {
            spawnFood();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState.status, currentQuestion]);


    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f172a] overflow-hidden">
            {/* HUD Header */}
            <header className="h-20 bg-white dark:bg-[#1a1f23] border-b border-slate-200 dark:border-gray-800 px-6 flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-500 dark:text-gray-400" />
                    </button>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Revision Snake</h2>
                        <p className="text-xs font-bold text-teacherBlue uppercase tracking-widest">{topic.title}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
                        <span className="block text-2xl font-mono font-black text-teacherBlue">{gameState.score}</span>
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`size-3 rounded-full ${i <= gameState.lives ? 'bg-red-500' : 'bg-slate-200 dark:bg-gray-700'}`} />
                        ))}
                    </div>
                </div>
            </header>

            {/* Game Area */}
            <main className="flex-1 relative flex flex-col items-center justify-center p-4">
                
                {/* Question Banner */}
                <AnimatePresence mode="wait">
                    {currentQuestion && (
                        <motion.div 
                            key={currentQuestion.id}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-white dark:bg-[#1a1f23] px-6 py-3 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 max-w-lg text-center"
                        >
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Find the term for:</span>
                            <p className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                                {currentQuestion.definition}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Canvas Container */}
                <div 
                    className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-700 bg-[#1a1f23] touch-none"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <canvas 
                        ref={canvasRef}
                        width={800}
                        height={600}
                        className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                    />

                    {/* Overlays */}
                    {gameState.status === 'menu' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                            <Brain size={48} className="text-teacherBlue mb-4" />
                            <h1 className="text-3xl font-black mb-2">Ready to Revise?</h1>
                            <p className="text-gray-300 mb-8 max-w-xs text-center">Control the snake to eat the correct terms matching the definitions.</p>
                            <button 
                                onClick={startGame}
                                className="bg-teacherBlue hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
                            >
                                <Play size={20} /> Start Game
                            </button>
                        </div>
                    )}

                    {gameState.status === 'gameover' && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in">
                            <Trophy size={48} className="text-yellow-400 mb-4" />
                            <h1 className="text-3xl font-black mb-2">Game Over!</h1>
                            <p className="text-2xl font-mono text-teacherBlue mb-8">Score: {gameState.score}</p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={startGame}
                                    className="bg-white text-slate-900 hover:bg-gray-100 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                                >
                                    <RefreshCw size={18} /> Try Again
                                </button>
                                <button 
                                    onClick={onBack}
                                    className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition-all border border-slate-700"
                                >
                                    Exit
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Mobile Controls Hint */}
                <div className="mt-6 text-center md:hidden">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Swipe to control</p>
                </div>
            </main>
        </div>
    );
};

export default RevisionGame;
