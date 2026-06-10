
import React, { useState, useEffect, useRef } from 'react';
import { Topic, UserState, ChatMessage } from '../types';
import { aiClient } from '../utils/aiClient';
import { Send, User, Bot, Loader2, ArrowRight } from 'lucide-react';

interface ChatProps {
    topic: Topic | null;
    user: UserState;
    onComplete: (topicId: string) => void;
}

const SocraticChat: React.FC<ChatProps> = ({ topic, user, onComplete }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (topic) {
            setMessages([
                {
                    id: 1,
                    sender: 'ai',
                    text: `Hello ${user.name}! I'm Motlatsi. We're going to explore "${topic.title}". What do you already know about this?`,
                    timestamp: Date.now()
                }
            ]);
        }
    }, [topic, user.name]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !topic) return;

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
            const historyText = messages.map(m => `${m.sender === 'user' ? 'Student' : 'Tutor'}: ${m.text}`).join('\n');
            
            const prompt = `
                You are Motlatsi, a friendly Socratic tutor for a primary school student in Lesotho.
                Topic: ${topic.title}
                Description: ${topic.description}
                
                History:
                ${historyText}
                Student: ${userMsg.text}
                
                Instructions:
                1. Use LAYMAN'S TERMS and simple language suitable for a child.
                2. Use relatable scenarios, stories, and cultural references from Lesotho (e.g., mountains, cattle, papa, village life, school games like morabaraba).
                3. Be encouraging and friendly.
                4. Do not give long lectures. Ask guiding questions to help the student figure it out.
                5. If the student understands the core concept well, say "MASTERED" at the end of your message.
                6. Keep responses under 50 words.
            `;

            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                organizationId: user?.organization_id
            });

            const text = response.text || "I'm having trouble connecting. Let's try again.";
            
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ai',
                text: text.replace("MASTERED", ""),
                timestamp: Date.now()
            }]);

            if (text.includes("MASTERED")) {
                onComplete(topic.id);
            }

        } catch (error: any) {
            console.error(error);
            const isQuota = error?.message === 'QUOTA_EXCEEDED' || error?.status === 402;
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ai',
                text: isQuota 
                    ? "I've reached my daily limit for now. Please try again later or ask your teacher to check the quota." 
                    : "Sorry, I lost my connection. Please check your internet.",
                timestamp: Date.now()
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teacherBlue flex items-center justify-center text-white">
                    <Bot size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{topic?.title || 'Chat'}</h3>
                    <p className="text-xs text-gray-500">AI Tutor</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-teacherBlue text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm">
                            <Loader2 className="animate-spin text-teacherBlue" size={20} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your answer..."
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teacherBlue focus:border-transparent outline-none"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-teacherBlue text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SocraticChat;
