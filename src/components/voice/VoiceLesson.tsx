
import React, { useEffect, useState, useCallback } from 'react';
import { useVoiceAccess } from '../../contexts/VoiceAccessContext';
import { aiClient } from '../../utils/aiClient';
import { Mic, Activity, HelpCircle, Volume2 } from 'lucide-react';

const VoiceLesson: React.FC = () => {
    const { voiceState, activeTopic, aiMessage, speak, registerCommand, unregisterCommand } = useVoiceAccess();
    const [lessonContent, setLessonContent] = useState<string>("Loading lesson content...");
    const [imageDesc, setImageDesc] = useState<string>("Loading visual description...");
    
    // State Persistence
    const [currentStep, setCurrentStep] = useState(() => {
        if (activeTopic) {
            const key = `motlatsi_voice_lesson_pos_${activeTopic.id}`;
            const saved = localStorage.getItem(key);
            return saved ? parseInt(saved, 10) : 0;
        }
        return 0;
    });
    const PERSIST_KEY = activeTopic ? `motlatsi_voice_lesson_pos_${activeTopic.id}` : null;

    const handleStep = useCallback((delta: number) => {
        if (delta === -999) {
            setCurrentStep(0);
            speak("Restarting lesson. " + lessonContent);
        } else {
            // Simplified logic: toggling between summary (0) and visual (1) for now
            // In a real app, 'lessonContent' would be an array of steps
            const newStep = currentStep + delta;
            if (newStep === 0) {
                setCurrentStep(0);
                speak(lessonContent);
            } else if (newStep === 1) {
                setCurrentStep(1);
                speak("Visual Description: " + imageDesc);
            } else {
                speak("End of lesson. Say 'Dashboard' to exit.");
            }
        }
    }, [lessonContent, imageDesc, currentStep, speak]);

    const generateLessonContent = useCallback(async () => {
        try {
            if (currentStep === 0) {
                speak(`Opening ${activeTopic?.title}. Please wait a moment while I prepare the audio description.`);
            }
            
            const prompt = `
                Create a text-only audio script for a blind student about "${activeTopic?.title}".
                Structure:
                1. Brief Summary (2 sentences).
                2. Visual Description of a key diagram (e.g. "Imagine a circle...").
                3. One interactive question.
                
                Return JSON: { "summary": "...", "visual": "..." }
            `;
            
            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            const data = JSON.parse(response.text || "{}");
            setLessonContent(data.summary || "Content unavailable.");
            setImageDesc(data.visual || "No visual description available.");
            
            // Auto-speak result if just loaded
            if (currentStep === 0) {
                setTimeout(() => {
                    speak(`${data.summary}. Say 'Next' to hear the visual description.`);
                }, 1000);
            }

        } catch (e) {
            setLessonContent("Error loading content.");
        }
    }, [activeTopic, currentStep, speak]);

    useEffect(() => {
        // Removed synchronous load from localStorage

        // Register Navigation Commands
        const cmds = [
            // Fix: Added required 'description' property to comply with VoiceCommand interface
            { id: 'nav-next', regex: /^(next|continue|go on|forward)/i, action: () => handleStep(1), description: 'Go to the next step of the lesson' },
            { id: 'nav-prev', regex: /^(back|previous|repeat|replay)/i, action: () => handleStep(-1), description: 'Go back to the previous step or repeat' },
            { id: 'nav-restart', regex: /^(restart|start over|beginning)/i, action: () => handleStep(-999), description: 'Restart the lesson from the beginning' }
        ];
        
        cmds.forEach(c => registerCommand(c));

        if (activeTopic) {
            // Use a small timeout or just rely on the fact that it's async
            // but the linter specifically hates it being called directly if it updates state.
            // Actually, calling an async function that updates state is fine if it's not immediate.
            // Let's wrap it in a microtask or just ensure it's safe.
            const timer = setTimeout(() => {
                generateLessonContent();
            }, 0);
            return () => {
                cmds.forEach(c => unregisterCommand(c.id));
                clearTimeout(timer);
            };
        }

        return () => {
            cmds.forEach(c => unregisterCommand(c.id));
        };
    }, [activeTopic, handleStep, generateLessonContent, registerCommand, unregisterCommand]);

    // Save position on change
    useEffect(() => {
        if (PERSIST_KEY) localStorage.setItem(PERSIST_KEY, currentStep.toString());
    }, [currentStep, PERSIST_KEY]);

    return (
        <div className="bg-[#101822] font-sans text-white h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center p-4 pb-2 justify-between z-20 border-b border-gray-800">
                <div className="text-[#136dec] flex size-12 shrink-0 items-center">
                    <Activity size={32} />
                </div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">Audio Lesson</h2>
                <div className="flex w-12 items-center justify-end">
                    <HelpCircle size={32} className="text-gray-500" />
                </div>
            </div>

            {/* Main Content */}
            <div className="relative flex-1 flex flex-col items-center justify-center p-4">
                
                {/* Visual Placeholder (Abstract) */}
                <div className="relative w-64 h-64 border-4 border-[#136dec]/20 rounded-full flex items-center justify-center mb-8 animate-pulse">
                    <Volume2 size={64} className="text-[#136dec]" />
                </div>

                {/* Content Card */}
                <div className="z-20 bg-[#1a202c] rounded-2xl p-8 w-full max-w-md border border-gray-700 shadow-xl text-center">
                    <h2 className="text-[#136dec] tracking-tight text-2xl font-bold leading-tight mb-4">{activeTopic?.title}</h2>
                    <div className="h-1 w-16 bg-[#136dec] mx-auto mb-6 rounded-full"></div>
                    <p className="text-gray-300 text-lg font-medium leading-relaxed">
                        {aiMessage}
                    </p>
                    <p className="text-gray-500 text-xs mt-4 uppercase tracking-widest">Step {currentStep + 1}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-30 pb-12 flex flex-col items-center gap-4 bg-[#101822] pt-4">
                <div className={`size-24 bg-[#136dec] rounded-full flex items-center justify-center text-white shadow-lg transition-transform ${voiceState === 'listening' ? 'scale-110 shadow-xl shadow-blue-500/40' : ''}`}>
                    <Mic size={40} />
                </div>
                <p className="text-gray-500 text-sm font-bold tracking-widest uppercase">
                    {voiceState === 'listening' ? 'Listening...' : 'Tap to Speak'}
                </p>
            </div>
        </div>
    );
};

export default VoiceLesson;
