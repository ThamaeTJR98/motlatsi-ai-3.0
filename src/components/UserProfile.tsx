
import React, { useState, useMemo, useEffect } from 'react';
import { UserState, TeachingAssignment } from '../types';
import { User, Mail, School, Save, Check, LogOut, Book, Plus, Trash2, X, ChevronDown, HelpCircle, GraduationCap, Shield, Trophy, Flame, Zap, Award, Target, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { allGrades } from '../curriculum';
import SupportAgent from './SupportAgent';
import { useLearningEngine } from '../contexts/LearningEngineContext';
import { motion, AnimatePresence } from 'framer-motion';

interface UserProfileProps {
    user: UserState;
    onUpdate: (user: UserState) => void;
    onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate, onLogout }) => {
    const { recentActivity, academicStatus } = useLearningEngine();
    
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email || '');
    const [school, setSchool] = useState(user.school || '');
    const [grade, setGrade] = useState(user.currentGrade);
    const [subject, setSubject] = useState(user.subject || '');
    
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showSupport, setShowSupport] = useState(false);

    // Calculated Stats (Shared with Arcade)
    const totalXP = useMemo(() => {
        const xpFromTopics = (user.completedTopics?.length || 0) * 100;
        const xpFromActivity = recentActivity.reduce((acc, curr) => acc + (curr.score * 10), 0);
        return 250 + xpFromTopics + xpFromActivity;
    }, [user.completedTopics, recentActivity]);

    const level = Math.floor(totalXP / 500) + 1;

    const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

    const battlesPlayed = recentActivity.length;
    const mastery = academicStatus.masteryScore;
    const completedCount = user.completedTopics?.length || 0;

    // Student dynamic identity info:
    const badges = useMemo(() => [
        {
            id: 'early_bird',
            name: 'First Blood',
            desc: 'Complete at least 1 study session or game battle to start your journey.',
            req: 'Play 1 game',
            current: battlesPlayed,
            target: 1,
            unlocked: battlesPlayed >= 1,
            icon: <Zap size={14}/>,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            badgeColor: 'amber'
        },
        {
            id: 'logic_master',
            name: 'Pure Smarts',
            desc: 'Achieve a subject curriculum topic mastery of 70% or more.',
            req: 'Mastery >= 70%',
            current: mastery,
            target: 70,
            unlocked: mastery >= 70,
            icon: <Star size={14}/>,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            badgeColor: 'indigo'
        },
        {
            id: 'curriculum_conqueror',
            name: 'Conqueror',
            desc: 'Fully complete at least 2 subject topics under student portfolio.',
            req: 'Complete 2 topics',
            current: completedCount,
            target: 2,
            unlocked: completedCount >= 2,
            icon: <Trophy size={14}/>,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            badgeColor: 'emerald'
        }
    ], [battlesPlayed, mastery, completedCount]);

    // Teacher Portfolio State
    const [teachingPortfolio, setTeachingPortfolio] = useState<TeachingAssignment[]>(user.teachingSubjects || []);
    const [isAddingAssignment, setIsAddingAssignment] = useState(false);
    const [newAssignSubject, setNewAssignSubject] = useState('');
    const [newAssignGrades, setNewAssignGrades] = useState<string[]>([]);

    // Calculate available subjects based on selected grades
    const availableSubjects = useMemo(() => {
        const uniqueSubjects = new Set<string>();
        if (newAssignGrades.length === 0) return [];

        newAssignGrades.forEach(selectedG => {
            const gradeData = allGrades.find(g => 
                g.grade === selectedG || 
                g.grade === `Grade ${selectedG}` ||
                g.grade.replace('Grade ', '') === selectedG
            );
            if (gradeData) {
                gradeData.subjects.forEach(sub => uniqueSubjects.add(sub.name));
            }
        });
        return Array.from(uniqueSubjects).sort();
    }, [newAssignGrades]);

    const toggleNewGrade = (g: string) => {
        if (newAssignGrades.includes(g)) {
            const updated = newAssignGrades.filter(g2 => g2 !== g);
            setNewAssignGrades(updated);
            if (updated.length === 0 && newAssignSubject !== 'All Subjects' && newAssignSubject !== 'Custom') {
                setNewAssignSubject('');
            }
        } else {
            setNewAssignGrades(prev => [...prev, g]);
        }
    };

    const handleAddAssignment = () => {
        if (!newAssignSubject.trim() || newAssignGrades.length === 0) return;
        
        const newAssignment: TeachingAssignment = {
            subject: newAssignSubject.trim(),
            grades: newAssignGrades.sort((a, b) => parseInt(a) - parseInt(b))
        };
        
        setTeachingPortfolio([...teachingPortfolio, newAssignment]);
        setNewAssignSubject('');
        setNewAssignGrades([]);
        setIsAddingAssignment(false);
    };

    const handleRemoveAssignment = (index: number) => {
        const updated = [...teachingPortfolio];
        updated.splice(index, 1);
        setTeachingPortfolio(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        let updatedGrade = grade;
        let updatedSubject = subject;
        
        if (user.role === 'teacher' && teachingPortfolio.length > 0) {
            updatedGrade = teachingPortfolio[0].grades[0];
            updatedSubject = teachingPortfolio[0].subject;
        }

        const updatedUser: UserState = { 
            ...user, 
            name, 
            email, 
            school, 
            currentGrade: updatedGrade,
            subject: updatedSubject,
            teachingSubjects: teachingPortfolio
        };
        
        onUpdate(updatedUser);
        localStorage.setItem('motlatsi_user', JSON.stringify(updatedUser));
        
        if (user.id) {
            try {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user.id));
                if (isUuid) {
                    await supabase.from('profiles').update({
                        name, email, school, current_grade: updatedGrade, subject: updatedSubject,
                    }).eq('id', user.id);
                } else {
                    const users = JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]');
                    const userIndex = users.findIndex((u: any) => u.id.toString() === user.id!.toString());
                    if (userIndex >= 0) {
                        users[userIndex] = { ...users[userIndex], name, email, school, currentGrade: updatedGrade, subject: updatedSubject, teachingSubjects: teachingPortfolio };
                        localStorage.setItem('motlatsi_admin_users', JSON.stringify(users));
                    }
                }
            } catch (e) {
                console.error("Save failed", e);
            }
        }

        setSaving(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    };

    if (showSupport) {
        return <SupportAgent user={user} onClose={() => setShowSupport(false)} />;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Compact Header */}
            <header className="shrink-0 px-4 py-2 bg-white border-b border-gray-100 flex justify-between items-center z-10">
                <h1 className="text-sm font-black text-gray-900 flex items-center gap-2 tracking-tight">
                    <User size={14} className="text-blue-600" />
                    {user.role === 'admin' ? 'Admin Profile' : 
                     user.role === 'student' ? 'Student Warrior' : 
                     user.role === 'parent' ? 'Parent Profile' : 'Teacher Profile'}
                </h1>
                <button 
                    onClick={onLogout}
                    className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors active:scale-95"
                >
                    <LogOut size={14} />
                </button>
            </header>

            {/* Main Content - No Scroll if possible, or contained scroll */}
            <main className="flex-1 p-3 flex flex-col gap-2 min-h-0 overflow-y-auto pb-20">
                
                {/* Student Warrior Stats */}
                {user.role === 'student' && (
                    <div className="shrink-0 flex flex-col gap-2">
                        <section className="grid grid-cols-3 gap-2">
                            <div className="bg-white p-2 rounded-xl border border-blue-100 flex flex-col items-center justify-center shadow-sm">
                                <div className="p-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black">
                                    <Star size={10} fill="currentColor" />
                                </div>
                                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-1">Status</span>
                                <span className="text-[10px] font-black text-blue-900 mt-0.5">Warrior</span>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-emerald-100 flex flex-col items-center justify-center shadow-sm">
                                <div className="p-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black">
                                    <Trophy size={10} fill="currentColor" />
                                </div>
                                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-1">Mastery</span>
                                <span className="text-[10px] font-black text-emerald-900 mt-0.5">{academicStatus.masteryScore}%</span>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-amber-100 flex flex-col items-center justify-center shadow-sm">
                                <div className="p-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black">
                                    <Zap size={10} fill="currentColor" />
                                </div>
                                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-1">Level</span>
                                <span className="text-[10px] font-black text-amber-900 mt-0.5">{level}</span>
                            </div>
                        </section>

                        {/* Recent Badges */}
                        <section className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Award size={10} className="text-indigo-400" />
                                Battle Badges
                            </h3>
                            <div className="flex gap-1.5 mb-0.5 px-0.5">
                                {badges.map(b => (
                                    <button 
                                        key={b.id} 
                                        onClick={() => setSelectedBadge(b)}
                                        className={`size-8 ${b.unlocked ? b.bg + ' ' + b.color : 'bg-slate-100 text-slate-400 opacity-60'} rounded-lg flex items-center justify-center shadow-inner border border-white/50 active:scale-95 transition-all relative`}
                                        title={b.name}
                                    >
                                        {b.icon}
                                        {b.unlocked && (
                                            <span className="absolute -top-0.5 -right-0.5 size-1 bg-emerald-505 bg-emerald-500 rounded-full" />
                                        )}
                                    </button>
                                ))}
                                <div className="size-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center border border-dashed border-slate-200">
                                    <Plus size={10} />
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* Identity Card - Compact */}
                <div className="shrink-0 flex items-center gap-3 p-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="size-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 text-xs font-black shadow-sm shrink-0">
                        {name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-transparent text-xs font-black text-gray-900 border-none focus:ring-0 p-0 truncate placeholder-gray-300"
                            placeholder="Your Name"
                        />
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{user.role}</span>
                            <span className="size-1 rounded-full bg-gray-300"></span>
                            <span className="text-[9px] font-bold text-green-500 uppercase tracking-wider">Active</span>
                        </div>
                    </div>
                </div>

                {/* Info Grid - 2 Columns */}
                <div className="shrink-0 grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 rounded-xl border border-gray-100">
                        <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Email</label>
                        <div className="flex items-center gap-1.5">
                            <Mail size={10} className="text-gray-300 shrink-0" />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-transparent text-[10px] font-bold text-gray-700 border-none focus:ring-0 p-0 truncate"
                            />
                        </div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-gray-100">
                        <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">School</label>
                        <div className="flex items-center gap-1.5">
                            <School size={10} className="text-gray-300 shrink-0" />
                            <input 
                                type="text" 
                                value={school}
                                onChange={(e) => setSchool(e.target.value)}
                                className="w-full bg-transparent text-[10px] font-bold text-gray-700 border-none focus:ring-0 p-0 truncate"
                            />
                        </div>
                    </div>
                </div>

                {/* Teaching Portfolio - Flex Grow */}
                {user.role === 'teacher' && (
                    <div className="shrink-0 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Classes I teach</h3>
                            {!isAddingAssignment && (
                                <button 
                                    onClick={() => setIsAddingAssignment(true)}
                                    className="size-5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                        
                        <div className="p-2 space-y-1.5">
                            {isAddingAssignment ? (
                                <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[9px] font-black text-blue-600 uppercase">New Class</span>
                                        <button onClick={() => setIsAddingAssignment(false)}><X size={12} className="text-blue-400" /></button>
                                    </div>
                                    
                                    {/* Grade Selector */}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                                            <button
                                                key={g}
                                                onClick={() => toggleNewGrade(g.toString())}
                                                className={`text-[8px] font-bold w-5 h-5 flex items-center justify-center rounded transition-colors ${newAssignGrades.includes(g.toString()) ? 'bg-blue-500 text-white shadow-sm' : 'bg-white border border-blue-100 text-gray-400'}`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Subject Selector */}
                                    <div className="relative mb-2">
                                        <select 
                                            className="w-full p-1.5 rounded-lg text-[10px] font-bold border border-blue-200 bg-white focus:ring-0 outline-none appearance-none"
                                            value={newAssignSubject}
                                            onChange={e => setNewAssignSubject(e.target.value)}
                                            disabled={newAssignGrades.length === 0}
                                        >
                                            <option value="">Select Subject...</option>
                                            <option value="All Subjects">★ All Subjects</option>
                                            {availableSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                            <option value="Custom">Custom...</option>
                                        </select>
                                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                    
                                    {newAssignSubject === 'Custom' && (
                                        <input 
                                            type="text" 
                                            placeholder="Subject Name"
                                            className="w-full p-1.5 mb-2 rounded-lg text-[10px] border border-blue-200 bg-white focus:ring-0 outline-none"
                                            onChange={e => setNewAssignSubject(e.target.value)}
                                        />
                                    )}

                                    <button 
                                        onClick={handleAddAssignment} 
                                        disabled={!newAssignSubject || newAssignGrades.length === 0}
                                        className="w-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Add Class
                                    </button>
                                </div>
                            ) : teachingPortfolio.length === 0 ? (
                                <div className="py-4 flex flex-col items-center justify-center text-gray-300 gap-1">
                                    <Book size={20} className="opacity-20" />
                                    <p className="text-[9px] font-medium">No classes yet</p>
                                </div>
                            ) : (
                                teachingPortfolio.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100 group">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-gray-800 truncate">
                                                {item.subject === 'All Subjects' ? 'General' : item.subject}
                                            </p>
                                            <div className="flex gap-1 mt-0.5 overflow-x-auto scrollbar-hide">
                                                {item.grades.map(g => (
                                                    <span key={g} className="text-[8px] font-bold bg-white text-gray-500 px-1 py-0.5 rounded border border-gray-100 whitespace-nowrap">Gr {g}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveAssignment(idx)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Student Grade Selector */}
                {user.role === 'student' && (
                    <>
                        <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Current Grade</label>
                            <div className="relative">
                                <GraduationCap className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                <select 
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    className="w-full pl-8 pr-7 py-1.5 bg-gray-50 border-none rounded-xl text-[10px] font-bold text-gray-700 focus:ring-0 outline-none appearance-none"
                                >
                                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                                        <option key={g} value={g}>Grade {g}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Joint parent invite token */}
                        <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">🔒 Parent-Child Joint Verification</label>
                            <div className="bg-gray-50 p-2.5 rounded-xl border border-dashed border-gray-200">
                                <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">
                                    Generate a secure joint invite verification code to authorize your parent's secure access.
                                </p>
                                {user.parentLinkCode || user.parent_link_code ? (
                                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
                                        <div>
                                            <p className="text-[8px] font-extrabold uppercase text-emerald-600">Active Link Code</p>
                                            <p className="text-xs font-black tracking-widest text-emerald-900">{user.parentLinkCode || user.parent_link_code}</p>
                                        </div>
                                        <span className="text-[8px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full uppercase">Verified Link</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={async () => {
                                            const token = 'M-' + Math.floor(100 + Math.random() * 900) + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
                                            const updatedUser = { ...user, parent_link_code: token, parentLinkCode: token };
                                            onUpdate(updatedUser);
                                            localStorage.setItem('motlatsi_user', JSON.stringify(updatedUser));
                                            try {
                                                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user.id));
                                                if (isUuid) {
                                                    await supabase.from('profiles').update({
                                                        parent_link_code: token
                                                    }).eq('id', user.id);
                                                } else {
                                                    const adminUsers = JSON.parse(localStorage.getItem('motlatsi_admin_users') || '[]');
                                                    const idx = adminUsers.findIndex((u: any) => u.id.toString() === user.id!.toString());
                                                    if (idx >= 0) {
                                                        adminUsers[idx].parent_link_code = token;
                                                        adminUsers[idx].parentLinkCode = token;
                                                        localStorage.setItem('motlatsi_admin_users', JSON.stringify(adminUsers));
                                                    }
                                                }
                                            } catch (e) {
                                                console.error("Link code generation failed", e);
                                            }
                                        }}
                                        className="w-full py-2 bg-[#2ab2b2] hover:bg-[#259c9c] text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
                                    >
                                        Create Verification Code
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Support Button - Compact */}
                <button 
                    onClick={() => setShowSupport(true)}
                    className="shrink-0 w-full bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 flex items-center justify-between group active:scale-[0.99] transition-all"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white rounded-lg text-indigo-500 shadow-sm">
                            <HelpCircle size={12} />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-bold text-indigo-900">AI Support Assistant</p>
                        </div>
                    </div>
                    <ChevronDown size={12} className="-rotate-90 text-indigo-300" />
                </button>

                {/* AI Credits - Demo Only */}
                {user.isDemo && (
                    <div className="shrink-0 bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-white rounded-lg text-amber-500 shadow-sm">
                                <Shield size={12} />
                            </div>
                            <div className="text-left">
                                <p className="text-[8px] font-bold text-amber-900 uppercase tracking-wider">AI Credits</p>
                                <p className="text-[10px] font-black text-amber-700">{user.ai_credits ?? (user.role === 'student' ? 50 : 100)} remaining</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onUpdate({ ...user, ai_credits: 100 })}
                            className="px-2 py-0.5 bg-white text-amber-600 text-[8px] font-black rounded-md border border-amber-200 hover:bg-amber-100 transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                )}

                {/* Save Button - Sticky Bottom */}
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className={`shrink-0 w-full py-3 rounded-xl font-black text-xs shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-auto ${
                        success ? 'bg-green-500 shadow-green-500/20' : 'bg-blue-600 shadow-blue-500/20'
                    } text-white`}
                >
                    {saving ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : success ? (
                        <>
                            <Check size={14} strokeWidth={3} />
                            <span>Changes Saved!</span>
                        </>
                    ) : (
                        <>
                            <Save size={14} strokeWidth={3} />
                            <span>Save Changes</span>
                        </>
                    )}
                </button>
            </main>

            <AnimatePresence>
                {selectedBadge && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
                        onClick={() => setSelectedBadge(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl p-5"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest">Battle Badge</span>
                                <button onClick={() => setSelectedBadge(null)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                                    <X size={14} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="flex flex-col items-center text-center mt-2 mb-4">
                                <div className={`size-12 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/50 mb-3 bg-indigo-50 ${selectedBadge.color}`}>
                                    {React.cloneElement(selectedBadge.icon, { size: 20 })}
                                </div>

                                <h3 className="text-sm font-black text-slate-900 leading-tight">
                                    {selectedBadge.name}
                                </h3>
                                
                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 border ${
                                    selectedBadge.unlocked 
                                        ? "bg-emerald-50 text-emerald-650 border-emerald-100" 
                                        : "bg-slate-50 text-slate-400 border-slate-100"
                                }`}>
                                    {selectedBadge.unlocked ? "★ Unlocked" : "🔒 Locked"}
                                </span>

                                <p className="text-slate-550 text-slate-500 text-[10px] font-medium leading-relaxed mt-3 max-w-[90%]">
                                    {selectedBadge.desc}
                                </p>
                                
                                {/* Progress bar */}
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            selectedBadge.unlocked ? "bg-emerald-500" : "bg-indigo-500"
                                        }`}
                                        style={{ width: `${Math.min(100, (selectedBadge.current / selectedBadge.target) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between w-full mt-1 text-[8px] font-bold text-slate-400 uppercase">
                                    <span>Progress</span>
                                    <span>{selectedBadge.current} / {selectedBadge.target}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => setSelectedBadge(null)}
                                className="w-full py-2 bg-indigo-600 hover:bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserProfile;
