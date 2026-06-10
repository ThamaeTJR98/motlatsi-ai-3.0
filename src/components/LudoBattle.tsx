import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Gamepad2, 
  Trophy, 
  Zap, 
  Coins, 
  ChevronLeft, 
  ChevronRight,
  Play, 
  BrainCircuit,
  Sword,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Volume2,
  Mic,
  AlertCircle,
  User,
  Info,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Topic, AppView } from '../types';
import { aiClient } from '../utils/aiClient';
import { safeJsonParse } from '../utils/aiHelpers';

interface LudoBattleProps {
  user: UserState;
  topic: Topic;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

type PlayerColor = 'green' | 'yellow' | 'red' | 'blue';

interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  tokens: number[]; // Position index on the path (-1 is home, 57 is finish)
  isBot: boolean;
  score: number;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function LudoBattle({ user, topic, onBack, onNavigate }: LudoBattleProps) {
  const [gameState, setGameState] = useState<'playing' | 'victory'>('playing');
  const [players, setPlayers] = useState<Player[]>(() => [
    { id: user.id, name: user.name, color: 'green', tokens: [-1, -1, -1, -1], isBot: false, score: 0 },
    { id: 'bot1', name: 'Clever Jackal', color: 'yellow', tokens: [-1, -1, -1, -1], isBot: true, score: 0 },
    { id: 'bot2', name: 'Mountain Eagle', color: 'red', tokens: [-1, -1, -1, -1], isBot: true, score: 0 },
    { id: 'bot3', name: 'Swift Leopard', color: 'blue', tokens: [-1, -1, -1, -1], isBot: true, score: 0 },
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [battleLog, setBattleLog] = useState<string[]>(["Welcome to the Maloti Race!", "The race has begun! Green starts first."]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);

  const boardSize = 15;
  const cells = Array.from({ length: boardSize * boardSize });

  const addLog = (msg: string) => {
    setBattleLog(prev => [msg, ...prev].slice(0, 5));
  };

  const fetchQuestion = async (difficulty: 'easy' | 'medium' | 'hard' = 'easy') => {
    try {
      const prompt = `Generate a multiple choice question for the topic "${topic.title}" at a ${difficulty} difficulty level. 
      Format as JSON: { "text": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..." }`;
      
      const response = await aiClient.generate({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const data = safeJsonParse<any>(response.text, {});
      return {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
        difficulty
      } as Question;
    } catch (error) {
      console.error("Failed to fetch question", error);
      return null;
    }
  };

  const handleRollDice = async () => {
    if (isRolling || showQuestion || diceValue !== null) return;
    
    setIsLoading(true);
    const question = await fetchQuestion('easy');
    setIsLoading(false);
    
    if (question) {
      setCurrentQuestion(question);
      setShowQuestion(true);
    }
  };

  const nextTurn = useCallback(() => {
    setDiceValue(null);
    setCurrentPlayerIndex(prev => (prev + 1) % players.length);
  }, [players.length]);

  const moveToken = useCallback((tokenIndex: number, roll: number) => {
    setPlayers(prev => {
      const newPlayers = [...prev];
      const player = { ...newPlayers[currentPlayerIndex] };
      const tokens = [...player.tokens];
      
      if (tokens[tokenIndex] === -1) {
        tokens[tokenIndex] = 0;
      } else {
        tokens[tokenIndex] += roll;
      }
      
      player.tokens = tokens;
      newPlayers[currentPlayerIndex] = player;

      if (tokens[tokenIndex] === 57) {
        player.score += 500;
        addLog(`${player.name} reached the finish line!`);
      }

      return newPlayers;
    });

    setDiceValue(null);
    setTimeout(() => nextTurn(), 1000);
  }, [currentPlayerIndex, nextTurn]);

  const handleBotMove = useCallback((roll: number) => {
    const player = players[currentPlayerIndex];
    const movableTokens = player.tokens.map((pos, idx) => ({ pos, idx }))
      .filter(t => (t.pos === -1 && roll === 6) || (t.pos >= 0 && t.pos + roll <= 57));
    
    if (movableTokens.length > 0) {
      const randomIndex = Math.floor(Math.random() * movableTokens.length);
      const token = movableTokens[randomIndex];
      moveToken(token.idx, roll);
    } else {
      addLog(`${player.name} has no movable tokens.`);
      setTimeout(() => nextTurn(), 1000);
    }
  }, [players, currentPlayerIndex, moveToken, nextTurn]);

  const onAnswerQuestion = (index: number) => {
    if (!currentQuestion) return;

    const isCorrect = index === currentQuestion.correctIndex;
    setShowQuestion(false);

    if (isCorrect) {
      setIsRolling(true);
      setTimeout(() => {
        const roll = Math.floor(Math.random() * 6) + 1;
        setDiceValue(roll);
        setIsRolling(true);
        setTimeout(() => {
          setIsRolling(false);
          addLog(`${players[currentPlayerIndex].name} rolled a ${roll}!`);
          // Auto-move if only one token can move or if bot
          if (players[currentPlayerIndex].isBot) {
            handleBotMove(roll);
          }
        }, 1000);
      }, 500);
    } else {
      addLog(`${players[currentPlayerIndex].name} missed the question. Turn skipped.`);
      setTimeout(() => nextTurn(), 1500);
    }
  };

  const getCellCoords = (index: number) => {
    const x = index % boardSize;
    const y = Math.floor(index / boardSize);
    return { x, y };
  };

  const renderCell = (index: number) => {
    const { x, y } = getCellCoords(index);
    let cellClass = "border border-gray-100 ";
    
    // Home Areas
    if (x < 6 && y < 6) cellClass += "bg-green-50 ";
    else if (x > 8 && y < 6) cellClass += "bg-yellow-50 ";
    else if (x < 6 && y > 8) cellClass += "bg-red-50 ";
    else if (x > 8 && y > 8) cellClass += "bg-blue-50 ";
    // Center Area
    else if (x >= 6 && x <= 8 && y >= 6 && y <= 8) cellClass += "bg-gradient-to-br from-blue-500 to-blue-700 ";
    else cellClass += "bg-white ";

    // Path Highlighting
    const isPath = (x === 6 || x === 7 || x === 8 || y === 6 || y === 7 || y === 8) && !(x >= 6 && x <= 8 && y >= 6 && y <= 8);
    if (isPath) cellClass += "shadow-inner ";

    return (
      <div key={index} className={`w-full h-full aspect-square ${cellClass} flex items-center justify-center relative`}>
        {x === 7 && y === 7 && <Trophy size={14} className="text-white drop-shadow-sm" />}
        
        {/* Render Tokens */}
        <div className="absolute inset-0 flex flex-wrap items-center justify-center p-0.5 gap-0.5">
          {players.map((p, pi) => 
            p.tokens.map((pos, ti) => {
              // This is a simplified mapping for the demo
              // In a real Ludo, we'd map pos to specific x,y
              const isAtHome = pos === -1;
              const homeX = pi === 0 ? 1 : pi === 1 ? 12 : pi === 2 ? 1 : 12;
              const homeY = pi === 0 ? 1 : pi === 1 ? 1 : pi === 2 ? 12 : 12;
              
              const shouldShow = isAtHome ? (x === homeX + (ti % 2) && y === homeY + Math.floor(ti / 2)) : false;
              
              if (shouldShow) {
                return (
                  <motion.div 
                    key={`${pi}-${ti}`}
                    layoutId={`${pi}-${ti}`}
                    className={`w-3 h-3 rounded-full bg-${p.color}-500 border border-white shadow-sm flex items-center justify-center`}
                  >
                    <div className="w-1 h-1 bg-white/50 rounded-full" />
                  </motion.div>
                );
              }
              return null;
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* Compact Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-1.5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Ludo Battle</h1>
            <p className="text-[11px] font-bold truncate max-w-[120px] leading-tight">{topic.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100">
            <Coins size={12} className="text-yellow-600" />
            <span className="text-[10px] font-black text-yellow-700">1,250</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-2 flex flex-col sm:flex-row gap-3 overflow-hidden">
        {/* Game Board Container */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="relative aspect-square w-full max-w-[340px] bg-white rounded-2xl border-4 border-gray-200 shadow-sm overflow-hidden grid grid-cols-15 grid-rows-15">
            {cells.map((_, i) => renderCell(i))}
            
            {/* Overlay for Dice/Questions */}
            <AnimatePresence>
              {showQuestion && currentQuestion && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <div className="w-full max-w-xs space-y-3">
                    <div className="flex items-center gap-1.5 text-blue-600">
                      <BrainCircuit size={16} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Brain Roll</span>
                    </div>
                    
                    <h3 className="text-xs font-bold leading-tight text-slate-900">
                      {currentQuestion.text}
                    </h3>
                    
                    <div className="grid gap-1.5">
                      {currentQuestion.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => onAnswerQuestion(idx)}
                          className="w-full p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-left text-[10px] font-bold transition-all active:scale-95 flex items-center justify-between group"
                        >
                          <span className="text-slate-700">{option}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dice Roll Animation */}
            <AnimatePresence>
              {isRolling && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
                >
                  <motion.div 
                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                    className="w-14 h-14 bg-blue-600 rounded-2xl shadow-lg flex items-center justify-center border-4 border-blue-400"
                  >
                    <Gamepad2 size={28} className="text-white" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dice Value Display */}
            <AnimatePresence>
              {diceValue !== null && !isRolling && !showQuestion && (
                <motion.div 
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-16 h-16 bg-white text-blue-600 rounded-2xl shadow-xl flex items-center justify-center text-3xl font-black border-4 border-blue-500">
                    {diceValue}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar: Players & Log */}
        <div className="w-full sm:w-60 flex flex-col gap-2 shrink-0">
          {/* Players List */}
          <div className="bg-white border border-gray-200 rounded-xl p-2.5 shadow-sm">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Warriors</h3>
            <div className="space-y-1">
              {players.map((p, i) => (
                <div 
                  key={p.id} 
                  className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                    currentPlayerIndex === i 
                    ? `bg-${p.color}-50 border-${p.color}-200` 
                    : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md bg-${p.color}-500 flex items-center justify-center shadow-sm`}>
                      <User size={10} className="text-white" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-900 truncate max-w-[80px]">{p.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-slate-400">{p.score}</span>
                    {currentPlayerIndex === i && (
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className={`w-1.5 h-1.5 rounded-full bg-${p.color}-500`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Battle Log */}
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-2.5 flex flex-col shadow-sm min-h-0">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Battle Log</h3>
            <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
              {battleLog.map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className="text-[9px] font-medium text-gray-500 border-l-2 border-gray-100 pl-2 py-0.5"
                >
                  {log}
                </motion.div>
              ))}
            </div>
            
            {/* Action Button */}
            <div className="pt-2 mt-auto">
              <button
                disabled={players[currentPlayerIndex]?.isBot || isRolling || showQuestion || isLoading || diceValue !== null}
                onClick={handleRollDice}
                className={`w-full py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm ${
                  players[currentPlayerIndex]?.isBot || diceValue !== null
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoading ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <BrainCircuit size={12} />
                    Brain Roll
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .grid-cols-15 { grid-template-columns: repeat(15, minmax(0, 1fr)); }
        .grid-rows-15 { grid-template-rows: repeat(15, minmax(0, 1fr)); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        .bg-green-500 { background-color: #22c55e; }
        .bg-yellow-500 { background-color: #eab308; }
        .bg-red-500 { background-color: #ef4444; }
        .bg-blue-500 { background-color: #3b82f6; }
        
        .bg-green-50 { background-color: #f0fdf4; }
        .bg-yellow-50 { background-color: #fefce8; }
        .bg-red-50 { background-color: #fef2f2; }
        .bg-blue-50 { background-color: #eff6ff; }
        
        .border-green-200 { border-color: #bbf7d0; }
        .border-yellow-200 { border-color: #fef08a; }
        .border-red-200 { border-color: #fecaca; }
        .border-blue-200 { border-color: #bfdbfe; }
      `}</style>
    </div>
  );
}
