# BÖLÜM 5: SONUÇ VE TAVSİYELER

## 5.1 Hedeflere Ulaşma Değerlendirmesi

Bu çalışmada, Türkçe metinleri otomatik olarak analiz eden, kanıt toplayan ve topluluk doğrulamasını destekleyen bütünleşik bir sahte haber tespit platformu geliştirilmiş ve nehaber.dev adresinde canlı ortamda kullanıma açılmıştır.

Fonksiyonel gereksinimler açısından değerlendirildiğinde, Tablo 3.1'de listelenen 12 gereksinimin tamamının karşılandığı görülmektedir. Kullanıcılar metin, URL ve görsel analizi yapabilmekte; analiz sonuçları sekiz NLP sinyalinin ayrıntılı dökümuyle birlikte sunulmaktadır. Forum, oylama, doğrudan mesajlaşma, gamification ve A/B testi modülleri işlevsel durumdadır.

Makine öğrenimi başarımı açısından, 776 boyutlu hibrit öznitelik vektörü kullanan sınıflandırıcı %88 doğruluk oranına (F1: Gerçek 0,89 / Sahte 0,88) ulaşmıştır. Bu sonuç, sınıf dengeli bir veri kümesiyle elde edilmiş olmakla birlikte iyileştirme potansiyelini de göstermektedir.

Mimari kararlar açısından, embedding microservice ayrımı OOM sorununu çözmüş; ensemble tasarımı yanlış pozitif oranını azaltmış; Docker Compose tabanlı dağıtım sistemi canlı ortamda kararlı biçimde çalışmaktadır.

## 5.2 Sınırlamalar

**Otomatik test eksikliği:** Sistemde pytest tabanlı birim ve entegrasyon testleri bulunmamaktadır. Doğrulama, Swagger UI üzerinden manuel test ve `test_db.py` bağlantı denetim betiğiyle sağlanmıştır. Üretim ortamında kritik fonksiyonların regresyon testleriyle korunması gerekmektedir.

**Eğitim verisi boyutu:** 3.286 örnekten oluşan veri kümesi, Türkçe haber alanının çeşitliliğini tam olarak yansıtmaktan uzaktır. Daha büyük ve dengeli bir veri kümesi, özellikle siyaset, sağlık ve ekonomi gibi yüksek riskli kategorilerde başarımı artıracaktır.

**Görsel analiz heuristiği:** Görsel doğrulama; algısal hash (pHash), EXIF meta veri analizi ve Gemini LLM çıkarımına dayanmaktadır. Bu yaklaşım determinist değildir; derin sahte içerik tespiti (deepfake) için özelleştirilmiş görüntü sınıflandırma modelleri daha güvenilir sonuçlar üretecektir.

**Ters proxy eksikliği:** Üretim mimarisinde Nginx gibi bir ters proxy bulunmamaktadır. Bu durum, SSL sonlandırma ve statik dosya sunumunun FastAPI üzerinde yürütülmesi anlamına gelmekte; büyük ölçekli trafik altında performansı olumsuz etkileyebilmektedir.

**Sosyal medya entegrasyonu:** Twitter/X API kısıtlamaları nedeniyle viral sahte haber yayılımının kaynak platformunda takibi mümkün olamamıştır.

## 5.3 Gelecek Çalışmalar

**Veri kümesinin genişletilmesi:** Teyit, Doğruluk Payı ve çeşitli haber portallarından toplanacak daha geniş bir Türkçe etiketli veri kümesi (hedef: 10.000+ örnek), modelin genelleme kapasitesini artıracaktır. Aktif öğrenme (active learning) yaklaşımıyla kullanıcı geri bildirimlerinin eğitim döngüsüne dahil edilmesi, zamanla modelin üretim verisine uyum sağlamasını kolaylaştıracaktır.

**Tarayıcı eklentisi:** Chrome Manifest V3 tabanlı eklenti tasarım dokümanı hazırlanmış olmakla birlikte kodlama aşaması tamamlanamamıştır. Bu eklenti, kullanıcıların herhangi bir web sayfasını tarayıcı içinden anlık analiz etmesine olanak tanıyacaktır.

**Mobil uygulama:** React Native ile geliştirilecek bir mobil uygulama, paylaşılan içeriklerin uygulama içinden doğrudan analiz edilmesini mümkün kılacak ve WhatsApp ve Telegram gibi mesajlaşma platformlarında dezenformasyona karşı etkin bir araç sunacaktır.

**Otomatik test altyapısı:** Pytest ile birim testleri, Playwright ile uçtan uca kullanıcı arayüzü testleri yazılmalıdır. CI/CD pipeline'ına entegre edilecek test kapsamı, yeni özelliklerin mevcut işlevleri bozmadan eklenmesini güvence altına alacaktır.

**Çok dil desteği:** Türkçenin ötesinde Arapça ve Kürtçe gibi bölgesel dillere destek verilmesi, platformun jeopolitik açıdan kritik alanlarda etki alanını genişletecektir. Çok dilli BERT modelleri bu geçişi kolaylaştırabilir.

**Gerçek zamanlı sosyal medya izleme:** Twitter/X, Instagram ve TikTok gibi platformlarda viral olan içeriklerin erken aşamada tespit edilmesi için sosyal medya API entegrasyonlarının geliştirilmesi, proaktif dezenformasyon tespitini mümkün kılacaktır.
