"""
NLP pipeline debug scripti — test metinleri üzerinde tüm ara değerleri gösterir.
Kullanım: docker-compose exec app python scripts/debug_nlp.py

Karar mantığı ml_engine/scoring/decision_policy.py'den import edilir — burada
ayrıca yeniden yazılmaz. Önceden bu script kendi compute_risk/override
kopyasını tutuyordu ve production'dan (0.70/0.30, "uppercase_ratio" adı hâlâ
kullanılıyordu — signal adı caps_ratio olarak değiştirileli çok oldu) sessizce
sapmıştı; tam da decision_policy.py'nin önlemek için var olduğu drift türü.
"""
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pickle
from app.core.config import settings
from ml_engine.processing.cleaner import NewsCleaner, signals_to_vector, SIGNAL_KEYS
from ml_engine.scoring.decision_policy import compute_risk, ensemble_decision
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

print("=" * 75)
print(f"MODEL_WEIGHT (settings.ENSEMBLE_MODEL_WEIGHT) = {settings.ENSEMBLE_MODEL_WEIGHT}")
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

    prediction, combined = ensemble_decision(fake_p, risk, settings.ENSEMBLE_MODEL_WEIGHT)
    confidence = round(max(combined, 1.0 - combined) * 100, 1)

    print(f"[{label}]")
    print(f"  Sinyaller:")
    for k in SIGNAL_KEYS:
        v = signals.get(k, 0)
        bar = "█" * int(v * 20) if k != "avg_word_length" else "█" * int(v / 15 * 20)
        print(f"    {k:<22} {v:.4f}  {bar}")
    print(f"  risk       = {risk:.4f}")
    print(f"  fake_p     = {fake_p:.4f}  (model)")
    print(f"  combined   = {combined:.4f}")
    print(f"  → {prediction}  %{confidence}")
    print()
print("=" * 75)
