import React, { useState } from 'react';
import Avatar from '../shared/Avatar';
import { timeStr } from '../shared/format';
import { C, RADIUS, BD } from '../shared/ui';

export default function ConversationItem({ conv, active, onClick }) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 border-b text-left transition-colors"
            style={{
                ...BD,
                background: active || hovered ? C.greenSoft : 'transparent',
                borderRadius: RADIUS.field,
                boxShadow: active ? 'inset 3px 0 0 var(--color-brand-primary)' : 'none',
            }}
        >
            <div className="relative shrink-0">
                <Avatar user={{ username: conv.partner_name, avatar_url: conv.partner_avatar }} size={40} />
                {conv.unread_count > 0 && (
                    <span
                        className="absolute -top-1 -right-1 flex items-center justify-center font-mono text-[9px] font-black px-1.5"
                        style={{
                            background: C.green,
                            color: C.onGreen,
                            borderRadius: RADIUS.pill,
                            minWidth: 16,
                            height: 16,
                        }}
                    >
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span
                        className="text-[14.5px] font-semibold truncate"
                        style={{ color: C.textPrimary }}
                    >
                        {conv.partner_name}
                    </span>
                    <span
                        className="text-[11.5px] shrink-0 ml-2"
                        style={{ color: C.textSecondary }}
                    >
                        {timeStr(conv.last_at)}
                    </span>
                </div>
                <p
                    className="text-[11.5px] truncate mt-0.5"
                    style={{ color: C.textSecondary, fontWeight: conv.unread_count > 0 ? 700 : 400 }}
                >
                    {conv.last_msg_type === 'gif' ? '🖼️ GIF' : conv.last_message}
                </p>
            </div>
        </button>
    );
}
