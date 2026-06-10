
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { UserState, Topic } from '../types';
import { ensureMicrophonePermission } from '../utils/aiHelpers';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';
export type VoiceViewType = 'dashboard' | 'journey' | 'lesson' | 'battle' | 'chat' | 'lab';

export interface VoiceCommand {
    id: string;
    keywords?: string[];
    regex?: RegExp;
    action: () => void;
    description: string;
}

interface VoiceAccessContextType {
    isBlindModeActive: boolean;
    toggleBlindMode: () => void;
    voiceState: VoiceState;
    setVoiceState: (state: VoiceState) => void;
    aiMessage: string;
    setAiMessage: (msg: string) => void;
    lastTranscript: string;
    activeTopic: Topic | null;
    setActiveTopic: (topic: Topic | null) => void;
    currentVoiceView: VoiceViewType;
    navigateToVoiceView: (view: VoiceViewType) => void;
    registerCommand: (cmd: VoiceCommand) => void;
    unregisterCommand: (id: string) => void;
    speak: (text: string) => void;
    stopSpeaking: () => void;
    triggerListening: () => void;
    playEarcon: (type: 'on' | 'off' | 'success' | 'error' | 'rising') => void;
}

const VoiceAccessContext = createContext<VoiceAccessContextType | undefined>(undefined);

export const VoiceAccessProvider: React.FC<{ children: React.ReactNode; user: UserState | null }> = ({ children, user }) => {
    const [isBlindModeActive, setIsBlindModeActive] = useState(false);
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [aiMessage, setAiMessage] = useState("Tap screen to speak");
    const [lastTranscript, setLastTranscript] = useState("");
    const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
    const [currentVoiceView, setCurrentVoiceView] = useState<VoiceViewType>('dashboard');
    const [commands, setCommands] = useState<VoiceCommand[]>([]);
    
    const recognitionRef = useRef<any>(null);
    const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        setVoiceState('speaking');
        setAiMessage(text);
        
        utterance.onend = () => {
            setVoiceState('idle');
            setAiMessage("Tap to speak");
        };
        
        synthesisRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setVoiceState('idle');
    };

    const playEarcon = (type: 'on' | 'off' | 'success' | 'error' | 'rising') => {
        const audio = new Audio();
        switch (type) {
            case 'on': audio.src = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'; break;
            case 'off': audio.src = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'; break;
            case 'success': audio.src = 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'; break;
            case 'error': audio.src = 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'; break;
            case 'rising': audio.src = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'; break; // Placeholder
        }
        audio.volume = 0.3;
        audio.play().catch(() => {});
    };

    const processCommand = (transcript: string) => {
        let matched = false;
        
        // 1. Direct Keyword Match
        for (const cmd of commands) {
            if (cmd.keywords && cmd.keywords.some(k => transcript.includes(k.toLowerCase()))) {
                cmd.action();
                matched = true;
                break;
            }
            if (cmd.regex && cmd.regex.test(transcript)) {
                cmd.action();
                matched = true;
                break;
            }
        }

        if (!matched) {
            // Fallback: AI processing could happen here, for now just feedback
            speak("I didn't catch that command. Try again.");
            setVoiceState('idle');
        } else {
            playEarcon('success');
            setVoiceState('idle');
        }
    };

    const processCommandRef = useRef(processCommand);
    const voiceStateRef = useRef(voiceState);

    useEffect(() => {
        processCommandRef.current = processCommand;
        voiceStateRef.current = voiceState;
    });

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setVoiceState('listening');
                setAiMessage("Listening...");
            };

            recognition.onend = () => {
                if (voiceStateRef.current === 'listening') {
                    setVoiceState('idle');
                    setAiMessage("Tap to speak");
                }
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                setLastTranscript(transcript);
                setVoiceState('processing');
                processCommandRef.current(transcript);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setVoiceState('idle');
                playEarcon('error');
            };

            recognitionRef.current = recognition;
        }
    }, [commands]); // Re-bind if commands change significantly, though processing uses ref/state

    const toggleBlindMode = () => {
        const newState = !isBlindModeActive;
        setIsBlindModeActive(newState);
        if (newState) {
            playEarcon('on');
            speak("Voice Access Enabled. Double tap anywhere to speak.");
        } else {
            playEarcon('off');
            speak("Voice Access Disabled.");
        }
    };

    const triggerListening = async () => {
        if (voiceState === 'speaking') {
            stopSpeaking();
            return;
        }
        
        if (recognitionRef.current && voiceState !== 'listening') {
            setVoiceState('processing');
            setAiMessage("Activating Mic...");
            const permissionGranted = await ensureMicrophonePermission();
            
            if (!permissionGranted) {
                setVoiceState('idle');
                setAiMessage("Mic Access Required");
                playEarcon('error');
                speak("Microphone access is required to use speech controls.");
                return;
            }

            try {
                playEarcon('on');
                recognitionRef.current.start();
            } catch (e) {
                // Already started or error
                recognitionRef.current.stop();
            }
        }
    };

    const registerCommand = useCallback((cmd: VoiceCommand) => {
        setCommands(prev => {
            if (prev.find(c => c.id === cmd.id)) return prev;
            return [...prev, cmd];
        });
    }, []);

    const unregisterCommand = useCallback((id: string) => {
        setCommands(prev => prev.filter(c => c.id !== id));
    }, []);

    const navigateToVoiceView = (view: VoiceViewType) => {
        setCurrentVoiceView(view);
        speak(`Opening ${view}`);
    };

    return (
        <VoiceAccessContext.Provider value={{
            isBlindModeActive,
            toggleBlindMode,
            voiceState,
            setVoiceState,
            aiMessage,
            setAiMessage,
            lastTranscript,
            activeTopic,
            setActiveTopic,
            currentVoiceView,
            navigateToVoiceView,
            registerCommand,
            unregisterCommand,
            speak,
            stopSpeaking,
            triggerListening,
            playEarcon
        }}>
            {children}
        </VoiceAccessContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useVoiceAccess = () => {
    const context = useContext(VoiceAccessContext);
    if (!context) {
        throw new Error('useVoiceAccess must be used within a VoiceAccessProvider');
    }
    return context;
};
