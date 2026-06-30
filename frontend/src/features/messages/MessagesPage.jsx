import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ConversationList from './components/ConversationList';
import ChatPanel from './components/ChatPanel';
import { useConversations } from './hooks/useConversations';
import { useChat } from './hooks/useChat';
import { RADIUS, SURF } from './shared/ui';



export default function MessagesPage() {
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

    // Layout <main>: pt-32 md:pt-36 (8/9rem) already seats content below fixed navbar+marketband.
    // Outer wrapper keeps the matching height calc; px + pb give horizontal/bottom breathing room.
    // Inner box: Soft Modern — SURF surface + theme-aware border + RADIUS.card rounded corners.
    return (
        <div className="h-[calc(100dvh-8rem)] md:h-[calc(100dvh-9rem)] px-4 pb-4 md:px-6 md:pb-6">
            <div className="flex h-full overflow-hidden border" style={{ ...SURF, borderRadius: RADIUS.card }}>

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
                <ChatPanel
                    partner={partner}
                    activeId={activeId}
                    msgLoad={msgLoad}
                    onBack={() => { setActiveId(null); navigate('/messages', { replace: true }); }}
                    messages={messages}
                    meId={me?.id}
                    onReply={setReplyTo}
                    onDelete={handleDelete}
                    containerRef={msgContainerRef}
                    text={text}
                    onTextChange={setText}
                    onSend={handleSend}
                    sending={sending}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                    showEmoji={showEmoji}
                    onToggleEmoji={setShowEmoji}
                    onEmojiInsert={handleEmojiInsert}
                    inputRef={inputRef}
                    onRetry={() => loadConversation(activeId)}
                />
            </div>
        </div>
    );
}
