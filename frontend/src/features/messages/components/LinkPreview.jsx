// frontend/src/features/messages/components/LinkPreview.jsx
import React, { useState, useEffect } from 'react';
import { Play, Link2 } from 'lucide-react';
import axiosInstance from '../../../api/axios';
import { C, RADIUS } from '../shared/ui';

// Module-level cache: aynı URL'yi tekrar çekmekten kaçınır (remount dahil).
const previewCache = new Map();

export default function LinkPreview({ url, isMine }) {
    // useState lazy initializer: mount sırasında cache'e bakılır → synchronous effect setState yok.
    const [data, setData]         = useState(() => previewCache.has(url) ? previewCache.get(url) : null);
    const [loading, setLoading]   = useState(!previewCache.has(url));
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        // Cache hit: useState zaten doğru değeri aldı; tekrar fetch etme.
        if (previewCache.has(url)) return;

        let cancelled = false;
        axiosInstance.get('/link-preview', { params: { url } })
            .then(r => {
                if (cancelled) return;
                previewCache.set(url, r.data);
                setData(r.data);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                previewCache.set(url, null);
                setData(null);
                setLoading(false);
            });
        return () => { cancelled = true; };
    }, [url]);

    /* Yükleniyor → ince skeleton */
    if (loading) {
        return (
            <div className="mt-2 border p-3 animate-pulse"
                 style={{
                     borderColor:  isMine ? C.greenSoftBorder : C.border,
                     borderRadius: RADIUS.card,
                 }}>
                <div className="h-3 rounded mb-1.5"
                     style={{ background: C.border, width: '60%' }} />
                <div className="h-2.5 rounded"
                     style={{ background: C.border, width: '40%' }} />
            </div>
        );
    }

    /* Hata veya boş başlık → sessizce gizle (ham link balon metninde kalır) */
    if (!data || !data.title) return null;

    const bg      = isMine ? C.greenSoft       : C.surface;
    const bdC     = isMine ? C.greenSoftBorder : C.border;
    const r       = RADIUS.card;
    const proxyImg = (imgUrl) => `/proxy/image?url=${encodeURIComponent(imgUrl)}`;
    const hasImage = data.image && !imgError;

    /* ── C: Video kartı ────────────────────────────────────────────────── */
    if (data.type === 'video' && hasImage) {
        return (
            <a href={data.url || url} target="_blank" rel="noopener noreferrer"
               className="mt-2 block overflow-hidden transition-opacity hover:opacity-80"
               style={{ background: bg, border: `1px solid ${bdC}`, borderRadius: r, textDecoration: 'none' }}>
                <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <img src={proxyImg(data.image)} alt=""
                         onError={() => setImgError(true)}
                         className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full p-3"
                             style={{ background: 'rgba(0,0,0,0.5)' }}>
                            <Play className="w-6 h-6"
                                  style={{ fill: '#ffffff', color: '#ffffff' }} />
                        </div>
                    </div>
                </div>
                <div className="px-3 py-2">
                    <p className="font-mono text-xs font-bold leading-snug line-clamp-2"
                       style={{ color: C.textPrimary }}>{data.title}</p>
                    {data.site && (
                        <p className="font-mono text-[10px] mt-0.5"
                           style={{ color: C.textSecondary }}>{data.site}</p>
                    )}
                </div>
            </a>
        );
    }

    /* ── B: Görsel kartı ───────────────────────────────────────────────── */
    if (data.type === 'image' && hasImage) {
        return (
            <a href={data.url || url} target="_blank" rel="noopener noreferrer"
               className="mt-2 block overflow-hidden transition-opacity hover:opacity-80"
               style={{ background: bg, border: `1px solid ${bdC}`, borderRadius: r, textDecoration: 'none' }}>
                <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <img src={proxyImg(data.image)} alt=""
                         onError={() => setImgError(true)}
                         className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="px-3 py-2">
                    <p className="font-mono text-xs font-bold leading-snug line-clamp-2"
                       style={{ color: C.textPrimary }}>{data.title}</p>
                    {data.description && (
                        <p className="font-mono text-[10px] leading-snug line-clamp-2 mt-0.5"
                           style={{ color: C.textSecondary }}>{data.description}</p>
                    )}
                    {data.site && (
                        <p className="font-mono text-[10px] mt-0.5"
                           style={{ color: C.textMuted }}>{data.site}</p>
                    )}
                </div>
            </a>
        );
    }

    /* ── A: Kompakt / fallback (görsel yok veya yüklenemedi) ─────────── */
    return (
        <a href={data.url || url} target="_blank" rel="noopener noreferrer"
           className="mt-2 flex items-start gap-2.5 transition-opacity hover:opacity-80"
           style={{ background: bg, border: `1px solid ${bdC}`, borderRadius: r,
                    textDecoration: 'none', padding: '8px 12px' }}>
            <Link2 className="w-4 h-4 shrink-0 mt-0.5"
                   style={{ color: C.textSecondary }} />
            <div className="min-w-0">
                <p className="font-mono text-xs font-bold leading-snug line-clamp-2"
                   style={{ color: C.textPrimary }}>{data.title}</p>
                {data.site && (
                    <p className="font-mono text-[10px] mt-0.5"
                       style={{ color: C.textSecondary }}>{data.site}</p>
                )}
            </div>
        </a>
    );
}
