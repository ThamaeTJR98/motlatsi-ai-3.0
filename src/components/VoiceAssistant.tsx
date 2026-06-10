
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserState } from '../types';
import { aiClient } from '../utils/aiClient';
import { safeJsonParse, supportsSpeechRecognition, ensureMicrophonePermission } from '../utils/aiHelpers';
import { X, Settings, Mic, StopCircle, ArrowRight, Sparkles } from 'lucide-react';

interface VoiceAssistantProps {
    user: UserState;
    onBack: () => void;
    onNavigate: (view: string) => void;
}

type VoiceState = 'listening' | 'thinking' | 'responding';

interface AIResponse {
    text: string;
    cardType?: 'progress' | 'general';
    cardData?: any;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ user, onBack, onNavigate }) => {
    const [state, setState] = useState<VoiceState>('listening');
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
    const recognitionRef = useRef<any>(null);
    
    // --- Styles for Animations (Compact Version) ---
    const styles = `
        .glass-panel {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }
        .ai-orb-container {
            position: relative;
            width: 180px; /* Reduced from 260px */
            height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ai-orb {
            position: relative;
            width: 130px; /* Reduced from 200px */
            height: 130px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #ffffff 0%, #3b82f6 40%, #1e40af 100%);
            box-shadow: 0 0 50px rgba(19, 109, 236, 0.4), inset 0 0 30px rgba(255, 255, 255, 0.6);
            overflow: hidden;
            z-index: 10;
        }
        /* Listening State Animations */
        .ai-orb.listening {
            background: radial-gradient(circle at 30% 30%, #ffffff 0%, #3b82f6 40%, #1e40af 100%);
        }
        .ai-orb.listening::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: conic-gradient(from 0deg, transparent, rgba(255, 255, 255, 0.6), rgba(59, 130, 246, 0.4), transparent);
            animation: rotate-fast 3s linear infinite;
        }
        .waveform-ring {
            position: absolute;
            border: 2px solid rgba(19, 109, 236, 0.3);
            border-radius: 50%;
            animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        }
        /* Adjusted rings for compact size */
        .waveform-ring:nth-child(1) { width: 140px; height: 140px; animation-delay: 0s; }
        .waveform-ring:nth-child(2) { width: 160px; height: 160px; animation-delay: 0.4s; border-color: rgba(19, 109, 236, 0.2); }
        .waveform-ring:nth-child(3) { width: 180px; height: 180px; animation-delay: 0.8s; border-color: rgba(19, 109, 236, 0.1); }
        
        /* Thinking State Animations */
        .ai-orb.thinking {
            background: radial-gradient(circle at 30% 30%, #ffffff 0%, #8b5cf6 40%, #4f46e5 100%);
            box-shadow: 0 0 40px rgba(139, 92, 246, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.5);
        }
        .ai-orb.thinking::before {
            background: conic-gradient(from 0deg, transparent, rgba(255, 255, 255, 0.8), rgba(139, 92, 246, 0.6), transparent);
            animation: synaptic-activity 1.5s linear infinite;
        }
        .loading-ring {
            position: absolute;
            width: 150px;
            height: 150px;
            border: 2px solid transparent;
            border-top-color: rgba(99, 102, 241, 0.6);
            border-radius: 50%;
            animation: rotate-smooth 2s linear infinite;
        }
        .loading-ring-outer {
            position: absolute;
            width: 165px;
            height: 165px;
            border: 1px dashed rgba(99, 102, 241, 0.2);
            border-radius: 50%;
        }
        
        /* Responding State Animations */
        .ai-orb.responding {
            background: radial-gradient(circle at 30% 30%, #ffffff 0%, #10b981 40%, #059669 100%);
            box-shadow: 0 0 40px rgba(16, 185, 129, 0.3);
        }
        
        @keyframes rotate-fast { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes rotate-smooth { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 0.4; border-width: 3px; }
            100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes synaptic-activity {
            from { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
            to { transform: rotate(360deg) scale(1); }
        }
        @keyframes pulse-red { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .pulse-recording { animation: pulse-red 1s ease-in-out infinite; }
        
        .mic-aura {
            box-shadow: 0 0 0 0 rgba(19, 109, 236, 0.7);
            animation: mic-glow 2s infinite;
        }
        @keyframes mic-glow {
            0% { box-shadow: 0 0 0 0 rgba(19, 109, 236, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(19, 109, 236, 0); }
            100% { box-shadow: 0 0 0 0 rgba(19, 109, 236, 0); }
        }
        .voice-bar {
            width: 3px;
            background: #136dec;
            border-radius: 2px;
            animation: voice-height 1s ease-in-out infinite alternate;
        }
        @keyframes voice-height { 0% { height: 6px; } 100% { height: 18px; } }
        
        .dot-pulse { animation: dot-flicker 1.5s infinite; }
        @keyframes dot-flicker { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
    `;

    const handleProcessQuery = useCallback(async (query: string) => {
        setState('thinking');
        
        try {
            const prompt = `
                You are Motlatsi, an educational assistant for a student named ${user.name} in Grade ${user.currentGrade}.
                Query: "${query}"
                
                If the user asks about progress, grades, or performance, return JSON:
                {
                    "cardType": "progress",
                    "cardData": {
                        "subject": "Subject Name",
                        "percentage": 85,
                        "completed": 8,
                        "total": 10,
                        "curriculum": "Grade ${user.currentGrade} Syllabus"
                    },
                    "text": "Here is your progress report."
                }
                
                Otherwise, return JSON with:
                {
                    "cardType": "general",
                    "text": "Your helpful response here."
                }
            `;

            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' },
                organizationId: user.organization_id
            });

            const result = safeJsonParse<AIResponse>(response.text);
            
            if (result) {
                setAiResponse(result);
                const u = new SpeechSynthesisUtterance(result.text);
                window.speechSynthesis.speak(u);
            } else {
                setAiResponse({ text: "I'm sorry, I didn't catch that.", cardType: 'general' });
            }
            
            setState('responding');

        } catch (e) {
            console.error(e);
            setState('listening');
        }
    }, [user.name, user.currentGrade, user.organization_id]);

    useEffect(() => {
        if (supportsSpeechRecognition()) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const rec = new SpeechRecognition();
            rec.lang = 'en-US';
            rec.continuous = false;
            rec.interimResults = false;
            
            rec.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
                handleProcessQuery(text);
            };
            
            rec.onerror = (e: any) => {
                console.error("Speech error", e);
                setState('listening'); 
            };
            
            recognitionRef.current = rec;
        }
    }, [handleProcessQuery]);

    const startListening = async () => {
        if (recognitionRef.current) {
            setTranscript('');
            const permissionGranted = await ensureMicrophonePermission();
            if (!permissionGranted) {
                setTranscript("Microphone permission was denied.");
                return;
            }
            try {
                recognitionRef.current.start();
                setState('listening');
            } catch (e) {
                // Already started
            }
        } else {
            setTranscript("Speech recognition is not supported in this browser.");
        }
    };

    const handleReset = () => {
        setAiResponse(null);
        setTranscript('');
        setState('listening');
    };

    return (
        <div className="relative flex h-full w-full flex-col bg-[#f8fafc] overflow-hidden font-sans">
            <style>{styles}</style>
            
            {/* Header - Very Compact */}
            <div className="flex items-center px-4 py-3 justify-between z-10 shrink-0 bg-[#f8fafc]/90 backdrop-blur-sm">
                <button onClick={onBack} className="text-[#111418] flex size-8 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} />
                </button>
                <h2 className={`text-sm font-bold leading-tight tracking-tight flex-1 text-center ${state === 'thinking' ? 'text-[#4f46e5]' : 'text-[#136dec]'}`}>
                    Motlatsi AI
                </h2>
                <div className="flex w-8 items-center justify-end">
                    <button 
                        onClick={() => onNavigate('accessibility')}
                        className="flex items-center justify-center rounded-xl size-8 bg-transparent text-[#111418] hover:bg-gray-100 transition-colors"
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {/* Main Visual Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative px-6 min-h-0">
                
                {/* State: Thinking */}
                {state === 'thinking' && (
                    <>
                        <div className="ai-orb-container mb-6">
                            <div className="loading-ring-outer"></div>
                            <div className="loading-ring"></div>
                            <div className="ai-orb thinking">
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/50 mix-blend-overlay"></div>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md text-[#4f46e5] text-[10px] tracking-[0.15em] font-bold px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1 border border-[#8b5cf6]/10 mb-4">
                            THINKING
                            <span className="flex">
                                <span className="dot-pulse" style={{animationDelay: '0s'}}>.</span>
                                <span className="dot-pulse" style={{animationDelay: '0.2s'}}>.</span>
                                <span className="dot-pulse" style={{animationDelay: '0.4s'}}>.</span>
                            </span>
                        </div>
                        <div className="text-center max-w-[250px]">
                            <h1 className="text-[#111418] text-sm font-medium opacity-40">Processing your request...</h1>
                        </div>
                    </>
                )}

                {/* State: Listening */}
                {state === 'listening' && (
                    <>
                        <div className="ai-orb-container mb-6">
                            <div className="waveform-ring"></div>
                            <div className="waveform-ring"></div>
                            <div className="waveform-ring"></div>
                            <div className="ai-orb listening">
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/40 mix-blend-overlay"></div>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md text-[#136dec] text-[10px] tracking-[0.15em] font-bold px-4 py-1.5 rounded-full shadow-sm flex items-center gap-2 border border-[#136dec]/10 mb-4">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 pulse-recording"></span>
                            LISTENING
                        </div>
                        <div className="text-center max-w-[280px]">
                            <h1 className="text-[#111418] text-lg font-semibold opacity-60 leading-tight">
                                {transcript || "Go ahead, I'm listening..."}
                            </h1>
                        </div>
                    </>
                )}

                {/* State: Responding */}
                {state === 'responding' && aiResponse && (
                    <div className="w-full max-w-sm flex flex-col items-center">
                        <div className="mb-4 flex justify-center">
                             <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#136dec] via-blue-400 to-blue-600 shadow-[0_0_25px_rgba(19,109,236,0.3)] animate-pulse relative overflow-hidden">
                                <div className="absolute inset-0 bg-white opacity-10 mix-blend-overlay"></div>
                             </div>
                        </div>

                        {/* Result Card */}
                        {aiResponse.cardType === 'progress' && aiResponse.cardData ? (
                            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden w-full mb-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
                                <div className="px-5 pt-4 pb-2 bg-slate-50/50">
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">You Asked</p>
                                    <p className="text-slate-800 text-sm font-medium">"{transcript}"</p>
                                </div>
                                <div className="h-px bg-slate-100"></div>
                                <div className="p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                                            <Sparkles className="text-green-600" size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-[#111418]">{aiResponse.cardData.subject}</h3>
                                            <p className="text-[10px] text-slate-500">{aiResponse.cardData.curriculum}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-slate-50 p-2.5 rounded-xl">
                                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Mastery</p>
                                            <p className="text-lg font-bold text-[#136dec]">{aiResponse.cardData.percentage}%</p>
                                        </div>
                                        <div className="bg-slate-50 p-2.5 rounded-xl">
                                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Completed</p>
                                            <p className="text-lg font-bold text-[#111418]">{aiResponse.cardData.completed} <span className="text-xs font-medium text-slate-400">/ {aiResponse.cardData.total}</span></p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                                        <div className="bg-[#136dec] h-full rounded-full" style={{width: `${aiResponse.cardData.percentage}%`}}></div>
                                    </div>
                                    <button onClick={() => onNavigate('journey')} className="w-full bg-[#136dec] hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs">
                                        <span>Go to {aiResponse.cardData.subject}</span>
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 text-center animate-in zoom-in-95 w-full mb-4">
                                <p className="text-base text-slate-800 font-medium leading-relaxed">
                                    "{aiResponse.text}"
                                </p>
                            </div>
                        )}
                        
                        <button onClick={handleReset} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-full font-bold text-xs hover:bg-gray-200 transition-colors">
                            Ask Another Question
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Controls / Suggestions */}
            {state === 'listening' && (
                <div className="w-full pb-6 z-20 px-4 shrink-0 flex flex-col items-center">
                    {/* Compact Suggestions Grid */}
                    <div className="flex flex-wrap justify-center gap-2 mb-4 w-full max-w-sm">
                        {["Show my pacer", "Start battle", "Library"].map((suggestion, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleProcessQuery(suggestion)}
                                className="flex items-center justify-center gap-1.5 rounded-full bg-white border border-[#136dec]/10 px-3 py-1.5 shadow-sm hover:bg-blue-50 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[#136dec] text-xs"><Sparkles size={12}/></span>
                                <p className="text-[#111418] text-xs font-medium whitespace-nowrap">{suggestion}</p>
                            </button>
                        ))}
                    </div>

                    {/* Compact Transcript Preview */}
                    <div className="glass-panel rounded-2xl p-4 border border-white shadow-lg shadow-[#136dec]/5 mb-4 w-full max-w-xs">
                        <div className="flex items-center justify-center gap-1 h-4 mb-2">
                            <div className="voice-bar" style={{animationDelay: '0.1s', height: '8px'}}></div>
                            <div className="voice-bar" style={{animationDelay: '0.3s', height: '12px'}}></div>
                            <div className="voice-bar" style={{animationDelay: '0.2s', height: '16px'}}></div>
                            <div className="voice-bar" style={{animationDelay: '0.4s', height: '10px'}}></div>
                            <div className="voice-bar" style={{animationDelay: '0.1s', height: '14px'}}></div>
                        </div>
                        <p className="text-[#111418] text-sm font-medium leading-relaxed text-center">
                            "Show me my current <span className="text-[#136dec] border-r-2 border-[#136dec] animate-pulse">progress...</span>"
                        </p>
                    </div>

                    {/* Mic Button */}
                    <button 
                        onClick={startListening}
                        className="size-16 bg-[#136dec] rounded-full flex items-center justify-center shadow-2xl shadow-[#136dec]/40 text-white mic-aura relative active:scale-95 transition-transform"
                    >
                        <Mic size={28} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default VoiceAssistant;
