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

function wmoAccent(code) {
    if (code === 0)  return { bg: 'rgba(253,224,71,0.18)',  border: 'rgba(253,224,71,0.45)'  }; // güneş
    if (code <= 3)   return { bg: 'rgba(148,163,184,0.18)', border: 'rgba(148,163,184,0.40)' }; // bulutlu
    if (code <= 48)  return { bg: 'rgba(100,116,139,0.18)', border: 'rgba(100,116,139,0.40)' }; // sisli
    if (code <= 65)  return { bg: 'rgba(59,130,246,0.18)',  border: 'rgba(59,130,246,0.45)'  }; // yağmur
    if (code <= 75)  return { bg: 'rgba(186,230,253,0.18)', border: 'rgba(186,230,253,0.45)' }; // kar
    if (code <= 82)  return { bg: 'rgba(59,130,246,0.22)',  border: 'rgba(59,130,246,0.50)'  }; // sağanak
    if (code <= 86)  return { bg: 'rgba(186,230,253,0.22)', border: 'rgba(186,230,253,0.50)' }; // kar sağanağı
    return             { bg: 'rgba(139,92,246,0.20)',  border: 'rgba(139,92,246,0.50)'  };       // fırtına
}

async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`;
    const res  = await fetch(url);
    const data = await res.json();
    return {
        temp: Math.round(data.current.temperature_2m),
        code: data.current.weathercode,
    };
}

async function reverseGeocode(lat, lon) {
    try {
        const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr`,
            { headers: { 'User-Agent': 'BiHaber/1.0' } }
        );
        const data = await res.json();
        return (
            data.address?.city  ||
            data.address?.town  ||
            data.address?.county ||
            'İstanbul'
        );
    } catch {
        return 'İstanbul';
    }
}

function CityRow({ city, weather }) {
    const Icon = weather ? wmoIcon(weather.code) : null;
    return (
        <div className="flex items-center justify-between px-4 py-2 hover:bg-white/[0.05] transition-colors">
            <span className="font-mono text-xs font-bold" style={{ color: 'rgba(255,255,255,0.80)' }}>
                {city.name}
            </span>
            {weather ? (
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {wmoLabel(weather.code)}
                    </span>
                    <div className="flex items-center gap-1">
                        <Icon className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.75)' }} />
                        <span className="font-mono text-sm font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>
                            {weather.temp}°
                        </span>
                    </div>
                </div>
            ) : (
                <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
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

    // Konum al + birincil hava durumu yükle
    useEffect(() => {
        const load = async (lat, lon, city) => {
            try {
                const w = await fetchWeather(lat, lon);
                setPrimary({ ...w, city, lat, lon });
            } catch {
                setPrimary(null);
            }
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    const city = await reverseGeocode(latitude, longitude);
                    load(latitude, longitude, city);
                },
                () => load(41.0082, 28.9784, 'İstanbul'),
                { timeout: 5000 }
            );
        } else {
            load(41.0082, 28.9784, 'İstanbul');
        }
    }, []);

    // Dropdown açılınca diğer şehirleri yükle (bir kez)
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

    // Dışarı tıklanınca kapat
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    if (!primary) return null;

    const Icon   = wmoIcon(primary.code);
    const accent = wmoAccent(primary.code);

    return (
        <div ref={ref} className="relative hidden md:block">
            {/* Trigger — Sharp Rectangle */}
            <button
                onClick={toggleOpen}
                className="select-none whitespace-nowrap transition-all hover:opacity-90 flex items-center"
                style={{
                    background:           accent.bg,
                    backdropFilter:       'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border:               `1px solid ${accent.border}`,
                    borderRadius:         '0px',
                    padding:              '5px 10px 5px 8px',
                    gap:                  '7px',
                    display:              'flex',
                    alignItems:           'center',
                }}
            >
                <Icon
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'rgba(255,255,255,0.92)' }}
                />

                <div>
                    <div style={{
                        fontFamily: 'monospace', fontSize: 14, fontWeight: 900,
                        color: 'rgba(255,255,255,0.96)', lineHeight: 1,
                    }}>
                        {primary.temp}°C
                    </div>
                    <div style={{
                        fontFamily:    'monospace', fontSize: 9,
                        color:         'rgba(255,255,255,0.75)',
                        letterSpacing: '0.06em',
                    }}>
                        {primary.city.toUpperCase()}
                    </div>
                </div>

                <ChevronDown
                    className="w-3 h-3 shrink-0 transition-transform"
                    style={{
                        color:     'rgba(255,255,255,0.65)',
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                />
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-1 min-w-[230px] z-50 overflow-hidden"
                    style={{
                        background:  '#070f12',
                        border:      `1px solid ${accent.border}`,
                        borderRadius: '4px',
                        boxShadow:   '0 8px 32px rgba(0,0,0,0.55)',
                    }}
                >
                    {/* Konumun */}
                    <div style={{ background: accent.bg, borderBottom: `1px solid ${accent.border}`, padding: '10px 14px' }}>
                        <p className="font-mono text-[9px] uppercase tracking-widest mb-1.5"
                           style={{ color: 'rgba(255,255,255,0.55)' }}>
                            Konumun
                        </p>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
                                {primary.city}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.70)' }}>
                                    {wmoLabel(primary.code)}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.85)' }} />
                                    <span className="font-mono text-base font-black" style={{ color: 'rgba(255,255,255,0.96)' }}>
                                        {primary.temp}°
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Diğer şehirler */}
                    <div className="pb-1">
                        <p className="font-mono text-[9px] uppercase tracking-widest px-4 pt-2.5 pb-1"
                           style={{ color: 'rgba(255,255,255,0.40)' }}>
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
