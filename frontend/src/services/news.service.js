import axiosInstance from '../api/axios';

class NewsService {
    static async getNews({ category, subcategory, page = 1, size = 20 } = {}) {
        const params = { page, size };
        if (category)    params.category    = category;
        if (subcategory) params.subcategory = subcategory;
        const res = await axiosInstance.get('/news', { params });
        return res.data;
    }
}

export default NewsService;
