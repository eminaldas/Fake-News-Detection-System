import { Smile, Send, Loader2, Reply, X } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };

export default function Composer({
    text, onTextChange, onSend, sending,
    replyTo, onCancelReply,
    showEmoji, onToggleEmoji, onEmojiInsert,
    inputRef, partner, meId,
}) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend(text, 'text');
        }
        if (e.key === 'Escape' && replyTo) {
            onCancelReply();
        }
    };

    return (
        <div className="border-t shrink-0" style={BD}>
            <style>{`.msg-textarea::-webkit-scrollbar { display: none; }`}</style>

            {replyTo && (
                <div
                    className="px-4 pt-2 pb-1 flex items-start gap-2 border-b"
                    style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'rgba(16,185,129,0.04)' }}
                >
                    <Reply className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                    <div className="flex-1 min-w-0">
                        <p
                            className="font-mono text-[9px] uppercase tracking-widest"
                            style={{ color: 'var(--color-brand-primary)' }}
                        >
                            {replyTo.sender_id === meId ? 'Kendine' : partner?.username + "'e"} yanıt
                        </p>
                        <p className="font-mono text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {replyTo.content}
                        </p>
                    </div>
                    <button
                        onClick={onCancelReply}
                        className="p-0.5 shrink-0 transition-opacity hover:opacity-60"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="px-4 py-3 relative">
                {showEmoji && (
                    <EmojiPicker onSelect={onEmojiInsert} onClose={() => onToggleEmoji(false)} />
                )}
                <div className="flex items-end gap-2">
                    <button
                        onClick={() => onToggleEmoji(v => !v)}
                        className="p-2 transition-opacity hover:opacity-70 shrink-0 mb-0.5"
                        style={{ color: showEmoji ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
                    >
                        <Smile className="w-5 h-5" />
                    </button>
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={e => onTextChange(e.target.value)}
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
                    <button
                        onClick={() => onSend(text, 'text')}
                        disabled={!text.trim() || sending}
                        className="p-2.5 transition-opacity hover:opacity-80 disabled:opacity-30 shrink-0 mb-0.5"
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
    );
}
