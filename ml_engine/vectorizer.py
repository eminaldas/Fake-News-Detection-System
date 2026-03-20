from typing import List
import torch
from sentence_transformers import SentenceTransformer
from app.core.config import settings

class TurkishVectorizer:
    """
    SentenceTransformers kullanarak metinleri
    vektör uzayına (embeddings) çeviren sınıf.
    """

    def __init__(self, model_name: str = None):
        model_name = model_name or settings.TRANSFORMER_MODEL
        # CPU veya GPU cihazını ayarla
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        # SentenceTransformer modelini yükle
        # Bu model, özel pooling stratejileriyle tümce vektörlerini doğrudan çıkarır.
        self.model = SentenceTransformer(model_name, device=self.device)

    def get_embedding(self, text: str) -> List[float]:
        """
        Verilen temizlenmiş metni alır ve SentenceTransformer üzerinden 768 boyutlu
        vektör olarak geri döner.
        """
        if not text or not text.strip():
            # Boş metin için 768 boyutlu sıfır vektörü dön
            return [0.0] * 768
            
        # Modeli kullanarak embedding işlemini gerçekleştir
        # SentenceTransformer doğrudan np.ndarray veya torch.Tensor dönebilir.
        embeddings = self.model.encode(text, convert_to_numpy=True)
        
        # Numpy array'i standart Python List[float] formatına çevir
        return embeddings.tolist()

