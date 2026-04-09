import React, { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../api/axios';

export default function NotificationDropdown({ onClose }) {
    const [items,   setItems]   = useState([]);
    const [unread,  setUnread]  = useState(0);
    const [loading, setLoading] = useState(true);
    const ref = useRef(null);

    useEffect(() => {
        axiosInstance.get('/notifications')
            .then(r => { setItems(r.data.items); setUnread(r.data.unread_count); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const markRead = async (id) => {
        await axiosInstance.patch(`/notifications/${id}/read`).catch(() => {});
        setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnread(prev => Math.max(0, prev - 1));
    };

    return (
        <div ref={ref}
             className="absolute right-0 top-10 w-80 bg-surface border border-brutal-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-brutal-border flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-tx-secondary">Bildirimler</span>
                {unread > 0 && (
                    <span className="text-[10px] font-bold text-brand">{unread} okunmamış</span>
                )}
            </div>
            <div className="max-h-80 overflow-y-auto">
                {loading && (
                    <div className="p-4 text-xs text-tx-secondary text-center">Yükleniyor…</div>
                )}
                {!loading && items.length === 0 && (
                    <div className="p-4 text-xs text-tx-secondary text-center opacity-50">Bildirim yok</div>
                )}
                {items.map(n => (
                    <button
                        key={n.id}
                        onClick={() => {
                            markRead(n.id);
                            if (n.link_url) window.location.href = n.link_url;
                        }}
                        className={`w-full text-left px-4 py-3 border-b border-brutal-border last:border-0 transition-colors
                            ${n.is_read ? 'opacity-50' : 'bg-brand/5 hover:bg-brand/10'}`}
                    >
                        <p className="text-xs font-bold text-tx-primary">{n.title}</p>
                        {n.body && (
                            <p className="text-[10px] text-tx-secondary mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
