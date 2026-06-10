
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Topic, AccessibilitySettings, StudyMode } from '../types';
import { aiClient } from '../utils/aiClient';
import { safeJsonParse, supportsSpeechRecognition } from '../utils/aiHelpers';
import { 
    ArrowLeft, Play, Pause, FastForward, Rewind, Sparkles, AlertTriangle, 
    Volume2, Settings, Headphones, X, Type, Mic2, MessageCircle, Loader2, Mic
} from 'lucide-react';

interface InclusiveAudioProps {
    topic: Topic;
    onBack: () => void;
    settings: AccessibilitySettings;
    mode?: StudyMode;
    onObjectivesCovered?: (objectives: string[]) => void;
}

export default function InclusiveAudio({ topic, onBack, settings, mode = 'intro', onObjectivesCovered }: InclusiveAudioProps) {
    const [script, setScript] = useState<{text: string, highlight: boolean}[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLine, setCurrentLine] = useState(0);
    const [speed, setSpeed] = useState(1);
    
    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    
    // Q&A / Assistant State
    const [showQA, setShowQA] = useState(false);
    const [qaInput, setQaInput] = useState('');
    const [qaAnswer, setQaAnswer] = useState('');
    const [isQaListening, setIsQaListening] = useState(false);
    const [isQaProcessing, setIsQaProcessing] = useState(false);
    const [canUseSpeech, setCanUseSpeech] = useState(false);

    // Use Ref to track speech synthesis state to avoid closure staleness
    const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

    const SESSION_KEY = `motlatsi_audio_session_v2_${topic.id}_${mode}`;

    const generateContent = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const systemInstruction = `
                You are a friendly educational storyteller for students in Lesotho.
                Create an engaging audio script that is encouraging and slow-paced.
                
                Style: Podcast / Storytelling.
                Tone: Friendly, encouraging.
                
                Content Structure:
                1. Warm welcome.
                2. Core concept explanation (simplified).
                3. Real-world example (Lesotho context: mountains, village, school).
                4. A thinking question.
                5. Encouraging closing.
                
                Format: Strictly a JSON array of objects with "text" (string) and "highlight" (boolean, default false).
            `;

            const prompt = `Create an audio script about "${topic.title}".`;
            
            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    temperature: 0.3,
                    systemInstruction
                },
                cacheKey: `audio_${topic.id}_script`
            });
            const text = response.text;
            if (!text) {
                console.error("AI returned empty response for audio script");
                throw new Error("Empty response");
            }

            const parsed = safeJsonParse<{text: string, highlight: boolean}[]>(text);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                setScript(parsed);
                localStorage.setItem(SESSION_KEY, JSON.stringify({ script: parsed }));
                // Report objectives as covered
                if (onObjectivesCovered && topic.learningObjectives) {
                    onObjectivesCovered(topic.learningObjectives.slice(0, 3));
                }
            } else {
                console.error("Invalid script format received:", response.text);
                throw new Error("Invalid script format");
            }
        } catch (e: any) {
            console.error("Audio Generation Error:", e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [topic.id, topic.title, topic.learningObjectives, onObjectivesCovered, SESSION_KEY]);

    // Separate effect for objectives to avoid rendering issues
    useEffect(() => {
        if (onObjectivesCovered && topic.learningObjectives) {
            onObjectivesCovered(topic.learningObjectives.slice(0, 3));
        }
    }, [topic.id, onObjectivesCovered, topic.learningObjectives]);

    // Separate effect for voice loading
    useEffect(() => {
        const loadVoices = () => {
            const avail = window.speechSynthesis.getVoices();
            setVoices(avail);
            if (!selectedVoice && avail.length > 0) {
                // Prefer English voices
                const pref = avail.find(v => v.lang.startsWith('en-US') && v.name.includes('Google')) || avail.find(v => v.lang.startsWith('en')) || avail[0];
                setSelectedVoice(pref);
            }
        };
        
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        
        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, [selectedVoice]);

    useEffect(() => {
        setCanUseSpeech(supportsSpeechRecognition());
        
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setScript(data.script);
                setLoading(false);
            } catch (e) {
                generateContent();
            }
        } else {
            generateContent();
        }
        
        return () => {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        };
    }, [topic.id, mode, SESSION_KEY, generateContent]);

    const togglePlay = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            speakLine(currentLine);
        }
    };

    const speakLine = (index: number) => {
        if (index >= script.length) {
            setIsPlaying(false);
            setCurrentLine(0);
            return;
        }
        
        // Ensure previous speech is cleared
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(script[index].text);
        utterance.rate = speed;
        utterance.pitch = 1.1; 
        if (selectedVoice) utterance.voice = selectedVoice;
        
        utterance.onend = () => {
            // Check if we are still playing (might have been paused by user or Q&A)
            // We use a small timeout to allow state updates to settle
            setTimeout(() => {
                setIsPlaying(prev => {
                    if (prev) {
                        setCurrentLine(curr => {
                            const next = curr + 1;
                            if (next < script.length) {
                                speakLine(next);
                                return next;
                            }
                            return 0; // Reset or End
                        });
                        return prev;
                    }
                    return false;
                });
            }, 50);
        };

        synthesisRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const changeSpeed = () => {
        const newSpeed = speed === 1 ? 0.75 : speed === 0.75 ? 1.25 : 1;
        setSpeed(newSpeed);
        if (isPlaying) {
            window.speechSynthesis.cancel();
            speakLine(currentLine);
        }
    };

    const skip = (direction: 'next' | 'prev') => {
        window.speechSynthesis.cancel();
        let next = direction === 'next' ? currentLine + 1 : currentLine - 1;
        if (next < 0) next = 0;
        if (next >= script.length) next = 0;
        setCurrentLine(next);
        if (isPlaying) speakLine(next);
    };

    // --- Q&A / Assistant Logic ---

    const startQAMode = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setShowQA(true);
        setQaInput('');
        setQaAnswer('');
        if (canUseSpeech) startListening();
    };

    const startListening = () => {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsQaListening(true);
        recognition.onend = () => setIsQaListening(false);
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setQaInput(transcript);
            // Auto-submit after silence/result
            handleAskAI(transcript);
        };
        
        recognition.start();
    };

    const handleAskAI = async (question: string) => {
        if (!question.trim()) return;
        setIsQaProcessing(true);
        
        try {
            const prompt = `
                The student paused an audio lesson about "${topic.title}" to ask: "${question}".
                Provide a short, simple, spoken-style answer (max 2 sentences).
                Tone: Helpful tutor.
            `;
            
            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                cacheKey: `audio_${topic.id}_qa_${question.trim().toLowerCase().replace(/\s+/g, '_')}`
            });
            
            const answer = response.text || "I'm not sure, let's keep listening to the lesson.";
            setQaAnswer(answer);
            
            // Speak Answer
            const utterance = new SpeechSynthesisUtterance(answer);
            if (selectedVoice) utterance.voice = selectedVoice;
            window.speechSynthesis.speak(utterance);

        } catch (e) {
            setQaAnswer("Sorry, I couldn't connect. Try again.");
        } finally {
            setIsQaProcessing(false);
        }
    };

    const closeQA = () => {
        window.speechSynthesis.cancel();
        setShowQA(false);
        // Automatically resume
        setIsPlaying(true);
        speakLine(currentLine);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-white md:rounded-3xl shadow-sm border-0 md:border border-gray-100">
            <div className="flex flex-col items-center p-8 text-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                    <Sparkles className="relative z-10 text-teacherBlue mb-4" size={48} />
                </div>
                <p className="font-bold text-gray-700 animate-pulse mt-4">Creating your audio experience...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-white md:rounded-3xl shadow-sm border-0 md:border border-gray-100 p-6 text-center">
            <AlertTriangle className="text-red-500 mb-4" size={48} />
            <p className="text-lg font-bold text-gray-900 mb-2">Audio Unavailable</p>
            <p className="text-sm text-gray-500 mb-6">We couldn't generate the audio lesson at this time.</p>
            <div className="flex gap-3">
                <button onClick={generateContent} className="px-6 py-2 bg-teacherBlue text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors">Retry</button>
                <button onClick={onBack} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Go Back</button>
            </div>
        </div>
    );

    // Calculate progress
    const progress = (currentLine / script.length) * 100;

    return (
        <div className="flex flex-col items-center justify-center w-full h-screen md:h-auto md:min-h-[600px] md:py-8 bg-[#F3F4F6] dark:bg-[#111421]">
            {/* Main Player Card */}
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-none md:rounded-3xl shadow-none md:shadow-xl border-0 md:border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col relative h-full md:h-[600px]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 z-20 bg-white dark:bg-slate-800 relative shrink-0">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-300 transition-colors -ml-2">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-teacherBlue uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full mb-1">Focus Mode</span>
                        <h1 className="text-sm font-bold text-gray-900 dark:text-white max-w-[200px] truncate text-center">{topic.title}</h1>
                    </div>
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-full transition-colors -mr-2 ${showSettings ? 'bg-blue-50 dark:bg-blue-900/30 text-teacherBlue' : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-400 dark:text-gray-300'}`}
                    >
                        <Settings size={20} />
                    </button>
                </div>

                {/* Q&A Overlay */}
                {showQA && (
                    <div className="absolute inset-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <MessageCircle size={20} className="text-teacherBlue" /> Ask Teacher
                            </h3>
                            <button onClick={closeQA} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full hover:bg-gray-200">
                                <X size={20} className="text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                            {qaAnswer ? (
                                <>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800 w-full">
                                        <p className="text-lg font-medium text-blue-900 dark:text-blue-100 leading-relaxed">"{qaAnswer}"</p>
                                    </div>
                                    <button 
                                        onClick={closeQA}
                                        className="w-full py-4 bg-teacherBlue text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Play size={20} fill="currentColor" /> Resume Lesson
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className={`p-8 rounded-full bg-red-50 dark:bg-red-900/20 mb-4 transition-all duration-500 ${isQaListening ? 'scale-125 bg-red-100 shadow-xl shadow-red-500/20' : ''}`}>
                                        <Mic size={48} className={isQaListening ? "text-red-500 animate-pulse" : "text-gray-400"} />
                                    </div>
                                    
                                    {isQaProcessing ? (
                                        <div className="flex items-center gap-2 text-teacherBlue font-bold animate-pulse">
                                            <Loader2 size={20} className="animate-spin" /> Thinking...
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-xl font-bold text-gray-800 dark:text-white">
                                                {isQaListening ? "Listening..." : "Tap to Speak"}
                                            </p>
                                            {qaInput && <p className="text-sm text-gray-500 italic">"{qaInput}"</p>}
                                            
                                            {!isQaListening && (
                                                <button 
                                                    onClick={startListening} 
                                                    className="px-8 py-3 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-700 dark:text-white shadow-sm"
                                                >
                                                    Start Speaking
                                                </button>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Settings Overlay */}
                {showSettings && (
                    <div className="absolute inset-x-0 top-[72px] bottom-0 z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl animate-in slide-in-from-top-4 p-6 flex flex-col gap-6">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Type size={16} className="text-teacherBlue" /> Text Size
                            </h3>
                            <div className="flex gap-2 bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
                                <button 
                                    onClick={() => setFontSize('normal')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${fontSize === 'normal' ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    Normal
                                </button>
                                <button 
                                    onClick={() => setFontSize('large')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${fontSize === 'large' ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    Large
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Mic2 size={16} className="text-teacherBlue" /> Voice Selection
                            </h3>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                {voices.length > 0 ? voices.filter(v => v.lang.startsWith('en')).map((v, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedVoice(v)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all border ${selectedVoice?.name === v.name ? 'border-teacherBlue bg-blue-50 dark:bg-blue-900/30 text-teacherBlue' : 'border-gray-100 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}
                                    >
                                        {v.name.replace('Microsoft', '').replace('Google', '').trim()}
                                    </button>
                                )) : (
                                    <p className="text-xs text-gray-400 italic">No alternative voices available on this device.</p>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowSettings(false)}
                            className="mt-auto w-full py-3 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            Close Settings
                        </button>
                    </div>
                )}

                {/* Visualizer Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden min-h-0 bg-white dark:bg-slate-800">
                    {/* Animated Background Blob */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-[50px] transition-all duration-1000 ${isPlaying ? 'scale-125 opacity-100' : 'scale-100 opacity-50'}`}></div>

                    {/* Central Icon */}
                    <div className="relative z-10 mb-6">
                        <div className="size-20 bg-gradient-to-tr from-white to-blue-50 dark:from-slate-700 dark:to-blue-900 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white dark:border-slate-600">
                            <Headphones size={32} className={`text-teacherBlue dark:text-blue-400 transition-transform duration-500 ${isPlaying ? 'scale-110' : 'scale-100'}`} />
                        </div>
                        {isPlaying && (
                            <>
                                <div className="absolute inset-0 rounded-full border-2 border-blue-100 dark:border-blue-800 animate-ping opacity-20"></div>
                                <div className="absolute -inset-2 rounded-full border border-blue-50 dark:border-blue-900 animate-pulse opacity-40"></div>
                            </>
                        )}
                    </div>

                    {/* Active Text */}
                    <div className="relative z-10 text-center space-y-3 w-full max-w-[90%]">
                        <p className={`font-bold text-gray-900 dark:text-white leading-snug transition-all duration-300 ${isPlaying ? 'scale-105' : 'opacity-90'} ${fontSize === 'large' ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'}`}>
                            "{script[currentLine]?.text}"
                        </p>
                        
                        {/* Next Line Preview */}
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium h-4 transition-opacity duration-300 truncate">
                            {script[currentLine + 1] ? "Next: " + script[currentLine + 1].text : "End of lesson"}
                        </p>
                    </div>
                </div>

                {/* Controls Area */}
                <div className="px-6 py-5 bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 shrink-0">
                    <div className="space-y-5">
                        {/* Progress Bar */}
                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono">
                            <span>{Math.floor(progress)}%</span>
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-teacherBlue rounded-full transition-all duration-500 ease-out" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <span>100%</span>
                        </div>

                        {/* Main Controls - Improved Layout */}
                        <div className="flex items-center justify-between px-1">
                            {/* Ask Teacher Button */}
                            <button 
                                onClick={startQAMode}
                                className="flex flex-col items-center justify-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-teacherBlue transition-colors w-14"
                            >
                                <div className="p-2 bg-white dark:bg-slate-700 rounded-full border border-gray-200 dark:border-slate-600 shadow-sm">
                                    <MessageCircle size={18} />
                                </div>
                                <span className="text-[9px] uppercase tracking-wide">Ask</span>
                            </button>

                            <div className="flex items-center gap-6">
                                <button onClick={() => skip('prev')} className="text-gray-400 hover:text-teacherBlue transition-colors p-1">
                                    <Rewind size={26} />
                                </button>
                                
                                <button 
                                    onClick={togglePlay}
                                    className="size-16 bg-teacherBlue text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/50 shrink-0"
                                >
                                    {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
                                </button>

                                <button onClick={() => skip('next')} className="text-gray-400 hover:text-teacherBlue transition-colors p-1">
                                    <FastForward size={26} />
                                </button>
                            </div>

                            {/* Speed Button */}
                            <button 
                                onClick={changeSpeed} 
                                className="flex flex-col items-center justify-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-teacherBlue transition-colors w-14"
                            >
                                <div className="px-2 py-1.5 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm w-10 text-center">
                                    {speed}x
                                </div>
                                <span className="text-[9px] uppercase tracking-wide">Speed</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
