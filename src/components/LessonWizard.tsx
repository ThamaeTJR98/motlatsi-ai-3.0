
import React, { useState, useEffect } from 'react';
import BulkUnitCreator from './BulkUnitCreator';
import { Topic, ScheduleSlot, SavedItem, AppView } from '../types';
import { allGrades } from '../curriculum'; 
import { aiClient } from '../utils/aiClient';
import { safeJsonParse, supportsSpeechRecognition, getLearnerProfileContext } from '../utils/aiHelpers';
import { useToast } from '../contexts/ToastContext';
import { useLearningEngine } from '../contexts/LearningEngineContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    Sparkles, Clock, ArrowLeft, RefreshCw, 
    CheckCircle, Mic, ChevronRight, ChevronDown, GraduationCap, 
    BookOpen, Target, Users, LifeBuoy, Zap, Edit2, Plus, Trash2, CalendarDays, X, MapPin, Package, Languages, List, Search, ArrowUp, ArrowDown, LayoutTemplate, Printer, AlertCircle
} from 'lucide-react';

interface LessonWizardProps {
    topic: Topic | null;
    onOpenChalkboard: (topic: Topic, content?: string) => void;
    onBack: () => void;
    onNavigate: (view: string) => void;
    onTopicSelect?: (topic: Topic) => void;
}

const LessonWizard: React.FC<LessonWizardProps> = ({ topic, onOpenChalkboard, onBack, onNavigate, onTopicSelect }) => {
    // --- Context & Hooks ---
    const { addToast } = useToast();
    const { schedule, refreshSchedule } = useLearningEngine();
    const { user } = useAuth();

    // --- Selection State ---
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(topic);
    
    // --- View State ---
    const [planningMode, setPlanningMode] = useState<'single' | 'bulk'>('single');
    const [viewMode, setViewMode] = useState<'config' | 'plan'>('config');
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    
    // --- Config State ---
    const [contextInput, setContextInput] = useState('');
    const [duration, setDuration] = useState('40 Minutes');
    const [generating, setGenerating] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [activeListenField, setActiveListenField] = useState<string | null>(null);
    const [canUseSpeech, setCanUseSpeech] = useState(false);
    
    // --- Editable Plan State ---
    const [editablePlan, setEditablePlan] = useState<any>(null);
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [newlyAddedObjectiveIndex, setNewlyAddedObjectiveIndex] = useState<number | null>(null);
    
    // --- Scheduling State ---
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleConfig, setScheduleConfig] = useState({ day: 'Mon', time: '09:00' });
    
    // Explicit inclusion override for lesson planning
    const [explicitNeeds, setExplicitNeeds] = useState<string[]>([]);

    // Quick Context Tags
    const contextTags = ["Large Class (50+)", "No Electricity", "Mixed Ability", "Outdoors", "Group Work Focus"];
    const inclusionTags = ["Visual Impairment", "Hearing Impairment", "Dyslexia"];

    useEffect(() => {
        setCanUseSpeech(supportsSpeechRecognition());
    }, []);

    // Expand initial state if topic provided, checking for saved drafts
    useEffect(() => {
        if (topic) {
            setSelectedTopic(topic);

            // Check for a saved draft for this topic to restore state
            const savedDraftKey = `motlatsi_wizard_draft_${topic.id}`;
            const savedDraft = localStorage.getItem(savedDraftKey);

            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    setEditablePlan(parsed);
                    setViewMode('plan');
                    // Find context data if available (optional)
                    if (allGrades && allGrades.length > 0) {
                        for (const g of allGrades) {
                            for (const s of g.subjects) {
                                if (s.topics.some(t => t.id === topic.id)) {
                                    setSelectedGrade(g.grade);
                                    setSelectedSubject(s.name);
                                    break;
                                }
                            }
                        }
                    }
                    return; 
                } catch (e) {
                    console.error("Failed to restore draft", e);
                }
            }

            // Default behavior if no draft
            setViewMode('config');
            if (allGrades && allGrades.length > 0) {
                for (const g of allGrades) {
                    for (const s of g.subjects) {
                        if (s.topics.some(t => t.id === topic.id)) {
                            setSelectedGrade(g.grade);
                            setSelectedSubject(s.name);
                            break;
                        }
                    }
                }
            }
        }
    }, [topic]);

    // Auto-save draft when plan changes
    useEffect(() => {
        if (selectedTopic && editablePlan) {
            localStorage.setItem(`motlatsi_wizard_draft_${selectedTopic.id}`, JSON.stringify(editablePlan));
        }
    }, [editablePlan, selectedTopic]);

    // --- Helpers ---

    const handleExit = () => {
        // Clear draft when explicitly exiting the wizard flow (back to dashboard)
        if (selectedTopic) {
            localStorage.removeItem(`motlatsi_wizard_draft_${selectedTopic.id}`);
        }
        onBack();
    };

    const startListening = (fieldName: string) => {
        if (canUseSpeech) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setIsListening(true);
                setActiveListenField(fieldName);
            };
            recognition.onend = () => {
                setIsListening(false);
                setActiveListenField(null);
            };
            
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                
                if (fieldName === 'context') {
                    setContextInput(prev => prev + (prev ? ' ' : '') + transcript);
                } else if (editablePlan) {
                    // Handle deep updates for the plan
                    const newPlan = { ...editablePlan };
                    
                    if (fieldName.includes('.')) {
                        const parts = fieldName.split('.');
                        if (parts.length === 2 && newPlan[parts[0]]) {
                            newPlan[parts[0]][parts[1]] += " " + transcript;
                        }
                    }
                    setEditablePlan(newPlan);
                }
            };
            
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                setActiveListenField(null);
            };
            recognition.start();
        }
    };

    const toggleContextTag = (tag: string) => {
        if (contextInput.includes(tag)) {
            setContextInput(prev => prev.replace(tag, '').trim());
        } else {
            setContextInput(prev => (prev ? prev + ", " : "") + tag);
        }
    };

    const toggleInclusionTag = (tag: string) => {
        if (explicitNeeds.includes(tag)) {
            setExplicitNeeds(prev => prev.filter(t => t !== tag));
        } else {
            setExplicitNeeds(prev => [...prev, tag]);
        }
    };

    const handleTopicClick = (t: Topic, sName: string, gName: string) => {
        if (t.id !== selectedTopic?.id) {
            setSelectedTopic(t);
            setSelectedSubject(sName);
            setSelectedGrade(gName);
            setViewMode('config');
            setEditablePlan(null);
            setMobileSidebarOpen(false);

            // Sync with parent app state so navigation works correctly
            if (onTopicSelect) {
                onTopicSelect(t);
            }
        }
    };

    const handleGenerate = async () => {
        if (!selectedTopic) return;
        setGenerating(true);
        try {
            const simulatedNeeds = explicitNeeds.map(t => 
                t === "Visual Impairment" ? 'visual_impairment' : 
                t === "Hearing Impairment" ? 'auditory_impairment' : 
                'dyslexia'
            ) as any;

            const inclusionContext = getLearnerProfileContext(simulatedNeeds);

            const prompt = `
                Act as an expert primary school teacher in Lesotho. Create a structured lesson plan AND a chalkboard layout for kids (ages 6-13).
                Topic: ${selectedTopic.title}
                Description: ${selectedTopic.description}
                Objectives: ${selectedTopic.learningObjectives?.join(', ')}
                
                Constraints: 
                - Duration ${duration}.
                - Teacher Context: ${contextInput || "Standard classroom resources."}
                - IMPORTANT: Use layman's terms. Avoid chunky paragraphs. Use bullet points or short sentences.
                - RELATABILITY: Use scenarios, stories, and cultural references from Lesotho (e.g., mountains, cattle, papa, village life, school games like morabaraba).
                - Time Format: Use "5min" or "10min" (not "5M").
                
                ${inclusionContext}

                Output valid JSON:
                {
                    "meta": {
                        "theme": "Core theme string (relatable to Lesotho kids)",
                        "difficulty": "Easy/Medium/Hard",
                        "location": "Classroom/Field/Lab"
                    },
                    "objectives": ["Objective 1 in simple words", "Objective 2 in simple words"],
                    "main_idea": "The big concept in 1 simple sentence using a story or analogy",
                    "key_vocabulary": [
                        {"term": "Word 1", "definition": "Simple definition using a relatable example"},
                        {"term": "Word 2", "definition": "Simple definition using a relatable example"}
                    ],
                    "materials_needed": ["Item 1", "Item 2", "Item 3", "Item 4"],
                    "introduction": {
                        "title": "Introduction",
                        "time": "5min",
                        "content": "Hook activity using a story or game relatable to Lesotho kids"
                    },
                    "development": {
                        "title": "Development",
                        "time": "25min",
                        "steps": ["Step 1", "Step 2", "Step 3"]
                    },
                    "differentiation": {
                        "support": "Strategy for struggling learners (simple)",
                        "challenge": "Strategy for advanced learners (simple)"
                    },
                    "conclusion": {
                        "title": "Conclusion",
                        "time": "10min",
                        "content": "Wrap up activity or exit ticket using a relatable scenario."
                    },
                    "chalkboard_content": {
                        "date_placeholder": "Date: [Today's Date]",
                        "subject": "${selectedSubject}",
                        "topic_title": "${selectedTopic.title}",
                        "key_definitions": ["Term: Simple Definition", "Term: Simple Definition"],
                        "core_notes": ["Simple Point 1", "Simple Point 2", "Simple Point 3"],
                        "examples": ["Example 1: Relatable story...", "Example 2: Relatable story..."],
                        "classwork": ["Q1: Simple question...", "Q2: Simple question..."]
                    }
                }
            `;

            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' },
                cacheKey: `lesson_plan_${selectedTopic.id}_${selectedGrade}_${selectedSubject.replace(/\s+/g, '_')}`,
                organizationId: user?.organization_id
            });

            const parsed = safeJsonParse<any>(response.text);
            if (parsed) {
                // Ensure objectives exist in parsed data or fallback to topic
                if (!parsed.objectives) parsed.objectives = selectedTopic.learningObjectives || [];
                setEditablePlan(parsed);
                setViewMode('plan');
            } else {
                throw new Error("Invalid plan format");
            }
        } catch (error: any) {
            console.error(error);
            const isQuota = error?.message === 'QUOTA_EXCEEDED' || error?.status === 402;
            addToast(isQuota 
                ? "AI Quota reached. Please check your credits in your profile or connect a paid key." 
                : "Could not generate plan. Please try again.", 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleUpdatePlan = (section: string, key: string, value: any) => {
        if (!editablePlan) return;
        setEditablePlan((prev: any) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    // --- Array Manipulation Helpers ---

    const moveItem = (arrayName: string, index: number, direction: 'up' | 'down') => {
        if (!editablePlan) return;
        
        // Handle specific nested paths
        let list = [];
        if (arrayName === 'objectives') list = [...editablePlan.objectives];
        else if (arrayName === 'development.steps') list = [...editablePlan.development.steps];
        else return;

        if (direction === 'up' && index > 0) {
            [list[index], list[index - 1]] = [list[index - 1], list[index]];
        } else if (direction === 'down' && index < list.length - 1) {
            [list[index], list[index + 1]] = [list[index + 1], list[index]];
        }

        if (arrayName === 'objectives') {
            setEditablePlan({ ...editablePlan, objectives: list });
        } else if (arrayName === 'development.steps') {
            setEditablePlan({ 
                ...editablePlan, 
                development: { ...editablePlan.development, steps: list } 
            });
        }
    };

    const updateItem = (arrayName: string, index: number, value: any) => {
        if (arrayName === 'objectives') {
            const list = [...editablePlan.objectives];
            list[index] = value;
            setEditablePlan({ ...editablePlan, objectives: list });
        } else if (arrayName === 'development.steps') {
            const list = [...editablePlan.development.steps];
            list[index] = value;
            setEditablePlan({ 
                ...editablePlan, 
                development: { ...editablePlan.development, steps: list } 
            });
        } else if (arrayName === 'key_vocabulary') {
             const list = [...editablePlan.key_vocabulary];
             list[index] = { ...list[index], ...value };
             setEditablePlan({ ...editablePlan, key_vocabulary: list });
        }
    };

    const deleteItem = (arrayName: string, index: number) => {
        if (arrayName === 'objectives') {
            const list = [...editablePlan.objectives];
            list.splice(index, 1);
            setEditablePlan({ ...editablePlan, objectives: list });
        } else if (arrayName === 'development.steps') {
            const list = [...editablePlan.development.steps];
            list.splice(index, 1);
            setEditablePlan({ 
                ...editablePlan, 
                development: { ...editablePlan.development, steps: list } 
            });
        }
    };

    const addItem = (arrayName: string) => {
         if (arrayName === 'objectives') {
            const newIndex = editablePlan.objectives.length;
            setEditablePlan({ ...editablePlan, objectives: [...editablePlan.objectives, ""] });
            setNewlyAddedObjectiveIndex(newIndex);
        } else if (arrayName === 'development.steps') {
            setEditablePlan({ 
                ...editablePlan, 
                development: { ...editablePlan.development, steps: [...(editablePlan.development.steps || []), "New step"] } 
            });
        }
    };

    const handlePublish = () => {
        if (!selectedTopic || !editablePlan) return;

        // 1. Add to Schedule (with Grade info for filtering)
        const newSlot: ScheduleSlot = {
            id: `plan-${Date.now()}`,
            day: scheduleConfig.day,
            time: scheduleConfig.time,
            subject: selectedSubject || 'General',
            grade: selectedGrade ? selectedGrade.replace('Grade ', '') : undefined, // Clean grade string
            type: 'class',
            notes: `${selectedTopic.title}: ${editablePlan.main_idea}`,
            location: editablePlan.meta.location,
            autoGenerated: false,
            linkedTopicId: selectedTopic.id,
            // Add extra metadata for the scheduler to show it's a planned lesson
            status: 'planned'
        };

        // Check for conflicts
        const hasConflict = schedule.some(s => s.day === scheduleConfig.day && s.time === scheduleConfig.time);
        
        const updatedSchedule = [...schedule, newSlot];
        localStorage.setItem('motlatsi_schedule', JSON.stringify(updatedSchedule));
        refreshSchedule();
        
        // 2. Save to Library (with hidden linkage for detail view)
        const libraryItem: SavedItem = {
            id: `lib-${Date.now()}`,
            type: 'lesson',
            title: selectedTopic.title,
            date: new Date().toISOString(),
            data: {
                ...editablePlan,
                linkedTopicId: selectedTopic.id // Store linkage here for easy lookup
            }
        };
        const currentLib = JSON.parse(localStorage.getItem('motlatsi_library') || '[]');
        localStorage.setItem('motlatsi_library', JSON.stringify([libraryItem, ...currentLib]));

        if (hasConflict) {
            addToast("Lesson Published! Note: There is a schedule conflict at this time.", "info");
        } else {
            addToast("Lesson Published to Schedule & Library!", "success");
        }
        
        setShowScheduleModal(false);
        handleExit(); // Return to dashboard, cleanup draft
    };

    const findSmartSuggestion = () => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
        
        for (const day of days) {
            for (const time of times) {
                const isBusy = schedule.some(s => s.day === day && s.time === time);
                if (!isBusy) {
                    setScheduleConfig({ day, time });
                    addToast(`Suggested: ${day} at ${time}`, "info");
                    return;
                }
            }
        }
        addToast("No empty slots found in standard hours.", "info");
    };

    const handleGoToWorksheet = () => {
        // Critical Sync: Ensure parent has the correct topic before navigation
        if (selectedTopic && onTopicSelect) {
            onTopicSelect(selectedTopic);
        }
        
        if (onNavigate) {
            onNavigate('worksheet-generator');
        } else {
            console.error("Navigation handler not provided to LessonWizard");
            addToast("Navigation error", "error");
        }
    };

    const renderSidebar = () => (
        <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200 w-full md:w-80 flex-shrink-0">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10 shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Filter curriculum..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teacherBlue"
                    />
                </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 pb-20">
                {allGrades && allGrades.map(g => {
                    const isGradeExpanded = selectedGrade === g.grade || searchQuery.length > 0;
                    
                    return (
                        <div key={g.grade} className="space-y-1">
                            <button 
                                onClick={() => setSelectedGrade(selectedGrade === g.grade ? '' : g.grade)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${selectedGrade === g.grade ? 'bg-white text-teacherBlue shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <GraduationCap size={16} />
                                    {g.grade}
                                </div>
                                {isGradeExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>

                            {isGradeExpanded && (
                                <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
                                    {g.subjects.map(s => {
                                        const isSubjectExpanded = selectedSubject === s.name || searchQuery.length > 0;
                                        
                                        // Filter topics if search
                                        const visibleTopics = s.topics.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
                                        if (searchQuery.length > 0 && visibleTopics.length === 0) return null;

                                        return (
                                            <div key={s.name} className="space-y-1">
                                                <button 
                                                    onClick={() => setSelectedSubject(selectedSubject === s.name ? '' : s.name)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${selectedSubject === s.name ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:bg-gray-100'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen size={14} />
                                                        {s.name}
                                                    </div>
                                                    {isSubjectExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                </button>

                                                {isSubjectExpanded && (
                                                    <div className="ml-4 space-y-0.5">
                                                        {visibleTopics.map(t => (
                                                            <button
                                                                key={t.id}
                                                                onClick={() => handleTopicClick(t, s.name, g.grade)}
                                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${selectedTopic?.id === t.id ? 'bg-teacherBlue text-white font-bold shadow-md' : 'text-gray-600 hover:bg-white hover:text-teacherBlue'}`}
                                                            >
                                                                {t.title}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderPlanView = () => (
        <div className="flex flex-col h-full animate-in fade-in bg-white dark:bg-[#1a1f23]">
            {/* Template Header */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1a1f23]/95 backdrop-blur-md px-4 py-4 border-b border-teacherBlue/10 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setViewMode('config')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-teacherBlue transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Lesson Plan</h1>
                </div>
                
                <div className="flex items-center gap-3">
                     {/* Create Worksheet Button */}
                     <button 
                        onClick={handleGoToWorksheet} 
                        className="text-xs font-bold text-teal-600 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full hover:bg-teal-100 transition-colors flex items-center gap-1.5"
                    >
                        <LayoutTemplate size={14} />
                        <span className="hidden sm:inline">Worksheet</span>
                    </button>

                    <button 
                        onClick={() => window.print()} 
                        className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                    >
                        <Printer size={14} />
                        <span className="hidden sm:inline">Print</span>
                    </button>

                     <button onClick={() => setViewMode('config')} className="text-xs font-bold text-teacherBlue px-3 py-1 border border-teacherBlue/20 rounded-full hover:bg-teacherBlue/5 transition-colors hidden sm:block">
                        Regenerate
                    </button>
                    <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hidden sm:inline">Chalkboard</span>
                        <button 
                            onClick={() => selectedTopic && onOpenChalkboard(selectedTopic, JSON.stringify(editablePlan))}
                            className="relative inline-flex h-6 w-11 items-center rounded-full bg-teacherBlue/30 dark:bg-teacherBlue/50 hover:bg-teacherBlue transition-colors"
                        >
                            <span className="sr-only">Toggle Chalkboard</span>
                            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out translate-x-6"></span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-2xl mx-auto w-full pb-32">
                
                {/* Meta Info Bar */}
                <section className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    <div className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 shadow-sm border border-gray-100 dark:border-gray-700">
                        <Users size={18} className="text-teacherBlue" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Grade {selectedGrade}</p>
                    </div>
                    <div className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 shadow-sm border border-gray-100 dark:border-gray-700">
                        <Clock size={18} className="text-teacherBlue" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{duration}</p>
                    </div>
                    <div className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 shadow-sm border border-gray-100 dark:border-gray-700">
                        <MapPin size={18} className="text-teacherBlue" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{editablePlan.meta?.location || "Classroom"}</p>
                    </div>
                </section>

                {/* Learning Objectives - Editable & Reorderable */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <Target size={20} className="text-teacherBlue" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Learning Objectives</h3>
                        <div className="ml-auto flex gap-2">
                            <button 
                                onClick={() => addItem('objectives')}
                                className="p-1.5 text-teacherBlue hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 shadow-sm border-l-4 border-teacherBlue">
                        <div className="space-y-3">
                            {editablePlan.objectives?.map((obj: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 group relative">
                                    <div className="mt-1">
                                        <CheckCircle size={14} className="text-teacherBlue" />
                                    </div>
                                    <textarea 
                                        autoFocus={i === newlyAddedObjectiveIndex}
                                        onFocus={() => {
                                            if (i === newlyAddedObjectiveIndex) setNewlyAddedObjectiveIndex(null);
                                        }}
                                        value={obj}
                                        onChange={(e) => updateItem('objectives', i, e.target.value)}
                                        placeholder="Enter learning objective..."
                                        className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 border-none p-0 focus:ring-0 resize-none focus:bg-white/50 dark:focus:bg-white/5 rounded px-1 transition-colors"
                                        rows={1}
                                        onInput={(e: any) => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        ref={(el) => {
                                            if (el) {
                                                el.style.height = 'auto';
                                                el.style.height = el.scrollHeight + 'px';
                                            }
                                        }}
                                    />
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveItem('objectives', i, 'up')} disabled={i === 0} className="text-gray-400 hover:text-teacherBlue p-0.5"><ArrowUp size={12}/></button>
                                        <button onClick={() => moveItem('objectives', i, 'down')} disabled={i === editablePlan.objectives.length - 1} className="text-gray-400 hover:text-teacherBlue p-0.5"><ArrowDown size={12}/></button>
                                        <button onClick={() => deleteItem('objectives', i)} className="text-red-400 hover:text-red-500 p-0.5 ml-1"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Materials Needed */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <Package size={20} className="text-teacherBlue" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Materials Needed</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {editablePlan.materials_needed?.map((item: string, i: number) => (
                            <div key={i} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                    <span className="text-teacherBlue text-xs font-bold">{i+1}</span>
                                </div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2">{item}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Key Vocabulary - Editable */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <Languages size={20} className="text-teacherBlue" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Key Vocabulary</h3>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-gray-700">
                                    <th className="px-4 py-3 font-bold text-teacherBlue w-1/3">Term</th>
                                    <th className="px-4 py-3 font-bold text-teacherBlue">Definition / Context</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {editablePlan.key_vocabulary?.map((vocab: any, i: number) => (
                                    <tr key={i} className="group hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-2 font-semibold text-gray-800 dark:text-gray-200 align-top">
                                            <input 
                                                value={vocab.term}
                                                onChange={(e) => updateItem('key_vocabulary', i, { term: e.target.value })}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs align-top">
                                            <textarea 
                                                value={vocab.definition}
                                                onChange={(e) => updateItem('key_vocabulary', i, { definition: e.target.value })}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 resize-none text-xs leading-relaxed h-full"
                                                rows={2}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Lesson Phases (Editable) */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <List size={20} className="text-teacherBlue" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lesson Phases</h3>
                    </div>
                    
                    <div className="space-y-6 relative ml-4 border-l-2 border-teacherBlue/20 pl-6">
                        {['introduction', 'development', 'conclusion'].map((phaseKey, idx) => {
                            const phase = editablePlan[phaseKey];
                            const isEditing = editingSection === phaseKey;

                            return (
                                <div key={phaseKey} className="relative group">
                                    <div className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-teacherBlue border-4 border-white dark:border-[#1a1f23]"></div>
                                    <div className={`rounded-lg p-4 shadow-sm border transition-all ${isEditing ? 'bg-white ring-2 ring-teacherBlue border-teacherBlue' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-teacherBlue capitalize">{phase.title || phaseKey}</h4>
                                                {/* Ensure time has 'min' suffix if not already present */}
                                                <span className="text-[10px] font-bold bg-blue-100 text-teacherBlue px-2 py-0.5 rounded uppercase">
                                                    {phase.time && !phase.time.includes('min') ? `${phase.time}min` : phase.time}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => setEditingSection(isEditing ? null : phaseKey)}
                                                    className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-teacherBlue text-white' : 'text-gray-400 hover:text-teacherBlue'}`}
                                                >
                                                    {isEditing ? <CheckCircle size={14} /> : <Edit2 size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Intro & Conclusion are mainly text blocks */}
                                        {(phaseKey === 'introduction' || phaseKey === 'conclusion') && (
                                            isEditing ? (
                                                <textarea 
                                                    value={phase.content}
                                                    onChange={(e) => handleUpdatePlan(phaseKey, 'content', e.target.value)}
                                                    className="w-full min-h-[100px] bg-transparent border-none focus:ring-0 text-sm leading-relaxed text-gray-700 dark:text-gray-300 resize-y p-0"
                                                />
                                            ) : (
                                                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{phase.content}</p>
                                            )
                                        )}
                                        
                                        {/* Development Phase: Steps List with Reordering */}
                                        {phaseKey === 'development' && (
                                            <div className="space-y-3 mt-2">
                                                {phase.steps?.map((step: string, i: number) => (
                                                    <div key={i} className="flex gap-2 items-start group/step hover:bg-white dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                                                        <span className="font-bold text-teacherBlue text-xs mt-1">{i+1}.</span>
                                                        {isEditing ? (
                                                            <div className="flex-1">
                                                                <textarea
                                                                    value={step}
                                                                    onChange={(e) => updateItem('development.steps', i, e.target.value)}
                                                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs leading-relaxed resize-none"
                                                                    rows={2}
                                                                />
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <button onClick={() => moveItem('development.steps', i, 'up')} disabled={i === 0} className="p-1 text-gray-400 hover:text-teacherBlue disabled:opacity-30"><ArrowUp size={12}/></button>
                                                                    <button onClick={() => moveItem('development.steps', i, 'down')} disabled={i === phase.steps.length - 1} className="p-1 text-gray-400 hover:text-teacherBlue disabled:opacity-30"><ArrowDown size={12}/></button>
                                                                    <button onClick={() => deleteItem('development.steps', i)} className="p-1 text-red-300 hover:text-red-500"><Trash2 size={12}/></button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 flex-1">{step}</p>
                                                        )}
                                                    </div>
                                                ))}
                                                {isEditing && (
                                                    <button onClick={() => addItem('development.steps')} className="text-xs text-teacherBlue font-bold flex items-center gap-1 hover:underline mt-2 pl-2">
                                                        <Plus size={12} /> Add Step
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Differentiation */}
                <section className="space-y-3 pb-20">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <Users size={20} className="text-teacherBlue" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Differentiation</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <LifeBuoy size={16} className="text-teacherBlue" />
                                <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-teacherBlue">Support</h5>
                            </div>
                            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{editablePlan.differentiation.support}</p>
                        </div>
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={16} className="text-teacherBlue" />
                                <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-teacherBlue">Challenge</h5>
                            </div>
                            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{editablePlan.differentiation.challenge}</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-[#1a1f23]/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-40 md:pl-80">
                <div className="flex gap-4 max-w-2xl mx-auto">
                    <button 
                        onClick={() => setShowScheduleModal(true)}
                        className="flex-1 bg-teacherBlue text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <CalendarDays size={18} /> Publish & Schedule
                    </button>
                </div>
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Lesson</h3>
                            <button onClick={() => setShowScheduleModal(false)} className="p-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500"><X size={20} /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold uppercase text-gray-400">Day</label>
                                <button 
                                    onClick={findSmartSuggestion}
                                    className="text-[10px] font-bold text-teacherBlue flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                                >
                                    <Sparkles size={10} /> Smart Suggest
                                </button>
                            </div>
                            <div>
                                <div className="flex gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
                                        <button 
                                            key={d}
                                            onClick={() => setScheduleConfig({...scheduleConfig, day: d})}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${scheduleConfig.day === d ? 'bg-teacherBlue text-white border-teacherBlue' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input 
                                        type="time" 
                                        value={scheduleConfig.time}
                                        onChange={(e) => setScheduleConfig({...scheduleConfig, time: e.target.value})}
                                        className="w-full p-3 pl-9 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-teacherBlue outline-none"
                                    />
                                </div>
                            </div>

                            {/* Conflict Warning */}
                            {schedule.some(s => s.day === scheduleConfig.day && s.time === scheduleConfig.time) && (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2 animate-in fade-in zoom-in-95">
                                    <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                                    <p className="text-[10px] text-amber-800 leading-tight">
                                        <span className="font-bold">Schedule Conflict:</span> You already have a lesson scheduled for {scheduleConfig.day} at {scheduleConfig.time}.
                                    </p>
                                </div>
                            )}

                            <button 
                                onClick={handlePublish}
                                className="w-full py-4 bg-teacherBlue text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-2"
                            >
                                <CheckCircle size={18} /> Confirm & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    
    const renderSingleLessonPlanner = () => (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden animate-in fade-in">
            {/* Mobile Header */}
            <div className="md:hidden bg-white p-4 border-b border-gray-200 flex items-center justify-between shrink-0 sticky top-0 z-30">
                <button onClick={handleExit} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={20} />
                </button>
                <span className="font-bold text-gray-900 text-sm truncate max-w-[50%]">
                    {selectedTopic ? selectedTopic.title : 'Lesson Planner'}
                </span>
                {/* Mobile Menu Toggle */}
                <button 
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} 
                    className="p-2 rounded-full hover:bg-gray-100"
                >
                     {mobileSidebarOpen ? <X size={20} /> : <div className="space-y-1"><div className="w-5 h-0.5 bg-gray-600"></div><div className="w-5 h-0.5 bg-gray-600"></div><div className="w-5 h-0.5 bg-gray-600"></div></div>}
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                
                {/* Sidebar */}
                <div className={`absolute inset-y-0 left-0 z-20 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 md:relative md:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
                    {renderSidebar()}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-50 relative overflow-hidden h-full">
                    
                    {!selectedTopic ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <Plus size={40} className="text-blue-100" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-600 mb-2">Ready to Plan?</h2>
                            <p className="max-w-xs">Select a grade, subject, and topic from the sidebar to begin crafting your lesson.</p>
                        </div>
                    ) : (
                        viewMode === 'config' ? (
                            <div className="flex flex-col h-full animate-in slide-in-from-right-4 overflow-hidden">
                                {/* Desktop Header */}
                                <div className="hidden md:block bg-white border-b border-gray-200 p-6 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                <span>{selectedGrade}</span>
                                                <ChevronRight size={12} />
                                                <span>{selectedSubject}</span>
                                            </div>
                                            <h1 className="text-2xl font-bold text-gray-900">{selectedTopic.title}</h1>
                                        </div>
                                        <button onClick={handleExit} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                                            <ArrowLeft size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Form */}
                                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 pb-20">
                                    {/* Objectives */}
                                    <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                                        <h3 className="text-sm font-bold text-teacherBlue mb-3 uppercase tracking-wider flex items-center gap-2">
                                            <Target size={16} /> Learning Objectives
                                        </h3>
                                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                                            {selectedTopic.learningObjectives?.slice(0, 4).map((obj, i) => (
                                                <li key={i}>{obj}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Duration */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <Clock size={16} /> Lesson Duration
                                        </label>
                                        <div className="flex gap-3">
                                            {['30 Mins', '40 Mins', '60 Mins', '80 Mins'].map(d => (
                                                <button 
                                                    key={d}
                                                    onClick={() => setDuration(d)}
                                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${duration === d ? 'border-teacherBlue bg-blue-50 text-teacherBlue' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Inclusion Context */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <LifeBuoy size={16} /> Adapt for Learners
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {inclusionTags.map(tag => (
                                                <button 
                                                    key={tag}
                                                    onClick={() => toggleInclusionTag(tag)}
                                                    className={`text-[10px] px-3 py-2 rounded-lg border transition-colors font-bold ${explicitNeeds.includes(tag) ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Context */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <Users size={16} /> Classroom Context
                                        </label>
                                        <div className="relative">
                                            <textarea 
                                                value={contextInput}
                                                onChange={(e) => setContextInput(e.target.value)}
                                                className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-teacherBlue focus:ring-0 outline-none h-32 resize-none text-sm leading-relaxed bg-white"
                                                placeholder="e.g. 50 students, no projector, focus on group work..."
                                            />
                                            {canUseSpeech && (
                                                <button 
                                                    onClick={() => startListening('context')}
                                                    className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all ${isListening && activeListenField === 'context' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-teacherBlue hover:text-white'}`}
                                                >
                                                    <Mic size={18} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {contextTags.map(tag => (
                                                <button 
                                                    key={tag}
                                                    onClick={() => toggleContextTag(tag)}
                                                    className={`text-[10px] px-3 py-1.5 rounded-full border transition-colors font-medium ${contextInput.includes(tag) ? 'bg-blue-100 border-blue-200 text-teacherBlue' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                                    <button 
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="w-full bg-teacherBlue text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-200 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {generating ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={20} />
                                                Creating Plan...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="fill-white" size={20} />
                                                Generate Lesson Plan
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            renderPlanView()
                        )
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
            {/* Header and Mode Toggle */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={handleExit} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Plan a Lesson</h1>
                </div>
                <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-1">
                    <button 
                        onClick={() => setPlanningMode('single')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${planningMode === 'single' ? 'bg-white dark:bg-gray-600 text-teacherBlue dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                        Single Lesson
                    </button>
                    <button 
                        onClick={() => setPlanningMode('bulk')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${planningMode === 'bulk' ? 'bg-white dark:bg-gray-600 text-teacherBlue dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                        Bulk Unit
                    </button>
                </div>
            </div>
            
            {/* Conditional Content Area */}
            <div className="flex-1 overflow-y-auto">
                {planningMode === 'single' ? (
                    renderSingleLessonPlanner()
                ) : (
                    <BulkUnitCreator onNavigate={onNavigate} />
                )}
            </div>
        </div>
    );
};

export default LessonWizard;