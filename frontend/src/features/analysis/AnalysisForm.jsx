import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

const AnalysisForm = ({ onAnalyze, loading, isPolling }) => {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        onAnalyze(text);
    };

    return (
        <div className="
            animate-fade-up
            glow-border-brand
            bg-base dark:bg-surface
            rounded-2xl flex flex-col
            h-[60%] lg:h-auto min-h-[300px]
            overflow-hidden
            border border-brutal-border dark:border-[#303036]
            transition-all duration-300
        ">
            <div className="p-1 flex-grow flex flex-col">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={loading}
                    placeholder="Paste suspicious text here for analysis..."
                    className="
                        w-full flex-grow min-h-[160px] p-6
                        text-brand dark:text-[#f0f0f2]
                        bg-transparent border-0 focus:ring-0
                        resize-none text-lg lg:text-xl font-medium outline-none
                        placeholder:text-tx-secondary dark:placeholder:text-[#8e8e99]
                        disabled:opacity-50 transition-colors
                    "
                />
            </div>
            <div className="px-6 py-4 flex justify-between items-center border-t border-brutal-border/30 dark:border-[#303036] transition-colors duration-300">
                <span className="text-xs font-semibold text-tx-secondary dark:text-[#8e8e99]">
                    {text.length} characters
                </span>
                <button
                    onClick={handleSubmit}
                    disabled={loading || text.length === 0}
                    className="
                        flex items-center gap-2
                        bg-tx-primary dark:bg-[#26262b]
                        hover:bg-brand-dark dark:hover:bg-[#303036]
                        text-white dark:text-[#f0f0f2]
                        border border-brutal-border dark:border-[#303036]
                        px-8 py-2 rounded-xl font-bold
                        transition-all duration-200 active:scale-95
                        shadow-sm hover:shadow-md
                        disabled:opacity-40 disabled:cursor-not-allowed
                    "
                >
                    {loading && !isPolling
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <Search className="w-4 h-4" />
                    }
                    {loading ? (isPolling ? 'Analyzing...' : 'Gönderiliyor...') : 'Analiz'}
                </button>
            </div>
        </div>
    );
};

export default AnalysisForm;
