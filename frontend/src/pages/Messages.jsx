import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Send, Smile, ArrowLeft, Loader2,
    X, Reply, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../features/messages/shared/Avatar';
import { formatDateLabel } from '../features/messages/shared/format';
import LinkedText from '../features/messages/shared/LinkedText';
import ForumCard from '../features/messages/components/ForumCard';
import ReplyQuote from '../features/messages/components/ReplyQuote';
import DateSeparator from '../features/messages/components/DateSeparator';
import EmojiPicker, { EMOJIS } from '../features/messages/components/EmojiPicker';
import MessageBubble from '../features/messages/components/MessageBubble';
import ConversationList from '../features/messages/components/ConversationList';
import { useConversations } from '../features/messages/hooks/useConversations';
import { useChat } from '../features/messages/hooks/useChat';

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
    const navigate                = useNavigate();

    /* UI state — stays in page */
    const [activeId,    setActiveId]    = useState(paramUserId ?? null);
    const [text,        setText]        = useState('');
    const [showEmoji,   setShowEmoji]   = useState(false);
    const [showNewConv, setShowNewConv] = useState(false);
    const [convSearch,  setConvSearch]  = useState('');
    const [replyTo,     setReplyTo]     = useState(null);

    const msgContainerRef = useRef(null);
    const inputRef        = useRef(null);

    /* ── Data hooks ── */
    const { conversations, setConversations, convLoad, loadConversations } =
        useConversations({ activeId });

    const { partner, messages, msgLoad, loadConversation, handleSend, handleDelete, sending } =
        useChat({ activeId, me, setConversations, replyTo, setText, setReplyTo, inputRef, loadConversations });

    /* URL param → activeId sync */
    useEffect(() => {
        if (paramUserId && paramUserId !== activeId) setActiveId(paramUserId);
    }, [paramUserId, activeId]);

    /* Auto-scroll on new messages */
    useEffect(() => {
        const el = msgContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

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
