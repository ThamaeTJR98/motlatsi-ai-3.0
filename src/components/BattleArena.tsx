
import React, { useState, useEffect } from 'react';
import { UserState, Topic } from '../types';
import { allGrades } from '../curriculum';
import { ArrowLeft, Settings, Cpu, Grid3x3, TrendingUp, Star, Play, Music, Volume2, Gamepad2, X, ToggleLeft, ToggleRight, SpellCheck, Zap, LayoutDashboard, Map as MapIcon, Swords, BookOpenCheck, Key, GraduationCap, ChevronRight } from 'lucide-react';
import QuizInterface from './QuizInterface';
import FlashcardArcade from './FlashcardArcade';
import Morabaraba from './games/Morabaraba';
import WordScramble from './games/WordScramble';

interface BattleArenaProps {
    user: UserState;
    onBack: () => void;
    onNavigate?: (view: string) => void;
}

type ViewState = 'welcome' | 'arcade' | 'playing';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameType = 'quiz' | 'flashcards' | 'morabaraba' | 'word-scramble';

const BattleArena: React.FC<BattleArenaProps> = ({ user, onBack, onNavigate }) => {
    const [view, setView] = useState<ViewState>('arcade');
    const [selectedGame, setSelectedGame] = useState<GameType>('quiz');
    const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
    
    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        difficulty: 'medium' as Difficulty,
        sound: true,
        haptics: true
    });

    const getRandomTopic = React.useCallback((): Topic => {
        // Find user's grade curriculum
        const gradeStr = (user.currentGrade || '1').toString();
        const gradeData = allGrades.find((g: any) => g.grade === gradeStr || g.grade === `Grade ${gradeStr}`);
        
        // Allowed subjects filter
        const ALLOWED_SUBJECTS = ['Math', 'Science', 'Physic', 'Chem', 'Bio', 'Geog', 'Account'];

        if (gradeData) {
            // Filter subjects
            const validSubjects = gradeData.subjects.filter((s: any) => 
                ALLOWED_SUBJECTS.some(allowed => s.name.toLowerCase().includes(allowed.toLowerCase()))
            );

            if (validSubjects.length > 0) {
                // Pick random subject
                const subject = validSubjects[Math.floor(Math.random() * validSubjects.length)];
                // Pick random topic
                if (subject.topics.length > 0) {
                    return subject.topics[Math.floor(Math.random() * subject.topics.length)];
                }
            }
        }
        
        // Fallback if no specific grade data or subject matches
        return {
            id: 'general-science',
            title: 'General Science',
            description: 'Scientific concepts appropriate for your grade level.',
            grade: gradeStr,
            subject: 'Science',
            learningObjectives: []
        };
    }, [user.currentGrade]);

    const handleSelectGame = (game: GameType) => {
        const topic = getRandomTopic();
        setActiveTopic(topic);
        setSelectedGame(game);
        setView('playing');
    };

    const handleGameComplete = async (score: number) => {
        if (user && !user.isDemo) {
            try {
                const { supabase } = await import('../lib/supabase');
                
                // Log the battle activity
                await supabase.from('activity_logs').insert({
                    user_id: user.id,
                    action_type: 'battle_completed',
                    details: {
                        game: selectedGame,
                        score: score,
                        topic_id: activeTopic?.id,
                        topic_title: activeTopic?.title
                    }
                });
            } catch (err) {
                console.error("Failed to save battle score to Supabase", err);
            }
        }
        setView('arcade');
    };

    const toggleSetting = (key: keyof typeof settings) => {
        if (key === 'difficulty') {
            const next = settings.difficulty === 'easy' ? 'medium' : settings.difficulty === 'medium' ? 'hard' : 'easy';
            setSettings({ ...settings, difficulty: next });
        } else {
            setSettings({ ...settings, [key]: !settings[key] });
        }
    };

    // --- RENDER: ARCADE HUB ---
    const renderArcadeContent = () => {
        const games = [
            {
                id: 'flashcards',
                title: 'Maloti Flashcards',
                icon: <Zap className="w-8 h-8 text-amber-100" />,
                bg: 'bg-amber-500',
                tag: 'Memory',
                score: '1,250'
            },
            {
                id: 'morabaraba',
                title: 'Morabaraba',
                icon: <Grid3x3 className="w-8 h-8 text-orange-100" />,
                bg: 'bg-orange-500',
                tag: 'Strategy',
                score: '850'
            },
            {
                id: 'word-scramble',
                title: 'Lingo Links',
                icon: <SpellCheck className="w-8 h-8 text-emerald-100" />,
                bg: 'bg-emerald-600',
                tag: 'Words',
                score: '2,100'
            }
        ];

        return (
            <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#101922] font-display overflow-hidden relative">
                {/* Header */}
                <header className="px-4 py-2 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shrink-0 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm mr-1 hover:bg-slate-50 transition-colors">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h2 className="text-[8px] font-black text-blue-500 uppercase tracking-widest opacity-80 flex items-center gap-0.5">
                                <GraduationCap size={10} /> Grade {user.currentGrade} Arena
                            </h2>
                            <h1 className="text-sm font-black text-slate-900 dark:text-white leading-none mt-0.5">Hello, {user.name.split(' ')[0]}!</h1>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 transition-colors"
                    >
                        <Settings size={16} />
                    </button>
                </header>

                {/* Main Content - 3 Rows Layout */}
                <main className="flex-1 px-4 py-2.5 flex flex-col pb-20 overflow-y-auto no-scrollbar">
                    <div className="mb-2 shrink-0">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">Select Challenge</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-medium leading-none mt-0.5">Compete with Grade {user.currentGrade} peers in STEM & Accounting.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        {games.map((game) => (
                            <button
                                key={game.id}
                                onClick={() => handleSelectGame(game.id as GameType)}
                                className="relative w-full flex items-center p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 active:scale-[0.98] transition-all duration-205 group overflow-hidden h-14"
                            >
                                {/* Icon Left */}
                                <div className={`w-10 h-10 ${game.bg} rounded-lg flex items-center justify-center shadow-md mr-3 shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                                    {React.cloneElement(game.icon, { className: "w-5 h-5 text-white" })}
                                </div>
                                
                                {/* Info Right */}
                                <div className="flex-1 text-left min-w-0">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate">{game.title}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
                                            {game.tag}
                                        </span>
                                        <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                                            <Star size={8} fill="currentColor" /> {game.score}
                                        </span>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="p-1 text-slate-300 group-hover:text-blue-500 dark:text-slate-600 transition-colors">
                                    <ChevronRight size={18} />
                                </div>
                            </button>
                        ))}
                    </div>
                </main>

                {/* Footer Nav */}
                <footer className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#101922]/90 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 px-4 pt-3 pb-safe-battle z-50">
                    <div className="max-w-md mx-auto flex justify-between items-center">
                        <button onClick={() => onNavigate?.('dashboard')} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-[#007fff] transition-colors">
                            <LayoutDashboard size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Home</span>
                        </button>
                        <button onClick={() => onNavigate?.('journey')} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-[#007fff] transition-colors">
                            <MapIcon size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Journey</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-[#007fff]">
                            <Swords size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Battle</span>
                        </button>
                        <button onClick={() => onNavigate?.('student-hub')} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-[#007fff] transition-colors">
                            <BookOpenCheck size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Manage</span>
                        </button>
                        <button onClick={() => onNavigate?.('accessibility')} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-[#007fff] transition-colors">
                            <Key size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Access</span>
                        </button>
                    </div>
                </footer>
                
                {/* Settings Modal */}
                {showSettings && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in slide-in-from-bottom-10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Settings size={24} className="text-blue-500" /> Settings
                                </h3>
                                <button onClick={() => setShowSettings(false)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {/* Difficulty */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">Difficulty</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{settings.difficulty}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => toggleSetting('difficulty')}
                                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50"
                                    >
                                        Change
                                    </button>
                                </div>

                                {/* Sound */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                                            <Volume2 size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">Sound Effects</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{settings.sound ? 'On' : 'Off'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => toggleSetting('sound')} className={`text-2xl transition-colors ${settings.sound ? 'text-blue-500' : 'text-gray-300'}`}>
                                        {settings.sound ? <ToggleRight size={40} fill="currentColor" /> : <ToggleLeft size={40} />}
                                    </button>
                                </div>

                                 {/* Haptics */}
                                 <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl">
                                            <Gamepad2 size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">Haptics</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{settings.haptics ? 'On' : 'Off'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => toggleSetting('haptics')} className={`text-2xl transition-colors ${settings.haptics ? 'text-purple-500' : 'text-gray-300'}`}>
                                        {settings.haptics ? <ToggleRight size={40} fill="currentColor" /> : <ToggleLeft size={40} />}
                                    </button>
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowSettings(false)}
                                className="w-full mt-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Bottom Gradient Decor */}
                <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/40 via-cyan-400/40 to-blue-500/40 pointer-events-none z-50"></div>
            </div>
        );
    };

    // --- VIEW ROUTER ---
    if (view === 'playing' && activeTopic) {
        if (selectedGame === 'quiz') {
            return <QuizInterface topic={activeTopic} onBack={() => setView('arcade')} onComplete={handleGameComplete} difficulty={settings.difficulty} />;
        }
        if (selectedGame === 'flashcards') {
            return <FlashcardArcade topic={activeTopic} onBack={() => setView('arcade')} onNavigate={(view) => onNavigate?.(view)} />;
        }
        if (selectedGame === 'morabaraba') {
            return <Morabaraba topic={activeTopic} onBack={() => setView('arcade')} onComplete={handleGameComplete} difficulty={settings.difficulty} userGrade={user.currentGrade} />;
        }
        if (selectedGame === 'word-scramble') {
            return <WordScramble topic={activeTopic} onBack={() => setView('arcade')} onComplete={handleGameComplete} difficulty={settings.difficulty} userGrade={user.currentGrade} />;
        }
    }

    return renderArcadeContent();
};

export default BattleArena;
