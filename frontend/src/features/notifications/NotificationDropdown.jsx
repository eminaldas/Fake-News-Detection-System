import React, { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../api/axios';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

export default function NotificationDropdown({ onClose }) {
    const [items,   setItems]   = useState([]);
    const [unread,  setUnread]  = useState(0);
    const [loading, setLoading] = useState(true);
    const ref = useRef(null);

    useEffect(() => {
        axiosInstance.get('/notifications')
            .then(r => { setItems(r.data.items ?? []); setUnread(r.data.unread_count ?? 0); })
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
             className="absolute right-0 top-10 w-80 overflow-hidden"
             style={{ ...TS, border: '1px solid var(--color-terminal-border-raw)', zIndex: 50,
                      boxShadow: '0 12px 40px rgba(0,0,0,0.70)' }}>
            {/* Köşe aksanları */}
            <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />

            {/* Başlık */}
            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ ...TS, ...BD }}>
                <span className="font-mono text-xs tracking-widest uppercase"
                      style={{ color: 'var(--color-brand-primary)' }}>
                </span>
                {unread > 0 && (
                    <span className="font-mono text-[10px] tracking-wider"
                          style={{ color: 'var(--color-text-muted)' }}>
                        {unread} okunmamış
                    </span>
                )}
            </div>

            {/* Liste */}
            <div className="max-h-80 overflow-y-auto">
                {loading && (
                    <div className="px-4 py-6 text-center">
                        <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        </p>
                    </div>
                )}
                {!loading && items.length === 0 && (
                    <div className="px-4 py-8 text-center">
                        <p className="font-mono text-xs opacity-50" style={{ color: 'var(--color-text-muted)' }}>
                        </p>
                    </div>
                )}
                {items.map((n, idx) => (
                    <button
                        key={n.id}
                        onClick={() => {
                            markRead(n.id);
                            if (n.link_url) window.location.href = n.link_url;
                        }}
                        className={`w-full text-left px-4 py-3 border-l-2 transition-colors hover:bg-brand/5 ${idx < items.length - 1 ? 'border-b' : ''}`}
                        style={{
                            borderColor:     'var(--color-terminal-border-raw)',
                            borderLeftColor: n.is_read ? 'transparent' : 'var(--color-brand-primary)',
                            opacity:         n.is_read ? 0.45 : 1,
                        }}
                    >
                        <p className="font-mono text-xs font-bold leading-snug"
                           style={{ color: 'var(--color-text-primary)' }}>
                            {n.title}
                        </p>
                        {n.body && (
                            <p className="font-mono text-[10px] mt-0.5 line-clamp-2"
                               style={{ color: 'var(--color-text-secondary)' }}>
                                {n.body}
                            </p>
                        )}
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t" style={BD}>
                <span className="font-mono text-[9px] tracking-widest opacity-30"
                      style={{ color: 'var(--color-text-muted)' }}>
                </span>
            </div>
        </div>
    );
}
