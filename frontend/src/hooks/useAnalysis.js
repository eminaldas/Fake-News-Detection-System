import { useState, useEffect, useRef } from 'react';
import AnalysisService from '../services/analysis.service';
import { useWebSocket } from '../contexts/WebSocketContext';

export const useAnalysis = () => {
    const [loading, setLoading]             = useState(false);
    const [result, setResult]               = useState(null);
    const [error, setError]                 = useState(null);
    const [pollingTaskId, setPollingTaskId] = useState(null);
    const [analysisStage, setAnalysisStage] = useState(null);
    const pendingTextRef = useRef(null);
    const { subscribe }  = useWebSocket();

    useEffect(() => {
        if (!pollingTaskId) return;

        const unsubProgress = subscribe('analysis_progress', (payload) => {
            if (payload.stage) setAnalysisStage(payload.stage);
        });

        const unsubComplete = subscribe('analysis_complete', (payload) => {
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
                    setAnalysisStage(null);
                }
            }).catch(() => {});
        });

        const startTime = Date.now();
        const MAX_POLL_MS = 90_000;

        const interval = setInterval(async () => {
            try {
                const response = await AnalysisService.checkStatus(pollingTaskId);
                const isDone     = response.status === 'SUCCESS' && response.result?.ai_comment !== null;
                const isFailed   = response.status === 'FAILED' || response.status === 'FAILURE';
                const isTimedOut = Date.now() - startTime > MAX_POLL_MS;

                if (isDone) {
                    setResult({ ...(response.result || response), originalText: pendingTextRef.current });
                    pendingTextRef.current = null;
                    setLoading(false);
                    setPollingTaskId(null);
                    setAnalysisStage(null);
                    clearInterval(interval);
                } else if (isTimedOut && response.status === 'SUCCESS') {
                    setResult({ ...(response.result || response), originalText: pendingTextRef.current });
                    pendingTextRef.current = null;
                    setLoading(false);
                    setPollingTaskId(null);
                    setAnalysisStage(null);
                    clearInterval(interval);
                } else if (isFailed) {
                    setError(response.result?.error || 'Analiz başarısız.');
                    setLoading(false);
                    setPollingTaskId(null);
                    setAnalysisStage(null);
                    clearInterval(interval);
                }
            } catch (err) {
                setError(err.message || 'Durum kontrol edilemedi.');
                setLoading(false);
                setPollingTaskId(null);
                setAnalysisStage(null);
                clearInterval(interval);
            }
        }, 10_000);

        return () => {
            clearInterval(interval);
            unsubProgress();
            unsubComplete();
        };
    }, [pollingTaskId, subscribe]);

    const analyzeUrl = async (url) => {
        if (!url?.trim()) { setError('Lütfen geçerli bir URL girin.'); return; }
        setLoading(true); setResult(null); setError(null); setAnalysisStage(null);
        try {
            const data = await AnalysisService.analyzeUrl(url);
            if (data.task_id) { pendingTextRef.current = null; setPollingTaskId(data.task_id); }
            else { setError('Sunucudan beklenmeyen yanıt.'); setLoading(false); }
        } catch (err) {
            setError(err.message || 'URL analizi başlatılamadı.'); setLoading(false);
        }
    };

    const analyze = async (text) => {
        if (!text?.trim()) { setError('Lütfen analiz edilecek bir metin girin.'); return; }
        setLoading(true); setResult(null); setError(null); setAnalysisStage(null);
        try {
            const data = await AnalysisService.analyzeText(text);
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
            } else if (data.task_id) {
                pendingTextRef.current = text;
                setPollingTaskId(data.task_id);
            } else {
                setError('Sunucudan beklenmeyen yanıt.'); setLoading(false);
            }
        } catch (err) {
            setError(err.message || 'Sunucuya bağlanılamadı.'); setLoading(false);
        }
    };

    const reset = () => {
        setLoading(false); setResult(null); setError(null);
        setPollingTaskId(null); setAnalysisStage(null);
    };

    return { analyze, analyzeUrl, reset, loading, result, error, isPolling: !!pollingTaskId, analysisStage };
};
