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
            .then(res => {
                const data = res.data?.filter(h => !!h.title);
                if (data?.length > 0) setItems(data);
            })
            .catch(() => {});
    }, []);

    const doubled = [...items, ...items];

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 h-10 flex items-center overflow-hidden"
            style={{
                background: '#0c1518',
                borderTop:  '1px solid rgba(65,73,77,0.5)',
                boxShadow:  '0 -4px 20px rgba(0,0,0,0.4)',
            }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* HABER AKIŞI badge */}
            <div
                className="shrink-0 h-full flex items-center px-4 z-10"
                style={{
                    background:   '#3fff8b',
                    borderRight:  '1px solid rgba(65,73,77,0.6)',
                }}
            >
                <span className="font-mono font-bold text-[9px] uppercase tracking-widest text-black whitespace-nowrap">
                    ▶ HABER AKIŞI
                </span>
            </div>

            {/* Sağ kenar solma */}
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
                 style={{ background: 'linear-gradient(to left, #0c1518, transparent)' }} />

            {/* Ticker */}
            <div
                className="flex whitespace-nowrap animate-ticker"
                style={{
                    animationDuration:  `${items.length * 6}s`,
                    animationPlayState: paused ? 'paused' : 'running',
                    marginLeft:         '1rem',
                }}
            >
                {doubled.map((item, idx) => (
                    <span key={`${item.id}-${idx}`} className="flex items-center gap-2 px-5">
                        {(item.source_domain || item.source_name) && (
                            <span className="font-mono text-[9px] font-bold tracking-wide"
                                  style={{ color: 'rgba(63,255,139,0.65)' }}>
                                [{item.source_domain || item.source_name}]
                            </span>
                        )}
                        {item.source_url ? (
                            <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-inter font-medium text-[11px] transition-colors"
                                style={{ color: 'rgba(240,248,252,0.80)' }}
                                onMouseEnter={e => (e.target.style.color = '#3fff8b')}
                                onMouseLeave={e => (e.target.style.color = 'rgba(240,248,252,0.80)')}
                            >
                                {item.title}
                            </a>
                        ) : (
                            <span className="font-inter font-medium text-[11px]"
                                  style={{ color: 'rgba(240,248,252,0.80)' }}>
                                {item.title}
                            </span>
                        )}
                        <span className="mx-2 text-[8px]" style={{ color: 'rgba(63,255,139,0.35)' }}>◆</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default NewsTicker;
