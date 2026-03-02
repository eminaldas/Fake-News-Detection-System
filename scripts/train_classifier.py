import pandas as pd
import pickle
import os
import sys
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Add project root to sys path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml_engine.processing.cleaner import NewsCleaner

def train_and_save_model(csv_path="Data/teyit_final_x_dataset.csv"):
    print(f"Loading dataset from {csv_path} for training...")
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: Could not find {csv_path}. Make sure the path is correct.")
        return

    cleaner = NewsCleaner()
    
    X_texts = []
    y_labels = []

    print("Cleaning and extracting features from dataset...")
    for index, row in df.iterrows():
        processed_data = cleaner.process(raw_iddia=row.get('iddia'))
        text = processed_data["cleaned_text"]
        
        # Skip empty or "Bilgi mevcut değil" texts
        if not text or text == "Bilgi mevcut değil":
            continue
            
        status = str(row.get('dogruluk_etiketi', '')).strip().lower()
        
        # Binary classification mapping
        # False/Yanlış -> 1 (Fake)
        # True/Doğru -> 0 (Authentic)
        if "yanlış" in status or "false" in status:
            label = 1
        elif "doğru" in status or "true" in status:
            label = 0
        else:
            continue # Skip unknown labels for clear training
            
        X_texts.append(text)
        y_labels.append(label)

    print(f"Extracted {len(X_texts)} valid samples for training.")
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X_texts, y_labels, test_size=0.2, random_state=42)
    
    # Create an ML Pipeline: TF-IDF -> Logistic Regression
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=5000, ngram_range=(1, 2))),
        ('clf', LogisticRegression(random_state=42, class_weight='balanced'))
    ])
    
    print("Training model...")
    pipeline.fit(X_train, y_train)
    
    print("\nEvaluating model on test data:")
    y_pred = pipeline.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=["Authentic (0)", "Fake (1)"]))
    
    # Ensure directory exists
    os.makedirs("ml_engine/models", exist_ok=True)
    model_path = "ml_engine/models/fake_news_classifier.pkl"
    
    with open(model_path, "wb") as f:
        pickle.dump(pipeline, f)
        
    print(f"Model successfully saved to {model_path}!")

if __name__ == "__main__":
    import sys
    csv_file = "Data/teyit_final_x_dataset.csv"
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
    train_and_save_model(csv_file)
