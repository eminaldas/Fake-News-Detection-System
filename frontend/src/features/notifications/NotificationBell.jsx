import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { useWebSocket } from '../../contexts/WebSocketContext';

const TYPE_LABELS = {
    new_comment:        'Yorumunuza yeni bir yorum geldi',
    reply:              'Yorumunuza yanıt geldi',
    mention:            'Bir tartışmada bahsedildiniz',
    under_review:       'Tartışmanız inceleme altında',
    fact_check_started: 'Haber kontrolü başlatıldı',
    fact_check_done:    'Haber kontrolü tamamlandı',
    new_follower:       'Sizi takip eden biri var',
};

const TYPE_PREFIX = {
    new_comment:        '💬',
    reply:              '↩',
    mention:            '@',
    under_review:       '🔍',
    fact_check_started: '📰',
    fact_check_done:    '✓',
    new_follower:       '→',
};

function relativeTime(isoString) {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60)    return `${diff}S`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}DK`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}SA`;
    return `${Math.floor(diff / 86400)}G`;
}

function resolveLink(notif) {
    const p = notif.payload ?? {};
    if (p.thread_id)  return `/forum/${p.thread_id}`;
    if (p.article_id) return `/archive/${p.article_id}`;
    return null;
}

const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

export default function NotificationBell() {
    const [open,    setOpen]    = useState(false);
    const [items,   setItems]   = useState([]);
    const [unread,  setUnread]  = useState(0);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);
    const { subscribe } = useWebSocket();
    const navigate = useNavigate();

    useEffect(() => {
        axiosInstance.get('/notifications/forum')
            .then(r => setUnread(r.data.unread ?? 0))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const unsub = subscribe('notification.new', (payload) => {
            setUnread(prev => prev + 1);
            if (payload?.id) {
                setItems(prev => [{
                    id:         payload.id,
                    type:       payload.type,
                    payload:    payload.payload ?? {},
                    read_at:    null,
                    created_at: payload.created_at ?? new Date().toISOString(),
                }, ...prev]);
            }
        });
        return unsub;
    }, [subscribe]);

    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleToggle = useCallback(() => {
        setOpen(prev => {
            const next = !prev;
            if (next && items.length === 0) {
                setLoading(true);
                axiosInstance.get('/notifications/forum')
                    .then(r => { setItems(r.data.items ?? []); setUnread(r.data.unread ?? 0); })
                    .catch(() => {})
                    .finally(() => setLoading(false));
            }
            return next;
        });
    }, [items.length]);

    const handleMarkOne = useCallback(async (notif) => {
        setOpen(false);
        if (!notif.read_at) {
            setItems(prev => prev.map(n => n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n));
            setUnread(prev => Math.max(0, prev - 1));
            try {
                await axiosInstance.put(`/notifications/forum/${notif.id}/read`);
            } catch {
                setItems(prev => prev.map(n => n.id === notif.id ? { ...n, read_at: null } : n));
                setUnread(prev => prev + 1);
            }
        }
        const link = resolveLink(notif);
        if (link) navigate(link);
    }, [navigate]);

    const handleMarkAll = useCallback(async () => {
        const now = new Date().toISOString();
        setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })));
        setUnread(0);
        try { await axiosInstance.put('/notifications/forum/read-all'); } catch {}
    }, []);

    return (
        <div ref={wrapperRef} className="relative">
            {/* Zil */}
            <button
                onClick={handleToggle}
                className="p-1.5 transition-colors relative"
                style={{ color: 'var(--color-text-primary)' }}
                aria-label="Bildirimler"
            >
                <Bell size={15} />
                {unread > 0 && (
                    <span
                        className="absolute -top-1 -right-1 text-white font-mono font-black w-4 h-4 flex items-center justify-center"
                        style={{ background: '#ff7351', fontSize: '9px' }}
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-80 overflow-hidden animate-fade-up"
                    style={{ ...TS, zIndex: 200 }}
                >
                    {/* Köşe aksanları */}
                    <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none z-10" />
                    <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none z-10" />
                    <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none z-10" />
                    <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none z-10" />

                    {/* Başlık */}
                    <div
                        className="sticky top-0 px-4 py-2.5 flex items-center justify-between border-b"
                        style={{ ...TS, ...BD }}
                    >
                        <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--color-brand-primary)' }}>
                            // BİLDİRİMLER
                        </span>
                        {unread > 0 && (
                            <button
                                onClick={handleMarkAll}
                                className="font-mono text-[10px] tracking-wider transition-opacity hover:opacity-60"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                hepsini okundu
                            </button>
                        )}
                    </div>

                    {/* Liste */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading && (
                            <div className="px-4 py-6 text-center">
                                <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</p>
                            </div>
                        )}
                        {!loading && items.length === 0 && (
                            <div className="px-4 py-8 text-center">
                                <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>// bildirim yok</p>
                            </div>
                        )}
                        {items.map((n, idx) => {
                            const label  = TYPE_LABELS[n.type] ?? n.type;
                            const prefix = TYPE_PREFIX[n.type] ?? '·';
                            const isRead = !!n.read_at;
                            return (
                                <button
                                    key={n.id}
                                    onClick={() => handleMarkOne(n)}
                                    className={`w-full text-left px-4 py-3 border-l-2 transition-colors hover:bg-brand/5 ${idx < items.length - 1 ? 'border-b' : ''}`}
                                    style={{
                                        borderColor:     'var(--color-terminal-border-raw)',
                                        borderLeftColor: isRead ? 'transparent' : 'var(--color-brand-primary)',
                                        opacity:         isRead ? 0.45 : 1,
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="font-mono text-sm shrink-0 mt-0.5" style={{ color: 'var(--color-brand-primary)' }}>
                                            {prefix}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                                                {label}
                                            </p>
                                            {n.payload?.text && (
                                                <p className="font-mono text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                                                    {n.payload.text}
                                                </p>
                                            )}
                                            <p className="font-mono text-[10px] mt-1 tracking-widest" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                                                {relativeTime(n.created_at)} ÖNCE
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t" style={BD}>
                        <span className="font-mono text-[9px] tracking-widest opacity-30" style={{ color: 'var(--color-text-muted)' }}>
                            // NOTIF_STREAM
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
