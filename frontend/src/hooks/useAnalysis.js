import { useState, useEffect, useRef } from 'react';
import AnalysisService from '../services/analysis.service';
import { useWebSocket } from '../contexts/WebSocketContext';
import GamificationService from '../services/gamification.service';
import toast from '../services/toast';

const SESSION_KEY = 'analysis_session';
const MAX_AGE_MS  = 10 * 60 * 1000; // 10 dakika

function saveSession(data) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, ts: Date.now() })); } catch {}
}
function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}
function loadSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.ts > MAX_AGE_MS) { clearSession(); return null; }
        return parsed;
    } catch { return null; }
}

export const useAnalysis = () => {
    const saved = loadSession();

    const [loading, setLoading]             = useState(!!saved?.taskId && !saved?.result);
    const [result, setResult]               = useState(saved?.result || null);
    const [error, setError]                 = useState(null);
    const [pollingTaskId, setPollingTaskId] = useState(saved?.taskId && !saved?.result ? saved.taskId : null);
    const [analysisStage, setAnalysisStage] = useState(null);
    const pendingTextRef = useRef(saved?.text || null);
    const { subscribe }  = useWebSocket();

    useEffect(() => {
        if (!pollingTaskId) return;

        const unsubProgress = subscribe('analysis_progress', (payload) => {
            if (payload.stage) setAnalysisStage(payload.stage);
        });

        const unsubComplete = subscribe('analysis_complete', (payload) => {
            if (payload.task_id !== pollingTaskId) return;
            AnalysisService.checkStatus(pollingTaskId).then(response => {
                const isDone = response.status === 'SUCCESS' && response.result?.ai_comment !== null;
                if (isDone) {
                    const finalResult = { ...(response.result || response), originalText: pendingTextRef.current };
                    setResult(finalResult);
                    saveSession({ result: finalResult });
                    pendingTextRef.current = null;
                    setLoading(false);
                    setPollingTaskId(null);
                    setAnalysisStage(null);
                    GamificationService.checkAndShowXPGain('Analiz Tamamlandı');
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

                if (isDone || (isTimedOut && response.status === 'SUCCESS')) {
                    const finalResult = { ...(response.result || response), originalText: pendingTextRef.current };
                    setResult(finalResult);
                    saveSession({ result: finalResult });
                    pendingTextRef.current = null;
                    setLoading(false);
                    setPollingTaskId(null);
                    setAnalysisStage(null);
                    clearInterval(interval);
                    GamificationService.checkAndShowXPGain('Analiz Tamamlandı');
                } else if (isFailed) {
                    const errorMsg = response.result?.error || 'Analiz başarısız.';
                    setError(errorMsg);
                    setLoading(false);
                    setPollingTaskId(null);
                    setAnalysisStage(null);
                    clearInterval(interval);
                    clearSession();
                    toast.error('Analiz tamamlanamadı', { sub: errorMsg });
                }
            } catch (err) {
                const errorMsg = err.message || 'Durum kontrol edilemedi.';
                setError(errorMsg);
                setLoading(false);
                setPollingTaskId(null);
                setAnalysisStage(null);
                clearInterval(interval);
                clearSession();
                toast.error('Analiz tamamlanamadı', { sub: errorMsg });
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
        clearSession();
        setLoading(true); setResult(null); setError(null); setAnalysisStage(null);
        try {
            const data = await AnalysisService.analyzeUrl(url);
            if (data.task_id) {
                pendingTextRef.current = url;
                saveSession({ taskId: data.task_id, text: url });
                setPollingTaskId(data.task_id);
            } else { setError('Sunucudan beklenmeyen yanıt.'); setLoading(false); }
        } catch (err) {
            const errorMsg = err.message || 'URL analizi başlatılamadı.';
            setError(errorMsg);
            setLoading(false);
            toast.error('Analiz tamamlanamadı', { sub: errorMsg });
        }
    };

    const analyze = async (text) => {
        if (!text?.trim()) { setError('Lütfen analiz edilecek bir metin girin.'); return; }
        clearSession();
        setLoading(true); setResult(null); setError(null); setAnalysisStage(null);
        try {
            const data = await AnalysisService.analyzeText(text);
            if (data.is_direct_match) {
                const directResult = {
                    prediction:      data.direct_match_data?.mapped_status || 'UNKNOWN',
                    message:         data.message,
                    directMatchData: data.direct_match_data,
                    isDirectMatch:   true,
                    signals:         data.direct_match_data?.signals || {},
                    originalText:    text,
                };
                setResult(directResult);
                saveSession({ result: directResult });
                setLoading(false);
                GamificationService.checkAndShowXPGain('Analiz Oluşturuldu');
            } else if (data.task_id) {
                pendingTextRef.current = text;
                saveSession({ taskId: data.task_id, text });
                setPollingTaskId(data.task_id);
            } else {
                setError('Sunucudan beklenmeyen yanıt.'); setLoading(false);
            }
        } catch (err) {
            const errorMsg = err.message || 'Sunucuya bağlanılamadı.';
            setError(errorMsg);
            setLoading(false);
            toast.error('Analiz tamamlanamadı', { sub: errorMsg });
        }
    };

    const reset = () => {
        setLoading(false); setResult(null); setError(null);
        setPollingTaskId(null); setAnalysisStage(null);
        clearSession();
    };

    return { analyze, analyzeUrl, reset, loading, result, error, isPolling: !!pollingTaskId, analysisStage };
};
