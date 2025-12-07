import { useEffect } from 'react';

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-slate-900 rounded-2xl w-full max-w-[400px] border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-xl font-bold text-white">Logout</h3>
                    <button 
                        onClick={onClose} 
                        className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                        <span className="material-symbols-outlined text-red-500 text-3xl">logout</span>
                    </div>
                    
                    <div className="space-y-2">
                        <h4 className="text-lg font-semibold text-slate-200">Are you sure you want to logout?</h4>
                        <p className="text-sm text-slate-400">
                            You will need to login again to access your chats.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 w-full mt-2">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all duration-200"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onConfirm}
                            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20 transition-all duration-200"
                        >
                            Yes, Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
