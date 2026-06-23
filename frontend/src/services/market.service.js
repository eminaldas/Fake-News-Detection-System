import axiosInstance from '../api/axios';

class MarketService {
    static async getRates() {
        const res = await axiosInstance.get('/market/rates');
        return res.data;
    }

    static async getStocks() {
        const res = await axiosInstance.get('/market/stocks');
        return res.data;
    }

    static async savePrefs(tickers) {
        const res = await axiosInstance.put('/market/preferences', { tickers });
        return res.data;
    }

    static async search(q) {
        return (await axiosInstance.get('/market/search', { params: { q } })).data;
    }

    static async getAnalysis(s, range) {
        return (await axiosInstance.get(`/market/analysis/${encodeURIComponent(s)}`, { params: { range } })).data;
    }

    static async getMovers() {
        return (await axiosInstance.get('/market/movers')).data;
    }

    static async getSummary() {
        return (await axiosInstance.get('/market/summary')).data;
    }

    static async getPopular() {
        return (await axiosInstance.get('/market/popular')).data;
    }

    static async getCommentary(s) {
        return (await axiosInstance.get(`/market/commentary/${encodeURIComponent(s)}`)).data;
    }

    static async makeCommentary(s) {
        return (await axiosInstance.post(`/market/commentary/${encodeURIComponent(s)}`)).data;
    }
}

export default MarketService;
