"""
Türkçe haber metinleri için stilometrik risk analizi.
Metin büyük harfe çevrilerek (Turkish-safe .upper()) kalıplarla eşleştirilir.

Döndürülen sözlük:
  clickbait_score  — manşet/sensasyonalizm yoğunluğu  (0-1)
  fear_score       — korku/tehlike kelime yoğunluğu    (0-1)
  absolute_score   — mutlak/abartılı dil yoğunluğu    (0-1)
  style_score      — ağırlıklı bileşik skor            (0-1, yüksek = manipülatif)
"""

import re
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Kalıp listeleri (büyük harf Türkçe)
# ---------------------------------------------------------------------------

CLICKBAIT_PATTERNS = [
    r"\bŞOK\b", r"\bFLAŞ\b", r"\bBOMBA\b", r"\bSKANDAL\b",
    r"\bİNANILMAZ\b", r"\bSON DAKİKA\b", r"\bACİL\b",
    r"\bGİZLİ\b", r"\bYASAK\b", r"\bSIR\b", r"\bİFŞA\b",
    r"\bKAN DONDURUCU\b", r"\bAKIL ALMAZ\b", r"\bHAYRET\b",
    r"\bGERÇEK ORTAYA ÇIKTI\b", r"\bİŞTE O AN\b",
    r"\bHERKES\b.{0,20}\bŞAŞIRDI\b",
    r"\bKİMSENİN BİLMEDİĞİ\b",
    r"\bBU HABERE BAKMAYANLAR\b",
]

FEAR_URGENCY_PATTERNS = [
    r"\bKRİZ\b", r"\bFELAKET\b", r"\bKATLİAM\b", r"\bYIKIM\b",
    r"\bÖLDÜRÜCÜ\b", r"\bÖLÜM\b", r"\bÇÖKÜŞ\b", r"\bPANİK\b",
    r"\bKORKU\b", r"\bKAOS\b", r"\bTEHDİT\b", r"\bSALDIRI\b",
    r"\bSAVAŞ\b", r"\bAFET\b", r"\bACİL DURUM\b",
    r"\bHAYATİ TEHLİKE\b", r"\bNÜKLEER\b", r"\bBOMBALAMA\b",
    r"\bTRAJEDİ\b", r"\bFACİA\b",
]

ABSOLUTE_PATTERNS = [
    r"\bEN BÜYÜK\b", r"\bEN KÖTÜ\b", r"\bEN İYİ\b",
    r"\bHİÇBİR ZAMAN\b", r"\bHER ZAMAN\b", r"\bTAMAMEN\b",
    r"\bKESİNLİKLE\b", r"\bTARİHİN EN\b", r"\bDÜNYANIN EN\b",
    r"\bMUTLAKA\b", r"\bASLA\b", r"\bDAİMA\b",
    r"\bHİÇKİMSE\b", r"\bEŞSİZ\b", r"\bBENZERSİZ\b",
    r"\bHİÇ GÖRÜLMEM\w*\b", r"\bİLK KEZ\b",
]

# Bileşik ağırlıklar
_W_CLICKBAIT = 0.50
_W_FEAR = 0.30
_W_ABSOLUTE = 0.20

# Normalleştirme eşikleri: bu kadar hit → skor = 1.0
_NORM_CLICKBAIT = 3
_NORM_FEAR = 4
_NORM_ABSOLUTE = 5


def _compile(patterns: list) -> list:
    compiled = []
    for p in patterns:
        try:
            compiled.append(re.compile(p))
        except re.error as e:
            logger.warning("Geçersiz regex atlandı '%s': %s", p, e)
    return compiled


_C_CLICKBAIT = _compile(CLICKBAIT_PATTERNS)
_C_FEAR = _compile(FEAR_URGENCY_PATTERNS)
_C_ABSOLUTE = _compile(ABSOLUTE_PATTERNS)


def _hits(text_upper: str, compiled: list) -> int:
    return sum(1 for p in compiled if p.search(text_upper))


class TurkishStylometrics:
    def analyse(self, text: str) -> Dict[str, float]:
        """
        Ham Türkçe metni analiz eder, stilometrik risk sinyallerini döndürür.
        """
        if not text or not text.strip():
            return {"clickbait_score": 0.0, "fear_score": 0.0,
                    "absolute_score": 0.0, "style_score": 0.0}

        t = text.upper()

        clickbait_score = min(_hits(t, _C_CLICKBAIT) / _NORM_CLICKBAIT, 1.0)
        fear_score = min(_hits(t, _C_FEAR) / _NORM_FEAR, 1.0)
        absolute_score = min(_hits(t, _C_ABSOLUTE) / _NORM_ABSOLUTE, 1.0)

        style_score = (
            clickbait_score * _W_CLICKBAIT +
            fear_score * _W_FEAR +
            absolute_score * _W_ABSOLUTE
        )

        return {
            "clickbait_score": round(clickbait_score, 4),
            "fear_score": round(fear_score, 4),
            "absolute_score": round(absolute_score, 4),
            "style_score": round(style_score, 4),
        }
