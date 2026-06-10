
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Topic, QuizQuestion } from '../types';
import { aiClient } from '../utils/aiClient';
import { ArrowLeft, RefreshCw, ChevronRight, Send, Flag } from 'lucide-react';
import { useLearningEngine } from '../contexts/LearningEngineContext';
import { useVoiceContext } from '../hooks/useVoiceContext';
import { useVoiceAccess } from '../contexts/VoiceAccessContext';

interface QuizInterfaceProps {
    topic: Topic;
    onBack: () => void;
    onComplete: (score: number) => void;
    difficulty?: 'easy' | 'medium' | 'hard';
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ topic, onBack, onComplete, difficulty = 'medium' }) => {
    const { processQuizResult } = useLearningEngine();
    const { speak } = useVoiceAccess();
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [score, setScore] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);

    const generateQuiz = useCallback(async () => {
        setLoading(true);
        try {
            const objectives = topic.learningObjectives || [];
            let questionCount = 5;
            let objectivesToCover = objectives;

            if (difficulty === 'easy') {
                objectivesToCover = objectives.slice(0, 5);
                questionCount = Math.max(3, Math.min(5, objectivesToCover.length));
            } else if (difficulty === 'medium') {
                objectivesToCover = objectives.slice(0, 10);
                questionCount = Math.max(5, Math.min(8, objectivesToCover.length));
            } else {
                questionCount = Math.max(5, Math.min(12, objectivesToCover.length || 10));
            }

            const prompt = `
                Generate a ${difficulty} level quiz for Grade 10 students in Lesotho.
                Topic: ${topic.title}
                Description: ${topic.description}
                
                Scope (Learning Objectives):
                ${objectivesToCover.length > 0 ? objectivesToCover.map(obj => `- ${obj}`).join('\n') : 'General knowledge of the topic.'}
                
                Generate ${questionCount} multiple-choice questions.
                Format as JSON: [{"question": "...", "options": ["..."], "correctAnswer": 0}]
            `;

            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const text = response.text;
            if (text) {
                const data = JSON.parse(text);
                setQuestions(data);
                setAnswers(new Array(data.length).fill(-1));
                // Speak first question
                setTimeout(() => speak(`Question 1. ${data[0].question}`), 1000);
            }
        } catch (error) {
            console.error("Quiz gen error", error);
            // Fallback content
            setQuestions([{
                id: 'fallback-0',
                question: `What is the primary concept of ${topic.title}?`,
                options: ["Learning", "Biology", "History", "Geography"],
                correctAnswer: 0
            }]);
            setAnswers([-1]);
        } finally {
            setLoading(false);
        }
    }, [topic, difficulty, speak]);

    useEffect(() => {
        generateQuiz();
        const timer = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, [generateQuiz]);

    const handleOptionSelect = useCallback((index: number) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = index;
        setAnswers(newAnswers);
        speak(`Selected ${questions[currentQuestion].options[index]}`);
    }, [answers, currentQuestion, questions, speak]);

    const handleSubmit = useCallback(() => {
        // Calculate score
        let calculatedScore = 0;
        answers.forEach((ans, idx) => {
            if (ans === questions[idx].correctAnswer) calculatedScore++;
        });
        setScore(calculatedScore);
        setQuizCompleted(true);
        
        // Notify the Learning Engine!
        processQuizResult(topic.id, calculatedScore, questions.length, topic.title);
        
        onComplete(calculatedScore);
        speak(`Quiz complete. You scored ${calculatedScore} out of ${questions.length}.`);
    }, [answers, questions, topic, processQuizResult, onComplete, speak]);

    const handleNext = useCallback(() => {
        if (currentQuestion < questions.length - 1) {
            const nextQ = currentQuestion + 1;
            setCurrentQuestion(nextQ);
            speak(`Question ${nextQ + 1}. ${questions[nextQ].question}`);
        }
    }, [currentQuestion, questions, speak]);

    const handlePrev = useCallback(() => {
        if (currentQuestion > 0) {
            setCurrentQuestion(c => c - 1);
        }
    }, [currentQuestion]);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return { mins, secs };
    };

    // --- Voice Context Commands ---
    // We memoize these so they update when currentQuestion changes
    const voiceCommands = useMemo(() => {
        if (loading || quizCompleted || questions.length === 0) return [];

        const q = questions[currentQuestion];
        const cmds = [];

        // Option selection commands (A, B, C, D)
        q.options.forEach((opt, idx) => {
            const letters = ['a', 'b', 'c', 'd', 'e'];
            const letter = letters[idx];
            cmds.push({
                id: `select-opt-${idx}-q${currentQuestion}`,
                keywords: [`option ${letter}`, `choose ${letter}`, `select ${letter}`, `number ${idx + 1}`],
                action: () => handleOptionSelect(idx),
                description: `Select Option ${letter.toUpperCase()}`
            });
        });

        // Navigation
        cmds.push({
            id: 'quiz-next',
            keywords: ['next question', 'go forward', 'continue'],
            action: () => handleNext(),
            description: 'Go to next question'
        });
        
        cmds.push({
            id: 'quiz-back',
            keywords: ['previous question', 'go back', 'last question'],
            action: () => handlePrev(),
            description: 'Go to previous question'
        });

        cmds.push({
            id: 'quiz-repeat',
            keywords: ['repeat', 'say again', 'read question'],
            action: () => speak(`Question ${currentQuestion + 1}. ${q.question}. Options are: ${q.options.map((o,i) => `Option ${['A','B','C','D'][i]}, ${o}`).join('. ')}`),
            description: 'Reads the question and options'
        });

        if (currentQuestion === questions.length - 1) {
            cmds.push({
                id: 'quiz-submit',
                keywords: ['submit', 'finish quiz', 'done'],
                action: () => handleSubmit(),
                description: 'Submit the quiz'
            });
        }

        return cmds;
    }, [currentQuestion, questions, loading, quizCompleted, handleOptionSelect, handleNext, handlePrev, handleSubmit, speak]);

    useVoiceContext(voiceCommands);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#F8F9FA] font-sans">
                <RefreshCw className="animate-spin text-primary mb-4" size={40} />
                <p className="text-gray-500 font-medium text-lg">Preparing Exam Paper...</p>
                <span className="text-xs text-primary font-bold uppercase tracking-wider mt-2">{difficulty} Mode</span>
            </div>
        );
    }

    if (quizCompleted) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full">
                    <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 text-4xl">
                        🏆
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted</h1>
                    <p className="text-gray-500 mb-6">You scored <span className="text-teacherBlue font-bold">{score}</span> out of {questions.length}</p>
                    <button onClick={onBack} className="w-full bg-teacherBlue text-white font-bold py-4 rounded-xl hover:bg-blue-800 transition-colors">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const question = questions[currentQuestion];
    const progressPercent = ((currentQuestion + 1) / questions.length) * 100;
    const time = formatTime(timeElapsed);

    return (
        <div className="bg-[#F8F9FA] font-sans text-slate-900 flex flex-col min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-4 pt-10 pb-4 border-b border-slate-200/60">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                        <ArrowLeft className="text-slate-600" size={24} />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-extrabold">{difficulty} Mode</span>
                        <h2 className="text-sm font-extrabold text-slate-900 leading-tight">Question {currentQuestion + 1} of {questions.length}</h2>
                    </div>
                    <button onClick={() => speak(`Question ${currentQuestion + 1}. ${question.question}`)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                        <Flag className="text-slate-400" size={24} />
                    </button>
                </div>
            </header>

            <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
                {/* Timer */}
                <div className="flex gap-3 justify-center">
                    <div className="flex flex-col items-center group">
                        <div className="flex h-16 w-20 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm transition-colors">
                            <p className="text-2xl font-extrabold tracking-tight text-slate-800">{time.mins.toString().padStart(2, '0')}</p>
                        </div>
                        <p className="mt-2 text-[10px] uppercase font-bold tracking-widest text-slate-400">Min</p>
                    </div>
                    <div className="text-2xl font-bold pt-4 text-slate-300">:</div>
                    <div className="flex flex-col items-center group">
                        <div className="flex h-16 w-20 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm transition-colors">
                            <p className="text-2xl font-extrabold tracking-tight text-slate-800">{time.secs.toString().padStart(2, '0')}</p>
                        </div>
                        <p className="mt-2 text-[10px] uppercase font-bold tracking-widest text-slate-400">Sec</p>
                    </div>
                </div>

                {/* Progress */}
                <div className="space-y-2 px-1">
                    <div className="flex justify-between items-center">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Progress</p>
                        <p className="text-[11px] font-extrabold text-teacherBlue">{Math.round(progressPercent)}% Complete</p>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-teacherBlue rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>

                {/* Question Card */}
                <div className="relative flex flex-col items-stretch justify-start rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] bg-white border border-slate-200 p-6 gap-6">
                    <div className="space-y-3">
                        <h3 className="font-serif text-2xl leading-snug text-slate-900 font-bold">
                            {question.question}
                        </h3>
                        <p className="text-slate-500 text-sm font-medium italic">
                            Select the most appropriate answer from the options provided below.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {question.options.map((opt, idx) => (
                            <label key={idx} className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer hover:bg-slate-50 transition-all ${answers[currentQuestion] === idx ? 'border-teacherBlue bg-blue-50/50' : 'border-slate-200'}`}>
                                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${answers[currentQuestion] === idx ? 'border-teacherBlue bg-teacherBlue' : 'border-slate-300 bg-white'}`}>
                                    {answers[currentQuestion] === idx && <div className="h-2 w-2 bg-white rounded-full" />}
                                </div>
                                <span className="text-[15px] font-semibold text-slate-800 leading-relaxed">{opt}</span>
                                <input 
                                    type="radio" 
                                    name={`q-${currentQuestion}`} 
                                    className="hidden" 
                                    checked={answers[currentQuestion] === idx}
                                    onChange={() => handleOptionSelect(idx)}
                                />
                            </label>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-col gap-4 pb-20">
                    <div className="flex gap-3 h-14">
                        <button 
                            onClick={handlePrev}
                            disabled={currentQuestion === 0}
                            className="flex-1 rounded-xl border border-slate-200 bg-white font-extrabold text-sm text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                            <ArrowLeft size={18} /> Previous
                        </button>
                        <button 
                            onClick={handleNext}
                            disabled={currentQuestion === questions.length - 1}
                            className="flex-1 rounded-xl border border-slate-200 bg-white font-extrabold text-sm text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                            Next <ChevronRight size={18} />
                        </button>
                    </div>
                    {currentQuestion === questions.length - 1 && (
                        <button 
                            onClick={handleSubmit}
                            className="w-full h-16 bg-[#2277E0] hover:bg-blue-600 text-white rounded-xl font-extrabold text-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                        >
                            <Send size={20} /> Submit Exam
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};

export default QuizInterface;
