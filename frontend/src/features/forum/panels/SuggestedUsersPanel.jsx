import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import axiosInstance from '../../../api/axios';
import { useAuth } from '../../../contexts/AuthContext';
import CollapsiblePanel from './CollapsiblePanel';

function Avatar({ username, url }) {
    return (
        <div className="w-9 h-9 shrink-0 flex items-center justify-center font-extrabold text-[13px] overflow-hidden"
             style={{ color: '#021a0a', background: 'linear-gradient(135deg,#3fff8b,#10b981)' }}>
            {url
                ? <img src={url} alt={username} className="w-full h-full object-cover" referrerPolicy="no-referrer"
                       onError={e => { e.currentTarget.style.display = 'none'; }} />
                : (username ?? '?')[0].toUpperCase()}
        </div>
    );
}

export default function SuggestedUsersPanel() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [following, setFollowing] = useState({});

    useEffect(() => {
        let alive = true;
        // En aktif yazarlar (gönderi sayısı) → "önerilen" proxy
        axiosInstance.get('/gamification/leaderboard', { params: { type: 'threads', period: 'alltime' } })
            .then(r => {
                if (!alive) return;
                const list = (r.data?.entries ?? [])
                    .filter(u => String(u.user_id) !== String(user?.id) && (u.value ?? 0) > 0)
                    .slice(0, 4);
                setUsers(list);
            })
            .catch(() => {});
        return () => { alive = false; };
    }, [user?.id]);

    const toggleFollow = async (id) => {
        if (!user) return;
        setFollowing(prev => ({ ...prev, [id]: !prev[id] }));
        try { await axiosInstance.post(`/users/${id}/follow`); }
        catch { setFollowing(prev => ({ ...prev, [id]: !prev[id] })); }
    };

    if (users.length === 0) return null;

    return (
        <CollapsiblePanel icon={Users} title="Önerilen Kullanıcılar" storageKey="suggested">
            <div className="flex flex-col gap-1 -mx-2">
                {users.map((u) => {
                    const on = !!following[u.user_id];
                    return (
                        <div key={u.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                             onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-surface-solid)'; }}
                             onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <Avatar username={u.username} url={u.avatar_url} />
                            <Link to={`/users/${u.user_id}`} className="min-w-0 flex-1" style={{ textDecoration: 'none' }}>
                                <span className="flex items-center gap-1.5">
                                    <span className="text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                                        {u.username}
                                    </span>
                                    <span className="text-[10.5px] font-extrabold px-1.5 py-0.5 rounded shrink-0"
                                          style={{ color: 'var(--color-brand-primary)', background: 'color-mix(in srgb, var(--color-brand-primary) 12%, transparent)' }}>
                                        Lv {u.level ?? 1}
                                    </span>
                                </span>
                                <span className="text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                                    {u.value} gönderi
                                </span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => toggleFollow(u.user_id)}
                                className="text-[12px] font-bold px-3 py-1.5 rounded-full transition-all duration-150 hover:scale-105 shrink-0"
                                style={on
                                    ? { color: 'var(--color-text-muted)', background: 'var(--color-bg-surface-solid)' }
                                    : { color: '#fff', background: 'var(--color-brand-primary)' }}
                            >
                                {on ? 'Takip ediliyor' : 'Takip Et'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </CollapsiblePanel>
    );
}
