import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, ShieldCheck, Brain } from 'lucide-react';

const soft = (v, pct) => `color-mix(in srgb, var(${v}) ${pct}%, transparent)`;

const AI_VERDICT_CONFIG = {
    DESTEKLIYOR: { label: 'AI: Kararı Destekliyor', v: '--color-brand-primary' },
    'ÇÜRÜTÜYOR': { label: 'AI: Kararı Çürütüyor',  v: '--color-fake-fill'     },
    BELIRSIZ:    { label: 'AI: Belirsiz',           v: '--color-accent-amber'  },
};

const VERDICT_CONFIG = {
    DOGRU:     { label: 'Doğru',     Icon: CheckCircle,  v: '--color-brand-primary' },
    YANLIS:    { label: 'Yanlış',    Icon: XCircle,       v: '--color-fake-fill'     },
    YANILTICI: { label: 'Yanıltıcı', Icon: AlertTriangle, v: '--color-accent-amber'  },
};

function pct(n, total) { return total > 0 ? Math.round((n / total) * 100) : 0; }

function aiMatch(aiVerdict, communityVerdict) {
    if (!aiVerdict || !communityVerdict) return null;
    const map = { FAKE: 'YANLIS', AUTHENTIC: 'DOGRU' };
    const aiMapped = map[aiVerdict?.toUpperCase()];
    if (!aiMapped) return null;
    return aiMapped === communityVerdict;
}

const VerdictBox = ({ thread }) => {
    const cfg = VERDICT_CONFIG[thread.verdict];
    if (!cfg) return null;

    const { Icon } = cfg;
    const color = `var(${cfg.v})`;
    const total = thread.vote_suspicious + thread.vote_authentic + thread.vote_investigate;
    const match = aiMatch(thread.article?.ai_verdict, thread.verdict);

    const byLabel = thread.verdict_by === 'auto'
        ? `Otomatik · ${total} oy`
        : `${thread.author?.username ?? 'Yazar'} tarafından kapatıldı`;

    const verdictDate = thread.verdict_at
        ? new Date(thread.verdict_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    const aiCfg = AI_VERDICT_CONFIG[thread.ai_evidence_verdict];

    return (
        <div className="flex flex-col gap-3.5 px-5 py-4 rounded-2xl" style={{ background: soft(cfg.v, 8) }}>
            <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 shrink-0" style={{ color }} />
                <span className="text-[15px] font-extrabold" style={{ color }}>
                    {cfg.label}
                </span>
                <span className="text-[12px] ml-auto font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {byLabel}{verdictDate ? ` · ${verdictDate}` : ''}
                </span>
            </div>

            {thread.verdict_reason && (
                <p className="text-[14px] leading-relaxed rounded-xl px-3.5 py-2.5" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-surface)' }}>
                    {thread.verdict_reason}
                </p>
            )}

            {total > 0 && (
                <div className="flex items-center gap-3 text-[12px] font-semibold flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                    <span style={{ color: 'var(--color-fake-fill)'     }}>{pct(thread.vote_suspicious,  total)}% Şüpheli</span>
                    <span style={{ color: 'var(--color-brand-primary)' }}>{pct(thread.vote_authentic,   total)}% Doğru</span>
                    <span style={{ color: 'var(--color-accent-amber)'  }}>{pct(thread.vote_investigate, total)}% Araştır</span>
                    <span className="opacity-70">({total} oy)</span>
                </div>
            )}

            {thread.article && match !== null && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12px] font-medium flex-wrap"
                     style={{ background: soft(match ? '--color-brand-primary' : '--color-accent-amber', 10), color: 'var(--color-text-secondary)' }}>
                    <span>AI: <strong>{thread.article.ai_verdict === 'FAKE' ? 'Yanlış' : 'Doğru'}</strong></span>
                    <span>·</span>
                    <span>Topluluk: <strong>{cfg.label}</strong></span>
                    <span className="ml-auto font-bold" style={{ color: match ? 'var(--color-brand-primary)' : 'var(--color-accent-amber)' }}>
                        {match ? 'Uyuşuyor' : 'Uyuşmuyor'}
                    </span>
                </div>
            )}

            {thread.featured_evidence && (
                <div className="flex flex-col gap-1.5 pt-3.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-1.5 text-[11.5px] font-bold" style={{ color: 'var(--color-brand-primary)' }}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Öne Çıkan Kanıt · {thread.featured_evidence.username}
                        <span className="ml-auto font-semibold opacity-70" style={{ color: 'var(--color-text-muted)' }}>
                            {thread.featured_evidence.verified_count} doğrulama
                        </span>
                    </div>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {thread.featured_evidence.body.slice(0, 200)}{thread.featured_evidence.body.length > 200 ? '…' : ''}
                    </p>
                    {thread.featured_evidence.evidence_urls?.slice(0, 1).map(url => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                           className="text-[12px] underline truncate" style={{ color: 'var(--color-accent-blue)' }}>
                            {url}
                        </a>
                    ))}
                </div>
            )}

            {thread.ai_evidence_analysis && (
                <div className="flex flex-col gap-1.5 px-3.5 py-2.5 rounded-xl" style={{ background: aiCfg ? soft(aiCfg.v, 8) : 'var(--color-bg-surface)' }}>
                    <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: aiCfg ? `var(${aiCfg.v})` : 'var(--color-text-muted)' }}>
                        <Brain className="w-3.5 h-3.5" />
                        {aiCfg?.label ?? 'AI Analizi'}
                    </div>
                    <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{thread.ai_evidence_analysis}</p>
                </div>
            )}
        </div>
    );
};

export default VerdictBox;
