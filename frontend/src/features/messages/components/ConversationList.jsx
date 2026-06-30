import React from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import ConversationItem from './ConversationItem';
import NewConversation from './NewConversation';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };

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
             style={{ borderRight: '1px solid var(--color-terminal-border-raw)' }}>

            {showNewConv && (
                <NewConversation
                    onClose={onNewClose}
                    onSelect={onNewSelect}
                />
            )}

            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0" style={BD}>
                <span className="font-mono text-xs tracking-widest uppercase"
                      style={{ color: 'var(--color-brand-primary)' }}>// MESAJLAR</span>
                <button onClick={onNewClick}
                        className="p-1.5 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-brand-primary)', border: '1px solid rgba(16,185,129,0.30)' }}>
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="px-3 py-2 border-b shrink-0" style={BD}>
                <div className="flex items-center gap-2 border px-3 py-2"
                     style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-bg-base)' }}>
                    <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                    <input value={search} onChange={onSearchChange}
                           placeholder="Kişi ara..."
                           className="flex-1 bg-transparent font-mono text-xs outline-none"
                           style={{ color: 'var(--color-text-primary)' }} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                {loading ? (
                    <div className="p-6 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
