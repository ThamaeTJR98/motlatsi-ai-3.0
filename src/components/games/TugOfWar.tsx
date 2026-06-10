
import React, { useState, useEffect, useRef } from 'react';
import { Topic } from '../../types';
import { aiClient } from '../../utils/aiClient';
import { safeJsonParse } from '../../utils/aiHelpers';
import { feedback } from '../../utils/feedbackManager';
import { supabase } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ArrowLeft, Settings, Trophy, CheckCircle, XCircle, Loader2, Zap, Users, User, Volume2, VolumeX, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TugOfWarProps {
    topic: Topic;
    onBack: () => void;
    onComplete: (score: number) => void;
    difficulty: 'easy' | 'medium' | 'hard';
    userGrade?: string;
}

interface QuickQuestion {
    q: string; 
    o: string[]; 
    a: number; 
}

type GameMode = 'solo' | 'pvp' | 'pvp_remote';
type GameState = 'setup' | 'loading' | 'playing' | 'paused' | 'won' | 'lost';
type CharacterPose = 'idle' | 'brace' | 'heave' | 'slip' | 'fall' | 'cheer';

const TugOfWar: React.FC<TugOfWarProps> = ({ topic, onBack, onComplete, difficulty: initialDifficulty, userGrade = 'General' }) => {
    // --- Configuration State ---
    const [mode, setMode] = useState<GameMode>('solo');
    const [difficulty, setDifficulty] = useState(initialDifficulty);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(feedback.isAudioEnabled());
    const [roomId, setRoomId] = useState<string | null>(null);
    const [myRole, setMyRole] = useState<'p1' | 'p2'>('p1');
    const [isJoining, setIsJoining] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [peerConnected, setPeerConnected] = useState(false);

    const channelRef = useRef<RealtimeChannel | null>(null);

    // --- Game Engine State ---
    const [gameState, setGameState] = useState<GameState>('setup');
    const [ropePosition, setRopePosition] = useState(50); // 50 is center, 0 is Left Win, 100 is Right Win
    const [velocity, setVelocity] = useState(0);
    const [tension, setTension] = useState(0);
    
    // --- Data State ---
    const [questions, setQuestions] = useState<QuickQuestion[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [turn, setTurn] = useState<'p1' | 'p2'>('p1'); // For PVP
    
    // --- Player State ---
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [nitro, setNitro] = useState(0); // 0-100
    const [isNitroActive, setIsNitroActive] = useState(false);
    
    // --- UI State ---
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [answerStatus, setAnswerStatus] = useState<'correct' | 'wrong' | null>(null);

    // --- Physics Constants ---
    const WIN_THRESHOLD = 15;
    const LOSE_THRESHOLD = 85;
    const FRICTION = 0.92;
    const BASE_PULL = difficulty === 'easy' ? 12 : difficulty === 'medium' ? 10 : 8;
    const AI_PULL_STRENGTH = difficulty === 'easy' ? 0.05 : difficulty === 'medium' ? 0.15 : 0.3;

    //Refs
    const loopRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const ropePosRef = useRef(50);
    const velocityRef = useRef(0);

    // --- Audio Effects ---
    const playSound = (type: 'pull' | 'win' | 'lose' | 'nitro') => {
        if (!soundEnabled) return;
        
        switch(type) {
            case 'pull': feedback.triggerTug(); break;
            case 'win': feedback.triggerSuccess(); break;
            case 'lose': feedback.triggerError(); break;
            case 'nitro': feedback.triggerSuccess(); break;
        }
    };

    // --- Initialization ---
    // --- Realtime Sync ---
    useEffect(() => {
        if (mode !== 'pvp_remote' || !roomId) return;

        const channel = supabase.channel(`tug:${roomId}`, {
            config: { broadcast: { self: false } }
        });

        channel
            .on('broadcast', { event: 'physics' }, ({ payload }) => {
                ropePosRef.current = payload.pos;
                velocityRef.current = payload.vel;
                setRopePosition(payload.pos);
                setVelocity(payload.vel);
                if (payload.gameState) setGameState(payload.gameState);
            })
            .on('broadcast', { event: 'start' }, ({ payload }) => {
                setQuestions(payload.questions);
                setGameState('playing');
                lastTimeRef.current = performance.now();
                loopRef.current = requestAnimationFrame(gameLoop);
            })
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                setPeerConnected(Object.keys(state).length > 1);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user: myRole });
                }
            });

        channelRef.current = channel;
        return () => { channel.unsubscribe(); };
    }, [mode, roomId, myRole, gameLoop]);

    const broadcastPhysics = useCallback((gs?: GameState) => {
        if (!channelRef.current || mode !== 'pvp_remote') return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'physics',
            payload: { 
                pos: ropePosRef.current, 
                vel: velocityRef.current,
                gameState: gs || gameState
            }
        });
    }, [mode, gameState]);

    const startGame = async () => {
        if (mode === 'pvp_remote' && isJoining) {
             setMyRole('p2');
             setRoomId(joinCode);
             setGameState('loading');
             // Wait for Host to send questions
             return;
        }

        if (mode === 'pvp_remote' && !isJoining) {
             const rid = Math.floor(1000 + Math.random() * 9000).toString();
             setRoomId(rid);
             setMyRole('p1');
        }

        setGameState('loading');
        try {
            const prompt = `
                Generate 20 rapid-fire questions for: "${topic.title}".
                Target: Grade ${userGrade}.
                Format: Short question, 4 short options.
                JSON: [{ "q": "...", "o": ["A", "B", "C", "D"], "a": 0 }]
            `;

            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const data = safeJsonParse<QuickQuestion[]>(response.text);
            if (data && Array.isArray(data)) {
                setQuestions(data);
                
                if (mode === 'pvp_remote' && channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'start',
                        payload: { questions: data }
                    });
                }

                setGameState('playing');
                // Reset Physics
                ropePosRef.current = 50;
                velocityRef.current = 0;
                setRopePosition(50);
                lastTimeRef.current = performance.now();
                loopRef.current = requestAnimationFrame(gameLoop);
            } else {
                throw new Error("Data error");
            }
        } catch (e) {
            // Fallback
            setQuestions([
                { q: "2 + 2 = ?", o: ["3", "4", "5", "6"], a: 1 },
                { q: "Capital of Lesotho?", o: ["Maseru", "Leribe", "Teyateyaneng", "Mafeteng"], a: 0 },
                { q: "5 x 5 = ?", o: ["10", "20", "25", "30"], a: 2 }
            ]);
            setGameState('playing');
            ropePosRef.current = 50;
            lastTimeRef.current = performance.now();
            loopRef.current = requestAnimationFrame(gameLoop);
        }
    };

    // --- Physics Loop ---
    const gameLoop = useCallback((time: number) => {
        if (gameState !== 'playing') return;

        const delta = Math.min((time - lastTimeRef.current) / 16, 4); // Cap delta
        lastTimeRef.current = time;

        // 1. Apply AI Force (Constant slight pull in Solo mode)
        if (mode === 'solo') {
            // AI pulls to the Right (+)
            const noise = (Math.random() - 0.5) * 0.05;
            velocityRef.current += (AI_PULL_STRENGTH + noise) * delta;
        }

        // 2. Apply Friction (Damping)
        velocityRef.current *= FRICTION;

        // 3. Update Position
        ropePosRef.current += velocityRef.current * delta;

        // 4. Boundary Checks
        if (ropePosRef.current <= WIN_THRESHOLD) {
            ropePosRef.current = WIN_THRESHOLD;
            setGameState('won');
            return;
        } else if (ropePosRef.current >= LOSE_THRESHOLD) {
            ropePosRef.current = LOSE_THRESHOLD;
            setGameState(mode === 'solo' ? 'lost' : 'won'); // In PVP, P2 wins if rope goes right
            return;
        }

        // 5. Update State for Render
        setRopePosition(ropePosRef.current);
        setVelocity(velocityRef.current);
        // Tension is higher when velocity is high or fighting force
        setTension(Math.abs(velocityRef.current) * 10 + 2); 

        // Sync physics periodically (every 10th frame to save bandwidth)
        if (loopRef.current % 10 === 0) {
            broadcastPhysics();
        }

        loopRef.current = requestAnimationFrame(gameLoop);
    }, [gameState, mode, AI_PULL_STRENGTH, FRICTION, WIN_THRESHOLD, LOSE_THRESHOLD, broadcastPhysics]);

    useEffect(() => {
        return () => cancelAnimationFrame(loopRef.current);
    }, []);

    // --- Interaction ---
    const handleAnswer = (index: number) => {
        if (gameState !== 'playing' || answerStatus !== null) return;

        setSelectedOption(index);
        const currentQ = questions[currentQIndex];
        const isCorrect = index === currentQ.a;

        if (isCorrect) {
            setAnswerStatus('correct');
            playSound('pull');
            
            // Calculate Pull Force
            let pull = BASE_PULL;
            if (isNitroActive) {
                pull *= 3; // NITRO BOOST
                setIsNitroActive(false);
                setNitro(0);
                playSound('nitro');
            } else {
                // Streak Bonus
                pull += Math.min(streak, 5); 
                // Build Nitro
                setNitro(n => Math.min(100, n + 20));
            }

            // Apply Velocity
            if (mode === 'solo') {
                velocityRef.current -= pull; // Pull Left
                setScore(s => s + 100 + (streak * 10));
            } else if (mode === 'pvp_remote') {
                 // Push pull force to channel
                 if (myRole === 'p1') {
                    velocityRef.current -= pull; // Pull Left
                 } else {
                    velocityRef.current += pull; // Pull Right
                 }
                 broadcastPhysics();
                 setScore(s => s + 100 + (streak * 10));
            } else {
                // Local PVP
                if (turn === 'p1') {
                    velocityRef.current -= pull; // P1 pulls Left
                } else {
                    velocityRef.current += pull; // P2 pulls Right
                }
            }
            
            setStreak(s => s + 1);

            // Delay for animation then next question
            setTimeout(() => {
                nextQuestion();
            }, 800);

        } else {
            setAnswerStatus('wrong');
            setStreak(0);
            
            // Penalty: Small slip in opposite direction
            if (mode === 'solo') {
                velocityRef.current += BASE_PULL * 0.5;
            } else {
                 if (turn === 'p1') velocityRef.current += BASE_PULL * 0.5;
                 else velocityRef.current -= BASE_PULL * 0.5;
            }

            setTimeout(() => {
                nextQuestion();
            }, 800);
        }
    };

    const nextQuestion = () => {
        setAnswerStatus(null);
        setSelectedOption(null);
        setCurrentQIndex(prev => (prev + 1) % questions.length);
        if (mode === 'pvp') {
            setTurn(prev => prev === 'p1' ? 'p2' : 'p1');
        }
    };

    const activateNitro = () => {
        if (nitro >= 100 && !isNitroActive && gameState === 'playing') {
            setIsNitroActive(true);
            playSound('nitro');
        }
    };

    // --- Determine Character Poses based on Physics ---
    const getPoses = (): { p1: CharacterPose; p2: CharacterPose } => {
        // Winning/Losing State Poses
        if (gameState === 'won') {
            return mode === 'solo' ? { p1: 'cheer', p2: 'fall' } : (ropePosition < 50 ? { p1: 'cheer', p2: 'fall' } : { p1: 'fall', p2: 'cheer' });
        }
        if (gameState === 'lost') {
            return { p1: 'fall', p2: 'cheer' };
        }

        // Active Gameplay Poses based on velocity
        let p1Pose: CharacterPose = 'brace';
        let p2Pose: CharacterPose = 'brace';

        // Significant movement
        if (velocity < -0.5) {
            // Moving Left (Player/P1 winning)
            p1Pose = 'heave'; // Pulling hard
            p2Pose = 'slip';  // Losing ground
        } else if (velocity > 0.5) {
            // Moving Right (Opponent/P2 winning)
            p1Pose = 'slip';
            p2Pose = 'heave';
        } else {
            // High tension, low movement (Stalemate/Brace)
             p1Pose = 'brace';
             p2Pose = 'brace';
        }
        
        return { p1: p1Pose, p2: p2Pose };
    };

    const poses = getPoses();


    // --- Setup Screen ---
    if (gameState === 'setup') {
        return (
            <div className="absolute inset-0 z-50 bg-[#0B1026] flex items-center justify-center p-6 text-white font-sans">
                <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl">
                    <div className="text-center mb-8">
                        <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
                        <h1 className="text-3xl font-black uppercase tracking-tight">Tug of War</h1>
                        <p className="text-blue-200 text-sm font-bold mt-2">Knowledge is Power. Literally.</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Select Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setMode('pvp')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${mode === 'pvp' ? 'bg-purple-600 border-purple-400 shadow-lg shadow-purple-500/30' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                                >
                                    <Users size={24} />
                                    <span className="font-bold text-sm">Local</span>
                                </button>
                                <button 
                                    onClick={() => setMode('pvp_remote')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${mode === 'pvp_remote' ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-500/30' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                                >
                                    <Globe size={24} />
                                    <span className="font-bold text-sm">Remote</span>
                                </button>
                            </div>
                        </div>

                        {mode === 'pvp_remote' && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-white/5 p-5 rounded-2xl border border-white/10"
                            >
                                {isJoining ? (
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest text-center">Join Friend's Field</p>
                                        <input 
                                            type="text" 
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                            placeholder="CODE"
                                            maxLength={4}
                                            className="w-full text-center text-3xl font-black py-3 bg-white/10 rounded-xl border-2 border-white/20 focus:border-blue-400 outline-none uppercase placeholder:text-white/10"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsJoining(false)} className="flex-1 py-3 text-xs font-bold text-white/40">Cancel</button>
                                            <button 
                                                disabled={joinCode.length < 4}
                                                onClick={startGame}
                                                className="flex-[2] py-4 bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest text-xs disabled:opacity-50"
                                            >
                                                Enter Game
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <button 
                                            onClick={startGame}
                                            className="w-full py-4 bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                        >
                                            Host Match
                                        </button>
                                        <button 
                                            onClick={() => setIsJoining(true)}
                                            className="w-full py-4 bg-white/5 text-white rounded-xl font-black uppercase tracking-widest text-xs border border-white/10"
                                        >
                                            I have a code
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {mode !== 'pvp_remote' && (
                            <button 
                                onClick={startGame}
                                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap fill="currentColor" /> Start Match
                            </button>
                        )}
                        
                         <button onClick={onBack} className="w-full py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors">
                            Back to Hub
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Loading ---
    if (gameState === 'loading') {
        return (
            <div className="absolute inset-0 z-50 bg-[#0B1026] flex flex-col items-center justify-center text-white">
                <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
                <p className="font-bold tracking-widest uppercase animate-pulse">Setting up the field...</p>
            </div>
        );
    }

    // Calculate curve for rope sag based on tension
    // Higher tension = flatter curve. 
    // M 0,10 Q 50,25 100,10 (Sag) vs M 0,10 Q 50,10 100,10 (Taut)
    const sag = Math.max(0, 20 - tension * 0.5); 

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0B1026] font-sans overflow-hidden select-none h-[100dvh]">
            
            {/* 1. Header & HUD */}
            <div className="absolute top-0 left-0 right-0 z-40 px-4 pt-4 flex justify-between items-start">
                
                {/* Nitro Card (Left) */}
                <button 
                    onClick={activateNitro}
                    disabled={nitro < 100 || isNitroActive}
                    className={`relative group transition-all duration-300 ${nitro >= 100 ? 'scale-105 cursor-pointer' : 'scale-100 opacity-90 cursor-default'}`}
                >
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 shadow-lg transition-colors ${
                        isNitroActive 
                            ? 'bg-yellow-400 border-yellow-200 text-yellow-900 animate-pulse' 
                            : nitro >= 100 
                                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 border-yellow-300 text-white' 
                                : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}>
                        <div className="relative">
                            <Zap size={18} className={isNitroActive || nitro >= 100 ? "fill-current" : ""} />
                            {nitro >= 100 && !isNitroActive && (
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[9px] font-black uppercase tracking-wider leading-none">NITRO</span>
                            <span className="text-xs font-bold leading-none">{isNitroActive ? 'ACTIVE!' : `${nitro}%`}</span>
                        </div>
                    </div>
                    {/* Progress Bar background for button */}
                    <div className="absolute bottom-0 left-0 h-1 bg-yellow-400 transition-all duration-500 rounded-b-xl" style={{ width: `${nitro}%`, opacity: nitro < 100 ? 1 : 0 }}></div>
                </button>

                {/* Score & Turn (Center) */}
                {(mode === 'pvp' || mode === 'pvp_remote') && (
                    <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
                         <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${mode === 'pvp_remote' ? 'text-blue-300' : (turn === 'p1' ? 'text-blue-400' : 'text-orange-400')}`}>
                             {mode === 'pvp_remote' ? `ROOM ${roomId}` : (turn === 'p1' ? "Player 1" : "Player 2")}
                         </span>
                         {mode === 'pvp_remote' && (
                             <div className={`size-1.5 rounded-full inline-block ml-2 ${peerConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></div>
                         )}
                    </div>
                )}

                {/* Controls (Right) */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => setSettingsOpen(true)}
                        className="p-2.5 bg-slate-800/80 rounded-full text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        <Settings size={20} />
                    </button>
                    <button 
                        onClick={onBack} 
                        className="p-2.5 bg-slate-800/80 rounded-full text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                </div>
            </div>

            {/* 2. Game World (Canvas Area) */}
            <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#1e3a8a] to-[#047857]">
                
                {/* Background Decor */}
                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                <div className="absolute top-20 right-10 size-32 bg-yellow-100 rounded-full blur-[60px] opacity-10"></div>
                
                {/* Mountains Parallax (Simplified CSS) */}
                <div className="absolute bottom-24 left-0 right-0 h-48 bg-[#020617] opacity-80" style={{ clipPath: 'polygon(0% 100%, 20% 30%, 45% 80%, 60% 20%, 85% 90%, 100% 40%, 100% 100%)' }}></div>
                
                {/* Ground */}
                <div className="absolute bottom-0 w-full h-32 bg-gradient-to-b from-[#166534] to-[#064e3b] border-t-4 border-[#22c55e]/30"></div>

                {/* --- THE ROPE & CHARACTERS --- */}
                <div 
                    className="absolute inset-x-0 bottom-16 h-40 flex items-end justify-center transition-transform duration-100 ease-linear will-change-transform"
                    style={{ 
                        transform: `translateX(${(ropePosition - 50) * 1.5}%)` 
                    }}
                >
                    {/* Rope SVG Line */}
                    <div className="absolute bottom-[45px] left-[-50%] right-[-50%] h-4 pointer-events-none z-10">
                        <svg width="100%" height="100%" preserveAspectRatio="none" className="overflow-visible">
                            {/* The Rope itself */}
                            <path 
                                d={`M 0,10 Q 50,${10 + sag} 100,10`} 
                                stroke="#d4d4d4" 
                                strokeWidth="6" 
                                fill="none"
                                strokeLinecap="round"
                            />
                            {/* Texture details */}
                            <path 
                                d={`M 0,10 Q 50,${10 + sag} 100,10`} 
                                stroke="#a3a3a3" 
                                strokeWidth="2" 
                                fill="none"
                                strokeDasharray="10,5"
                                className="opacity-50"
                            />
                        </svg>
                        
                        {/* Center Flag */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 z-20" style={{ marginTop: `${sag/2}px` }}>
                            <div className={`w-1 h-8 bg-red-500 mx-auto origin-top ${tension < 10 ? 'animate-swing' : ''}`}></div>
                             <div className={`w-6 h-4 bg-red-500 absolute top-2 left-1/2 ${tension < 10 ? 'animate-flutter' : ''}`}></div>
                        </div>
                    </div>

                    {/* Team Left (Player) */}
                    <div className="absolute right-[51%] bottom-0 flex gap-[-10px] z-20">
                         {[1, 2, 3].map(i => (
                             <div key={i} className="w-24 h-32 relative -mr-10" style={{ zIndex: 10-i }}>
                                 <BasothoCharacter team="player" pose={poses.p1} />
                             </div>
                         ))}
                    </div>

                    {/* Team Right (Enemy) */}
                    <div className="absolute left-[51%] bottom-0 flex gap-[-10px] z-20">
                         {[1, 2, 3].map(i => (
                             <div key={i} className="w-24 h-32 relative -ml-10 scale-x-[-1]" style={{ zIndex: 10-i }}>
                                 <BasothoCharacter team="enemy" pose={poses.p2} />
                             </div>
                         ))}
                    </div>
                </div>

                {/* Win/Lose Zones Markers */}
                <div className="absolute bottom-0 left-0 w-[15%] h-full bg-green-500/10 border-r-2 border-green-500/30 flex items-center justify-center pointer-events-none">
                    <span className="-rotate-90 text-green-500/50 font-black text-4xl uppercase tracking-widest whitespace-nowrap">Victory Zone</span>
                </div>
                <div className="absolute bottom-0 right-0 w-[15%] h-full bg-red-500/10 border-l-2 border-red-500/30 flex items-center justify-center pointer-events-none">
                    <span className="rotate-90 text-red-500/50 font-black text-4xl uppercase tracking-widest whitespace-nowrap">Danger Zone</span>
                </div>
            </div>

            {/* 3. Question Panel */}
            <div className="bg-white rounded-t-[2rem] p-6 pb-8 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] relative">
                
                {/* Question Text */}
                <div className="mb-4 text-center">
                    <h3 className="text-xl font-bold text-slate-800 leading-tight">
                        {questions[currentQIndex]?.q || "Loading..."}
                    </h3>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                    {questions[currentQIndex]?.o.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrect = answerStatus === 'correct' && isSelected;
                        const isWrong = answerStatus === 'wrong' && isSelected;
                        
                        // Dynamic Styles
                        let btnStyle = "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300";
                        if (isSelected && !answerStatus) btnStyle = "bg-blue-50 border-blue-400 text-blue-700 ring-1 ring-blue-400";
                        if (isCorrect) btnStyle = "bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500";
                        if (isWrong) btnStyle = "bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500";

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                disabled={answerStatus !== null}
                                className={`
                                    relative p-4 rounded-xl border-2 font-bold text-lg transition-all active:scale-[0.98] 
                                    flex items-center justify-between group h-16
                                    ${btnStyle}
                                `}
                            >
                                <span className="truncate pr-2">{opt}</span>
                                {isCorrect && <CheckCircle size={20} className="shrink-0" />}
                                {isWrong && <XCircle size={20} className="shrink-0" />}
                                {!answerStatus && <span className="size-6 rounded-full border-2 border-current opacity-20 group-hover:opacity-50"></span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Settings Modal */}
            {settingsOpen && (
                <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Settings size={24} className="text-slate-400"/> Settings</h3>
                            <button onClick={() => setSettingsOpen(false)}><X size={24} className="text-slate-400" /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {soundEnabled ? <Volume2 className="text-blue-500" /> : <VolumeX className="text-gray-400" />}
                                    <span className="font-bold text-slate-700">Sound Effects</span>
                                </div>
                                <div className={`w-12 h-7 rounded-full relative transition-colors ${soundEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${soundEnabled ? 'translate-x-5' : ''}`}></div>
                                </div>
                            </button>

                            <button onClick={() => { setSettingsOpen(false); onBack(); }} className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-colors border border-red-100">
                                Forfeit Match
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* End Game Screen */}
            {(gameState === 'won' || gameState === 'lost') && (
                <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95">
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
                        <Trophy size={100} className={gameState === 'won' ? 'text-yellow-400 drop-shadow-lg' : 'text-gray-600'} fill="currentColor" />
                    </div>
                    <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-2">
                        {gameState === 'won' ? 'VICTORY!' : 'DEFEATED'}
                    </h1>
                    <p className="text-slate-300 font-medium mb-10 text-lg max-w-xs">
                        {gameState === 'won' 
                            ? (mode === 'pvp' ? (ropePosition < 50 ? "Player 1 Wins!" : "Player 2 Wins!") : "You pulled them over!") 
                            : "Keep training to win."}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Score</p>
                            <p className="text-2xl font-black text-white">{score}</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Streak</p>
                            <p className="text-2xl font-black text-white">{streak}</p>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full max-w-sm">
                        <button onClick={onBack} className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-colors">Exit</button>
                        <button onClick={() => onComplete(score)} className="flex-1 py-4 bg-[#2563eb] hover:bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-colors">Continue</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-component: Character SVG ---
const BasothoCharacter = ({ team, pose }: { team: 'player' | 'enemy', pose: CharacterPose }) => {
    return (
        <div className={`w-full h-full transition-transform duration-300 ease-out origin-bottom ${pose === 'heave' ? 'rotate-[-25deg] translate-y-2' : pose === 'slip' ? 'rotate-[15deg] translate-x-2' : pose === 'brace' ? 'rotate-[-10deg]' : ''}`}>
            <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-xl overflow-visible">
                 <defs>
                    <linearGradient id={`blanket-${team}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={team === 'player' ? "#2563eb" : "#ea580c"} />
                        <stop offset="100%" stopColor={team === 'player' ? "#1d4ed8" : "#c2410c"} />
                    </linearGradient>
                </defs>
                
                {/* Legs - Positioned based on pose */}
                <path 
                    d={pose === 'slip' ? "M45 110 L55 135" : "M40 110 L30 135"} 
                    stroke="#1f2937" strokeWidth="8" strokeLinecap="round" 
                />
                <path 
                    d={pose === 'slip' ? "M75 110 L85 135" : "M70 110 L80 135"} 
                    stroke="#1f2937" strokeWidth="8" strokeLinecap="round" 
                />

                {/* Blanket Body */}
                <path 
                    d="M 20 40 Q 50 25 80 40 L 90 110 Q 50 120 10 110 Z" 
                    fill={`url(#blanket-${team})`}
                    stroke="rgba(0,0,0,0.2)" strokeWidth="1"
                />
                <path d="M 25 60 Q 50 50 75 60" stroke="rgba(255,255,255,0.3)" strokeWidth="4" fill="none" />
                <path d="M 20 90 Q 50 100 80 90" stroke="rgba(255,255,255,0.3)" strokeWidth="4" fill="none" />

                {/* Arms (Dynamic based on pose) */}
                {pose === 'heave' ? (
                     <path d="M 35 50 L 5 60" stroke="#1f2937" strokeWidth="7" strokeLinecap="round" />
                ) : pose === 'cheer' ? (
                     <path d="M 35 50 L 20 20" stroke="#1f2937" strokeWidth="7" strokeLinecap="round" />
                ) : (
                     <path d="M 35 50 L 15 65" stroke="#1f2937" strokeWidth="7" strokeLinecap="round" />
                )}

                {/* Head */}
                <circle cx="50" cy="25" r="14" fill="#5c4033" />
                
                {/* Mokorotlo Hat */}
                <path 
                    d="M 20 20 L 80 20 L 50 -15 Z" 
                    fill="#fcd34d" stroke="#b45309" strokeWidth="2"
                />
                <circle cx="50" cy="-15" r="3" fill="#fcd34d" stroke="#b45309" />
            </svg>
        </div>
    );
};

export default TugOfWar;
