import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axios';

const MOCK_HEADLINES = [
    { id: 1, title: 'Merkez Bankası faiz kararını açıkladı',              source_domain: 'Reuters'       },
    { id: 2, title: 'Deprem bölgesinde son durum: Kurtarma çalışmaları',  source_domain: 'AA'            },
    { id: 3, title: 'Teknoloji devinden yapay zeka yatırımı açıklaması',  source_domain: 'Bloomberg'     },
    { id: 4, title: 'Meclis yeni düzenlemeyi görüşmeye başladı',          source_domain: 'TRT Haber'     },
    { id: 5, title: 'Sağlık Bakanlığı aşı takviminde güncelleme yaptı',  source_domain: 'Sağlık Bak.'   },
    { id: 6, title: 'Döviz kurlarında son gelişmeler',                    source_domain: 'Bloomberg HT'  },
    { id: 7, title: 'İklim zirvesinde kritik karar alındı',               source_domain: 'BBC Türkçe'    },
    { id: 8, title: 'Borsa İstanbul günü yükselişle kapattı',             source_domain: 'BIST'          },
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
                background: 'var(--color-ticker-bg)',
                borderTop:  '1px solid var(--color-ticker-border)',
            }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* ▶ HABER AKIŞI badge */}
            <div
                className="shrink-0 h-full flex items-center px-4 z-10"
                style={{
                    background:  'var(--color-ticker-badge-bg)',
                    borderRight: '1px solid var(--color-ticker-border)',
                }}
            >
                <span className="font-mono font-bold text-[10px] uppercase tracking-widest whitespace-nowrap"
                      style={{ color: 'var(--color-ticker-badge-fg)' }}>
                    ▶ HABER AKIŞI
                </span>
            </div>

            {/* Sağ kenar solma */}
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
                 style={{ background: 'linear-gradient(to left, var(--color-ticker-bg), transparent)' }} />

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
                            <span className="font-mono text-[10px] font-bold tracking-wide"
                                  style={{ color: 'var(--color-ticker-source)' }}>
                                [{item.source_domain || item.source_name}]
                            </span>
                        )}
                        {item.source_url ? (
                            <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-[12px] transition-colors hover:underline"
                                style={{ color: 'var(--color-ticker-title)' }}
                            >
                                {item.title}
                            </a>
                        ) : (
                            <span className="font-medium text-[12px]"
                                  style={{ color: 'var(--color-ticker-title)' }}>
                                {item.title}
                            </span>
                        )}
                        <span className="mx-2 text-[9px]"
                              style={{ color: 'var(--color-ticker-divider)' }}>◆</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default NewsTicker;
