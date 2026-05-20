import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Shield, FileText, ChevronRight } from 'lucide-react';

const BRAND  = 'var(--color-brand-primary)';
const BORDER = 'var(--color-terminal-border-raw)';

function Section({ title, children }) {
    return (
        <div className="mb-8">
            <h2 className="font-manrope font-extrabold text-base mb-3"
                style={{ color: 'var(--color-text-primary)' }}>
                {title}
            </h2>
            <div className="font-mono text-sm leading-relaxed space-y-2"
                 style={{ color: 'var(--color-text-secondary)' }}>
                {children}
            </div>
        </div>
    );
}

function Bullet({ children }) {
    return (
        <div className="flex items-start gap-2">
            <ChevronRight className="w-3 h-3 shrink-0 mt-1" style={{ color: BRAND }} />
            <span>{children}</span>
        </div>
    );
}

function Badge({ children }) {
    return (
        <span className="inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 mr-1.5"
              style={{ background: 'rgba(16,185,129,0.10)', color: BRAND, border: `1px solid rgba(16,185,129,0.25)` }}>
            {children}
        </span>
    );
}

const PRIVACY = (
    <>
        <Section title="1. Veri Sorumlusu">
            <p>
                Ne Haber platformu ("Platform"), 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve
                Genel Veri Koruma Tüzüğü (GDPR) kapsamında <strong style={{ color: 'var(--color-text-primary)' }}>veri sorumlusu</strong> sıfatıyla hareket etmektedir.
                Platform; açık kaynaklı, araştırma odaklı bir yapay zeka haber doğrulama sistemidir.
            </p>
        </Section>

        <Section title="2. Toplanan Kişisel Veriler">
            <Bullet><Badge>Hesap</Badge> Ad, e-posta adresi, kullanıcı adı, şifrelenmiş parola hash'i</Bullet>
            <Bullet><Badge>Google OAuth</Badge> Google hesabınızla giriş yaparsanız; profil resmi URL'si ve Google hesap kimliği (access_token saklanmaz)</Bullet>
            <Bullet><Badge>Analiz</Badge> Platforma gönderdiğiniz haber metinleri, URL'ler ve bunlara ait AI analiz sonuçları</Bullet>
            <Bullet><Badge>Log</Badge> IP adresi, tarayıcı tipi, oturum süresi ve platform etkileşimleri</Bullet>
            <Bullet><Badge>Çerez</Badge> Oturum JWT token'ı ve kullanıcı arayüz tercihleri</Bullet>
        </Section>

        <Section title="3. Verilerin İşlenme Amaçları ve Hukuki Dayanağı">
            <Bullet>Hizmetin sağlanması ve sürdürülmesi <span style={{ color: 'var(--color-text-muted)' }}>(KVKK m.5/2-c, sözleşme ifası)</span></Bullet>
            <Bullet>Kullanıcı kimliğinin doğrulanması ve oturum yönetimi <span style={{ color: 'var(--color-text-muted)' }}>(KVKK m.5/2-c)</span></Bullet>
            <Bullet>BERT tabanlı dil modelinin geliştirilmesi — yalnızca <strong style={{ color: 'var(--color-text-primary)' }}>anonimleştirilmiş</strong> verilerle <span style={{ color: 'var(--color-text-muted)' }}>(KVKK m.5/1, açık rıza)</span></Bullet>
            <Bullet>Sistem güvenliği, dolandırıcılık tespiti ve hizmet kötüye kullanımının önlenmesi <span style={{ color: 'var(--color-text-muted)' }}>(KVKK m.5/2-ç)</span></Bullet>
            <Bullet>Yasal yükümlülüklerin yerine getirilmesi <span style={{ color: 'var(--color-text-muted)' }}>(KVKK m.5/2-a)</span></Bullet>
        </Section>

        <Section title="4. Yapay Zeka Modeli ve Veri İşleme">
            <p>
                Gönderdiğiniz haber metinleri ve analiz sonuçları,{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>kişisel tanımlayıcı bilgilerden arındırılarak</strong>{' '}
                BERT tabanlı Türkçe dil modelinin doğruluk oranının iyileştirilmesi amacıyla kullanılabilir.
                Bu işlem yalnızca anonimleştirilmiş biçimde gerçekleşir; ham metinler model eğitimi için
                üçüncü taraflarla paylaşılmaz.
            </p>
            <p className="mt-2">
                Model geliştirme amacıyla veri işlenmesine itiraz etmek için{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>Profil → Ayarlar → Hesap</strong>{' '}
                bölümünden veri işleme tercihlerinizi güncelleyebilirsiniz.
            </p>
        </Section>

        <Section title="5. Google ile Giriş ve Üçüncü Taraf Veri Paylaşımı">
            <p>
                "Google ile Giriş Yap" özelliğini kullandığınızda Google OAuth 2.0 protokolü devreye girer.
                Bu süreçte Google; <strong style={{ color: 'var(--color-text-primary)' }}>ad, e-posta ve profil resmi</strong>{' '}
                bilgilerini platformumuzla paylaşır. Google access_token'ı sunucularımızda saklanmaz.
            </p>
            <p className="mt-2">
                Google'ın kendi veri işleme politikası için:{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                   className="underline underline-offset-2" style={{ color: BRAND }}>
                    policies.google.com/privacy
                </a>
            </p>
            <p className="mt-2">
                Kişisel verileriniz <strong style={{ color: 'var(--color-text-primary)' }}>üçüncü taraf reklamcılara, veri komisyoncularına veya analitik platformlara satılmaz ya da paylaşılmaz.</strong>
            </p>
        </Section>

        <Section title="6. Çerezler">
            <p className="mb-2">Platform yalnızca işlevsel amaçlı çerezler kullanır:</p>
            <Bullet><Badge>Zorunlu</Badge> JWT oturum token'ı — giriş durumunuzu korur, oturum kapanınca silinir</Bullet>
            <Bullet><Badge>Tercih</Badge> Tema (açık/koyu mod) ve arayüz tercihleri — localStorage'da saklanır</Bullet>
            <p className="mt-2">
                <strong style={{ color: 'var(--color-text-primary)' }}>Analitik, izleme veya reklam çerezi kullanılmamaktadır.</strong>{' '}
                Google Sign-In entegrasyonu nedeniyle accounts.google.com domain'inden teknik çerezler oluşabilir;
                bunlar Google'ın kendi politikasına tabidir.
            </p>
        </Section>

        <Section title="7. Veri Güvenliği">
            <Bullet>Tüm bağlantılar HTTPS/TLS ile şifrelenir</Bullet>
            <Bullet>Parolalar bcrypt algoritmasıyla hash'lenir, asla düz metin olarak saklanmaz</Bullet>
            <Bullet>JWT token'ları kısa ömürlüdür (30 dakika), refresh mekanizmasıyla yenilenir</Bullet>
            <Bullet>Veritabanı erişimi yalnızca yetkili servislerle sınırlıdır</Bullet>
        </Section>

        <Section title="8. Kullanıcı Hakları (KVKK m.11 / GDPR m.15-22)">
            <Bullet><strong style={{ color: 'var(--color-text-primary)' }}>Erişim:</strong> Hakkınızdaki verilerin neler olduğunu öğrenme</Bullet>
            <Bullet><strong style={{ color: 'var(--color-text-primary)' }}>Düzeltme:</strong> Yanlış verilerin güncellenmesini talep etme</Bullet>
            <Bullet><strong style={{ color: 'var(--color-text-primary)' }}>Silme (Unutulma Hakkı):</strong> Profil → Ayarlar → Hesap Sil butonu ile tüm verilerinizi kalıcı olarak silebilirsiniz</Bullet>
            <Bullet><strong style={{ color: 'var(--color-text-primary)' }}>İşlemeye İtiraz:</strong> Model geliştirme amacıyla veri kullanımına itiraz edebilirsiniz</Bullet>
            <Bullet><strong style={{ color: 'var(--color-text-primary)' }}>Taşınabilirlik:</strong> Verilerinizin makine okunabilir formatta tarafınıza iletilmesini talep edebilirsiniz</Bullet>
            <Bullet><strong style={{ color: 'var(--color-text-primary)' }}>Şikayet:</strong> KVKK kapsamında Kişisel Verileri Koruma Kurumu'na (KVKK) başvurabilirsiniz</Bullet>
        </Section>

        <Section title="9. Veri Saklama Süreleri">
            <Bullet>Hesap verileri: hesabınız aktif olduğu sürece</Bullet>
            <Bullet>Hesap silinmesinden sonra: 30 gün içinde kalıcı silme (yedeklerden temizleme dahil)</Bullet>
            <Bullet>Anonimleştirilmiş analiz verileri: süresiz (kişisel bağlantı kaldırılmıştır)</Bullet>
            <Bullet>Yasal zorunluluk içeren log verileri: ilgili mevzuat kapsamında (Türk hukuku)</Bullet>
        </Section>

        <Section title="10. Değişiklikler ve Bildirim">
            <p>
                Bu politika güncellendiğinde kayıtlı e-posta adresinize bildirim gönderilir ve
                sürüm numarası artırılır. Güncel metin her zaman bu sayfada mevcuttur.
                Değişiklikten sonra platformu kullanmaya devam etmek güncellemeyi kabul ettiğiniz anlamına gelir.
            </p>
        </Section>

        <div className="mt-10 pt-6 border-t font-mono text-[11px] space-y-1"
             style={{ borderColor: BORDER, color: 'var(--color-text-muted)' }}>
            <p>Sürüm: <strong>v1.0</strong> · Yürürlük: 21 Mayıs 2026</p>
            <p>Onay takip sistemi: <code className="text-[10px] px-1" style={{ background: 'rgba(16,185,129,0.08)', color: BRAND }}>users.privacy_version</code> · <code className="text-[10px] px-1" style={{ background: 'rgba(16,185,129,0.08)', color: BRAND }}>users.privacy_accepted_at</code></p>
        </div>
    </>
);

const TERMS = (
    <>
        <Section title="1. Kabulü">
            <p>
                Ne Haber platformuna kayıt olarak veya platformu kullanarak bu Kullanım Koşulları'nı
                okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş sayılırsınız.
                Kabul etmiyorsanız platformu kullanmayınız.
            </p>
        </Section>

        <Section title="2. Hizmet Tanımı ve Kapsam">
            <p>
                Ne Haber; BERT tabanlı Türkçe dil modeli, pgvector semantik arama ve NLP sinyalleri
                kullanarak haber metinlerinin güvenilirliğini değerlendiren bir yapay zeka platformudur.
            </p>
            <p className="mt-2">
                <strong style={{ color: '#f59e0b' }}>Önemli Uyarı:</strong>{' '}
                Platform analiz sonuçları <strong style={{ color: 'var(--color-text-primary)' }}>yalnızca bilgilendirme amaçlıdır.</strong>{' '}
                Kesin gazetecilik kararı, hukuki delil veya tıbbi/finansal tavsiye olarak kullanılamaz.
                Yapay zeka modelleri hata yapabilir; sonuçları bağımsız kaynaklarla doğrulamanız önerilir.
            </p>
        </Section>

        <Section title="3. Kullanıcı Yükümlülükleri">
            <Bullet>Kayıt sırasında gerçek ve doğru bilgi vermek</Bullet>
            <Bullet>Hesap güvenliğini (şifre güvenliği, oturum yönetimi) sağlamak</Bullet>
            <Bullet>Hesap bilgilerini başkalarıyla paylaşmamak</Bullet>
            <Bullet>Diğer kullanıcıların haklarına ve gizliliğine saygı göstermek</Bullet>
            <Bullet>Platformu yalnızca yasal amaçlarla kullanmak</Bullet>
        </Section>

        <Section title="4. Yasak Kullanımlar">
            <Bullet>Otomatik bot, scraper veya crawler ile sistematik veri toplama</Bullet>
            <Bullet>Yapay zeka modelini yanıltmaya veya sistemi manipüle etmeye yönelik girişimler</Bullet>
            <Bullet>Sahte kimlik veya başkası adına kayıt oluşturma</Bullet>
            <Bullet>Zararlı, nefret içerikli, hakaret edici veya yanıltıcı içerik paylaşımı</Bullet>
            <Bullet>Telif hakkıyla korunan materyalin izinsiz yüklenmesi</Bullet>
            <Bullet>Platformun altyapısına saldırı (DDoS, SQL enjeksiyonu, XSS vb.)</Bullet>
            <Bullet>Başka kullanıcıların gizliliğinin ihlali</Bullet>
        </Section>

        <Section title="5. Forum ve Topluluk Kuralları">
            <Bullet>Forum'da paylaşılan içerikler kullanıcıya aittir; Platform içeriği yayınlamaz, ancak Kullanım Koşulları'nı ihlal eden içerikleri kaldırma hakkına sahiptir</Bullet>
            <Bullet>Yanıltıcı bilgi, dezenformasyon veya manipülasyon içerdiği tespit edilen gönderiler kaldırılabilir</Bullet>
            <Bullet>Tekrarlayan ihlallerde hesap geçici veya kalıcı olarak askıya alınabilir</Bullet>
        </Section>

        <Section title="6. Fikri Mülkiyet">
            <p>
                Platform kodu MIT lisansı altında açık kaynaklıdır (github.com/eminaldas/Fake-News-Detection-System).
                Eğitilmiş modeller, vektör veritabanı içeriği ve özgün tasarım unsurları Platform'a aittir.
                Kaynak göstererek kullanım serbesttir; ticari amaçlı yeniden satış yasaktır.
            </p>
        </Section>

        <Section title="7. Sorumluluk Sınırlaması">
            <Bullet>Platform, analiz sonuçlarının kesin doğruluğunu garanti etmez</Bullet>
            <Bullet>Yapay zeka değerlendirmeleri hata, önyargı veya eksiklik içerebilir</Bullet>
            <Bullet>Platform; bu sonuçlara dayanılarak alınan kararların hukuki, mali veya itibar sonuçlarından sorumlu tutulamaz</Bullet>
            <Bullet>Platform, kesintisiz veya hatasız hizmet garantisi vermez</Bullet>
        </Section>

        <Section title="8. Hesap Sonlandırma">
            <p>
                Koşulları ihlal eden veya yasadışı faaliyet yürüttüğü tespit edilen hesaplar,{' '}
                önceden bildirim yapılmaksızın askıya alınabilir veya kalıcı olarak silinebilir.
            </p>
            <p className="mt-2">
                Kullanıcılar her zaman{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>Profil → Ayarlar → Hesabımı Sil</strong>{' '}
                butonu aracılığıyla kendi hesaplarını silebilir.
            </p>
        </Section>

        <Section title="9. Değişiklikler">
            <p>
                Bu koşullar Platform tarafından değiştirilebilir. Önemli değişiklikler kullanıcılara
                kayıtlı e-posta adresleri üzerinden bildirilir ve sürüm numarası güncellenir.
                Bildirimin ardından platformu kullanmaya devam etmek yeni koşulları kabul etmek anlamına gelir.
            </p>
        </Section>

        <Section title="10. Uygulanacak Hukuk ve Yetki">
            <p>
                Bu Kullanım Koşulları Türk hukukuna tabidir. Bu koşullardan doğabilecek
                uyuşmazlıkların çözümünde İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.
            </p>
        </Section>

        <div className="mt-10 pt-6 border-t font-mono text-[11px] space-y-1"
             style={{ borderColor: BORDER, color: 'var(--color-text-muted)' }}>
            <p>Sürüm: <strong>v1.0</strong> · Yürürlük: 21 Mayıs 2026</p>
            <p>Onay takip sistemi: <code className="text-[10px] px-1" style={{ background: 'rgba(16,185,129,0.08)', color: BRAND }}>users.terms_version</code> · <code className="text-[10px] px-1" style={{ background: 'rgba(16,185,129,0.08)', color: BRAND }}>users.terms_accepted_at</code></p>
        </div>
    </>
);

export default function Legal() {
    const [params, setParams] = useSearchParams();
    const tab = params.get('doc') === 'terms' ? 'terms' : 'privacy';

    useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [tab]);

    return (
        <div className="max-w-3xl mx-auto px-4 pb-20">

            {/* Başlık */}
            <div className="mb-8">
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND }}>
                    // HUKUKI_BELGELER
                </p>
                <h1 className="font-manrope font-extrabold text-3xl tracking-tight"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {tab === 'privacy' ? 'Gizlilik Politikası' : 'Kullanım Koşulları'}
                </h1>
                <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Sürüm v1.0 · 21 Mayıs 2026
                </p>
            </div>

            {/* Tab seçici */}
            <div className="flex gap-2 mb-8 border-b" style={{ borderColor: BORDER }}>
                {[
                    { key: 'privacy', icon: Shield,   label: 'Gizlilik Politikası' },
                    { key: 'terms',   icon: FileText,  label: 'Kullanım Koşulları'  },
                ].map(({ key, icon: Icon, label }) => (
                    <button
                        key={key}
                        onClick={() => setParams({ doc: key })}
                        aria-label={label}
                        className="flex items-center gap-1.5 font-mono text-xs font-bold px-4 py-2.5 transition-colors"
                        style={{
                            color:       tab === key ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                            borderBottom: tab === key ? `2px solid var(--color-brand-primary)` : '2px solid transparent',
                            marginBottom: -1,
                        }}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* İçerik */}
            <div className="animate-fade-up">
                {tab === 'privacy' ? PRIVACY : TERMS}
            </div>

            {/* Geri */}
            <div className="mt-10">
                <Link to="/" className="font-mono text-xs transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-text-muted)' }}>
                    ← Ana Sayfaya Dön
                </Link>
            </div>
        </div>
    );
}
