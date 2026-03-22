import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';

const NotFound = () => {
    return (
        <div className="w-full min-h-[75vh] flex flex-col items-center justify-center px-6 animate-fade-up">

            <div className="relative flex flex-col items-center gap-8 max-w-lg w-full text-center">

                {/* Glow backdrop — light modda kırmızı/turuncu ton, dark modda daha yoğun */}
                <div className="absolute -inset-12 rounded-3xl pointer-events-none
                                opacity-30 dark:opacity-100
                                bg-gradient-to-r from-es-error/15 via-es-error/8 to-es-error/15
                                blur-3xl" />

                {/* Büyük 404 + ikon */}
                <div className="relative flex items-center gap-4">
                    <h1 className="text-[9rem] md:text-[12rem] font-manrope font-extrabold tracking-tighter leading-none
                                   text-tx-primary select-none">
                        404
                    </h1>
                    <SearchX className="w-14 h-14 md:w-20 md:h-20 text-tx-secondary dark:text-es-error/70 shrink-0 mb-4 md:mb-6"
                             strokeWidth={1.5} />
                </div>

                {/* Başlık + açıklama */}
                <div className="flex flex-col gap-3 -mt-4">
                    <h2 className="text-2xl md:text-3xl font-manrope font-extrabold tracking-tighter text-tx-primary leading-tight">
                        Aradığınız Hakikat{' '}
                        <span className="italic text-es-error dark:text-es-primary">Burada Değil</span>
                    </h2>
                    <p className="text-base text-tx-secondary leading-relaxed font-inter">
                        Algoritmalarımız bu rotada herhangi bir doğrulanmış veri bulamadı.
                        Link bozulmuş veya kaynak silinmiş olabilir.
                    </p>
                </div>

                {/* Geri dön */}
                <Link
                    to="/"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm
                               bg-tx-primary dark:bg-surface-solid
                               hover:bg-brand-dark dark:hover:bg-neutral-border
                               text-white dark:text-tx-primary
                               border border-brutal-border dark:border-surface-solid
                               transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Ana Sayfaya Dön
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
