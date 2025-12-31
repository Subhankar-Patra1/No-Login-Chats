import React, { useEffect, useState } from 'react';

export default function LoadingScreen() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Simulate progress bar 
        const interval = setInterval(() => {
            setProgress(prev => {
                const next = prev + Math.random() * 15;
                return next > 100 ? 100 : next;
            });
        }, 150);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 bg-[#111b21] dark:bg-slate-950 text-white flex flex-col items-center justify-center z-50 transition-opacity duration-500">
            <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-sm px-4">
                {/* Logo */}
                <div className="relative">
                    <img src="/logo.svg" alt="Logo" className="w-20 h-20 object-contain opacity-90" />
                </div>

                {/* Progress */}
                <div className="w-full flex flex-col items-center gap-4">
                    <div className="w-full h-[3px] bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[#00a884] shadow-[0_0_10px_rgba(0,168,132,0.5)] transition-all duration-200 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="text-slate-400 text-sm font-medium">
                        Loading your chats...
                    </div>
                </div>
            </div>


        </div>
    );
}
