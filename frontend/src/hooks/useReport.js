import { useState, useEffect } from 'react';
import AnalysisService from '../services/analysis.service';
import { useWebSocket } from '../contexts/WebSocketContext';

export const useReport = (taskId) => {
    const [report,  setReport]  = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const { subscribe } = useWebSocket();

    useEffect(() => {
        if (!taskId) return;

        // İlk yükleme — rapor hazırsa hemen göster
        AnalysisService.getFullReport(taskId)
            .then(data => { setReport(data.report); setLoading(false); })
            .catch(() => setLoading(false));

        // WS: report_ready gelince raporu çek
        const unsub = subscribe('report_ready', (payload) => {
            if (payload.task_id !== taskId) return;
            AnalysisService.getFullReport(taskId)
                .then(data => { setReport(data.report); setLoading(false); })
                .catch(err => { setError(err.message); setLoading(false); });
        });

        // Fallback polling — WS yoksa 15s interval
        const interval = setInterval(() => {
            if (report) { clearInterval(interval); return; }
            AnalysisService.getFullReport(taskId)
                .then(data => { setReport(data.report); setLoading(false); clearInterval(interval); })
                .catch(() => {});
        }, 15_000);

        return () => { unsub(); clearInterval(interval); };
    }, [taskId, subscribe]);

    return { report, loading, error };
};
