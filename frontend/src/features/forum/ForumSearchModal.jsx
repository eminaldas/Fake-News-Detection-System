import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Clock, Hash, FileText, User } from 'lucide-react';
import axiosInstance from '../../api/axios';

const soft = (v, pct) => `color-mix(in srgb, var(${v}) ${pct}%, transparent)`;

const Corner = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
);

function Group({ label }) {
    return (
        <div className="text-[11px] font-bold uppercase tracking-wider px-6 pt-4 pb-2"
             style={{ color: 'var(--color-text-muted)' }}>
            {label}
        </div>
    );
}

function Row({ onClick, children }) {
    return (
        <button type="button" onClick={onClick}
                className="block w-full text-left px-6 py-2.5 text-[14px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--color-text-secondary)' }}>
            {children}
        </button>
    );
}

function Chip({ onClick, children }) {
    return (
        <button type="button" onClick={onClick}
                className="flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-1.5 rounded-full transition-all duration-150 hover:scale-105"
                style={{ color: 'var(--color-brand-primary)', background: soft('--color-brand-primary', 10) }}>
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
    const [visible, setVisible] = useState(false);
    const inputRef = useRef(null);

    const handleClose = React.useCallback(() => {
        setVisible(false);
        setTimeout(onClose, 200);
    }, [onClose]);

    useEffect(() => {
        const t = setTimeout(() => { setVisible(true); inputRef.current?.focus(); }, 20);
        const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
        document.addEventListener('keydown', onKey);
        return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); };
    }, [handleClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

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

    const go = (path) => { navigate(path); handleClose(); };
    const submit = (e) => {
        e.preventDefault();
        const term = q.trim();
        go(term ? `/forum/search?q=${encodeURIComponent(term)}&tab=posts` : '/forum/search');
    };

    const showResults = q.trim().length >= 2;
    const noResults = !res.posts.length && !res.tags.length && !res.users.length;

    return createPortal(
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-9999"
                style={{
                    background:           visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
                    backdropFilter:       visible ? 'blur(4px)' : 'blur(0px)',
                    WebkitBackdropFilter: visible ? 'blur(4px)' : 'blur(0px)',
                    transition: 'background 0.2s ease, backdrop-filter 0.2s ease',
                }}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-10000 flex items-center justify-center px-4 py-6 pointer-events-none">
                <div
                    className="w-full max-w-xl pointer-events-auto overflow-hidden relative"
                    style={{
                        background: 'var(--color-terminal-surface)',
                        boxShadow:  '0 24px 64px rgba(0,0,0,0.35)',
                        transform:  visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
                        opacity:    visible ? 1 : 0,
                        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
                        maxHeight:  '80vh',
                    }}
                >
                    <Corner />
                    <form onSubmit={submit} className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                        <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                               placeholder="Gönderi, etiket veya kişi ara…"
                               className="flex-1 bg-transparent outline-none text-[16px]"
                               style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }} />
                        <button type="button" onClick={handleClose}
                                className="text-[11px] font-bold px-2 py-1 border"
                                style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-surface-solid)', borderColor: 'var(--color-terminal-border-raw)' }}>
                            ESC
                        </button>
                    </form>

                    <div className="max-h-[55vh] overflow-y-auto py-2">
                        {!showResults ? (
                            <>
                                <Group label="Hızlı Seçenekler" />
                                <div className="flex flex-wrap gap-2 px-6 py-3">
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
                                {loading && <div className="text-[13px] font-medium px-6 py-3" style={{ color: 'var(--color-text-muted)' }}>Aranıyor…</div>}
                                {!loading && noResults && <div className="text-[13px] font-medium px-6 py-3" style={{ color: 'var(--color-text-muted)' }}>Sonuç yok</div>}

                                {res.posts.length > 0 && <Group label="Gönderiler" />}
                                {res.posts.map(p => (
                                    <Row key={p.id} onClick={() => go(`/forum/${p.id}`)}>
                                        <span className="flex items-center gap-2"><FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} /> {p.title}</span>
                                    </Row>
                                ))}

                                {res.tags.length > 0 && <Group label="Etiketler" />}
                                {res.tags.map(t => {
                                    const name = (t.name ?? t).replace(/^#/, '');
                                    return (
                                        <Row key={`t-${name}`} onClick={() => go(`/forum?tag=${encodeURIComponent(name)}`)}>
                                            <span className="flex items-center gap-2">
                                                <Hash className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                                <span style={{ color: 'var(--color-brand-primary)' }}>{name}</span>
                                                {t.usage_count != null && <span style={{ color: 'var(--color-text-muted)' }}>· {t.usage_count}</span>}
                                            </span>
                                        </Row>
                                    );
                                })}

                                {res.users.length > 0 && <Group label="Kullanıcılar" />}
                                {res.users.map(u => (
                                    <Row key={u.id} onClick={() => go(`/users/${u.id}`)}>
                                        <span className="flex items-center gap-2"><User className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} /> {u.username}</span>
                                    </Row>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
