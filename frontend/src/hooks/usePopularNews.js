import { useState, useEffect, useRef, useCallback } from 'react';
import NewsService from '../services/news.service';

const POLL_MS = 3 * 60 * 1000;

export function usePopularNews(category, dateFrom, dateTo) {
    const [articles, setArticles] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const [newCount, setNewCount] = useState(0);
    const totalRef = useRef(0);

    const fetchArticles = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await NewsService.getNews({
                sort:      'popular',
                size:      10,
                category:  category  || undefined,
                date_from: dateFrom  || undefined,
                date_to:   dateTo    || undefined,
            });
            if (silent) {
                const diff = (data.total || 0) - totalRef.current;
                if (diff > 0) {
                    setArticles(data.items);
                    totalRef.current = data.total;
                    setNewCount(diff);
                    setTimeout(() => setNewCount(0), 4000);
                }
            } else {
                setArticles(data.items || []);
                totalRef.current = data.total || 0;
                setNewCount(0);
            }
        } catch {
            if (!silent) setError('Haberler yüklenemedi.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [category, dateFrom, dateTo]);

    useEffect(() => {
        fetchArticles(false);
        const id = setInterval(() => fetchArticles(true), POLL_MS);
        return () => clearInterval(id);
    }, [fetchArticles]);

    return { articles, loading, error, newCount, refresh: () => fetchArticles(false) };
}
