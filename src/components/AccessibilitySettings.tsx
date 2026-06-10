
import React from 'react';
import { AccessibilitySettings as SettingsType } from '../types';
import { ArrowLeft, Check, Type, Sun, MessageSquare, BookOpen, WifiOff, User, LogOut, ChevronRight } from 'lucide-react';

interface Props {
    settings: SettingsType;
    onUpdate: (s: SettingsType) => void;
    onBack: () => void;
    onNavigate: (view: string) => void;
    onLogout: () => void;
}

const AccessibilitySettingsView: React.FC<Props> = ({ settings, onUpdate, onBack, onNavigate, onLogout }) => {
    const toggle = (key: keyof SettingsType) => {
        onUpdate({ ...settings, [key]: !settings[key] });
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            {/* Compact Header */}
            <header className="shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1.5 rounded-full bg-gray-100 text-gray-600 active:scale-95 transition-transform">
                        <ArrowLeft size={16} />
                    </button>
                    <h1 className="text-sm font-black text-gray-900 tracking-tight">Access & Settings</h1>
                </div>
                <div className="size-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                    <User size={12} />
                </div>
            </header>

            {/* Main Content - Grid Layout for Compactness */}
            <main className="flex-1 p-3 flex flex-col gap-2 min-h-0 overflow-y-auto pb-20">
                
                {/* Toggles Grid - 2 Columns */}
                <div className="grid grid-cols-2 gap-2 shrink-0">
                    <CompactToggle 
                        icon={<WifiOff size={14} />}
                        label="Data Saver"
                        active={settings.dataSaver}
                        onToggle={() => toggle('dataSaver')}
                        color="green"
                    />
                    <CompactToggle 
                        icon={<Type size={14} />}
                        label="Dyslexic Font"
                        active={settings.dyslexicFont}
                        onToggle={() => toggle('dyslexicFont')}
                        color="purple"
                    />
                    <CompactToggle 
                        icon={<Sun size={14} />}
                        label="High Contrast"
                        active={settings.highContrast}
                        onToggle={() => toggle('highContrast')}
                        color="orange"
                    />
                    <CompactToggle 
                        icon={<BookOpen size={14} />}
                        label="Simple Text"
                        active={settings.simplifiedLanguage}
                        onToggle={() => toggle('simplifiedLanguage')}
                        color="blue"
                    />
                </div>

                {/* Full Width Toggle */}
                <div 
                    onClick={() => toggle('autoTranscript')}
                    className={`shrink-0 flex items-center justify-between p-2.5 rounded-xl border transition-all active:scale-[0.99] ${settings.autoTranscript ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}
                >
                    <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${settings.autoTranscript ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <MessageSquare size={14} />
                        </div>
                        <div>
                            <p className="font-bold text-[10px] text-gray-900">Auto Transcript</p>
                            <p className="text-[8px] text-gray-500 leading-none mt-0.5">Show captions for audio</p>
                        </div>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${settings.autoTranscript ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${settings.autoTranscript ? 'left-4.5' : 'left-0.5'}`}></div>
                    </div>
                </div>

                {/* Account Actions - Compact List */}
                <div className="bg-white rounded-2xl border border-gray-100 p-1 flex flex-col">
                    <button 
                        onClick={() => onNavigate('profile')}
                        className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-xl transition-colors group"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="bg-gray-100 p-1.5 rounded-lg text-gray-600">
                                <User size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-700">Edit Profile</span>
                        </div>
                        <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500" />
                    </button>
                    
                    <div className="h-px bg-gray-50 mx-3"></div>

                    <button 
                        onClick={onLogout}
                        className="flex items-center justify-between p-2.5 hover:bg-red-50 rounded-xl transition-colors group"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="bg-red-50 p-1.5 rounded-lg text-red-500">
                                <LogOut size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-red-500">Sign Out</span>
                        </div>
                    </button>
                </div>

                {/* Save Button - Stays at bottom */}
                <button 
                    onClick={onBack} 
                    className="shrink-0 w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-auto"
                >
                    <Check size={14} strokeWidth={3} />
                    <span>Save & Close</span>
                </button>
            </main>
        </div>
    );
};

const CompactToggle = ({ icon, label, active, onToggle, color }: any) => {
    const colorStyles: any = {
        green: active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : '',
        purple: active ? 'bg-purple-50 border-purple-200 text-purple-700' : '',
        orange: active ? 'bg-orange-50 border-orange-200 text-orange-700' : '',
        blue: active ? 'bg-blue-50 border-blue-200 text-blue-700' : '',
    };

    const activeStyle = colorStyles[color] || '';
    const inactiveStyle = 'bg-white border-gray-100 text-gray-600';

    return (
        <button 
            onClick={onToggle}
            className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all active:scale-[0.96] h-20 ${active ? activeStyle : inactiveStyle}`}
        >
            <div className={`p-1.5 rounded-full ${active ? 'bg-white/60' : 'bg-gray-100'}`}>
                {icon}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wide text-center leading-tight">{label}</span>
            {active && <div className="w-1 h-1 rounded-full bg-current"></div>}
        </button>
    );
};

export default AccessibilitySettingsView;
