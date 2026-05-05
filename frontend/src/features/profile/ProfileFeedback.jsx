import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import axiosInstance from '../../api/axios';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const Block = ({ title, sub, children, footer }) => (
    <div className="relative border" style={S}>
        <span
            className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase"
            style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-brand-primary)' }}
        >
            {title}
        </span>
        <div className="px-5 pt-6 pb-5">
            {sub && (
                <p className="font-mono text-xs mb-5 opacity-80" style={{ color: 'var(--color-text-muted)' }}>
                    {sub}
                </p>
            )}
            {children}
        </div>
        {footer && (
            <div className="border-t px-5 py-2 flex items-center justify-between" style={BD}>
                {footer}
            </div>
        )}
    </div>
);

const VERDICT_COLOR = {
    'Yanıltıcı': '#ff7351',
    'Güvenilir': '#3fff8b',
    'Belirsiz':  '#f59e0b',
};

const VerdictChip = ({ label, prefix }) => {
    const color = VERDICT_COLOR[label] ?? '#7d8896';
    return (
        <span className="font-mono text-[11px] font-bold shrink-0">
            {prefix && (
                <span style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>{prefix} </span>
            )}
            <span style={{ color }}>{label}</span>
        </span>
    );
};

const ProfileFeedback = () => {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(false);

    useEffect(() => {
        axiosInstance.get('/users/me/feedback')
            .then(r => setData(r.data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    /* Skeleton */
    if (loading) return (
        <div className="space-y-6">
            <div className="relative border" style={S}>
                <div className="px-5 pt-6 pb-5 grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-2">
                            <div className="h-10 w-16 animate-pulse" style={{ background: 'var(--color-terminal-border-raw)' }} />
                            <div className="h-3 w-20 animate-pulse" style={{ background: 'var(--color-terminal-border-raw)', opacity: 0.5 }} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="relative border" style={S}>
                <div className="px-5 pt-6 pb-5 space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 animate-pulse border" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-terminal-border-raw)' }} />
                    ))}
                </div>
            </div>
        </div>
    );

    if (error) return (
        <Block title="// feedback_log">
            <p className="font-mono text-sm" style={{ color: '#ff7351' }}>
                <span className="font-black">[ ERR ]</span> Veriler yüklenemedi — sayfayı yenile.
            </p>
        </Block>
    );

    if (!data || data.total_sent === 0) return (
        <Block
            title="// feedback_log"
            sub="model düzeltmelerini burada takip edebilirsin"
        >
            <div className="py-4">
                <p className="font-mono text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
                    {' '}henüz model düzeltmesi göndermedin
                </p>
                <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    Analiz geçmişindeki kartlara tıklayarak yanlış sonuçları düzelterek modele katkı sağlayabilirsin.
                </p>
            </div>
        </Block>
    );

    const acceptRate = data.total_sent > 0
        ? Math.round((data.total_accepted / data.total_sent) * 100)
        : 0;

    return (
        <div className="space-y-6">

            {/* ── Özet ── */}
            <Block
                title="// feedback_stats"
                footer={
                    <span className="font-mono text-[10px] tracking-widest opacity-40" style={{ color: 'var(--color-text-muted)' }}>
                        // MODEL_CONTRIBUTION_SCORE
                    </span>
                }
            >
                <div className="grid grid-cols-3 gap-6 mb-5">
                    {[
                        { label: '// GÖNDERİLEN',     value: data.total_sent,                color: 'var(--color-text-primary)' },
                        { label: '// KABUL EDİLDİ',   value: data.total_accepted,            color: 'var(--color-brand-primary)' },
                        { label: '// KABUL ORANI',     value: `%${acceptRate}`,               color: acceptRate >= 50 ? 'var(--color-brand-primary)' : '#f59e0b' },
                    ].map(({ label, value, color }) => (
                        <div key={label}>
                            <p className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                {label}
                            </p>
                            <p className="font-mono text-3xl font-black" style={{ color }}>
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Kabul oranı çubuğu */}
                <div>
                    <div className="h-[3px] w-full" style={{ background: 'var(--color-terminal-border-raw)' }}>
                        <div
                            className="h-full transition-all duration-700"
                            style={{
                                width: `${acceptRate}%`,
                                background: acceptRate >= 50 ? 'var(--color-brand-primary)' : '#f59e0b',
                            }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>0</span>
                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>100%</span>
                    </div>
                </div>
            </Block>

            {/* ── Düzeltme Logu ── */}
            <Block
                title="// correction_log"
                sub={`${data.items.length} düzeltme kaydı · sistem kararı → senin oyun`}
                footer={
                    <>
                        <span className="font-mono text-[10px] tracking-widest opacity-40" style={{ color: 'var(--color-text-muted)' }}>
                            // DIFF_VIEW
                        </span>
                        <span className="font-mono text-[10px] opacity-50" style={{ color: 'var(--color-brand-primary)' }}>
                            {data.total_accepted} kabul / {data.total_sent - data.total_accepted} beklemede
                        </span>
                    </>
                }
            >
                <div className="border" style={BD}>
                    {data.items.map((item, idx) => {
                        const borderColor = item.accepted ? '#3fff8b' : '#f59e0b';
                        return (
                            <div
                                key={`${item.article_title}-${item.created_at}`}
                                className={`flex flex-col gap-2 px-4 py-3.5 border-l-2 ${idx < data.items.length - 1 ? 'border-b' : ''}`}
                                style={{
                                    borderColor: 'var(--color-terminal-border-raw)',
                                    borderLeftColor: borderColor + '60',
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderLeftColor = borderColor}
                                onMouseLeave={e => e.currentTarget.style.borderLeftColor = borderColor + '60'}
                            >
                                {/* Başlık + tarih */}
                                <div className="flex items-start justify-between gap-3">
                                    <p
                                        className="font-mono text-sm leading-snug flex-1 min-w-0"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        {item.article_title ?? '—'}
                                    </p>
                                    <p
                                        className="font-mono text-[11px] shrink-0"
                                        style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
                                    >
                                        {new Date(item.created_at).toLocaleDateString('tr-TR')}
                                    </p>
                                </div>

                                {/* Karar diff + durum */}
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        {item.model_status && (
                                            <>
                                                <VerdictChip label={item.model_status} prefix="SİS:" />
                                                <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }} />
                                            </>
                                        )}
                                        <VerdictChip label={item.submitted_label} prefix="SEN:" />
                                    </div>

                                    <span
                                        className="font-mono text-[11px] font-bold px-2 py-0.5 border shrink-0"
                                        style={{
                                            color:       item.accepted ? 'var(--color-brand-primary)' : '#f59e0b',
                                            borderColor: item.accepted ? 'rgba(63,255,139,0.3)'       : 'rgba(245,158,11,0.3)',
                                        }}
                                    >
                                        {item.accepted ? 'KABUL EDİLDİ' : 'BEKLEMEDE'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Block>
        </div>
    );
};

export default ProfileFeedback;
