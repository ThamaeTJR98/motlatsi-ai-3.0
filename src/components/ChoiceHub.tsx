
import React, { useState, useMemo } from 'react';
import { Topic, StudyMode, UserState, Curriculum } from '../types';
import { BookOpen, Headphones, Puzzle, Info, Compass, Layers, Target, ChevronRight, Sparkles, Lightbulb, RefreshCw, ChevronDown, X } from 'lucide-react';

interface ChoiceHubProps {
    topic: Topic;
    user?: UserState;
    curriculum?: Curriculum;
    onTopicSelect?: (topic: Topic) => void;
    onChoice: (mode: 'read' | 'listen' | 'do', studyMode: StudyMode) => void;
}

const ChoiceHub: React.FC<ChoiceHubProps> = ({ topic, user, curriculum, onTopicSelect, onChoice }) => {
    const [studyMode, setStudyMode] = useState<StudyMode>('intro');
    const [tipIndex, setTipIndex] = useState(0);
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

    const subjects = useMemo(() => {
        if (!user || !curriculum) return [];
        let subs: { name: string; topics: Topic[] }[] = [];
        const rawGrade = (user.currentGrade || '1').toString();
        const cleanGrade = rawGrade.replace('Grade ', '');
        
        // Match either "6" or "Grade 6"
        const primaryGrade = curriculum.primary.find(g => 
            g.grade === rawGrade || 
            g.grade === `Grade ${rawGrade}` ||
            g.grade === cleanGrade ||
            g.grade === `Grade ${cleanGrade}`
        );
        
        if (primaryGrade) {
            subs = [...primaryGrade.subjects];
        } else {
            const highSchoolGrade = curriculum.highSchool.find(g => 
                g.grade === rawGrade || 
                g.grade === `Grade ${rawGrade}` ||
                g.grade === cleanGrade ||
                g.grade === `Grade ${cleanGrade}`
            );
            if (highSchoolGrade) {
                subs = [...highSchoolGrade.subjects];
            }
        }
        return subs;
    }, [curriculum, user]);

    const tips = {
        'intro': [
            "Start with Key Concepts to build a foundation.",
            "Audio Overviews are great for learning on the go.",
            "Take it slow! Learning is a journey."
        ],
        'deep-dive': [
            "Interactive Lessons let you explore at your pace.",
            "Find hidden details in the image hotspots.",
            "Try explaining this concept to a friend."
        ],
        'exam-prep': [
            "Try the Mock Exam to test your readiness!",
            "Review past quizzes to find gaps.",
            "Flashcards help quick memory refreshes."
        ]
    };

    const currentTips = tips[studyMode] || tips['intro'];
    const activeTip = currentTips[tipIndex % currentTips.length];

    const cycleTip = () => {
        setTipIndex(prev => prev + 1);
    };

    const getReadTitle = (mode: StudyMode) => {
        if (mode === 'intro') return 'Key Concepts';
        if (mode === 'deep-dive') return 'Interactive Lesson';
        return 'Revision Notes';
    };

    const getAudioTitle = (mode: StudyMode) => {
        if (mode === 'intro') return 'Intro Audio Overview';
        if (mode === 'deep-dive') return 'Audio Lesson';
        return 'Audio Prep Notes';
    };

    const getQuizTitle = (mode: StudyMode) => {
        if (mode === 'intro') return 'Review Game';
        if (mode === 'deep-dive') return 'Deep Dive Review Game';
        return 'Exam Prep Review';
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900 overflow-hidden">
            {/* Header - Flexible height for description */}
            <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-b-2xl shadow-sm border-b border-gray-100 dark:border-slate-700 z-10 shrink-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-teacherBlue dark:text-blue-400 shrink-0">
                            <Info size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-teacherBlue opacity-80 leading-none mb-0.5">Topic Selection</p>
                            <h1 className="text-sm font-bold leading-tight text-gray-900 dark:text-white truncate">{topic.title}</h1>
                        </div>
                    </div>
                    {user && curriculum && onTopicSelect && (
                        <button 
                            onClick={() => setIsTopicModalOpen(true)}
                            className="shrink-0 flex items-center gap-1 px-2 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            Change <ChevronDown size={14} />
                        </button>
                    )}
                </div>
                {/* Description: Removed line-clamp, added max-height with scroll just in case */}
                <div className="mt-2 max-h-20 overflow-y-auto scrollbar-hide">
                    <p className="text-gray-500 dark:text-gray-400 text-[10px] leading-snug">
                        {topic.description}
                    </p>
                </div>
            </div>

            {/* Content Area - Flex column to distribute space */}
            <div className="px-4 flex-1 flex flex-col py-3 overflow-y-auto min-h-0">
                
                {/* Goal Selector - Compact */}
                <section className="shrink-0 mb-3">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">1. Set Your Goal</h3>
                    <div className="grid grid-cols-3 gap-2">
                        <GoalButton 
                            active={studyMode === 'intro'} 
                            onClick={() => setStudyMode('intro')} 
                            icon={<Compass size={16} />} 
                            label="Intro" 
                        />
                        <GoalButton 
                            active={studyMode === 'deep-dive'} 
                            onClick={() => setStudyMode('deep-dive')} 
                            icon={<Layers size={16} />} 
                            label="Deep Dive" 
                        />
                        <GoalButton 
                            active={studyMode === 'exam-prep'} 
                            onClick={() => setStudyMode('exam-prep')} 
                            icon={<Target size={16} />} 
                            label="Exam Prep" 
                        />
                    </div>
                </section>

                {/* Modality List - Flexible space but prioritized */}
                <section className="shrink-0 flex flex-col gap-2">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0 px-1">2. Choose Activity</h3>
                    <div className="space-y-2">
                        <ActionCard 
                            onClick={() => onChoice('read', studyMode)}
                            icon={<BookOpen size={18} />}
                            colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            title={getReadTitle(studyMode)}
                            desc={studyMode === 'intro' ? 'Basics & examples.' : 'Step-by-step.'}
                        />
                        <ActionCard 
                            onClick={() => onChoice('listen', studyMode)}
                            icon={<Headphones size={18} />}
                            colorClass="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                            title={getAudioTitle(studyMode)}
                            desc="Listen on the go."
                        />
                        <ActionCard 
                            onClick={() => onChoice('do', studyMode)}
                            icon={<Puzzle size={18} />}
                            colorClass="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                            title={getQuizTitle(studyMode)}
                            desc="Test knowledge."
                        />
                    </div>
                </section>

                {/* Spacer pushes Tip to bottom */}
                <div className="flex-grow"></div>

                {/* Compact AI Insight Pill - Always visible at bottom */}
                <button 
                    onClick={cycleTip}
                    className="mt-3 w-full flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm active:scale-[0.98] transition-all text-left group shrink-0"
                >
                    <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-sm text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0">
                        <Lightbulb size={14} className="fill-indigo-100 dark:fill-indigo-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[9px] font-bold text-indigo-400 dark:text-indigo-300 uppercase tracking-wider">Motlatsi Tip</p>
                            <RefreshCw size={10} className="text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[10px] text-indigo-900 dark:text-indigo-100 font-medium leading-tight truncate">
                            {activeTip}
                        </p>
                    </div>
                </button>
            </div>

            {/* Topic Selection Modal */}
            {isTopicModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 shadow-2xl pb-10 md:pb-6 relative animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Topic</h3>
                            <button onClick={() => setIsTopicModalOpen(false)} className="p-1.5 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto pr-1 space-y-3 flex-1 min-h-0">
                            {subjects.length > 0 ? subjects.map((subject) => (
                                <div key={subject.name} className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden">
                                    <button 
                                        onClick={() => setExpandedSubject(expandedSubject === subject.name ? null : subject.name)}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{subject.name}</span>
                                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedSubject === subject.name ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {expandedSubject === subject.name && (
                                        <div className="p-2 bg-white dark:bg-slate-900 space-y-1">
                                            {subject.topics.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        if (onTopicSelect) onTopicSelect(t);
                                                        setIsTopicModalOpen(false);
                                                    }}
                                                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors flex items-center justify-between group ${
                                                        topic.id === t.id 
                                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-teacherBlue dark:text-blue-400 font-bold' 
                                                        : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300'
                                                    }`}
                                                >
                                                    <span className="truncate pr-2">{t.title}</span>
                                                    {topic.id === t.id && <div className="w-2 h-2 rounded-full bg-teacherBlue shrink-0" />}
                                                </button>
                                            ))}
                                            {subject.topics.length === 0 && (
                                                <p className="text-xs text-gray-400 p-2 text-center italic">No topics available.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    No subjects found for your grade.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const GoalButton = ({ active, onClick, icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all duration-300 ${
            active 
            ? 'bg-teacherBlue text-white border-teacherBlue shadow-md shadow-blue-200 dark:shadow-none scale-100 ring-2 ring-blue-100 dark:ring-blue-900' 
            : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
        }`}
    >
        {icon}
        <span className="text-[9px] font-bold tracking-wide">{label}</span>
    </button>
);

const ActionCard = ({ onClick, icon, colorClass, title, desc }: any) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center p-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all hover:border-blue-100 dark:hover:border-blue-900 hover:shadow-md h-14"
    >
        <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
            {icon}
        </div>
        <div className="flex-1 text-left ml-3 min-w-0">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{title}</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{desc}</p>
        </div>
        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
    </button>
);

export default ChoiceHub;
