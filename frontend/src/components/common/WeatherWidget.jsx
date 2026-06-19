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

// Hava durumu kutusu sabit yeşil — çentik rengiyle aynı. Havaya göre yalnızca ikon değişir.
const WX_GREEN = '#47b172';

async function fetchWeather(lat, lon) {
    const res  = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/weather?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    return { temp: data.temp, code: data.code, city: data.city };
}

function CityRow({ city, weather }) {
    const Icon = weather ? wmoIcon(weather.code) : null;
    return (
        <div className="flex items-center justify-between px-4 py-2.5 transition-colors cursor-default"
             onMouseEnter={e => e.currentTarget.style.background = 'rgba(128,128,128,0.07)'}
             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span className="text-xs font-semibold" style={{ fontFamily: "'Elms Sans',sans-serif", color: 'var(--color-text-primary)' }}>
                {city.name}
            </span>
            {weather ? (
                <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ fontFamily: "'Elms Sans',sans-serif", color: 'var(--color-text-muted)' }}>
                        {wmoLabel(weather.code)}
                    </span>
                    <div className="flex items-center gap-1">
                        <Icon className="w-3 h-3" style={{ color: 'var(--color-text-secondary)' }} />
                        <span className="text-sm font-bold" style={{ fontFamily: "'Elms Sans',sans-serif", color: 'var(--color-text-primary)' }}>
                            {weather.temp}°
                        </span>
                    </div>
                </div>
            ) : (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
            )}
        </div>
    );
}

const WeatherWidget = () => {
    const [primary,  setPrimary]  = useState(null);   // { temp, code, city, lat, lon }
    const [open,     setOpen]     = useState(false);
    const [cityData, setCityData] = useState({});      // id → { temp, code }
    const [fetched,  setFetched]  = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const load = async (lat, lon, fallbackCity = 'İstanbul') => {
            try {
                const w = await fetchWeather(lat, lon);
                setPrimary({ ...w, city: w.city || fallbackCity, lat, lon });
            } catch {
                setPrimary(null);
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
        const results = await Promise.allSettled(
            CITIES.map(c => fetchWeather(c.lat, c.lon).then(w => ({ id: c.id, ...w })))
        );
        const map = {};
        results.forEach(r => {
            if (r.status === 'fulfilled') map[r.value.id] = { temp: r.value.temp, code: r.value.code };
        });
        setCityData(map);
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

    if (!primary) return null;

    const Icon = wmoIcon(primary.code);

    return (
        <div ref={ref} className="relative hidden md:flex shrink-0">
            {/* Trigger — sabit yeşil kutu, beyaz yazı, çentiksiz */}
            <button
                onClick={toggleOpen}
                className="relative select-none whitespace-nowrap transition-all hover:brightness-105 flex items-center gap-2 h-full"
                style={{ padding: '0 14px', background: WX_GREEN }}
            >
                <Icon className="w-4 h-4 shrink-0" style={{ color: '#fff' }} />
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
                    className="absolute right-0 top-full mt-1 min-w-57.5 z-50 overflow-hidden animate-fade-up"
                    style={{
                        background:   'var(--color-navbar-bg)',
                        border:       `1px solid ${WX_GREEN}`,
                        borderRadius: 14,
                        boxShadow:    '0 12px 40px rgba(0,0,0,0.30)',
                        minWidth:     '280px',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Konum başlığı — gradient yok, sadece border */}
                    <div style={{ borderBottom: `1px solid ${WX_GREEN}`, padding: '12px 16px' }}>
                        <p className="text-[9px] uppercase tracking-widest mb-2"
                           style={{ fontFamily: "'Elms Sans',sans-serif", color: 'var(--color-text-muted)' }}>
                            Konumun
                        </p>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold" style={{ fontFamily: "'Elms Sans',sans-serif", color: 'var(--color-text-primary)' }}>
                                {primary.city}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ fontFamily: "'Elms Sans',sans-serif", color: 'var(--color-text-secondary)' }}>
                                    {wmoLabel(primary.code)}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Icon className="w-3.5 h-3.5" style={{ color: WX_GREEN }} />
                                    <span className="text-base font-black" style={{ fontFamily: "'Elms Sans',sans-serif", color: 'var(--color-text-primary)' }}>
                                        {primary.temp}°
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Diğer şehirler */}
                    <div className="pb-2">
                        <p className="text-[9px] uppercase tracking-widest px-4 pt-3 pb-1"
                           style={{ fontFamily: "'Elms Sans',sans-serif", color: 'var(--color-text-muted)' }}>
                            Diğer Şehirler
                        </p>
                        {CITIES.map(city => (
                            <CityRow key={city.id} city={city} weather={cityData[city.id] ?? null} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeatherWidget;
