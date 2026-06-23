import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def _gen(prompt: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY ayarlanmamış")
    client = _get_gemini_client()
    resp = client.models.generate_content(model=settings.GEMINI_MODEL, contents=prompt)
    return (resp.text or "").strip()


def market_summary_text(snapshot: str) -> str:
    prompt = (
        "Aşağıdaki güncel piyasa verisinden 3-4 cümlelik, sade Türkçe bir GÜNLÜK PİYASA ÖZETİ yaz. "
        "Sadece veriye dayan, tahmin/tavsiye verme. Sonunda yeni satırda '(yatırım tavsiyesi değildir)' yaz.\n\n"
        f"VERİ:\n{snapshot}"
    )
    return _gen(prompt)


def symbol_commentary_text(name: str, stats: str) -> str:
    prompt = (
        f"{name} için aşağıdaki teknik/fiyat verisinden 2-3 cümlelik kısa, sade Türkçe yorum yaz. "
        "Sadece veriye dayan, kesin al/sat tavsiyesi verme. Sonunda '— yatırım tavsiyesi değildir.' ekle.\n\n"
        f"VERİ:\n{stats}"
    )
    return _gen(prompt)
