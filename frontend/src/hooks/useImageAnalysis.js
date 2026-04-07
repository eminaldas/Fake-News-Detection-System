// frontend/src/hooks/useImageAnalysis.js
import { useState, useRef, useCallback } from 'react';
import axiosInstance from '../api/axios';

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_MS = 90000;

export function useImageAnalysis() {
    const [loading, setLoading]     = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [result, setResult]       = useState(null);
    const [exifFlags, setExifFlags] = useState(null);
    const [error, setError]         = useState(null);

    const pollTimerRef = useRef(null);
    const pollStartRef = useRef(null);

    const _stopPolling = () => {
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    };

    const _pollStatus = useCallback(async (taskId) => {
        const elapsed = Date.now() - pollStartRef.current;
        if (elapsed > POLL_MAX_MS) {
            _stopPolling();
            setIsPolling(false);
            setLoading(false);
            setError('Analiz zaman aşımına uğradı. Lütfen tekrar deneyin.');
            return;
        }
        try {
            const res = await axiosInstance.get(`/analysis/status/${taskId}`);
            const data = res.data;
            if (data.status === 'SUCCESS' && data.result) {
                _stopPolling();
                setIsPolling(false);
                setLoading(false);
                setResult(data.result);
            } else if (data.status === 'FAILED') {
                _stopPolling();
                setIsPolling(false);
                setLoading(false);
                setError('Analiz başarısız oldu. Lütfen tekrar deneyin.');
            } else {
                pollTimerRef.current = setTimeout(() => _pollStatus(taskId), POLL_INTERVAL_MS);
            }
        } catch {
            _stopPolling();
            setIsPolling(false);
            setLoading(false);
            setError('Sunucuya bağlanılamadı.');
        }
    }, []);

    const submitImage = useCallback(async (file) => {
        if (!file) return;
        _stopPolling();
        setLoading(true);
        setIsPolling(false);
        setResult(null);
        setExifFlags(null);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axiosInstance.post('/analysis/analyze/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const data = res.data;

            if (data.exif_flags && Object.keys(data.exif_flags).length > 0) {
                setExifFlags(data.exif_flags);
            }

            if (data.is_direct_match && data.direct_match_data) {
                setLoading(false);
                setResult(data.direct_match_data);
                return;
            }

            pollStartRef.current = Date.now();
            setIsPolling(true);
            await _pollStatus(data.task_id);
        } catch (err) {
            setLoading(false);
            const detail = err.response?.data?.detail;
            if (err.response?.status === 429) {
                setError('Günlük görsel analiz limitinize ulaştınız.');
            } else if (err.response?.status === 400 || err.response?.status === 413) {
                setError(detail || 'Görsel yüklenemedi.');
            } else {
                setError(detail || 'Bir hata oluştu.');
            }
        }
    }, [_pollStatus]);

    const reset = useCallback(() => {
        _stopPolling();
        setLoading(false);
        setIsPolling(false);
        setResult(null);
        setExifFlags(null);
        setError(null);
    }, []);

    return { loading, isPolling, result, exifFlags, error, submitImage, reset };
}
