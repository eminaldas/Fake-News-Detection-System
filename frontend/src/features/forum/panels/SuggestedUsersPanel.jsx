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
        // MVP proxy: gerçek öneri ucu yok, genel arama ile doldur
        axiosInstance.get('/users/search', { params: { q: 'a', limit: 12 } })
            .then(r => {
                if (!alive) return;
                const list = (r.data?.items ?? r.data?.results ?? r.data ?? [])
                    .filter(u => u.id !== user?.id)
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
            <div className="flex flex-col">
                {users.map((u, i) => {
                    const on = !!following[u.id];
                    return (
                        <div key={u.id} className="flex items-center gap-3 px-4 py-2.5"
                             style={{ borderBottom: i < users.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none' }}>
                            <Avatar username={u.username} url={u.avatar_url} />
                            <Link to={`/users/${u.id}`} className="min-w-0 flex-1" style={{ textDecoration: 'none' }}>
                                <span className="block text-[13px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                                    {u.username}
                                </span>
                                {u.display_label && (
                                    <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                        {u.display_label}
                                    </span>
                                )}
                            </Link>
                            <button
                                type="button"
                                onClick={() => toggleFollow(u.id)}
                                className="font-mono text-[10px] font-extrabold px-2.5 py-1.5 border transition-colors"
                                style={on
                                    ? { color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }
                                    : { color: 'var(--color-brand-primary)', borderColor: 'rgba(63,255,139,0.40)' }}
                            >
                                {on ? '✓ Takip' : '+ Takip'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </CollapsiblePanel>
    );
}
