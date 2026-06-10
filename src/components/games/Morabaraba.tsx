
import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, AlertCircle, Loader2, Target, ShieldAlert, Users, Brain, Briefcase, Globe, Calculator, FlaskConical, User, Cpu, Check, X, Lock, Footprints, Plane, BookOpen, Lightbulb, CheckCircle } from 'lucide-react';
import { Topic } from '../../types';
import { aiClient } from '../../utils/aiClient';
import { safeJsonParse } from '../../utils/aiHelpers';
import { allGrades } from '../../curriculum';
import { supabase } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { feedback } from '../../utils/feedbackManager';
import { useLearningEngine } from '../../contexts/LearningEngineContext';

interface MorabarabaProps {
    topic: Topic;
    onBack: () => void;
    onComplete: (score: number) => void;
    difficulty: 'easy' | 'medium' | 'hard';
    userGrade?: string;
}

type Player = 'player' | 'opponent';
type Phase = 'placing' | 'moving' | 'flying';
type BoardState = (Player | null)[];
type MoveType = 'attack' | 'defense' | 'standard' | 'flying_attack';
type GameMode = 'pve' | 'pvp' | 'pvp_remote';

interface PendingMove {
    targetIndex: number; 
    sourceIndex?: number; 
    moveType: MoveType;
}

interface Challenge {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    context?: string; 
    topicTitle?: string;
}

interface MissedConcept {
    topic: string;
    advice: string;
}

const XP_RATES = {
    ROUTINE: 1,
    CORRECT_EASY: 2,
    CORRECT_MED: 3,
    CORRECT_HARD: 5,
    FORM_MILL: 5,
    WIN: 20,
    LEARNED: 1 // Consolation for reading explanation
};

// 25 Positions Adjacency Graph
const ADJACENCY = [
    // Outer (0-7)
    [1, 7], [0, 2, 9], [1, 3], [2, 4, 11], [3, 5], [4, 6, 13], [5, 7], [0, 6, 15], 
    // Middle (8-15)
    [9, 15], [1, 8, 10, 17], [9, 11], [3, 10, 12, 19], [11, 13], [5, 12, 14, 21], [13, 15], [8, 14, 7, 23], 
    // Inner (16-23)
    [17, 23], 
    [9, 16, 18, 24], 
    [17, 19], 
    [11, 18, 20, 24], 
    [19, 21], 
    [13, 20, 22, 24], 
    [21, 23], 
    [15, 16, 22, 24], 
    // Center (24)
    [17, 19, 21, 23] 
];

// Mill Combinations
const MILLS = [
    [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0], 
    [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8], 
    [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16], 
    [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23],
    [17, 24, 21], [23, 24, 19] 
];

// Visual Coordinates (0-100%)
const COORDS = [
    // Outer (0-7)
    {x: 0, y: 0}, {x: 50, y: 0}, {x: 100, y: 0}, 
    {x: 100, y: 50}, {x: 100, y: 100}, {x: 50, y: 100}, 
    {x: 0, y: 100}, {x: 0, y: 50},                 
    // Middle (8-15)
    {x: 16.66, y: 16.66}, {x: 50, y: 16.66}, {x: 83.34, y: 16.66}, 
    {x: 83.34, y: 50}, {x: 83.34, y: 83.34}, {x: 50, y: 83.34},   
    {x: 16.66, y: 83.34}, {x: 16.66, y: 50},                     
    // Inner (16-23)
    {x: 33.33, y: 33.33}, {x: 50, y: 33.33}, {x: 66.67, y: 33.33}, 
    {x: 66.67, y: 50}, {x: 66.67, y: 66.67}, {x: 50, y: 66.67},   
    {x: 33.33, y: 66.67}, {x: 33.33, y: 50},
    // Center (24)
    {x: 50, y: 50} 
];

const SUBJECTS = [
    { id: 'math', name: 'Mathematics', icon: <Calculator size={20}/>, color: 'bg-blue-500' },
    { id: 'science', name: 'Science', icon: <FlaskConical size={20}/>, color: 'bg-green-500' },
    { id: 'geo', name: 'Geography', icon: <Globe size={20}/>, color: 'bg-orange-500' },
    { id: 'acc', name: 'Accounting', icon: <Briefcase size={20}/>, color: 'bg-purple-500' },
];


// --- CUSTOM PIECE COMPONENT (Simplified Round Design) ---
const CowIcon = ({ owner }: { owner: Player }) => {
    const isPlayer = owner === 'player';
    return (
        <div className={`size-full rounded-full flex items-center justify-center border-2 border-white/50 shadow-inner relative overflow-hidden ${isPlayer ? 'bg-blue-600' : 'bg-orange-600'}`}>
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
            <div className={`size-2/3 rounded-full border border-white/20 ${isPlayer ? 'bg-blue-500' : 'bg-orange-500'}`} />
        </div>
    );
};

export function Morabaraba({ topic, onBack, onComplete, difficulty, userGrade = '6' }: MorabarabaProps) {
    // --- Config State ---
    const [gameMode, setGameMode] = useState<GameMode>('pve');
    const [subjectFocus, setSubjectFocus] = useState<string | null>(() => {
        return topic ? topic.subject.toLowerCase() : null;
    });
    const [showSetupModal, setShowSetupModal] = useState(true);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [myRole, setMyRole] = useState<Player>('player');
    const [isJoining, setIsJoining] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [playerCount, setPlayerCount] = useState(0);

    const channelRef = useRef<RealtimeChannel | null>(null);

    // --- Gameplay State ---
    const [board, setBoard] = useState<BoardState>(Array(25).fill(null));
    const [turn, setTurn] = useState<Player>('player'); 
    const [phase, setPhase] = useState<Phase>('placing');
    
    // Inventory
    const [playerCowsHand, setPlayerCowsHand] = useState(12);
    const [opponentCowsHand, setOpponentCowsHand] = useState(12);
    const [playerCowsCaptured, setPlayerCowsCaptured] = useState(0);
    const [opponentCowsCaptured, setOpponentCowsCaptured] = useState(0);
    
    // UI Interaction
    const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
    const [removeMode, setRemoveMode] = useState(false);
    const [blockedNodes, setBlockedNodes] = useState<number[]>([]); // The "Strategic Block"
    
    // Outcomes
    const [winner, setWinner] = useState<Player | null>(null);
    const [totalXP, setTotalXP] = useState(0);
    const [message, setMessage] = useState("Place your cows to begin.");

    // --- Educational Layer ---
    const learningEngine = useLearningEngine();
    
    const [selectedGrade, setSelectedGrade] = useState<string>(() => {
        return userGrade || (topic ? topic.grade : '6');
    });

    // Dynamically retrieve subjects & topics defined in the curriculum for the user's specific grade
    const gradeSubjects = React.useMemo(() => {
        const formattedGrade = selectedGrade.startsWith('Grade') ? selectedGrade : `Grade ${selectedGrade}`;
        const currentGradeCurriculum = allGrades.find(g => {
            const gName = g.grade.toLowerCase();
            const target = formattedGrade.toLowerCase();
            return gName === target || gName.includes(target) || target.includes(gName);
        });

        if (!currentGradeCurriculum || !currentGradeCurriculum.subjects || currentGradeCurriculum.subjects.length === 0) {
            // High-fidelity fallback subjects mapped with icons & blank topics
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

    // Available curriculum topics for selected subject and user's actual grade level
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

    // Active topic tracking (defaults to prop topic or first chronological topic)
    const [activeTopic, setActiveTopic] = useState<Topic>(() => {
        if (topic) return topic;
        return gradeSubjects[0]?.topics[0] || topic;
    });

    // Sync subjectFocus and activeTopic once gradeSubjects loads or update
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

    // Sync active topic when available topics list updates
    useEffect(() => {
        if (availableTopics.length > 0) {
            const hasMatch = availableTopics.find(t => t.id === activeTopic?.id);
            if (!hasMatch) {
                // Select first chronological topic in this subject category
                setActiveTopic(availableTopics[0]);
            }
        }
    }, [availableTopics, activeTopic?.id]);

    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [showChallenge, setShowChallenge] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false); // Teachable moment modal
    const [showRules, setShowRules] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [userSelectedIndex, setUserSelectedIndex] = useState<number | null>(null);
    const [missedConcepts, setMissedConcepts] = useState<MissedConcept[]>([]);
    const [askedQuestions, setAskedQuestions] = useState<string[]>([]);

    // Dynamically sync askedQuestions when activeTopic or grade updates
    useEffect(() => {
        try {
            const formattedGrade = selectedGrade.startsWith('Grade') ? selectedGrade : `Grade ${selectedGrade}`;
            const key = `morabaraba_asked_${formattedGrade}_${activeTopic?.id || 'default'}`;
            const saved = localStorage.getItem(key);
            setAskedQuestions(saved ? JSON.parse(saved) : []);
        } catch {
            setAskedQuestions([]);
        }
    }, [activeTopic, selectedGrade]);

    // Derived State
    const playerCowsBoard = board.filter(c => c === 'player').length;
    const opponentCowsBoard = board.filter(c => c === 'opponent').length;

    // Reset blocked nodes on turn change
    useEffect(() => {
        setBlockedNodes([]);
    }, [turn]);

    // Check Phase Transition
    useEffect(() => {
        if (playerCowsHand === 0 && opponentCowsHand === 0 && phase === 'placing') {
            setPhase('moving');
            setMessage("Deployment complete. Move cows to adjacent spots.");
        }
        
        // Check for Flying Phase
        if (phase === 'moving') {
             if (turn === 'player' && playerCowsBoard <= 3) setMessage("You are down to 3 cows! You can now FLY to any spot.");
             if (turn === 'opponent' && opponentCowsBoard <= 3) setMessage("Opponent can now FLY.");
        }
    }, [playerCowsHand, opponentCowsHand, playerCowsBoard, opponentCowsBoard, turn, phase]);


    // --- CORE GAMEPLAY FUNCTIONS ---

    const startGame = (subjectId: string, mode: GameMode, existingRoomId?: string) => {
        setSubjectFocus(subjectId);
        setGameMode(mode);
        if (mode === 'pvp_remote') {
            const rid = existingRoomId || Math.floor(1000 + Math.random() * 9000).toString();
            setRoomId(rid);
            setMyRole(existingRoomId ? 'opponent' : 'player');
        }
        setShowSetupModal(false);
    };

    // --- Realtime Sync ---
    useEffect(() => {
        if (gameMode !== 'pvp_remote' || !roomId) return;

        const channel = supabase.channel(`room:${roomId}`, {
            config: { broadcast: { self: false } }
        });

        channel
            .on('broadcast', { event: 'move' }, ({ payload }) => {
                // Sync the full state received from the other player
                setBoard(payload.board);
                setTurn(payload.turn);
                setPhase(payload.phase);
                setPlayerCowsHand(payload.playerCowsHand);
                setOpponentCowsHand(payload.opponentCowsHand);
                setPlayerCowsCaptured(payload.playerCowsCaptured);
                setOpponentCowsCaptured(payload.opponentCowsCaptured);
                setMessage(payload.message);
                setRemoveMode(payload.removeMode);
            })
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                setPlayerCount(Object.keys(state).length);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user: 'player' });
                }
            });

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
        };
    }, [gameMode, roomId]);

    const broadcastState = (overrides = {}) => {
        if (!channelRef.current || gameMode !== 'pvp_remote') return;

        // Current state values (state might be stale in same-tick, so we allow overrides)
        const currentState = {
            board,
            turn,
            phase,
            playerCowsHand,
            opponentCowsHand,
            playerCowsCaptured,
            opponentCowsCaptured,
            message,
            removeMode,
            ...overrides
        };

        channelRef.current.send({
            type: 'broadcast',
            event: 'move',
            payload: currentState
        });
    };

    const checkMill = (index: number, player: Player, currentBoard: BoardState): boolean => {
        const relevantMills = MILLS.filter(m => m.includes(index));
        return relevantMills.some(mill => mill.every(pos => currentBoard[pos] === player));
    };

    // Does the current player have any valid moves?
    const hasValidMoves = (player: Player): boolean => {
        const boardCount = player === 'player' ? playerCowsBoard : opponentCowsBoard;
        const handCount = player === 'player' ? playerCowsHand : opponentCowsHand;
        
        // If placing, always yes unless board full (unlikely)
        if (handCount > 0) return true;

        // If flying, can move to any empty spot
        if (boardCount <= 3) {
            return board.some(cell => cell === null);
        }

        // If moving, check adjacency
        for (let i = 0; i < 25; i++) {
            if (board[i] === player) {
                const neighbors = ADJACENCY[i];
                if (neighbors.some(n => board[n] === null)) return true;
            }
        }
        return false;
    };

    const [showTurnTransition, setShowTurnTransition] = useState(false);

    const switchTurn = () => {
        const nextPlayer = turn === 'player' ? 'opponent' : 'player';
        setTurn(nextPlayer);
        
        if (gameMode === 'pvp') {
            setShowTurnTransition(true);
        }
        
        if (gameMode === 'pvp_remote') {
            broadcastState({ turn: nextPlayer });
        }
    };

    // Is this a Critical Move? (Attack or Defense)
    const analyzeMoveType = (targetIndex: number, player: Player, sourceIndex?: number): MoveType => {
        const boardAfterMove = [...board];
        if (sourceIndex !== undefined) boardAfterMove[sourceIndex] = null;
        boardAfterMove[targetIndex] = player;
        
        // 1. Attack: Does this move form a mill?
        if (checkMill(targetIndex, player, boardAfterMove)) return 'attack';

        // 2. Defense: Would the opponent have formed a mill here?
        const opponent = player === 'player' ? 'opponent' : 'player';
        const boardIfOpponentPlayed = [...board];
        boardIfOpponentPlayed[targetIndex] = opponent; // Hypothetical opponent move
        if (checkMill(targetIndex, opponent, boardIfOpponentPlayed)) return 'defense';

        return 'standard';
    };

    // Execute Move & Handle Consequences
    const executeMove = (move: PendingMove) => {
        const newBoard = [...board];
        const currentPlayer = turn;

        // 1. Update Board
        let newPlayerCowsHand = playerCowsHand;
        let newOpponentCowsHand = opponentCowsHand;

        if (phase === 'placing') {
            newBoard[move.targetIndex] = currentPlayer;
            if (currentPlayer === 'player') {
                newPlayerCowsHand -= 1;
                setPlayerCowsHand(newPlayerCowsHand);
            } else {
                newOpponentCowsHand -= 1;
                setOpponentCowsHand(newOpponentCowsHand);
            }
        } else {
            if (move.sourceIndex !== undefined) newBoard[move.sourceIndex] = null;
            newBoard[move.targetIndex] = currentPlayer;
            setSelectedPiece(null);
        }

        const formedMill = checkMill(move.targetIndex, currentPlayer, newBoard);
        setBoard(newBoard);

        // Feedback
        if (formedMill) {
            feedback.triggerSuccess();
        } else {
            feedback.triggerAction();
        }

        // 2. Award XP
        if (currentPlayer === 'player') {
             if (move.moveType === 'standard') setTotalXP(x => x + XP_RATES.ROUTINE);
             if (formedMill) setTotalXP(x => x + XP_RATES.FORM_MILL);
        }

        // 3. Handle Mill Capture or Turn End
        if (formedMill) {
            const opponent = currentPlayer === 'player' ? 'opponent' : 'player';
            // Valid targets: Opponent pieces NOT in a mill (unless all are in mills)
            const oppPieces = newBoard.map((c, i) => c === opponent ? i : -1).filter(i => i !== -1);
            const nonMillPieces = oppPieces.filter(idx => !checkMill(idx, opponent, newBoard));
            const canRemove = nonMillPieces.length > 0 || (oppPieces.length > 0 && oppPieces.every(idx => checkMill(idx, opponent, newBoard)));

            if (canRemove) {
                setRemoveMode(true);
                const msg = "Three in a row! Pick an opponent's cow to remove.";
                setMessage(msg);
                if (gameMode === 'pvp_remote') {
                    broadcastState({ 
                        board: newBoard, 
                        playerCowsHand: newPlayerCowsHand, 
                        opponentCowsHand: newOpponentCowsHand,
                        removeMode: true,
                        message: msg
                    });
                }
                return; // Wait for click
            } else {
                setMessage("Three in a row, but all opponent cows are safe.");
            }
        }
        
        if (gameMode === 'pvp_remote') {
            broadcastState({ 
                board: newBoard, 
                playerCowsHand: newPlayerCowsHand, 
                opponentCowsHand: newOpponentCowsHand,
                turn: turn === 'player' ? 'opponent' : 'player'
            });
        }

        switchTurn();
    };

    // --- INTERACTION HANDLER ---

    const handleSpotClick = (index: number) => {
        if (winner || showChallenge || isGenerating) return;
        if (gameMode === 'pve' && turn === 'opponent') return; // Wait for AI
        if (gameMode === 'pvp_remote' && turn !== myRole) return; // Not your turn

        // 1. BLOCKED SPOT CHECK
        if (blockedNodes.includes(index)) {
            setMessage("This spot is blocked this turn.");
            return;
        }

        // 2. REMOVE MODE
        if (removeMode) {
            const target = turn === 'player' ? 'opponent' : 'player';
            if (board[index] === target) {
                // Rule: Can't take from mill unless all are in mills
                const isMill = checkMill(index, target, board);
                const allOppPieces = board.map((c, i) => c === target ? i : -1).filter(i => i !== -1);
                const allInMills = allOppPieces.every(p => checkMill(p, target, board));

                if (!isMill || allInMills) {
                    const newBoard = [...board];
                    newBoard[index] = null;
                    setBoard(newBoard);
                    setRemoveMode(false);
                    feedback.triggerTug(); // Heavy feedback for capture
                    
                    if (turn === 'player') {
                        setPlayerCowsCaptured(c => c + 1);
                        setTotalXP(x => x + XP_RATES.ROUTINE); // XP for capture
                    } else {
                        setOpponentCowsCaptured(c => c + 1);
                    }

                    if (gameMode === 'pvp_remote') {
                        broadcastState({ 
                            board: newBoard, 
                            removeMode: false,
                            playerCowsCaptured: turn === 'player' ? playerCowsCaptured + 1 : playerCowsCaptured,
                            opponentCowsCaptured: turn === 'opponent' ? opponentCowsCaptured + 1 : opponentCowsCaptured
                        });
                    }

                    checkWinCondition(newBoard);
                } else {
                    setMessage("Cannot shoot a cow inside a mill!");
                }
            }
            return;
        }

        // 3. MOVE LOGIC
        const currentPlayer = turn;
        const currentHand = currentPlayer === 'player' ? playerCowsHand : opponentCowsHand;
        const currentBoardCount = currentPlayer === 'player' ? playerCowsBoard : opponentCowsBoard;
        const isFlying = currentBoardCount <= 3 && currentHand === 0;

        // Phase: Placing
        if (phase === 'placing' && currentHand > 0) {
            if (board[index] === null) {
                const moveType = analyzeMoveType(index, currentPlayer);
                const move: PendingMove = { targetIndex: index, moveType };
                
                if (currentPlayer === 'player') {
                    if (moveType !== 'standard') {
                        // Critical Move -> Trigger Question
                        setPendingMove(move);
                        generateChallenge(moveType);
                    } else {
                        executeMove(move);
                    }
                } else {
                    executeMove(move);
                }
            }
        } 
        // Phase: Moving / Flying
        else {
            if (board[index] === currentPlayer) {
                setSelectedPiece(index); // Select source
            } else if (board[index] === null && selectedPiece !== null) {
                // Validate Move
                const isValid = isFlying || ADJACENCY[selectedPiece].includes(index);
                
                if (isValid) {
                    const moveType = analyzeMoveType(index, currentPlayer, selectedPiece);
                    const move: PendingMove = { targetIndex: index, sourceIndex: selectedPiece, moveType };

                    if (currentPlayer === 'player') {
                        // Trigger question for Attack/Defense OR Flying into a Mill
                        if (moveType !== 'standard' || (isFlying && checkMill(index, currentPlayer, [...board]))) {
                            setPendingMove(move);
                            generateChallenge(moveType);
                        } else {
                            executeMove(move);
                        }
                    } else {
                        executeMove(move);
                    }
                } else {
                    setMessage("Invalid move. Must be adjacent.");
                }
            }
        }
    };

    const checkWinCondition = (currentBoard: BoardState) => {
        const oppPieces = currentBoard.filter(c => c === (turn === 'player' ? 'opponent' : 'player')).length;
        const oppHand = turn === 'player' ? opponentCowsHand : playerCowsHand;
        
        // Loss if < 3 pieces and no hand left
        if (oppHand === 0 && oppPieces < 3) {
            setWinner(turn);
            if (turn === 'player') setTotalXP(x => x + XP_RATES.WIN);
        } else {
            // Check for trapped (no moves)
            const opponent = turn === 'player' ? 'opponent' : 'player';
            // We need to pass the opponent directly because state might be stale
            // Simple check: iterate all opponent pieces, see if any adj is null. 
            // Note: If opponent is flying, they are never trapped unless board full.
            const isOppFlying = oppPieces <= 3 && oppHand === 0;
            let canMove = isOppFlying && currentBoard.includes(null);
            
            if (!canMove && !isOppFlying) {
                // Standard check
                for (let i = 0; i < 25; i++) {
                    if (currentBoard[i] === opponent) {
                        if (ADJACENCY[i].some(n => currentBoard[n] === null)) {
                            canMove = true;
                            break;
                        }
                    }
                }
            }

            if (!canMove && oppHand === 0) {
                setWinner(turn);
                if (turn === 'player') setTotalXP(x => x + XP_RATES.WIN);
            } else {
                switchTurn();
            }
        }
    };


    // --- AI ---
    useEffect(() => {
        if (gameMode === 'pve' && turn === 'opponent' && !winner && !removeMode) {
            const timer = setTimeout(() => makeAiMoveRef.current(), 1000);
            return () => clearTimeout(timer);
        }
    }, [turn, gameMode, winner, removeMode]);

    const makeAiMove = () => {
        // AI Logic:
        // 1. Can I form a mill? (Attack)
        // 2. Must I block a mill? (Defense)
        // 3. Random valid move.
        
        let bestMove: PendingMove | null = null;
        
        // Helper to simulate
        const simulate = (idx: number, from?: number): number => {
            const testBoard = [...board];
            if (from !== undefined) testBoard[from] = null;
            testBoard[idx] = 'opponent';
            if (checkMill(idx, 'opponent', testBoard)) return 100; // Attack
            
            // Defense check
            const defenseBoard = [...board];
            if (from !== undefined) defenseBoard[from] = null;
            defenseBoard[idx] = 'player';
            if (checkMill(idx, 'player', defenseBoard)) return 50; // Block
            
            return 1; // Standard
        };

        if (phase === 'placing' && opponentCowsHand > 0) {
            const empty = board.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
            let bestScore = -1;
            
            empty.forEach(i => {
                const score = simulate(i);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { targetIndex: i, moveType: 'standard' }; // Type doesn't matter for AI
                }
            });
        } else {
            const myPieces = board.map((c, i) => c === 'opponent' ? i : -1).filter(i => i !== -1);
            const isFlying = opponentCowsBoard <= 3;
            let bestScore = -1;

            myPieces.forEach(from => {
                const targets = isFlying 
                    ? board.map((c, i) => c === null ? i : -1).filter(i => i !== -1)
                    : ADJACENCY[from].filter(to => board[to] === null);
                
                targets.forEach(to => {
                    const score = simulate(to, from);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { targetIndex: to, sourceIndex: from, moveType: 'standard' };
                    }
                });
            });
        }

        if (bestMove) {
            executeMove(bestMove);
        } else {
            // No moves? Player wins
            setWinner('player');
        }
    };

    const makeAiMoveRef = React.useRef(makeAiMove);
    const checkWinConditionRef = React.useRef(checkWinCondition);

    React.useEffect(() => {
        makeAiMoveRef.current = makeAiMove;
        checkWinConditionRef.current = checkWinCondition;
    });
    
    // AI Removal (Separate Effect)
    useEffect(() => {
        if (gameMode === 'pve' && turn === 'opponent' && removeMode) {
             const timer = setTimeout(() => {
                 const playerPieces = board.map((c, i) => c === 'player' ? i : -1).filter(i => i !== -1);
                 const validTargets = playerPieces.filter(i => !checkMill(i, 'player', board));
                 // If all in mills, can take any
                 const targets = validTargets.length > 0 ? validTargets : playerPieces;
                 
                 if (targets.length > 0) {
                     const pick = targets[Math.floor(Math.random() * targets.length)];
                     const newBoard = [...board];
                     newBoard[pick] = null;
                     setBoard(newBoard);
                     setRemoveMode(false);
                     setPlayerCowsCaptured(c => c + 1);
                     checkWinConditionRef.current(newBoard);
                 }
             }, 1000);
             return () => clearTimeout(timer);
        }
    }, [removeMode, turn, gameMode, board]);


    // --- EDUCATIONAL COMPONENT ---
    
    const generateChallenge = async (moveType: MoveType) => {
        setIsGenerating(true);
        setShowFeedback(false);
        setUserSelectedIndex(null);
        
        try {
            const formattedGrade = selectedGrade.startsWith('Grade') ? selectedGrade : `Grade ${selectedGrade}`;
            
            // Align directly with the active topic prop
            const subName = activeTopic?.subject || "Logic";
            const topicTitle = activeTopic?.title || "General";
            const topicDesc = activeTopic?.description || "";
            const objectives = activeTopic?.learningObjectives?.join(", ") || "";
            const standards = activeTopic?.curriculumStandards?.join(", ") || "";
            
            const prompt = `
                Generate 1 multiple-choice question for ${formattedGrade} in ${subName}.
                
                TOPIC INFORMATION:
                - Title: ${topicTitle}
                - Description: ${topicDesc}
                - Learning Objectives: ${objectives}
                - Curriculum Standards: ${standards}

                CONTEXT: The student is playing Morabaraba in Lesotho.
                CRITICAL CURRICULUM REQUIREMENT: 
                You are designing questions that systematically cover the learning objectives and curriculum standards above.
                Do NOT just ask the same basic question or focus on a single definition. Vary the sub-topics, cognitive depth (recall, application, problem-solving), and context of the question.
                
                PREVIOUS QUESTIONS (NEVER REPEAT - CHOOSE A NEW FORM/SUB-CONCEPT):
                ${askedQuestions.length > 0 ? askedQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n') : "None yet."}
                
                Move Context: The student is making a ${moveType} move in Morabaraba.
                Difficulty: ${moveType === 'attack' ? 'Hard' : moveType === 'defense' ? 'Medium' : 'Easy'}.
                
                Return JSON containing a unique curriculum question.
            `;
            
            const response = await aiClient.generate({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'OBJECT',
                        properties: {
                            question: { type: 'STRING', description: 'A unique multiple choice question to ask. MUST be under 25 words.' },
                            options: { 
                                type: 'ARRAY', 
                                items: { type: 'STRING' },
                                description: 'Four distinct options representing answers. One must be correct.'
                            },
                            correctIndex: { type: 'INTEGER', description: 'The zero-based index of the correct option (0, 1, 2, or 3).' },
                            explanation: { type: 'STRING', description: 'A short explanation or learning tip explaining why the correct answer is correct.' }
                        },
                        required: ['question', 'options', 'correctIndex', 'explanation']
                    }
                }
            });
            
            const data = safeJsonParse<Challenge>(response.text);
            if (!data || !data.question || !data.options || data.options.length < 2) {
                throw new Error("Invalid or empty response structure from AI model.");
            }

            setChallenge({ ...data, context: `${moveType.toUpperCase()} Opportunity`, topicTitle: subName });
            setShowChallenge(true);
            setAskedQuestions(prev => {
                const next = [...prev, data.question];
                try {
                    const saveGrade = selectedGrade.startsWith('Grade') ? selectedGrade : `Grade ${selectedGrade}`;
                    const key = `morabaraba_asked_${saveGrade}_${activeTopic?.id || 'default'}`;
                    localStorage.setItem(key, JSON.stringify(next));
                } catch (err) {
                    console.error("Failed to save asked question state:", err);
                }
                return next;
            });
        } catch (e) {
            console.error("Failed to generate robust question, using fallback:", e);
            // Fallback
             setChallenge({
                question: `A quick drill on ${activeTopic?.title || 'Logic'}: Which is the best description of its purpose?`,
                options: [
                    "To understand local concepts and solve problems",
                    "To skip learning altogether",
                    "To randomize answers",
                    "To finish the game faster"
                ],
                correctIndex: 0,
                explanation: `This topic helps us learn ${activeTopic?.title || 'important curriculum skills'}!`,
                context: "Strategy Check",
                topicTitle: activeTopic?.subject || "Logic"
            });
            setShowChallenge(true);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAnswer = (index: number) => {
        if (!challenge) return;
        setUserSelectedIndex(index);
        
        if (index === challenge.correctIndex) {
            // Correct!
            // Calculate XP Bonus
            let bonus = XP_RATES.CORRECT_MED;
            if (pendingMove?.moveType === 'attack') bonus = XP_RATES.CORRECT_HARD;
            setTotalXP(x => x + bonus);

            // Execute the blocked move
            if (pendingMove) {
                executeMove(pendingMove);
            }
            setShowChallenge(false);
            setPendingMove(null);
        } else {
            // Incorrect -> Show Feedback ("Teachable Moment") & Track Struggle
            const concept: MissedConcept = {
                topic: challenge.topicTitle || "General",
                advice: challenge.explanation
            };
            setMissedConcepts(prev => [...prev, concept]);
            setShowFeedback(true);
        }
    };

    const handleFeedbackDismiss = () => {
        setTotalXP(x => x + XP_RATES.LEARNED); // Consolation point
        
        // STRATEGIC BLOCK LOGIC
        if (pendingMove) {
            // Apply Block
            setBlockedNodes(prev => [...prev, pendingMove.targetIndex]);
            setMessage("Move Blocked! Try a different strategy.");
            
            // Cancel pending move, stay on player turn
            setPendingMove(null);
            setSelectedPiece(null);
        }

        setShowChallenge(false);
        setShowFeedback(false);
        setChallenge(null);
    };

    const nextTopicIndex = availableTopics.findIndex(t => t.id === (activeTopic || topic)?.id) + 1;
    const hasNextTopic = nextTopicIndex > 0 && nextTopicIndex < availableTopics.length;
    const nextTopic = hasNextTopic ? availableTopics[nextTopicIndex] : null;

    const handleNextTopic = async () => {
        if (!hasNextTopic || !nextTopic) return;
        
        try {
            if (learningEngine?.processGameResult) {
                await learningEngine.processGameResult((activeTopic || topic).id, totalXP, (activeTopic || topic).title);
            }
        } catch (e) {
            console.error("Failed to auto-save round score:", e);
        }

        // Advance to next chronological topic
        setActiveTopic(nextTopic);
        
        // Reset game board and state for a fresh contiguous run
        setBoard(Array(25).fill(null));
        setTurn('player');
        setPhase('placing');
        setPlayerCowsHand(12);
        setOpponentCowsHand(12);
        setPlayerCowsCaptured(0);
        setOpponentCowsCaptured(0);
        setSelectedPiece(null);
        setRemoveMode(false);
        setBlockedNodes([]);
        setWinner(null);
        setPendingMove(null);
        setChallenge(null);
        setShowChallenge(false);
        setShowFeedback(false);
        setMissedConcepts([]);
        setUserSelectedIndex(null);
        setTotalXP(0);
        setMessage(`New Round Started! Topic: ${nextTopic.title}`);
    };

    // --- RENDER ---

    if (showSetupModal) {
        return (
            <div className="absolute inset-0 z-50 bg-slate-900/95 overflow-y-auto flex flex-col items-center justify-start py-4 px-3 md:py-8 md:px-6 backdrop-blur-md">
                <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 my-auto flex flex-col gap-3 shrink-0">
                    <h2 className="text-lg md:text-xl font-black text-center text-slate-900 dark:text-white mb-0.5">Get Ready!</h2>
                    
                    {(activeTopic || topic) && (
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
                                        {(activeTopic || topic).subject}
                                    </span>
                                </div>
                                <h3 className="text-[10px] md:text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug truncate">{(activeTopic || topic).title}</h3>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-1">{(activeTopic || topic).description}</p>
                                {askedQuestions.length > 0 && (
                                    <p className="text-[8px] text-green-600 dark:text-green-400 font-bold flex items-center gap-1 mt-0.5 bg-green-500/5 px-1 py-0.5 rounded border border-green-500/10 w-fit">
                                        <span className="inline-block size-1 bg-green-500 rounded-full animate-ping"></span>
                                        {askedQuestions.length} unique {askedQuestions.length === 1 ? 'question' : 'questions'} mastered previously
                                    </p>
                                )}
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
                                        const isActive = (activeTopic || topic)?.id === t.id;
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
                                {['pve', 'pvp', 'pvp_remote'].map((mode) => {
                                    const isActive = gameMode === mode;
                                    let label = 'AI';
                                    let icon = <Cpu size={12} />;
                                    if (mode === 'pvp') {
                                        label = 'Local';
                                        icon = <Users size={12} />;
                                    } else if (mode === 'pvp_remote') {
                                        label = 'Remote';
                                        icon = <Globe size={12} />;
                                    }
                                    return (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => {
                                                setGameMode(mode as GameMode);
                                                setIsJoining(false);
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

                        {gameMode === 'pvp_remote' && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2"
                            >
                                {isJoining ? (
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Enter Friend's Code</p>
                                        <input 
                                            type="text" 
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                            placeholder="XXXX"
                                            maxLength={4}
                                            className="w-full text-center text-xl font-black py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-705 focus:border-blue-500 outline-none uppercase"
                                        />
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setIsJoining(false)} className="flex-1 py-1 px-2 text-[10px] font-bold text-slate-400">Cancel</button>
                                            <button 
                                                type="button"
                                                disabled={joinCode.length < 4}
                                                onClick={() => startGame(subjectFocus || 'math', 'pvp_remote', joinCode)}
                                                className="flex-[2] py-2 bg-blue-600 text-white rounded-lg font-bold text-[10px] disabled:opacity-50"
                                            >
                                                Join Game
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <button 
                                            type="button"
                                            onClick={() => startGame(subjectFocus || 'math', 'pvp_remote')}
                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5"
                                        >
                                            Host New Room
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                                            <span className="text-[8px] font-black text-slate-300 dark:text-slate-600">OR</span>
                                            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setIsJoining(true)}
                                            className="w-full py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg font-black uppercase tracking-wider text-[10px] border border-slate-200 dark:border-slate-800"
                                        >
                                            Enter Join Code
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {gameMode !== 'pvp_remote' && (
                        <button 
                            type="button"
                            onClick={() => startGame(subjectFocus || 'math', gameMode)}
                            className="w-full py-3 bg-[#2b8cee] hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/10 transition-all text-xs uppercase tracking-wider active:scale-95"
                        >
                            Start Playing
                        </button>
                    )}
                    <button type="button" onClick={onBack} className="w-full py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="font-display bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white antialiased overflow-hidden min-h-screen flex flex-col relative select-none">
            
            {/* Turn Transition Overlay (PvP Focus) */}
            <AnimatePresence>
                {showTurnTransition && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 shadow-2xl border border-slate-700/50 max-w-sm w-full"
                        >
                            <div className={`size-24 rounded-full mx-auto mb-8 flex items-center justify-center text-white shadow-2xl animate-pulse ${turn === 'player' ? 'bg-[#2b8cee] shadow-blue-500/50' : 'bg-[#ff8c42] shadow-orange-500/50'}`}>
                                {turn === 'player' ? <User size={48} /> : <Users size={48} />}
                            </div>
                            
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">
                                {turn === 'player' ? "Player 1's Turn" : "Player 2's Turn"}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-bold mb-10 leading-relaxed">
                                {turn === 'player' ? "Hand the phone to Player 1." : "Hand the phone to Player 2."}
                            </p>
                            
                            <button 
                                onClick={() => setShowTurnTransition(false)}
                                className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 uppercase tracking-widest ${turn === 'player' ? 'bg-[#2b8cee] shadow-blue-500/20' : 'bg-[#ff8c42] shadow-orange-500/20'}`}
                            >
                                I'm Ready
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="z-20 px-4 pt-4 pb-2 shrink-0">
                <div className="flex items-center justify-between bg-white/95 dark:bg-[#101922]/95 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ArrowLeft size={20} className="text-slate-500" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-full flex items-center justify-center text-white shadow-lg ${turn === 'player' ? 'bg-[#2b8cee]' : 'bg-[#ff8c42]'}`}>
                            {turn === 'player' ? <User size={20} /> : (gameMode === 'pve' ? <Cpu size={20} /> : <Users size={20} />)}
                        </div>
                        <div className="text-left">
                             <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {gameMode === 'pvp_remote' ? `ROOM ${roomId}` : (phase === 'placing' ? 'Phase 1: Deploy' : phase === 'moving' ? 'Phase 2: Battle' : 'Phase 3: Flying')}
                                </p>
                                {gameMode === 'pvp_remote' && (
                                     <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest ${playerCount > 1 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600 animate-pulse'}`}>
                                         {playerCount > 1 ? 'Live' : 'Waiting...'}
                                     </span>
                                )}
                                <span className="text-[10px] font-bold text-green-500 bg-green-50 px-1.5 rounded">+{totalXP} XP</span>
                             </div>
                             <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                                 {winner ? (winner === 'player' ? 'Victory!' : 'Defeat') : (gameMode === 'pvp_remote' && turn !== myRole ? "Opponent's Turn..." : message)}
                             </h2>
                        </div>
                    </div>
                    <div className="w-8"></div>
                </div>
            </div>

            {/* Board */}
            <div className="flex-1 relative flex items-center justify-center p-4">
                <div className="aspect-square w-full max-w-[400px] relative bg-[#fdf8e1] rounded-xl shadow-2xl border-8 border-[#2b2b2b] p-6">
                    {/* SVG Grid (Standardized for perfect alignment) */}
                    <div className="absolute inset-8">
                        <svg className="absolute inset-0 w-full h-full text-slate-800 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                            {/* Outer Square */}
                            <rect x="0" y="0" width="100" height="100" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            {/* Middle Square */}
                            <rect x="16.66" y="16.66" width="66.68" height="66.68" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            {/* Inner Square */}
                            <rect x="33.33" y="33.33" width="33.34" height="33.34" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            
                            {/* Cross Lines */}
                            <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="1.5" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="1.5" />
                        </svg>

                        {/* Valid Moves Highlight */}
                        {phase !== 'placing' && selectedPiece !== null && !removeMode && (
                             COORDS.map((pos, i) => {
                                 const isFlying = board.filter(c => c === 'player').length <= 3;
                                 const isAdjacent = ADJACENCY[selectedPiece].includes(i);
                                 const isValid = board[i] === null && (isFlying || isAdjacent);
                                 
                                 if (isValid) {
                                     return (
                                        <div 
                                            key={`hint-${i}`}
                                            className="absolute size-6 bg-green-400/30 rounded-full animate-pulse pointer-events-none -translate-x-1/2 -translate-y-1/2 border-2 border-green-400/50"
                                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                                        />
                                     );
                                 }
                                 return null;
                             })
                        )}

                        {/* Pieces & Spots */}
                        {COORDS.map((pos, i) => {
                            const isBlocked = blockedNodes.includes(i);
                            const currentPiece = board[i];
                            return (
                                <motion.button
                                    key={i}
                                    layout
                                    initial={false}
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleSpotClick(i)}
                                    disabled={isGenerating || winner !== null}
                                    className={`absolute rounded-full transition-[box-shadow,background-color,border-color] duration-150 z-10 flex items-center justify-center
                                        ${currentPiece === 'player' 
                                            ? 'size-10 shadow-xl' 
                                            : currentPiece === 'opponent' 
                                                ? 'size-10 shadow-xl' 
                                                : 'size-5 bg-slate-900 border-2 border-[#fdf8e1] hover:bg-slate-700 shadow-sm z-0'
                                        }
                                        ${selectedPiece === i ? 'ring-4 ring-blue-500/50 scale-110 z-20' : ''}
                                        ${removeMode && currentPiece === (turn === 'player' ? 'opponent' : 'player') ? 'ring-4 ring-red-500 cursor-crosshair z-20 shadow-red-500/50' : ''}
                                        ${isBlocked ? 'cursor-not-allowed opacity-50 ring-2 ring-gray-400 grayscale' : ''}
                                    `}
                                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, x: "-50%", y: "-50%" }}
                                >
                                    {isBlocked && <Lock size={12} className="text-gray-300" />}
                                    {currentPiece && (
                                        <div className="size-full flex items-center justify-center rounded-full">
                                            <CowIcon owner={currentPiece} />
                                        </div>
                                    )}
                                    {phase === 'flying' && currentPiece === 'player' && playerCowsBoard <= 3 && <Plane size={14} className="absolute -top-2 -right-2 text-blue-500"/>}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer Stats */}
            <div className="z-20 pb-8 px-6">
                <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Cows</span>
                        <div className="flex items-center gap-1.5">
                            <div className="bg-[#2b8cee] size-3 rounded-full"></div>
                            <span className="text-xl font-black text-slate-900 dark:text-white">{phase === 'placing' ? playerCowsHand : playerCowsBoard}</span>
                        </div>
                        {playerCowsBoard <= 3 && phase !== 'placing' && (
                            <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 rounded-full animate-pulse">FLYING</span>
                        )}
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>

                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Opponent</span>
                        <div className="flex items-center gap-1.5">
                            <div className="bg-[#ff8c42] size-3 rounded-full"></div>
                            <span className="text-xl font-black text-slate-900 dark:text-white">{phase === 'placing' ? opponentCowsHand : opponentCowsBoard}</span>
                        </div>
                         {opponentCowsBoard <= 3 && phase !== 'placing' && (
                            <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-2 rounded-full">FLYING</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Challenge / Feedback Modal */}
            {showChallenge && challenge && (
                <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-4 md:p-5 shadow-2xl border-t-4 border-[#2b8cee]">
                         
                         {/* Question View */}
                         {!showFeedback && (
                             <>
                                 <div className="flex items-center gap-2.5 mb-3">
                                     <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full text-[#2b8cee]">
                                        {pendingMove?.moveType === 'attack' ? <Target size={20}/> : <ShieldAlert size={20}/>}
                                     </div>
                                     <div>
                                         <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                             {pendingMove?.moveType === 'attack' ? 'Nice Move!' : 'Great Block!'}
                                         </h2>
                                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{challenge.context}</p>
                                     </div>
                                 </div>

                                 {/* Curriculum Alignment Tags */}
                                 <div className="flex flex-wrap gap-1 mb-3 h-fit">
                                     <span className="text-[8px] md:text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                         Grade {selectedGrade}
                                     </span>
                                     <span className="text-[8px] md:text-[9px] font-extrabold bg-[#2b8cee]/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                         {activeTopic?.subject || topic?.subject || "Logic"}
                                     </span>
                                     {(activeTopic?.title || topic?.title) && (
                                         <span className="text-[8px] md:text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider max-w-[130px] truncate" title={activeTopic?.title || topic?.title}>
                                             {activeTopic?.title || topic?.title}
                                         </span>
                                     )}
                                 </div>
                                 
                                 <div className="bg-slate-50 dark:bg-slate-800 p-3 md:p-4 rounded-xl mb-4">
                                    <p className="text-slate-900 dark:text-white font-medium text-sm md:text-base leading-snug text-center">
                                        {challenge.question}
                                    </p>
                                 </div>

                                 <div className="space-y-2">
                                     {challenge.options.map((opt, i) => (
                                         <button
                                             key={i}
                                             onClick={() => handleAnswer(i)}
                                             className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-[#2b8cee] dark:hover:border-[#2b8cee] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300"
                                         >
                                             <span className="mr-2 text-slate-400 font-mono">{['A','B','C','D'][i]}.</span>
                                             {opt}
                                         </button>
                                     ))}
                                 </div>
                             </>
                         )}

                         {/* Feedback View (Teachable Moment) */}
                         {showFeedback && (
                             <div className="animate-in slide-in-from-right-4">
                                 <div className="flex items-center gap-2.5 mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                                     <div className="p-1.5 bg-white dark:bg-slate-800 rounded-full text-red-500 shadow-sm shrink-0">
                                        <X size={20}/>
                                     </div>
                                     <div>
                                         <h2 className="text-sm md:text-base font-black text-red-600 dark:text-red-400 leading-none">Not quite!</h2>
                                         <p className="text-[9px] font-bold text-red-400 dark:text-red-300 uppercase tracking-wider mt-1">Move Blocked</p>
                                     </div>
                                 </div>

                                 <div className="space-y-3 mb-4 max-h-[160px] overflow-y-auto pr-1">
                                     <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Correct Answer</p>
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 p-2.5 rounded-lg flex items-start gap-2">
                                            <Check size={14} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                            <p className="text-xs font-bold text-green-800 dark:text-green-300">{challenge.options[challenge.correctIndex]}</p>
                                        </div>
                                     </div>

                                     {challenge.explanation && (
                                         <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Learning Tip</p>
                                            <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                                {challenge.explanation}
                                            </div>
                                         </div>
                                     )}
                                 </div>

                                 <button 
                                     onClick={handleFeedbackDismiss}
                                     className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs md:text-sm shadow-md active:scale-95 transition-all"
                                 >
                                     Continue
                                 </button>
                             </div>
                         )}
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {isGenerating && (
                <div className="absolute inset-0 z-50 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader2 size={40} className="text-[#2b8cee] animate-spin mb-4" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Searching for a question...</p>
                </div>
            )}

            {/* Battle Rules Overlay */}
            {showRules && !winner && (
                <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-white animate-in fade-in zoom-in-95">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
                        <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-black text-center uppercase tracking-tighter mb-6">How to Play</h2>
                        
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="size-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">1</div>
                                <p className="text-sm text-slate-300 font-medium leading-relaxed">
                                    <span className="text-white font-bold">Place Cows:</span> Take turns placing all 12 cows on the board junctions.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="size-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">2</div>
                                <p className="text-sm text-slate-300 font-medium leading-relaxed">
                                    <span className="text-white font-bold">Three in a Row:</span> Align 3 cows to form a "Mill" and remove one of the opponent's cows.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="size-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">3</div>
                                <p className="text-sm text-slate-300 font-medium leading-relaxed">
                                    <span className="text-white font-bold">Question Time!</span> Making a good move triggers a <span className="text-indigo-400">Knowledge Question</span>. Answer correctly to secure your move!
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

            {/* Battle Report (Winner Overlay) */}
            {winner && (
                <div className="absolute inset-0 z-50 bg-white dark:bg-[#101922] flex flex-col p-6 overflow-y-auto animate-in zoom-in-95">
                    <div className="flex flex-col items-center text-center mb-8 pt-8">
                        <Trophy size={80} className={`mb-6 ${winner === 'player' ? 'text-yellow-400' : 'text-gray-400'}`} />
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase italic tracking-tighter">
                            {winner === 'player' ? 'Victory!' : 'Defeated'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                            Final Score: <span className="text-green-500">{totalXP} XP</span>
                        </p>
                    </div>

                    <div className="flex-1 max-w-sm mx-auto w-full">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                             <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                                 <Brain size={18} className="text-[#2b8cee]" />
                                 <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">Teacher's Advice</h3>
                             </div>
                             <div className="p-4 space-y-4">
                                 {missedConcepts.length > 0 ? (
                                     missedConcepts.map((item, idx) => (
                                         <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                             <div className="flex items-start gap-2 mb-1">
                                                 <Target size={14} className="text-red-500 mt-0.5" />
                                                 <span className="text-xs font-bold text-slate-900 dark:text-white">{item.topic}</span>
                                             </div>
                                             <p className="text-xs text-slate-600 dark:text-slate-400 pl-6 leading-relaxed">
                                                 {item.advice}
                                             </p>
                                         </div>
                                     ))
                                 ) : (
                                     <div className="text-center py-6">
                                         <CheckCircle size={40} className="text-green-500 mx-auto mb-2 opacity-50" />
                                         <p className="text-sm font-bold text-slate-900 dark:text-white">Perfect Playing!</p>
                                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You demonstrated perfect understanding of the concepts.</p>
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto mt-8 pb-4">
                        {hasNextTopic && (
                            <button 
                                onClick={handleNextTopic} 
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider scale-102 hover:scale-105 active:scale-95 duration-150"
                            >
                                <Brain size={16} className="animate-pulse" />
                                Keep Learning: Next Topic
                            </button>
                        )}
                        <div className="flex gap-3 w-full">
                            <button onClick={onBack} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm">Exit Arena</button>
                            <button onClick={() => onComplete(totalXP)} className="flex-1 bg-[#2b8cee] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-colors text-sm">
                                Finish & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Morabaraba;
