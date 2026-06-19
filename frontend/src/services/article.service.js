import axiosInstance from '../api/axios';

class ArticleService {
    static async getArticles(page = 1, size = 10, statusFilter = '') {
        const params = new URLSearchParams({ page, size });
        if (statusFilter) {
            params.append('status_filter', statusFilter);
        }

        const response = await axiosInstance.get(`/articles?${params.toString()}`);
        return response.data;
    }
}

export default ArticleService;
