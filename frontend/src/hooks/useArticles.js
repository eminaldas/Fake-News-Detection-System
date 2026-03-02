import { useState, useEffect, useCallback } from 'react';
import ArticleService from '../services/article.service';

/**
 * Custom hook to manage fetching and paginating articles from the KB.
 */
export const useArticles = (initialPage = 1, initialSize = 10) => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [page, setPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState('');

    const fetchArticles = useCallback(async (currentPage, currentFilter) => {
        setLoading(true);
        setError(null);
        try {
            const data = await ArticleService.getArticles(currentPage, initialSize, currentFilter);
            setArticles(data.items || []);

            const totalItems = data.total || 0;
            setTotalPages(Math.ceil(totalItems / initialSize) || 1);
        } catch (err) {
            setError(err.message || "Gelişen bir hata nedeniyle makaleler yüklenemedi.");
            setArticles([]);
        } finally {
            setLoading(false);
        }
    }, [initialSize]);

    // Re-fetch when dependencies change
    useEffect(() => {
        fetchArticles(page, filter);
    }, [page, filter, fetchArticles]);

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        setPage(1); // Back to page 1 on filter
    };

    const nextPage = () => setPage(p => Math.min(totalPages, p + 1));
    const prevPage = () => setPage(p => Math.max(1, p - 1));

    return {
        articles,
        loading,
        error,
        page,
        totalPages,
        filter,
        setFilter: handleFilterChange,
        nextPage,
        prevPage,
        refresh: () => fetchArticles(page, filter)
    };
};
