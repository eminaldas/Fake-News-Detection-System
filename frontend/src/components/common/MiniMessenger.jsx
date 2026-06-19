import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ChevronDown, Loader2, Plus } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

function ConvAvatar({ conv }) {
    return (
        <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-xs shrink-0 overflow-hidden"
            style={{
                background: 'rgba(16,185,129,0.10)',
                color: 'var(--color-brand-primary)',
                border: '1.5px solid rgba(16,185,129,0.30)',
            }}
        >
            {conv.partner_avatar
                ? <img src={conv.partner_avatar} className="w-full h-full object-cover" alt=""
                       referrerPolicy="no-referrer" />
                : (conv.partner_name?.[0] ?? '?').toUpperCase()
            }
        </div>
    );
}

export default function MiniMessenger() {
    const { isAuthenticated } = useAuth();
    const { subscribe }       = useWebSocket();
    const [open,          setOpen]          = useState(false);
    const [conversations, setConversations] = useState([]);
    const [unread,        setUnread]        = useState(0);
    const [loading,       setLoading]       = useState(false);
    const ref        = useRef(null);
    const loadedRef  = useRef(false);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        axiosInstance.get('/messages/unread-count')
            .then(r => setUnread(r.data.count ?? 0))
            .catch(() => {});
    }, [isAuthenticated]);

    useEffect(() => {
        if (!open) return;
        if (loadedRef.current) return;
        loadedRef.current = true;
        setLoading(true);
        axiosInstance.get('/messages/conversations')
            .then(r => setConversations(r.data.conversations ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [open]);

    useEffect(() => {
        const unsub = subscribe('dm.new_message', (payload) => {
            setUnread(v => v + 1);
            setConversations(prev => {
                const exists = prev.find(c => c.partner_id === payload.sender_id);
                if (exists) {
                    return prev.map(c =>
                        c.partner_id === payload.sender_id
                            ? { ...c, unread_count: (c.unread_count || 0) + 1, last_message: payload.content, last_at: payload.created_at }
                            : c
                    );
                }
                return [{
                    partner_id:     payload.sender_id,
                    partner_name:   payload.sender_name,
                    partner_avatar: payload.sender_avatar,
                    last_message:   payload.content,
                    last_msg_type:  payload.msg_type,
                    last_at:        payload.created_at,
                    unread_count:   1,
                }, ...prev];
            });
        });
        return unsub;
    }, [subscribe]);

    if (!isAuthenticated) return null;

    const handleConvClick = (conv) => {
        setOpen(false);
        if (conv.unread_count > 0) {
            setUnread(p => Math.max(0, p - conv.unread_count));
            setConversations(p => p.map(c =>
                c.partner_id === conv.partner_id ? { ...c, unread_count: 0 } : c
            ));
        }
    };

    return (
        <div ref={ref} className="hidden md:block fixed bottom-10 right-6 z-50" style={{ width: 300 }}>

            {/* Konuşma paneli */}
            {open && (
                <div
                    className="border border-b-0 flex flex-col overflow-hidden animate-fade-up"
                    style={{ ...TS, borderColor: 'var(--color-terminal-border-raw)', maxHeight: 380 }}
                >
                    {/* Panel başlık */}
                    <div className="flex items-center justify-between px-3 py-2 border-b" style={BD}>
                        <span className="font-mono text-[10px] tracking-widest uppercase"
                              style={{ color: 'var(--color-brand-primary)' }}>
                        </span>
                        <Link
                            to="/messages"
                            onClick={() => setOpen(false)}
                            className="p-1 transition-opacity hover:opacity-60"
                            title="Tüm mesajlar"
                            style={{ color: 'var(--color-brand-primary)' }}
                        >
                            <Plus className="w-3 h-3" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="p-5 flex justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-5 text-center space-y-2">
                            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            </p>
                            <Link
                                to="/messages"
                                onClick={() => setOpen(false)}
                                className="font-mono text-[10px] transition-opacity hover:opacity-70"
                                style={{ color: 'var(--color-brand-primary)' }}
                            >
                                Yeni mesaj başlat →
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1">
                            {conversations.slice(0, 7).map(conv => (
                                <Link
                                    key={conv.partner_id}
                                    to={`/messages/${conv.partner_id}`}
                                    onClick={() => handleConvClick(conv)}
                                    className="flex items-center gap-2.5 px-3 py-2.5 border-b transition-colors hover:bg-white/5"
                                    style={BD}
                                >
                                    <ConvAvatar conv={conv} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-xs font-bold truncate"
                                           style={{ color: conv.unread_count > 0 ? 'var(--color-brand-primary)' : 'var(--color-text-primary)' }}>
                                            {conv.partner_name}
                                        </p>
                                        <p className="font-mono text-[10px] truncate"
                                           style={{ color: 'var(--color-text-muted)' }}>
                                            {conv.last_msg_type === 'gif' ? '🖼️ GIF' : (conv.last_message ?? '')}
                                        </p>
                                    </div>
                                    {conv.unread_count > 0 && (
                                        <span
                                            className="w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-black shrink-0"
                                            style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                                        >
                                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                        </span>
                                    )}
                                </Link>
                            ))}
                            <Link
                                to="/messages"
                                onClick={() => setOpen(false)}
                                className="block px-3 py-2.5 text-center font-mono text-[10px] border-t transition-colors hover:bg-white/5"
                                style={{ ...BD, color: 'var(--color-brand-primary)' }}
                            >
                                Tüm mesajları gör →
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Alt başlık çubuğu */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-l border-r transition-all"
                style={{
                    ...TS,
                    borderColor: 'var(--color-terminal-border-raw)',
                    borderTop: open ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-terminal-border-raw)',
                }}
            >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                <span className="font-mono text-xs font-bold flex-1 text-left" style={{ color: 'var(--color-text-primary)' }}>
                    Mesajlar
                </span>
                {unread > 0 && (
                    <span
                        className="font-mono text-[9px] px-1.5 py-0.5 font-black"
                        style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
                <ChevronDown
                    className="w-3 h-3 transition-transform"
                    style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
            </button>
        </div>
    );
}
