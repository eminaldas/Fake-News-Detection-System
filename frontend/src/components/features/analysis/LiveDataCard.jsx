import React, { useEffect, useState } from 'react';
import { Sun, Cloud, CloudSun, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Wind, MapPin } from 'lucide-react';
import WeatherService, { ISTANBUL } from '../../../services/weather.service';

/* ── Hava durumu koduna göre renk teması ───────────────────────── */
function wmoTheme(code) {
    if (code === 0)                               return { accent: '#FBBF24', glow: 'rgba(251,191,36,0.18)',  border: 'rgba(251,191,36,0.22)' }; // Açık → sarı
    if (code <= 2)                                return { accent: '#FCD34D', glow: 'rgba(252,211,77,0.14)',  border: 'rgba(252,211,77,0.20)' }; // Az bulutlu → soluk sarı
    if (code === 3)                               return { accent: '#CBD5E1', glow: 'rgba(203,213,225,0.10)', border: 'rgba(203,213,225,0.18)' }; // Bulutlu → gri
    if (code <= 48)                               return { accent: '#94A3B8', glow: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.18)' }; // Sisli → gri/beyaz
    if (code <= 55)                               return { accent: '#7DD3FC', glow: 'rgba(125,211,252,0.12)', border: 'rgba(125,211,252,0.20)' }; // Çisenti → açık mavi
    if (code <= 65 || (code >= 80 && code <= 82)) return { accent: '#60A5FA', glow: 'rgba(96,165,250,0.14)',  border: 'rgba(96,165,250,0.22)' }; // Yağmurlu → mavi
    if (code <= 77 || (code >= 85 && code <= 86)) return { accent: '#BAE6FD', glow: 'rgba(186,230,253,0.12)', border: 'rgba(186,230,253,0.20)' }; // Karlı → buz mavisi
    return                                               { accent: '#A78BFA', glow: 'rgba(167,139,250,0.14)', border: 'rgba(167,139,250,0.22)' }; // Fırtına → mor
}

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

    const theme = weather ? wmoTheme(weather.code) : wmoTheme(0);

    return (
        <div
            className="glass rounded-2xl overflow-hidden relative"
            style={{
                borderColor:  theme.border,
                transition:   'border-color 0.6s ease',
            }}
        >
            {/* Şehir + saat */}
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" style={{ color: theme.accent, opacity: 0.8 }} />
                    <span className="text-sm font-manrope font-bold text-tx-primary">{city}</span>
                </div>
                <span className="text-[10px] text-muted font-mono">
                    {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* Sıcaklık + ikon */}
            {weather ? (
                <div className="px-5 pb-3 flex items-end justify-between">
                    <div>
                        <div className="text-6xl font-manrope font-black leading-none"
                             style={{ color: theme.accent }}>
                            {weather.temp}°
                        </div>
                        <div className="text-xs text-tx-secondary mt-1.5 flex items-center gap-2">
                            <span style={{ color: theme.accent, opacity: 0.9 }}>{wmoLabel(weather.code)}</span>
                            <span className="text-muted">·</span>
                            <span className="flex items-center gap-1 text-muted">
                                <Wind className="w-3 h-3" />{weather.wind} km/h
                            </span>
                        </div>
                    </div>
                    <div className="mb-1" style={{ color: theme.accent, opacity: 0.75 }}>
                        {wmoIcon(weather.code, 'w-14 h-14')}
                    </div>
                </div>
            ) : (
                <div className="px-5 pb-3 h-24 flex items-center">
                    <div className="h-12 w-28 rounded-xl bg-surface-solid animate-pulse" />
                </div>
            )}

            {/* 7 günlük tahmin */}
            <div className="px-3 py-3 grid grid-cols-7 gap-0.5"
                 style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-surface-solid)' }}>
                {weather ? weather.daily.map((d, i) => {
                    const dt = wmoTheme(d.code);
                    return (
                        <div key={i} className="flex flex-col items-center gap-1 py-1">
                            <span className="text-[9px] font-bold text-muted uppercase tracking-wide">
                                {i === 0 ? 'Bug.' : d.day}
                            </span>
                            <div style={{ color: dt.accent, opacity: 0.8 }}>
                                {wmoIcon(d.code, 'w-4 h-4')}
                            </div>
                            <span className="text-[10px] font-bold text-tx-primary">{d.max}°</span>
                            <span className="text-[9px] text-muted">{d.min}°</span>
                        </div>
                    );
                }) : Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 py-1">
                        <div className="h-2 w-4 rounded bg-surface-solid animate-pulse" />
                        <div className="h-4 w-4 rounded bg-surface-solid animate-pulse" />
                        <div className="h-2 w-5 rounded bg-surface-solid animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveDataCard;
