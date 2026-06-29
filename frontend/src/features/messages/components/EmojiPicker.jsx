// frontend/src/features/messages/components/EmojiPicker.jsx
/* eslint-disable react-refresh/only-export-components */
import React, { useRef, useEffect } from 'react';

export const EMOJIS = [
    '😀','😂','🥲','😍','🤔','😮','😢','😡','👍','👎',
    '❤️','🔥','✅','❌','⚡','🎯','💡','🛡️','📰','🔍',
    '👀','🙏','💪','🤝','👋','🎉','🚀','⚠️','📌','💬',
    '😎','🥳','😴','🤯','🫡','💀','👻','🫶','🧠','🕵️',
];

const S = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

export default function EmojiPicker({ onSelect, onClose }) {
    const ref = useRef(null);
    useEffect(() => {
        const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [onClose]);
    return (
        <div ref={ref}
             className="absolute bottom-full mb-2 left-0 z-50 border p-3 shadow-xl"
             style={S} onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-10 gap-1">
                {EMOJIS.map(e => (
                    <button key={e} onClick={() => onSelect(e)}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 transition-colors">
                        {e}
                    </button>
                ))}
            </div>
        </div>
    );
}
