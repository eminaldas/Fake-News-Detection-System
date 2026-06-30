import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import Avatar from '../shared/Avatar';
import { formatDateLabel } from '../shared/format';
import DateSeparator from './DateSeparator';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, msgLoad, partner, meId, onReply, onDelete, containerRef }) {
    const enrichedMessages = useMemo(() => {
        return messages.map((msg, idx) => {
            const prev       = messages[idx - 1];
            const next       = messages[idx + 1];
            const msgDay     = new Date(msg.created_at).toDateString();
            const prevDay    = prev ? new Date(prev.created_at).toDateString() : null;
            const nextDay    = next ? new Date(next.created_at).toDateString() : null;
            const isFirst    = !prev || prev.sender_id !== msg.sender_id || prevDay !== msgDay;
            const isLast     = !next || next.sender_id !== msg.sender_id || nextDay !== msgDay;
            const showDateSep = !prev || prevDay !== msgDay;
            return { ...msg, isFirst, isLast, showDateSep };
        });
    }, [messages]);

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto min-h-0 py-3">
            {msgLoad ? (
                <div className="flex justify-center pt-10">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                </div>
            ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
                    <Avatar user={partner} size={56} />
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}></p>
                </div>
            ) : (
                enrichedMessages.map(msg => (
                    <React.Fragment key={msg.id}>
                        {msg.showDateSep && <DateSeparator label={formatDateLabel(msg.created_at)} />}
                        <MessageBubble
                            msg={msg}
                            isMine={msg.sender_id === meId}
                            isFirst={msg.isFirst}
                            isLast={msg.isLast}
                            onReply={onReply}
                            onDelete={onDelete}
                            meId={meId}
                        />
                    </React.Fragment>
                ))
            )}
        </div>
    );
}
