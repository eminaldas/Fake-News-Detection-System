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
}

export default MarketService;
