
import React, { useState, useEffect } from 'react';
import { Curriculum, Topic } from '../types';
import { BookOpen, ChevronDown, Plus, Trash2, Edit2, Archive, Layers, Save, X } from 'lucide-react';
import MotlatsiLogo from './MotlatsiLogo';

interface AdminCurriculumProps {
    curriculum: Curriculum;
    onUpdate: (newCurriculum: Curriculum) => void;
    onNavigate: (view: string) => void;
}

const AdminCurriculum: React.FC<AdminCurriculumProps> = ({ curriculum, onUpdate, onNavigate }) => {
    const [activeLevel, setActiveLevel] = useState<'primary' | 'highSchool'>('primary');
    const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
    const [adminName, setAdminName] = useState(() => {
        const localUser = JSON.parse(localStorage.getItem('motlatsi_user') || '{}');
        return localUser.name || 'Admin';
    });
    
    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [targetIndices, setTargetIndices] = useState<{g: number, s: number, t?: number} | null>(null);
    const [topicForm, setTopicForm] = useState({ title: '', description: '' });

    useEffect(() => {
        // Name initialized from localStorage in state initializer
    }, []);

    const toggleGrade = (grade: string) => {
        setExpandedGrade(expandedGrade === grade ? null : grade);
    };

    const handleDeleteTopic = (gradeIdx: number, subjectIdx: number, topicIdx: number) => {
        if(!confirm("Archive this topic? It will be hidden but data preserved.")) return;
        
        const newCurriculum = { ...curriculum };
        const grades = activeLevel === 'primary' ? newCurriculum.primary : newCurriculum.highSchool;
        const subject = grades[gradeIdx].subjects[subjectIdx];
        
        // Remove topic from array
        subject.topics.splice(topicIdx, 1);
        
        onUpdate(newCurriculum);
    };

    const openAddModal = (gIdx: number, sIdx: number) => {
        setModalMode('add');
        setTargetIndices({ g: gIdx, s: sIdx });
        setTopicForm({ title: '', description: '' });
        setModalOpen(true);
    };

    const openEditModal = (gIdx: number, sIdx: number, tIdx: number, topic: Topic) => {
        setModalMode('edit');
        setTargetIndices({ g: gIdx, s: sIdx, t: tIdx });
        setTopicForm({ title: topic.title, description: topic.description });
        setModalOpen(true);
    };

    const handleSaveTopic = () => {
        if (!topicForm.title || !targetIndices) return;

        const newCurriculum = { ...curriculum };
        const grades = activeLevel === 'primary' ? newCurriculum.primary : newCurriculum.highSchool;
        const subject = grades[targetIndices.g].subjects[targetIndices.s];

        if (modalMode === 'add') {
            const newTopic: Topic = {
                id: `custom-${Date.now()}`,
                title: topicForm.title,
                description: topicForm.description || "No description provided.",
                grade: grades[targetIndices.g].grade,
                subject: subject.name,
                curriculumStandards: [],
                learningObjectives: []
            };
            subject.topics.push(newTopic);
        } else if (modalMode === 'edit' && targetIndices.t !== undefined) {
            const topic = subject.topics[targetIndices.t];
            topic.title = topicForm.title;
            topic.description = topicForm.description;
        }

        onUpdate(newCurriculum);
        setModalOpen(false);
    };

    const grades = activeLevel === 'primary' ? curriculum.primary : curriculum.highSchool;

    return (
        <div className="h-full overflow-y-auto pb-32 animate-in fade-in scroll-smooth">
            <div className="max-w-3xl mx-auto w-full relative">
                <div className="p-4 bg-white dark:bg-[#1a1f2e] border-b border-gray-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-teacherBlue/10 p-1.5 rounded-lg">
                            <MotlatsiLogo variant="icon" className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-none">Curriculum</h1>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Syllabus Manager</p>
                        </div>
                    </div>
                    {/* Profile Avatar */}
                    <button 
                        onClick={() => onNavigate('profile')}
                        className="size-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white dark:ring-gray-800 transition-transform active:scale-95"
                    >
                        {adminName.charAt(0)}
                    </button>
                </div>
                
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl">
                    <button 
                        onClick={() => setActiveLevel('primary')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeLevel === 'primary' ? 'bg-white dark:bg-slate-700 text-teacherBlue shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        Primary
                    </button>
                    <button 
                        onClick={() => setActiveLevel('highSchool')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeLevel === 'highSchool' ? 'bg-white dark:bg-slate-700 text-teacherBlue shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        High School
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {grades.map((grade, gIdx) => (
                    <div key={grade.grade} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm transition-all duration-300">
                        <button 
                            onClick={() => toggleGrade(grade.grade)}
                            className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors active:bg-gray-100"
                        >
                            <span className="font-black text-lg text-gray-900 dark:text-white">Grade {grade.grade.replace(/^Grade\s+/, '')}</span>
                            <div className={`p-2 rounded-full bg-gray-100 dark:bg-slate-700 transition-transform duration-300 ${expandedGrade === grade.grade ? 'rotate-180 bg-blue-50 text-teacherBlue' : 'text-gray-400'}`}>
                                <ChevronDown size={20} />
                            </div>
                        </button>
                        
                        {expandedGrade === grade.grade && (
                            <div className="p-4 pt-0 space-y-6 animate-in slide-in-from-top-2">
                                {grade.subjects.map((subject, sIdx) => (
                                    <div key={subject.name} className="border-t border-gray-100 dark:border-slate-700 pt-4 first:border-0 first:pt-0">
                                        <div className="flex items-center justify-between mb-3 px-1">
                                            <h4 className="font-bold text-teacherBlue text-xs uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">{subject.name}</h4>
                                            <button 
                                                onClick={() => openAddModal(gIdx, sIdx)}
                                                className="text-xs font-bold text-teacherBlue hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                            >
                                                <Plus size={14} /> Add Topic
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {subject.topics.map((topic, tIdx) => (
                                                <div key={topic.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-xl hover:border-blue-200 transition-colors group gap-3 sm:gap-4">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className="bg-white dark:bg-slate-700 p-2.5 rounded-lg text-teacherBlue shadow-sm shrink-0">
                                                            <BookOpen size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight mb-1">{topic.title}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{topic.description}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-2 self-end sm:self-center shrink-0">
                                                        <button 
                                                            onClick={() => openEditModal(gIdx, sIdx, tIdx, topic)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-500"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteTopic(gIdx, sIdx, tIdx)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-500"
                                                        >
                                                            <Archive size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {subject.topics.length === 0 && (
                                                <div className="text-center py-6 text-gray-400 text-xs italic bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">No topics yet.</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl w-full max-w-lg p-6 shadow-2xl pb-10 md:pb-6 relative animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${modalMode === 'add' ? 'bg-blue-50 text-teacherBlue' : 'bg-orange-50 text-orange-500'}`}>
                                    {modalMode === 'add' ? <Plus size={24} /> : <Edit2 size={24} />}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {modalMode === 'add' ? 'New Topic' : 'Edit Topic'}
                                </h3>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Topic Title</label>
                                <input 
                                    className="w-full p-4 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-teacherBlue outline-none font-bold text-gray-900 dark:text-white" 
                                    value={topicForm.title} 
                                    onChange={e => setTopicForm({...topicForm, title: e.target.value})} 
                                    placeholder="e.g. Introduction to Algebra" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                                <textarea 
                                    className="w-full p-4 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-teacherBlue outline-none font-medium h-32 resize-none text-sm leading-relaxed" 
                                    value={topicForm.description} 
                                    onChange={e => setTopicForm({...topicForm, description: e.target.value})} 
                                    placeholder="Brief overview of what students will learn..." 
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveTopic} 
                                    disabled={!topicForm.title}
                                    className="flex-[2] py-3.5 bg-teacherBlue text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <Save size={18} />
                                    Save Topic
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default AdminCurriculum;
