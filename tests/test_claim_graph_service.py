import uuid

from app.services.claim_graph_service import ClaimCandidate, select_precedent_claims


def test_orders_by_shared_entity_count_descending():
    c1 = ClaimCandidate(claim_id=uuid.uuid4(), shared_entity_count=1)
    c2 = ClaimCandidate(claim_id=uuid.uuid4(), shared_entity_count=3)
    c3 = ClaimCandidate(claim_id=uuid.uuid4(), shared_entity_count=2)

    result = select_precedent_claims([c1, c2, c3])

    assert [c.shared_entity_count for c in result] == [3, 2, 1]


def test_filters_below_min_shared():
    c1 = ClaimCandidate(claim_id=uuid.uuid4(), shared_entity_count=1)
    c2 = ClaimCandidate(claim_id=uuid.uuid4(), shared_entity_count=2)

    result = select_precedent_claims([c1, c2], min_shared=2)

    assert result == [c2]


def test_empty_input_returns_empty():
    assert select_precedent_claims([]) == []
