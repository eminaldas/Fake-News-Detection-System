# Gündem Sidebar'ları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gündem sayfasına sol (Gemini günlük özet) ve sağ (tıklama bazlı trend) sidebar eklemek.

**Architecture:** `DailySummary` DB modeli + Celery beat task (günde 4x Gemini çağrısı) + `/api/v1/digest/today` endpoint + iki React bileşen + Gundem.jsx 3-sütun layout.

**Tech Stack:** FastAPI, SQLAlchemy async, Celery, Google Gemini Flash, React 19, Tailwind CSS 4

---

## Dosya Haritası

| Durum | Dosya | Sorumluluk |
|-------|-------|------------|
| Yeni | `app/models/models.py` | `DailySummary` ORM modeli ekle |
| Yeni | `app/schemas/schemas.py` | `DailySummaryResponse` schema ekle |
| Yeni | `app/api/v1/endpoints/digest.py` | `GET /api/v1/digest/today` endpoint |
| Değişen | `app/main.py` | digest router'ı kaydet |
| Yeni | `workers/daily_digest_task.py` | Celery task — Gemini özet üretici |
| Değişen | `workers/tasks.py` | 4 yeni beat schedule girişi ekle |
| Yeni | `frontend/src/hooks/useDigest.js` | Summary fetch hook |
| Yeni | `frontend/src/hooks/useTrending.js` | Trending fetch + polling hook |
| Yeni | `frontend/src/components/features/gundem/DailySummaryPanel.jsx` | Sol sidebar bileşeni |
| Yeni | `frontend/src/components/features/gundem/TrendingPanel.jsx` | Sağ sidebar bileşeni |
| Değişen | `frontend/src/pages/Gundem.jsx` | 3 sütun layout |

---

## Task 1: DailySummary DB Modeli

**Files:**
- Modify: `app/models/models.py`

- [ ] **Step 1: `DailySummary` modelini ekle**

`app/models/models.py` dosyasında mevcut import'ların yanına `Date, Text, UniqueConstraint` ekle, ardından dosyanın sonuna (`ContentInteraction`'dan sonra) şunu ekle:

```python
# app/models/models.py — mevcut import satırına ekle:
from sqlalchemy import (
    Boolean, CheckConstraint, Column, Date, DateTime, Float,
    ForeignKey, Index, Integer, String, Text, UniqueConstraint,
)
```

Sonra dosyanın sonuna (diğer modellerin ardından) şu sınıfı ekle:

```python
class DailySummary(Base):
    __tablename__ = "daily_summaries"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    summary_date  = Column(Date, nullable=False)
    generated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    summary_text  = Column(Text, nullable=False)
    topics        = Column(JSONB, nullable=False, default=list)
    article_count = Column(Integer, nullable=False, default=0)
    slot          = Column(String(5), nullable=False)  # "09:00" | "13:00" | "17:00" | "21:00"

    __table_args__ = (
        UniqueConstraint("summary_date", "slot", name="uq_daily_summary_date_slot"),
        Index("idx_ds_date", "summary_date"),
    )
```

- [ ] **Step 2: Migration SQL çalıştır**

Docker'da ya da psql'de şunu çalıştır:

```sql
CREATE TABLE IF NOT EXISTS daily_summaries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_date  DATE NOT NULL,
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    summary_text  TEXT NOT NULL,
    topics        JSONB NOT NULL DEFAULT '[]',
    article_count INTEGER NOT NULL DEFAULT 0,
    slot          VARCHAR(5) NOT NULL,
    UNIQUE (summary_date, slot)
);
CREATE INDEX IF NOT EXISTS idx_ds_date ON daily_summaries(summary_date DESC);
```

- [ ] **Step 3: Doğrula**

```bash
# psql veya docker exec ile
SELECT table_name FROM information_schema.tables WHERE table_name = 'daily_summaries';
```

Beklenen çıktı: `daily_summaries` satırı görünür.

- [ ] **Step 4: Commit**

```bash
git add app/models/models.py
git commit -m "feat(db): DailySummary modeli ve migration"
```

---

## Task 2: Schema

**Files:**
- Modify: `app/schemas/schemas.py`

- [ ] **Step 1: `DailySummaryResponse` ekle**

`app/schemas/schemas.py` dosyasında `NewsListResponse` bloğunun hemen altına ekle:

```python
# ─────────────────────────────────────────────────────────────────────────────
# Daily Digest
# ─────────────────────────────────────────────────────────────────────────────
class DailySummaryResponse(BaseModel):
    id:            UUID
    summary_date:  date
    generated_at:  datetime
    summary_text:  str
    topics:        List[str]
    article_count: int
    slot:          str

    class Config:
        from_attributes = True
```

Dosyanın başındaki import'a `date` eklendiğinden emin ol (`from datetime import date, datetime`).

- [ ] **Step 2: Commit**

```bash
git add app/schemas/schemas.py
git commit -m "feat(schema): DailySummaryResponse ekle"
```

---

## Task 3: Digest API Endpoint

**Files:**
- Create: `app/api/v1/endpoints/digest.py`
- Modify: `app/main.py`

- [ ] **Step 1: Endpoint dosyasını oluştur**

```python
# app/api/v1/endpoints/digest.py
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import DailySummary
from app.schemas.schemas import DailySummaryResponse

router = APIRouter()


@router.get("/today", response_model=DailySummaryResponse)
async def get_today_digest(db: AsyncSession = Depends(get_db)):
    today = date.today()
    result = await db.execute(
        select(DailySummary)
        .where(DailySummary.summary_date == today)
        .order_by(DailySummary.generated_at.desc())
        .limit(1)
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="Bugün için özet henüz hazır değil")
    return summary
```

- [ ] **Step 2: `app/main.py`'a ekle**

`app/main.py` dosyasında import bloğuna ekle:

```python
from app.api.v1.endpoints import (
    # ... mevcut importlar ...
    digest,   # ← bunu ekle
)
```

Ardından `include_router` satırları arasına ekle (örn. `news.router`'ın hemen altına):

```python
app.include_router(digest.router, prefix="/api/v1/digest", tags=["Digest"])
```

- [ ] **Step 3: Doğrula**

Backend çalışıyorsa: `http://localhost:8000/docs` → `/api/v1/digest/today` endpoint'i görünür.

Manuel test:
```bash
curl http://localhost:8000/api/v1/digest/today
```
Beklenen: `{"detail":"Bugün için özet henüz hazır değil"}` (404) — DB boş olduğu için normal.

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/endpoints/digest.py app/main.py
git commit -m "feat(api): GET /api/v1/digest/today endpoint"
```

---

## Task 4: Celery Digest Task

**Files:**
- Create: `workers/daily_digest_task.py`
- Modify: `workers/tasks.py`

- [ ] **Step 1: Task dosyasını oluştur**

```python
# workers/daily_digest_task.py
"""
Günlük haber özeti — Gemini Flash ile günde 4 kez çalışır.
Bugünün top-25 haberi (source_count DESC) başlığını Gemini'ye gönderir,
genel gündem özeti + konu başlıkları alır, DailySummary tablosuna kaydeder.
"""
import asyncio
import json
import logging
from datetime import date, datetime, timezone

from celery import Celery
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import DailySummary, NewsArticle

logger = logging.getLogger(__name__)

celery_app = Celery(
    "daily_digest_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

_gemini_client = None

def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def _current_slot() -> str:
    """UTC saatine göre slot etiketini döner (Türkiye UTC+3)."""
    hour_tr = (datetime.now(timezone.utc).hour + 3) % 24
    if hour_tr < 11:
        return "09:00"
    elif hour_tr < 15:
        return "13:00"
    elif hour_tr < 19:
        return "17:00"
    else:
        return "21:00"


async def _generate():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        today = date.today()

        # Top-25 bugünün haberleri — kaynak sayısına göre
        rows = (await db.execute(
            select(NewsArticle.title, NewsArticle.source_count)
            .where(
                NewsArticle.pub_date >= datetime(today.year, today.month, today.day,
                                                  tzinfo=timezone.utc),
                NewsArticle.embedding.is_not(None),
                NewsArticle.id == NewsArticle.cluster_id,
            )
            .order_by(NewsArticle.source_count.desc())
            .limit(25)
        )).all()

    await engine.dispose()

    if not rows:
        logger.info("daily_digest: bugün haber yok, atlandı")
        return

    lines = "\n".join(
        f"{i+1}. {r.title} ({r.source_count or 1} kaynak)"
        for i, r in enumerate(rows)
    )

    prompt = f"""Aşağıdaki haber başlıkları bugün Türkiye gündeminde öne çıkan haberlerin listesidir.
Bunları tek tek özetleme. Bunun yerine: bugün genel gündem nasıldı, hangi konular öne çıktı, 
ülkede neler yaşandı — bunu 3-4 cümleyle anlat. Sonra 4-5 konu başlığı çıkar.

Başlıklar:
{lines}

Sadece JSON formatında yanıt ver, başka hiçbir şey yazma:
{{"summary": "...", "topics": ["...", "..."]}}"""

    try:
        client = _get_gemini_client()
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        raw = response.text.strip()
        # Bazen ```json ... ``` içinde gelir
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        summary_text = data.get("summary", "").strip()
        topics = data.get("topics", [])
        if not summary_text:
            logger.warning("daily_digest: boş özet geldi")
            return
    except Exception as exc:
        logger.error("daily_digest: Gemini hatası: %s", exc)
        return

    # DB'ye kaydet / güncelle
    engine2 = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    AsyncSessionLocal2 = sessionmaker(engine2, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal2() as db:
        slot = _current_slot()
        existing = (await db.execute(
            select(DailySummary).where(
                DailySummary.summary_date == today,
                DailySummary.slot == slot,
            )
        )).scalar_one_or_none()

        if existing:
            existing.summary_text  = summary_text
            existing.topics        = topics
            existing.article_count = len(rows)
            existing.generated_at  = datetime.now(timezone.utc)
        else:
            db.add(DailySummary(
                summary_date  = today,
                summary_text  = summary_text,
                topics        = topics,
                article_count = len(rows),
                slot          = slot,
            ))
        await db.commit()

    await engine2.dispose()
    logger.info("daily_digest: özet kaydedildi — slot=%s, %d haber", slot, len(rows))


@celery_app.task(name="workers.daily_digest_task.generate_daily_digest")
def generate_daily_digest():
    asyncio.run(_generate())
```

- [ ] **Step 2: `workers/tasks.py` beat schedule'a 4 giriş ekle**

`workers/tasks.py` dosyasında `celery_app.conf.beat_schedule` dict'ine şu 4 girişi ekle:

```python
    "daily-digest-0900": {
        "task":     "workers.daily_digest_task.generate_daily_digest",
        "schedule": crontab(hour=6, minute=0),   # 06:00 UTC = 09:00 TRT
    },
    "daily-digest-1300": {
        "task":     "workers.daily_digest_task.generate_daily_digest",
        "schedule": crontab(hour=10, minute=0),  # 10:00 UTC = 13:00 TRT
    },
    "daily-digest-1700": {
        "task":     "workers.daily_digest_task.generate_daily_digest",
        "schedule": crontab(hour=14, minute=0),  # 14:00 UTC = 17:00 TRT
    },
    "daily-digest-2100": {
        "task":     "workers.daily_digest_task.generate_daily_digest",
        "schedule": crontab(hour=18, minute=0),  # 18:00 UTC = 21:00 TRT
    },
```

- [ ] **Step 3: Manuel test (opsiyonel)**

Celery worker çalışıyorsa task'ı elle tetikle:

```bash
docker exec -it <celery-container> python -c "
from workers.daily_digest_task import generate_daily_digest
generate_daily_digest()
"
```

Ardından endpoint'i kontrol et:
```bash
curl http://localhost:8000/api/v1/digest/today
```
Beklenen: `{"summary_text": "...", "topics": [...], ...}` ile 200.

- [ ] **Step 4: Commit**

```bash
git add workers/daily_digest_task.py workers/tasks.py
git commit -m "feat(worker): Gemini gunluk digest task + beat schedule"
```

---

## Task 5: Frontend Hook'ları

**Files:**
- Create: `frontend/src/hooks/useDigest.js`
- Create: `frontend/src/hooks/useTrending.js`

- [ ] **Step 1: `useDigest.js` oluştur**

```javascript
// frontend/src/hooks/useDigest.js
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const POLL_MS = 5 * 60 * 1000; // 5 dakika

export function useDigest() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    const fetch = useCallback(async () => {
        try {
            const res = await api.get('/digest/today');
            setData(res.data);
            setError(null);
        } catch (err) {
            if (err.response?.status === 404) {
                setData(null);
                setError(null);
            } else {
                setError('Özet yüklenemedi.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch();
        const id = setInterval(fetch, POLL_MS);
        return () => clearInterval(id);
    }, [fetch]);

    return { data, loading, error };
}
```

- [ ] **Step 2: `useTrending.js` oluştur**

```javascript
// frontend/src/hooks/useTrending.js
import { useState, useEffect, useCallback, useRef } from 'react';
import NewsService from '../services/news.service';

const POLL_MS   = 5 * 60 * 1000;
const PAGE_SIZE = 10;

export function useTrending(category) {
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);
    const timerRef = useRef(null);

    const today = new Date().toISOString().slice(0, 10);

    const fetch = useCallback(async () => {
        try {
            const data = await NewsService.getNews({
                sort:      'popular',
                size:      PAGE_SIZE,
                page:      1,
                date_from: today,
                date_to:   today,
                category:  category || undefined,
            });
            setItems(data.items || []);
        } catch {
            // sessizce geç — önceki liste kalsın
        } finally {
            setLoading(false);
        }
    }, [category, today]);

    useEffect(() => {
        setLoading(true);
        fetch();
        timerRef.current = setInterval(fetch, POLL_MS);
        return () => clearInterval(timerRef.current);
    }, [fetch]);

    return { items, loading };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useDigest.js frontend/src/hooks/useTrending.js
git commit -m "feat(hooks): useDigest ve useTrending hook'lari"
```

---

## Task 6: DailySummaryPanel Bileşeni

**Files:**
- Create: `frontend/src/components/features/gundem/DailySummaryPanel.jsx`

- [ ] **Step 1: Bileşeni oluştur**

```jsx
// frontend/src/components/features/gundem/DailySummaryPanel.jsx
import React from 'react';
import { Sparkles, Clock } from 'lucide-react';
import { useDigest } from '../../../hooks/useDigest';

const BORDER = 'var(--color-terminal-border-raw)';

function SkeletonPanel() {
    return (
        <div className="rounded-xl overflow-hidden animate-pulse"
             style={{ background: 'var(--color-terminal-surface)', border: `1px solid ${BORDER}`, borderLeft: '3px solid #3fff8b33' }}>
            <div className="p-4 space-y-3">
                <div className="h-3 w-1/2 rounded" style={{ background: 'var(--color-skeleton)' }} />
                <div className="h-20 rounded"      style={{ background: 'var(--color-skeleton)' }} />
                <div className="h-3 w-3/4 rounded" style={{ background: 'var(--color-skeleton)' }} />
                <div className="h-3 w-2/3 rounded" style={{ background: 'var(--color-skeleton)' }} />
            </div>
        </div>
    );
}

function relSlot(slot) {
    if (!slot) return '';
    const slots = ['09:00', '13:00', '17:00', '21:00'];
    const idx = slots.indexOf(slot);
    const next = slots[idx + 1];
    return next ? `↺ ${next}` : '↺ Yarın 09:00';
}

export default function DailySummaryPanel() {
    const { data, loading } = useDigest();

    if (loading) return <SkeletonPanel />;

    return (
        <div className="rounded-xl overflow-hidden flex flex-col"
             style={{
                 background:  'var(--color-terminal-surface)',
                 border:      `1px solid ${BORDER}`,
                 borderLeft:  '3px solid #3fff8b55',
             }}>

            {/* Başlık */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-3"
                 style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#3fff8b' }} />
                <span className="text-sm font-bold flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    Günün Özeti
                </span>
                {data && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: '#3fff8b15', color: '#3fff8b', border: '1px solid #3fff8b33' }}>
                        Canlı
                    </span>
                )}
            </div>

            {/* İçerik */}
            {!data ? (
                <div className="px-4 py-6 text-center">
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                        Özet hazırlanıyor…<br />
                        <span style={{ opacity: 0.5 }}>İlk özet 09:00'da gelir</span>
                    </p>
                </div>
            ) : (
                <>
                    {/* Zaman */}
                    <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
                        <Clock className="w-3 h-3 shrink-0" style={{ color: '#3fff8b', opacity: 0.7 }} />
                        <span className="text-[11px] font-semibold" style={{ color: '#3fff8b', opacity: 0.8 }}>
                            {data.slot} · Gemini Özeti
                        </span>
                    </div>

                    {/* Özet metni */}
                    <p className="px-4 py-2 text-[12px] leading-relaxed"
                       style={{ color: 'var(--color-text-secondary)' }}>
                        {data.summary_text}
                    </p>

                    {/* Konu chip'leri */}
                    {data.topics?.length > 0 && (
                        <div className="px-4 pb-3 flex flex-col gap-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
                               style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                                Öne Çıkan Konular
                            </p>
                            {data.topics.map((t, i) => (
                                <div key={i}
                                     className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
                                     style={{
                                         background:  '#3fff8b0a',
                                         border:      '1px solid #3fff8b1a',
                                         color:       'var(--color-text-secondary)',
                                     }}>
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#3fff8b44' }} />
                                    {t}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="px-4 pb-4 pt-1 flex justify-between items-center"
                         style={{ borderTop: `1px solid ${BORDER}` }}>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                            {data.article_count} haber analiz edildi
                        </span>
                        <span className="text-[10px] font-semibold" style={{ color: '#3fff8b', opacity: 0.5 }}>
                            {relSlot(data.slot)}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/gundem/DailySummaryPanel.jsx
git commit -m "feat(ui): DailySummaryPanel sol sidebar bileşeni"
```

---

## Task 7: TrendingPanel Bileşeni

**Files:**
- Create: `frontend/src/components/features/gundem/TrendingPanel.jsx`

- [ ] **Step 1: Bileşeni oluştur**

```jsx
// frontend/src/components/features/gundem/TrendingPanel.jsx
import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { useTrending } from '../../../hooks/useTrending';
import { trackInteraction } from '../../../services/interaction.service';

const BORDER = 'var(--color-terminal-border-raw)';
const ACCENT = '#7c8fff';

function SkeletonPanel() {
    return (
        <div className="rounded-xl overflow-hidden animate-pulse"
             style={{ background: 'var(--color-terminal-surface)', border: `1px solid ${BORDER}`, borderLeft: `3px solid ${ACCENT}33` }}>
            <div className="p-4 space-y-3">
                <div className="h-3 w-1/2 rounded" style={{ background: 'var(--color-skeleton)' }} />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-2 items-center">
                        <div className="w-4 h-4 rounded" style={{ background: 'var(--color-skeleton)' }} />
                        <div className="h-3 flex-1 rounded" style={{ background: 'var(--color-skeleton)' }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function rankColor(i) {
    if (i === 0) return ACCENT;
    if (i === 1) return `${ACCENT}99`;
    if (i === 2) return `${ACCENT}66`;
    return `${ACCENT}33`;
}

export default function TrendingPanel({ category }) {
    const { items, loading } = useTrending(category);

    // Bar genişlikleri için max tıklama normalleştir
    const maxClicks = useMemo(
        () => Math.max(1, ...items.map(a => a.community?.view_count || 0)),
        [items]
    );

    if (loading) return <SkeletonPanel />;

    return (
        <div className="rounded-xl overflow-hidden flex flex-col"
             style={{
                 background: 'var(--color-terminal-surface)',
                 border:     `1px solid ${BORDER}`,
                 borderLeft: `3px solid ${ACCENT}55`,
             }}>

            {/* Başlık */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-3"
                 style={{ borderBottom: `1px solid ${BORDER}` }}>
                <TrendingUp className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
                <span className="text-sm font-bold flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    Bugün Trend
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}33` }}>
                    Canlı
                </span>
            </div>

            {/* Liste */}
            {items.length === 0 ? (
                <p className="px-4 py-6 text-xs text-center"
                   style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                    Bugün henüz trend haber yok
                </p>
            ) : (
                <div className="flex flex-col px-3 py-2 gap-0.5 flex-1">
                    {items.map((article, i) => {
                        const clicks = article.community?.view_count || 0;
                        const barW   = Math.round((clicks / maxClicks) * 100);
                        return (
                            <a key={article.id}
                               href={article.source_url}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="flex gap-2 items-start px-2 py-2 rounded-lg transition-colors"
                               style={{ textDecoration: 'none' }}
                               onMouseEnter={e  => e.currentTarget.style.background = '#ffffff07'}
                               onMouseLeave={e  => e.currentTarget.style.background = 'transparent'}
                               onClick={() => trackInteraction({
                                   content_id:       article.id,
                                   interaction_type: 'click',
                                   category:         article.category,
                                   nlp_score_at_time: article.nlp_score,
                               })}>
                                <span className="text-[13px] font-black min-w-[18px] leading-tight pt-0.5"
                                      style={{ color: rankColor(i) }}>
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold leading-snug line-clamp-2 mb-1.5"
                                       style={{ color: 'var(--color-text-secondary)' }}>
                                        {article.title}
                                    </p>
                                    <div className="h-[2px] rounded-full overflow-hidden mb-1"
                                         style={{ background: '#0d1520' }}>
                                        <div className="h-full rounded-full transition-all duration-700"
                                             style={{ width: `${barW}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}88)` }} />
                                    </div>
                                    <p className="text-[9px] font-mono" style={{ color: `${ACCENT}55` }}>
                                        {clicks > 0 ? `${clicks} tıklama` : article.source_count > 1 ? `${article.source_count} kaynak` : ''}
                                    </p>
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            <div className="px-4 pb-3 pt-2 flex items-center gap-1.5"
                 style={{ borderTop: `1px solid ${BORDER}` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: ACCENT }} />
                <span className="text-[10px]" style={{ color: `${ACCENT}55` }}>
                    Her 5 dakikada güncellenir
                </span>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/gundem/TrendingPanel.jsx
git commit -m "feat(ui): TrendingPanel sag sidebar bileşeni"
```

---

## Task 8: Gundem.jsx 3 Sütun Layout

**Files:**
- Modify: `frontend/src/pages/Gundem.jsx`

- [ ] **Step 1: Dosyayı güncelle**

Mevcut `Gundem.jsx` dosyasını şununla değiştir:

```jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import { usePopularNews } from '../hooks/usePopularNews';
import PopularNewsGrid from '../components/features/gundem/PopularNewsGrid';
import DailySummaryPanel from '../components/features/gundem/DailySummaryPanel';
import TrendingPanel from '../components/features/gundem/TrendingPanel';
import { RefreshCw } from 'lucide-react';

export default function Gundem() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { subscribe } = useWebSocket();
    const category = searchParams.get('category');

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');

    const { featured, articles, loading, loadingMore, error, newCount, hasMore, refresh, loadMore } =
        usePopularNews(category, dateFrom, dateTo);

    useEffect(() => {
        const unsub = subscribe('recommendations_updated', refresh);
        return unsub;
    }, [subscribe, refresh]);

    return (
        <div className="w-full px-4 pt-14 pb-16">
            <div className="flex gap-4 max-w-[1400px] mx-auto items-start">

                {/* ── Sol Sidebar: Günün Özeti ── */}
                <aside className="hidden lg:block w-[230px] shrink-0 sticky top-[72px]">
                    <DailySummaryPanel />
                </aside>

                {/* ── Orta: Ana İçerik ── */}
                <main className="flex-1 min-w-0 max-w-5xl">

                    {/* Header */}
                    <div className="mb-6">
                        <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5"
                           style={{ color: 'var(--color-brand-primary)' }}>
                            // GÜNCEL_HABERLER
                        </p>
                        <h1 className="text-4xl md:text-5xl font-extrabold font-manrope tracking-tight leading-none"
                            style={{ color: 'var(--color-text-primary)' }}>
                            {category
                                ? <>{category.charAt(0).toUpperCase() + category.slice(1)}<span style={{ color: 'var(--color-brand-primary)' }}>.</span></>
                                : <>Sizin İçin<span style={{ color: 'var(--color-brand-primary)' }}>.</span></>
                            }
                        </h1>
                    </div>

                    {/* Yeni haber bildirimi */}
                    {newCount > 0 && (
                        <button
                            onClick={refresh}
                            className="w-full mb-5 flex items-center justify-center gap-2 py-2.5 px-4 font-mono text-[11px] font-bold uppercase tracking-widest border transition-all hover:brightness-110"
                            style={{
                                background:  'rgba(16,185,129,0.05)',
                                borderColor: 'var(--color-brand-primary)',
                                color:       'var(--color-brand-primary)',
                            }}>
                            <RefreshCw className="w-3.5 h-3.5" />
                            {newCount} yeni haber — yükle
                        </button>
                    )}

                    {/* Tarih filtresi temizle */}
                    {(dateFrom || dateTo) && (
                        <div className="flex items-center gap-3 mb-4 font-mono text-xs"
                             style={{ color: 'var(--color-text-muted)' }}>
                            <span>Tarih: {dateFrom || '…'} → {dateTo || '…'}</span>
                            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                                    className="hover:underline"
                                    style={{ color: 'var(--color-brand-primary)' }}>
                                Temizle
                            </button>
                        </div>
                    )}

                    {error && (
                        <p className="font-mono text-sm text-center py-10"
                           style={{ color: 'var(--color-es-error)', opacity: 0.7 }}>
                            {error}
                        </p>
                    )}

                    <PopularNewsGrid
                        featured={featured}
                        articles={articles}
                        loading={loading}
                        loadingMore={loadingMore}
                        hasMore={hasMore}
                        loadMore={loadMore}
                    />
                </main>

                {/* ── Sağ Sidebar: Bugün Trend ── */}
                <aside className="hidden lg:block w-[195px] shrink-0 sticky top-[72px]">
                    <TrendingPanel category={category} />
                </aside>

            </div>
        </div>
    );
}
```

- [ ] **Step 2: Build ve doğrula**

```bash
cd frontend && npm run build
```

Beklenen: build hatasız tamamlanır.

Dev server'da kontrol: `http://localhost:5173/gundem` → 3 sütun görünür (lg ekranda), sol Günün Özeti paneli, sağ Bugün Trend paneli.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Gundem.jsx
git commit -m "feat(gundem): 3 sutun layout - sol ozet + sag trend panelleri"
```

---

## Self-Review

**Spec coverage:**
- ✅ DailySummary model (Task 1)
- ✅ Migration SQL (Task 1)
- ✅ GET /api/v1/digest/today (Task 3)
- ✅ Celery task + 4x beat schedule (Task 4)
- ✅ Top-25 by source_count (Task 4 — `_generate`)
- ✅ Sadece başlık + kaynak sayısı gönderilir (Task 4 — prompt)
- ✅ Genel gündem özeti promptu, tek tek değil (Task 4 — prompt metni)
- ✅ useDigest + useTrending (Task 5)
- ✅ DailySummaryPanel (Task 6)
- ✅ TrendingPanel + trackInteraction (Task 7)
- ✅ 3-sütun layout, sticky sidebar, lg:hidden (Task 8)
- ✅ Hata durumu sessiz geçiş (Task 4 — try/except, Task 6 — null state)
- ✅ 5dk polling her iki hook'ta (Task 5)

**Tip tutarlılığı:**
- `useDigest` → `api.get('/digest/today')` → `DailySummaryResponse` alanları: `summary_text`, `topics`, `slot`, `article_count`, `generated_at` ✅
- `useTrending` → `NewsService.getNews()` → `items` array, her item `community.view_count`, `title`, `source_url`, `category`, `nlp_score` ✅
- `TrendingPanel` `category` prop alır, `useTrending(category)` geçirir ✅
- Beat schedule task adı `"workers.daily_digest_task.generate_daily_digest"` ile `@celery_app.task(name=...)` eşleşiyor ✅
