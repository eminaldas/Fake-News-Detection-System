import React from 'react';
import Avatar from '../shared/Avatar';
import { timeStr } from '../shared/format';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };

export default function ConversationItem({ conv, active, onClick }) {
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
