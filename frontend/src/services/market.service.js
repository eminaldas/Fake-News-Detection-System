import axiosInstance from '../api/axios';

class MarketService {
    static async getRates() {
        const res = await axiosInstance.get('/market/rates');
        return res.data;
    }
}

export default MarketService;
