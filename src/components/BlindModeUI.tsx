
import React from 'react';
import { useVoiceAccess } from '../contexts/VoiceAccessContext';
import { X } from 'lucide-react';
import VoiceDashboard from './voice/VoiceDashboard';
import VoiceJourney from './voice/VoiceJourney';
import VoiceLesson from './voice/VoiceLesson';
import VoiceBattle from './voice/VoiceBattle';

const BlindModeUI: React.FC = () => {
    const { isBlindModeActive, toggleBlindMode, currentVoiceView, triggerListening } = useVoiceAccess();

    if (!isBlindModeActive) return null;

    const renderView = () => {
        switch (currentVoiceView) {
            case 'journey': return <VoiceJourney />;
            case 'lesson': return <VoiceLesson />;
            case 'battle': return <VoiceBattle />;
            case 'dashboard':
            default: return <VoiceDashboard />;
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[100] bg-black text-white"
            onClick={triggerListening}
            aria-live="assertive"
        >
            {/* Render Active Voice View */}
            <div className="h-full w-full">
                {renderView()}
            </div>

            {/* Global Exit Button (Always accessible top-right) */}
            <button 
                onClick={(e) => { e.stopPropagation(); toggleBlindMode(); }}
                className="absolute top-4 right-4 p-4 bg-white text-black rounded-full font-bold shadow-2xl border-4 border-yellow-300 z-[110]"
                aria-label="Exit Voice Mode"
            >
                <X size={32} />
            </button>
        </div>
    );
};

export default BlindModeUI;
