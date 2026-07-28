"""
Karar politikası ablation'ı: üretimde çalışan tam karar zincirinin (classifier ->
ensemble -> strong_manipulative override) her bir bileşeninin gerçek etkisini ölçer.

scripts/ablation_signal_study.py yalnızca LogisticRegression'ın kendi accuracy'sini
ölçüyordu; bu script bir adım ileri gidip workers/tasks.py'de üretimde çalışan TAM
karar politikasını (ml_engine/scoring/decision_policy.py üzerinden, kopya değil aynı
kod) her test örneğinde simüle eder ve şu soruları cevaplar:

  1. Ensemble ağırlığı (MODEL_WEIGHT) 0.0..1.0 arasında taransa en iyi Macro-F1/
     false-positive rate hangi değerde çıkıyor? (mevcut üretim: 0.55)
  2. strong_manipulative override AÇIKKEN vs KAPALIYKEN performans nasıl değişiyor?
     Override kaldırılırsa fake recall düşer mi, false-positive rate iyileşir mi?

Doğrudan Data/*.csv dosyalarından okur (DB/Docker gerekmez). Veri yükleme ve BERT
encode adımları scripts/ablation_signal_study.py ile aynıdır (import edilir).

Çıktı: konsola özet tablo + docs/decision_policy_ablation_report.md
"""

import os
import sys
import time

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT)

from ml_engine.processing.cleaner import NewsCleaner  # noqa: E402
from ml_engine.scoring.decision_policy import (  # noqa: E402
    compute_risk,
    ensemble_decision,
    is_strong_manipulative,
)
from scripts.ablation_signal_study import DATA_DIR, load_aa, load_ht, load_teyit  # noqa: E402

N_FOLDS = 5
RANDOM_STATE = 42
CURRENT_WEIGHT = 0.55  # settings.ENSEMBLE_MODEL_WEIGHT — üretimdeki mevcut değer
ALPHAS = sorted(set([round(a * 0.1, 2) for a in range(0, 11)] + [CURRENT_WEIGHT]))
CACHE_PATH = os.path.join(ROOT, "scripts", ".cache_decision_policy_features.pkl")


def build_features(rows: list[dict], cleaner: NewsCleaner, model):
    """Her satır için BERT embedding + normalize sinyal vektörü + HAM sinyal dict'i döner.
    Ham sinyal dict'i risk/override hesaplamak için gerekiyor (signals_to_vector normalize eder)."""
    from ml_engine.processing.cleaner import signals_to_vector

    texts, signal_vecs, raw_signals, labels = [], [], [], []
    for row in rows:
        raw = row["raw"]
        cleaned = cleaner.clean_links(raw)
        if not cleaned.strip():
            continue
        signals = cleaner.extract_manipulative_signals(raw)  # production: link-temizlik ÖNCESİ metinden
        texts.append(cleaned)
        signal_vecs.append(signals_to_vector(signals))
        raw_signals.append(signals)
        labels.append(row["label"])

    print(f"  -> {len(texts)} metin BERT ile encode ediliyor (CPU, biraz sürebilir)...")
    t0 = time.time()
    embeddings = model.encode(texts, batch_size=32, show_progress_bar=True, convert_to_numpy=True)
    print(f"  -> encode tamamlandı ({time.time() - t0:.1f}s)")
    return embeddings, np.array(signal_vecs, dtype=float), raw_signals, np.array(labels, dtype=int)


def _metrics_from_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=[0, 1], zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp = cm[0][0], cm[0][1]
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    acc = (y_pred == y_true).mean()
    macro_f1 = (f1[0] + f1[1]) / 2
    return {
        "accuracy": acc, "macro_f1": macro_f1,
        "fake_recall": recall[1], "real_recall": recall[0],
        "false_positive_rate": fpr, "cm": cm,
    }


def main():
    from sentence_transformers import SentenceTransformer

    print("=" * 70)
    print("KARAR POLİTİKASI ABLATION: classifier vs ensemble(alpha) vs +override")
    print("=" * 70)

    if os.path.exists(CACHE_PATH):
        print("\n[1-2/3] Önbellekten yükleniyor (BERT encode atlanıyor)...")
        import pickle
        with open(CACHE_PATH, "rb") as f:
            embeddings, signal_vecs, raw_signals, y = pickle.load(f)
    else:
        print("\n[1/3] CSV kaynakları yükleniyor (üretim veri seti — AA+HT+teyit)...")
        aa_rows = load_aa(os.path.join(DATA_DIR, "veri", "AA_dataset.csv"))
        ht_rows = load_ht(os.path.join(DATA_DIR, "veri", "HT_dataset.csv"))
        teyit_rows = load_teyit(os.path.join(DATA_DIR, "veri", "teyit_dataset.csv"), "teyit")
        rows = aa_rows + ht_rows + teyit_rows
        print(f"  Toplam {len(rows)} örnek")

        print("\n[2/3] BERT modeli yükleniyor + özellik çıkarımı...")
        cleaner = NewsCleaner()
        model = SentenceTransformer("emrecan/bert-base-turkish-cased-mean-nli-stsb-tr", device="cpu")
        embeddings, signal_vecs, raw_signals, y = build_features(rows, cleaner, model)

        import pickle
        with open(CACHE_PATH, "wb") as f:
            pickle.dump((embeddings, signal_vecs, raw_signals, y), f)

    X = np.concatenate([embeddings, signal_vecs], axis=1)   # 776-dim, üretimle birebir aynı
    raw_signals = np.array(raw_signals, dtype=object)

    print(f"\n[3/3] {N_FOLDS}-fold stratified CV ile karar politikası taraması...\n")

    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)

    # alpha -> override(bool) -> fold sonuçları listesi
    results: dict[tuple[float, bool], list[dict]] = {
        (a, ov): [] for a in ALPHAS for ov in (False, True)
    }

    for fold, (train_idx, test_idx) in enumerate(skf.split(X, y), start=1):
        clf = Pipeline([
            ("scaler", StandardScaler()),
            ("lr", LogisticRegression(random_state=RANDOM_STATE, class_weight="balanced", max_iter=1000, C=1.0)),
        ])
        clf.fit(X[train_idx], y[train_idx])
        fake_p = clf.predict_proba(X[test_idx])[:, 1]
        y_test = y[test_idx]
        test_signals = raw_signals[test_idx]

        risk_arr = np.array([compute_risk(s) for s in test_signals])
        override_arr = np.array([is_strong_manipulative(s) for s in test_signals])

        for a in ALPHAS:
            ensemble_pred = np.array([
                1 if ensemble_decision(fp, r, a)[0] == "FAKE" else 0
                for fp, r in zip(fake_p, risk_arr)
            ])

            results[(a, False)].append(_metrics_from_predictions(y_test, ensemble_pred))

            with_override_pred = np.where(override_arr, 1, ensemble_pred)
            results[(a, True)].append(_metrics_from_predictions(y_test, with_override_pred))

        print(f"    fold {fold}/{N_FOLDS} tamamlandı ({len(test_idx)} test örneği, "
              f"override oranı %{100 * override_arr.mean():.1f})")

    print("\n" + "=" * 70)
    print("SONUÇLAR (5 fold ortalaması)")
    print("=" * 70)
    print(f"{'alpha':>6} {'override':>9} {'accuracy':>9} {'macro_f1':>9} {'fake_rec':>9} {'FP_rate':>8}")

    summary = {}
    for a in ALPHAS:
        for ov in (False, True):
            folds = results[(a, ov)]
            agg = {
                k: float(np.mean([f[k] for f in folds]))
                for k in ("accuracy", "macro_f1", "fake_recall", "real_recall", "false_positive_rate")
            }
            summary[(a, ov)] = agg
            marker = " <- mevcut ağırlık" if a == CURRENT_WEIGHT else ""
            print(f"{a:>6} {str(ov):>9} {agg['accuracy']:>9.4f} {agg['macro_f1']:>9.4f} "
                  f"{agg['fake_recall']:>9.4f} {agg['false_positive_rate']:>8.4f}{marker}")

    best_no_ov = max(ALPHAS, key=lambda a: summary[(a, False)]["macro_f1"])
    best_ov = max(ALPHAS, key=lambda a: summary[(a, True)]["macro_f1"])
    print(f"\nEn iyi Macro-F1 (override KAPALI): alpha={best_no_ov} -> {summary[(best_no_ov, False)]['macro_f1']:.4f}")
    print(f"En iyi Macro-F1 (override AÇIK):   alpha={best_ov} -> {summary[(best_ov, True)]['macro_f1']:.4f}")
    print(f"Mevcut üretim (alpha=0.55, override AÇIK): {summary[(0.55, True)]['macro_f1']:.4f}")

    write_report(len(y), summary, best_no_ov, best_ov)
    print("\nRapor yazıldı: docs/decision_policy_ablation_report.md")


def write_report(n_samples, summary, best_no_ov, best_ov):
    def row(a, ov):
        s = summary[(a, ov)]
        mark = " **← mevcut**" if (a == CURRENT_WEIGHT and ov) else ""
        return (f"| {a} | {'Açık' if ov else 'Kapalı'} | {s['accuracy']:.4f} | {s['macro_f1']:.4f} | "
                f"{s['fake_recall']:.4f} | {s['real_recall']:.4f} | {s['false_positive_rate']:.4f} |{mark}")

    table_no_ov = "\n".join(row(a, False) for a in ALPHAS)
    table_ov = "\n".join(row(a, True) for a in ALPHAS)

    content = f"""# Karar Politikası Ablation: Ensemble Ağırlığı ve strong_manipulative Override

**Yöntem:** {N_FOLDS}-fold stratified cross-validation, {n_samples} örnek (AA+HT+teyit, üretim veri seti).
Her fold'da `StandardScaler + LogisticRegression(class_weight="balanced")` eğitilir; test kümesindeki
her örnek için `ml_engine/scoring/decision_policy.py`'deki (üretimle birebir aynı) risk/override/ensemble
fonksiyonları kullanılarak karar simüle edilir.

**Ölçülen sorular:**
1. `MODEL_WEIGHT` (`combined = MODEL_WEIGHT*fake_p + (1-MODEL_WEIGHT)*risk`) 0.0-1.0 arasında hangi
   değerde en iyi Macro-F1/false-positive rate veriyor?
2. `strong_manipulative` override açıkken/kapalıyken performans nasıl değişiyor?

## Override KAPALI (yalnızca ensemble)

| alpha (MODEL_WEIGHT) | Override | Accuracy | Macro-F1 | Fake Recall | Real Recall | FP Rate |
|---|---|---|---|---|---|---|
{table_no_ov}

## Override AÇIK (üretimdeki gerçek davranış)

| alpha (MODEL_WEIGHT) | Override | Accuracy | Macro-F1 | Fake Recall | Real Recall | FP Rate |
|---|---|---|---|---|---|---|
{table_ov}

## Sonuç

- Override kapalıyken en iyi Macro-F1: **alpha={best_no_ov}** ({summary[(best_no_ov, False)]['macro_f1']:.4f})
- Override açıkken en iyi Macro-F1: **alpha={best_ov}** ({summary[(best_ov, True)]['macro_f1']:.4f})
- Mevcut üretim (alpha=0.55, override açık): Macro-F1={summary[(0.55, True)]['macro_f1']:.4f},
  Fake Recall={summary[(0.55, True)]['fake_recall']:.4f}, FP Rate={summary[(0.55, True)]['false_positive_rate']:.4f}

FP Rate = gerçek haberin yanlışlıkla SAHTE olarak işaretlenme oranı (kullanıcı güvenini en çok
zedeleyen hata türü). Fake Recall = gerçekten sahte olan haberlerin yakalanma oranı.

## Metodolojik Not

Bu ölçüm `AA_dataset.csv` + `HT_dataset.csv` + `teyit_dataset.csv` (üretim veri seti) üzerinde,
rastgele stratified split ile yapılmıştır — kaynak-etiket karışması riski burada da geçerlidir
(bkz. `docs/ablation_signal_study_report.md`). Yani bu sonuçlar "hangi ensemble ayarı bu veri
setinde en iyi skoru veriyor" sorusunu cevaplar; "hangi ayar gerçek dünyada en iyi genelleşir"
sorusunu DEĞİL — o soru için kaynak-bağımsız/temporal test seti gerekir.
"""

    docs_dir = os.path.join(ROOT, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    with open(os.path.join(docs_dir, "decision_policy_ablation_report.md"), "w", encoding="utf-8") as f:
        f.write(content)


if __name__ == "__main__":
    main()
