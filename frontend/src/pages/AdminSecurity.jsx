import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, AlertTriangle, RefreshCw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosInstance from '../api/axios';

const SEVERITY_STYLES = {
    CRITICAL: 'bg-red-100 text-red-700',
    WARNING:  'bg-yellow-100 text-yellow-700',
    INFO:     'bg-blue-100 text-blue-700',
};

const EVENT_LABELS = {
    'auth.login_failed':                    'Başarısız Giriş',
    'auth.login_success':                   'Başarılı Giriş',
    'ratelimit.exceeded':                   'Rate Limit Aşımı',
    'security.credential_stuffing_detected':'Credential Stuffing',
    'security.abuse_pattern':               'Kötüye Kullanım',
    'security.geo_anomaly':                 'Coğrafi Anomali',
    'admin.action':                         'Admin Eylemi',
};

const AdminSecurity = () => {
    const [events,   setEvents]   = useState([]);
    const [alerts,   setAlerts]   = useState([]);
    const [total,    setTotal]    = useState(0);
    const [page,     setPage]     = useState(1);
    const [severity, setSeverity] = useState('');
    const [loading,  setLoading]  = useState(true);
    const PAGE_SIZE = 50;

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/admin/logs/alerts');
            setAlerts(res.data.alerts || []);
        } catch { /* sessizce geç */ }
    }, []);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ hours: 24, page, size: PAGE_SIZE });
            if (severity) params.set('severity', severity);
            const res = await axiosInstance.get(`/admin/logs/security?${params}`);
            setEvents(res.data.items || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error('Security log yüklenemedi:', err.message);
        } finally {
            setLoading(false);
        }
    }, [page, severity]);

    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            {/* Başlık */}
            <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className="w-7 h-7 text-app-burgundy" />
                <h1 className="text-2xl font-extrabold text-app-charcoal">Güvenlik Merkezi</h1>
                <button
                    onClick={() => { fetchAlerts(); fetchEvents(); }}
                    className="ml-auto p-2 rounded-lg hover:bg-app-bg transition-colors"
                    title="Yenile"
                >
                    <RefreshCw className="w-4 h-4 text-app-charcoal opacity-60" />
                </button>
            </div>

            {/* CRITICAL Alert Banner */}
            {alerts.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="font-bold text-red-700">{alerts.length} Aktif Kritik Alert</span>
                    </div>
                    <div className="space-y-1">
                        {alerts.slice(0, 3).map((a, i) => (
                            <div key={i} className="text-xs text-red-600">
                                {EVENT_LABELS[a.event_name] || a.event_name} — IP: {a.ip_hash?.slice(0, 12)}...
                                {a.details?.subnet_hash && ` (subnet: ${a.details.subnet_hash.slice(0, 8)}...)`}
                            </div>
                        ))}
                        {alerts.length > 3 && (
                            <div className="text-xs text-red-500">+{alerts.length - 3} daha...</div>
                        )}
                    </div>
                </div>
            )}

            {/* Filtre */}
            <div className="flex gap-3 mb-4">
                {['', 'CRITICAL', 'WARNING', 'INFO'].map((s) => (
                    <button
                        key={s}
                        onClick={() => { setSeverity(s); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            severity === s
                                ? 'bg-app-burgundy text-white'
                                : 'bg-app-bg text-app-charcoal opacity-60 hover:opacity-100'
                        }`}
                    >
                        {s || 'Tümü'}
                    </button>
                ))}
                <span className="ml-auto text-xs text-app-charcoal opacity-40 self-center">{total} olay (son 24s)</span>
            </div>

            {/* Tablo */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-app-charcoal opacity-40" />
                </div>
            ) : (
                <div className="bg-app-surface rounded-2xl border border-app-gray overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-app-bg border-b border-app-gray">
                            <tr>
                                {['Olay', 'Önem', 'IP Hash', 'Kullanıcı', 'Detay', 'Zaman'].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 font-bold text-app-charcoal opacity-60 uppercase tracking-wider text-xs">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-gray">
                            {events.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-app-charcoal opacity-40 text-sm">
                                        Bu zaman aralığında olay bulunamadı.
                                    </td>
                                </tr>
                            ) : events.map((e) => (
                                <tr key={e.id} className="hover:bg-app-bg transition-colors">
                                    <td className="px-4 py-3 font-semibold text-app-charcoal text-xs">
                                        {EVENT_LABELS[e.event_name] || e.event_name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${SEVERITY_STYLES[e.severity] || 'bg-gray-100 text-gray-600'}`}>
                                            {e.severity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-app-charcoal opacity-50 text-xs font-mono">
                                        {e.ip_hash?.slice(0, 16)}...
                                    </td>
                                    <td className="px-4 py-3 text-app-charcoal opacity-60 text-xs">
                                        {e.user_id ? e.user_id.slice(0, 8) + '...' : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-app-charcoal opacity-50 text-xs max-w-xs truncate">
                                        {e.details && Object.keys(e.details).length > 0
                                            ? Object.entries(e.details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ')
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-app-charcoal opacity-50 text-xs">
                                        {new Date(e.created_at).toLocaleString('tr-TR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="flex justify-between items-center px-4 py-3 border-t border-app-gray">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="flex items-center gap-1 text-sm text-app-charcoal opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
                        >
                            <ChevronLeft className="w-4 h-4" /> Önceki
                        </button>
                        <span className="text-xs text-app-charcoal opacity-40">
                            {page} / {totalPages || 1}
                        </span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="flex items-center gap-1 text-sm text-app-charcoal opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
                        >
                            Sonraki <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSecurity;
