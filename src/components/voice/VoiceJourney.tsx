
import React, { useEffect, useState } from 'react';
import { useVoiceAccess } from '../../contexts/VoiceAccessContext';
import { useLearningEngine } from '../../contexts/LearningEngineContext';
import { allGrades } from '../../curriculum'; 
import { Eye, Mic, CheckCircle, Lock, ChevronRight, PlayCircle } from 'lucide-react';
import { Topic } from '../../types';

const VoiceJourney: React.FC = () => {
    const { voiceState, activeTopic, setActiveTopic, navigateToVoiceView } = useVoiceAccess();
    const { academicStatus } = useLearningEngine();
    
    // In a real app, we'd pull the user from context, but for now we default to Grade 10 logic
    // or simulate based on the first grade found.
    const [topics] = useState<Topic[]>(() => {
        const gradeData = allGrades.find(g => g.grade === '10' || g.grade === 'Grade 10');
        if (gradeData) {
            const flatTopics: Topic[] = [];
            gradeData.subjects.forEach(s => flatTopics.push(...s.topics));
            return flatTopics.slice(0, 5); // Just first 5 for the voice list
        }
        return [];
    });

    // Removed useEffect that was doing synchronous setState

    const handleTopicSelect = (topic: Topic) => {
        setActiveTopic(topic);
        navigateToVoiceView('lesson');
    };

    return (
        <div className="bg-[#101822] text-white h-full flex flex-col font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center bg-[#101822] px-6 py-4 justify-between border-b border-gray-800 shrink-0">
                <div className="text-[#136dec] flex size-10 shrink-0 items-center justify-center">
                    <Eye size={32} />
                </div>
                <h2 className="text-white text-base font-bold leading-tight tracking-[0.15em] flex-1 text-center uppercase">LEARNING PATH</h2>
                <div className={`flex size-10 items-center justify-center rounded-full bg-[#136dec]/20 text-[#136dec] ${voiceState === 'listening' ? 'animate-pulse' : ''}`}>
                    <Mic size={24} />
                </div>
            </header>

            {/* Main Content - Linear List for Accessibility */}
            <main className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
                <div className="mb-4 px-2">
                    <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">Next Recommended</p>
                </div>

                {topics.map((topic, index) => {
                    const isNext = index === 0; // Simplified logic
                    return (
                        <button 
                            key={topic.id}
                            onClick={() => handleTopicSelect(topic)}
                            className={`flex flex-col p-6 rounded-3xl text-left border-2 transition-all active:scale-95
                                ${isNext 
                                    ? 'bg-[#136dec] border-[#136dec] shadow-lg shadow-blue-900/50' 
                                    : 'bg-[#1a202c] border-gray-800 hover:border-gray-600'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-black uppercase px-2 py-1 rounded-md ${isNext ? 'bg-white text-[#136dec]' : 'bg-gray-700 text-gray-300'}`}>
                                    {isNext ? 'Start Now' : `Unit ${index + 1}`}
                                </span>
                                {isNext ? <PlayCircle size={24} /> : <Lock size={20} className="text-gray-600" />}
                            </div>
                            <h3 className={`text-xl font-bold leading-tight mb-1 ${isNext ? 'text-white' : 'text-gray-300'}`}>
                                {topic.title}
                            </h3>
                            <p className={`text-xs ${isNext ? 'text-blue-100' : 'text-gray-500'} line-clamp-1`}>
                                {topic.description}
                            </p>
                        </button>
                    );
                })}
            </main>
        </div>
    );
};

export default VoiceJourney;
