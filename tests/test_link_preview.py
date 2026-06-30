from app.api.v1.endpoints.link_preview import parse_og, youtube_id

def test_parse_og_basic():
    html = '''<html><head>
      <meta property="og:title" content="Başlık">
      <meta property="og:description" content="Açıklama">
      <meta property="og:image" content="/img/x.png">
      <meta property="og:site_name" content="Örnek">
    </head></html>'''
    out = parse_og(html, "https://ornek.com/a")
    assert out["title"] == "Başlık"
    assert out["description"] == "Açıklama"
    assert out["image"] == "https://ornek.com/img/x.png"   # göreli -> mutlak
    assert out["site"] == "Örnek"

def test_parse_og_title_fallback():
    out = parse_og("<html><head><title>Sadece Title</title></head></html>", "https://x.com")
    assert out["title"] == "Sadece Title"
    assert out["image"] is None

def test_youtube_id():
    assert youtube_id("https://www.youtube.com/watch?v=abc123DEF45") == "abc123DEF45"
    assert youtube_id("https://youtu.be/abc123DEF45") == "abc123DEF45"
    assert youtube_id("https://ornek.com/a") is None
