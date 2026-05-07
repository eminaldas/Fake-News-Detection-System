"""
app/api/v1/endpoints/forum.py
==============================
GET  /forum/threads              — thread listesi (filtre: category, tag, status, sort)
POST /forum/threads              — yeni thread oluştur
GET  /forum/threads/{thread_id}  — thread detay + yorumlar
POST /forum/threads/{thread_id}/vote     — topluluk oyu
POST /forum/threads/{thread_id}/comments — yorum ekle
POST /forum/comments/{comment_id}/vote  — yorumu faydalı işaretle
GET  /forum/tags                 — etiket ara + trend öneri
GET  /forum/trending             — trend thread ve etiketler
GET  /forum/articles/{article_id}/threads — article'a bağlı thread'ler
"""

import asyncio
import re
import uuid as _uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import sqlalchemy
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select, desc, update, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from workers.moderation_task import check_toxicity

from app.api.deps import get_current_user, get_optional_user, get_admin_user
from app.core.notifications import send_notification
from app.core.pubsub import publish_async
from app.db.session import get_db
from app.models.models import (
    Article, AnalysisResult, Bookmark, ForumComment, ForumCommentVote,
    ForumReport, ForumThread, ForumThreadReport, ForumVote, Tag, ThreadTag, User,
)
from app.schemas.schemas import (
    ForumArticleSummary, ForumCommentCreate, ForumCommentItem, ForumCommentUpdate,
    ForumReportCreate, ForumSearchResponse, ForumTagSearchResponse, ForumThreadCreate,
    ForumThreadDetail, ForumThreadListResponse, ForumThreadReportCreate, ForumThreadSummary,
    ForumThreadUpdate, ForumTrendingResponse, ForumTrendingThread, ForumVoteCreate,
    ForumVoteResult, TagItem,
    FORUM_CATEGORIES,
)

router = APIRouter()

_MIN_VOTES_FOR_REVIEW        = 5
_SUSPICIOUS_REVIEW_THRESHOLD = 0.60
_THREAD_REPORT_THRESHOLD     = 5   # kaç benzersiz kullanıcı raporu sonrası under_review
_INVESTIGATE_THRESHOLD = 10


# ── Helpers ────────────────────────────────────────────────────────────────

def _build_comment_tree(flat: list) -> list:
    """Flat sorgu sonucunu parent_id üzerinden ağaca dönüştürür."""
    by_id: dict = {}
    roots: list = []

    for c in flat:
        item = ForumCommentItem(
            id=c.id,
            thread_id=c.thread_id,
            parent_id=c.parent_id,
            user_id=c.user_id,
            username=c.user.username if c.user else "?",
            avatar_url=c.user.avatar_url if c.user else None,
            body=c.body,
            evidence_urls=c.evidence_urls or [],
            helpful_count=c.helpful_count,
            depth=c.depth,
            is_highlighted=c.is_highlighted,
            created_at=c.created_at,
            moderation_status=c.moderation_status,
        )
        by_id[c.id] = item

    for c in flat:
        item = by_id[c.id]
        if c.parent_id and c.parent_id in by_id:
            by_id[c.parent_id].replies.append(item)
        else:
            roots.append(item)

    return roots


async def _get_or_create_tags(db: AsyncSession, tag_names: list) -> list:
    """Tag adlarını al ya da oluştur, usage_count'u artır."""
    tags = []
    for name in tag_names:
        existing = (await db.execute(
            select(Tag).where(Tag.name == name)
        )).scalar_one_or_none()
        if existing:
            existing.usage_count += 1
            tags.append(existing)
        else:
            new_tag = Tag(name=name, is_system=False, usage_count=1)
            db.add(new_tag)
            await db.flush()
            tags.append(new_tag)
    return tags


async def _check_under_review(thread: ForumThread, article, db: AsyncSession):
    """Topluluk oyu AI kararıyla yeterince çelişiyorsa thread'i under_review'a al."""
    total = thread.vote_suspicious + thread.vote_authentic
    if total < _MIN_VOTES_FOR_REVIEW:
        return
    if article is None:
        return

    ar = (await db.execute(
        select(AnalysisResult).where(AnalysisResult.article_id == article.id)
    )).scalar_one_or_none()
    if ar is None:
        return

    ai_verdict = (ar.status or "").upper()
    suspicious_ratio = thread.vote_suspicious / total if total else 0.0

    if ai_verdict == "AUTHENTIC" and suspicious_ratio >= _SUSPICIOUS_REVIEW_THRESHOLD:
        thread.status = "under_review"
    elif ai_verdict == "FAKE" and suspicious_ratio <= (1.0 - _SUSPICIOUS_REVIEW_THRESHOLD):
        thread.status = "under_review"


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/threads", response_model=ForumThreadListResponse)
async def list_threads(
    category: Optional[str]  = Query(None),
    tag:      Optional[str]  = Query(None),
    status_f: Optional[str]  = Query(None, alias="status"),
    sort:     str            = Query("hot", pattern="^(hot|new|controversial)$"),
    page:     int            = Query(1, ge=1),
    size:     int            = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession         = Depends(get_db),
):
    q = (
        select(ForumThread)
        .options(
            selectinload(ForumThread.user),
            selectinload(ForumThread.tags),
        )
    )

    if category:
        q = q.where(ForumThread.category == category)
    if status_f:
        q = q.where(ForumThread.status == status_f)
    if tag:
        q = q.join(ThreadTag, ThreadTag.thread_id == ForumThread.id).join(
            Tag, Tag.id == ThreadTag.tag_id
        ).where(Tag.name == tag).distinct()

    if sort == "new":
        q = q.order_by(desc(ForumThread.created_at))
    elif sort == "controversial":
        q = q.order_by(desc(ForumThread.vote_investigate), desc(ForumThread.created_at))
    else:  # hot
        q = q.order_by(
            desc(ForumThread.vote_suspicious + ForumThread.vote_authentic + ForumThread.vote_investigate),
            desc(ForumThread.comment_count),
            desc(ForumThread.created_at),
        )

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    items_result = await db.execute(q.offset((page - 1) * size).limit(size))
    threads = items_result.scalars().all()

    summaries = [
        ForumThreadSummary(
            id=t.id,
            title=t.title,
            category=t.category,
            status=t.status,
            vote_suspicious=t.vote_suspicious,
            vote_authentic=t.vote_authentic,
            vote_investigate=t.vote_investigate,
            comment_count=t.comment_count,
            created_at=t.created_at,
            author={"id": t.user.id, "username": t.user.username, "avatar_url": t.user.avatar_url},
            tags=[TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count) for tg in t.tags],
            article_id=t.article_id,
            image_urls=t.image_urls or [],
        )
        for t in threads
    ]
    return ForumThreadListResponse(items=summaries, total=total, page=page, size=size)


@router.post("/threads", response_model=ForumThreadDetail, status_code=status.HTTP_201_CREATED)
async def create_thread(
    body: ForumThreadCreate,
    current_user: User   = Depends(get_current_user),
    db: AsyncSession     = Depends(get_db),
):
    article = None
    if body.article_id:
        article = (await db.execute(
            select(Article).where(Article.id == body.article_id)
        )).scalar_one_or_none()
        if not article:
            raise HTTPException(status_code=404, detail="Haber bulunamadı")

    thread = ForumThread(
        user_id=current_user.id,
        article_id=body.article_id,
        title=body.title,
        body=body.body,
        category=body.category,
        image_urls=body.image_urls or [],
        status="active",
    )
    db.add(thread)
    await db.flush()

    tags = []
    if body.tag_names:
        tags = await _get_or_create_tags(db, body.tag_names)
        for tag in tags:
            db.add(ThreadTag(thread_id=thread.id, tag_id=tag.id))

    await db.commit()
    await db.refresh(thread)

    article_summary = None
    if article:
        ar = (await db.execute(
            select(AnalysisResult).where(AnalysisResult.article_id == article.id)
        )).scalar_one_or_none()
        meta = article.metadata_info or {}
        article_summary = ForumArticleSummary(
            id=article.id,
            title=article.title,
            ai_verdict=ar.status if ar else None,
            confidence=ar.confidence if ar else None,
            image_url=meta.get('image_url'),
            source_url=meta.get('source_url'),
            source_name=meta.get('source_name'),
        )

    return ForumThreadDetail(
        id=thread.id,
        title=thread.title,
        body=thread.body,
        category=thread.category,
        status=thread.status,
        vote_suspicious=thread.vote_suspicious,
        vote_authentic=thread.vote_authentic,
        vote_investigate=thread.vote_investigate,
        comment_count=thread.comment_count,
        created_at=thread.created_at,
        author={"id": current_user.id, "username": current_user.username, "avatar_url": current_user.avatar_url},
        tags=[TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count) for tg in (tags if body.tag_names else [])],
        article=article_summary,
        comments=[],
        current_user_vote=None,
    )


@router.get("/threads/discover", response_model=ForumThreadListResponse)
async def discover_threads(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    tag:      Optional[str] = Query(None),
    sort:     str           = Query("hot"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Popülerlik skoru + kategori ağırlığına göre kişiselleştirilmiş thread listesi."""
    popularity = (
        ForumThread.vote_suspicious
        + ForumThread.vote_authentic
        + ForumThread.vote_investigate
        + ForumThread.comment_count * 2
    )

    q = (
        select(ForumThread)
        .options(selectinload(ForumThread.user), selectinload(ForumThread.tags))
    )

    if category:
        q = q.where(ForumThread.category == category)
    if tag:
        q = q.join(ThreadTag, ThreadTag.thread_id == ForumThread.id).join(
            Tag, Tag.id == ThreadTag.tag_id
        ).where(Tag.name == tag).distinct()

    if sort == "new":
        q = q.order_by(desc(ForumThread.created_at))
    elif sort == "controversial":
        q = q.order_by(desc(ForumThread.vote_investigate), desc(ForumThread.created_at))
    else:
        q = q.order_by(desc(popularity), desc(ForumThread.created_at))

    total   = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    threads = (await db.execute(q.offset((page - 1) * size).limit(size))).scalars().all()

    category_weights = {}
    if current_user:
        from app.models.models import UserPreferenceProfile
        profile = (await db.execute(
            select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == current_user.id)
        )).scalar_one_or_none()
        if profile and profile.category_weights:
            category_weights = profile.category_weights

    def weighted_score(t):
        base  = t.vote_suspicious + t.vote_authentic + t.vote_investigate + t.comment_count * 2
        boost = category_weights.get(t.category, 0)
        return base * (1 + boost)

    if category_weights and sort not in ("new", "controversial"):
        threads = sorted(threads, key=weighted_score, reverse=True)

    # Kullanıcıya özgü bookmark + oy durumu
    bookmarked_ids: set = set()
    user_votes: dict    = {}
    if current_user and threads:
        thread_ids = [t.id for t in threads]
        bm_rows = (await db.execute(
            select(Bookmark.thread_id).where(
                Bookmark.user_id == current_user.id,
                Bookmark.thread_id.in_(thread_ids),
            )
        )).scalars().all()
        bookmarked_ids = set(bm_rows)

        vote_rows = (await db.execute(
            select(ForumVote.thread_id, ForumVote.vote_type).where(
                ForumVote.user_id == current_user.id,
                ForumVote.thread_id.in_(thread_ids),
            )
        )).all()
        user_votes = {str(r.thread_id): r.vote_type for r in vote_rows}

    items = [
        ForumThreadSummary(
            id=t.id,
            title=t.title,
            category=t.category,
            status=t.status,
            vote_suspicious=t.vote_suspicious,
            vote_authentic=t.vote_authentic,
            vote_investigate=t.vote_investigate,
            comment_count=t.comment_count,
            created_at=t.created_at,
            author={"id": t.user.id, "username": t.user.username, "avatar_url": t.user.avatar_url} if t.user else {"id": None, "username": "?"},
            tags=[TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count) for tg in (t.tags or [])],
            article_id=t.article_id,
            image_urls=t.image_urls or [],
            is_bookmarked=t.id in bookmarked_ids,
            current_user_vote=user_votes.get(str(t.id)),
        )
        for t in threads
    ]

    return ForumThreadListResponse(items=items, total=total, page=page, size=size)


@router.get("/threads/{thread_id}", response_model=ForumThreadDetail)
async def get_thread(
    thread_id:    _uuid.UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession         = Depends(get_db),
):
    thread = (await db.execute(
        select(ForumThread)
        .options(
            selectinload(ForumThread.user),
            selectinload(ForumThread.tags),
        )
        .where(ForumThread.id == thread_id)
    )).scalar_one_or_none()

    if not thread:
        raise HTTPException(status_code=404, detail="Tartışma bulunamadı")

    comments_result = await db.execute(
        select(ForumComment)
        .options(selectinload(ForumComment.user))
        .where(
            ForumComment.thread_id == thread_id,
            ForumComment.moderation_status != "removed",
        )
        .order_by(ForumComment.created_at.asc())
    )
    flat_comments = comments_result.scalars().all()
    comment_tree = _build_comment_tree(flat_comments)

    article_summary = None
    if thread.article_id:
        article = (await db.execute(
            select(Article).where(Article.id == thread.article_id)
        )).scalar_one_or_none()
        if article:
            ar = (await db.execute(
                select(AnalysisResult).where(AnalysisResult.article_id == article.id)
            )).scalar_one_or_none()
            meta = article.metadata_info or {}
            article_summary = ForumArticleSummary(
                id=article.id,
                title=article.title,
                ai_verdict=ar.status if ar else None,
                confidence=ar.confidence if ar else None,
                image_url=meta.get('image_url'),
                source_url=meta.get('source_url'),
                source_name=meta.get('source_name'),
            )

    user_vote = None
    if current_user is not None:
        user_vote = (await db.execute(
            select(ForumVote.vote_type).where(
                ForumVote.thread_id == thread_id,
                ForumVote.user_id == current_user.id,
            )
        )).scalar_one_or_none()

    return ForumThreadDetail(
        id=thread.id,
        title=thread.title,
        body=thread.body,
        category=thread.category,
        status=thread.status,
        vote_suspicious=thread.vote_suspicious,
        vote_authentic=thread.vote_authentic,
        vote_investigate=thread.vote_investigate,
        comment_count=thread.comment_count,
        created_at=thread.created_at,
        author={"id": thread.user.id, "username": thread.user.username, "avatar_url": thread.user.avatar_url},
        tags=[TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count) for tg in thread.tags],
        article_id=thread.article_id,
        image_urls=thread.image_urls or [],
        article=article_summary,
        comments=comment_tree,
        current_user_vote=user_vote,
    )


@router.put("/threads/{thread_id}", response_model=ForumThreadDetail)
async def update_thread(
    thread_id:    _uuid.UUID,
    body:         ForumThreadUpdate,
    current_user: User       = Depends(get_current_user),
    db: AsyncSession         = Depends(get_db),
):
    thread = (await db.execute(
        select(ForumThread)
        .options(selectinload(ForumThread.user), selectinload(ForumThread.tags))
        .where(ForumThread.id == thread_id)
    )).scalar_one_or_none()

    if not thread:
        raise HTTPException(status_code=404, detail="Tartışma bulunamadı")
    if thread.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu tartışmayı düzenleyemezsiniz")

    age = datetime.now(timezone.utc) - thread.created_at.replace(tzinfo=timezone.utc)
    if age.total_seconds() > 86400:
        raise HTTPException(status_code=403, detail="Tartışmalar yalnızca 24 saat içinde düzenlenebilir")

    if body.title    is not None: thread.title    = body.title
    if body.body     is not None: thread.body     = body.body
    if body.category is not None: thread.category = body.category

    if body.tag_names is not None:
        tags = await _get_or_create_tags(db, body.tag_names)
        thread.tags = tags

    await db.commit()
    await db.refresh(thread)

    return await get_thread(thread_id, current_user, db)


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id:    _uuid.UUID,
    current_user: User       = Depends(get_current_user),
    db: AsyncSession         = Depends(get_db),
):
    thread = (await db.execute(
        select(ForumThread).where(ForumThread.id == thread_id)
    )).scalar_one_or_none()

    if not thread:
        raise HTTPException(status_code=404, detail="Tartışma bulunamadı")
    if thread.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu tartışmayı silemezsiniz")

    await db.delete(thread)
    await db.commit()


@router.get("/tags", response_model=ForumTagSearchResponse)
async def search_tags(
    search:   str            = Query(..., min_length=1, max_length=50),
    category: Optional[str]  = Query(None),
    limit:    int            = Query(10, ge=1, le=30),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession         = Depends(get_db),
):
    system_q = select(Tag).where(Tag.is_system == True, Tag.name.ilike(f"%{search}%")).order_by(desc(Tag.usage_count))
    if category:
        system_q = system_q.where(
            (Tag.category == category) | (Tag.category.is_(None))
        )
    system_tags = (await db.execute(system_q.limit(limit))).scalars().all()

    user_q = (
        select(Tag)
        .where(Tag.is_system == False, Tag.name.ilike(f"%{search}%"))
        .order_by(desc(Tag.usage_count))
    )
    if category:
        user_q = user_q.where(Tag.category == category)

    remaining = limit - len(system_tags)
    user_tags = (await db.execute(user_q.limit(remaining))).scalars().all() if remaining > 0 else []

    all_tags = system_tags + [t for t in user_tags if t.id not in {s.id for s in system_tags}]

    return ForumTagSearchResponse(
        tags=[TagItem(id=t.id, name=t.name, is_system=t.is_system, usage_count=t.usage_count) for t in all_tags]
    )


def _increment_vote(thread: ForumThread, vote_type: str):
    if vote_type == "suspicious":    thread.vote_suspicious  += 1
    elif vote_type == "authentic":   thread.vote_authentic   += 1
    elif vote_type == "investigate": thread.vote_investigate += 1
    elif vote_type == "up":          thread.vote_up          += 1
    elif vote_type == "down":        thread.vote_down        += 1


def _decrement_vote(thread: ForumThread, vote_type: str):
    if vote_type == "suspicious":    thread.vote_suspicious  = max(0, thread.vote_suspicious  - 1)
    elif vote_type == "authentic":   thread.vote_authentic   = max(0, thread.vote_authentic   - 1)
    elif vote_type == "investigate": thread.vote_investigate = max(0, thread.vote_investigate - 1)
    elif vote_type == "up":          thread.vote_up          = max(0, thread.vote_up          - 1)
    elif vote_type == "down":        thread.vote_down        = max(0, thread.vote_down        - 1)


@router.post("/threads/{thread_id}/vote", response_model=ForumVoteResult)
async def vote_thread(
    thread_id:    _uuid.UUID,
    body:         ForumVoteCreate,
    current_user: User         = Depends(get_current_user),
    db: AsyncSession           = Depends(get_db),
):
    thread = (await db.execute(
        select(ForumThread).where(ForumThread.id == thread_id)
    )).scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Tartışma bulunamadı")

    existing = (await db.execute(
        select(ForumVote).where(
            ForumVote.thread_id == thread_id,
            ForumVote.user_id == current_user.id,
        )
    )).scalar_one_or_none()

    if existing:
        if existing.vote_type == body.vote_type:
            # Same vote again — toggle off
            _decrement_vote(thread, existing.vote_type)
            await db.delete(existing)
            current_vote = None
        else:
            # Different vote — switch
            _decrement_vote(thread, existing.vote_type)
            _increment_vote(thread, body.vote_type)
            existing.vote_type = body.vote_type
            current_vote = body.vote_type
    else:
        vote = ForumVote(
            thread_id=thread_id,
            user_id=current_user.id,
            vote_type=body.vote_type,
        )
        db.add(vote)
        _increment_vote(thread, body.vote_type)
        current_vote = body.vote_type

    # under_review automation
    article = None
    if thread.article_id:
        article = (await db.execute(
            select(Article).where(Article.id == thread.article_id)
        )).scalar_one_or_none()
    await _check_under_review(thread, article, db)

    if thread.status == "under_review" and thread.user_id != current_user.id:
        await send_notification(
            db=db,
            user_id=thread.user_id,
            notif_type="under_review",
            payload={
                "thread_id":    str(thread_id),
                "thread_title": thread.title,
            },
        )

    # "İncele" eşiği kontrolü — eşik aşılırsa fact-check pipeline'ı tetikle
    if (
        thread.vote_investigate >= _INVESTIGATE_THRESHOLD
        and not thread.fact_check_triggered
        and thread.article_id is not None
    ):
        try:
            from workers.tasks import analyze_article
            # article'ı fetch et, analyze_article task'ına gönder
            if article is None:
                article = (await db.execute(
                    select(Article).where(Article.id == thread.article_id)
                )).scalar_one_or_none()
            if article:
                analyze_article.delay(
                    str(thread.article_id),
                    text=article.title + " " + (article.body or ""),
                    news_evidence=None,
                    user_id=None,
                )
        except Exception:
            pass  # worker mevcut değilse sessizce geç
        thread.fact_check_triggered = True

    await db.commit()
    await db.refresh(thread)

    return ForumVoteResult(
        vote_suspicious=thread.vote_suspicious,
        vote_authentic=thread.vote_authentic,
        vote_investigate=thread.vote_investigate,
        vote_up=thread.vote_up,
        vote_down=thread.vote_down,
        status=thread.status,
        current_user_vote=current_vote,
    )


@router.post("/threads/{thread_id}/comments", response_model=ForumCommentItem, status_code=status.HTTP_201_CREATED)
async def add_comment(
    thread_id:    _uuid.UUID,
    body:         ForumCommentCreate,
    current_user: User         = Depends(get_current_user),
    db: AsyncSession           = Depends(get_db),
):
    thread = (await db.execute(
        select(ForumThread).where(ForumThread.id == thread_id)
    )).scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Tartışma bulunamadı")

    depth = 0
    if body.parent_id:
        parent = (await db.execute(
            select(ForumComment).where(
                ForumComment.id == body.parent_id,
                ForumComment.thread_id == thread_id,
            )
        )).scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Yanıtlanacak yorum bulunamadı")
        depth = min(parent.depth + 1, 3)

    # ── Toksisite taraması ────────────────────────────────────────────────────
    tox = await asyncio.to_thread(check_toxicity, body.body)
    if not tox["safe"] and tox["severity"] == "high":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="İçerik forum politikalarına aykırı. Lütfen düzenleyin.",
        )
    flagged_by_ai = not tox["safe"]   # low/medium severity → kaydet, flag

    comment = ForumComment(
        thread_id=thread_id,
        parent_id=body.parent_id,
        user_id=current_user.id,
        body=body.body,
        evidence_urls=body.evidence_urls,
        depth=depth,
        moderation_status="flagged_ai" if flagged_by_ai else "clean",
        moderation_note=tox["reason"] if flagged_by_ai else None,
    )
    db.add(comment)

    thread.comment_count += 1

    await db.flush()

    # Notify followers: distinct user_ids that have commented on this thread (excluding self)
    follower_rows = await db.execute(
        select(ForumComment.user_id)
        .where(
            ForumComment.thread_id == thread_id,
            ForumComment.user_id != current_user.id,
            ForumComment.id != comment.id,
        )
        .distinct()
    )
    follower_ids = [str(r[0]) for r in follower_rows.all()]

    await db.commit()
    await db.refresh(comment)

    # Thread yazarına yorum bildirimi
    if thread.user_id != current_user.id:
        await send_notification(
            db=db,
            user_id=thread.user_id,
            notif_type="new_comment",
            payload={
                "thread_id":    str(thread_id),
                "thread_title": thread.title,
                "comment_id":   str(comment.id),
                "actor":        current_user.username,
            },
        )
        await db.commit()

    # Yanıt bildirimi (parent varsa)
    if body.parent_id:
        parent_comment = (await db.execute(
            select(ForumComment).where(ForumComment.id == body.parent_id)
        )).scalar_one_or_none()
        if parent_comment and parent_comment.user_id != current_user.id:
            await send_notification(
                db=db,
                user_id=parent_comment.user_id,
                notif_type="reply",
                payload={
                    "thread_id":    str(thread_id),
                    "thread_title": thread.title,
                    "comment_id":   str(comment.id),
                    "actor":        current_user.username,
                },
            )
            await db.commit()

    # @mention bildirimleri — yorum gövdesindeki @kullaniciadi'ları parse et
    mentions = re.findall(r'@(\w+)', body.body)
    if mentions:
        mentioned_result = await db.execute(
            select(User).where(User.username.in_(mentions))
        )
        for mentioned_user in mentioned_result.scalars().all():
            if mentioned_user.id != current_user.id:
                await send_notification(db, mentioned_user.id, "mention", {
                    "thread_id":       str(thread.id),
                    "comment_id":      str(comment.id),
                    "actor_username":  current_user.username,
                })
        await db.commit()

    comment_payload = {
        "thread_id": str(thread_id),
        "comment": {
            "id": str(comment.id),
            "username": current_user.username,
            "body": comment.body,
            "depth": comment.depth,
            "parent_id": str(comment.parent_id) if comment.parent_id else None,
            "created_at": comment.created_at.isoformat(),
        },
    }
    for fid in follower_ids:
        await publish_async(
            channel=f"user:{fid}:events",
            msg_type="forum.new_comment",
            payload=comment_payload,
        )

    item = ForumCommentItem(
        id=comment.id,
        thread_id=comment.thread_id,
        parent_id=comment.parent_id,
        username=current_user.username,
        body=comment.body,
        evidence_urls=comment.evidence_urls or [],
        helpful_count=comment.helpful_count,
        depth=comment.depth,
        is_highlighted=comment.is_highlighted,
        created_at=comment.created_at,
        moderation_status=comment.moderation_status,
    )
    if flagged_by_ai:
        return Response(
            content=item.model_dump_json(),
            status_code=202,
            media_type="application/json",
        )
    return item


@router.post("/comments/{comment_id}/vote", status_code=status.HTTP_204_NO_CONTENT)
async def helpful_vote(
    comment_id:   _uuid.UUID,
    current_user: User         = Depends(get_current_user),
    db: AsyncSession           = Depends(get_db),
):
    comment = (await db.execute(
        select(ForumComment).where(ForumComment.id == comment_id)
    )).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")

    existing = (await db.execute(
        select(ForumCommentVote).where(
            ForumCommentVote.comment_id == comment_id,
            ForumCommentVote.user_id == current_user.id,
        )
    )).scalar_one_or_none()

    if existing:
        await db.delete(existing)
        comment.helpful_count = max(0, comment.helpful_count - 1)
    else:
        db.add(ForumCommentVote(comment_id=comment_id, user_id=current_user.id))
        comment.helpful_count += 1

    await db.commit()


@router.put("/comments/{comment_id}", response_model=ForumCommentItem)
async def update_comment(
    comment_id:   _uuid.UUID,
    body:         ForumCommentUpdate,
    current_user: User       = Depends(get_current_user),
    db: AsyncSession         = Depends(get_db),
):
    comment = (await db.execute(
        select(ForumComment)
        .options(selectinload(ForumComment.user))
        .where(ForumComment.id == comment_id)
    )).scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu yorumu düzenleyemezsiniz")

    age = datetime.now(timezone.utc) - comment.created_at.replace(tzinfo=timezone.utc)
    if age.total_seconds() > 900:
        raise HTTPException(status_code=403, detail="Yorumlar yalnızca 15 dakika içinde düzenlenebilir")

    tox = await asyncio.to_thread(check_toxicity, body.body)
    if not tox["safe"] and tox["severity"] == "high":
        raise HTTPException(status_code=422, detail="İçerik forum politikalarına aykırı")

    comment.body      = body.body
    comment.is_edited = True
    comment.edited_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(comment)

    return ForumCommentItem(
        id=comment.id,
        thread_id=comment.thread_id,
        parent_id=comment.parent_id,
        username=comment.user.username,
        avatar_url=comment.user.avatar_url,
        body=comment.body,
        evidence_urls=comment.evidence_urls or [],
        helpful_count=comment.helpful_count,
        depth=comment.depth,
        is_highlighted=comment.is_highlighted,
        created_at=comment.created_at,
        moderation_status=comment.moderation_status,
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id:   _uuid.UUID,
    current_user: User       = Depends(get_current_user),
    db: AsyncSession         = Depends(get_db),
):
    comment = (await db.execute(
        select(ForumComment).where(ForumComment.id == comment_id)
    )).scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu yorumu silemezsiniz")

    thread = (await db.execute(
        select(ForumThread).where(ForumThread.id == comment.thread_id)
    )).scalar_one_or_none()
    if thread:
        thread.comment_count = max(0, thread.comment_count - 1)

    await db.delete(comment)
    await db.commit()


_AUTO_FLAG_THRESHOLD = 3   # kaç raporda otomatik flaglenir


@router.post("/comments/{comment_id}/report", status_code=status.HTTP_200_OK)
async def report_comment(
    comment_id:   _uuid.UUID,
    body:         ForumReportCreate,
    current_user: User         = Depends(get_current_user),
    db: AsyncSession           = Depends(get_db),
):
    comment = (await db.execute(
        select(ForumComment).where(ForumComment.id == comment_id)
    )).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")

    if comment.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi yorumunuzu bildiremezsiniz")

    # Duplicate report kontrolü
    existing = (await db.execute(
        select(ForumReport).where(
            ForumReport.comment_id == comment_id,
            ForumReport.reporter_id == current_user.id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Bu yorumu zaten bildirdiniz")

    report = ForumReport(
        comment_id=comment_id,
        reporter_id=current_user.id,
        reason=body.reason,
    )
    db.add(report)
    await db.flush()

    # Rapor sayısını kontrol et — eşiği aşarsa otomatik flagle
    report_count = (await db.execute(
        select(func.count()).where(ForumReport.comment_id == comment_id)
    )).scalar_one()

    if report_count >= _AUTO_FLAG_THRESHOLD and comment.moderation_status == "clean":
        comment.moderation_status = "flagged_user"
        thread = (await db.execute(
            select(ForumThread).where(ForumThread.id == comment.thread_id)
        )).scalar_one_or_none()
        if thread and thread.status == "active":
            thread.status = "under_review"

    await db.commit()
    return {"message": "Bildiriminiz alındı."}


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


@router.get("/articles/{article_id}/threads", response_model=ForumThreadListResponse)
async def get_article_threads(
    article_id:   _uuid.UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession           = Depends(get_db),
):
    """Belirli bir article'a bağlı tüm thread'ler (yeniden eskiye)."""
    result = await db.execute(
        select(ForumThread)
        .options(
            selectinload(ForumThread.user),
            selectinload(ForumThread.tags),
        )
        .where(ForumThread.article_id == article_id)
        .order_by(desc(ForumThread.created_at))
    )
    threads = result.scalars().all()

    items = [
        ForumThreadSummary(
            id=t.id,
            title=t.title,
            category=t.category,
            status=t.status,
            vote_suspicious=t.vote_suspicious,
            vote_authentic=t.vote_authentic,
            vote_investigate=t.vote_investigate,
            comment_count=t.comment_count,
            created_at=t.created_at,
            author={"id": t.user.id, "username": t.user.username, "avatar_url": t.user.avatar_url},
            tags=[TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count) for tg in t.tags],
        )
        for t in threads
    ]

    return ForumThreadListResponse(items=items, total=len(items), page=1, size=len(items))


# ── Bookmark ────────────────────────────────────────────────────────────────

@router.post("/threads/{thread_id}/bookmark", status_code=status.HTTP_204_NO_CONTENT)
async def toggle_bookmark(
    thread_id:    _uuid.UUID,
    current_user: User         = Depends(get_current_user),
    db: AsyncSession           = Depends(get_db),
):
    """Thread'i kaydet / kaydedilmişten kaldır (toggle)."""
    thread = (await db.execute(
        select(ForumThread).where(ForumThread.id == thread_id)
    )).scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Tartışma bulunamadı")

    existing = await db.get(Bookmark, (current_user.id, thread_id))
    if existing:
        await db.delete(existing)
    else:
        db.add(Bookmark(user_id=current_user.id, thread_id=thread_id))
    await db.commit()
    return Response(status_code=204)


@router.get("/bookmarks/me", response_model=ForumThreadListResponse)
async def my_bookmarks(
    page:         int  = Query(1, ge=1),
    size:         int  = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """Giriş yapmış kullanıcının kaydettiği thread'leri sayfalı listeler."""
    bookmarked_sq = (
        select(Bookmark.thread_id)
        .where(Bookmark.user_id == current_user.id)
        .scalar_subquery()
    )

    q = (
        select(ForumThread)
        .options(selectinload(ForumThread.user), selectinload(ForumThread.tags))
        .where(ForumThread.id.in_(bookmarked_sq))
        .order_by(desc(ForumThread.created_at))
    )

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    threads = (await db.execute(q.offset((page - 1) * size).limit(size))).scalars().all()

    items = [
        ForumThreadSummary(
            id=t.id,
            title=t.title,
            category=t.category,
            status=t.status,
            vote_suspicious=t.vote_suspicious,
            vote_authentic=t.vote_authentic,
            vote_investigate=t.vote_investigate,
            comment_count=t.comment_count,
            created_at=t.created_at,
            author={"id": t.user.id, "username": t.user.username, "avatar_url": t.user.avatar_url},
            tags=[TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count) for tg in t.tags],
            is_bookmarked=True,
        )
        for t in threads
    ]
    return ForumThreadListResponse(items=items, total=total, page=page, size=size)


# ── Search ──────────────────────────────────────────────────────────────────

@router.get("/search", response_model=ForumSearchResponse)
async def search_threads(
    q:        str           = Query(..., min_length=1, max_length=200),
    category: Optional[str] = Query(None),
    page:     int           = Query(1, ge=1),
    size:     int           = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession         = Depends(get_db),
):
    import sqlalchemy
    pattern = f"%{q}%"
    base_q = (
        select(ForumThread)
        .options(
            selectinload(ForumThread.user),
            selectinload(ForumThread.tags),
        )
        .where(
            sqlalchemy.or_(
                ForumThread.title.ilike(pattern),
                ForumThread.body.ilike(pattern),
            )
        )
        .order_by(
            desc(
                ForumThread.vote_suspicious
                + ForumThread.vote_authentic
                + ForumThread.vote_investigate
                + ForumThread.comment_count
            ),
            desc(ForumThread.created_at),
        )
    )
    if category:
        base_q = base_q.where(ForumThread.category == category)

    total   = (await db.execute(select(func.count()).select_from(base_q.subquery()))).scalar_one()
    threads = (await db.execute(base_q.offset((page - 1) * size).limit(size))).scalars().all()

    items = [
        ForumThreadSummary(
            id=t.id,
            title=t.title,
            category=t.category,
            status=t.status,
            vote_suspicious=t.vote_suspicious,
            vote_authentic=t.vote_authentic,
            vote_investigate=t.vote_investigate,
            comment_count=t.comment_count,
            created_at=t.created_at,
            author={"id": t.user.id, "username": t.user.username, "avatar_url": t.user.avatar_url},
            tags=[TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count) for tg in t.tags],
        )
        for t in threads
    ]
    return ForumSearchResponse(items=items, total=total, query=q)


# ── Thread Report ───────────────────────────────────────────────────────────

@router.post("/threads/{thread_id}/report", status_code=status.HTTP_200_OK)
async def report_thread(
    thread_id:    _uuid.UUID,
    body:         ForumThreadReportCreate,
    current_user: User         = Depends(get_current_user),
    db: AsyncSession           = Depends(get_db),
):
    thread = (await db.execute(
        select(ForumThread).where(ForumThread.id == thread_id)
    )).scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Tartışma bulunamadı")
    if thread.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi tartışmanızı bildiremezsiniz")

    # Daha önce bildirdi mi?
    existing = await db.get(ForumThreadReport, {"thread_id": thread_id, "reporter_id": current_user.id})
    if not existing:
        # Unique constraint'e göre get çalışmıyor, scalar kullan
        existing = (await db.execute(
            select(ForumThreadReport).where(
                ForumThreadReport.thread_id   == thread_id,
                ForumThreadReport.reporter_id == current_user.id,
            )
        )).scalar_one_or_none()

    if existing:
        return {"status": "already_reported", "message": "Bu içeriği zaten bildirdiniz."}

    db.add(ForumThreadReport(
        thread_id=thread_id,
        reporter_id=current_user.id,
        reason=body.reason,
    ))
    await db.commit()

    # Eşiğe ulaşıldıysa inceleme altına al
    report_count = (await db.execute(
        select(func.count()).select_from(ForumThreadReport).where(
            ForumThreadReport.thread_id == thread_id
        )
    )).scalar_one()

    if report_count >= _THREAD_REPORT_THRESHOLD and thread.status == "active":
        thread.status = "under_review"
        await db.commit()

    return {"status": "reported", "message": "Bildiriminiz alındı. İnceleme sürecine dahil edildi."}


# ── Moderation ──────────────────────────────────────────────────────────────

@router.get("/admin/flagged-comments")
async def list_flagged_comments(
    current_user: User       = Depends(get_admin_user),
    db: AsyncSession         = Depends(get_db),
):
    result = await db.execute(
        select(ForumComment)
        .options(selectinload(ForumComment.user))
        .where(ForumComment.moderation_status.in_(["flagged_ai", "flagged_user"]))
        .order_by(desc(ForumComment.created_at))
        .limit(50)
    )
    comments = result.scalars().all()
    return [
        {
            "id":                str(c.id),
            "thread_id":         str(c.thread_id),
            "username":          c.user.username if c.user else "?",
            "body":              c.body,
            "moderation_status": c.moderation_status,
            "moderation_note":   c.moderation_note,
            "created_at":        c.created_at.isoformat(),
        }
        for c in comments
    ]


@router.put("/admin/comments/{comment_id}/approve", status_code=status.HTTP_204_NO_CONTENT)
async def approve_comment(
    comment_id:   _uuid.UUID,
    current_user: User       = Depends(get_admin_user),
    db: AsyncSession         = Depends(get_db),
):
    comment = (await db.execute(
        select(ForumComment).where(ForumComment.id == comment_id)
    )).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    comment.moderation_status = "clean"
    await db.commit()


@router.put("/admin/comments/{comment_id}/remove", status_code=status.HTTP_204_NO_CONTENT)
async def remove_comment(
    comment_id:   _uuid.UUID,
    current_user: User       = Depends(get_admin_user),
    db: AsyncSession         = Depends(get_db),
):
    comment = (await db.execute(
        select(ForumComment).where(ForumComment.id == comment_id)
    )).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    comment.moderation_status = "removed"
    await db.commit()


@router.get("/admin/flagged-threads")
async def list_flagged_threads(
    current_user: User       = Depends(get_admin_user),
    db: AsyncSession         = Depends(get_db),
):
    result = await db.execute(
        select(ForumThread)
        .options(selectinload(ForumThread.user))
        .where(ForumThread.status == "under_review")
        .order_by(desc(ForumThread.created_at))
        .limit(50)
    )
    threads = result.scalars().all()
    return [
        {
            "id":              str(t.id),
            "title":           t.title,
            "username":        t.user.username if t.user else "?",
            "status":          t.status,
            "vote_suspicious": t.vote_suspicious,
            "vote_authentic":  t.vote_authentic,
            "created_at":      t.created_at.isoformat(),
        }
        for t in threads
    ]


@router.put("/admin/threads/{thread_id}/resolve", status_code=status.HTTP_204_NO_CONTENT)
async def resolve_thread(
    thread_id:    _uuid.UUID,
    current_user: User       = Depends(get_admin_user),
    db: AsyncSession         = Depends(get_db),
):
    thread = (await db.execute(
        select(ForumThread).where(ForumThread.id == thread_id)
    )).scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Tartışma bulunamadı")
    thread.status = "resolved"
    await db.commit()


@router.put("/admin/threads/{thread_id}/close", status_code=status.HTTP_204_NO_CONTENT)
async def close_thread(
    thread_id:    _uuid.UUID,
    current_user: User       = Depends(get_admin_user),
    db: AsyncSession         = Depends(get_db),
):
    thread = (await db.execute(
        select(ForumThread).where(ForumThread.id == thread_id)
    )).scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Tartışma bulunamadı")
    thread.status = "closed"
    await db.commit()


