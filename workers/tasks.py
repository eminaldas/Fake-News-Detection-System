import os
import json
from celery import Celery
import asyncio
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.core.config import settings

from app.models.models import Article, AnalysisResult
from ml_engine.processing.cleaner import NewsCleaner
from ml_engine.vectorizer import TurkishVectorizer
import pickle

# Initialize Celery
celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Load NLP Models / Cleaners globally for the worker to reuse across tasks
cleaner = NewsCleaner()
vectorizer = TurkishVectorizer()

# Load ML Classifier if available
try:
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml_engine", "models", "fake_news_classifier.pkl")
    with open(model_path, "rb") as f:
        classifier_model = pickle.load(f)
    print("Loaded Fake News Classifier successfully.")
except Exception as e:
    print(f"Warning: Could not load classifier model. Ensure it is trained. Error: {e}")
    classifier_model = None

async def async_analyze_and_save(content_id: str, text: str) -> dict:
    """
    Handles the async database operations and ML classification pipeline.
    """
    # 1. Metin Temizleme ve Linguistik Bayrak Çıkarımı
    processed_data = cleaner.process(raw_iddia=text)
    signals = processed_data["signals"]
    cleaned_text = processed_data["cleaned_text"]
    raw_text = processed_data["original_text"]

    # 2. Vektör Çıkarımı (BERTurk)
    embedding = vectorizer.get_embedding(cleaned_text)

    # 3. YZ Sınıflandırma Modeli Tahmini (Classifier)
    # Ağırlıklı Sinyal (Kural Tabanlı) Risk Skoru
    risk_score = (signals.get("exclamation_ratio", 0) * 0.5) + (signals.get("uppercase_ratio", 0) * 0.5)

    if classifier_model and cleaned_text:
        try:
            proba = classifier_model.predict_proba([cleaned_text])[0]
            # proba[0] = class 0 (Authentic), proba[1] = class 1 (Fake)
            fake_prob = proba[1]
            max_prob = max(proba)
            
            # Hybrid Ensemble Mantığı: Eğer YZ modeli kelimeleri tanımadıysa
            # ve kararsız kaldıysa (%40-%60 arası), Kural tabanlı sisteme (Sinyallere) danış.
            if max_prob < 0.60 and risk_score > 0.03:
                status = "FAKE"
                # Sinyal gücüne göre confidence belirle (en az YZ'nin tahmini kadar göster)
                confidence = str(round(max(max_prob, min(risk_score * 10, 0.99)), 2))
            else:
                status = "FAKE" if fake_prob > 0.5 else "AUTHENTIC"
                confidence = str(round(max_prob, 2))
                
        except Exception as e:
            status = "UNKNOWN"
            confidence = "0.0"
            
    else:
        # Tamamen kural tabanlı Fallback:
        status = "FAKE" if risk_score > 0.05 else "AUTHENTIC"
        confidence = str(round(min(risk_score * 10, 0.99), 2))

    async with AsyncSessionLocal() as session:
        # Check if article exists first, or just create a new one if not linked
        # For this example, we assume we are creating a new Article record for every analysis
        new_article = Article(
            title=text[:50] + "..." if len(text) > 50 else text, # placeholder title
            raw_content=raw_text,
            content=cleaned_text,
            embedding=embedding,
            metadata_info={"task_id": content_id}
        )
        session.add(new_article)
        await session.flush() # uuid generation

        # Analysis Result oluştur
        analysis_res = AnalysisResult(
            article_id=new_article.id,
            status=status,
            confidence=confidence,
            signals=json.dumps(signals) # JSON string olarak kaydet
        )
        session.add(analysis_res)
        await session.commit()
        
        result = {
            "content_id": content_id,
            "status": "completed",
            "db_article_id": str(new_article.id),
            "prediction": status,
            "confidence": confidence,
            "signals": signals,
            "processed_text_length": len(cleaned_text)
        }
    
    return result

@celery_app.task(name="analyze_article", rate_limit=settings.CELERY_RATE_LIMIT)
def analyze_article(content_id: str, text: str) -> dict:
    """
    NLP Pipeline Görev Akışı:
    Ham Metin -> Temizlik -> Özellik Çıkarımı -> Vektörleme -> DB Kayıt
    """
        
    # Run the asyncio event loop within the sync Celery task
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(async_analyze_and_save(content_id, text))
    
    return result
