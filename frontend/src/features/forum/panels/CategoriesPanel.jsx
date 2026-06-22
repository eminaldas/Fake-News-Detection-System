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
            <div className="flex flex-col">
                {rows.map((c) => {
                    const on = (activeCategory || '') === c.name;
                    return (
                        <button
                            key={c.name || '__all'}
                            type="button"
                            onClick={() => onSelect(c.name)}
                            className="flex items-center gap-2 px-4 py-2.5 text-left transition-colors"
                            style={{
                                borderLeft: `2px solid ${on ? 'var(--color-brand-primary)' : 'transparent'}`,
                                background: on ? 'rgba(63,255,139,0.07)' : 'transparent',
                            }}
                        >
                            <span className="text-[13px] font-semibold flex-1"
                                  style={{ color: on ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)' }}>
                                {c.label}
                            </span>
                            {c.count != null && (
                                <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
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
