import React, { useEffect, useRef, useState } from 'react';
import { Copy, Twitter, MessageCircle, Share2, Check, UserPlus } from 'lucide-react';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

export default function ShareDropdown({ url, text, onSendToFriend }) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    async function copyLink() {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => { setCopied(false); setIsOpen(false); }, 1500);
    }

    function openTwitter() {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
        setIsOpen(false);
    }

    function openWhatsApp() {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
        setIsOpen(false);
    }

    function handleSendToFriend() {
        setIsOpen(false);
        onSendToFriend?.();
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold border transition-opacity hover:opacity-70"
                style={{
                    borderColor: isOpen ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                    color: isOpen ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                    background: 'var(--color-terminal-surface)',
                }}
            >
                <Share2 size={13} />
                Paylaş
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-1 w-48 border z-50 overflow-hidden"
                    style={TS}
                >
                    <button
                        onClick={copyLink}
                        className="flex items-center gap-2.5 w-full px-3 py-2 font-mono text-xs transition-colors hover:bg-white/5"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? 'Kopyalandı!' : 'Link Kopyala'}
                    </button>
                    <button
                        onClick={openTwitter}
                        className="flex items-center gap-2.5 w-full px-3 py-2 font-mono text-xs transition-colors hover:bg-white/5"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        <Twitter size={14} />
                        Twitter'da Paylaş
                    </button>
                    <button
                        onClick={openWhatsApp}
                        className="flex items-center gap-2.5 w-full px-3 py-2 font-mono text-xs transition-colors hover:bg-white/5"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        <MessageCircle size={14} />
                        WhatsApp'ta Paylaş
                    </button>
                    {onSendToFriend && (
                        <button
                            onClick={handleSendToFriend}
                            className="flex items-center gap-2.5 w-full px-3 py-2 font-mono text-xs transition-colors hover:bg-white/5"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            <UserPlus size={14} />
                            Arkadaşa Yolla
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
