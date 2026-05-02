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
    // featured id'yi takip et — date feed'den çıkarmak için
    const featuredIdRef = useRef(null);

    // Günün en popüler haberi — ayrı çağrı
    const fetchFeatured = useCallback(async () => {
        try {
            const data = await NewsService.getNews({
                sort:     'popular',
                size:     1,
                page:     1,
                category: category || undefined,
            });
            const item = data.items?.[0] ?? null;
            setFeatured(item);
            featuredIdRef.current = item?.id ?? null;
        } catch {
            setFeatured(null);
            featuredIdRef.current = null;
        }
    }, [category]);

    // Geri kalan haberler — tarih sıralı (yeniden eskiye)
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
                // sort parametresi yok → backend pub_date DESC döner
            });
            const total = data.total || 0;
            totalRef.current = total;

            // Featured olan haberi listeden çıkar
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

    // İlk yükleme ve filtre değişince
    useEffect(() => {
        pageRef.current = 1;
        setArticles([]);
        setHasMore(true);
        // Önce featured çek, sonra listeyi getir
        fetchFeatured().then(() => fetchPage(1, false));
    }, [fetchFeatured, fetchPage]);

    // Periyodik yenileme
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
