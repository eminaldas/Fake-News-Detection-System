import { Smile, Send, Loader2, Reply, X, Image } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import { RADIUS, C, BD } from '../shared/ui';

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
                    style={{
                        borderColor: C.border,
                        background: C.greenSoft,
                        borderRadius: `${RADIUS.field}px ${RADIUS.field}px 0 0`,
                    }}
                >
                    <Reply className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: C.green }} />
                    <div className="flex-1 min-w-0">
                        <p
                            className="font-mono text-[9px] uppercase tracking-widest"
                            style={{ color: C.green }}
                        >
                            {replyTo.sender_id === meId ? 'Kendine' : partner?.username + "'e"} yanıt
                        </p>
                        <p className="font-mono text-xs truncate" style={{ color: C.textSecondary }}>
                            {replyTo.content}
                        </p>
                    </div>
                    <button
                        onClick={onCancelReply}
                        className="p-1 shrink-0 transition-opacity hover:opacity-60"
                        style={{ color: C.textMuted }}
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
                        className="flex items-center justify-center shrink-0 transition-opacity hover:opacity-70"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: RADIUS.pill,
                            color: showEmoji ? C.green : C.textMuted,
                        }}
                    >
                        <Smile className="w-5 h-5" />
                    </button>
                    <button
                        disabled
                        title="yakında"
                        className="flex items-center justify-center shrink-0 opacity-30 cursor-not-allowed"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: RADIUS.pill,
                            color: C.textMuted,
                        }}
                    >
                        <Image className="w-5 h-5" />
                    </button>
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={e => onTextChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Mesaj yaz... (Enter gönder, Shift+Enter satır)"
                        rows={1}
                        className="msg-textarea flex-1 font-mono text-sm outline-none resize-none border px-3 py-2"
                        style={{
                            borderRadius:    RADIUS.field,
                            borderColor:     C.border,
                            color:           C.textPrimary,
                            background:      C.surface,
                            maxHeight:       120,
                            lineHeight:      1.5,
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
                        className="flex items-center justify-center shrink-0 transition-opacity hover:opacity-80 disabled:opacity-30"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: C.green,
                            color: C.onGreen,
                        }}
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
