import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, FileSearch, AlertTriangle, Loader2 } from 'lucide-react';
import AnalysisService from '../../services/analysis.service';

export default function FullReportModal({ taskId, onClose }) {
    const navigate = useNavigate();
    const [note,       setNote]       = useState('');
    const [similar,    setSimilar]    = useState(null);
    const [checking,   setChecking]   = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        AnalysisService.checkSimilar(taskId)
            .then(data => setSimilar(data))
            .catch(() => setSimilar({ found: false }))
            .finally(() => setChecking(false));
    }, [taskId]);

    const requestNew = async () => {
        if (submitting) return;
        setSubmitting(true);
        try { await AnalysisService.requestFullReport(taskId, note); } catch { /* devam */ }
        navigate(`/analysis/report/${taskId}`);
    };

    const goExisting = () => navigate(`/analysis/report/${similar.task_id}`);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-2xl border border-brutal-border/30 bg-surface-solid p-6 flex flex-col gap-5"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileSearch className="w-5 h-5 text-primary" />
                        <h2 className="font-manrope font-bold text-base text-tx-primary">Tam Rapor İste</h2>
                    </div>
                    <button onClick={onClose} className="text-tx-secondary/50 hover:text-tx-primary transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {checking ? (
                    <div className="flex items-center gap-2 text-tx-secondary/60 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Benzer raporlar kontrol ediliyor...
                    </div>
                ) : similar?.found ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col gap-3">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-amber-500 text-xs font-bold mb-1">
                                    %{similar.similarity} benzer bir rapor mevcut
                                </p>
                                <p className="text-tx-secondary text-xs leading-relaxed line-clamp-2">
                                    {similar.title || 'Benzer haber'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={goExisting}
                                className="flex-1 py-2 rounded-xl text-xs font-bold text-amber-500 border border-amber-500/40 hover:bg-amber-500/10 transition-colors"
                            >
                                Mevcut Raporu Gör
                            </button>
                            <button
                                onClick={() => setSimilar({ found: false })}
                                className="flex-1 py-2 rounded-xl text-xs font-bold text-tx-secondary border border-brutal-border/30 hover:text-tx-primary transition-colors"
                            >
                                Yeni Rapor Oluştur
                            </button>
                        </div>
                    </div>
                ) : null}

                {(!checking && !similar?.found) && (
                    <>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-tx-secondary/60">
                                Gemini&apos;ye Ekstra İstek <span className="normal-case font-normal">(opsiyonel)</span>
                            </label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                maxLength={500}
                                rows={3}
                                placeholder="Örn: Ekonomik boyutunu özellikle incele, kaynak güvenilirliğine odaklan..."
                                className="w-full rounded-xl border border-brutal-border/30 bg-surface-container-high/30 text-tx-primary text-sm p-3 resize-none placeholder:text-tx-secondary/30 focus:outline-none focus:border-primary/50 transition-colors"
                            />
                            <p className="text-[10px] text-tx-secondary/40 text-right">{note.length}/500</p>
                        </div>

                        <button
                            onClick={requestNew}
                            disabled={submitting}
                            className="w-full py-3 rounded-xl font-manrope font-bold text-sm transition-all disabled:opacity-50"
                            style={{ background: '#3fff8b22', color: '#3fff8b', border: '1px solid #3fff8b44' }}
                        >
                            {submitting ? 'Hazırlanıyor...' : 'Tam Raporu Oluştur'}
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
