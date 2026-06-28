"""
scripts/seed_category_prototypes.py
===================================
Kategori taksonomisine içerik-bazlı sınıflandırma için PROTOTİP METNİ doldurur.

Migration (c1a2t3e4g5o6) kategorileri slug/isim ile seed etti ama prototype_text
NULL bıraktı. Embedding olmadan classify_category her zaman feed kategorisine geri
düşer → içerik-bazlı kategorilendirme hiç devreye girmez.

Bu script her kategoriye temsilci bir Türkçe tanım yazar ve is_stale=True yapar;
böylece kategori worker'ı (refresh_stale_prototypes) bir sonraki çalışmada
prototype_embedding'i üretir.

Idempotent: yalnızca metni değişen kategorileri is_stale işaretler.
Çalıştırma:  docker compose exec app python scripts/seed_category_prototypes.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

from app.db.session import AsyncSessionLocal

# slug -> temsilci Türkçe tanım (embedding üretimi için anahtar kelime zengini).
# Slug'lar news_articles.category/subcategory ve migration SEED ile birebir eşleşir.
PROTOTYPES: dict[str, str] = {
    # ── Ana kategoriler ──
    "gündem":     "Türkiye ve dünya gündemi, güncel olaylar, son dakika haberleri, siyaset, asayiş, toplum ve genel haber akışı.",
    "ekonomi":    "Ekonomi haberleri; enflasyon, faiz, döviz kuru, dolar euro altın, borsa, şirketler, bütçe, vergi, istihdam ve piyasa gelişmeleri.",
    "spor":       "Spor haberleri; futbol, basketbol, maç sonuçları, lig, transfer, milli takım, şampiyona ve sporcular.",
    "sağlık":     "Sağlık haberleri; hastalıklar, tedavi, ilaç, aşı, hastane, doktor, beslenme, diyet ve sağlıklı yaşam.",
    "teknoloji":  "Teknoloji haberleri; yapay zeka, yazılım, donanım, akıllı telefon, internet, uygulama, bilim ve dijital dünya.",
    "kültür":     "Kültür ve sanat haberleri; sinema, tiyatro, müzik, edebiyat, sergi, festival, kitap ve sanatçılar.",
    "yaşam":      "Yaşam haberleri; magazin, seyahat, yemek, aile, eğitim, moda, ilişkiler ve günlük hayat.",

    # ── gündem alt ──
    "türkiye":    "Türkiye iç haberleri; iç politika, şehirler, asayiş, kamu, toplumsal olaylar ve ulusal gündem.",
    "dünya":      "Dünya haberleri; uluslararası ilişkiler, savaş, diplomasi, dış politika, küresel gelişmeler ve diğer ülkeler.",
    "siyaset":    "Siyaset haberleri; hükümet, meclis, partiler, seçim, milletvekili, cumhurbaşkanı ve siyasi açıklamalar.",
    "son dakika": "Son dakika gelişmeleri; flaş haber, acil duyuru, yeni gelişen ve anlık olaylar.",
    "analiz":     "Haber analizi, değerlendirme, yorum, derinlemesine inceleme ve uzman görüşü.",
    "yerel":      "Yerel haberler; belediye, şehir, ilçe, bölgesel olaylar ve yerel yönetim.",

    # ── ekonomi alt ──
    "finans":     "Finans haberleri; bankacılık, kredi, faiz, yatırım, fon, sigorta ve finansal piyasalar.",
    "borsa":      "Borsa haberleri; Borsa İstanbul, hisse senedi, endeks, BIST 100, halka arz ve pay piyasası.",
    "piyasa":     "Piyasa haberleri; döviz, altın, dolar, euro, emtia, petrol ve güncel kur fiyatları.",

    # ── spor alt ──
    "futbol":     "Futbol haberleri; Süper Lig, Galatasaray, Fenerbahçe, Beşiktaş, transfer, maç sonucu ve milli takım.",
    "basketbol":  "Basketbol haberleri; Euroleague, NBA, basketbol ligi, maç ve oyuncular.",

    # ── sağlık alt ──
    "beslenme":   "Beslenme ve diyet; sağlıklı yemek, vitamin, kilo, gıda ve beslenme önerileri.",

    # ── teknoloji alt ──
    "oyun":       "Video oyunları; oyun konsolu, PlayStation, Xbox, PC oyun, espor ve oyun dünyası.",
    "otomobil":   "Otomobil haberleri; araba, elektrikli araç, yeni model, motor ve otomotiv sektörü.",
    "yazılım":    "Yazılım haberleri; uygulama, programlama, işletim sistemi, güncelleme ve yapay zeka yazılımları.",

    # ── kültür alt ──
    "sanat":      "Sanat haberleri; sergi, resim, heykel, galeri ve görsel sanatlar.",
    "sinema":     "Sinema haberleri; film, vizyon, yönetmen, oyuncu, festival ve gişe.",
    "tiyatro":    "Tiyatro haberleri; oyun, sahne, gösteri ve tiyatro sanatçıları.",
    "müzik":      "Müzik haberleri; şarkı, albüm, konser, sanatçı ve müzik dünyası.",
    "kitap":      "Kitap ve edebiyat; roman, yazar, yayın, okuma ve edebiyat haberleri.",

    # ── yaşam alt ──
    "magazin":    "Magazin haberleri; ünlüler, dizi, sosyal medya, ilişkiler ve dedikodu.",
    "seyahat":    "Seyahat haberleri; tatil, gezi, turizm, otel, rota ve seyahat önerileri.",
    "aile":       "Aile ve ilişkiler; çocuk, ebeveynlik, evlilik ve aile yaşamı.",
    "yemek":      "Yemek haberleri; tarif, mutfak, restoran, lezzet ve gastronomi.",
    "eğitim":     "Eğitim haberleri; okul, üniversite, sınav, öğrenci, YKS LGS ve eğitim politikaları.",

    # ── ortak (birden fazla ana kategoride) ──
    "bilim":      "Bilim haberleri; araştırma, uzay, fizik, keşif, deney ve bilimsel gelişmeler.",
}


async def seed() -> None:
    updated = 0
    skipped = 0
    missing = []
    async with AsyncSessionLocal() as db:
        for slug, proto in PROTOTYPES.items():
            res = await db.execute(
                text(
                    "UPDATE categories SET prototype_text = :txt, is_stale = TRUE "
                    "WHERE slug = :slug AND prototype_text IS DISTINCT FROM :txt"
                ),
                {"txt": proto, "slug": slug},
            )
            if res.rowcount and res.rowcount > 0:
                updated += res.rowcount
            else:
                # metin zaten aynı ya da slug yok — ayırt et
                exists = (await db.execute(
                    text("SELECT 1 FROM categories WHERE slug = :slug LIMIT 1"),
                    {"slug": slug},
                )).first()
                if exists:
                    skipped += 1
                else:
                    missing.append(slug)
        await db.commit()

    print(f"OK: {updated} kategori güncellendi (is_stale=TRUE), {skipped} zaten güncel.")
    if missing:
        print(f"UYARI: DB'de bulunamayan slug'lar: {', '.join(missing)}")
    print("Kategori worker'ı bir sonraki çalışmada prototype_embedding üretecek.")


if __name__ == "__main__":
    asyncio.run(seed())
