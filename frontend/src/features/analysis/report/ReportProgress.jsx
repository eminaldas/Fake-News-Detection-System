import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../../../contexts/WebSocketContext';

const STAGES = [
    { n: 1, label: 'İddialar ayrıştırılıyor' },
    { n: 2, label: 'Kaynaklar taranıyor' },
    { n: 3, label: 'Rapor sentezleniyor' },
];

/* Aşamaya bağlı dekoratif log satırları */
const STAGE_LINES = {
    1: ['kritik iddialar ayrıştırılıyor…', 'alan tespiti yapılıyor…'],
    2: ['kaynaklar taranıyor…', 'çapraz doğrulama yapılıyor…'],
    3: ['kanıtlar sentezleniyor…', 'güvenilirlik skoru hesaplanıyor…'],
};

const S = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

export default function ReportProgress({ taskId }) {
    const [stage, setStage] = useState(1);
    const { subscribe } = useWebSocket();

    useEffect(() => {
        if (!taskId) return undefined;
        const unsub = subscribe('report_progress', (p) => {
            if (p?.task_id === taskId && typeof p.stage === 'number') setStage(p.stage);
        });
        return unsub;
    }, [taskId, subscribe]);

    const pct = Math.round((stage / STAGES.length) * 100);

    return (
        <div className="relative border p-6" style={S}>
            {/* Stepper */}
            <div className="flex items-center gap-2 mb-5">
                {STAGES.map((st, i) => {
                    const done = st.n < stage;
                    const active = st.n === stage;
                    const color = done ? '#3fff8b' : active ? '#f59e0b' : 'var(--color-terminal-border-raw)';
                    return (
                        <React.Fragment key={st.n}>
                            <div className="flex items-center gap-1.5">
                                <span className="font-mono text-sm" style={{ color }}>
                                    {done ? '●' : active ? '◉' : '○'}
                                </span>
                                <span className="font-mono text-[10px] hidden sm:inline"
                                      style={{ color: active ? 'var(--color-text-secondary)' : 'var(--color-text-muted-accent)' }}>
                                    {st.label}
                                </span>
                            </div>
                            {i < STAGES.length - 1 && (
                                <span className="flex-1 border-t" style={{ borderColor: st.n < stage ? '#3fff8b55' : 'var(--color-terminal-border-raw)' }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Canlı log */}
            <div className="font-mono text-[11px] leading-loose p-3 border"
                 style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted-accent)' }}>
                {STAGES.filter((st) => st.n <= stage).map((st) => (
                    <div key={st.n}>
                        <span style={{ color: st.n < stage ? '#3fff8b' : '#f59e0b' }}>›</span>{' '}
                        aşama {st.n}/3 — {st.label}{st.n < stage ? ' ✓' : ''}
                        {(STAGE_LINES[st.n] || []).map((line, j) => (
                            <div key={j} style={{ paddingLeft: 14 }}>{line}</div>
                        ))}
                    </div>
                ))}
                <div><span style={{ color: '#3fff8b' }}>▋</span></div>
            </div>

            {/* İlerleme barı */}
            <div className="h-[3px] mt-4" style={{ background: 'var(--color-terminal-border-raw)' }}>
                <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: '#3fff8b' }} />
            </div>
            <p className="font-mono text-[10px] mt-2 text-center" style={{ color: 'var(--color-text-muted-accent)' }}>
                Derin rapor hazırlanıyor — bu sayfada bekleyebilir veya başka işlerinize dönebilirsiniz.
            </p>
        </div>
    );
}
