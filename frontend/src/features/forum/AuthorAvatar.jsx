import React from 'react';

export default function AuthorAvatar({ username, avatarUrl, size = 8 }) {
    const palBg   = ['rgba(16,185,129,0.15)','rgba(59,130,246,0.15)','rgba(245,158,11,0.15)','rgba(239,68,68,0.15)','rgba(168,85,247,0.15)'];
    const palText = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];
    const idx     = (username?.charCodeAt(0) ?? 0) % palBg.length;
    const px      = size * 4;
    return (
        <div
            className={`w-${size} h-${size} overflow-hidden flex items-center justify-center font-mono font-black text-sm shrink-0`}
            style={{ background: palBg[idx], color: palText[idx], border: `1px solid ${palText[idx]}30`, minWidth: px, minHeight: px }}
        >
            {avatarUrl
                ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover"
                       referrerPolicy="no-referrer"
                       onError={e => { e.currentTarget.style.display = 'none'; }} />
                : (username ?? '?')[0].toUpperCase()
            }
        </div>
    );
}
