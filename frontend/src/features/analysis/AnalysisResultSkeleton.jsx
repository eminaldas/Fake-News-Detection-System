import React from 'react';

const SK_BG = 'var(--color-terminal-border-raw)';
const BRAND = '#3fff8b';

const Bar = ({ w = 'w-full', h = 'h-2.5', delay = 'd1', style = {} }) => (
    <span
        className={`block ${w} ${h} animate-sk-glitch ${delay}`}
        style={{ background: SK_BG, borderRadius: 2, ...style }}
    />
);

const AnalysisResultSkeleton = () => {
    const hex15 = '#3fff8b26';
    const hex30 = '#3fff8b4d';

    return (
        <div
            className="animate-fade-up mt-6 md:mt-8 w-full overflow-hidden flex flex-col relative"
            style={{
                background: 'var(--color-bg-surface)',
                border: `1px solid ${hex30}`,
                borderTop: `3px solid ${BRAND}`,
            }}
        >
            {/* Köşe accent'lar */}
            <div className="absolute top-0 left-0 w-4 h-[2px] pointer-events-none" style={{ background: BRAND }} />
            <div className="absolute top-0 left-0 h-4 w-[2px] pointer-events-none" style={{ background: BRAND }} />
            <div className="absolute bottom-0 right-0 w-4 h-[2px] pointer-events-none" style={{ background: BRAND }} />
            <div className="absolute bottom-0 right-0 h-4 w-[2px] pointer-events-none" style={{ background: BRAND }} />

            {/* ── Header ── */}
            <div
                className="p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                style={{ borderBottom: `1px solid ${hex15}` }}
            >
                {/* Sol: ikon + başlık */}
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 shrink-0 animate-sk-glitch d1" style={{ background: hex15 }} />
                    <div className="flex flex-col gap-2 min-w-0">
                        <Bar w="w-20" h="h-2" delay="d2" />
                        <Bar w="w-48" h="h-5" delay="d1" />
                        <Bar w="w-32" h="h-2" delay="d3" />
                    </div>
                </div>

                {/* Sağ: skor */}
                <div className="flex flex-col items-end shrink-0 self-center sm:self-auto gap-1.5">
                    <Bar w="w-16" h="h-8" delay="d2" style={{ borderRadius: 4 }} />
                    <Bar w="w-20" h="h-1.5" delay="d4" />
                </div>
            </div>

            {/* ── Gövde ── */}
            <div className="p-5 sm:p-7 space-y-5">

                {/* Haber linki placeholder */}
                <div className="flex items-center gap-2">
                    <Bar w="w-3" h="h-3" delay="d3" style={{ borderRadius: '50%' }} />
                    <Bar w="w-64" h="h-2.5" delay="d2" />
                </div>

                {/* AI yorum kartı */}
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ background: hex15, borderLeft: `3px solid ${hex30}` }}
                >
                    <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 pb-3">
                        <Bar w="w-4" h="h-4" delay="d1" style={{ borderRadius: '50%' }} />
                        <Bar w="w-28" h="h-2.5" delay="d3" />
                    </div>
                    <div className="px-4 sm:px-5 pb-4 space-y-2">
                        <Bar w="w-full" h="h-3" delay="d2" />
                        <Bar w="w-full" h="h-3" delay="d3" />
                        <Bar w="w-3/4"  h="h-3" delay="d4" />
                    </div>
                </div>

                {/* Sinyal grid */}
                <div>
                    <Bar w="w-40" h="h-2.5" delay="d1" style={{ marginBottom: 12 }} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className="rounded-xl p-4 sm:p-5 space-y-3"
                                style={{ background: 'var(--color-bg-surface-solid)', border: `1px solid ${hex15}` }}
                            >
                                <Bar w="w-24" h="h-2.5" delay={`d${i + 1}`} />
                                <Bar w="w-14" h="h-6"   delay={`d${i + 2}`} style={{ borderRadius: 4 }} />
                                <Bar w="w-full" h="h-1" delay={`d${i + 1}`} style={{ borderRadius: 9999 }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div
                className="px-5 sm:px-7 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
                style={{ borderTop: `1px solid ${hex15}`, background: 'var(--color-bg-surface-solid)' }}
            >
                <div className="flex items-center gap-3">
                    <Bar w="w-10" h="h-10" delay="d3" style={{ borderRadius: '50%' }} />
                    <Bar w="w-32" h="h-3.5" delay="d2" />
                </div>
                <div className="flex gap-3">
                    <Bar w="w-24" h="h-10" delay="d4" style={{ borderRadius: 8 }} />
                    <Bar w="w-28" h="h-10" delay="d5" style={{ borderRadius: 8 }} />
                </div>
            </div>
        </div>
    );
};

export default AnalysisResultSkeleton;
