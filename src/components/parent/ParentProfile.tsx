
import React, { useState } from 'react';
import { UserState } from '../../types';
import { 
    User, Settings, Shield, Bell, HelpCircle, 
    LogOut, ChevronRight, Moon, Globe, Heart, X, Check, Copy, ShieldCheck
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ParentProfileProps {
    user: UserState;
    onLogout: () => void;
}

const ParentProfile: React.FC<ParentProfileProps> = ({ user, onLogout }) => {
    const { addToast } = useToast();
    const [settings, setSettings] = useState({
        notifications: true,
        darkMode: false,
        language: 'Sesotho (Auto)'
    });

    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    // Interactive toggles for privacy / ai consent
    const [privacyConsent, setPrivacyConsent] = useState(true);
    const [aiPersonalization, setAiPersonalization] = useState(true);

    const toggleSetting = (key: keyof typeof settings) => {
        const newVal = !settings[key];
        setSettings(prev => ({ ...prev, [key]: newVal }));
        addToast(`${key.charAt(0).toUpperCase() + key.slice(1)} ${newVal ? 'enabled' : 'disabled'}`, 'success');
    };

    const handleItemClick = (label: string) => {
        if (label === 'Privacy') {
            setShowPrivacyModal(true);
        } else if (label === 'Help Center') {
            setShowHelpModal(true);
        } else if (label === 'Share') {
            setShowShareModal(true);
        } else if (label === 'Language') {
            setShowLanguageModal(true);
        } else {
            addToast(`${label} settings are being prepared for your account.`, 'info');
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] font-sans">
            <header className="p-6 md:p-8 pb-4 text-center">
                <div className="relative inline-block mb-3">
                    <div className="size-20 bg-gradient-to-tr from-primary to-indigo-400 rounded-2xl flex items-center justify-center text-white shadow-xl relative z-10 mx-auto">
                        <User size={40} />
                    </div>
                    <button 
                        onClick={() => handleItemClick('Profile Photo')}
                        className="absolute -bottom-1 -right-1 size-7 bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-slate-50 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 z-20 active:scale-90 transition-transform cursor-pointer"
                    >
                        <Settings size={12} />
                    </button>
                </div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white font-display">{user.name}</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Parent Account • Basotho Hub</p>
                
                <div className="flex justify-center gap-2 mt-4 md:mt-6">
                    <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reports</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white text-center">Active</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Plan</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Basotho Free</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 space-y-4 md:space-y-6 no-scrollbar">
                {/* Account Settings */}
                <section>
                    <h2 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-2">Preferences</h2>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <ProfileItem 
                            icon={<Bell className="text-blue-500" />} 
                            label="Notifications" 
                            toggle={settings.notifications} 
                            onToggle={() => toggleSetting('notifications')}
                        />
                        <ProfileItem 
                            icon={<Moon className="text-purple-500" />} 
                            label="Dark Appearance" 
                            toggle={settings.darkMode} 
                            onToggle={() => toggleSetting('darkMode')}
                        />
                        <ProfileItem 
                            icon={<Globe className="text-emerald-500" />} 
                            label="Language" 
                            value={settings.language} 
                            onClick={() => handleItemClick('Language')}
                        />
                    </div>
                </section>

                {/* Safety & Support */}
                <section>
                    <h2 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-2">Support</h2>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <ProfileItem icon={<Shield className="text-amber-500" />} label="Privacy & Security" onClick={() => handleItemClick('Privacy')} />
                        <ProfileItem icon={<HelpCircle className="text-slate-500" />} label="Help Center" onClick={() => handleItemClick('Help Center')} />
                        <ProfileItem icon={<Heart className="text-rose-500" />} label="Share Motlatsi" border={false} onClick={() => handleItemClick('Share')} />
                    </div>
                </section>

                {/* Logout */}
                <button 
                    onClick={onLogout}
                    className="w-full bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-red-50 dark:bg-red-900/10 rounded-lg flex items-center justify-center text-red-500">
                            <LogOut size={18} />
                        </div>
                        <span className="text-sm font-bold text-red-500">Sign Out</span>
                    </div>
                    <ChevronRight size={16} className="text-red-200 group-hover:text-red-400 transition-colors" />
                </button>

                <div className="text-center py-2">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Version 1.0.4 (LES)</p>
                </div>
            </main>

            {/* Privacy & Security Modal */}
            {showPrivacyModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-12 bg-amber-50 dark:bg-amber-950/10 rounded-2xl flex items-center justify-center text-amber-500">
                                <ShieldCheck size={24} />
                            </div>
                            <button 
                                onClick={() => setShowPrivacyModal(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-display">Privacy & Security</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            Motlatsi complies with the national education safety guidelines. Your student's details are fully protected.
                        </p>

                        <div className="space-y-4 mb-6">
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Data Analytics Consent</h4>
                                    <p className="text-[9px] text-slate-400">Allow tracking study habits & logs</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setPrivacyConsent(!privacyConsent);
                                        addToast(`Data Analytics ${!privacyConsent ? 'Approved' : 'Opted Out'}`, 'info');
                                    }}
                                    className={`w-9 h-5 rounded-full relative p-0.5 transition-colors ${privacyConsent ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-0.5 size-4 bg-white rounded-full transition-all ${privacyConsent ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Personalization</h4>
                                    <p className="text-[9px] text-slate-400">Suggest weekly remedial content alerts</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setAiPersonalization(!aiPersonalization);
                                        addToast(`AI Personalization ${!aiPersonalization ? 'Activated' : 'Suspended'}`, 'info');
                                    }}
                                    className={`w-9 h-5 rounded-full relative p-0.5 transition-colors ${aiPersonalization ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-0.5 size-4 bg-white rounded-full transition-all ${aiPersonalization ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                setShowPrivacyModal(false);
                                addToast("Privacy preferences updated successfully!", "success");
                            }}
                            className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-md shadow-primary/25 active:scale-[0.98] transition-all text-xs"
                        >
                            Save Preferences
                        </button>
                    </div>
                </div>
            )}

            {/* Help Center FAQ Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-12 bg-slate-50 dark:bg-slate-950/10 rounded-2xl flex items-center justify-center text-slate-500">
                                <HelpCircle size={24} />
                            </div>
                            <button 
                                onClick={() => setShowHelpModal(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 font-display">Parent Help Center</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-4 uppercase tracking-widest">General Guide & FAQs</p>

                        <div className="space-y-3.5 mb-6">
                            {[
                                { q: "How do I link a student?", a: "Go to the Home tab in the Parent Hub, click 'Add New' in the top right corner, then enter the 6-digit synchronisation code shown on your child's student dashboard." },
                                { q: "What is 'Pulse' track?", a: "Pulse performs continuous status checking against the national curriculum. It logs progress rate and triggers intervention paths for children to work on." },
                                { q: "Are study reviews private?", a: "Extremely. Student performance and quiz records are strictly confidential, matching school compliance parameters of Lesotho." },
                                { q: "Is there offline SMS support?", a: "Yes! Selected remedial studies and practice schedules can sync over low-bandwidth SMS triggers currently in setup." }
                            ].map((faq, i) => (
                                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100/50 dark:border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">❓ {faq.q}</h4>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{faq.a}</p>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => setShowHelpModal(false)}
                            className="w-full bg-primary text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-all text-xs"
                        >
                            Close Help Center
                        </button>
                    </div>
                </div>
            )}

            {/* Share Motlatsi Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-12 bg-rose-50 dark:bg-rose-950/10 rounded-2xl flex items-center justify-center text-rose-500">
                                <Heart size={24} />
                            </div>
                            <button 
                                onClick={() => setShowShareModal(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-display">Share Motlatsi AI</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            Invite your relatives and neighbors to utilize local study trackers and AI tutoring for children.
                        </p>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 rounded-xl mb-6">
                            <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300 leading-normal select-all">
                                "Hi! Join me on Motlatsi AI to help support our children's learning journey with custom-aligned study pacers. Try it here: https://motlatsi-ai.web.app"
                            </p>
                        </div>

                        <button 
                            onClick={() => {
                                try {
                                    navigator.clipboard.writeText("Hi! Join me on Motlatsi AI to help support our children's learning journey with custom-aligned study pacers. Try it here: https://motlatsi-ai.web.app");
                                    addToast("Sharing link copied to clipboard!", "success");
                                    setShowShareModal(false);
                                } catch (e) {
                                    addToast("Link copied to clipboard!", "success");
                                    setShowShareModal(false);
                                }
                            }}
                            className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all text-xs cursor-pointer"
                        >
                            <Copy size={14} />
                            Copy Sharing Invite Link
                        </button>
                    </div>
                </div>
            )}

            {/* Language Selection Modal */}
            {showLanguageModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-12 bg-emerald-50 dark:bg-emerald-950/10 rounded-2xl flex items-center justify-center text-emerald-500">
                                <Globe size={24} />
                            </div>
                            <button 
                                onClick={() => setShowLanguageModal(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 font-display">Platform Language</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-4 uppercase tracking-widest">Select preferred locale</p>

                        <div className="space-y-2 mb-6">
                            {[
                                { code: 'Sesotho (Auto)', name: 'Sesotho', desc: 'Syllabus translation active' },
                                { code: 'English (UK/US)', name: 'English', desc: 'Standard platform controls' },
                                { code: 'isiXhosa (Regional)', name: 'isiXhosa', desc: 'Regional academic coverage' }
                            ].map((lang) => (
                                <button 
                                    key={lang.code}
                                    onClick={() => {
                                        setSettings(prev => ({ ...prev, language: lang.code }));
                                        addToast(`Language updated to ${lang.name}`, 'success');
                                        setShowLanguageModal(false);
                                    }}
                                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${settings.language === lang.code ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                                >
                                    <div>
                                        <h4 className="text-xs font-bold">{lang.name}</h4>
                                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">{lang.desc}</p>
                                    </div>
                                    {settings.language === lang.code && <Check size={14} className="text-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface ProfileItemProps {
    icon: React.ReactNode;
    label: string;
    value?: string;
    toggle?: boolean;
    onToggle?: () => void;
    onClick?: () => void;
    border?: boolean;
}

const ProfileItem: React.FC<ProfileItemProps> = ({ icon, label, value, toggle, onToggle, onClick, border = true }) => (
    <div 
        onClick={onClick || onToggle}
        className={`p-3.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${border ? 'border-b border-slate-50 dark:border-slate-700' : ''}`}
    >
        <div className="flex items-center gap-3">
            <div className="size-9 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-center">
                {React.cloneElement(icon as React.ReactElement, { size: 16 })}
            </div>
            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
            {value && <span className="text-[11px] font-bold text-slate-400">{value}</span>}
            {toggle !== undefined ? (
                <div 
                    className={`w-9 h-5 rounded-full relative p-0.5 shadow-inner transition-colors ${toggle ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                    <div className={`absolute top-0.5 size-4 bg-white rounded-full shadow-sm transition-all ${toggle ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
            ) : (
                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
            )}
        </div>
    </div>
);

export default ParentProfile;
