import { useState, useEffect, useRef } from 'react';
import AnalysisService from '../services/analysis.service';
import { useWebSocket } from '../contexts/WebSocketContext';

const POLL_MS = 20_000;

export const useReport = (taskId) => {
    const [report,     setReport]     = useState(null);
    const [confidence, setConfidence] = useState(null);
    const [mlVerdict,  setMlVerdict]  = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const { subscribe } = useWebSocket();
    const doneRef = useRef(false);

    useEffect(() => {
        if (!taskId) return undefined;
        doneRef.current = false;

        const apply = (data) => {
            if (!data || data.status !== 'cached' || !data.report) return false;
            doneRef.current = true;
            setReport(data.report);
            if (data.confidence != null) setConfidence(data.confidence);
            if (data.ml_verdict)         setMlVerdict(data.ml_verdict);
            setLoading(false);
            return true;
        };

        const fetchReport = () =>
            AnalysisService.getFullReport(taskId)
                .then((data) => apply(data)) // status === 'pending' → false, bekle (hata değil)
                .catch((err) => {
                    // Gerçek 404 (bilinmeyen task) veya ağ hatası
                    if (err?.response?.status === 404) {
                        setError('Rapor bulunamadı.');
                        setLoading(false);
                    }
                    return false;
                });

        fetchReport();

        const unsub = subscribe('report_ready', (payload) => {
            if (payload.task_id !== taskId) return;
            fetchReport();
        });

        const interval = setInterval(() => {
            if (doneRef.current) { clearInterval(interval); return; }
            fetchReport().then((ok) => { if (ok) clearInterval(interval); });
        }, POLL_MS);

        return () => { unsub(); clearInterval(interval); };
    }, [taskId, subscribe]); // eslint-disable-line react-hooks/exhaustive-deps

    return { report, confidence, mlVerdict, loading, error };
};
