import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ShieldCheck, ShieldX, Shield, ExternalLink,
    AlertCircle, ArrowRight, Calendar, ChevronRight, MessageSquare,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useIsDark } from '../hooks/useIsDark';

const SURFACE = 'var(--color-terminal-surface)';
const BORDER  = 'var(--color-terminal-border-raw)';
const TEXT    = 'var(--color-text-primary)';
const MUTED   = 'var(--color-text-muted)';

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getTheme(prediction) {
    const s = (prediction || '').toUpperCase();
    if (s === 'AUTHENTIC' || s === 'GÜVENİLİR' || s === 'REAL' || s === 'TRUE')
        return {
            label:    'GÜVENİLİR',
            Icon:     ShieldCheck,
            hex:      '#3fff8b',
            lightHex: '#2d7549',
            rgb:      '63,255,139',
            lightRgb: '45,117,73',
        };
    if (s === 'FAKE' || s === 'YANILTICI' || s === 'FALSE')
        return {
            label:    'SAHTE',
            Icon:     ShieldX,
            hex:      '#ff7351',
            lightHex: '#dc2626',
            rgb:      '255,115,81',
            lightRgb: '220,38,38',
        };
    return {
        label:    'BELİRSİZ',
        Icon:     Shield,
        hex:      '#f59e0b',
        lightHex: '#d97706',
        rgb:      '245,158,11',
        lightRgb: '217,119,6',
    };
}

const SharedAnalysis = () => {
    const { articleId } = useParams();
    const isDark        = useIsDark();
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        let cancelled = false;
        axiosInstance.get(`/analysis/share/${articleId}`)
            .then(r => { if (!cancelled) setData(r.data); })
            .catch(e => { if (!cancelled) setError(e.response?.data?.detail || 'Analiz bulunamadı.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [articleId]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                     style={{ borderColor: 'var(--color-brand-primary) transparent transparent transparent' }} />
                <span className="font-mono text-xs" style={{ color: MUTED }}>// Analiz yükleniyor</span>
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
            <div className="flex items-center gap-3 p-4" style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
                <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--color-es-error)' }} />
                <div>
                    <p className="font-mono text-sm font-bold" style={{ color: TEXT }}>Analiz bulunamadı</p>
                    <p className="font-mono text-xs mt-0.5" style={{ color: MUTED }}>{error}</p>
                </div>
            </div>
            <Link to="/" className="flex items-center gap-2 font-mono text-xs px-4 py-2 transition-opacity hover:opacity-70"
                  style={{ border: '1px solid var(--color-brand-primary)', color: 'var(--color-brand-primary)' }}>
                Ana Sayfaya Dön <ChevronRight className="w-3 h-3" />
            </Link>
        </div>
    );

    const theme         = getTheme(data.prediction);
    const { Icon }      = theme;
    const color         = isDark ? theme.hex      : theme.lightHex;
    const rgb           = isDark ? theme.rgb      : theme.lightRgb;
    const confidencePct = Math.round((data.confidence ?? 0) * 100);
    const clickbaitPct  = data.clickbait_score != null ? Math.round(data.clickbait_score * 100) : null;
    const sourceUrl     = data.source_url || null;

    return (
        <div className="min-h-screen flex flex-col items-center px-4 py-12">

            {/* Glow */}
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[500px] h-[250px] blur-3xl opacity-15"
                     style={{ background: `rgba(${rgb},0.3)`, borderRadius: '50%' }} />
            </div>

            <div className="w-full max-w-lg relative overflow-hidden mt-auto mb-auto"
                 style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `3px solid ${color}` }}>

                {/* Köşe aksanları */}
                {['top-0 left-0 w-5 h-0.5','top-0 left-0 h-5 w-0.5',
                  'bottom-0 right-0 w-5 h-0.5','bottom-0 right-0 h-5 w-0.5'].map((cls, i) => (
                    <div key={i} className={`absolute ${cls} pointer-events-none`} style={{ background: color }} />
                ))}

                {/* Header */}
                <div className="px-6 py-4 flex items-center gap-3 border-b" style={{ borderColor: BORDER }}>
                    <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                    <span className="font-mono text-[11px] font-black uppercase tracking-[0.18em]"
                          style={{ color }}>
                        // Analiz Sonucu
                    </span>
                    <span className="ml-auto font-mono text-[10px]" style={{ color: MUTED }}>
                        nehaber.dev
                    </span>
                </div>

                <div className="px-6 py-6 flex flex-col gap-5">

                    {/* Verdict + skor */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="font-mono text-[10px] uppercase tracking-widest"
                                  style={{ color: MUTED }}>// Karar</span>
                            <span className="font-manrope text-4xl font-extrabold tracking-tight"
                                  style={{ color }}>
                                {theme.label}
                            </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="font-mono text-[10px] uppercase tracking-widest"
                                  style={{ color: MUTED }}>// Güven</span>
                            <span className="font-manrope text-4xl font-extrabold"
                                  style={{ color }}>
                                %{confidencePct}
                            </span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full overflow-hidden" style={{ background: BORDER }}>
                        <div className="h-full transition-all duration-700"
                             style={{ width: `${confidencePct}%`, background: color }} />
                    </div>

                    {/* Başlık */}
                    {data.title && (
                        <div className="p-4" style={{ border: `1px solid ${BORDER}` }}>
                            <p className="font-mono text-[10px] uppercase tracking-widest mb-2"
                               style={{ color: MUTED }}>// Analiz Edilen Başlık</p>
                            <p className="font-mono text-sm leading-relaxed" style={{ color: TEXT }}>
                                {data.title}
                            </p>
                        </div>
                    )}

                    {/* AI Özeti */}
                    {data.ai_summary && (
                        <div className="p-4" style={{ border: `1px solid ${color}30`, background: `${color}0a` }}>
                            <div className="flex items-center gap-2 mb-3">
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                                <p className="font-mono text-[10px] uppercase tracking-widest"
                                   style={{ color }}>// AI Değerlendirmesi</p>
                            </div>
                            <p className="font-mono text-xs leading-relaxed italic" style={{ color: TEXT }}>
                                "{data.ai_summary}"
                            </p>
                        </div>
                    )}

                    {/* Metrikler */}
                    {(data.risk_score != null || clickbaitPct != null) && (
                        <div className={`grid gap-3 ${clickbaitPct != null && data.risk_score != null ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {data.risk_score != null && (
                                <div className="p-3 flex flex-col gap-1" style={{ border: `1px solid ${BORDER}` }}>
                                    <span className="font-mono text-[10px] uppercase tracking-widest"
                                          style={{ color: MUTED }}>// Risk Skoru</span>
                                    <span className="font-manrope text-2xl font-bold" style={{ color: TEXT }}>
                                        %{Math.round(data.risk_score * 100)}
                                    </span>
                                </div>
                            )}
                            {clickbaitPct != null && (
                                <div className="p-3 flex flex-col gap-1" style={{ border: `1px solid ${BORDER}` }}>
                                    <span className="font-mono text-[10px] uppercase tracking-widest"
                                          style={{ color: MUTED }}>// Tıklama Tuzağı</span>
                                    <span className="font-manrope text-2xl font-bold" style={{ color: TEXT }}>
                                        %{clickbaitPct}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Haber linki */}
                    {sourceUrl && (
                        <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-2 px-3 py-2 transition-opacity hover:opacity-75"
                           style={{ border: `1px solid ${color}44`, background: `${color}0d` }}>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                            <span className="font-mono text-[11px] font-semibold truncate" style={{ color }}>
                                ⇢ Haberi Görüntüle
                            </span>
                        </a>
                    )}

                    {/* Tarih */}
                    <div className="flex items-center gap-2" style={{ color: MUTED }}>
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="font-mono text-[10px]">Analiz tarihi: {formatDate(data.created_at)}</span>
                    </div>

                    {/* CTA */}
                    <Link to="/"
                          className="flex items-center justify-center gap-2 w-full py-3 font-mono text-xs font-bold transition-opacity hover:opacity-85"
                          style={{ background: color, color: isDark ? '#070f12' : '#ffffff' }}>
                        Kendi Haberini Analiz Et
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            <p className="mt-5 font-mono text-[10px] text-center max-w-xs" style={{ color: MUTED }}>
                // Bu sonuç yapay zeka tarafından üretilmiştir. Kesin yargı için birden fazla kaynağa başvurunuz.
            </p>
        </div>
    );
};

export default SharedAnalysis;
