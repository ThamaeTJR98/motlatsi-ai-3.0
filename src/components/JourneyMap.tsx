
import React, { useState, useEffect, useMemo } from 'react';
import { UserState, Curriculum, Topic } from '../types';
import { Play, Map, Book, Calculator, FlaskConical, Globe, Languages, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLearningEngine } from '../contexts/LearningEngineContext';
import { useVoiceContext } from '../hooks/useVoiceContext';
import { VoiceCommand } from '../contexts/VoiceAccessContext';

interface JourneyMapProps {
    user: UserState;
    curriculum: Curriculum;
    onTopicSelect: (topic: Topic) => void;
}

const JourneyMap: React.FC<JourneyMapProps> = ({ user, curriculum, onTopicSelect }) => {
    const { getTopicStatus } = useLearningEngine();
    
    // Dynamic Logic: Find topics based on user's grade
    const subjects = useMemo(() => {
        let subs: { name: string; topics: Topic[] }[] = [];
        const gradeStr = (user.currentGrade || '1').toString();
        const primaryGrade = curriculum.primary.find(g => g.grade === gradeStr || g.grade === `Grade ${gradeStr}`);
        if (primaryGrade) {
            subs = [...primaryGrade.subjects].sort((a, b) => {
                const priority = ['Mathematics', 'Science', 'Numeracy', 'Scientific and Technological', 'Numerical and Mathematical', 'Integrated Studies'];
                const aIndex = priority.findIndex(p => a.name.includes(p));
                const bIndex = priority.findIndex(p => b.name.includes(p));
                
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                
                // Languages at the end
                const isALang = a.name.includes('Literacy') || a.name.includes('Sesotho') || a.name.includes('English');
                const isBLang = b.name.includes('Literacy') || b.name.includes('Sesotho') || b.name.includes('English');
                if (isALang && !isBLang) return 1;
                if (!isALang && isBLang) return -1;
                
                return a.name.localeCompare(b.name);
            });
        } else {
            const highSchoolGrade = curriculum.highSchool.find(g => g.grade === gradeStr || g.grade === `Grade ${gradeStr}`);
            if (highSchoolGrade) {
                subs = [...highSchoolGrade.subjects].sort((a, b) => {
                    const priority = ['Mathematics', 'Science', 'Numerical and Mathematical', 'Scientific and Technological'];
                    const aIndex = priority.findIndex(p => a.name.includes(p));
                    const bIndex = priority.findIndex(p => b.name.includes(p));
                    
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;

                    const isALang = a.name.includes('Literacy') || a.name.includes('Sesotho') || a.name.includes('English');
                    const isBLang = b.name.includes('Literacy') || b.name.includes('Sesotho') || b.name.includes('English');
                    if (isALang && !isBLang) return 1;
                    if (!isALang && isBLang) return -1;

                    return a.name.localeCompare(b.name);
                });
            }
        }
        return subs;
    }, [curriculum, user.currentGrade]);

    const [activeSubject, setActiveSubject] = useState<string>(() => {
        const saved = localStorage.getItem('motlatsi_active_subject');
        const exists = subjects.find(s => s.name === saved);
        return exists ? saved! : (subjects.length > 0 ? subjects[0].name : '');
    });

    useEffect(() => {
        if (activeSubject) {
            localStorage.setItem('motlatsi_active_subject', activeSubject);
        }
    }, [activeSubject]);

    const displayedSubject = subjects.find(s => s.name === activeSubject) || subjects[0];

    // --- Voice Context Integration ---
    const voiceCommands = useMemo(() => {
        const cmds: VoiceCommand[] = [];

        // 1. Subject Switching Commands
        subjects.forEach(sub => {
            cmds.push({
                id: `nav-subject-${sub.name}`,
                keywords: [sub.name.toLowerCase(), `open ${sub.name.toLowerCase()}`, `switch to ${sub.name.toLowerCase()}`],
                action: () => setActiveSubject(sub.name),
                description: `Switch to ${sub.name}`
            });
        });

        // 2. Topic Selection Commands (for current subject)
        if (displayedSubject) {
            displayedSubject.topics.forEach(topic => {
                // All topics accessible by voice
                cmds.push({
                    id: `open-topic-${topic.id}`,
                    keywords: [topic.title.toLowerCase(), `start ${topic.title.toLowerCase()}`, `open ${topic.title.toLowerCase()}`],
                    action: () => onTopicSelect(topic),
                    description: `Open ${topic.title}`
                });
            });
        }

        return cmds;
    }, [subjects, displayedSubject, onTopicSelect]);

    useVoiceContext(voiceCommands);

    if (subjects.length === 0) return <div>No curriculum found.</div>;

    const getSubjectIcon = (name: string) => {
        if (name.includes('Math') || name.includes('Numeracy')) return <Calculator size={16} />;
        if (name.includes('Science')) return <FlaskConical size={16} />;
        if (name.includes('Sesotho') || name.includes('English') || name.includes('Literacy')) return <Languages size={16} />;
        if (name.includes('Social') || name.includes('Integrated')) return <Globe size={16} />;
        return <Book size={16} />;
    };

    return (
        <div className="h-screen overflow-y-auto pb-24 relative bg-[#f0f7ff] font-sans w-full scroll-smooth">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#f0f7ff] shadow-sm pt-4 pb-2 transition-all border-b border-blue-100/50">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-teacherBlue flex items-center justify-center text-white shadow-md shadow-blue-200">
                                <Map size={16} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900 leading-none">Learning Path</h2>
                                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Grade {user.currentGrade}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2" role="tablist" aria-label="Subjects">
                        {subjects.map((sub) => (
                            <button
                                key={sub.name}
                                role="tab"
                                aria-selected={activeSubject === sub.name}
                                onClick={() => setActiveSubject(sub.name)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                                    activeSubject === sub.name
                                        ? 'bg-teacherBlue text-white border-teacherBlue shadow-sm shadow-blue-200'
                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-blue-50'
                                }`}
                            >
                                {getSubjectIcon(sub.name)}
                                {sub.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <main className="max-w-5xl mx-auto px-4 py-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {displayedSubject && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayedSubject.topics.map((topic) => {
                            const status = getTopicStatus(topic.id, topic.prerequisiteTopicIds);
                            
                            // Visual States - Force Unlock
                            const isRemedial = status === 'remedial-needed';
                            const isMastered = status === 'mastered';
                            // Treat everything else as open/ready
                            const isOpen = !isMastered && !isRemedial;

                            return (
                                <button
                                    key={topic.id}
                                    onClick={() => onTopicSelect(topic)}
                                    disabled={false}
                                    aria-label={`${topic.title} - ${status}`}
                                    className={`relative flex flex-col p-4 rounded-xl text-left transition-all duration-300 group min-h-[110px]
                                        ${isMastered 
                                            ? 'bg-white border-2 border-green-100 hover:border-green-200' 
                                            : isRemedial
                                                ? 'bg-red-50 border-2 border-red-200 hover:border-red-300'
                                                : 'bg-white border-2 border-transparent hover:scale-[1.02] shadow-lg shadow-blue-100 ring-2 ring-blue-50 cursor-pointer' 
                                        }
                                    `}
                                >
                                    {isOpen && <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent rounded-xl pointer-events-none" />}

                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <span className={`flex items-center justify-center size-7 rounded-full text-[10px] font-bold transition-transform group-hover:scale-110
                                            ${isMastered 
                                                ? 'bg-green-100 text-green-600' 
                                                : isRemedial
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-teacherBlue text-white shadow-md shadow-blue-200' 
                                            }
                                        `}>
                                            {isMastered ? <CheckCircle size={14} /> : isRemedial ? <AlertTriangle size={14} /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                                        </span>
                                        
                                        {isMastered && (
                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full border bg-green-50 text-green-600 border-green-100">MASTERED</span>
                                        )}
                                        {isRemedial && (
                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full border bg-red-100 text-red-600 border-red-200 animate-pulse">REVIEW</span>
                                        )}
                                        {isOpen && (
                                            <span className="bg-blue-100 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-blue-200">START</span>
                                        )}
                                    </div>

                                    <div className="relative z-10 flex-1 flex flex-col justify-end pr-6">
                                        <h4 className="text-sm font-bold leading-tight mb-1 line-clamp-2 text-gray-900">
                                            {topic.title}
                                        </h4>
                                        <p className="text-[10px] line-clamp-2 text-gray-500 leading-tight">
                                            {topic.description}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default JourneyMap;
