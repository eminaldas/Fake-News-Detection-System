import React, { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import axiosInstance from '../../../api/axios';
import CollapsiblePanel from './CollapsiblePanel';

export default function CategoriesPanel({ activeCategory = '', onSelect }) {
    const [cats, setCats] = useState([]);

    useEffect(() => {
        let alive = true;
        axiosInstance.get('/news/categories')
            .then(r => { if (alive) setCats(Array.isArray(r.data) ? r.data : (r.data.items ?? [])); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);

    const rows = [{ name: '', label: 'Tümü', count: null }, ...cats.map(c => ({
        name:  c.name ?? c.slug ?? c,
        label: c.name ?? c.slug ?? c,
        count: c.count ?? c.thread_count ?? null,
    }))];

    return (
        <CollapsiblePanel icon={LayoutGrid} title="Kategoriler" count={cats.length || null} storageKey="categories">
            <div className="flex flex-col gap-1 -mx-2">
                {rows.map((c) => {
                    const on = (activeCategory || '') === c.name;
                    return (
                        <button
                            key={c.name || '__all'}
                            type="button"
                            onClick={() => onSelect(c.name)}
                            className="flex items-center gap-2 px-3 py-2.5 text-left rounded-lg transition-all duration-150 hover:translate-x-0.5"
                            style={{ background: on ? 'color-mix(in srgb, var(--color-brand-primary) 10%, transparent)' : 'transparent' }}
                            onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--color-bg-surface-solid)'; }}
                            onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span className="text-[14.5px] font-bold flex-1"
                                  style={{ color: on ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)' }}>
                                {c.label}
                            </span>
                            {c.count != null && (
                                <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                                    {c.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </CollapsiblePanel>
    );
}
