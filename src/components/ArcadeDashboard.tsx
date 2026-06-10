import * as React from 'react';
import { useState, useMemo, cloneElement, ReactElement, useRef } from 'react';
import { 
  Gamepad2, 
  Settings as SettingsIcon, 
  Trophy, 
  Zap, 
  Coins, 
  Play, 
  Layers,
  Sword,
  Target,
  Flame,
  Star,
  ChevronRight,
  TrendingUp,
  Clock,
  Rocket,
  Search,
  Brain,
  X,
  Award,
  BarChart3,
  Users,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Topic, Curriculum, AppView, GradeRecord } from '../types';
import { useLearningEngine } from '../contexts/LearningEngineContext';
import { cn } from '../lib/utils';

interface ArcadeDashboardProps {
  user: UserState;
  curriculum: Curriculum;
  onTopicSelect: (topic: Topic, targetView?: string) => void;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  selectedTopic?: Topic | null;
}

interface Quest {
  id: string;
  type: 'mastery' | 'remedial' | 'streak' | 'discovery';
  title: string;
  description: string;
  rewardXP: number;
  icon: React.ReactNode;
  topic?: Topic;
  gameView?: AppView;
}

export default function ArcadeDashboard({ 
  user, 
  curriculum, 
  onTopicSelect, 
  onNavigate, 
  selectedTopic
}: ArcadeDashboardProps) {
  // --- Resolve Grade & Grade Topics ---
  const gradeStr = user.currentGrade || 'Grade 1';
  const gradeData = useMemo(() => {
    const rawGrade = gradeStr.toString();
    const cleanGrade = rawGrade.replace('Grade ', '');
    return curriculum.highSchool?.find(g => g.grade === rawGrade || g.grade === `Grade ${rawGrade}` || g.grade === cleanGrade || g.grade === `Grade ${cleanGrade}`) || 
           curriculum.primary?.find(g => g.grade === rawGrade || g.grade === `Grade ${rawGrade}` || g.grade === cleanGrade || g.grade === `Grade ${cleanGrade}`);
  }, [curriculum, gradeStr]);

  const gradeTopics = useMemo(() => {
    if (!gradeData) return [];
    const list: Topic[] = [];
    gradeData.subjects.forEach(s => list.push(...s.topics));
    return list;
  }, [gradeData]);

  const { recentActivity, academicStatus, schedule } = useLearningEngine();
  const gamesRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  
  const [activeModal, setActiveModal] = useState<'rank' | 'level' | 'mastery' | 'game-selector' | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

  // --- Real-time Teacher & Parent Pushed Active Missions ---
  const [activeMissions, setActiveMissions] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchMissions = () => {
      try {
        const list = JSON.parse(localStorage.getItem('motlatsi_notifications') || '[]');
        // Filter for this student and of type 'assignment' or 'alert' or related to teacher/parent assignments that are unread
        const studentMissions = list.filter((notif: any) => 
          String(notif.studentId) === String(user.id) && 
          !notif.read && 
          (
            notif.type === 'assignment' || 
            notif.type === 'alert' || 
            notif.title?.toLowerCase().includes('recovery') || 
            notif.title?.toLowerCase().includes('remedial') ||
            notif.title?.toLowerCase().includes('plan')
          )
        );
        setActiveMissions(studentMissions);
      } catch (e) {
        console.error("Error reading missions in ArcadeDashboard", e);
      }
    };

    fetchMissions();
    window.addEventListener('storage', fetchMissions);
    // Listen to customizable refresh trigger too
    const handleRefresh = () => fetchMissions();
    window.addEventListener('refreshMissions', handleRefresh);
    return () => {
      window.removeEventListener('storage', fetchMissions);
      window.removeEventListener('refreshMissions', handleRefresh);
    };
  }, [user.id]);

  const handleLaunchMission = (mission: any) => {
    // Attempt to extract topic name from mission.message or mission.title
    let topicTitle = '';
    const match = mission.message?.match(/"([^"]+)"/);
    if (match) {
      topicTitle = match[1];
    } else {
      // fallback to extracting keyword or matching in some way
      const parts = mission.message?.split('for') || [];
      if (parts.length > 1) {
        topicTitle = parts[1].replace(/[".!]/g, '').trim();
      }
    }

    // Find topic in grade list first
    let foundTopic = gradeTopics.find(t => 
      t.title.toLowerCase() === topicTitle.toLowerCase() || 
      topicTitle.toLowerCase().includes(t.title.toLowerCase()) ||
      t.title.toLowerCase().includes(topicTitle.toLowerCase())
    );

    if (!foundTopic && curriculum) {
      const collections = [curriculum.primary, curriculum.highSchool];
      for (const col of collections) {
        if (!col) continue;
        for (const g of col) {
          for (const s of g.subjects) {
            const t = s.topics.find(top => 
              top.title.toLowerCase() === topicTitle.toLowerCase() || 
              topicTitle.toLowerCase().includes(top.title.toLowerCase()) ||
              top.title.toLowerCase().includes(topicTitle.toLowerCase())
            );
            if (t) { foundTopic = t; break; }
          }
          if (foundTopic) break;
        }
        if (foundTopic) break;
      }
    }

    const topicToUse = foundTopic || gradeTopics[0];

    if (topicToUse) {
      onTopicSelect(topicToUse, 'game-selector');
      setActiveModal('game-selector');
      localStorage.setItem('motlatsi_current_mission_id', mission.id);
    }
  };



  // --- Dynamic Quests Generator ---
  const quests = useMemo(() => {
    const list: Quest[] = [];
    
    // 1. Discovery Quest (Based on curriculum progress)
    const gradeStr = user.currentGrade || 'Grade 8';
    const gradeData = curriculum.highSchool?.find(g => g.grade === gradeStr || g.grade === `Grade ${gradeStr}`) || 
                      curriculum.primary?.find(g => g.grade === gradeStr || g.grade === `Grade ${gradeStr}`);
    
    if (gradeData) {
      // Find first topic not completed
      const nextTopic = gradeData.subjects[0].topics.find(t => !user.completedTopics?.includes(t.id));
      if (nextTopic) {
        list.push({
          id: 'discovery-1',
          type: 'discovery',
          title: `Discover ${nextTopic.title}`,
          description: `Play a game to learn something brand new today!`,
          rewardXP: 150,
          icon: <Zap className="text-indigo-500" />,
          topic: nextTopic
        });
      }
    }

    // 2. Mastery / Remedial Quest (if any struggles)
    const strugglingTopic = recentActivity.find(r => (r.score / r.total) < 0.7);
    if (strugglingTopic && strugglingTopic.topicId) {
      const findTopic = (id: string) => {
        const collections = [curriculum.primary, curriculum.highSchool];
        for (const col of collections) {
          if (!col) continue;
          for (const g of col) {
            for (const s of g.subjects) {
              const t = s.topics.find(top => top.id === id);
              if (t) return t;
            }
          }
        }
        return null;
      };
      
      const topic = findTopic(strugglingTopic.topicId);
      if (topic) {
        list.push({
          id: 'remedial-1',
          type: 'remedial',
          title: `Practice ${topic.title}`,
          description: `You're doing great! play once more to become an expert.`,
          rewardXP: 250,
          icon: <Brain className="text-amber-500" />,
          topic: topic
        });
      }
    }

    // 3. General Strategic Challenge
    if (list.length < 3) {
      list.push({
        id: 'strategy-challenge',
        type: 'streak',
        title: "Brain Workout",
        description: "Challenge yourself to a fun game and make your brain even stronger!",
        rewardXP: 100,
        icon: <Layers className="text-emerald-500" />
      });
    }

    return list;
  }, [user.completedTopics, curriculum, recentActivity, user.currentGrade]);

  const activeQuest = quests[0];

  const totalXP = user.xp || 0;
  const level = user.level || 1;
  // Progress towards next 100 XP milestone (standard for gaming levels)
  const xpInCurrentLevel = totalXP % 100;
  const xpProgress = xpInCurrentLevel; // 0-100%

  const streak = useMemo(() => {
    if (recentActivity.length === 0) return 0;
    
    // Normalize dates (remove time) and get unique dates in descending order
    const dates = [...new Set(recentActivity.map(a => {
      const d = new Date(a.date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }))].sort((a, b) => b - a);
    
    const today = new Date();
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const yesterdayTime = todayTime - (24 * 60 * 60 * 1000);
    
    // If last activity wasn't today or yesterday, streak is broken
    if (dates[0] !== todayTime && dates[0] !== yesterdayTime) return 0;
    
    let currentStreak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      if (dates[i] - dates[i+1] === (24 * 60 * 60 * 1000)) {
        currentStreak++;
      } else {
        break;
      }
    }
    return currentStreak;
  }, [recentActivity]);

  const rank = useMemo(() => {
    // Dynamic rank calculation based on performance and activity
    const activityBonus = recentActivity.length * 2;
    const masteryBonus = Math.floor(academicStatus.masteryScore / 2);
    const completionBonus = (user.completedTopics?.length || 0) * 5;
    const totalPower = activityBonus + masteryBonus + completionBonus;
    return Math.max(1, 1000 - totalPower); // Simple global rank simulation
  }, [user.completedTopics, academicStatus.masteryScore, recentActivity]);

  const battlesPlayed = recentActivity.length;
  const mastery = academicStatus.masteryScore;
  const completedCount = user.completedTopics?.length || 0;

  const battleBadges = useMemo(() => [
    {
      id: 'early_bird',
      name: 'First Blood',
      desc: 'Complete at least 1 study session or game battle to start your journey.',
      req: 'Play 1 game',
      current: battlesPlayed,
      target: 1,
      unlocked: battlesPlayed >= 1,
      icon: <Zap size={14} />,
      color: 'amber'
    },
    {
      id: 'logic_master',
      name: 'Pure Smarts',
      desc: 'Achieve a subject curriculum topic mastery of 70% or more.',
      req: 'Mastery >= 70%',
      current: mastery,
      target: 70,
      unlocked: mastery >= 70,
      icon: <Star size={14} />,
      color: 'indigo'
    },
    {
      id: 'curriculum_conqueror',
      name: 'Conqueror',
      desc: 'Fully complete at least 2 subject topics under student portfolio.',
      req: 'Complete 2 topics',
      current: completedCount,
      target: 2,
      unlocked: completedCount >= 2,
      icon: <Trophy size={14} />,
      color: 'emerald'
    },
    {
      id: 'morabaraba_master',
      name: 'Basotho Herd',
      desc: 'Take care of your virtual cattle and win a tactical Morabaraba battle.',
      req: 'Complete 1 Morabaraba session',
      current: recentActivity.filter(a => a.gameType === 'morabaraba' || a.id?.includes('morabaraba') || a.itemTitle?.toLowerCase().includes('morabaraba')).length,
      target: 1,
      unlocked: recentActivity.some(a => a.gameType === 'morabaraba' || a.id?.includes('morabaraba') || a.itemTitle?.toLowerCase().includes('morabaraba')),
      icon: <Sword size={14} />,
      color: 'rose'
    }
  ], [battlesPlayed, mastery, completedCount, recentActivity]);

  const games = useMemo(() => [
    {
      id: 'morabaraba',
      title: 'Morabaraba',
      description: 'Use your brain to win this clever board game.',
      icon: <Layers className="text-red-500" />,
      color: 'bg-red-50 dark:bg-red-950/30',
      hoverColor: 'hover:bg-red-500 hover:text-white',
      view: 'morabaraba-battle' as AppView
    },
    {
      id: 'memory-archives',
      title: 'Memory Cards',
      description: 'Find all the matching cards to win!',
      icon: <Brain className="text-blue-500" />,
      color: 'bg-blue-50 dark:bg-blue-950/30',
      hoverColor: 'hover:bg-blue-500 hover:text-white',
      view: 'memory-battle' as AppView
    },
    {
      id: 'lingo-links',
      title: 'Word Search',
      description: 'Unscramble the letters to find the hidden words.',
      icon: <Sword className="text-emerald-500" />,
      color: 'bg-emerald-50 dark:bg-emerald-950/30',
      hoverColor: 'hover:bg-emerald-500 hover:text-white',
      view: 'lingo-battle' as AppView
    },
    {
      id: 'flashcard-arcade',
      title: 'Memory Flash',
      description: 'Test how fast you can remember the cards!',
      icon: <Zap className="text-amber-500" />,
      color: 'bg-yellow-50 dark:bg-yellow-950/30',
      hoverColor: 'hover:bg-amber-500 hover:text-white',
      view: 'flashcard-arcade' as AppView
    }
  ], []);

  const handleStartGame = (gameView: AppView, specificTopic?: Topic) => {
    // 1. Check if specificTopic is provided by active quest
    // 2. Or if a selectedTopic already exists in state
    // 3. Or select the first uncompleted topic in the student's actual grade!
    let topicToUse = specificTopic || selectedTopic;
    
    if (!topicToUse && gradeTopics.length > 0) {
      topicToUse = gradeTopics.find(t => !user.completedTopics?.includes(t.id)) || gradeTopics[0];
    }
    
    // Default fallback
    if (!topicToUse) {
      topicToUse = curriculum.highSchool?.[0]?.subjects?.[0]?.topics?.[0] || curriculum.primary?.[0]?.subjects?.[0]?.topics?.[0];
    }
    
    if (topicToUse) {
      onTopicSelect(topicToUse, gameView);
    } else {
      onNavigate(gameView);
    }
  };

  const handleLaunchQuest = (quest: Quest) => {
    setActiveModal('game-selector');
  };

  return (
    <div className="h-full bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col overflow-hidden selection:bg-indigo-100 font-sans">
      <AnimatePresence>
        {activeModal === 'game-selector' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setActiveModal(null)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl p-6 pb-8 sm:pb-6"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
              <h2 className="text-xl font-black text-slate-900 mb-2">Pick a Game</h2>
              <p className="text-xs text-slate-500 font-medium mb-6">Which fun game do you want to play now?</p>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'memory-battle' as const, label: 'Memory', icon: <Brain size={18} className="text-blue-500" />, color: 'bg-blue-50' },
                  { id: 'lingo-battle' as const, label: 'Lingo', icon: <Zap size={18} className="text-emerald-500" />, color: 'bg-emerald-50' },
                  { id: 'flashcard-arcade' as const, label: 'Flash', icon: <Layers size={18} className="text-amber-500" />, color: 'bg-amber-50' },
                  { id: 'morabaraba-battle' as const, label: 'Tactics', icon: <Gamepad2 size={18} className="text-indigo-500" />, color: 'bg-indigo-50' }
                ].map((game) => (
                  <motion.button
                    key={game.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      handleStartGame(game.id, activeQuest?.topic);
                      setActiveModal(null);
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-400 ${game.color} gap-2 transition-all`}
                  >
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      {game.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{game.label}</span>
                  </motion.button>
                ))}
              </div>
              
              <button 
                onClick={() => setActiveModal(null)}
                className="w-full py-4 text-[10px] font-black text-slate-400 mt-4 uppercase tracking-[0.2em]"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
        {activeModal && activeModal !== 'game-selector' && (
          <StatModal 
            type={activeModal as 'rank' | 'level' | 'mastery'} 
            onClose={() => setActiveModal(null)} 
            stats={{ rank, level, totalXP, xpProgress, streak }}
            recentActivity={recentActivity}
            academicStatus={academicStatus}
            user={user}
          />
        )}
        {selectedBadge && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl p-5"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest">Battle Badge</span>
                <button onClick={() => setSelectedBadge(null)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                  <X size={14} className="text-slate-405 text-slate-400" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center mt-2 mb-4">
                <div className={cn(
                  "size-12 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/50 mb-3",
                  selectedBadge.unlocked 
                    ? selectedBadge.color === 'amber' ? 'bg-amber-500 text-white'
                      : selectedBadge.color === 'indigo' ? 'bg-indigo-500 text-white'
                      : selectedBadge.color === 'emerald' ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                )}>
                  {cloneElement(selectedBadge.icon as ReactElement, { size: 20 })}
                </div>

                <h3 className="text-sm font-black text-slate-905 dark:text-white leading-tight">
                  {selectedBadge.name}
                </h3>
                
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 border",
                  selectedBadge.unlocked 
                    ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100/50" 
                    : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100"
                )}>
                  {selectedBadge.unlocked ? "★ Unlocked" : "🔒 Locked"}
                </span>

                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-medium leading-relaxed mt-3 max-w-[90%]">
                  {selectedBadge.desc}
                </p>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      selectedBadge.unlocked ? "bg-emerald-500" : "bg-indigo-500"
                    )}
                    style={{ width: `${Math.min(100, (selectedBadge.current / selectedBadge.target) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between w-full mt-1 text-[8px] font-bold text-slate-400 uppercase">
                  <span>Progress</span>
                  <span>{selectedBadge.current} / {selectedBadge.target}</span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedBadge(null)}
                className="w-full py-2 bg-indigo-600 hover:bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Acknowledge
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="sticky top-0 z-40 py-3 px-4 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="size-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
               <Gamepad2 size={18} className="text-white" />
             </div>
             <div className="flex flex-col">
               <h1 className="text-xs font-black text-slate-900 leading-none tracking-tight">ARCADE</h1>
               <div className="flex items-center gap-1 mt-0.5">
                  <div className="size-1 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">LVL {level}</span>
               </div>
             </div>
          </div>

          <div 
            onClick={() => setActiveModal('rank')}
            className="flex items-center gap-5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Trophy size={10} className="text-amber-500" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Rank #{rank}</span>
              </div>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${xpProgress}%` }}
                   className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                />
              </div>
            </div>
            <div className="size-9 rounded-2xl bg-slate-100 border border-slate-200 p-1 flex items-center justify-center">
               <div className="w-full h-full rounded-xl bg-white flex items-center justify-center text-[11px] font-black text-slate-900 shadow-sm">
                 {level}
               </div>
            </div>
          </div>
        </div>
      </nav>

      <main 
        ref={mainRef}
        className="flex-1 max-w-lg w-full mx-auto px-4 py-1.5 flex flex-col gap-2 min-h-0 pb-16 overflow-y-auto no-scrollbar scroll-smooth relative"
      >
        {/* Active Missions from Teacher/Parent (Interconnected Gameplay Loop) */}
        {activeMissions.length > 0 && (
          <section className="shrink-0 flex flex-col gap-1 px-1 pt-1.5 animate-in fade-in duration-300">
             <h3 className="text-[8px] font-black tracking-[0.2em] text-indigo-500 uppercase px-1 flex items-center gap-1.5 mb-1 bg-transparent">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
               </span>
               Active Teacher & Parent Missions ({activeMissions.length})
             </h3>
             <div className="flex flex-col gap-2">
                {activeMissions.map((mission) => {
                  const isTeacher = mission.type === 'assignment' || mission.message?.toLowerCase().includes('teacher') || mission.title?.toLowerCase().includes('teacher');
                  
                  return (
                    <motion.div 
                      key={mission.id}
                      whileHover={{ scale: 1.01 }}
                      className="bg-white dark:bg-slate-900 border-2 border-dashed border-indigo-200 dark:border-indigo-950 p-3 rounded-2xl flex flex-col gap-2 relative overflow-hidden shadow-sm"
                    >
                      <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[7px] font-black uppercase rounded-bl-xl tracking-wider">
                        {isTeacher ? "⚔️ Teacher Focus" : "💝 Parent Focus"}
                      </div>
                      
                      <div className="flex items-start gap-2 pt-1 text-left">
                        <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isTeacher ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-500'
                        }`}>
                           {isTeacher ? <Sword size={14} /> : <Heart size={14} fill="currentColor" />}
                        </div>
                        <div className="flex-1 min-w-0 pr-16 bg-transparent">
                           <h4 className="text-[10.5px] font-black text-slate-900 dark:text-white leading-tight truncate">
                             {mission.title}
                           </h4>
                           <p className="text-slate-500 dark:text-slate-400 text-[8.5px] font-semibold mt-0.5 leading-snug">
                             {mission.message}
                           </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-850 p-1.5 rounded-xl">
                        <span className="text-[7.5px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                          Reward: +200 XP & Medal
                        </span>
                        <button 
                          onClick={() => handleLaunchMission(mission)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-black text-white font-black rounded-lg transition-all active:scale-95 flex items-center gap-1 uppercase text-[8px] tracking-widest cursor-pointer"
                        >
                          <Play size={8} fill="currentColor" /> Battle!
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
             </div>
          </section>
        )}

        {/* Super Compact Hero Card */}
        <section className="shrink-0 animate-fade-in">
          <motion.div 
            whileTap={{ scale: 0.98 }}
            className="relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 p-3 shadow-md shadow-indigo-900/[0.01] group"
          >
            <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-indigo-50/20 dark:from-indigo-950/10 to-transparent skew-x-12 translate-x-10 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <div className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-full text-[7px] font-black uppercase tracking-wider",
                  activeQuest?.type === 'remedial' ? "bg-red-50 dark:bg-red-950/20 border-red-100/50 text-red-600" : "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100/30 text-indigo-600"
                )}>
                  {activeQuest?.type === 'remedial' ? <Flame size={7} className="fill-red-500 text-red-500" /> : <Star size={7} className="fill-indigo-500 text-indigo-500" />}
                  {activeQuest?.type === 'remedial' ? 'Extra Practice' : 'Today\'s Goal'}
                </div>
                <div className="flex items-center gap-1 text-[8px] font-black text-amber-600 dark:text-amber-400">
                   <Trophy size={9} className="fill-amber-400 text-amber-500" />
                   +{activeQuest?.rewardXP || 100} XP
                </div>
              </div>
              
              <div className="flex justify-between items-center gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs font-black text-slate-905 dark:text-white leading-tight tracking-tight truncate">
                    {activeQuest?.title || 'Launch Study Session'}
                  </h2>
                  <p className="text-slate-400 text-[8px] font-bold uppercase tracking-wider mt-0.5 truncate">
                    {activeQuest?.description || 'Pick a battle station.'}
                  </p>
                </div>
                <button 
                  onClick={() => handleLaunchQuest(activeQuest)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-black text-white font-black rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1 uppercase text-[8px] tracking-widest shrink-0"
                >
                  <Rocket size={10} />
                  Play
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Dynamic Battle Badges Section (Replaces stats grid to save space & add functionality) */}
        <section className="shrink-0 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-2 text-left rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <h3 className="text-[8px] font-black tracking-[0.2em] text-slate-400 uppercase flex items-center gap-1">
               <Award size={9} className="text-indigo-500" />
               Battle Badges
            </h3>
            <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest">
              {battleBadges.filter(b => b.unlocked).length} / {battleBadges.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {battleBadges.map((badge) => (
              <motion.button
                key={badge.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedBadge(badge)}
                className={cn(
                  "flex flex-col items-center justify-center p-1.5 rounded-xl transition-all relative overflow-hidden h-12 border",
                  badge.unlocked 
                    ? "bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-100/50 dark:border-indigo-950/30 hover:border-indigo-300" 
                    : "bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 opacity-60"
                )}
              >
                <div className={cn(
                  "size-5 rounded-lg flex items-center justify-center shadow-sm relative shrink-0",
                  badge.unlocked 
                    ? badge.color === 'amber' ? 'bg-amber-500 text-white'
                      : badge.color === 'indigo' ? 'bg-indigo-500 text-white'
                      : badge.color === 'emerald' ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                )}>
                  {badge.icon}
                </div>
                <span className="text-[7px] font-extrabold text-slate-800 dark:text-slate-200 mt-1 truncate w-full text-center leading-none">
                  {badge.name}
                </span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Next Up / Sub-quests */}
        {quests.length > 1 && (
          <section className="shrink-0 flex flex-col gap-1 pt-0.5">
             <h3 className="text-[8px] font-black tracking-[0.2em] text-slate-400 uppercase px-1">Side Objectives</h3>
             <div className="flex flex-row gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-0.5">
                {quests.slice(1).map(q => (
                  <motion.button 
                    key={q.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleLaunchQuest(q)}
                    className="flex-1 min-w-[140px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-1.5 rounded-xl flex items-center justify-between hover:border-indigo-200 transition-all shadow-sm h-11"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-6 rounded-lg bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0">
                        {cloneElement(q.icon as ReactElement, { size: 10 })}
                      </div>
                      <div className="text-left min-w-0">
                        <h4 className="text-[9px] font-black text-slate-800 dark:text-slate-100 leading-tight truncate">{q.title}</h4>
                        <p className="text-[7px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-normal mt-0.5">+{q.rewardXP} XP</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
             </div>
          </section>
        )}

        {/* Games Section - Ultra Compact list style cards */}
        <section ref={gamesRef} className="shrink-0 flex flex-col gap-1 pt-0.5">
          <div className="flex items-center justify-between px-1 shrink-0">
            <h3 className="text-[8px] font-black tracking-[0.2em] text-slate-400 uppercase flex items-center gap-1">
               <Rocket size={8} className="text-indigo-600" />
               Today's Games
            </h3>
            <button className="text-[7px] font-black text-indigo-600 uppercase tracking-widest">Library</button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pb-3">
            {games.map((game) => (
              <motion.button
                key={game.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleStartGame(game.view)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-2 sm:p-3 flex items-center text-left gap-2 sm:gap-3 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm hover:shadow-md overflow-hidden transition-all group relative cursor-pointer h-24"
              >
                <div className={cn("shrink-0 w-8 sm:w-11 h-8 sm:h-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner border border-white/10", game.color)}>
                  {cloneElement(game.icon as ReactElement, { size: 16 })}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-[9.5px] xs:text-[10.5px] sm:text-xs font-black text-slate-950 dark:text-slate-50 leading-tight uppercase group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors whitespace-nowrap tracking-tight">
                    {game.title}
                  </h4>
                  <p className="text-[7.5px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mt-1 leading-none truncate">
                    {game.id === 'morabaraba' ? 'Basotho Board Tactics' 
                     : game.id === 'lingo-links' ? 'Word Scramble' 
                     : game.id === 'memory-archives' ? 'Matching Pairs' 
                     : 'Flash Retention'}
                  </p>
                  <p className="text-[7px] sm:text-[7.5px] font-medium text-slate-400 dark:text-slate-500 mt-1 sm:mt-1.5 leading-snug line-clamp-2">
                    {game.description}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>


        <section className="hidden">
             <div className="flex items-center justify-between px-1 mb-3">
                <h3 className="text-[8px] font-black tracking-[0.2em] text-slate-400 uppercase flex items-center gap-1">
                    <TrendingUp size={8} className="text-emerald-500" />
                    Maseru District ranking
                </h3>
                <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase">Live</span>
             </div>
             
             <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                 {[
                     { name: 'Thabo M.', points: '12,450', rank: 1, avatar: 'TM', color: 'bg-amber-100 text-amber-600', self: false },
                     { name: user.name || 'You', points: '8,920', rank: 42, avatar: (user.name || 'YU').slice(0,2).toUpperCase(), color: 'bg-indigo-100 text-indigo-600', self: true },
                     { name: 'Lerato K.', points: '11,200', rank: 2, avatar: 'LK', color: 'bg-slate-100 text-slate-400', self: false }
                 ].sort((a,b) => a.rank - b.rank).map((entry, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 ${idx !== 0 ? 'border-t border-slate-50' : ''} ${entry.self ? 'bg-indigo-50/30' : ''}`}>
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black w-4 ${entry.rank === 1 ? 'text-amber-500' : 'text-slate-400'}`}>#{entry.rank}</span>
                            <div className={`size-7 rounded-lg ${entry.color} flex items-center justify-center text-[10px] font-bold`}>
                                {entry.avatar}
                            </div>
                            <span className={`text-xs font-bold ${entry.self ? 'text-indigo-600' : 'text-slate-700'}`}>{entry.name} {entry.self && '(You)'}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-900">{entry.points} XP</span>
                    </div>
                 ))}
             </div>
             <button className="w-full py-3 mt-2 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                View Global Leaderboard
             </button>
        </section>
      </main>


      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

interface StatModalProps {
  type: 'rank' | 'level' | 'mastery';
  onClose: () => void;
  stats: {
    rank: number;
    level: number;
    totalXP: number;
    xpProgress: number;
    streak: number;
  };
  recentActivity: any[];
  academicStatus: any;
  user: UserState;
}

function StatModal({ type, onClose, stats, recentActivity, academicStatus, user }: StatModalProps) {
  const content = {
    rank: {
      title: "Hall of Fame",
      icon: <TrendingUp className="text-indigo-500" />,
      color: "indigo",
      value: `#${stats.rank}`,
      desc: "See where you stand among all the players!",
      stats: [
        { label: "Playing Score", val: `+${recentActivity.length * 2}` },
        { label: "Smarts Bonus", val: `+${Math.floor(academicStatus.masteryScore / 2)}` },
        { label: "Lessons Done", val: `+${(user.completedTopics?.length || 0) * 5}` }
      ]
    },
    level: {
      title: "Your Level",
      icon: <Award className="text-amber-500" />,
      color: "amber",
      value: `Level ${stats.level}`,
      desc: "Get more points to reach higher levels and unlock fun surprises!",
      stats: [
        { label: "Next Goal", val: "100 Points" },
        { label: "How Far", val: `${Math.round(stats.xpProgress)}%` },
        { label: "Need to Rank Up", val: `${100 - (stats.totalXP % 100)} Points` }
      ]
    },
    mastery: {
      title: "How Much You Know",
      icon: <Trophy className="text-emerald-500" />,
      color: "emerald",
      value: `${academicStatus.masteryScore}%`,
      desc: "This shows how well you're learning all your school work.",
      stats: [
        { label: "Games Won", val: user.completedTopics?.length || 0 },
        { label: "Correct Answers", val: `${academicStatus.masteryScore}%` },
        { label: "Always Playing", val: "Yes!" }
      ]
    }
  }[type];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className={cn("p-6 text-center border-b border-slate-100 bg-gradient-to-b", 
          type === 'rank' ? "from-indigo-50/50" : type === 'level' ? "from-amber-50/50" : "from-emerald-50/50"
        )}>
          <div className="flex justify-end mb-2">
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          <div className={cn("size-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm", 
            type === 'rank' ? "bg-indigo-100 text-indigo-600" : type === 'level' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
          )}>
            {cloneElement(content.icon as ReactElement, { size: 32 })}
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{content.title}</h2>
          <div className="text-4xl font-black text-slate-900 tracking-tighter">{content.value}</div>
        </div>
        
        <div className="p-6">
          <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
            {content.desc}
          </p>
          
          <div className="space-y-3">
            {content.stats.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</span>
                <span className="text-xs font-black text-slate-900">{s.val}</span>
              </div>
            ))}
          </div>
          
          <button 
            onClick={onClose}
            className={cn("w-full py-4 rounded-2xl font-black mt-8 shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs text-white",
              type === 'rank' ? "bg-indigo-600 shadow-indigo-100" : type === 'level' ? "bg-amber-500 shadow-amber-100" : "bg-emerald-600 shadow-emerald-100"
            )}
          >
            Close Details
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
