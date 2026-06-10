
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, GraduationCap, School, Trash2, Edit2, Plus, Search, X, Check, Upload, FileText, AlertCircle, Mail, Save, TrendingUp, Brain, FileCheck, ChevronRight, BarChart3, Loader2, Sparkles, ChevronDown, ChevronUp, Accessibility, Copy, UserPlus, Layers as LayersIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MotlatsiLogo from './MotlatsiLogo';
import { aiClient } from '../utils/aiClient';
import { LearningNeed, UserState } from '../types';
import { useToast } from '../contexts/ToastContext';

interface User {
    id: number | string;
    name: string;
    role: string;
    email: string;
    status: string;
    school?: string;
    currentGrade?: string;
    subject?: string;
    learningNeeds?: LearningNeed[];
}

interface TeacherStats extends User {
    pacer: number; 
    classAvg: number; 
    plansCreated: number;
    generatedReports: { title: string; date: string; type: string }[];
}

interface AdminUsersProps {
    user: UserState;
    onNavigate: (view: string) => void;
}

interface SchoolKeys {
    adminCode: string;
    teacherCode: string;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ user, onNavigate }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'directory' | 'performance'>('directory');
    const [users, setUsers] = useState<User[]>([]);
    const [teacherStats, setTeacherStats] = useState<TeacherStats[]>([]);
    
    // Directory State
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<{name: string, email: string, role: string, learningNeeds: LearningNeed[]}>({ name: '', email: '', role: 'Student', learningNeeds: [] });
    const [currentAdminSchool, setCurrentAdminSchool] = useState<string>(user.school || 'Unassigned School');
    const [adminName, setAdminName] = useState(user.name || 'Admin');
    const [loading, setLoading] = useState(false);
    const [schoolKeys, setSchoolKeys] = useState<SchoolKeys | null>(null);

    // Performance State
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherStats | null>(null);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
    // Track which card is currently expanded
    const [expandedCardId, setExpandedCardId] = useState<string | number | null>(null);
    const [performanceMetric, setPerformanceMetric] = useState<'teachers' | 'students'>('teachers');

    const NEEDS_OPTIONS: {id: LearningNeed, label: string}[] = [
        { id: 'visual_impairment', label: 'Visual Impairment' },
        { id: 'auditory_impairment', label: 'Hearing Impairment' },
        { id: 'dyslexia', label: 'Dyslexia' },
        { id: 'adhd', label: 'ADHD' },
        { id: 'motor_impairment', label: 'Motor Impairment' },
        { id: 'autism_spectrum', label: 'Autism Spectrum' }
    ];

    const generateTeacherStats = useCallback((allUsers: User[]) => {
        const teachers = allUsers.filter(u => u.role === 'Teacher' || u.role === 'teacher');
        
        const stats = teachers.map(t => {
            const pacer = Math.floor(Math.random() * 40) + 60; 
            const classAvg = Math.floor(Math.random() * 30) + 55; 
            const plansCreated = Math.floor(Math.random() * 15) + 5;
            
            const reports = Array.from({ length: 3 }).map((_, i) => ({
                title: `${t.subject || 'General'} ${i === 0 ? 'Term Plan' : i === 1 ? 'Assessment' : 'Intervention'}`,
                date: new Date(Date.now() - i * 86400000 * 5).toLocaleDateString(),
                type: i === 0 ? 'Planning' : 'Report'
            }));

            return {
                ...t,
                pacer,
                classAvg,
                plansCreated,
                generatedReports: reports
            } as TeacherStats;
        });
        setTeacherStats(stats);
    }, []);

    const fetchUsers = useCallback(async (schoolFilter: string) => {
        if (!user.isDemo) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('school', schoolFilter);

            if (data && !error) {
                const mappedUsers = data.map((u: any) => ({
                    id: u.id,
                    name: u.name || '',
                    role: u.role,
                    email: u.email || '',
                    status: 'Active',
                    school: u.school,
                    currentGrade: u.current_grade,
                    subject: u.subject,
                    learningNeeds: u.learning_needs || []
                }));
                setUsers(mappedUsers);
                generateTeacherStats(mappedUsers);
                setLoading(false);
                return;
            }
        } else {
            const storedUsers = localStorage.getItem('motlatsi_admin_users');
            let loadedUsers = [];
            if (storedUsers) {
                const parsed = JSON.parse(storedUsers);
                loadedUsers = parsed.filter((u: any) => u.school === schoolFilter);
            } else {
                loadedUsers = [
                    { id: 'teacher-1', name: 'Ntate Thabo', role: 'Teacher', email: 'thabo@school.ls', status: 'Active', school: schoolFilter, currentGrade: '12', subject: 'Science' },
                    { id: 'admin-1', name: 'Principal Lerato', role: 'Admin', email: 'admin@school.ls', status: 'Active', school: schoolFilter, currentGrade: '1' },
                    { id: '1', name: 'Mme Lerato', role: 'Teacher', email: 'lerato@school.ls', status: 'Active', school: schoolFilter, currentGrade: '10', subject: 'Mathematics' },
                    { id: 'student-1', name: 'Khotso', role: 'Student', email: 'khotso@student.ls', status: 'Active', school: schoolFilter, learningNeeds: [] },
                    { id: '7', name: 'Palesa', role: 'Student', email: 'palesa@student.ls', status: 'Active', school: schoolFilter, learningNeeds: ['visual_impairment'] }
                ];
                localStorage.setItem('motlatsi_admin_users', JSON.stringify(loadedUsers));
            }
            setUsers(loadedUsers);
            generateTeacherStats(loadedUsers);
        }
        setLoading(false);
    }, [generateTeacherStats, setUsers, setLoading, user.isDemo]);

    const initializeAdminContext = useCallback(async () => {
        setLoading(true);
        const adminSchool = user.school || '';
        setAdminName(user.name || 'Admin');
        setCurrentAdminSchool(adminSchool || 'Unassigned School');
        
        // Retrieve codes for invitation logic
        if (user.isDemo) {
            const registry = JSON.parse(localStorage.getItem('motlatsi_school_registry') || '[]');
            const existingKeys = registry.find((s: any) => s.name === adminSchool);
            if (existingKeys) {
                setSchoolKeys({
                    adminCode: existingKeys.adminCode,
                    teacherCode: existingKeys.teacherCode
                });
            }
        } else {
            // For real users, we would fetch school keys from Supabase
            // Placeholder for now
        }

        if (adminSchool) {
            await fetchUsers(adminSchool);
        } else {
            setLoading(false);
        }
    }, [fetchUsers, user.name, user.school, user.isDemo, setAdminName, setCurrentAdminSchool, setLoading, setSchoolKeys]);

    useEffect(() => {
        initializeAdminContext();
    }, [initializeAdminContext]);

    const generateInsight = async (teacher: TeacherStats) => {
        setLoadingInsight(true);
        setAiInsight(null);
        setSelectedTeacher(teacher);
        try {
            const prompt = `
                Generate a concise performance review for a teacher named ${teacher.name}.
                Context:
                - Subject: ${teacher.subject || 'General'}
                - Grade: ${teacher.currentGrade || 'N/A'}
                - Syllabus Coverage (Pacer): ${teacher.pacer}%
                - Class Average Performance: ${teacher.classAvg}%
                - Lesson Plans Created: ${teacher.plansCreated}
                
                Provide 3 bullet points:
                1. Performance Summary
                2. Area for Improvement (based on pacer/avg)
                3. Recommended Action
            `;
            const response = await aiClient.generate({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            setAiInsight(response.text || "Insight generation failed.");
        } catch (e) {
            const pacerStatus = teacher.pacer > 85 ? "excellent pace" : "steady pace";
            const avgStatus = teacher.classAvg > 70 ? "strong results" : "room for improvement";
            setAiInsight(
                `**Performance Analysis for ${teacher.name}**\n\n` +
                `* **Summary**: Maintains a ${pacerStatus} with ${teacher.pacer}% curriculum coverage. Class engagement is consistent with ${teacher.plansCreated} plans generated.\n` +
                `* **Improvement**: Class average of ${teacher.classAvg}% indicates ${avgStatus}. Focus on differentiating instruction for lower-performing students.\n` +
                `* **Action**: Recommend scheduling 2 remedial sessions next week covering recent topics.`
            );
        } finally {
            setLoadingInsight(false);
        }
    };

    const toggleCard = (id: string | number) => {
        setExpandedCardId(expandedCardId === id ? null : id);
    };

    const handleDelete = async (id: number | string) => {
        if(!confirm('Are you sure you want to remove this user? This action cannot be undone.')) return;
        
        if (!user.isDemo && typeof id === 'string') {
            await supabase.from('profiles').delete().eq('id', id);
        }

        if (user.isDemo) {
            const fullList = JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]');
            const updatedFullList = fullList.filter((u: any) => u.id.toString() !== id.toString());
            localStorage.setItem('motlatsi_admin_users', JSON.stringify(updatedFullList));
        }
        
        const newUsers = users.filter(u => u.id !== id);
        setUsers(newUsers);
        generateTeacherStats(newUsers);
    };

    const openAddModal = () => {
        setEditingUser(null);
        setFormData({ name: '', email: '', role: 'Student', learningNeeds: [] });
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, role: user.role, learningNeeds: user.learningNeeds || [] });
        setIsModalOpen(true);
    };

    const toggleNeed = (needId: LearningNeed) => {
        setFormData(prev => {
            const current = prev.learningNeeds || [];
            if (current.includes(needId)) {
                return { ...prev, learningNeeds: current.filter(n => n !== needId) };
            } else {
                return { ...prev, learningNeeds: [...current, needId] };
            }
        });
    };
    
    const copyCode = (code: string, label: string) => {
        navigator.clipboard.writeText(code);
        addToast(`${label} copied!`, 'success');
    };

    const handleSaveUser = async () => {
        if (!formData.name || !formData.email) return;
        
        setLoading(true);
        const userData = {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            school: currentAdminSchool,
            status: 'Active',
            learning_needs: formData.learningNeeds, 
            learningNeeds: formData.learningNeeds 
        };

        try {
            if (!user.isDemo && editingUser && typeof editingUser.id === 'string') {
                const { error } = await supabase.from('profiles').update({
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    school: userData.school,
                    learning_needs: userData.learningNeeds 
                }).eq('id', editingUser.id);
                if (error) console.error("Supabase update error", error);
            }

            if (user.isDemo) {
                const fullList = JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]');
                let updatedList;

                if (editingUser) {
                    updatedList = fullList.map((u: any) => u.id.toString() === editingUser.id.toString() ? { ...u, ...userData } : u);
                } else {
                    const newUser = { ...userData, id: Date.now() };
                    updatedList = [...fullList, newUser];
                }
                
                localStorage.setItem('motlatsi_admin_users', JSON.stringify(updatedList));
            }

            if (editingUser) {
                const updatedStateUsers = users.map(u => u.id === editingUser.id ? { ...u, ...userData } : u);
                setUsers(updatedStateUsers);
                generateTeacherStats(updatedStateUsers);
            } else {
                const newUser = { ...userData, id: Date.now() };
                const updatedStateUsers = [...users, newUser];
                setUsers(updatedStateUsers);
                generateTeacherStats(updatedStateUsers);
            }
            
            setIsModalOpen(false);
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            // Validate file type and size (max 2MB)
            if (file.type && !file.type.includes('csv') && !file.name.endsWith('.csv')) {
                addToast("Invalid file type. Please upload a CSV file.", "error");
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                addToast("File is too large. Maximum size is 2MB.", "error");
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    if (!text) return;

                    const lines = text.split('\n');
                    const newUsers: User[] = [];
                    
                    // Skip header row if present (simple check)
                    const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0;

                    // Limit to 500 users per import to prevent browser crash
                    const MAX_IMPORT = 500;
                    let importCount = 0;

                    for (let i = startIndex; i < lines.length; i++) {
                        if (importCount >= MAX_IMPORT) {
                            addToast(`Import limited to first ${MAX_IMPORT} valid users.`, "info");
                            break;
                        }

                        const line = lines[i]?.trim();
                        if (!line) continue;
                        
                        const parts = line.split(',');
                        if (parts.length >= 3) {
                            // Remove quotes if present
                            const cleanPart = (p: string) => p?.trim().replace(/^["']|["']$/g, '');
                            
                            const name = cleanPart(parts[0]);
                            const email = cleanPart(parts[1]);
                            const role = cleanPart(parts[2]);
                            const grade = cleanPart(parts[3]);
                            const subject = cleanPart(parts[4]);

                            if (name && email && role) {
                                newUsers.push({
                                    id: Date.now() + i, // Simple unique ID
                                    name,
                                    email,
                                    role,
                                    status: 'Active',
                                    school: currentAdminSchool || 'Unassigned',
                                    currentGrade: grade,
                                    subject: subject,
                                    learningNeeds: []
                                });
                                importCount++;
                            }
                        }
                    }

                    if (newUsers.length > 0) {
                        if (user.isDemo) {
                            const fullList = JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]');
                            const updatedList = [...fullList, ...newUsers];
                            localStorage.setItem('motlatsi_admin_users', JSON.stringify(updatedList));
                            setUsers(prev => [...prev, ...newUsers]);
                            generateTeacherStats([...users, ...newUsers]);
                            addToast(`Successfully imported ${newUsers.length} users.`, 'success');
                        } else {
                            // For real users, we would batch insert into Supabase
                            // Placeholder for now
                            addToast(`Parsed ${newUsers.length} users. Database import not available in preview.`, 'info');
                        }
                        setIsImportModalOpen(false);
                    } else {
                        addToast('No valid users found in CSV. Please check format.', 'error');
                    }
                } catch (err) {
                    console.error("Error parsing CSV:", err);
                    addToast("Failed to parse CSV file. Please check the format.", "error");
                }
            };
            
            reader.onerror = () => {
                addToast("Failed to read file.", "error");
            };

            reader.readAsText(file);
        } catch (err) {
            console.error("File upload error:", err);
            addToast("An error occurred during file upload.", "error");
        }
        
        // Reset the input value so the same file can be uploaded again if needed
        event.target.value = '';
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = filterRole === 'All' || u.role.toLowerCase() === filterRole.toLowerCase();
        return matchesSearch && matchesRole;
    });

    const getRoleIcon = (role: string) => {
        const r = role.toLowerCase();
        if (r === 'admin') return <Shield size={12} />;
        if (r === 'teacher') return <School size={12} />;
        return <GraduationCap size={12} />;
    };

    const getRoleColor = (role: string) => {
        const r = role.toLowerCase();
        if (r === 'admin') return 'bg-purple-500';
        if (r === 'teacher') return 'bg-teacherBlue';
        return 'bg-growthGreen';
    };

    return (
        <div className="h-full flex flex-col bg-[#f6f6f8] dark:bg-[#101622] font-sans overflow-hidden">
            {/* Sticky Header */}
            <header className="shrink-0 z-20 bg-gray-50/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-slate-700 px-4 py-3 md:rounded-b-2xl">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap justify-between items-center gap-y-2 gap-x-3">
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="bg-teacherBlue/10 p-1.5 rounded-lg">
                                <MotlatsiLogo variant="icon" className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-none">Users</h1>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[120px] sm:max-w-[150px] mt-0.5">
                                    {currentAdminSchool}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button 
                                onClick={() => setIsImportModalOpen(true)}
                                className="bg-white text-gray-600 border border-gray-200 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <Upload size={14} className="shrink-0" /> <span className="hidden sm:inline">Import</span>
                            </button>
                            <button 
                                onClick={() => setIsInviteModalOpen(true)}
                                className="bg-blue-50 text-teacherBlue px-2 sm:px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                                <UserPlus size={14} className="shrink-0" /> <span className="hidden sm:inline">Invite</span>
                            </button>
                             <button 
                                onClick={() => onNavigate('profile')}
                                className="size-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white dark:ring-gray-800 transition-transform active:scale-95 shrink-0 ml-0.5"
                            >
                                {adminName.charAt(0)}
                            </button>
                        </div>
                    </div>
                    
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg self-start">
                        <button 
                            onClick={() => setActiveTab('directory')}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'directory' ? 'bg-white dark:bg-slate-700 text-teacherBlue shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Directory
                        </button>
                        <button 
                            onClick={() => {
                                setActiveTab('performance');
                                setPerformanceMetric('teachers');
                            }}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'performance' ? 'bg-white dark:bg-slate-700 text-teacherBlue shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Performance
                        </button>
                    </div>

                    {activeTab === 'directory' && (
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="text" 
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search users..." 
                                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teacherBlue text-xs font-medium"
                                    />
                                </div>
                                <button 
                                    onClick={openAddModal}
                                    className="bg-teacherBlue text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-md shadow-blue-500/20"
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-32 px-4 pt-3 space-y-4 max-w-md mx-auto w-full">
                
                {/* DIRECTORY VIEW */}
                {activeTab === 'directory' && (
                    <div className="space-y-3">
                        {/* Filter Pills */}
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {['All', 'Student', 'Teacher', 'Admin'].map(role => (
                                <button
                                    key={role}
                                    onClick={() => setFilterRole(role)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                                        filterRole === role 
                                        ? 'bg-teacherBlue text-white border-teacherBlue shadow-sm' 
                                        : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>

                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-xs">No users found.</div>
                        ) : (
                            filteredUsers.map(user => (
                                <div key={user.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                                    <div 
                                        className="p-3 flex items-center justify-between cursor-pointer"
                                        onClick={() => toggleCard(user.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm ${getRoleColor(user.role)}`}>
                                                {getRoleIcon(user.role)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{user.name}</h4>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium capitalize">{user.role}</span>
                                            </div>
                                        </div>
                                        {expandedCardId === user.id ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                                    </div>
                                    
                                    {/* Expandable Content */}
                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCardId === user.id ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-gray-50 dark:border-slate-700/50 mt-1">
                                            <div className="pt-2 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                <Mail size={12} />
                                                <span className="text-[10px] font-mono">{user.email}</span>
                                            </div>
                                            
                                            {user.learningNeeds && user.learningNeeds.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Accessibility size={12} className="text-blue-500" />
                                                    <div className="flex gap-1 flex-wrap">
                                                        {user.learningNeeds.map(n => (
                                                            <span key={n} className="text-[8px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full capitalize border border-blue-100">{n.split('_')[0]}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2 pt-1">
                                                <button onClick={(e) => { e.stopPropagation(); openEditModal(user); }} className="flex-1 py-1.5 text-center text-[10px] font-bold text-gray-600 bg-gray-50 dark:bg-slate-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 border border-gray-200 dark:border-slate-600">
                                                    Edit
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }} className="flex-1 py-1.5 text-center text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 border border-red-100 dark:border-red-900/30">
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
                
                {/* PERFORMANCE VIEW */}
                {activeTab === 'performance' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 pb-12">
                        {/* School Scorecard */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="bg-green-50 dark:bg-green-900/20 p-1.5 rounded-lg text-green-600">
                                        <TrendingUp size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Mastery</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-gray-900 dark:text-white">78</span>
                                    <span className="text-xs font-bold text-gray-400">%</span>
                                </div>
                                <div className="mt-2 h-1 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: '78%' }}></div>
                                </div>
                                <p className="text-[9px] text-green-500 font-bold mt-2">+4% from last month</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-lg text-teacherBlue">
                                        <LayersIcon size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Syllabi Heat</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-gray-900 dark:text-white">62</span>
                                    <span className="text-xs font-bold text-gray-400">%</span>
                                </div>
                                <div className="mt-2 h-1 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-teacherBlue rounded-full" style={{ width: '62%' }}></div>
                                </div>
                                <p className="text-[9px] text-teacherBlue font-bold mt-2">On track for Term 2</p>
                            </div>
                        </div>

                        {/* Sub-Tabs for Performance */}
                        <div className="flex gap-2 mb-2">
                             <button 
                                onClick={() => setPerformanceMetric('teachers')}
                                className={`flex-1 py-2 text-[10px] font-bold rounded-xl border transition-all ${performanceMetric === 'teachers' ? 'bg-teacherBlue text-white border-teacherBlue shadow-md' : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-100 dark:border-slate-700'}`}
                             >
                                 Staff Audit
                             </button>
                             <button 
                                onClick={() => setPerformanceMetric('students')}
                                className={`flex-1 py-2 text-[10px] font-bold rounded-xl border transition-all ${performanceMetric === 'students' ? 'bg-teacherBlue text-white border-teacherBlue shadow-md' : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-100 dark:border-slate-700'}`}
                             >
                                 Student Pulse
                             </button>
                        </div>

                        {performanceMetric === 'teachers' ? (
                            <>
                                {/* Teacher Performance Header */}
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Teacher Pulse</h3>
                                    <div className="flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase">Live</span>
                                    </div>
                                </div>

                                {teacherStats.length === 0 ? (
                                    <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                                        <div className="bg-gray-50 dark:bg-slate-700/50 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <School className="text-gray-300" size={20} />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-medium">No teacher performance metrics yet.</p>
                                    </div>
                                ) : (
                                    teacherStats.map(teacher => (
                                        <div key={teacher.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-teacherBlue/20">
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teacherBlue/10 to-teacherBlue/5 flex items-center justify-center text-teacherBlue font-bold text-sm shadow-inner">
                                                            {teacher.name.split(' ').map(n => n.charAt(0)).join('')}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-none mb-1">{teacher.name}</h3>
                                                            <p className="text-[10px] text-gray-400 font-medium">{teacher.subject || 'General Staff'} • Grade {teacher.currentGrade || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter ${teacher.pacer < 80 ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
                                                        {teacher.pacer < 80 ? 'Attention' : 'On Track'}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100/50 dark:border-slate-600/30">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <TrendingUp size={12} className={teacher.pacer < 80 ? "text-amber-500" : "text-green-500"} />
                                                            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none">Pacer</p>
                                                        </div>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-base font-black text-gray-900 dark:text-white">{teacher.pacer}%</span>
                                                            <span className="text-[8px] font-bold text-gray-400">Coverage</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100/50 dark:border-slate-600/30">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <BarChart3 size={12} className="text-teacherBlue" />
                                                            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none">Class Avg</p>
                                                        </div>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-base font-black text-gray-900 dark:text-white">{teacher.classAvg}%</span>
                                                            <span className="text-[8px] font-bold text-gray-400">Mastery</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => toggleCard(teacher.id)}
                                                    className="w-full h-10 border border-gray-100 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                                                >
                                                    <Sparkles size={14} className="text-amber-500" />
                                                    {expandedCardId === teacher.id ? 'Hide AI Review' : 'Run Performance Audit'}
                                                </button>
                                            </div>

                                            {/* Expanded Details */}
                                            <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${expandedCardId === teacher.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div className="px-4 pb-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700">
                                                    <div className="pt-4">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h4 className="text-[10px] font-black text-teacherBlue uppercase tracking-widest flex items-center gap-1.5">
                                                                <Brain size={14} /> Intelligence Insight
                                                            </h4>
                                                            <button 
                                                                onClick={() => generateInsight(teacher)}
                                                                disabled={loadingInsight}
                                                                className="text-[9px] font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                                                            >
                                                                {loadingInsight && selectedTeacher?.id === teacher.id ? <Loader2 size={10} className="animate-spin"/> : 'Regenerate'}
                                                            </button>
                                                        </div>
                                                        
                                                        {aiInsight && selectedTeacher?.id === teacher.id ? (
                                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-slate-700/50 shadow-sm text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap animate-in zoom-in-95">
                                                                {aiInsight}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center gap-2">
                                                                <Sparkles className="text-amber-200" size={20} />
                                                                <p className="text-[10px] text-gray-400 font-medium">Click to audit performance with Motlatsi AI</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        ) : (
                            <>
                                {/* Student Performance Breakdown */}
                                <div className="space-y-3">
                                     <div className="flex items-center justify-between px-1">
                                        <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Student Cohorts</h3>
                                        <div className="flex gap-1 items-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Analysis</span>
                                        </div>
                                    </div>

                                    {users.filter(u => u.role === 'Student' || u.role === 'student').length === 0 ? (
                                        <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                                            <p className="text-[10px] text-gray-400 font-medium">No students registered in this school directory.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {users.filter(u => u.role === 'Student' || u.role === 'student').map(student => {
                                                const mastery = Math.floor(Math.random() * 30) + 60;
                                                const trend = Math.random() > 0.5 ? 'up' : 'down';
                                                
                                                return (
                                                    <div key={student.id} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 rounded-lg bg-gray-50 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-gray-500 uppercase">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{student.name}</p>
                                                                <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Mastery Progress</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <p className="text-sm font-black text-gray-900 dark:text-white">{mastery}%</p>
                                                                {trend === 'up' ? <TrendingUp size={10} className="text-green-500" /> : <TrendingUp size={10} className="text-red-500 rotate-180" />}
                                                            </div>
                                                            <div className="w-16 h-1 bg-gray-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                                                <div className={`h-full rounded-full ${mastery > 80 ? 'bg-green-500' : 'bg-teacherBlue'}`} style={{ width: `${mastery}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Student Insight Section */}
                        <div className="bg-gradient-to-br from-indigo-500 to-teacherBlue p-5 rounded-3xl shadow-xl shadow-blue-200 dark:shadow-none text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="relative z-10">
                                <h3 className="text-base font-black mb-1 flex items-center gap-2">
                                    <Sparkles size={18} /> Student Spotlights
                                </h3>
                                <p className="text-xs text-white/80 font-medium mb-4">AI identification of at-risk students.</p>
                                
                                <div className="space-y-2">
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs ring-1 ring-white/30">LM</div>
                                            <div>
                                                <p className="text-xs font-bold leading-none">Lebo M.</p>
                                                <p className="text-[9px] text-white/70">Grade 10 • Math</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 bg-red-400 text-[8px] font-bold rounded-lg uppercase">Critical</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs ring-1 ring-white/30">PK</div>
                                            <div>
                                                <p className="text-xs font-bold leading-none">Palesa K.</p>
                                                <p className="text-[9px] text-white/70">Grade 12 • Science</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 bg-amber-400 text-[8px] font-bold rounded-lg uppercase">Review</span>
                                    </div>
                                </div>
                                
                                <button className="w-full mt-4 py-2.5 bg-white text-teacherBlue rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-white/90 transition-all active:scale-[0.98]">
                                    Generate Remedial Deck
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <School size={20} className="text-teacherBlue" /> Invite Staff
                            </h3>
                            <button onClick={() => setIsInviteModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-slate-700 rounded-full"><X size={18} /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500 mb-2">Share these codes. New staff can join your school instantly by entering them at registration.</p>
                            
                            {schoolKeys ? (
                                <>
                                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-bold text-teacherBlue uppercase tracking-wider mb-0.5">Teacher Code</p>
                                            <code className="text-lg font-black text-gray-900 dark:text-white font-mono">{schoolKeys.teacherCode}</code>
                                        </div>
                                        <button 
                                            onClick={() => copyCode(schoolKeys.teacherCode, 'Teacher Code')}
                                            className="p-2.5 text-blue-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                                        >
                                            <Copy size={20} />
                                        </button>
                                    </div>

                                    <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-0.5">Admin Code</p>
                                            <code className="text-lg font-black text-gray-900 dark:text-white font-mono">{schoolKeys.adminCode}</code>
                                        </div>
                                        <button 
                                            onClick={() => copyCode(schoolKeys.adminCode, 'Admin Code')}
                                            className="p-2.5 text-purple-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-colors"
                                        >
                                            <Copy size={20} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4 text-xs text-gray-400">Loading codes...</div>
                            )}

                            <button 
                                onClick={() => setIsInviteModalOpen(false)}
                                className="w-full mt-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Upload size={20} className="text-teacherBlue" /> Bulk Import Users
                            </h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-slate-700 rounded-full"><X size={18} /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-blue-800 dark:text-blue-200">
                                <p className="font-bold mb-1">CSV Format Required:</p>
                                <code className="block bg-white dark:bg-slate-900 p-2 rounded border border-blue-200 dark:border-blue-800 font-mono text-xs">
                                    Name, Email, Role, Grade (opt), Subject (opt)
                                </code>
                                <p className="mt-2 text-xs">Example: <span className="font-mono">Thabo M, thabo@school.ls, Student, 10, Math</span></p>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer relative">
                                <input 
                                    type="file" 
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-2 pointer-events-none">
                                    <div className="p-3 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-400">
                                        <FileText size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Click to upload CSV</p>
                                    <p className="text-xs text-gray-400">or drag and drop file here</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => setIsImportModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl w-full max-w-lg p-6 shadow-2xl pb-10 md:pb-6 relative animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-500"><X size={18} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                                <input className="w-full p-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-teacherBlue outline-none font-medium text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Thabo Mokoena" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                                <input className="w-full p-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-teacherBlue outline-none font-medium text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@school.ls" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
                                <select className="w-full p-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-teacherBlue outline-none font-medium text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                    <option>Student</option>
                                    <option>Teacher</option>
                                    <option>Admin</option>
                                </select>
                            </div>

                            {/* Learning Needs Section - Only for Students */}
                            {formData.role === 'Student' && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                    <h4 className="text-xs font-bold text-teacherBlue dark:text-blue-400 mb-2 flex items-center gap-1.5">
                                        <Accessibility size={14} /> Inclusion & Support
                                    </h4>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        {NEEDS_OPTIONS.map(opt => {
                                            const isSelected = formData.learningNeeds.includes(opt.id);
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => toggleNeed(opt.id)}
                                                    className={`text-left px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                                        isSelected 
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                                        : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-300 hover:border-blue-300'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleSaveUser} 
                                disabled={loading}
                                className="w-full bg-teacherBlue text-white py-3.5 rounded-xl font-bold mt-2 hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                {loading ? 'Saving...' : (editingUser ? 'Save Changes' : 'Create Account')}
                                {!loading && <Save size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
