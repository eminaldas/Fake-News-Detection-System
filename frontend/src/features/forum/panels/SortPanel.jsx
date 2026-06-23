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
            <div className="flex flex-col">
                {OPTS.map((o) => {
                    const on = activeSort === o.key;
                    const Icon = o.Icon;
                    return (
                        <button
                            key={o.key}
                            type="button"
                            onClick={() => onSelect(o.key)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-bold transition-colors"
                            style={{
                                borderLeft: `2px solid ${on ? 'var(--color-brand-primary)' : 'transparent'}`,
                                background: on ? 'rgba(16,185,129,0.07)' : 'transparent',
                                color:      on ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                            }}
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
