"""scripts/seed_source_bias.py — Türk medya kaynakları bias verisini yükler."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.dialects.postgresql import insert

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.core.config import settings
from app.models.models import SourceBias

SOURCES = [
    # Devlet/Kamu
    {"domain": "trt.net.tr",      "display_name": "TRT",         "political_lean": 0.85, "government_aligned": True,  "owner_entity": "TRT (Kamu)",        "media_group": "Devlet Yayıncısı",  "clickbait_tendency": 0.15, "factual_accuracy": 0.55, "notable_incidents": ["2016 darbe gecesi yayın gecikmesi", "COVID sürecinde hükümet açıklamalarını doğrudan aktarma"]},
    {"domain": "aa.com.tr",       "display_name": "AA",          "political_lean": 0.80, "government_aligned": True,  "owner_entity": "Anadolu Ajansı (Kamu)", "media_group": "Devlet Ajansı",  "clickbait_tendency": 0.10, "factual_accuracy": 0.60, "notable_incidents": []},
    {"domain": "trthaber.com",    "display_name": "TRT Haber",   "political_lean": 0.85, "government_aligned": True,  "owner_entity": "TRT (Kamu)",        "media_group": "Devlet Yayıncısı",  "clickbait_tendency": 0.15, "factual_accuracy": 0.55, "notable_incidents": []},
    {"domain": "trtworld.com",    "display_name": "TRT World",   "political_lean": 0.75, "government_aligned": True,  "owner_entity": "TRT (Kamu)",        "media_group": "Devlet Yayıncısı",  "clickbait_tendency": 0.10, "factual_accuracy": 0.58, "notable_incidents": []},
    # Yandaş medya
    {"domain": "sabah.com.tr",    "display_name": "Sabah",       "political_lean": 0.90, "government_aligned": True,  "owner_entity": "Kalyon Grubu",      "media_group": "Sabah-ATV Grubu",   "clickbait_tendency": 0.50, "factual_accuracy": 0.40, "notable_incidents": ["Kayyum atamalarında haber manipülasyonu"]},
    {"domain": "ahaber.com.tr",   "display_name": "A Haber",     "political_lean": 0.92, "government_aligned": True,  "owner_entity": "Kalyon Grubu",      "media_group": "Sabah-ATV Grubu",   "clickbait_tendency": 0.60, "factual_accuracy": 0.35, "notable_incidents": []},
    {"domain": "star.com.tr",     "display_name": "Star",        "political_lean": 0.85, "government_aligned": True,  "owner_entity": "Turkuvaz Medya",    "media_group": "Sabah-ATV Grubu",   "clickbait_tendency": 0.45, "factual_accuracy": 0.42, "notable_incidents": []},
    {"domain": "takvim.com.tr",   "display_name": "Takvim",      "political_lean": 0.88, "government_aligned": True,  "owner_entity": "Turkuvaz Medya",    "media_group": "Sabah-ATV Grubu",   "clickbait_tendency": 0.70, "factual_accuracy": 0.30, "notable_incidents": []},
    {"domain": "turkiyegazetesi.com.tr", "display_name": "Türkiye", "political_lean": 0.82, "government_aligned": True, "owner_entity": "İhlas Holding", "media_group": "İhlas Grubu",       "clickbait_tendency": 0.40, "factual_accuracy": 0.45, "notable_incidents": []},
    {"domain": "haberturk.com",   "display_name": "Haberturk",   "political_lean": 0.55, "government_aligned": False, "owner_entity": "Bloomberg HT",     "media_group": "Bloomberg HT",      "clickbait_tendency": 0.35, "factual_accuracy": 0.60, "notable_incidents": []},
    # Ana akım / Merkez
    {"domain": "hurriyet.com.tr", "display_name": "Hürriyet",    "political_lean": 0.40, "government_aligned": False, "owner_entity": "Demirören Grubu",   "media_group": "Demirören Medya",   "clickbait_tendency": 0.45, "factual_accuracy": 0.62, "notable_incidents": ["2013'te Demirören'e satış sonrası yayın çizgisi değişimi"]},
    {"domain": "milliyet.com.tr", "display_name": "Milliyet",    "political_lean": 0.45, "government_aligned": False, "owner_entity": "Demirören Grubu",   "media_group": "Demirören Medya",   "clickbait_tendency": 0.40, "factual_accuracy": 0.60, "notable_incidents": []},
    {"domain": "ntv.com.tr",      "display_name": "NTV",         "political_lean": 0.35, "government_aligned": False, "owner_entity": "Doğuş Grubu",       "media_group": "Doğuş Medya",       "clickbait_tendency": 0.25, "factual_accuracy": 0.68, "notable_incidents": []},
    {"domain": "cnnturk.com",     "display_name": "CNN Türk",    "political_lean": 0.50, "government_aligned": False, "owner_entity": "Doğuş Grubu",       "media_group": "Doğuş Medya",       "clickbait_tendency": 0.35, "factual_accuracy": 0.62, "notable_incidents": []},
    {"domain": "foxtvturkiye.com","display_name": "Fox TV",      "political_lean": -0.10, "government_aligned": False,"owner_entity": "TGRT (Fox)",        "media_group": "Fox Türkiye",        "clickbait_tendency": 0.40, "factual_accuracy": 0.60, "notable_incidents": []},
    {"domain": "posta.com.tr",    "display_name": "Posta",       "political_lean": 0.30, "government_aligned": False, "owner_entity": "Demirören Grubu",   "media_group": "Demirören Medya",   "clickbait_tendency": 0.65, "factual_accuracy": 0.45, "notable_incidents": []},
    # Muhalif / Bağımsız
    {"domain": "cumhuriyet.com.tr","display_name": "Cumhuriyet", "political_lean": -0.75, "government_aligned": False,"owner_entity": "Cumhuriyet Vakfı",  "media_group": "Bağımsız",          "clickbait_tendency": 0.20, "factual_accuracy": 0.72, "notable_incidents": []},
    {"domain": "sozcu.com.tr",    "display_name": "Sözcü",       "political_lean": -0.70, "government_aligned": False,"owner_entity": "Sözcü Yayıncılık",  "media_group": "Bağımsız",          "clickbait_tendency": 0.50, "factual_accuracy": 0.60, "notable_incidents": []},
    {"domain": "birgun.net",      "display_name": "Birgün",      "political_lean": -0.85, "government_aligned": False,"owner_entity": "Birgün Kooperatif", "media_group": "Bağımsız/Sol",      "clickbait_tendency": 0.15, "factual_accuracy": 0.70, "notable_incidents": []},
    {"domain": "bianet.org",      "display_name": "Bianet",      "political_lean": -0.60, "government_aligned": False,"owner_entity": "BİA",               "media_group": "Bağımsız",          "clickbait_tendency": 0.05, "factual_accuracy": 0.82, "notable_incidents": []},
    {"domain": "t24.com.tr",      "display_name": "T24",         "political_lean": -0.50, "government_aligned": False,"owner_entity": "T24",               "media_group": "Bağımsız",          "clickbait_tendency": 0.25, "factual_accuracy": 0.75, "notable_incidents": []},
    {"domain": "gazeteduvar.com.tr","display_name": "Gazete Duvar","political_lean":-0.65,"government_aligned": False,"owner_entity": "Duvar Medya",       "media_group": "Bağımsız",          "clickbait_tendency": 0.20, "factual_accuracy": 0.72, "notable_incidents": []},
    {"domain": "diken.com.tr",    "display_name": "Diken",       "political_lean": -0.55, "government_aligned": False,"owner_entity": "Diken Medya",       "media_group": "Bağımsız",          "clickbait_tendency": 0.30, "factual_accuracy": 0.70, "notable_incidents": []},
    {"domain": "artigercek.com",  "display_name": "Artı Gerçek", "political_lean": -0.70,"government_aligned": False, "owner_entity": "Artı TV",           "media_group": "Bağımsız",          "clickbait_tendency": 0.20, "factual_accuracy": 0.68, "notable_incidents": []},
    # Dijital / Haber siteleri
    {"domain": "haberler.com",    "display_name": "Haberler.com","political_lean": 0.20, "government_aligned": False, "owner_entity": "Haberler.com",      "media_group": "Dijital",           "clickbait_tendency": 0.60, "factual_accuracy": 0.40, "notable_incidents": []},
    {"domain": "mynet.com",       "display_name": "Mynet",       "political_lean": 0.10, "government_aligned": False, "owner_entity": "Mynet",             "media_group": "Dijital Agregator", "clickbait_tendency": 0.70, "factual_accuracy": 0.35, "notable_incidents": []},
    {"domain": "ensonhaber.com",  "display_name": "Ensonhaber",  "political_lean": 0.60, "government_aligned": False, "owner_entity": "Ensonhaber",        "media_group": "Dijital",           "clickbait_tendency": 0.75, "factual_accuracy": 0.30, "notable_incidents": []},
    {"domain": "internethaber.com","display_name": "İnternethaber","political_lean":0.55,"government_aligned": False, "owner_entity": "İnternethaber",     "media_group": "Dijital",           "clickbait_tendency": 0.72, "factual_accuracy": 0.32, "notable_incidents": []},
    # Uluslararası (TR)
    {"domain": "bbc.com",         "display_name": "BBC Türkçe",  "political_lean": 0.00, "government_aligned": False, "owner_entity": "BBC",               "media_group": "Uluslararası",      "clickbait_tendency": 0.05, "factual_accuracy": 0.92, "notable_incidents": []},
    {"domain": "dw.com",          "display_name": "DW Türkçe",   "political_lean": 0.00, "government_aligned": False, "owner_entity": "Deutsche Welle",    "media_group": "Uluslararası",      "clickbait_tendency": 0.05, "factual_accuracy": 0.90, "notable_incidents": []},
    {"domain": "euronews.com",    "display_name": "Euronews TR", "political_lean": 0.05, "government_aligned": False, "owner_entity": "Euronews",          "media_group": "Uluslararası",      "clickbait_tendency": 0.10, "factual_accuracy": 0.85, "notable_incidents": []},
    {"domain": "reuters.com",     "display_name": "Reuters",     "political_lean": 0.00, "government_aligned": False, "owner_entity": "Thomson Reuters",   "media_group": "Uluslararası Ajans","clickbait_tendency": 0.02, "factual_accuracy": 0.95, "notable_incidents": []},
    {"domain": "apnews.com",      "display_name": "AP",          "political_lean": 0.00, "government_aligned": False, "owner_entity": "AP",                "media_group": "Uluslararası Ajans","clickbait_tendency": 0.02, "factual_accuracy": 0.95, "notable_incidents": []},
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        for source in SOURCES:
            stmt = insert(SourceBias).values(**source).on_conflict_do_update(
                index_elements=["domain"],
                set_={k: v for k, v in source.items() if k != "domain"},
            )
            await conn.execute(stmt)
    await engine.dispose()
    print(f"✓ {len(SOURCES)} kaynak yüklendi.")


if __name__ == "__main__":
    asyncio.run(seed())
