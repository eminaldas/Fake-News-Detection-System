import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForumNotifications } from './useForumNotifications';
import NotificationList from './NotificationList';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

// Navbar'daki zil — veriyi useForumNotifications hook'undan, listeyi NotificationList'ten alır.
export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const ref      = useRef(null);
    const navigate = useNavigate();
    const { items, unread, loading, loadIfEmpty, markOne, markAll } = useForumNotifications();

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = useCallback(() => {
        setOpen(prev => { const next = !prev; if (next) loadIfEmpty(); return next; });
    }, [loadIfEmpty]);

    const handleSelect = async (n) => {
        setOpen(false);
        const link = await markOne(n);
        if (link) navigate(link);
    };

    return (
        <div ref={ref} className="relative">
            <button
                onClick={toggle}
                className="p-2 flex items-center justify-center transition-colors relative"
                style={{ color: 'var(--color-text-primary)' }}
                aria-label="Bildirimler"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span
                        className="absolute -top-1 -right-1 text-white font-mono font-black w-4 h-4 flex items-center justify-center"
                        style={{ background: '#ff7351', fontSize: '9px' }}
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden animate-fade-up" style={{ ...TS, zIndex: 200 }}>
                    {/* Köşe aksanları */}
                    <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none z-10" />
                    <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none z-10" />
                    <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none z-10" />
                    <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none z-10" />

                    {unread > 0 && (
                        <div className="px-4 py-2.5 flex items-center justify-end border-b" style={{ ...TS, ...BD }}>
                            <button
                                onClick={markAll}
                                className="font-mono text-[10px] tracking-wider transition-opacity hover:opacity-60"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                hepsini okundu
                            </button>
                        </div>
                    )}

                    <NotificationList items={items} loading={loading} onSelect={handleSelect} />
                </div>
            )}
        </div>
    );
}
