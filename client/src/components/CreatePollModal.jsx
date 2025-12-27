import React, { useState } from 'react';

/**
 * CreatePollModal - Modal for creating a new poll with options
 */
export default function CreatePollModal({ isOpen, onClose, onSubmit }) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [isMultipleChoice, setIsMultipleChoice] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);

    const addOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const removeOption = (index) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const updateOption = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate
        if (!question.trim()) return;
        const validOptions = options.filter(o => o.trim());
        if (validOptions.length < 2) return;

        setLoading(true);
        try {
            await onSubmit({
                question: question.trim(),
                options: validOptions,
                is_multiple_choice: isMultipleChoice,
                is_anonymous: isAnonymous
            });
            // Reset
            setQuestion('');
            setOptions(['', '']);
            setIsMultipleChoice(false);
            setIsAnonymous(false);
            onClose();
        } catch (err) {
            console.error('Failed to create poll:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const validOptionsCount = options.filter(o => o.trim()).length;

    return (
        <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-violet-500">ballot</span>
                        Create Poll
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Question */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Question
                        </label>
                        <input
                            type="text"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder="Ask a question..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                            maxLength={300}
                            autoFocus
                        />
                    </div>

                    {/* Options */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Options ({validOptionsCount}/10)
                        </label>
                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-300 shrink-0">
                                        {index + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={e => updateOption(index, e.target.value)}
                                        placeholder={`Option ${index + 1}`}
                                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all text-sm"
                                        maxLength={100}
                                    />
                                    {options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => removeOption(index)}
                                            className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {options.length < 10 && (
                            <button
                                type="button"
                                onClick={addOption}
                                className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 font-medium"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Add option
                            </button>
                        )}
                    </div>

                    {/* Settings */}
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={isMultipleChoice}
                                onChange={e => setIsMultipleChoice(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-violet-500 focus:ring-violet-500"
                            />
                            <div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    Allow multiple choices
                                </span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={e => setIsAnonymous(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-violet-500 focus:ring-violet-500"
                            />
                            <div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    Anonymous voting
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !question.trim() || validOptionsCount < 2}
                        className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">send</span>
                                Create Poll
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
