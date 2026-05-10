import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

const FalseClaimsCard = ({ falseClaims }) => {
    if (!falseClaims || falseClaims.length === 0) return null;

    return (
        <div className="rounded-xl overflow-hidden mt-3"
             style={{ background: '#da363314', borderLeft: '3px solid #da363366' }}>

            <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 pb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-mono font-bold text-[10px] tracking-widest uppercase">
                    // Haberdeki_Hatalı_Bilgiler
                </span>
            </div>

            <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
                {falseClaims.map((claim, i) => (
                    <div key={i} className="rounded-lg p-3"
                         style={{ background: '#da363320', border: '1px solid #da363340' }}>
                        <p className="text-red-300/80 text-sm line-through mb-1 leading-snug">
                            {claim.wrong_text}
                        </p>
                        <p className="text-tx-secondary text-sm leading-snug">
                            → {claim.correction}
                        </p>
                        {claim.source_url && (
                            <a
                                href={claim.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 mt-2 text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
                            >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                    {claim.source_title || claim.source_url}
                                </span>
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FalseClaimsCard;
