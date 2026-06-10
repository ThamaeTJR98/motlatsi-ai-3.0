
import React from 'react';
import { UserState, Curriculum, Topic } from '../types';
import { Calendar, BookOpen, TrendingUp, Clock, LogOut, Zap } from 'lucide-react';
import { useVoiceContext } from '../hooks/useVoiceContext';

interface DashboardProps {
    user: UserState;
    curriculum: Curriculum;
    onTopicSelect: (topic: Topic) => void;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, curriculum, onTopicSelect, onLogout }) => {
    // Helper to get a random topic to show as "Next"
    const getRecentTopic = () => {
        const gradeStr = (user.currentGrade || '1').toString();
        const gradeCurriculum = curriculum.primary.find(g => g.grade === gradeStr || g.grade === `Grade ${gradeStr}`) || 
                               curriculum.highSchool.find(g => g.grade === gradeStr || g.grade === `Grade ${gradeStr}`);
        
        if (gradeCurriculum) {
            const priority = ['Mathematics', 'Science', 'Numeracy', 'Scientific and Technological', 'Numerical and Mathematical'];
            const sortedSubjects = [...gradeCurriculum.subjects].sort((a, b) => {
                const aIndex = priority.findIndex(p => a.name.includes(p));
                const bIndex = priority.findIndex(p => b.name.includes(p));
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                return 0;
            });

            const allTopics: Topic[] = [];
            sortedSubjects.forEach(sub => {
                allTopics.push(...sub.topics);
            });

            const next = allTopics.find(t => !user.completedTopics.includes(t.id));
            return next || allTopics[0] || null;
        }
        return null;
    };

    const nextTopic = getRecentTopic();

    // --- Voice Context Registration ---
    useVoiceContext([
        {
            id: 'open-next-lesson',
            keywords: ['start lesson', 'begin lesson', 'next topic', 'start'],
            action: () => nextTopic && onTopicSelect(nextTopic),
            description: 'Starts the recommended next lesson'
        },
        {
            id: 'dashboard-logout',
            keywords: ['sign out', 'log out', 'exit'],
            action: () => onLogout(),
            description: 'Signs out of the application'
        },
        {
            id: 'read-progress',
            keywords: ['progress', 'how am i doing', 'stats', 'status'],
            action: () => {
                const utterance = new SpeechSynthesisUtterance("You are currently on track. You have completed 12 topics and your daily reading goal is 15 minutes.");
                window.speechSynthesis.speak(utterance);
            },
            description: 'Reads out current progress stats'
        }
    ]);

    const credits = user.ai_credits ?? (user.role === 'student' ? 5 : 10);

    return (
        <main className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Khotso, {user.name} <span role="img" aria-label="waving hand" className="inline-block animate-wave origin-bottom-right">👋</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Here is your {user.role === 'teacher' ? 'teaching' : 'learning'} summary for today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold border border-indigo-100 shadow-sm" title="AI Credits Remaining">
                        <Zap size={16} className={credits > 0 ? "fill-indigo-600" : "text-indigo-300"} />
                        <span>{credits}</span>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        aria-label="Sign Out"
                    >
                        <LogOut size={22} />
                    </button>
                </div>
            </header>

            {/* Quick Stats */}
            <section aria-labelledby="stats-heading" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <h2 id="stats-heading" className="sr-only">Today's Statistics</h2>
                <StatCard icon={<Calendar className="text-white" />} bg="bg-teacherBlue" label="Next Class" value={user.isDemo ? "10:00 AM" : "--:--"} sub={user.isDemo ? "Integrated Studies" : "No schedule"} />
                <StatCard icon={<TrendingUp className="text-white" />} bg="bg-growthGreen" label="Progress" value="Term 1" sub="Week 4 of 12" />
                <StatCard icon={<BookOpen className="text-white" />} bg="bg-orange-500" label="Topics" value={user.completedTopics?.length || 0} sub="Completed" />
                <StatCard icon={<Clock className="text-white" />} bg="bg-purple-500" label="Reading" value={user.isDemo ? "15m" : "0m"} sub="Daily Goal" />
            </section>

            {/* Main Action Area */}
            <div className="grid md:grid-cols-3 gap-6">
                
                {/* Left Col: Next Lesson/Activity */}
                <div className="md:col-span-2 space-y-6">
                    <section aria-labelledby="learning-heading" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h2 id="learning-heading" className="font-bold text-lg text-gray-800">
                                {user.role === 'teacher' ? 'Next Lesson Plan' : 'Continue Learning'}
                            </h2>
                            <span className="text-xs font-semibold bg-blue-100 text-teacherBlue px-3 py-1 rounded-full">Grade {user.currentGrade}</span>
                        </div>
                        
                        {nextTopic ? (
                            <div className="flex flex-col md:flex-row gap-4">
                                <div role="img" aria-label="Topic illustration" className="h-32 md:w-48 bg-gray-100 rounded-xl flex items-center justify-center text-4xl">
                                    🌍
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-xl text-lesothoBlue mb-2">{nextTopic.title}</h3>
                                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">{nextTopic.description}</p>
                                    
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {nextTopic.curriculumStandards?.slice(0, 2).map((std, i) => (
                                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                                                {std}
                                            </span>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={() => onTopicSelect(nextTopic)}
                                        className="bg-teacherBlue text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full md:w-auto"
                                    >
                                        {user.role === 'teacher' ? 'Open Lesson Wizard' : 'Start Lesson'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-gray-400 italic">No topics available for your grade.</div>
                        )}
                    </section>

                     {/* Recent Updates */}
                     <section aria-labelledby="updates-heading" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 id="updates-heading" className="font-bold text-lg text-gray-800 mb-4">Curriculum Updates</h2>
                        <div className="space-y-4">
                            <UpdateItem title="New Sesotho Orthography Guidelines" date="2 days ago" tag="Policy" />
                            <UpdateItem title="Grade 7 Exam Prep Materials" date="1 week ago" tag="Resources" />
                        </div>
                    </section>
                </div>

                {/* Right Col: Quick Access / Leaderboard */}
                <aside className="space-y-6">
                    <section aria-labelledby="offline-status-heading" className="bg-gradient-to-br from-lesothoBlue to-blue-900 rounded-2xl p-6 text-white shadow-lg">
                        <h3 id="offline-status-heading" className="font-bold text-lg mb-2">Offline Mode</h3>
                        <p className="text-blue-100 text-sm mb-4">Content is synced. You can teach or learn without data.</p>
                        <div aria-live="polite" className="flex items-center gap-2 text-xs font-semibold bg-white/10 w-fit px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-growthGreen rounded-full animate-pulse"></div>
                            Ready
                        </div>
                    </section>

                    <section aria-labelledby="top-topics-heading" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 id="top-topics-heading" className="font-bold text-lg text-gray-800 mb-4">Top Topics</h3>
                        <ul role="list" className="space-y-3">
                            {(user.isDemo ? ['Counting 1-20', 'Family Tree', 'Seasons'] : []).map((t, i) => (
                                <li role="listitem" key={i}>
                                    <a href="#" className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                        <span className="text-gray-700 text-sm font-medium">{t}</span>
                                        <span aria-hidden="true" className="text-gray-400 group-hover:text-teacherBlue">→</span>
                                    </a>
                                </li>
                            ))}
                            {!user.isDemo && <li className="text-xs text-gray-400 italic text-center py-4">Complete lessons to see top topics.</li>}
                        </ul>
                    </section>
                </aside>
            </div>
        </main>
    );
};

const StatCard = ({ icon, bg, label, value, sub }: any) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-start">
        <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mb-3 shadow-md`}>
            {icon}
        </div>
        <span className="text-gray-500 text-xs font-medium">{label}</span>
        <span className="text-xl font-bold text-gray-900">{value}</span>
        <span className="text-[10px] text-gray-400 mt-1">{sub}</span>
    </div>
);

const UpdateItem = ({ title, date, tag }: any) => (
    <div className="flex items-start gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
        <div className="w-2 h-2 rounded-full bg-teacherBlue mt-2 flex-shrink-0" />
        <div>
            <h4 className="text-sm font-medium text-gray-900">{title}</h4>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">{date}</span>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{tag}</span>
            </div>
        </div>
    </div>
);

export default Dashboard;
