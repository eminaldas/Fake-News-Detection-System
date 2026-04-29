import axiosInstance from '../api/axios';

class NewsService {
    static async getNews({ category, subcategory, page = 1, size = 20, date_from, date_to, sort } = {}) {
        const params = { page, size };
        if (category)    params.category    = category;
        if (subcategory) params.subcategory = subcategory;
        if (date_from)   params.date_from   = date_from;
        if (date_to)     params.date_to     = date_to;
        if (sort)        params.sort        = sort;
        const res = await axiosInstance.get('/news', { params });
        return res.data;
    }
}

export default NewsService;
