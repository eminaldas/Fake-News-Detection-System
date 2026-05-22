# BÖLÜM 3: METODOLOJİ

## 3.1 İhtiyaç Analizi

### 3.1.1 Mevcut Durum ve Sorun Tanımı

Projenin başladığı noktada Türkçe metin için kullanılabilir, açık kaynaklı ve tam otomatik bir sahte haber tespit sistemi bulunmamaktaydı. Mevcut çözümler ya İngilizce odaklıydı ya da Türkçe desteği sunanlar manuel süreçlere dayanıyordu. Bu boşluk; otomatik embedding üretimi, kural tabanlı sinyal çıkarımı ve topluluk doğrulamasını tek platformda birleştiren bir sistemin geliştirilmesini zorunlu kılmıştır.

### 3.1.2 Paydaş Analizi

Sistemin üç temel paydaş grubu tanımlanmıştır:

**Son kullanıcı (haber okuyucu):** Doğrulamak istediği bir metin, URL veya görsel için hızlı ve anlaşılır bir analiz sonucu beklemektedir. Teknik terimler değil, sade açıklamalar talep etmektedir. Analiz geçmişine erişmek, forum üzerinden tartışmalara katılmak ve katkıları karşılığında ödüllendirme beklemektedir.

**Editör / Moderatör (admin):** Kullanıcı yönetimi, içerik denetimi, güvenlik olaylarını izleme ve sistem sağlığını takip etme ihtiyacındadır. Sahte haber tespit oranları, günlük analiz sayıları ve kullanıcı davranışları hakkında görsel istatistiklere erişim talep etmektedir.

**Sistem (otonom süreç):** RSS beslemelerini düzenli aralıklarla tarayarak yeni haberleri otomatik olarak içe aktarması, gömme vektörleri oluşturması ve analiz sonuçlarını veritabanına yazması gerekmektedir. Model performansının kullanıcı geri bildirimlerine göre periyodik olarak güncellenmesi beklenmektedir.

### 3.1.3 Fonksiyonel Gereksinimler

**Tablo 3.1.** Fonksiyonel gereksinimler

| Kod | Gereksinim | Öncelik |
|-----|-----------|---------|
| FR-01 | Sistem metin, URL ve görsel analizi yapabilmelidir | Yüksek |
| FR-02 | Kullanıcı kaydı, JWT kimlik doğrulama ve Google OAuth desteklenmelidir | Yüksek |
| FR-03 | Analiz sonucu; NLP sinyal dökümü ve Gemini kanıtlarıyla birlikte sunulmalıdır | Yüksek |
| FR-04 | Forum thread, yorum ve oylama sistemi çalışmalıdır | Orta |
| FR-05 | Admin paneli kullanıcı, içerik ve güvenlik yönetimini kapsamalıdır | Yüksek |
| FR-06 | RSS tabanlı otomatik haber toplama ve analiz pipeline'ı çalışmalıdır | Yüksek |
| FR-07 | Şifre sıfırlama ve e-posta doğrulama akışları tamamlanmalıdır | Yüksek |
| FR-08 | WebSocket üzerinden gerçek zamanlı bildirim iletilmelidir | Orta |
| FR-09 | Görsel analiz (EXIF, algısal hash, Gemini) desteklenmelidir | Orta |
| FR-10 | Kullanıcı geri bildirimiyle model feedback loop çalışmalıdır | Orta |
| FR-11 | A/B testi altyapısı öneri ağırlıklarını optimize etmelidir | Düşük |
| FR-12 | Kullanıcı davranış takibi ve kişisel öneri sistemi çalışmalıdır | Orta |

### 3.1.4 Fonksiyonel Olmayan Gereksinimler

**Tablo 3.2.** Fonksiyonel olmayan gereksinimler

| Kod | Gereksinim | Ölçüt |
|-----|-----------|-------|
| NFR-01 | Güvenlik | JWT HS256, bcrypt parola hashleme, Redis tabanlı rate limiting, denetim günlükleri |
| NFR-02 | Performans | Async FastAPI, Celery worker kuyrukları ile 1 saniyenin altında anlık yanıt |
| NFR-03 | Ölçeklenebilirlik | Docker Compose ile 9 bağımsız servis; servis başına bellek limiti |
| NFR-04 | Güvenilirlik | Embedding microservice (OOM koruması), fail-open Gemini stratejisi |
| NFR-05 | Erişilebilirlik | Responsive React + Tailwind CSS; mobil, tablet ve masaüstü uyumu |
| NFR-06 | Veri Gizliliği | IP adresi SHA-256 ile hashlenerek saklanır; kullanıcı ajanı loglanmaz |

### 3.1.5 Kullanıcı Senaryoları

**UC-01: Haber URL analizi**
- Aktörler: Kayıtlı kullanıcı
- Ön koşul: Kullanıcı oturum açmış durumdadır
- Akış: (1) Kullanıcı haber URL'sini analiz formuna girer. (2) Sistem URL'yi scrape eder ve metni çıkarır. (3) Stage 1: pgvector cosine aramasıyla bilgi tabanı taranır. (4a) Eşleşme bulunursa benzerlik ağırlıklı oylama yapılır ve karar döndürülür. (4b) Eşleşme bulunamazsa Stage 2 başlar: 8 NLP sinyali çıkarılır, ML sınıflandırıcısı çalışır, Gemini gerekirse devreye girer. (5) Kullanıcı analiz sonucunu (etiket + sinyal dökümü + kanıtlar) görüntüler.
- Son koşul: Analiz sonucu veritabanına kaydedilmiş ve kullanıcıya sunulmuştur.

**UC-02: Forum'da iddia paylaşımı ve topluluk oylaması**
- Aktörler: Kayıtlı kullanıcı, topluluk üyeleri
- Ön koşul: Kullanıcı oturum açmış durumdadır
- Akış: (1) Kullanıcı forum'da yeni bir thread açar; iddiasını ve etiketleri girer. (2) Diğer kullanıcılar "Şüpheli", "Gerçek" veya "Araştırılmalı" oylarını kullanır. (3) Yeterli oy birikince sistem topluluk kararını hesaplar ve thread'i işaretler. (4) Kullanıcının trust tier puanı güncellenir.
- Son koşul: Thread, topluluk oylamasıyla etiketlenmiştir; kullanıcı deneyim puanı artmıştır.

**UC-03: Admin güvenlik denetimi**
- Aktörler: Admin kullanıcı
- Ön koşul: Admin yetkisiyle oturum açılmıştır
- Akış: (1) Admin, güvenlik panosuna girer. (2) Sistemin derlediği güvenlik olaylarını (başarısız giriş girişimleri, rate limit aşımları, coğrafi anomaliler) inceler. (3) Şüpheli kullanıcı hesabını askıya alır veya engeller.
- Son koşul: Güvenlik olayı kayıt altına alınmış ve gerekli işlem gerçekleştirilmiştir.

**UC-04: Otomatik RSS haberi analizi**
- Aktörler: Sistem (RSS Agent)
- Ön koşul: Celery Beat zamanlayıcısı aktiftir
- Akış: (1) Beat zamanlaması tetiklenir (günde 6 kez). (2) RSS worker, kaynak beslemelerinden yeni URL'leri toplar. (3) Her URL scrape edilir, metin çıkarılır. (4) BERT embedding üretilir ve dedup kontrolü yapılır. (5) Analiz pipeline çalıştırılır ve sonuç veritabanına yazılır.
- Son koşul: Yeni haber, analiz sonucuyla birlikte sisteme eklenmiştir.

## 3.2 Proje Planlama

### 3.2.1 Proje Kapsamı

Proje kapsamında yer alan tüm modüller Tablo 3.3'te özetlenmiştir.

**Tablo 3.3.** İş kırılım yapısı (WBS)

| Modül | Alt Görevler |
|-------|-------------|
| ML Pipeline | BERT embedding, NLP sinyal çıkarımı, sınıflandırıcı eğitimi, ensemble mantığı |
| Backend API | Auth, analiz, forum, admin, gamification, bildirimler, WebSocket |
| Frontend | 32 React sayfası (auth, analiz, forum, profil, admin) |
| Veri Toplama | RSS scraper, sitemap crawler, dataset ingestion (Teyit + AA) |
| Altyapı | Docker Compose (9 servis), Redis, PostgreSQL + pgvector |
| Güvenlik | JWT, bcrypt, rate limiting, audit log, SSRF koruması |
| Geri Bildirim | Model feedback loop, A/B testi, kullanıcı davranış takibi |

**Kapsam dışı bırakılan unsurlar:** Video içerik analizi, diğer dil desteği, Kubernetes orchestration, gerçek zamanlı TV izleme.

### 3.2.2 Teknoloji Yığını Seçim Gerekçeleri

**Tablo 3.4.** Teknoloji seçimleri ve gerekçeleri

| Teknoloji | Değerlendirilen Alternatif | Seçim Gerekçesi |
|-----------|--------------------------|-----------------|
| FastAPI | Django, Flask | Native async/await desteği, otomatik OpenAPI/Swagger belgesi, Pydantic tip güvenliği |
| PostgreSQL + pgvector | MongoDB + Elasticsearch | İlişkisel ve vektör sorgularının tek DB üzerinde çalışması; ayrı vektör deposu gerektirmez |
| BERT Turkish | mBERT, multilingual-e5 | Türkçeye özgü NLI + STS fine-tune; daha yüksek anlam benzerlik hassasiyeti |
| Celery + Redis | Dramatiq, RQ | Beat zamanlayıcısı, öncelikli kuyruklar, olgun ekosistem |
| React 19 + Tailwind CSS v4 | Vue 3, Angular | Bileşen ekosistemi, Tailwind v4 performans iyileştirmeleri |
| Docker Compose | Kubernetes | Tek düğüm dağıtımı için yeterli; düşük operasyonel karmaşıklık |
| Gemini 2.0 Flash | GPT-4o, Claude | Maliyet/kalite dengesi (~0,22 $/gün, 100 haber için) |

### 3.2.3 Geliştirme Süreci ve Zaman Çizelgesi

Proje, Agile benzeri bir iteratif geliştirme modeli benimsenmiştir. Her özellik için önce bir tasarım dokümanı (spec), ardından bir uygulama planı hazırlanmış; kodlama bu dokümanlar rehberliğinde gerçekleştirilmiştir. Toplam 46 tasarım dokümanı ve 52 uygulama planı oluşturulmuştur.

**Tablo 3.5.** Geliştirme zaman çizelgesi

| Dönem | Tarih Aralığı | Tamamlanan Özellikler |
|-------|--------------|----------------------|
| 1. Aşama | 24 Mart – 13 Nisan 2026 | Analiz pipeline, kullanıcı yönetimi, RSS sistemi, NLP sinyalleri, temel UI |
| 2. Aşama | 13 Nisan – 1 Mayıs 2026 | Forum altyapısı, trust index, moderasyon, kanıt toplama, derin rapor |
| 3. Aşama | 1 Mayıs – 21 Mayıs 2026 | Gamification, UI yeniden tasarımı, admin paneli, performans iyileştirmeleri |

### 3.2.4 Risk Yönetimi

**Tablo 3.6.** Risk tablosu

| Risk | Olasılık | Etki | Azaltma Stratejisi |
|------|---------|------|-------------------|
| BERT modeli bellek yetersizliği (OOM) | Yüksek | Yüksek | Embedding işlemi 900 MB sınırlı ayrı bir microservice'e taşındı |
| Yüksek yanlış pozitif oranı | Orta | Yüksek | Ensemble tasarımı: 0,70 × model + 0,30 × kural; her kaynak tek başına kararı ele geçiremiyor |
| Gemini API kesintisi | Düşük | Orta | Fail-open stratejisi: Gemini yanıt vermediğinde ML sonucu döndürülür |
| Veri kümesi sınıf dengesizliği | Orta | Orta | class_weight="balanced" parametresi, proportion cap (%15) |
| Rate limit aşımı | Orta | Düşük | Redis tabanlı IP başına sayaç, Celery kuyruklama |

## 3.3 Algoritma ve Makine Öğrenimi Metodolojisi

### 3.3.1 İki Aşamalı Analiz Pipeline

Sistem, gerçek zamanlı yanıt hızını ve derin analiz kalitesini aynı anda karşılamak amacıyla iki aşamalı bir mimari üzerine inşa edilmiştir.

**Birinci Aşama (Anlık Semantik Arama):** Gelen metin, Türkçe BERT modeliyle 768 boyutlu bir vektöre dönüştürülür. Bu vektör, PostgreSQL üzerindeki pgvector uzantısı aracılığıyla bilgi tabanındaki vektörlerle karşılaştırılır. Cosine uzaklık eşiği 0,08 (yaklaşık %92 benzerlik) olarak belirlenmiştir. Eşik değerin altında kalan (yani bilgi tabanına yakın) en fazla üç eşleşme için benzerlik karesi ağırlıklı oylama yapılır:

```
ağırlık = benzerlik²
kazanan = argmax(ağırlıklı_oy["SAHTE"], ağırlıklı_oy["GERÇEK"])
```

Bu tasarım, tek bir yakın eşleşmenin kararı çarpıtmasını önlerken birden fazla güçlü eşleşmenin daha fazla söz hakkı almasını sağlar.

**İkinci Aşama (Derin Makine Öğrenimi Analizi):** Birinci aşamada eşleşme bulunamazsa Celery worker kuyruğuna bir görev eklenir ve aşağıdaki adımlar eşzamansız olarak yürütülür:

1. Metinden 8 NLP sinyali çıkarılır
2. Risk skoru hesaplanır
3. 768 boyutlu BERT vektörü ile 8 sinyal birleştirilerek 776 boyutlu öznitelik vektörü oluşturulur
4. Scikit-learn pipeline (StandardScaler → LogisticRegression) çalıştırılır
5. Ensemble kararı hesaplanır
6. Güven belirsizse Gemini LLM devreye girer

### 3.3.2 NLP Sinyal Çıkarımı

Sekiz sinyal, manipülatif dilin karakteristik göstergelerini ölçmek amacıyla seçilmiştir. Her sinyal, cleaner.py modülündeki SIGNAL_KEYS sabiti üzerinden sıra korunarak sınıflandırıcıya iletilir.

**Tablo 3.7.** NLP sinyal tanımları

| Sinyal | Tanım | Sahtelik Katkısı |
|--------|-------|-----------------|
| exclamation_ratio | Ünlem işareti yoğunluğu | Pozitif |
| caps_ratio | Büyük harf kullanım oranı | Pozitif |
| question_density | Soru işareti yoğunluğu | Pozitif |
| clickbait_score | ~30 Türkçe sensasyon kelimesi (şok, bomba, flaş…) | Pozitif (ağırlık: 0,30) |
| hedge_ratio | Belirsizlik ifadeleri ("iddia edildi", "söyleniyor") | Pozitif |
| source_score | Resmi kaynak referansı | Negatif (riski düşürür) |
| avg_word_length | Kısa kelime ortalaması (sensasyon dili göstergesi) | Pozitif |
| number_density | Rakam yoğunluğu | Pozitif |

Risk skoru aşağıdaki formülle hesaplanır:

```
risk = clickbait × 0,30 + exclamation × 0,20 + uppercase × 0,15
     + hedge × 0,15 + question × 0,10 + number_density × 0,05
     + short_word_penalty × 0,10 − source_score × 0,15
risk = clamp(risk, 0,0, 1,0)
```

### 3.3.3 Ensemble Karar Mekanizması

Makine öğrenimi modelinin olasılık çıktısı ile kural tabanlı risk skorunu dengeleyen ağırlıklı topluluk kararı şu formülle hesaplanır:

```
combined    = 0,70 × sahte_olasılığı + 0,30 × risk_skoru
pred_status = "SAHTE"  if combined > 0,50  else "GERÇEK"
güven       = max(combined, 1 − combined)
```

0,70 / 0,30 ağırlık dağılımı, modelin temel karar kaynağı olmaya devam etmesini; ancak kural sinyallerinin ikincil düzeltici rol üstlenmesini sağlamaktadır. Bu tasarımın ardındaki temel motivasyon, önceki yaklaşımın hatasını gidermektir: eski kodda düşük güvenlikli GERÇEK tahminleri, minimal bir kural sinyaliyle SAHTE etiketine çekiliyordu. Ağırlıklı topluluk kararı bu asimetriyi ortadan kaldırmaktadır.

### 3.3.4 Model Eğitimi

Sınıflandırıcı, iki farklı kaynaktan derlenen Türkçe haber veri kümesi üzerinde eğitilmiştir: Teyit sahte haber arşivi ve Anadolu Ajansı doğrulanmış haber veri kümesi.

**Tablo 3.8.** Model eğitim istatistikleri

| Parametre | Değer |
|-----------|-------|
| Toplam örnek sayısı | 3.286 |
| Gerçek haber örneği | 1.731 |
| Sahte haber örneği | 1.555 |
| Öznitelik boyutu | 776 (768 BERT + 8 sinyal) |
| Sınıflandırıcı | LogisticRegression (class_weight="balanced") |
| Ön işleme | StandardScaler |
| Doğruluk (Accuracy) | %88 |
| F1-skoru (Gerçek) | 0,89 |
| F1-skoru (Sahte) | 0,88 |
| Son eğitim tarihi | 23 Mart 2026 |

StandardScaler, tüm 776 boyutu normalize etmekte; LogisticRegression'daki class_weight="balanced" parametresi, sınıf dengesizliğinden kaynaklanabilecek önyargıyı azaltmaktadır. Eğitim ve çıkarım (inference) aşamalarında sinyal sırası SIGNAL_KEYS sabiti üzerinden senkronize edilir; yeni sinyal eklenmesi durumunda modelin yeniden eğitilmesi zorunludur.
