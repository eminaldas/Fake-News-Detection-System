from app.models.models import Entity, Claim, ClaimEntity


def test_entity_table_columns():
    cols = {c.name for c in Entity.__table__.columns}
    assert cols == {"id", "entity_type", "name", "normalized_name", "created_at"}
    assert Entity.__tablename__ == "entities"


def test_claim_table_columns():
    cols = {c.name for c in Claim.__table__.columns}
    assert cols == {
        "id", "article_id", "verdict", "source_type", "confidence",
        "resolved_at", "created_at",
    }
    assert Claim.__tablename__ == "claims"


def test_claim_entities_table_columns():
    cols = {c.name for c in ClaimEntity.__table__.columns}
    assert cols == {"claim_id", "entity_id"}
    assert ClaimEntity.__tablename__ == "claim_entities"
