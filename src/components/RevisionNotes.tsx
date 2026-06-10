import React, { useState, useEffect } from 'react';
import { 
    ChevronLeft, Brain, 
    Lightbulb, RefreshCw, Sparkles,
    Info, X, ArrowRight, BookOpen, Target, Zap, ChevronDown
} from 'lucide-react';
import { Topic } from '../types';
import { aiClient } from '../utils/aiClient';

interface RevisionNotesProps {
    topic: Topic;
    onBack: () => void;
    onNavigate?: (view: string) => void;
}

interface KeywordFlowData {
    keywords: {
        term: string;
        definition: string;
        context: string; // Real-world or curriculum context
        relatedTerms: string[];
    }[];
    summary: string;
}

const RevisionNotes: React.FC<RevisionNotesProps> = ({ topic, onBack, onNavigate }) => {
    // ── DATA STATE ──
    const [flowData, setFlowData] = useState<KeywordFlowData | null>(null);
    const [loading, setLoading] = useState(false);
    
    // ── UI STATE ──
    const [infoOpen, setInfoOpen] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(false);
    
    // ── AI GENERATION ──
    const generateDeterministicFallback = React.useCallback(() => {
        // Fallback Logic
        const rawVocab = topic.keyVocabulary || [];
        const vocabStrings = rawVocab.map(v => typeof v === 'string' ? v : (v as any).term);
        const objectives = topic.learningObjectives || [];
        
        const keywords = vocabStrings.slice(0, 5).map((term: string) => ({
            term: term,
            definition: `Core concept of ${topic.title}`,
            context: "Used in " + (objectives[0] || "general study"),
            relatedTerms: vocabStrings.filter(v => v !== term).slice(0, 2)
        }));

        const data = {
            keywords: keywords.length > 0 ? keywords : [
                { term: "Concept A", definition: "Definition A", context: "Context A", relatedTerms: ["B", "C"] },
                { term: "Concept B", definition: "Definition B", context: "Context B", relatedTerms: ["A", "C"] }
            ],
            summary: `This topic covers ${topic.title} and its key principles.`
        };
        setFlowData(data);
    }, [topic]);

    const generateKeywordsFlow = React.useCallback(async () => {
        setLoading(true);
        try {
            const prompt = `Create a "Keywords Flow" revision guide for the topic: "${topic.title}".
            
            Target Audience: Primary/High School students in Lesotho.
            Goal: Explain the topic through its most important keywords, showing how they connect.

            Context: ${topic.description}
            Curriculum Objectives: ${topic.learningObjectives?.join(', ') || 'General mastery'}
            Key Vocabulary: ${topic.keyVocabulary?.join(', ') || 'Core terms'}

            Requirements:
            1. Select 5-7 critical keywords that drive the understanding of this topic.
            2. For each keyword, provide:
               - A simple, clear definition.
               - A "Context" sentence relating it to real life in Lesotho or the specific lesson.
               - 2-3 Related Terms from the same topic.
            3. Provide a brief 2-sentence summary of the whole topic.

            Return ONLY a JSON object with this exact structure:
            {
                "keywords": [
                    {
                        "term": "Term",
                        "definition": "Simple definition",
                        "context": "Relatable context or usage",
                        "relatedTerms": ["Related1", "Related2"]
                    }
                ],
                "summary": "Brief topic summary."
            }`;

            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { responseMimeType: 'application/json' },
                cacheKey: `revision_flow_${topic.id}`
            });

            const text = response.text;
            if (!text) {
                throw new Error("No text returned from AI");
            }

            const data = JSON.parse(text);
            setFlowData(data);
            
        } catch (err) {
            console.error("AI Generation failed", err);
            generateDeterministicFallback();
        } finally {
            setLoading(false);
        }
    }, [topic, generateDeterministicFallback]);

    useEffect(() => {
        if (topic) {
            generateKeywordsFlow();
        }
    }, [topic, generateKeywordsFlow]);

    if (loading && !flowData) {
        return (
            <div className="min-h-screen bg-[#0C0C10] flex flex-col items-center justify-center p-8 text-center font-sans">
                <div className="relative mb-4">
                    <div className="w-12 h-12 border-4 border-indigo-900 rounded-full"></div>
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    <Sparkles className="absolute -top-2 -right-2 text-indigo-400 animate-pulse" size={20} fill="currentColor" />
                </div>
                <h3 className="text-lg font-black text-white mb-1">Connecting Concepts</h3>
                <p className="text-xs font-medium text-slate-400 max-w-[200px]">
                    Building a keyword flow for {topic.title}...
                </p>
            </div>
        );
    }

    if (!flowData) return null;

    return (
        <div className="bg-[#0C0C10] text-[#0D0D0F] h-full font-sans flex flex-col relative overflow-hidden">
            {/* Background Glow */}
            <div className="fixed top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(ellipse,rgba(79,70,229,0.12)_0%,transparent_70%)] pointer-events-none z-0" />

            {/* Info Modal */}
            {infoOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200" onClick={() => setInfoOpen(false)}>
                    <div className="w-full bg-white rounded-t-[28px] pb-6 max-h-[88%] overflow-y-auto animate-in slide-in-from-bottom-10 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="w-9 h-1 bg-black/10 rounded-full mx-auto my-3" />
                        <div className="px-5 pb-4 border-b border-black/5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white">
                                    <Brain size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-extrabold text-slate-900">How to use</h3>
                                    <p className="text-[10px] font-medium text-slate-500">Keywords Flow Guide</p>
                                </div>
                            </div>
                            <button onClick={() => setInfoOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            {[
                                { num: 1, color: "bg-indigo-50 text-indigo-600", title: "Follow the Flow", desc: "Read through the keywords in order to understand the topic's story." },
                                { num: 2, color: "bg-emerald-50 text-emerald-600", title: "Connect Context", desc: "See how each term relates to real life in Lesotho." },
                                { num: 3, color: "bg-rose-50 text-rose-600", title: "Expand", desc: "Use the related terms to broaden your vocabulary." },
                            ].map(s => (
                                <div key={s.num} className="flex gap-3 items-start p-3 rounded-xl border border-black/5 bg-slate-50">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${s.color}`}>{s.num}</div>
                                    <div>
                                        <h5 className="text-[12.5px] font-bold text-slate-900 mb-0.5">{s.title}</h5>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#F5F4F0]/90 backdrop-blur-xl border-b border-black/5">
                <div className="flex items-center justify-between px-4 py-3">
                    <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-900 hover:bg-black/5 active:scale-95 transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-center max-w-[60%]">
                        <h2 className="text-xs font-extrabold text-slate-900 tracking-tight truncate leading-tight">{topic.title}</h2>
                        <p className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest">Keywords Flow</p>
                    </div>
                    <button onClick={() => setInfoOpen(true)} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-900 active:scale-95 transition-all border border-black/5">
                        <Info size={14} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 bg-[#F5F4F0] relative z-10 scroll-smooth">
                
                {/* Topic Summary (Compact & Retractable) */}
                <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden transition-all duration-300">
                    <button 
                        onClick={() => setSummaryOpen(!summaryOpen)}
                        className="w-full flex items-center justify-between p-4 active:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <BookOpen size={16} />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Topic Summary</h3>
                                <p className="text-[10px] font-medium text-slate-400">Tap to {summaryOpen ? 'collapse' : 'expand'}</p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 transition-transform duration-300 ${!summaryOpen ? '-rotate-90' : ''}`}>
                            <ChevronDown size={14} />
                        </div>
                    </button>
                    
                    <div className={`grid transition-all duration-300 ease-in-out ${summaryOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <div className="px-4 pb-4 pt-0">
                                <div className="p-3 bg-slate-50 rounded-xl border border-black/5">
                                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                        {flowData.summary}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Keywords Flow */}
                <div className="space-y-4 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-indigo-100 -z-10" />

                    {flowData.keywords.map((kw, idx) => (
                        <div key={idx} className="relative pl-0 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-xs z-10">
                                                {idx + 1}
                                            </div>
                                            <h4 className="text-lg font-black text-slate-900 tracking-tight">{kw.term}</h4>
                                        </div>
                                        <div className="bg-slate-50 px-2 py-1 rounded-lg">
                                            <Target size={14} className="text-slate-400" />
                                        </div>
                                    </div>
                                    
                                    <p className="text-sm text-slate-600 font-medium leading-relaxed mb-3 pl-11">
                                        {kw.definition}
                                    </p>

                                    <div className="pl-11 space-y-2">
                                        <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Lightbulb size={12} className="text-indigo-500" />
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase">Context</span>
                                            </div>
                                            <p className="text-xs text-indigo-900 font-medium">
                                                {kw.context}
                                            </p>
                                        </div>

                                        {kw.relatedTerms.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {kw.relatedTerms.map((term, tIdx) => (
                                                    <span key={tIdx} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                                        {term}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Footer */}
                <div className="mt-8 p-5 bg-white rounded-2xl border border-black/5 text-center shadow-sm">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-3">
                        <Zap size={20} />
                    </div>
                    <h3 className="text-[13px] font-extrabold text-slate-900 mb-1">Ready to Test?</h3>
                    <p className="text-[10px] text-slate-500 mb-4 px-4">
                        You've reviewed {flowData.keywords.length} key concepts.
                    </p>
                    <button 
                        onClick={() => onNavigate && onNavigate('battle')}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-indigo-700"
                    >
                        Start Battle Mode <ArrowRight size={14} />
                    </button>
                </div>

            </main>

            {/* FAB */}
            <button 
                onClick={generateKeywordsFlow}
                disabled={loading}
                className="fixed bottom-6 right-4 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/40 flex items-center justify-center active:scale-90 transition-transform z-50 hover:shadow-indigo-500/60"
            >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
        </div>
    );
};

export default RevisionNotes;
