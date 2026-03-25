# Haber Verisi Toplama Sistemi — Tasarım Dokümanı

**Tarih:** 2026-03-25
**Durum:** Onaylandı

## Amaç

Türkçe sahte haber tespit sisteminin eğitim verisini genişletmek. Mevcut durum: 1760 Doğru + 2009 Yanlış = 3769 kayıt. Hedef: ~10.000 kayıt (öncelikle Doğru etiketli).

## Kapsam

Yalnızca Doğru etiketli veri toplanır (güvenilir haber ajansları). Yanlış veri Teyit ile yeterli düzeyde (2009 kayıt).

## Mimari

Üç aşamalı pipeline, mevcut `NewsCleaner` + `TurkishVectorizer` altyapısını kullanır:

```
Phase 1 (Bulk RSS)         Phase 2 (Sitemap Crawl)    Phase 3 (Otomatik)
──────────────────         ───────────────────────    ──────────────────
scripts/                   scripts/                   workers/agent_tasks.py
  scrape_rss_bulk.py         scrape_sitemap_bulk.py     (Celery beat, 24h)
        │                          │                          │
        └──────────────────────────┴──────────────────────────┘
                                   │
                         NewsCleaner + TurkishVectorizer
                                   │
                         Article (status="Doğru") → PostgreSQL
```

**Not — Celery Beat:** Beat schedule `workers/agent_tasks.py`'a eklenir. `workers/tasks.py`
analiz pipeline'ıdır, beat çalıştırmaz — dokunulmaz.

**Mevcut agent_tasks.py beat görevi ile fark:** `rss_monitor.py`'nin 60 saniyelik görevi
haber izleme + sınıflandırma yapar, `Article.status` AnalysisResult çıktısına göre set edilir.
Bu yeni görev güvenilir kaynak RSS'inden doğrudan `status="Doğru"` yazarak eğitim verisi üretir.
Dedup kontrolü sayesinde aynı URL iki kez işlenmez.

**TurkishVectorizer singleton:** Yeni `ingest_trusted_rss` beat görevi `scrapers/rss_monitor.py`
modülündeki `get_vectorizer()` lazy-singleton getter'ını reuse etmeli. Bağımsız instantiation,
aynı worker process içinde iki BERT modeli yükler — `CLAUDE.md`'de belgelenen OOM riskini artırır.

## Veri Kaynakları

| Kaynak | RSS | Sitemap | Tahmini Kayıt |
|--------|-----|---------|---------------|
| TRT Haber | ✓ | ✓ | 1000+ |
| BBC Türkçe | ✓ | ✓ | 500+ |
| NTV | ✓ | ✓ | 1000+ |
| Euronews Türkçe | ✓ | — | 200+ |
| Milliyet | ✓ | ✓ | 1000+ |

## Bileşenler

### scripts/scrape_rss_bulk.py

- Tanımlanmış RSS URL listesini iterate eder
- `feedparser` ile her feed'i parse eder
- Duplicate kontrolü (aşağıya bak)
- `NewsCleaner.process(raw_iddia=baslik+" "+icerik, detayli_analiz_raw=None)` ile işler
- `cleaned_text` uzunluk ve sentinel kontrolü (aşağıya bak) → yetersizse atla
- `TurkishVectorizer.get_embedding(cleaned_text[:1500])` — BERT 512-token penceresine sığdırmak için 1500 karakter üst sınırı
- `status="Doğru"`, `metadata_info.source=<kaynak_adı>` olarak DB'ye yazar
- Hata toleransı: tek URL başarısız olsa diğerleri devam eder
- Her 50 kayıtta bir commit (mevcut ingest pattern)

### scripts/scrape_sitemap_bulk.py

- Her sitenin `sitemap.xml` veya `sitemap_index.xml`'ini çeker
- URL listesini tarih filtresiyle daraltır (CLI: `--months N`, default 6)
- Her URL için `requests.get` + BeautifulSoup ile makale metnini çeker
- Site başına CSS selector konfigürasyonu (dict olarak tanımlı)
- **Per-domain rate limiting:** Her domain için ayrı 1s bekleme
- Exponential backoff: 429/network hatalarında max 3 deneme
- `scrape_rss_bulk.py` ile aynı cleaning, duplicate kontrolü ve DB yazma pipeline'ı
- İçerik uzunluk kontrolü cleaning **sonrası** uygulanır (ham gövde değil, `cleaned_text` üzerinde)

### workers/agent_tasks.py (ek Celery beat görevi)

- Mevcut beat schedule'a `ingest_trusted_rss` görevi eklenir (her 24h)
- `scrape_rss_bulk.py` mantığını sarmallar; dedup sayesinde idempotent çalışır
- `get_vectorizer()` singleton getter'ı kullanılır
- Mevcut 60 saniyelik `rss_monitor` görevi etkilenmez

## Veri Akışı

```
RSS/Sitemap URL
    │
    ▼
Ham metin (başlık + içerik)
    │
    ▼
NewsCleaner.process(raw_iddia=baslik+" "+icerik, detayli_analiz_raw=None)
    → processed["original_text"]         # raw_content için
    → processed["cleaned_text"]          # content ve embedding için
    → processed["cleaned_detayli_analiz"] # metadata için (boş olacak)
    → processed["signals"]               # metadata_info.linguistic_signals için
    │
    ▼
İçerik geçerlilik kontrolü (cleaning SONRASI):
    if cleaned_text == "Bilgi mevcut değil" or len(cleaned_text.strip()) < 50:
        continue
    │
    ▼
TurkishVectorizer.get_embedding(cleaned_text[:1500])
    → 768-dim BERT vektörü
    (1500 karakter ≈ 300 Türkçe kelime — BERT'in 512-token penceresine uygun)
    │
    ▼
Article(
    title=baslik[:75] + ("..." if len(baslik) > 75 else ""),  # mevcut ingest pattern
    raw_content=processed["original_text"],
    content=processed["cleaned_text"],
    embedding=embedding,
    status="Doğru",
    metadata_info={
        "link": url,
        "baslik": baslik,          # tam başlık burada korunur
        "source": kaynak_adi,
        "tarih": tarih,
        "linguistic_signals": processed["signals"],  # arşiv; inference'da recompute edilir
        "detayli_analiz": processed["cleaned_detayli_analiz"]
    }
)
    │
    ▼
PostgreSQL (pgvector)
```

## Duplicate Kontrolü

İki aşamalı kontrol — mevcut `rss_monitor.py` pattern'ı:

```python
# Birincil: link bazlı
link_result = await session.execute(
    select(Article).where(Article.metadata_info["link"].astext == url)
)
# İkincil: başlık bazlı (bazı kayıtlarda link field bozuk olabilir)
truncated_title = baslik[:75] + ("..." if len(baslik) > 75 else "")
title_result = await session.execute(
    select(Article).where(Article.title == truncated_title)
)
if link_result.scalars().first() is not None or title_result.scalars().first() is not None:
    continue
```

Başlık dedup, `...` eki dahil eşleştirir — mevcut ingest kayıtlarıyla tutarlı.

## Hata Yönetimi

- Network hatası: `try/except`, loglama, devam et
- Kısa/sentinel içerik: `"Bilgi mevcut değil"` veya `len < 50` → atla
- Rate limit / 429: per-domain exponential backoff (max 3 deneme)
- Sitemap parse hatası: kaynak atlanır, diğerleri devam eder

## Yeniden Eğitim Notları

`scrape_sitemap_bulk.py` tamamlandıktan sonra `train_classifier.py` çalıştırılır.

**Sınıf dengesi kontrolü:** ~6000 yeni Doğru eklendikten sonra oran kontrol edilmeli.
Ciddi dengesizlik (örn. 7000+ Doğru vs 2000 Yanlış) classifier'ı bozabilir.
Gerekirse `dogruluk-payi.com` veya ek Teyit verisiyle Yanlış sınıfı tamamlanabilir.

**Model yedeklemesi:** Yeniden eğitim öncesi:
```bash
cp ml_engine/models/fake_news_classifier.pkl ml_engine/models/fake_news_classifier.bak.pkl
```

## Uygulama Sırası

1. `scripts/scrape_rss_bulk.py` — hızlı sonuç, RSS verisi (~200-300 kayıt)
2. `scripts/scrape_sitemap_bulk.py` — derin geçmiş veri (~5-8k kayıt)
3. Sınıf dengesi kontrolü → gerekirse Yanlış veri tamamla
4. `scripts/train_classifier.py` — yeniden eğitim
5. `workers/agent_tasks.py` beat görevi — otomatik günlük devam

## Değişmeyen Bileşenler

- `ml_engine/processing/cleaner.py` — dokunulmaz
- `ml_engine/vectorizer.py` — dokunulmaz
- `workers/tasks.py` — dokunulmaz
- `app/models/models.py` — schema değişikliği yok
