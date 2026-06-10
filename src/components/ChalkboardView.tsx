
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Topic } from '../types';
import { ArrowLeft, Settings, Grid, Image, Download, CheckCircle, PenTool, Eraser, Trash2, RotateCcw, X, Palette, Save } from 'lucide-react';

interface ChalkboardViewProps {
    topic: Topic;
    customContent?: string; // Expecting JSON string from LessonWizard
    onBack: () => void;
}

const ChalkboardView: React.FC<ChalkboardViewProps> = ({ topic, customContent, onBack }) => {
    // --- Canvas & Interaction State ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawMode, setDrawMode] = useState(false); // True = Canvas active, False = Scroll/Edit
    const [tool, setTool] = useState<'white' | 'yellow' | 'pink' | 'eraser'>('white');
    const [settingsOpen, setSettingsOpen] = useState(false);

    // --- Content State (Editable) ---
    const [content, setContent] = useState<any>(() => {
        let initialData;
        try {
            if (customContent) {
                const parsed = JSON.parse(customContent);
                initialData = parsed.chalkboard_content || {
                    date_placeholder: `Date: ${new Date().toLocaleDateString()}`,
                    subject: parsed.meta?.subject || "General Studies",
                    topic_title: topic.title,
                    key_definitions: parsed.key_vocabulary ? parsed.key_vocabulary.map((v: any) => `${v.term}: ${v.definition}`) : [],
                    core_notes: parsed.development?.steps || [parsed.main_idea || topic.description],
                    examples: parsed.examples || ["Ex 1: ..."],
                    classwork: parsed.conclusion?.content ? [parsed.conclusion.content] : ["1. Summarize the topic."]
                };
            }
        } catch (e) {
            console.error("Failed to parse custom content", e);
        }

        if (!initialData) {
            initialData = {
                date_placeholder: `Date: ${new Date().toLocaleDateString()}`,
                subject: "Subject",
                topic_title: topic.title,
                key_definitions: ["Term: Definition"],
                core_notes: [topic.description],
                examples: [],
                classwork: []
            };
        }
        return initialData;
    });

    // Removed useEffect that was doing synchronous setState

    // --- Canvas Sizing & Logic ---
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current) {
                // We want the canvas to cover the entire scrollable height if possible, 
                // or at least the viewport.
                const { clientWidth, scrollHeight } = containerRef.current;
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = Math.max(scrollHeight, window.innerHeight);
            }
        };

        window.addEventListener('resize', handleResize);
        // Delay initial resize to allow DOM layout
        setTimeout(handleResize, 100);

        return () => window.removeEventListener('resize', handleResize);
    }, [content]); // Re-measure if content expands

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawMode) return;
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getCoords(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 40;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = 3;
            const colors = { white: '#ffffff', yellow: '#facc15', pink: '#f472b6' };
            ctx.strokeStyle = colors[tool as keyof typeof colors] || '#ffffff';
            ctx.shadowBlur = 1;
            ctx.shadowColor = ctx.strokeStyle;
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !drawMode) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getCoords(e, canvas);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const getCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const clearBoard = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setSettingsOpen(false);
    };

    const resetContent = () => {
        // In a real app, reload from props. For now, we just clear edits.
        // Simplified for this demo.
        if (confirm("Reset text changes?")) {
             // Logic to re-parse props would go here
             setSettingsOpen(false);
        }
    };

    // Helper for editable fields
    const handleTextChange = (section: string, index: number | null, value: string) => {
        const newContent = { ...content };
        if (index !== null && Array.isArray(newContent[section])) {
            newContent[section][index] = value;
        } else {
            newContent[section] = value;
        }
        setContent(newContent);
    };

    if (!content) return <div className="bg-gray-900 h-screen w-screen"></div>;

    return (
        <div className="fixed inset-0 z-50 bg-[#1e392a] flex flex-col overflow-hidden font-chalk">
            
            {/* 1. Texture Background Layer */}
            <div className="absolute inset-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-chalk.png')] z-0"></div>
            
            {/* 2. Top Floating Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-50 flex justify-between items-start pointer-events-none">
                <button 
                    onClick={onBack} 
                    className="pointer-events-auto bg-black/20 backdrop-blur-md text-white/80 hover:text-white p-2 rounded-full transition-all hover:bg-black/40"
                >
                    <ArrowLeft size={24} />
                </button>

                <div className="relative pointer-events-auto">
                    <button 
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className={`pointer-events-auto bg-black/20 backdrop-blur-md text-white/80 hover:text-white p-2 rounded-full transition-all hover:bg-black/40 ${settingsOpen ? 'bg-black/60 text-white' : ''}`}
                    >
                        <Settings size={24} />
                    </button>
                    
                    {/* Settings Dropdown */}
                    {settingsOpen && (
                        <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right font-sans">
                            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Board Tools</p>
                            </div>
                            <button onClick={clearBoard} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <Eraser size={16} /> Wipe Drawings
                            </button>
                            <button onClick={resetContent} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                <RotateCcw size={16} /> Reset Text
                            </button>
                            <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                <Save size={16} /> Save Snapshot
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Main Board Content (Scrollable) */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 w-full"
            >
                {/* DOM Content Layer (Under Canvas) */}
                <div className={`relative min-h-full px-6 pt-20 pb-32 md:px-12 md:pt-24 md:pb-40 text-white transition-opacity ${drawMode ? 'opacity-90' : 'opacity-100'}`}>
                    
                    {/* Header Info */}
                    <div className="flex justify-between items-start mb-8 border-b-2 border-white/10 pb-4 text-sm md:text-xl text-gray-300">
                        <div 
                            contentEditable={!drawMode}
                            suppressContentEditableWarning
                            className="outline-none focus:border-b border-yellow-400/50"
                        >
                            {content.subject}
                        </div>
                        <div 
                            contentEditable={!drawMode}
                            suppressContentEditableWarning
                            className="outline-none focus:border-b border-yellow-400/50 text-right"
                        >
                            {content.date_placeholder}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-10">
                        <h1 
                            contentEditable={!drawMode}
                            suppressContentEditableWarning
                            className="text-3xl md:text-5xl text-yellow-300 inline-block border-b-4 border-yellow-300/80 pb-2 px-6 outline-none focus:bg-white/5 rounded-lg transition-colors"
                        >
                            {content.topic_title}
                        </h1>
                    </div>

                    {/* Columns Layout */}
                    <div className="flex flex-col md:flex-row gap-12">
                        
                        {/* Left Col */}
                        <div className="flex-1 space-y-10">
                            {/* Definitions */}
                            <section>
                                <h3 className="text-xl md:text-2xl text-yellow-200 mb-4 underline decoration-white/30 decoration-wavy">Definitions</h3>
                                <ul className="list-disc pl-5 space-y-4">
                                    {content.key_definitions.map((def: string, i: number) => (
                                        <li key={i} className="text-lg md:text-2xl leading-relaxed">
                                            <span 
                                                contentEditable={!drawMode}
                                                suppressContentEditableWarning
                                                className="outline-none focus:bg-white/10 p-1 rounded"
                                            >
                                                {def}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* Core Notes */}
                            <section>
                                <h3 className="text-xl md:text-2xl text-yellow-200 mb-4 underline decoration-white/30 decoration-wavy">Key Points</h3>
                                <div className="space-y-4">
                                    {content.core_notes.map((note: string, i: number) => (
                                        <div key={i} className="flex gap-3 text-lg md:text-2xl leading-relaxed">
                                            <span className="text-yellow-400 mt-1">•</span>
                                            <span 
                                                contentEditable={!drawMode}
                                                suppressContentEditableWarning
                                                className="outline-none focus:bg-white/10 p-1 rounded flex-1"
                                            >
                                                {note}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Right Col */}
                        <div className="flex-1 space-y-10 md:border-l-2 md:border-white/10 md:pl-12">
                            
                            {/* Examples */}
                            {content.examples.length > 0 && (
                                <section className="bg-white/5 rounded-xl p-6 border-2 border-white/20 border-dashed">
                                    <h3 className="text-xl md:text-2xl text-pink-300 mb-4 text-center">Examples</h3>
                                    <div className="space-y-4 font-mono text-lg md:text-xl">
                                        {content.examples.map((ex: string, i: number) => (
                                            <div 
                                                key={i}
                                                contentEditable={!drawMode}
                                                suppressContentEditableWarning
                                                className="outline-none focus:bg-white/10 p-2 rounded"
                                            >
                                                {ex}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Classwork */}
                            <section>
                                <h3 className="text-xl md:text-2xl text-yellow-200 mb-4 underline decoration-white/30 decoration-wavy">Classwork</h3>
                                <ol className="list-decimal pl-6 space-y-4 text-lg md:text-xl">
                                    {content.classwork.map((cw: string, i: number) => (
                                        <li key={i} className="pl-2">
                                            <span 
                                                contentEditable={!drawMode}
                                                suppressContentEditableWarning
                                                className="outline-none focus:bg-white/10 p-1 rounded"
                                            >
                                                {cw}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Canvas Layer (Overlay) */}
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 z-20 touch-none ${drawMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>

            {/* 4. Floating Capsule Toolbar (Bottom) */}
            <div className="absolute bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
                <div className="bg-[#1a1f2e] border border-gray-700 shadow-2xl rounded-full p-2 flex items-center gap-2 pointer-events-auto scale-90 md:scale-100 transition-transform origin-bottom">
                    
                    {/* Mode Toggle */}
                    <div className="flex bg-black/40 rounded-full p-1 mr-2">
                        <button 
                            onClick={() => setDrawMode(false)}
                            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${!drawMode ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Grid size={16} /> <span className="hidden sm:inline">Interact</span>
                        </button>
                        <button 
                            onClick={() => setDrawMode(true)}
                            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${drawMode ? 'bg-teacherBlue text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            <PenTool size={16} /> <span className="hidden sm:inline">Chalk</span>
                        </button>
                    </div>

                    {/* Colors (Only visible in Draw Mode) */}
                    <div className={`flex items-center gap-2 px-2 transition-all duration-300 ${drawMode ? 'opacity-100 max-w-xs' : 'opacity-30 max-w-0 overflow-hidden'}`}>
                        <button onClick={() => setTool('white')} className={`size-8 rounded-full bg-white border-2 transition-transform ${tool === 'white' ? 'border-blue-500 scale-110' : 'border-transparent'}`} />
                        <button onClick={() => setTool('yellow')} className={`size-8 rounded-full bg-yellow-400 border-2 transition-transform ${tool === 'yellow' ? 'border-blue-500 scale-110' : 'border-transparent'}`} />
                        <button onClick={() => setTool('pink')} className={`size-8 rounded-full bg-pink-400 border-2 transition-transform ${tool === 'pink' ? 'border-blue-500 scale-110' : 'border-transparent'}`} />
                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                        <button 
                            onClick={() => setTool('eraser')}
                            className={`p-2 rounded-full transition-colors ${tool === 'eraser' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Eraser size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChalkboardView;
