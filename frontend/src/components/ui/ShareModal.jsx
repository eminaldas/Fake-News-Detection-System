import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Share2 } from 'lucide-react';

const SURFACE = 'var(--color-terminal-surface)';
const BORDER  = 'var(--color-terminal-border-raw)';
const TEXT    = 'var(--color-text-primary)';
const MUTED   = 'var(--color-text-muted)';

function TwitterIcon() {
    return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
    );
}

function WhatsAppIcon() {
    return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    );
}

function TelegramIcon() {
    return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
    );
}

function PlatformButton({ icon, label, onClick, active }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center gap-2 p-3 transition-all hover:opacity-80 active:scale-95"
            style={{
                border:     `1px solid ${BORDER}`,
                background: SURFACE,
                color:      TEXT,
            }}
        >
            <span className={active ? 'text-green-500' : ''}>{icon}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
                {label}
            </span>
        </button>
    );
}

export default function ShareModal({ url, hex }) {
    const [isOpen,  setIsOpen]  = useState(false);
    const [copied,  setCopied]  = useState(false);

    async function copyLink() {
        try { await navigator.clipboard.writeText(url); } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function openTwitter() {
        window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent('nehaber.dev üzerinde analiz edildi:')}`,
            '_blank'
        );
        setIsOpen(false);
    }

    function openWhatsApp() {
        window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
        setIsOpen(false);
    }

    function openTelegram() {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, '_blank');
        setIsOpen(false);
    }

    const effectiveHex = hex || 'var(--color-brand-primary)';

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold border transition-opacity hover:opacity-70"
                style={{
                    borderColor: effectiveHex,
                    color:       effectiveHex,
                    background:  SURFACE,
                }}
            >
                <Share2 size={13} />
                Paylaş
            </button>

            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="w-full max-w-sm flex flex-col overflow-hidden"
                        style={{
                            background: 'var(--color-bg-surface)',
                            border:     `1px solid ${effectiveHex}40`,
                            borderTop:  `3px solid ${effectiveHex}`,
                            animation:  'slideUp 0.22s cubic-bezier(0.22,1,0.36,1)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div
                            className="px-5 py-4 flex items-center justify-between shrink-0"
                            style={{ borderBottom: `1px solid ${effectiveHex}20` }}
                        >
                            <span className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase"
                                  style={{ color: effectiveHex }}>
                                // Paylaş
                            </span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="transition-opacity hover:opacity-60"
                                style={{ color: MUTED }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Platform buttons */}
                        <div className="p-5 grid grid-cols-3 gap-3">
                            <PlatformButton
                                icon={<TwitterIcon />}
                                label="Twitter"
                                onClick={openTwitter}
                            />
                            <PlatformButton
                                icon={<WhatsAppIcon />}
                                label="WhatsApp"
                                onClick={openWhatsApp}
                            />
                            <PlatformButton
                                icon={<TelegramIcon />}
                                label="Telegram"
                                onClick={openTelegram}
                            />
                        </div>

                        {/* Copy link row */}
                        <div
                            className="px-5 pb-5 flex items-center gap-2"
                        >
                            <div
                                className="flex-1 flex items-center px-3 py-2 min-w-0"
                                style={{ border: `1px solid ${BORDER}`, background: SURFACE }}
                            >
                                <span className="font-mono text-[11px] truncate" style={{ color: MUTED }}>
                                    {url}
                                </span>
                            </div>
                            <button
                                onClick={copyLink}
                                className="flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest shrink-0 transition-all hover:opacity-80"
                                style={{
                                    border:     `1px solid ${effectiveHex}`,
                                    color:      copied ? '#22c55e' : effectiveHex,
                                    background: `${effectiveHex}14`,
                                }}
                            >
                                {copied
                                    ? <><Check className="w-3.5 h-3.5" /> Kopyalandı</>
                                    : <><Copy className="w-3.5 h-3.5" /> Kopyala</>
                                }
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes slideUp {
                            from { opacity: 0; transform: translateY(16px); }
                            to   { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </div>,
                document.body
            )}
        </>
    );
}
