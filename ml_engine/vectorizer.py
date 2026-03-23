from typing import List, Optional
import torch
from sentence_transformers import SentenceTransformer
from app.core.config import settings

# Başlık/içerik ağırlıkları — başlık, sahte haberin odak noktasıdır
_TITLE_WEIGHT   = 0.60
_CONTENT_WEIGHT = 0.40


class TurkishVectorizer:
    """
    SentenceTransformers kullanarak metinleri
    vektör uzayına (embeddings) çeviren sınıf.

    Tek metin için get_embedding, başlık+içerik çifti için
    get_weighted_embedding kullanılır.
    """

    def __init__(self, model_name: str = None):
        model_name = model_name or settings.TRANSFORMER_MODEL
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model  = SentenceTransformer(model_name, device=self.device)
        self._zero  = [0.0] * 768   # önbellek — sıfır vektörü

    def get_embedding(self, text: str) -> List[float]:
        """
        Tek metin → 768 boyutlu vektör.
        Geriye dönük uyumluluk için korunur.
        """
        if not text or not text.strip():
            return list(self._zero)
        return self.model.encode(text, convert_to_numpy=True).tolist()

    def get_weighted_embedding(
        self,
        content: str,
        title: Optional[str] = None,
        title_weight: float = _TITLE_WEIGHT,
        content_weight: float = _CONTENT_WEIGHT,
    ) -> List[float]:
        """
        Başlık ve içerik ayrı embed edildikten sonra ağırlıklı ortalamayla
        birleştirilir.

        Neden ayrı embed edilir?
          Sahte haberlerde manipülasyon çoğunlukla başlıkta yoğunlaşır;
          içerik ise daha nötr görünebilir. Başlığa daha yüksek ağırlık
          vermek bu farkı modele yansıtır.

        title yoksa (URL analizi gibi) yalnızca içerik embedding'i döner.
        """
        has_content = bool(content and content.strip())
        has_title   = bool(title and title.strip())

        if not has_content and not has_title:
            return list(self._zero)

        if not has_title:
            # Başlık yok — sadece içerik
            return self.get_embedding(content)

        if not has_content:
            # İçerik yok — sadece başlık
            return self.get_embedding(title)

        # Her ikisi de var — toplu encode (tek model çağrısı, daha verimli)
        vecs = self.model.encode(
            [title, content],
            convert_to_numpy=True,
            batch_size=2,
        )
        title_vec, content_vec = vecs[0], vecs[1]

        # Ağırlıklı toplam
        weighted = [
            title_weight * t + content_weight * c
            for t, c in zip(title_vec.tolist(), content_vec.tolist())
        ]
        return weighted

