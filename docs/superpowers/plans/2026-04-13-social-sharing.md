# Sosyal Paylaşım + Forum Public Access — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Forum içeriğini giriş olmadan erişilebilir yapmak, 5 görüntülemede login nudge göstermek, analiz sonuçları ve forum thread'leri için kopyala/Twitter/WhatsApp paylaşım dropdown'u ve OG meta tag endpoint'leri eklemek.

**Architecture:** Backend'de 3 değişiklik: forum GET endpoint'lerini `get_optional_user`'a geçirme, `GET /analysis/share/{id}` public endpoint, `/s/` altında OG HTML endpoint'leri. Frontend'de yeniden kullanılabilir `ShareDropdown` ve `LoginNudgeModal` bileşenleri, `AnalysisResultCard` ve `ForumThread`'e entegrasyon, `SharedAnalysis` public sayfası.

**Tech Stack:** FastAPI, SQLAlchemy async, React 19, Vite, Tailwind CSS 4, localStorage

---

## Dosya Haritası

| Dosya | İşlem | Sorumluluk |
|-------|-------|-----------|
| `app/api/v1/endpoints/forum.py` | Modify | 3 GET endpoint → `get_optional_user` |
| `app/api/v1/endpoints/analysis.py` | Modify | `GET /analysis/share/{article_id}` ekle |
| `app/api/v1/endpoints/share.py` | Create | OG HTML endpoint'leri (`/s/analysis`, `/s/forum`) |
| `app/core/config.py` | Modify | `FRONTEND_URL` ayarı |
| `app/main.py` | Modify | `/s` router + `/static` StaticFiles mount |
| `app/schemas/schemas.py` | Modify | `SharedAnalysisResponse` şeması |
| `static/og-default.png` | Create | Varsayılan OG görseli (1200×630) |
| `frontend/src/components/ui/ShareDropdown.jsx` | Create | Link kopyala + Twitter + WhatsApp dropdown |
| `frontend/src/components/ui/LoginNudgeModal.jsx` | Create | 5 görüntülemede login popup |
| `frontend/src/features/analysis/AnalysisResultCard.jsx` | Modify | Share butonu ekle |
| `frontend/src/features/forum/ForumThread.jsx` | Modify | Share butonu + view counter hook |
| `frontend/src/features/forum/ForumFeed.jsx` | Modify | View counter hook |
| `frontend/src/pages/SharedAnalysis.jsx` | Create | Public analiz sonuç sayfası |
| `frontend/src/App.jsx` | Modify | `/analysis/share/:id` route |

---

## Task 1: Forum GET Endpoint'leri Public Yap

**Files:**
- Modify: `app/api/v1/endpoints/forum.py`

- [ ] **Step 1: İmport ekle**

`app/api/v1/endpoints/forum.py`'nin import satırını bul:
```python
from app.api.deps import get_current_user
```
Şu şekilde değiştir:
```python
from app.api.deps import get_current_user, get_optional_user
```

- [ ] **Step 2: `list_threads` endpoint'ini güncelle**

`@router.get("/threads", ...)` altındaki `async def list_threads(` fonksiyonunda:
```python
    current_user: User       = Depends(get_current_user),
```
→
```python
    current_user: Optional[User] = Depends(get_optional_user),
```

`Optional` zaten dosyada import edilmiş (`from typing import List, Optional`).

- [ ] **Step 3: `get_thread` endpoint'ini güncelle**

`@router.get("/threads/{thread_id}", ...)` altındaki `async def get_thread(` fonksiyonunda:
```python
    current_user: User       = Depends(get_current_user),
```
→
```python
    current_user: Optional[User] = Depends(get_optional_user),
```

- [ ] **Step 4: `get_trending` endpoint'ini güncelle**

`@router.get("/trending", ...)` altındaki `async def get_trending(` fonksiyonunda:
```python
    current_user: User       = Depends(get_current_user),
```
→
```python
    current_user: Optional[User] = Depends(get_optional_user),
```

- [ ] **Step 5: `get_article_threads` endpoint'ini güncelle**

`@router.get("/articles/{article_id}/threads", ...)` altındaki `async def get_article_threads(` fonksiyonunda:
```python
    current_user: User         = Depends(get_current_user),
```
→
```python
    current_user: Optional[User] = Depends(get_optional_user),
```

- [ ] **Step 6: `search_tags` endpoint'ini güncelle**

`@router.get("/tags", ...)` altındaki `async def search_tags(` fonksiyonunda:
```python
    current_user: User       = Depends(get_current_user),
```
→
```python
    current_user: Optional[User] = Depends(get_optional_user),
```

- [ ] **Step 7: Manuel test**

Backend çalışıyorsa token olmadan istek at:
```bash
curl http://localhost:8000/api/v1/forum/threads
```
Beklenen: 200 OK (token olmadan), thread listesi döner.

- [ ] **Step 8: Commit**

```bash
git add app/api/v1/endpoints/forum.py
git commit -m "feat(social): forum GET endpoint'leri public"
```

---

## Task 2: `GET /analysis/share/{article_id}` Endpoint

**Files:**
- Modify: `app/schemas/schemas.py`
- Modify: `app/api/v1/endpoints/analysis.py`

- [ ] **Step 1: Şema ekle**

`app/schemas/schemas.py`'nin sonuna ekle:

```python
class SharedAnalysisResponse(BaseModel):
    article_id:      str
    title:           str
    prediction:      str
    confidence:      float
    risk_score:      Optional[float] = None
    clickbait_score: Optional[float] = None
    created_at:      Optional[str]   = None
```

- [ ] **Step 2: Endpoint ekle**

`app/api/v1/endpoints/analysis.py`'de `SharedAnalysisResponse`'u şema import listesine ekle. Ardından dosyanın sonuna (mevcut endpoint'lerin altına):

```python
@router.get("/share/{article_id}", response_model=SharedAnalysisResponse, status_code=status.HTTP_200_OK)
async def get_shared_analysis(
    article_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Analiz sonucunu auth gerektirmeden döner — paylaşım linkleri için."""
    try:
        uid = uuid.UUID(article_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Bulunamadı")

    row = await db.execute(
        select(Article, AnalysisResult)
        .join(AnalysisResult, AnalysisResult.article_id == Article.id)
        .where(Article.id == uid)
    )
    pair = row.first()
    if not pair:
        raise HTTPException(status_code=404, detail="Bulunamadı")

    article, result = pair
    signals = result.signals or {}
    return SharedAnalysisResponse(
        article_id=str(article.id),
        title=article.title or "",
        prediction=result.status,
        confidence=result.confidence or 0.0,
        risk_score=signals.get("risk_score"),
        clickbait_score=signals.get("clickbait_score"),
        created_at=result.created_at.isoformat() if result.created_at else None,
    )
```

- [ ] **Step 3: Manuel test**

```bash
# Önce bir article_id bul (DB'de var olan bir ID)
curl http://localhost:8000/api/v1/analysis/share/<article_id>
```
Beklenen: `{"article_id": "...", "prediction": "FAKE", "confidence": 0.87, ...}`

- [ ] **Step 4: Commit**

```bash
git add app/schemas/schemas.py app/api/v1/endpoints/analysis.py
git commit -m "feat(social): GET /analysis/share/{id} public endpoint"
```

---

## Task 3: OG Meta Tag Endpoint'leri + Config

**Files:**
- Modify: `app/core/config.py`
- Create: `app/api/v1/endpoints/share.py`
- Create: `static/og-default.png`
- Modify: `app/main.py`

- [ ] **Step 1: Config'e `FRONTEND_URL` ekle**

`app/core/config.py`'de `Settings` sınıfına ekle (diğer URL ayarlarının yanına):

```python
    FRONTEND_URL: str = "http://localhost:5173"
```

- [ ] **Step 2: OG görseli oluştur**

```bash
python - <<'EOF'
from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs("static", exist_ok=True)
img = Image.new("RGB", (1200, 630), color=(99, 102, 241))
draw = ImageDraw.Draw(img)
draw.text((100, 270), "Sahte Haber Dedektifi", fill="white")
img.save("static/og-default.png")
print("og-default.png oluşturuldu.")
EOF
```

Pillow kurulu değilse önce `pip install Pillow`. Pillow yoksa ve kurulamıyorsa:
```bash
python - <<'EOF'
import struct, zlib, os

def make_png(w, h, color=(99,102,241)):
    r,g,b = color
    raw = bytes([0]+[r,g,b]*w)*h
    compressed = zlib.compress(raw)
    def chunk(tag, data):
        c = struct.pack('>I',len(data))+tag+data
        crc = struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
        return c+crc
    return (b'\x89PNG\r\n\x1a\n'
        +chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))
        +chunk(b'IDAT',compressed)
        +chunk(b'IEND',b''))

os.makedirs("static", exist_ok=True)
with open("static/og-default.png","wb") as f:
    f.write(make_png(1200,630))
print("og-default.png oluşturuldu.")
EOF
```

- [ ] **Step 3: `share.py` yaz**

`app/api/v1/endpoints/share.py`:

```python
"""
app/api/v1/endpoints/share.py
==============================
GET /s/analysis/{article_id}  — OG meta tag HTML + redirect
GET /s/forum/{thread_id}       — OG meta tag HTML + redirect
"""
import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.models import Article, AnalysisResult, ForumThread

router = APIRouter()

_OG_TEMPLATE = """\
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="{og_title}">
  <meta property="og:description" content="{og_desc}">
  <meta property="og:image" content="{base_url}/static/og-default.png">
  <meta property="og:url" content="{og_url}">
  <meta name="twitter:card" content="summary">
  <meta http-equiv="refresh" content="0;url={redirect}">
</head>
<body>
  <script>window.location.href="{redirect}";</script>
  <p>Yönlendiriliyorsunuz... <a href="{redirect}">Tıklayın</a></p>
</body>
</html>"""

_BASE_URL = "http://localhost:8000"


@router.get("/analysis/{article_id}", response_class=HTMLResponse)
async def share_analysis(article_id: str, db: AsyncSession = Depends(get_db)):
    redirect = f"{settings.FRONTEND_URL}/analysis/share/{article_id}"
    og_title = "Sahte Haber Dedektifi — Analiz Sonucu"
    og_desc  = "Bu haberin analizini inceleyin."

    try:
        uid = uuid.UUID(article_id)
        row = await db.execute(
            select(Article, AnalysisResult)
            .join(AnalysisResult, AnalysisResult.article_id == Article.id)
            .where(Article.id == uid)
        )
        pair = row.first()
        if pair:
            article, result = pair
            label    = "SAHTE" if result.status == "FAKE" else "GÜVENİLİR"
            conf_pct = round((result.confidence or 0) * 100)
            og_title = f"Sahte Haber Dedektifi — {label} (%{conf_pct})"
            og_desc  = f"'{article.title[:100]}' başlıklı içerik analiz edildi."
    except Exception:
        pass

    html = _OG_TEMPLATE.format(
        og_title=og_title,
        og_desc=og_desc,
        base_url=_BASE_URL,
        og_url=f"{_BASE_URL}/s/analysis/{article_id}",
        redirect=redirect,
    )
    return HTMLResponse(content=html)


@router.get("/forum/{thread_id}", response_class=HTMLResponse)
async def share_forum(thread_id: str, db: AsyncSession = Depends(get_db)):
    redirect = f"{settings.FRONTEND_URL}/forum/thread/{thread_id}"
    og_title = "Sahte Haber Dedektifi — Forum"
    og_desc  = "Forum tartışmasını inceleyin."

    try:
        uid = uuid.UUID(thread_id)
        row = await db.execute(
            select(ForumThread).where(ForumThread.id == uid)
        )
        thread = row.scalar_one_or_none()
        if thread:
            og_title = f"Forum — {thread.title[:80]}"
            body_preview = (thread.body or "")[:150]
            og_desc = body_preview if body_preview else "Forum tartışmasını inceleyin."
    except Exception:
        pass

    html = _OG_TEMPLATE.format(
        og_title=og_title,
        og_desc=og_desc,
        base_url=_BASE_URL,
        og_url=f"{_BASE_URL}/s/forum/{thread_id}",
        redirect=redirect,
    )
    return HTMLResponse(content=html)
```

- [ ] **Step 4: `main.py`'ye router ve StaticFiles ekle**

`app/main.py`'nin import bloğuna ekle:

```python
from fastapi.staticfiles import StaticFiles
from app.api.v1.endpoints import share as share_router
```

`app.include_router(ws_endpoint.router, prefix="/api/v1")` satırının hemen altına:

```python
app.include_router(share_router.router, prefix="/s", tags=["Share"])
app.mount("/static", StaticFiles(directory="static"), name="static")
```

- [ ] **Step 5: Manuel test**

```bash
curl -L http://localhost:8000/s/analysis/some-invalid-id
```
Beklenen: HTML döner, OG tag'leri görünür, redirect linki `/analysis/share/some-invalid-id`'e işaret eder.

```bash
curl http://localhost:8000/static/og-default.png -o /dev/null -w "%{http_code}"
```
Beklenen: `200`

- [ ] **Step 6: Commit**

```bash
git add app/core/config.py app/api/v1/endpoints/share.py app/main.py static/og-default.png
git commit -m "feat(social): OG meta endpoint'leri + static + FRONTEND_URL"
```

---

## Task 4: ShareDropdown Bileşeni

**Files:**
- Create: `frontend/src/components/ui/ShareDropdown.jsx`

- [ ] **Step 1: Bileşeni yaz**

`frontend/src/components/ui/ShareDropdown.jsx`:

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { Copy, Twitter, MessageCircle, Share2, Check } from 'lucide-react';

/**
 * Yeniden kullanılabilir paylaşım dropdown'u.
 * Props:
 *   url  — paylaşılacak tam URL (string)
 *   text — sosyal medya için metin (string)
 */
export default function ShareDropdown({ url, text }) {
    const [open, setCopied, setClosed] = [useState(false), useState(false), useState(false)];
    // Yukarıdaki destructure yanlış — düzelt:
    const [isOpen, setIsOpen]     = useState(false);
    const [copied, setCopiedState] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    async function copyLink() {
        await navigator.clipboard.writeText(url);
        setCopiedState(true);
        setTimeout(() => { setCopiedState(false); setIsOpen(false); }, 1500);
    }

    function openTwitter() {
        const encoded = encodeURIComponent(`${text}\n${url}`);
        window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
        setIsOpen(false);
    }

    function openWhatsApp() {
        const encoded = encodeURIComponent(`${text} ${url}`);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
        setIsOpen(false);
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
            >
                <Share2 size={13} />
                Paylaş
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden">
                    <button
                        onClick={copyLink}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? 'Kopyalandı!' : 'Link Kopyala'}
                    </button>
                    <button
                        onClick={openTwitter}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                        <Twitter size={14} />
                        Twitter'da Paylaş
                    </button>
                    <button
                        onClick={openWhatsApp}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                        <MessageCircle size={14} />
                        WhatsApp'ta Paylaş
                    </button>
                </div>
            )}
        </div>
    );
}
```

**Not:** Dosyayı yazarken ilk `useState` destructure satırlarını (`const [open, setCopied, setClosed]`) dahil etme — onlar yorum satırı olarak yazıldı, gerçek kod `const [isOpen, setIsOpen]` ile başlar.

Gerçek dosya içeriği:

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { Copy, Twitter, MessageCircle, Share2, Check } from 'lucide-react';

export default function ShareDropdown({ url, text }) {
    const [isOpen, setIsOpen]      = useState(false);
    const [copied, setCopied]      = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    async function copyLink() {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => { setCopied(false); setIsOpen(false); }, 1500);
    }

    function openTwitter() {
        const encoded = encodeURIComponent(`${text}\n${url}`);
        window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
        setIsOpen(false);
    }

    function openWhatsApp() {
        const encoded = encodeURIComponent(`${text} ${url}`);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
        setIsOpen(false);
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
            >
                <Share2 size={13} />
                Paylaş
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden">
                    <button
                        onClick={copyLink}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? 'Kopyalandı!' : 'Link Kopyala'}
                    </button>
                    <button
                        onClick={openTwitter}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                        <Twitter size={14} />
                        Twitter'da Paylaş
                    </button>
                    <button
                        onClick={openWhatsApp}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                        <MessageCircle size={14} />
                        WhatsApp'ta Paylaş
                    </button>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/ShareDropdown.jsx
git commit -m "feat(social): ShareDropdown bileşeni"
```

---

## Task 5: LoginNudgeModal Bileşeni

**Files:**
- Create: `frontend/src/components/ui/LoginNudgeModal.jsx`

- [ ] **Step 1: Bileşeni yaz**

`frontend/src/components/ui/LoginNudgeModal.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const STORAGE_KEY = 'forum_view_count';
const NUDGE_THRESHOLD = 5;

/**
 * Forum sayfalarında kullanılır.
 * Giriş yapmamış kullanıcı 5 forum sayfası görüntüleyince modal çıkar.
 */
export function useLoginNudge() {
    const { user } = useAuth();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (user) return; // giriş yapılmışsa sayma

        const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) + 1;
        localStorage.setItem(STORAGE_KEY, String(count));

        if (count >= NUDGE_THRESHOLD) {
            localStorage.setItem(STORAGE_KEY, '0');
            setShow(true);
        }
    }, []); // yalnızca mount'ta çalışır

    return [show, () => setShow(false)];
}

export default function LoginNudgeModal({ onClose }) {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
                <h2 className="text-lg font-bold mb-2">Daha fazlası için giriş yap</h2>
                <p className="text-sm text-muted mb-6">
                    Forum tartışmalarına katılmak, oy vermek ve analiz sonuçlarını
                    paylaşmak için hesap oluştur.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/login')}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                    >
                        Giriş Yap
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-foreground transition-colors"
                    >
                        Şimdi Değil
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/LoginNudgeModal.jsx
git commit -m "feat(social): LoginNudgeModal + useLoginNudge hook"
```

---

## Task 6: ForumFeed + ForumThread'e Login Nudge + Share Butonu

**Files:**
- Modify: `frontend/src/features/forum/ForumFeed.jsx`
- Modify: `frontend/src/features/forum/ForumThread.jsx`

- [ ] **Step 1: ForumFeed'e nudge ekle**

`frontend/src/features/forum/ForumFeed.jsx`'i oku. Import bloğuna ekle:

```jsx
import LoginNudgeModal, { useLoginNudge } from '../../components/ui/LoginNudgeModal';
```

Bileşenin en üstüne (diğer hook'ların yanına):
```jsx
const [showNudge, closeNudge] = useLoginNudge();
```

Return'ün içine (en dışa, başka bileşenlerin kardeşi olarak):
```jsx
{showNudge && <LoginNudgeModal onClose={closeNudge} />}
```

- [ ] **Step 2: ForumThread'e nudge + share ekle**

`frontend/src/features/forum/ForumThread.jsx`'i oku. Import bloğuna ekle:

```jsx
import LoginNudgeModal, { useLoginNudge } from '../../components/ui/LoginNudgeModal';
import ShareDropdown from '../../components/ui/ShareDropdown';
```

Bileşenin hook'lar bölümüne ekle:
```jsx
const [showNudge, closeNudge] = useLoginNudge();
```

Thread başlığının render edildiği yeri bul (genellikle `<h1>` veya thread.title'ın gösterildiği yer). O başlığın yanına share dropdown ekle:

```jsx
<div className="flex items-start justify-between gap-4">
    <h1 className="text-xl font-bold">{thread.title}</h1>
    <ShareDropdown
        url={`${window.location.origin}/s/forum/${thread.id}`}
        text={`Forum: ${thread.title}`}
    />
</div>
```

Return'ün içine nudge modal ekle:
```jsx
{showNudge && <LoginNudgeModal onClose={closeNudge} />}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/forum/ForumFeed.jsx frontend/src/features/forum/ForumThread.jsx
git commit -m "feat(social): forum — login nudge + share butonu"
```

---

## Task 7: AnalysisResultCard'a Share Butonu

**Files:**
- Modify: `frontend/src/features/analysis/AnalysisResultCard.jsx`

- [ ] **Step 1: Import ekle**

`frontend/src/features/analysis/AnalysisResultCard.jsx`'i oku. Import bloğuna ekle:

```jsx
import ShareDropdown from '../../components/ui/ShareDropdown';
```

- [ ] **Step 2: Share butonu ekle**

`articleId` değişkeninin zaten var olduğunu doğrula (satır 143: `const articleId = result.direct_match_data?.db_article_id ?? result.db_article_id ?? null;`).

Kart başlığının veya aksiyon butonlarının olduğu yeri bul. Mevcut `FeedbackBar` veya aksiyon bölümünün yanına ekle:

```jsx
{articleId && (
    <ShareDropdown
        url={`${window.location.origin}/s/analysis/${articleId}`}
        text={`${status === 'FAKE' ? 'SAHTE' : 'GÜVENİLİR'} (%${confidencePct}) — ${origText?.slice(0, 80) || ''} | Sahte Haber Dedektifi`}
    />
)}
```

`confidencePct` değişkeni zaten mevcut (satır 128-129). `status` de mevcut (satır 119).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analysis/AnalysisResultCard.jsx
git commit -m "feat(social): analiz kartına share butonu"
```

---

## Task 8: SharedAnalysis Public Sayfası + Route

**Files:**
- Create: `frontend/src/pages/SharedAnalysis.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Sayfayı yaz**

`frontend/src/pages/SharedAnalysis.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function SharedAnalysis() {
    const { articleId } = useParams();
    const [data, setData]     = useState(null);
    const [error, setError]   = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API}/analysis/share/${articleId}`)
            .then(r => setData(r.data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [articleId]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted text-sm">Yükleniyor…</p>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <p className="text-muted">Analiz bulunamadı.</p>
            <Link to="/" className="text-sm text-indigo-400 hover:underline">Ana Sayfaya Dön</Link>
        </div>
    );

    const isFake     = data.prediction === 'FAKE';
    const confPct    = Math.round((data.confidence || 0) * 100);
    const labelColor = isFake ? 'text-red-400' : 'text-green-400';
    const bgColor    = isFake ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20';

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 gap-6">
            <div className={`w-full max-w-lg rounded-2xl border p-8 ${bgColor}`}>
                <p className="text-xs text-muted mb-2 uppercase tracking-widest">Analiz Sonucu</p>
                <h1 className={`text-3xl font-bold mb-1 ${labelColor}`}>
                    {isFake ? 'SAHTE' : 'GÜVENİLİR'}
                </h1>
                <p className="text-5xl font-black mb-4">{confPct}%</p>
                <p className="text-sm text-muted mb-6 leading-relaxed">{data.title}</p>
                {data.clickbait_score != null && (
                    <p className="text-xs text-muted">
                        Clickbait skoru: {Math.round(data.clickbait_score * 100)}%
                    </p>
                )}
                {data.created_at && (
                    <p className="text-xs text-muted mt-1">
                        {new Date(data.created_at).toLocaleDateString('tr-TR')}
                    </p>
                )}
            </div>
            <Link
                to="/"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
                Kendi Haberini Analiz Et
            </Link>
        </div>
    );
}
```

- [ ] **Step 2: Route ekle**

`frontend/src/App.jsx`'i oku. `SharedAnalysis`'ı import et ve `/analysis/share/:articleId` route'u ekle. Mevcut route'ların yanına (public route olarak — auth wrapper içinde olmayacak):

```jsx
import SharedAnalysis from './pages/SharedAnalysis';

// Route'lar arasına:
<Route path="/analysis/share/:articleId" element={<SharedAnalysis />} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/SharedAnalysis.jsx frontend/src/App.jsx
git commit -m "feat(social): SharedAnalysis public sayfası + route"
```

---

## Self-Review

**Spec coverage:**
- ✅ Forum GET endpoint'leri public (Task 1)
- ✅ `get_optional_user` — `list_threads`, `get_thread`, `get_trending`, `get_article_threads`, `search_tags` (Task 1)
- ✅ `GET /analysis/share/{id}` public endpoint (Task 2)
- ✅ `SharedAnalysisResponse` şeması (Task 2)
- ✅ `FRONTEND_URL` config (Task 3)
- ✅ OG HTML endpoint'leri `/s/analysis` + `/s/forum` (Task 3)
- ✅ `/static` mount + `og-default.png` (Task 3)
- ✅ `ShareDropdown` — copy + Twitter + WhatsApp (Task 4)
- ✅ `LoginNudgeModal` + `useLoginNudge` hook (Task 5)
- ✅ `localStorage` view counter, threshold=5, sıfırlama (Task 5)
- ✅ Forum feed'e nudge (Task 6)
- ✅ Forum thread'e nudge + share (Task 6)
- ✅ AnalysisResultCard'a share (Task 7)
- ✅ `SharedAnalysis` public sayfası (Task 8)
- ✅ `/analysis/share/:articleId` route (Task 8)

**Placeholder taraması:** Yok.

**Tip tutarlılığı:**
- `SharedAnalysisResponse` Task 2'de tanımlandı, `SharedAnalysis.jsx`'te `data.prediction`, `data.confidence`, `data.title`, `data.clickbait_score`, `data.created_at` kullanıldı — tümü şemada mevcut ✅
- `ShareDropdown` props: `url` (string) + `text` (string) — Task 4'te tanımlandı, Task 6 ve 7'de kullanıldı ✅
- `useLoginNudge` return: `[show: boolean, close: () => void]` — Task 5'te tanımlandı, Task 6'da kullanıldı ✅
- OG redirect URL'i: `/s/analysis/{id}` → `{FRONTEND_URL}/analysis/share/{id}` → `SharedAnalysis` sayfası route'u `/analysis/share/:articleId` ✅
