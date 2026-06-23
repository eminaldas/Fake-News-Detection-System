import React, { useEffect, useState } from 'react';
import { Hash } from 'lucide-react';
import axiosInstance from '../../../api/axios';
import CollapsiblePanel from './CollapsiblePanel';

export default function PopularTagsPanel({ activeTag = '', onSelect }) {
    const [tags, setTags] = useState([]);

    useEffect(() => {
        let alive = true;
        axiosInstance.get('/forum/trending')
            .then(r => {
                if (!alive) return;
                const list = (r.data?.trending_tags ?? []).filter(t => (t.usage_count ?? 0) > 0);
                setTags(list.slice(0, 8));
            })
            .catch(() => {});
        return () => { alive = false; };
    }, []);

    if (tags.length === 0) return null;

    return (
        <CollapsiblePanel icon={Hash} title="Popüler Etiketler" storageKey="tags">
            <div className="flex flex-col">
                {tags.map((t, i) => {
                    const name = t.name.replace(/^#/, '');
                    const on = activeTag === name;
                    return (
                        <button
                            key={t.id ?? name}
                            type="button"
                            onClick={() => onSelect(name)}
                            className="flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                            style={{ borderBottom: i < tags.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none' }}
                        >
                            <span className="font-mono font-extrabold text-[15px]" style={{ color: 'var(--color-brand-primary)' }}>#</span>
                            <span className="flex-1 min-w-0">
                                <span className="block font-mono text-[13px] font-bold truncate"
                                      style={{ color: on ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)' }}>
                                    {name}
                                </span>
                                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                    {t.usage_count} gönderi
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </CollapsiblePanel>
    );
}
