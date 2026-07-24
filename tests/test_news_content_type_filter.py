from sqlalchemy.dialects import postgresql

from app.api.v1.endpoints.news import _hidden_content_type_filter


def _compiled():
    return str(
        _hidden_content_type_filter().compile(
            dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
        )
    )


def test_null_content_type_is_not_hidden():
    # content_type IS NULL olan kayıtlar filtrelenmemeli (three-valued NULL mantığı riski)
    assert "IS NULL" in _compiled()


def test_uses_jsonb_any_operator_with_hidden_tags_only():
    compiled = _compiled()
    assert "?|" in compiled
    assert "service_schedule" in compiled
    assert "service_program" in compiled
    assert "service_trivia" in compiled
    assert "practical_info" not in compiled
