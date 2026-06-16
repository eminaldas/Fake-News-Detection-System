import React from 'react';
import { TYPE_LABELS, TYPE_PREFIX, relativeTime } from './useForumNotifications';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };

/**
 * Bildirim listesi — profil menüsü içindeki açılır bölümde kullanılır.
 * Veriyi useForumNotifications hook'undan alır.
 */
export default function NotificationList({ items, loading, onSelect }) {
    return (
        <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {loading && (
                <div className="px-4 py-6 text-center">
                    <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</p>
                </div>
            )}
            {!loading && items.length === 0 && (
                <div className="px-4 py-8 text-center">
                    <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>// bildirim yok</p>
                </div>
            )}
            {items.map((n, idx) => {
                const label  = TYPE_LABELS[n.type] ?? n.type;
                const prefix = TYPE_PREFIX[n.type] ?? '·';
                const isRead = !!n.read_at;
                const displayLabel = n.type === 'dm' && n.payload?.sender_name
                    ? `${n.payload.sender_name} size mesaj gönderdi`
                    : label;
                return (
                    <button
                        key={n.id}
                        onClick={() => onSelect(n)}
                        className={`w-full text-left px-4 py-3 border-l-2 transition-colors hover:bg-brand/5 ${idx < items.length - 1 ? 'border-b' : ''}`}
                        style={{
                            borderColor:     'var(--color-terminal-border-raw)',
                            borderLeftColor: isRead ? 'transparent' : 'var(--color-brand-primary)',
                            opacity:         isRead ? 0.45 : 1,
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <span className="font-mono text-sm shrink-0 mt-0.5" style={{ color: 'var(--color-brand-primary)' }}>
                                {prefix}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="font-mono text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                                    {displayLabel}
                                </p>
                                {n.payload?.text && (
                                    <p className="font-mono text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                                        {n.payload.text}
                                    </p>
                                )}
                                <p className="font-mono text-[10px] mt-1 tracking-widest" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                                    {relativeTime(n.created_at)} ÖNCE
                                </p>
                            </div>
                        </div>
                    </button>
                );
            })}
            <div className="px-4 py-2 border-t" style={BD} />
        </div>
    );
}
