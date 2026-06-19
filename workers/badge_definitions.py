from dataclasses import dataclass


@dataclass(frozen=True)
class BadgeDef:
    key:         str
    name:        str
    description: str
    category:    str   # "level" | "activity" | "category"
    icon:        str   # Lucide icon adı (frontend için)
    color:       str   # CSS renk değişkeni veya hex


BADGE_DEFS: list[BadgeDef] = [
    BadgeDef("level_1",  "Çaylak",      "Sisteme katıldın",             "level", "User",        "var(--color-text-muted)"),
    BadgeDef("level_10", "Meraklı",     "10. seviyeye ulaştın",         "level", "Search",      "var(--color-accent-blue)"),
    BadgeDef("level_20", "Araştırmacı", "20. seviyeye ulaştın",         "level", "FileSearch",  "var(--color-accent-amber)"),
    BadgeDef("level_30", "Analist",     "30. seviyeye ulaştın",         "level", "BarChart2",   "var(--color-brand-primary)"),
    BadgeDef("level_40", "Dedektif",    "40. seviyeye ulaştın",         "level", "Shield",      "#a855f7"),
    BadgeDef("level_50", "Usta",        "50. seviyeye ulaştın",         "level", "Star",        "#ef4444"),
    BadgeDef("first_analysis", "İlk Adım",           "İlk analizini yaptın",               "activity", "Cpu",          "var(--color-brand-primary)"),
    BadgeDef("analyst_100",    "Yüzlük",              "100 analiz tamamladın",              "activity", "TrendingUp",   "var(--color-accent-amber)"),
    BadgeDef("first_thread",   "Forum Açıcı",         "İlk forum başlığını açtın",          "activity", "MessageSquare","var(--color-accent-blue)"),
    BadgeDef("prolific_50",    "Üretken",             "50 forum başlığı açtın",             "activity", "Zap",          "var(--color-accent-amber)"),
    BadgeDef("evidence_10",    "Kanıtçı",             "10 kanıt ekledin",                   "activity", "Link",         "var(--color-brand-primary)"),
    BadgeDef("evidence_50",    "Gerçek Avcısı",       "50 kanıt ekledin",                   "activity", "Award",        "#ef4444"),
    BadgeDef("social_10",      "Sosyal",              "10 takipçiye ulaştın",               "activity", "Users",        "var(--color-accent-blue)"),
    BadgeDef("social_100",     "Influencer",          "100 takipçiye ulaştın",              "activity", "UserCheck",    "#a855f7"),
    BadgeDef("helpful_50",     "Faydalı İnsan",       "50 kez faydalı bulundun",            "activity", "ThumbsUp",     "var(--color-brand-primary)"),
    BadgeDef("streak_7",       "Haftalık Alışkanlık", "7 gün üst üste giriş yaptın",        "activity", "Calendar",     "var(--color-accent-blue)"),
    BadgeDef("streak_30",      "Aylık Seri",          "30 gün üst üste giriş yaptın",       "activity", "CalendarCheck","var(--color-accent-amber)"),
    BadgeDef("debunker",       "Çürütücü",            "FAKE haberlere 5 kez kanıt ekledin", "activity", "ShieldCheck",  "var(--color-brand-primary)"),
    BadgeDef("early_bird",     "Erken Kuş",           "İlk 100 kullanıcıdan birisin",       "activity", "Zap",          "#f59e0b"),
    BadgeDef("cat_haberler",  "Haber Takipçisi",   "Haberler kategorisinde 20+ başlık",  "category", "Newspaper",  "var(--color-accent-blue)"),
    BadgeDef("cat_teknoloji", "Teknoloji Uzmanı",  "Teknoloji kategorisinde 20+ başlık", "category", "Cpu",        "var(--color-brand-primary)"),
    BadgeDef("cat_kultur",    "Kültür Elçisi",     "Kültür kategorisinde 20+ başlık",    "category", "BookOpen",   "var(--color-accent-amber)"),
    BadgeDef("cat_spor",      "Spor Tutkunu",      "Spor kategorisinde 20+ başlık",      "category", "Trophy",     "#ef4444"),
    BadgeDef("cat_eglence",   "Eğlence Ustası",    "Eğlence kategorisinde 20+ başlık",   "category", "Music",      "#a855f7"),
    BadgeDef("cat_bilim",     "Bilim İnsanı",      "Bilim kategorisinde 20+ başlık",     "category", "Microscope", "var(--color-brand-primary)"),
    BadgeDef("cat_ekonomi",   "Ekonomi Analisti",  "Ekonomi kategorisinde 20+ başlık",   "category", "DollarSign", "var(--color-accent-amber)"),
    BadgeDef("cat_genel",     "Genel Katılımcı",   "Genel kategorisinde 20+ başlık",     "category", "Globe",      "var(--color-text-muted)"),
    BadgeDef("cat_all",       "Evrensel Katılımcı","Tüm kategorilerde aktif oldun",       "category", "Globe2",     "#f59e0b"),
]

BADGE_BY_KEY: dict[str, BadgeDef] = {b.key: b for b in BADGE_DEFS}

BADGE_PROGRESS_HINTS: dict[str, tuple[str, int]] = {
    "first_analysis": ("analysis_count",  1),
    "analyst_100":    ("analysis_count",  100),
    "first_thread":   ("thread_count",    1),
    "prolific_50":    ("thread_count",    50),
    "evidence_10":    ("evidence_count",  10),
    "evidence_50":    ("evidence_count",  50),
    "social_10":      ("follower_count",  10),
    "social_100":     ("follower_count",  100),
    "helpful_50":     ("helpful_total",   50),
    "streak_7":       ("current_streak",  7),
    "streak_30":      ("current_streak",  30),
    "debunker":       ("debunker_count",  5),
    "level_10":       ("level",           10),
    "level_20":       ("level",           20),
    "level_30":       ("level",           30),
    "level_40":       ("level",           40),
    "level_50":       ("level",           50),
    "cat_haberler":   ("cat_haberler",    20),
    "cat_teknoloji":  ("cat_teknoloji",   20),
    "cat_kultur":     ("cat_kultur",      20),
    "cat_spor":       ("cat_spor",        20),
    "cat_eglence":    ("cat_eglence",     20),
    "cat_bilim":      ("cat_bilim",       20),
    "cat_ekonomi":    ("cat_ekonomi",     20),
    "cat_genel":      ("cat_genel",       20),
    "cat_all":        ("cat_all",         8),
}
