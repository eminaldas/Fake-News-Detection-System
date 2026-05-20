import { useState, useEffect, useCallback, useRef } from 'react';
import NewsService from '../services/news.service';

const POLL_MS   = 5 * 60 * 1000;
const PAGE_SIZE = 10;

export function useTrending(category) {
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);
    const timerRef = useRef(null);

    const today = new Date().toISOString().slice(0, 10);

    const fetchItems = useCallback(async () => {
        try {
            const data = await NewsService.getNews({
                sort:      'popular',
                size:      PAGE_SIZE,
                page:      1,
                date_from: today,
                date_to:   today,
                category:  category || undefined,
            });
            setItems(data.items || []);
        } catch {
            // sessizce geç — önceki liste kalsın
        } finally {
            setLoading(false);
        }
    }, [category, today]);

    useEffect(() => {
        setLoading(true);
        fetchItems();
        timerRef.current = setInterval(fetchItems, POLL_MS);
        return () => clearInterval(timerRef.current);
    }, [fetchItems]);

    return { items, loading };
}
