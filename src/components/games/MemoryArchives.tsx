
import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Topic } from '../../types';
import { aiClient } from '../../utils/aiClient';
import { safeJsonParse } from '../../utils/aiHelpers';
import { 
    ArrowLeft, RefreshCw, Trophy, Settings, Loader2, Brain, 
    CheckCircle2, Bot, Users, User, Cpu, Calculator, FlaskConical, 
    Globe, Briefcase, Play, BookOpen, Lightbulb
} from 'lucide-react';
import { allGrades } from '../../curriculum';

interface MemoryArchivesProps {
    topic: Topic;
    difficulty: 'easy' | 'medium' | 'hard';
    onBack: () => void;
    onComplete: (score: number) => void;
    userGrade?: string;
}

interface Card {
    id: number;
    content: string;
    type: 'term' | 'definition';
    pairId: number;
    isFlipped: boolean;
    isMatched: boolean;
}

interface ActiveRecallQuiz {
    term: string;
    correctDefinition: string;
    options: string[];
    selectedIdx: number | null;
    isCorrect: boolean | null;
    callback: (correct: boolean) => void;
}

type GameMode = 'solo' | 'cpu' | 'human';
type Player = 'p1' | 'p2';
type GameState = 'setup' | 'loading' | 'playing' | 'finished';

const getRandomIndex = (length: number) => Math.floor(Math.random() * length);

export function MemoryArchives({ topic, difficulty, onBack, onComplete, userGrade = '6' }: MemoryArchivesProps) {
    // --- Config State ---
    const [gameState, setGameState] = useState<GameState>('setup');
    const [gameMode, setGameMode] = useState<GameMode>('solo');
    const [selectedGrade, setSelectedGrade] = useState<string>(() => {
        return userGrade || (topic ? topic.grade : '6');
    });
    const [subjectFocus, setSubjectFocus] = useState<string | null>(() => {
        return topic ? topic.subject.toLowerCase() : null;
    });
    const [showRules, setShowRules] = useState(false);

    // --- Educational Layer & Grade Config ---
    const gradeSubjects = React.useMemo(() => {
        const formattedGrade = selectedGrade.startsWith('Grade') ? selectedGrade : `Grade ${selectedGrade}`;
        const currentGradeCurriculum = allGrades.find(g => {
            const gName = g.grade.toLowerCase();
            const target = formattedGrade.toLowerCase();
            return gName === target || gName.includes(target) || target.includes(gName);
        });

        if (!currentGradeCurriculum || !currentGradeCurriculum.subjects || currentGradeCurriculum.subjects.length === 0) {
            return [
                { id: 'math', name: 'Mathematics', icon: <Calculator size={14}/>, color: 'bg-blue-500', topics: [] },
                { id: 'science', name: 'Science', icon: <FlaskConical size={14}/>, color: 'bg-green-500', topics: [] },
                { id: 'geo', name: 'Geography', icon: <Globe size={14}/>, color: 'bg-orange-500', topics: [] },
                { id: 'acc', name: 'Accounting', icon: <Briefcase size={14}/>, color: 'bg-purple-500', topics: [] },
            ];
        }

        return currentGradeCurriculum.subjects.map(s => {
            const sNameUpper = s.name.toUpperCase();
            let icon = <BookOpen size={14} />;
            let color = 'bg-blue-500';

            if (sNameUpper.includes('MATH')) {
                icon = <Calculator size={14} />;
                color = 'bg-blue-600 dark:bg-blue-500';
            } else if (sNameUpper.includes('SCIENCE') || sNameUpper.includes('PHYSIC') || sNameUpper.includes('CHEMIS')) {
                icon = <FlaskConical size={14} />;
                color = 'bg-emerald-600 dark:bg-emerald-500';
            } else if (sNameUpper.includes('GEOG') || sNameUpper.includes('SOCIAL') || sNameUpper.includes('GEO')) {
                icon = <Globe size={14} />;
                color = 'bg-orange-600 dark:bg-orange-500';
            } else if (sNameUpper.includes('ACCOUNT') || sNameUpper.includes('ECONOM') || sNameUpper.includes('BUSINESS') || sNameUpper.includes('ACC')) {
                icon = <Briefcase size={14} />;
                color = 'bg-purple-600 dark:bg-purple-500';
            } else if (sNameUpper.includes('LIFE') || sNameUpper.includes('SKILL')) {
                icon = <Lightbulb size={14} />;
                color = 'bg-amber-600 dark:bg-amber-500';
            } else if (sNameUpper.includes('SESOTHO')) {
                icon = <BookOpen size={14} />;
                color = 'bg-teal-600 dark:bg-teal-500';
            } else if (sNameUpper.includes('ENGLISH')) {
                icon = <BookOpen size={14} />;
                color = 'bg-sky-600 dark:bg-sky-500';
            }

            return {
                id: s.name.toLowerCase(),
                name: s.name,
                icon,
                color,
                topics: s.topics || []
            };
        });
    }, [selectedGrade]);

    const availableTopics = React.useMemo(() => {
        const targetSubjectId = subjectFocus || (gradeSubjects[0]?.id) || 'math';
        const matched = gradeSubjects.find(s => 
            s.id === targetSubjectId || 
            s.name.toLowerCase() === targetSubjectId ||
            s.id.includes(targetSubjectId) ||
            targetSubjectId.includes(s.id)
        );
        return matched?.topics || [];
    }, [subjectFocus, gradeSubjects]);

    const [activeTopic, setActiveTopic] = useState<Topic>(() => {
        return topic;
    });

    useEffect(() => {
        if (gradeSubjects.length > 0) {
            if (topic) {
                const matchedSub = gradeSubjects.find(s => 
                    s.name.toLowerCase().includes(topic.subject.toLowerCase()) || 
                    topic.subject.toLowerCase().includes(s.id)
                );
                if (matchedSub) {
                    setSubjectFocus(matchedSub.id);
                    setActiveTopic(topic);
                }
            } else if (!subjectFocus) {
                setSubjectFocus(gradeSubjects[0].id);
                if (gradeSubjects[0].topics.length > 0) {
                    setActiveTopic(gradeSubjects[0].topics[0]);
                }
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gradeSubjects, topic?.id]);

    useEffect(() => {
        if (availableTopics.length > 0) {
            const hasActiveTopic = availableTopics.some(t => t.id === activeTopic?.id);
            if (!hasActiveTopic) {
                setActiveTopic(availableTopics[0]);
            }
        }
    }, [availableTopics, activeTopic?.id]);
    
    // --- Gameplay State ---
    const [cards, setCards] = useState<Card[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [isBoardLocked, setIsBoardLocked] = useState(false);
    const [activeRecall, setActiveRecall] = useState<ActiveRecallQuiz | null>(null);
    const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
    const [turn, setTurn] = useState<Player>('p1');
    const [scores, setScores] = useState({ p1: 0, p2: 0 });
    const [combo, setCombo] = useState(1);
    
    // --- Refs for circular functions ---
    const revealCardRef = useRef<(index: number) => void>(() => {});
    const checkForMatchRef = useRef<(idx1: number, idx2: number) => void>(() => {});
    const makeCpuMoveRef = useRef<() => Promise<void>>(async () => {});
    const switchTurnRef = useRef<() => void>(() => {});

    // --- AI Brain ---
    // Stores { cardIndex: pairId } for cards the AI has "seen"
    const aiMemory = useRef<Map<number, number>>(new Map());

    // Layout
    const totalPairs = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;
    
    // --- Game Logic: Start ---
    const startGame = async () => {
        setGameState('loading');
        setScores({ p1: 0, p2: 0 });
        setTurn('p1');
        setCombo(1);
        setFlippedIndices([]);
        aiMemory.current.clear();

        try {
            // Find subject name for prompt
            const subName = gradeSubjects.find(s => s.id === subjectFocus)?.name || "General Knowledge";
            const curTopic = activeTopic || topic;
            
            const prompt = `
                Generate ${totalPairs} matching pairs for a memory card game.
                Target Audience: Grade ${selectedGrade} Student.
                Subject: ${subName}.
                
                If the topic "${curTopic?.title || ""}" is relevant to ${subName}, use it as the specific theme. 
                Otherwise, ignore the topic and generate core concepts/definitions for ${subName} at a Grade ${selectedGrade} level.
                
                Requirements:
                - One side is a Term/Concept.
                - Other side is a SHORT definition (max 6 words).
                - Ensure pairs are distinct and easy to match for this age group.
                - Ensure the topics are different from previous pairs: ${askedQuestions.join(', ')}
                
                Return JSON: [{ "term": "...", "definition": "..." }]
            `;

            const response = await aiClient.generate({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'ARRAY',
                        items: {
                          type: 'OBJECT',
                          properties: {
                              term: { type: 'STRING', description: 'Curriculum-aligned term or concept name' },
                              definition: { type: 'STRING', description: 'Very short description or definition of the term (max 6 words)' }
                          },
                          required: ['term', 'definition']
                        }
                    }
                }
            });

            const data = safeJsonParse<{term: string, definition: string}[]>(response.text);
            const pairs = data && data.length > 0 ? data.slice(0, totalPairs) : [];

            if (pairs.length === 0) {
                // Fallback
                const fallback = Array.from({length: totalPairs}).map((_, i) => ({
                    term: `Concept ${i+1}`, 
                    definition: `Def ${i+1}`
                }));
                setupBoard(fallback);
            } else {
                setupBoard(pairs);
                setAskedQuestions(prev => [...prev, ...pairs.map(p => p.term)]);
            }
        } catch (e) {
            // Fallback on error
            const fallback = Array.from({length: totalPairs}).map((_, i) => ({
                term: `Concept ${i+1}`, 
                definition: `Def ${i+1}`
            }));
            setupBoard(fallback);
        }
    };

    const setupBoard = (pairs: {term: string, definition: string}[]) => {
        const gameCards: Card[] = [];
        pairs.forEach((pair, index) => {
            gameCards.push({ id: index * 2, content: pair.term, type: 'term', pairId: index, isFlipped: false, isMatched: false });
            gameCards.push({ id: index * 2 + 1, content: pair.definition, type: 'definition', pairId: index, isFlipped: false, isMatched: false });
        });
        
        // Fisher-Yates Shuffle
        for (let i = gameCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gameCards[i], gameCards[j]] = [gameCards[j], gameCards[i]];
        }
        
        setCards(gameCards);
        setGameState('playing');
        setShowRules(true);
    };

    // --- Game Logic: Moves ---

    const handleCardClick = (index: number) => {
        // Prevent interaction if locked, matched, already flipped, or if CPU turn
        if (isBoardLocked || cards[index].isMatched || cards[index].isFlipped) return;
        if (gameMode === 'cpu' && turn === 'p2') return; 

        revealCardRef.current(index);
    };

    const revealCard = useCallback((index: number) => {
        // 1. Visually Flip
        setCards(prev => {
            const newCards = [...prev];
            newCards[index].isFlipped = true;
            return newCards;
        });

        // 2. Add to AI Memory (The AI sees everything flipped)
        aiMemory.current.set(index, cards[index].pairId);

        setFlippedIndices(prev => {
            const newFlipped = [...prev, index];
            // 3. Check for Pair
            if (newFlipped.length === 2) {
                setIsBoardLocked(true);
                checkForMatchRef.current(newFlipped[0], newFlipped[1]);
            }
            return newFlipped;
        });
    }, [cards]);

    const checkForMatch = useCallback((idx1: number, idx2: number) => {
        const isMatch = cards[idx1].pairId === cards[idx2].pairId;

        setTimeout(() => {
            if (isMatch) {
                // Determine Term & Definition
                const card1 = cards[idx1];
                const card2 = cards[idx2];
                const termCard = card1.type === 'term' ? card1 : card2;
                const defCard = card1.type === 'definition' ? card1 : card2;

                const termText = termCard.content;
                const correctDef = defCard.content;

                const runMatchScoringAndState = (isCorrectRecall: boolean) => {
                    setCards(prev => prev.map((c, i) => 
                        i === idx1 || i === idx2 ? { ...c, isMatched: true, isFlipped: true } : c
                    ));
                    
                    // Scoring
                    const pointsAdjustment = isCorrectRecall ? 1.5 : 1.0;
                    const points = Math.round(100 * (turn === 'p1' && gameMode === 'solo' ? combo : 1) * pointsAdjustment);
                    setScores(prev => ({ ...prev, [turn]: prev[turn] + points }));
                    
                    if (gameMode === 'solo') {
                        if (isCorrectRecall) {
                            setCombo(c => Math.min(c + 0.5, 4));
                        } else {
                            setCombo(1);
                        }
                    }

                    // Clean Memory
                    aiMemory.current.delete(idx1);
                    aiMemory.current.delete(idx2);

                    // Check Win
                    const allMatched = cards.every(c => c.isMatched || c.id === cards[idx1].id || c.id === cards[idx2].id);
                    if (allMatched) {
                        setGameState('finished');
                    } else {
                        setIsBoardLocked(false);
                        if (gameMode !== 'solo') {
                             setIsBoardLocked(false);
                             if (gameMode === 'cpu' && turn === 'p2') {
                                 setTimeout(makeCpuMoveRef.current, 1000);
                             }
                        }
                    }
                };

                // Only human player 1 triggers the active recall popup, preventing tedious pacing
                if (turn === 'p1') {
                    // Gather other definitions as distractors
                    const otherDefs = cards
                        .filter(c => c.type === 'definition' && c.pairId !== termCard.pairId)
                        .map(c => c.content);
                    
                    // Shuffle wrong answers and pick 2 unique
                    const uniqueWrongs = Array.from(new Set(otherDefs)).sort(() => 0.5 - Math.random());
                    const selectedWrong = uniqueWrongs.slice(0, 2);

                    // Combine and shuffle options
                    const optionList = [correctDef, ...selectedWrong].sort(() => 0.5 - Math.random());

                    setActiveRecall({
                        term: termText,
                        correctDefinition: correctDef,
                        options: optionList,
                        selectedIdx: null,
                        isCorrect: null,
                        callback: (correct: boolean) => {
                            runMatchScoringAndState(correct);
                        }
                    });
                } else {
                    // CPU or P2 match runs automatically
                    runMatchScoringAndState(true);
                }
            } else {
                // No Match
                setCards(prev => prev.map((c, i) => 
                    i === idx1 || i === idx2 ? { ...c, isFlipped: false } : c
                ));
                if (gameMode === 'solo' && turn === 'p1') setCombo(1);
                switchTurnRef.current();
            }
            
            setFlippedIndices([]);
        }, 800);
    }, [cards, turn, gameMode, combo]);

    const switchTurn = useCallback(() => {
        setTurn(prev => prev === 'p1' ? 'p2' : 'p1');
        setIsBoardLocked(false);
    }, []);

    // --- AI Logic ---
    const makeCpuMove = async () => {
        setIsBoardLocked(true);
        
        const memory = aiMemory.current;
        const availableIndices = cards.map((c, i) => !c.isMatched && !c.isFlipped ? i : -1).filter(i => i !== -1);
        
        if (availableIndices.length === 0) return;

        let firstMove = -1;
        let secondMove = -1;

        // Strategy 1: Check Memory for a known pair
        const knownPairs: {[key: number]: number[]} = {};
        memory.forEach((pairId, idx) => {
            if (cards[idx].isMatched) return;
            if (!knownPairs[pairId]) knownPairs[pairId] = [];
            knownPairs[pairId].push(idx);
        });

        const actionablePairId = Object.keys(knownPairs).find(pid => knownPairs[parseInt(pid)].length === 2);

        if (actionablePairId) {
            // AI knows a pair!
            [firstMove, secondMove] = knownPairs[parseInt(actionablePairId)];
        } else {
            // Strategy 2: Pick random, check if match is in memory
            firstMove = availableIndices[getRandomIndex(availableIndices.length)];
            
            const card1PairId = cards[firstMove].pairId;
            let knownPartnerIdx = -1;
            
            memory.forEach((pairId, idx) => {
                if (!cards[idx].isMatched && idx !== firstMove && pairId === card1PairId) {
                    knownPartnerIdx = idx;
                }
            });
 
            if (knownPartnerIdx !== -1) {
                // AI found match in memory after picking first card
                secondMove = knownPartnerIdx;
            } else {
                // Random second guess
                const remaining = availableIndices.filter(i => i !== firstMove);
                if (remaining.length > 0) {
                     secondMove = remaining[getRandomIndex(remaining.length)];
                } else {
                     secondMove = firstMove; // Should not happen given game logic
                }
            }
        }

        // Execute
        revealCardRef.current(firstMove);
        await new Promise(r => setTimeout(r, 800));
        revealCardRef.current(secondMove);
    };

    useEffect(() => {
        makeCpuMoveRef.current = makeCpuMove;
    });

    useEffect(() => {
        revealCardRef.current = revealCard;
        checkForMatchRef.current = checkForMatch;
        switchTurnRef.current = switchTurn;
    }, [revealCard, checkForMatch, switchTurn]);

    useEffect(() => {
        if (gameState === 'playing' && gameMode === 'cpu' && turn === 'p2' && !isBoardLocked) {
            const timer = setTimeout(() => makeCpuMoveRef.current(), 1000);
            return () => clearTimeout(timer);
        }
    }, [turn, gameState, isBoardLocked, gameMode]);

    // --- RENDERERS ---

    // 1. SETUP SCREEN
    if (gameState === 'setup') {
        const curTopic = activeTopic || topic;
        return (
            <div className="absolute inset-0 z-50 bg-slate-900/95 overflow-y-auto flex flex-col items-center justify-start py-4 px-3 md:py-8 md:px-6 backdrop-blur-md">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 my-auto flex flex-col gap-3 shrink-0"
                >
                    <h2 className="text-lg md:text-xl font-black text-center text-slate-900 dark:text-white mb-0.5">Get Ready!</h2>
                    
                    {curTopic && (
                        <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-2.5 items-start animate-in fade-in slide-in-from-top-3 duration-200">
                            <div className="p-1.5 bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-lg shrink-0">
                                <BookOpen size={16} />
                            </div>
                            <div className="space-y-0.5 overflow-hidden flex-1">
                                <div className="flex flex-wrap gap-1 items-center">
                                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-full uppercase tracking-wider">
                                        Grade {selectedGrade}
                                    </span>
                                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full uppercase tracking-wider">
                                        {curTopic.subject}
                                    </span>
                                </div>
                                <h3 className="text-[10px] md:text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug truncate">{curTopic.title}</h3>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-1">{curTopic.description}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2.5 flex flex-col">
                        <div>
                            <label className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">Select Grade</label>
                            <select
                                value={selectedGrade.startsWith('Grade') ? selectedGrade : `Grade ${selectedGrade}`}
                                onChange={(e) => {
                                    const nextGrade = e.target.value;
                                    setSelectedGrade(nextGrade);
                                    const nextGradeCurriculum = allGrades.find(g => g.grade === nextGrade);
                                    if (nextGradeCurriculum && nextGradeCurriculum.subjects.length > 0) {
                                        const firstSub = nextGradeCurriculum.subjects[0];
                                        setSubjectFocus(firstSub.name.toLowerCase());
                                        if (firstSub.topics.length > 0) {
                                            setActiveTopic(firstSub.topics[0]);
                                        }
                                    }
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-xl p-2 font-black focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[9px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Choose a Subject</label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {gradeSubjects.map(s => (
                                     <button 
                                         key={s.id}
                                         type="button"
                                         onClick={() => {
                                             setSubjectFocus(s.id);
                                             if (s.topics.length > 0) {
                                                 setActiveTopic(s.topics[0]);
                                             }
                                         }}
                                         className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition-all text-left ${subjectFocus === s.id ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-50 dark:bg-slate-800/80 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                     >
                                         <div className={`p-1 rounded-md ${s.color} text-white shrink-0`}>{s.icon}</div>
                                         <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate pr-1">{s.name}</span>
                                     </button>
                                 ))}
                            </div>
                        </div>

                        {availableTopics.length > 0 && (
                            <div>
                                <label className="text-[9px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Curriculum Progression</label>
                                <div className="space-y-1 max-h-24 md:max-h-28 overflow-y-auto pr-1 border border-slate-100 dark:border-slate-800 p-1 rounded-xl bg-slate-50 dark:bg-slate-950/55 scrollbar-thin">
                                    {availableTopics.map((t, idx) => {
                                        const isActive = curTopic?.id === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setActiveTopic(t)}
                                                className={`w-full flex items-center gap-1.5 p-1 rounded-lg text-left border transition-all ${isActive ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-transparent hover:border-slate-200 dark:hover:border-slate-800'}`}
                                            >
                                                <div className={`size-3.5 shrink-0 flex items-center justify-center rounded-full font-black text-[7px] ${isActive ? 'bg-white text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-[9px] font-black truncate leading-normal ${isActive ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{t.title}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-[9px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Game Mode</label>
                            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-0.5">
                                {['solo', 'cpu'].map((mode) => {
                                    const isActive = gameMode === mode;
                                    let label = 'Solo';
                                    let icon = <User size={12} />;
                                    if (mode === 'cpu') {
                                        label = 'Vs AI';
                                        icon = <Cpu size={12} />;
                                    }
                                    return (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => {
                                                setGameMode(mode as GameMode);
                                            }}
                                            className={`flex-1 py-1.5 px-1 text-[9px] md:text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${isActive ? 'bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'}`}
                                        >
                                            {icon}
                                            <span>{label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <button 
                        type="button"
                        onClick={startGame}
                        className="w-full py-3 mt-1 bg-[#2b8cee] hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/10 transition-all text-xs uppercase tracking-wider active:scale-95"
                    >
                        Start Playing
                    </button>
                    <button type="button" onClick={onBack} className="w-full py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Go Back</button>
                </motion.div>
            </div>
        );
    }

    // 2. LOADING
    if (gameState === 'loading') {
        return (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#f6f7f8] dark:bg-[#101922]">
                <Loader2 className="animate-spin text-[#2b8cee] mb-4" size={48} />
                <p className="text-xs font-bold uppercase text-slate-400 tracking-widest animate-pulse">Setting up the game...</p>
            </div>
        );
    }

    // 3. FINISHED
    if (gameState === 'finished') {
        const p1Win = scores.p1 >= scores.p2;
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#f6f7f8] dark:bg-[#101922] p-6 text-center animate-in zoom-in-95">
                 <div className="relative mb-6">
                    <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="size-28 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full flex items-center justify-center shadow-xl relative z-10 border-4 border-white dark:border-slate-800">
                        <Trophy size={50} className="text-white drop-shadow-md" />
                    </div>
                </div>
                
                <h2 className="text-2xl font-black text-[#111418] dark:text-white mb-2">
                    {gameMode === 'solo' ? 'You Won!' : (p1Win ? 'Player 1 Wins!' : 'Player 2 Wins!')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm font-medium">
                    {gameMode === 'solo' ? `Final Score: ${scores.p1}` : `${scores.p1} - ${scores.p2}`}
                </p>
                
                <div className="flex gap-3 w-full max-w-xs">
                    <button onClick={onBack} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-sm">Exit</button>
                    <button onClick={() => onComplete(scores.p1)} className="flex-1 py-3 bg-[#2b8cee] text-white font-bold rounded-xl shadow-lg text-sm">Finish</button>
                </div>
            </div>
        );
    }

    // 4. GAME BOARD
    return (
        <div className="flex flex-col h-[100dvh] bg-[#f6f7f8] dark:bg-[#101922] font-display overflow-hidden select-none relative">
            <style>{`
                .iridescent-tile { background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%); }
                .dark .iridescent-tile { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .active-player-glow { box-shadow: 0 0 0 2px #2b8cee, 0 0 15px rgba(43, 140, 238, 0.4); }
                .p2-glow { box-shadow: 0 0 0 2px #f59e0b, 0 0 15px rgba(245, 158, 11, 0.4); }
            `}</style>

            {/* Header */}
            <header className="px-4 py-3 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50 z-20">
                <button onClick={onBack} className="size-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                     {gameMode === 'solo' ? <User size={14} className="text-slate-500"/> : gameMode === 'cpu' ? <Bot size={14} className="text-slate-500"/> : <Users size={14} className="text-slate-500"/>}
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{gameMode === 'solo' ? 'Solo' : gameMode === 'cpu' ? 'Vs AI' : '2 Player'}</span>
                </div>
                <div className="size-9"></div> {/* Spacer */}
            </header>

            {/* Grid */}
            <main className="flex-1 flex flex-col p-2 min-h-0 relative z-10 items-center justify-center">
                <div className="grid gap-2 w-full max-w-lg aspect-[3/4] sm:aspect-square" 
                     style={{ gridTemplateColumns: `repeat(4, 1fr)`, gridTemplateRows: `repeat(${Math.ceil((totalPairs * 2)/4)}, 1fr)` }}>
                    {cards.map((card, index) => (
                        <div 
                            key={card.id}
                            onClick={() => handleCardClick(index)}
                            className="relative w-full h-full perspective-1000 cursor-pointer group"
                        >
                            <div className={`w-full h-full transition-all duration-500 preserve-3d relative ${card.isFlipped || card.isMatched ? 'rotate-y-180' : ''}`}>
                                {/* Front */}
                                <div className="absolute inset-0 backface-hidden iridescent-tile rounded-xl border border-white/60 dark:border-slate-700 shadow-sm flex items-center justify-center group-hover:scale-[1.02] transition-transform">
                                    <Brain size={20} className="text-[#2b8cee]/20 dark:text-white/10" />
                                </div>
                                {/* Back */}
                                <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-slate-700 rounded-xl flex flex-col items-center justify-center p-1 text-center shadow-md border-2 overflow-hidden ${card.isMatched ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-[#2b8cee] dark:border-blue-500'}`}>
                                    <p className={`font-bold leading-tight select-none break-words w-full px-1 ${card.content.length > 20 ? 'text-[9px]' : 'text-[10px]'} ${card.isMatched ? 'text-green-700 dark:text-green-300' : 'text-[#2b8cee] dark:text-blue-300'}`}>
                                        {card.content}
                                    </p>
                                    {card.isMatched && (
                                        <div className="absolute top-1 right-1 text-green-500 animate-in zoom-in duration-300">
                                            <CheckCircle2 size={12} fill="currentColor" className="text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Score Bar */}
            <div className="p-3 pb-safe bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div className="flex gap-3 max-w-lg mx-auto">
                    {/* Player 1 */}
                    <div className={`flex-1 rounded-2xl p-2.5 flex items-center justify-between transition-all duration-300 ${turn === 'p1' ? 'bg-[#2b8cee] text-white active-player-glow' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 opacity-60'}`}>
                        <div className="flex items-center gap-2">
                            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${turn === 'p1' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>P1</div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{gameMode === 'solo' ? 'Score' : 'Player 1'}</span>
                                <span className="text-lg font-black leading-none">{scores.p1}</span>
                            </div>
                        </div>
                    </div>

                    {/* Player 2 / CPU */}
                    {gameMode !== 'solo' && (
                         <div className={`flex-1 rounded-2xl p-2.5 flex items-center justify-between transition-all duration-300 ${turn === 'p2' ? 'bg-[#f59e0b] text-white p2-glow' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 opacity-60'}`}>
                            <div className="flex items-center gap-2">
                                <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${turn === 'p2' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    {gameMode === 'cpu' ? <Bot size={14}/> : 'P2'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{gameMode === 'cpu' ? 'AI Bot' : 'Player 2'}</span>
                                    <span className="text-lg font-black leading-none">{scores.p2}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Solo Combo */}
                    {gameMode === 'solo' && (
                        <div className="w-24 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2.5 flex flex-col items-center justify-center">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Combo</span>
                            <span className="text-lg font-black text-slate-700 dark:text-white">{combo}x</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Recall verification overlay */}
            {activeRecall && (
                <div className="absolute inset-0 z-[110] bg-[#0c1428]/95 backdrop-blur-md flex items-center justify-center p-4 text-white animate-in fade-in duration-200">
                    <div className="bg-white/5 border border-white/10 dark:bg-slate-900/90 dark:border-slate-800 rounded-3xl p-5 md:p-6 max-w-sm w-full shadow-2xl space-y-4">
                        <div className="flex items-center gap-2.5 bg-blue-500/10 text-blue-400 p-2.5 rounded-2xl border border-blue-500/20">
                            <Brain size={20} className="shrink-0" />
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-300">Active Recall Verification</h4>
                                <p className="text-[9px] text-blue-200 font-medium font-display">Earn extra combo score multipliers!</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Selected Concept:</label>
                            <h3 className="text-sm font-black text-white leading-tight">{activeRecall.term}</h3>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-300 leading-normal font-display">
                                What is the correct definition or core purpose of this concept?
                            </p>
                            
                            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5 scrollbar-thin">
                                {activeRecall.options.map((opt, i) => {
                                    const isSelected = activeRecall.selectedIdx === i;
                                    const showCorrect = activeRecall.isCorrect !== null && opt === activeRecall.correctDefinition;
                                    const showWrong = isSelected && activeRecall.isCorrect === false;

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={activeRecall.selectedIdx !== null}
                                            onClick={() => {
                                                const correct = opt === activeRecall.correctDefinition;
                                                setActiveRecall(prev => prev ? {
                                                    ...prev,
                                                    selectedIdx: i,
                                                    isCorrect: correct
                                                } : null);
                                            }}
                                            className={`w-full p-2.5 rounded-xl text-left text-[10px] leading-snug border transition-all flex items-start gap-2 ${
                                                showCorrect 
                                                  ? 'bg-emerald-500/25 text-emerald-250 border-emerald-500/50' 
                                                  : showWrong 
                                                  ? 'bg-rose-500/25 text-rose-200 border-rose-500/50' 
                                                  : isSelected 
                                                  ? 'bg-blue-600 text-white border-blue-500' 
                                                  : 'bg-white/5 text-slate-300 border-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            <span className="font-bold text-slate-400">{i + 1}.</span>
                                            <span className="flex-1 font-medium">{opt}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {activeRecall.selectedIdx !== null && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className={`p-2.5 rounded-xl border text-[9px] leading-relaxed ${activeRecall.isCorrect ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                                    <p className="font-bold mb-0.5">{activeRecall.isCorrect ? '✨ Excellent recall!' : '📚 Fact-Check Mind advice'}</p>
                                    <p className="font-medium leading-normal">{activeRecall.isCorrect ? 'Your memory network for this term is strong! Continuous self-testing boosts long-term curriculum retention.' : `"${activeRecall.term}" corresponds exactly to: ${activeRecall.correctDefinition}`}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        activeRecall.callback(activeRecall.isCorrect || false);
                                        setActiveRecall(null);
                                    }}
                                    className="w-full py-2 bg-slate-100 hover:bg-white text-slate-900 rounded-xl font-bold text-xs transition-all active:scale-95"
                                >
                                    Continue Battle
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Battle Rules Overlay */}
            {showRules && (
                <div className="absolute inset-0 z-[100] bg-[#0B1026]/95 backdrop-blur-md flex items-center justify-center p-6 text-white animate-in fade-in zoom-in-95">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
                        <Brain size={48} className="text-blue-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-black text-center uppercase tracking-tighter mb-6">How to Play</h2>
                        
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="size-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">1</div>
                                <p className="text-sm text-blue-100 font-medium leading-relaxed">
                                    <span className="text-white font-bold">Flip Cards:</span> Flip two cards to find a match between terms and meanings.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="size-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">2</div>
                                <p className="text-sm text-blue-100 font-medium leading-relaxed">
                                    <span className="text-white font-bold">Bonus Points:</span> Find matches quickly to get more points!
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="size-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">3</div>
                                <p className="text-sm text-blue-100 font-medium leading-relaxed">
                                    <span className="text-white font-bold">Clean the Board:</span> Clear all the cards to finish the game.
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowRules(false)}
                            className="w-full bg-[#2b8cee] hover:bg-blue-600 text-white py-4 rounded-xl font-black mt-8 shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs"
                        >
                            Start Playing
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MemoryArchives;
