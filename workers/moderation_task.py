"""
workers/moderation_task.py
===========================
Forum yorumu toksisite taraması — Gemini 2.0 Flash ile.

Çağrı: asyncio.to_thread(check_toxicity, body) ile forum endpoint'inden çağrılır.
Fail open: Gemini hatası/timeout → {"safe": True, ...} — sansür riski sıfır.
"""
import json
import logging
import re

from app.core.config import settings

logger = logging.getLogger("ModerationTask")

_SAFE_RESULT    = {"safe": True,  "severity": "low",  "reason": ""}
_BLOCKED_RESULT = {"safe": False, "severity": "high", "reason": "İçerik politikalarına aykırı"}

_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def _extract_json(text: str) -> dict | None:
    match = re.search(r'\{[^{}]+\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


def check_toxicity(body: str) -> dict:
    """
    Yorum içeriğini Gemini ile tara.

    Returns:
        {
            "safe": bool,
            "severity": "low" | "medium" | "high",
            "reason": str  # kısa Türkçe gerekçe
        }

    Hata durumunda _SAFE_RESULT döner (fail open).
    """
    if not settings.GEMINI_API_KEY:
        return _SAFE_RESULT

    prompt = f"""Sen bir Türkçe forum moderatörüsün.
Aşağıdaki yorumun hakaret, nefret söylemi, spam veya açık manipülasyon
içerip içermediğini değerlendir. Şüpheli durumlarda safe=true döndür.

Yorum: "{body[:2000]}"

Yalnızca JSON formatında yanıt ver:
{{"safe": true/false, "severity": "low"/"medium"/"high", "reason": "kısa Türkçe gerekçe"}}"""

    try:
        from google.genai import types
        client = _get_gemini_client()
        response = client.models.generate_content(
            model="gemini-2.0-flash-001",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        raw = _extract_json(response.text)
        if raw is None:
            logger.warning("Toksisite yanıtından JSON çıkarılamadı: %r", response.text[:200])
            return _SAFE_RESULT

        return {
            "safe":     bool(raw.get("safe", True)),
            "severity": raw.get("severity", "low") if raw.get("severity") in ("low", "medium", "high") else "low",
            "reason":   str(raw.get("reason", ""))[:500],
        }
    except Exception as exc:
        logger.warning("Toksisite taraması başarısız (fail open): %s", exc)
        return _SAFE_RESULT
