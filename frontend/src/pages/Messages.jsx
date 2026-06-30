import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Send, Smile, ArrowLeft, Loader2,
    X, Reply, ExternalLink,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import Avatar from '../features/messages/shared/Avatar';
import { formatDateLabel } from '../features/messages/shared/format';
import LinkedText from '../features/messages/shared/LinkedText';
import ForumCard from '../features/messages/components/ForumCard';
import ReplyQuote from '../features/messages/components/ReplyQuote';
import DateSeparator from '../features/messages/components/DateSeparator';
import EmojiPicker, { EMOJIS } from '../features/messages/components/EmojiPicker';
import MessageBubble from '../features/messages/components/MessageBubble';
import ConversationList from '../features/messages/components/ConversationList';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const TIER_COLOR = {
    yeni_uye:    'var(--color-text-muted)',
    dogrulayici: 'var(--color-accent-blue)',
    analist:     'var(--color-accent-amber)',
    dedektif:    'var(--color-brand-primary)',
};



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

    return (
        <>
            <style>{`.msg-textarea::-webkit-scrollbar { display: none; }`}</style>

            {/* pt-32=8rem mobile, pt-36=9rem md+, NewsTicker gizli */}
            <div className="h-[calc(100dvh-8rem)] md:h-[calc(100dvh-9rem)]">
                <div className="flex h-full overflow-hidden border" style={S}>

                    {/* ── SOL: Konuşma listesi ── */}
                    <ConversationList
                        conversations={conversations}
                        loading={convLoad}
                        activeId={activeId}
                        search={convSearch}
                        onSearchChange={e => setConvSearch(e.target.value)}
                        onSelectConv={id => { setActiveId(id); navigate(`/messages/${id}`, { replace: true }); }}
                        onNewClick={() => setShowNewConv(true)}
                        showNewConv={showNewConv}
                        onNewClose={() => setShowNewConv(false)}
                        onNewSelect={u => { setShowNewConv(false); setActiveId(u.id); navigate(`/messages/${u.id}`, { replace: true }); }}
                    />

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
