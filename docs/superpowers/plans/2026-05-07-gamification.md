# Gamification Sistemi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mevcut `forum_trust_score`/tier sisteminin üzerine XP tabanlı gamification katmanı ekle — anlık puan olayları, 50+ seviye sistemi, 28 başarım rozeti, sıralama sayfası ve profil rozet vitrini.

**Architecture:** XP olayları `UserXPEvent` tablosuna anlık kaydedilir, `UserBadge` tablosu rozet sahipliğini tutar; `level` güncelleme mevcut nightly Celery task'ına eklenir. Frontend'de yeni `/badges` sayfası, `XPToast` bildirimi ve profil vitrin bileşeni eklenir; `UserProfile.jsx`'deki hardcoded `getBadges()` tamamen API'ye taşınır.

**Tech Stack:** FastAPI + SQLAlchemy Async + PostgreSQL + Redis (rate limit) + Alembic | React 19 + Axios + Tailwind CSS 4

---

### Task 1: DB Modelleri

**Files:**
- Create: `app/models/gamification.py`
- Modify: `app/models/models.py`

- [ ] **Step 1: `app/models/gamification.py` oluştur**

```python
import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.models.models import Base


class XPActionType(str, enum.Enum):
    analysis_created = "analysis_created"
    thread_created   = "thread_created"
    comment_created  = "comment_created"
    vote_cast        = "vote_cast"
    evidence_added   = "evidence_added"
    helpful_received = "helpful_received"
    followed         = "followed"
    daily_login      = "daily_login"


class UserXPEvent(Base):
    __tablename__ = "user_xp_events"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(Enum(XPActionType), nullable=False)
    xp_amount   = Column(Integer, nullable=False)
    ref_id      = Column(String(64), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class UserBadge(Base):
    __tablename__ = "user_badges"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_key      = Column(String(50), nullable=False)
    earned_at      = Column(DateTime(timezone=True), server_default=func.now())
    is_showcased   = Column(Boolean, nullable=False, server_default="false", default=False)
    showcase_order = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "badge_key", name="uq_user_badge"),
    )
```

- [ ] **Step 2: `app/models/models.py` — User modeline 4 alan ekle**

`forum_trust_category` alanından hemen sonra (satır ~51 civarı) ekle:

```python
    total_xp        = Column(Integer, nullable=False, server_default="0", default=0)
    level           = Column(Integer, nullable=False, server_default="1", default=1)
    current_streak  = Column(Integer, nullable=False, server_default="0", default=0)
    last_login_date = Column(Date, nullable=True)
```

Dosyanın import satırına `Date` ekle — mevcut `from sqlalchemy import (Boolean, ..., Integer, String, Text, ...)` satırına `Date,` eklenir.

- [ ] **Step 3: Commit**

```bash
git add app/models/gamification.py app/models/models.py
git commit -m "feat(gamification): UserXPEvent, UserBadge modelleri ve User XP alanları"
```

---

### Task 2: Alembic Migration

**Files:**
- Create: `alembic/versions/d4f6a8b2c9e1_add_gamification.py`

- [ ] **Step 1: Migration dosyasını oluştur**

```python
"""add_gamification

Revision ID: d4f6a8b2c9e1
Revises: b3d5e7a9c0f2
Create Date: 2026-05-07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd4f6a8b2c9e1'
down_revision: Union[str, Sequence[str], None] = 'b3d5e7a9c0f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) User tablosuna yeni sütunlar
    op.add_column('users', sa.Column('total_xp',        sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('level',           sa.Integer(), nullable=False, server_default='1'))
    op.add_column('users', sa.Column('current_streak',  sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('last_login_date', sa.Date(),    nullable=True))

    # 2) xpactiontype enum oluştur
    xpactiontype = postgresql.ENUM(
        'analysis_created', 'thread_created', 'comment_created', 'vote_cast',
        'evidence_added', 'helpful_received', 'followed', 'daily_login',
        name='xpactiontype'
    )
    xpactiontype.create(op.get_bind(), checkfirst=True)

    # 3) user_xp_events tablosu
    op.create_table(
        'user_xp_events',
        sa.Column('id',          sa.Integer(),                  nullable=False),
        sa.Column('user_id',     postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action_type',
                  sa.Enum('analysis_created', 'thread_created', 'comment_created', 'vote_cast',
                          'evidence_added', 'helpful_received', 'followed', 'daily_login',
                          name='xpactiontype'),
                  nullable=False),
        sa.Column('xp_amount',  sa.Integer(),               nullable=False),
        sa.Column('ref_id',     sa.String(64),              nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_xp_events_user_id',    'user_xp_events', ['user_id'],    unique=False)
    op.create_index('ix_user_xp_events_created_at', 'user_xp_events', ['created_at'], unique=False)

    # 4) user_badges tablosu
    op.create_table(
        'user_badges',
        sa.Column('id',             sa.Integer(),                  nullable=False),
        sa.Column('user_id',        postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('badge_key',      sa.String(50),                 nullable=False),
        sa.Column('earned_at',      sa.DateTime(timezone=True),    server_default=sa.text('now()'), nullable=True),
        sa.Column('is_showcased',   sa.Boolean(),                  nullable=False, server_default='false'),
        sa.Column('showcase_order', sa.Integer(),                  nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'badge_key', name='uq_user_badge'),
    )
    op.create_index('ix_user_badges_user_id', 'user_badges', ['user_id'], unique=False)

    # 5) Mevcut kullanıcılara level_1 rozeti ver
    op.execute("""
        INSERT INTO user_badges (user_id, badge_key, earned_at, is_showcased)
        SELECT id, 'level_1', NOW(), false FROM users
        ON CONFLICT (user_id, badge_key) DO NOTHING
    """)

    # 6) İlk 100 kullanıcıya early_bird rozeti ver
    op.execute("""
        INSERT INTO user_badges (user_id, badge_key, earned_at, is_showcased)
        SELECT id, 'early_bird', NOW(), false
        FROM (SELECT id FROM users ORDER BY created_at LIMIT 100) early
        ON CONFLICT (user_id, badge_key) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_index('ix_user_badges_user_id',     table_name='user_badges')
    op.drop_table('user_badges')
    op.drop_index('ix_user_xp_events_created_at', table_name='user_xp_events')
    op.drop_index('ix_user_xp_events_user_id',    table_name='user_xp_events')
    op.drop_table('user_xp_events')
    op.drop_column('users', 'last_login_date')
    op.drop_column('users', 'current_streak')
    op.drop_column('users', 'level')
    op.drop_column('users', 'total_xp')
    op.execute("DROP TYPE IF EXISTS xpactiontype")
```

- [ ] **Step 2: Migrasyonu çalıştır**

```bash
alembic upgrade head
```

Beklenen: `Running upgrade b3d5e7a9c0f2 -> d4f6a8b2c9e1, add_gamification`

- [ ] **Step 3: Commit**

```bash
git add alembic/versions/d4f6a8b2c9e1_add_gamification.py
git commit -m "feat(gamification): alembic migration — XP events, badges, user level alanları"
```

---

### Task 3: Badge Tanımları

**Files:**
- Create: `workers/badge_definitions.py`

- [ ] **Step 1: `workers/badge_definitions.py` oluştur**

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class BadgeDef:
    key:         str
    name:        str
    description: str
    category:    str   # "level" | "activity" | "category"
    icon:        str   # Lucide icon adı (frontend için)
    color:       str   # CSS renk değişkeni veya hex


BADGE_DEFS: list[BadgeDef] = [
    # ── Seviye rozetleri ────────────────────────────────────────────
    BadgeDef("level_1",  "Çaylak",      "Sisteme katıldın",             "level", "User",        "var(--color-text-muted)"),
    BadgeDef("level_10", "Meraklı",     "10. seviyeye ulaştın",         "level", "Search",      "var(--color-accent-blue)"),
    BadgeDef("level_20", "Araştırmacı", "20. seviyeye ulaştın",         "level", "FileSearch",  "var(--color-accent-amber)"),
    BadgeDef("level_30", "Analist",     "30. seviyeye ulaştın",         "level", "BarChart2",   "var(--color-brand-primary)"),
    BadgeDef("level_40", "Dedektif",    "40. seviyeye ulaştın",         "level", "Shield",      "#a855f7"),
    BadgeDef("level_50", "Usta",        "50. seviyeye ulaştın",         "level", "Star",        "#ef4444"),
    # ── Aktivite / Kilometre Taşı Rozetleri ─────────────────────────
    BadgeDef("first_analysis", "İlk Adım",           "İlk analizini yaptın",               "activity", "Cpu",          "var(--color-brand-primary)"),
    BadgeDef("analyst_100",    "Yüzlük",              "100 analiz tamamladın",              "activity", "TrendingUp",   "var(--color-accent-amber)"),
    BadgeDef("first_thread",   "Forum Açıcı",         "İlk forum başlığını açtın",          "activity", "MessageSquare","var(--color-accent-blue)"),
    BadgeDef("prolific_50",    "Üretken",             "50 forum başlığı açtın",             "activity", "Zap",          "var(--color-accent-amber)"),
    BadgeDef("evidence_10",    "Kanıtçı",             "10 kanıt ekledin",                   "activity", "Link",         "var(--color-brand-primary)"),
    BadgeDef("evidence_50",    "Gerçek Avcısı",       "50 kanıt ekledin",                   "activity", "Award",        "#ef4444"),
    BadgeDef("social_10",      "Sosyal",              "10 takipçiye ulaştın",               "activity", "Users",        "var(--color-accent-blue)"),
    BadgeDef("social_100",     "Influencer",          "100 takipçiye ulaştın",              "activity", "UserCheck",    "#a855f7"),
    BadgeDef("helpful_50",     "Faydalı İnsan",       "50 kez faydalı bulundun",            "activity", "ThumbsUp",     "var(--color-brand-primary)"),
    BadgeDef("streak_7",       "Haftalık Alışkanlık", "7 gün üst üste giriş yaptın",        "activity", "Calendar",     "var(--color-accent-blue)"),
    BadgeDef("streak_30",      "Aylık Seri",          "30 gün üst üste giriş yaptın",       "activity", "CalendarCheck","var(--color-accent-amber)"),
    BadgeDef("debunker",       "Çürütücü",            "FAKE haberlere 5 kez kanıt ekledin", "activity", "ShieldCheck",  "var(--color-brand-primary)"),
    BadgeDef("early_bird",     "Erken Kuş",           "İlk 100 kullanıcıdan birisin",       "activity", "Zap",          "#f59e0b"),
    # ── Kategori Rozetleri ──────────────────────────────────────────
    BadgeDef("cat_haberler",  "Haber Takipçisi",   "Haberler kategorisinde 20+ başlık",  "category", "Newspaper",  "var(--color-accent-blue)"),
    BadgeDef("cat_teknoloji", "Teknoloji Uzmanı",  "Teknoloji kategorisinde 20+ başlık", "category", "Cpu",        "var(--color-brand-primary)"),
    BadgeDef("cat_kultur",    "Kültür Elçisi",     "Kültür kategorisinde 20+ başlık",    "category", "BookOpen",   "var(--color-accent-amber)"),
    BadgeDef("cat_spor",      "Spor Tutkunu",      "Spor kategorisinde 20+ başlık",      "category", "Trophy",     "#ef4444"),
    BadgeDef("cat_eglence",   "Eğlence Ustası",    "Eğlence kategorisinde 20+ başlık",   "category", "Music",      "#a855f7"),
    BadgeDef("cat_bilim",     "Bilim İnsanı",      "Bilim kategorisinde 20+ başlık",     "category", "Microscope", "var(--color-brand-primary)"),
    BadgeDef("cat_ekonomi",   "Ekonomi Analisti",  "Ekonomi kategorisinde 20+ başlık",   "category", "DollarSign", "var(--color-accent-amber)"),
    BadgeDef("cat_genel",     "Genel Katılımcı",   "Genel kategorisinde 20+ başlık",     "category", "Globe",      "var(--color-text-muted)"),
    BadgeDef("cat_all",       "Evrensel Katılımcı","Tüm kategorilerde aktif oldun",       "category", "Globe2",     "#f59e0b"),
]

BADGE_BY_KEY: dict[str, BadgeDef] = {b.key: b for b in BADGE_DEFS}

# Her rozet için progress hesabı: (metric_name, threshold)
BADGE_PROGRESS_HINTS: dict[str, tuple[str, int]] = {
    "first_analysis": ("analysis_count",  1),
    "analyst_100":    ("analysis_count",  100),
    "first_thread":   ("thread_count",    1),
    "prolific_50":    ("thread_count",    50),
    "evidence_10":    ("evidence_count",  10),
    "evidence_50":    ("evidence_count",  50),
    "social_10":      ("follower_count",  10),
    "social_100":     ("follower_count",  100),
    "helpful_50":     ("helpful_total",   50),
    "streak_7":       ("current_streak",  7),
    "streak_30":      ("current_streak",  30),
    "debunker":       ("debunker_count",  5),
    "level_10":       ("level",           10),
    "level_20":       ("level",           20),
    "level_30":       ("level",           30),
    "level_40":       ("level",           40),
    "level_50":       ("level",           50),
    "cat_haberler":   ("cat_haberler",    20),
    "cat_teknoloji":  ("cat_teknoloji",   20),
    "cat_kultur":     ("cat_kultur",      20),
    "cat_spor":       ("cat_spor",        20),
    "cat_eglence":    ("cat_eglence",     20),
    "cat_bilim":      ("cat_bilim",       20),
    "cat_ekonomi":    ("cat_ekonomi",     20),
    "cat_genel":      ("cat_genel",       20),
    "cat_all":        ("cat_all",         8),
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/badge_definitions.py
git commit -m "feat(gamification): 28 rozet tanımı (level, activity, category)"
```

---

### Task 4: XP Servisi

**Files:**
- Create: `app/services/__init__.py`
- Create: `app/services/xp_service.py`

- [ ] **Step 1: `app/services/` dizini oluştur**

```bash
mkdir -p app/services && touch app/services/__init__.py
```

- [ ] **Step 2: `app/services/xp_service.py` oluştur**

```python
"""
app/services/xp_service.py
==========================
award_xp(db, redis, user_id, action_type, ref_id=None)
    -> {"xp_gained": int, "new_badges": [{"key", "name", "description"}]}
"""
from datetime import date
from typing import Optional
from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import UserBadge, UserXPEvent, XPActionType
from app.models.models import AnalysisRequest, ForumComment, ForumThread, User
from workers.badge_definitions import BADGE_BY_KEY, BADGE_DEFS


XP_TABLE: dict[XPActionType, int] = {
    XPActionType.analysis_created:  8,
    XPActionType.thread_created:    15,
    XPActionType.comment_created:   5,
    XPActionType.vote_cast:         2,
    XPActionType.evidence_added:    25,
    XPActionType.helpful_received:  10,
    XPActionType.followed:          5,
    XPActionType.daily_login:       3,
}

DAILY_LIMITS: dict[XPActionType, int] = {
    XPActionType.analysis_created: 10,
    XPActionType.thread_created:   5,
    XPActionType.comment_created:  15,
    XPActionType.vote_cast:        20,
    XPActionType.evidence_added:   3,
}


# ── Seviye hesaplama ─────────────────────────────────────────────────────────

def xp_for_level(level: int) -> int:
    """level seviyesine ulaşmak için gereken kümülatif XP."""
    if level <= 1:
        return 0
    if level <= 10:
        return sum(100 * i for i in range(1, level))
    if level <= 20:
        return 4500 + (level - 10) * 500
    if level <= 30:
        return 9500 + (level - 20) * 1000
    return 19500 + (level - 30) * 1500


def level_from_xp(total_xp: int) -> int:
    lvl = 1
    while True:
        if total_xp < xp_for_level(lvl + 1):
            return lvl
        lvl += 1
        if lvl >= 200:
            return 200


# ── Badge koşul metriklerini topla ───────────────────────────────────────────

async def _collect_stats(db: AsyncSession, user_id: UUID) -> dict:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one()

    analysis_count = (await db.execute(
        select(func.count()).where(AnalysisRequest.user_id == user_id)
    )).scalar_one()

    thread_count = (await db.execute(
        select(func.count()).where(ForumThread.user_id == user_id)
    )).scalar_one()

    helpful_total = (await db.execute(
        select(func.coalesce(func.sum(ForumComment.helpful_count), 0))
        .where(ForumComment.user_id == user_id)
    )).scalar_one()

    evidence_count = (await db.execute(
        select(func.count()).where(
            UserXPEvent.user_id == user_id,
            UserXPEvent.action_type == XPActionType.evidence_added,
        )
    )).scalar_one()

    # Debunker: FAKE sonuçlu haber thread'inde kanıt yorumu (5 kez)
    debunker_row = await db.execute(text("""
        SELECT COUNT(DISTINCT e.id)
        FROM user_xp_events e
        JOIN forum_comments fc ON fc.id::text = e.ref_id
        JOIN forum_threads  ft ON ft.id = fc.thread_id
        JOIN articles        a ON a.id  = ft.article_id
        JOIN analysis_results ar ON ar.article_id = a.id
        WHERE e.user_id     = :uid
          AND e.action_type = 'evidence_added'
          AND ar.status     = 'FAKE'
    """), {"uid": str(user_id)})
    debunker_count = debunker_row.scalar_one() or 0

    # Kategori sayıları
    cat_rows = await db.execute(
        select(ForumThread.category, func.count().label("cnt"))
        .where(ForumThread.user_id == user_id)
        .group_by(ForumThread.category)
    )
    cat_map: dict[str, int] = {r.category: r.cnt for r in cat_rows.all()}

    CATEGORIES = ["haberler", "teknoloji", "kültür", "spor", "eğlence", "bilim", "ekonomi", "genel"]
    cat_all_active = sum(1 for c in CATEGORIES if cat_map.get(c, 0) >= 1)

    return {
        "analysis_count":  analysis_count,
        "thread_count":    thread_count,
        "helpful_total":   int(helpful_total),
        "evidence_count":  evidence_count,
        "follower_count":  user.follower_count,
        "current_streak":  user.current_streak,
        "level":           user.level or 1,
        "debunker_count":  debunker_count,
        "cat_haberler":    cat_map.get("haberler",   0),
        "cat_teknoloji":   cat_map.get("teknoloji",  0),
        "cat_kultur":      cat_map.get("kültür",     0),
        "cat_spor":        cat_map.get("spor",       0),
        "cat_eglence":     cat_map.get("eğlence",    0),
        "cat_bilim":       cat_map.get("bilim",      0),
        "cat_ekonomi":     cat_map.get("ekonomi",    0),
        "cat_genel":       cat_map.get("genel",      0),
        "cat_all":         cat_all_active,
    }


_BADGE_CONDITIONS: dict[str, callable] = {
    "level_1":        lambda s: True,
    "level_10":       lambda s: s["level"] >= 10,
    "level_20":       lambda s: s["level"] >= 20,
    "level_30":       lambda s: s["level"] >= 30,
    "level_40":       lambda s: s["level"] >= 40,
    "level_50":       lambda s: s["level"] >= 50,
    "first_analysis": lambda s: s["analysis_count"] >= 1,
    "analyst_100":    lambda s: s["analysis_count"] >= 100,
    "first_thread":   lambda s: s["thread_count"] >= 1,
    "prolific_50":    lambda s: s["thread_count"] >= 50,
    "evidence_10":    lambda s: s["evidence_count"] >= 10,
    "evidence_50":    lambda s: s["evidence_count"] >= 50,
    "social_10":      lambda s: s["follower_count"] >= 10,
    "social_100":     lambda s: s["follower_count"] >= 100,
    "helpful_50":     lambda s: s["helpful_total"] >= 50,
    "streak_7":       lambda s: s["current_streak"] >= 7,
    "streak_30":      lambda s: s["current_streak"] >= 30,
    "debunker":       lambda s: s["debunker_count"] >= 5,
    "cat_haberler":   lambda s: s["cat_haberler"]  >= 20,
    "cat_teknoloji":  lambda s: s["cat_teknoloji"] >= 20,
    "cat_kultur":     lambda s: s["cat_kultur"]    >= 20,
    "cat_spor":       lambda s: s["cat_spor"]      >= 20,
    "cat_eglence":    lambda s: s["cat_eglence"]   >= 20,
    "cat_bilim":      lambda s: s["cat_bilim"]     >= 20,
    "cat_ekonomi":    lambda s: s["cat_ekonomi"]   >= 20,
    "cat_genel":      lambda s: s["cat_genel"]     >= 20,
    "cat_all":        lambda s: s["cat_all"]       >= 8,
    # early_bird migration ile atanır, burada kontrol edilmez
}


async def check_and_unlock_badges(db: AsyncSession, user_id: UUID) -> list[str]:
    earned_keys = {
        r[0] for r in (await db.execute(
            select(UserBadge.badge_key).where(UserBadge.user_id == user_id)
        )).all()
    }
    candidates = set(_BADGE_CONDITIONS.keys()) - earned_keys
    if not candidates:
        return []

    stats = await _collect_stats(db, user_id)
    new_keys: list[str] = []
    for key in candidates:
        if _BADGE_CONDITIONS[key](stats):
            db.add(UserBadge(user_id=user_id, badge_key=key))
            new_keys.append(key)

    if new_keys:
        await db.flush()
    return new_keys


# ── Ana servis fonksiyonu ────────────────────────────────────────────────────

async def award_xp(
    db:          AsyncSession,
    redis:       Redis,
    user_id:     UUID,
    action_type: XPActionType,
    ref_id:      Optional[str] = None,
) -> dict:
    xp_amount = XP_TABLE.get(action_type, 0)
    if xp_amount == 0:
        return {"xp_gained": 0, "new_badges": []}

    # Günlük limit kontrolü
    daily_limit = DAILY_LIMITS.get(action_type)
    if daily_limit is not None:
        today = date.today().isoformat()
        redis_key = f"xp:daily:{user_id}:{action_type.value}:{today}"
        count = await redis.incr(redis_key)
        if count == 1:
            await redis.expire(redis_key, 86400)
        if count > daily_limit:
            return {"xp_gained": 0, "new_badges": []}

    # Günlük giriş — streak güncelleme
    if action_type == XPActionType.daily_login:
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one()
        today_date = date.today()
        if user.last_login_date == today_date:
            return {"xp_gained": 0, "new_badges": []}
        from datetime import timedelta
        yesterday = today_date - timedelta(days=1)
        user.current_streak = (user.current_streak + 1) if user.last_login_date == yesterday else 1
        user.last_login_date = today_date

    # XP event kaydet
    db.add(UserXPEvent(user_id=user_id, action_type=action_type, xp_amount=xp_amount, ref_id=ref_id))

    # total_xp güncelle (level nightly'de hesaplanır)
    user_row = (await db.execute(select(User).where(User.id == user_id))).scalar_one()
    user_row.total_xp = (user_row.total_xp or 0) + xp_amount

    await db.flush()

    new_keys  = await check_and_unlock_badges(db, user_id)
    new_badges = [
        {"key": k, "name": BADGE_BY_KEY[k].name, "description": BADGE_BY_KEY[k].description}
        for k in new_keys if k in BADGE_BY_KEY
    ]
    return {"xp_gained": xp_amount, "new_badges": new_badges}
```

- [ ] **Step 3: Commit**

```bash
git add app/services/__init__.py app/services/xp_service.py
git commit -m "feat(gamification): XP servisi — award_xp, check_and_unlock_badges"
```

---

### Task 5: Gamification API Endpoint'leri

**Files:**
- Create: `app/api/v1/endpoints/gamification.py`
- Modify: `app/main.py`

- [ ] **Step 1: `app/api/v1/endpoints/gamification.py` oluştur**

```python
"""
app/api/v1/endpoints/gamification.py
GET  /gamification/me/stats
GET  /gamification/users/{user_id}/stats
GET  /gamification/me/badges
GET  /gamification/badges
POST /gamification/me/showcase
GET  /gamification/users/{user_id}/showcase
GET  /gamification/leaderboard
"""
import json
from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis
from sqlalchemy import func, select, desc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.gamification import UserBadge, UserXPEvent, XPActionType
from app.models.models import User
from app.services.xp_service import xp_for_level, _collect_stats
from workers.badge_definitions import BADGE_BY_KEY, BADGE_DEFS, BADGE_PROGRESS_HINTS

router = APIRouter()

ACTION_LABELS = {
    "analysis_created":  "Analiz Oluşturuldu",
    "thread_created":    "Başlık Açıldı",
    "comment_created":   "Yorum Yapıldı",
    "vote_cast":         "Oy Kullanıldı",
    "evidence_added":    "Kanıt Eklendi",
    "helpful_received":  "Faydalı Bulundu",
    "followed":          "Yeni Takipçi",
    "daily_login":       "Günlük Giriş",
}


def _stats_dict(user: User) -> dict:
    total_xp  = user.total_xp or 0
    level     = user.level or 1
    cur_floor = xp_for_level(level)
    nxt_floor = xp_for_level(level + 1)
    span      = max(nxt_floor - cur_floor, 1)
    pct       = round((total_xp - cur_floor) / span * 100, 1)
    return {
        "total_xp":         total_xp,
        "level":            level,
        "xp_to_next_level": max(0, nxt_floor - total_xp),
        "xp_progress_pct":  min(pct, 100.0),
        "tier":             user.forum_trust_tier,
        "trust_score":      round(user.forum_trust_score, 2),
    }


def _badge_detail(b, earned_at=None, stats: dict = None) -> dict:
    hint = BADGE_PROGRESS_HINTS.get(b.key)
    progress = threshold = None
    if hint and stats:
        metric, thr = hint
        progress  = min(stats.get(metric, 0), thr)
        threshold = thr
    return {
        "key": b.key, "name": b.name, "description": b.description,
        "category": b.category, "icon": b.icon, "color": b.color,
        "earned_at": earned_at.isoformat() if earned_at else None,
        "progress": progress, "threshold": threshold,
    }


@router.get("/me/stats")
async def my_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stats = _stats_dict(current_user)
    events = (await db.execute(
        select(UserXPEvent)
        .where(UserXPEvent.user_id == current_user.id)
        .order_by(desc(UserXPEvent.created_at))
        .limit(10)
    )).scalars().all()
    stats["recent_events"] = [
        {"action": ACTION_LABELS.get(e.action_type.value, e.action_type.value),
         "xp_amount": e.xp_amount,
         "created_at": e.created_at.isoformat() if e.created_at else None}
        for e in events
    ]
    return stats


@router.get("/users/{user_id}/stats")
async def user_stats(user_id: UUID, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    return _stats_dict(user)


@router.get("/badges")
async def badge_catalog():
    return [{"key": b.key, "name": b.name, "description": b.description,
             "category": b.category, "icon": b.icon, "color": b.color}
            for b in BADGE_DEFS]


@router.get("/me/badges")
async def my_badges(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    earned_rows = (await db.execute(
        select(UserBadge).where(UserBadge.user_id == current_user.id)
    )).scalars().all()
    earned_map = {r.badge_key: r for r in earned_rows}

    stats = await _collect_stats(db, current_user.id)
    stats["level"] = current_user.level or 1

    earned, locked = [], []
    for b in BADGE_DEFS:
        if b.key in earned_map:
            row = earned_map[b.key]
            d = _badge_detail(b, row.earned_at, stats)
            d["is_showcased"]   = row.is_showcased
            d["showcase_order"] = row.showcase_order
            earned.append(d)
        elif b.key != "early_bird":
            locked.append(_badge_detail(b, None, stats))
    return {"earned": earned, "locked": locked}


@router.post("/me/showcase")
async def update_showcase(
    badge_keys:   List[str],
    current_user: User         = Depends(get_current_user),
    db: AsyncSession           = Depends(get_db),
):
    if len(badge_keys) > 3:
        raise HTTPException(400, "En fazla 3 rozet seçilebilir")
    earned = (await db.execute(
        select(UserBadge).where(UserBadge.user_id == current_user.id)
    )).scalars().all()
    earned_map = {r.badge_key: r for r in earned}
    for key in badge_keys:
        if key not in earned_map:
            raise HTTPException(400, f"'{key}' rozeti henüz kazanılmadı")
    for row in earned:
        row.is_showcased   = False
        row.showcase_order = None
    for order, key in enumerate(badge_keys):
        earned_map[key].is_showcased   = True
        earned_map[key].showcase_order = order
    await db.commit()
    return {"showcased": badge_keys}


@router.get("/users/{user_id}/showcase")
async def user_showcase(user_id: UUID, db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(UserBadge)
        .where(UserBadge.user_id == user_id, UserBadge.is_showcased == True)
        .order_by(UserBadge.showcase_order)
    )).scalars().all()
    return [
        {"key": b.badge_key, "name": BADGE_BY_KEY[b.badge_key].name if b.badge_key in BADGE_BY_KEY else b.badge_key,
         "icon": BADGE_BY_KEY[b.badge_key].icon if b.badge_key in BADGE_BY_KEY else "Award",
         "color": BADGE_BY_KEY[b.badge_key].color if b.badge_key in BADGE_BY_KEY else "gray",
         "showcase_order": b.showcase_order}
        for b in rows if b.badge_key in BADGE_BY_KEY
    ]


@router.get("/leaderboard")
async def leaderboard(
    period: str      = Query("alltime", pattern="^(weekly|monthly|alltime)$"),
    type:   str      = Query("xp",      pattern="^(xp|analyses|threads|evidence)$"),
    db:     AsyncSession = Depends(get_db),
    redis:  Redis        = Depends(get_redis),
):
    cache_key = f"leaderboard:{period}:{type}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    now   = datetime.now(timezone.utc)
    since = None
    if period == "weekly":
        since = now - timedelta(days=7)
    elif period == "monthly":
        since = now - timedelta(days=30)

    if type == "xp" and not since:
        rows = await db.execute(text(
            "SELECT id, username, avatar_url, level, total_xp AS value "
            "FROM users ORDER BY total_xp DESC LIMIT 50"
        ))
    elif type == "xp":
        rows = await db.execute(text("""
            SELECT u.id, u.username, u.avatar_url, u.level,
                   COALESCE(SUM(e.xp_amount), 0) AS value
            FROM users u
            LEFT JOIN user_xp_events e ON e.user_id = u.id AND e.created_at >= :since
            GROUP BY u.id, u.username, u.avatar_url, u.level
            ORDER BY value DESC LIMIT 50
        """), {"since": since})
    elif type == "analyses":
        rows = await db.execute(text("""
            SELECT u.id, u.username, u.avatar_url, u.level, COUNT(ar.id) AS value
            FROM users u
            LEFT JOIN analysis_requests ar ON ar.user_id = u.id
                AND (:since IS NULL OR ar.created_at >= :since)
            GROUP BY u.id, u.username, u.avatar_url, u.level
            ORDER BY value DESC LIMIT 50
        """), {"since": since})
    elif type == "threads":
        rows = await db.execute(text("""
            SELECT u.id, u.username, u.avatar_url, u.level, COUNT(t.id) AS value
            FROM users u
            LEFT JOIN forum_threads t ON t.user_id = u.id
                AND (:since IS NULL OR t.created_at >= :since)
            GROUP BY u.id, u.username, u.avatar_url, u.level
            ORDER BY value DESC LIMIT 50
        """), {"since": since})
    else:  # evidence
        rows = await db.execute(text("""
            SELECT u.id, u.username, u.avatar_url, u.level, COUNT(e.id) AS value
            FROM users u
            LEFT JOIN user_xp_events e ON e.user_id = u.id
                AND e.action_type = 'evidence_added'
                AND (:since IS NULL OR e.created_at >= :since)
            GROUP BY u.id, u.username, u.avatar_url, u.level
            ORDER BY value DESC LIMIT 50
        """), {"since": since})

    entries = []
    for rank, row in enumerate(rows.mappings().all(), start=1):
        showcase = (await db.execute(
            select(UserBadge)
            .where(UserBadge.user_id == row["id"], UserBadge.is_showcased == True)
            .order_by(UserBadge.showcase_order).limit(3)
        )).scalars().all()
        entries.append({
            "rank": rank, "user_id": str(row["id"]),
            "username": row["username"], "avatar_url": row["avatar_url"],
            "level": row["level"] or 1, "value": int(row["value"]),
            "showcase_badges": [
                {"key": b.badge_key,
                 "name":  BADGE_BY_KEY[b.badge_key].name  if b.badge_key in BADGE_BY_KEY else b.badge_key,
                 "icon":  BADGE_BY_KEY[b.badge_key].icon  if b.badge_key in BADGE_BY_KEY else "Award",
                 "color": BADGE_BY_KEY[b.badge_key].color if b.badge_key in BADGE_BY_KEY else "gray"}
                for b in showcase
            ],
        })

    result = {"period": period, "type": type, "entries": entries}
    await redis.setex(cache_key, 300, json.dumps(result, default=str))
    return result
```

- [ ] **Step 2: `app/main.py`'e gamification router ekle**

`app/main.py`'de mevcut import satırını bul (satır 11):
```python
from app.api.v1.endpoints import ab as ab_endpoint, admin, admin_logs, analysis, articles, auth, forum, insights, interactions, market, messages, news, notifications, recommendations, sources, users, ws as ws_endpoint
```

`gamification,` ekleyerek şu hale getir:
```python
from app.api.v1.endpoints import (
    ab as ab_endpoint, admin, admin_logs, analysis, articles, auth,
    forum, gamification, insights, interactions, market, messages,
    news, notifications, recommendations, sources, users, ws as ws_endpoint,
)
```

Ardından diğer `app.include_router(...)` satırlarının yanına (örn. `users.router` include'unun hemen altına) ekle:
```python
app.include_router(gamification.router, prefix="/api/v1/gamification", tags=["Gamification"])
```

- [ ] **Step 3: Test et**

Uygulamayı başlat: `uvicorn app.main:app --reload`  
`/docs` → `GET /api/v1/gamification/badges` çağır (token gereksiz). 28 rozet tanımı dönmeli.  
Token ile `GET /api/v1/gamification/me/stats` → `{"total_xp": 0, "level": 1, ...}` dönmeli.

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/endpoints/gamification.py app/main.py
git commit -m "feat(gamification): gamification API endpoint'leri ve router kaydı"
```

---

### Task 6: Backend Entegrasyonu — Analysis

**Files:**
- Modify: `app/api/v1/endpoints/analysis.py`

- [ ] **Step 1: Import ekle**

`analysis.py` import bölümüne:
```python
from app.models.gamification import XPActionType
from app.services.xp_service import award_xp
from app.db.redis import get_redis
```

- [ ] **Step 2: AnalysisRequest oluşturan endpoint'e XP ekle**

`analysis.py`'de `AnalysisRequest(...)` objesinin `db.add(...)` ve `await db.commit()` satırlarını bul.  
Bu satırlar genellikle `@router.post("/analyze"` veya `@router.post("/analyze/text"` endpoint'inde bulunur.

`await db.commit()` satırından **hemen sonra** ekle:
```python
        if current_user:
            redis = await get_redis()
            await award_xp(db, redis, current_user.id, XPActionType.analysis_created, str(analysis_request.id))
            await db.commit()
```

`current_user` parametresi endpoint'te `Optional[User] = Depends(get_optional_user)` olarak gelmektedir — kayıtsız kullanıcılar için XP verilmez.

- [ ] **Step 3: Commit**

```bash
git add app/api/v1/endpoints/analysis.py
git commit -m "feat(gamification): analiz endpoint'ine XP entegrasyonu"
```

---

### Task 7: Backend Entegrasyonu — Forum

**Files:**
- Modify: `app/api/v1/endpoints/forum.py`

- [ ] **Step 1: Import ekle**

`forum.py` import bölümüne:
```python
from app.models.gamification import XPActionType
from app.services.xp_service import award_xp
from app.db.redis import get_redis
```

- [ ] **Step 2: `create_thread` (satır ~198) — XP ekle**

`create_thread` endpoint'inde `await db.commit()` + `await db.refresh(thread)` satırlarından sonra:
```python
    _redis = await get_redis()
    await award_xp(db, _redis, current_user.id, XPActionType.thread_created, str(thread.id))
    await db.commit()
```

- [ ] **Step 3: `add_comment` (satır ~653) — XP ekle**

`add_comment` endpoint'indeki son `await db.commit()` satırından (mention bildirimleri sonrası) sonra:
```python
    _redis = await get_redis()
    _action = XPActionType.evidence_added if body.evidence_urls else XPActionType.comment_created
    await award_xp(db, _redis, current_user.id, _action, str(comment.id))
    await db.commit()
```

- [ ] **Step 4: `vote_thread` (satır ~554) — XP ekle**

`vote_thread` endpoint'inde `await db.commit()` sonrasına:
```python
    if current_vote is not None:
        _redis = await get_redis()
        await award_xp(db, _redis, current_user.id, XPActionType.vote_cast, str(thread_id))
        await db.commit()
```

- [ ] **Step 5: `vote_comment` endpoint'ine helpful_received XP ekle**

`POST /comments/{comment_id}/vote` endpoint'ini bul. Yorum sahibine XP ver. `await db.commit()` sonrasına:
```python
    _redis = await get_redis()
    await award_xp(db, _redis, comment.user_id, XPActionType.helpful_received, str(comment.id))
    await db.commit()
```

- [ ] **Step 6: Commit**

```bash
git add app/api/v1/endpoints/forum.py
git commit -m "feat(gamification): forum thread/yorum/oy/kanıt XP entegrasyonu"
```

---

### Task 8: Backend Entegrasyonu — Users & Auth

**Files:**
- Modify: `app/api/v1/endpoints/users.py`
- Modify: `app/api/v1/endpoints/auth.py`

- [ ] **Step 1: `users.py` — follow XP**

`users.py` import bölümüne:
```python
from app.models.gamification import XPActionType
from app.services.xp_service import award_xp
from app.db.redis import get_redis as _get_redis
```

`POST /users/{user_id}/follow` endpoint'inde yeni takip eklendiğinde (`await db.commit()` sonrasına):
```python
        _redis = await _get_redis()
        await award_xp(db, _redis, user_id, XPActionType.followed)
        await db.commit()
```

- [ ] **Step 2: `auth.py` — daily_login XP**

`auth.py` import bölümüne:
```python
from app.models.gamification import XPActionType as _XPAction
from app.services.xp_service import award_xp as _award_xp
from app.db.redis import get_redis as _get_redis
```

`/login` endpoint'inde token oluşturulduktan ve `last_login_at` güncellendikten sonra, `return` ifadesinden önce:
```python
    try:
        _redis = await _get_redis()
        await _award_xp(db, _redis, user.id, _XPAction.daily_login)
        await db.commit()
    except Exception:
        pass  # XP hatası login'i bloklamamalı
```

Aynı bloğu Google auth endpoint'ine de ekle (`/auth/google`).

- [ ] **Step 3: Commit**

```bash
git add app/api/v1/endpoints/users.py app/api/v1/endpoints/auth.py
git commit -m "feat(gamification): follow ve daily_login XP entegrasyonu"
```

---

### Task 9: Nightly Task — Level Güncelleme

**Files:**
- Modify: `workers/trust_tasks.py`

- [ ] **Step 1: `_xp_to_level` yardımcı fonksiyonunu ekle**

`trust_tasks.py`'de `_score_to_tier` fonksiyonundan önce:

```python
def _xp_to_level(total_xp: int) -> int:
    """total_xp'den mevcut seviyeyi hesaplar."""
    def xp_for(lvl: int) -> int:
        if lvl <= 1:  return 0
        if lvl <= 10: return sum(100 * i for i in range(1, lvl))
        if lvl <= 20: return 4500 + (lvl - 10) * 500
        if lvl <= 30: return 9500 + (lvl - 20) * 1000
        return 19500 + (lvl - 30) * 1500

    lvl = 1
    while total_xp >= xp_for(lvl + 1):
        lvl += 1
        if lvl >= 200: return 200
    return lvl
```

- [ ] **Step 2: UPDATE sorgusuna level ekle**

`trust_tasks.py`'deki kullanıcı güncelleme sorgusunu bul. Bu sorgu `UPDATE users SET forum_trust_score = ..., forum_trust_tier = ...` şeklindedir. Sorguya `level = :level` ekle ve `params` dict'ine `"level": _xp_to_level(row["total_xp"] or 0)` ekle.

Mevcut UPDATE parametrelerine `total_xp` sorguda yoksa SELECT sorgusuna da `u.total_xp` ekle:

```sql
-- SELECT sorgusuna ekle:
u.total_xp AS total_xp,
```

UPDATE sorgusuna ekle:
```sql
SET forum_trust_score    = :score,
    forum_trust_tier     = :tier,
    forum_trust_category = :cat,
    level                = :level   -- YENİ
```

Params'a:
```python
"level": _xp_to_level(int(row.get("total_xp", 0)))
```

- [ ] **Step 3: Commit**

```bash
git add workers/trust_tasks.py
git commit -m "feat(gamification): nightly task'a XP tabanlı level güncelleme eklendi"
```

---

### Task 10: Frontend — Gamification Service

**Files:**
- Create: `frontend/src/services/gamification.service.js`

- [ ] **Step 1: Service dosyasını oluştur**

```javascript
import axiosInstance from '../api/axios';

const GamificationService = {
    getMyStats: () =>
        axiosInstance.get('/gamification/me/stats').then(r => r.data),

    getUserStats: (userId) =>
        axiosInstance.get(`/gamification/users/${userId}/stats`).then(r => r.data),

    getMyBadges: () =>
        axiosInstance.get('/gamification/me/badges').then(r => r.data),

    getBadgeCatalog: () =>
        axiosInstance.get('/gamification/badges').then(r => r.data),

    getUserShowcase: (userId) =>
        axiosInstance.get(`/gamification/users/${userId}/showcase`).then(r => r.data),

    updateShowcase: (badgeKeys) =>
        axiosInstance.post('/gamification/me/showcase', badgeKeys).then(r => r.data),

    getLeaderboard: (period = 'alltime', type = 'xp') =>
        axiosInstance.get('/gamification/leaderboard', { params: { period, type } }).then(r => r.data),
};

export default GamificationService;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/gamification.service.js
git commit -m "feat(gamification): frontend gamification API service"
```

---

### Task 11: Frontend — XPToast Bileşeni

**Files:**
- Create: `frontend/src/components/common/XPToast.jsx`
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Step 1: `XPToast.jsx` oluştur**

```jsx
import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

let _setter = null;

const XPToast = () => {
    const [toast, setToast] = useState(null);
    _setter = setToast;

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    if (!toast) return null;
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
            {toast.xpGained > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 border font-mono text-sm animate-fade-up"
                     style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)' }}>
                    <Star className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-black">+{toast.xpGained} XP</span>
                    <span className="opacity-60">· {toast.label}</span>
                </div>
            )}
            {(toast.newBadges || []).map(b => (
                <div key={b.key}
                     className="flex items-center gap-2 px-4 py-2 border font-mono text-sm animate-fade-up"
                     style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-accent-amber)', color: 'var(--color-accent-amber)' }}>
                    <span>🏅</span>
                    <span className="font-black">Yeni Rozet:</span>
                    <span>{b.name}</span>
                </div>
            ))}
        </div>
    );
};

XPToast.show = ({ xpGained = 0, label = '', newBadges = [] }) => {
    if (_setter && (xpGained > 0 || newBadges.length > 0)) {
        _setter({ xpGained, label, newBadges });
    }
};

export default XPToast;
```

- [ ] **Step 2: `Layout.jsx`'e XPToast ekle**

`Layout.jsx` import bölümüne:
```jsx
import XPToast from './common/XPToast';
```

`return` içinde kapanış `</div>` veya `</BrowserRouter>` öncesine:
```jsx
<XPToast />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/common/XPToast.jsx frontend/src/components/Layout.jsx
git commit -m "feat(gamification): XPToast bileşeni — aksiyon sonrası XP + rozet bildirimi"
```

---

### Task 12: Frontend — BadgeShowcaseModal

**Files:**
- Create: `frontend/src/components/common/BadgeShowcaseModal.jsx`

- [ ] **Step 1: `BadgeShowcaseModal.jsx` oluştur**

```jsx
import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import GamificationService from '../../services/gamification.service';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const Corner = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
);

export default function BadgeShowcaseModal({ onClose, onSave }) {
    const [badges,   setBadges]   = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(false);

    useEffect(() => {
        GamificationService.getMyBadges()
            .then(data => {
                setBadges(data.earned || []);
                const current = (data.earned || [])
                    .filter(b => b.is_showcased)
                    .sort((a, b) => (a.showcase_order ?? 99) - (b.showcase_order ?? 99))
                    .map(b => b.key);
                setSelected(current);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const toggle = (key) => {
        if (selected.includes(key)) {
            setSelected(s => s.filter(k => k !== key));
        } else if (selected.length < 3) {
            setSelected(s => [...s, key]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await GamificationService.updateShowcase(selected);
            onSave?.(selected);
            onClose();
        } catch { } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.80)' }} onClick={onClose}>
            <div className="relative border w-96 max-h-[80vh] flex flex-col"
                 style={S} onClick={e => e.stopPropagation()}>
                <Corner />
                <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                    <span className="font-mono text-xs tracking-widest uppercase"
                          style={{ color: 'var(--color-brand-primary)' }}>
                        // ROZET VİTRİNİ — {selected.length}/3
                    </span>
                    <button onClick={onClose} className="transition-opacity hover:opacity-60"
                            style={{ color: 'var(--color-text-muted)' }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                    {loading
                        ? <p className="p-4 font-mono text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</p>
                        : badges.length === 0
                            ? <p className="p-4 font-mono text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>// henüz rozet yok</p>
                            : (
                                <div className="grid grid-cols-2 gap-1.5">
                                    {badges.map(b => {
                                        const isSelected = selected.includes(b.key);
                                        return (
                                            <button key={b.key} onClick={() => toggle(b.key)}
                                                    className="relative flex items-center gap-2 px-3 py-2.5 border text-left transition-colors"
                                                    style={{ borderColor: isSelected ? b.color : 'var(--color-terminal-border-raw)', background: isSelected ? `${b.color}15` : 'transparent' }}>
                                                {isSelected && (
                                                    <span className="absolute top-1 right-1">
                                                        <Check className="w-3 h-3" style={{ color: b.color }} />
                                                    </span>
                                                )}
                                                <div className="shrink-0 w-7 h-7 flex items-center justify-center border"
                                                     style={{ borderColor: b.color, color: b.color }}>
                                                    <span className="font-mono text-xs font-black">{b.name[0]}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-mono text-xs font-bold truncate"
                                                       style={{ color: isSelected ? b.color : 'var(--color-text-primary)' }}>{b.name}</p>
                                                    <p className="font-mono text-[9px] truncate"
                                                       style={{ color: 'var(--color-text-muted)' }}>{b.category}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )
                    }
                </div>
                <div className="px-4 py-3 border-t flex justify-end gap-2" style={BD}>
                    <button onClick={onClose}
                            className="px-4 py-1.5 font-mono text-xs border transition-colors hover:bg-white/5"
                            style={BD}>İptal</button>
                    <button onClick={handleSave} disabled={saving}
                            className="px-4 py-1.5 font-mono text-xs border transition-colors"
                            style={{ background: 'var(--color-brand-primary)', color: '#070f12', borderColor: 'var(--color-brand-primary)', opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/common/BadgeShowcaseModal.jsx
git commit -m "feat(gamification): BadgeShowcaseModal — max 3 rozet seçim modal'ı"
```

---

### Task 13: Frontend — ProfileOverview Güncellemesi

**Files:**
- Modify: `frontend/src/features/profile/ProfileOverview.jsx`

- [ ] **Step 1: Import'ları güncelle**

Dosyanın başına ekle:
```jsx
import GamificationService from '../../services/gamification.service';
import BadgeShowcaseModal from '../../components/common/BadgeShowcaseModal';
```

- [ ] **Step 2: State ekle**

Component state bölümüne:
```jsx
const [showcase,       setShowcase]       = useState([]);
const [xpStats,        setXpStats]        = useState(null);
const [showBadgeModal, setShowBadgeModal] = useState(false);
```

- [ ] **Step 3: Data fetch ekle**

`useEffect` içine (mevcut API çağrılarına paralel):
```jsx
GamificationService.getMyStats()
    .then(setXpStats)
    .catch(() => {});
GamificationService.getMyBadges()
    .then(data => {
        const s = (data.earned || [])
            .filter(b => b.is_showcased)
            .sort((a, b) => (a.showcase_order ?? 99) - (b.showcase_order ?? 99));
        setShowcase(s);
    })
    .catch(() => {});
```

- [ ] **Step 4: Hardcoded `BADGES` array'ini ve render bloğunu kaldır, yerine yeni UI koy**

Dosyadan `const BADGES = [...]` sabitini ve bu array'i render eden tüm JSX bloğunu sil.

Yerine, mevcut analiz istatistikleri bloğunun hemen altına ekle:

```jsx
{/* XP & Seviye */}
{xpStats && (
    <div className="relative border mb-4 p-4" style={S}>
        <Corner />
        <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: 'var(--color-brand-primary)' }}>
                // LEVEL {xpStats.level}
            </span>
            <span className="font-mono text-[10px]"
                  style={{ color: 'var(--color-text-muted)' }}>
                {xpStats.total_xp} XP
            </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden"
             style={{ background: 'var(--color-terminal-border-raw)' }}>
            <div className="h-full rounded-full transition-all"
                 style={{ width: `${xpStats.xp_progress_pct}%`, background: 'var(--color-brand-primary)' }} />
        </div>
        <p className="font-mono text-[10px] mt-1"
           style={{ color: 'var(--color-text-muted)' }}>
            Sonraki seviye: {xpStats.xp_to_next_level} XP kaldı
        </p>
    </div>
)}

{/* Rozet Vitrini */}
<div className="relative border mb-4" style={S}>
    <Corner />
    <div className="px-4 py-2 border-b flex items-center justify-between" style={BD}>
        <span className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--color-brand-primary)' }}>// ROZET VİTRİNİ</span>
        <button onClick={() => setShowBadgeModal(true)}
                className="font-mono text-[9px] px-2 py-0.5 border transition-colors hover:bg-white/5"
                style={{ color: 'var(--color-accent-blue)', borderColor: 'var(--color-accent-blue)' }}>
            Düzenle
        </button>
    </div>
    <div className="flex gap-3 px-4 py-3">
        {[0, 1, 2].map(i => {
            const badge = showcase[i];
            if (!badge) return (
                <div key={i}
                     className="flex-1 h-16 border flex items-center justify-center"
                     style={{ borderColor: 'var(--color-terminal-border-raw)', borderStyle: 'dashed' }}>
                    <span className="font-mono text-[10px]"
                          style={{ color: 'var(--color-text-muted)' }}>boş</span>
                </div>
            );
            return (
                <div key={badge.key}
                     className="flex-1 h-16 border flex flex-col items-center justify-center gap-1"
                     style={{ borderColor: badge.color, background: `${badge.color}10` }}>
                    <span className="font-mono text-xs font-black" style={{ color: badge.color }}>
                        {badge.name[0]}
                    </span>
                    <span className="font-mono text-[9px] text-center px-1 leading-tight"
                          style={{ color: badge.color }}>{badge.name}</span>
                </div>
            );
        })}
    </div>
</div>

{showBadgeModal && (
    <BadgeShowcaseModal
        onClose={() => setShowBadgeModal(false)}
        onSave={() => {
            GamificationService.getMyBadges().then(data => {
                const s = (data.earned || [])
                    .filter(b => b.is_showcased)
                    .sort((a, b) => (a.showcase_order ?? 99) - (b.showcase_order ?? 99));
                setShowcase(s);
            });
        }}
    />
)}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/profile/ProfileOverview.jsx
git commit -m "feat(gamification): ProfileOverview — XP bar + rozet vitrini, hardcoded badges kaldırıldı"
```

---

### Task 14: Frontend — UserProfile Güncellemesi

**Files:**
- Modify: `frontend/src/pages/UserProfile.jsx`

- [ ] **Step 1: Import ekle**

```jsx
import GamificationService from '../services/gamification.service';
```

- [ ] **Step 2: State ekle**

```jsx
const [showcase, setShowcase] = useState([]);
const [xpStats,  setXpStats]  = useState(null);
```

- [ ] **Step 3: Effect'e fetch ekle**

Profil yükleme `useEffect` içindeki API çağrılarına paralel:
```jsx
GamificationService.getUserShowcase(userId)
    .then(setShowcase)
    .catch(() => {});
GamificationService.getUserStats(userId)
    .then(setXpStats)
    .catch(() => {});
```

- [ ] **Step 4: `getBadges` fonksiyonunu (satır ~139-164) ve çağrısını sil**

`getBadges` fonksiyon tanımını ve `getBadges(profile, stats, isOwn)` çağrısını içeren tüm render bloğunu kaldır.

Yerine avatar + isim bölümünün altına ekle:

```jsx
{/* XP Bar */}
{xpStats && (
    <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-brand-primary)' }}>
                SEVİYE {xpStats.level}
            </span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {xpStats.total_xp} XP
            </span>
        </div>
        <div className="w-full h-1 rounded-full overflow-hidden"
             style={{ background: 'var(--color-terminal-border-raw)' }}>
            <div style={{ width: `${xpStats.xp_progress_pct}%`, background: 'var(--color-brand-primary)' }}
                 className="h-full rounded-full" />
        </div>
    </div>
)}

{/* Rozet Vitrini */}
{showcase.length > 0 && (
    <div className="flex items-center gap-2 px-5 pb-4 flex-wrap">
        {showcase.map(b => (
            <div key={b.key}
                 className="flex items-center gap-1.5 px-2.5 py-1 border"
                 style={{ borderColor: b.color, color: b.color }}>
                <span className="font-mono text-[10px] font-black">{b.name[0]}</span>
                <span className="font-mono text-[10px]">{b.name}</span>
            </div>
        ))}
    </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/UserProfile.jsx
git commit -m "feat(gamification): UserProfile — getBadges kaldırıldı, XP bar + API showcase eklendi"
```

---

### Task 15: Frontend — Badges Sayfası

**Files:**
- Create: `frontend/src/pages/Badges.jsx`

- [ ] **Step 1: `Badges.jsx` oluştur**

```jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, Trophy, BarChart2 } from 'lucide-react';
import GamificationService from '../services/gamification.service';
import { useAuth } from '../contexts/AuthContext';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const Corner = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
);

const LEVEL_BADGE_KEYS = ['level_1','level_10','level_20','level_30','level_40','level_50'];

function BadgeCard({ badge, earned }) {
    const progress  = !earned ? (badge.progress  ?? 0) : null;
    const threshold = !earned ? (badge.threshold ?? 1) : null;
    const pct = threshold ? Math.min((progress / threshold) * 100, 100) : 0;
    return (
        <div className="relative border p-4 flex flex-col gap-2"
             style={{ borderColor: earned ? badge.color : 'var(--color-terminal-border-raw)', background: earned ? `${badge.color}08` : 'transparent' }}>
            {earned && <Corner />}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border shrink-0"
                     style={{ borderColor: earned ? badge.color : 'var(--color-terminal-border-raw)', color: earned ? badge.color : 'var(--color-text-muted)' }}>
                    <span className="font-mono text-lg font-black">{badge.name[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold"
                       style={{ color: earned ? badge.color : 'var(--color-text-muted)' }}>{badge.name}</p>
                    <p className="font-mono text-[10px]"
                       style={{ color: 'var(--color-text-muted)' }}>{badge.description}</p>
                </div>
                {earned && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 shrink-0"
                          style={{ background: `${badge.color}20`, color: badge.color }}>KAZANILDI</span>
                )}
            </div>
            {!earned && threshold && (
                <div>
                    <div className="w-full h-1 rounded-full overflow-hidden"
                         style={{ background: 'var(--color-terminal-border-raw)' }}>
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${pct}%`, background: 'var(--color-brand-primary)' }} />
                    </div>
                    <p className="font-mono text-[9px] mt-0.5"
                       style={{ color: 'var(--color-text-muted)' }}>{progress}/{threshold}</p>
                </div>
            )}
        </div>
    );
}

function LeaderboardTab() {
    const [period,  setPeriod]  = useState('alltime');
    const [type,    setType]    = useState('xp');
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        setLoading(true);
        GamificationService.getLeaderboard(period, type)
            .then(setData).catch(() => {}).finally(() => setLoading(false));
    }, [period, type]);

    const TYPE_LABELS   = { xp: 'XP', analyses: 'Analiz', threads: 'Başlık', evidence: 'Kanıt' };
    const PERIOD_LABELS = { alltime: 'Tüm Zaman', monthly: 'Bu Ay', weekly: 'Bu Hafta' };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(PERIOD_LABELS).map(([v, l]) => (
                    <button key={v} onClick={() => setPeriod(v)}
                            className="font-mono text-xs px-3 py-1 border transition-colors"
                            style={{ borderColor: period === v ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)', color: period === v ? 'var(--color-brand-primary)' : 'var(--color-text-muted)', background: period === v ? 'rgba(26,158,79,0.10)' : 'transparent' }}>
                        {l}
                    </button>
                ))}
                <span className="self-center" style={{ color: 'var(--color-terminal-border-raw)' }}>|</span>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <button key={v} onClick={() => setType(v)}
                            className="font-mono text-xs px-3 py-1 border transition-colors"
                            style={{ borderColor: type === v ? 'var(--color-accent-blue)' : 'var(--color-terminal-border-raw)', color: type === v ? 'var(--color-accent-blue)' : 'var(--color-text-muted)', background: type === v ? 'rgba(59,130,246,0.10)' : 'transparent' }}>
                        {l}
                    </button>
                ))}
            </div>
            {loading && <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</p>}
            {!loading && data && (
                <div className="flex flex-col gap-1">
                    {data.entries.map(entry => {
                        const isMe = user && entry.user_id === user.id;
                        return (
                            <Link key={entry.user_id} to={`/users/${entry.user_id}`}
                                  className="flex items-center gap-3 px-4 py-3 border transition-colors hover:bg-white/3"
                                  style={{ borderColor: isMe ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)', background: isMe ? 'rgba(26,158,79,0.05)' : 'transparent' }}>
                                <span className="font-mono text-xs w-6 shrink-0 text-right"
                                      style={{ color: entry.rank <= 3 ? 'var(--color-accent-amber)' : 'var(--color-text-muted)' }}>
                                    {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : `#${entry.rank}`}
                                </span>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-sm"
                                     style={{ background: 'rgba(26,158,79,0.15)', color: 'var(--color-brand-primary)' }}>
                                    {entry.username[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-sm font-bold"
                                       style={{ color: isMe ? 'var(--color-brand-primary)' : 'var(--color-text-primary)' }}>
                                        {entry.username}{isMe && <span className="ml-2 text-[9px] opacity-60">(sen)</span>}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Lv.{entry.level}</span>
                                        {entry.showcase_badges.map(b => (
                                            <span key={b.key} className="font-mono text-[9px] px-1.5 py-0.5 border"
                                                  style={{ borderColor: b.color, color: b.color }}>{b.name}</span>
                                        ))}
                                    </div>
                                </div>
                                <span className="font-mono text-sm font-black shrink-0"
                                      style={{ color: 'var(--color-brand-primary)' }}>
                                    {entry.value.toLocaleString('tr-TR')} {TYPE_LABELS[type]}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function Badges() {
    const [tab,     setTab]     = useState('levels');
    const [badges,  setBadges]  = useState(null);
    const [loading, setLoading] = useState(true);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) { setLoading(false); return; }
        GamificationService.getMyBadges()
            .then(setBadges).catch(() => {}).finally(() => setLoading(false));
    }, [isAuthenticated]);

    const earnedKeys = new Set((badges?.earned || []).map(b => b.key));
    const allBadges  = [...(badges?.earned || []), ...(badges?.locked || [])];
    const byKey      = Object.fromEntries(allBadges.map(b => [b.key, b]));

    const levelBadges    = LEVEL_BADGE_KEYS.map(k => byKey[k]).filter(Boolean);
    const activityEarned = (badges?.earned  || []).filter(b => !LEVEL_BADGE_KEYS.includes(b.key) && b.category !== 'category');
    const activityLocked = (badges?.locked  || []).filter(b => !LEVEL_BADGE_KEYS.includes(b.key) && b.category !== 'category');
    const catEarned      = (badges?.earned  || []).filter(b => b.category === 'category');
    const catLocked      = (badges?.locked  || []).filter(b => b.category === 'category');

    const TABS = [
        { key: 'levels',       label: '// SEVİYE',    Icon: Award     },
        { key: 'achievements', label: '// BAŞARIMLAR', Icon: Trophy    },
        { key: 'leaderboard',  label: '// SIRA',       Icon: BarChart2 },
    ];

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="relative border mb-6" style={S}>
                <Corner />
                <div className="px-5 py-4">
                    <h1 className="font-mono text-lg font-black tracking-wider"
                        style={{ color: 'var(--color-brand-primary)' }}>// ROZETLER & BAŞARIMLAR</h1>
                    <p className="font-mono text-xs mt-1"
                       style={{ color: 'var(--color-text-muted)' }}>
                        Aktivitelerini rozetlere dönüştür, sıralamada yerini al
                    </p>
                </div>
            </div>

            <div className="flex border-b mb-6" style={BD}>
                {TABS.map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                            className="px-4 py-2.5 font-mono text-xs border-b-2 transition-colors flex items-center gap-1.5"
                            style={{ borderColor: tab === key ? 'var(--color-brand-primary)' : 'transparent', color: tab === key ? 'var(--color-brand-primary)' : 'var(--color-text-muted)', marginBottom: '-1px' }}>
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {!isAuthenticated && tab !== 'leaderboard' && (
                <div className="relative border p-8 text-center" style={S}>
                    <Corner />
                    <p className="font-mono text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
                        Rozetlerini görmek için giriş yap
                    </p>
                    <Link to="/login" className="font-mono text-xs px-4 py-2 border transition-colors hover:bg-white/5"
                          style={{ color: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)' }}>
                        Giriş Yap
                    </Link>
                </div>
            )}

            {loading && <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</p>}

            {!loading && tab === 'levels' && isAuthenticated && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {levelBadges.map(b => <BadgeCard key={b.key} badge={b} earned={earnedKeys.has(b.key)} />)}
                </div>
            )}

            {!loading && tab === 'achievements' && isAuthenticated && (
                <div className="flex flex-col gap-6">
                    {(activityEarned.length + activityLocked.length) > 0 && (
                        <section>
                            <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
                               style={{ color: 'var(--color-text-muted)' }}>Aktivite & Kilometre Taşları</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...activityEarned, ...activityLocked].map(b => <BadgeCard key={b.key} badge={b} earned={earnedKeys.has(b.key)} />)}
                            </div>
                        </section>
                    )}
                    {(catEarned.length + catLocked.length) > 0 && (
                        <section>
                            <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
                               style={{ color: 'var(--color-text-muted)' }}>Kategori Uzmanlığı</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...catEarned, ...catLocked].map(b => <BadgeCard key={b.key} badge={b} earned={earnedKeys.has(b.key)} />)}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {tab === 'leaderboard' && <LeaderboardTab />}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Badges.jsx
git commit -m "feat(gamification): /badges sayfası — seviyeler, başarımlar, sıralama"
```

---

### Task 16: Frontend — Navbar Level Badge & Route

**Files:**
- Modify: `frontend/src/components/common/Navbar.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: `Navbar.jsx`'e level göstergesi ekle**

Import satırına `Award` ekle:
```jsx
import { Moon, Sun, Menu, X, ChevronDown, User, Settings, Shield, BarChart2, LogOut, Users, Search, MessageSquare, Award } from 'lucide-react';
```

`useAuth` kullanılan bölüme state ve effect ekle:
```jsx
const [userLevel, setUserLevel] = React.useState(null);

React.useEffect(() => {
    if (!isAuthenticated) { setUserLevel(null); return; }
    axiosInstance.get('/gamification/me/stats')
        .then(r => setUserLevel(r.data.level))
        .catch(() => {});
}, [isAuthenticated]);
```

Kullanıcı adının gösterildiği yerde (kullanıcı dropdown tetikleyicisi içinde), username span'ından önce:
```jsx
{userLevel && (
    <span className="font-mono text-[9px] px-1.5 py-0.5 border shrink-0"
          style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)' }}>
        Lv.{userLevel}
    </span>
)}
```

Dropdown menüsünde (Settings link'inden önce) `/badges` linki ekle:
```jsx
<Link to="/badges"
      className="flex items-center gap-2 px-4 py-2.5 border-b transition-colors hover:bg-white/5"
      style={BD}
      onClick={() => setMenuOpen(false)}>
    <Award className="w-4 h-4" style={{ color: 'var(--color-accent-amber)' }} />
    <span className="font-mono text-sm">Rozetlerim</span>
</Link>
```

- [ ] **Step 2: `App.jsx`'e `/badges` route ekle**

Import:
```jsx
import Badges from './pages/Badges';
```

Routes içinde diğer sayfaların yanına:
```jsx
<Route path="badges" element={<Badges />} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/common/Navbar.jsx frontend/src/App.jsx
git commit -m "feat(gamification): Navbar level göstergesi + /badges route — tüm sistem entegre"
```
