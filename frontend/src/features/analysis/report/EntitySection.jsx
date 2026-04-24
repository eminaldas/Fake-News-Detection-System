import React from 'react';
import { User, Building2, MapPin } from 'lucide-react';

const TYPE_CONFIG = {
    person: { Icon: User,      label: 'Kişi',  color: '#60a5fa' },
    org:    { Icon: Building2, label: 'Kurum', color: '#a78bfa' },
    place:  { Icon: MapPin,    label: 'Yer',   color: '#34d399' },
};

export default function EntitySection({ entities }) {
    if (!entities?.length) return null;
    return (
        <div className="space-y-3">
            <h3 className="text-tx-secondary font-manrope font-bold text-[10px] tracking-widest uppercase">
                Varlık Profili
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {entities.map((e, i) => {
                    const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.person;
                    return (
                        <div key={i} className="rounded-xl p-3 border border-brutal-border/40 bg-surface-solid flex items-start gap-2">
                            <cfg.Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: cfg.color }} />
                            <div>
                                <span className="text-[9px] font-bold uppercase tracking-widest block" style={{ color: cfg.color }}>
                                    {cfg.label}
                                </span>
                                <p className="text-tx-primary text-sm font-medium">{e.name}</p>
                                {e.context && <p className="text-tx-secondary text-xs mt-0.5">{e.context}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
