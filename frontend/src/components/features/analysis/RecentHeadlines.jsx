import React from 'react';

/*
  Mock veriler: isAuthentic → analiz sonuçlarındaki authentic teması (yeşil)
                isAuthentic === false → fake teması (turuncu)
  Renkler AnalysisResultCard ile birebir uyumlu.
*/
const headlines = [
    {
        text: "İzmir'de korkutan sarsıntı: 4.8 büyüklüğündeki deprem çevre illerden de hissedildi",
        isAuthentic: true,
    },
    {
        text: "Küresel piyasalarda teknoloji hisselerindeki düşüş yatırımcıyı tedirgin etti",
        isAuthentic: false,
    },
    {
        text: "Balıkesirde sürücüsünün kontrolünden çıkan otomobil şarampole devrildi. 1 kişi öldü, 6 yaralandı",
        isAuthentic: true,
    },
    {
        text: "Yeni yapay zeka regülasyonları teknoloji devlerini zorlayabilir",
        isAuthentic: false,
    },
];

const RecentHeadlines = () => {
    return (
        /*
          sticky top-32: sayfada yukarı scroll anchor kalmış, bu div sayfayla birlikte
          yüklenir ama konumlanmaz — parent'ta overflow:hidden yoksa sticky çalışır.
          Home.jsx'te items-start kullanıldığı için sticky col doğru çalışıyor.
        */
        <div className="
            animate-fade-left
            bg-base dark:bg-surface
            rounded-2xl flex flex-col overflow-hidden
            border border-[#5a6058] dark:border-[#303036]
            shadow-sm border-2
        ">
            {/* Başlık */}
            <div className="p-4 border-b border-[#5a6058] dark:border-[#303036]">
                <h3 className="text-lg font-outfit font-bold text-center text-tx-primary dark:text-[#f0f0f2] tracking-tight">
                    Son Başlıklar
                </h3>
            </div>

            {/* Liste */}
            <div className="p-3 space-y-2.5 custom-scrollbar">
                {headlines.map((item, idx) => {
                    const authentic = item.isAuthentic;
                    return (
                        <div
                            key={idx}
                            style={{ animationDelay: `${idx * 90}ms` }}
                            className={`
                                animate-fade-up
                                p-3.5 rounded-xl text-sm cursor-pointer
                                border-l-4 transition-all duration-300
                                hover:-translate-y-0.5 hover:shadow-md
                                ${authentic
                                    /* Authentic — light: yeşil tonu, dark: AnalysisResultCard authentic dark bg */
                                    ? 'bg-[#dce4d5] dark:bg-[#141a14] border-l-[#5a6058] dark:border-l-[#34d399]'
                                    /* Fake — light: turuncu tonu, dark: AnalysisResultCard fake dark bg */
                                    : 'bg-[#e9ddd0] dark:bg-[#1a1210] border-l-[#bc6c25] dark:border-l-[#f97316]'
                                }
                            `}
                        >
                            {/* Etiket */}
                            <span className={`
                                inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest
                                mb-1.5 px-2 py-0.5 rounded-full
                                ${authentic
                                    ? 'bg-[#5a6058]/15 text-[#5a6058] dark:bg-[#34d399]/15 dark:text-[#6ee7b7]'
                                    : 'bg-[#bc6c25]/15 text-[#bc6c25] dark:bg-[#f97316]/15 dark:text-[#fb923c]'
                                }
                            `}>
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse-soft ${authentic ? 'bg-current' : 'bg-current'}`} />
                                {authentic ? 'Doğrulandı' : 'Yanıltıcı'}
                            </span>

                            <p className={`line-clamp-3 leading-relaxed font-medium ${authentic
                                ? 'text-[#363934] dark:text-[#c8c8d0]'
                                : 'text-[#3a2a1a] dark:text-[#c8c8d0]'
                                }`}>
                                {item.text}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RecentHeadlines;
