import { useState, useEffect, useRef, useCallback } from 'react';
import NewsService from '../services/news.service';

const PAGE_SIZE = 10;
const POLL_MS   = 3 * 60 * 1000;

export function usePopularNews(category, dateFrom, dateTo) {
    const [featured,    setFeatured]    = useState(null);
    const [articles,    setArticles]    = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error,       setError]       = useState(null);
    const [newCount,    setNewCount]    = useState(0);
    const [hasMore,     setHasMore]     = useState(true);

    const pageRef  = useRef(1);
    const totalRef = useRef(0);
    const featuredIdRef = useRef(null);

    const fetchFeatured = useCallback(async () => {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        try {
            const todayData = await NewsService.getNews({
                sort:      'popular',
                size:      1,
                page:      1,
                category:  category || undefined,
                date_from: today,
                date_to:   today,
            });
            const todayItem = todayData.items?.[0] ?? null;
            if (todayItem) {
                setFeatured(todayItem);
                featuredIdRef.current = todayItem.id;
                return;
            }
            const fallbackData = await NewsService.getNews({
                sort:     'popular',
                size:     1,
                page:     1,
                category: category || undefined,
            });
            const fallbackItem = fallbackData.items?.[0] ?? null;
            if (fallbackItem && (fallbackItem.source_count ?? 0) >= 3) {
                setFeatured(fallbackItem);
                featuredIdRef.current = fallbackItem.id;
            } else {
                setFeatured(null);
                featuredIdRef.current = null;
            }
        } catch {
            setFeatured(null);
            featuredIdRef.current = null;
        }
    }, [category]);

    const fetchPage = useCallback(async (page, append = false) => {
        if (page === 1) setLoading(true); else setLoadingMore(true);
        setError(null);
        try {
            const data = await NewsService.getNews({
                size:      PAGE_SIZE + 1,   // featured çıkabilir diye 1 ekstra al
                page,
                category:  category  || undefined,
                date_from: dateFrom  || undefined,
                date_to:   dateTo    || undefined,
            });
            const total = data.total || 0;
            totalRef.current = total;

            const items = (data.items || [])
                .filter(a => a.id !== featuredIdRef.current)
                .slice(0, PAGE_SIZE);

            setArticles(prev => append ? [...prev, ...items] : items);
            setHasMore(page * PAGE_SIZE < total);
        } catch {
            if (!append) setError('Haberler yüklenemedi.');
        } finally {
            if (page === 1) setLoading(false); else setLoadingMore(false);
        }
    }, [category, dateFrom, dateTo]);

    useEffect(() => {
        pageRef.current = 1;
        setArticles([]);
        setHasMore(true);
        fetchFeatured().then(() => fetchPage(1, false));
    }, [fetchFeatured, fetchPage]);

    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const data = await NewsService.getNews({
                    size: PAGE_SIZE, page: 1,
                    category: category || undefined,
                });
                const diff = (data.total || 0) - totalRef.current;
                if (diff > 0) {
                    setNewCount(diff);
                    setTimeout(() => setNewCount(0), 5000);
                }
            } catch { /* sessizce geç */ }
        }, POLL_MS);
        return () => clearInterval(id);
    }, [category]);

    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return;
        const next = pageRef.current + 1;
        pageRef.current = next;
        fetchPage(next, true);
    }, [fetchPage, loadingMore, hasMore]);

    const refresh = useCallback(() => {
        pageRef.current = 1;
        setArticles([]);
        setHasMore(true);
        setNewCount(0);
        fetchFeatured().then(() => fetchPage(1, false));
    }, [fetchFeatured, fetchPage]);

    return { featured, articles, loading, loadingMore, error, newCount, hasMore, refresh, loadMore };
}
