import React from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
    MessageSquare, Share2, Bookmark, Plus,
    Link as LinkIcon, Flag, AlertCircle, Users, Compass,
} from 'lucide-react';
import NewsVoteBar    from './NewsVoteBar';
import GeneralVoteBar from './GeneralVoteBar';
import axiosInstance from '../../api/axios';
import LoginNudgeModal, { useLoginNudge } from '../../components/ui/LoginNudgeModal';
import { useAuth } from '../../contexts/AuthContext';
import CreateThreadModal from './CreateThreadModal';

/* ── Tasarım sabitleri ── */
const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

/* Durum → border-l rengi */
const STATUS_COLOR = {
    active:       'var(--color-brand-primary)',
    under_review: 'var(--color-accent-amber)',
    resolved:     'var(--color-accent-blue)',
};

/* Durum → etiket */
const STATUS_BADGE = {
    active:       { label: 'AKTİF',    color: 'var(--color-brand-primary)', border: 'rgba(16,185,129,0.30)' },
    under_review: { label: 'İNCELEME', color: 'var(--color-accent-amber)',  border: 'rgba(245,158,11,0.30)'  },
    resolved:     { label: 'ÇÖZÜLDÜ',  color: 'var(--color-accent-blue)',   border: 'rgba(59,130,246,0.30)'  },
};

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)    return `${Math.floor(diff)}S`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}DK`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}SA`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}G`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/* Oy dağılım barı — segmented */
function VoteSegBar({ suspicious, authentic, investigate }) {
    const total  = suspicious + authentic + investigate || 1;
    const SEGS   = 8;
    const sSegs  = Math.round((suspicious  / total) * SEGS);
    const aSegs  = Math.round((authentic   / total) * SEGS);
    const iSegs  = SEGS - sSegs - aSegs;
    const colors = [
        ...Array(sSegs).fill('var(--color-fake-fill)'),
        ...Array(Math.max(0, aSegs)).fill('var(--color-brand-primary)'),
        ...Array(Math.max(0, iSegs)).fill('var(--color-accent-amber)'),
    ];
    return (
        <div className="flex gap-[2px]">
            {colors.map((c, i) => (
                <div key={i} className="w-3 h-2" style={{ background: c }} />
            ))}
        </div>
    );
}

/* Yazar avatarı — kare (terminal stil) */
function AuthorAvatar({ username, size = 8 }) {
    const palBg   = ['rgba(16,185,129,0.15)','rgba(59,130,246,0.15)','rgba(245,158,11,0.15)','rgba(239,68,68,0.15)','rgba(168,85,247,0.15)'];
    const palText = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];
    const idx = (username?.charCodeAt(0) ?? 0) % palBg.length;
    return (
        <div
            className={`w-${size} h-${size} flex items-center justify-center font-mono font-black text-sm shrink-0`}
            style={{ background: palBg[idx], color: palText[idx], border: `1px solid ${palText[idx]}30` }}
        >
            {(username ?? '?')[0].toUpperCase()}
        </div>
    );
}

/* ─────────────────────────────────────────────────────── */
function ThreadCard({ thread, index }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [local,    setLocal]    = React.useState(thread);
    const [voting,   setVoting]   = React.useState(false);
    const [bookmarked, setBookmarked] = React.useState(false);
    const [reportOpen, setReportOpen] = React.useState(false);

    const handleVote = async (voteType) => {
        if (!user || voting) return;
        setVoting(true);
        try {
            const { data } = await axiosInstance.post(`/forum/threads/${local.id}/vote`, { vote_type: voteType });
            setLocal(prev => ({ ...prev, ...data }));
        } catch {}
        finally { setVoting(false); }
    };

    const handleBookmark = async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) return;
        try { await axiosInstance.post(`/forum/threads/${local.id}/bookmark`); setBookmarked(v => !v); } catch {}
    };

    const stopNav = (e) => e.stopPropagation();
    const handleShare = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleFlag  = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) return;
        setReportOpen(true);
    };

    const badge      = STATUS_BADGE[local.status] ?? STATUS_BADGE.active;
    const leftColor  = STATUS_COLOR[local.status]  ?? 'var(--color-terminal-border-raw)';
    const totalVotes = local.vote_suspicious + local.vote_authentic + local.vote_investigate;
    const stars      = local.author?.stars ?? 0;
    const starStr    = stars > 0 ? '▓'.repeat(Math.min(stars, 5)) + '░'.repeat(Math.max(0, 5 - stars)) : null;

    return (
        <article
            className="relative border border-l-[3px] group transition-colors cursor-pointer"
            style={{ ...TS, borderLeftColor: leftColor + '70' }}
            onClick={() => navigate(`/forum/${local.id}`)}
            onMouseEnter={e => e.currentTarget.style.borderLeftColor = leftColor}
            onMouseLeave={e => e.currentTarget.style.borderLeftColor = leftColor + '70'}
        >
            {/* Köşe aksanları */}
            <div className="absolute top-0 right-0 w-3 h-[2px] pointer-events-none" style={{ background: leftColor, opacity: 0.4 }} />
            <div className="absolute top-0 right-0 h-3 w-[2px] pointer-events-none" style={{ background: leftColor, opacity: 0.4 }} />

            <div className="p-5 flex flex-col gap-3">

                {/* ── Yazar satırı ── */}
                <div className="flex items-center gap-3">
                    <AuthorAvatar username={local.author?.username} />
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {local.author?.username ?? 'Anonim'}
                        </span>
                        {starStr && (
                            <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--color-brand-primary)' }}>
                                {starStr}
                            </span>
                        )}
                        {local.author?.display_label && (
                            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                {local.author.display_label}
                            </span>
                        )}
                        <span className="font-mono text-xs ml-auto shrink-0 tracking-widest" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                            {timeAgo(local.created_at)} ÖNCE
                        </span>
                    </div>
                </div>

                {/* ── Badges ── */}
                <div className="flex items-center gap-2 flex-wrap">
                    {local.category && (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border"
                              style={{ color: 'var(--color-accent-blue)', borderColor: 'rgba(59,130,246,0.30)' }}>
                            {local.category}
                        </span>
                    )}
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border"
                          style={{ color: badge.color, borderColor: badge.border }}>
                        {badge.label}
                    </span>
                    {local.article_id && (
                        <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border"
                              style={{ color: '#a855f7', borderColor: 'rgba(168,85,247,0.25)' }}>
                            <LinkIcon className="w-2.5 h-2.5" /> HABERLİ
                        </span>
                    )}
                </div>

                {/* ── Başlık + gövde ── */}
                <div className="flex flex-col gap-2">
                    <h3
                        className="font-mono font-bold text-base leading-snug line-clamp-2 transition-colors group-hover:text-brand"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {local.title}
                    </h3>
                    {local.body && (
                        <p className="font-mono text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {local.body}
                        </p>
                    )}
                </div>

                {/* ── Etiketler ── */}
                {local.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {local.tags.map(t => (
                            <span
                                key={t.id}
                                className="font-mono text-[10px] px-2 py-0.5 border"
                                style={{
                                    color:       t.is_system ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                                    borderColor: t.is_system ? 'rgba(16,185,129,0.25)' : 'var(--color-terminal-border-raw)',
                                }}
                            >
                                #{t.name}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Alt bar ── */}
                <div className="flex items-center gap-2 pt-3 flex-wrap" style={{ borderTop: '1px solid var(--color-terminal-border-raw)' }} onClick={stopNav}>
                    {/* Oy butonları */}
                    {(() => {
                        const isNews = local.article_id || local.category === 'haberler';
                        return isNews
                            ? <NewsVoteBar    thread={local} onVote={handleVote} disabled={voting} />
                            : <GeneralVoteBar thread={local} onVote={handleVote} disabled={voting} />;
                    })()}

                    {/* Segment bar + oy sayısı */}
                    <div className="flex items-center gap-2">
                        <VoteSegBar
                            suspicious={local.vote_suspicious}
                            authentic={local.vote_authentic}
                            investigate={local.vote_investigate}
                        />
                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {totalVotes}
                        </span>
                    </div>

                    {local.vote_investigate > 0 && (
                        <span className="flex items-center gap-1 font-mono text-[10px]" style={{ color: 'var(--color-accent-amber)' }}>
                            <AlertCircle className="w-3 h-3" />
                            {local.vote_investigate}
                        </span>
                    )}

                    {/* Yorumlar */}
                    <button
                        onClick={stopNav}
                        className="flex items-center gap-1.5 font-mono text-xs transition-opacity hover:opacity-70 ml-1"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {local.comment_count}
                    </button>

                    {/* Aksiyonlar */}
                    <div className="flex items-center gap-1 ml-auto">
                        <button
                            className="p-1.5 transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-text-muted)' }}
                            onClick={handleShare}
                        >
                            <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className="p-1.5 transition-opacity hover:opacity-70"
                            style={{ color: bookmarked ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
                            onClick={handleBookmark}
                        >
                            <Bookmark className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className="p-1.5 transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-text-muted)' }}
                            onClick={handleFlag}
                        >
                            <Flag className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bildir modalı */}
            {reportOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.75)' }}
                    onClick={() => setReportOpen(false)}
                >
                    <div
                        className="relative border p-6 w-80"
                        style={TS}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand" />
                        <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand" />
                        <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand" />
                        <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand" />
                        <p className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--color-brand-primary)' }}>
                            // TARTIŞMAYI BİLDİR
                        </p>
                        <p className="font-mono text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
                            Bu tartışmayı neden bildiriyorsunuz?
                        </p>
                        <button
                            onClick={() => {
                                axiosInstance.post(`/forum/threads/${local.id}/report`, { reason: 'spam' }).catch(() => {});
                                setReportOpen(false);
                            }}
                            className="w-full py-2.5 font-mono text-sm font-bold tracking-wider transition-opacity hover:opacity-80"
                            style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                        >
                            [ BİLDİR ]
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </article>
    );
}

/* ─────────────────────────────────────────────────────── */
const ForumFeed = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const category = searchParams.get('category') ?? '';
    const tag      = searchParams.get('tag')      ?? '';
    const sort     = searchParams.get('sort')     ?? 'hot';
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = React.useState('discover');
    const [threads,   setThreads]   = React.useState([]);
    const [total,     setTotal]     = React.useState(0);
    const [page,      setPage]      = React.useState(1);
    const [loading,   setLoading]   = React.useState(false);
    const [showModal, setShowModal] = React.useState(false);
    const [showNudge, closeNudge]   = useLoginNudge();
    const SIZE = 20;

    const load = React.useCallback(async (pg = 1) => {
        setLoading(true);
        try {
            let data;
            if (activeTab === 'following') {
                const res = await axiosInstance.get('/users/me/following-feed', { params: { page: pg, size: SIZE } });
                data = res.data;
            } else {
                const params = { sort, page: pg, size: SIZE };
                if (category) params.category = category;
                if (tag)      params.tag      = tag;
                const res = await axiosInstance.get('/forum/threads/discover', { params });
                data = res.data;
            }
            setThreads(data.items);
            setTotal(data.total);
            setPage(data.page);
        } catch {}
        finally { setLoading(false); }
    }, [sort, category, tag, activeTab]);

    React.useEffect(() => { load(1); }, [load]);
    React.useEffect(() => { setPage(1); }, [activeTab]);

    const totalPages = Math.ceil(total / SIZE);

    return (
        <>
        <div className="flex flex-col gap-4">

            {/* ── Yeni tartışma çubuğu ── */}
            <div
                className="relative border flex items-center gap-3 px-4 py-3 cursor-pointer group transition-colors"
                style={{ ...TS, borderColor: 'var(--color-terminal-border-raw)' }}
                onClick={() => setShowModal(true)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-brand-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-terminal-border-raw)'}
            >
                <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
                <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
                <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />

                <AuthorAvatar username={user?.username ?? '?'} size={8} />
                <span className="font-mono text-xs mr-1" style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
                <span className="flex-1 font-mono text-sm" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                    yeni bir tartışma başlat veya iddia paylaş...
                </span>
                <button
                    className="flex items-center gap-1.5 px-3 py-1.5 border font-mono text-xs font-bold transition-colors hover:opacity-80"
                    style={{ borderColor: 'rgba(16,185,129,0.30)', color: 'var(--color-brand-primary)', background: 'rgba(16,185,129,0.08)' }}
                    onClick={e => { e.stopPropagation(); setShowModal(true); }}
                >
                    <Plus className="w-3.5 h-3.5" /> YENİ
                </button>
            </div>

            {/* ── Tab bar ── */}
            {!category && !tag && (
                <div className="flex border" style={BD}>
                    {[
                        { id: 'discover',  label: 'KEŞFET',         icon: Compass },
                        { id: 'following', label: 'TAKİP EDİLENLER', icon: Users   },
                    ].map(({ id, label, icon: TabIcon }) => (
                        <button
                            key={id}
                            onClick={() => {
                                if (id === 'following' && !user) { navigate('/login'); return; }
                                setActiveTab(id);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 font-mono text-xs font-bold tracking-wider uppercase transition-colors border-l-2"
                            style={{
                                background:  activeTab === id ? 'rgba(16,185,129,0.10)' : 'transparent',
                                color:       activeTab === id ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                                borderColor: activeTab === id ? 'var(--color-brand-primary)' : 'transparent',
                            }}
                        >
                            <TabIcon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Başlık ── */}
            <div className="flex items-center justify-between">
                <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--color-brand-primary)' }}>
                    // {category
                        ? category.toUpperCase()
                        : tag ? tag.toUpperCase() : 'TÜM_TARTIŞMALAR'}
                </span>
                {total > 0 && (
                    <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                        {total} kayıt
                    </span>
                )}
            </div>

            {/* ── Aktif filtreler ── */}
            {(category || tag) && (
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--color-text-muted)' }}>filtre:</span>
                    {category && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('category'); setSearchParams(n); }}
                            className="font-mono text-[10px] uppercase px-2 py-0.5 border transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-accent-blue)', borderColor: 'rgba(59,130,246,0.30)' }}
                        >
                            {category} ✕
                        </button>
                    )}
                    {tag && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('tag'); setSearchParams(n); }}
                            className="font-mono text-[10px] uppercase px-2 py-0.5 border transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.30)' }}
                        >
                            {tag} ✕
                        </button>
                    )}
                </div>
            )}

            {/* ── Thread listesi ── */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-36 border animate-pulse" style={TS} />
                    ))}
                </div>
            ) : threads.length === 0 ? (
                <div className="border py-16 text-center" style={TS}>
                    {activeTab === 'following' ? (
                        <>
                            <Users className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="font-mono text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>// takip listesi boş</p>
                            <p className="font-mono text-xs opacity-50" style={{ color: 'var(--color-text-muted)' }}>kullanıcı profillerinden takip edebilirsin</p>
                        </>
                    ) : (
                        <>
                            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>// tartışma bulunamadı</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {threads.map((t, i) => (
                        <div key={t.id} className="animate-fade-up"
                             style={{ animationDelay: `${i * 25}ms`, animationFillMode: 'both' }}>
                            <ThreadCard thread={t} index={i + 1} />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Sayfalama ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border" style={BD}>
                    <button
                        disabled={page <= 1}
                        onClick={() => load(page - 1)}
                        className="px-5 py-2.5 font-mono text-xs font-bold tracking-wider border-r disabled:opacity-20 transition-opacity hover:opacity-70"
                        style={{ ...BD, color: 'var(--color-text-primary)' }}
                    >
                        ← ÖNCEKİ
                    </button>
                    <span className="font-mono text-xs px-4" style={{ color: 'var(--color-text-muted)' }}>
                        {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => load(page + 1)}
                        className="px-5 py-2.5 font-mono text-xs font-bold tracking-wider border-l disabled:opacity-20 transition-opacity hover:opacity-70"
                        style={{ ...BD, color: 'var(--color-text-primary)' }}
                    >
                        SONRAKİ →
                    </button>
                </div>
            )}
        </div>

        {showModal && <CreateThreadModal onClose={() => setShowModal(false)} />}
        {showNudge && <LoginNudgeModal  onClose={closeNudge} />}
        </>
    );
};

export default ForumFeed;
