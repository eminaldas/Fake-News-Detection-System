import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, FileText, ChevronRight } from 'lucide-react';

const BRAND  = 'var(--color-brand-primary)';
const BORDER = 'var(--color-terminal-border-raw)';

function Section({ title, children }) {
    return (
        <div className="mb-6">
            <h3 className="font-manrope font-bold text-sm mb-2"
                style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
            <div className="font-mono text-xs leading-relaxed space-y-1.5"
                 style={{ color: 'var(--color-text-secondary)' }}>
                {children}
            </div>
        </div>
    );
}

function Bullet({ children }) {
    return (
        <div className="flex items-start gap-2">
            <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" style={{ color: BRAND }} />
            <span>{children}</span>
        </div>
    );
}

const PRIVACY_CONTENT = (
    <>
        <Section title="1. Veri Sorumlusu">
            <p>Ne Haber platformu KVKK ve GDPR kapsamında veri sorumlusudur.</p>
        </Section>
        <Section title="2. Toplanan Veriler">
            <Bullet>Hesap: e-posta, kullanıcı adı, şifrelenmiş parola</Bullet>
            <Bullet>Google OAuth: profil resmi URL'si ve Google hesap kimliği (token saklanmaz)</Bullet>
            <Bullet>Analiz: gönderdiğiniz haber metinleri ve AI analiz sonuçları</Bullet>
            <Bullet>Log: IP adresi, oturum süresi, platform etkileşimleri</Bullet>
        </Section>
        <Section title="3. İşlenme Amaçları">
            <Bullet>Hizmetin sağlanması ve sürdürülmesi (KVKK m.5/2-c)</Bullet>
            <Bullet>BERT modeli geliştirme — yalnızca anonimleştirilmiş verilerle (açık rıza)</Bullet>
            <Bullet>Sistem güvenliği ve kötüye kullanımın önlenmesi</Bullet>
        </Section>
        <Section title="4. Google OAuth">
            <p>Google ile giriş yapıldığında Google; ad, e-posta ve profil resmi bilgilerini paylaşır.
            Verileriniz üçüncü taraf reklamcılara satılmaz.</p>
        </Section>
        <Section title="5. Çerezler">
            <Bullet>Zorunlu: JWT oturum token'ı</Bullet>
            <Bullet>Tercih: tema/arayüz tercihleri (localStorage)</Bullet>
            <p className="mt-1">Analitik veya reklam çerezi kullanılmamaktadır.</p>
        </Section>
        <Section title="6. Haklarınız (KVKK m.11 / GDPR m.15-22)">
            <Bullet>Verilerinize erişim, düzeltme ve silme hakkı</Bullet>
            <Bullet>Hesabı Profil → Ayarlar → Hesabımı Sil ile kalıcı silebilirsiniz</Bullet>
            <Bullet>Model geliştirme için veri kullanımına itiraz edebilirsiniz</Bullet>
        </Section>
        <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Sürüm: v1.0 · Yürürlük: 21 Mayıs 2026
        </p>
    </>
);

const TERMS_CONTENT = (
    <>
        <Section title="1. Kabulü">
            <p>Platforma kayıt olarak bu koşulları kabul etmiş sayılırsınız.</p>
        </Section>
        <Section title="2. Hizmet Tanımı">
            <p>Ne Haber; BERT tabanlı YZ modeli ile haber metinlerinin güvenilirliğini değerlendiren
            bir platformdur. Sonuçlar <strong style={{ color: 'var(--color-text-primary)' }}>yalnızca bilgilendirme amaçlıdır</strong>;
            kesin gazetecilik kararı olarak kullanılamaz.</p>
        </Section>
        <Section title="3. Kullanıcı Yükümlülükleri">
            <Bullet>Gerçek bilgilerle kayıt olmak</Bullet>
            <Bullet>Hesap güvenliğini sağlamak</Bullet>
            <Bullet>Platformu yalnızca yasal amaçlarla kullanmak</Bullet>
        </Section>
        <Section title="4. Yasak Kullanımlar">
            <Bullet>Bot/scraper ile sistematik veri toplama</Bullet>
            <Bullet>Modeli yanıltmaya yönelik girişimler</Bullet>
            <Bullet>Sahte kimlikle kayıt, zararlı içerik paylaşımı</Bullet>
            <Bullet>Altyapıya saldırı (DDoS, SQL enjeksiyonu vb.)</Bullet>
        </Section>
        <Section title="5. Sorumluluk Sınırlaması">
            <p>Platform, analiz sonuçlarının kesin doğruluğunu garanti etmez. YZ değerlendirmeleri
            hata içerebilir; bu sonuçlara dayalı kararların sorumluluğu kullanıcıya aittir.</p>
        </Section>
        <Section title="6. Uygulanacak Hukuk">
            <p>Türk hukuku geçerlidir. Uyuşmazlıklar İstanbul Mahkemelerinde çözümlenir.</p>
        </Section>
        <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Sürüm: v1.0 · Yürürlük: 21 Mayıs 2026
        </p>
    </>
);

export default function LegalModal({ onAccept, onClose, initialTab = 'privacy' }) {
    const [tab, setTab] = useState(initialTab);
    const scrollRef     = useRef(null);
    const modalRef      = useRef(null);

    useEffect(() => {
        const prev = document.activeElement;
        modalRef.current?.focus();
        return () => prev?.focus();
    }, []);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [tab]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Gizlilik Politikası ve Kullanım Koşulları"
            onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div
                ref={modalRef}
                tabIndex={-1}
                className="w-full max-w-xl flex flex-col outline-none animate-fade-up"
                style={{
                    background: 'var(--color-terminal-surface)',
                    border: `1px solid ${BORDER}`,
                    borderTop: `3px solid ${BRAND}`,
                    maxHeight: '90vh',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                }}
            >
                {/* Başlık */}
                <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
                     style={{ borderColor: BORDER }}>
                    <p className="font-mono text-[10px] uppercase tracking-widest font-bold"
                       style={{ color: BRAND }}>// HUKUKI_BELGELER</p>
                    <button
                        onClick={onClose}
                        aria-label="Kapat"
                        className="p-1 transition-opacity hover:opacity-60"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b shrink-0" style={{ borderColor: BORDER }}>
                    {[
                        { key: 'privacy', icon: Shield,   label: 'Gizlilik Politikası' },
                        { key: 'terms',   icon: FileText,  label: 'Kullanım Koşulları'  },
                    ].map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            aria-selected={tab === key}
                            role="tab"
                            className="flex items-center gap-1.5 font-mono text-xs font-bold px-5 py-3 transition-colors"
                            style={{
                                color: tab === key ? BRAND : 'var(--color-text-muted)',
                                borderBottom: tab === key ? `2px solid ${BRAND}` : '2px solid transparent',
                                marginBottom: -1,
                            }}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Scroll alanı */}
                <div ref={scrollRef} className="overflow-y-auto px-5 py-4 flex-1"
                     style={{ minHeight: 0 }}>
                    {tab === 'privacy' ? PRIVACY_CONTENT : TERMS_CONTENT}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t shrink-0 flex flex-col sm:flex-row gap-3"
                     style={{ borderColor: BORDER }}>
                    <p className="font-mono text-[10px] flex-1"
                       style={{ color: 'var(--color-text-muted)' }}>
                        Her iki belgeyi de okuduğunuzu ve kabul ettiğinizi onaylıyorsunuz.
                    </p>
                    <button
                        onClick={() => {
                            localStorage.setItem('terms_v1_accepted', 'true');
                            onAccept?.();
                        }}
                        className="shrink-0 font-mono text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all hover:brightness-110 active:scale-[0.98]"
                        style={{
                            background: BRAND,
                            color: '#070f12',
                            boxShadow: '0 4px 16px rgba(16,185,129,0.30)',
                        }}
                    >
                        Okudum, Kabul Ediyorum
                    </button>
                </div>
            </div>
        </div>
    );
}
