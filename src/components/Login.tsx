
import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, UserState } from '../types';
import { Shield, GraduationCap, School, Loader2, AlertCircle, CheckCircle, KeyRound, Building2, Copy, ArrowLeft, X, ArrowRight, UserPlus, User } from 'lucide-react';
import MotlatsiLogo from './MotlatsiLogo';
import { useAuth } from '../contexts/AuthContext';
import { useVoiceAccess } from '../contexts/VoiceAccessContext';
import { supabase } from '../lib/supabase';

interface LoginProps {
    onLogin: (user: UserState) => void;
}

// Structure for our simulated School Registry
interface SchoolRegistryItem {
    id: string;
    name: string;
    adminCode: string;   // For other admins to join
    teacherCode: string; // For teachers to join
    studentCodePrefix: string;
    principalName: string;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const { signIn, signUp } = useAuth();
    const { registerCommand, unregisterCommand, speak, isBlindModeActive } = useVoiceAccess();
    
    // UI State
    const [isRegistering, setIsRegistering] = useState(false);
    const [regMode, setRegMode] = useState<'join' | 'create'>('join'); // For Admin/Teacher decision
    
    // Form Data
    const [role, setRole] = useState<UserRole>('student');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Context Specific Inputs
    const [schoolName, setSchoolName] = useState(''); // For Creating School
    const [joinCode, setJoinCode] = useState(''); // For Joining via Code
    const [grade, setGrade] = useState('1'); // For Students
    
    // Status
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
    // Success View Data
    const [newSchoolKeys, setNewSchoolKeys] = useState<SchoolRegistryItem | null>(null);

    // Handle Quick Demo Login (synchronous mock login)
    const handleDemoLogin = useCallback((demoRole: 'student' | 'teacher' | 'parent' | 'admin') => {
        setIsLoading(true);
        
        const processDemoLogin = (usersJson: string | null, role: string) => {
            const users = JSON.parse(usersJson || '[]');
            let targetUser;
            
            // Find the specific pre-seeded user
            if (role === 'student') targetUser = users.find((u: any) => u.id === 'student-1');
            else if (role === 'teacher') targetUser = users.find((u: any) => u.id === 'teacher-1');
            else if (role === 'parent') targetUser = users.find((u: any) => u.id === 'parent-1');
            else if (role === 'admin') targetUser = users.find((u: any) => u.id === 'admin-1');

            if (targetUser) {
                // Mock storing session
                const demoUser = { ...targetUser, isDemo: true };
                localStorage.setItem('motlatsi_user', JSON.stringify(demoUser));
                localStorage.setItem('motlatsi_is_demo', 'true');
                onLogin(demoUser);
            } else {
                setErrorMsg("Demo data not initialized. Please reload page.");
            }
            setIsLoading(false);
        };

        // 1. Clear any existing session data first, but PRESERVE seeded demo data
        const sessionKeys = [
            'motlatsi_user', 
            'motlatsi_is_demo', 
            'motlatsi_nav_view', 
            'motlatsi_nav_topic', 
            'motlatsi_nav_mode',
            'motlatsi_curriculum'
        ];
        
        // Also clear Supabase keys
        const sbKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
        
        [...sessionKeys, ...sbKeys].forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();

        // 2. Mimic network delay
        setTimeout(() => {
            const usersJson = localStorage.getItem('motlatsi_admin_users');
            
            // Fallback: If data is missing (e.g. after a clear), re-seed it
            if (!usersJson) {
                console.log("Demo data missing, re-seeding...");
                import('../utils/demoDataSeeder').then(({ seedDemoData }) => {
                    seedDemoData();
                    const reFetchedUsers = localStorage.getItem('motlatsi_admin_users');
                    processDemoLogin(reFetchedUsers, demoRole);
                });
            } else {
                processDemoLogin(usersJson, demoRole);
            }
        }, 800);
    }, [onLogin]);

    const handleGoogleLogin = useCallback(async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: { access_type: 'offline', prompt: 'consent' },
                },
            });
            if (error) throw error;
        } catch (error: any) {
            console.error('Google Login Error:', error);
            setErrorMsg(error.message);
        }
    }, []);

    useEffect(() => {
        if (isBlindModeActive) {
            speak("Login Screen. Say 'Google' to sign in, or 'Demo' to enter the student hub as a guest.");
            const cmds = [
                { id: 'login-google', regex: /^(login )?google/i, action: () => handleGoogleLogin(), description: 'Sign in using Google authentication' },
                { id: 'login-demo', regex: /^(login )?demo|guest/i, action: () => handleDemoLogin('student'), description: 'Login as a demo student' }
            ];
            cmds.forEach(c => registerCommand(c));
            return () => cmds.forEach(c => unregisterCommand(c.id));
        }
    }, [isBlindModeActive, registerCommand, unregisterCommand, speak, handleGoogleLogin, handleDemoLogin]);

    // Helper: Generate School Codes
    const generateSchoolKeys = (name: string, principal: string): SchoolRegistryItem => {
        const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        const rand = Math.floor(1000 + Math.random() * 9000);
        return {
            id: `sch-${Date.now()}`,
            name: name,
            adminCode: `ADM-${prefix}-${rand}`,
            teacherCode: `TCH-${prefix}-${rand}`,
            studentCodePrefix: `STU-${prefix}`,
            principalName: principal
        };
    };

    // Helper: Validate Code against Registry
    const validateCode = (code: string, targetRole: 'admin' | 'teacher'): SchoolRegistryItem | null => {
        const registry: SchoolRegistryItem[] = JSON.parse(localStorage.getItem('motlatsi_school_registry') || '[]');
        // Master override for demo
        if (code === 'MOTLATSI-ADMIN' && targetRole === 'admin') {
            return { id: 'master-school', name: 'Demo School', adminCode: code, teacherCode: 'TCH-DEMO', studentCodePrefix: 'STU', principalName: 'Demo Admin' };
        }
        
        return registry.find(s => 
            (targetRole === 'admin' && s.adminCode === code) || 
            (targetRole === 'teacher' && s.teacherCode === code)
        ) || null;
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        setIsLoading(true);

        try {
            if (isRegistering) {
                // 1. Validation
                if (!name.trim() || !email.trim() || !password.trim()) throw new Error("Please fill in all fields.");

                let assignedSchoolId = '';
                let assignedSchoolName = '';
                const userStatus: 'active' | 'pending' = 'active'; // Default active, change logic below

                // 2. Role-Specific Logic
                if (role === 'admin') {
                    if (regMode === 'create') {
                        if (!schoolName) throw new Error("Enter a School Name to create.");
                        
                        // Create New School Registry
                        const newSchool = generateSchoolKeys(schoolName, name);
                        const registry = JSON.parse(localStorage.getItem('motlatsi_school_registry') || '[]');
                        registry.push(newSchool);
                        localStorage.setItem('motlatsi_school_registry', JSON.stringify(registry));
                        
                        assignedSchoolId = newSchool.id;
                        assignedSchoolName = newSchool.name;
                        // setNewSchoolKeys moved to after signUp success
                    } else { // regMode === 'join'
                        if (!joinCode) throw new Error("Enter an Admin Join Code.");
                        const school = validateCode(joinCode, 'admin');
                        if (!school) throw new Error("Invalid Admin Code.");
                        
                        assignedSchoolId = school.id;
                        assignedSchoolName = school.name;
                    }
                } else if (role === 'teacher') {
                    if (regMode === 'join') {
                        if (!joinCode) throw new Error("Enter the Teacher Code provided by your Principal.");
                        const school = validateCode(joinCode, 'teacher');
                        if (!school) throw new Error("Invalid Teacher Code.");
                        
                        assignedSchoolId = school.id;
                        assignedSchoolName = school.name;
                        // Teachers joining via code are trusted/active immediately
                    } else {
                        // Personal Workspace
                        const personalSchool = generateSchoolKeys(`${name.split(' ')[0]}'s Class`, name);
                        // Save this personal school invisibly
                        const registry = JSON.parse(localStorage.getItem('motlatsi_school_registry') || '[]');
                        registry.push(personalSchool);
                        localStorage.setItem('motlatsi_school_registry', JSON.stringify(registry));
                        
                        assignedSchoolId = personalSchool.id;
                        assignedSchoolName = personalSchool.name;
                        // Show keys to teacher so they can invite students later
                        // setNewSchoolKeys moved to after signUp success
                    }
                } else if (role === 'parent') {
                    assignedSchoolName = 'Parent Account';
                } else {
                    // Student
                    assignedSchoolName = ''; // Students join loosely, link later via Class Code
                }                // 3. Create Account
                const { data: authData, error: authError } = await signUp(email, password, { name, role });
                if (authError) throw authError;

                if (authData.user && authData.session) {
                    const newUser: UserState = {
                        id: authData.user.id,
                        role: role,
                        name: name,
                        email: email,
                        school: assignedSchoolName,
                        schoolId: assignedSchoolId,
                        currentGrade: grade,
                        completedTopics: [],
                        linkedStudentIds: [],
                        status: userStatus,
                        isDemo: false
                    };

                    await supabase.from('profiles').insert({
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                        role: newUser.role,
                        school: newUser.school,
                        current_grade: newUser.currentGrade
                    });

                    localStorage.setItem('motlatsi_user', JSON.stringify(newUser));
                    
                    // If we generated keys, wait for user to click "Continue" in UI, otherwise login
                    if (role === 'admin' && regMode === 'create') {
                         const registry = JSON.parse(localStorage.getItem('motlatsi_school_registry') || '[]');
                         const school = registry.find((s: any) => s.id === assignedSchoolId);
                         if (school) setNewSchoolKeys(school);
                         else onLogin(newUser);
                    } else if (role === 'teacher' && regMode !== 'join') {
                         const registry = JSON.parse(localStorage.getItem('motlatsi_school_registry') || '[]');
                         const school = registry.find((s: any) => s.id === assignedSchoolId);
                         if (school) setNewSchoolKeys(school);
                         else onLogin(newUser);
                    } else {
                        onLogin(newUser);
                    }
                } else {
                    setSuccessMsg("Check your email to confirm account.");
                    setIsLoading(false);
                }

            } else {
                // Login Logic
                const { data, error: signInError } = await signIn(email, password);
                if (signInError) throw signInError;

                if (data.user) {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                    const userState: UserState = {
                        id: data.user.id,
                        role: (profile?.role as UserRole) || 'student',
                        name: profile?.name || name || 'User',
                        email: data.user.email,
                        school: profile?.school || '',
                        currentGrade: profile?.current_grade || '1',
                        completedTopics: profile?.completed_topics || [],
                        linkedStudentIds: profile?.linked_student_ids || [],
                        status: 'active',
                        isDemo: false
                    };
                    localStorage.setItem('motlatsi_user', JSON.stringify(userState));
                    onLogin(userState);
                }
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            
            // Handle Supabase Rate Limiting gracefully during testing
            if (err.message && (err.message.includes('For security purposes') || err.message.includes('rate limit'))) {
                setErrorMsg("Email rate limit exceeded! To continue testing, please go to your Supabase Dashboard -> Authentication -> Providers -> Email, and turn OFF 'Confirm email'.");
                setIsLoading(false);
            } else {
                setErrorMsg(err.message || "An unexpected error occurred.");
                setIsLoading(false);
            }
        }
    };

    // View: School Created Success
    if (newSchoolKeys) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl p-6 text-center animate-in zoom-in-95">
                    <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {role === 'admin' ? 'School Registered!' : 'Workspace Ready!'}
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        {role === 'admin' ? 'Share these codes with your staff.' : 'Share this code with your students.'}
                    </p>

                    <div className="space-y-3 mb-6">
                        {role === 'admin' && (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-left">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Teacher Access Code</p>
                                <div className="flex justify-between items-center">
                                    <code className="text-lg font-mono font-bold text-blue-900">{newSchoolKeys.teacherCode}</code>
                                    <button aria-label="Copy Teacher Code" onClick={() => navigator.clipboard.writeText(newSchoolKeys.teacherCode)} className="text-blue-400 hover:text-blue-600"><Copy size={16}/></button>
                                </div>
                            </div>
                        )}
                        {role === 'admin' && (
                            <div className="bg-purple-50 border border-purple-100 p-3 rounded-xl text-left">
                                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Admin Invite Code</p>
                                <div className="flex justify-between items-center">
                                    <code className="text-lg font-mono font-bold text-purple-900">{newSchoolKeys.adminCode}</code>
                                    <button aria-label="Copy Admin Code" onClick={() => navigator.clipboard.writeText(newSchoolKeys.adminCode)} className="text-purple-400 hover:text-purple-600"><Copy size={16}/></button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => {
                            const user = JSON.parse(localStorage.getItem('motlatsi_user') || '{}');
                            onLogin(user);
                        }}
                        className="w-full bg-teacherBlue text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700"
                    >
                        Continue to Dashboard
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[95vh]">
                <header className="bg-teacherBlue p-6 text-center relative shrink-0">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="bg-white py-2 px-4 rounded-full shadow-lg mb-2 transform hover:scale-105 transition-transform duration-300">
                            <MotlatsiLogo className="h-6 w-auto" variant="full" />
                        </div>
                        <p className="text-blue-100 text-xs font-medium">Lesotho's Intelligent Education Platform</p>
                    </div>
                </header>

                {/* Tab Switcher */}
                <div role="tablist" className="flex border-b border-gray-100 shrink-0">
                    <button 
                        role="tab"
                        aria-selected={!isRegistering}
                        id="signin-tab"
                        aria-controls="signin-panel"
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${!isRegistering ? 'text-teacherBlue border-b-2 border-teacherBlue bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => { setIsRegistering(false); setErrorMsg(''); }}
                    >
                        Sign In
                    </button>
                    <button 
                        role="tab"
                        aria-selected={isRegistering}
                        id="register-tab"
                        aria-controls="register-panel"
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${isRegistering ? 'text-teacherBlue border-b-2 border-teacherBlue bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => { setIsRegistering(true); setErrorMsg(''); }}
                    >
                        Register
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    {errorMsg && (
                        <div role="alert" className="bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                    
                    {/* --- DEMO SHORTCUTS --- */}
                    {!isRegistering && (
                        <section aria-labelledby="demo-access-heading">
                            <h2 id="demo-access-heading" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-2">Quick Demo Access</h2>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleDemoLogin('student')} className="flex items-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold text-teacherBlue border border-blue-100 transition-colors">
                                    <GraduationCap size={14}/> Student
                                </button>
                                <button onClick={() => handleDemoLogin('teacher')} className="flex items-center gap-2 p-2 bg-orange-50 hover:bg-orange-100 rounded-lg text-xs font-bold text-orange-600 border border-orange-100 transition-colors">
                                    <School size={14}/> Teacher
                                </button>
                                <button onClick={() => handleDemoLogin('parent')} className="flex items-center gap-2 p-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs font-bold text-purple-600 border border-purple-100 transition-colors">
                                    <User size={14}/> Parent
                                </button>
                                <button onClick={() => handleDemoLogin('admin')} className="flex items-center gap-2 p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 border border-slate-200 transition-colors">
                                    <Shield size={14}/> Admin
                                </button>
                            </div>
                            <div className="relative flex items-center justify-center my-4">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                                <span className="relative bg-white px-3 text-[10px] text-gray-400 font-medium">OR LOGIN MANUALLY</span>
                            </div>
                        </section>
                    )}
                    {/* ---------------------- */}

                    <form onSubmit={handleAuth} className="space-y-3">
                        {isRegistering && (
                            <fieldset className="grid grid-cols-4 gap-2 mb-2">
                                <legend className="sr-only">Select your role</legend>
                                <RoleButton active={role === 'student'} onClick={() => { setRole('student'); setErrorMsg(''); }} icon={<GraduationCap size={16} />} label="Student" />
                                <RoleButton active={role === 'teacher'} onClick={() => { setRole('teacher'); setRegMode('join'); setErrorMsg(''); }} icon={<School size={16} />} label="Teacher" />
                                <RoleButton active={role === 'admin'} onClick={() => { setRole('admin'); setRegMode('join'); setErrorMsg(''); }} icon={<Shield size={16} />} label="Admin" />
                                <RoleButton active={role === 'parent'} onClick={() => { setRole('parent'); setErrorMsg(''); }} icon={<User size={16} />} label="Parent" />
                            </fieldset>
                        )}

                        {isRegistering && (
                            <div>
                                <label htmlFor="name" className="sr-only">Full Name</label>
                                <input 
                                    id="name"
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-teacherBlue outline-none text-xs"
                                    placeholder="Full Name"
                                />
                            </div>
                        )}
                        
                        <div>
                            <label htmlFor="email" className="sr-only">Email Address</label>
                            <input 
                                id="email"
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-teacherBlue outline-none text-xs"
                                placeholder="Email Address"
                                aria-invalid={!!errorMsg}
                                aria-describedby={errorMsg ? "auth-error" : undefined}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input 
                                id="password"
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-teacherBlue outline-none text-xs"
                                placeholder="Password"
                                minLength={6}
                                aria-invalid={!!errorMsg}
                                aria-describedby={errorMsg ? "auth-error" : undefined}
                            />
                        </div>

                        {/* --- Role Specific Registration Fields --- */}
                        
                        {isRegistering && role === 'admin' && (
                            <div className="space-y-3 pt-2 border-t border-gray-100 mt-2">
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setRegMode('join')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${regMode === 'join' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                                        Join Existing
                                    </button>
                                    <button type="button" onClick={() => setRegMode('create')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${regMode === 'create' ? 'bg-blue-50 border-blue-200 text-teacherBlue' : 'bg-white border-gray-200 text-gray-400'}`}>
                                        Create New
                                    </button>
                                </div>

                                {regMode === 'create' ? (
                                    <div className="space-y-2 animate-in fade-in">
                                        <label htmlFor="school-name" className="text-[10px] font-bold text-gray-400 uppercase">New School Name</label>
                                        <div className="relative">
                                            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input 
                                                id="school-name"
                                                type="text" 
                                                value={schoolName}
                                                onChange={(e) => setSchoolName(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-teacherBlue outline-none"
                                                placeholder="e.g. Maseru High School"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 italic">You will become the Super Admin.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 animate-in fade-in">
                                        <label htmlFor="join-code" className="text-[10px] font-bold text-gray-400 uppercase">Admin Invite Code</label>
                                        <div className="relative">
                                            <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                                            <input 
                                                id="join-code"
                                                type="text" 
                                                value={joinCode}
                                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-purple-100 bg-purple-50/30 text-xs font-mono uppercase focus:ring-2 focus:ring-purple-400 outline-none"
                                                placeholder="ADM-XXX-0000"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {isRegistering && role === 'teacher' && (
                            <div className="space-y-3 pt-2 border-t border-gray-100 mt-2">
                                {regMode === 'join' ? (
                                    <div className="space-y-2 animate-in fade-in">
                                        <label htmlFor="teacher-code" className="text-[10px] font-bold text-gray-400 uppercase">Teacher Access Code</label>
                                        <div className="relative">
                                            <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teacherBlue" />
                                            <input 
                                                id="teacher-code"
                                                type="text" 
                                                value={joinCode}
                                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-blue-100 bg-blue-50/30 text-xs font-mono uppercase focus:ring-2 focus:ring-teacherBlue outline-none"
                                                placeholder="TCH-XXX-0000"
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setRegMode('create')}
                                            className="text-[10px] text-gray-400 hover:text-teacherBlue flex items-center gap-1 mt-1"
                                        >
                                            No code? Create Personal Workspace <ArrowRight size={10} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg text-center animate-in fade-in">
                                        <UserPlus size={20} className="mx-auto text-orange-500 mb-1" />
                                        <p className="text-xs font-bold text-orange-700">Personal Workspace</p>
                                        <p className="text-[10px] text-orange-600 mt-1">You will be created as a standalone teacher. You can join a school later.</p>
                                        <button 
                                            type="button" 
                                            onClick={() => setRegMode('join')}
                                            className="text-[10px] text-orange-600/70 hover:text-orange-800 underline mt-2"
                                        >
                                            Cancel, I have a code
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {isRegistering && role === 'student' && (
                            <div className="space-y-2 pt-2 border-t border-gray-100 mt-2">
                                <label htmlFor="grade-level" className="text-[10px] font-bold text-gray-400 uppercase">Grade Level</label>
                                <select 
                                    id="grade-level"
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    className="w-full px-2 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-teacherBlue outline-none text-xs"
                                >
                                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                                        <option key={g} value={g}>Grade {g}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {errorMsg && <p id="auth-error" className="sr-only">{errorMsg}</p>}

                        <button 
                            type="submit"
                            disabled={isLoading}
                            aria-live="polite"
                            className="w-full bg-teacherBlue text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={16} /> : (isRegistering ? 'Create Account' : 'Login')}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
};

const RoleButton = ({ active, onClick, icon, label }: any) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg border transition-all h-14 ${
            active 
                ? 'border-teacherBlue bg-blue-50 text-teacherBlue shadow-sm' 
                : 'border-gray-100 bg-white hover:bg-gray-50 text-gray-400'
        }`}
    >
        {icon}
        <span className="text-[9px] font-bold">{label}</span>
    </button>
);

export default Login;