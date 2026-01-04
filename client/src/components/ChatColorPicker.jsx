import React, { useState } from 'react';

const PRESET_COLORS = [
    null, // Default (Theme Color)
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#64748b', // Slate
];

export default function ChatColorPicker({ currentColor, onChange }) {
    const [customColor, setCustomColor] = useState(currentColor || '#000000');

    const handleCustomChange = (e) => {
        const color = e.target.value;
        setCustomColor(color);
        onChange(color);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Chat Bubble Colour
            </div>
            
            <div className="flex flex-wrap gap-3">
                {PRESET_COLORS.map((color, index) => {
                    const isSelected = currentColor === color || (!currentColor && color === null);
                    
                    if (color === null) {
                        return (
                            <button
                                key="default"
                                type="button"
                                onClick={() => onChange(null)}
                                className={`
                                    w-8 h-8 rounded-full flex items-center justify-center transition-all relative
                                    bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600
                                    ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-110' : 'hover:scale-105'}
                                `}
                                title="Default"
                            >
                                <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-slate-400">
                                    format_color_reset
                                </span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={color}
                            type="button"
                            onClick={() => onChange(color)}
                            style={{ backgroundColor: color }}
                            className={`
                                w-8 h-8 rounded-full shadow-sm transition-all relative
                                ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-110' : 'hover:scale-105 border border-black/10 dark:border-white/10'}
                            `}
                        />
                    );
                })}

                {/* Custom Color Input Wrapper */}
                <div className="relative w-8 h-8 rounded-full overflow-hidden transition-all hover:scale-105 border border-slate-300 dark:border-slate-600">
                    <input
                        type="color"
                        value={customColor} // Fallback if currentColor is null or preset
                        onChange={handleCustomChange}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 m-0 border-0 cursor-pointer"
                        title="Custom Colour"
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-transparent">
                         <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-slate-400 mix-blend-difference">
                                palette
                         </span>
                    </div>
                </div>
            </div>

            {/* Live Preview */}
            <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col gap-2 pointer-events-none select-none opacity-90">
                <div className="self-end max-w-[80%] p-2 rounded-2xl rounded-tr-sm shadow-sm"
                     style={{ 
                         backgroundColor: currentColor || 'var(--color-primary, #4f46e5)',
                         color: currentColor ? (parseInt(currentColor.replace('#', ''), 16) > 0xffffff / 2 ? '#000' : '#fff') : '#fff'
                     }}
                >
                    <p className="text-sm">This is how your sent messages will look.</p>
                </div>
            </div>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Only you will see this colour.
            </p>
        </div>
    );
}
