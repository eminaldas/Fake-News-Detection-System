import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../shared/Avatar';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const TIER_COLOR = {
    yeni_uye:    'var(--color-text-muted)',
    dogrulayici: 'var(--color-accent-blue)',
    analist:     'var(--color-accent-amber)',
    dedektif:    'var(--color-brand-primary)',
};

export default function ChatHeader({ partner, onBack }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={BD}>
            <button
                onClick={onBack}
                className="md:hidden p-1 transition-opacity hover:opacity-60"
                style={{ color: 'var(--color-text-muted)' }}
            >
                <ArrowLeft className="w-4 h-4" />
            </button>
            <Link to={`/users/${partner.id}`}>
                <Avatar user={partner} size={32} />
            </Link>
            <div className="flex-1 min-w-0">
                <Link
                    to={`/users/${partner.id}`}
                    className="font-mono text-sm font-bold transition-opacity hover:opacity-70 block truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {partner.username}
                </Link>
                {partner.trust_label && (
                    <p
                        className="font-mono text-[10px]"
                        style={{ color: TIER_COLOR[partner.trust_tier] ?? 'var(--color-text-muted)' }}
                    >
                        {partner.trust_label}
                    </p>
                )}
            </div>
        </div>
    );
}
