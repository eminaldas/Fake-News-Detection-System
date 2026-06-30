import React from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import ConversationItem from './ConversationItem';
import NewConversation from './NewConversation';
import { C, RADIUS, BD } from '../shared/ui';

export default function ConversationList({
    conversations,
    loading,
    activeId,
    search,
    onSearchChange,
    onSelectConv,
    onNewClick,
    showNewConv,
    onNewClose,
    onNewSelect,
}) {
    const filtered = conversations.filter(c =>
        c.partner_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={`flex flex-col ${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-72 shrink-0 relative`}
             style={{ borderRight: `1px solid ${C.border}` }}>

            {showNewConv && (
                <NewConversation
                    onClose={onNewClose}
                    onSelect={onNewSelect}
                />
            )}

            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0" style={BD}>
                <span className="text-[17px] font-bold" style={{ color: C.textPrimary }}>Mesajlar</span>
                <button onClick={onNewClick}
                        className="p-1.5 transition-opacity hover:opacity-70"
                        style={{ color: C.green, border: `1px solid ${C.greenSoftBorder}`, borderRadius: RADIUS.pill }}>
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="px-3 py-2 border-b shrink-0" style={BD}>
                <div className="flex items-center gap-2 border px-3 py-2"
                     style={{ borderColor: C.border, background: 'var(--color-bg-base)', borderRadius: RADIUS.field }}>
                    <Search className="w-3.5 h-3.5 shrink-0" style={{ color: C.green }} />
                    <input value={search} onChange={onSearchChange}
                           placeholder="kişi veya kullanıcı ara…"
                           className="flex-1 bg-transparent text-sm outline-none"
                           style={{ color: C.textPrimary }} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                {loading ? (
                    <div className="p-6 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: C.green }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-xs" style={{ color: C.textMuted }}>
                        </p>
                    </div>
                ) : filtered.map(c => (
                    <ConversationItem key={c.partner_id} conv={c} active={activeId === c.partner_id}
                                     onClick={() => onSelectConv(c.partner_id)} />
                ))}
            </div>
        </div>
    );
}
