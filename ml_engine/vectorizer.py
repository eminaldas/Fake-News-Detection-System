import os
from typing import List, Optional

import requests as _requests

_TITLE_WEIGHT   = 0.60
_CONTENT_WEIGHT = 0.40


class TurkishVectorizer:
    """
    Metinleri 768 boyutlu vektöre çevirir.

    EMBEDDING_SERVICE_URL ortam değişkeni varsa HTTP microservice'e iletir;
    torch/sentence_transformers bu durumda hiç import edilmez.
    Yoksa yerel SentenceTransformer kullanır (FP16).
    """

    def __init__(self, model_name: str = None):
        self._zero = [0.0] * 768
        self._remote_url = os.getenv("EMBEDDING_SERVICE_URL", "").rstrip("/")
        if self._remote_url:
            self.device = None
            self.model  = None
            return

        # Lazy imports — remote modda bu kütüphaneler hiç yüklenmez
        import torch
        from sentence_transformers import SentenceTransformer
        from app.core.config import settings

        model_name  = model_name or settings.TRANSFORMER_MODEL
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model  = SentenceTransformer(model_name, device=self.device)
        self.model.half()  # FP32 → FP16: ~%40 daha az RAM

    def get_embedding(self, text: str) -> List[float]:
        if not text or not text.strip():
            return list(self._zero)
        if self._remote_url:
            resp = _requests.post(
                f"{self._remote_url}/embed",
                json={"text": text},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()["embedding"]
        return self.model.encode(text, convert_to_numpy=True).tolist()

    def get_weighted_embedding(
        self,
        content: str,
        title: Optional[str] = None,
        title_weight: float = _TITLE_WEIGHT,
        content_weight: float = _CONTENT_WEIGHT,
    ) -> List[float]:
        has_content = bool(content and content.strip())
        has_title   = bool(title and title.strip())

        if not has_content and not has_title:
            return list(self._zero)
        if not has_title:
            return self.get_embedding(content)
        if not has_content:
            return self.get_embedding(title)

        if self._remote_url:
            title_vec   = self.get_embedding(title)
            content_vec = self.get_embedding(content)
        else:
            vecs = self.model.encode(
                [title, content],
                convert_to_numpy=True,
                batch_size=2,
            )
            title_vec, content_vec = vecs[0].tolist(), vecs[1].tolist()

        return [
            title_weight * t + content_weight * c
            for t, c in zip(title_vec, content_vec)
        ]
