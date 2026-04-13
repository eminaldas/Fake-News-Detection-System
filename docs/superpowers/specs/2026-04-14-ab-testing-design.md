# A/B Testi — Öneri Algoritması Ağırlık Varyantları

**Tarih:** 2026-04-14  
**Durum:** Onaylandı — Implementasyona Hazır  
**Kapsam:** Üç varyantlı öneri ağırlık testi; CTR + pozitif feedback ölçümü; admin sonuç paneli.

---

## 1. Genel Bakış

Mevcut öneri algoritması kategori eşleşmesi, güncellik ve güvenlik sinyallerine sabit ağırlıklar atıyor. Bu spec; üç farklı ağırlık kombinasyonunu gerçek kullanıcı davranışıyla karşılaştıran bir A/B test altyapısı kurar. Her varyantta 100 tıklama birikince admin panelinde sonuçlar görünür; admin kazananı manuel olarak uygular.

**Metrikler:**
- CTR (birincil): tıklama / izlenim
- Pozitif feedback oranı (ikincil): feedback_positive / tıklama

---

## 2. Varyant Tanımları

| Varyant | Ad | warm: cat/rec/safety | personal: cat/safety | Hipotez |
|---------|----|----------------------|----------------------|---------|
| 0 | Kontrol | 0.40 / 0.35 / 0.25 | 0.25 / 0.10 | Mevcut davranış — referans |
| 1 | Recency-heavy | 0.25 / 0.55 / 0.20 | 0.20 / 0.10 | Yeni haberler öne çıkınca daha fazla tıklanır |
| 2 | Category-heavy | 0.60 / 0.20 / 0.20 | 0.45 / 0.15 | Kişisel kategori eşleşmesi engagement'ı artırır |

`cold_start` modu kullanıcıya özel değil (genel trend), varyant ağırlığı uygulanmaz.

---

## 3. Veri Modeli

### 3.1 Yeni Tablolar

**`ab_experiments`**

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            VARCHAR(100) NOT NULL
status          VARCHAR(20) NOT NULL DEFAULT 'active'  -- 'active' | 'paused' | 'concluded'
min_clicks      INTEGER NOT NULL DEFAULT 100           -- varyant başına eşik
winner_variant  INTEGER NULL                           -- 0|1|2, concluded sonrası dolar
created_at      TIMESTAMPTZ DEFAULT now()
concluded_at    TIMESTAMPTZ NULL
CHECK (status IN ('active', 'paused', 'concluded'))
CHECK (winner_variant IN (0, 1, 2) OR winner_variant IS NULL)
```

**`ab_variant_assignments`**

```sql
user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
experiment_id   UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE
variant         INTEGER NOT NULL CHECK (variant IN (0, 1, 2))
assigned_at     TIMESTAMPTZ DEFAULT now()
```

### 3.2 ContentInteraction.details Kullanımı

Mevcut `details` JSONB alanına A/B metadata eklenir — yeni sütun gerektirmez:

```json
{ "ab_variant": 1, "ab_experiment_id": "550e8400-..." }
```

`details` validatörü yalnızca sayısal/bool/None kabul ediyor; `ab_variant` integer ve `ab_experiment_id`... `ab_experiment_id` UUID string olduğundan `details` validatörü genişletilmeli: string değerlere de izin ver ama uzunluk sınırla (max 64 karakter).

---

## 4. Backend

### 4.1 `app/api/v1/endpoints/recommendations.py` Değişiklikleri

**Varyant ağırlık sabiti (dosya başı):**

```python
VARIANT_WEIGHTS = {
    0: {"cat": 0.40, "rec": 0.35, "safety": 0.25},
    1: {"cat": 0.25, "rec": 0.55, "safety": 0.20},
    2: {"cat": 0.60, "rec": 0.20, "safety": 0.20},
}

VARIANT_WEIGHTS_PERSONAL = {
    0: {"cat": 0.25, "safety": 0.10},
    1: {"cat": 0.20, "safety": 0.10},
    2: {"cat": 0.45, "safety": 0.15},
}
```

**Atama fonksiyonu:**

```python
async def _get_or_assign_variant(user_id, experiment_id, db) -> int:
    existing = await db.get(AbVariantAssignment, user_id)
    if existing and str(existing.experiment_id) == str(experiment_id):
        return existing.variant
    variant = int(uuid.UUID(str(user_id)).int % 3)   # deterministik, DB yazısız
    db.add(AbVariantAssignment(user_id=user_id, experiment_id=experiment_id, variant=variant))
    await db.commit()
    return variant
```

**`get_recommendations` endpoint değişimi:**
- Aktif deney yoksa → varyant 0 (kontrol ağırlıkları), ab alanları response'tan çıkarılır
- Aktif deney varsa → `_get_or_assign_variant` çağrılır, ağırlıklar seçilir
- Response'a `ab_variant` ve `ab_experiment_id` eklenir

**`_warm_mode` ve `_personal_mode`:**
- `weights: dict` parametresi alır
- Sabit değerler yerine `weights["cat"]`, `weights["rec"]`, `weights["safety"]` kullanır

### 4.2 Yeni ORM Modelleri (`app/models/models.py`)

```python
class AbExperiment(Base):
    __tablename__ = "ab_experiments"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name            = Column(String(100), nullable=False)
    status          = Column(String(20), nullable=False, server_default="active")
    min_clicks      = Column(Integer, nullable=False, default=100)
    winner_variant  = Column(Integer, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    concluded_at    = Column(DateTime(timezone=True), nullable=True)

class AbVariantAssignment(Base):
    __tablename__ = "ab_variant_assignments"
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    experiment_id = Column(UUID(as_uuid=True), ForeignKey("ab_experiments.id", ondelete="CASCADE"), nullable=False)
    variant       = Column(Integer, nullable=False)
    assigned_at   = Column(DateTime(timezone=True), server_default=func.now())
```

### 4.3 Admin Endpoint'leri (`app/api/v1/endpoints/ab.py` — yeni dosya)

```
GET  /admin/ab/experiments               → deneyleri listele (id, name, status, click counts per variant)
GET  /admin/ab/experiments/{id}/results  → varyant bazlı CTR + feedback oranı
POST /admin/ab/experiments/{id}/conclude → body: {winner_variant: 0|1|2}
```

**Results sorgusu:**
```sql
SELECT
    details->>'ab_variant'                    AS variant,
    COUNT(*) FILTER (WHERE interaction_type = 'impression') AS impressions,
    COUNT(*) FILTER (WHERE interaction_type = 'click')       AS clicks,
    COUNT(*) FILTER (WHERE interaction_type = 'feedback_positive') AS positive_feedback
FROM content_interactions
WHERE details->>'ab_experiment_id' = :experiment_id
GROUP BY variant
```

### 4.4 `app/schemas/schemas.py` Değişikliği

`InteractionTrackRequest.details` validatörü: string değerlere izin ver ama max 64 karakter ve alfanümerik/tire olsun. Bu `ab_experiment_id` UUID string'ini taşımak için gerekli.

### 4.5 Migration: `scripts/migrate_ab_experiment.py`

- `ab_experiments` ve `ab_variant_assignments` tablolarını oluştur
- İlk denemi seed et: `name="rec_weights_v1"`, `status="active"`, `min_clicks=100`

---

## 5. Frontend

### 5.1 `frontend/src/pages/Gundem.jsx`

Öneri fetch sonrası state'e al:
```js
const [abVariant, setAbVariant] = useState(null);
const [abExperimentId, setAbExperimentId] = useState(null);
```

Recommendation response'tan:
```js
setAbVariant(data.ab_variant ?? null);
setAbExperimentId(data.ab_experiment_id ?? null);
```

Click track çağrısında `details` ekle:
```js
details: abVariant !== null ? { ab_variant: abVariant, ab_experiment_id: abExperimentId } : undefined
```

İmpression track çağrısında da aynı şekilde.

### 5.2 `frontend/src/pages/AdminABTest.jsx` (yeni)

İki bölüm:

**Deney listesi:**
- Tablo: ad, durum, varyant başına tıklama sayısı
- 100 tıklama eşiği dolunca satır yeşil vurgulanır

**Sonuç paneli (deney seçilince):**

| Varyant | İzlenim | Tıklama | CTR | Pozitif Feedback |
|---------|---------|---------|-----|-----------------|
| 0 Kontrol | ... | ... | ...% | ...% |
| 1 Recency | ... | ... | ...% | ...% |
| 2 Category | ... | ... | ...% | ...% |

En yüksek CTR'a sahip varyant yeşil. Her varyant 100 tıklamaya ulaşınca "Kazananı Uygula" butonu aktif → `POST /admin/ab/experiments/{id}/conclude` çağrısı → modal ile kazanan seçilir.

### 5.3 Admin Navbar / Route

Mevcut admin route yapısına `/admin/ab-test` eklenir. Admin sidebar'a "A/B Testi" linki eklenir.

---

## 6. Dosya Haritası

| Dosya | İşlem |
|-------|-------|
| `app/models/models.py` | `AbExperiment`, `AbVariantAssignment` modelleri ekle |
| `app/api/v1/endpoints/recommendations.py` | Varyant atama + ağırlık seçimi + response alanları |
| `app/api/v1/endpoints/ab.py` | Yeni — admin A/B endpoint'leri |
| `app/schemas/schemas.py` | `details` validatörü string'e izin ver |
| `app/main.py` | ab router'ı ekle |
| `scripts/migrate_ab_experiment.py` | Yeni — tablo oluştur + ilk deney seed |
| `frontend/src/pages/Gundem.jsx` | ab_variant state + details tracking |
| `frontend/src/pages/AdminABTest.jsx` | Yeni — sonuç paneli |
| `frontend/src/App.jsx` | `/admin/ab-test` route ekle |

---

## 7. Kapsam Dışı

- İstatistiksel anlamlılık (p-value) hesabı — kapsam dışı, 100 tıklama eşiği yeterli
- Birden fazla eş zamanlı deney
- Varyant otomatik uygulaması — admin her zaman manuel onaylar
- cold_start modu için varyant ağırlığı
