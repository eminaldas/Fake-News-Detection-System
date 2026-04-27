import React from 'react';
import { CheckCircle2, XCircle, HelpCircle, ExternalLink } from 'lucide-react';

const VERDICT_CONFIG = {
    confirmed: { Icon: CheckCircle2, color: '#3fff8b', label: 'Doğrulandı',  bg: '#3fff8b1a' },
    refuted:   { Icon: XCircle,      color: '#ff7351', label: 'Çürütüldü',   bg: '#ff73511a' },
    uncertain: { Icon: HelpCircle,   color: '#f59e0b', label: 'Belirsiz',    bg: '#f59e0b1a' },
};

export default function ClaimsSection({ claims }) {
    if (!claims?.length) return null;
    return (
        <div className="space-y-3">
            <h3 className="text-tx-secondary font-manrope font-bold text-[10px] tracking-widest uppercase">
                İddia Analizi
            </h3>
            {claims.map((claim, i) => {
                const cfg = VERDICT_CONFIG[claim.verdict] || VERDICT_CONFIG.uncertain;
                return (
                    <div key={i} className="rounded-xl p-4 border" style={{ background: cfg.bg, borderColor: `${cfg.color}33` }}>
                        {/* İddia metni önce */}
                        <p className="text-tx-primary text-sm font-semibold leading-snug mb-3">
                            "{claim.text}"
                        </p>

                        {/* Karar rozeti */}
                        <div className="flex items-center gap-1.5 mb-2">
                            <cfg.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
                                {cfg.label}
                            </span>
                        </div>

                        {/* Açıklama — zorunlu, yoksa fallback */}
                        <p className="text-tx-secondary text-xs leading-relaxed mb-2">
                            {claim.explanation || 'Bu iddia için araştırma kaynağına ulaşılamadı.'}
                        </p>

                        {/* Kaynak */}
                        {claim.source_url ? (
                            <a href={claim.source_url} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-1 text-[10px] text-tx-secondary/60 hover:text-tx-primary transition-colors">
                                <ExternalLink className="w-3 h-3" />
                                {claim.source || claim.source_url}
                            </a>
                        ) : claim.source ? (
                            <span className="text-[10px] text-tx-secondary/50">{claim.source}</span>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
