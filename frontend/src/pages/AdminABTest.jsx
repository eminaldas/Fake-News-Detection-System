import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, CheckCircle, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axios';

const VARIANT_NAMES = { 0: 'Kontrol', 1: 'Recency-Heavy', 2: 'Category-Heavy' };

const AdminABTest = () => {
    const [experiments, setExperiments] = useState([]);
    const [selected,    setSelected]    = useState(null);
    const [results,     setResults]     = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [concluding,  setConcluding]  = useState(false);

    const fetchExperiments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/ab/experiments');
            setExperiments(res.data.experiments || []);
        } catch (e) {
            console.error('AB deneyleri yüklenemedi:', e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchResults = useCallback(async (expId) => {
        try {
            const res = await axiosInstance.get(`/admin/ab/experiments/${expId}/results`);
            setResults(res.data);
        } catch (e) {
            console.error('Sonuçlar yüklenemedi:', e.message);
        }
    }, []);

    useEffect(() => { fetchExperiments(); }, [fetchExperiments]);

    const handleSelect = (exp) => {
        setSelected(exp);
        setResults(null);
        fetchResults(exp.id);
    };

    const handleConclude = async (winnerId) => {
        if (!selected || concluding) return;
        if (!window.confirm(`Varyant ${winnerId} (${VARIANT_NAMES[winnerId]}) kazanan olarak uygulanacak. Emin misin?`)) return;
        setConcluding(true);
        try {
            await axiosInstance.post(`/admin/ab/experiments/${selected.id}/conclude`, { winner_variant: winnerId });
            await fetchExperiments();
            await fetchResults(selected.id);
        } catch (e) {
            alert('Hata: ' + e.message);
        } finally {
            setConcluding(false);
        }
    };

    const bestCtr = results
        ? Math.max(...(results.variants || []).map(v => v.ctr))
        : 0;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-2">
                <FlaskConical className="text-indigo-500" size={22} />
                <h1 className="text-xl font-bold text-app-charcoal">A/B Test Sonuçları</h1>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-app-muted"><Loader2 className="animate-spin" size={18} /> Yükleniyor...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Deney listesi */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-app-muted uppercase tracking-wide">Deneyler</p>
                        {experiments.map(exp => (
                            <button
                                key={exp.id}
                                onClick={() => handleSelect(exp)}
                                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                                    selected?.id === exp.id
                                        ? 'border-indigo-400 bg-indigo-50'
                                        : 'border-app-border bg-app-surface hover:border-indigo-300'
                                }`}
                            >
                                <p className="font-semibold text-sm text-app-charcoal">{exp.name}</p>
                                <p className="text-xs text-app-muted mt-0.5">
                                    {exp.status === 'active' && <span className="text-green-600">● Aktif</span>}
                                    {exp.status === 'concluded' && <span className="text-indigo-600">✓ Sonuçlandı ({VARIANT_NAMES[exp.winner_variant]})</span>}
                                    {exp.status === 'paused' && <span className="text-yellow-600">⏸ Duraklatıldı</span>}
                                </p>
                                {exp.min_clicks_reached && exp.status === 'active' && (
                                    <p className="text-xs text-green-700 mt-1 font-medium">✔ Eşik doldu — sonuç hazır</p>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Sonuç tablosu */}
                    <div className="lg:col-span-2">
                        {!selected && (
                            <p className="text-app-muted text-sm">Soldan bir deney seç.</p>
                        )}
                        {selected && !results && (
                            <div className="flex items-center gap-2 text-app-muted"><Loader2 className="animate-spin" size={16}/> Sonuçlar yükleniyor...</div>
                        )}
                        {results && (
                            <div className="space-y-4">
                                <p className="text-sm font-semibold text-app-charcoal">{results.experiment_name}</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b border-app-border text-app-muted text-xs uppercase">
                                                <th className="px-3 py-2 text-left">Varyant</th>
                                                <th className="px-3 py-2 text-right">İzlenim</th>
                                                <th className="px-3 py-2 text-right">Tıklama</th>
                                                <th className="px-3 py-2 text-right">CTR</th>
                                                <th className="px-3 py-2 text-right">Feedback+</th>
                                                <th className="px-3 py-2 text-center">Durum</th>
                                                {results.status === 'active' && <th className="px-3 py-2"></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(results.variants || []).map(v => (
                                                <tr
                                                    key={v.variant}
                                                    className={`border-b border-app-border transition-colors ${
                                                        v.ctr === bestCtr && bestCtr > 0 ? 'bg-green-50' : 'hover:bg-app-bg'
                                                    }`}
                                                >
                                                    <td className="px-3 py-3 font-medium text-app-charcoal">
                                                        {v.variant} — {v.name}
                                                        {v.variant === results.winner_variant && (
                                                            <CheckCircle size={14} className="inline ml-1 text-green-600" />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-app-muted">{v.impressions}</td>
                                                    <td className="px-3 py-3 text-right">{v.clicks}</td>
                                                    <td className={`px-3 py-3 text-right font-semibold ${v.ctr === bestCtr && bestCtr > 0 ? 'text-green-700' : 'text-app-charcoal'}`}>
                                                        {v.ctr}%
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-app-muted">{v.feedback_rate}%</td>
                                                    <td className="px-3 py-3 text-center">
                                                        {v.ready
                                                            ? <span className="text-xs text-green-700 font-medium">✔ Hazır</span>
                                                            : <span className="text-xs text-app-muted">{v.clicks}/{results.min_clicks}</span>
                                                        }
                                                    </td>
                                                    {results.status === 'active' && (
                                                        <td className="px-3 py-3 text-center">
                                                            <button
                                                                onClick={() => handleConclude(v.variant)}
                                                                disabled={!v.ready || concluding}
                                                                className="px-3 py-1 text-xs rounded bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                                                            >
                                                                Uygula
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-app-muted">
                                    Yeşil satır en yüksek CTR'a sahip varyant. "Uygula" butonu tıklama eşiği ({results.min_clicks}) dolunca aktif olur.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminABTest;
