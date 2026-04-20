/**
 * frontend/src/features/notifications/NotificationBell.jsx
 *
 * Navbar'a entegre bildirim zili — okunmamış rozet, dropdown liste,
 * hepsini okundu işaretle, WebSocket anlık güncelleme.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useWebSocket } from '../../contexts/WebSocketContext';

/* ── Bildirim tipi → Türkçe etiket ─────────────────────────────── */
const TYPE_LABELS = {
    new_comment:       'Yorumunuza yeni bir yorum geldi',
    reply:             'Yorumunuza yanıt geldi',
    mention:           'Bir tartışmada bahsedildiniz',
    under_review:      'Tartışmanız inceleme altında',
    fact_check_started:'Haber kontrolü başlatıldı',
    fact_check_done:   'Haber kontrolü tamamlandı',
    new_follower:      'Sizi takip eden biri var',
};

/* ── Tip → ikon (emoji) ─────────────────────────────────────────── */
const TYPE_ICON = {
    new_comment:       '💬',
    reply:             '↩️',
    mention:           '@',
    under_review:      '🔍',
    fact_check_started:'📰',
    fact_check_done:   '✅',
    new_follower:      '👤',
};

/* ── Göreli zaman ───────────────────────────────────────────────── */
function relativeTime(isoString) {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60)  return `${diff}s önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
    return `${Math.floor(diff / 86400)}g önce`;
}

/* ── Dropdown ───────────────────────────────────────────────────── */
function NotificationList({ items, loading, onMarkOne, onMarkAll, unread }) {
    return (
        <div className="max-h-80 overflow-y-auto">
            {/* Başlık satırı */}
            <div
                className="sticky top-0 px-4 py-2.5 flex items-center justify-between border-b"
                style={{
                    background: 'var(--color-navbar-bg)',
                    borderColor: 'var(--color-border)',
                }}
            >
                <span className="text-[10px] font-extrabold uppercase tracking-widest"
                      style={{ color: 'var(--color-text-muted)' }}>
                    Bildirimler
                </span>
                {unread > 0 && (
                    <button
                        onClick={onMarkAll}
                        className="text-[10px] font-bold transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-brand-primary)' }}
                    >
                        Hepsini okundu işaretle
                    </button>
                )}
            </div>

            {loading && (
                <div className="p-6 text-xs text-center"
                     style={{ color: 'var(--color-text-muted)' }}>
                    Yükleniyor…
                </div>
            )}
            {!loading && items.length === 0 && (
                <div className="p-6 text-xs text-center opacity-50"
                     style={{ color: 'var(--color-text-muted)' }}>
                    Bildirim yok
                </div>
            )}

            {items.map(n => {
                const label = TYPE_LABELS[n.type] ?? n.type;
                const icon  = TYPE_ICON[n.type]  ?? '🔔';
                const isRead = !!n.read_at;

                return (
                    <button
                        key={n.id}
                        onClick={() => onMarkOne(n)}
                        className="w-full text-left px-4 py-3 border-b last:border-0 flex items-start gap-3 transition-colors"
                        style={{
                            borderColor: 'var(--color-border)',
                            background: isRead ? 'transparent' : 'color-mix(in srgb, var(--color-brand-primary) 6%, transparent)',
                            opacity: isRead ? 0.55 : 1,
                        }}
                    >
                        {/* Tip ikonu */}
                        <span className="text-base leading-none mt-0.5 shrink-0"
                              aria-hidden="true">
                            {icon}
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold leading-snug"
                               style={{ color: 'var(--color-text-primary)' }}>
                                {label}
                            </p>
                            {n.payload?.text && (
                                <p className="text-[10px] mt-0.5 line-clamp-2"
                                   style={{ color: 'var(--color-text-muted)' }}>
                                    {n.payload.text}
                                </p>
                            )}
                            <p className="text-[10px] mt-1"
                               style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                {relativeTime(n.created_at)}
                            </p>
                        </div>

                        {!isRead && (
                            <span
                                className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                                style={{ background: 'var(--color-brand-primary)' }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* ── Ana bileşen ────────────────────────────────────────────────── */
export default function NotificationBell() {
    const [open,    setOpen]    = useState(false);
    const [items,   setItems]   = useState([]);
    const [unread,  setUnread]  = useState(0);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);
    const { subscribe } = useWebSocket();

    /* İlk yükleme — okunmamış sayısını al */
    useEffect(() => {
        axiosInstance.get('/notifications/forum')
            .then(r => setUnread(r.data.unread ?? 0))
            .catch(() => {});
    }, []);

    /* WebSocket: yeni bildirim geldi */
    useEffect(() => {
        const unsub = subscribe('notification.new', (payload) => {
            setUnread(prev => prev + 1);
            /* Dropdown açıksa listeye de ekle */
            if (payload?.id) {
                setItems(prev => [
                    {
                        id: payload.id,
                        type: payload.type,
                        payload: payload.payload ?? {},
                        read_at: null,
                        created_at: payload.created_at ?? new Date().toISOString(),
                    },
                    ...prev,
                ]);
            }
        });
        return unsub;
    }, [subscribe]);

    /* Dışarı tıklanınca kapat */
    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* Dropdown açılınca listeyi getir */
    const handleToggle = useCallback(() => {
        setOpen(prev => {
            const next = !prev;
            if (next && items.length === 0) {
                setLoading(true);
                axiosInstance.get('/notifications/forum')
                    .then(r => {
                        setItems(r.data.items ?? []);
                        setUnread(r.data.unread ?? 0);
                    })
                    .catch(() => {})
                    .finally(() => setLoading(false));
            }
            return next;
        });
    }, [items.length]);

    /* Tek bildirimi okundu işaretle */
    const handleMarkOne = useCallback(async (notif) => {
        if (!notif.read_at) {
            await axiosInstance.put(`/notifications/forum/${notif.id}/read`).catch(() => {});
            setItems(prev =>
                prev.map(n => n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)
            );
            setUnread(prev => Math.max(0, prev - 1));
        }
        if (notif.payload?.link_url) {
            window.location.href = notif.payload.link_url;
        }
    }, []);

    /* Hepsini okundu işaretle */
    const handleMarkAll = useCallback(async () => {
        await axiosInstance.put('/notifications/forum/read-all').catch(() => {});
        setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
        setUnread(0);
    }, []);

    return (
        <div ref={wrapperRef} className="relative">
            {/* Zil butonu */}
            <button
                onClick={handleToggle}
                className="p-1.5 transition-colors relative"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Bildirimler"
            >
                <Bell size={15} />
                {unread > 0 && (
                    <span
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                        style={{ fontSize: '9px' }}
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl overflow-hidden animate-fade-up"
                    style={{
                        background: 'var(--color-navbar-bg)',
                        border: '1px solid var(--color-border)',
                        zIndex: 200,
                    }}
                >
                    <NotificationList
                        items={items}
                        loading={loading}
                        unread={unread}
                        onMarkOne={handleMarkOne}
                        onMarkAll={handleMarkAll}
                    />
                </div>
            )}
        </div>
    );
}
