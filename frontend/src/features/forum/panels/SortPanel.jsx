import React from 'react';
import { ArrowDownUp, Flame, Clock, Zap } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';

const OPTS = [
    { key: 'hot',           label: 'Popüler',    Icon: Flame },
    { key: 'new',           label: 'Yeni',       Icon: Clock },
    { key: 'controversial', label: 'Tartışmalı', Icon: Zap   },
];

export default function SortPanel({ activeSort = 'hot', onSelect }) {
    return (
        <CollapsiblePanel icon={ArrowDownUp} title="Sıralama" storageKey="sort">
            <div className="flex flex-col gap-1 -mx-2">
                {OPTS.map((o) => {
                    const on = activeSort === o.key;
                    const Icon = o.Icon;
                    return (
                        <button
                            key={o.key}
                            type="button"
                            onClick={() => onSelect(o.key)}
                            className="flex items-center gap-2.5 px-3 py-2.5 text-left text-[14.5px] font-bold rounded-lg transition-all duration-150 hover:translate-x-0.5"
                            style={{
                                color:      on ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                                background: on ? 'color-mix(in srgb, var(--color-brand-primary) 10%, transparent)' : 'transparent',
                            }}
                            onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--color-bg-surface-solid)'; }}
                            onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {o.label}
                        </button>
                    );
                })}
            </div>
        </CollapsiblePanel>
    );
}
