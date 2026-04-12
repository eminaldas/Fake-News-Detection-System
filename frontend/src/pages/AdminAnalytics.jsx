import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, Users, Activity, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axios';

const AdminAnalytics = () => {
    const [dailyData,  setDailyData]  = useState([]);
    const [typeData,   setTypeData]   = useState([]);
    const [topUsers,   setTopUsers]   = useState([]);
    const [health,     setHealth]     = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [days,       setDays]       = useState(30);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [daily, types, users, sys] = await Promise.all([
                axiosInstance.get(`/admin/logs/analytics/daily?days=${days}`),
                axiosInstance.get(`/admin/logs/analytics/analysis-types?days=${days}`),
                axiosInstance.get('/admin/logs/analytics/top-users?days=7'),
                axiosInstance.get('/admin/logs/system/health'),
            ]);
            setDailyData(daily.data.data  || []);
            setTypeData(types.data.data   || []);
            setTopUsers(users.data.data   || []);
            setHealth(sys.data);
        } catch (err) {
            console.error('Analytics yüklenemedi:', err.message);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const totalAnalyses = dailyData.reduce((s, d) => s + d.total, 0);
    const maxDaily      = Math.max(...dailyData.map((d) => d.total), 1);

    const TYPE_LABELS = { text: 'Metin', url: 'URL', image: 'Görsel' };
    const TYPE_COLORS = { text: 'bg-blue-400', url: 'bg-purple-400', image: 'bg-green-400' };
    const typeTotal   = typeData.reduce((s, d) => s + d.count, 0);

    if (loading) return (
        <div className="flex justify-center py-40">
            <Loader2 className="w-8 h-8 animate-spin text-app-charcoal opacity-40" />
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
            {/* Başlık */}
            <div className="flex items-center gap-3">
                <BarChart2 className="w-7 h-7 text-app-burgundy" />
                <h1 className="text-2xl font-extrabold text-app-charcoal">Kullanım Analitiği</h1>
                <div className="ml-auto flex gap-2">
                    {[7, 30, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                days === d
                                    ? 'bg-app-burgundy text-white'
                                    : 'bg-app-bg text-app-charcoal opacity-60 hover:opacity-100'
                            }`}
                        >
                            {d}g
                        </button>
                    ))}
                </div>
            </div>

            {/* Sistem Sağlığı Kartları */}
            {health && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-app-surface rounded-2xl border border-app-gray p-5">
                        <Activity className="w-5 h-5 text-app-charcoal opacity-40 mb-2" />
                        <div className="text-2xl font-extrabold text-app-charcoal">{totalAnalyses}</div>
                        <div className="text-xs text-app-charcoal opacity-50 mt-1">Toplam Analiz ({days}g)</div>
                    </div>
                    <div className={`bg-app-surface rounded-2xl border p-5 ${health.errors_last_1h > 0 ? 'border-red-200' : 'border-app-gray'}`}>
                        <div className="text-2xl font-extrabold text-app-charcoal">{health.errors_last_1h}</div>
                        <div className="text-xs text-app-charcoal opacity-50 mt-1">Worker Hatası (son 1s)</div>
                    </div>
                    <div className={`bg-app-surface rounded-2xl border p-5 ${health.critical_last_1h > 0 ? 'border-red-200' : 'border-app-gray'}`}>
                        <div className="text-2xl font-extrabold text-app-charcoal">{health.critical_last_1h}</div>
                        <div className="text-xs text-app-charcoal opacity-50 mt-1">Kritik Alert (son 1s)</div>
                    </div>
                </div>
            )}

            {/* Günlük Analiz Grafiği */}
            <div className="bg-app-surface rounded-2xl border border-app-gray p-6">
                <h2 className="text-sm font-bold text-app-charcoal opacity-60 uppercase tracking-wider mb-4">
                    Günlük Analiz Hacmi
                </h2>
                {dailyData.length === 0 ? (
                    <p className="text-center text-app-charcoal opacity-40 py-8">Veri yok</p>
                ) : (
                    <div className="flex items-end gap-1 h-32">
                        {dailyData.slice(-30).map((d) => (
                            <div
                                key={d.day}
                                className="flex-1 flex flex-col items-center gap-1 group relative"
                            >
                                <div
                                    className="w-full bg-app-burgundy bg-opacity-70 rounded-t transition-all group-hover:bg-opacity-100"
                                    style={{ height: `${Math.max(4, (d.total / maxDaily) * 100)}%` }}
                                />
                                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-app-charcoal text-white text-xs rounded px-2 py-0.5 whitespace-nowrap z-10">
                                    {d.day?.slice(5)}: {d.total}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Analiz Tipi Dağılımı + Top Kullanıcılar */}
            <div className="grid grid-cols-2 gap-6">
                {/* Tip Dağılımı */}
                <div className="bg-app-surface rounded-2xl border border-app-gray p-6">
                    <h2 className="text-sm font-bold text-app-charcoal opacity-60 uppercase tracking-wider mb-4">
                        Analiz Tipi Dağılımı
                    </h2>
                    <div className="space-y-3">
                        {typeData.length === 0 ? (
                            <p className="text-app-charcoal opacity-40 text-sm">Veri yok</p>
                        ) : typeData.map((t) => {
                            const pct = typeTotal > 0 ? Math.round((t.count / typeTotal) * 100) : 0;
                            return (
                                <div key={t.type}>
                                    <div className="flex justify-between text-xs text-app-charcoal mb-1">
                                        <span className="font-semibold">{TYPE_LABELS[t.type] || t.type}</span>
                                        <span className="opacity-60">{t.count} (%{pct})</span>
                                    </div>
                                    <div className="h-2 bg-app-gray rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${TYPE_COLORS[t.type] || 'bg-gray-400'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Kullanıcılar */}
                <div className="bg-app-surface rounded-2xl border border-app-gray p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4 text-app-charcoal opacity-50" />
                        <h2 className="text-sm font-bold text-app-charcoal opacity-60 uppercase tracking-wider">
                            En Aktif Kullanıcılar (7g)
                        </h2>
                    </div>
                    <div className="space-y-2">
                        {topUsers.length === 0 ? (
                            <p className="text-app-charcoal opacity-40 text-sm">Veri yok</p>
                        ) : topUsers.map((u, i) => (
                            <div key={u.user_id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 text-xs text-app-charcoal opacity-40 font-bold">{i + 1}.</span>
                                    <span className="font-semibold text-app-charcoal">{u.username}</span>
                                </div>
                                <span className="text-xs text-app-charcoal opacity-60 font-bold">{u.count} analiz</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
