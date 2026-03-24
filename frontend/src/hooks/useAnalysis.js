import { useState, useEffect, useRef } from 'react';
import AnalysisService from '../services/analysis.service';

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

    useEffect(() => {
        let interval;
        if (pollingTaskId) {
            interval = setInterval(async () => {
                try {
                    const response = await AnalysisService.checkStatus(pollingTaskId);

                    if (response.status === 'SUCCESS' || response.status === 'completed') {
                        setResult({
                            ...(response.result || response),
                            originalText: pendingTextRef.current,
                        });
                        pendingTextRef.current = null;
                        setLoading(false);
                        setPollingTaskId(null);
                        clearInterval(interval);
                    } else if (response.status === 'FAILED') {
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
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [pollingTaskId]);

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
