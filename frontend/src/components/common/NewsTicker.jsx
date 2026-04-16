import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axios';

const MOCK_HEADLINES = [
    { id: 1, title: 'Merkez Bankası faiz kararını açıkladı', source_domain: 'Reuters' },
    { id: 2, title: 'Deprem bölgesinde son durum: Kurtarma çalışmaları sürüyor', source_domain: 'AA' },
    { id: 3, title: 'Teknoloji devinden yapay zeka yatırımı açıklaması', source_domain: 'Bloomberg' },
    { id: 4, title: 'Meclis yeni düzenlemeyi görüşmeye başladı', source_domain: 'TRT Haber' },
    { id: 5, title: 'Sağlık Bakanlığı aşı takviminde güncelleme yaptı', source_domain: 'Sağlık Bakanlığı' },
    { id: 6, title: 'Döviz kurlarında son gelişmeler', source_domain: 'Bloomberg HT' },
    { id: 7, title: 'İklim zirvesinde kritik karar alındı', source_domain: 'BBC Türkçe' },
    { id: 8, title: 'Borsa İstanbul günü yükselişle kapattı', source_domain: 'Borsa İstanbul' },
];

const NewsTicker = () => {
    const [items,  setItems]  = useState(MOCK_HEADLINES);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        axiosInstance
            .get('/articles/trending')
            .then((res) => {
                const data = res.data?.filter((h) => !!h.title);
                if (data?.length > 0) setItems(data);
            })
            .catch(() => {});
    }, []);

    const doubled = [...items, ...items];

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 h-10 flex items-center overflow-hidden"
            style={{
                background:   'var(--color-ticker-bg)',
                borderTop:    '1px solid rgba(46,204,113,0.15)',
                boxShadow:    '0 -4px 16px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Kenar solma efektleri */}
            <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
                 style={{ background: 'linear-gradient(to right, var(--color-ticker-bg), transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
                 style={{ background: 'linear-gradient(to left, var(--color-ticker-bg), transparent)' }} />

            {/* Bant içeriği */}
            <div
                className="flex whitespace-nowrap animate-ticker"
                style={{
                    animationDuration: `${items.length * 6}s`,
                    animationPlayState: paused ? 'paused' : 'running',
                }}
            >
                {doubled.map((item, idx) => (
                    <span key={`${item.id}-${idx}`} className="flex items-center gap-2 px-6">
                        {(item.source_domain || item.source_name) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
                                {item.source_domain || item.source_name}
                            </span>
                        )}
                        {item.source_url ? (
                            <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-manrope font-bold text-[11px] hover:underline"
                                style={{ color: 'rgba(255,255,255,0.9)' }}
                            >
                                {item.title}
                            </a>
                        ) : (
                            <span className="font-manrope font-bold text-[11px]"
                                  style={{ color: 'rgba(255,255,255,0.9)' }}>
                                {item.title}
                            </span>
                        )}
                        <span className="opacity-30 mx-3" style={{ color: '#ffffff' }}>◆</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default NewsTicker;
