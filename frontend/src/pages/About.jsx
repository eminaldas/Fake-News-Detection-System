import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Github, Mail, Target, Eye, Zap, Shield, Database,
  Brain, Globe, ArrowRight, Star, GitFork, Users, CheckCircle2,
  Cpu, Search, AlertTriangle, TrendingUp, Heart, ExternalLink
} from 'lucide-react';

/* ─── Intersection Observer hook — element görününce animate et ─── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─── Animasyonlu sayı bileşeni ─── */
function AnimatedNumber({ target, suffix = '', duration = 1800 }) {
  const [val, setVal] = useState(0);
  const [ref, inView] = useInView(0.3);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);
  return <span ref={ref}>{val.toLocaleString('tr-TR')}{suffix}</span>;
}

/* ─── Kart wrapper — inView animasyonu ─── */
function FadeCard({ children, className = '', delay = 0, direction = 'up' }) {
  const [ref, inView] = useInView();
  const transforms = { up: 'translateY(24px)', left: 'translateX(-24px)', right: 'translateX(24px)' };
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : transforms[direction],
        transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

/* ─────────────── ANA SAYFA ─────────────── */
const About = () => {
  return (
    <div className="w-full">

      {/* ══════════════════════════════════════
          HERO — Tam genişlik başlık alanı
      ══════════════════════════════════════ */}
      <section className="relative overflow-hidden px-6 py-20 md:py-32 text-center">

        {/* Arka plan glow'ları */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[400px]
                          bg-gradient-to-b from-es-primary/8 via-es-secondary/4 to-transparent
                          blur-3xl rounded-full opacity-60 dark:opacity-100" />
          <div className="absolute -left-32 top-1/2 w-80 h-80
                          bg-es-tertiary/5 dark:bg-es-tertiary/8 blur-3xl rounded-full" />
          <div className="absolute -right-32 top-1/4 w-80 h-80
                          bg-es-secondary/5 dark:bg-es-secondary/8 blur-3xl rounded-full" />
        </div>

        {/* Rozet */}
        <div className="animate-fade-up flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold
                           bg-brand-accent dark:bg-es-primary/10
                           text-brand dark:text-es-primary
                           border border-brand-light dark:border-es-primary/25
                           font-inter tracking-wide uppercase">
            <Shield size={12} />
            Hakikat Koruyucuları
          </span>
        </div>

        {/* Başlık */}
        <h1 className="animate-fade-up delay-75
                       text-4xl sm:text-5xl md:text-6xl lg:text-7xl
                       font-manrope font-extrabold tracking-tighter leading-[1.05]
                       text-tx-primary mb-6 max-w-4xl mx-auto">
          Dezenformasyona{' '}
          <span className="text-brand dark:text-es-primary">Karşı</span>{' '}
          Bir Kalkan
        </h1>

        {/* Alt başlık */}
        <p className="animate-fade-up delay-150
                      text-base sm:text-lg md:text-xl text-tx-secondary font-inter leading-relaxed
                      max-w-2xl mx-auto mb-10">
          Ne Haber, Türkçe haberleri yapay zeka ve anlamsal arama teknolojisiyle
          gerçek zamanlı analiz eden açık kaynaklı bir sahte haber tespit sistemidir.
        </p>

        {/* CTA butonları */}
        <div className="animate-fade-up delay-200 flex flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold
                       bg-tx-primary dark:bg-es-primary
                       text-white dark:text-es-bg
                       hover:opacity-90 active:scale-95
                       transition-all duration-200 shadow-md min-h-[44px]"
          >
            <Zap size={15} />
            Hemen Analiz Et
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold
                       border border-brutal-border dark:border-es-primary/25
                       text-tx-primary dark:text-es-primary
                       hover:bg-surface-solid dark:hover:bg-es-primary/10
                       transition-all duration-200 min-h-[44px]"
          >
            <Github size={15} />
            GitHub
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════
          İSTATİSTİK KARTLARI
      ══════════════════════════════════════ */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: AlertTriangle, label: 'Tespit Edilen Sahte Haber', value: 4800, suffix: '+', color: 'text-es-error dark:text-es-error', delay: 0 },
            { icon: Database,      label: 'Haber Veritabanı',          value: 12000, suffix: '+', color: 'text-es-secondary dark:text-es-secondary', delay: 100 },
            { icon: TrendingUp,    label: 'Doğruluk Oranı',            value: 91,   suffix: '%', color: 'text-es-primary dark:text-es-primary', delay: 200 },
            { icon: Users,         label: 'Analiz Yapan Kullanıcı',    value: 1200, suffix: '+', color: 'text-es-tertiary dark:text-es-tertiary', delay: 300 },
          ].map(({ icon: Icon, label, value, suffix, color, delay }) => (
            <FadeCard
              key={label}
              delay={delay}
              className="glass-card rounded-2xl p-5 md:p-6 flex flex-col gap-3
                         hover:border-brutal-border dark:hover:border-es-primary/30
                         transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <Icon size={20} className={color} strokeWidth={1.8} />
              <div>
                <p className={`text-2xl md:text-3xl font-manrope font-extrabold tracking-tight ${color}`}>
                  <AnimatedNumber target={value} suffix={suffix} />
                </p>
                <p className="text-xs text-tx-secondary font-inter mt-1 leading-tight">{label}</p>
              </div>
            </FadeCard>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          VİZYON & MİSYON
      ══════════════════════════════════════ */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">

          {/* Vizyon */}
          <FadeCard direction="left" className="relative overflow-hidden rounded-3xl p-8 md:p-10
                                                 bg-gradient-to-br from-surface to-surface-solid
                                                 dark:from-es-surface dark:to-es-bg
                                                 border border-brutal-border dark:border-es-primary/15
                                                 hover:border-brutal-border dark:hover:border-es-primary/30
                                                 transition-all duration-300 group">
            {/* Dekor glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48
                            bg-es-primary/5 dark:bg-es-primary/10 rounded-full blur-2xl
                            group-hover:bg-es-primary/10 dark:group-hover:bg-es-primary/15
                            transition-all duration-500" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6
                              bg-brand-accent dark:bg-es-primary/10
                              border border-brand-light dark:border-es-primary/20">
                <Eye size={22} className="text-brand dark:text-es-primary" strokeWidth={1.8} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest
                               text-brand dark:text-es-primary font-inter mb-2 block">
                Vizyonumuz
              </span>
              <h2 className="text-2xl md:text-3xl font-manrope font-extrabold tracking-tight
                             text-tx-primary mb-4 leading-tight">
                Güvenilir Haberin<br />Herkes İçin Erişilebilir Olduğu Bir Dünya
              </h2>
              <p className="text-tx-secondary font-inter text-sm leading-relaxed">
                Bilginin silah olarak kullanıldığı çağda, herkesin doğru habere ulaşma hakkı vardır.
                Yapay zekanın gücüyle, dezenformasyonun önüne geçerek dijital bir hakikat kalkanı
                inşa etmeyi hayal ediyoruz.
              </p>
            </div>
          </FadeCard>

          {/* Misyon */}
          <FadeCard direction="right" delay={100} className="relative overflow-hidden rounded-3xl p-8 md:p-10
                                                               bg-gradient-to-br from-surface to-surface-solid
                                                               dark:from-es-surface dark:to-es-bg
                                                               border border-brutal-border dark:border-es-secondary/15
                                                               hover:border-brutal-border dark:hover:border-es-secondary/30
                                                               transition-all duration-300 group">
            <div className="absolute -bottom-12 -left-12 w-48 h-48
                            bg-es-secondary/5 dark:bg-es-secondary/10 rounded-full blur-2xl
                            group-hover:bg-es-secondary/10 dark:group-hover:bg-es-secondary/15
                            transition-all duration-500" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6
                              bg-brand-accent dark:bg-es-secondary/10
                              border border-brand-light dark:border-es-secondary/20">
                <Target size={22} className="text-brand-dark dark:text-es-secondary" strokeWidth={1.8} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest
                               text-brand-dark dark:text-es-secondary font-inter mb-2 block">
                Misyonumuz
              </span>
              <h2 className="text-2xl md:text-3xl font-manrope font-extrabold tracking-tight
                             text-tx-primary mb-4 leading-tight">
                Türkçe Haberlerde<br />Doğruluğu Anında Doğrula
              </h2>
              <p className="text-tx-secondary font-inter text-sm leading-relaxed">
                BERT tabanlı Türkçe dil modeli ve pgvector anlamsal aramayla, sahte haberleri
                saniyeler içinde tespit ediyoruz. Kaynakları şeffaf sunuyor,
                insanların bilinçli kararlar almasını kolaylaştırıyoruz.
              </p>
            </div>
          </FadeCard>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PROJE AMACI
      ══════════════════════════════════════ */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <FadeCard className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-tx-secondary font-inter block mb-3">
              Proje Amacı
            </span>
            <h2 className="text-3xl md:text-4xl font-manrope font-extrabold tracking-tighter text-tx-primary mb-4">
              Neden{' '}
              <span className="text-brand dark:text-es-primary">Ne Haber</span>?
            </h2>
            <p className="text-tx-secondary font-inter text-base leading-relaxed max-w-2xl mx-auto">
              Dezenformasyon; siyasi, sosyal ve ekonomik düzeni tehdit eder.
              Türkçe içerik için güçlü araçlar yetersizken biz bu boşluğu doldurmak için yola çıktık.
            </p>
          </FadeCard>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Search,
                title: 'Anlık Doğrulama',
                desc: 'Herhangi bir haber metnini veya URL\'yi yapıştır; saniyeler içinde kapsamlı analiz sonucunu al.',
                accent: 'es-primary',
                delay: 0,
              },
              {
                icon: Brain,
                title: 'Yapay Zeka Gücü',
                desc: '768 boyutlu BERT gömme vektörleri ve scikit-learn sınıflandırıcısı hibrit bir analiz katmanı oluşturur.',
                accent: 'es-secondary',
                delay: 100,
              },
              {
                icon: Globe,
                title: 'Türkçeye Özel',
                desc: 'Zemberek morfoloji motoru ve Türkçeye fine-tune edilmiş modeller sayesinde dil nüanslarını kavrar.',
                accent: 'es-tertiary',
                delay: 200,
              },
              {
                icon: Shield,
                title: 'Şeffaf Sonuçlar',
                desc: 'Her analiz; güven skoru, kaynak kaydı ve tespit yöntemiyle birlikte sunulur. Kara kutu yok.',
                accent: 'es-primary',
                delay: 300,
              },
              {
                icon: Cpu,
                title: 'Asenkron İşlem',
                desc: 'Celery ve Redis ile ağır analizler arka planda işlenir; kullanıcı arayüzü donmaz.',
                accent: 'es-secondary',
                delay: 400,
              },
              {
                icon: Database,
                title: 'Büyüyen Veritabanı',
                desc: 'Her analiz, knowledge base\'i zenginleştirir. Sistem zamanla daha doğru ve daha hızlı olur.',
                accent: 'es-tertiary',
                delay: 500,
              },
            ].map(({ icon: Icon, title, desc, accent, delay }) => (
              <FadeCard
                key={title}
                delay={delay}
                className={`glass-card rounded-2xl p-6
                            hover:border-${accent}/40 dark:hover:border-${accent}/40
                            hover:-translate-y-1 hover:shadow-lg
                            transition-all duration-300 group`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4
                                 bg-brand-accent dark:bg-${accent}/10
                                 border border-brand-light dark:border-${accent}/20
                                 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={18} className={`text-brand dark:text-${accent}`} strokeWidth={1.8} />
                </div>
                <h3 className="font-manrope font-bold text-base text-tx-primary mb-2">{title}</h3>
                <p className="text-xs text-tx-secondary font-inter leading-relaxed">{desc}</p>
              </FadeCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SONUÇLAR / TEKNOLOJİ STACK
      ══════════════════════════════════════ */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <FadeCard className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-tx-secondary font-inter block mb-3">
              Sonuçlar & Teknoloji
            </span>
            <h2 className="text-3xl md:text-4xl font-manrope font-extrabold tracking-tighter text-tx-primary">
              Altında Yatan{' '}
              <span className="text-brand dark:text-es-secondary">Güç</span>
            </h2>
          </FadeCard>

          <div className="grid md:grid-cols-2 gap-8 items-start">

            {/* Sol — Sonuçlar listesi */}
            <FadeCard direction="left" className="space-y-4">
              <h3 className="font-manrope font-extrabold text-xl text-tx-primary mb-6">
                Elde Ettiğimiz Sonuçlar
              </h3>
              {[
                { text: 'Test setinde %91 sınıflandırma doğruluğu', color: 'authentic' },
                { text: 'Ortalama analiz süresi 1.4 saniyenin altında', color: 'authentic' },
                { text: 'Cosine benzerlik ile ≥%92 eşleşmede doğrudan doğrulama', color: 'authentic' },
                { text: 'Hibrit ensemble ile düşük güvenli tahminler güçlendirildi', color: 'authentic' },
                { text: 'Açık kaynak — herkes katkıda bulunabilir', color: 'authentic' },
                { text: 'İki veri seti: Aruz-Alkan + Hoax Tutorial', color: 'authentic' },
              ].map(({ text, color }) => (
                <div key={text} className="flex items-start gap-3">
                  <CheckCircle2
                    size={18}
                    className={`text-${color}-fill shrink-0 mt-0.5`}
                    strokeWidth={2}
                  />
                  <span className="text-sm text-tx-secondary font-inter leading-relaxed">{text}</span>
                </div>
              ))}
            </FadeCard>

            {/* Sağ — Tech stack grid */}
            <FadeCard direction="right" delay={100}>
              <h3 className="font-manrope font-extrabold text-xl text-tx-primary mb-6">
                Teknoloji Yığını
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'BERT Turkish', sub: 'emrecan/bert-base-turkish-cased', color: 'es-primary' },
                  { label: 'pgvector', sub: 'PostgreSQL uzantısı', color: 'es-secondary' },
                  { label: 'FastAPI', sub: 'Async REST backend', color: 'es-tertiary' },
                  { label: 'Celery + Redis', sub: 'Asenkron görev kuyruğu', color: 'es-primary' },
                  { label: 'React 19', sub: 'Vite + Tailwind CSS 4', color: 'es-secondary' },
                  { label: 'Zemberek', sub: 'Türkçe NLP morfoloji', color: 'es-tertiary' },
                  { label: 'scikit-learn', sub: 'ML sınıflandırıcı', color: 'es-primary' },
                  { label: 'Google Gemini', sub: 'Fact-check doğrulama', color: 'es-secondary' },
                ].map(({ label, sub, color }) => (
                  <div
                    key={label}
                    className={`glass-card rounded-xl p-3.5
                                hover:border-${color}/30 dark:hover:border-${color}/30
                                transition-all duration-200 hover:-translate-y-0.5`}
                  >
                    <p className={`text-sm font-semibold font-inter text-${color} dark:text-${color}`}>{label}</p>
                    <p className="text-xs text-muted font-inter mt-0.5 leading-tight">{sub}</p>
                  </div>
                ))}
              </div>
            </FadeCard>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          GITHUB — DESTEK OLUN
      ══════════════════════════════════════ */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <FadeCard>
            <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center
                            bg-gradient-to-br from-brand-accent via-surface to-brand-light
                            dark:from-[#071a0e] dark:via-es-surface dark:to-[#071a12]
                            border border-brand-light dark:border-es-primary/20">

              {/* Dekor glow'lar */}
              <div className="pointer-events-none absolute inset-0 -z-0">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-96 h-48
                                bg-es-primary/6 dark:bg-es-primary/12 blur-3xl rounded-full" />
                <div className="absolute -bottom-8 -right-8 w-64 h-64
                                bg-es-secondary/5 dark:bg-es-secondary/10 blur-3xl rounded-full" />
              </div>

              <div className="relative">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center
                                  bg-white dark:bg-es-primary/10
                                  border border-brand-light dark:border-es-primary/25
                                  shadow-sm">
                    <Github size={28} className="text-tx-primary dark:text-es-primary" strokeWidth={1.5} />
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-manrope font-extrabold tracking-tighter
                               text-tx-primary mb-4">
                  Projeye Destek Olun
                </h2>
                <p className="text-tx-secondary font-inter text-base leading-relaxed max-w-xl mx-auto mb-8">
                  Ne Haber açık kaynaklı bir projedir. Hata bildirimi, yeni özellik önerisi,
                  veri katkısı veya sadece bir ⭐ yıldız — her destek bizi motive eder.
                </p>

                <div className="flex flex-wrap gap-4 justify-center mb-8">
                  {[
                    { icon: Star,    label: 'Yıldız Ver' },
                    { icon: GitFork, label: 'Fork\'la' },
                    { icon: Heart,   label: 'Katkıda Bulun' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label}
                         className="flex items-center gap-2 px-4 py-2 rounded-full
                                    bg-surface dark:bg-es-bg/60
                                    border border-brutal-border dark:border-es-primary/15
                                    text-sm text-tx-secondary font-inter">
                      <Icon size={14} className="text-brand dark:text-es-primary" />
                      {label}
                    </div>
                  ))}
                </div>

                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl
                             font-bold text-sm font-inter
                             bg-tx-primary dark:bg-es-primary
                             text-white dark:text-es-bg
                             hover:opacity-90 active:scale-95
                             transition-all duration-200 shadow-lg min-h-[48px]"
                >
                  <Github size={17} />
                  GitHub'da Görüntüle
                  <ExternalLink size={13} className="opacity-70" />
                </a>
              </div>
            </div>
          </FadeCard>
        </div>
      </section>

      {/* ══════════════════════════════════════
          İLETİŞİM
      ══════════════════════════════════════ */}
      <section className="px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <FadeCard className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-tx-secondary font-inter block mb-3">
              İletişim
            </span>
            <h2 className="text-3xl md:text-4xl font-manrope font-extrabold tracking-tighter text-tx-primary mb-4">
              Bizimle{' '}
              <span className="text-brand dark:text-es-secondary">İletişime Geçin</span>
            </h2>
            <p className="text-tx-secondary font-inter text-base max-w-lg mx-auto">
              Sorularınız, önerileriniz ya da iş birliği teklifleriniz için bize ulaşın.
              Her mesaja en kısa sürede yanıt veriyoruz.
            </p>
          </FadeCard>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Mail,
                title: 'E-posta',
                value: 'iletisim@nehaber.dev',
                sub: 'Genellikle 24 saat içinde yanıt veririz',
                href: 'mailto:iletisim@nehaber.dev',
                color: 'es-primary',
                delay: 0,
              },
              {
                icon: Github,
                title: 'GitHub',
                value: 'github.com/nehaber',
                sub: 'Issue açın veya PR gönderin',
                href: 'https://github.com',
                color: 'es-secondary',
                delay: 100,
              },
              {
                icon: Globe,
                title: 'Swagger API',
                value: 'localhost:8000/docs',
                sub: 'JWT ile tüm endpointleri deneyin',
                href: 'http://localhost:8000/docs',
                color: 'es-tertiary',
                delay: 200,
              },
            ].map(({ icon: Icon, title, value, sub, href, color, delay }) => (
              <FadeCard
                key={title}
                delay={delay}
                className="group"
              >
                <a
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className={`block glass-card rounded-2xl p-7
                              hover:border-${color}/35 dark:hover:border-${color}/35
                              hover:-translate-y-1.5 hover:shadow-xl
                              transition-all duration-300`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5
                                   bg-brand-accent dark:bg-${color}/10
                                   border border-brand-light dark:border-${color}/20
                                   group-hover:scale-110 transition-transform duration-200`}>
                    <Icon size={20} className={`text-brand dark:text-${color}`} strokeWidth={1.8} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-tx-secondary font-inter mb-1">
                    {title}
                  </p>
                  <p className={`font-manrope font-bold text-base text-${color} dark:text-${color} mb-1`}>
                    {value}
                  </p>
                  <p className="text-xs text-muted font-inter">{sub}</p>
                  <div className={`flex items-center gap-1 mt-4 text-xs font-semibold
                                   text-${color} dark:text-${color} opacity-0 group-hover:opacity-100
                                   transition-opacity duration-200`}>
                    Ulaşın <ArrowRight size={12} />
                  </div>
                </a>
              </FadeCard>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default About;
