
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000); // Auto remove after 3s
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right-full duration-300 ${
                            toast.type === 'success' ? 'bg-white border-green-100 text-green-800' :
                            toast.type === 'error' ? 'bg-white border-red-100 text-red-800' :
                            'bg-white border-blue-100 text-blue-800'
                        }`}
                    >
                        {toast.type === 'success' && <CheckCircle size={18} className="text-green-500" />}
                        {toast.type === 'error' && <AlertCircle size={18} className="text-red-500" />}
                        {toast.type === 'info' && <Info size={18} className="text-blue-500" />}
                        
                        <p className="text-sm font-medium">{toast.message}</p>
                        
                        <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
