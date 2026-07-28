# Hakem Revizyon PDF'i — Kod Tarafı Durum Raporu

**Kaynak:** `Nehaber_Makale_Revizyon_Sohbeti_260728_183932.pdf` (28 Temmuz 2026, 33 sayfa)
**Kapsam:** Yalnızca PDF'in "5. Kodda yapılması gereken revizyonlar" ve "6. Testlerde yapılması gereken revizyonlar" bölümleri + "En doğru uygulama sırası" listesi. Madde numaraları PDF'teki ile birebir aynıdır.
**Kapsam DIŞI:** Makale metni/figür/tablo revizyonları (1. ve 3. bölümler) — bunlarla hoca ilgileniyor. Saf deneysel çalışmalar (source-held-out, temporal split, baseline karşılaştırmaları, kalibrasyon) kod değişikliği değil, ayrı bir veri/deney projesidir — aşağıda ayrıca işaretlendi.

---

## Özet

| Durum | Sayı |
|---|---|
| ✅ Tamamlandı | 18 |
| ⏳ Kod dışı / deneysel (bilinçli olarak yapılmadı) | 6 |
| ❌ Yapılmadı, yapılabilir | 1 |

**Hiçbiri commit edilmedi.** 3 migration Docker üzerinden canlı DB'ye uygulandı ve doğrulandı. Tam test suite: 111 geçti, 7 pre-existing/ortam kaynaklı hata (regresyon değil).

---

## 5. Kodda Yapılması Gereken Revizyonlar

| # | Madde | Durum | Ne yapıldı |
|---|---|---|---|
| 5.1 | Tek bir karar mekanizması oluşturulması | ✅ | `ml_engine/scoring/decision_policy.py` — risk/ensemble hesaplaması tek yerde, hem `workers/tasks.py` hem ölçüm script'i buradan besleniyor |
| 5.2 | 0.70/0.30 – 0.55/0.45 çelişkisinin giderilmesi | ✅ | Ağırlık `settings.ENSEMBLE_MODEL_WEIGHT`'a taşındı, `scripts/decision_policy_ablation.py` ile 5-fold CV taraması yapıldı, ölçülen argmax (**1.0**) uygulandı |
| 5.3 | `strong_manipulative` override kaldırma/belgeleme | ✅ | Ölçüldü: fake recall'u hiç artırmıyordu, FP oranını hafifçe kötüleştiriyordu → **kaldırıldı** (`workers/tasks.py`) |
| 5.4 | Fallback kararının düzeltilmesi | ✅ | Classifier yoksa artık `risk>0.20` ile kör FAKE/AUTHENTIC değil, `UNKNOWN` dönüyor |
| 5.5 | İki farklı risk formülünün birleştirilmesi | ✅ | `cleaner.py::_compute_risk`/`_classify_content` hiçbir yerden çağrılmıyordu (ölü kod) — silindi. Gerçek çelişki yoktu, potansiyel risk ortadan kalktı |
| 5.6 | Confidence threshold'un sadeleştirilmesi | ✅ | `GEMINI_ESCALATION_LOW` text pipeline'da hiç tetiklenemiyordu (`confidence` her zaman ≥0.50) — sadeleştirildi |
| 5.7 | Karar bilgilerinin veritabanında saklanması | ✅ | Migration `d1a2p3o4l5c6`: `AnalysisResult`'a `model_probability, risk_score, combined_score, model_version, policy_version, decision_path` |
| 5.8 | Request–result ilişkisinin kurulması | ✅ | Migration `d1a2p3o4l5c6`: `AnalysisRequest.result_id` FK eklendi, tüm analiz yollarında (text/url) dolduruluyor |
| 5.9 | Stage 1 eşleşmelerinin saklanması | ✅ | Migration `e2b3m4a5t6c7`: `analysis_matches` tablosu — oylamaya giren 3 eşleşmenin tamamı (rank/similarity/vote_weight/is_winner) |
| 5.10 | `vote_confidence` adının düzeltilmesi | ✅ | `vote_agreement` olarak yeniden adlandırıldı |
| 5.11 | Stage 1 kanıt seçim hatasının düzeltilmesi | ✅ | Kanıt artık oylamayı kazanan sınıftaki en yüksek benzerlikli eşleşmeden seçiliyor |
| 5.12 | `task_id` tutarsızlığının giderilmesi | ✅ | Düzeltirken **bağımsız bir bug** bulundu: `/analyze/text`, `/analyze/url`, `/analyze/image` response'ları Celery'nin kendi rastgele ID'sini dönüyordu, DB kayıtlarıyla hiç eşleşmiyordu. `.apply_async(task_id=content_id)` ile tek ID'ye indirgendi |
| 5.13 | Görsel EXIF davranışının düzeltilmesi | ✅ | PDF'in kendi önerdiği güvenli seçenek (Seçenek 2) uygulandı: davranış değiştirilmedi, EXIF'in Gemini kararını etkilemediği, yalnızca bağlamsal metadata olduğu kod içinde açıkça belgelendi |
| 5.14 | pHash aramasının ölçeklenebilir hale getirilmesi | ✅ (kısmi) | Gereksiz kolonlar çekilmiyor, `gemini_result IS NOT NULL` filtresi + 5000 kayıt sınırı eklendi. **Tam çözüm değil** — SQL `bit_count()`/BK-tree indeksi canlı Postgres sürümü doğrulanmadan eklenmedi (yanlış varsayımla runtime hatası riski) |
| 5.15 | Yüksek güvenli feedback'in reddedilmemesi | ✅ | confidence≥0.80 → 422 red bloğu tamamen kaldırıldı |
| 5.16 | Yeniden eğitilen modelin worker'a yüklenmesi | ✅ | `_maybe_reload_classifier()` — her analizden önce `.pkl` mtime kontrolü, değiştiyse otomatik yeniden yükleme |
| 5.17 | Model dosyasının atomik değiştirilmesi | ✅ | `workers/retrain_task.py` artık `.tmp` dosyaya yazıp `os.replace()` ile atomik değiştiriyor |
| 5.18 | Retraining kabul kriterlerinin genişletilmesi | ✅ | Migration `f3g4t5r6a7i8`: yalnızca accuracy değil, Macro-F1 ve fake recall regresyon guard'ları da eklendi (herhangi biri düşerse retraining reddedilir) |
| 5.19 | Otomatik route ve servis dokümantasyonu | ✅ | `scripts/count_infra.py` — Docker servis sayısını ve gerçek API route sayısını otomatik sayıyor. Çalıştırıldı: **12 production + 1 dev-only servis** (README/CLAUDE.md güncellendi) |
| 5.20 | Kod sürümünün dondurulması (Git tag/release) | ❌ | Yapılmadı — kod tarafı değil, bir süreç adımı. Her şey commit edildikten sonra `git tag paper-v1.0` gibi bir tag atman önerilir, istersen şimdi yaparım |

---

## 6. Testlerde Yapılması Gereken Revizyonlar

| # | Grup | Durum | Ne yapıldı |
|---|---|---|---|
| 6.1 | Karar algoritması birim testleri | ✅ (çoğu) | `tests/test_decision_policy.py` (11 test): risk [0,1] sınırlı mı, aynı politika her yerde mi, ensemble ağırlıkları doğru mu, confidence≥0.5. `test_no_unreported_override` artık **N/A** — override tamamen kaldırıldığı için raporlanacak bir şey kalmadı |
| 6.2 | Stage 1 testleri | ❌ | Yapılmadı — `analysis.py`'nin Stage 1 mantığı canlı DB/pgvector fixture'ı gerektiriyor, saf birim testiyle kapsanamıyor |
| 6.3 | Veri ve eğitim testleri | ✅ (kısmi) | `tests/test_feature_pipeline.py` (7 test): 776 boyut tutarlılığı, sinyal sırası, `signals_to_vector` varsayılanları. `test_no_duplicate_between_train_and_test`, `test_stratified_split`, `test_group_split_by_source` **yapılmadı** — bunlar veri/deney işi, ayrı task |
| 6.4 | Retraining testleri | ✅ (kısmi) | `tests/test_model_hot_reload.py` (4 test): `test_retrained_model_is_reloaded` karşılığı var. `test_atomic_model_replacement`, `test_regression_guard_uses_multiple_metrics` ayrı birim testi olarak yazılmadı (mantık 5.17/5.18'de koda işlendi ama izole test yok) |
| 6.5 | Görsel pipeline testleri | ❌ | Yapılmadı |
| 6.6 | Entegrasyon ve CI | ❌ | Yapılmadı — CI pipeline kurulumu ayrı bir altyapı kararı, bu oturumun kapsamı dışında |

---

## "En Doğru Uygulama Sırası" Listesi (PDF'in kendi önceliklendirmesi)

| # | Madde | Durum |
|---|---|---|
| 1 | Git sürümünü dondurmak | ❌ (henüz commit yok, dolayısıyla tag da yok) |
| 2 | Ensemble ağırlığını deneysel seçmek | ✅ |
| 3 | 0.70/0.30–0.55/0.45 çelişkisini çözmek | ✅ |
| 4 | İki risk formülünü tekleştirmek | ✅ |
| 5 | `strong_manipulative` override kararı | ✅ |
| 6 | Kaynak bağımsız ve temporal deneyler | ⏳ deneysel — kod değil |
| 7 | Baseline ve ablation sonuçları | ⏳ kısmi (`ablation_signal_study.py` var; TF-IDF/majority baseline yok) — deneysel |
| 8 | %88 ifadesinin düzeltilmesi | ⏳ makale metni — kod değil |
| 9 | Figür 1–4'ü yeniden çizmek | ⏳ makale/figür — kod değil |
| 10 | ER diyagramı request–result ilişkisi | ✅ kod tarafı (FK); figürün kendisi makale işi |
| 11 | Docker ve API sayılarını güncellemek | ✅ |
| 12 | Kanıtlanmamış sonuç iddialarını kaldırmak | ⏳ makale metni — kod değil |

---

## Bonus: Plan Dışında Bulunup Düzeltilen

- **Celery `task_id` ≠ `content_id` bug'ı** (madde 5.12'yi düzeltirken keşfedildi) — `/analyze/image` özellikle etkileniyordu çünkü o pipeline hiç DB satırı yazmıyor, tamamen Celery'nin 1 saatlik geçici belleğine bağımlıydı.
- **`AnalysisRequest` kaydının `.delay()`'den önce commit edilmesi** — worker istekten hızlı biterse `result_id` geri-bağlama sessizce boşa düşüyordu.

## Migration Durumu

3 migration (`d1a2p3o4l5c6`, `e2b3m4a5t6c7`, `f3g4t5r6a7i8`) Docker üzerinden (`docker compose exec app alembic upgrade head`) canlı veritabanına **uygulandı ve doğrulandı**. `app` container'ı yeni kodla temiz başladı.

## Gerçekten Kapsam Dışı Kalanlar (kod değil, ayrı iş)

Bunlar için ayrı bir oturum/karar gerekir, "eksik" değil bilinçli olarak ertelendi:
- Source-held-out / temporal test seti oluşturma
- TF-IDF/majority-classifier baseline deneyleri
- Confidence kalibrasyonu (Platt scaling / isotonic regression)
- Gemini'nin katkısının ayrı ölçülmesi
- CI pipeline kurulumu
- Stage 1 / görsel pipeline için DB-fixture'lı entegrasyon testleri
