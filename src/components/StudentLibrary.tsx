
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserState, SavedItem, Topic, StudyMode } from '../types';
import { 
    Search, Layers, BookOpen, FlaskConical, 
    Calculator, Book, Download, Trash2, Sparkles, 
    ChevronDown, ChevronUp, X, Printer, FileText,
    Loader2, Mic, RotateCw, CheckCircle, Lightbulb, Play, Gamepad2
} from 'lucide-react';
import { aiClient } from '../utils/aiClient';
import { useToast } from '../contexts/ToastContext';
import { supportsSpeechRecognition, safeJsonParse } from '../utils/aiHelpers';

interface StudentLibraryProps {
    user: UserState;
    onNavigate?: (view: string) => void;
    topic?: Topic | null;
    onSetMode?: (mode: StudyMode) => void;
}

const StudentLibrary: React.FC<StudentLibraryProps> = ({ user, onNavigate, topic, onSetMode }) => {
    const { addToast } = useToast();
    const [items, setItems] = useState<SavedItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [isRecentExpanded, setIsRecentExpanded] = useState(true);
    
    // Viewer State
    const [viewingItem, setViewingItem] = useState<SavedItem | null>(null);

    // Generator State
    const [showGenerator, setShowGenerator] = useState(false);
    const [genTopic, setGenTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [canUseSpeech, setCanUseSpeech] = useState(false);

    const loadLibrary = useCallback(() => {
        const allItems: SavedItem[] = [];
        
        if (user.isDemo) {
            // 1. Library items
            const libraryItems = JSON.parse(localStorage.getItem('motlatsi_library') || '[]');
            libraryItems.forEach((item: any) => {
                if (!item.type) item.type = 'unknown';
                
                // STUDENT FILTERING LOGIC
                // Exclude content formats not suitable for students (Worksheets, Teacher Lesson Plans)
                if (item.type === 'worksheet') return;
                if (item.type === 'chat') return;
                
                // Check for Teacher Lesson Plan signature (has 'development' section)
                if (item.type === 'lesson' && (item.data?.development || item.data?.chalkboard_content)) {
                    return; 
                }

                allItems.push(item);
            });
        } else {
            // Real User: Fetch from Supabase (not implemented yet, but ensure it's empty)
        }

        // Sort new to old
        allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setItems(allItems);
    }, [user.isDemo]);

    useEffect(() => {
        loadLibrary();
        setCanUseSpeech(supportsSpeechRecognition());
    }, [user.name, loadLibrary]);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(confirm("Delete this saved item?")) {
            const updatedItems = items.filter(i => i.id !== id);
            setItems(updatedItems);
            
            if (user.isDemo) {
                const library = JSON.parse(localStorage.getItem('motlatsi_library') || '[]');
                const updatedLib = library.filter((i: any) => i.id !== id);
                localStorage.setItem('motlatsi_library', JSON.stringify(updatedLib));
            }

            if (viewingItem?.id === id) setViewingItem(null);
        }
    };

    const startListening = () => {
        if (canUseSpeech) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setGenTopic(prev => prev + (prev ? ' ' : '') + transcript);
            };
            recognition.onerror = () => setIsListening(false);
            recognition.start();
        } else {
            addToast("Voice input not available", "error");
        }
    };

    const handleGenerateStudyGuide = async () => {
        if (!genTopic.trim()) return;
        setIsGenerating(true);
        try {
            const prompt = `
                Create a study guide for a Grade ${user.currentGrade} student.
                Topic: ${genTopic}
                Format as JSON:
                {
                    "title": "Topic Title",
                    "intro": "Brief simple introduction.",
                    "sections": [
                        {"heading": "Key Concept", "points": ["Fact 1", "Fact 2"]},
                        {"heading": "Example", "points": ["Step-by-step example"]}
                    ],
                    "quiz": [
                        {"question": "Q1?", "answer": "A1"}
                    ]
                }
            `;

            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const content = safeJsonParse<any>(response.text);
            
            if (content) {
                const newItem: SavedItem = {
                    id: `guide-${Date.now()}`,
                    type: 'lesson', // Stored as lesson but structure determines it's a study guide
                    title: content.title || genTopic,
                    date: new Date().toISOString(),
                    data: content
                };

                if (user.isDemo) {
                    const currentLib = JSON.parse(localStorage.getItem('motlatsi_library') || '[]');
                    localStorage.setItem('motlatsi_library', JSON.stringify([newItem, ...currentLib]));
                }
                
                loadLibrary();
                setShowGenerator(false);
                setGenTopic('');
                setViewingItem(newItem);
                addToast("Study Guide generated!", "success");
            } else {
                throw new Error("Invalid format");
            }

        } catch (e) {
            addToast("Failed to generate guide. Try again.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('printable-content');
        if (printContent) {
            const originalContent = document.body.innerHTML;
            document.body.innerHTML = printContent.innerHTML;
            window.print();
            document.body.innerHTML = originalContent;
            window.location.reload(); 
        }
    };

    // --- Renderers for Content Types ---

    const RenderFlashcardSet = ({ data }: { data: any }) => {
        // Handle array of flashcards
        const cards = Array.isArray(data) ? data : [data];
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cards.map((card: any, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
                        <div className="text-center pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">{card.term || "Term"}</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Front</p>
                        </div>
                        <div className="text-center flex-1 flex flex-col justify-center">
                            <p className="text-sm text-gray-700 font-medium leading-relaxed">{card.definition || card.explanation || "Definition"}</p>
                            {card.mnemonic && (
                                <div className="mt-4 bg-yellow-50 text-yellow-800 p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                                    <Lightbulb size={12} /> {card.mnemonic}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const RenderStudyGuide = ({ data }: { data: any }) => {
        return (
            <div className="space-y-8">
                {data.intro && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-900 text-sm leading-relaxed">
                        {data.intro}
                    </div>
                )}
                {data.sections?.map((section: any, idx: number) => (
                    <div key={idx}>
                        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="bg-gray-200 text-gray-700 size-6 flex items-center justify-center rounded-full text-xs">{idx + 1}</span>
                            {section.heading}
                        </h3>
                        <ul className="space-y-2 pl-2 border-l-2 border-gray-100 ml-3">
                            {section.points?.map((point: string, pIdx: number) => (
                                <li key={pIdx} className="text-sm text-gray-600 flex gap-2">
                                    <span className="text-teacherBlue mt-1">•</span>
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                {data.quiz && (
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-500" /> Review Game Prep
                        </h3>
                        <div className="space-y-4">
                            {data.quiz.map((q: any, qIdx: number) => (
                                <div key={qIdx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <p className="text-sm font-bold text-gray-800 mb-2">Q: {q.question}</p>
                                    <p className="text-xs text-green-700 font-medium bg-green-50 px-2 py-1 rounded inline-block">A: {q.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderContent = (item: SavedItem) => {
        if (item.type === 'flashcard') return <RenderFlashcardSet data={item.data} />;
        // Default to Study Guide renderer for 'lesson' type in Student View
        return <RenderStudyGuide data={item.data} />;
    };

    const getCategoryStyle = (item: SavedItem) => {
        const title = item.title.toLowerCase();
        if (title.includes('math') || title.includes('number')) {
            return { icon: <Calculator size={18} className="text-orange-500" />, bg: 'bg-orange-50', subject: 'Math' };
        }
        if (title.includes('science') || title.includes('bio')) {
            return { icon: <FlaskConical size={18} className="text-blue-500" />, bg: 'bg-blue-50', subject: 'Science' };
        }
        if (title.includes('history')) {
            return { icon: <Book size={18} className="text-indigo-600" />, bg: 'bg-indigo-50', subject: 'History' };
        }
        return { icon: <Sparkles size={18} className="text-[#136dec]" />, bg: 'bg-[#136dec]/10', subject: item.type === 'flashcard' ? 'Cards' : 'Guide' };
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'All' 
            ? true 
            : activeFilter === 'Flashcards' ? item.type === 'flashcard'
            : activeFilter === 'Study Guides' ? item.type === 'lesson'
            : true;
        return matchesSearch && matchesFilter;
    });

    const handleCreateFlashcards = () => {
        if (topic && onSetMode && onNavigate) {
            onSetMode('intro');
            onNavigate('interactive-lesson');
        } else if (onNavigate) {
            addToast("Select a topic from Journey first", "info");
            onNavigate('journey');
        }
    };

    const handleCreateStudyGuide = () => {
        if (topic && onSetMode && onNavigate) {
            onSetMode('deep-dive');
            onNavigate('interactive-lesson');
        } else if (onNavigate) {
            addToast("Select a topic from Journey first", "info");
            onNavigate('journey');
        }
    };

    return (
        <div className="bg-[#f8fafc] h-full flex flex-col font-sans text-[#0f172a] overflow-hidden relative">
            
            {/* Header */}
            <div className="shrink-0 bg-[#f8fafc]/95 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="px-4 pt-3 pb-2 flex justify-between items-center">
                    <h1 className="text-lg font-extrabold text-[#0f172a] tracking-tight">Student Library</h1>
                </div>

                <div className="px-4 pb-2">
                    <div className="relative flex items-center group">
                        <Search className="absolute left-3 text-slate-400 transition-colors" size={14} />
                        <input 
                            className="w-full h-9 pl-9 pr-4 bg-white border border-gray-200 rounded-xl shadow-sm text-xs font-medium focus:outline-none focus:border-[#136dec] focus:ring-1 focus:ring-[#136dec]" 
                            placeholder="Search guides, cards..." 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar pb-2">
                    {['All', 'Flashcards', 'Study Guides'].map(filter => (
                        <button 
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${
                                activeFilter === filter 
                                ? 'bg-[#136dec] text-white border-[#136dec] shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-24 scrollbar-hide">
                
                {/* Create New Grid */}
                <section>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Create New</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={handleCreateFlashcards}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 active:scale-95 transition-transform group hover:border-blue-300"
                        >
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                                <Layers size={20} className="text-[#136dec]" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-slate-900 text-xs leading-tight">Flashcards</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">Key Concepts</p>
                            </div>
                        </button>
                        <button 
                            onClick={handleCreateStudyGuide}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 active:scale-95 transition-transform group hover:border-indigo-300"
                        >
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                <BookOpen size={20} className="text-indigo-600" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-slate-900 text-xs leading-tight">Study Guide</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">Interactive Lesson</p>
                            </div>
                        </button>
                    </div>
                </section>

                {/* Items List */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setIsRecentExpanded(!isRecentExpanded)}
                    >
                        <h3 className="text-xs font-bold text-[#1e293b] uppercase tracking-wide">Saved Materials</h3>
                        {isRecentExpanded ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                    </div>
                    
                    {isRecentExpanded && (
                        <div className="p-2 pt-0 space-y-2">
                            {filteredItems.length === 0 ? (
                                <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-100 mx-1">
                                    <p className="text-xs">No items found</p>
                                </div>
                            ) : (
                                filteredItems.map(item => {
                                    const style = getCategoryStyle(item);
                                    return (
                                        <div key={item.id} onClick={() => setViewingItem(item)} className="flex gap-3 p-2 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-white transition-colors cursor-pointer group">
                                            <div className={`w-10 h-10 ${style.bg} rounded-lg flex items-center justify-center shrink-0`}>
                                                {style.icon}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-[#136dec] transition-colors">{item.title}</h4>
                                                    <span className="text-[9px] text-slate-400 whitespace-nowrap ml-2">
                                                        {new Date(item.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[9px] text-slate-500 font-medium truncate">{style.subject} • {item.type === 'lesson' ? 'Study Guide' : 'Flashcards'}</p>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={(e) => handleDelete(item.id, e)}
                                                            className="text-[9px] font-bold text-red-300 hover:text-red-500 flex items-center gap-0.5 p-1"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* Document Viewer Modal */}
            {viewingItem && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom-10">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white/90 backdrop-blur-sm sticky top-0 z-10">
                        <button onClick={() => setViewingItem(null)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-slate-600" />
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {viewingItem.type === 'lesson' ? 'Study Guide' : 'Flashcards'}
                            </span>
                            <h2 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{viewingItem.title}</h2>
                        </div>
                        <button onClick={handlePrint} className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors text-[#136dec]">
                            <Printer size={24} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50" id="printable-content">
                        <div className="max-w-2xl mx-auto bg-white p-8 rounded-none md:rounded-2xl shadow-sm border border-gray-100 min-h-full md:min-h-[auto]">
                            <div className="border-b border-gray-100 pb-4 mb-6">
                                <h1 className="text-2xl font-black text-slate-900 mb-2">{viewingItem.title}</h1>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{new Date(viewingItem.date).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span className="uppercase font-bold tracking-wider">
                                        {viewingItem.type === 'lesson' ? 'Study Guide' : 'Flashcards'}
                                    </span>
                                </div>
                            </div>
                            {/* Content Renderer */}
                            {renderContent(viewingItem)}
                        </div>
                    </div>
                </div>
            )}

            {/* Generator Modal - Upgraded UI */}
            {showGenerator && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 relative overflow-hidden">
                        {/* Header Background */}
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-indigo-500 to-purple-600"></div>
                        <div className="absolute top-4 right-4 z-10">
                            <button onClick={() => setShowGenerator(false)} className="bg-black/20 text-white p-1 rounded-full hover:bg-black/40"><X size={20} /></button>
                        </div>
                        
                        <div className="relative z-10 mt-8 mb-4 flex flex-col items-center">
                            <div className="bg-white p-3 rounded-2xl shadow-lg mb-3">
                                <Sparkles size={32} className="text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 text-center">AI Study Guide</h3>
                            <p className="text-xs text-slate-500 text-center max-w-[200px]">Turn any topic into a smart, structured learning guide in seconds.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={genTopic}
                                    onChange={(e) => setGenTopic(e.target.value)}
                                    placeholder="e.g. Photosynthesis..."
                                    className="w-full pl-4 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-bold text-slate-900 shadow-inner"
                                />
                                <button 
                                    onClick={startListening}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
                                >
                                    <Mic size={20} />
                                </button>
                            </div>
                            
                            <button 
                                onClick={handleGenerateStudyGuide}
                                disabled={isGenerating || !genTopic}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all"
                            >
                                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <RotateCw size={18} />}
                                <span>Generate Magic Guide</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentLibrary;
