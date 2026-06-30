import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import axiosInstance from '../../../api/axios';
import { C, RADIUS, BD, SURF } from '../shared/ui';

const TIER_COLOR = {
    yeni_uye:    'var(--color-text-muted)',
    dogrulayici: 'var(--color-accent-blue)',
    analist:     'var(--color-accent-amber)',
    dedektif:    'var(--color-brand-primary)',
};

export default function NewConversation({ onSelect, onClose }) {
    const [query,     setQuery]     = useState('');
    const [results,   setResults]   = useState([]);
    const [loading,   setLoading]   = useState(false);
    const [hoveredId, setHoveredId] = useState(null);
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
        <div className="absolute inset-0 z-20 flex flex-col" style={SURF}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={BD}>
                <button onClick={onClose} className="p-1 transition-opacity hover:opacity-60"
                        style={{ color: C.textMuted }}>
                    <X className="w-4 h-4" />
                </button>
                <span className="text-[15px] font-bold flex-1" style={{ color: C.textPrimary }}>Yeni mesaj</span>
            </div>
            <div className="px-3 py-2 border-b" style={BD}>
                <div className="flex items-center gap-2 border px-3 py-2"
                     style={{ borderColor: C.border, background: 'var(--color-bg-base)', borderRadius: RADIUS.field }}>
                    <Search className="w-3.5 h-3.5 shrink-0" style={{ color: C.green }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Kullanıcı adı ara..."
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: C.textPrimary }}
                    />
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0"
                                        style={{ color: C.green }} />}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {results.length === 0 && query.trim() && !loading ? (
                    <p className="text-xs text-center pt-8" style={{ color: C.textMuted }}>kullanıcı bulunamadı</p>
                ) : results.map(u => (
                    <button key={u.id} onClick={() => onSelect(u)}
                            onMouseEnter={() => setHoveredId(u.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            className="w-full flex items-center gap-3 px-4 py-3 border-b text-left transition-colors"
                            style={{ ...BD, borderRadius: RADIUS.field, background: hoveredId === u.id ? C.greenSoft : 'transparent' }}>
                        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0"
                             style={{ background: C.greenSoft, border: `1px solid ${C.green}`,
                                      color: C.green, fontSize: 14 }}>
                            {u.avatar_url
                                ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover"
                                       referrerPolicy="no-referrer" />
                                : u.username[0].toUpperCase()
                            }
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: C.textPrimary }}>{u.username}</p>
                            <p className="text-[10px]"
                               style={{ color: TIER_COLOR[u.trust_tier] ?? C.textMuted }}>
                                {'★'.repeat(u.trust_stars ?? 0)} {u.trust_label}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
