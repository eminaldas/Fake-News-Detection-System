# Analiz Sayfası & Tam Rapor — Tasarım Dokümanı

**Tarih:** 2026-04-24  
**Durum:** Onaylandı

---

## Özet

Mevcut analiz sayfasına iki katmanlı bir sistem ekleniyor:

1. **Kısa Analiz** — mevcut pipeline korunur, polling kaldırılır, WebSocket ile gerçek zamanlı güncelleme yapılır
2. **Tam Rapor** — kayıtlı kullanıcılar için derinlemesine Gemini analizi; ayrı sayfa, DB'de cache, tekrar analiz yok

Yaklaşım: İki aşamalı tek extended Celery task (Yaklaşım C). Basit mimari, doğal cache, WS entegrasyonu temiz.

---

## Genel Mimari

```
Kullanıcı input girer
    │
    ▼
POST /analyze  →  Stage 1 (mevcut): BERT + ML + Gemini kısa özet
    │
    ├─ WS push: { type: "analysis_progress", stage: "nlp" }
    ├─ WS push: { type: "analysis_progress", stage: "gemini" }
    └─ WS push: { type: "analysis_complete", task_id, result }
              ↓
    Kısa Analiz Kartı açılır (inline, aşağı doğru)
              ↓
    [Tam Rapor İste] butonu  ←─ sadece login kullanıcı görür
    [Daha derin analiz için giriş yapın] linki ←─ anonim kullanıcı
              │
              ▼
    POST /analyze/full-report/{task_id}
              │
              ├─ DB'de full_report var mı? → 200 + rapor (Gemini çalışmaz)
              └─ yoksa → DeepReportTask (Celery)
                              │
                              ├─ Gemini: claim extraction + araştırma
                              └─ DB'ye full_report JSONB kaydedilir
                                        │
                                        └─ WS push: { type: "report_ready", task_id }
                                                  ↓
                                    /analysis/report/{task_id} sayfası güncellenir
```

---

## Bölüm 1 — WebSocket Entegrasyonu (Kısa Analiz)

### Mevcut Sorun
`useAnalysis.js` şu an `setInterval` ile `/status/{task_id}` endpoint'ini her 2 saniyede bir çağırıyor. Gereksiz HTTP trafiği ve gecikme.

### Yeni Akış

```
POST /analyze → { task_id, is_direct_match }

├─ is_direct_match === true
│       → /status/{task_id} tek seferlik GET (sonuç hazır)
│       → result set, WS yok
│
└─ is_direct_match === false
        → WS subscribe: "task:{task_id}" kanalı
        → Mesajlar:
            { type: "analysis_progress", stage: "nlp" }
            { type: "analysis_progress", stage: "gemini" }
            { type: "analysis_complete",  task_id, result }
            { type: "analysis_failed",   error }
        → Tamamlanınca WS unsubscribe
```

### Backend Değişiklikleri

**`workers/tasks.py`:**
- `analyze_article` task'ı tamamlandığında Redis'e event yazar:
  ```python
  redis_client.publish(f"task:{task_id}", json.dumps({
      "type": "analysis_complete",
      "task_id": task_id,
      "result": result_payload,
  }))
  ```
- Stage geçişlerinde progress event'leri:
  ```python
  redis_client.publish(f"task:{task_id}", json.dumps({
      "type": "analysis_progress", "stage": "gemini"
  }))
  ```

**`app/api/v1/endpoints/ws.py`:**
- Mevcut WS handler'a `task:{task_id}` kanalı subscribe desteği eklenir
- Redis pub/sub mesajlarını ilgili WS bağlantısına forward eder

### Frontend Değişiklikleri

**`useAnalysis.js`:**
- `setInterval` polling tamamen kaldırılır
- `WebSocketContext`'ten WS instance alınır
- Task başlayınca `subscribe("task:{task_id}")`, bitince `unsubscribe`
- `analysisStage` state: `null | "nlp" | "gemini" | "complete" | "failed"`

**`AnalysisForm.jsx`:**
- `isPolling` prop yerine `analysisStage` alır
- Buton label:
  - `"nlp"` → "Metin analiz ediliyor..."
  - `"gemini"` → "AI değerlendiriyor..."
  - default → "Analiz"

**`AnalysisResultCard.jsx`:**
- Kartın footer'ına "Tam Rapor İste" CTA eklenir (login kontrolü ile)
- Login değilse: "Daha derin analiz için giriş yapın →" linki

---

## Bölüm 2 — Tam Rapor

### DB Şeması

`AnalysisResult` tablosuna yeni kolon:
```sql
ALTER TABLE analysis_results ADD COLUMN full_report JSONB;
```

URL analizleri için dedup: `Article.metadata_info->>'source_url'` üzerinden — aynı URL daha önce tam rapora tabi tutulduysa `full_report` dolu gelir, Gemini çalışmaz.

### Yeni Endpoint

```
POST /analyze/full-report/{task_id}
    Auth: Bearer required

Response 200: { status: "cached", report: {...} }   ← DB'de var
Response 202: { status: "queued", task_id }          ← Celery'ye eklendi
Response 404: task_id bulunamadı
```

### Celery Task: `DeepReportTask`

`workers/deep_report_task.py` — yeni dosya

**Akış:**
1. `task_id` ile `Article` ve `AnalysisResult` DB'den alınır
2. Gemini'ye tek yapılandırılmış çağrı:
   - Girdi: orijinal metin + mevcut kısa analiz sonucu (signals, ml verdict, ai_comment özeti)
   - İstenen çıktı: aşağıdaki JSON şeması
3. Sonuç `AnalysisResult.full_report` kolonuna yazılır
4. Redis'e `report_ready` event publish edilir

**Gemini Prompt Stratejisi:**
```
Sen bir gazetecilik doğrulama uzmanısın. Aşağıdaki haber metnini ve
ön analiz sonuçlarını inceleyerek kapsamlı bir doğrulama raporu üret.

Kurallar:
- Sadece metinde gerçekten var olan iddiaları çıkar, ekleme yapma
- Zaman bağlamı yoksa time_context.relevant = false döndür
- Varlık yoksa entities = [] döndür
- Propaganda tekniği tespit etmezsen propaganda_techniques = [] döndür
- Her kaynağa erişmeye çalış, ulaşamazsan source_url = null bırak
- Türkçe yanıt ver

[Metin]: {article_text}
[Ön Analiz]: {ml_verdict} (%{confidence} güven), Sinyaller: {signals_summary}

Yanıt formatı (JSON):
{schema}
```

**Dönen JSON Şeması:**
```json
{
  "claims": [
    {
      "text": "İddia metni",
      "verdict": "confirmed | refuted | uncertain",
      "explanation": "Neden bu karar verildi",
      "source": "Kaynak adı",
      "source_url": "https://... veya null"
    }
  ],
  "propaganda_techniques": [
    {
      "technique": "Korku İtirazı",
      "explanation": "Haberde okuyucuda panik yaratmaya yönelik dil kullanılıyor"
    }
  ],
  "entities": [
    {
      "name": "Varlık adı",
      "type": "person | org | place",
      "context": "Bu varlık hakkında kısa bağlam"
    }
  ],
  "source_profile": {
    "domain": "ornek.com veya null",
    "reliability_note": "Bu kaynakla ilgili bilgi"
  },
  "time_context": {
    "relevant": true,
    "note": "Bu iddia X tarihinde ortaya çıktı, daha önce de dolaştı"
  },
  "linguistic": {
    "emotion_tone": "neutral | fear | anger | excitement | sadness",
    "readability": "academic | standard | sensational",
    "manipulation_density": 0.72
  }
}
```

`relevant: false` veya boş array gelen bölümler frontend'de render edilmez.

---

## Bölüm 3 — Rapor Sayfası (`/analysis/report/{task_id}`)

### Erişim

`RequireAuth` wrapper — login değilse `/login?redirect=/analysis/report/{task_id}` yönlendirmesi.

### Sayfa Yapısı

```
┌─────────────────────────────────────────────────────┐
│  ← Analize Dön          [Paylaş]  [İndir PDF]       │
├─────────────────────────────────────────────────────┤
│  [SAHTE — %87 Güven]  Tam Rapor                     │
│  Oluşturulma: 24 Nisan 2026                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. İDDİA ANALİZİ                    (varsa)        │
│  2. PROPAGANDA TEKNİKLERİ            (varsa)        │
│  3. VARLIK PROFİLİ                   (varsa)        │
│  4. KAYNAK DERİNLEMESİ               (varsa)        │
│  5. ZAMAN BAĞLAMI                    (varsa)        │
│  6. DİLBİLİMSEL ANALİZ              (her zaman)    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Rapor henüz hazır değilse:**
- Skeleton loader + "Derin analiz yapılıyor, bu işlem 1-2 dakika sürebilir..."
- WS `report_ready` event gelince sayfa otomatik güncellenir (yenileme gerekmez)

### Bölüm Detayları

**1. İddia Analizi**
Her iddia için kart:
- Renk kodu: yeşil (doğrulandı) / kırmızı (çürütüldü) / turuncu (belirsiz)
- İddia metni + karar rozeti + açıklama + kaynak linki

**2. Propaganda Teknikleri**
Badge grid: her teknik tıklanabilir, açıklama tooltip/accordion olarak açılır

**3. Varlık Profili**
Kişi / Kurum / Yer gruplarında ayrılmış liste, her biri için bağlam notu

**4. Kaynak Derinlemesi**
- DB'deki `news_articles` tablosundan bu domain'in geçmiş analiz sayısı ve ortalama risk skoru
- Gemini'nin kaynak notu
- Gösterim koşulu: `source_profile.domain !== null`

**5. Zaman Bağlamı**
- `time_context.relevant === true` ise gösterilir
- DB'den vector search ile benzer eski iddialar (en fazla 3 adet)

**6. Dilbilimsel Analiz**
Her zaman gösterilir. Üç metrik:
- Duygu tonu (ikonu ile: neutral/korku/öfke/heyecan/üzüntü)
- Okunabilirlik seviyesi (akademik/standart/sensasyonel)
- Manipülasyon yoğunluğu (progress bar, mevcut risk_score ile tutarlı)

### Yeni Frontend Dosyaları

```
frontend/src/pages/AnalysisReport.jsx          ← rapor sayfası
frontend/src/features/analysis/report/
    ClaimsSection.jsx
    PropagandaSection.jsx
    EntitySection.jsx
    SourceSection.jsx
    TimeContextSection.jsx
    LinguisticSection.jsx
    ReportSkeleton.jsx
```

### Routing

`App.jsx`'e yeni route:
```jsx
<Route path="/analysis/report/:taskId" element={
  <RequireAuth><AnalysisReport /></RequireAuth>
} />
```

---

## Bölüm 4 — URL Analizi Dedup Genişletmesi

Mevcut dedup: aynı URL daha önce kısa analiz yapıldıysa Celery çalıştırılmaz.

Ek kural: `POST /analyze/full-report/{task_id}` endpoint'i, aynı `source_url`'e ait farklı bir task'ın `full_report` kolonunu kontrol eder. Varsa o raporu döner — yani aynı URL için farklı kullanıcılar tekrar tam rapor üretmez.

```python
# Aynı URL'nin full_report'u var mı?
existing = await db.execute(
    select(AnalysisResult.full_report)
    .join(Article)
    .where(Article.metadata_info.op("->>")(  "source_url") == source_url)
    .where(AnalysisResult.full_report.isnot(None))
    .limit(1)
)
```

---

## Kapsam Dışı

- PDF indirme (ileride eklenebilir, şimdi sadece UI'da yer tutucu buton)
- Kullanıcı başına tam rapor kotası (ilk aşamada yok, gerekirse rate limit'e entegre edilir)
- Gemini web search grounding (mevcut API key izinlerine göre; Gemini kendi bilgisiyle araştırır, live search değil)
- Rapor bölümlerinin ayrı ayrı yenilenmesi (tüm rapor tek seferde gelir)
- Mobil için özel rapor layout'u (mevcut responsive sistem yeterli)
