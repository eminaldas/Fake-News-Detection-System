import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axios';

function RiskReport() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get('/insights/risk-report')
            .then(r => setData(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="h-24 rounded-xl bg-base animate-pulse" />;
    if (!data || data.total_clicks === 0) return (
        <p className="text-xs text-tx-secondary opacity-50 text-center py-4">
            Henüz yeterli veri yok. Gündem sayfasından haber okumaya başla.
        </p>
    );

    return (
        <div className="space-y-3">
            <div className="flex gap-3">
                <div className="flex-1 p-4 rounded-xl bg-base border border-brutal-border text-center">
                    <div className="text-2xl font-extrabold text-tx-primary">{data.total_clicks}</div>
                    <div className="text-xs text-tx-secondary mt-1">Okunan haber (7g)</div>
                </div>
                <div className={`flex-1 p-4 rounded-xl border text-center ${
                    data.high_risk_count > 0 ? 'bg-fake-bg border-fake-border' : 'bg-authentic-bg border-authentic-border'
                }`}>
                    <div className={`text-2xl font-extrabold ${data.high_risk_count > 0 ? 'text-fake-text' : 'text-authentic-text'}`}>
                        {data.high_risk_count}
                    </div>
                    <div className={`text-xs mt-1 ${data.high_risk_count > 0 ? 'text-fake-text' : 'text-authentic-text'}`}>
                        Yüksek riskli haber
                    </div>
                </div>
            </div>
            {data.categories.length > 0 && (
                <div className="space-y-2">
                    {data.categories.slice(0, 4).map(cat => (
                        <div key={cat.category}>
                            <div className="flex justify-between text-xs text-tx-primary mb-1">
                                <span className="font-semibold capitalize">{cat.category}</span>
                                <span className="text-tx-secondary">%{Math.round(cat.avg_risk * 100)} ort. risk</span>
                            </div>
                            <div className="h-1.5 bg-brutal-border rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width:      `${Math.round(cat.avg_risk * 100)}%`,
                                        background: cat.avg_risk > 0.5 ? '#ef4444' : cat.avg_risk > 0.25 ? '#f59e0b' : '#3fff8b',
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SourceTrust() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get('/insights/source-trust')
            .then(r => setData(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="h-24 rounded-xl bg-base animate-pulse" />;
    if (!data || data.sources.length === 0) return (
        <p className="text-xs text-tx-secondary opacity-50 text-center py-4">
            Henüz yeterli veri yok.
        </p>
    );

    const TRUST_COLOR = { yüksek: 'text-authentic-text', orta: 'text-brand', düşük: 'text-fake-text' };
    const TRUST_BG    = { yüksek: 'bg-authentic-bg border-authentic-border', orta: 'bg-base border-brutal-border', düşük: 'bg-fake-bg border-fake-border' };

    return (
        <div className="space-y-2">
            {data.sources.slice(0, 6).map(src => (
                <div key={src.domain}
                     className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${TRUST_BG[src.trust_level]}`}>
                    <div>
                        <p className="text-xs font-bold text-tx-primary">{src.domain}</p>
                        <p className="text-[10px] text-tx-secondary">{src.total_clicks} haber · %{Math.round(src.avg_risk * 100)} ort. risk</p>
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${TRUST_COLOR[src.trust_level]}`}>
                        {src.trust_level}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function InsightsPanel() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-tx-secondary mb-3">
                    🛡️ Haftalık Risk Özeti
                </h3>
                <RiskReport />
            </div>
            <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-tx-secondary mb-3">
                    📡 Kaynak Güven Takibi (30g)
                </h3>
                <SourceTrust />
            </div>
        </div>
    );
}
