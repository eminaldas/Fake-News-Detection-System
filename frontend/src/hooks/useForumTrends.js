import { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';

const POLL_MS = 5 * 60 * 1000;

export function useForumTrends() {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axiosInstance.get('/forum/trending', {
                    params: { hours: 6, velocity: true, limit: 10 },
                });
                setThreads(res.data.trending_threads || []);
            } catch {
                // band gizlenir — silently fail
            } finally {
                setLoading(false);
            }
        };
        fetch();
        const id = setInterval(fetch, POLL_MS);
        return () => clearInterval(id);
    }, []);

    return { threads, loading };
}
