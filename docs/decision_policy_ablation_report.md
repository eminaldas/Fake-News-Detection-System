# Karar Politikası Ablation: Ensemble Ağırlığı ve strong_manipulative Override

**Yöntem:** 5-fold stratified cross-validation, 3764 örnek (AA+HT+teyit, üretim veri seti).
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
| 0.0 | Kapalı | 0.4673 | 0.3185 | 0.0000 | 1.0000 | 0.0000 |
| 0.1 | Kapalı | 0.4673 | 0.3185 | 0.0000 | 1.0000 | 0.0000 |
| 0.2 | Kapalı | 0.4673 | 0.3185 | 0.0000 | 1.0000 | 0.0000 |
| 0.3 | Kapalı | 0.4676 | 0.3190 | 0.0005 | 1.0000 | 0.0000 |
| 0.4 | Kapalı | 0.4681 | 0.3202 | 0.0015 | 1.0000 | 0.0000 |
| 0.5 | Kapalı | 0.7216 | 0.7123 | 0.5102 | 0.9625 | 0.0375 |
| 0.55 | Kapalı | 0.8409 | 0.8408 | 0.7751 | 0.9159 | 0.0841 |
| 0.6 | Kapalı | 0.8536 | 0.8536 | 0.8060 | 0.9079 | 0.0921 |
| 0.7 | Kapalı | 0.8624 | 0.8623 | 0.8319 | 0.8971 | 0.1029 |
| 0.8 | Kapalı | 0.8666 | 0.8664 | 0.8484 | 0.8874 | 0.1126 |
| 0.9 | Kapalı | 0.8711 | 0.8709 | 0.8589 | 0.8852 | 0.1148 |
| 1.0 | Kapalı | 0.8727 | 0.8724 | 0.8643 | 0.8823 | 0.1177 |

## Override AÇIK (üretimdeki gerçek davranış)

| alpha (MODEL_WEIGHT) | Override | Accuracy | Macro-F1 | Fake Recall | Real Recall | FP Rate |
|---|---|---|---|---|---|---|
| 0.0 | Açık | 0.4679 | 0.3209 | 0.0025 | 0.9983 | 0.0017 |
| 0.1 | Açık | 0.4679 | 0.3209 | 0.0025 | 0.9983 | 0.0017 |
| 0.2 | Açık | 0.4679 | 0.3209 | 0.0025 | 0.9983 | 0.0017 |
| 0.3 | Açık | 0.4679 | 0.3209 | 0.0025 | 0.9983 | 0.0017 |
| 0.4 | Açık | 0.4681 | 0.3214 | 0.0030 | 0.9983 | 0.0017 |
| 0.5 | Açık | 0.7210 | 0.7119 | 0.5107 | 0.9608 | 0.0392 |
| 0.55 | Açık | 0.8401 | 0.8400 | 0.7751 | 0.9142 | 0.0858 | **← mevcut**
| 0.6 | Açık | 0.8528 | 0.8528 | 0.8060 | 0.9062 | 0.0938 |
| 0.7 | Açık | 0.8616 | 0.8615 | 0.8319 | 0.8954 | 0.1046 |
| 0.8 | Açık | 0.8661 | 0.8659 | 0.8484 | 0.8863 | 0.1137 |
| 0.9 | Açık | 0.8706 | 0.8703 | 0.8589 | 0.8840 | 0.1160 |
| 1.0 | Açık | 0.8722 | 0.8719 | 0.8643 | 0.8812 | 0.1188 |

## Sonuç

- Override kapalıyken en iyi Macro-F1: **alpha=1.0** (0.8724)
- Override açıkken en iyi Macro-F1: **alpha=1.0** (0.8719)
- Mevcut üretim (alpha=0.55, override açık): Macro-F1=0.8400,
  Fake Recall=0.7751, FP Rate=0.0858

FP Rate = gerçek haberin yanlışlıkla SAHTE olarak işaretlenme oranı (kullanıcı güvenini en çok
zedeleyen hata türü). Fake Recall = gerçekten sahte olan haberlerin yakalanma oranı.

## Metodolojik Not

Bu ölçüm `AA_dataset.csv` + `HT_dataset.csv` + `teyit_dataset.csv` (üretim veri seti) üzerinde,
rastgele stratified split ile yapılmıştır — kaynak-etiket karışması riski burada da geçerlidir
(bkz. `docs/ablation_signal_study_report.md`). Yani bu sonuçlar "hangi ensemble ayarı bu veri
setinde en iyi skoru veriyor" sorusunu cevaplar; "hangi ayar gerçek dünyada en iyi genelleşir"
sorusunu DEĞİL — o soru için kaynak-bağımsız/temporal test seti gerekir.
