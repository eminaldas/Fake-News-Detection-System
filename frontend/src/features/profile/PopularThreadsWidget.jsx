import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Flame } from 'lucide-react';
import axiosInstance from '../../api/axios';
import Skeleton from '../../components/common/Skeleton';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

const CAT_COLOR = {
  Siyaset:   'var(--color-accent-blue)',
  Ekonomi:   'var(--color-accent-amber)',
  Bilim:     '#a855f7',
  Spor:      '#ec4899',
  Teknoloji: '#06b6d4',
};

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

function timeAgo(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600)  return `${Math.floor(s / 60)}dk`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa`;
  return `${Math.floor(s / 86400)}g`;
}

export default function PopularThreadsWidget() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    axiosInstance
      .get('/forum/threads', { params: { sort: 'hot', page: 1, size: 5 } })
      .then(({ data }) => setThreads(data?.items ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative border overflow-hidden" style={S}>
      <Corner />

      <div className="px-4 py-3 border-b flex items-center gap-2" style={BD}>
        <Flame className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
        <span className="font-manrope font-bold text-sm"
              style={{ color: 'var(--color-text-primary)' }}>
          Forumda Popüler
        </span>
      </div>

      {loading ? (
        <div className="p-3 space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="p-4 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
          veri alınamadı
        </p>
      ) : (
        <>
          {threads.map(t => {
            const catColor = CAT_COLOR[t.category] ?? 'var(--color-brand-primary)';
            return (
              <Link
                to={`/forum/${t.id}`}
                key={t.id}
                className="flex flex-col gap-1 px-3 py-2.5 border-b border-l-2 transition-all duration-150 hover:bg-white/5"
                style={{ borderColor: 'var(--color-terminal-border-raw)', borderLeftColor: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderLeftColor = 'transparent'; }}
              >
                <div className="flex items-start gap-1.5">
                  {t.comment_count >= 10 && (
                    <Flame className="w-3 h-3 shrink-0 mt-0.5"
                           style={{ color: 'var(--color-accent-amber)' }} />
                  )}
                  <span className="font-mono text-xs leading-snug line-clamp-1 flex-1"
                        style={{ color: 'var(--color-text-primary)' }}>
                    {t.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {t.category && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 border shrink-0"
                          style={{ color: catColor, borderColor: catColor + '40' }}>
                      {t.category}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 font-mono text-[11px]"
                        style={{ color: 'var(--color-text-muted)' }}>
                    <MessageSquare className="w-2.5 h-2.5" />
                    {t.comment_count}
                  </span>
                  <span className="font-mono text-[11px]"
                        style={{ color: 'var(--color-text-muted)' }}>
                    {t.created_at ? `· ${timeAgo(t.created_at)}` : ''}
                  </span>
                </div>
              </Link>
            );
          })}

          <div className="px-3 py-2.5 border-t" style={BD}>
            <Link to="/forum"
                  className="font-mono text-[10px] flex items-center gap-1 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-brand-primary)' }}>
              tümünü gör →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
