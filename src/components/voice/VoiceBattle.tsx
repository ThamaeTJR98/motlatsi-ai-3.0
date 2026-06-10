
import React, { useState, useEffect, useCallback } from 'react';
import { useVoiceAccess } from '../../contexts/VoiceAccessContext';
import { aiClient } from '../../utils/aiClient';
import { Mic, CheckCircle, Trophy, XCircle } from 'lucide-react';
import { isFuzzyMatch } from '../../utils/aiHelpers';

const VoiceBattle: React.FC = () => {
    const { voiceState, speak, lastTranscript, registerCommand, unregisterCommand } = useVoiceAccess();
    const [question, setQuestion] = useState("Loading question...");
    const [options, setOptions] = useState<string[]>([]);
    const [correctAnswer, setCorrectAnswer] = useState("");
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(20);
    const [gameState, setGameState] = useState<'loading' | 'active' | 'result'>('loading');

    const startNewRound = useCallback(async function start() {
        setGameState('loading');
        setTimeLeft(20);
        speak("Generating new challenger question...");
        
        try {
            const prompt = `
                Generate 1 multiple choice question for Grade 10 General Knowledge (Lesotho context).
                JSON Format: {"question": "...", "options": ["A", "B", "C"], "answer": "A"}
            `;
            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            const data = JSON.parse(response.text || "{}");
            
            setQuestion(data.question);
            setOptions(data.options);
            setCorrectAnswer(data.answer); 
            
            setGameState('active');
            speak(`Question: ${data.question}. Is it: ${data.options.join(', or ')}?`);
            
        } catch (e) {
            speak("Error connecting. Retrying.");
            setTimeout(start, 2000);
        }
    }, [speak]);

    const handleResult = useCallback((isWin: boolean) => {
        setGameState('result');
        if (isWin) {
            setScore(s => s + 100);
            speak("Correct! You earn 100 points. Next question coming up.");
        } else {
            speak(`Time's up or incorrect. The answer was ${correctAnswer}. Next question.`);
        }
        setTimeout(startNewRound, 4000);
    }, [correctAnswer, speak, startNewRound]);

    const checkAnswer = useCallback((index: number) => {
        if (gameState !== 'active') return;
        const selected = options[index];
        const isCorrect = selected === correctAnswer;
        handleResult(isCorrect);
    }, [gameState, options, correctAnswer, handleResult]);

    useEffect(() => {
        startNewRound();
        
        // Register quick option commands
        const battleCommands = [
            // Fix: Added required 'description' property to comply with VoiceCommand interface
            { id: 'opt-a', regex: /^(option )?a|one|first/i, action: () => checkAnswer(0), description: 'Select option A' },
            { id: 'opt-b', regex: /^(option )?b|two|second/i, action: () => checkAnswer(1), description: 'Select option B' },
            { id: 'opt-c', regex: /^(option )?c|three|third/i, action: () => checkAnswer(2), description: 'Select option C' },
            { id: 'opt-d', regex: /^(option )?d|four|fourth/i, action: () => checkAnswer(3), description: 'Select option D' },
        ];
        
        battleCommands.forEach(cmd => registerCommand(cmd));
        
        return () => {
            battleCommands.forEach(cmd => unregisterCommand(cmd.id));
        };
    }, [startNewRound, checkAnswer, registerCommand, unregisterCommand]);

    // Timer
    useEffect(() => {
        if (gameState === 'active' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && gameState === 'active') {
            handleResult(false);
        }
    }, [timeLeft, gameState, handleResult]);

    // Check full text answer via fuzzy matching
    useEffect(() => {
        if (gameState === 'active' && lastTranscript) {
            // Check if transcript matches the correct answer text directly using Fuzzy Logic
            if (isFuzzyMatch(lastTranscript, [correctAnswer], 0.8)) {
                handleResult(true);
            }
        }
    }, [lastTranscript, correctAnswer, gameState, handleResult]);

    return (
        <div className="bg-[#101822] font-sans text-white h-full flex flex-col">
            {/* Header */}
            <header className="flex items-center bg-[#101822] p-4 pt-8 border-b border-gray-800">
                <div className="text-[#136dec] flex size-10 shrink-0 items-center justify-center">
                    <Mic size={32} />
                </div>
                <h2 className="text-white text-xl font-extrabold leading-tight tracking-tight flex-1 text-center pr-10 uppercase">
                    Voice Battle
                </h2>
            </header>

            {/* Game Area */}
            <main className="flex-1 flex flex-col justify-center p-6 relative">
                {gameState === 'active' && (
                    <>
                        <div className="mb-2 text-center">
                            <h2 className="text-[#136dec] tracking-widest text-lg font-black leading-tight uppercase">
                                Score: {score}
                            </h2>
                        </div>
                        <div className="mb-10 text-center">
                            <h1 className="text-white tracking-tight text-3xl font-bold leading-tight">
                                {question}
                            </h1>
                        </div>

                        <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
                            {options.map((opt, i) => (
                                <div key={i} className="bg-[#1a202c] border-2 border-gray-700 p-5 rounded-2xl">
                                    <p className="text-white text-xl font-bold">{opt}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {gameState === 'loading' && (
                    <div className="text-center animate-pulse">
                        <Trophy size={64} className="text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold">Preparing Battle...</h2>
                    </div>
                )}

                {gameState === 'result' && (
                    <div className="text-center">
                        <CheckCircle size={80} className="text-green-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold">Result Processing...</h2>
                    </div>
                )}
            </main>

            {/* Footer Timer */}
            <footer className="p-6 bg-[#101822] border-t-4 border-[#136dec]">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                        <p className="text-[#136dec] text-lg font-black leading-none uppercase tracking-tight">Time Left</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <p className="text-white text-6xl font-black leading-none">{timeLeft}</p>
                        <p className="text-[#136dec] text-sm font-bold uppercase">sec</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default VoiceBattle;
