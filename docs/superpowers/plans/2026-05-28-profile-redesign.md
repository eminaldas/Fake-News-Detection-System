# Public Profil Sayfası Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/users/:userId` public profil sayfasını Stitch tasarım örneğine uygun olarak yeniden tasarlamak — cover hero, stats strip, 2 sütun layout, tab sistemi, analiz kartları, rozet vitrini.

**Architecture:** Backend'e 1 yeni endpoint (`GET /users/{user_id}/analyses`) ve `UserProfileResponse`'a 2 alan eklenir. Frontend'de `Profile.jsx` tamamen yeniden yazılır; `ProfileOverview.jsx`'ten `TypeBadge`/`PredictionBadge` çıkarılıp shared dosyaya taşınır, mevcut `RecommendedUsersWidget` ve `PopularThreadsWidget` sağ sütunda kullanılır.

**Tech Stack:** FastAPI + SQLAlchemy (async) + Pydantic v2 (backend); React 19 + Tailwind CSS 4 + CSS variables (frontend). No automated test suite — verification via Swagger UI `/docs` and browser.

---

## Dosya Haritası

| Dosya | İşlem | Sorumluluk |
|-------|--------|------------|
| `app/schemas/schemas.py` | Modify | `UserProfileResponse`'a `analysis_count`, `fake_count` ekle |
| `app/api/v1/endpoints/users.py` | Modify | `get_user_profile` güncelle + `GET /{user_id}/analyses` ekle |
| `frontend/src/components/common/AnalysisBadges.jsx` | Create | `TypeBadge` ve `PredictionBadge` shared components |
| `frontend/src/pages/Profile.jsx` | Rewrite | Public profil sayfası — hero, stats, tabs, kartlar |

---

## Task 1: Schema — `UserProfileResponse` güncelle

**Files:**
- Modify: `app/schemas/schemas.py:987-1002`

- [ ] **Adım 1: `UserProfileResponse`'a iki yeni opsiyonel alan ekle**

`app/schemas/schemas.py` içinde `class UserProfileResponse` bloğunu bul (satır ~987) ve şu hale getir:

```python
class UserProfileResponse(BaseModel):
    id:                UUID
    username:          str
    bio:               Optional[str]  = None
    avatar_url:        Optional[str]  = None
    social_links:      Optional[dict] = None
    follower_count:    int
    following_count:   int
    is_following:      bool           = False
    thread_count:      int            = 0
    created_at:        datetime
    trust_tier:        str            = "yeni_uye"
    trust_score:       float          = 0.0
    trust_stars:       int            = 0
    trust_label:       str            = "Yeni Üye"
    analysis_count:    int            = 0
    fake_count:        int            = 0
    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Adım 2: Commit**

```bash
git add app/schemas/schemas.py
git commit -m "feat: UserProfileResponse'a analysis_count ve fake_count ekle"
```

---

## Task 2: Backend — `get_user_profile` endpoint güncelle

**Files:**
- Modify: `app/api/v1/endpoints/users.py:489-524`

- [ ] **Adım 1: `get_user_profile` fonksiyonunu güncelle**

`users.py`'de `get_user_profile` fonksiyonunu bul. Mevcut `thread_count` sorgusunun hemen altına iki yeni sorgu ekle:

```python
@router.get("/{user_id}/profile", response_model=UserProfileResponse)
async def get_user_profile(
    user_id:      _uuid.UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession             = Depends(get_db),
):
    """Kullanıcının genel profili: bio, takipçi/takip sayısı, thread sayısı."""
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    thread_count = (await db.execute(
        select(func.count()).select_from(ForumThread).where(ForumThread.user_id == user_id)
    )).scalar_one()

    # Toplam analiz sayısı
    analysis_count = (await db.execute(
        select(func.count()).select_from(AnalysisRequest).where(AnalysisRequest.user_id == user_id)
    )).scalar_one()

    # FAKE sonuçlu analiz sayısı
    fake_count = (await db.execute(
        select(func.count())
        .select_from(AnalysisRequest)
        .join(Article, Article.metadata_info["task_id"].astext == AnalysisRequest.task_id)
        .join(AnalysisResult, AnalysisResult.article_id == Article.id)
        .where(AnalysisRequest.user_id == user_id, AnalysisResult.status == "FAKE")
    )).scalar_one()

    is_following = False
    if current_user is not None:
        is_following = (await db.get(UserFollow, (current_user.id, user_id))) is not None

    trust = ForumTrustInfo.from_user(user)
    return UserProfileResponse(
        id=user.id,
        username=user.username,
        bio=user.bio,
        avatar_url=user.avatar_url,
        social_links=user.social_links,
        follower_count=user.follower_count,
        following_count=user.following_count,
        is_following=is_following,
        thread_count=thread_count,
        created_at=user.created_at,
        trust_tier=trust.tier,
        trust_score=trust.score,
        trust_stars=trust.stars,
        trust_label=trust.display_label,
        analysis_count=analysis_count,
        fake_count=fake_count,
    )
```

- [ ] **Adım 2: Backend'i başlat ve Swagger'da test et**

```bash
uvicorn app.main:app --reload
```

Swagger'da `GET /users/{user_id}/profile` çağır. Response'da `analysis_count` ve `fake_count` alanlarını gör.

- [ ] **Adım 3: Commit**

```bash
git add app/api/v1/endpoints/users.py
git commit -m "feat: profil response'a analiz ve sahte sayısı eklendi"
```

---

## Task 3: Backend — Public analiz geçmişi endpoint

**Files:**
- Modify: `app/api/v1/endpoints/users.py`

- [ ] **Adım 1: Yeni endpoint ekle**

`users.py`'de `get_user_threads` fonksiyonunun hemen altına (satır ~624) şunu ekle:

```python
@router.get("/{user_id}/analyses")
async def get_user_analyses(
    user_id: _uuid.UUID,
    page:    int = Query(1, ge=1),
    size:    int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının herkese açık analiz geçmişi."""
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    offset = (page - 1) * size

    total = (await db.execute(
        select(func.count()).select_from(AnalysisRequest)
        .where(AnalysisRequest.user_id == user_id)
    )).scalar_one()

    raw_items = (await db.execute(
        select(AnalysisRequest)
        .where(AnalysisRequest.user_id == user_id)
        .order_by(AnalysisRequest.created_at.desc())
        .offset(offset)
        .limit(size)
    )).scalars().all()

    enriched = []
    for req in raw_items:
        item = {
            "id":            str(req.id),
            "analysis_type": req.analysis_type.value if hasattr(req.analysis_type, "value") else req.analysis_type,
            "task_id":       req.task_id,
            "created_at":    req.created_at.isoformat(),
            "title":         None,
            "prediction":    None,
            "confidence":    None,
        }
        if req.task_id:
            try:
                row = (await db.execute(
                    select(Article.title, AnalysisResult.status, AnalysisResult.confidence)
                    .join(AnalysisResult, AnalysisResult.article_id == Article.id)
                    .where(Article.metadata_info.op("->>")(  "task_id") == req.task_id)
                    .limit(1)
                )).first()
                if row:
                    item["title"]      = row.title
                    item["prediction"] = row.status
                    item["confidence"] = row.confidence
            except Exception:
                pass
        enriched.append(item)

    return {"total": total, "page": page, "size": size, "items": enriched}
```

- [ ] **Adım 2: Swagger'da test et**

`GET /users/{user_id}/analyses?page=1&size=5` çağır — items dizisinde `title`, `prediction`, `confidence` alanları dolu olmalı.

- [ ] **Adım 3: Commit**

```bash
git add app/api/v1/endpoints/users.py
git commit -m "feat: GET /users/{user_id}/analyses public endpoint eklendi"
```

---

## Task 4: Frontend — Shared `AnalysisBadges` komponenti

**Files:**
- Create: `frontend/src/components/common/AnalysisBadges.jsx`
- Modify: `frontend/src/features/profile/ProfileOverview.jsx` (import et, yerel tanımları sil)

- [ ] **Adım 1: Yeni dosya oluştur**

```jsx
// frontend/src/components/common/AnalysisBadges.jsx
import React from 'react';
import { Link2, FileText } from 'lucide-react';

export function TypeBadge({ type }) {
    return type === 'url'
        ? <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 border border-blue-500/30 text-blue-400 uppercase tracking-wider shrink-0">
              <Link2 className="w-2.5 h-2.5" /> URL
          </span>
        : <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 border border-purple-500/30 text-purple-400 uppercase tracking-wider shrink-0">
              <FileText className="w-2.5 h-2.5" /> METİN
          </span>;
}

export function PredictionBadge({ prediction }) {
    if (!prediction) return null;
    const map = {
        FAKE:      { label: 'Yanıltıcı', color: '#ff7351' },
        AUTHENTIC: { label: 'Güvenilir', color: '#3fff8b' },
        UNCERTAIN: { label: 'Belirsiz',  color: '#f59e0b' },
    };
    const { label, color } = map[prediction] ?? { label: prediction, color: '#7d8896' };
    return (
        <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 border shrink-0"
            style={{ color, borderColor: color + '40' }}
        >
            {label}
        </span>
    );
}
```

- [ ] **Adım 2: `ProfileOverview.jsx`'te yerel tanımları kaldır, import et**

`ProfileOverview.jsx` başına şu import'u ekle:

```jsx
import { TypeBadge, PredictionBadge } from '../../components/common/AnalysisBadges';
```

`ProfileOverview.jsx`'teki `TypeBadge` ve `PredictionBadge` fonksiyon tanımlarını (satır ~28-53) sil.

- [ ] **Adım 3: Uygulama hâlâ çalışıyor mu kontrol et**

```bash
cd frontend && npm run dev
```

`/profile/overview` sayfasını aç, analiz geçmişi kartları hâlâ doğru badge'leri göstermeli.

- [ ] **Adım 4: Commit**

```bash
git add frontend/src/components/common/AnalysisBadges.jsx frontend/src/features/profile/ProfileOverview.jsx
git commit -m "refactor: TypeBadge ve PredictionBadge shared component'e taşındı"
```

---

## Task 5: Frontend — `Profile.jsx` Hero Section + Stats Strip

**Files:**
- Rewrite: `frontend/src/pages/Profile.jsx`

- [ ] **Adım 1: `Profile.jsx`'i şu yapıyla yeniden yaz (Hero + Stats + iskelet)**

Tüm dosyayı şununla değiştir:

```jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, Link2, Settings } from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import GamificationService from '../services/gamification.service';
import { TypeBadge, PredictionBadge } from '../components/common/AnalysisBadges';
import RecommendedUsersWidget from '../features/profile/RecommendedUsersWidget';
import PopularThreadsWidget from '../features/profile/PopularThreadsWidget';

/* ── Tasarım sabitleri ────────────────────────────────────────────── */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const CAT_COLOR = {
    Siyaset:   'var(--color-accent-blue)',
    Ekonomi:   'var(--color-accent-amber)',
    Bilim:     '#a855f7',
    Spor:      '#ec4899',
    Teknoloji: '#06b6d4',
};

const PREDICTION_BORDER = {
    FAKE:      'var(--color-fake-fill)',
    AUTHENTIC: 'var(--color-brand-primary)',
    UNCERTAIN: 'var(--color-accent-amber)',
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

/* ── Avatar ─────────────────────────────────────────────────────── */
const PAL_BG   = ['rgba(16,185,129,0.15)','rgba(59,130,246,0.15)','rgba(245,158,11,0.15)','rgba(239,68,68,0.15)','rgba(168,85,247,0.15)'];
const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];

function UserAvatar({ username, avatarUrl }) {
    const idx = (username?.charCodeAt(0) ?? 0) % PAL_BG.length;
    if (avatarUrl) {
        return (
            <div className="w-28 h-28 rounded-full overflow-hidden shrink-0"
                 style={{ border: `4px solid ${PAL_TEXT[idx]}`, background: PAL_BG[idx] }}>
                <img src={avatarUrl} alt={username} className="w-full h-full object-cover"
                     referrerPolicy="no-referrer"
                     onError={e => { e.currentTarget.style.display = 'none'; }} />
            </div>
        );
    }
    return (
        <div className="w-28 h-28 rounded-full flex items-center justify-center font-mono font-black text-4xl shrink-0"
             style={{ background: PAL_BG[idx], color: PAL_TEXT[idx], border: `4px solid ${PAL_TEXT[idx]}` }}>
            {(username ?? '?')[0].toUpperCase()}
        </div>
    );
}

/* ── Spinner ─────────────────────────────────────────────────────── */
function Spinner() {
    return (
        <div className="flex items-center justify-center py-24 gap-3" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   ANA SAYFA
   ══════════════════════════════════════════════════════════════════ */
export default function Profile() {
    const { userId }   = useParams();
    const { user }     = useAuth();
    const navigate     = useNavigate();

    const [profile,   setProfile]   = useState(null);
    const [xpStats,   setXpStats]   = useState(null);
    const [showcase,  setShowcase]  = useState([]);
    const [threads,   setThreads]   = useState([]);
    const [analyses,  setAnalyses]  = useState([]);
    const [threadTotal,   setThreadTotal]   = useState(0);
    const [analysisTotal, setAnalysisTotal] = useState(0);
    const [threadPage,    setThreadPage]    = useState(1);
    const [analysisPage,  setAnalysisPage]  = useState(1);
    const [loading,     setLoading]     = useState(true);
    const [tLoading,    setTLoading]    = useState(false);
    const [aLoading,    setALoading]    = useState(false);
    const [following,   setFollowing]   = useState(false);
    const [fLoading,    setFLoading]    = useState(false);
    const [activeTab,   setActiveTab]   = useState('overview');
    const [error,       setError]       = useState(null);

    const SIZE = 10;
    const isOwnProfile = user?.id === userId;

    /* Profil + XP + Showcase yükle */
    useEffect(() => {
        setLoading(true);
        Promise.all([
            axiosInstance.get(`/users/${userId}/profile`),
            GamificationService.getUserStats(userId).catch(() => null),
            GamificationService.getUserShowcase(userId).catch(() => []),
        ]).then(([profileRes, xp, sc]) => {
            setProfile(profileRes.data);
            setFollowing(profileRes.data.is_following ?? false);
            setXpStats(xp);
            setShowcase(Array.isArray(sc) ? sc : []);
        }).catch(() => setError('Profil yüklenemedi.'))
          .finally(() => setLoading(false));
    }, [userId]);

    /* Thread listesi */
    const loadThreads = useCallback((pg = 1) => {
        setTLoading(true);
        axiosInstance.get(`/users/${userId}/threads`, { params: { page: pg, size: SIZE } })
            .then(({ data }) => { setThreads(data.items ?? []); setThreadTotal(data.total ?? 0); setThreadPage(pg); })
            .catch(() => {})
            .finally(() => setTLoading(false));
    }, [userId]);

    /* Analiz listesi */
    const loadAnalyses = useCallback((pg = 1) => {
        setALoading(true);
        axiosInstance.get(`/users/${userId}/analyses`, { params: { page: pg, size: SIZE } })
            .then(({ data }) => { setAnalyses(data.items ?? []); setAnalysisTotal(data.total ?? 0); setAnalysisPage(pg); })
            .catch(() => {})
            .finally(() => setALoading(false));
    }, [userId]);

    useEffect(() => { loadThreads(1); }, [loadThreads]);
    useEffect(() => { loadAnalyses(1); }, [loadAnalyses]);

    /* Takip toggle */
    const handleFollow = async () => {
        if (!user || fLoading) return;
        setFLoading(true);
        try {
            await axiosInstance.post(`/users/${userId}/follow`);
            setFollowing(v => !v);
            setProfile(prev => prev ? {
                ...prev,
                follower_count: prev.follower_count + (following ? -1 : 1),
            } : prev);
        } catch { /* sessiz */ }
        finally { setFLoading(false); }
    };

    /* ── Yükleniyor ─────────────────────────────────────────────── */
    if (loading) return <div className="max-w-6xl mx-auto px-4 pt-10"><Spinner /></div>;
    if (error || !profile) return (
        <div className="max-w-6xl mx-auto px-4 pt-10 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{error ?? 'Profil bulunamadı.'}</p>
        </div>
    );

    const joinedDate = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })
        : null;

    const socialLink = profile.social_links
        ? (profile.social_links.instagram || profile.social_links.twitter || profile.social_links.website || null)
        : null;

    const threadTotalPages   = Math.ceil(threadTotal / SIZE);
    const analysisTotalPages = Math.ceil(analysisTotal / SIZE);

    /* ── Render ─────────────────────────────────────────────────── */
    return (
        <div className="max-w-6xl mx-auto px-4 pb-16">

            {/* ══ HERO SECTION ══════════════════════════════════════ */}
            <div className="relative border overflow-hidden mb-8" style={S}>
                <Corner />

                {/* Cover alanı */}
                <div className="h-48 w-full relative overflow-hidden"
                     style={{
                         backgroundColor: 'var(--color-bg-base)',
                         backgroundImage: 'linear-gradient(to right, var(--color-terminal-border-raw) 1px, transparent 1px), linear-gradient(to bottom, var(--color-terminal-border-raw) 1px, transparent 1px)',
                         backgroundSize: '40px 40px',
                     }}>
                    <div className="absolute inset-0"
                         style={{ background: 'linear-gradient(to top, var(--color-terminal-surface) 0%, transparent 60%)' }} />
                    {/* Köşe aksanları (cover içi) */}
                    <div className="absolute top-3 left-3 w-6 h-[2px] bg-brand opacity-60" />
                    <div className="absolute top-3 left-3 h-6 w-[2px] bg-brand opacity-60" />
                    <div className="absolute top-3 right-3 w-6 h-[2px] bg-brand opacity-60" />
                    <div className="absolute top-3 right-3 h-6 w-[2px] bg-brand opacity-60" />
                </div>

                {/* Avatar + bilgiler */}
                <div className="px-6 md:px-10 pb-6 -mt-14 flex flex-col md:flex-row gap-5 md:items-end justify-between">
                    <div className="flex flex-col md:flex-row gap-5 items-start md:items-end flex-1 min-w-0">
                        <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} />

                        <div className="pb-1 flex-1 min-w-0">
                            {/* Username + trust badge */}
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h1 className="text-2xl font-manrope font-black tracking-tight"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    {profile.username}
                                </h1>
                                {profile.trust_tier && profile.trust_tier !== 'yeni_uye' && (
                                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wider"
                                          style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.30)', background: 'rgba(16,185,129,0.08)' }}>
                                        {profile.trust_label}
                                    </span>
                                )}
                            </div>

                            {/* Handle */}
                            <p className="font-mono text-xs mb-2"
                               style={{ color: 'var(--color-brand-primary)' }}>
                                // @{profile.username}
                            </p>

                            {/* Bio */}
                            {profile.bio && (
                                <p className="text-sm leading-relaxed mb-3 max-w-2xl"
                                   style={{ color: 'var(--color-text-primary)' }}>
                                    {profile.bio}
                                </p>
                            )}

                            {/* Meta bilgiler */}
                            <div className="flex items-center gap-4 flex-wrap">
                                {joinedDate && (
                                    <span className="flex items-center gap-1 font-mono text-xs"
                                          style={{ color: 'var(--color-text-muted)' }}>
                                        <Calendar className="w-3.5 h-3.5" />
                                        {joinedDate} tarihinden beri üye
                                    </span>
                                )}
                                {socialLink && (
                                    <a href={socialLink.startsWith('http') ? socialLink : `https://${socialLink}`}
                                       target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-1 font-mono text-xs transition-opacity hover:opacity-70"
                                       style={{ color: 'var(--color-brand-primary)' }}>
                                        <Link2 className="w-3.5 h-3.5" />
                                        {socialLink.replace(/^https?:\/\//, '').split('/')[0]}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Aksiyon butonları */}
                    <div className="flex gap-3 shrink-0 pb-1">
                        {isOwnProfile ? (
                            <button
                                onClick={() => navigate('/profile/overview')}
                                className="flex items-center gap-2 px-4 py-2 font-mono text-sm font-bold border transition-colors"
                                style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand-primary)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-terminal-border-raw)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                            >
                                <Settings className="w-4 h-4" /> Profili Düzenle
                            </button>
                        ) : user && (
                            <>
                                <button
                                    className="px-4 py-2 font-mono text-sm font-bold border transition-colors"
                                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand-primary)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-terminal-border-raw)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                                >
                                    Mesaj
                                </button>
                                <button
                                    onClick={handleFollow}
                                    disabled={fLoading}
                                    className="px-6 py-2 font-mono text-sm font-bold border transition-all disabled:opacity-50"
                                    style={following ? {
                                        background: 'transparent',
                                        borderColor: 'var(--color-terminal-border-raw)',
                                        color: 'var(--color-text-primary)',
                                    } : {
                                        background: 'var(--color-brand-primary)',
                                        borderColor: 'var(--color-brand-primary)',
                                        color: '#070f12',
                                        boxShadow: '0 0 15px rgba(16,185,129,0.25)',
                                    }}
                                    onMouseEnter={e => { if (!following) e.currentTarget.style.boxShadow = '0 0 25px rgba(16,185,129,0.45)'; }}
                                    onMouseLeave={e => { if (!following) e.currentTarget.style.boxShadow = '0 0 15px rgba(16,185,129,0.25)'; }}
                                >
                                    {following ? 'Takipte' : 'Takip Et'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats strip */}
                <div className="border-t px-6 py-4 flex flex-wrap gap-8"
                     style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-bg-base)' }}>
                    {[
                        { label: 'Tartışma',     value: profile.thread_count,    color: 'var(--color-text-primary)' },
                        { label: 'Takipçi',      value: profile.follower_count,  color: 'var(--color-text-primary)' },
                        { label: 'Takip',        value: profile.following_count, color: 'var(--color-text-primary)' },
                        { label: 'Analiz',       value: profile.analysis_count,  color: 'var(--color-brand-primary)' },
                        { label: 'Sahte Tespit', value: profile.fake_count,      color: 'var(--color-fake-fill)' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                            <div className="text-xl font-manrope font-black" style={{ color }}>{value ?? 0}</div>
                            <div className="font-mono text-[10px] uppercase tracking-widest mt-0.5"
                                 style={{ color: 'var(--color-text-muted)' }}>{label}</div>
                        </div>
                    ))}

                    {xpStats && (
                        <div className="border-l pl-8 text-center" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                            <div className="text-xl font-manrope font-black"
                                 style={{ color: 'var(--color-text-primary)' }}>
                                Seviye <span style={{ color: 'var(--color-brand-primary)' }}>{xpStats.level}</span>
                            </div>
                            <div className="font-mono text-[10px] uppercase tracking-widest mt-0.5"
                                 style={{ color: 'var(--color-text-muted)' }}>
                                {xpStats.total_xp} XP
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ İKİ SÜTUN LAYOUT ══════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* ── Sol sütun ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-5">
                    {/* Tab çubuğu */}
                    <div className="flex gap-6 border-b" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                        {[
                            { key: 'overview',  label: 'Genel Bakış' },
                            { key: 'threads',   label: `Tartışmalar (${threadTotal})` },
                            { key: 'analyses',  label: `Analizlerim (${analysisTotal})` },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className="pb-3 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-colors"
                                style={activeTab === tab.key ? {
                                    borderColor: 'var(--color-brand-primary)',
                                    color: 'var(--color-brand-primary)',
                                } : {
                                    borderColor: 'transparent',
                                    color: 'var(--color-text-muted)',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab içeriği — sonraki task'ta doldurulacak */}
                    {activeTab === 'overview'  && <OverviewTab  threads={threads} analyses={analyses} tLoading={tLoading} aLoading={aLoading} setActiveTab={setActiveTab} />}
                    {activeTab === 'threads'   && <ThreadsTab   threads={threads} loading={tLoading} page={threadPage}   totalPages={threadTotalPages}   load={loadThreads} />}
                    {activeTab === 'analyses'  && <AnalysesTab  analyses={analyses} loading={aLoading} page={analysisPage} totalPages={analysisTotalPages} load={loadAnalyses} />}
                </div>

                {/* ── Sağ sütun ── */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5">
                    <BadgeShowcase showcase={showcase} isOwn={isOwnProfile} />
                    <RecommendedUsersWidget profileUserId={userId} currentUserId={user?.id} />
                    <PopularThreadsWidget />
                </div>
            </div>
        </div>
    );
}

/* ── Alt component'ler — sonraki task'larda eklenir ── */
function OverviewTab({ threads, analyses, tLoading, aLoading, setActiveTab }) {
    return <div className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</div>;
}
function ThreadsTab({ threads, loading, page, totalPages, load }) {
    return <div className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</div>;
}
function AnalysesTab({ analyses, loading, page, totalPages, load }) {
    return <div className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</div>;
}
function BadgeShowcase({ showcase, isOwn }) {
    return null;
}
```

- [ ] **Adım 2: Tarayıcıda `/users/:userId` sayfasını aç**

- Cover alanı görünmeli (tech grid arka plan)
- Avatar doğru büyüklükte ve renkli border ile çıkmalı
- Stats strip'te Tartışma, Takipçi, Takip, Analiz, Sahte Tespit sayıları görünmeli
- Seviye + XP (xpStats varsa) görünmeli
- 3 tab başlığı görünmeli

- [ ] **Adım 3: Commit**

```bash
git add frontend/src/pages/Profile.jsx
git commit -m "feat: profil hero section ve stats strip"
```

---

## Task 6: Frontend — Thread + Genel Bakış Tab'ı

**Files:**
- Modify: `frontend/src/pages/Profile.jsx` (thread card ve tab component'leri)

- [ ] **Adım 1: `Profile.jsx`'te `OverviewTab` ve `ThreadsTab` component'lerini gerçek kodla değiştir**

Dosyanın alt kısmındaki `OverviewTab` ve `ThreadsTab` fonksiyonlarını bul ve şunlarla değiştir:

```jsx
/* ── Zaman formatı ── */
function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)     return `${Math.floor(diff)}s`;
    if (diff < 3600)   return `${Math.floor(diff / 60)}dk`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}sa`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}g`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/* ── Sayfalama ── */
function Pagination({ page, totalPages, load }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-3 pt-4">
            <button disabled={page <= 1} onClick={() => load(page - 1)}
                    className="font-mono text-xs px-3 py-1.5 border transition-colors disabled:opacity-30"
                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                ← Önceki
            </button>
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {page} / {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => load(page + 1)}
                    className="font-mono text-xs px-3 py-1.5 border transition-colors disabled:opacity-30"
                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                Sonraki →
            </button>
        </div>
    );
}

/* ── Thread kartı ── */
function ThreadCard({ thread }) {
    const catColor = CAT_COLOR[thread.category] ?? 'var(--color-accent-blue)';
    return (
        <article className="relative border transition-colors cursor-pointer group"
                 style={S}
                 onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-surface)'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-terminal-surface)'; }}>
            <Corner />
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                    {thread.category && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 border shrink-0"
                              style={{ color: catColor, borderColor: catColor + '40', background: catColor + '10' }}>
                            {thread.category}
                        </span>
                    )}
                    <span className="font-mono text-[11px] shrink-0 ml-auto"
                          style={{ color: 'var(--color-text-muted)' }}>
                        {timeAgo(thread.created_at)}
                    </span>
                </div>

                <Link to={`/forum/${thread.id}`}>
                    <h3 className="font-manrope font-bold text-base leading-snug line-clamp-2 mb-2 transition-colors group-hover:text-brand"
                        style={{ color: 'var(--color-text-primary)' }}>
                        {thread.title}
                    </h3>
                </Link>

                {thread.body && (
                    <p className="text-sm leading-relaxed line-clamp-2 mb-4"
                       style={{ color: 'var(--color-text-secondary)' }}>
                        {thread.body}
                    </p>
                )}

                <div className="flex items-center gap-3 pt-3 border-t font-mono text-xs"
                     style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {thread.comment_count ?? 0} yorum
                    </span>
                </div>
            </div>
        </article>
    );
}

/* ── Genel Bakış Tab ── */
function OverviewTab({ threads, analyses, tLoading, aLoading, setActiveTab }) {
    return (
        <div className="flex flex-col gap-6">
            {/* Son tartışmalar */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs uppercase tracking-widest"
                          style={{ color: 'var(--color-brand-primary)' }}>// SON TARTIŞMALAR</span>
                    <button onClick={() => setActiveTab('threads')}
                            className="font-mono text-[10px] transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)' }}>
                        tümünü gör →
                    </button>
                </div>
                {tLoading ? <Spinner /> : threads.slice(0, 3).map(t => <ThreadCard key={t.id} thread={t} />)}
            </div>

            {/* Son analizler */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs uppercase tracking-widest"
                          style={{ color: 'var(--color-brand-primary)' }}>// SON ANALİZLER</span>
                    <button onClick={() => setActiveTab('analyses')}
                            className="font-mono text-[10px] transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)' }}>
                        tümünü gör →
                    </button>
                </div>
                {aLoading ? <Spinner /> : analyses.slice(0, 3).map((a, i) => <AnalysisCard key={a.id ?? i} item={a} />)}
            </div>
        </div>
    );
}

/* ── Tartışmalar Tab ── */
function ThreadsTab({ threads, loading, page, totalPages, load }) {
    return (
        <div className="flex flex-col gap-3">
            {loading ? <Spinner /> : threads.length === 0 ? (
                <div className="text-center py-20">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20"
                                   style={{ color: 'var(--color-text-muted)' }} />
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        // henüz tartışma yok
                    </p>
                </div>
            ) : (
                <>
                    {threads.map(t => <ThreadCard key={t.id} thread={t} />)}
                    <Pagination page={page} totalPages={totalPages} load={load} />
                </>
            )}
        </div>
    );
}
```

> **Not:** `AnalysisCard` bileşenine bu adımda referans var ama henüz tanımlı değil — Task 7'de eklenecek. Şimdilik derleme hatası olmaması için geçici bir stub yeterli: `function AnalysisCard({ item }) { return null; }`

- [ ] **Adım 2: Geçici `AnalysisCard` stub'ı ekle**

`Profile.jsx`'te `AnalysesTab` tanımının hemen üstüne ekle:

```jsx
function AnalysisCard({ item }) { return null; }
```

- [ ] **Adım 3: Tarayıcıda kontrol et**

- "Tartışmalar" tab'ına geç — thread kartları görünmeli
- Thread başlığı üzerine gelindiğinde brand rengine dönmeli
- Kategori badge'i renkli görünmeli
- "Genel Bakış" tab'ında son 3 thread görünmeli

- [ ] **Adım 4: Commit**

```bash
git add frontend/src/pages/Profile.jsx
git commit -m "feat: profil thread kartları ve tab navigasyonu"
```

---

## Task 7: Frontend — Analiz Kartları + Analyses Tab

**Files:**
- Modify: `frontend/src/pages/Profile.jsx`

- [ ] **Adım 1: `AnalysisCard` stub'ını ve `AnalysesTab`'ı gerçek kodla değiştir**

`Profile.jsx`'te `function AnalysisCard({ item }) { return null; }` satırını bul ve şununla değiştir:

```jsx
/* ── Analiz kartı ── */
function AnalysisCard({ item }) {
    const predBorderColor = PREDICTION_BORDER[item.prediction] ?? 'transparent';
    const verdictLabel = { FAKE: 'Sahte İçerik', AUTHENTIC: 'Doğrulandı', UNCERTAIN: 'Belirsiz' };
    const verdictStyle = {
        FAKE:      { color: 'var(--color-fake-text)',      borderColor: 'var(--color-fake-border)',      background: 'var(--color-fake-bg)' },
        AUTHENTIC: { color: 'var(--color-authentic-text)', borderColor: 'var(--color-authentic-border)', background: 'var(--color-authentic-bg)' },
        UNCERTAIN: { color: 'var(--color-iddia-text)',     borderColor: 'var(--color-iddia-border)',     background: 'var(--color-iddia-bg)' },
    };

    return (
        <article className="relative border overflow-hidden transition-colors group cursor-default"
                 style={S}
                 onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-surface)'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-terminal-surface)'; }}>
            <Corner />

            {/* Sağ kenar — tahmin rengi bandı */}
            {item.prediction && (
                <div className="absolute right-0 top-0 bottom-0 w-[3px]"
                     style={{ background: `linear-gradient(to bottom, ${predBorderColor}, transparent)` }} />
            )}

            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={item.analysis_type} />
                        <span className="font-mono text-[10px] px-2 py-0.5 border"
                              style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.25)' }}>
                            Analiz Raporu
                        </span>
                    </div>
                    <span className="font-mono text-[11px] shrink-0"
                          style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(item.created_at).toLocaleDateString('tr-TR')}
                    </span>
                </div>

                <h3 className="font-manrope font-bold text-base leading-snug line-clamp-2 mb-4 transition-colors group-hover:text-brand"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {item.title ?? item.task_id ?? '—'}
                </h3>

                {item.prediction && (
                    <div className="flex items-center justify-between pt-3 border-t"
                         style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                        <span className="font-mono text-[10px] font-bold px-2.5 py-1 border"
                              style={verdictStyle[item.prediction] ?? {}}>
                            {verdictLabel[item.prediction] ?? item.prediction}
                        </span>
                        {item.confidence != null && (
                            <span className="font-mono text-xs"
                                  style={{ color: 'var(--color-text-muted)' }}>
                                %{Math.round(item.confidence * 100)} Güven
                            </span>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
```

`AnalysesTab` fonksiyonunu bul (şu an stub) ve şununla değiştir:

```jsx
function AnalysesTab({ analyses, loading, page, totalPages, load }) {
    return (
        <div className="flex flex-col gap-3">
            {loading ? <Spinner /> : analyses.length === 0 ? (
                <div className="text-center py-20">
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        // henüz analiz yok
                    </p>
                </div>
            ) : (
                <>
                    {analyses.map((a, i) => <AnalysisCard key={a.id ?? i} item={a} />)}
                    <Pagination page={page} totalPages={totalPages} load={load} />
                </>
            )}
        </div>
    );
}
```

- [ ] **Adım 2: Tarayıcıda "Analizlerim" tab'ını aç**

- FAKE tahminli kartın sağ kenarında kırmızı gradient bant görünmeli
- AUTHENTIC tahminli kartın sağ kenarında yeşil gradient bant görünmeli
- Alt verdict badge'i doğru renkle görünmeli
- Güven yüzdesi görünmeli

- [ ] **Adım 3: Commit**

```bash
git add frontend/src/pages/Profile.jsx
git commit -m "feat: profil analiz kartları ve analizlerim tab'ı"
```

---

## Task 8: Frontend — Rozet Vitrini (Sağ Sütun)

**Files:**
- Modify: `frontend/src/pages/Profile.jsx`

- [ ] **Adım 1: `BadgeShowcase` component'ini gerçek kodla değiştir**

`Profile.jsx`'te `function BadgeShowcase({ showcase, isOwn }) { return null; }` satırını bul ve şununla değiştir:

```jsx
function BadgeShowcase({ showcase, isOwn }) {
    const navigate = useNavigate();
    return (
        <div className="relative border overflow-hidden" style={S}>
            <Corner />

            <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                <span className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: 'var(--color-brand-primary)' }}>// ROZET VİTRİNİ</span>
                {isOwn && (
                    <button
                        onClick={() => navigate('/profile/overview')}
                        className="font-mono text-[9px] px-2 py-0.5 border transition-colors hover:bg-white/5"
                        style={{ color: 'var(--color-accent-blue)', borderColor: 'var(--color-accent-blue)' }}>
                        Düzenle
                    </button>
                )}
            </div>

            <div className="flex gap-3 px-4 py-3">
                {[0, 1, 2].map(i => {
                    const badge = showcase[i];
                    if (!badge) {
                        return (
                            <div key={i} className="flex-1 h-16 border flex items-center justify-center"
                                 style={{ borderColor: 'var(--color-terminal-border-raw)', borderStyle: 'dashed' }}>
                                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>boş</span>
                            </div>
                        );
                    }
                    return (
                        <div key={badge.key ?? i}
                             className="flex-1 h-16 border flex flex-col items-center justify-center gap-1"
                             style={{ borderColor: badge.color, background: `${badge.color}10` }}>
                            <span className="font-mono text-xs font-black" style={{ color: badge.color }}>
                                {badge.name?.[0] ?? '★'}
                            </span>
                            <span className="font-mono text-[9px] text-center px-1 leading-tight"
                                  style={{ color: badge.color }}>
                                {badge.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Adım 2: Tarayıcıda sağ sütunu kontrol et**

- Rozet vitrini görünmeli (3 slot, boş slotlar dashed border)
- Eğer kendi profilindeyse "Düzenle" butonu görünmeli
- Önerilen kişiler widget'ı görünmeli
- Popüler başlıklar widget'ı görünmeli

- [ ] **Adım 3: Commit**

```bash
git add frontend/src/pages/Profile.jsx
git commit -m "feat: profil rozet vitrini ve sağ sütun widget'ları"
```

---

## Task 9: Light Mode + Responsive Final Kontrol

**Files:**
- Modify: `frontend/src/pages/Profile.jsx` (varsa düzeltmeler)

- [ ] **Adım 1: Light mode'a geç, profil sayfasını kontrol et**

Navbar'daki tema toggle'ını kullanarak light mode'a geç. Kontrol listesi:

- [ ] Cover alanı: `var(--color-bg-base)` light modda `#f2f7f4` — görünür
- [ ] Stats strip arka planı: `var(--color-bg-base)` — görünür
- [ ] Tüm border'lar: `var(--color-terminal-border-raw)` light modda `rgba(16,185,129,0.20)` — görünür
- [ ] Thread başlıkları: `var(--color-text-primary)` light modda `#24292f` — siyah, okunabilir
- [ ] Analiz kartları: verdict badge'leri light modda okunabilir
- [ ] Takip Et butonu: `var(--color-brand-primary)` light modda `#1a9e4f` — görünür

- [ ] **Adım 2: Mobil kontrolü (tarayıcı developer tools, 375px genişlik)**

- [ ] Cover ve avatar kısımı düzgün stack'leniyor (flex-col)
- [ ] Stats strip wrap ediyor (flex-wrap)
- [ ] Sağ sütun altta görünüyor (lg:flex-row'dan önce tek sütun)
- [ ] Tab başlıkları sığıyor (mobilde scroll yapılabilir veya wrap'leniyor)

- [ ] **Adım 3: Tab başlıkları mobilde taşıyorsa düzelt**

Eğer tab çubuğu 375px'de taşıyorsa, tab wrapper'ına `overflow-x-auto` ekle:

```jsx
<div className="flex gap-6 border-b overflow-x-auto"
     style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
```

- [ ] **Adım 4: Final commit**

```bash
git add frontend/src/pages/Profile.jsx
git commit -m "fix: profil sayfası light mode ve mobil uyumluluğu"
```

---

## Kabul Kriterleri Kontrol Listesi

- [ ] Hero section cover + avatar + stats strip tüm ekran boyutlarında düzgün görünür
- [ ] Takip/takipten çık butonu çalışır ve sayaç güncellenir
- [ ] 3 sekme arasında geçiş, URL değişmeden çalışır
- [ ] Analiz kartlarında prediction rengine göre sağ bant doğru gösterilir
- [ ] Light mode'da tüm elementler okunabilir
- [ ] Kendi profil sayfasında "Profili Düzenle" butonu görünür
- [ ] Rozet vitrini 3 slot gösteriyor, kendi profilinde "Düzenle" butonu aktif
- [ ] Stats strip'te `analysis_count` ve `fake_count` backend'den geliyor
