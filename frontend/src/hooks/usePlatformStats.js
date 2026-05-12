// frontend/src/hooks/usePlatformStats.js
import { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';

const POLL_MS = 5 * 60 * 1000;

export function usePlatformStats() {
    const [stats, setStats]     = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axiosInstance.get('/stats/platform');
                setStats(res.data);
            } catch {
                // sessizce başarısız — bileşen gizlenir
            } finally {
                setLoading(false);
            }
        };
        fetch();
        const id = setInterval(fetch, POLL_MS);
        return () => clearInterval(id);
    }, []);

    return { stats, loading };
}
