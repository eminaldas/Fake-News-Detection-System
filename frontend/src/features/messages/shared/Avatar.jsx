// frontend/src/features/messages/shared/Avatar.jsx
export default function Avatar({ user, size = 36 }) {
    const c = ['rgba(16,185,129,0.15)','rgba(59,130,246,0.15)','rgba(245,158,11,0.15)','rgba(239,68,68,0.15)'];
    const t = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444'];
    const i = (user?.username?.charCodeAt(0) ?? 0) % c.length;
    return (
        <div className="rounded-full overflow-hidden flex items-center justify-center font-mono font-black shrink-0"
             style={{ width: size, height: size, background: c[i], color: t[i],
                      fontSize: size * 0.38, border: `2px solid ${t[i]}40`, minWidth: size }}>
            {user?.avatar_url
                ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover"
                       referrerPolicy="no-referrer"
                       onError={e => { e.currentTarget.style.display = 'none'; }} />
                : (user?.username?.[0] ?? '?').toUpperCase()
            }
        </div>
    );
}
