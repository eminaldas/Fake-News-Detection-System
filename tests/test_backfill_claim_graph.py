from scripts.backfill_claim_graph import filter_unprocessed_article_ids


def test_filters_out_already_processed():
    all_ids = ["a", "b", "c"]
    already_processed = {"b"}
    result = filter_unprocessed_article_ids(all_ids, already_processed)
    assert result == ["a", "c"]


def test_empty_processed_set_returns_all():
    result = filter_unprocessed_article_ids(["a", "b"], set())
    assert result == ["a", "b"]


def test_all_processed_returns_empty():
    result = filter_unprocessed_article_ids(["a", "b"], {"a", "b"})
    assert result == []
