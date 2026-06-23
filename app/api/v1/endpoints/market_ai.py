from app.core.config import settings as cfg


def _gen(prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=cfg.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")
    resp = model.generate_content(prompt)
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
