import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import axiosInstance from '../../api/axios';
import toast from '../../services/toast';

export default function CategoryCustomizeModal({
  categories, hiddenCategories, hiddenSubcategories, onClose, onChange,
}) {
  const [hidCats, setHidCats] = useState(hiddenCategories);
  const [hidSubs, setHidSubs] = useState(hiddenSubcategories);
  const [expanded, setExpanded] = useState({});

  const patch = async (payload) => {
    try {
      await axiosInstance.patch('/users/me/feed-preferences', payload);
      onChange && onChange();
    } catch {
      toast.error('Tercih kaydedilemedi.');
      return false;
    }
    return true;
  };

  const toggleMain = async (slug) => {
    const isHidden = hidCats.includes(slug);
    const next = isHidden ? hidCats.filter(s => s !== slug) : [...hidCats, slug];
    setHidCats(next);  // optimistic
    const ok = await patch(isHidden ? { remove_hidden_category: slug } : { add_hidden_category: slug });
    if (!ok) setHidCats(hidCats);
  };

  const toggleSub = async (mainSlug, subSlug) => {
    const pair = `${mainSlug}/${subSlug}`;
    const isHidden = hidSubs.includes(pair);
    const next = isHidden ? hidSubs.filter(s => s !== pair) : [...hidSubs, pair];
    setHidSubs(next);
    const ok = await patch(isHidden ? { remove_hidden_subcategory: pair } : { add_hidden_subcategory: pair });
    if (!ok) setHidSubs(hidSubs);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl"
        style={{ background: 'var(--color-terminal-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid var(--color-border)' }}>
          <span className="text-sm font-bold tracking-wide"
                style={{ color: 'var(--color-text-primary)' }}>
            Kategorileri Özelleştir
          </span>
          <button onClick={onClose} style={{ color: 'var(--color-text-secondary)' }}><X size={18} /></button>
        </div>
        <p className="px-5 pt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Görmek istemediğin kategorileri gizle. İstediğin zaman tekrar açabilirsin.
        </p>

        <div className="p-3 space-y-1">
          {categories.map((m) => {
            const mainHidden = hidCats.includes(m.slug);
            const isOpen = expanded[m.slug];
            return (
              <div key={m.slug} className="rounded-lg"
                   style={{ border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 px-3 py-2">
                  {m.subcategories.length > 0 ? (
                    <button onClick={() => setExpanded(p => ({ ...p, [m.slug]: !isOpen }))}
                            style={{ color: 'var(--color-text-secondary)' }}>
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  ) : <span style={{ width: 16 }} />}
                  <span className="flex-1 text-sm font-semibold"
                        style={{ color: mainHidden ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                                 textDecoration: mainHidden ? 'line-through' : 'none' }}>
                    {m.name}
                  </span>
                  <button onClick={() => toggleMain(m.slug)}
                          title={mainHidden ? 'Göster' : 'Gizle'}
                          style={{ color: mainHidden ? 'var(--color-text-secondary)' : 'var(--color-brand-primary)' }}>
                    {mainHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {isOpen && m.subcategories.length > 0 && (
                  <div className="pl-9 pr-3 pb-2 flex flex-wrap gap-2">
                    {m.subcategories.map((s) => {
                      const subHidden = hidSubs.includes(`${m.slug}/${s.slug}`);
                      return (
                        <button key={s.slug} onClick={() => toggleSub(m.slug, s.slug)}
                          className="text-[11px] font-semibold px-2 py-1 rounded-full"
                          style={{
                            background: subHidden ? 'transparent' : 'var(--color-brand-primary)',
                            color: subHidden ? 'var(--color-text-secondary)' : '#fff',
                            border: '1px solid var(--color-border)',
                            textDecoration: subHidden ? 'line-through' : 'none',
                            opacity: subHidden ? 0.6 : 1,
                          }}>
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
