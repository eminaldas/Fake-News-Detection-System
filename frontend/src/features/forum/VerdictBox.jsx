import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const VERDICT_CONFIG = {
    DOGRU:     { label: 'DOĞRU',     Icon: CheckCircle,   color: 'var(--color-brand-primary)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.30)' },
    YANLIS:    { label: 'YANLIŞ',    Icon: XCircle,        color: 'var(--color-fake-fill)',      bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.30)'  },
    YANILTICI: { label: 'YANILTICI', Icon: AlertTriangle,  color: 'var(--color-accent-amber)',   bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.30)' },
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
    const total = thread.vote_suspicious + thread.vote_authentic + thread.vote_investigate;
    const match = aiMatch(thread.article?.ai_verdict, thread.verdict);

    const byLabel = thread.verdict_by === 'auto'
        ? `Otomatik · ${total} oy`
        : `${thread.author?.username ?? 'Yazar'} tarafından kapatıldı`;

    const verdictDate = thread.verdict_at
        ? new Date(thread.verdict_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    return (
        <div
            className="flex flex-col gap-3 px-4 py-4 border"
            style={{ background: cfg.bg, borderColor: cfg.border }}
        >
            <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 shrink-0" style={{ color: cfg.color }} />
                <span className="font-mono text-sm font-black tracking-widest uppercase" style={{ color: cfg.color }}>
                    {cfg.label}
                </span>
                <span className="font-mono text-[10px] ml-auto opacity-60" style={{ color: cfg.color }}>
                    {byLabel}{verdictDate ? ` · ${verdictDate}` : ''}
                </span>
            </div>

            {thread.verdict_reason && (
                <p className="font-mono text-sm leading-relaxed border-l-2 pl-3"
                   style={{ color: 'var(--color-text-secondary)', borderLeftColor: cfg.color + '60' }}>
                    {thread.verdict_reason}
                </p>
            )}

            {total > 0 && (
                <div className="flex items-center gap-3 font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    <span style={{ color: 'var(--color-fake-fill)'      }}>✗ {pct(thread.vote_suspicious,  total)}% Şüpheli</span>
                    <span style={{ color: 'var(--color-brand-primary)'  }}>✓ {pct(thread.vote_authentic,   total)}% Doğru</span>
                    <span style={{ color: 'var(--color-accent-amber)'   }}>? {pct(thread.vote_investigate, total)}% Araştır</span>
                    <span className="opacity-50">({total} oy)</span>
                </div>
            )}

            {thread.article && match !== null && (
                <div
                    className="flex items-center gap-2 px-3 py-2 border font-mono text-[10px]"
                    style={{
                        borderColor: match ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)',
                        background:  match ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
                        color: 'var(--color-text-muted)',
                    }}
                >
                    <span>AI: <strong>{thread.article.ai_verdict === 'FAKE' ? 'YANLIŞ' : 'DOĞRU'}</strong></span>
                    <span>·</span>
                    <span>Topluluk: <strong>{cfg.label}</strong></span>
                    <span className="ml-auto">{match ? '✅ Uyuşuyor' : '⚠️ Uyuşmuyor'}</span>
                </div>
            )}
        </div>
    );
};

export default VerdictBox;
