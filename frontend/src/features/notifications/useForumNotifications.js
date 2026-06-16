import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axios';
import { useWebSocket } from '../../contexts/WebSocketContext';

export const TYPE_LABELS = {
    new_comment:        'Yorumunuza yeni bir yorum geldi',
    reply:              'Yorumunuza yanıt geldi',
    mention:            'Bir tartışmada bahsedildiniz',
    under_review:       'Tartışmanız inceleme altında',
    fact_check_started: 'Haber kontrolü başlatıldı',
    fact_check_done:    'Haber kontrolü tamamlandı',
    report_ready:       'Tam rapor hazır',
    new_follower:       'Sizi takip eden biri var',
    dm:                 'size mesaj gönderdi',
};

export const TYPE_PREFIX = {
    new_comment:        '💬',
    reply:              '↩',
    mention:            '@',
    under_review:       '🔍',
    fact_check_started: '📰',
    fact_check_done:    '✓',
    report_ready:       '📄',
    new_follower:       '→',
    dm:                 '📩',
};

export function relativeTime(isoString) {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60)    return `${diff}S`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}DK`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}SA`;
    return `${Math.floor(diff / 86400)}G`;
}

export function resolveLink(notif) {
    const p = notif.payload ?? {};
    if (notif.type === 'report_ready' && p.task_id) return `/analysis/report/${p.task_id}`;
    if (notif.type === 'dm' && p.sender_id)         return `/messages/${p.sender_id}`;
    if (notif.type === 'new_follower' && p.actor_id) return `/users/${p.actor_id}`;
    if (p.thread_id)  return `/forum/${p.thread_id}`;
    if (p.article_id) return `/archive/${p.article_id}`;
    return null;
}

/**
 * Forum/DM bildirimleri için durum + aksiyonları kapsayan hook.
 * Hem zil bileşeni hem de profil menüsündeki bildirim bölümü kullanır.
 */
export function useForumNotifications() {
    const [items,   setItems]   = useState([]);
    const [unread,  setUnread]  = useState(0);
    const [loading, setLoading] = useState(false);
    const { subscribe } = useWebSocket();

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
        const unsub = subscribe('dm.new_message', (payload) => {
            setUnread(prev => prev + 1);
            const dmNotif = {
                id:         `dm_${payload.id ?? Date.now()}`,
                type:       'dm',
                payload:    {
                    sender_id:   payload.sender_id,
                    sender_name: payload.sender_name,
                    text:        payload.content,
                },
                read_at:    null,
                created_at: payload.created_at ?? new Date().toISOString(),
            };
            setItems(prev => [dmNotif, ...prev]);
        });
        return unsub;
    }, [subscribe]);

    // İçerik boşsa sunucudan çek (dropdown ilk açılışında).
    const loadIfEmpty = useCallback(() => {
        if (items.length > 0 || loading) return;
        setLoading(true);
        axiosInstance.get('/notifications/forum')
            .then(r => { setItems(r.data.items ?? []); setUnread(r.data.unread ?? 0); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [items.length, loading]);

    // Tek bildirimi okundu işaretler, varsa hedef linki döner.
    const markOne = useCallback(async (notif) => {
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
        return resolveLink(notif);
    }, []);

    const markAll = useCallback(async () => {
        const now = new Date().toISOString();
        setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })));
        setUnread(0);
        try { await axiosInstance.put('/notifications/forum/read-all'); } catch {}
    }, []);

    return { items, unread, loading, loadIfEmpty, markOne, markAll };
}
