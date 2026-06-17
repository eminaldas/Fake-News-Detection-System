from app.services.category_classifier import CategoryProto, classify_category


def _protos():
    # Basit 3 boyutlu vektörler; cosine yön bazlı çalışır
    return [
        CategoryProto(slug="teknoloji", parent_slug=None,  embedding=[1.0, 0.0, 0.0]),
        CategoryProto(slug="spor",      parent_slug=None,  embedding=[0.0, 1.0, 0.0]),
        CategoryProto(slug="ekonomi",   parent_slug=None,  embedding=[0.0, 0.0, 1.0]),
        CategoryProto(slug="otomobil",  parent_slug="teknoloji", embedding=[0.9, 0.1, 0.0]),
        CategoryProto(slug="yazilim",   parent_slug="teknoloji", embedding=[0.1, 0.0, 0.9]),
        CategoryProto(slug="futbol",    parent_slug="spor",      embedding=[0.0, 0.9, 0.1]),
    ]


def test_below_main_threshold_keeps_feed_category():
    # Embedding hiçbir ana kategoriye yeterince benzemiyor (ortada)
    r = classify_category(
        embedding=[0.58, 0.58, 0.58],
        categories=_protos(),
        feed_category="gündem", feed_subcategory=None,
        main_threshold=0.99, sub_threshold=0.99,
    )
    assert r.category == "gündem"
    assert r.subcategory is None


def test_confident_and_different_overrides_main():
    r = classify_category(
        embedding=[1.0, 0.0, 0.0],   # net teknoloji
        categories=_protos(),
        feed_category="gündem", feed_subcategory=None,
        main_threshold=0.55, sub_threshold=0.40,
    )
    assert r.category == "teknoloji"
    assert r.subcategory == "otomobil"   # teknoloji altında en yakın
    assert r.confidence is not None and r.confidence > 0.9


def test_subcategory_assigned_within_feed_main():
    # Feed zaten teknoloji; ana ezilmese de alt kategori dolar
    r = classify_category(
        embedding=[0.9, 0.1, 0.0],
        categories=_protos(),
        feed_category="teknoloji", feed_subcategory=None,
        main_threshold=0.55, sub_threshold=0.40,
    )
    assert r.category == "teknoloji"
    assert r.subcategory == "otomobil"


def test_subcategory_resets_when_main_changes():
    # Feed teknoloji/yazilim demiş ama içerik net spor -> alt kategori yeni ana'ya göre
    r = classify_category(
        embedding=[0.0, 1.0, 0.0],
        categories=_protos(),
        feed_category="teknoloji", feed_subcategory="yazilim",
        main_threshold=0.55, sub_threshold=0.40,
    )
    assert r.category == "spor"
    assert r.subcategory == "futbol"


def test_no_embedding_keeps_feed():
    r = classify_category(
        embedding=None,
        categories=_protos(),
        feed_category="ekonomi", feed_subcategory="finans",
        main_threshold=0.55, sub_threshold=0.40,
    )
    assert r.category == "ekonomi"
    assert r.subcategory == "finans"
    assert r.confidence is None


def test_zero_vector_keeps_feed():
    r = classify_category(
        embedding=[0.0, 0.0, 0.0],
        categories=_protos(),
        feed_category="ekonomi", feed_subcategory=None,
        main_threshold=0.55, sub_threshold=0.40,
    )
    assert r.category == "ekonomi"
    assert r.confidence is None


def test_categories_without_embedding_are_skipped():
    protos = [
        CategoryProto(slug="teknoloji", parent_slug=None, embedding=None),  # prototip yok
        CategoryProto(slug="spor",      parent_slug=None, embedding=[0.0, 1.0, 0.0]),
    ]
    r = classify_category(
        embedding=[1.0, 0.0, 0.0],
        categories=protos,
        feed_category="gündem", feed_subcategory=None,
        main_threshold=0.0, sub_threshold=0.0,
    )
    # teknoloji prototipi NULL -> aday değil; tek aday spor ama benzerlik 0 -> eşik 0'da spor seçilir
    assert r.category == "spor"


def test_no_active_main_categories_keeps_feed():
    r = classify_category(
        embedding=[1.0, 0.0, 0.0],
        categories=[],
        feed_category="gündem", feed_subcategory=None,
        main_threshold=0.55, sub_threshold=0.40,
    )
    assert r.category == "gündem"
    assert r.confidence is None
