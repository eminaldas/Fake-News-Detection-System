import React, { useState } from 'react';
import { Search, Loader2, Link2, FileText } from 'lucide-react';

const AnalysisForm = ({ onAnalyze, onAnalyzeUrl, loading, isPolling }) => {
    const [mode, setMode] = useState('text'); // 'text' | 'url'
    const [text, setText] = useState('');
    const [url, setUrl] = useState('');

    const handleSubmit = () => {
        if (mode === 'text') {
            onAnalyze(text);
        } else {
            onAnalyzeUrl(url);
        }
    };

    const isDisabled = loading || (mode === 'text' ? text.length === 0 : url.length === 0);

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
            {/* Tab Switcher */}
            <div className="flex border-b border-brutal-border/30 dark:border-[#303036]">
                <button
                    onClick={() => setMode('text')}
                    disabled={loading}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors duration-200 disabled:opacity-50
                        ${mode === 'text'
                            ? 'text-tx-primary dark:text-[#f0f0f2] border-b-2 border-tx-primary dark:border-[#f0f0f2] -mb-px'
                            : 'text-tx-secondary dark:text-[#8e8e99] hover:text-tx-primary dark:hover:text-[#f0f0f2]'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    Metin
                </button>
                <button
                    onClick={() => setMode('url')}
                    disabled={loading}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors duration-200 disabled:opacity-50
                        ${mode === 'url'
                            ? 'text-tx-primary dark:text-[#f0f0f2] border-b-2 border-tx-primary dark:border-[#f0f0f2] -mb-px'
                            : 'text-tx-secondary dark:text-[#8e8e99] hover:text-tx-primary dark:hover:text-[#f0f0f2]'
                        }`}
                >
                    <Link2 className="w-4 h-4" />
                    Link
                </button>
            </div>

            {/* Input Alanı */}
            <div className="p-1 flex-grow flex flex-col">
                {mode === 'text' ? (
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={loading}
                        placeholder="Şüpheli haberi buraya yapıştırın..."
                        className="
                            w-full flex-grow min-h-[160px] p-6
                            text-brand dark:text-[#f0f0f2]
                            bg-transparent border-0 focus:ring-0
                            resize-none text-lg lg:text-xl font-medium outline-none
                            placeholder:text-tx-secondary dark:placeholder:text-[#8e8e99]
                            disabled:opacity-50 transition-colors
                        "
                    />
                ) : (
                    <div className="flex-grow flex flex-col justify-center px-6 py-8 gap-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-tx-secondary dark:text-[#8e8e99]">
                            Haber URL'si
                        </label>
                        <div className="flex items-center gap-3 rounded-xl border border-brutal-border dark:border-[#303036] bg-white/30 dark:bg-[#1a1d24] px-4 py-3 focus-within:border-tx-primary dark:focus-within:border-[#f0f0f2] transition-colors">
                            <Link2 className="w-5 h-5 text-tx-secondary dark:text-[#8e8e99] shrink-0" />
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isDisabled && handleSubmit()}
                                disabled={loading}
                                placeholder="https://ornek-haber.com/makale"
                                className="
                                    flex-grow bg-transparent border-0 focus:ring-0 outline-none
                                    text-brand dark:text-[#f0f0f2] font-medium text-base
                                    placeholder:text-tx-secondary dark:placeholder:text-[#8e8e99]
                                    disabled:opacity-50
                                "
                            />
                        </div>
                        <p className="text-xs text-tx-secondary dark:text-[#8e8e99] opacity-70">
                            Makale scrape edilip BERT ve stilometrik analiz uygulanacaktır.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-between items-center border-t border-brutal-border/30 dark:border-[#303036] transition-colors duration-300">
                <span className="text-xs font-semibold text-tx-secondary dark:text-[#8e8e99]">
                    {mode === 'text' ? `${text.length} karakter` : (() => { try { return url ? new URL(url.startsWith('http') ? url : 'https://' + url).hostname : '—'; } catch { return url || '—'; } })()}
                </span>
                <button
                    onClick={handleSubmit}
                    disabled={isDisabled}
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
                    {loading ? (isPolling ? 'Analiz ediliyor...' : 'Gönderiliyor...') : 'Analiz'}
                </button>
            </div>
        </div>
    );
};

export default AnalysisForm;
