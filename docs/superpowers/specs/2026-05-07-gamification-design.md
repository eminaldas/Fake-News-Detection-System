# Gamification Sistemi Tasarımı
**Tarih:** 2026-05-07  
**Kapsam:** XP puanları, seviye sistemi, rozet/başarım sistemi, sıralama sayfası, profil rozet vitrini

---

## Genel Bakış

Mevcut `forum_trust_score` ve tier sistemi (`yeni_uye → doğrulayıcı → analist → dedektif`) korunur ve **XP tabanlı bir gamification katmanıyla zenginleştirilir**. Puanlar aksiyonlarla anlık kaydedilir (event tablosu), seviye/tier güncelleme gece çalışan Celery task'ı tarafından yapılır.

Frontend'deki mevcut koşullu rozet sistemi (`getBadges()`) tamamen kaldırılır, yerine backend-driven `UserBadge` tablosundan beslenen gerçek sistem gelir.

---

## 1. Veritabanı Değişiklikleri

### 1.1 Yeni Tablolar

**`UserXPEvent`**
```
id           : int PK
user_id      : FK → User
action_type  : enum (aşağıda)
xp_amount    : int
ref_id       : int nullable  (analiz/thread/yorum id'si)
created_at   : datetime
```

`action_type` enum değerleri:
- `analysis_created`
- `thread_created`
- `comment_created`
- `vote_cast`
- `evidence_added`
- `helpful_received`
- `followed`
- `daily_login`

**`UserBadge`**
```
id             : int PK
user_id        : FK → User
badge_key      : str  (rozet tanım anahtarı, ör. "first_analysis")
earned_at      : datetime
is_showcased   : bool default False
showcase_order : int nullable  (0, 1, 2 — profilde gösterim sırası)
UNIQUE(user_id, badge_key)
```

### 1.2 `User` Modeline Eklemeler
```python
total_xp        : int      default 0
level           : int      default 1
current_streak  : int      default 0   # üst üste giriş günü sayısı
last_login_date : date     nullable    # günlük giriş XP deduplikasyonu için
```
Mevcut `forum_trust_score` ve `forum_trust_tier` alanları **korunur**.

---

## 2. Puan Tablosu

| Aksiyon | XP | Günlük Limit |
|---|---|---|
| Kanıt ekleme (evidence_urls'li yorum) | +25 | max 3/gün |
| Forum thread açma | +15 | max 5/gün |
| Analiz oluşturma | +8 | max 10/gün |
| Yorumu faydalı bulunma | +10 | — (başkası veriyor) |
| Takip edilme | +5 | — (başkası veriyor) |
| Yorum yapma | +5 | max 15/gün |
| Günlük giriş | +3 | 1/gün |
| Oy kullanma | +2 | max 20/gün |

Günlük limitler Redis'te `xp:daily:{user_id}:{action_type}:{YYYY-MM-DD}` anahtarıyla takip edilir (TTL: 24 saat).

---

## 3. Seviye Sistemi

Seviye eşikleri (kümülatif XP):

| Seviyeler | XP artışı / seviye |
|---|---|
| 1 → 10 | Her seviye +100 XP artar (100, 200, 300 ... 1000) |
| 11 → 20 | Her seviye 500 XP sabit |
| 21 → 30 | Her seviye 1000 XP sabit |
| 31+ | Her seviye 1500 XP sabit |

Hesaplama:
```python
def xp_for_level(level: int) -> int:
    if level <= 10:
        return sum(100 * i for i in range(1, level))
    elif level <= 20:
        return xp_for_level(10) + (level - 10) * 500
    elif level <= 30:
        return xp_for_level(20) + (level - 20) * 1000
    else:
        return xp_for_level(30) + (level - 30) * 1500
```

Seviye, nightly Celery task'ı tarafından `total_xp`'den hesaplanır.

---

## 4. Rozet Sistemi

Rozet tanımları `workers/badge_definitions.py` Python sabitinde tutulur. Üç kategori:

### 4.1 Seviye Rozetleri (6 adet)
| Badge Key | İsim | Koşul |
|---|---|---|
| `level_1` | Çaylak | Seviye 1 (başlangıç) |
| `level_10` | Meraklı | Seviye 10 |
| `level_20` | Araştırmacı | Seviye 20 |
| `level_30` | Analist | Seviye 30 |
| `level_40` | Dedektif | Seviye 40 |
| `level_50` | Usta | Seviye 50+ |

### 4.2 Aktivite / Kilometre Taşı Rozetleri (~13 adet)
| Badge Key | İsim | Koşul |
|---|---|---|
| `first_analysis` | İlk Adım | 1 analiz |
| `analyst_100` | Yüzlük | 100 analiz |
| `first_thread` | Forum Açıcı | 1 thread |
| `prolific_50` | Üretken | 50 thread |
| `evidence_10` | Kanıtçı | 10 kanıt ekle |
| `evidence_50` | Gerçek Avcısı | 50 kanıt ekle |
| `social_10` | Sosyal | 10 takipçi |
| `social_100` | Influencer | 100 takipçi |
| `helpful_50` | Faydalı İnsan | 50 kez faydalı bulunma |
| `streak_7` | Haftalık Alışkanlık | 7 gün üst üste giriş |
| `streak_30` | Aylık Seri | 30 gün üst üste giriş |
| `debunker` | Çürütücü | FAKE sonuçlu bir analiz haberinde kanıt içeren yorum yaptı (5 kez) |
| `early_bird` | Erken Kuş | Kayıt sırasında toplam kullanıcı sayısı ≤ 100 — migration sırasında mevcut ilk 100 kullanıcıya toplu atanır |

### 4.3 Kategori Rozetleri (9 adet — her forum kategorisi için 1)
Koşul: O kategoride 20+ thread açma.

`cat_haberler`, `cat_teknoloji`, `cat_kultur`, `cat_spor`, `cat_eglence`, `cat_bilim`, `cat_ekonomi`, `cat_genel` + `cat_all` (tüm kategorilerde aktif)

### 4.4 Rozet Unlock Mantığı
Her `award_xp()` çağrısının sonunda `check_and_unlock_badges(user_id)` çalışır. Kilitli tüm rozetlerin koşulları kontrol edilir, kazanılanlar `UserBadge`'e insert edilir. Yeni kazanılan rozetler response'a eklenir.

---

## 5. Profil Vitrin (Showcase)

- Kullanıcı kazandığı rozetlerden **max 3 tanesini** profil sayfasında sergileyebilir.
- `POST /gamification/me/showcase` ile seçim yapılır.
- `UserBadge.is_showcased` ve `showcase_order` (0/1/2) ile sıralı gösterim.
- Seçilmemiş rozetler `/badges` sayfasında görünür ama profilde gösterilmez.

---

## 6. API Endpoint'leri

Tümü `app/api/v1/endpoints/gamification.py` altında, prefix `/gamification`.

### XP & Seviye
```
GET /gamification/me/stats
    → { total_xp, level, xp_to_next_level, xp_progress_pct,
        tier, trust_score, recent_events[10] }

GET /gamification/users/{user_id}/stats
    → Aynı, public (recent_events olmadan)
```

### Rozetler
```
GET /gamification/me/badges
    → { earned: [BadgeDetail], locked: [BadgeDetail+progress] }

GET /gamification/badges
    → Tüm rozet kataloğu (tanımlar)

POST /gamification/me/showcase
    body: { badge_keys: ["k1", "k2", "k3"] }
    → Seçilen 3 rozeti vitrine al

GET /gamification/users/{user_id}/showcase
    → Profilden gösterilecek max 3 rozet
```

### Sıralama
```
GET /gamification/leaderboard
    ?period=weekly|monthly|alltime
    &type=xp|analyses|threads|evidence

    → { period, type, entries: [{rank, user_id, username,
        avatar_url, value, level, showcase_badges[3]}] }
```

Leaderboard sonuçları Redis'te 5 dakika cache'lenir.

---

## 7. XP Servis Akışı

`app/services/xp_service.py` — `award_xp(user_id, action_type, ref_id=None)`:

```
1. Redis'te günlük limit kontrolü
   → Limit dolmuşsa: return {"xp_gained": 0, "new_badges": []}
2. UserXPEvent insert
3. User.total_xp += xp_amount  (UPDATE)
4. check_and_unlock_badges(user_id)
   → Yeni kazanılan rozetleri UserBadge'e insert
5. return {"xp_gained": xp_amount, "new_badges": [yeni_rozet_listesi]}
```

Mevcut endpoint entegrasyonu (tek satır ekleme):
- `analysis.py` → analiz tamamlandıktan sonra `await award_xp(user.id, "analysis_created", analysis_id)`
- `forum.py` → thread oluşturma, yorum oluşturma (evidence_urls doluysa `evidence_added` olarak), oy kullanma, faydalı işaretlemeden sonra ilgili `award_xp(...)` çağrısı
- `users.py` → follow endpoint'inden sonra `award_xp(followed_user.id, "followed")`
- `auth.py` veya profil endpoint'i → giriş sırasında `last_login_date` kontrol edilir; bugün ilk girişse `award_xp(user.id, "daily_login")` ve streak güncellenir

---

## 8. Nightly Task Güncellemesi

`workers/trust_tasks.py` mevcut task'ına ekleme:
- `total_xp`'den `level` hesapla ve yaz
- `forum_trust_tier`'ı da `total_xp` eşiklerine göre güncelle (mevcut puan formülü korunur, ek girdi olarak)

---

## 9. Frontend

### 9.1 Yeni Sayfa: `/badges`
`frontend/src/pages/Badges.jsx`

3 sekme:
- **Seviyeler** — 6 level badge kartı, kazanılan renkli + ikon, kilitli gri + progress bar ve "X XP gerekiyor"
- **Başarımlar** — aktivite + kilometre taşı + kategori rozetleri grid, her birinde ilerleme sayacı
- **Sıralama** — period (haftalık/aylık/tüm zaman) × type (XP/analiz/thread/kanıt) çift filtre, top 50 liste, kendi sıran vurgulu

### 9.2 Profil Güncellemesi
`ProfileOverview.jsx` üstüne rozet vitrin alanı:
- 3 slot gösterim (seçilmemişse boş/gri placeholder)
- "Rozet Seç" butonu → kazanılan rozetleri listeleyen modal
- Modal'da rozet seçilince `POST /gamification/me/showcase` çağrılır

### 9.3 XP Toast Bildirimi
`components/XPToast.jsx` — aksiyon sonrası ekranın sağ altında `+8 XP · Analiz Oluşturuldu` (2 sn, hafif animasyon). Yeni rozet açılırsa ayrı kutlama modal'ı.

### 9.4 Navbar
Kullanıcı menüsü avatar yanında küçük level badge (renk kodu) ve `/badges` linki.

---

## 10. Dosya Değişiklik Listesi

**Backend (yeni):**
- `app/models/gamification.py` — UserXPEvent, UserBadge modelleri
- `app/services/xp_service.py` — award_xp, check_and_unlock_badges
- `app/api/v1/endpoints/gamification.py` — tüm gamification endpoint'leri
- `workers/badge_definitions.py` — rozet tanımları sabiti
- `alembic/versions/xxxx_add_gamification.py` — migration

**Backend (değişen):**
- `app/models/models.py` — User'a total_xp, level ekleme
- `app/api/v1/endpoints/analysis.py` — award_xp entegrasyonu
- `app/api/v1/endpoints/forum.py` — award_xp entegrasyonu
- `app/api/v1/endpoints/users.py` — award_xp entegrasyonu (follow)
- `workers/trust_tasks.py` — level hesaplama ekleme
- `app/api/v1/router.py` — gamification router kaydı

**Frontend (yeni):**
- `src/pages/Badges.jsx`
- `src/components/XPToast.jsx`
- `src/components/BadgeShowcaseModal.jsx`
- `src/components/LeaderboardTable.jsx`

**Frontend (değişen):**
- `src/pages/UserProfile.jsx` — getBadges() kaldırılır, showcase API'den gelir
- `src/components/ProfileOverview.jsx` — vitrin alanı + seçim modal'ı
- `src/components/Navbar.jsx` — level badge göstergesi
- `src/App.jsx` — /badges route ekleme
