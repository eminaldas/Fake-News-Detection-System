import React from 'react';
import axiosInstance from '../../api/axios';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

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
    const inputRef  = React.useRef(null);

    React.useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setShowDrop(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
                className="flex flex-wrap gap-1.5 px-3 py-2 border min-h-[36px] cursor-text"
                style={BD}
                onClick={() => inputRef.current?.focus()}
            >
                {value.map(tag => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 border"
                        style={{
                            background: 'rgba(16,185,129,0.08)',
                            color:      'var(--color-brand-primary)',
                            borderColor: 'rgba(16,185,129,0.25)',
                        }}
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                            className="font-mono text-[10px] transition-opacity hover:opacity-60 ml-0.5"
                            style={{ color: 'var(--color-brand-primary)' }}
                        >
                            ✕
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    value={inputVal}
                    onChange={e => { setInputVal(e.target.value); setShowDrop(true); }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputVal && setShowDrop(true)}
                    placeholder={value.length === 0 ? '# ile başlat, Enter ile ekle' : ''}
                    className="flex-1 min-w-[100px] bg-transparent outline-none font-mono text-[11px]"
                    style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                />
            </div>

            {showDrop && suggestions.length > 0 && (
                <div
                    className="absolute z-50 top-full mt-0.5 left-0 right-0 border overflow-hidden"
                    style={TS}
                >
                    {suggestions.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); addTag(t.name); }}
                            className="w-full text-left px-3 py-2 flex items-center justify-between border-b transition-colors hover:bg-white/5"
                            style={{ borderColor: 'var(--color-terminal-border-raw)' }}
                        >
                            <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-primary)' }}>{t.name}</span>
                            <span className="font-mono text-[9px]" style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }}>{t.usage_count}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagInput;
