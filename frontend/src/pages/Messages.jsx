import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Send, Search, Smile, ArrowLeft, Loader2, Check, CheckCheck, Plus, X,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';

/* ── Tasarım ────────────────────────────────────────────── */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const TIER_COLOR = {
    yeni_uye:    'var(--color-text-muted)',
    dogrulayici: 'var(--color-accent-blue)',
    analist:     'var(--color-accent-amber)',
    dedektif:    'var(--color-brand-primary)',
};

const EMOJIS = [
    '😀','😂','🥲','😍','🤔','😮','😢','😡','👍','👎',
    '❤️','🔥','✅','❌','⚡','🎯','💡','🛡️','📰','🔍',
    '👀','🙏','💪','🤝','👋','🎉','🚀','⚠️','📌','💬',
    '😎','🥳','😴','🤯','🫡','💀','👻','🫶','🧠','🕵️',
];

function timeStr(d) {
    const now = new Date();
    const dt  = new Date(d);
    if (now.toDateString() === dt.toDateString())
        return dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function Avatar({ user, size = 36 }) {
    const c = ['rgba(16,185,129,0.15)','rgba(59,130,246,0.15)','rgba(245,158,11,0.15)','rgba(239,68,68,0.15)'];
    const t = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444'];
    const i = (user?.username?.charCodeAt(0) ?? 0) % c.length;
    return (
        <div className="rounded-full overflow-hidden flex items-center justify-center font-mono font-black shrink-0"
             style={{ width: size, height: size, background: c[i], color: t[i],
                      fontSize: size * 0.38, border: `2px solid ${t[i]}40`, minWidth: size }}>
            {user?.avatar_url
                ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover"
                       onError={e => { e.currentTarget.style.display = 'none'; }} />
                : (user?.username?.[0] ?? '?').toUpperCase()
            }
        </div>
    );
}

/* ── Emoji Picker ────────────────────────────────────────── */
function EmojiPicker({ onSelect, onClose }) {
    const ref = useRef(null);
    useEffect(() => {
        const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [onClose]);
    return (
        <div ref={ref}
             className="absolute bottom-full mb-2 left-0 z-50 border p-3 shadow-xl"
             style={S} onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-10 gap-1">
                {EMOJIS.map(e => (
                    <button key={e} onClick={() => onSelect(e)}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 transition-colors">
                        {e}
                    </button>
                ))}
            </div>
        </div>
    );
}


/* ── Mesaj balonu ────────────────────────────────────────── */
function MessageBubble({ msg, isMine }) {
    const isGif   = msg.msg_type === 'gif';
    const isEmoji = msg.msg_type === 'emoji';
    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
            {isGif ? (
                <div className={`max-w-[240px] overflow-hidden ${isMine ? 'ml-16' : 'mr-16'}`}
                     style={{ border: '1px solid var(--color-terminal-border-raw)' }}>
                    <img src={msg.content} alt="gif" className="w-full" />
                    <p className="font-mono text-[9px] px-2 py-1 text-right"
                       style={{ color: 'var(--color-text-muted)' }}>
                        {timeStr(msg.created_at)}
                    </p>
                </div>
            ) : isEmoji ? (
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <span className="text-4xl leading-none">{msg.content}</span>
                    <span className="font-mono text-[9px] mt-0.5"
                          style={{ color: 'var(--color-text-muted)' }}>
                        {timeStr(msg.created_at)}
                    </span>
                </div>
            ) : (
                <div className={`max-w-[75%] px-4 py-2.5 ${isMine ? 'ml-16' : 'mr-16'}`}
                     style={{
                         background: isMine ? 'var(--color-brand-primary)' : 'var(--color-bg-base)',
                         border: isMine ? 'none' : '1px solid var(--color-terminal-border-raw)',
                         color: isMine ? '#070f12' : 'var(--color-text-primary)',
                     }}>
                    <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                    </p>
                    <p className={`font-mono text-[9px] mt-1 text-right ${isMine ? 'opacity-60' : ''}`}
                       style={{ color: isMine ? '#070f12' : 'var(--color-text-muted)' }}>
                        {timeStr(msg.created_at)}
                        {isMine && (msg.is_read
                            ? <CheckCheck className="w-2.5 h-2.5 inline ml-1" />
                            : <Check className="w-2.5 h-2.5 inline ml-1 opacity-50" />
                        )}
                    </p>
                </div>
            )}
        </div>
    );
}

/* ── Konuşma listesi öğesi ───────────────────────────────── */
function ConvItem({ conv, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b text-left transition-colors hover:bg-white/5"
            style={{
                ...BD,
                background: active ? 'rgba(16,185,129,0.06)' : 'transparent',
                borderLeft: active ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
            }}
        >
            <div className="relative shrink-0">
                <Avatar user={{ username: conv.partner_name, avatar_url: conv.partner_avatar }} size={38} />
                {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-black"
                          style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}>
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold truncate"
                          style={{ color: conv.unread_count > 0 ? 'var(--color-brand-primary)' : 'var(--color-text-primary)' }}>
                        {conv.partner_name}
                    </span>
                    <span className="font-mono text-[9px] shrink-0 ml-2"
                          style={{ color: 'var(--color-text-muted)' }}>
                        {timeStr(conv.last_at)}
                    </span>
                </div>
                <p className="font-mono text-xs truncate mt-0.5"
                   style={{ color: 'var(--color-text-muted)', fontWeight: conv.unread_count > 0 ? 700 : 400 }}>
                    {conv.last_msg_type === 'gif' ? '🖼️ GIF' : conv.last_message}
                </p>
            </div>
        </button>
    );
}

/* ── Yeni konuşma — kişi arama ──────────────────────────── */
function NewConversation({ onSelect, onClose }) {
    const [query,   setQuery]   = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const ref      = useRef(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await axiosInstance.get('/users/search', { params: { q: query, size: 10 } });
                setResults(data.items ?? []);
            } catch { /* sessiz */ }
            finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    return (
        <div className="absolute inset-0 z-20 flex flex-col" style={S}>
            {/* Başlık */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={BD}>
                <button onClick={onClose} className="p-1 transition-opacity hover:opacity-60"
                        style={{ color: 'var(--color-text-muted)' }}>
                    <X className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs tracking-widest uppercase flex-1"
                      style={{ color: 'var(--color-brand-primary)' }}>// YENİ MESAJ</span>
            </div>

            {/* Arama */}
            <div className="px-3 py-2 border-b" style={BD}>
                <div className="flex items-center gap-2 border px-3 py-2"
                     style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-bg-base)' }}>
                    <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Kullanıcı adı ara..."
                        className="flex-1 bg-transparent font-mono text-sm outline-none"
                        style={{ color: 'var(--color-text-primary)' }}
                    />
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0"
                                        style={{ color: 'var(--color-brand-primary)' }} />}
                </div>
            </div>

            {/* Sonuçlar */}
            <div className="flex-1 overflow-y-auto">
                {results.length === 0 && query.trim() && !loading ? (
                    <p className="font-mono text-xs text-center pt-8"
                       style={{ color: 'var(--color-text-muted)' }}>
                        // kullanıcı bulunamadı
                    </p>
                ) : results.map(u => (
                    <button
                        key={u.id}
                        onClick={() => onSelect(u)}
                        className="w-full flex items-center gap-3 px-4 py-3 border-b text-left transition-colors hover:bg-white/5"
                        style={BD}
                    >
                        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-mono font-black shrink-0"
                             style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid var(--color-brand-primary)',
                                      color: 'var(--color-brand-primary)', fontSize: 14 }}>
                            {u.avatar_url
                                ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                                : u.username[0].toUpperCase()
                            }
                        </div>
                        <div className="min-w-0">
                            <p className="font-mono text-sm font-bold truncate"
                               style={{ color: 'var(--color-text-primary)' }}>{u.username}</p>
                            <p className="font-mono text-[10px]"
                               style={{ color: TIER_COLOR[u.trust_tier] ?? 'var(--color-text-muted)' }}>
                                {'★'.repeat(u.trust_stars)} {u.trust_label}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Ana bileşen ─────────────────────────────────────────── */
export default function Messages() {
    const { userId: paramUserId } = useParams();
    const { user: me }            = useAuth();
    const { subscribe }           = useWebSocket();
    const navigate                = useNavigate();

    const [conversations, setConversations] = useState([]);
    const [convLoad,      setConvLoad]      = useState(true);
    const [activeId,      setActiveId]      = useState(paramUserId ?? null);
    const [partner,       setPartner]       = useState(null);
    const [messages,      setMessages]      = useState([]);
    const [msgLoad,       setMsgLoad]       = useState(false);
    const [text,          setText]          = useState('');
    const [sending,       setSending]       = useState(false);
    const [showEmoji,     setShowEmoji]     = useState(false);
    const [showNewConv,   setShowNewConv]   = useState(false);
    const [convSearch,    setConvSearch]    = useState('');

    const bottomRef = useRef(null);
    const inputRef  = useRef(null);

    /* Konuşmaları yükle */
    const loadConversations = useCallback(async () => {
        setConvLoad(true);
        try {
            const { data } = await axiosInstance.get('/messages/conversations');
            setConversations(data.conversations ?? []);
        } catch { /* sessiz */ }
        finally { setConvLoad(false); }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    /* Sohbet yükle */
    const loadConversation = useCallback(async (uid) => {
        if (!uid) return;
        setMsgLoad(true);
        try {
            const { data } = await axiosInstance.get(`/messages/${uid}`);
            setMessages(data.messages ?? []);
            setPartner(data.partner);
            // Okunmamış badge güncelle
            setConversations(prev => prev.map(c =>
                c.partner_id === uid ? { ...c, unread_count: 0 } : c
            ));
        } catch { /* sessiz */ }
        finally { setMsgLoad(false); }
    }, []);

    useEffect(() => {
        if (activeId) loadConversation(activeId);
    }, [activeId, loadConversation]);

    /* Eğer paramUserId yeni bir konuşma başlatıyorsa */
    useEffect(() => {
        if (paramUserId && paramUserId !== activeId) {
            setActiveId(paramUserId);
        }
    }, [paramUserId]);

    /* Alt'a scroll */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /* WebSocket — yeni mesaj gelince */
    useEffect(() => {
        const unsub = subscribe('dm.new_message', (payload) => {
            if (payload.sender_id === activeId) {
                // Aktif sohbetteyiz — mesajı ekle
                setMessages(prev => [...prev, {
                    id:          payload.id,
                    sender_id:   payload.sender_id,
                    receiver_id: me?.id,
                    content:     payload.content,
                    msg_type:    payload.msg_type,
                    is_read:     true,
                    created_at:  payload.created_at,
                }]);
            } else {
                // Başka sohbet — unread artır ve conversation listesini güncelle
                setConversations(prev => {
                    const exists = prev.find(c => c.partner_id === payload.sender_id);
                    if (exists) {
                        return prev.map(c => c.partner_id === payload.sender_id
                            ? { ...c, unread_count: (c.unread_count || 0) + 1, last_message: payload.content, last_at: payload.created_at }
                            : c
                        );
                    }
                    // Yeni konuşma
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
            }
        });
        return unsub;
    }, [subscribe, activeId, me?.id]);

    const handleSend = async (content, type = 'text') => {
        if (!content.trim() || !activeId || sending) return;
        setSending(true);
        try {
            const { data } = await axiosInstance.post(`/messages/${activeId}`, {
                content: content.trim(),
                msg_type: type,
            });
            setMessages(prev => [...prev, data]);
            setConversations(prev => {
                const updated = prev.map(c =>
                    c.partner_id === activeId
                        ? { ...c, last_message: data.content, last_msg_type: data.msg_type, last_at: data.created_at }
                        : c
                );
                // Eğer ilk mesajsa conversation listesine ekle
                if (!updated.find(c => c.partner_id === activeId) && partner) {
                    return [{
                        partner_id:     activeId,
                        partner_name:   partner.username,
                        partner_avatar: partner.avatar_url,
                        last_message:   data.content,
                        last_msg_type:  data.msg_type,
                        last_at:        data.created_at,
                        unread_count:   0,
                    }, ...updated];
                }
                return updated;
            });
            setText('');
            inputRef.current?.focus();
        } catch { /* sessiz */ }
        finally { setSending(false); }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(text, 'text');
        }
    };

    const filteredConv = conversations.filter(c =>
        c.partner_name.toLowerCase().includes(convSearch.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto px-2 md:px-4 py-4 h-[calc(100vh-10rem)]">
            <div className="flex h-full gap-0 border overflow-hidden" style={S}>

                {/* ── SOL: Konuşma listesi ── */}
                <div className={`flex flex-col ${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-72 shrink-0 relative`}
                     style={{ borderRight: '1px solid var(--color-terminal-border-raw)' }}>

                    {/* Yeni konuşma overlay */}
                    {showNewConv && (
                        <NewConversation
                            onClose={() => setShowNewConv(false)}
                            onSelect={u => {
                                setShowNewConv(false);
                                setActiveId(u.id);
                                navigate(`/messages/${u.id}`, { replace: true });
                            }}
                        />
                    )}

                    {/* Başlık */}
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                        <span className="font-mono text-xs tracking-widest uppercase"
                              style={{ color: 'var(--color-brand-primary)' }}>// MESAJLAR</span>
                        <button
                            onClick={() => setShowNewConv(true)}
                            className="p-1.5 transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)', border: '1px solid rgba(16,185,129,0.30)' }}
                            title="Yeni mesaj"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Arama */}
                    <div className="px-3 py-2 border-b" style={BD}>
                        <div className="flex items-center gap-2 border px-3 py-2"
                             style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-bg-base)' }}>
                            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                            <input
                                value={convSearch}
                                onChange={e => setConvSearch(e.target.value)}
                                placeholder="Kişi ara..."
                                className="flex-1 bg-transparent font-mono text-xs outline-none"
                                style={{ color: 'var(--color-text-primary)' }}
                            />
                        </div>
                    </div>

                    {/* Liste */}
                    <div className="flex-1 overflow-y-auto">
                        {convLoad ? (
                            <div className="p-6 flex justify-center">
                                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                            </div>
                        ) : filteredConv.length === 0 ? (
                            <div className="p-6 text-center">
                                <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    // henüz mesaj yok
                                </p>
                            </div>
                        ) : filteredConv.map(c => (
                            <ConvItem
                                key={c.partner_id}
                                conv={c}
                                active={activeId === c.partner_id}
                                onClick={() => {
                                    setActiveId(c.partner_id);
                                    navigate(`/messages/${c.partner_id}`, { replace: true });
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* ── SAĞ: Sohbet alanı ── */}
                {activeId && partner ? (
                    <div className="flex-1 flex flex-col min-w-0">

                        {/* Sohbet başlığı */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b" style={BD}>
                            <button
                                onClick={() => { setActiveId(null); navigate('/messages', { replace: true }); }}
                                className="md:hidden p-1 transition-opacity hover:opacity-60"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <Link to={`/users/${partner.id}`}>
                                <Avatar user={partner} size={32} />
                            </Link>
                            <Link to={`/users/${partner.id}`}
                                  className="font-mono text-sm font-bold transition-colors hover:text-brand hover:underline"
                                  style={{ color: 'var(--color-text-primary)' }}>
                                {partner.username}
                            </Link>
                        </div>

                        {/* Mesajlar */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            {msgLoad ? (
                                <div className="flex justify-center pt-10">
                                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <Avatar user={partner} size={56} />
                                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                        // {partner.username} ile ilk mesajı gönder
                                    </p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <MessageBubble
                                        key={msg.id}
                                        msg={msg}
                                        isMine={msg.sender_id === me?.id}
                                    />
                                ))
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input alanı */}
                        <div className="px-4 py-3 border-t relative" style={BD}>
                            {showEmoji && (
                                <EmojiPicker
                                    onSelect={e => { handleSend(e, 'emoji'); setShowEmoji(false); }}
                                    onClose={() => setShowEmoji(false)}
                                />
                            )}
                            <div className="flex items-end gap-2">
                                <button
                                    onClick={() => setShowEmoji(v => !v)}
                                    className="p-2 transition-opacity hover:opacity-70 shrink-0"
                                    style={{ color: showEmoji ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
                                    title="Emoji"
                                >
                                    <Smile className="w-5 h-5" />
                                </button>
                                <textarea
                                    ref={inputRef}
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Mesaj yaz... (Enter gönder, Shift+Enter yeni satır)"
                                    rows={1}
                                    className="flex-1 bg-transparent font-mono text-sm outline-none resize-none border px-3 py-2"
                                    style={{
                                        borderColor: 'var(--color-terminal-border-raw)',
                                        color: 'var(--color-text-primary)',
                                        maxHeight: 120,
                                        lineHeight: 1.5,
                                        background: 'var(--color-bg-base)',
                                    }}
                                    onInput={e => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                    }}
                                />
                                <button
                                    onClick={() => handleSend(text, 'text')}
                                    disabled={!text.trim() || sending}
                                    className="p-2.5 transition-opacity hover:opacity-80 disabled:opacity-30 shrink-0"
                                    style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                                >
                                    {sending
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Send className="w-4 h-4" />
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                ) : activeId && !partner && !msgLoad ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                    </div>
                ) : (
                    <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 flex items-center justify-center"
                             style={{ border: '2px solid var(--color-brand-primary)', background: 'rgba(16,185,129,0.06)' }}>
                            <Send className="w-7 h-7" style={{ color: 'var(--color-brand-primary)' }} />
                        </div>
                        <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            // bir konuşma seç veya yeni başlat
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
