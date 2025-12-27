import React, { useState } from 'react';

/**
 * PinDurationModal - Modal for selecting how long to pin a message
 */
export default function PinDurationModal({ isOpen, onClose, onPin, message }) {
    const [selectedDuration, setSelectedDuration] = useState('7days');

    const durations = [
        { value: '24hours', label: '24 hours', hours: 24 },
        { value: '7days', label: '7 days', hours: 168 },
        { value: '30days', label: '30 days', hours: 720 }
    ];

    const handlePin = () => {
        const selected = durations.find(d => d.value === selectedDuration);
        onPin(message, selected.hours);
        onClose();
    };

    if (!isOpen || !message) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 pb-2">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                        Choose how long your pin lasts
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        You can unpin at any time.
                    </p>
                </div>

                {/* Options */}
                <div className="p-4 space-y-2">
                    {durations.map((duration) => (
                        <label 
                            key={duration.value}
                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <div className={`
                                w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                ${selectedDuration === duration.value 
                                    ? 'border-emerald-500 bg-emerald-500' 
                                    : 'border-slate-300 dark:border-slate-600'
                                }
                            `}>
                                {selectedDuration === duration.value && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                            </div>
                            <span className={`text-base ${
                                selectedDuration === duration.value 
                                    ? 'text-slate-800 dark:text-white font-medium' 
                                    : 'text-slate-600 dark:text-slate-300'
                            }`}>
                                {duration.label}
                            </span>
                            <input
                                type="radio"
                                name="pin-duration"
                                value={duration.value}
                                checked={selectedDuration === duration.value}
                                onChange={() => setSelectedDuration(duration.value)}
                                className="sr-only"
                            />
                        </label>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 p-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePin}
                        className="px-5 py-2.5 bg-emerald-500 text-white font-semibold rounded-full hover:bg-emerald-600 transition-all shadow-lg hover:shadow-xl"
                    >
                        Pin
                    </button>
                </div>
            </div>
        </div>
    );
}
