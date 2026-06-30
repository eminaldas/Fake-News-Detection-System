import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import axiosInstance from '../../../api/axios';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const TIER_COLOR = {
    yeni_uye:    'var(--color-text-muted)',
    dogrulayici: 'var(--color-accent-blue)',
    analist:     'var(--color-accent-amber)',
    dedektif:    'var(--color-brand-primary)',
};

export default function NewConversation({ onSelect, onClose }) {
    const [query,   setQuery]   = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await axiosInstance.get('/users/search', { params: { q: query, size: 10 } });
                setResults(data.items ?? []);
            } catch { /* sessiz */ }
            finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    return (
        <div className="absolute inset-0 z-20 flex flex-col" style={S}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={BD}>
                <button onClick={onClose} className="p-1 transition-opacity hover:opacity-60"
                        style={{ color: 'var(--color-text-muted)' }}>
                    <X className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs tracking-widest uppercase flex-1"
                      style={{ color: 'var(--color-brand-primary)' }}>// YENİ MESAJ</span>
            </div>
            <div className="px-3 py-2 border-b" style={BD}>
                <div className="flex items-center gap-2 border px-3 py-2"
                     style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-bg-base)' }}>
                    <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Kullanıcı adı ara..."
                        className="flex-1 bg-transparent font-mono text-sm outline-none"
                        style={{ color: 'var(--color-text-primary)' }}
                    />
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0"
                                        style={{ color: 'var(--color-brand-primary)' }} />}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {results.length === 0 && query.trim() && !loading ? (
                    <p className="font-mono text-xs text-center pt-8"
                       style={{ color: 'var(--color-text-muted)' }}>// kullanıcı bulunamadı</p>
                ) : results.map(u => (
                    <button key={u.id} onClick={() => onSelect(u)}
                            className="w-full flex items-center gap-3 px-4 py-3 border-b text-left transition-colors hover:bg-white/5"
                            style={BD}>
                        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-mono font-black shrink-0"
                             style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid var(--color-brand-primary)',
                                      color: 'var(--color-brand-primary)', fontSize: 14 }}>
                            {u.avatar_url
                                ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover"
                                       referrerPolicy="no-referrer" />
                                : u.username[0].toUpperCase()
                            }
                        </div>
                        <div className="min-w-0">
                            <p className="font-mono text-sm font-bold truncate"
                               style={{ color: 'var(--color-text-primary)' }}>{u.username}</p>
                            <p className="font-mono text-[10px]"
                               style={{ color: TIER_COLOR[u.trust_tier] ?? 'var(--color-text-muted)' }}>
                                {'★'.repeat(u.trust_stars ?? 0)} {u.trust_label}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
