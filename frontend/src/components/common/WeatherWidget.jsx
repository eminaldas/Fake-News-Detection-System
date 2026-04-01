import React, { useEffect, useState } from 'react';

const ISTANBUL = { lat: 41.0082, lon: 28.9784, city: 'İstanbul' };

const WMO_ICONS = {
    0:  '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '❄️',  73: '❄️',  75: '❄️',
    80: '🌧️', 81: '🌧️', 82: '🌧️',
    85: '🌨️', 86: '🌨️',
    95: '⛈️',  96: '⛈️',  99: '⛈️',
};

async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    return {
        temp: Math.round(data.current.temperature_2m),
        code: data.current.weathercode,
    };
}

async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr`,
            { headers: { 'User-Agent': 'BiHaber/1.0' } }
        );
        const data = await res.json();
        return (
            data.address?.city ||
            data.address?.town ||
            data.address?.county ||
            ISTANBUL.city
        );
    } catch {
        return ISTANBUL.city;
    }
}

const WeatherWidget = () => {
    const [weather, setWeather] = useState(null);

    useEffect(() => {
        const load = async (lat, lon, city) => {
            try {
                const w = await fetchWeather(lat, lon);
                setWeather({ ...w, city });
            } catch {
                setWeather(null);
            }
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    const city = await reverseGeocode(latitude, longitude);
                    load(latitude, longitude, city);
                },
                () => load(ISTANBUL.lat, ISTANBUL.lon, ISTANBUL.city),
                { timeout: 5000 }
            );
        } else {
            load(ISTANBUL.lat, ISTANBUL.lon, ISTANBUL.city);
        }
    }, []);

    if (!weather) return null;

    const icon = WMO_ICONS[weather.code] ?? '🌡️';

    return (
        <span className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-tx-primary tracking-tight select-none whitespace-nowrap">
            <span className="text-base leading-none">{icon}</span>
            <span>{weather.temp}°C</span>
            <span className="text-tx-secondary font-medium opacity-70">· {weather.city}</span>
        </span>
    );
};

export default WeatherWidget;
