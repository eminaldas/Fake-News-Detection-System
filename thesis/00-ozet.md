# ÖZET

Dijital iletişimin hız kazandığı günümüzde dezenformasyon, kamuoyunu manipüle etme potansiyeli taşıyan en ciddi tehditlerden biri hâline gelmiştir. Türkiye gibi sosyal medya kullanımının yoğun olduğu ülkelerde asılsız haberlerin kısa sürede geniş kitlelere ulaşması, manuel doğrulama süreçlerini yetersiz kılmaktadır. Bu çalışmada, Türkçe metinleri otomatik olarak analiz eden, kanıt toplayan ve topluluk doğrulamasını destekleyen bütünleşik bir sahte haber tespit platformu geliştirilmiştir.

Geliştirilen sistem, iki aşamalı bir analiz mimarisi üzerine kurulmuştur. Birinci aşamada gelen metin, PostgreSQL üzerinde çalışan pgvector uzantısı aracılığıyla Türkçe BERT modeli (emrecan/bert-base-turkish-cased-mean-nli-stsb-tr) ile üretilen 768 boyutlu vektörler kullanılarak bilgi tabanıyla anlık biçimde karşılaştırılmaktadır. Eşleşme bulunamadığı durumlarda ikinci aşama devreye girer: sekiz adet dil sinyali (tıkbait skoru, büyük harf oranı, ünlem yoğunluğu, belirsizlik ifadeleri vb.) çıkarılır, bu sinyaller 768 boyutlu BERT gömme vektörüyle birleştirilerek 776 boyutlu bir öznitelik vektörü oluşturulur ve ağırlıklı topluluk kararı (0,70 × model olasılığı + 0,30 × kural skoru) ile nihai etiket belirlenir. Ayrıca Google Gemini LLM entegrasyonu, güvensiz sınıflandırma durumlarında kanıt toplama ve gerçek zamanlı sorgulama görevi üstlenmektedir.

Sistem, 3.286 örnekten oluşan dengeli bir veri kümesi üzerinde eğitilmiş olup %88 doğruluk oranına ulaşmıştır (F1: Gerçek 0,89 / Sahte 0,88). Platform; kullanıcı yönetimi, forum, gamification, RSS tabanlı otomatik haber toplama ve admin panelini kapsayan 32 arayüz sayfası ve 25 API uç noktasıyla nehaber.dev adresinde canlı olarak hizmet vermektedir.

**Anahtar Kelimeler:** sahte haber tespiti, doğal dil işleme, BERT, vektör benzerlik araması, topluluk doğrulaması

---

# ABSTRACT

In today's digital communication landscape, disinformation has become one of the most serious threats with the potential to manipulate public opinion. In countries like Turkey, where social media usage is intense, false news can reach large audiences in a short time, rendering manual verification processes insufficient. In this study, an integrated fake news detection platform has been developed that automatically analyzes Turkish texts, gathers evidence, and supports community-based verification.

The developed system is built on a two-stage analysis architecture. In the first stage, incoming text is instantly compared against a knowledge base using 768-dimensional vectors produced by a Turkish BERT model (emrecan/bert-base-turkish-cased-mean-nli-stsb-tr) through the pgvector extension running on PostgreSQL. When no match is found, the second stage is activated: eight linguistic signals (clickbait score, uppercase ratio, exclamation density, hedging expressions, etc.) are extracted, combined with the 768-dimensional BERT embedding to form a 776-dimensional feature vector, and the final label is determined through a weighted ensemble decision (0.70 × model probability + 0.30 × rule score). Additionally, Google Gemini LLM integration handles evidence gathering and real-time querying in cases of uncertain classification.

The system was trained on a balanced dataset of 3,286 samples, achieving 88% accuracy (F1: Authentic 0.89 / Fake 0.88). The platform serves live at nehaber.dev with 32 interface pages and 25 API endpoints covering user management, forum, gamification, RSS-based automatic news collection, and an admin panel.

**Keywords:** fake news detection, natural language processing, BERT, vector similarity search, community verification
