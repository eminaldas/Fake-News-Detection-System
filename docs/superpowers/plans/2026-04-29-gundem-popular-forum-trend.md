# Gündem Popüler Haberler + Forum Trend Bandı — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gündem sayfasında karma skorla sıralanan 10 popüler haber kartı (1 büyük + 3×3 grid) ve son 6 saatin en aktif forum threadlerini gösteren auto-scroll trend bandı göster; "Size Özel" akışını kaldır.

**Architecture:** `/news?sort=popular` ve `/forum/trending?hours=6&velocity=true` endpoint değişiklikleri backend'de; `usePopularNews` / `useForumTrends` hook'ları ve `PopularNewsGrid` / `ForumTrendBand` bileşenleri frontend'de; `Gundem.jsx` bunları orkestre eder.

**Tech Stack:** FastAPI + SQLAlchemy async, React 19 + Tailwind CSS 4, requestAnimationFrame (auto-scroll), createPortal (analiz modal)

---

## Dosya Haritası

| Eylem | Dosya |
|-------|-------|
| Modify | `app/api/v1/endpoints/news.py` |
| Modify | `app/schemas/schemas.py` |
| Modify | `app/api/v1/endpoints/forum.py` |
| Modify | `frontend/src/services/news.service.js` |
| Create | `frontend/src/hooks/usePopularNews.js` |
| Create | `frontend/src/hooks/useForumTrends.js` |
| Create | `frontend/src/components/features/gundem/PopularNewsGrid.jsx` |
| Create | `frontend/src/components/features/gundem/ForumTrendBand.jsx` |
| Modify | `frontend/src/pages/Gundem.jsx` |

---

### Task 1: Backend — `/news?sort=popular`

**Files:**
- Modify: `app/api/v1/endpoints/news.py`

- [ ] **Step 1: `sort` parametresini fonksiyon imzasına ekle**

`app/api/v1/endpoints/news.py` satır 31'de `date_to` parametresinden hemen sonra:

```python
    date_to:     date | None = Query(None, description="Bitiş tarihi (YYYY-MM-DD)"),
    sort:        str  | None = Query(None, description="Sıralama: popular"),   # ← YENİ
    db: AsyncSession = Depends(get_db),
```

- [ ] **Step 2: `items_result` sorgusunu karma skorla değiştir**

`app/api/v1/endpoints/news.py` satır 73-80'deki bloku aşağıdaki ile değiştir:

```python
    if sort == "popular":
        hrs = (
            func.extract('epoch', func.now() - func.coalesce(NewsArticle.pub_date, NewsArticle.created_at))
            / 3600.0
        )
        cv_sub = (
            select(ContentInteraction.content_id, func.count().label('cv'))
            .where(ContentInteraction.interaction_type == 'click')
            .group_by(ContentInteraction.content_id)
            .subquery()
        )
        pop = (
            NewsArticle.source_count * 0.5
            + func.coalesce(cv_sub.c.cv, 0) * 0.3
            + (1.0 / (hrs + 1.0)) * 0.2
        )
        items_result = await db.execute(
            select(NewsArticle)
            .where(*base_filter)
            .outerjoin(cv_sub, NewsArticle.id == cv_sub.c.content_id)
            .order_by(pop.desc())
            .offset(offset)
            .limit(size)
        )
    else:
        items_result = await db.execute(
            select(NewsArticle)
            .where(*base_filter)
            .order_by(func.coalesce(NewsArticle.pub_date, NewsArticle.created_at).desc())
            .offset(offset)
            .limit(size)
        )
    items = items_result.scalars().all()
```

- [ ] **Step 3: Manuel doğrulama**

Docker çalışıyorsa:
```
GET http://localhost:8000/api/v1/news?sort=popular&size=10
```
Dönen `items` dizisinin `source_count` yüksek ve güncel haberler içerdiğini kontrol et. 200 OK beklenir.

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/endpoints/news.py
git commit -m "feat(backend): /news?sort=popular karma skor sıralaması"
```

---

### Task 2: Backend — `/forum/trending` hours + velocity + schema

**Files:**
- Modify: `app/schemas/schemas.py` (satır 688-696)
- Modify: `app/api/v1/endpoints/forum.py` (satır 922-969)

- [ ] **Step 1: `ForumTrendingThread` schema'sına `is_rising` ekle**

`app/schemas/schemas.py` satır 688-696:

```python
class ForumTrendingThread(BaseModel):
    id:            UUID
    title:         str
    category:      Optional[str]
    comment_count: int
    total_votes:   int
    created_at:    datetime
    is_rising:     bool = False        # ← YENİ

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 2: `get_trending` fonksiyonunu `hours` + `velocity` parametreleriyle yenile**

`app/api/v1/endpoints/forum.py` satır 922-969'daki `get_trending` fonksiyonunun tamamını aşağıdaki ile değiştir:

```python
@router.get("/trending", response_model=ForumTrendingResponse)
async def get_trending(
    hours:        int  = Query(168, ge=1, le=720, description="Kaç saatlik pencere"),
    velocity:     bool = Query(False, description="Hız skoru hesaplansın mı"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession             = Depends(get_db),
):
    """Trend thread'ler ve etiketler. hours ile zaman penceresi, velocity ile hızlı yükselen tespiti."""
    cutoff          = datetime.now(timezone.utc) - timedelta(hours=hours)
    total_votes_col = (
        ForumThread.vote_suspicious
        + ForumThread.vote_authentic
        + ForumThread.vote_investigate
    )
    threads_result = await db.execute(
        select(ForumThread)
        .where(ForumThread.created_at >= cutoff)
        .order_by(desc(total_votes_col + ForumThread.comment_count))
        .limit(10)
    )
    threads = threads_result.scalars().all()

    rising_ids: set[str] = set()
    if velocity and threads:
        thread_ids = [t.id for t in threads]
        cutoff_1h  = datetime.now(timezone.utc) - timedelta(hours=1)
        cutoff_6h  = datetime.now(timezone.utc) - timedelta(hours=6)

        res_1h = await db.execute(
            select(ForumVote.thread_id, func.count().label('cnt'))
            .where(ForumVote.thread_id.in_(thread_ids), ForumVote.created_at >= cutoff_1h)
            .group_by(ForumVote.thread_id)
        )
        res_6h = await db.execute(
            select(ForumVote.thread_id, func.count().label('cnt'))
            .where(ForumVote.thread_id.in_(thread_ids), ForumVote.created_at >= cutoff_6h)
            .group_by(ForumVote.thread_id)
        )
        v1h = {str(r.thread_id): r.cnt for r in res_1h}
        v6h = {str(r.thread_id): r.cnt for r in res_6h}
        for t in threads:
            c1 = v1h.get(str(t.id), 0)
            c6 = v6h.get(str(t.id), 0)
            if c6 > 0 and (c1 / c6) > 0.50:
                rising_ids.add(str(t.id))

    trending_threads = [
        ForumTrendingThread(
            id=t.id,
            title=t.title,
            category=t.category,
            comment_count=t.comment_count,
            total_votes=t.vote_suspicious + t.vote_authentic + t.vote_investigate,
            created_at=t.created_at,
            is_rising=str(t.id) in rising_ids,
        )
        for t in threads
    ]

    tags_result = await db.execute(
        select(Tag).order_by(desc(Tag.usage_count)).limit(10)
    )
    tags = tags_result.scalars().all()
    trending_tags = [
        TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count)
        for tg in tags
    ]

    return ForumTrendingResponse(trending_threads=trending_threads, trending_tags=trending_tags)
```

- [ ] **Step 3: Manuel doğrulama**

```
GET http://localhost:8000/api/v1/forum/trending?hours=6&velocity=true&limit=10
```
200 OK, `trending_threads` dizisinde `is_rising` alanı var ve `true`/`false` değerler dönüyor.

- [ ] **Step 4: Commit**

```bash
git add app/schemas/schemas.py app/api/v1/endpoints/forum.py
git commit -m "feat(backend): forum/trending hours+velocity parametreleri, limit 10"
```

---

### Task 3: Frontend — Service + Hooks

**Files:**
- Modify: `frontend/src/services/news.service.js`
- Create: `frontend/src/hooks/usePopularNews.js`
- Create: `frontend/src/hooks/useForumTrends.js`

- [ ] **Step 1: `NewsService.getNews()`'e `sort` parametresi ekle**

`frontend/src/services/news.service.js` içindeki `getNews` metodunu bul, `params` objesine şunu ekle:

```javascript
static async getNews({ category, subcategory, page = 1, size = 20, date_from, date_to, sort } = {}) {
    const params = { page, size };
    if (category)    params.category    = category;
    if (subcategory) params.subcategory = subcategory;
    if (date_from)   params.date_from   = date_from;
    if (date_to)     params.date_to     = date_to;
    if (sort)        params.sort        = sort;          // ← YENİ
    const res = await axiosInstance.get('/news', { params });
    return res.data;
}
```

- [ ] **Step 2: `usePopularNews.js` dosyasını oluştur**

`frontend/src/hooks/usePopularNews.js`:

```javascript
import { useState, useEffect, useRef, useCallback } from 'react';
import NewsService from '../services/news.service';

const POLL_MS = 3 * 60 * 1000;

export function usePopularNews(category, dateFrom, dateTo) {
    const [articles, setArticles] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const [newCount, setNewCount] = useState(0);
    const totalRef = useRef(0);

    const fetchArticles = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await NewsService.getNews({
                sort:      'popular',
                size:      10,
                category:  category  || undefined,
                date_from: dateFrom  || undefined,
                date_to:   dateTo    || undefined,
            });
            if (silent) {
                const diff = (data.total || 0) - totalRef.current;
                if (diff > 0) {
                    setArticles(data.items);
                    totalRef.current = data.total;
                    setNewCount(diff);
                    setTimeout(() => setNewCount(0), 4000);
                }
            } else {
                setArticles(data.items || []);
                totalRef.current = data.total || 0;
                setNewCount(0);
            }
        } catch {
            if (!silent) setError('Haberler yüklenemedi.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [category, dateFrom, dateTo]);

    useEffect(() => {
        fetchArticles(false);
        const id = setInterval(() => fetchArticles(true), POLL_MS);
        return () => clearInterval(id);
    }, [fetchArticles]);

    return { articles, loading, error, newCount, refresh: () => fetchArticles(false) };
}
```

- [ ] **Step 3: `useForumTrends.js` dosyasını oluştur**

`frontend/src/hooks/useForumTrends.js`:

```javascript
import { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';

const POLL_MS = 5 * 60 * 1000;

export function useForumTrends() {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axiosInstance.get('/forum/trending', {
                    params: { hours: 6, velocity: true, limit: 10 },
                });
                setThreads(res.data.trending_threads || []);
            } catch {
                // band gizlenir — silently fail
            } finally {
                setLoading(false);
            }
        };
        fetch();
        const id = setInterval(fetch, POLL_MS);
        return () => clearInterval(id);
    }, []);

    return { threads, loading };
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/news.service.js \
        frontend/src/hooks/usePopularNews.js \
        frontend/src/hooks/useForumTrends.js
git commit -m "feat(frontend): usePopularNews + useForumTrends hook'ları, sort param"
```

---

### Task 4: Frontend — PopularNewsGrid bileşeni

**Files:**
- Create: `frontend/src/components/features/gundem/PopularNewsGrid.jsx`

- [ ] **Step 1: Dosyayı oluştur**

`frontend/src/components/features/gundem/PopularNewsGrid.jsx`:

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AnalysisService from '../../../services/analysis.service';
import AnalysisResultCard from '../../../features/analysis/AnalysisResultCard';
import { trackInteraction } from '../../../services/interaction.service';

/* ── Yardımcı: güvenilirlik rengi ────────────────────────────── */
function nlpColor(score) {
    if (score == null) return 'var(--color-text-muted)';
    if (score < 0.20)  return '#16a34a';
    if (score < 0.40)  return '#65a30d';
    if (score < 0.60)  return '#d97706';
    if (score < 0.80)  return '#ea580c';
    return '#dc2626';
}

function NlpLabel({ score }) {
    if (score == null) return null;
    const pct = Math.round((1 - score) * 100);
    return (
        <span className="text-[10px] font-bold" style={{ color: nlpColor(score) }}>
            {pct}% güvenilir
        </span>
    );
}

/* ── Yardımcı: bağıl zaman ───────────────────────────────────── */
function relTime(pubDate) {
    if (!pubDate) return '';
    const diff = Math.floor((Date.now() - new Date(pubDate)) / 1000);
    if (diff < 60)    return 'Az önce';
    if (diff < 3600)  return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
}

/* ── Analiz butonu + modal (büyük kart için) ─────────────────── */
function AnalyzeButton({ article }) {
    const [phase,  setPhase]  = useState('idle');
    const [result, setResult] = useState(null);
    const [modal,  setModal]  = useState(false);
    const pollerRef = useRef(null);
    const lsKey     = article.source_url ? `g_analysis_${article.source_url}` : null;

    // localStorage restore
    useEffect(() => {
        if (!lsKey) return;
        try {
            const raw = localStorage.getItem(lsKey);
            if (!raw) return;
            const { result: r, ts } = JSON.parse(raw);
            if (Date.now() - ts < 86_400_000) { setResult(r); setPhase('done'); }
            else localStorage.removeItem(lsKey);
        } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lsKey]);

    // localStorage save
    useEffect(() => {
        if (phase === 'done' && result && lsKey) {
            try { localStorage.setItem(lsKey, JSON.stringify({ result, ts: Date.now() })); } catch { /* ignore */ }
        }
    }, [phase, result, lsKey]);

    useEffect(() => () => { if (pollerRef.current) clearInterval(pollerRef.current); }, []);

    const handleClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (phase === 'done') { setModal(true); return; }
        if (phase !== 'idle' || !article.source_url) return;
        setPhase('loading');
        trackInteraction({
            content_id: article.id, interaction_type: 'click',
            category: article.category, nlp_score_at_time: article.nlp_score,
        });
        try {
            const data = await AnalysisService.analyzeUrl(article.source_url);
            if (!data.task_id) { setPhase('error'); return; }
            const t0 = Date.now();
            pollerRef.current = setInterval(async () => {
                try {
                    const s = await AnalysisService.checkStatus(data.task_id);
                    const done    = s.status === 'SUCCESS' && s.result?.ai_comment != null;
                    const failed  = ['FAILED', 'FAILURE'].includes(s.status);
                    const timeout = Date.now() - t0 > 90_000;
                    if (done || (timeout && s.result)) {
                        clearInterval(pollerRef.current);
                        setResult(s.result); setPhase('done');
                    } else if (failed || timeout) {
                        clearInterval(pollerRef.current); setPhase('error');
                    }
                } catch { clearInterval(pollerRef.current); setPhase('error'); }
            }, 2000);
        } catch { setPhase('error'); }
    };

    if (phase === 'loading') return (
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Analiz ediliyor...
        </span>
    );

    if (phase === 'done' && result) return (
        <>
            <button onClick={handleClick}
                    className="text-[10px] font-bold transition-opacity hover:opacity-80"
                    style={{ color: 'var(--color-brand-primary)' }}>
                Sonucu Gör →
            </button>
            {modal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                     style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
                     onClick={() => setModal(false)}>
                    <div className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl relative"
                         onClick={e => e.stopPropagation()}>
                        <button onClick={() => setModal(false)}
                                className="absolute top-4 right-4 z-10 text-white/40 hover:text-white transition-colors"
                                style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '6px', padding: '4px' }}>
                            <X size={16} />
                        </button>
                        <AnalysisResultCard result={result} />
                    </div>
                </div>,
                document.body
            )}
        </>
    );

    return (
        <button onClick={handleClick} disabled={!article.source_url}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{
                    background:   'var(--color-brand-accent)',
                    color:        'var(--color-brand-primary)',
                    border:       '1px solid var(--color-brand-light)',
                }}>
            Analiz Et →
        </button>
    );
}

/* ── Büyük öne çıkan kart ────────────────────────────────────── */
function FeaturedCard({ article }) {
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;

    return (
        <div className="rounded-xl overflow-hidden border transition-all duration-300 hover:border-brand"
             style={{ borderColor: 'var(--color-border)' }}>
            {/* Görsel */}
            <a href={article.source_url} target="_blank" rel="noopener noreferrer"
               className="block aspect-video overflow-hidden relative bg-surface-solid"
               onClick={() => trackInteraction({
                   content_id: article.id, interaction_type: 'click',
                   category: article.category,
                   source_domain: (() => { try { return new URL(article.source_url).hostname; } catch { return null; } })(),
                   nlp_score_at_time: article.nlp_score,
               })}>
                {hasImg ? (
                    <img src={article.image_url} alt={article.title}
                         className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                         onError={() => setImgErr(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"
                         style={{ background: 'var(--color-bg-surface-solid)' }}>
                        <span className="text-muted text-xs">Görsel Yok</span>
                    </div>
                )}
                {/* Kategori rozeti */}
                {article.category && (
                    <span className="absolute top-3 left-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full text-white"
                          style={{ background: 'var(--color-brand-primary)' }}>
                        {article.category}
                    </span>
                )}
            </a>

            {/* İçerik */}
            <div className="p-5 flex flex-col gap-3">
                <a href={article.source_url} target="_blank" rel="noopener noreferrer"
                   className="hover:opacity-80 transition-opacity">
                    <h2 className="text-2xl font-extrabold text-tx-primary leading-tight">
                        {article.title}
                    </h2>
                </a>

                {/* Meta */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-tx-secondary">
                    {article.source_name && (
                        <span className="font-semibold">{article.source_name}</span>
                    )}
                    <span>·</span>
                    <span>{relTime(article.pub_date)}</span>
                    {(article.source_count || 0) > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{
                                  background: 'var(--color-brand-accent)',
                                  color:      'var(--color-brand-primary)',
                                  border:     '1px solid var(--color-brand-light)',
                              }}>
                            {article.source_count} kaynak
                        </span>
                    )}
                </div>

                {/* NLP + Analiz */}
                <div className="flex items-center justify-between pt-1">
                    <NlpLabel score={article.nlp_score} />
                    <AnalyzeButton article={article} />
                </div>
            </div>
        </div>
    );
}

/* ── Küçük kart ─────────────────────────────────────────────── */
function SmallCard({ article }) {
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;

    return (
        <a href={article.source_url} target="_blank" rel="noopener noreferrer"
           className="flex flex-col rounded-xl overflow-hidden border group transition-all duration-300 hover:border-brand"
           style={{ borderColor: 'var(--color-border)' }}
           onClick={() => trackInteraction({
               content_id: article.id, interaction_type: 'click',
               category: article.category,
               source_domain: (() => { try { return new URL(article.source_url).hostname; } catch { return null; } })(),
               nlp_score_at_time: article.nlp_score,
           })}>
            {/* Görsel */}
            <div className="aspect-video overflow-hidden bg-surface-solid">
                {hasImg ? (
                    <img src={article.image_url} alt={article.title}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                         onError={() => setImgErr(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"
                         style={{ background: 'var(--color-bg-surface-solid)' }}>
                        {article.category && (
                            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                                {article.category}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* İçerik */}
            <div className="p-3 flex flex-col gap-1.5 flex-1">
                <h3 className="text-sm font-semibold text-tx-primary leading-snug">
                    {article.title}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-tx-secondary flex-wrap mt-auto pt-1">
                    {article.source_name && <span className="font-semibold truncate max-w-[100px]">{article.source_name}</span>}
                    <span>·</span>
                    <span className="shrink-0">{relTime(article.pub_date)}</span>
                    <NlpLabel score={article.nlp_score} />
                </div>
            </div>
        </a>
    );
}

/* ── Skeleton ────────────────────────────────────────────────── */
function GridSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="rounded-xl overflow-hidden border mb-5" style={{ borderColor: 'var(--color-border)' }}>
                <div className="aspect-video bg-skeleton" />
                <div className="p-5 space-y-3">
                    <div className="h-7 bg-skeleton rounded w-3/4" />
                    <div className="h-7 bg-skeleton rounded w-1/2" />
                    <div className="h-4 bg-skeleton rounded w-1/3" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="aspect-video bg-skeleton" />
                        <div className="p-3 space-y-2">
                            <div className="h-4 bg-skeleton rounded" />
                            <div className="h-4 bg-skeleton rounded w-4/5" />
                            <div className="h-3 bg-skeleton rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Ana bileşen ─────────────────────────────────────────────── */
export default function PopularNewsGrid({ articles, loading }) {
    if (loading) return <GridSkeleton />;
    if (!articles || articles.length === 0) return (
        <p className="text-muted text-sm text-center py-20">Henüz haber yok.</p>
    );

    const [featured, ...rest] = articles;

    return (
        <div>
            {/* Büyük kart */}
            <div className="mb-5">
                <FeaturedCard article={featured} />
            </div>
            {/* 3×3 grid */}
            {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rest.map(a => <SmallCard key={a.id} article={a} />)}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Build kontrolü**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Beklenen: `✓ built in X.XXs`, hata yok.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/gundem/PopularNewsGrid.jsx
git commit -m "feat(frontend): PopularNewsGrid — büyük kart + 3x3 grid"
```

---

### Task 5: Frontend — ForumTrendBand bileşeni

**Files:**
- Create: `frontend/src/components/features/gundem/ForumTrendBand.jsx`

- [ ] **Step 1: Dosyayı oluştur**

`frontend/src/components/features/gundem/ForumTrendBand.jsx`:

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Flame } from 'lucide-react';

const CARD_W   = 280;   // px — kart genişliği
const GAP      = 16;    // px — gap-4
const SPEED    = 40;    // px/saniye

const CAT_COLORS = {
    gündem:    '#3b82f6',
    ekonomi:   '#f59e0b',
    spor:      '#10b981',
    teknoloji: '#8b5cf6',
    sağlık:    '#ef4444',
    kültür:    '#ec4899',
    yaşam:     '#14b8a6',
};

function relTime(dt) {
    if (!dt) return '';
    const s = Math.floor((Date.now() - new Date(dt)) / 1000);
    if (s < 60)    return 'az önce';
    if (s < 3600)  return `${Math.floor(s / 60)} dk`;
    if (s < 86400) return `${Math.floor(s / 3600)} sa`;
    return `${Math.floor(s / 86400)} gün`;
}

function TrendCard({ thread }) {
    const catColor = CAT_COLORS[thread.category?.toLowerCase()] || 'var(--color-brand-primary)';
    return (
        <Link
            to={`/forum/thread/${thread.id}`}
            className="flex-shrink-0 flex flex-col gap-2.5 rounded-xl p-4 transition-opacity hover:opacity-90"
            style={{
                width:      CARD_W,
                background: 'var(--color-bg-surface)',
                border:     '1px solid var(--color-border)',
                position:   'relative',
            }}
            onClick={e => e.stopPropagation()}
        >
            {thread.is_rising && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: '#ff735120', color: '#ff7351', border: '1px solid #ff735140' }}>
                    <Flame className="w-2.5 h-2.5" />
                    Trend
                </span>
            )}
            <span className="text-[9px] font-black uppercase tracking-widest self-start px-2 py-0.5 rounded-full"
                  style={{ background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40` }}>
                {thread.category || 'Genel'}
            </span>
            <p className="text-sm font-semibold text-tx-primary leading-snug line-clamp-2">
                {thread.title}
            </p>
            <div className="flex items-center gap-3 text-[10px] text-tx-secondary mt-auto">
                <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                    </svg>
                    {thread.total_votes} oy
                </span>
                <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {thread.comment_count}
                </span>
                <span className="ml-auto shrink-0">{relTime(thread.created_at)}</span>
            </div>
        </Link>
    );
}

export default function ForumTrendBand({ threads, loading }) {
    const bandRef    = useRef(null);
    const rafRef     = useRef(null);
    const lastTsRef  = useRef(null);
    const pauseTimer = useRef(null);
    const [paused, setPaused] = useState(false);

    // Auto-scroll: requestAnimationFrame tabanlı, px/saniye sabit hız
    useEffect(() => {
        const el = bandRef.current;
        if (!el || paused || threads.length === 0) return;
        const halfW = el.scrollWidth / 2;

        const step = (ts) => {
            if (lastTsRef.current !== null) {
                const dt = ts - lastTsRef.current;
                el.scrollLeft += (SPEED * dt) / 1000;
                if (el.scrollLeft >= halfW) el.scrollLeft -= halfW;
            }
            lastTsRef.current = ts;
            rafRef.current = requestAnimationFrame(step);
        };

        rafRef.current = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(rafRef.current);
            lastTsRef.current = null;
        };
    }, [paused, threads.length]);

    // Sağa/sola ok — bir kart kadar kaydır, 3 sn sonra devam
    const handleArrow = (dir) => {
        const el = bandRef.current;
        if (!el) return;
        setPaused(true);
        lastTsRef.current = null;
        el.scrollLeft += dir * (CARD_W + GAP);
        clearTimeout(pauseTimer.current);
        pauseTimer.current = setTimeout(() => setPaused(false), 3000);
    };

    if (loading || threads.length === 0) return null;

    const doubled = [...threads, ...threads];

    return (
        <section className="mt-14">
            {/* Başlık */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-extrabold text-tx-primary">Forum Trendleri</h2>
                    <p className="text-xs text-tx-secondary mt-0.5">Son 6 saatin en aktif tartışmaları</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleArrow(-1)}
                        className="w-8 h-8 rounded-full border flex items-center justify-center text-sm text-tx-secondary hover:text-tx-primary transition-colors"
                        style={{ borderColor: 'var(--color-border)' }}
                    >←</button>
                    <button
                        onClick={() => handleArrow(1)}
                        className="w-8 h-8 rounded-full border flex items-center justify-center text-sm text-tx-secondary hover:text-tx-primary transition-colors"
                        style={{ borderColor: 'var(--color-border)' }}
                    >→</button>
                </div>
            </div>

            {/* Band */}
            <div className="relative">
                {/* Gradient solma — sol kenar */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none z-10"
                    style={{ background: 'linear-gradient(to right, var(--color-bg-base), transparent)' }}
                />
                {/* Gradient solma — sağ kenar */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none z-10"
                    style={{ background: 'linear-gradient(to left, var(--color-bg-base), transparent)' }}
                />

                {/* Kaydırılabilir satır */}
                <div
                    ref={bandRef}
                    className="flex overflow-x-auto pb-2"
                    style={{
                        gap:           GAP,
                        scrollbarWidth: 'none',
                        scrollSnapType: paused ? 'x mandatory' : 'none',
                    }}
                    onMouseEnter={() => {
                        setPaused(true);
                        clearTimeout(pauseTimer.current);
                        lastTsRef.current = null;
                    }}
                    onMouseLeave={() => setPaused(false)}
                >
                    {doubled.map((t, i) => (
                        <div
                            key={`${t.id}-${i}`}
                            style={{ scrollSnapAlign: paused ? 'start' : 'none', flexShrink: 0 }}
                        >
                            <TrendCard thread={t} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 2: Build kontrolü**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Beklenen: `✓ built in X.XXs`, hata yok.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/gundem/ForumTrendBand.jsx
git commit -m "feat(frontend): ForumTrendBand — auto-scroll, gradient fade, ok navigasyonu"
```

---

### Task 6: Frontend — Gundem.jsx entegrasyonu

**Files:**
- Modify: `frontend/src/pages/Gundem.jsx`

- [ ] **Step 1: Eski import'ları temizle, yenilerini ekle**

Dosyanın başındaki `import` bloğunu aşağıdaki ile değiştir:

```javascript
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import NewsService from '../services/news.service';  // date filter için
import { usePopularNews } from '../hooks/usePopularNews';
import { useForumTrends } from '../hooks/useForumTrends';
import PopularNewsGrid from '../components/features/gundem/PopularNewsGrid';
import ForumTrendBand from '../components/features/gundem/ForumTrendBand';
```

- [ ] **Step 2: `export default function Gundem()` içini yenile**

`export default function Gundem() {` satırından dosya sonuna kadar olan tüm içeriği aşağıdaki ile değiştir (CATEGORIES sabiti + helper fonksiyonları üstte bırak, sadece `export default function` bloğunu değiştir):

```javascript
export default function Gundem() {
    const [searchParams]  = useSearchParams();
    const { subscribe }   = useWebSocket();
    const category        = searchParams.get('category');

    const [search,   setSearch]   = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');

    const { articles, loading, error, newCount, refresh } =
        usePopularNews(category, dateFrom, dateTo);

    const { threads: trendThreads, loading: trendLoading } = useForumTrends();

    // WebSocket: yeni öneri gelince sessizce yenile
    useEffect(() => {
        const unsub = subscribe('recommendations_updated', refresh);
        return unsub;
    }, [subscribe, refresh]);

    // Client-side arama filtresi
    const filtered = search.trim()
        ? articles.filter(a => a.title?.toLowerCase().includes(search.trim().toLowerCase()))
        : articles;

    const clearDateFilter = () => { setDateFrom(''); setDateTo(''); };

    return (
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-16">

            {/* Yeni haber bildirimi */}
            {newCount > 0 && (
                <button
                    onClick={refresh}
                    className="w-full mb-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold cursor-pointer border transition-colors"
                    style={{
                        background:  'color-mix(in srgb, var(--color-brand-primary) 10%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--color-brand-primary) 40%, transparent)',
                        color:       'var(--color-brand-primary)',
                    }}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    {newCount} yeni haber
                </button>
            )}

            {/* Başlık */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-px" style={{ background: 'var(--color-brand-primary)' }} />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold"
                          style={{ color: 'var(--color-brand-primary)' }}>
                        Güncel Haberler
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-tx-primary font-manrope tracking-tight leading-none">
                    Gündem<span style={{ color: 'var(--color-brand-primary)' }}>.</span>
                </h1>
            </div>

            {/* Arama */}
            <div className="relative mb-8">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"/>
                </svg>
                <input
                    type="text"
                    placeholder="Haberlerde ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 pr-4 py-2.5 rounded-lg text-xs font-medium bg-surface border border-brutal-border text-tx-primary placeholder:text-muted focus:outline-none transition-all w-64"
                    onFocus={e => { e.target.style.borderColor = 'var(--color-brand-primary)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'var(--color-border)'; }}
                />
            </div>

            {/* Tarih filtresi aktif ise temizle */}
            {(dateFrom || dateTo) && (
                <div className="flex items-center gap-3 mb-4 text-xs text-muted">
                    <span>Tarih filtresi: {dateFrom || '…'} → {dateTo || '…'}</span>
                    <button onClick={clearDateFilter} className="text-brand hover:underline">Temizle</button>
                </div>
            )}

            {/* Hata */}
            {error && (
                <p className="text-red-400/70 text-sm text-center py-10">{error}</p>
            )}

            {/* Popüler haberler grid */}
            <PopularNewsGrid articles={filtered} loading={loading} />

            {/* Forum trend bandı */}
            <ForumTrendBand threads={trendThreads} loading={trendLoading} />

        </div>
    );
}
```

- [ ] **Step 3: Kullanılmayan helper fonksiyonları ve state sil**

Dosyanın üst kısmında kalan `FeaturedCard`, `NormalCard`, `NormalAnalyzeBtn`, `ResultBadge`, `AiSnippet`, `AnalysisModal`, `ScoreCircle`, `SourceBadge`, `ContentTag`, `CommunityBadge`, `MultiSourceBadge`, `Spinner`, `pageNumbers`, `formatRelativeTime`, `renderCard`, `SIZE`, `POLL_INTERVAL` tanımlarını sil (bunlar artık PopularNewsGrid.jsx içinde ya da kullanılmıyor).

Tutulacak: `CATEGORIES` sabiti (Navbar kategori barına `useSearchParams` ile bağlı, Gundem sayfasında gerekli olmayabilir ama kaldırmak Navbar'ı etkilemez — kaldırılabilir).

- [ ] **Step 4: Build ve lint kontrolü**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Beklenen: `✓ built in X.XXs`, hata yok.

```bash
cd frontend && npm run lint 2>&1 | grep "Gundem\|PopularNews\|ForumTrend\|usePopular\|useForumTrends"
```
Beklenen: bu dosyalara ait yeni hata yok.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Gundem.jsx
git commit -m "feat(frontend): Gundem.jsx — PopularNewsGrid + ForumTrendBand entegrasyonu, Size Özel kaldırıldı"
```

---

## Spec Kapsam Kontrolü

| Spec Gereksinimi | Task |
|-----------------|------|
| `/news?sort=popular` karma skor | Task 1 |
| `/forum/trending?hours=6&velocity=true&limit=10` | Task 2 |
| `is_rising` schema alanı | Task 2 |
| `usePopularNews` hook | Task 3 |
| `useForumTrends` hook | Task 3 |
| 1 büyük + 9 grid kart, metin tam görünür | Task 4 |
| Skeleton yüklenme durumu | Task 4 |
| Auto-scroll, hover pause, ok navigasyonu | Task 5 |
| Gradient fade kenarlarda | Task 5 |
| 🔥 Trend rozeti (`is_rising`) | Task 5 |
| "Size Özel" kaldırıldı | Task 6 |
| Kategori filtresi + arama korundu | Task 6 |
| 3 dk polling (usePopularNews) | Task 3 |
| 5 dk polling (useForumTrends) | Task 3 |
