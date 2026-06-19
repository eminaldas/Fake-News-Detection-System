import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axios';

export default function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/news/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);   // bar sadece "SİZİN İÇİN"e düşer
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { categories, loading, reload };
}
