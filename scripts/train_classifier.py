import os
import sys
import pickle
import asyncio
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sqlalchemy.future import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.models.models import Article
from ml_engine.processing.cleaner import NewsCleaner, signals_to_vector
from ml_engine.vectorizer import TurkishVectorizer



async def fetch_training_data_from_db():
    print("Fetching training data from PostgreSQL Database...")
    X_features = []
    y_labels   = []

    async with AsyncSessionLocal() as session:
        _VALID_STATUSES = (
            "Doğru", "DOĞRU", "doğru",
            "Yanlış", "YANLIŞ", "yanlış",
            "AUTHENTIC", "authentic",
            "FAKE", "fake",
            "TRUE", "true",
            "FALSE", "false",
        )
        stmt = select(Article).where(Article.status.in_(_VALID_STATUSES))
        result  = await session.execute(stmt)
        articles = result.scalars().all()

        cleaner    = NewsCleaner()
        vectorizer = TurkishVectorizer()

        for article in articles:
            status = str(article.status).strip().lower()

            if "yanlış" in status or "false" in status or "fake" in status:
                label = 1
            elif "doğru" in status or "true" in status or "authentic" in status:
                label = 0
            else:
                continue  # Bilinmeyen etiket — atla

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

            signal_source = article.raw_content or article.content or ""
            signals       = cleaner.extract_manipulative_signals(signal_source)
            signal_vec    = signals_to_vector(signals)

            feature_vector = embedding + signal_vec

            X_features.append(feature_vector)
            y_labels.append(label)

    return X_features, y_labels


def train_and_save_model(X_features, y_labels):
    print(f"\nExtracted {len(X_features)} valid samples from DB for training.")

    if len(X_features) < 10:
        print("Not enough data to train. Need at least 10 valid articles.")
        return

    X = np.array(X_features)   # (n, 776)
    y = np.array(y_labels)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = Pipeline([
        ("scaler", StandardScaler()),
        ("lr",     LogisticRegression(
            random_state=42,
            class_weight="balanced",
            max_iter=1000,
            C=1.0,
        )),
    ])

    print("\nTraining classifier on BERT embeddings + NLP signals (776 features)...")
    clf.fit(X_train, y_train)

    print("\n================ EVALUATION METRICS ================")
    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=["Authentic (0)", "Fake (1)"]))
    print("====================================================")
    print(f"Feature dimensions: {X.shape[1]} (768 BERT + 8 signals)")

    os.makedirs("ml_engine/models", exist_ok=True)
    model_path = "ml_engine/models/fake_news_classifier.pkl"

    with open(model_path, "wb") as f:
        pickle.dump(clf, f)

    print(f"\nModel (Pipeline) successfully trained and saved to {model_path}!")
    print("NOTE: Bu model 776-dim feature bekler. Inference'da tasks.py aynı")
    print("      feature vektörünü (embedding + signals_to_vector) kullanmalıdır.")


async def main():
    X_features, y_labels = await fetch_training_data_from_db()
    train_and_save_model(X_features, y_labels)


if __name__ == "__main__":
    asyncio.run(main())
