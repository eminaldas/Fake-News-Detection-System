import React from 'react';
import { Info } from 'lucide-react';
import Tooltip from '../../ui/Tooltip';

export default function InfoTip({ text, side = 'top' }) {
    return (
        <Tooltip content={text} side={side} maxWidth={240}>
            <Info className="w-3.5 h-3.5 ml-1 align-text-bottom"
                  style={{ color: 'var(--color-text-muted)', cursor: 'help' }} />
        </Tooltip>
    );
}
