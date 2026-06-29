// frontend/src/features/messages/shared/LinkedText.jsx
import React from 'react';
import { splitLinkParts } from './linkify';

export default function LinkedText({ text }) {
    const parts = splitLinkParts(text);
    return (
        <>
            {parts.map((p, i) =>
                p.type === 'url'
                    ? <a key={i} href={p.value} target="_blank" rel="noopener noreferrer"
                         className="underline break-all"
                         style={{ color: 'inherit', opacity: 0.85 }}>{p.value}</a>
                    : <React.Fragment key={i}>{p.value}</React.Fragment>
            )}
        </>
    );
}
