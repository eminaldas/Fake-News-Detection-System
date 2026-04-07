// frontend/src/features/analysis/ImageResultCard.jsx
import React, { useRef, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Shield, ExternalLink } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const VERDICT_CONFIG = {
    AI_GENERATED: { label: 'AI Üretimi',        color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.25)',    icon: AlertTriangle },
    MANIPULATED:  { label: 'Manipüle Edilmiş',  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.25)',   icon: AlertTriangle },
    AUTHENTIC:    { label: 'Özgün Görsel',       color: '#22c55e', bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.25)',    icon: CheckCircle2  },
    UNCERTAIN:    { label: 'Belirsiz',           color: '#a1a1aa', bg: 'rgba(161,161,170,0.08)',  border: 'rgba(161,161,170,0.25)', icon: HelpCircle    },
};

const BoundingBoxOverlay = ({ boxes, imgRef }) => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas || !boxes?.length) return;
        const draw = () => {
            canvas.width  = img.offsetWidth;
            canvas.height = img.offsetHeight;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            boxes.forEach(({ coords, label }) => {
                const [ymin, xmin, ymax, xmax] = coords;
                const x = (xmin / 1000) * canvas.width;
                const y = (ymin / 1000) * canvas.height;
                const w = ((xmax - xmin) / 1000) * canvas.width;
                const h = ((ymax - ymin) / 1000) * canvas.height;
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth   = 2;
                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = 'rgba(239,68,68,0.75)';
                const labelW = ctx.measureText(label).width + 8;
                ctx.fillRect(x, y - 18, labelW, 18);
                ctx.fillStyle = '#fff';
                ctx.font = '11px Inter, sans-serif';
                ctx.fillText(label, x + 4, y - 5);
            });
        };
        if (img.complete) draw();
        else img.addEventListener('load', draw);
        return () => img.removeEventListener('load', draw);
    }, [boxes, imgRef]);
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }} />;
};

const ImageResultCard = ({ result, exifFlags, previewUrl, isPolling }) => {
    const { isDarkMode } = useTheme();
    const imgRef = useRef(null);
    const cardBorder = { borderColor: isDarkMode ? 'rgba(63,255,139,0.2)' : 'rgba(24,24,27,0.18)' };

    if (!result && !isPolling && !exifFlags) return null;

    const cfgKey = result?.verdict || 'UNCERTAIN';
    const cfg = { ...VERDICT_CONFIG[cfgKey] || VERDICT_CONFIG.UNCERTAIN };
    const Icon = cfg.icon;
    const hasBoundingBoxes = result?.bounding_boxes?.length > 0;
    const hasLinks = result?.reverse_search_links?.length > 0;

    return (
        <div className="glass rounded-2xl overflow-hidden animate-fade-up border" style={cardBorder}>
            {result && <div className="h-1 w-full" style={{ background: cfg.color }} />}
            <div className="p-6 space-y-5">

                {/* Katman 1 */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Katman 1 — Veritabanı</p>
                    {result?.layer === 1 ? (
                        <p className="text-sm text-amber-400 font-medium flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> Bu görsel daha önce analiz edildi — önbellekten yüklendi.
                        </p>
                    ) : (
                        <p className="text-sm text-tx-secondary flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" /> Veritabanında eşleşme bulunamadı.
                        </p>
                    )}
                </div>

                {/* Katman 2 */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Katman 2 — EXIF Metadata</p>
                    {exifFlags && Object.keys(exifFlags).length > 0 ? (
                        <div className="space-y-1">
                            {Object.entries(exifFlags).map(([k, v]) => (
                                <p key={k} className="text-sm text-amber-400 flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-medium">{k}:</span>
                                    <span className="text-tx-secondary truncate">{v}</span>
                                </p>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-tx-secondary flex items-center gap-2">
                            <Shield className="w-4 h-4 shrink-0 text-green-400" /> Metadata şüpheli yazılım izi içermiyor.
                        </p>
                    )}
                </div>

                {/* Katman 3 */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Katman 3 — Gemini AI Analizi</p>
                    {isPolling && !result && (
                        <div className="flex items-center gap-3 text-sm text-tx-secondary">
                            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                            Gemini görseli analiz ediyor...
                        </div>
                    )}
                    {result && result.layer !== 1 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                <Icon className="w-5 h-5 shrink-0" style={{ color: cfg.color }} />
                                <div>
                                    <p className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</p>
                                    <p className="text-xs text-tx-secondary">%{Math.round((result.confidence || 0) * 100)} güven</p>
                                </div>
                            </div>
                            {previewUrl && (
                                <div className="relative rounded-xl overflow-hidden">
                                    <img ref={imgRef} src={previewUrl} alt="Analiz edilen görsel"
                                         className="w-full max-h-72 object-contain rounded-xl"
                                         style={{ background: 'var(--color-bg-surface-solid)' }} />
                                    {hasBoundingBoxes && <BoundingBoxOverlay boxes={result.bounding_boxes} imgRef={imgRef} />}
                                </div>
                            )}
                            {result.explanation && (
                                <p className="text-sm text-tx-secondary leading-relaxed"
                                   style={{ borderLeft: `3px solid ${cfg.color}`, paddingLeft: '12px' }}>
                                    {result.explanation}
                                </p>
                            )}
                            {hasLinks && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Tersine Arama Kaynakları</p>
                                    <div className="space-y-2">
                                        {result.reverse_search_links.map((link, i) => (
                                            <div key={i} className="flex items-start gap-2 p-2 rounded-lg"
                                                 style={{ background: 'var(--color-bg-surface-solid)' }}>
                                                <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted" />
                                                <div className="min-w-0">
                                                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                                                       className="text-xs font-medium text-brand hover:underline truncate block">
                                                        {link.title}
                                                    </a>
                                                    {link.context && <p className="text-[11px] text-tx-secondary mt-0.5">{link.context}</p>}
                                                    <p className="text-[10px] text-amber-500 mt-0.5">⚠️ Bağlantıyı kendiniz doğrulayın</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageResultCard;
