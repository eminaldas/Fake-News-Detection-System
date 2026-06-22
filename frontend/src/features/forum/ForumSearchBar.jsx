import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import axiosInstance from '../../api/axios';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

function Group({ label, children }) {
    return (
        <>
            <div className="font-mono text-[9px] tracking-widest px-3 pt-2.5 pb-1"
                 style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-terminal-border-raw)' }}>
                {label}
            </div>
            {children}
        </>
    );
}

export default function ForumSearchBar() {
    const navigate = useNavigate();
    const [open, setOpen]   = useState(false);
    const [q, setQ]         = useState('');
    const [res, setRes]     = useState({ posts: [], tags: [], users: [] });
    const [loading, setLoading] = useState(false);
    const boxRef = useRef(null);

    useEffect(() => {
        const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    useEffect(() => {
        const term = q.trim();
        const t = setTimeout(async () => {
            if (term.length < 2) { setRes({ posts: [], tags: [], users: [] }); setLoading(false); return; }
            setLoading(true);
            const [posts, tags, users] = await Promise.allSettled([
                axiosInstance.get('/forum/search', { params: { q: term, size: 4 } }),
                axiosInstance.get('/forum/tags',   { params: { q: term, limit: 4 } }),
                axiosInstance.get('/users/search', { params: { q: term, limit: 4 } }),
            ]);
            setRes({
                posts: posts.status === 'fulfilled' ? (posts.value.data.items ?? posts.value.data.results ?? []) : [],
                tags:  tags.status  === 'fulfilled' ? (tags.value.data.items  ?? tags.value.data ?? []) : [],
                users: users.status === 'fulfilled' ? (users.value.data.items ?? users.value.data.results ?? users.value.data ?? []) : [],
            });
            setLoading(false);
        }, 300);
        return () => clearTimeout(t);
    }, [q]);

    const submit = (e) => {
        e.preventDefault();
        const term = q.trim();
        if (term) navigate(`/forum/search?q=${encodeURIComponent(term)}&tab=posts`);
        else navigate('/forum/search');
        setOpen(false);
    };

    const has = res.posts.length || res.tags.length || res.users.length;

    return (
        <div ref={boxRef} className="relative flex-1 max-w-xl">
            <form onSubmit={submit}
                  className="flex items-center gap-2 px-3 py-2 border"
                  style={{ ...TS, borderColor: open ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)' }}>
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                <input
                    value={q}
                    onChange={e => { setQ(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="gönderi, etiket, kişi ara…"
                    className="bg-transparent outline-none flex-1 font-mono text-sm"
                    style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                />
                {q && (
                    <button type="button" onClick={() => { setQ(''); setOpen(false); }} aria-label="Temizle">
                        <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                )}
            </form>

            {open && q.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 border max-h-[60vh] overflow-y-auto"
                     style={{ ...TS, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                    {loading && <div className="font-mono text-[11px] px-3 py-3" style={{ color: 'var(--color-text-muted)' }}>aranıyor…</div>}
                    {!loading && !has && <div className="font-mono text-[11px] px-3 py-3" style={{ color: 'var(--color-text-muted)' }}>sonuç yok</div>}

                    {res.posts.length > 0 && (
                        <Group label="GÖNDERİLER">
                            {res.posts.map(p => (
                                <button key={p.id} type="button" onClick={() => { navigate(`/forum/${p.id}`); setOpen(false); }}
                                        className="block w-full text-left px-3 py-2 text-[12.5px] transition-colors hover:bg-white/[0.04]"
                                        style={{ color: 'var(--color-text-secondary)' }}>
                                    {p.title}
                                </button>
                            ))}
                        </Group>
                    )}
                    {res.tags.length > 0 && (
                        <Group label="ETİKETLER">
                            {res.tags.map(t => {
                                const name = (t.name ?? t).replace(/^#/, '');
                                return (
                                    <button key={t.id ?? name} type="button"
                                            onClick={() => { navigate(`/forum?tag=${encodeURIComponent(name)}`); setOpen(false); }}
                                            className="block w-full text-left px-3 py-2 font-mono text-[12px] transition-colors hover:bg-white/[0.04]"
                                            style={{ color: 'var(--color-brand-primary)' }}>
                                        #{name} {t.usage_count != null && <span style={{ color: 'var(--color-text-muted)' }}>· {t.usage_count}</span>}
                                    </button>
                                );
                            })}
                        </Group>
                    )}
                    {res.users.length > 0 && (
                        <Group label="KULLANICILAR">
                            {res.users.map(u => (
                                <button key={u.id} type="button" onClick={() => { navigate(`/users/${u.id}`); setOpen(false); }}
                                        className="block w-full text-left px-3 py-2 text-[12.5px] transition-colors hover:bg-white/[0.04]"
                                        style={{ color: 'var(--color-text-secondary)' }}>
                                    {u.username}
                                </button>
                            ))}
                        </Group>
                    )}
                </div>
            )}
        </div>
    );
}
