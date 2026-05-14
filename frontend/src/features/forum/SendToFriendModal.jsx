import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Users, Send, Check, Loader2, Search } from 'lucide-react';
import axiosInstance from '../../api/axios';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

function Avatar({ username }) {
    const pals = ['rgba(16,185,129,0.15)', 'rgba(59,130,246,0.15)', 'rgba(245,158,11,0.15)'];
    const cols = ['var(--color-brand-primary)', 'var(--color-accent-blue)', 'var(--color-accent-amber)'];
    const idx  = (username?.charCodeAt(0) ?? 0) % pals.length;
    return (
        <div
            className="w-8 h-8 flex items-center justify-center font-mono font-black text-sm shrink-0"
            style={{ background: pals[idx], color: cols[idx], border: `1px solid ${cols[idx]}30`, minWidth: 32, minHeight: 32 }}
        >
            {(username?.[0] ?? '?').toUpperCase()}
        </div>
    );
}

const SendToFriendModal = ({ threadTitle, threadUrl, onClose }) => {
    const [query,      setQuery]      = useState('');
    const [users,      setUsers]      = useState([]);
    const [loading,    setLoading]    = useState(false);
    const [sent,       setSent]       = useState({});
    const [visible,    setVisible]    = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => { setVisible(true); inputRef.current?.focus(); }, 20);
        document.body.style.overflow = 'hidden';
        return () => { clearTimeout(t); document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []); // eslint-disable-line

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const search = useCallback(async (q) => {
        if (!q.trim()) { setUsers([]); return; }
        setLoading(true);
        try {
            const { data } = await axiosInstance.get('/users/search', { params: { q, page: 1, size: 10 } });
            setUsers(data.items ?? []);
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => search(query), 300);
        return () => clearTimeout(t);
    }, [query, search]);

    const handleSend = async (userId) => {
        if (sent[userId] === 'sending' || sent[userId] === 'done') return;
        setSent(prev => ({ ...prev, [userId]: 'sending' }));
        const content = `📌 ${threadTitle}\n${threadUrl}`;
        try {
            await axiosInstance.post(`/messages/${userId}`, { content, msg_type: 'text' });
            setSent(prev => ({ ...prev, [userId]: 'done' }));
        } catch {
            setSent(prev => ({ ...prev, [userId]: 'error' }));
        }
    };

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[300]"
                style={{
                    background: visible ? 'rgba(0,0,0,0.70)' : 'rgba(0,0,0,0)',
                    transition: 'background 0.18s ease',
                }}
                onClick={handleClose}
            />
            <div className="fixed inset-0 z-[301] flex items-start justify-center pt-[80px] px-4 pointer-events-none">
                <div
                    className="w-full max-w-sm pointer-events-auto flex flex-col overflow-hidden relative"
                    style={{
                        ...TS,
                        border: '1px solid var(--color-terminal-border-raw)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.80)',
                        maxHeight: '70vh',
                        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
                        opacity:   visible ? 1 : 0,
                        transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), opacity 0.18s ease',
                    }}
                >
                    <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
                    <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
                    <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={BD}>
                        <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-primary)' }} />
                            <span className="font-mono text-xs font-bold tracking-widest uppercase"
                                  style={{ color: 'var(--color-brand-primary)' }}>
                                // arkadaşa_gönder
                            </span>
                        </div>
                        <button
                            onClick={handleClose}
                            className="font-mono text-xs transition-opacity hover:opacity-60"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            [✕]
                        </button>
                    </div>

                    {/* Arama kutusu */}
                    <div className="px-4 py-3 border-b flex-shrink-0" style={BD}>
                        <div className="flex items-center gap-2 border px-3 py-2" style={BD}>
                            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="kullanıcı ara..."
                                className="flex-1 bg-transparent outline-none font-mono text-sm"
                                style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                            />
                            {loading && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0"
                                         style={{ color: 'var(--color-text-muted)' }} />
                            )}
                        </div>
                    </div>

                    {/* Kullanıcı listesi */}
                    <div className="overflow-y-auto flex-1">
                        {!query.trim() && (
                            <p className="font-mono text-xs text-center py-8"
                               style={{ color: 'var(--color-text-muted)' }}>
                                // kullanıcı adı yaz
                            </p>
                        )}
                        {query.trim() && !loading && users.length === 0 && (
                            <p className="font-mono text-xs text-center py-8"
                               style={{ color: 'var(--color-text-muted)' }}>
                                // kullanıcı bulunamadı
                            </p>
                        )}
                        {users.map(u => (
                            <div
                                key={u.id}
                                className="flex items-center gap-3 px-4 py-3 border-b"
                                style={BD}
                            >
                                <Avatar username={u.username} />
                                <span className="flex-1 font-mono text-sm truncate"
                                      style={{ color: 'var(--color-text-primary)' }}>
                                    {u.username}
                                </span>
                                <button
                                    onClick={() => handleSend(u.id)}
                                    disabled={sent[u.id] === 'sending' || sent[u.id] === 'done'}
                                    className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-60 shrink-0"
                                    style={
                                        sent[u.id] === 'done'
                                            ? { background: 'rgba(16,185,129,0.15)', color: 'var(--color-brand-primary)', border: '1px solid rgba(16,185,129,0.30)' }
                                        : sent[u.id] === 'error'
                                            ? { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.30)' }
                                        : { background: 'var(--color-brand-primary)', color: '#070f12' }
                                    }
                                >
                                    {sent[u.id] === 'sending' && <Loader2 className="w-3 h-3 animate-spin" />}
                                    {sent[u.id] === 'done'    && <Check   className="w-3 h-3" />}
                                    {sent[u.id] === 'error'   && <Send    className="w-3 h-3" />}
                                    {!sent[u.id]              && <Send    className="w-3 h-3" />}
                                    {sent[u.id] === 'done'  ? 'Gönderildi'
                                     : sent[u.id] === 'error' ? 'Tekrar Dene'
                                     : 'Gönder'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default SendToFriendModal;
