import axiosInstance from '../api/axios';

class ArticleService {
    /**
     * Retrieve a paginated list of articles from the knowledge base.
     * @param {number} page - Current page number.
     * @param {number} size - Items per page.
     * @param {string} statusFilter - Optional status filter ('FAKE' or 'AUTHENTIC').
     * @returns {Promise} Resolves to paginated article list and total counts.
     */
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
