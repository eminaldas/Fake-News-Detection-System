import axiosInstance from '../api/axios';
import toast from './toast';

const _XP_KEY = 'xp_last_known';

const TOKEN_KEY = 'fnds_token';
function _hasToken() {
    return !!(localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY));
}

async function checkAndShowXPGain(label = '') {
  if (!_hasToken()) return;
  try {
    const stats = await axiosInstance.get('/gamification/me/stats').then(r => r.data);
    const newXP  = stats.total_xp || 0;
    const lastXP = parseInt(localStorage.getItem(_XP_KEY) || '0', 10);
    const gained = newXP - lastXP;
    localStorage.setItem(_XP_KEY, String(newXP));
    if (gained > 0) {
      toast.xp(gained, {
        label,
        sub: `Seviye ${stats.level ?? 1} · ${stats.xp_to_next_level ?? 0} XP kaldı`,
      });
    }
  } catch { /* sessizce geç */ }
}

const GamificationService = {
  checkAndShowXPGain,
  getMyStats:      ()          => axiosInstance.get('/gamification/me/stats').then(r => r.data),
  getUserStats:    (userId)    => axiosInstance.get(`/gamification/users/${userId}/stats`).then(r => r.data),
  getMyBadges:     ()          => axiosInstance.get('/gamification/me/badges').then(r => r.data),
  getBadgeCatalog: ()          => axiosInstance.get('/gamification/badges').then(r => r.data),
  getUserShowcase: (userId)    => axiosInstance.get(`/gamification/users/${userId}/showcase`).then(r => r.data),
  updateShowcase:  (badgeKeys) => axiosInstance.post('/gamification/me/showcase', badgeKeys).then(r => r.data),
  getLeaderboard:  (period = 'alltime', type = 'xp') =>
    axiosInstance.get('/gamification/leaderboard', { params: { period, type } }).then(r => r.data),
};

export default GamificationService;
