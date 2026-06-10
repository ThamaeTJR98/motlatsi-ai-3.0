
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useLearningEngine } from '../contexts/LearningEngineContext';

const NetworkStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showSync, setShowSync] = useState(false);
    const { lastSynced } = useLearningEngine();

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowSync(true);
            setTimeout(() => setShowSync(false), 3000); // Hide sync message after 3s
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Watch for sync updates from the engine
    useEffect(() => {
        if (lastSynced && isOnline) {
            const timer = setTimeout(() => {
                setShowSync(true);
                const hideTimer = setTimeout(() => setShowSync(false), 2000);
                return () => clearTimeout(hideTimer);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [lastSynced, isOnline]);

    if (isOnline && !showSync) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg backdrop-blur-md border ${
                !isOnline 
                    ? 'bg-slate-900/90 text-white border-slate-700' 
                    : 'bg-white/90 text-green-700 border-green-200'
            }`}>
                {!isOnline ? (
                    <>
                        <WifiOff size={16} className="text-red-400" />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold leading-none">Offline Mode</span>
                            <span className="text-[9px] text-gray-400 leading-none mt-0.5">Changes saving to device</span>
                        </div>
                    </>
                ) : (
                    <>
                        <RefreshCw size={16} className="text-green-600 animate-spin" />
                        <span className="text-xs font-bold">Syncing data...</span>
                    </>
                )}
            </div>
        </div>
    );
};

export default NetworkStatus;
