from ml_engine.processing.cleaner import _classify_content_type


def test_service_schedule_match_in_spor_category():
    title = (
        "BREZİLYA JAPONYA MAÇI CANLI İZLE: Brezilya Japonya maçı saat kaçta, "
        "hangi kanalda? İlk 11'ler belli oldu!"
    )
    assert _classify_content_type(title, "spor") == ["service_schedule"]


def test_service_schedule_ignored_outside_spor_category():
    title = "Maçı saat kaçta, hangi kanalda oynanacağı belli oldu"
    assert _classify_content_type(title, "gündem") is None


def test_service_program_match_in_yasam_category():
    title = (
        "KISKANMAK DİZİSİ YENİ BÖLÜMÜ NE ZAMAN? Kıskanmak dizisi bu akşam yok mu, "
        "neden yok? 31 Mart Salı Now tv yayın akışı"
    )
    assert _classify_content_type(title, "yaşam") == ["service_program"]


def test_service_program_ignored_outside_allowed_categories():
    title = "Yasada yeni bölüm düzenlemesi kabul edildi"
    assert _classify_content_type(title, "siyaset") is None


def test_service_trivia_match_has_no_category_restriction():
    assert _classify_content_type("Günlük burç yorumları açıklandı", "yaşam") == ["service_trivia"]
    assert _classify_content_type("Bugün hava durumu nasıl olacak?", "gündem") == ["service_trivia"]


def test_practical_info_match_is_not_hidden_category():
    title = (
        "Emekli maaşı ve bayram ikramiyesi ödeme takvimi 2026: Emekli maaşları "
        "ne zaman yatacak, bayramdan önce yatar mı?"
    )
    assert _classify_content_type(title, "ekonomi") == ["practical_info"]


def test_normal_news_returns_none():
    assert _classify_content_type("Cumhurbaşkanı bugün açıklama yaptı", "gündem") is None


def test_empty_title_returns_none():
    assert _classify_content_type("", "spor") is None
    assert _classify_content_type(None, "spor") is None
