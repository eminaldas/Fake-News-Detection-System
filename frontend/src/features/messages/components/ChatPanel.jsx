import { Send, Loader2 } from 'lucide-react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import Composer from './Composer';

export default function ChatPanel({
    // branch control
    partner, activeId, msgLoad,
    // ChatHeader
    onBack,
    // MessageList
    messages, meId, onReply, onDelete, containerRef,
    // Composer
    text, onTextChange, onSend, sending,
    replyTo, onCancelReply,
    showEmoji, onToggleEmoji, onEmojiInsert, inputRef,
    // error branch
    onRetry,
}) {
    if (activeId && partner) {
        return (
            <div className="flex-1 flex flex-col min-w-0">
                <ChatHeader partner={partner} onBack={onBack} />
                <MessageList
                    messages={messages}
                    msgLoad={msgLoad}
                    partner={partner}
                    meId={meId}
                    onReply={onReply}
                    onDelete={onDelete}
                    containerRef={containerRef}
                />
                <Composer
                    text={text}
                    onTextChange={onTextChange}
                    onSend={onSend}
                    sending={sending}
                    replyTo={replyTo}
                    onCancelReply={onCancelReply}
                    showEmoji={showEmoji}
                    onToggleEmoji={onToggleEmoji}
                    onEmojiInsert={onEmojiInsert}
                    inputRef={inputRef}
                    partner={partner}
                    meId={meId}
                />
            </div>
        );
    }

    if (activeId && msgLoad) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
            </div>
        );
    }

    if (activeId && !partner) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
                <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}></p>
                <button
                    onClick={onRetry}
                    className="font-mono text-xs border px-3 py-1.5 transition-opacity hover:opacity-70"
                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
                >
                    tekrar dene
                </button>
            </div>
        );
    }

    // No activeId — empty state
    return (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-4">
            <div
                className="w-16 h-16 flex items-center justify-center"
                style={{ border: '2px solid var(--color-brand-primary)', background: 'rgba(16,185,129,0.06)' }}
            >
                <Send className="w-7 h-7" style={{ color: 'var(--color-brand-primary)' }} />
            </div>
            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}></p>
        </div>
    );
}
