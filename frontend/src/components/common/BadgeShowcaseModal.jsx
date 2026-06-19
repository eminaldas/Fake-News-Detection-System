import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import GamificationService from '../../services/gamification.service';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const Corner = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
);

export default function BadgeShowcaseModal({ onClose, onSave }) {
    const [badges,   setBadges]   = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(false);

    useEffect(() => {
        GamificationService.getMyBadges()
            .then(data => {
                setBadges(data.earned || []);
                const current = (data.earned || [])
                    .filter(b => b.is_showcased)
                    .sort((a, b) => (a.showcase_order ?? 99) - (b.showcase_order ?? 99))
                    .map(b => b.key);
                setSelected(current);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const toggle = (key) => {
        if (selected.includes(key)) {
            setSelected(s => s.filter(k => k !== key));
        } else if (selected.length < 3) {
            setSelected(s => [...s, key]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await GamificationService.updateShowcase(selected);
            onSave?.(selected);
            onClose();
        } catch { } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.80)' }} onClick={onClose}>
            <div className="relative border w-96 max-h-[80vh] flex flex-col"
                 style={S} onClick={e => e.stopPropagation()}>
                <Corner />
                <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                    <span className="font-mono text-xs tracking-widest uppercase"
                          style={{ color: 'var(--color-brand-primary)' }}>
                    </span>
                    <button onClick={onClose} className="transition-opacity hover:opacity-60"
                            style={{ color: 'var(--color-text-muted)' }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                    {loading
                        ? <p className="p-4 font-mono text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</p>
                        : badges.length === 0
                            ? <p className="p-4 font-mono text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>// henüz rozet yok</p>
                            : (
                                <div className="grid grid-cols-2 gap-1.5">
                                    {badges.map(b => {
                                        const isSelected = selected.includes(b.key);
                                        return (
                                            <button key={b.key} onClick={() => toggle(b.key)}
                                                    className="relative flex items-center gap-2 px-3 py-2.5 border text-left transition-colors"
                                                    style={{ borderColor: isSelected ? b.color : 'var(--color-terminal-border-raw)', background: isSelected ? `${b.color}15` : 'transparent' }}>
                                                {isSelected && (
                                                    <span className="absolute top-1 right-1">
                                                        <Check className="w-3 h-3" style={{ color: b.color }} />
                                                    </span>
                                                )}
                                                <div className="shrink-0 w-7 h-7 flex items-center justify-center border"
                                                     style={{ borderColor: b.color, color: b.color }}>
                                                    <span className="font-mono text-xs font-black">{b.name[0]}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-mono text-xs font-bold truncate"
                                                       style={{ color: isSelected ? b.color : 'var(--color-text-primary)' }}>{b.name}</p>
                                                    <p className="font-mono text-[9px] truncate"
                                                       style={{ color: 'var(--color-text-muted)' }}>{b.category}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )
                    }
                </div>
                <div className="px-4 py-3 border-t flex justify-end gap-2" style={BD}>
                    <button onClick={onClose}
                            className="px-4 py-1.5 font-mono text-xs border transition-colors hover:bg-white/5"
                            style={BD}>İptal</button>
                    <button onClick={handleSave} disabled={saving}
                            className="px-4 py-1.5 font-mono text-xs border transition-colors"
                            style={{ background: 'var(--color-brand-primary)', color: '#070f12', borderColor: 'var(--color-brand-primary)', opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
}
