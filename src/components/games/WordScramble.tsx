
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Topic } from '../../types';
import { aiClient } from '../../utils/aiClient';
import { safeJsonParse } from '../../utils/aiHelpers';
import { 
    ArrowLeft, RefreshCw, Trophy, Lightbulb, Shuffle, Check, X, 
    Loader2, Users, User, Bot, Calculator, FlaskConical, Globe, Briefcase, Play, Timer,
    Zap, BookOpen
} from 'lucide-react';
import { allGrades } from '../../curriculum';

interface WordScrambleProps {
    topic: Topic;
    onBack: () => void;
    onComplete: (score: number) => void;
    difficulty: 'easy' | 'medium' | 'hard';
    userGrade?: string;
}

interface GameRound {
    word: string;
    hint: string;
    explanation?: string;
}

type GameMode = 'solo' | 'cpu' | 'human';
type Player = 'p1' | 'p2';
type GameState = 'setup' | 'loading' | 'playing' | 'turn_switch' | 'gameover';

export function WordScramble({ topic, onBack, onComplete, difficulty, userGrade = '6' }: WordScrambleProps) {
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
    const [round, setRound] = useState<GameRound | null>(null);
    const [puzzlesPool, setPuzzlesPool] = useState<GameRound[]>([]);
    const [currentPoolIndex, setCurrentPoolIndex] = useState(0);
    const [showExplanationCard, setShowExplanationCard] = useState(false);
    const [scrambledLetters, setScrambledLetters] = useState<{id: number, char: string}[]>([]);
    const [selectedLetters, setSelectedLetters] = useState<{id: number, char: string}[]>([]);
    const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
    
    // --- Turn & Score ---
    const [turn, setTurn] = useState<Player>('p1');
    const [scores, setScores] = useState({ p1: 0, p2: 0 });
    const [roundCount, setRoundCount] = useState(0);
    const MAX_ROUNDS = 3; // Rounds per player in competitive mode

    // --- Solo Specific ---
    const [lives, setLives] = useState(3);
    const [streak, setStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [timerActive, setTimerActive] = useState(false);

    // --- Visuals ---
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Timer Effect
    useEffect(() => {
        let interval: any;
        if (timerActive && timeLeft > 0 && gameState === 'playing') {
            interval = setInterval(() => {
                setTimeLeft(t => t - 1);
            }, 1000);
        } else if (timeLeft === 0 && timerActive) {
            setGameState('gameover');
            setTimerActive(false);
        }
        return () => clearInterval(interval);
    }, [timerActive, timeLeft, gameState]);
    
    // AI Turn Ref
    const aiTimeoutRef = useRef<number | null>(null);

    // --- Initialization ---
    const startGame = () => {
        setScores({ p1: 0, p2: 0 });
        setRoundCount(0);
        setLives(3);
        setStreak(0);
        setTurn('p1');
        setTimeLeft(60);
        setTimerActive(true);
        setShowRules(true);
        setPuzzlesPool([]);
        setCurrentPoolIndex(0);
        setShowExplanationCard(false);
        loadNewRound(true);
    };

    // --- Round Management ---
    const loadNewRound = async (forceFirstFetch = false) => {
        setLoading(true);
        setScrambledLetters([]);
        setSelectedLetters([]);
        setStatusMessage(null);

        // Check Win Condition for Competitive
        if (gameMode !== 'solo' && roundCount >= MAX_ROUNDS * 2) {
            setGameState('gameover');
            setLoading(false);
            return;
        }

        // Handle AI Turn
        if (gameMode === 'cpu' && turn === 'p2') {
            setGameState('playing');
            setLoading(false);
            simulateAiTurn();
            return;
        }

        let pool = puzzlesPool;
        let index = currentPoolIndex;

        if (forceFirstFetch || puzzlesPool.length === 0) {
            try {
                const subName = gradeSubjects.find(s => s.id === subjectFocus)?.name || "General Knowledge";
                const curTopic = activeTopic || topic;
                const prompt = `
                    Generate an educational word scramble set.
                    Context: Grade ${selectedGrade} ${subName}.
                    Topic: ${curTopic?.title || ""}.
                    Difficulty: ${difficulty}.
                    Provide exactly 8 highly informative word puzzle objects.
                    Each puzzle should focus on a key curriculum concept or term.
                    Return ONLY a JSON array format (no extra markdown text):
                    [
                        {
                            "word": "UPPERCASE_TERM",
                            "hint": "A short, engaging curriculum-aligned riddle or clue.",
                            "explanation": "A concise (1-sentence) explanation reinforcement of why this concept is important in ${subName}."
                        }
                    ]
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
                                    word: { type: 'STRING', description: 'Uppercase curriculum vocabulary term (one word, letters only)' },
                                    hint: { type: 'STRING', description: 'Small engaging riddle or clue.' },
                                    explanation: { type: 'STRING', description: 'Brief reinforcement explanation of why this concept is important.' }
                                },
                                required: ['word', 'hint', 'explanation']
                            }
                        }
                    }
                });

                const data = safeJsonParse<GameRound[]>(response.text);
                if (Array.isArray(data) && data.length > 0) {
                    pool = data.map(item => ({
                        word: item.word.toUpperCase().replace(/[^A-Z]/g, ''),
                        hint: item.hint,
                        explanation: item.explanation || "A key concept to remember in your studies."
                    }));
                    setPuzzlesPool(pool);
                    index = 0;
                    setCurrentPoolIndex(0);
                } else {
                    throw new Error("Invalid or empty array returned");
                }
            } catch (e) {
                console.error("Failed to generate puzzles pool, using fallback set:", e);
                const fallbacks: GameRound[] = [
                    { word: "CLIMATE", hint: "Long-term weather patterns in a region.", explanation: "Climate shapes ecological biomes and human agricultural habits." },
                    { word: "BUDGET", hint: "A financial plan tracking income and expenses.", explanation: "Budgeting prevents cash deficits and enforces savings." },
                    { word: "GRAVITY", hint: "The force drawing matter toward planetary centers.", explanation: "Gravity holds atmosphere and orbital paths in equilibrium." },
                    { word: "MARKET", hint: "A virtual or physical meeting space for trading.", explanation: "Markets resolve pricing levels via supply-demand interactions." },
                    { word: "FOSSIL", hint: "Remains of ancient biological entities.", explanation: "Fossilized materials offer historic climate and evolutionary timelines." }
                ];
                pool = fallbacks;
                setPuzzlesPool(fallbacks);
                index = 0;
                setCurrentPoolIndex(0);
            }
        }

        // Pop individual puzzle from pool
        if (pool.length > 0) {
            const currentPuzzleIndex = index % pool.length;
            const selectedPuzzle = pool[currentPuzzleIndex];
            setRound(selectedPuzzle);
            scrambleWord(selectedPuzzle.word);
            setCurrentPoolIndex(currentPuzzleIndex + 1);
            setAskedQuestions(prev => [...prev, selectedPuzzle.word]);
            setGameState('playing');
        }

        setLoading(false);
    };

    const scrambleWord = (word: string) => {
        const letters = word.split('').map((char, i) => ({ id: i, char }));
        // Fisher-Yates shuffle
        for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        setScrambledLetters(letters);
    };

    // --- AI Simulation ---
    const simulateAiTurn = () => {
        // AI "Thinking"
        const thinkTime = difficulty === 'easy' ? 4000 : difficulty === 'medium' ? 3000 : 2000;
        
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

        aiTimeoutRef.current = window.setTimeout(() => {
            // AI Success Chance
            const successRate = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.8 : 0.95;
            const isSuccess = Math.random() < successRate;

            if (isSuccess) {
                const points = 100 + (Math.random() * 50); // Random bonus
                setScores(prev => ({ ...prev, p2: Math.round(prev.p2 + points) }));
                setStatusMessage("Opponent solved it!");
            } else {
                setStatusMessage("Opponent failed!");
            }
            
            setTimeout(() => {
                setTurn('p1');
                setRoundCount(c => c + 1);
                loadNewRound();
            }, 1500);

        }, thinkTime);
    };

    // --- Interactions ---

    const handleLetterClick = (item: {id: number, char: string}) => {
        if (gameMode === 'cpu' && turn === 'p2') return; 
        setScrambledLetters(prev => prev.filter(l => l.id !== item.id));
        setSelectedLetters(prev => [...prev, item]);
    };

    const handleSlotClick = (item: {id: number, char: string}) => {
        if (gameMode === 'cpu' && turn === 'p2') return;
        setSelectedLetters(prev => prev.filter(l => l.id !== item.id));
        setScrambledLetters(prev => [...prev, item]);
    };

    const handleShuffle = () => {
        const current = [...scrambledLetters];
        for (let i = current.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [current[i], current[j]] = [current[j], current[i]];
        }
        setScrambledLetters(current);
    };

    const handleCheck = () => {
        if (!round) return;
        
        const currentWord = selectedLetters.map(l => l.char).join('');
        if (currentWord === round.word) {
            // Success
            setStatusMessage("Correct!");
            const points = 100 + (streak * 10);
            
            setScores(prev => ({ ...prev, [turn]: Math.round(prev[turn] + points) }));
            setStreak(s => s + 1);

            // Open curriculum synthesis card
            setTimeout(() => {
                setShowExplanationCard(true);
            }, 850);
        } else {
            // Fail
            setShake(true);
            setTimeout(() => setShake(false), 500);
            
            if (gameMode === 'solo') {
                setLives(l => l - 1);
                setStreak(0);
                if (lives <= 1) {
                    setGameState('gameover');
                }
            } else {
                // In PVP, wrong answer passes turn with no points
                setStatusMessage("Wrong!");
                setTimeout(() => {
                    const nextTurn = turn === 'p1' ? 'p2' : 'p1';
                    setTurn(nextTurn);
                    setRoundCount(c => c + 1);
                    if (gameMode === 'human') setGameState('turn_switch');
                    else loadNewRound();
                }, 1000);
            }
        }
    };

    const handleContinueAfterSuccess = () => {
        setShowExplanationCard(false);
        if (gameMode === 'solo') {
            loadNewRound();
        } else {
            const nextTurn = turn === 'p1' ? 'p2' : 'p1';
            setTurn(nextTurn);
            setRoundCount(c => c + 1);
            
            if (gameMode === 'human') {
                 setGameState('turn_switch');
            } else {
                 loadNewRound();
            }
        }
    };

    const handleClear = () => {
        const all = [...selectedLetters, ...scrambledLetters];
        setScrambledLetters(all);
        setSelectedLetters([]);
    };

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
                                                className={`w-full flex items-center gap-1.5 p-1 rounded-lg text-left border transition-all ${isActive ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-transparent hover:border-slate-200 dark:hover:bg-slate-800'}`}
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
                                        icon = <Bot size={12} />;
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

    // 2. TURN SWITCH (Human)
    if (gameState === 'turn_switch') {
        return (
            <div className="absolute inset-0 z-50 bg-[#1e293b] flex flex-col items-center justify-center p-6 text-center text-white">
                <Users size={64} className="text-emerald-400 mb-6" />
                <h2 className="text-2xl font-bold mb-2">Pass to Friend</h2>
                <p className="text-slate-400 mb-8">It's Player {turn === 'p1' ? '1' : '2'}'s turn to solve.</p>
                <button 
                    onClick={() => loadNewRound()}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg"
                >
                    My Turn!
                </button>
            </div>
        );
    }

    // 3. GAME OVER
    if (gameState === 'gameover') {
        const p1Win = scores.p1 >= scores.p2;
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center animate-in fade-in">
                <div className="relative mb-6">
                     <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                     <Trophy size={80} className="text-yellow-400 relative z-10" />
                </div>
                
                <h2 className="text-4xl font-black mb-2">
                    {gameMode === 'solo' ? 'Game Over' : (p1Win ? 'Player 1 Wins!' : 'Player 2 Wins!')}
                </h2>
                
                {gameMode === 'solo' ? (
                    <p className="text-slate-400 mb-8 text-lg">Final Score: <span className="text-white font-bold">{scores.p1}</span></p>
                ) : (
                    <div className="flex gap-8 mb-8 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                        <div className="text-center">
                            <p className="text-xs text-slate-400 uppercase font-bold">Player 1</p>
                            <p className="text-2xl font-black text-blue-400">{scores.p1}</p>
                        </div>
                        <div className="w-px bg-slate-700"></div>
                        <div className="text-center">
                            <p className="text-xs text-slate-400 uppercase font-bold">{gameMode === 'cpu' ? 'AI Bot' : 'Player 2'}</p>
                            <p className="text-2xl font-black text-orange-400">{scores.p2}</p>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 w-full max-w-xs">
                    <button onClick={onBack} className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 border border-slate-700">Exit</button>
                    <button onClick={() => onComplete(scores.p1)} className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20">Finish & Save</button>
                </div>
            </div>
        );
    }

    // 4. LOADING SPINNER
    if (loading && !round && gameMode === 'solo') {
         return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-50 dark:bg-slate-900">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-widest text-xs">Scrambling letters...</p>
            </div>
        );
    }

    const isAiTurn = gameMode === 'cpu' && turn === 'p2';

    return (
        <div className="flex flex-col h-full min-h-[#500px] bg-[#f0f4ff] dark:bg-[#1a1f2e] font-sans overflow-hidden relative select-none">
            {/* Header */}
            <header className="px-4 py-2.5 flex items-center justify-between bg-white dark:bg-[#1a1f2e]/90 backdrop-blur-md border-b border-indigo-100 dark:border-slate-700/80 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1.5 -ml-1 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors">
                        <ArrowLeft size={18} className="text-indigo-900 dark:text-white" />
                    </button>
                    <div>
                        <h1 className="text-xs font-black text-indigo-900 dark:text-white uppercase tracking-wider">Lingo Links</h1>
                        <div className="flex items-center gap-1.5">
                             <p className="text-[9px] text-indigo-400 font-bold leading-none">
                                {gameMode === 'solo' ? `Streak: ${streak}` : `Round ${Math.ceil((roundCount+1)/2)}`}
                            </p>
                            {timerActive && (
                                <div className={`flex items-center gap-0.5 text-[9px] font-black leading-none ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`}>
                                    <Timer size={8} />
                                    <span>{timeLeft}s</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {gameMode === 'solo' ? (
                     <div className="flex gap-0.5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-1.5 w-4 rounded-full transition-colors ${i <= lives ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        ))}
                    </div>
                ) : (
                     <div className="flex items-center gap-2 text-[10px] font-bold">
                        <span className={`px-1.5 py-0.5 rounded ${turn === 'p1' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>P1: {scores.p1}</span>
                        <span className={`px-1.5 py-0.5 rounded ${turn === 'p2' ? 'bg-orange-100 text-orange-700' : 'text-slate-400'}`}>{gameMode === 'cpu' ? 'AI' : 'P2'}: {scores.p2}</span>
                    </div>
                )}
            </header>

            {/* Game Area */}
            <main className="flex-1 flex flex-col items-center p-4 w-full max-w-md mx-auto relative justify-start gap-4 overflow-y-auto">
                
                {statusMessage && (
                    <div className="absolute top-2 z-20 bg-slate-900/90 text-white px-4 py-1.5 rounded-full text-xs font-bold animate-in fade-in slide-in-from-top-2">
                        {statusMessage}
                    </div>
                )}

                {isAiTurn ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                        <Bot size={60} className="text-indigo-300 animate-bounce mb-4" />
                        <h2 className="text-lg font-bold text-indigo-900 dark:text-white mb-1">Opponent Thinking...</h2>
                        <div className="flex gap-1 justify-center">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                        </div>
                     </div>
                ) : (
                     <div className="w-full flex-1 flex flex-col justify-start">
                        {/* Hint Card */}
                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl shadow-sm border border-indigo-50 dark:border-slate-700/80 w-full mb-4 text-center relative mt-2.5">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 p-1.5 rounded-lg shadow-sm">
                                <Lightbulb size={14} fill="currentColor" />
                            </div>
                            <p className="mt-1 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-normal">
                                "{round?.hint}"
                            </p>
                        </div>

                        {/* Answer Slots */}
                        <div className={`flex gap-1 mb-4 flex-wrap justify-center ${shake ? 'animate-shake' : ''}`}>
                            {round?.word.split('').map((_, i) => {
                                const letter = selectedLetters[i];
                                return (
                                    <button
                                        key={i}
                                        onClick={() => letter && handleSlotClick(letter)}
                                        className={`size-9 sm:size-11 max-w-[42px] max-h-[42px] min-w-[34px] min-h-[34px] rounded-lg border-b-2 text-sm sm:text-base md:text-lg font-black flex items-center justify-center transition-all 
                                            ${letter 
                                                ? 'bg-indigo-600 border-indigo-800 text-white shadow-md transform -translate-y-0.5' 
                                                : 'bg-indigo-50 dark:bg-slate-850 border-indigo-100 dark:border-slate-700/50 text-transparent'
                                            }
                                        `}
                                    >
                                        {letter?.char}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Letter Pool */}
                        <div className="flex gap-1 flex-wrap justify-center mb-6 py-2 border-t border-slate-100 dark:border-slate-800/40">
                            {scrambledLetters.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleLetterClick(item)}
                                    className="size-9 sm:size-11 max-w-[42px] max-h-[42px] min-w-[34px] min-h-[34px] bg-white dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg border-b-2 border-slate-200 dark:border-slate-900 font-extrabold text-sm sm:text-base md:text-lg shadow-sm active:border-b-0 active:translate-y-0.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-650"
                                >
                                    {item.char}
                                </button>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="w-full grid grid-cols-4 gap-2 mt-auto">
                            <button onClick={handleShuffle} className="col-span-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl flex flex-col items-center justify-center h-12 active:scale-95 transition-transform">
                                <Shuffle size={16} />
                                <span className="text-[8px] font-bold uppercase mt-0.5">Shuffle</span>
                            </button>
                            <button onClick={handleCheck} className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-1.5 h-12 shadow-md hover:shadow-lg active:scale-95 transition-transform text-xs sm:text-sm font-black tracking-wider uppercase">
                                CHECK WORD <Check size={16} strokeWidth={3} />
                            </button>
                            <button onClick={handleClear} className="col-span-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl flex flex-col items-center justify-center h-12 active:scale-95 transition-transform">
                                <X size={16} />
                                <span className="text-[8px] font-bold uppercase mt-0.5">Clear</span>
                            </button>
                        </div>
                     </div>
                )}
            </main>

            {/* Curriculum Explanation Synthesis Overlay */}
            {showExplanationCard && round && (
                <div className="absolute inset-0 z-[110] bg-[#0b132a]/95 backdrop-blur-md flex items-center justify-center p-6 text-white animate-in fade-in duration-250">
                    <div className="bg-white/5 border border-white/10 dark:bg-slate-900/90 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 text-center">
                        <div className="size-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                            <BookOpen size={28} />
                        </div>

                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-black text-emerald-400 tracking-widest">Unscrambled Concept</span>
                            <h2 className="text-2xl font-black text-white tracking-tight leading-none uppercase">{round.word}</h2>
                        </div>

                        <div className="space-y-4 text-left">
                            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Curriculum Clue</label>
                                <p className="text-xs text-slate-200 font-medium leading-relaxed italic">"{round.hint}"</p>
                            </div>

                            {round.explanation && (
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Synthesis Explanation:</label>
                                    <p className="text-xs text-slate-300 font-medium leading-relaxed bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/10">
                                        {round.explanation}
                                    </p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleContinueAfterSuccess}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl font-black shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs"
                        >
                            Next Challenge
                        </button>
                    </div>
                </div>
            )}

            {/* Battle Rules Overlay */}
            {showRules && (
                <div className="absolute inset-0 z-[100] bg-[#0B1026]/95 backdrop-blur-md flex items-center justify-center p-6 text-white animate-in fade-in zoom-in-95">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
                        <Shuffle size={48} className="text-emerald-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-black text-center uppercase tracking-tighter mb-6">How to Play</h2>
                        
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="size-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">1</div>
                                <p className="text-sm text-emerald-100 font-medium leading-relaxed">
                                    <span className="text-white font-bold">Sort Letters:</span> Rearrange the mixed letters to form the correct word.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="size-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">2</div>
                                <p className="text-sm text-emerald-100 font-medium leading-relaxed">
                                    <span className="text-white font-bold">Help:</span> Use the hint if you get stuck!
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="size-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">3</div>
                                <p className="text-sm text-emerald-100 font-medium leading-relaxed">
                                    <span className="text-white font-bold">Be Fast:</span> Solve as many words as you can before the time runs out!
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowRules(false)}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-black mt-8 shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs"
                        >
                            Start Playing
                        </button>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
}

export default WordScramble;
