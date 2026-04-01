import React, { useEffect, useState } from 'react';
import { Sun, Cloud, CloudSun, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Wind, MapPin } from 'lucide-react';
import WeatherService, { ISTANBUL } from '../../../services/weather.service';

function wmoIcon(code, cls = 'w-5 h-5') {
    if (code === 0)                               return <Sun             className={cls} />;
    if (code <= 2)                                return <CloudSun        className={cls} />;
    if (code === 3)                               return <Cloud           className={cls} />;
    if (code <= 48)                               return <Wind            className={cls} />;
    if (code <= 55)                               return <CloudDrizzle    className={cls} />;
    if (code <= 65 || (code >= 80 && code <= 82)) return <CloudRain       className={cls} />;
    if (code <= 86)                               return <CloudSnow       className={cls} />;
    return                                               <CloudLightning  className={cls} />;
}

function wmoLabel(code) {
    if (code === 0) return 'Açık';
    if (code <= 2)  return 'Az Bulutlu';
    if (code === 3) return 'Bulutlu';
    if (code <= 48) return 'Sisli';
    if (code <= 55) return 'Çisenti';
    if (code <= 65) return 'Yağmurlu';
    if (code <= 77) return 'Karlı';
    if (code <= 82) return 'Sağanak';
    if (code <= 86) return 'Kar Yağışı';
    return 'Fırtına';
}

const LiveDataCard = () => {
    const [weather, setWeather] = useState(null);
    const [city,    setCity]    = useState(ISTANBUL.city);

    useEffect(() => {
        const load = async () => {
            try {
                const loc = await WeatherService.getLocation();
                setCity(loc.city);
                const w = await WeatherService.getForecast(loc.lat, loc.lon);
                setWeather(w);
            } catch { /* sessiz */ }
        };
        load();
    }, []);

    return (
        <div
            className="rounded-2xl overflow-hidden relative animate-fade-right"
            style={{
                background:  'linear-gradient(135deg, rgba(20,80,55,0.95) 0%, rgba(10,50,38,0.98) 100%)',
                border:      '1px solid rgba(63,255,139,0.20)',
                boxShadow:   '0 8px 32px rgba(63,255,139,0.08), 0 2px 8px rgba(0,0,0,0.4)',
            }}
        >
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
                 style={{ background: 'rgba(63,255,139,0.12)', filter: 'blur(40px)' }} />

            {/* Şehir + saat */}
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-es-primary/80" />
                    <span className="text-sm font-manrope font-bold text-white/90">{city}</span>
                </div>
                <span className="text-[10px] text-white/40 font-mono">
                    {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* Sıcaklık + ikon */}
            {weather ? (
                <div className="px-5 pb-3 flex items-end justify-between">
                    <div>
                        <div className="text-6xl font-manrope font-black text-white leading-none">{weather.temp}°</div>
                        <div className="text-xs text-white/60 mt-1.5 flex items-center gap-2">
                            <span>{wmoLabel(weather.code)}</span>
                            <span className="opacity-40">·</span>
                            <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{weather.wind} km/h</span>
                        </div>
                    </div>
                    <div className="text-white/70 mb-1">{wmoIcon(weather.code, 'w-14 h-14 opacity-80')}</div>
                </div>
            ) : (
                <div className="px-5 pb-3 h-24 flex items-center">
                    <div className="h-12 w-28 rounded-xl bg-white/10 animate-pulse" />
                </div>
            )}

            {/* 7 günlük tahmin */}
            <div className="px-3 py-3 grid grid-cols-7 gap-0.5"
                 style={{ borderTop: '1px solid rgba(63,255,139,0.10)', background: 'rgba(0,0,0,0.15)' }}>
                {weather ? weather.daily.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 py-1">
                        <span className="text-[9px] font-bold text-white/50 uppercase tracking-wide">
                            {i === 0 ? 'Bug.' : d.day}
                        </span>
                        <div className="text-white/70">{wmoIcon(d.code, 'w-4 h-4')}</div>
                        <span className="text-[10px] font-bold text-white/90">{d.max}°</span>
                        <span className="text-[9px] text-white/35">{d.min}°</span>
                    </div>
                )) : Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 py-1">
                        <div className="h-2 w-4 rounded bg-white/10 animate-pulse" />
                        <div className="h-4 w-4 rounded bg-white/10 animate-pulse" />
                        <div className="h-2 w-5 rounded bg-white/10 animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveDataCard;
