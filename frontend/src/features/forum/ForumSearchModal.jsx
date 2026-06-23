import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Clock, Hash, FileText, User } from 'lucide-react';
import axiosInstance from '../../api/axios';

function Group({ label }) {
    return (
        <div className="font-mono text-[9px] tracking-widest px-4 pt-3 pb-1.5"
             style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-terminal-border-raw)' }}>
            {label}
        </div>
    );
}

function Row({ onClick, children }) {
    return (
        <button type="button" onClick={onClick}
                className="block w-full text-left px-4 py-2.5 text-[13px] transition-colors hover:bg-white/[0.04]"
                style={{ color: 'var(--color-text-secondary)' }}>
            {children}
        </button>
    );
}

function Chip({ onClick, children }) {
    return (
        <button type="button" onClick={onClick}
                className="flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1.5 border transition-colors hover:brightness-110"
                style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.30)', background: 'rgba(16,185,129,0.06)' }}>
            {children}
        </button>
    );
}

export default function ForumSearchModal({ onClose }) {
    const navigate = useNavigate();
    const [q, setQ]           = useState('');
    const [res, setRes]       = useState({ posts: [], tags: [], users: [] });
    const [loading, setLoading] = useState(false);
    const [opts, setOpts]     = useState({ cats: [], tags: [] });
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        let alive = true;
        Promise.allSettled([
            axiosInstance.get('/news/categories'),
            axiosInstance.get('/forum/trending'),
        ]).then(([c, t]) => {
            if (!alive) return;
            const cats = c.status === 'fulfilled' ? (Array.isArray(c.value.data) ? c.value.data : (c.value.data.items ?? [])) : [];
            const tags = t.status === 'fulfilled' ? (t.value.data?.trending_tags ?? []) : [];
            setOpts({ cats: cats.slice(0, 6), tags: tags.slice(0, 6) });
        });
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        const term = q.trim();
        const t = setTimeout(async () => {
            if (term.length < 2) { setRes({ posts: [], tags: [], users: [] }); setLoading(false); return; }
            setLoading(true);
            const [posts, tags, users] = await Promise.allSettled([
                axiosInstance.get('/forum/search', { params: { q: term, size: 5 } }),
                axiosInstance.get('/forum/tags',   { params: { q: term, limit: 5 } }),
                axiosInstance.get('/users/search', { params: { q: term, size: 5 } }),
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

    const go = (path) => { navigate(path); onClose(); };
    const submit = (e) => {
        e.preventDefault();
        const term = q.trim();
        go(term ? `/forum/search?q=${encodeURIComponent(term)}&tab=posts` : '/forum/search');
    };

    const showResults = q.trim().length >= 2;
    const noResults = !res.posts.length && !res.tags.length && !res.users.length;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4 animate-fade-in"
             style={{ background: 'rgba(13,43,26,0.45)' }}
             onMouseDown={onClose}>
            <div className="w-full max-w-xl border relative animate-fade-up"
                 style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}
                 onMouseDown={e => e.stopPropagation()}>

                <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand" />
                <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand" />
                <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand" />
                <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand" />

                <form onSubmit={submit} className="flex items-center gap-3 px-4 py-4 border-b"
                      style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                    <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                    <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                           placeholder="gönderi, etiket veya kişi ara…"
                           className="flex-1 bg-transparent outline-none font-mono text-[15px]"
                           style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }} />
                    <button type="button" onClick={onClose}
                            className="font-mono text-[9px] px-1.5 py-1 border"
                            style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }}>
                        ESC
                    </button>
                </form>

                <div className="max-h-[55vh] overflow-y-auto">
                    {!showResults ? (
                        <>
                            <Group label="HIZLI SEÇENEKLER" />
                            <div className="flex flex-wrap gap-2 px-4 py-3">
                                <Chip onClick={() => go('/forum?sort=hot')}><Flame className="w-3 h-3" /> Popüler</Chip>
                                <Chip onClick={() => go('/forum?sort=new')}><Clock className="w-3 h-3" /> Yeni</Chip>
                                {opts.cats.map(c => {
                                    const name = c.name ?? c.slug ?? c;
                                    return <Chip key={`c-${name}`} onClick={() => go(`/forum?category=${encodeURIComponent(name)}`)}>{name}</Chip>;
                                })}
                                {opts.tags.map(t => {
                                    const name = t.name.replace(/^#/, '');
                                    return <Chip key={`t-${name}`} onClick={() => go(`/forum?tag=${encodeURIComponent(name)}`)}><Hash className="w-3 h-3" /> {name}</Chip>;
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            {loading && <div className="font-mono text-[11px] px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>aranıyor…</div>}
                            {!loading && noResults && <div className="font-mono text-[11px] px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>sonuç yok</div>}

                            {res.posts.length > 0 && <Group label="GÖNDERİLER" />}
                            {res.posts.map(p => (
                                <Row key={p.id} onClick={() => go(`/forum/${p.id}`)}>
                                    <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} /> {p.title}</span>
                                </Row>
                            ))}

                            {res.tags.length > 0 && <Group label="ETİKETLER" />}
                            {res.tags.map(t => {
                                const name = (t.name ?? t).replace(/^#/, '');
                                return (
                                    <Row key={`t-${name}`} onClick={() => go(`/forum?tag=${encodeURIComponent(name)}`)}>
                                        <span className="flex items-center gap-2">
                                            <Hash className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                            <span style={{ color: 'var(--color-brand-primary)' }}>{name}</span>
                                            {t.usage_count != null && <span style={{ color: 'var(--color-text-muted)' }}>· {t.usage_count}</span>}
                                        </span>
                                    </Row>
                                );
                            })}

                            {res.users.length > 0 && <Group label="KULLANICILAR" />}
                            {res.users.map(u => (
                                <Row key={u.id} onClick={() => go(`/users/${u.id}`)}>
                                    <span className="flex items-center gap-2"><User className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} /> {u.username}</span>
                                </Row>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
