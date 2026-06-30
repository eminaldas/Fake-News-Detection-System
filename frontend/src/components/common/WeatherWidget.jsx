import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle,
    CloudLightning, Wind, ChevronDown,
} from 'lucide-react';

const CITIES = [
    { id: 'ankara',   name: 'Ankara',   lat: 39.9334, lon: 32.8597 },
    { id: 'izmir',    name: 'İzmir',    lat: 38.4189, lon: 27.1287 },
    { id: 'antalya',  name: 'Antalya',  lat: 36.8969, lon: 30.7133 },
    { id: 'bursa',    name: 'Bursa',    lat: 40.1885, lon: 29.0610 },
    { id: 'trabzon',  name: 'Trabzon',  lat: 41.0015, lon: 39.7178 },
    { id: 'konya',    name: 'Konya',    lat: 37.8714, lon: 32.4846 },
];

function wmoIcon(code) {
    if (code === 0)  return Sun;
    if (code <= 3)   return Cloud;
    if (code <= 48)  return Wind;
    if (code <= 55)  return CloudDrizzle;
    if (code <= 65)  return CloudRain;
    if (code <= 75)  return CloudSnow;
    if (code <= 82)  return CloudRain;
    if (code <= 86)  return CloudSnow;
    return CloudLightning;
}

function wmoLabel(code) {
    if (code === 0)  return 'Açık';
    if (code <= 3)   return 'Parçalı bulutlu';
    if (code <= 48)  return 'Sisli';
    if (code <= 55)  return 'Çisenti';
    if (code <= 65)  return 'Yağmurlu';
    if (code <= 75)  return 'Karlı';
    if (code <= 82)  return 'Sağanaklı';
    if (code <= 86)  return 'Kar sağanağı';
    return 'Fırtınalı';
}

function WxIcon({ code, className, style }) {
    return React.createElement(wmoIcon(code), { className, style });
}

// Hava durumu kutusu sabit yeşil — çentik rengiyle aynı. Havaya göre yalnızca ikon değişir.
const WX_GREEN = '#47b172';

async function fetchWeather(lat, lon) {
    const res  = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/weather?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    return { temp: data.temp, code: data.code, city: data.city };
}

function CityRow({ city, weather, loading }) {
    return (
        <div className="flex items-center justify-between px-3.5 py-2 border-t"
             style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
            <span className="font-mono text-[11px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                {city.name}
            </span>
            {weather ? (
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                        {wmoLabel(weather.code)}
                    </span>
                    <div className="flex items-center gap-1">
                        <WxIcon code={weather.code} className="w-3 h-3" style={{ color: 'var(--color-text-secondary)' }} />
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {weather.temp}°
                        </span>
                    </div>
                </div>
            ) : loading ? (
                <div className="flex items-center gap-2">
                    <span className="h-[9px] w-[44px] bg-brutal-border/20 animate-pulse" />
                    <span className="h-[9px] w-[24px] bg-brutal-border/30 animate-pulse" />
                </div>
            ) : (
                <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>—</span>
            )}
        </div>
    );
}

const WeatherWidget = () => {
    const [primary,  setPrimary]  = useState(() => {
        try { const c = localStorage.getItem('weather_primary'); return c ? JSON.parse(c) : null; } catch { return null; }
    });
    const [, setLoaded] = useState(false);
    const [open,          setOpen]          = useState(false);
    const [cityData,      setCityData]      = useState({});      // id → { temp, code }
    const [fetched,       setFetched]       = useState(false);
    const [citiesLoading, setCitiesLoading] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const load = async (lat, lon, fallbackCity = 'İstanbul') => {
            try {
                const w = await fetchWeather(lat, lon);
                const next = { ...w, city: w.city || fallbackCity, lat, lon };
                setPrimary(next);
                setLoaded(true);
                try { localStorage.setItem('weather_primary', JSON.stringify(next)); } catch { /* ignore */ }
            } catch {
                setLoaded(true);
            }
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => load(pos.coords.latitude, pos.coords.longitude),
                () => load(41.0082, 28.9784, 'İstanbul'),
                { timeout: 5000 }
            );
        } else {
            load(41.0082, 28.9784, 'İstanbul');
        }
    }, []);

    const loadCities = useCallback(async () => {
        if (fetched) return;
        setFetched(true);
        setCitiesLoading(true);
        const results = await Promise.allSettled(
            CITIES.map(c => fetchWeather(c.lat, c.lon).then(w => ({ id: c.id, ...w })))
        );
        const map = {};
        results.forEach(r => {
            if (r.status === 'fulfilled') map[r.value.id] = { temp: r.value.temp, code: r.value.code };
        });
        setCityData(map);
        setCitiesLoading(false);
    }, [fetched]);

    const toggleOpen = () => {
        if (!open) loadCities();
        setOpen(v => !v);
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    if (!primary) {
        return (
            <div className="hidden md:flex shrink-0 items-center gap-2 h-full px-3.5"
                 style={{ background: WX_GREEN }}>
                <span className="w-4 h-4 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.35)' }} />
                <span className="w-12 h-2.5 animate-pulse" style={{ background: 'rgba(255,255,255,0.35)' }} />
                <span className="w-7 h-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.45)' }} />
            </div>
        );
    }

    return (
        <div ref={ref} className="relative hidden md:flex shrink-0">
            {/* Trigger — sabit yeşil kutu, beyaz yazı, çentiksiz */}
            <button
                onClick={toggleOpen}
                className="relative select-none whitespace-nowrap transition-all hover:brightness-105 flex items-center gap-2 h-full"
                style={{ padding: '0 14px', background: WX_GREEN }}
            >
                <WxIcon code={primary.code} className="w-4 h-4 shrink-0" style={{ color: '#fff' }} />
                <span style={{
                    fontFamily:    "'Elms Sans', sans-serif",
                    fontSize:      12,
                    fontWeight:    600,
                    color:         'rgba(255,255,255,0.92)',
                    letterSpacing: '0.02em',
                }}>
                    {primary.city}
                </span>
                <span style={{
                    fontFamily: "'Elms Sans', sans-serif",
                    fontSize:   14,
                    fontWeight: 800,
                    color:      '#fff',
                }}>
                    {primary.temp}°
                </span>
                <ChevronDown
                    className="w-3 h-3 shrink-0"
                    style={{
                        color:      'rgba(255,255,255,0.7)',
                        transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease',
                    }}
                />
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-1 z-50 overflow-hidden animate-fade-up"
                    style={{
                        width:      300,
                        background: 'var(--color-terminal-surface)',
                        border:     '1px solid var(--color-terminal-border-raw)',
                        boxShadow:  '0 16px 40px rgba(0,0,0,0.25)',
                    }}
                >
                    <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
                    <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />

                    {/* Konum başlığı */}
                    <div className="flex items-center gap-2.5 px-4 py-3">
                        <div className="min-w-0">
                            <div className="font-bold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                                {primary.city}
                            </div>
                            <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                Konumun
                            </div>
                        </div>
                        <div className="ml-auto text-right">
                            <div className="font-mono font-black text-base" style={{ color: 'var(--color-text-primary)' }}>
                                {primary.temp}°
                            </div>
                            <span className="font-mono text-[11px] font-bold inline-flex items-center gap-1 justify-end"
                                  style={{ color: WX_GREEN }}>
                                <WxIcon code={primary.code} className="w-3 h-3" />
                                {wmoLabel(primary.code)}
                            </span>
                        </div>
                    </div>

                    {/* Diğer şehirler */}
                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 border-t"
                           style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }}>
                            Diğer Şehirler
                        </p>
                        {CITIES.map(city => (
                            <CityRow key={city.id} city={city} weather={cityData[city.id] ?? null} loading={citiesLoading} />
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t font-mono text-[10px]"
                         style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }}>
                        <span>Open-Meteo</span>
                        <span>gecikmesiz</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeatherWidget;
