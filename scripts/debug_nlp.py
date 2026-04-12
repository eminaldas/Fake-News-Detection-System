"""
NLP pipeline debug scripti — test metinleri üzerinde tüm ara değerleri gösterir.
Kullanım: docker-compose exec app python scripts/debug_nlp.py
"""
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pickle
import numpy as np
from ml_engine.processing.cleaner import NewsCleaner, signals_to_vector, SIGNAL_KEYS
from ml_engine.vectorizer import TurkishVectorizer

TEXTS = [
    ("FAKE-1", "ŞOKTA! Türkiye'de gizlenen gerçek ortaya çıktı! İddiaya göre hükümet vatandaşların banka hesaplarını izliyor. Söylentiye göre bu sistem aylar önce devreye girdi ama kimse bilmiyordu. HERKES BU HABERE BAKIYOR!!!"),
    ("FAKE-2", "BOMBA İDDİA: Ünlü oyuncu aslında ajan mı?! Yakın çevresi konuştu, inanılmaz gerçekler ifşa oldu! \"Yıllarca herkesi kandırdı\" deniliyor. Kim bilir daha neler saklıyor?!"),
    ("FAKE-3", "Dikkat! Bu bitkiyi yiyenler kanser oluyor iddia edildi. Araştırmacıların gizlediği dehşet verici bulgu sonunda ortaya çıktı. Paylaş, sevdiklerini uyar!!!"),
    ("AUTH-4", "Türkiye İstatistik Kurumu'nun açıkladığı verilere göre 2024 yılı dördüncü çeyreğinde enflasyon bir önceki yılın aynı dönemine kıyasla yüzde 44,38 olarak gerçekleşti."),
    ("AUTH-5", "Sağlık Bakanlığı'nın basın toplantısında açıkladığı rakamlara göre Türkiye genelinde 2025 yılında 3 milyon 200 bin kişiye grip aşısı uygulandı."),
    ("AUTH-6", "Avrupa Merkez Bankası, politika faizini 25 baz puan artırarak yüzde 4,25 düzeyine çıkardı. Banka başkanı yaptığı açıklamada kararın enflasyonla mücadele kapsamında alındığını ifade etti."),
]

MODEL_PATH = "ml_engine/models/fake_news_classifier.pkl"

cleaner    = NewsCleaner()
vectorizer = TurkishVectorizer()

try:
    with open(MODEL_PATH, "rb") as f:
        clf = pickle.load(f)
    print(f"Model yüklendi: {MODEL_PATH}\n")
except Exception as e:
    print(f"Model yüklenemedi: {e}")
    clf = None

_AVG_BASELINE = 5.5

def compute_risk(signals):
    avg_len = signals.get("avg_word_length", _AVG_BASELINE)
    short_penalty = max(0.0, (_AVG_BASELINE - avg_len) / _AVG_BASELINE)
    risk = (
        signals.get("clickbait_score",   0) * 0.30 +
        signals.get("exclamation_ratio", 0) * 0.20 +
        signals.get("uppercase_ratio",   0) * 0.15 +
        signals.get("hedge_ratio",       0) * 0.15 +
        signals.get("question_density",  0) * 0.10 +
        signals.get("number_density",    0) * 0.05 +
        short_penalty                    * 0.10 -
        signals.get("source_score",      0) * 0.15
    )
    return max(0.0, min(risk, 1.0))

print("=" * 75)
for label, text in TEXTS:
    processed  = cleaner.process(raw_iddia=text)
    signals    = processed["signals"]
    cleaned    = processed["cleaned_text"]
    embedding  = vectorizer.get_embedding(cleaned)
    signal_vec = signals_to_vector(signals)
    feat       = embedding + signal_vec
    risk       = compute_risk(signals)

    fake_p = 0.5
    if clf:
        try:
            proba  = clf.predict_proba([feat])[0]
            fake_p = float(proba[1])
        except Exception as e:
            print(f"  [!] predict hatası: {e}")

    clickbait = signals.get("clickbait_score",   0)
    uppercase = signals.get("uppercase_ratio",   0)
    exclaim   = signals.get("exclamation_ratio", 0)

    strong = (clickbait > 0.15 and uppercase > 0.12) or (clickbait > 0.15 and exclaim > 0.02)

    if strong:
        prediction = "FAKE"
        override_conf = 0.55 + clickbait * 0.50 + exclaim * 2.0 + uppercase * 0.30
        confidence = round(min(override_conf, 0.90) * 100, 1)
        path = "HARD OVERRIDE"
    else:
        combined   = 0.70 * fake_p + 0.30 * risk
        prediction = "FAKE" if combined > 0.50 else "AUTHENTIC"
        confidence = round(max(combined, 1.0 - combined) * 100, 1)
        path = f"ensemble (combined={combined:.4f})"

    print(f"[{label}]")
    print(f"  Sinyaller:")
    for k in SIGNAL_KEYS:
        v = signals.get(k, 0)
        bar = "█" * int(v * 20) if k != "avg_word_length" else "█" * int(v / 15 * 20)
        print(f"    {k:<22} {v:.4f}  {bar}")
    print(f"  risk       = {risk:.4f}")
    print(f"  fake_p     = {fake_p:.4f}  (model)")
    print(f"  karar yolu = {path}")
    print(f"  → {prediction}  %{confidence}")
    print()
print("=" * 75)
