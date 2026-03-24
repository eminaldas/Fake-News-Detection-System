import re
import math
from typing import Dict, Any

def _turkish_lower(text: str) -> str:
    """
    Python'un standart .lower() metodu Türkçe büyük İ'yi 'i\u0307' (i + birleştirici
    nokta) olarak çevirir; bu 'i' ile eşleşmez. Bu fonksiyon büyük harften bağımsız
    Türkçe metin karşılaştırması için kullanılır.
    """
    return text.replace("İ", "i").replace("I", "ı").lower()


# ── Sabit sinyal sırası — eğitim ve inference'da aynı order zorunlu ──────────
# Bu listeye yeni sinyal eklenirse train_classifier.py yeniden çalıştırılmalıdır.
SIGNAL_KEYS = [
    "exclamation_ratio",
    "uppercase_ratio",
    "question_density",
    "clickbait_score",
    "hedge_ratio",
    "source_score",
    "avg_word_length",
    "number_density",
]

# avg_word_length [0, ~15] aralığında; diğer sinyaller [0, 1].
# Normalizer LogisticRegression'ın ölçek hassasiyetini giderir.
_AVG_WORD_LEN_NORM = 10.0


def signals_to_vector(signals: dict) -> list:
    """
    Sinyal dict'ini SIGNAL_KEYS sırasına göre sabit boyutlu float listesine çevirir.
    avg_word_length [0,1] aralığına normalize edilir.
    Eksik anahtar varsa 0.0 ile doldurulur.
    """
    vec = []
    for key in SIGNAL_KEYS:
        val = float(signals.get(key, 0.0))
        if key == "avg_word_length":
            val = val / _AVG_WORD_LEN_NORM
        vec.append(val)
    return vec


# ── Clickbait / sensasyon / komplo kelimeleri (Türkçe) ─────────────────────
_CLICKBAIT_WORDS = {
    # Doğrudan sensasyon
    "şok", "şokta", "şoke", "inanılmaz", "bomba", "flaş", "flash",
    "son dakika", "acil", "dikkat", "uyarı", "tehlike", "skandal",
    "rezalet", "utanç", "ibret", "lanet", "dehşet", "korkunç",
    "müthiş", "tarihi", "efsane", "çarpıcı", "ezber bozan",
    "herkesi şoke etti", "kimse bilmiyordu", "gizlenen gerçek",
    "saklanıyor", "ortaya çıktı", "ifşa",
    # Komplo / gizleme dili
    "yıllarca sakladı", "yıllardır sakladı", "yıllarca gizledi",
    "yıllardır gizliyor", "gerçeği sakladı", "gerçeği gizledi",
    "ana akım medya", "sansürlüyor", "sansürlendi", "sansür",
    "kimse söylemiyor", "söyleyemiyorlar", "söyletmiyorlar",
    "aslında ne oldu", "gerçek ortaya çıktı", "perde arkası",
    "kamuoyundan gizlenen", "devlet gizliyor",
}

# ── Belirsizlik / anonim kaynak kelimeleri (hedge words) ────────────────────
_HEDGE_WORDS = {
    # Kaynak belirsizliği
    "iddia", "iddiaya göre", "iddia edildi", "iddia ediyor",
    "söyleniyor", "söylentiye göre", "belirtildi", "öne sürüldü",
    "öne sürüyor", "ileri sürüldü", "aktarıldı", "bildirildi",
    "anlaşıldı", "öğrenildi", "tahmin ediliyor", "bekleniyor",
    "sanılıyor", "zannediliyor", "görünüyor", "gibi görünüyor",
    # Anonim kaynak kalıpları
    "yakın çevresi", "yakın kaynaklar", "kaynaklar belirtiyor",
    "kulislerde", "iç kulislere göre", "kulislerde konuşuluyor",
    "çevre kaynaklara göre", "isimsiz kaynaklar", "kaynaklar aktardı",
}

# ── Kaynak güvenilirlik sinyali kelimeleri ─────────────────────────────────
_SOURCE_KEYWORDS = {
    "kaynak", "açıkladı", "dedi ki", "söyledi", "belirtti",
    "açıklamasında", "röportajında", "basın toplantısında",
    "resmi açıklama", "aa", "trt", "cumhurbaşkanlığı", "bakanlık",
    "araştırmaya göre", "rapora göre", "verilerine göre",
}


class NewsCleaner:
    def __init__(self):
        # UI temizliği için hedef metin
        self.ui_artifact_text = "Etkileşim penceresinin başlangıcı. ESC tuşu işlemi iptal edip pencereyi kapatacaktır."

    @staticmethod
    def _is_missing(value: Any) -> bool:
        return value is None or (isinstance(value, float) and math.isnan(value))

    def clean_ui_artifacts(self, text: str) -> str:
        """detayli_analiz sütunundaki UI artifact metnini siler."""
        if not text or self._is_missing(text):
            return text
        return text.replace(self.ui_artifact_text, "").strip()

    def clean_links(self, text: str) -> str:
        """iddia sütunundaki kısa linkleri (örn. https://t.co/...) regex ile temizler."""
        if not text or self._is_missing(text):
            return text
        # Linkleri temizle
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        # Fazla boşlukları düzelt
        return re.sub(r'\s+', ' ', text).strip()

    def handle_nan(self, value: Any) -> str:
        """Eksik veri (NaN) olan alanları 'Bilgi mevcut değil' olarak işaretler."""
        if self._is_missing(value) or str(value).strip().lower() == "nan":
            return "Bilgi mevcut değil"
        return str(value).strip()

    # NOT: Türkçe karakterler korunur ve Stemming (kök bulma) işlemi kasıtlı olarak yapılmaz 
    # (BERT'in anlam çıkarabilmesi için ekler ve kökler metinde bırakılır).

    def extract_manipulative_signals(self, original_text: str) -> Dict[str, Any]:
        """
        Ham metin üzerinden manipülatif ve güvenilirlik sinyallerini hesaplar.

        Sinyaller:
          Orijinal (3):
            exclamation_ratio  — ünlem yoğunluğu
            uppercase_ratio    — büyük harf oranı (alfa karakterler içinde)
            question_density   — soru işareti yoğunluğu

          Yeni (5):
            clickbait_score    — sensasyon/clickbait kelime yoğunluğu (0-1)
            hedge_ratio        — belirsizlik/kaynak-belirsizliği kelime yoğunluğu
            source_score       — güvenilir kaynak referansı yoğunluğu
            avg_word_length    — ortalama kelime uzunluğu (kısa → sensasyonel)
            number_density     — rakam/sayı yoğunluğu (yüksek → manipülatif olabilir)
        """
        if not original_text:
            return {
                "exclamation_ratio": 0.0,
                "uppercase_ratio":   0.0,
                "question_density":  0.0,
                "clickbait_score":   0.0,
                "hedge_ratio":       0.0,
                "source_score":      0.0,
                "avg_word_length":   0.0,
                "number_density":    0.0,
                "length": 0,
                "triggered_words": {"clickbait": [], "hedge": [], "source": []},
            }

        text_lower = _turkish_lower(original_text)
        length     = len(original_text)

        # ── Orijinal sinyaller ─────────────────────────────────────────────
        exclamation_count = original_text.count('!')
        question_count    = original_text.count('?')

        alpha_chars    = [c for c in original_text if c.isalpha()]
        alpha_count    = len(alpha_chars)
        uppercase_count = sum(1 for c in alpha_chars if c.isupper())

        # ── Kelime düzeyinde hazırlık ──────────────────────────────────────
        words = text_lower.split()
        word_count = len(words) or 1  # sıfıra bölünme koruması

        # ── Clickbait skoru ───────────────────────────────────────────────
        # Her clickbait ifadesinin metinde geçiş sayısını topla; kelime
        # sayısına normalize et. Çok kelimeli ifadeler de aranır.
        clickbait_hits = sum(
            1 for phrase in _CLICKBAIT_WORDS if phrase in text_lower
        )
        clickbait_score = round(min(clickbait_hits / word_count, 1.0), 4)

        # ── Hedge (belirsizlik) oranı ─────────────────────────────────────
        hedge_hits  = sum(1 for phrase in _HEDGE_WORDS if phrase in text_lower)
        hedge_ratio = round(min(hedge_hits / word_count, 1.0), 4)

        # ── Kaynak güvenilirlik skoru ─────────────────────────────────────
        source_hits  = sum(1 for phrase in _SOURCE_KEYWORDS if phrase in text_lower)
        source_score = round(min(source_hits / word_count, 1.0), 4)

        # ── Ortalama kelime uzunluğu ──────────────────────────────────────
        # Boşluk hariç kelimelerin karakter ortalaması.
        # Clickbait/sensasyon haberleri genelde kısa kelimeler kullanır.
        avg_word_length = round(
            sum(len(w) for w in words) / word_count, 4
        )

        # ── Rakam yoğunluğu ───────────────────────────────────────────────
        digit_count    = sum(1 for c in original_text if c.isdigit())
        number_density = round(digit_count / length, 4) if length > 0 else 0.0

        # ── Triggered words — substring arama (çok kelimeli ifadeler dahil) ─────────
        # Uzun ifadeler önce aranır (greedy matching: "son dakika haberi" > "son dakika")
        triggered_clickbait = sorted(
            [phrase for phrase in _CLICKBAIT_WORDS if phrase in text_lower],
            key=len, reverse=True
        )
        triggered_hedge = sorted(
            [phrase for phrase in _HEDGE_WORDS if phrase in text_lower],
            key=len, reverse=True
        )
        triggered_source = sorted(
            [phrase for phrase in _SOURCE_KEYWORDS if phrase in text_lower],
            key=len, reverse=True
        )

        return {
            "exclamation_ratio": round(exclamation_count / length, 4) if length > 0 else 0.0,
            "uppercase_ratio":   round(uppercase_count / alpha_count, 4) if alpha_count > 0 else 0.0,
            "question_density":  round(question_count / length, 4) if length > 0 else 0.0,
            "clickbait_score":   clickbait_score,
            "hedge_ratio":       hedge_ratio,
            "source_score":      source_score,
            "avg_word_length":   avg_word_length,
            "number_density":    number_density,
            "length": length,
            "triggered_words": {
                "clickbait": triggered_clickbait,
                "hedge":     triggered_hedge,
                "source":    triggered_source,
            },
        }

    def process(self, raw_iddia: Any, detayli_analiz_raw: Any = None) -> Dict[str, Any]:
        """
        Gelen CSV metinlerini işler. URL temizliği ve eksik veri yönetimi uygulanır.
        """
        # Ham iddia metninde NaN/Null kontrolü -> ardından sadece string işleme
        iddia_text = self.handle_nan(raw_iddia)
        if iddia_text == "Bilgi mevcut değil":
            cleaned_iddia = iddia_text
            signals = self.extract_manipulative_signals("") # Sinyal yok
        else:
            cleaned_iddia = self.clean_links(iddia_text)
            signals = self.extract_manipulative_signals(iddia_text)
            
        # Detaylı analiz metninde UI artifact temizliği
        cleaned_detayli = self.clean_ui_artifacts(self.handle_nan(detayli_analiz_raw)) if detayli_analiz_raw is not None else None
        
        return {
            "original_text": iddia_text,
            "cleaned_text": cleaned_iddia,
            "cleaned_detayli_analiz": cleaned_detayli,
            "signals": signals
        }
