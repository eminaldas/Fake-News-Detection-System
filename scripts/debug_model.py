import pickle
import numpy as np
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_engine.processing.cleaner import NewsCleaner

model_path = 'ml_engine/models/fake_news_classifier.pkl'
print(f"Loading {model_path}...")
model = pickle.load(open(model_path, 'rb'))

tfidf = model.named_steps['tfidf']
clf = model.named_steps['clf']
feature_names = np.array(tfidf.get_feature_names_out())
sorted_coef_index = clf.coef_[0].argsort()

print("\n--- TOP 15 FAKE (1) INDICATORS ---")
for idx in sorted_coef_index[-15:][::-1]:
    print(f"{feature_names[idx]}: {clf.coef_[0][idx]:.4f}")

print("\n--- TOP 15 AUTHENTIC (0) INDICATORS ---")
for idx in sorted_coef_index[:15]:
    print(f"{feature_names[idx]}: {clf.coef_[0][idx]:.4f}")

text = "Türkiye Cumhuriyet Merkez Bankası (TCMB) Para Politikası Kurulu, politika faizi olan bir hafta vadeli repo ihale faiz oranını değişiklik yapmayarak yüzde 50 düzeyinde sabit tuttu. Kurul kararında, enflasyon beklentileri ve fiyatlama davranışlarının dezenflasyon süreci açısından yakından takip edilmesine devam edileceği vurgulandı."

cleaner = NewsCleaner()
cleaned_text = cleaner.process(raw_iddia=text)['cleaned_text']

print("\n--- SAMPLE TEXT ANALYSIS ---")
print("Cleaned text:", cleaned_text)
probas = model.predict_proba([cleaned_text])[0]
print(f"Probability Authentic (0): {probas[0]:.4f}")
print(f"Probability Fake (1): {probas[1]:.4f}")

# Let's see which words in the text triggered what
vectorized = tfidf.transform([cleaned_text]).toarray()[0]
active_features = np.where(vectorized > 0)[0]

print("\n--- WORD CONTRIBUTIONS FOR THIS TEXT ---")
contributions = []
for idx in active_features:
    word = feature_names[idx]
    coef = clf.coef_[0][idx]
    tfidf_val = vectorized[idx]
    contrib = coef * tfidf_val
    contributions.append((word, coef, tfidf_val, contrib))

contributions.sort(key=lambda x: x[3], reverse=True) # Sort by contribution to Fake

print("Words pushing towards FAKE (Positive values):")
for w, c, v, contrib in contributions:
    if contrib > 0:
        print(f"  {w}: coef={c:.4f}, tfidf={v:.4f} -> contrib={contrib:.4f}")

print("Words pushing towards AUTHENTIC (Negative values):")
for w, c, v, contrib in contributions:
    if contrib < 0:
        print(f"  {w}: coef={c:.4f}, tfidf={v:.4f} -> contrib={contrib:.4f}")

print(f"\nIntercept: {clf.intercept_[0]:.4f}")
