import { ArrowLeft, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../shared/Avatar';
import { C, BD } from '../shared/ui';

export default function ChatHeader({ partner, onBack }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={BD}>
            <button
                onClick={onBack}
                className="md:hidden p-1 transition-opacity hover:opacity-60"
                style={{ color: C.textMuted }}
            >
                <ArrowLeft className="w-4 h-4" />
            </button>
            <Link to={`/users/${partner.id}`}>
                <Avatar user={partner} size={34} />
            </Link>
            <div className="flex-1 min-w-0">
                <Link
                    to={`/users/${partner.id}`}
                    className="font-mono text-sm font-semibold transition-opacity hover:opacity-70 block truncate"
                    style={{ color: C.textPrimary }}
                >
                    {partner.username}
                </Link>
                {partner.trust_label && (
                    <p className="font-mono text-[10px]" style={{ color: C.textSecondary }}>
                        {partner.trust_label}
                    </p>
                )}
            </div>
            <span
                className="p-1 opacity-40"
                style={{ color: C.textSecondary, pointerEvents: 'none' }}
                aria-hidden="true"
            >
                <Info className="w-4 h-4" />
            </span>
        </div>
    );
}
