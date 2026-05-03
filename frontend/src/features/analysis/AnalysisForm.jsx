import React, { useState } from "react";
import { Search, Loader2, Link2, FileText, Image as ImageIcon } from "lucide-react";
import ImageDropZone from "./ImageDropZone";

const AnalysisForm = ({ onAnalyze, onAnalyzeUrl, onAnalyzeImage, loading, isPolling, analysisStage }) => {
  const [mode, setMode]         = useState("text");
  const [text, setText]         = useState("");
  const [url, setUrl]           = useState("");
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

  const stageLabel =
    analysisStage === 'gemini' ? 'AI değerlendiriyor...' :
    analysisStage === 'nlp'    ? 'Metin analiz ediliyor...' :
    'Analiz ediliyor...';

  const TABS = [
    { key: "text",  label: "METİN",  icon: <FileText  className="w-3.5 h-3.5" /> },
    { key: "url",   label: "LİNK",   icon: <Link2     className="w-3.5 h-3.5" /> },
    { key: "image", label: "GÖRSEL", icon: <ImageIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="relative bg-surface dark:bg-[#0c1518] flex flex-col min-h-[280px] md:min-h-[300px] overflow-hidden
                    border border-brutal-border dark:border-[#41494d]/60 transition-shadow duration-300">

      {/* 4 köşe aksan braketi */}
      <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand dark:bg-es-primary pointer-events-none z-10" />
      <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand dark:bg-es-primary pointer-events-none z-10" />
      <div className="absolute top-0 right-0 w-4 h-[2px] bg-brand dark:bg-es-primary pointer-events-none z-10" />
      <div className="absolute top-0 right-0 h-4 w-[2px] bg-brand dark:bg-es-primary pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-4 h-[2px] bg-brand dark:bg-es-primary pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 h-4 w-[2px] bg-brand dark:bg-es-primary pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand dark:bg-es-primary pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand dark:bg-es-primary pointer-events-none z-10" />

      {/* Tab Switcher */}
      <div className="flex border-b border-brutal-border/40 dark:border-[#41494d]/40">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            disabled={loading}
            className={`flex items-center gap-2 px-4 md:px-5 py-3 font-mono text-[11px] tracking-widest transition-colors duration-200 disabled:opacity-50
              ${mode === key
                ? "text-brand dark:text-es-primary border-b-2 border-brand dark:border-es-primary -mb-px"
                : "text-tx-secondary hover:text-tx-primary"}`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Input Alanı */}
      <div key={mode} className="px-4 md:px-5 pt-3 pb-2 flex-grow flex flex-col gap-2 animate-fade-in">

        {mode === "text" && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-tx-secondary/80 tracking-widest">// HEDEF_VERİ_GİRİŞİ</span>
              <span className="font-mono text-[10px] text-tx-secondary/70">[{text.length}/5000 KAR]</span>
            </div>
            <div className={`flex-grow relative border transition-all duration-200
                            ${text.length > 0
                              ? 'border-brand/40 dark:border-es-primary/40 shadow-[0_0_14px_rgba(63,255,139,0.07)_inset]'
                              : 'border-brutal-border/50 dark:border-[#41494d]/40 focus-within:border-brand/50 dark:focus-within:border-es-primary/50 focus-within:shadow-[0_0_14px_rgba(63,255,139,0.08)_inset]'
                            }`}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
                placeholder="> Şüpheli haberi buraya yapıştırın..."
                style={{ color: 'var(--color-text-primary)' }}
                className="w-full h-full min-h-[150px] md:min-h-[170px] p-3 md:p-4 bg-transparent border-0 focus:ring-0 resize-none text-base md:text-lg font-medium outline-none placeholder:text-tx-secondary/50 placeholder:font-mono placeholder:text-sm disabled:opacity-50"
              />
            </div>
          </>
        )}

        {mode === "url" && (
          <div className="flex-grow flex flex-col justify-center gap-3">
            <span className="font-mono text-[10px] text-tx-secondary/80 tracking-widest">// URL_HEDEF_GİRİŞİ</span>
            <div className="flex items-center gap-3 border border-brutal-border/50 dark:border-[#41494d]/40 bg-transparent px-3 md:px-4 py-3
                            focus-within:border-brand/50 dark:focus-within:border-es-primary/50
                            focus-within:shadow-[0_0_14px_rgba(63,255,139,0.08)_inset]
                            transition-all duration-200">
              <Link2 className="w-4 h-4 text-tx-secondary shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isDisabled && handleSubmit()}
                disabled={loading}
                placeholder="https://ornek-haber.com/makale"
                style={{ color: 'var(--color-text-primary)' }}
                className="grow bg-transparent border-0 focus:ring-0 outline-none font-medium text-sm md:text-base placeholder:text-tx-secondary/50 placeholder:font-mono placeholder:text-xs disabled:opacity-50"
              />
            </div>
            <p className="font-mono text-[10px] text-tx-secondary/70">
              // Makale scrape edilip BERT ve stilometrik analiz uygulanacaktır.
            </p>
          </div>
        )}

        {mode === "image" && (
          <ImageDropZone onFileSelect={setImageFile} disabled={loading} />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 md:px-5 py-3 flex justify-between items-center border-t border-brutal-border/40 dark:border-[#41494d]/40">
        <span className="font-mono text-[10px] text-tx-secondary/70">
          {mode === "text" ? `// ${text.length}_KAR` : "// HAZIR"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="flex items-center gap-2 bg-brand dark:bg-es-primary hover:brightness-110
                     text-white dark:text-black
                     px-6 md:px-7 py-2.5 font-mono font-bold text-[11px] tracking-widest uppercase
                     transition-all duration-200 active:scale-95
                     hover:shadow-[0_0_18px_rgba(63,255,139,0.35)]
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {loading && !isPolling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {loading
            ? isPolling ? stageLabel : 'Gönderiliyor...'
            : 'ANALİZ_BAŞLAT'}
        </button>
      </div>
    </div>
  );
};

export default AnalysisForm;
