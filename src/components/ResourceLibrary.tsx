
import React, { useState, useEffect } from 'react';
import { SavedResource, UserState } from '../types';
import { FileText, Trash2, Download, Search, LayoutTemplate, PenTool, FileBarChart } from 'lucide-react';

interface ResourceLibraryProps {
    user: UserState;
    onNavigate: (view: string) => void;
}

const ResourceLibrary: React.FC<ResourceLibraryProps> = ({ user, onNavigate }) => {
    const [resources, setResources] = useState<SavedResource[]>(() => {
        if (user.isDemo) {
            const saved = localStorage.getItem('motlatsi_resources');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [filter, setFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'lesson-plan' | 'worksheet' | 'report'>('all');

    // Removed useEffect that was doing synchronous setState

    const deleteResource = (id: string) => {
        if(!confirm('Are you sure you want to delete this resource?')) return;
        const updated = resources.filter(r => r.id !== id);
        setResources(updated);
        if (user.isDemo) {
            localStorage.setItem('motlatsi_resources', JSON.stringify(updated));
        }
    };

    const downloadResource = (res: SavedResource) => {
        const element = document.createElement("a");
        const file = new Blob([res.content || ''], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `${res.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${res.type}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const filtered = resources.filter(r => {
        const matchesText = r.title.toLowerCase().includes(filter.toLowerCase());
        const matchesType = typeFilter === 'all' || r.type === typeFilter;
        return matchesText && matchesType;
    });

    const getIcon = (type: string) => {
        switch(type) {
            case 'lesson-plan': return <FileText size={20} />;
            case 'worksheet': return <PenTool size={20} />;
            case 'report': return <FileBarChart size={20} />;
            default: return <LayoutTemplate size={20} />;
        }
    };

    return (
        <div className="h-full overflow-y-auto pb-32 animate-in fade-in scroll-smooth">
            <div className="max-w-4xl mx-auto w-full space-y-4 p-4">
                <header className="flex flex-col gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 sticky top-0 z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">Resource Library</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Manage your saved lesson plans and materials</p>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search resources..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teacherBlue text-sm"
                        />
                    </div>
                </div>

                {/* Filter Tabs - Compact & Scrollable */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                     {['all', 'lesson-plan', 'worksheet', 'report'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t as any)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${typeFilter === t ? 'bg-teacherBlue text-white border-teacherBlue shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200'}`}
                        >
                            {t === 'report' ? 'Reports' : t.replace('-', ' ')}
                        </button>
                     ))}
                </div>
            </header>

            {resources.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600">
                    <div className="w-12 h-12 bg-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="text-gray-400" size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">No resources yet</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">Generate and save lesson plans from the Lesson Wizard to see them here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {filtered.map(res => (
                        <div key={res.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all duration-200 group flex flex-col">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-lg ${
                                    res.type === 'lesson-plan' ? 'bg-blue-50 dark:bg-blue-900/30 text-teacherBlue dark:text-blue-400' : 
                                    res.type === 'worksheet' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-500' : 
                                    res.type === 'report' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-500' : 
                                    'bg-green-50 dark:bg-green-900/30 text-growthGreen dark:text-green-400'
                                }`}>
                                    {getIcon(res.type)}
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-slate-700 px-2 py-0.5 rounded">{new Date(res.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-800 dark:text-white mb-1 truncate text-sm md:text-base leading-tight" title={res.title}>{res.title}</h3>
                                <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-[9px] font-bold uppercase tracking-wider mb-3">
                                    {res.type.replace('-', ' ')}
                                </span>
                            </div>
                            
                            <div className="flex gap-2 pt-3 border-t border-gray-50 dark:border-slate-700 mt-auto">
                                <button 
                                    onClick={() => downloadResource(res)}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-teacherBlue hover:bg-blue-700 py-2 rounded-lg transition-colors shadow-sm shadow-blue-100 dark:shadow-none"
                                >
                                    <Download size={14} /> Download
                                </button>
                                <button 
                                    onClick={() => deleteResource(res.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
};

export default ResourceLibrary;
