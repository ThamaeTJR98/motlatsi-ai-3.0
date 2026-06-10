
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, CheckCircle, Clock, Save, X } from 'lucide-react';
import { TermConfig } from '../types';

const AdminTermManager: React.FC = () => {
    const [terms, setTerms] = useState<TermConfig[]>(() => {
        const savedTerms = localStorage.getItem('motlatsi_terms');
        if (savedTerms) {
            return JSON.parse(savedTerms);
        }
        // Seed defaults if empty
        const defaults: TermConfig[] = [
            { id: 'term-1-2024', name: 'Term 1 2024', startDate: '2024-01-15', endDate: '2024-04-15', isActive: true },
            { id: 'term-2-2024', name: 'Term 2 2024', startDate: '2024-05-01', endDate: '2024-08-01', isActive: false }
        ];
        localStorage.setItem('motlatsi_terms', JSON.stringify(defaults));
        return defaults;
    });
    const [isAdding, setIsAdding] = useState(false);
    const [newTerm, setNewTerm] = useState<Partial<TermConfig>>({
        name: '',
        startDate: '',
        endDate: ''
    });

    // Removed useEffect that was doing synchronous setState

    const saveTerms = (updatedTerms: TermConfig[]) => {
        setTerms(updatedTerms);
        localStorage.setItem('motlatsi_terms', JSON.stringify(updatedTerms));
        // Also update the active term config for the LearningEngine
        const active = updatedTerms.find(t => {
            const now = new Date();
            return now >= new Date(t.startDate) && now <= new Date(t.endDate);
        }) || updatedTerms[0];
        
        if (active) {
            // We update the system-wide config stored in a separate key for the context to pick up
            localStorage.setItem('motlatsi_term_config', JSON.stringify(active));
        }
    };

    const handleAddTerm = () => {
        if (!newTerm.name || !newTerm.startDate || !newTerm.endDate) return;
        
        const term: TermConfig = {
            id: `term-${Date.now()}`,
            name: newTerm.name || '',
            startDate: newTerm.startDate || '',
            endDate: newTerm.endDate || '',
            isActive: false
        };
        
        saveTerms([...terms, term]);
        setIsAdding(false);
        setNewTerm({ name: '', startDate: '', endDate: '' });
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this term?')) {
            saveTerms(terms.filter(t => t.id !== id));
        }
    };

    const getStatus = (term: TermConfig) => {
        const now = new Date();
        const start = new Date(term.startDate);
        const end = new Date(term.endDate);

        if (now >= start && now <= end) return 'active';
        if (now > end) return 'past';
        return 'upcoming';
    };

    return (
        <div className="animate-in slide-in-from-right duration-300 pb-24 p-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Academic Calendar</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage school terms and dates.</p>
                </div>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-teacherBlue text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} /> Add Term
                </button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <div className="bg-blue-50 dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-slate-700 mb-6 animate-in fade-in">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-900 dark:text-white">New Term</h3>
                        <button onClick={() => setIsAdding(false)}><X size={18} className="text-gray-400" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <input 
                            type="text" 
                            placeholder="Term Name (e.g. Term 3 2025)" 
                            className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-teacherBlue"
                            value={newTerm.name}
                            onChange={(e) => setNewTerm({...newTerm, name: e.target.value})}
                        />
                        <input 
                            type="date" 
                            className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-teacherBlue"
                            value={newTerm.startDate}
                            onChange={(e) => setNewTerm({...newTerm, startDate: e.target.value})}
                        />
                        <input 
                            type="date" 
                            className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-teacherBlue"
                            value={newTerm.endDate}
                            onChange={(e) => setNewTerm({...newTerm, endDate: e.target.value})}
                        />
                    </div>
                    <button 
                        onClick={handleAddTerm}
                        className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                    >
                        Save Term
                    </button>
                </div>
            )}

            {/* Terms List */}
            <div className="space-y-3">
                {terms.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(term => {
                    const status = getStatus(term);
                    return (
                        <div key={term.id} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${status === 'active' ? 'border-teacherBlue shadow-sm ring-1 ring-blue-100' : 'border-gray-100 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`size-10 rounded-lg flex items-center justify-center ${status === 'active' ? 'bg-blue-100 text-teacherBlue' : status === 'past' ? 'bg-gray-100 text-gray-400' : 'bg-orange-100 text-orange-500'}`}>
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{term.name}</h4>
                                    <p className="text-xs text-gray-500 font-mono">
                                        {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 justify-between md:justify-end w-full md:w-auto">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 ${
                                    status === 'active' ? 'bg-green-100 text-green-700' : 
                                    status === 'past' ? 'bg-gray-100 text-gray-500' : 'bg-orange-100 text-orange-600'
                                }`}>
                                    {status === 'active' && <CheckCircle size={12} />}
                                    {status === 'upcoming' && <Clock size={12} />}
                                    {status}
                                </span>
                                
                                <button 
                                    onClick={() => handleDelete(term.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminTermManager;
