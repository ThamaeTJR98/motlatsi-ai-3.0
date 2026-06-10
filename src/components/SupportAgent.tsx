
import React, { useState, useEffect, useRef } from 'react';
import { UserState, ChatMessage } from '../types';
import { aiClient } from '../utils/aiClient';
import { Send, X, Bot, User, Loader2, Sparkles, HelpCircle } from 'lucide-react';

interface SupportAgentProps {
    user: UserState;
    onClose: () => void;
}

const SupportAgent: React.FC<SupportAgentProps> = ({ user, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial Greeting
        setMessages([{
            id: Date.now(),
            sender: 'ai',
            text: `Hello ${user.name.split(' ')[0]}! I see you are a ${user.role}. How can I assist you with the Motlatsi platform today?`,
            timestamp: Date.now()
        }]);
    }, [user.name, user.role]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now(),
            sender: 'user',
            text: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const historyText = messages.map(m => `${m.sender === 'user' ? 'User' : 'Agent'}: ${m.text}`).join('\n');
            
            // Context Awareness Logic
            let contextContext = `User Role: ${user.role}. Name: ${user.name}. School: ${user.school || 'Unknown'}.`;
            
            if (user.role === 'student') {
                contextContext += ` Grade: ${user.currentGrade}. Completed Topics: ${user.completedTopics.length}. Needs: ${user.learningNeeds?.join(', ') || 'None'}.`;
            } else if (user.role === 'teacher') {
                contextContext += ` Teaching Grade: ${user.currentGrade || 'Various'}. Subject: ${user.subject || 'General'}.`;
            } else if (user.role === 'parent') {
                contextContext += ` Children Linked: ${user.linkedStudentIds?.length || 0}.`;
            }

            const prompt = `
                You are the AI Support Agent for the Motlatsi Education App in Lesotho.
                
                CONTEXT:
                ${contextContext}

                INSTRUCTIONS:
                1. Act as a helpful, polite, and knowledgeable support assistant.
                2. If the user is a TEACHER, help with lesson planning, classroom management, or app features.
                3. If the user is a STUDENT, help with study tips, finding topics, or app navigation. Do NOT solve homework directly, guide them.
                4. If the user is a PARENT, help them understand their child's progress or app billing/features.
                5. Keep responses concise (under 3 sentences unless detailed explanation is requested).
                6. Use a supportive tone suitable for the educational context.

                CHAT HISTORY:
                ${historyText}
                
                User: ${userMsg.text}
                Agent:
            `;

            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            const text = response.text || "I'm having trouble connecting to the server. Please try again.";

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ai',
                text: text,
                timestamp: Date.now()
            }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ai',
                text: "I'm sorry, I encountered an error. Please try again.",
                timestamp: Date.now()
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col font-sans animate-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-teacherBlue flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-none">Motlatsi Support</h2>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Context Aware • Online</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="size-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#0f1115]" ref={scrollRef}>
                <div className="flex justify-center my-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                        {new Date().toLocaleDateString()}
                    </span>
                </div>

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-gray-200 dark:bg-slate-700' : 'bg-teacherBlue'}`}>
                                {msg.sender === 'user' ? <User size={14} className="text-gray-600 dark:text-gray-300" /> : <Bot size={14} className="text-white" />}
                            </div>
                            <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                msg.sender === 'user' 
                                ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-tr-none' 
                                : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-slate-700'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                         <div className="flex max-w-[85%] gap-2">
                            <div className="size-8 rounded-full flex items-center justify-center shrink-0 bg-teacherBlue">
                                <Bot size={14} className="text-white" />
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
                                <Loader2 size={16} className="text-teacherBlue animate-spin" />
                                <span className="text-xs text-gray-400 font-medium">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-end gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-2xl border border-gray-200 dark:border-slate-700 focus-within:border-teacherBlue/50 transition-colors">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`Ask anything as a ${user.role}...`}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2 text-gray-900 dark:text-white max-h-32 resize-none"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="p-2.5 bg-teacherBlue text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-blue-500/20"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupportAgent;
