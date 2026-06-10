import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Zap, 
  ChevronLeft, 
  Trophy, 
  BrainCircuit, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  Coins,
  Sparkles,
  RotateCcw,
  Calculator,
  FlaskConical,
  Globe,
  Briefcase,
  BookOpen,
  Lightbulb,
  Loader2,
  Cpu,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Topic, AppView } from '../types';
import { aiClient } from '../utils/aiClient';
import { safeJsonParse } from '../utils/aiHelpers';
import { allGrades } from '../curriculum';

interface FlashcardArcadeProps {
  topic: Topic;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
  onComplete: (score: number) => void;
  userGrade?: string;
}

interface Flashcard {
  id: string;
  term: string;
  definition: string;
}

export default function FlashcardArcade({ topic, onBack, onNavigate, onComplete, userGrade = '6' }: FlashcardArcadeProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'results'>('lobby');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    return userGrade || (topic ? topic.grade : '6');
  });
  const [subjectFocus, setSubjectFocus] = useState<string | null>(() => {
    return topic ? topic.subject.toLowerCase() : null;
  });
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
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

  const fetchCards = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const curTopic = activeTopic || topic;
      const subjectName = gradeSubjects.find(s => s.id === subjectFocus)?.name || curTopic?.subject || "General Knowledge";
      const prompt = `Generate 8 high-quality educational flashcards for the topic "${curTopic?.title || ""}" within the subject of ${subjectName} at Grade ${selectedGrade} level. 
      Each flashcard must have a concise 'term' (1-4 words) and a clear 'definition' (max 15 words).
      Format ONLY as a JSON array: [ { "term": "...", "definition": "..." }, ... ]`;
      
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
                term: { type: 'STRING', description: 'Subject word or concise concept' },
                definition: { type: 'STRING', description: 'Core explanation of the concept under 15 words' }
              },
              required: ['term', 'definition']
            }
          }
        }
      });

      const data = safeJsonParse<any[]>(response.text, []);
      if (Array.isArray(data) && data.length > 0) {
        const formattedCards = data.map((c: any, i: number) => ({
          id: i.toString(),
          term: c.term || 'Concept',
          definition: c.definition || 'Description of the concept.'
        }));
        setCards(formattedCards);
      } else {
        throw new Error("Invalid data format from AI");
      }
    } catch (error) {
      console.error("Failed to fetch cards, using fallbacks", error);
      const curTopic = activeTopic || topic;
      setCards([
        { id: 'f1', term: `${curTopic?.title || 'Concept'} Overview`, definition: `The primary concepts and foundational patterns of ${curTopic?.title || 'Concept'}.` },
        { id: 'f2', term: 'Key Principles', definition: 'The core rules and governing structures within this specific subject area.' },
        { id: 'f3', term: 'Historical Context', definition: 'How this knowledge was developed and applied in the Lesotho curriculum.' },
        { id: 'f4', term: 'Practical Application', definition: 'Methods of using these techniques to solve real-world problems.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTopic, topic, isLoading, subjectFocus, gradeSubjects, selectedGrade]);

  useEffect(() => {
    if (gameState === 'playing' && cards.length === 0) {
      fetchCards();
    }
  }, [gameState, cards.length, fetchCards]);

  useEffect(() => {
    if (gameState === 'playing' && cards.length > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('results');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, cards.length]);

  useEffect(() => {
    if (cards.length > 0 && gameState === 'playing') {
      const currentCard = cards[currentIndex];
      const otherDefs = cards
        .filter((_, i) => i !== currentIndex)
        .map(c => c.definition)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      const allOptions = [currentCard.definition, ...otherDefs].sort(() => Math.random() - 0.5);
      setOptions(allOptions);
    }
  }, [cards, currentIndex, gameState]);

  const startGame = () => {
    setCards([]);
    setGameState('playing');
    setTimeLeft(60);
    setScore(0);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowRules(true);
  };

  const handleAnswer = (selectedDef: string) => {
    if (feedback) return;

    const isCorrect = selectedDef === cards[currentIndex].definition;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    if (isCorrect) {
      setScore(prev => prev + 100);
    }

    setTimeout(() => {
      setFeedback(null);
      setIsFlipped(false);
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setGameState('results');
      }
    }, 1000);
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
            <h1 className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none">Maloti Flashcards</h1>
            <p className="text-[11px] font-bold truncate max-w-[150px] leading-tight">{topic.title}</p>
          </div>
        </div>
        
        {gameState === 'playing' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
              <Timer size={12} className="text-amber-600" />
              <span className={`text-[10px] font-black ${timeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-amber-700'}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Score</p>
              <p className="text-[11px] font-black text-amber-600 leading-none">{score}</p>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 relative">
        <AnimatePresence mode="wait">
          {gameState === 'lobby' && (
            <div className="absolute inset-0 z-50 bg-slate-900/95 overflow-y-auto flex flex-col items-center justify-start py-4 px-3 md:py-8 md:px-6 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 my-auto flex flex-col gap-3 shrink-0 text-left"
              >
                <h2 className="text-lg md:text-xl font-black text-center text-slate-900 dark:text-white mb-0.5">Get Ready!</h2>
                
                {(activeTopic || topic) && (
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-2.5 items-start animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="p-1.5 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-lg shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div className="space-y-0.5 overflow-hidden flex-1">
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-450 rounded-full uppercase tracking-wider">
                          Grade {selectedGrade}
                        </span>
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-yellow-105 dark:bg-amber-900 text-amber-800 dark:text-amber-300 rounded-full uppercase tracking-wider">
                          {(activeTopic || topic).subject}
                        </span>
                      </div>
                      <h3 className="text-[10px] md:text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug truncate">{(activeTopic || topic).title}</h3>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-1">{(activeTopic || topic).description}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 flex flex-col">
                  <div>
                    <label className="text-[9px] font-extrabold text-amber-600 dark:text-amber-450 uppercase tracking-wider block mb-1">Select Grade</label>
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
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-xl p-2 font-black focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
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
                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition-all text-left ${subjectFocus === s.id ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 ring-1 ring-amber-500' : 'bg-slate-50 dark:bg-slate-800/80 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
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
                              className={`w-full flex items-center gap-1.5 p-1 rounded-lg text-left border transition-all ${isActive ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-transparent hover:border-slate-200 dark:hover:border-slate-800'}`}
                            >
                              <div className={`size-3.5 shrink-0 flex items-center justify-center rounded-full font-black text-[7px] ${isActive ? 'bg-white text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                {idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-[9px] font-black truncate leading-normal ${isActive ? 'text-white' : 'text-slate-905 dark:text-slate-100'}`}>{t.title}</p>
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
                      <button 
                        type="button"
                        className="flex-1 py-1.5 px-1 text-[9px] md:text-[10px] font-bold rounded-lg bg-white dark:bg-slate-850 text-amber-653 dark:text-amber-400 shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Timer size={12} />
                        <span>Time Attack</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={startGame}
                  className="w-full py-3 mt-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/10 transition-all text-xs uppercase tracking-wider active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap size={14} fill="currentColor" />
                  Start Playing
                </button>
                <button type="button" onClick={onBack} className="w-full py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Go Back</button>
              </motion.div>
            </div>
          )}

          {gameState === 'playing' && cards.length === 0 && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 text-white backdrop-blur-md">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Generating Flashcards...</p>
            </div>
          )}

          {gameState === 'playing' && cards.length > 0 && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm flex flex-col gap-6"
            >
              {/* Progress Bar */}
              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                />
              </div>

              {/* Flashcard with Flip Animation */}
              <div className="flex-1 flex items-center justify-center perspective-1000">
                <motion.div 
                  className="relative w-full aspect-[4/3] cursor-pointer preserve-3d"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front: Term */}
                  <div className="absolute inset-0 backface-hidden bg-white rounded-[2rem] border-4 border-amber-100 shadow-xl flex flex-col items-center justify-center p-6 text-center">
                    <div className="absolute top-4 left-4 flex items-center gap-1 text-amber-600">
                      <BrainCircuit size={14} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Term</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 leading-tight">{cards[currentIndex].term}</h2>
                    <p className="mt-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Tap to reveal hint</p>
                    
                    <AnimatePresence>
                      {feedback && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-[2rem]"
                        >
                          {feedback === 'correct' ? (
                            <CheckCircle2 size={64} className="text-green-500" />
                          ) : (
                            <XCircle size={64} className="text-red-500" />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Back: Hint/Definition */}
                  <div className="absolute inset-0 backface-hidden bg-amber-50 rounded-[2rem] border-4 border-amber-200 shadow-xl flex flex-col items-center justify-center p-6 text-center rotate-y-180">
                    <div className="absolute top-4 left-4 flex items-center gap-1 text-amber-600">
                      <Sparkles size={14} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Hint</span>
                    </div>
                    <p className="text-xs font-bold text-amber-800 leading-relaxed italic">
                      "{cards[currentIndex].definition.substring(0, 80)}..."
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Options Grid */}
              <div className="grid gap-2 shrink-0">
                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Match the Definition</h3>
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(opt)}
                    disabled={feedback !== null}
                    className={`w-full p-3 text-left text-[10px] font-bold rounded-2xl transition-all active:scale-95 border ${
                      feedback === 'correct' && opt === cards[currentIndex].definition ? 'bg-green-500 text-white border-green-500' :
                      feedback === 'wrong' && opt !== cards[currentIndex].definition ? 'bg-red-50 border-red-100 text-red-600' :
                      'bg-white hover:bg-amber-50 border-gray-200 hover:border-amber-300 shadow-sm'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {gameState === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-xs w-full"
            >
              <Trophy size={64} className="text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">Great Job!</h2>
              <p className="text-gray-500 text-xs mb-8">You have a really good memory!</p>
              
              <div className="bg-white border border-gray-200 rounded-3xl p-6 mb-8 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Final Score</span>
                  <span className="text-2xl font-black text-amber-600">{score}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-amber-500" 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (score / 1000) * 100)}%` }} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={onBack}
                  className="py-4 bg-gray-100 text-gray-600 font-black rounded-2xl active:scale-95 transition-all text-[10px] uppercase tracking-widest"
                >
                  Exit
                </button>
                <button 
                  onClick={() => onComplete(score)}
                  className="py-4 bg-amber-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  Finish & Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Battle Rules Overlay */}
      {showRules && (
        <div className="absolute inset-0 z-[100] bg-[#1a1c1e]/95 backdrop-blur-md flex items-center justify-center p-6 text-white animate-in fade-in zoom-in-95">
          <div className="bg-amber-900/20 border border-amber-500/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
            <Zap size={48} className="text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-center uppercase tracking-tighter mb-6">How to Play</h2>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="size-8 bg-amber-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">1</div>
                <p className="text-sm text-amber-100 font-medium leading-relaxed">
                  <span className="text-white font-bold">Pick the answer:</span> Select the correct meaning for the word shown on the card.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="size-8 bg-amber-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">2</div>
                <p className="text-sm text-amber-100 font-medium leading-relaxed">
                  <span className="text-white font-bold">Hints:</span> Tap the card to see a hint if you need some help!
                </p>
              </div>
              <div className="flex gap-4">
                <div className="size-8 bg-amber-500 rounded-lg flex items-center justify-center shrink-0 font-black text-sm">3</div>
                <p className="text-sm text-amber-100 font-medium leading-relaxed">
                  <span className="text-white font-bold">Be Fast:</span> Correct answers give you more points, but move fast before time runs out!
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowRules(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-black mt-8 shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
              Start Playing
            </button>
          </div>
        </div>
      )}

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
