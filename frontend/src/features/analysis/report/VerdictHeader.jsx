import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Shield, HelpCircle, Drama } from 'lucide-react';

const VERDICT_THEME = {
    'DOĞRU':                { hex: '#3fff8b', Icon: ShieldCheck, label: 'DOĞRU' },
    'BÜYÜK_ÖLÇÜDE_DOĞRU':   { hex: '#5fe08b', Icon: ShieldCheck, label: 'BÜYÜK ÖLÇÜDE DOĞRU' },
    'KISMEN_DOĞRU':         { hex: '#f5d000', Icon: Shield,      label: 'KISMEN DOĞRU' },
    'KANIT_YETERSİZ':       { hex: '#8b949e', Icon: HelpCircle,  label: 'KANIT YETERSİZ' },
    'YANILTICI':            { hex: '#ff9f40', Icon: ShieldAlert, label: 'YANILTICI' },
    'BAĞLAMDAN_KOPARILMIŞ': { hex: '#ff9f40', Icon: ShieldAlert, label: 'BAĞLAMDAN KOPARILMIŞ' },
    'SAHTE':                { hex: '#ff7351', Icon: ShieldX,      label: 'SAHTE' },
};

const LEGACY_THEME = {
    AUTHENTIC: { hex: '#3fff8b', Icon: ShieldCheck, label: 'GÜVENİLİR İÇERİK' },
    FAKE:      { hex: '#ff7351', Icon: ShieldX,     label: 'ŞÜPHELİ İÇERİK'  },
};

export function getVerdictTheme(decision) {
    return VERDICT_THEME[decision] || { hex: '#8b949e', Icon: Shield, label: decision || 'BELİRSİZ' };
}

export default function VerdictHeader({ verdict, mlVerdict, report }) {
    const isV3  = !!verdict?.decision;
    const theme = isV3
        ? getVerdictTheme(verdict.decision)
        : (LEGACY_THEME[mlVerdict] || { hex: '#f59e0b', Icon: Shield, label: 'BELİRSİZ' });

    return (
        <div className="relative border overflow-hidden"
             style={{ background: 'var(--color-terminal-surface)', borderColor: theme.hex + '40', borderTop: `2px solid ${theme.hex}` }}>
            {/* Köşe aksanları */}
            <div className="absolute top-0 left-0 w-5 h-[2px] pointer-events-none" style={{ background: theme.hex }} />
            <div className="absolute top-0 left-0 h-5 w-[2px] pointer-events-none" style={{ background: theme.hex }} />
            <div className="absolute bottom-0 right-0 w-5 h-[2px] pointer-events-none" style={{ background: theme.hex }} />
            <div className="absolute bottom-0 right-0 h-5 w-[2px] pointer-events-none" style={{ background: theme.hex }} />

            <div className="px-6 py-5 flex items-start gap-5" style={{ background: theme.hex + '08' }}>
                <theme.Icon className="w-10 h-10 shrink-0 mt-1" style={{ color: theme.hex }} />
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: theme.hex, opacity: 0.8 }}>
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-xl font-black" style={{ color: theme.hex }}>{theme.label}</p>
                        {isV3 && verdict.is_satire && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-sm"
                                  style={{ color: '#a78bfa', background: '#a78bfa18', border: '1px solid #a78bfa55' }}>
                                <Drama className="w-3 h-3" /> HİCİV / PARODİ
                            </span>
                        )}
                        {isV3 && verdict.domain && (
                            <span className="font-mono text-[10px] tracking-wide px-2 py-0.5 border"
                                  style={{ color: 'var(--color-text-muted-accent)', borderColor: 'var(--color-terminal-border-raw)' }}>
                                {verdict.domain}
                            </span>
                        )}
                    </div>
                    {isV3 && verdict.one_line && (
                        <p className="font-mono text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                            {verdict.one_line}
                        </p>
                    )}
                    <p className="font-mono text-[10px] mt-2" style={{ color: 'var(--color-text-muted-accent)' }}>
                        Gemini AI · Google Search grounding
                        {report?.generated_at && ` · ${new Date(report.generated_at).toLocaleString('tr-TR')}`}
                    </p>
                </div>
            </div>
        </div>
    );
}
