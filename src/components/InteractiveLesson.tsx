
import React from 'react';
import { Topic, StudyMode } from '../types';
import VisualGuide from './VisualGuide';
import DeepDiveLesson from './DeepDiveLesson';
import RevisionNotes from './RevisionNotes';

interface InteractiveLessonProps {
    topic: Topic;
    mode: StudyMode;
    onBack: () => void;
    onComplete: () => void;
    onNavigate: (view: string) => void;
    onObjectivesCovered?: (objectives: string[]) => void;
}

/**
 * Dispatcher Component
 * Routes the user to the correct lesson interface based on the selected study mode.
 */
const InteractiveLesson: React.FC<InteractiveLessonProps> = ({ topic, mode, onBack, onComplete, onNavigate, onObjectivesCovered }) => {
    switch (mode) {
        case 'intro':
            return <VisualGuide topic={topic} onBack={onBack} onComplete={onComplete} onNavigate={onNavigate} onObjectivesCovered={onObjectivesCovered} />;
        case 'deep-dive':
            return <DeepDiveLesson topic={topic} onBack={onBack} onComplete={onComplete} onNavigate={onNavigate} onObjectivesCovered={onObjectivesCovered} />;
        case 'exam-prep':
            return <RevisionNotes topic={topic} onBack={onBack} onNavigate={onNavigate} />;
        default:
            return <VisualGuide topic={topic} onBack={onBack} onComplete={onComplete} onNavigate={onNavigate} onObjectivesCovered={onObjectivesCovered} />;
    }
};

export default InteractiveLesson;
