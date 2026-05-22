# BÖLÜM 1: GİRİŞ

## 1.1 Problem Tanımı

İnternetin ve akıllı mobil cihazların yaygınlaşmasıyla birlikte bilgiye erişim hızı olağanüstü bir artış göstermiştir. Ancak bu hız, bilginin doğrulanma sürecinden çok daha hızlı yayılmasına zemin hazırlamaktadır. Dünya Sağlık Örgütü (WHO), COVID-19 salgını döneminde bu olguyu "infodemic" olarak adlandırmış; sağlıkla ilgili yanlış bilgilerin, virüsün kendisi kadar tehlikeli sonuçlar doğurabileceğine dikkat çekmiştir (WHO, 2020).

Türkiye özelinde değerlendirildiğinde, sosyal medya kullanım oranlarının yüksekliği ve WhatsApp, Twitter/X ile çeşitli haber portalları üzerinden akan içerik akışının yoğunluğu, dezenformasyonun yayılması için elverişli bir ortam oluşturmaktadır. Dijital medya okuryazarlığı konusundaki eksiklikler ve algoritmik filtre balonları, kullanıcıların karşılaştıkları içeriklerin güvenilirliğini sorgulamalarını güçleştirmektedir. Seçim dönemleri, doğal afetler ve salgın hastalıklar gibi toplumsal kriz anlarında asılsız haberlerin paniğe, ayrışmaya ve kurumsal güven erozyonuna yol açtığı pek çok örnekle belgelenmiştir.

Mevcut fact-checking kuruluşları —Türkiye'deki örnekleriyle teyit.org ve Doğruluk Payı— bu sorunu insan analistlerin çabasıyla çözmeye çalışmaktadır. Bu yaklaşım kalite açısından değerli olmakla birlikte, ölçeklenebilirlik sorunu barındırmaktadır: bir editörün günde inceleyebileceği haber sayısı onlarla sınırlıyken sosyal medyada dakikada binlerce içerik üretilmektedir. Manuel doğrulamanın bu açığı kapatması yapısal olarak mümkün değildir.

## 1.2 Mevcut Çözümlerin Yetersizliği

Akademik literatürde ve endüstride sahte haber tespitine yönelik çeşitli otomatik sistemler geliştirilmiştir. Ancak bu çalışmaların büyük çoğunluğu İngilizce metinlere odaklanmaktadır. Bu durum, Türkçe gibi morfolojik açıdan karmaşık dillerde ciddi bir boşluk bırakmaktadır.

Türkçe, ekleme (agglutinative) yapısına sahip bir dildir. Bir fiil veya isim kökü, çok sayıda ek alarak anlam ve bağlam kazanır. Bu özellik, kelime kökü çıkarma ve anlam belirsizliği giderme gibi NLP görevlerini İngilizce'ye kıyasla çok daha zor hâle getirmektedir. İngilizce odaklı modeller doğrudan Türkçeye uygulandığında başarım belirgin biçimde düşmektedir.

Bunun yanı sıra mevcut araçların büyük bölümü, kullanıcıya yalnızca bir etiket (sahte/gerçek) sunmakta; kararın hangi gerekçeye dayandığını açıklamamaktadır. Karar mekanizmasının şeffaf olmaması, kullanıcı güvenini zedelemekte ve sistemin bir araç olarak benimsenmesini zorlaştırmaktadır.

## 1.3 Projenin Amacı ve Katkısı

Bu çalışma kapsamında geliştirilen nehaber.dev platformu, yukarıda tanımlanan boşlukları üç temel katkıyla gidermeyi hedeflemektedir.

**Birinci katkı — Türkçe odaklı otomatik analiz:** Platform, Türkçe metinleri, URL'leri ve görselleri işleyebilen, Türkçeye özel BERT modeli kullanan tam otomatik bir analiz pipeline'ına sahiptir. Saniyeler içinde tamamlanan birinci aşamada pgvector tabanlı semantik arama, daha önce doğrulanmış haberlerle anlık karşılaştırma yapar; ikinci aşamada ise sekiz dil sinyali ve makine öğrenimi sınıflandırıcısı devreye girer.

**İkinci katkı — Açıklanabilir karar:** Sistem, yalnızca bir etiket üretmekle kalmaz; tıkbait puanı, büyük harf oranı, belirsizlik ifadeleri ve kaynak güvenilirliği gibi sekiz sinyalin ayrıntılı dökümünü kullanıcıya sunar. Bu yaklaşım, kararın hangi dilsel göstergelere dayandığını şeffaf biçimde ortaya koyar.

**Üçüncü katkı — Topluluk katmanı:** Platform, otomatik analizin yanı sıra kullanıcıların forum aracılığıyla iddia paylaşabildiği, oylayabildiği ve tartışabildiği bir topluluk doğrulama mekanizması içermektedir. Trust index sistemi, aktif ve güvenilir kullanıcıların katkılarına daha fazla ağırlık verir.

## 1.4 Kapsam ve Sınırlar

**Kapsam içi:** Türkçe metin, URL ve görsel analizi; kullanıcı kaydı ve kimlik doğrulama; forum, oylama ve yorum sistemi; RSS tabanlı otomatik haber toplama; Google Gemini ile kanıt toplama ve fact-check; admin paneli; gamification (deneyim puanı, rozet); kullanıcı davranış takibi ve öneri sistemi; A/B testi altyapısı.

**Kapsam dışı:** Video içeriklerinin analizi; İngilizce veya diğer dillerdeki metinlerin doğrulanması; gerçek zamanlı televizyon ve radyo yayını izleme; sosyal medya API entegrasyonu (Twitter/X kısıtlamaları nedeniyle).

## 1.5 Tezin Yapısı

Bu tez beş ana bölümden oluşmaktadır. İkinci bölümde, sahte haber tespitine ilişkin akademik literatür incelenmekte ve mevcut platformların karşılaştırmalı pazar araştırması sunulmaktadır. Üçüncü bölümde projenin ihtiyaç analizi, planlama süreci ve kullanılan algoritmaların metodolojisi açıklanmaktadır. Dördüncü bölümde sistem mimarisi, veritabanı şeması, kullanıcı arayüzü ve önemli kod bileşenleri detaylandırılmaktadır. Beşinci ve son bölümde elde edilen bulgular değerlendirilmekte, sınırlamalar tartışılmakta ve gelecek çalışmalar için öneriler sunulmaktadır.
