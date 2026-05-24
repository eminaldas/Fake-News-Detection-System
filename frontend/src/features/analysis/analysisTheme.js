import { ShieldCheck, ShieldX, Shield } from 'lucide-react';
import { DISPLAY_THRESHOLD } from './signalConfig';

export const RING_CIRC = 264;

const SIGNAL_WEIGHT_ORDER = [
    'clickbait_score', 'exclamation_ratio', 'uppercase_ratio',
    'hedge_ratio', 'question_density', 'avg_word_length', 'number_density',
];

export function getTheme(isAuthentic, isFake, isIddia) {
    if (isAuthentic) return {
        hex:       '#3fff8b',
        lightHex:  '#2d7549',
        Icon:      ShieldCheck,
        label:     'ANALİZ TAMAMLANDI',
        mainTitle: 'Güvenilir İçerik Tespit Edildi',
        glowRgb:   '63,255,139',
        lightRgb:  '45,117,73',
        statusCls: 'text-green-700 dark:text-es-primary',
        bgCls:     'dark:bg-es-primary bg-green-600',
        onBgCls:   'text-white dark:text-[#004820]',
        borderVar: '#3fff8b',
    };
    if (isFake) return {
        hex:       '#ff7351',
        lightHex:  '#dc2626',
        Icon:      ShieldX,
        label:     'RİSK TESPİT EDİLDİ',
        mainTitle: 'Yüksek Yanıltma Riski Mevcut',
        glowRgb:   '255,115,81',
        lightRgb:  '220,38,38',
        statusCls: 'text-red-600 dark:text-es-error',
        bgCls:     'dark:bg-es-error bg-red-600',
        onBgCls:   'text-white dark:text-[#450900]',
        borderVar: '#ff7351',
    };
    if (isIddia) return {
        hex:       '#f59e0b',
        lightHex:  '#d97706',
        Icon:      Shield,
        label:     'İDDİA TESPİT EDİLDİ',
        mainTitle: 'İddia / Doğrulanamadı',
        glowRgb:   '245,158,11',
        lightRgb:  '217,119,6',
        statusCls: 'text-amber-600 dark:text-amber-500',
        bgCls:     'dark:bg-amber-500 bg-amber-600',
        onBgCls:   'text-white dark:text-[#451a03]',
        borderVar: '#f59e0b',
    };
    return {
        hex:       '#71717a',
        lightHex:  '#52525b',
        Icon:      Shield,
        label:     'ANALİZ SONUCU',
        mainTitle: 'Sonuç Belirsiz',
        glowRgb:   '113,113,122',
        lightRgb:  '82,82,91',
        statusCls: 'text-zinc-600 dark:text-muted',
        bgCls:     'bg-neutral-fill',
        onBgCls:   'text-white',
        borderVar: '#71717a',
    };
}

export function buildExplanation(signals) {
    if (!signals) return null;
    const triggered = SIGNAL_WEIGHT_ORDER.filter(k => (signals[k] || 0) > DISPLAY_THRESHOLD);
    const tw    = signals.triggered_words || {};
    const parts = [];

    if (triggered.includes('clickbait_score')) {
        const words = tw.clickbait?.slice(0, 3) || [];
        parts.push(words.length > 0
            ? `'${words.join("', '")}' gibi clickbait ifadeler içeriyor`
            : 'clickbait dil yapısı içeriyor');
    }
    if (triggered.includes('exclamation_ratio')) parts.push('yüksek ünlem oranı');
    if (triggered.includes('uppercase_ratio'))   parts.push('anormal büyük harf kullanımı');
    if (triggered.includes('hedge_ratio')) {
        const words = tw.hedge?.slice(0, 2) || [];
        parts.push(words.length > 0
            ? `'${words.join("', '")}' gibi belirsiz kaynak ifadeleri`
            : 'belirsiz kaynak dili');
    }
    if (triggered.includes('question_density')) parts.push('yüksek soru yoğunluğu');
    if (triggered.includes('avg_word_length') && (signals.avg_word_length || 0) < 5.5)
        parts.push('kısa kelime ağırlıklı sensasyonel dil');
    if (triggered.includes('number_density')) parts.push('yoğun sayısal veri kullanımı');

    if (parts.length === 0) {
        if ((signals.source_score || 0) > DISPLAY_THRESHOLD) {
            const srcWords = tw.source?.slice(0, 2) || [];
            return srcWords.length > 0
                ? `Güvenilir kaynak referansı tespit edildi: '${srcWords.join("', '")}'.`
                : 'Güvenilir kaynak referansı tespit edildi.';
        }
        return 'Belirgin bir manipülasyon sinyali tespit edilmedi.';
    }
    let sentence = `Bu metin ${parts.join(', ')} içeriyor.`;
    if ((signals.source_score || 0) > DISPLAY_THRESHOLD) {
        const srcWords = tw.source?.slice(0, 2) || [];
        sentence += srcWords.length > 0
            ? ` Ancak '${srcWords.join("', '")}' gibi kaynak referansları da mevcut.`
            : ' Ancak güvenilir kaynak referansları da mevcut.';
    }
    return sentence;
}
