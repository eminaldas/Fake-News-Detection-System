# ÖZET

## Türkçe Sahte Haber Tespiti için BERT Tabanlı Hibrit Bir Sistem: nehaber.dev

Dijital iletişimin hız kazandığı günümüzde dezenformasyon, kamuoyunu manipüle etme potansiyeli taşıyan ciddi bir tehdit hâline gelmiştir. Türkçe metinlere yönelik tam otomatik bir tespit platformunun yokluğu bu çalışmanın çıkış noktasını oluşturmuştur. Geliştirilen nehaber.dev platformu, iki aşamalı bir analiz mimarisi üzerine kurulmuştur. Birinci aşamada pgvector cosine benzerlik aramasıyla bilgi tabanı anlık taranmıştır. Eşleşme bulunamazsa ikinci aşama devreye girmiş; sekiz NLP sinyali çıkarılmış, 768 boyutlu BERT gömme vektörüyle birleştirilerek 776 boyutlu öznitelik vektörü oluşturulmuş ve ağırlıklı topluluk kararıyla (0,70 × model + 0,30 × kural) nihai etiket belirlenmiştir. Google Gemini entegrasyonu belirsiz durumlarda kanıt toplama görevi üstlenmiştir. Sistem 3.286 örnekten oluşan dengeli bir veri kümesiyle eğitilmiş ve %88 doğruluk oranına ulaşılmıştır. Platform; kullanıcı yönetimi, forum, gamification, RSS tabanlı haber toplama ve admin panelini kapsayan 32 arayüz sayfasıyla nehaber.dev adresinde canlı hizmet vermektedir.

**Anahtar Kelimeler:** sahte haber tespiti, doğal dil işleme, BERT, vektör benzerlik araması, topluluk doğrulaması

---

# ABSTRACT

## A BERT-Based Hybrid System for Turkish Fake News Detection: nehaber.dev

In today's rapidly evolving digital landscape, disinformation has become a serious threat with the potential to manipulate public opinion. The absence of a fully automated detection platform for Turkish texts constituted the motivation for this study. The developed nehaber.dev platform is built on a two-stage analysis architecture. In the first stage, the knowledge base is instantly searched via pgvector cosine similarity. If no match is found, the second stage is activated: eight NLP signals are extracted, combined with a 768-dimensional BERT embedding to form a 776-dimensional feature vector, and the final label is determined through a weighted ensemble decision (0.70 × model + 0.30 × rule). Google Gemini integration handles evidence gathering in uncertain cases. The system was trained on a balanced dataset of 3,286 samples and achieved 88% accuracy. The platform serves live at nehaber.dev with 32 interface pages covering user management, forum, gamification, RSS-based news collection, and an admin panel.

**Keywords:** fake news detection, natural language processing, BERT, vector similarity search, community verification
