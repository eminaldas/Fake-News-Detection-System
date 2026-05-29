import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Search, Brain, Globe, Shield, Cpu, Database,
    Zap, Eye, Target, CheckCircle2, Clock, Circle,
    ArrowRight, Layers, Users, BarChart2, Timer,
    Github, ExternalLink, Mail,
} from 'lucide-react';

const BRAND   = 'var(--color-brand-primary)';
const SURFACE = 'var(--color-terminal-surface)';
const BORDER  = 'var(--color-terminal-border-raw)';

/* ── Intersection observer ── */
function useInView(threshold = 0.12) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
            { threshold }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, inView];
}

/* ── Scroll-triggered fade ── */
function Reveal({ children, delay = 0, dir = 'up', className = '' }) {
    const [ref, inView] = useInView();
    const map = { up: 'translateY(28px)', left: 'translateX(-28px)', right: 'translateX(28px)' };
    return (
        <div ref={ref} className={className} style={{
            opacity:    inView ? 1 : 0,
            transform:  inView ? 'none' : map[dir],
            transition: `opacity .65s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .65s cubic-bezier(.22,1,.36,1) ${delay}ms`,
        }}>
            {children}
        </div>
    );
}

/* ── Köşe çentikler ── */
function Notch({ color = BRAND, size = 16 }) {
    const s = `${size}px`, t = '2px';
    return (
        <>
            <div className="absolute top-0 left-0 pointer-events-none" style={{ width: s,  height: t,  background: color }} />
            <div className="absolute top-0 left-0 pointer-events-none" style={{ width: t,  height: s,  background: color }} />
            <div className="absolute bottom-0 right-0 pointer-events-none" style={{ width: s,  height: t,  background: color }} />
            <div className="absolute bottom-0 right-0 pointer-events-none" style={{ width: t,  height: s,  background: color }} />
        </>
    );
}

/* ── Count-up ── */
function Counter({ target, suffix = '', delay = 0 }) {
    const [val, setVal]  = useState(0);
    const [ref, inView]  = useInView(0.3);
    useEffect(() => {
        if (!inView) return;
        const tid = setTimeout(() => {
            let start = null;
            const DUR = 1600;
            const raf = (ts) => {
                if (!start) start = ts;
                const p = Math.min((ts - start) / DUR, 1);
                const e = 1 - Math.pow(1 - p, 3);
                setVal(Math.floor(e * target));
                if (p < 1) requestAnimationFrame(raf); else setVal(target);
            };
            requestAnimationFrame(raf);
        }, delay);
        return () => clearTimeout(tid);
    }, [inView, target, delay]);
    return <span ref={ref}>{val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}K` : val}{suffix}</span>;
}

/* ─────────────────────────────────────────────── */
const About = () => (
    <div className="w-full max-w-5xl mx-auto px-4 pb-24 pt-10">

        {/* ══ HERO ══════════════════════════════════════════ */}
        <section className="mb-20">
            <p className="font-mono text-[10px] uppercase tracking-widest mb-3 animate-fade-up"
               style={{ color: BRAND }}>// HAKKIMIZDA</p>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-manrope font-extrabold tracking-tighter leading-[1.05] mb-6 animate-fade-up"
                style={{ color: 'var(--color-text-primary)', animationDelay: '60ms' }}>
                Dezenformasyona<br />
                <span style={{ color: BRAND }}>Karşı Bir Kalkan.</span>
            </h1>

            <p className="font-mono text-sm leading-relaxed max-w-2xl mb-8 animate-fade-up"
               style={{ color: 'var(--color-text-secondary)', animationDelay: '120ms' }}>
                Ne Haber, Türkçe haberleri yapay zeka ve anlamsal arama teknolojisiyle
                gerçek zamanlı analiz eden sahte haber tespit sistemidir.
                BERT tabanlı Türkçe dil modeli, pgvector semantik arama ve
                kural tabanlı NLP sinyalleriyle sahteciği saniyeler içinde tespit eder.
            </p>

            <div className="flex gap-3 flex-wrap animate-fade-up" style={{ animationDelay: '180ms' }}>
                <Link to="/"
                      className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest px-5 py-2.5 border transition-all hover:brightness-110"
                      style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}>
                    <Zap className="w-3.5 h-3.5" />
                    Hemen Analiz Et
                </Link>
            </div>
        </section>

        {/* ══ İSTATİSTİKLER ════════════════════════════════ */}
        <section className="mb-20">
            <div className="relative border" style={{ background: SURFACE, borderColor: BORDER }}>
                <Notch />
                <div className="grid grid-cols-2 md:grid-cols-4">
                    {[
                        { icon: Database,  label: 'Analiz Kaydı',     target: 3286,  suffix: 'K+', delay: 0,   accent: BRAND },
                        { icon: BarChart2, label: 'Doğruluk Oranı',   target: 88,    suffix: '%',  delay: 120, accent: '#3fff8b' },
                        { icon: Zap,       label: 'NLP Sinyali',      target: 8,     suffix: '',   delay: 240, accent: '#60a5fa' },
                        { icon: Timer,     label: 'Ort. Analiz Süresi', target: 1.4, suffix: 'sn', delay: 360, accent: '#f59e0b' },
                    ].map(({ icon: Icon, label, target, suffix, delay, accent }, i) => (
                        <div key={label}
                             className={`p-6 ${i < 3 ? 'border-r' : ''}`}
                             style={{ borderColor: BORDER }}>
                            <Icon className="w-4 h-4 mb-3" style={{ color: accent }} />
                            <p className="font-mono font-black text-3xl mb-1" style={{ color: accent }}>
                                <Counter target={target} suffix={suffix} delay={delay} />
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-widest"
                               style={{ color: 'var(--color-text-muted)' }}>
                                {label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* ══ NE İÇERİYORUZ ════════════════════════════════ */}
        <section className="mb-20">
            <Reveal className="mb-8">
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND }}>
                    // NE_İÇERİYORUZ
                </p>
                <h2 className="text-2xl md:text-3xl font-manrope font-extrabold tracking-tight"
                    style={{ color: 'var(--color-text-primary)' }}>
                    Sisteme Dahil Özellikler
                </h2>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                    { icon: Search,  title: 'URL Analizi',       desc: 'Haber linkini direkt yapıştır. Sistem içeriği çeker, dil sinyallerini değerlendirir ve gerçeklik skoru üretir.', delay: 0 },
                    { icon: Layers,  title: 'Metin Analizi',     desc: 'Ham metin, makale veya sosyal medya paylaşımını yapıştır. 8 NLP sinyali ile milisaniyeler içinde analiz.', delay: 80 },
                    { icon: Eye,     title: 'Görsel Analizi',    desc: 'Haber görseli yükle. EXIF metadata, manipülasyon izleri ve AI üretim tespiti tek arayüzde.', delay: 160 },
                    { icon: Brain,   title: 'Derin AI Raporu',   desc: 'Google Gemini destekli fact-check. İddiaları kaynaklara karşılaştırır, tam kanıt raporu sunar.', delay: 240 },
                    { icon: Globe,   title: 'Canlı Haber Akışı', desc: 'RSS monitör ile güncel haberler otomatik taranır, yüksek riskli içerikler anında işaretlenir.', delay: 320 },
                    { icon: Users,   title: 'Forum & Tartışma',  desc: 'Kullanıcılar analiz sonuçlarını tartışır, iddia oluşturur, doğrulama katkısı sağlar.', delay: 400 },
                ].map(({ icon: Icon, title, desc, delay }) => (
                    <Reveal key={title} delay={delay}>
                        <div className="relative border p-5 h-full transition-all duration-300 hover:brightness-105"
                             style={{ background: SURFACE, borderColor: BORDER }}>
                            <Notch size={12} />
                            <Icon className="w-5 h-5 mb-3" style={{ color: BRAND }} />
                            <h3 className="font-mono font-bold text-sm mb-2"
                                style={{ color: 'var(--color-text-primary)' }}>
                                {title}
                            </h3>
                            <p className="font-mono text-[11px] leading-relaxed"
                               style={{ color: 'var(--color-text-muted)' }}>
                                {desc}
                            </p>
                        </div>
                    </Reveal>
                ))}
            </div>
        </section>

        {/* ══ HEDEFİMİZ ════════════════════════════════════ */}
        <section className="mb-20">
            <Reveal className="mb-8">
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND }}>
                    // HEDEFİMİZ
                </p>
                <h2 className="text-2xl md:text-3xl font-manrope font-extrabold tracking-tight"
                    style={{ color: 'var(--color-text-primary)' }}>
                    Vizyon & Misyon
                </h2>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-4">
                <Reveal dir="left" delay={0}>
                    <div className="relative border p-7 h-full" style={{ background: SURFACE, borderColor: BORDER }}>
                        <Notch />
                        <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: BRAND }}>
                            // VİZYON
                        </p>
                        <Eye className="w-6 h-6 mb-4" style={{ color: BRAND }} />
                        <h3 className="font-manrope font-extrabold text-xl mb-3"
                            style={{ color: 'var(--color-text-primary)' }}>
                            Güvenilir Haberin Herkes İçin Erişilebilir Olduğu Bir Ekosistem
                        </h3>
                        <p className="font-mono text-[11px] leading-relaxed"
                           style={{ color: 'var(--color-text-secondary)' }}>
                            Bilginin silah olarak kullanıldığı dijital çağda, her vatandaşın doğru
                            habere ulaşma hakkı vardır. Yapay zekanın gücüyle Türkçe dijital
                            bilgi ekosisteminin güvenilir filtresi olmayı hedefliyoruz.
                        </p>
                        <div className="mt-6 pt-4 border-t flex flex-col gap-2" style={{ borderColor: BORDER }}>
                            {['Türkiye\'nin en kapsamlı haber doğrulama veri tabanı', 'Günlük 100K+ analiz kapasitesi', 'Açık API ile ekosistem entegrasyonu'].map(t => (
                                <div key={t} className="flex items-start gap-2">
                                    <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: BRAND }} />
                                    <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>

                <Reveal dir="right" delay={100}>
                    <div className="relative border p-7 h-full" style={{ background: SURFACE, borderColor: BORDER }}>
                        <Notch />
                        <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: BRAND }}>
                            // MİSYON
                        </p>
                        <Target className="w-6 h-6 mb-4" style={{ color: BRAND }} />
                        <h3 className="font-manrope font-extrabold text-xl mb-3"
                            style={{ color: 'var(--color-text-primary)' }}>
                            Türkçe Haberlerde Doğruluğu Anında ve Şeffaf Doğrula
                        </h3>
                        <p className="font-mono text-[11px] leading-relaxed"
                           style={{ color: 'var(--color-text-secondary)' }}>
                            BERT tabanlı Türkçe dil modeli, pgvector semantik arama ve kural tabanlı NLP
                            sinyalleriyle sahte haberleri saniyeler içinde tespit ediyoruz.
                            Kaynakları şeffaf sunuyor, kullanıcıların bilinçli karar almasını sağlıyoruz.
                        </p>
                        <div className="mt-6 pt-4 border-t flex flex-col gap-2" style={{ borderColor: BORDER }}>
                            {['Karar sürecini açıkla, kara kutu kullanma', 'Her iddianın kaynağını kayıt altında tut', 'Topluluğun doğrulama gücünü sisteme kat'].map(t => (
                                <div key={t} className="flex items-start gap-2">
                                    <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: BRAND }} />
                                    <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>

        {/* ══ PLANLARIMIZ (ROADMAP) ════════════════════════ */}
        <section className="mb-20">
            <Reveal className="mb-8">
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND }}>
                    // PLANLARIMIZ
                </p>
                <h2 className="text-2xl md:text-3xl font-manrope font-extrabold tracking-tight"
                    style={{ color: 'var(--color-text-primary)' }}>
                    Yol Haritası
                </h2>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-4">
                {/* Tamamlandı */}
                <Reveal delay={0}>
                    <div className="relative border h-full" style={{ background: SURFACE, borderColor: BORDER }}>
                        <Notch color="rgba(16,185,129,0.8)" />
                        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
                            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest"
                                  style={{ color: '#10b981' }}>Tamamlandı</span>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            {[
                                'BERT tabanlı metin analizi (v1.0)',
                                'pgvector semantik arama motoru',
                                'Görsel analizi modülü',
                                'Celery asenkron görev kuyruğu',
                                'Forum & topluluk platformu',
                                'RSS haber monitörü',
                                'Kullanıcı XP & rozet sistemi',
                                'Derin AI fact-check raporu',
                            ].map(t => (
                                <div key={t} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#10b981' }} />
                                    <span className="font-mono text-[11px] leading-snug" style={{ color: 'var(--color-text-secondary)' }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>

                {/* Devam Ediyor */}
                <Reveal delay={100}>
                    <div className="relative border h-full" style={{ background: SURFACE, borderColor: BORDER }}>
                        <Notch color="rgba(245,158,11,0.8)" />
                        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
                            <Clock className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest"
                                  style={{ color: '#f59e0b' }}>Devam Ediyor</span>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            {[
                                'Model feedback loop (kullanıcı geri bildirimi)',
                                'A/B test altyapısı',
                                'WebSocket gerçek zamanlı bildirimler',
                                'Gelişmiş önyargı analizi (kaynak)',
                                'Sinyal highlight — heatmap görselleştirme',
                                'Kullanıcı davranış takibi',
                            ].map(t => (
                                <div key={t} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 animate-pulse-soft" style={{ background: '#f59e0b' }} />
                                    <span className="font-mono text-[11px] leading-snug" style={{ color: 'var(--color-text-secondary)' }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>

                {/* Planlandı */}
                <Reveal delay={200}>
                    <div className="relative border h-full" style={{ background: SURFACE, borderColor: BORDER }}>
                        <Notch color="rgba(96,165,250,0.8)" />
                        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
                            <Circle className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest"
                                  style={{ color: '#60a5fa' }}>Planlandı</span>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            {[
                                'Tarayıcı uzantısı (Chrome / Firefox)',
                                'Mobil uygulama (iOS & Android)',
                                'Açık REST API — dış entegrasyon',
                                'Çoklu dil desteği (EN/AR/DE)',
                                'Federe doğrulama ağı',
                                'Kurumsal medya partnerlikleri',
                                'Eğitim materyali & medya okuryazarlığı',
                            ].map(t => (
                                <div key={t} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#60a5fa', opacity: 0.6 }} />
                                    <span className="font-mono text-[11px] leading-snug" style={{ color: 'var(--color-text-muted)' }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>

        {/* ══ TEKNOLOJİ STACK ══════════════════════════════ */}
        <section className="mb-20">
            <Reveal className="mb-8">
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND }}>
                    // TEKNOLOJİ_YIĞINI
                </p>
                <h2 className="text-2xl md:text-3xl font-manrope font-extrabold tracking-tight"
                    style={{ color: 'var(--color-text-primary)' }}>
                    Altında Yatan Güç
                </h2>
            </Reveal>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'BERT Turkish',    sub: 'emrecan/bert-base-turkish',  delay: 0   },
                    { label: 'pgvector',        sub: 'PostgreSQL semantik arama',  delay: 50  },
                    { label: 'FastAPI',         sub: 'Async REST backend',         delay: 100 },
                    { label: 'Celery + Redis',  sub: 'Görev kuyruğu',             delay: 150 },
                    { label: 'React 19',        sub: 'Vite + Tailwind CSS 4',      delay: 200 },
                    { label: 'Zemberek NLP',    sub: 'Türkçe morfoloji',           delay: 250 },
                    { label: 'scikit-learn',    sub: 'ML sınıflandırıcı',          delay: 300 },
                    { label: 'Google Gemini',   sub: 'Fact-check doğrulama',       delay: 350 },
                ].map(({ label, sub, delay }) => (
                    <Reveal key={label} delay={delay}>
                        <div className="relative border p-3.5 hover:brightness-105 transition-all duration-200"
                             style={{ background: SURFACE, borderColor: BORDER }}>
                            <Notch size={8} />
                            <p className="font-mono text-xs font-bold mb-0.5" style={{ color: BRAND }}>{label}</p>
                            <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
                        </div>
                    </Reveal>
                ))}
            </div>
        </section>


        {/* ══ CTA ══════════════════════════════════════════ */}
        <Reveal>
            <div className="relative border p-10 text-center" style={{ background: SURFACE, borderColor: BORDER }}>
                <Notch size={20} />
                <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: BRAND }}>
                    // HAREKETE_GEÇ
                </p>
                <h2 className="text-2xl md:text-3xl font-manrope font-extrabold tracking-tight mb-3"
                    style={{ color: 'var(--color-text-primary)' }}>
                    Gerçeği Bulmaya Hazır mısın?
                </h2>
                <p className="font-mono text-sm mb-8 max-w-lg mx-auto"
                   style={{ color: 'var(--color-text-secondary)' }}>
                    Şüpheli bir haberin var mı? Hemen analiz et — ücretsiz, kayıt olmadan da çalışır.
                </p>
                <Link to="/"
                      className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest px-6 py-3 border transition-all hover:brightness-110"
                      style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}>
                    <Zap className="w-3.5 h-3.5" />
                    Analiz Sayfasına Git
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </Reveal>

        {/* ══ İLETİŞİM ══════════════════════════════════════ */}
        <Reveal>
            <div className="mt-6 relative border p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5"
                 style={{ background: SURFACE, borderColor: BORDER }}>
                <Notch size={12} />
                <div className="flex items-center gap-3 shrink-0">
                    <div className="p-2.5 border" style={{ borderColor: BORDER }}>
                        <Mail className="w-5 h-5" style={{ color: BRAND }} />
                    </div>
                </div>
                <div className="flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND }}>
                        // İLETİŞİM
                    </p>
                    <p className="font-mono text-sm font-bold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                        Bize Ulaşın
                    </p>
                    <p className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        Öneri, iş birliği veya hata bildirimi için:
                    </p>
                </div>
                <a href="mailto:iletisim@nehaber.dev"
                   className="font-mono text-xs font-bold border px-4 py-2 transition-all hover:brightness-110 shrink-0"
                   style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}>
                    iletisim@nehaber.dev
                </a>
            </div>
        </Reveal>

        {/* ══ GİTHUB ════════════════════════════════════════ */}
        <Reveal>
            <a href="https://github.com/eminaldas/Fake-News-Detection-System"
               target="_blank"
               rel="noopener noreferrer"
               className="mt-6 relative border flex items-center justify-between p-5 transition-all duration-300 hover:brightness-105 group"
               style={{ background: SURFACE, borderColor: BORDER }}>
                <div className="flex items-center gap-4">
                    <Github className="w-5 h-5 shrink-0" style={{ color: '#60a5fa' }} />
                    <div>
                        <p className="font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            eminaldas / Fake-News-Detection-System
                        </p>
                        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            Açık kaynak · MIT Lisansı · Katkıda bulunmaya davetlisiniz
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold border px-3 py-1.5 shrink-0 transition-all group-hover:brightness-110"
                     style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.30)', background: 'rgba(245,158,11,0.06)' }}>
                    ⭐ Yıldızlayın
                </div>
                <ExternalLink className="w-3 h-3 absolute top-3 right-3 opacity-0 group-hover:opacity-40 transition-opacity"
                              style={{ color: 'var(--color-text-muted)' }} />
            </a>
        </Reveal>

    </div>
);

export default About;
