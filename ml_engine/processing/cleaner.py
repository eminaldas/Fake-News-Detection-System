import re
import math
from typing import Dict, Any

_AA_AGENCY_PATTERN = re.compile(r'(?<![A-ZÇĞÜŞÖİa-zçğüşöıi])AA(?![A-ZÇĞÜŞÖİa-zçğüşöıi])')

def _turkish_lower(text: str) -> str:
    """
    Python'un standart .lower() metodu Türkçe büyük İ'yi 'i\u0307' (i + birleştirici
    nokta) olarak çevirir; bu 'i' ile eşleşmez. Bu fonksiyon büyük harften bağımsız
    Türkçe metin karşılaştırması için kullanılır.
    """
    return text.replace("İ", "i").replace("I", "ı").lower()


SIGNAL_KEYS = [
    "exclamation_ratio",
    "caps_ratio",           # uppercase_ratio yerine
    "question_density",
    "clickbait_score",
    "hedge_ratio",
    "source_score",
    "avg_word_length",
    "number_density",
]

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


_CLICKBAIT_WORDS = {
    "şok", "şokta", "şoke", "inanılmaz", "bomba", "flaş", "flash",
    "son dakika", "skandal",
    "rezalet", "utanç", "ibret", "lanet", "dehşet", "korkunç",
    "müthiş", "tarihi", "efsane", "çarpıcı", "ezber bozan",
    "herkesi şoke etti", "kimse bilmiyordu", "gizlenen gerçek",
    "saklanıyor", "ortaya çıktı", "ifşa",
    "yıllarca sakladı", "yıllardır sakladı", "yıllarca gizledi",
    "yıllardır gizliyor", "gerçeği sakladı", "gerçeği gizledi",
    "gizleniyor",  # örtbas içeren metinlerde genel gizleme fiili
    "örtbas",      # yıllardır gizleniyor/örtbas ediyor gibi örüntüleri yakalar
    "ana akım medya", "sansürlüyor", "sansürlendi", "sansür",
    "kimse söylemiyor", "söyleyemiyorlar", "söyletmiyorlar",
    "aslında ne oldu", "gerçek ortaya çıktı", "perde arkası",
    "kamuoyundan gizlenen", "devlet gizliyor",
    "dikkat", "uyarı", "tehlike", "alarm", "acil",
    "kritik uyarı", "son dakika uyarısı",
    "kimse beklemiyordu", "sürpriz karar", "beklenmedik gelişme",
    "herkes bunu konuşuyor", "viral oldu", "gündem oldu",
    "sosyal medyayı salladı", "olay yarattı",
    "tarihi karar", "devrim niteliğinde", "çığır açan",
    "rekor kırdı", "benzeri görülmemiş",
    "hain", "satılmış", "yalancı", "terörist",
}

_HEDGE_WORDS = {
    "iddia", "iddiaya göre", "iddia edildi", "iddia ediyor",
    "söyleniyor", "söylentiye göre", "belirtildi", "öne sürüldü",
    "öne sürüyor", "ileri sürüldü", "aktarıldı", "bildirildi",
    "anlaşıldı", "öğrenildi", "tahmin ediliyor", "bekleniyor",
    "sanılıyor", "zannediliyor", "görünüyor", "gibi görünüyor",
    "yakın çevresi", "yakın kaynaklar", "kaynaklar belirtiyor",
    "kulislerde", "iç kulislere göre", "kulislerde konuşuluyor",
    "çevre kaynaklara göre", "isimsiz kaynaklar", "kaynaklar aktardı",
}

_SOURCE_KEYWORDS = {
    "kaynak", "açıkladı", "dedi ki", "söyledi", "belirtti",
    "açıklamasında", "röportajında", "basın toplantısında",
    "resmi açıklama", "anadolu ajansı", "trt", "cumhurbaşkanlığı", "bakanlık",
    "araştırmaya göre", "rapora göre", "verilerine göre",
}


class NewsCleaner:
    def __init__(self):
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
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        return re.sub(r'\s+', ' ', text).strip()

    def handle_nan(self, value: Any) -> str:
        """Eksik veri (NaN) olan alanları 'Bilgi mevcut değil' olarak işaretler."""
        if self._is_missing(value) or str(value).strip().lower() == "nan":
            return "Bilgi mevcut değil"
        return str(value).strip()


    def extract_manipulative_signals(self, original_text: str, trust_score: float = 0.0) -> Dict[str, Any]:
        """
        Ham metin üzerinden manipülatif ve güvenilirlik sinyallerini hesaplar.

        Sinyaller:
          Orijinal (3):
            exclamation_ratio  — ünlem yoğunluğu
            caps_ratio         — büyük harf oranı (alfa karakterler içinde)
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
                "caps_ratio":        0.0,
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

        exclamation_count = original_text.count('!')
        question_count    = original_text.count('?')

        words = text_lower.split()
        word_count = len(words) or 1  # sıfıra bölünme koruması

        orig_words     = original_text.split()
        all_caps_words = [w for w in orig_words if len(w) > 1 and w.isupper()]
        caps_ratio     = round(len(all_caps_words) / word_count, 4)

        clickbait_hits = sum(
            1 for phrase in _CLICKBAIT_WORDS if phrase in text_lower
        )
        clickbait_score = round(min(clickbait_hits / word_count, 1.0), 4)

        hedge_hits  = sum(1 for phrase in _HEDGE_WORDS if phrase in text_lower)
        hedge_ratio = 0.0 if trust_score >= 0.9 else round(min(hedge_hits / word_count, 1.0), 4)

        aa_hits      = len(_AA_AGENCY_PATTERN.findall(original_text))
        source_hits  = aa_hits + sum(1 for phrase in _SOURCE_KEYWORDS if phrase in text_lower)
        source_score = round(min(source_hits / word_count, 1.0), 4)

        avg_word_length = round(
            sum(len(w) for w in words) / word_count, 4
        )

        digit_count    = sum(1 for c in original_text if c.isdigit())
        number_density = round(digit_count / length, 4) if length > 0 else 0.0

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
            "caps_ratio":        caps_ratio,
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
        iddia_text = self.handle_nan(raw_iddia)
        if iddia_text == "Bilgi mevcut değil":
            cleaned_iddia = iddia_text
            signals = self.extract_manipulative_signals("") # Sinyal yok
        else:
            cleaned_iddia = self.clean_links(iddia_text)
            signals = self.extract_manipulative_signals(iddia_text)
            
        cleaned_detayli = self.clean_ui_artifacts(self.handle_nan(detayli_analiz_raw)) if detayli_analiz_raw is not None else None
        
        return {
            "original_text": iddia_text,
            "cleaned_text": cleaned_iddia,
            "cleaned_detayli_analiz": cleaned_detayli,
            "signals": signals
        }


_SERVICE_SCHEDULE_PATTERNS = [
    re.compile(r'\bsaat kaçta\b'),
    re.compile(r'\bhangi kanalda\b'),
    re.compile(r'\bmuhtemel 11\b'),
    re.compile(r'\bcanlı izle\b'),
]

_SERVICE_PROGRAM_PATTERNS = [
    re.compile(r'\byeni bölüm\b'),
    re.compile(r'\bfragman\b'),
    re.compile(r'\byayın akışı\b'),
]

_SERVICE_TRIVIA_PATTERNS = [
    re.compile(r'\bburç\b'),
    re.compile(r'\bhava durumu\b'),
    re.compile(r'\bloto sonuç'),
    re.compile(r'\bpiyango\b'),
    re.compile(r'\bçekiliş\b'),
    re.compile(r'\bat yarışı\b'),
]

_PRACTICAL_INFO_PATTERNS = [
    re.compile(r'\bne zaman yatacak\b'),
    re.compile(r'\bsonuçları açıkland'),
    re.compile(r'\bsınav sonuç'),
    re.compile(r'\bbaşvuru\b'),
    re.compile(r'\be-devlet\b'),
]

_SCHEDULE_CATEGORIES = {"spor"}
_PROGRAM_CATEGORIES  = {"kültür", "yaşam"}


def _classify_content_type(title: str, category: str | None) -> list[str] | None:
    """
    Başlığı düşük editoryal değerli servis/trivia türlerine göre etiketler.
    Kategori sırasıyla kontrol edilir, ilk eşleşen döner. Hiçbiri eşleşmezse
    None (normal haber — mevcut davranış).
    """
    if not title:
        return None

    text = _turkish_lower(title)

    if category in _SCHEDULE_CATEGORIES:
        if any(p.search(text) for p in _SERVICE_SCHEDULE_PATTERNS):
            return ["service_schedule"]

    if category in _PROGRAM_CATEGORIES:
        if any(p.search(text) for p in _SERVICE_PROGRAM_PATTERNS):
            return ["service_program"]

    if any(p.search(text) for p in _SERVICE_TRIVIA_PATTERNS):
        return ["service_trivia"]

    if any(p.search(text) for p in _PRACTICAL_INFO_PATTERNS):
        return ["practical_info"]

    return None
