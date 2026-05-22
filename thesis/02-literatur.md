# BÖLÜM 2: LİTERATÜR TARAMA VE PAZAR ARAŞTIRMASI

## 2.1 Sahte Haber: Tanım ve Sınıflandırma

"Sahte haber" kavramı, akademik literatürde birden fazla anlam katmanı barındıran ve sınırları tartışmalı bir terimdir. Wardle ve Derakhshan (2017), bu kavramı "bilgi bozukluğu" (information disorder) çerçevesinde ele alarak üç ana kategoriye ayırmaktadır: yanlış bilgi (misinformation), kasıtlı dezenformasyon (disinformation) ve kötü amaçlı bilgi (malinformation). Bu sınıflandırma, içeriğin gerçeklik düzeyini ve üreticinin kastını merkeze almaktadır.

Aynı çalışmada yedi içerik türü tanımlanmaktadır: olgusal olmayan hiciv ve parodi (satire/parody), yanıltıcı çerçeveleme (misleading content), gerçek kaynakların taklit edilmesi (imposter content), tamamen uydurma içerik (fabricated content), doğru içeriğin yanlış bağlamda kullanımı (false context), gerçek içeriğin manipülasyonu (manipulated content) ve bağlantısız içerik (false connection). Bu çerçeve, sahte haber kavramının tek boyutlu bir doğru/yanlış ikiliğine indirgenmesini önlediği için akademik çevrelerde geniş kabul görmektedir.

Türkçe literatürde ise "yanlış bilgi", "asılsız haber" ve "dezenformasyon" terimleri sıkça kullanılmakla birlikte standart bir sınıflandırma henüz oluşmamıştır. Bu çalışmada, Wardle ve Derakhshan'ın (2017) çerçevesi temel alınmış; ancak sınıflandırma pratik uygulama gereksinimlerine göre iki kategoriye —SAHTE ve GERÇEK— sadeleştirilmiştir.

## 2.2 Doğal Dil İşleme ile Sahte Haber Tespiti

### 2.2.1 Geleneksel Makine Öğrenimi Yaklaşımları

Sahte haber tespitine yönelik ilk sistematik çalışmalar, metin temsili için TF-IDF (Term Frequency–Inverse Document Frequency) vektörleştirmesini ve sınıflandırıcı olarak Destek Vektör Makinelerini (SVM) ya da Naive Bayes modellerini kullanmıştır (Pérez-Rosas vd., 2018). Bu yaklaşımlar, göreceli düşük hesaplama maliyetleriyle kabul edilebilir başarım sağlamış; ancak kelimelerin bağlamsal anlamını yansıtamama gibi temel bir sınırlılıkla karşı karşıya kalmıştır.

Wang (2017), LIAR adıyla bilinen ve 12.836 kısa siyasi ifade içeren bir kıyaslama veri kümesi oluşturarak bu alandaki çalışmalara önemli bir kaynak kazandırmıştır. Söz konusu veri kümesi, altı etiket kategorisi (pants-fire, false, barely-true, half-true, mostly-true, true) içermesiyle ince taneli bir değerlendirme imkânı sunmaktadır.

### 2.2.2 Derin Öğrenme ve BERT

Devlin vd. (2018) tarafından önerilen BERT (Bidirectional Encoder Representations from Transformers) modeli, doğal dil işleme alanında bir kırılma noktası oluşturmuştur. BERT'in iki yönlü dikkat mekanizması, bir kelimenin anlamını hem önceki hem de sonraki bağlam gözetilerek temsil etmesini sağlamakta; bu sayede anlam belirsizliği sorununu büyük ölçüde çözmektedir.

Sahte haber tespiti bağlamında BERT ve türevleri, geleneksel yöntemlere kıyasla belirgin başarım artışı sağlamıştır. Reimers ve Gurevych (2019), Siamese BERT mimarisine dayanan Sentence-BERT modelini geliştirerek cümle düzeyinde anlamsal benzerlik hesaplamasını verimli hâle getirmiştir. Bu çalışmada kullanılan emrecan/bert-base-turkish-cased-mean-nli-stsb-tr modeli, aynı mimari prensip üzerine Türkçe metin çiftleriyle ince ayar yapılarak oluşturulmuştur (Ekin, 2022).

### 2.2.3 Topluluk Sinyalleri ve Hibrit Yaklaşımlar

Yalnızca metin içeriğine dayalı modellerin sınırlılıklarını aşmak amacıyla sosyal bağlam sinyallerini —yayılma ağı, kullanıcı davranışı, kaynak güvenilirliği— birleştiren hibrit modeller önerilmiştir (Shu vd., 2017). Bu çalışmada benimsenen yaklaşım da benzer bir mantığa sahiptir: makine öğrenimi modeli ve kural tabanlı NLP sinyalleri, ağırlıklı topluluk kararı mekanizmasıyla birleştirilmektedir.

## 2.3 Türkçe Doğal Dil İşlemenin Özgün Zorlukları

Türkçe, Ural-Altay dil ailesine mensup bir ekleme (agglutinative) dilidir. Bu yapısal özellik, her kelime köküne çok sayıda biçimbirim eklenebileceği anlamına gelmektedir; nitekim tek bir fiil kökü, dilbilgisel açıdan geçerli yüzlerce farklı biçim alabilmektedir. Bu durum, kelime dağarcığının İngilizce'ye kıyasla çok daha geniş ve dağınık olmasına yol açmakta; bu da TF-IDF gibi kelime sayımına dayalı yöntemlerin etkinliğini önemli ölçüde azaltmaktadır.

Schweter (2020) tarafından geliştirilen BERTurk modeli, Türkçe metinler üzerinde ön eğitim görmüş ilk kapsamlı BERT modellerinden biridir. Bu çalışmada tercih edilen emrecan/bert-base-turkish-cased-mean-nli-stsb-tr modeli ise doğal dil çıkarımı (NLI) ve anlam benzerliği (STS) görevleriyle ince ayar yapılmış olması nedeniyle cümle düzeyinde anlam temsili için daha uygun bir seçenek sunmaktadır (Ekin, 2022). Modelin 768 boyutlu çıktı vektörleri, pgvector üzerinde cosine benzerlik araması için doğrudan kullanılmaktadır.

## 2.4 Vektör Benzerlik Arama ve pgvector

Yoğun vektör temsilleriyle (dense embeddings) çalışan sistemlerde milyonlarca kayıt üzerinde hızlı benzerlik araması, hesaplama açısından kritik bir güçlüktür. Johnson vd. (2021), GPU hızlandırmalı yaklaşık en yakın komşu (ANN) algoritmaları üzerine kapsamlı bir çalışma yürütmüştür. pgvector, bu yaklaşımı PostgreSQL içinde IVFFlat ve HNSW indeksleme yöntemleriyle hayata geçiren açık kaynaklı bir uzantıdır (pgvector, 2024). Ayrı bir vektör veritabanı gerektirmeksizin ilişkisel ve vektör sorgularının aynı sistem üzerinde yürütülmesi, bu çalışmada pgvector tercihinin temel gerekçesini oluşturmaktadır.

## 2.5 Pazar Araştırması

Tablo 2.1, mevcut sahte haber tespit platformlarını birden fazla kriter üzerinden karşılaştırmaktadır.

**Tablo 2.1.** Sahte haber tespit platformlarının karşılaştırması

| Platform | Dil | Otomasyon | Türkçe | Topluluk | Açıklanabilirlik |
|----------|-----|-----------|--------|----------|-----------------|
| ClaimBuster (Hassan vd., 2017) | İngilizce | Yarı otomatik | Hayır | Hayır | Düşük |
| Full Fact (UK) | İngilizce | Kısmi | Hayır | Hayır | Orta |
| teyit.org | Türkçe | Manuel | Evet | Hayır | Yüksek |
| Doğruluk Payı | Türkçe | Manuel | Evet | Hayır | Yüksek |
| **nehaber.dev (bu çalışma)** | **Türkçe** | **Tam otomatik** | **Evet** | **Evet** | **Yüksek** |

**ClaimBuster** (Hassan vd., 2017), cümle düzeyinde doğrulamaya değer iddiaları puanlayan bir sistem sunmaktadır. Ancak yalnızca İngilizce metinleri desteklemekte ve nihai doğrulama sürecini insan analistlere bırakmaktadır.

**Full Fact**, Birleşik Krallık'ta faaliyet gösteren ve kısmi otomasyon kullanan bir fact-checking platformudur. Türkçe desteği bulunmamakta, topluluk katmanı ise sisteme entegre edilmemiştir.

**teyit.org**, Türkiye'nin önde gelen bağımsız fact-checking kuruluşudur. Gazeteci ve uzmanların yürüttüğü manuel süreçlere dayanmakta; bu nedenle yüksek kaliteli ancak düşük hacimli doğrulama sunmaktadır. Otomatik analiz altyapısı bulunmamaktadır.

**Doğruluk Payı** da teyit.org ile benzer bir manuel doğrulama yaklaşımı benimsemektedir.

## 2.6 Bu Çalışmanın Özgünlüğü

Tablo 2.1'den görüldüğü üzere, Türkçe dil desteği, tam otomasyon ve topluluk doğrulamasını aynı anda sunan bir platform mevcut değildir. Bu çalışma, söz konusu boşluğu aşağıdaki özgün katkılarla kapatmaktadır:

**Hibrit mimari:** pgvector semantik araması ve makine öğrenimi sınıflandırıcısının topluluk kararıyla bütünleştirilmesi, tek başına herhangi bir bileşenden daha güçlü bir sistem ortaya koymaktadır.

**Açıklanabilir yapay zeka:** Sekiz NLP sinyalinin kullanıcıya ayrıntılı biçimde sunulması, sistemin "kara kutu" olmaktan çıkmasını ve kullanıcı güvenini pekiştirmesini sağlamaktadır.

**LLM destekli kanıt toplama:** Google Gemini entegrasyonu, belirsiz sınıflandırma durumlarında web'den güncel kanıt toplayarak ve iddia analizi yaparak insan düzeyine yakın bir fact-check deneyimi sunmaktadır.

**Canlı sistem:** Platform, gerçek kullanıcılarla nehaber.dev adresinde aktif olarak hizmet vermekte; bu da önerilen yaklaşımın yalnızca akademik bir prototip olmadığını kanıtlamaktadır.
