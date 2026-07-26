"""
app/services/claim_graph_service.py
====================================
İddia-Varlık grafiği için servis katmanı.
select_precedent_claims: saf karar mantığı (DB'siz, doğrudan test edilir).
write_claim/link_entities/find_precedent_claims: DB I/O (manuel doğrulama, bkz. plan).
"""
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Claim, ClaimEntity, Entity
from ml_engine.processing.entity_extractor import normalize_entity_name


@dataclass
class ClaimCandidate:
    claim_id: UUID
    shared_entity_count: int


def select_precedent_claims(
    candidates: list[ClaimCandidate], min_shared: int = 1
) -> list[ClaimCandidate]:
    """Ortak varlık sayısına göre azalan sırada, min_shared eşiğini geçenleri döner."""
    filtered = [c for c in candidates if c.shared_entity_count >= min_shared]
    return sorted(filtered, key=lambda c: c.shared_entity_count, reverse=True)


async def write_claim(
    session: AsyncSession,
    article_id: UUID,
    verdict: str,
    source_type: str,
    confidence: float | None,
    resolved_at: datetime,
) -> Claim:
    """article_id UNIQUE olduğu için var olan Claim'i günceller, yoksa yaratır."""
    existing = await session.execute(select(Claim).where(Claim.article_id == article_id))
    claim = existing.scalar_one_or_none()

    if claim is None:
        claim = Claim(
            article_id=article_id, verdict=verdict, source_type=source_type,
            confidence=confidence, resolved_at=resolved_at,
        )
        session.add(claim)
    else:
        claim.verdict = verdict
        claim.source_type = source_type
        claim.confidence = confidence
        claim.resolved_at = resolved_at

    await session.flush()
    return claim


async def link_entities(
    session: AsyncSession, claim_id: UUID, entities: list[dict]
) -> list[UUID]:
    """entities: extract_claim_entities çıktısı ([{"name","type","confidence"}, ...]).
    Her varlık için (entity_type, normalized_name) üzerinden upsert, sonra claim_entities satırı."""
    entity_ids: list[UUID] = []

    for item in entities:
        normalized = normalize_entity_name(item["name"])

        existing = await session.execute(
            select(Entity).where(
                Entity.entity_type == item["type"], Entity.normalized_name == normalized
            )
        )
        entity = existing.scalar_one_or_none()

        if entity is None:
            entity = Entity(
                entity_type=item["type"], name=item["name"], normalized_name=normalized,
            )
            session.add(entity)
            await session.flush()

        entity_ids.append(entity.id)

        stmt = (
            pg_insert(ClaimEntity)
            .values(claim_id=claim_id, entity_id=entity.id)
            .on_conflict_do_nothing(index_elements=["claim_id", "entity_id"])
        )
        await session.execute(stmt)

    await session.flush()
    return entity_ids


async def find_precedent_claims(session: AsyncSession, entity_ids: list[UUID]) -> list[Claim]:
    """Verilen varlıklardan en az birini paylaşan geçmiş Claim'leri, ortak varlık
    sayısına göre azalan sırada döner (bkz. select_precedent_claims)."""
    if not entity_ids:
        return []

    rows = await session.execute(
        select(ClaimEntity.claim_id, func.count(ClaimEntity.entity_id).label("shared"))
        .where(ClaimEntity.entity_id.in_(entity_ids))
        .group_by(ClaimEntity.claim_id)
    )
    candidates = [
        ClaimCandidate(claim_id=row.claim_id, shared_entity_count=row.shared)
        for row in rows
    ]
    ranked = select_precedent_claims(candidates, min_shared=1)
    if not ranked:
        return []

    claim_ids = [c.claim_id for c in ranked]
    claims_result = await session.execute(select(Claim).where(Claim.id.in_(claim_ids)))
    claims_by_id = {c.id: c for c in claims_result.scalars().all()}
    return [claims_by_id[c.claim_id] for c in ranked if c.claim_id in claims_by_id]
