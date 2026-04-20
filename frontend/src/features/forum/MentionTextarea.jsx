import React from 'react';
import axiosInstance from '../../api/axios';

const AVATAR_COLORS = [
    ['rgba(16,185,129,0.15)',  'var(--color-brand-primary)'],
    ['rgba(59,130,246,0.15)',  'var(--color-accent-blue)'],
    ['rgba(245,158,11,0.15)',  'var(--color-accent-amber)'],
    ['rgba(168,85,247,0.15)',  '#a855f7'],
    ['rgba(239,68,68,0.15)',   'var(--color-fake-fill)'],
];

function getAvatarColor(username = '') {
    const idx = username.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
}

const MentionTextarea = ({ value, onChange, placeholder, rows = 4, id, className, style }) => {
    const textareaRef   = React.useRef(null);
    const debounceRef   = React.useRef(null);
    const dropdownRef   = React.useRef(null);

    const [suggestions,   setSuggestions]   = React.useState([]);
    const [showDropdown,  setShowDropdown]  = React.useState(false);
    const [mentionStart,  setMentionStart]  = React.useState(null); // index of '@' in value
    const [activeIndex,   setActiveIndex]   = React.useState(0);

    // Close dropdown on click outside
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                textareaRef.current && !textareaRef.current.contains(e.target)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = React.useCallback(async (query) => {
        if (query.length < 2) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }
        try {
            const { data } = await axiosInstance.get('/users/mention-search', { params: { q: query } });
            setSuggestions(data);
            setShowDropdown(data.length > 0);
            setActiveIndex(0);
        } catch {
            setSuggestions([]);
            setShowDropdown(false);
        }
    }, []);

    const handleChange = (e) => {
        const newValue   = e.target.value;
        const cursorPos  = e.target.selectionStart;

        onChange(newValue);

        // Find the '@word' that the cursor is currently inside
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const match = textBeforeCursor.match(/@(\w*)$/);

        if (match) {
            const atIndex = cursorPos - match[0].length;
            setMentionStart(atIndex);

            const query = match[1];
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                fetchSuggestions(query);
            }, 300);
        } else {
            setShowDropdown(false);
            setMentionStart(null);
            clearTimeout(debounceRef.current);
        }
    };

    const applyMention = (username) => {
        if (mentionStart === null) return;

        const cursorPos     = textareaRef.current?.selectionStart ?? value.length;
        const beforeMention = value.slice(0, mentionStart);
        const afterCursor   = value.slice(cursorPos);

        // Find end of the partial @word after mentionStart
        const partialEnd    = value.slice(mentionStart).search(/\s|$/);
        const endIndex      = mentionStart + (partialEnd >= 0 ? partialEnd : value.length - mentionStart);
        const afterMention  = value.slice(endIndex);

        const newValue = `${beforeMention}@${username} ${afterMention}`;
        onChange(newValue);

        setShowDropdown(false);
        setSuggestions([]);
        setMentionStart(null);

        // Restore focus and place cursor after inserted mention
        const newCursorPos = mentionStart + username.length + 2; // '@' + username + ' '
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        });
    };

    const handleKeyDown = (e) => {
        if (!showDropdown) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && showDropdown) {
            e.preventDefault();
            if (suggestions[activeIndex]) {
                applyMention(suggestions[activeIndex].username);
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    return (
        <div className="relative w-full">
            <textarea
                ref={textareaRef}
                id={id}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                rows={rows}
                placeholder={placeholder}
                className={className}
                style={style}
            />

            {showDropdown && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto"
                    style={{ top: '100%', marginTop: 4 }}
                >
                    {suggestions.map((user, idx) => {
                        const [avatarBg, avatarColor] = getAvatarColor(user.username);
                        return (
                            <button
                                key={user.id}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault(); // prevent textarea blur
                                    applyMention(user.username);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-700 transition-colors"
                                style={{
                                    background: idx === activeIndex ? 'rgba(255,255,255,0.06)' : undefined,
                                }}
                            >
                                <div
                                    className="rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                    style={{
                                        width: 24,
                                        height: 24,
                                        background: avatarBg,
                                        color: avatarColor,
                                    }}
                                >
                                    {user.username[0].toUpperCase()}
                                </div>
                                <span className="text-[12px] text-white font-medium">@{user.username}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MentionTextarea;
