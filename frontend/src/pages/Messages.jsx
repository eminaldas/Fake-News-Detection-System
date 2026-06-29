import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Send, Search, Smile, ArrowLeft, Loader2, Check, CheckCheck,
    Plus, X, Reply, Trash2, ExternalLink,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import Avatar from '../features/messages/shared/Avatar';
import { formatDateLabel, timeStr } from '../features/messages/shared/format';
import { extractForumId } from '../features/messages/shared/linkify';
import LinkedText from '../features/messages/shared/LinkedText';
import ForumCard from '../features/messages/components/ForumCard';
import ReplyQuote from '../features/messages/components/ReplyQuote';
import DateSeparator from '../features/messages/components/DateSeparator';
import EmojiPicker, { EMOJIS } from '../features/messages/components/EmojiPicker';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const TIER_COLOR = {
    yeni_uye:    'var(--color-text-muted)',
    dogrulayici: 'var(--color-accent-blue)',
    analist:     'var(--color-accent-amber)',
    dedektif:    'var(--color-brand-primary)',
};


function MessageBubble({ msg, isMine, isFirst, isLast, onReply, onDelete, meId }) {
    const [hover, setHover] = useState(false);
    const isGif   = msg.msg_type === 'gif';
    const isEmoji = msg.msg_type === 'emoji';
    const forumId = !isGif && !isEmoji ? extractForumId(msg.content) : null;
    const mb = isLast ? 'mb-3' : 'mb-0.5';

    const actions = (
        <div className={`absolute top-0 flex items-center gap-1 ${isMine ? 'right-full mr-2' : 'left-full ml-2'}`}
             style={{ opacity: hover ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: hover ? 'auto' : 'none' }}>
            <button onClick={() => onReply(msg)} title="Yanıtla"
                    className="p-1 transition-colors hover:bg-white/10"
                    style={{ color: 'var(--color-text-muted)' }}>
                <Reply className="w-3.5 h-3.5" />
            </button>
            {isMine && (
                <button onClick={() => onDelete(msg.id)} title="Sil"
                        className="p-1 transition-colors hover:bg-white/10"
                        style={{ color: '#ef4444' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );

    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${mb} px-4`}
             onMouseEnter={() => setHover(true)}
             onMouseLeave={() => setHover(false)}>
            {isGif ? (
                <div className={`max-w-60 overflow-hidden relative ${isMine ? 'ml-16' : 'mr-16'}`}
                     style={{ border: '1px solid var(--color-terminal-border-raw)' }}>
                    {actions}
                    <img src={msg.content} alt="gif" className="w-full" />
                    {isLast && (
                        <p className="font-mono text-[9px] px-2 py-1 text-right"
                           style={{ color: 'var(--color-text-muted)' }}>
                            {timeStr(msg.created_at)}
                        </p>
                    )}
                </div>
            ) : isEmoji ? (
                <div className={`flex flex-col relative ${isMine ? 'items-end' : 'items-start'}`}>
                    {actions}
                    <span className="text-4xl leading-none">{msg.content}</span>
                    {isLast && (
                        <span className="font-mono text-[9px] mt-0.5"
                              style={{ color: 'var(--color-text-muted)' }}>
                            {timeStr(msg.created_at)}
                        </span>
                    )}
                </div>
            ) : (
                <div className={`max-w-[72%] relative ${isMine ? 'ml-16' : 'mr-16'}`}>
                    {actions}
                    <div className="px-3.5 py-2.5"
                         style={{
                             background:   isMine ? 'var(--color-brand-primary)' : 'var(--color-bg-base)',
                             border:       isMine ? 'none' : '1px solid var(--color-terminal-border-raw)',
                             color:        isMine ? '#070f12' : 'var(--color-text-primary)',
                             borderRadius: isMine
                                 ? `${isFirst ? 8 : 2}px 8px 8px ${isLast ? 8 : 2}px`
                                 : `8px ${isFirst ? 8 : 2}px ${isLast ? 8 : 2}px 8px`,
                         }}>
                        {msg.reply_to && (
                            <ReplyQuote replyTo={msg.reply_to} isMine={isMine} meId={meId} />
                        )}
                        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                            <LinkedText text={msg.content} />
                        </p>
                        {forumId && <ForumCard threadId={forumId} isMine={isMine} />}
                    </div>
                    {isLast && (
                        <p className={`font-mono text-[9px] mt-1 flex items-center gap-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                           style={{ color: 'var(--color-text-muted)' }}>
                            {timeStr(msg.created_at)}
                            {isMine && (msg.is_read
                                ? <CheckCheck className="w-2.5 h-2.5" />
                                : <Check className="w-2.5 h-2.5 opacity-40" />
                            )}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

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

function NewConversation({ onSelect, onClose }) {
    const [query,   setQuery]   = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

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
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={BD}>
                <button onClick={onClose} className="p-1 transition-opacity hover:opacity-60"
                        style={{ color: 'var(--color-text-muted)' }}>
                    <X className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs tracking-widest uppercase flex-1"
                      style={{ color: 'var(--color-brand-primary)' }}>// YENİ MESAJ</span>
            </div>
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
            <div className="flex-1 overflow-y-auto">
                {results.length === 0 && query.trim() && !loading ? (
                    <p className="font-mono text-xs text-center pt-8"
                       style={{ color: 'var(--color-text-muted)' }}>// kullanıcı bulunamadı</p>
                ) : results.map(u => (
                    <button key={u.id} onClick={() => onSelect(u)}
                            className="w-full flex items-center gap-3 px-4 py-3 border-b text-left transition-colors hover:bg-white/5"
                            style={BD}>
                        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-mono font-black shrink-0"
                             style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid var(--color-brand-primary)',
                                      color: 'var(--color-brand-primary)', fontSize: 14 }}>
                            {u.avatar_url
                                ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover"
                                       referrerPolicy="no-referrer" />
                                : u.username[0].toUpperCase()
                            }
                        </div>
                        <div className="min-w-0">
                            <p className="font-mono text-sm font-bold truncate"
                               style={{ color: 'var(--color-text-primary)' }}>{u.username}</p>
                            <p className="font-mono text-[10px]"
                               style={{ color: TIER_COLOR[u.trust_tier] ?? 'var(--color-text-muted)' }}>
                                {'★'.repeat(u.trust_stars ?? 0)} {u.trust_label}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

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
    const [replyTo,       setReplyTo]       = useState(null); // yanıt verilen mesaj

    const msgContainerRef = useRef(null);
    const inputRef        = useRef(null);
    const convReqIdRef    = useRef(0);

    const loadConversations = useCallback(async (silent = false) => {
        const reqId = ++convReqIdRef.current;
        if (!silent) setConvLoad(true);
        try {
            const { data } = await axiosInstance.get('/messages/conversations');
            if (reqId !== convReqIdRef.current) return;
            setConversations(data.conversations ?? []);
        } catch { /* sessiz */ }
        finally { if (reqId === convReqIdRef.current) setConvLoad(false); }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    const loadConversation = useCallback(async (uid) => {
        if (!uid) return;
        setMsgLoad(true);
        try {
            const { data } = await axiosInstance.get(`/messages/${uid}`);
            setMessages(data.messages ?? []);
            setPartner(data.partner);
            setConversations(prev => prev.map(c =>
                c.partner_id === uid ? { ...c, unread_count: 0 } : c
            ));
        } catch { /* sessiz */ }
        finally { setMsgLoad(false); }
    }, []);

    useEffect(() => {
        if (activeId) loadConversation(activeId);
    }, [activeId, loadConversation]);

    useEffect(() => {
        if (paramUserId && paramUserId !== activeId) setActiveId(paramUserId);
    }, [paramUserId, activeId]);

    useEffect(() => {
        const el = msgContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    useEffect(() => {
        const unsub = subscribe('dm.new_message', (payload) => {
            if (payload.sender_id === activeId) {
                setMessages(prev => [...prev, {
                    id:          payload.id,
                    sender_id:   payload.sender_id,
                    receiver_id: me?.id,
                    content:     payload.content,
                    msg_type:    payload.msg_type,
                    is_read:     true,
                    reply_to_id: payload.reply_to_id ?? null,
                    reply_to:    payload.reply_to ?? null,
                    created_at:  payload.created_at,
                }]);
            } else {
                setConversations(prev => {
                    const exists = prev.find(c => c.partner_id === payload.sender_id);
                    if (exists) {
                        return prev.map(c => c.partner_id === payload.sender_id
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
            }
        });
        return unsub;
    }, [subscribe, activeId, me?.id]);

    const handleSend = async (content, type = 'text') => {
        if (!content.trim() || !activeId || sending) return;
        setSending(true);
        try {
            const { data } = await axiosInstance.post(`/messages/${activeId}`, {
                content:     content.trim(),
                msg_type:    type,
                reply_to_id: replyTo?.id ?? null,
            });
            setMessages(prev => [...prev, data]);
            setConversations(prev => {
                const updated = prev.map(c =>
                    c.partner_id === activeId
                        ? { ...c, last_message: data.content, last_msg_type: data.msg_type, last_at: data.created_at }
                        : c
                );
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
            setReplyTo(null);
            if (inputRef.current) inputRef.current.style.height = 'auto';
            inputRef.current?.focus();
            loadConversations(true);
        } catch { /* sessiz */ }
        finally { setSending(false); }
    };

    const handleDelete = useCallback(async (messageId) => {
        try {
            await axiosInstance.delete(`/messages/${messageId}`);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch { /* sessiz */ }
    }, []);

    const handleEmojiInsert = useCallback((emoji) => {
        const ta = inputRef.current;
        if (!ta) { setText(prev => prev + emoji); setShowEmoji(false); return; }
        const start   = ta.selectionStart ?? text.length;
        const end     = ta.selectionEnd   ?? text.length;
        const newText = text.slice(0, start) + emoji + text.slice(end);
        setText(newText);
        requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = start + emoji.length;
            ta.focus();
        });
        setShowEmoji(false);
    }, [text]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(text, 'text');
        }
        if (e.key === 'Escape' && replyTo) {
            setReplyTo(null);
        }
    };

    const enrichedMessages = useMemo(() => {
        return messages.map((msg, idx) => {
            const prev    = messages[idx - 1];
            const next    = messages[idx + 1];
            const msgDay  = new Date(msg.created_at).toDateString();
            const prevDay = prev ? new Date(prev.created_at).toDateString() : null;
            const nextDay = next ? new Date(next.created_at).toDateString() : null;
            const isFirst = !prev || prev.sender_id !== msg.sender_id || prevDay !== msgDay;
            const isLast  = !next || next.sender_id !== msg.sender_id || nextDay !== msgDay;
            const showDateSep = !prev || prevDay !== msgDay;
            return { ...msg, isFirst, isLast, showDateSep };
        });
    }, [messages]);

    const filteredConv = conversations.filter(c =>
        c.partner_name.toLowerCase().includes(convSearch.toLowerCase())
    );

    return (
        <>
            <style>{`.msg-textarea::-webkit-scrollbar { display: none; }`}</style>

            {/* pt-32=8rem mobile, pt-36=9rem md+, NewsTicker gizli */}
            <div className="h-[calc(100dvh-8rem)] md:h-[calc(100dvh-9rem)]">
                <div className="flex h-full overflow-hidden border" style={S}>

                    {/* ── SOL: Konuşma listesi ── */}
                    <div className={`flex flex-col ${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-72 shrink-0 relative`}
                         style={{ borderRight: '1px solid var(--color-terminal-border-raw)' }}>

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

                        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0" style={BD}>
                            <span className="font-mono text-xs tracking-widest uppercase"
                                  style={{ color: 'var(--color-brand-primary)' }}>// MESAJLAR</span>
                            <button onClick={() => setShowNewConv(true)}
                                    className="p-1.5 transition-opacity hover:opacity-70"
                                    style={{ color: 'var(--color-brand-primary)', border: '1px solid rgba(16,185,129,0.30)' }}>
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="px-3 py-2 border-b shrink-0" style={BD}>
                            <div className="flex items-center gap-2 border px-3 py-2"
                                 style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-bg-base)' }}>
                                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                                <input value={convSearch} onChange={e => setConvSearch(e.target.value)}
                                       placeholder="Kişi ara..."
                                       className="flex-1 bg-transparent font-mono text-xs outline-none"
                                       style={{ color: 'var(--color-text-primary)' }} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0">
                            {convLoad ? (
                                <div className="p-6 flex justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                                </div>
                            ) : filteredConv.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    </p>
                                </div>
                            ) : filteredConv.map(c => (
                                <ConvItem key={c.partner_id} conv={c} active={activeId === c.partner_id}
                                          onClick={() => {
                                              setActiveId(c.partner_id);
                                              navigate(`/messages/${c.partner_id}`, { replace: true });
                                          }} />
                            ))}
                        </div>
                    </div>

                    {/* ── SAĞ: Sohbet alanı ── */}
                    {activeId && partner ? (
                        <div className="flex-1 flex flex-col min-w-0">

                            {/* Başlık */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={BD}>
                                <button onClick={() => { setActiveId(null); navigate('/messages', { replace: true }); }}
                                        className="md:hidden p-1 transition-opacity hover:opacity-60"
                                        style={{ color: 'var(--color-text-muted)' }}>
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <Link to={`/users/${partner.id}`}>
                                    <Avatar user={partner} size={32} />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/users/${partner.id}`}
                                          className="font-mono text-sm font-bold transition-opacity hover:opacity-70 block truncate"
                                          style={{ color: 'var(--color-text-primary)' }}>
                                        {partner.username}
                                    </Link>
                                    {partner.trust_label && (
                                        <p className="font-mono text-[10px]"
                                           style={{ color: TIER_COLOR[partner.trust_tier] ?? 'var(--color-text-muted)' }}>
                                            {partner.trust_label}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Mesajlar */}
                            <div ref={msgContainerRef} className="flex-1 overflow-y-auto min-h-0 py-3">
                                {msgLoad ? (
                                    <div className="flex justify-center pt-10">
                                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
                                        <Avatar user={partner} size={56} />
                                        <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                        </p>
                                    </div>
                                ) : (
                                    enrichedMessages.map(msg => (
                                        <React.Fragment key={msg.id}>
                                            {msg.showDateSep && <DateSeparator label={formatDateLabel(msg.created_at)} />}
                                            <MessageBubble
                                                msg={msg}
                                                isMine={msg.sender_id === me?.id}
                                                isFirst={msg.isFirst}
                                                isLast={msg.isLast}
                                                onReply={setReplyTo}
                                                onDelete={handleDelete}
                                                meId={me?.id}
                                            />
                                        </React.Fragment>
                                    ))
                                )}
                            </div>

                            {/* Input alanı */}
                            <div className="border-t shrink-0" style={BD}>
                                {/* Yanıt şeridi */}
                                {replyTo && (
                                    <div className="px-4 pt-2 pb-1 flex items-start gap-2 border-b"
                                         style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'rgba(16,185,129,0.04)' }}>
                                        <Reply className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono text-[9px] uppercase tracking-widest"
                                               style={{ color: 'var(--color-brand-primary)' }}>
                                                {replyTo.sender_id === me?.id ? 'Kendine' : partner?.username + "'e"} yanıt
                                            </p>
                                            <p className="font-mono text-xs truncate"
                                               style={{ color: 'var(--color-text-muted)' }}>
                                                {replyTo.content}
                                            </p>
                                        </div>
                                        <button onClick={() => setReplyTo(null)}
                                                className="p-0.5 shrink-0 transition-opacity hover:opacity-60"
                                                style={{ color: 'var(--color-text-muted)' }}>
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}

                                <div className="px-4 py-3 relative">
                                    {showEmoji && (
                                        <EmojiPicker onSelect={handleEmojiInsert} onClose={() => setShowEmoji(false)} />
                                    )}
                                    <div className="flex items-end gap-2">
                                        <button onClick={() => setShowEmoji(v => !v)}
                                                className="p-2 transition-opacity hover:opacity-70 shrink-0 mb-0.5"
                                                style={{ color: showEmoji ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}>
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        <textarea
                                            ref={inputRef}
                                            value={text}
                                            onChange={e => setText(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Mesaj yaz... (Enter gönder, Shift+Enter satır)"
                                            rows={1}
                                            className="msg-textarea flex-1 bg-transparent font-mono text-sm outline-none resize-none border px-3 py-2"
                                            style={{
                                                borderColor:     'var(--color-terminal-border-raw)',
                                                color:           'var(--color-text-primary)',
                                                maxHeight:       120,
                                                lineHeight:      1.5,
                                                background:      'var(--color-bg-base)',
                                                overflowY:       'auto',
                                                scrollbarWidth:  'none',
                                                msOverflowStyle: 'none',
                                            }}
                                            onInput={e => {
                                                e.target.style.height = 'auto';
                                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                            }}
                                        />
                                        <button onClick={() => handleSend(text, 'text')}
                                                disabled={!text.trim() || sending}
                                                className="p-2.5 transition-opacity hover:opacity-80 disabled:opacity-30 shrink-0 mb-0.5"
                                                style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}>
                                            {sending
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Send className="w-4 h-4" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeId && msgLoad ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                        </div>
                    ) : activeId && !partner ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
                            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            </p>
                            <button onClick={() => loadConversation(activeId)}
                                    className="font-mono text-xs border px-3 py-1.5 transition-opacity hover:opacity-70"
                                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                                tekrar dene
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 flex items-center justify-center"
                                 style={{ border: '2px solid var(--color-brand-primary)', background: 'rgba(16,185,129,0.06)' }}>
                                <Send className="w-7 h-7" style={{ color: 'var(--color-brand-primary)' }} />
                            </div>
                            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
