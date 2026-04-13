import React, { useEffect, useRef, useState } from 'react';
import { Copy, Twitter, MessageCircle, Share2, Check } from 'lucide-react';

/**
 * Yeniden kullanılabilir paylaşım dropdown'u.
 * Props:
 *   url  — paylaşılacak tam URL (string)
 *   text — sosyal medya için metin (string)
 */
export default function ShareDropdown({ url, text }) {
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
        const encoded = encodeURIComponent(`${text}\n${url}`);
        window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
        setIsOpen(false);
    }

    function openWhatsApp() {
        const encoded = encodeURIComponent(`${text} ${url}`);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
        setIsOpen(false);
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
            >
                <Share2 size={13} />
                Paylaş
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden">
                    <button
                        onClick={copyLink}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? 'Kopyalandı!' : 'Link Kopyala'}
                    </button>
                    <button
                        onClick={openTwitter}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                        <Twitter size={14} />
                        Twitter'da Paylaş
                    </button>
                    <button
                        onClick={openWhatsApp}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                        <MessageCircle size={14} />
                        WhatsApp'ta Paylaş
                    </button>
                </div>
            )}
        </div>
    );
}
