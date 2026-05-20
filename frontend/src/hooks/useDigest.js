import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axios';

const POLL_MS = 5 * 60 * 1000;

export function useDigest() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    const fetch = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/digest/today');
            setData(res.data);
            setError(null);
        } catch (err) {
            if (err.status === 404) {
                setData(null);
                setError(null);
            } else {
                setError('Özet yüklenemedi.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch();
        const id = setInterval(fetch, POLL_MS);
        return () => clearInterval(id);
    }, [fetch]);

    return { data, loading, error };
}
