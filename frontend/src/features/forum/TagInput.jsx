import React from 'react';
import { X } from 'lucide-react';
import axiosInstance from '../../api/axios';

// 300ms debounce helper
function useDebounce(value, delay) {
    const [dv, setDv] = React.useState(value);
    React.useEffect(() => {
        const t = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return dv;
}

const TagInput = ({ value = [], onChange, category = '', maxTags = 10 }) => {
    const [inputVal,    setInputVal]    = React.useState('');
    const [suggestions, setSuggestions] = React.useState([]);
    const [showDrop,    setShowDrop]    = React.useState(false);
    const debounced = useDebounce(inputVal, 300);
    const wrapRef   = React.useRef(null);

    // Dışarı tıklayınca dropdown kapat
    React.useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setShowDrop(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounced search
    React.useEffect(() => {
        if (!debounced) { setSuggestions([]); return; }
        axiosInstance.get('/forum/tags', { params: { search: debounced, category, limit: 8 } })
            .then(r => setSuggestions(r.data.tags ?? []))
            .catch(() => {});
    }, [debounced, category]);

    const addTag = (name) => {
        const normalized = name.startsWith('#') ? name : `#${name}`;
        if (!value.includes(normalized) && value.length < maxTags) {
            onChange([...value, normalized]);
        }
        setInputVal('');
        setSuggestions([]);
        setShowDrop(false);
    };

    const removeTag = (name) => onChange(value.filter(t => t !== name));

    const handleKeyDown = (e) => {
        if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
            e.preventDefault();
            addTag(inputVal.trim());
        }
        if (e.key === 'Backspace' && !inputVal && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    };

    return (
        <div ref={wrapRef} className="relative">
            <div
                className="flex flex-wrap gap-1.5 p-2 rounded-lg border min-h-[38px] cursor-text"
                style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}
                onClick={() => document.getElementById('tag-input-field')?.focus()}
            >
                {value.map(tag => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                            background: 'rgba(16,185,129,0.10)',
                            color:      'var(--color-brand-primary)',
                            border:     '1px solid rgba(16,185,129,0.25)',
                        }}
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                            className="hover:opacity-70"
                        >
                            <X className="w-2.5 h-2.5" />
                        </button>
                    </span>
                ))}
                <input
                    id="tag-input-field"
                    value={inputVal}
                    onChange={e => { setInputVal(e.target.value); setShowDrop(true); }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputVal && setShowDrop(true)}
                    placeholder={value.length === 0 ? '# ile başlat, Enter ile ekle' : ''}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-[11px] text-tx-primary placeholder:text-muted"
                />
            </div>

            {/* Öneri dropdown */}
            {showDrop && suggestions.length > 0 && (
                <div
                    className="absolute z-50 top-full mt-1 left-0 right-0 rounded-lg border shadow-lg overflow-hidden"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                    {suggestions.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); addTag(t.name); }}
                            className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                            <span className="text-[11px] text-tx-primary">{t.name}</span>
                            <span className="text-[9px] text-muted">{t.usage_count} kullanım</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagInput;
