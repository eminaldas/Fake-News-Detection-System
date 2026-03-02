import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

const AnalysisForm = ({ onAnalyze, loading, isPolling, _error }) => {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        onAnalyze(text);
    };

    return (
        <div className="bg-app-surface rounded-2xl shadow-sm border border-app-gray overflow-hidden mb-8 transition-colors duration-300 hover:shadow-md">
            <div className="p-2">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={loading}
                    placeholder="Paste suspicious text here for analysis..."
                    className="w-full h-56 p-4 text-app-charcoal bg-transparent border-0 focus:ring-0 resize-none text-lg outline-none placeholder:text-app-charcoal placeholder:opacity-40 disabled:opacity-50 transition-colors"
                ></textarea>
            </div>
            <div className="bg-app-bg px-6 py-4 flex justify-between items-center border-t border-app-gray transition-colors duration-300">
                <span className="text-sm font-medium text-app-charcoal opacity-60">
                    {text.length} characters
                </span>
                <button
                    onClick={handleSubmit}
                    disabled={loading || text.length === 0}
                    className="bg-app-charcoal hover:opacity-80 disabled:bg-app-gray disabled:text-app-charcoal text-white px-8 py-3 rounded-lg font-semibold shadow-sm flex items-center gap-2 transition-all active:scale-95 border border-transparent dark:border-app-charcoal"
                >
                    {loading && !isPolling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 text-app-burgundy" />}
                    {loading ? (isPolling ? "Yapay Zeka İnceliyor..." : "Gönderiliyor...") : "Analyze Content"}
                </button>
            </div>
        </div>
    );
};

export default AnalysisForm;
