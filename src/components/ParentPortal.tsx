
import React, { useState, useEffect } from 'react';
import { Shield, BookOpen, CheckCircle, MessageSquare, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import MotlatsiLogo from './MotlatsiLogo';

interface ParentPortalProps {
    linkCode: string;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ linkCode }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [studentData, setStudentData] = useState<any>(null);

    useEffect(() => {
        const fetchStudentData = async () => {
            setLoading(true);
            try {
                const { supabase } = await import('../lib/supabase');
                
                // 1. Find student by parent_link_code
                let user: any = null;
                const { data: profileVal, error: profileErr } = await supabase
                    .from('profiles')
                    .select('id, name, current_grade, school')
                    .eq('parent_link_code', linkCode)
                    .maybeSingle();

                if (!profileErr && profileVal) {
                    user = {
                        id: profileVal.id,
                        name: profileVal.name,
                        current_grade: profileVal.current_grade,
                        school: profileVal.school
                    };
                } else {
                    const { data: userVal, error: userErr } = await supabase
                        .from('users')
                        .select('id, name, current_grade, school')
                        .eq('parent_link_code', linkCode)
                        .maybeSingle();
                    
                    if (userErr || !userVal) {
                        throw new Error("Invalid or expired invite verification code. Please ask your student for their active joint access token in their profile.");
                    }
                    user = userVal;
                }

                // 2. Fetch recent activity
                const { data: activity, error: activityError } = await supabase
                    .from('student_activity')
                    .select('*')
                    .eq('student_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                // 3. Fetch mastery summary (simulated for now based on activity)
                const mastery = activity && activity.length > 0 
                    ? Math.round(activity.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / activity.length)
                    : 0;

                setStudentData({
                    ...user,
                    activity: activity || [],
                    mastery
                });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentData();
    }, [linkCode]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                <Loader2 className="animate-spin text-teacherBlue mb-4" size={40} />
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading Student Profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="size-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Access Denied</h2>
                <p className="text-sm text-gray-500 mb-6 max-w-xs">{error}</p>
                <button 
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-3 bg-teacherBlue text-white font-bold rounded-xl shadow-lg shadow-blue-500/20"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-6 flex items-center justify-between">
                <MotlatsiLogo className="h-8 w-auto" variant="full" />
                <div className="px-3 py-1 bg-blue-50 text-teacherBlue text-[10px] font-black uppercase rounded-full tracking-widest">
                    Parent Portal
                </div>
            </div>

            <main className="p-6 max-w-md mx-auto space-y-6">
                {/* Student Identity */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                    <div className="size-20 bg-blue-100 text-teacherBlue rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-black">
                        {studentData.name.charAt(0)}
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">{studentData.name}</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Grade {studentData.current_grade} • {studentData.school}
                    </p>
                </div>

                {/* Mastery Shield */}
                <div className="bg-teacherBlue p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 opacity-10">
                        <Shield size={160} />
                    </div>
                    <div className="relative z-10 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Current Mastery Score</p>
                        <h2 className="text-6xl font-black mb-2">{studentData.mastery}%</h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest">
                            <CheckCircle size={12} /> On Track for Term 1
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-3">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-2">Recent Progress</h3>
                    {studentData.activity.length === 0 ? (
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-gray-400 text-xs italic">
                            No recent activity recorded.
                        </div>
                    ) : (
                        studentData.activity.map((act: any, i: number) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center">
                                        <BookOpen size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{act.topic_id}</p>
                                        <p className="text-[10px] text-gray-400 font-medium capitalize">{act.activity_type}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-teacherBlue">{act.score}%</p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(act.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Teacher Connection */}
                <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <MessageSquare size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-green-900">Teacher's Note</h4>
                            <p className="text-[10px] text-green-600 font-bold uppercase">Updated Today</p>
                        </div>
                    </div>
                    <p className="text-sm text-green-800 leading-relaxed font-medium italic">
                        "Your child is doing exceptionally well in Mathematics. Encourage them to keep practicing their multiplication tables at home!"
                    </p>
                </div>

                {/* Call to Action */}
                <div className="text-center pt-4">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Want to see more?</p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full py-4 bg-white border border-gray-200 rounded-2xl text-sm font-black text-gray-900 flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
                    >
                        Visit Main Platform <ArrowRight size={16} />
                    </button>
                </div>
            </main>
        </div>
    );
};

export default ParentPortal;
