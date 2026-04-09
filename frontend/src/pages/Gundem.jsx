import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import NewsService from '../services/news.service';
import AnalysisService from '../services/analysis.service';
import { useTheme } from '../contexts/ThemeContext';
import AnalysisResultCard from '../features/analysis/AnalysisResultCard';

const CATEGORIES = [
    { label: 'Tümü',      value: null,       hot: false },
    { label: 'Gündem',    value: 'gündem',    hot: true  },
    { label: 'Ekonomi',   value: 'ekonomi',   hot: false },
    { label: 'Spor',      value: 'spor',      hot: false },
    { label: 'Sağlık',    value: 'sağlık',    hot: false },
    { label: 'Teknoloji', value: 'teknoloji', hot: false },
    { label: 'Kültür',    value: 'kültür',    hot: false },
    { label: 'Yaşam',     value: 'yaşam',     hot: false },
];

/* ── NLP güven skoru dairesi ──────────────────────────────────── */
function ScoreCircle({ nlpScore, large = false }) {
    if (nlpScore == null) return null;
    const score = Math.round((1 - nlpScore) * 100);
    const color = nlpScore < 0.20 ? '#3fff8b'
                : nlpScore < 0.40 ? '#86efac'
                : nlpScore < 0.60 ? '#facc15'
                : nlpScore < 0.80 ? '#f97316'
                :                   '#ef4444';
    return (
        <div
            className={`${large ? 'w-14 h-14 border-4' : 'w-11 h-11 border-2'} rounded-full flex items-center justify-center bg-black/60 backdrop-blur-md shrink-0`}
            style={{ borderColor: color }}
        >
            <span
                className={`font-manrope font-extrabold ${large ? 'text-xl' : 'text-sm'} leading-none`}
                style={{ color }}
            >
                {score}
            </span>
        </div>
    );
}

/* ── Kaynak adı + onay ikonu (kart overlay üstünde — renk sabit) ── */
function SourceBadge({ name, trusted }) {
    if (!name) return null;
    return (
        <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
            style={{
                background: trusted ? 'rgba(63,255,139,0.18)' : 'rgba(255,255,255,0.15)',
                border: `1px solid ${trusted ? 'rgba(63,255,139,0.40)' : 'rgba(255,255,255,0.28)'}`,
            }}
        >
            <span className="text-white text-[11px] font-semibold max-w-[140px] truncate">{name}</span>
            {trusted && (
                /* Checkmark her zaman parlak yeşil — dark overlay üstünde */
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none"
                     stroke="#3fff8b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            )}
        </div>
    );
}

/* ── Birincil içerik etiketi (kart overlay üstünde — renk sabit) ── */
function ContentTag({ types, category }) {
    const tag = types?.includes('high_risk') ? { text: 'Yüksek Risk', color: '#f87171' }
              : types?.includes('clickbait') ? { text: 'Clickbait',   color: '#fb923c' }
              : types?.includes('claim')     ? { text: 'İddia',       color: '#c084fc' }
              : category                     ? { text: category,      color: 'rgba(255,255,255,0.90)' }
              : null;
    if (!tag) return null;
    return (
        <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: tag.color }}>
            {tag.text}
        </span>
    );
}

/* ── Çoklu kaynak sayacı ──────────────────────────────────────── */
function MultiSourceBadge({ count }) {
    if (!count || count <= 1) return null;
    return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.30)',
                  color: 'rgba(255,255,255,0.85)',
              }}>
            {count} kaynak
        </span>
    );
}


const MONTHS_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
function formatRelativeTime(pub_date) {
    if (!pub_date) return '';
    const diff = Math.floor((Date.now() - new Date(pub_date)) / 1000);
    if (diff < 60)     return 'Az önce';
    if (diff < 3600)   return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)} saat önce`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
    const d = new Date(pub_date);
    return `${d.getDate()} ${MONTHS_TR[d.getMonth()]}`;
}

/* ── Büyük öne çıkan kart (grid col-span-2) ──────────────────── */
function FeaturedCard({ article }) {
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;
    const trusted = (article.trust_score ?? 0) >= 0.9;

    const [phase,      setPhase]  = useState('idle');
    const [result,     setResult] = useState(null);
    const [expandOpen, setExpand] = useState(false);
    const intervalRef             = useRef(null);
    const lsKey                   = article.source_url ? `g_analysis_${article.source_url}` : null;

    /* localStorage restore on mount */
    useEffect(() => {
        if (!lsKey) return;
        try {
            const raw = localStorage.getItem(lsKey);
            if (!raw) return;
            const { result: r, ts } = JSON.parse(raw);
            if (Date.now() - ts < 86400000) { setResult(r); setPhase('done'); }
            else localStorage.removeItem(lsKey);
        } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lsKey]);

    /* localStorage save on done */
    useEffect(() => {
        if (phase === 'done' && result && lsKey) {
            try { localStorage.setItem(lsKey, JSON.stringify({ result, ts: Date.now() })); } catch {}
        }
    }, [phase, result, lsKey]);

    useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

    const handleAnalyze = async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (phase !== 'idle' || !article.source_url) return;
        setPhase('loading');
        try {
            const data = await AnalysisService.analyzeUrl(article.source_url);
            if (!data.task_id) { setPhase('error'); return; }
            const startTime = Date.now();
            const MAX_MS    = 90_000;
            intervalRef.current = setInterval(async () => {
                try {
                    const s         = await AnalysisService.checkStatus(data.task_id);
                    const elapsed   = Date.now() - startTime;
                    const isDone    = s.status === 'SUCCESS' && s.result != null && s.result.ai_comment != null;
                    const isTimeout = elapsed > MAX_MS;
                    const isFailed  = s.status === 'FAILED' || s.status === 'FAILURE';
                    if (isDone) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                        setResult(s.result);
                        setPhase('done');
                    } else if (isFailed || isTimeout) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                        if (isTimeout && s.status === 'SUCCESS' && s.result) {
                            setResult(s.result);
                            setPhase('done');
                        } else {
                            setPhase('error');
                        }
                    }
                } catch {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                    setPhase('error');
                }
            }, 2000);
        } catch { intervalRef.current = null; setPhase('error'); }
    };

    const inner = (
        <article
            className="group relative h-[480px] rounded-xl overflow-hidden cursor-pointer border transition-all duration-500"
            style={{ borderColor: 'var(--color-border)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-brand-primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
        >
            {hasImg ? (
                <img src={article.image_url} alt={article.title}
                     className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                     onError={() => setImgErr(true)} />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-slate-200 dark:from-emerald-950 dark:via-zinc-900 dark:to-zinc-800 flex items-center justify-center p-10">
                    <p className="text-zinc-400 dark:text-white/12 text-3xl font-bold font-manrope text-center line-clamp-4">{article.title}</p>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            {/* Skor dairesi */}
            <div className="absolute top-5 right-5">
                <ScoreCircle nlpScore={article.nlp_score} large />
            </div>

            {/* Alt içerik */}
            <div className="absolute bottom-0 left-0 right-0 p-7 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                        <ContentTag types={article.content_type} category={article.category} />
                        <SourceBadge name={article.source_name} trusted={trusted} />
                        <MultiSourceBadge count={article.source_count} />
                    </div>
                    <h2 className={`font-manrope font-extrabold tracking-tight leading-tight text-white transition-all duration-300 ${
                        phase === 'done' ? 'text-sm line-clamp-2 mb-1' : 'text-3xl md:text-4xl line-clamp-3'
                    }`}>
                        {article.title}
                    </h2>
                    {phase === 'done' && result && (
                        <AiSnippet result={result} onExpand={() => setExpand(true)} />
                    )}
                    <p className="text-white/35 text-[11px] mt-2">{formatRelativeTime(article.pub_date)}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2"
                     onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                    {phase === 'loading' && (
                        <span className="flex items-center gap-1.5 text-[10px] text-white/50">
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Analiz ediliyor...
                        </span>
                    )}
                    {phase === 'error'  && <span className="text-[10px] text-red-400/70">Analiz başarısız</span>}
                    {phase === 'idle'   && <NormalAnalyzeBtn onClick={handleAnalyze} disabled={!article.source_url} />}
                    {phase === 'done' && result && <ResultBadge result={result} />}
                </div>
            </div>
        </article>
    );

    return (
        <>
            {article.source_url ? (
                <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
            ) : inner}
            {expandOpen && result && (
                <AnalysisModal result={result} onClose={() => setExpand(false)} />
            )}
        </>
    );
}

/* ── Normal kart — yardımcı buton bileşenleri ─────────────────── */
function NormalAnalyzeBtn({ onClick, disabled }) {
    const { isDarkMode } = useTheme();
    const [hov, setHov]  = useState(false);
    const iconColor   = hov ? (isDarkMode ? '#070f12' : '#ffffff') : 'rgba(255,255,255,0.80)';
    const expandColor = isDarkMode ? '#070f12' : '#ffffff';
    const idleBg      = isDarkMode ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.40)';
    const idleBorder  = isDarkMode ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.25)';
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => { if (!disabled) setHov(true); }}
            onMouseLeave={() => { if (!disabled) setHov(false); }}
            disabled={disabled}
            title={disabled ? 'Kaynak URL bulunamadı' : 'Derin Analiz'}
            className="flex items-center rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
                padding: '7px 10px',
                gap: hov ? '6px' : '0px',
                background: hov && !disabled ? 'var(--color-brand-primary)' : idleBg,
                border: `1px solid ${hov && !disabled ? 'var(--color-brand-primary)' : idleBorder}`,
            }}
        >
            <svg className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor, transition: 'color 0.15s ease' }}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347A3.984 3.984 0 0115.9 17H8.1a3.984 3.984 0 01-2.828-2.834z"/>
            </svg>
            <span style={{
                maxWidth: hov ? '90px' : '0px', opacity: hov ? 1 : 0,
                overflow: 'hidden', whiteSpace: 'nowrap',
                transition: 'max-width 0.2s ease, opacity 0.15s ease',
                fontSize: '11px', fontWeight: '700', color: expandColor,
            }}>
                Derin Analiz
            </span>
        </button>
    );
}

function ResultBadge({ result }) {
    const status = result?.ai_comment?.gemini_verdict?.toUpperCase() || result?.prediction?.toUpperCase();
    const pct    = result?.confidence  ? Math.round(result.confidence * 100)
                 : result?.truth_score ? Math.round(parseFloat(result.truth_score))
                 : null;
    const isFake = status === 'FAKE' || status === 'FALSE';
    const color  = isFake ? '#ef4444' : status === 'AUTHENTIC' || status === 'TRUE' ? '#3fff8b' : '#facc15';
    const label  = isFake ? 'Sahte' : status === 'AUTHENTIC' || status === 'TRUE' ? 'Güvenilir' : 'Belirsiz';
    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
             style={{ background: `${color}1a`, border: `1px solid ${color}40` }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[10px] font-bold" style={{ color }}>
                {label}{pct != null ? ` %${pct}` : ''}
            </span>
        </div>
    );
}

function AiSnippet({ result, onExpand }) {
    const status  = result?.ai_comment?.gemini_verdict?.toUpperCase() || result?.prediction?.toUpperCase();
    const isFake  = status === 'FAKE' || status === 'FALSE';
    const color   = isFake ? '#ff7351' : status === 'AUTHENTIC' || status === 'TRUE' ? '#3fff8b' : '#facc15';
    const summary = result?.ai_comment?.summary || 'Detaylı analiz tamamlandı.';
    return (
        <div className="mb-2 px-3 py-2.5 rounded-lg flex flex-col gap-1.5"
             style={{
                 background: 'rgba(0,0,0,0.55)',
                 border: `1px solid ${color}55`,
                 borderLeft: `3px solid ${color}`,
                 animation: 'gSnippetIn 0.28s cubic-bezier(0.22,1,0.36,1)',
             }}>
            <div className="flex items-center gap-1.5" style={{ color }}>
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
                </svg>
                <span className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color }}>
                    Gemini AI Analizi
                </span>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed line-clamp-2">{summary}</p>
            <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onExpand(); }}
                className="self-end text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 hover:opacity-100 opacity-80 transition-opacity"
                style={{ color }}
            >
                Tam analizi gör
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/>
                </svg>
            </button>
        </div>
    );
}

function AnalysisModal({ result, onClose }) {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handler);
        };
    }, [onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', animation: 'gModalFade 0.18s ease-out' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl relative"
                style={{ animation: 'gModalSlide 0.22s cubic-bezier(0.22,1,0.36,1)' }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-white/40 hover:text-white transition-colors"
                    style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '6px', padding: '4px' }}
                >
                    <X size={16} />
                </button>
                <AnalysisResultCard result={result} />
            </div>
        </div>,
        document.body
    );
}

/* ── Normal kart ──────────────────────────────────────────────── */
function NormalCard({ article, tall = false }) {
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;
    const trusted = (article.trust_score ?? 0) >= 0.9;
    const height = tall ? 'h-[480px]' : 'h-[400px]';

    const [phase,      setPhase]  = useState('idle');   // idle | loading | done | error
    const [result,     setResult] = useState(null);
    const [expandOpen, setExpand] = useState(false);
    const intervalRef             = useRef(null);
    const lsKey                   = article.source_url ? `g_analysis_${article.source_url}` : null;

    /* localStorage restore on mount */
    useEffect(() => {
        if (!lsKey) return;
        try {
            const raw = localStorage.getItem(lsKey);
            if (!raw) return;
            const { result: r, ts } = JSON.parse(raw);
            if (Date.now() - ts < 86400000) { setResult(r); setPhase('done'); }
            else localStorage.removeItem(lsKey);
        } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lsKey]);

    /* localStorage save on done */
    useEffect(() => {
        if (phase === 'done' && result && lsKey) {
            try { localStorage.setItem(lsKey, JSON.stringify({ result, ts: Date.now() })); } catch {}
        }
    }, [phase, result, lsKey]);

    useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

    const handleAnalyze = async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (phase !== 'idle' || !article.source_url) return;
        setPhase('loading');
        try {
            const data = await AnalysisService.analyzeUrl(article.source_url);
            if (!data.task_id) { setPhase('error'); return; }
            const startTime = Date.now();
            const MAX_MS    = 90_000;
            intervalRef.current = setInterval(async () => {
                try {
                    const s         = await AnalysisService.checkStatus(data.task_id);
                    const elapsed   = Date.now() - startTime;
                    const isDone    = s.status === 'SUCCESS' && s.result != null && s.result.ai_comment != null;
                    const isTimeout = elapsed > MAX_MS;
                    const isFailed  = s.status === 'FAILED' || s.status === 'FAILURE';
                    if (isDone) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                        setResult(s.result);
                        setPhase('done');
                    } else if (isFailed || isTimeout) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                        if (isTimeout && s.status === 'SUCCESS' && s.result) {
                            setResult(s.result);
                            setPhase('done');
                        } else {
                            setPhase('error');
                        }
                    }
                } catch { clearInterval(intervalRef.current); intervalRef.current = null; setPhase('error'); }
            }, 2000);
        } catch { intervalRef.current = null; setPhase('error'); }
    };

    const inner = (
        <article
            className={`group relative ${height} rounded-xl overflow-hidden cursor-pointer border transition-all duration-500`}
            style={{ borderColor: 'rgba(65,73,77,0.20)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(63,255,139,0.40)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
        >
            {hasImg ? (
                <img src={article.image_url} alt={article.title}
                     className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                     onError={() => setImgErr(true)} />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-800 flex items-center justify-center p-8">
                    <p className="text-white/12 text-xl font-bold font-manrope text-center line-clamp-4">{article.title}</p>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />

            {/* Skor dairesi */}
            <div className="absolute top-4 right-4">
                <ScoreCircle nlpScore={article.nlp_score} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <ContentTag types={article.content_type} category={article.category} />
                    <SourceBadge name={article.source_name} trusted={trusted} />
                    <MultiSourceBadge count={article.source_count} />
                </div>
                <h3 className={`font-manrope font-extrabold tracking-tight leading-snug text-white transition-all duration-300 ${
                    phase === 'done' ? 'text-xs line-clamp-2 mb-1' : 'text-xl line-clamp-3'
                }`}>
                    {article.title}
                </h3>
                {phase === 'done' && result && (
                    <AiSnippet result={result} onExpand={() => setExpand(true)} />
                )}
                <div className="flex items-center justify-between pt-1">
                    <span className="text-white/35 text-[11px]">{formatRelativeTime(article.pub_date)}</span>
                    <div onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                        {phase === 'loading' && (
                            <span className="flex items-center gap-1.5 text-[10px] text-white/50">
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                Analiz ediliyor...
                            </span>
                        )}
                        {phase === 'error' && (
                            <span className="text-[10px] text-red-400/70">Analiz başarısız</span>
                        )}
                        {phase === 'idle' && (
                            <NormalAnalyzeBtn onClick={handleAnalyze} disabled={!article.source_url} />
                        )}
                        {phase === 'done' && result && (
                            <ResultBadge result={result} />
                        )}
                    </div>
                </div>
            </div>
        </article>
    );

    return (
        <>
            {article.source_url ? (
                <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
            ) : inner}
            {expandOpen && result && (
                <AnalysisModal result={result} onClose={() => setExpand(false)} />
            )}
        </>
    );
}

/* ── Spinner ──────────────────────────────────────────────────── */
function Spinner() {
    return (
        <div className="flex items-center justify-center py-24 gap-3 text-muted">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Yükleniyor...</span>
        </div>
    );
}

/* ── Sayfalama algoritması ────────────────────────────────────── */
function pageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total]);
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) pages.add(i);
    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
        result.push(sorted[i]);
    }
    return result;
}

const SIZE = 20;
const POLL_INTERVAL = 3 * 60 * 1000;

export default function Gundem() {
    const { isDarkMode } = useTheme();
    const { subscribe } = useWebSocket();

    const [articles, setArticles] = useState([]);
    const [total, setTotal]       = useState(0);
    const [page, setPage]         = useState(1);
    const [category, setCategory] = useState(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(null);
    const [search, setSearch]     = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo]     = useState('');
    const [newCount, setNewCount] = useState(0);
    const totalRef = useRef(0);

    const fetchNews = useCallback(async (cat, pg, silent = false, dfrom = dateFrom, dto = dateTo) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await NewsService.getNews({
                category: cat, page: pg, size: SIZE,
                date_from: dfrom || undefined,
                date_to:   dto   || undefined,
            });
            if (silent) {
                const diff = data.total - totalRef.current;
                if (diff > 0) {
                    setArticles(data.items); setTotal(data.total);
                    totalRef.current = data.total;
                    setNewCount(diff);
                    setTimeout(() => setNewCount(0), 4000);
                }
            } else {
                setArticles(data.items); setTotal(data.total);
                totalRef.current = data.total;
                setNewCount(0);
            }
        } catch {
            if (!silent) setError('Haberler yüklenemedi.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [dateFrom, dateTo]);

    useEffect(() => { fetchNews(category, page); }, [category, page, fetchNews]);

    useEffect(() => {
        if (page !== 1) return;
        const id = setInterval(() => fetchNews(category, 1, true), POLL_INTERVAL);
        return () => clearInterval(id);
    }, [category, page, fetchNews]);

    useEffect(() => {
        const unsub = subscribe('recommendations_updated', () => {
            if (page === 1) fetchNews(category, 1, true);
        });
        return unsub;
    }, [subscribe, category, page, fetchNews]);

    const applyNewArticles = () => { fetchNews(category, 1); setPage(1); };
    const handleCategory   = (val) => { setCategory(val); setPage(1); setSearch(''); };
    const clearDateFilter  = () => {
        setDateFrom(''); setDateTo(''); setPage(1);
        fetchNews(category, 1, false, '', '');
    };

    const sorted = useMemo(() => {
        let filtered = articles;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            filtered = articles.filter(a => a.title?.toLowerCase().includes(q));
        }
        const bySrc = [...filtered].sort((a, b) => (b.source_count || 1) - (a.source_count || 1));
        const top2 = bySrc.slice(0, 2);
        const rest = filtered.filter(a => !top2.includes(a));
        return [...top2, ...rest];
    }, [articles, search]);

    const totalPages = Math.ceil(total / SIZE);

    function renderCard(article, index) {
        if (index === 0) return (
            <div key={article.id} className="lg:col-span-2">
                <FeaturedCard article={article} />
            </div>
        );
        return <NormalCard key={article.id} article={article} tall={index === 1} />;
    }

    return (
        <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        <style>{`
            @keyframes gModalFade  { from { opacity:0 } to { opacity:1 } }
            @keyframes gModalSlide { from { opacity:0; transform:translateY(22px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
            @keyframes gSnippetIn  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        `}</style>

            {/* ── Yeni haber banner ── */}
            {newCount > 0 && (
                <button
                    onClick={applyNewArticles}
                    className="w-full mb-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold cursor-pointer border transition-colors"
                    style={{
                        background:  'color-mix(in srgb, var(--color-brand-primary) 10%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--color-brand-primary) 40%, transparent)',
                        color:       'var(--color-brand-primary)',
                    }}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {newCount} yeni haber — yüklemek için tıkla
                </button>
            )}

            {/* ── Başlık ── */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-px" style={{ background: 'var(--color-brand-primary)' }} />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold"
                          style={{ color: 'var(--color-brand-primary)' }}>
                        Güncel Haberler
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-tx-primary font-manrope tracking-tight leading-none">
                    Gündem<span style={{ color: 'var(--color-brand-primary)' }}>.</span>
                </h1>
            </div>

            {/* ── Kategoriler + arama ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-8">

                {/* Tab strip */}
                <div className="flex-1" style={{ borderBottom: '3px solid var(--color-brand-primary)' }}>
                    <div className="flex flex-wrap">
                        {CATEGORIES.map((c) => {
                            const isActive = category === c.value;
                            return (
                                <button
                                    key={c.label}
                                    onClick={() => handleCategory(c.value)}
                                    className="relative px-4 py-2.5 text-sm font-bold cursor-pointer transition-all duration-200 whitespace-nowrap"
                                    style={{
                                        background:   isActive ? 'var(--color-brand-primary)' : 'transparent',
                                        color:        isActive
                                                          ? (isDarkMode ? '#070f12' : '#ffffff')
                                                          : 'var(--color-text-secondary)',
                                        borderRadius: '6px 6px 0 0',
                                        marginBottom: '-3px',
                                    }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                                >
                                    {c.label}
                                    {c.hot && !isActive && (
                                        <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Arama */}
                <div className="relative shrink-0 pb-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Haberlerde ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-4 py-2.5 rounded-lg text-xs font-medium
                                   bg-surface border border-brutal-border
                                   text-tx-primary placeholder:text-muted
                                   focus:outline-none transition-all w-48"
                        style={{ borderRadius: '6px 6px 0 0' }}
                        onFocus={e  => { e.target.style.borderColor = 'var(--color-brand-primary)'; }}
                        onBlur={e   => { e.target.style.borderColor = 'var(--color-border)'; }}
                    />
                </div>
            </div>

            {/* ── Tarih filtresi aktifse temizle butonu ── */}
            {(dateFrom || dateTo) && (
                <div className="flex items-center gap-3 mb-4 text-xs text-muted">
                    <span>Tarih filtresi: {dateFrom || '…'} → {dateTo || '…'}</span>
                    <button onClick={clearDateFilter} className="text-brand hover:underline">Temizle</button>
                </div>
            )}

            {/* ── İçerik ── */}
            {loading && <Spinner />}
            {error && <p className="text-red-400/70 text-sm text-center py-20">{error}</p>}
            {!loading && !error && sorted.length === 0 && (
                <p className="text-muted text-sm text-center py-20">
                    {search ? 'Arama sonucu bulunamadı.' : 'Henüz haber yok.'}
                </p>
            )}

            {!loading && sorted.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {sorted.map((a, i) => renderCard(a, i))}
                </div>
            )}

            {/* ── Sayfalama ── */}
            {totalPages > 1 && !search && (
                <div className="mt-12 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <button disabled={page === 1} onClick={() => setPage(1)} title="İlk sayfa"
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-brutal-border text-tx-secondary text-xs disabled:opacity-30 hover:border-brand/40 hover:text-tx-primary transition-all cursor-pointer disabled:cursor-default">
                            «
                        </button>
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-brutal-border text-tx-secondary text-xs disabled:opacity-30 hover:border-brand/40 hover:text-tx-primary transition-all cursor-pointer disabled:cursor-default">
                            ‹
                        </button>
                        {pageNumbers(page, totalPages).map((p, i) =>
                            p === '...' ? (
                                <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-muted text-xs">…</span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        page === p
                                            ? 'shadow-sm'
                                            : 'bg-surface border border-brutal-border text-tx-secondary hover:border-brand/40 hover:text-tx-primary'
                                    }`}
                                    style={page === p ? { background: 'var(--color-brand-primary)', color: isDarkMode ? '#070f12' : '#ffffff' } : {}}
                                >
                                    {p}
                                </button>
                            )
                        )}
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-brutal-border text-tx-secondary text-xs disabled:opacity-30 hover:border-brand/40 hover:text-tx-primary transition-all cursor-pointer disabled:cursor-default">
                            ›
                        </button>
                        <button disabled={page === totalPages} onClick={() => setPage(totalPages)} title="Son sayfa"
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-brutal-border text-tx-secondary text-xs disabled:opacity-30 hover:border-brand/40 hover:text-tx-primary transition-all cursor-pointer disabled:cursor-default">
                            »
                        </button>
                    </div>
                    <p className="text-muted text-xs tabular-nums">Sayfa {page} / {totalPages}</p>
                </div>
            )}
        </div>
    );
}
