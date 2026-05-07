import axiosInstance from '../api/axios';

const GamificationService = {
    getMyStats: () =>
        axiosInstance.get('/gamification/me/stats').then(r => r.data),

    getUserStats: (userId) =>
        axiosInstance.get(`/gamification/users/${userId}/stats`).then(r => r.data),

    getMyBadges: () =>
        axiosInstance.get('/gamification/me/badges').then(r => r.data),

    getBadgeCatalog: () =>
        axiosInstance.get('/gamification/badges').then(r => r.data),

    getUserShowcase: (userId) =>
        axiosInstance.get(`/gamification/users/${userId}/showcase`).then(r => r.data),

    updateShowcase: (badgeKeys) =>
        axiosInstance.post('/gamification/me/showcase', badgeKeys).then(r => r.data),

    getLeaderboard: (period = 'alltime', type = 'xp') =>
        axiosInstance.get('/gamification/leaderboard', { params: { period, type } }).then(r => r.data),
};

export default GamificationService;
