import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../../api/axios';
import GamificationService from '../../services/gamification.service';
import Skeleton from '../../components/common/Skeleton';

const BD = { borderColor: 'rgba(16,185,129,0.07)' };
const S  = { background: 'var(--color-bg-base)', borderColor: 'rgba(16,185,129,0.07)' };

const PAL_BG   = ['rgba(16,185,129,0.15)','rgba(59,130,246,0.15)','rgba(245,158,11,0.15)','rgba(239,68,68,0.15)','rgba(168,85,247,0.15)'];
const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];

function Corner() {
  return (
    <>
      <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
      <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
  );
}

function MiniAvatar({ username, avatarUrl }) {
  const idx = (username?.charCodeAt(0) ?? 0) % PAL_BG.length;
  return (
    <div
      className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-mono font-black text-xs shrink-0"
      style={{
        background: PAL_BG[idx],
        color:      PAL_TEXT[idx],
        border:     `1px solid ${PAL_TEXT[idx]}30`,
        minWidth: 32, minHeight: 32,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={username} className="w-full h-full object-cover"
             referrerPolicy="no-referrer"
             onError={e => { e.currentTarget.style.display = 'none'; }} />
      ) : (username ?? '?')[0].toUpperCase()}
    </div>
  );
}

export default function RecommendedUsersWidget({ profileUserId, currentUserId }) {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [followed, setFollowed] = useState(new Set());
  const [pending,  setPending]  = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    GamificationService.getLeaderboard('alltime', 'xp')
      .then(async ({ entries }) => {
        const filtered = (entries ?? [])
          .filter(e => e.user_id !== profileUserId && e.user_id !== currentUserId)
          .slice(0, 3);
        setUsers(filtered);

        if (currentUserId && filtered.length > 0) {
          const results = await Promise.allSettled(
            filtered.map(u => axiosInstance.get(`/users/${u.user_id}/profile`))
          );
          const preFollowed = new Set();
          results.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value.data?.is_following) {
              preFollowed.add(filtered[i].user_id);
            }
          });
          setFollowed(preFollowed);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profileUserId, currentUserId]);

  const handleFollow = async (userId) => {
    if (!currentUserId || pending.has(userId)) return;
    setPending(prev => new Set(prev).add(userId));
    try {
      await axiosInstance.post(`/users/${userId}/follow`);
      setFollowed(prev => {
        const next = new Set(prev);
        next.has(userId) ? next.delete(userId) : next.add(userId);
        return next;
      });
    } catch {
      /* sessiz hata */
    } finally {
      setPending(prev => { const n = new Set(prev); n.delete(userId); return n; });
    }
  };

  return (
    <div className="relative border overflow-hidden" style={S}>
      <Corner />

      <div className="px-4 py-3 border-b flex items-center gap-2" style={BD}>
        <UserPlus className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
        <span className="font-manrope font-bold text-sm"
              style={{ color: 'var(--color-text-primary)' }}>
          Önerilen Kişiler
        </span>
      </div>

      {loading ? (
        <div className="p-3 space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="p-4 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
          // öneri yok
        </p>
      ) : (
        users.map(u => {
          const isFollowed = followed.has(u.user_id);
          const isPending  = pending.has(u.user_id);
          return (
            <div
              key={u.user_id}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-l-2 transition-all duration-150 hover:bg-white/5"
              style={{ borderColor: 'rgba(16,185,129,0.07)', borderLeftColor: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderLeftColor = 'transparent'; }}
            >
              <button
                onClick={() => navigate(`/users/${u.user_id}`)}
                className="shrink-0 focus:outline-none"
              >
                <MiniAvatar username={u.username} avatarUrl={u.avatar_url} />
              </button>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => navigate(`/users/${u.user_id}`)}
                  className="font-mono text-sm font-bold truncate block text-left transition-opacity hover:opacity-70 w-full"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {u.username}
                </button>
                <span className="font-mono text-xs"
                      style={{ color: 'rgba(238,242,247,0.65)' }}>
                  Seviye {u.level}
                </span>
              </div>

              {currentUserId && (
                <button
                  onClick={() => handleFollow(u.user_id)}
                  disabled={isPending}
                  className="shrink-0 px-2.5 py-1 font-mono text-[10px] font-bold border transition-all duration-200 disabled:opacity-50 overflow-hidden min-w-18"
                  style={isFollowed ? {
                    borderColor: 'var(--color-terminal-border-raw)',
                    color:       'var(--color-text-muted)',
                  } : {
                    background:  'var(--color-brand-primary)',
                    borderColor: 'var(--color-brand-primary)',
                    color:       '#070f12',
                  }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={isFollowed ? 'following' : 'follow'}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{    opacity: 0, y:  6 }}
                      transition={{ duration: 0.14 }}
                      className="flex items-center justify-center gap-1"
                    >
                      {isFollowed ? (
                        <><UserCheck className="w-3 h-3" /> Takip</>
                      ) : (
                        <><UserPlus className="w-3 h-3" /> Takip Et</>
                      )}
                    </motion.span>
                  </AnimatePresence>
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
