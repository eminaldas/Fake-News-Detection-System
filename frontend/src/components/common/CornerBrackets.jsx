import React from 'react';

/**
 * Hero kutusundaki köşe parantezleri (3px×22px) — market band, hava durumu
 * ve aktif navbar sekmesi gibi çentikli kutularda tekrar kullanılır.
 */
export default function CornerBrackets({ color = 'var(--color-brand-primary)', length = 20, thickness = 3 }) {
    const h = (pos) => ({ position: 'absolute', height: thickness, width: length, background: color, ...pos });
    const v = (pos) => ({ position: 'absolute', width: thickness, height: length, background: color, ...pos });
    return (
        <span className="pointer-events-none" aria-hidden="true">
            <span style={h({ top: 0, left: 0 })} />    <span style={v({ top: 0, left: 0 })} />
            <span style={h({ top: 0, right: 0 })} />   <span style={v({ top: 0, right: 0 })} />
            <span style={h({ bottom: 0, left: 0 })} /> <span style={v({ bottom: 0, left: 0 })} />
            <span style={h({ bottom: 0, right: 0 })} /><span style={v({ bottom: 0, right: 0 })} />
        </span>
    );
}
