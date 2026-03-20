import re
import math
from typing import Dict, Any

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
        Ham metin üzerinden manipülatif sinyalleri (örn: ünlem yoğunluğu,
        büyük harf kullanımı) hesaplar.
        """
        if not original_text:
            return {
                "exclamation_ratio": 0.0,
                "uppercase_ratio": 0.0,
                "question_density": 0.0,
                "length": 0
            }

        length = len(original_text)
        
        # Ünlem ve soru işareti yoğunluğu
        exclamation_count = original_text.count('!')
        question_count = original_text.count('?')
        
        # Büyük harf oranı — yalnızca alfabetik karakterler paydaya girer;
        # boşluk/rakam/noktalama sinyali seyrelteceği için hariç tutulur.
        alpha_chars = [c for c in original_text if c.isalpha()]
        alpha_count = len(alpha_chars)
        uppercase_count = sum(1 for c in alpha_chars if c.isupper())

        return {
            "exclamation_ratio": round(exclamation_count / length, 4) if length > 0 else 0.0,
            "uppercase_ratio": round(uppercase_count / alpha_count, 4) if alpha_count > 0 else 0.0,
            "question_density": round(question_count / length, 4) if length > 0 else 0.0,
            "length": length
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
