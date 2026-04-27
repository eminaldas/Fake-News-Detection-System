import { useState, useEffect, useRef } from 'react';
import AnalysisService from '../services/analysis.service';
import { useWebSocket } from '../contexts/WebSocketContext';

export const useReport = (taskId) => {
    const [report,     setReport]     = useState(null);
    const [confidence, setConfidence] = useState(null);
    const [mlVerdict,  setMlVerdict]  = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const { subscribe } = useWebSocket();
    const reportRef = useRef(null);

    const _apply = (data) => {
        reportRef.current = data.report;
        setReport(data.report);
        if (data.confidence != null) setConfidence(data.confidence);
        if (data.ml_verdict)         setMlVerdict(data.ml_verdict);
        setLoading(false);
    };

    useEffect(() => {
        if (!taskId) return;

        AnalysisService.getFullReport(taskId)
            .then(_apply)
            .catch(() => setLoading(false));

        const unsub = subscribe('report_ready', (payload) => {
            if (payload.task_id !== taskId) return;
            AnalysisService.getFullReport(taskId)
                .then(_apply)
                .catch(err => { setError(err.message); setLoading(false); });
        });

        const interval = setInterval(() => {
            if (reportRef.current) { clearInterval(interval); return; }
            AnalysisService.getFullReport(taskId)
                .then(data => { _apply(data); clearInterval(interval); })
                .catch(() => {});
        }, 15_000);

        return () => { unsub(); clearInterval(interval); };
    }, [taskId, subscribe]); // eslint-disable-line react-hooks/exhaustive-deps

    return { report, confidence, mlVerdict, loading, error };
};
