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
            <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                    const name = t.name.replace(/^#/, '');
                    const on = activeTag === name;
                    return (
                        <button
                            key={t.id ?? name}
                            type="button"
                            onClick={() => onSelect(name)}
                            className="text-[13.5px] font-bold px-3.5 py-1.5 rounded-full transition-all duration-150 hover:scale-[1.04]"
                            style={{
                                background: on ? 'var(--color-brand-primary)' : 'var(--color-bg-surface-solid)',
                                color:      on ? '#fff' : 'var(--color-text-secondary)',
                            }}
                            title={`${t.usage_count} gönderi`}
                        >
                            #{name}
                        </button>
                    );
                })}
            </div>
        </CollapsiblePanel>
    );
}
