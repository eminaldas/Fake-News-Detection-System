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

import uuid as _uuid
from typing import List, Optional

import sqlalchemy
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.pubsub import publish_async
from app.db.session import get_db
from app.models.models import (
    Article, AnalysisResult, ForumComment, ForumCommentVote,
    ForumThread, ForumVote, Tag, ThreadTag, User,
)
from app.schemas.schemas import (
    ForumArticleSummary, ForumCommentCreate, ForumCommentItem,
    ForumTagSearchResponse, ForumThreadCreate, ForumThreadDetail,
    ForumThreadListResponse, ForumThreadSummary, ForumTrendingResponse,
    ForumTrendingThread, ForumVoteCreate, ForumVoteResult, TagItem,
    FORUM_CATEGORIES,
)

router = APIRouter()

_MIN_VOTES_FOR_REVIEW = 5
_SUSPICIOUS_REVIEW_THRESHOLD = 0.60


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
            username=c.user.username if c.user else "?",
            body=c.body,
            evidence_urls=c.evidence_urls or [],
            helpful_count=c.helpful_count,
            depth=c.depth,
            is_highlighted=c.is_highlighted,
            created_at=c.created_at,
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
    current_user: User       = Depends(get_current_user),
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
            author={"id": t.user.id, "username": t.user.username},
            tags=[TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count) for tg in t.tags],
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
        status="active",
    )
    db.add(thread)
    await db.flush()

    if body.tag_names:
        tags = await _get_or_create_tags(db, body.tag_names)
        thread.tags = tags

    await db.commit()
    await db.refresh(thread)

    article_summary = None
    if article:
        ar = (await db.execute(
            select(AnalysisResult).where(AnalysisResult.article_id == article.id)
        )).scalar_one_or_none()
        article_summary = ForumArticleSummary(
            id=article.id,
            title=article.title,
            ai_verdict=ar.status if ar else None,
            confidence=ar.confidence if ar else None,
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
        author={"id": current_user.id, "username": current_user.username},
        tags=[TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count) for tg in (tags if body.tag_names else [])],
        article=article_summary,
        comments=[],
        current_user_vote=None,
    )


@router.get("/threads/{thread_id}", response_model=ForumThreadDetail)
async def get_thread(
    thread_id:    _uuid.UUID,
    current_user: User       = Depends(get_current_user),
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
        .where(ForumComment.thread_id == thread_id)
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
            article_summary = ForumArticleSummary(
                id=article.id,
                title=article.title,
                ai_verdict=ar.status if ar else None,
                confidence=ar.confidence if ar else None,
            )

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
        author={"id": thread.user.id, "username": thread.user.username},
        tags=[TagItem(id=tg.id, name=tg.name, is_system=tg.is_system, usage_count=tg.usage_count) for tg in thread.tags],
        article=article_summary,
        comments=comment_tree,
        current_user_vote=user_vote,
    )


@router.get("/tags", response_model=ForumTagSearchResponse)
async def search_tags(
    search:   str            = Query(..., min_length=1, max_length=50),
    category: Optional[str]  = Query(None),
    limit:    int            = Query(10, ge=1, le=30),
    current_user: User       = Depends(get_current_user),
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
    if vote_type == "suspicious":
        thread.vote_suspicious += 1
    elif vote_type == "authentic":
        thread.vote_authentic += 1
    elif vote_type == "investigate":
        thread.vote_investigate += 1


def _decrement_vote(thread: ForumThread, vote_type: str):
    if vote_type == "suspicious":
        thread.vote_suspicious = max(0, thread.vote_suspicious - 1)
    elif vote_type == "authentic":
        thread.vote_authentic = max(0, thread.vote_authentic - 1)
    elif vote_type == "investigate":
        thread.vote_investigate = max(0, thread.vote_investigate - 1)


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

    await db.commit()
    await db.refresh(thread)

    return ForumVoteResult(
        vote_suspicious=thread.vote_suspicious,
        vote_authentic=thread.vote_authentic,
        vote_investigate=thread.vote_investigate,
        status=thread.status,
        current_user_vote=current_vote,
    )
