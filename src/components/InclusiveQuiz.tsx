
import React, { useState, useEffect, useCallback } from 'react';
import { Topic, SavedItem } from '../types';
import { aiClient } from '../utils/aiClient';
import { safeJsonParse } from '../utils/aiHelpers';
import { ArrowLeft, Clock, CheckCircle, XCircle, RefreshCw, ChevronRight, Brain, Info, ShieldCheck, Sparkles, AlertTriangle, Image as ImageIcon, MoreHorizontal, ArrowRight as ArrowForward, Flame, Star, Trophy, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

import { useLearningEngine } from '../contexts/LearningEngineContext';
import { useAuth } from '../contexts/AuthContext';

interface InclusiveQuizProps {
    topic: Topic;
    onBack: () => void;
    onComplete: (score: number) => void;
    onNavigate?: (view: string) => void;
    mode?: string;
    coveredObjectives?: string[];
}

interface QuizQuestion {
    type: 'text' | 'image-choice' | 'visual-context' | 'true-false';
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    imageKeyword?: string; 
    objectiveId?: string;
}

const InclusiveQuiz: React.FC<InclusiveQuizProps> = ({ topic, onBack, onComplete, onNavigate, mode = 'intro', coveredObjectives = [] }) => {
    const { addToast } = useToast();
    const { processQuizResult, recentActivity } = useLearningEngine();
    const { user } = useAuth();
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [streak, setStreak] = useState(0);

    const generateQuiz = useCallback(async (force = false) => {
        setLoading(true);
        setError(null);
        try {
            let quizConfig = "";
            let questionTypes = "";
            let contextPrompt = "";

            // Get weak spots for this topic
            const weakSpots = recentActivity
                .filter(r => r.topicId === topic.id && (r.score / r.total) < 0.7)
                .map(r => r.itemTitle);

            switch (mode) {
                case 'intro':
                    quizConfig = "Generate a Concept Check Review Game. Focus: High-level mental models and terminology.";
                    questionTypes = 'Strictly "text" or "true-false". Difficulty: Easy.';
                    contextPrompt = `Focus on these core objectives: ${topic.learningObjectives?.slice(0, 2).join(', ')}. Count: 3-5 questions.`;
                    break;
                case 'deep-dive': {
                    const objectivesToCover = coveredObjectives.length > 0 
                        ? coveredObjectives 
                        : topic.learningObjectives?.slice(0, 3) || [];
                    
                    quizConfig = "Generate a Mastery Lab Challenge. Focus: Specific technical details and application.";
                    questionTypes = 'Focus on "text" with scenario-based questions.';
                    contextPrompt = `Generate exactly 2 questions for EACH of these objectives: ${objectivesToCover.join(', ')}. 
                                     Also include 1 question addressing these previous weak spots: ${weakSpots.join(', ') || 'None'}.`;
                    break;
                }
                case 'exam-prep':
                    quizConfig = "Generate a Cumulative Final Boss Challenge. Focus: Synthesis, retention, and exam stamina.";
                    questionTypes = 'Standard Multiple Choice (National Exam Style). Difficulty: Hard.';
                    contextPrompt = `Cover the FULL scope of the topic: ${topic.title}. 
                                     Prioritize these weak spots: ${weakSpots.join(', ') || 'General review'}.
                                     Include questions that connect multiple objectives: ${topic.learningObjectives?.join(', ')}.
                                     Count: 10-12 questions.`;
                    break;
                default:
                    quizConfig = "Generate a standard quiz.";
                    questionTypes = 'Mix of types.';
                    contextPrompt = "Count: 5 questions.";
            }

            const systemInstruction = `
                You are an expert educational content creator for primary school students (ages 6-13) in Lesotho.
                Your task is to generate a quiz based on the provided topic and objectives.
                
                Constraints:
                - Use LAYMAN'S TERMS and simple words.
                - Max 15 words per question.
                - Max 4 options per question.
                - Use relatable scenarios from Lesotho (mountains, cattle, papa, village life, school games like morabaraba).
                - Format the output as a JSON Array of objects. Do not include any other text.
                - Each object must have: type, question, options, correctAnswer (index), explanation, and objectiveId.
            `;

            const prompt = `
                Topic: "${topic.title}".
                Mode: ${mode}.
                ${contextPrompt}
                ${questionTypes}
                
                Learning Objectives to cover:
                ${topic.learningObjectives?.join('\n') || 'General review of the topic.'}
            `;
            
            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview', // Use recommended model
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    temperature: 0.1,
                    systemInstruction
                },
                cacheKey: `quiz_${topic.id}_${mode}_${coveredObjectives?.join('-') || 'all'}`,
                organizationId: user?.organization_id,
                forceRefresh: force
            });
            
            const text = response.text;
            if (!text) {
                console.error("AI returned empty response. Full response object:", response);
                throw new Error("AI returned empty response");
            }

            const parsed = safeJsonParse<QuizQuestion[]>(text);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                setQuestions(parsed);
                setAnswers(new Array(parsed.length).fill(-1));
            } else {
                console.error("Invalid quiz format received. Raw text:", text);
                throw new Error("Invalid quiz format");
            }
        } catch (e: any) {
            console.error("Quiz Generation Error:", e);
            const isQuota = e?.message === 'QUOTA_EXCEEDED' || e?.status === 402;
            if (isQuota) {
                setError("QUOTA_EXCEEDED");
                addToast("AI Quota reached. Please check your credits.", "error");
            } else {
                setError(e?.message || "Generation failed");
            }
        } finally {
            setLoading(false);
        }
    }, [topic.id, topic.title, topic.learningObjectives, mode, recentActivity, coveredObjectives, user?.organization_id, addToast]);

    // Initial Load
    useEffect(() => {
        generateQuiz();
    }, [generateQuiz]);

    const handleOptionSelect = (index: number) => {
        if (answers[currentIndex] !== -1) return; // Already answered
        
        setSelectedOption(index);
        
        // Auto submit logic for flow
        const newAnswers = [...answers];
        newAnswers[currentIndex] = index;
        setAnswers(newAnswers);
        
        const isCorrect = index === questions[currentIndex].correctAnswer;
        if (isCorrect) {
            setScore(s => s + 1);
            setStreak(s => s + 1);
        } else {
            setStreak(0);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(c => c + 1);
            setSelectedOption(null);
        } else {
            setShowResults(true);
        }
    };

    const handleFinish = async () => {
        // 1. Prepare Data
        const mastery = Math.round((score / questions.length) * 100);
        
        // Identify which objectives were mastered (answered correctly)
        const masteredObjectiveIds = questions
            .filter((q, idx) => answers[idx] === q.correctAnswer && q.objectiveId)
            .map(q => q.objectiveId as string);

        // 2. Save result to Library (Try/Catch to ensure navigation even if save fails)
        try {
            const libraryItem: SavedItem = {
                id: `quiz-res-${Date.now()}`,
                type: 'lesson', // Stored as lesson to use existing StudyGuide renderer structure
                title: `Result: ${topic.title}`,
                date: new Date().toISOString(),
                data: {
                    title: `Quiz Result: ${topic.title}`,
                    intro: `You scored ${score}/${questions.length} (${mastery}%) on this review session.`,
                    sections: [
                        {
                            heading: "Performance Summary",
                            points: [
                                `Score: ${score} out of ${questions.length}`,
                                `Mode: ${mode === 'intro' ? 'Review Game' : mode}`,
                                `Objectives Mastered: ${[...new Set(masteredObjectiveIds)].length || 'General Review'}`,
                                `Date: ${new Date().toLocaleDateString()}`
                            ]
                        }
                    ],
                    quiz: questions.map((q, i) => ({
                        question: q.question,
                        answer: `Correct Answer: ${q.options[q.correctAnswer]}`
                    }))
                }
            };

            const currentLib = JSON.parse(localStorage.getItem('motlatsi_library') || '[]');
            localStorage.setItem('motlatsi_library', JSON.stringify([libraryItem, ...currentLib]));
            addToast("Result saved to Library!", "success");
        } catch (e) {
            console.error("Failed to save result", e);
            // We do NOT block navigation here, just log error
        }

        // 3. Mark topic as complete and process granular results
        if (processQuizResult) {
            await processQuizResult(topic.id, score, questions.length, topic.title, masteredObjectiveIds);
        }
        
        if (onComplete) {
            onComplete(score);
        }

        // 4. Navigate Away
        if (onNavigate) {
            onNavigate('student-library');
        } else {
            // Fallback if no navigation handler
            onBack();
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[100dvh] bg-[#f8fafc] dark:bg-[#101922] w-full">
            <div className="relative">
                <div className="absolute inset-0 bg-[#136dec]/20 blur-2xl rounded-full animate-pulse"></div>
                <RefreshCw className="animate-spin text-[#136dec] relative z-10" size={48} />
            </div>
            <p className="text-gray-900 dark:text-white font-bold mt-6 animate-pulse tracking-widest text-xs uppercase">
                {mode === 'exam-prep' ? 'Preparing Mock Exam...' : 'Loading Review Game...'}
            </p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center h-[100dvh] bg-[#f8fafc] dark:bg-[#101922] w-full p-6 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-full mb-6">
                <AlertTriangle className="text-red-500" size={48} />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {error === 'QUOTA_EXCEEDED' ? 'AI Quota Reached' : 'Quiz Generation Failed'}
            </h2>
            
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
                {error === 'QUOTA_EXCEEDED' 
                    ? "You've used all your AI credits for today. You can reset them in your profile settings." 
                    : `We encountered an issue while creating your quiz: ${error}. Please try again.`}
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button 
                    onClick={() => generateQuiz(true)} 
                    className="bg-[#136dec] text-white w-full py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95"
                >
                    Retry Generation
                </button>
                
                {error === 'QUOTA_EXCEEDED' && (
                    <button 
                        onClick={() => onNavigate?.('user-profile')} 
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-white border border-gray-200 dark:border-slate-700 w-full py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Check Credits
                    </button>
                )}
                
                <button 
                    onClick={onBack} 
                    className="text-gray-500 text-sm font-medium hover:underline py-2"
                >
                    Go Back
                </button>
            </div>
        </div>
    );

    if (showResults) {
        return (
            <div className="h-[100dvh] bg-[#f8fafc] dark:bg-[#101922] text-slate-900 dark:text-white flex flex-col font-sans w-full overflow-hidden relative">
                {/* Confetti / Decor */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                    <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                    <div className="absolute bottom-1/3 left-1/2 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
                    <div className="relative mb-8">
                        <div className="size-40 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-xl border-8 border-[#136dec]">
                             <div className="text-center">
                                <span className="block text-5xl font-black text-[#136dec] tracking-tight">{Math.round((score / questions.length) * 100)}%</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#136dec] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md whitespace-nowrap">
                            Mastery Score
                        </div>
                    </div>

                    <h2 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">{mode === 'intro' ? 'Level Complete!' : 'Exam Finished'}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto font-medium text-sm">
                        You answered {score} out of {questions.length} questions correctly. Great effort!
                    </p>

                    <button 
                        type="button"
                        onClick={handleFinish} 
                        className="bg-[#136dec] text-white w-full max-w-xs py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>Finish & Save</span>
                        <CheckCircle size={20} />
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];
    const isAnswered = answers[currentIndex] !== -1;
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const isCorrectAnswer = isAnswered && answers[currentIndex] === currentQ.correctAnswer;

    return (
        <div className="bg-[#f8fafc] dark:bg-[#101922] h-[100dvh] flex flex-col antialiased text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
            
            {/* Top Navigation Bar */}
            <header className="shrink-0 w-full max-w-md mx-auto px-4 py-2 flex items-center justify-between border-b border-[#136dec]/10 bg-[#f8fafc]/95 dark:bg-[#101922]/95 backdrop-blur-sm z-20 h-14">
                <button 
                    onClick={onBack}
                    className="flex items-center justify-center size-8 rounded-full hover:bg-[#136dec]/10 transition-colors"
                >
                    <X size={18} className="text-gray-600 dark:text-gray-300" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#136dec]/70">Review Game</span>
                    <h1 className="text-xs font-bold truncate max-w-[150px]">{topic.title}</h1>
                </div>
                <div className="bg-[#136dec]/10 px-2.5 py-1 rounded-full flex items-center gap-1 border border-[#136dec]/20">
                    <Star size={12} className="text-[#136dec] fill-current" />
                    <span className="text-[#136dec] font-bold text-xs leading-none">{score * 100}</span>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-md mx-auto flex flex-col min-h-0 relative">
                
                {/* Scrollable Question & Options */}
                <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
                    
                    {/* Progress */}
                    <div className="mb-4">
                        <div className="flex justify-between items-end mb-1.5">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {currentIndex + 1} / {questions.length}</p>
                            <p className="text-[10px] font-bold text-[#136dec]">{Math.round(progress)}%</p>
                        </div>
                        <div className="h-1.5 w-full bg-[#136dec]/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#136dec] transition-all duration-500 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="mb-4">
                        <h2 className="text-lg md:text-xl font-bold leading-snug text-slate-900 dark:text-white">
                            {currentQ.question}
                        </h2>
                    </div>

                    {/* Options List */}
                    <div className="flex flex-col gap-2.5 pb-20">
                        {currentQ.options.map((opt, idx) => {
                            const isSelected = selectedOption === idx;
                            const isCorrectOption = idx === currentQ.correctAnswer;
                            
                            let cardClass = "bg-white dark:bg-gray-800 shadow-sm border-2 border-transparent";
                            let radioClass = "border-gray-300 dark:border-gray-600";
                            let textClass = "text-sm font-medium text-slate-700 dark:text-slate-200";

                            if (isAnswered) {
                                if (isCorrectOption) {
                                    cardClass = "bg-[#136dec]/5 border-[#136dec] ring-1 ring-[#136dec]";
                                    radioClass = "border-[#136dec] bg-[#136dec]";
                                    textClass = "text-sm font-bold text-[#136dec]";
                                } else if (isSelected && !isCorrectOption) {
                                    cardClass = "bg-red-50 dark:bg-red-900/20 border-red-500";
                                    radioClass = "border-red-500 bg-red-500";
                                    textClass = "text-sm font-medium text-red-600 dark:text-red-400";
                                } else {
                                    cardClass = "bg-gray-50 dark:bg-gray-900 border-transparent opacity-50";
                                }
                            } else if (isSelected) {
                                cardClass = "bg-[#136dec]/5 border-[#136dec]";
                                radioClass = "border-[#136dec]";
                                textClass = "text-sm font-bold text-[#136dec]";
                            }

                            return (
                                <button 
                                    key={idx}
                                    className={`relative flex items-center justify-between p-4 rounded-xl transition-all active:scale-[0.98] ${cardClass}`}
                                    onClick={() => handleOptionSelect(idx)}
                                    disabled={isAnswered}
                                >
                                    <div className="flex-1 text-left pr-3">
                                        <span className={textClass}>{opt}</span>
                                        {isAnswered && isCorrectOption && (
                                            <div className="mt-1.5 flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1">
                                                <CheckCircle size={12} className="text-[#136dec] mt-0.5 shrink-0" />
                                                <span className="text-xs font-medium text-[#136dec]/80 leading-tight">
                                                    {currentQ.explanation}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${radioClass}`}>
                                        {(isAnswered && (isSelected || isCorrectOption)) && <div className="size-2 bg-white rounded-full"></div>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom Feedback Area - Fixed */}
                <div className={`shrink-0 p-4 bg-white dark:bg-[#101922] border-t border-slate-100 dark:border-slate-800 shadow-lg z-20 transition-transform duration-300 absolute bottom-0 left-0 right-0 ${isAnswered ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${isCorrectAnswer ? 'bg-[#136dec]/10 text-[#136dec]' : 'bg-orange-50 text-orange-600'}`}>
                                {isCorrectAnswer ? <Flame size={20} fill="currentColor" /> : <Brain size={20} />}
                            </div>
                            <div className="truncate">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {isCorrectAnswer ? (streak > 1 ? `${streak} Streak!` : "Great job!") : "Learning Moment"}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {isCorrectAnswer ? "Keep it up!" : "Review the correct answer."}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleNext}
                            className="px-6 py-3 bg-[#136dec] text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 shrink-0 text-sm"
                        >
                            Next <ArrowForward size={16} />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default InclusiveQuiz;
