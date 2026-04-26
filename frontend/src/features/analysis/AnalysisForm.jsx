import React, { useState } from "react";
import { Search, Loader2, Link2, FileText, Image as ImageIcon } from "lucide-react";
import ImageDropZone from "./ImageDropZone";

const AnalysisForm = ({ onAnalyze, onAnalyzeUrl, onAnalyzeImage, loading, isPolling, analysisStage }) => {
  const [mode, setMode]       = useState("text"); // 'text' | 'url' | 'image'
  const [text, setText]       = useState("");
  const [url, setUrl]         = useState("");
  const [imageFile, setImageFile] = useState(null);

  const handleSubmit = () => {
    if (mode === "text")  onAnalyze(text);
    if (mode === "url")   onAnalyzeUrl(url);
    if (mode === "image" && onAnalyzeImage) onAnalyzeImage(imageFile);
  };

  const isDisabled = loading || (
    mode === "text"  ? text.length === 0 :
    mode === "url"   ? url.length === 0  :
    imageFile === null
  );

  const TABS = [
    { key: "text",  label: "Metin",  icon: <FileText  className="w-4 h-4" /> },
    { key: "url",   label: "Link",   icon: <Link2     className="w-4 h-4" /> },
    { key: "image", label: "Görsel", icon: <ImageIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-surface shadow-sm rounded-2xl flex flex-col min-h-[280px] md:min-h-[300px] overflow-hidden border border-brutal-border dark:border-surface-solid transition-shadow duration-300">

      {/* Tab Switcher */}
      <div className="flex border-b border-brutal-border/30 dark:border-surface-solid">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            disabled={loading}
            className={`flex items-center gap-2 px-4 md:px-5 py-3.5 md:py-3 text-sm font-bold transition-colors duration-200 disabled:opacity-50
              ${mode === key
                ? "text-tx-primary border-b-2 border-tx-primary -mb-px"
                : "text-tx-secondary hover:text-tx-primary"}`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Input Alanı */}
      <div key={mode} className="p-1 flex-grow flex flex-col animate-fade-in">
        {mode === "text" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            placeholder="Şüpheli haberi buraya yapıştırın..."
            style={{ color: 'var(--color-text-primary)' }}
            className="w-full grow min-h-35 md:min-h-40 p-4 md:p-6 bg-transparent border-0 focus:ring-0 resize-none text-base md:text-lg lg:text-xl font-medium outline-none placeholder:text-tx-secondary disabled:opacity-50 transition-colors"
          />
        )}

        {mode === "url" && (
          <div className="flex-grow flex flex-col justify-center px-4 md:px-6 py-6 md:py-8 gap-3">
            <label className="text-xs font-bold uppercase tracking-widest text-tx-primary">Haber URL'si</label>
            <div className="flex items-center gap-3 rounded-xl border border-brutal-border dark:border-surface-solid bg-surface-solid px-3 md:px-4 py-3 focus-within:border-tx-primary transition-colors">
              <Link2 className="w-5 h-5 text-tx-secondary shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isDisabled && handleSubmit()}
                disabled={loading}
                placeholder="https://ornek-haber.com/makale"
                style={{ color: 'var(--color-text-primary)' }}
                className="grow bg-transparent border-0 focus:ring-0 outline-none font-medium text-sm md:text-base placeholder:text-tx-secondary disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-tx-secondary opacity-70">Makale scrape edilip BERT ve stilometrik analiz uygulanacaktır.</p>
          </div>
        )}

        {mode === "image" && (
          <ImageDropZone onFileSelect={setImageFile} disabled={loading} />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 md:px-6 py-3 md:py-4 flex justify-between items-center border-t border-brutal-border/30 dark:border-surface-solid transition-colors duration-300">
        <span className="text-xs font-semibold text-tx-secondary">
          {mode === "text" ? `${text.length} karakter` : "—"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="flex items-center gap-2 bg-tx-primary dark:bg-surface-solid hover:bg-brand-dark dark:hover:bg-neutral-border text-white dark:text-tx-primary border border-brutal-border dark:border-surface-solid px-6 md:px-8 py-2.5 md:py-2 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading && !isPolling ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {loading
            ? isPolling
              ? analysisStage === 'gemini' ? 'AI değerlendiriyor...'
                : analysisStage === 'nlp'  ? 'Metin analiz ediliyor...'
                : 'Analiz ediliyor...'
            : 'Gönderiliyor...'
            : 'Analiz'}
        </button>
      </div>
    </div>
  );
};

export default AnalysisForm;
