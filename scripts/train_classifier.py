import os
import sys
import pickle
import asyncio
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sqlalchemy.future import select
from sqlalchemy import cast
from sqlalchemy.dialects.postgresql import JSONB

# Add project root to sys path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.models.models import Article
from ml_engine.processing.cleaner import NewsCleaner
from ml_engine.vectorizer import TurkishVectorizer

async def fetch_training_data_from_db():
    print("Fetching training data from PostgreSQL Database...")
    X_embeddings = []
    y_labels = []

    async with AsyncSessionLocal() as session:
        # Yalnızca ingest edilmiş (kaynaklı) article'ları al.
        # tasks.py tarafından oluşturulan analiz kayıtlarını eğitime dahil etmiyoruz;
        # aksi hâlde model kendi tahminleri üzerine eğitilerek bias döngüsü oluşur.
        stmt = select(Article).where(
            Article.metadata_info.op("->>")(  "source").isnot(None)
        )
        result = await session.execute(stmt)
        articles = result.scalars().all()

        cleaner = NewsCleaner()
        vectorizer = TurkishVectorizer()

        for article in articles:
            status = str(article.status).strip().lower()

            if "yanlış" in status or "false" in status or "fake" in status:
                label = 1
            elif "doğru" in status or "true" in status or "authentic" in status:
                label = 0
            else:
                continue  # Skip unknown labels

            # Reuse stored embedding if available, otherwise compute
            if article.embedding is not None:
                embedding = list(article.embedding)
            else:
                try:
                    processed = cleaner.process(raw_iddia=article.content)
                    text = processed["cleaned_text"]
                except Exception:
                    text = article.content

                if not text or text == "Bilgi mevcut değil":
                    continue

                embedding = vectorizer.get_embedding(text)

            X_embeddings.append(embedding)
            y_labels.append(label)

    return X_embeddings, y_labels

def train_and_save_model(X_embeddings, y_labels):
    print(f"\nExtracted {len(X_embeddings)} valid samples from DB for training.")

    if len(X_embeddings) < 10:
        print("Not enough data to train. Need at least 10 valid articles.")
        return

    X = np.array(X_embeddings)
    y = np.array(y_labels)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    clf = LogisticRegression(random_state=42, class_weight='balanced', max_iter=1000)

    print("\nTraining classifier on BERT embeddings...")
    clf.fit(X_train, y_train)

    print("\n================ EVALUATION METRICS ================")
    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=["Authentic (0)", "Fake (1)"]))
    print("====================================================")

    os.makedirs("ml_engine/models", exist_ok=True)
    model_path = "ml_engine/models/fake_news_classifier.pkl"

    with open(model_path, "wb") as f:
        pickle.dump(clf, f)

    print(f"\nModel successfully trained and saved to {model_path}!")

async def main():
    X_embeddings, y_labels = await fetch_training_data_from_db()
    train_and_save_model(X_embeddings, y_labels)

if __name__ == "__main__":
    asyncio.run(main())
