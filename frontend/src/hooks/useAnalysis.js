import { useState, useEffect, useRef } from 'react';
import AnalysisService from '../services/analysis.service';
import { useWebSocket } from '../contexts/WebSocketContext';

/**
 * Custom hook to manage the state and logic of text analysis,
 * including Celery task polling.
 */
export const useAnalysis = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [pollingTaskId, setPollingTaskId] = useState(null);
    const pendingTextRef = useRef(null);
    const { subscribe } = useWebSocket();

    useEffect(() => {
        if (!pollingTaskId) return;

        // ── WS hızlı yol: analysis_complete event gelince polling'i atlat ──
        const unsubWs = subscribe('analysis_complete', (payload) => {
            if (payload.task_id !== pollingTaskId) return;
            AnalysisService.checkStatus(pollingTaskId).then(response => {
                if (response.status === 'SUCCESS') {
                    setResult({
                        ...(response.result || response),
                        originalText: pendingTextRef.current,
                    });
                    pendingTextRef.current = null;
                    setLoading(false);
                    setPollingTaskId(null);
                }
            }).catch(() => {
                // Celery henüz hazır değil — normal polling devam eder
            });
        });

        // ── Fallback polling (WS yoksa veya event gelmediyse) ──────────────
        let interval;
        const startTime = Date.now();
        const MAX_POLL_MS = 90_000;  // Gemini soft_time_limit=90s ile eşleştirildi

        interval = setInterval(async () => {
            try {
                const response = await AnalysisService.checkStatus(pollingTaskId);

                const isDone = response.status === 'SUCCESS' && response.result?.ai_comment !== null;
                const isFailed = response.status === 'FAILED' || response.status === 'FAILURE';
                const isTimedOut = Date.now() - startTime > MAX_POLL_MS;

                if (isDone) {
                    setResult({
                        ...(response.result || response),
                        originalText: pendingTextRef.current,
                    });
                    pendingTextRef.current = null;
                    setLoading(false);
                    setPollingTaskId(null);
                    clearInterval(interval);
                } else if (isTimedOut && response.status === 'SUCCESS') {
                    // ai_comment null kaldı (Gemini skip/timeout) — sonucu yine de göster
                    setResult({
                        ...(response.result || response),
                        originalText: pendingTextRef.current,
                    });
                    pendingTextRef.current = null;
                    setLoading(false);
                    setPollingTaskId(null);
                    clearInterval(interval);
                } else if (isFailed) {
                    setError(response.result?.error || 'Analysis failed during background processing.');
                    setLoading(false);
                    setPollingTaskId(null);
                    clearInterval(interval);
                }
            } catch (err) {
                setError(err.message || "Failed to check analysis status.");
                setLoading(false);
                setPollingTaskId(null);
                clearInterval(interval);
            }
        }, 2000); // 2-second polling interval

        return () => {
            if (interval) clearInterval(interval);
            unsubWs();
        };
    }, [pollingTaskId, subscribe]);

    const analyzeUrl = async (url) => {
        if (!url || !url.trim()) {
            setError("Lütfen geçerli bir URL girin.");
            return;
        }
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const data = await AnalysisService.analyzeUrl(url);
            if (data.task_id) {
                pendingTextRef.current = null;
                setPollingTaskId(data.task_id);
            } else {
                setError("Sunucudan beklenmeyen yanıt.");
                setLoading(false);
            }
        } catch (err) {
            setError(err.message || "URL analizi başlatılamadı.");
            setLoading(false);
        }
    };

    const analyze = async (text) => {
        if (!text || !text.trim()) {
            setError("Lütfen analiz edilecek bir metin girin.");
            return;
        }

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const data = await AnalysisService.analyzeText(text);

            // Handle Immediate Matches
            if (data.is_direct_match) {
                setResult({
                    prediction:      data.direct_match_data?.mapped_status || 'UNKNOWN',
                    message:         data.message,
                    directMatchData: data.direct_match_data,
                    isDirectMatch:   true,
                    signals:         data.direct_match_data?.signals || {},
                    originalText:    text,
                });
                setLoading(false);
            }
            // Handle Async Tasks
            else if (data.task_id) {
                pendingTextRef.current = text;
                setPollingTaskId(data.task_id);
            } else {
                setError("Unexpected response from the server.");
                setLoading(false);
            }
        } catch (err) {
            setError(err.message || "Sunucuya bağlanılamadı. API'nin çalıştığından emin olun.");
            setLoading(false);
        }
    };

    const reset = () => {
        setLoading(false);
        setResult(null);
        setError(null);
        setPollingTaskId(null);
    };

    return { analyze, analyzeUrl, reset, loading, result, error, isPolling: !!pollingTaskId };
};
