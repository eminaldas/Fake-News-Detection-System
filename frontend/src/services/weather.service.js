const ISTANBUL = { lat: 41.0082, lon: 28.9784, city: 'İstanbul' };
const DAYS_TR   = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

class WeatherService {
    static async getLocation() {
        return new Promise((resolve) => {
            if (!('geolocation' in navigator)) {
                resolve(ISTANBUL);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                async ({ coords: { latitude: lat, longitude: lon } }) => {
                    const city = await WeatherService.reverseGeocode(lat, lon);
                    resolve({ lat, lon, city });
                },
                () => resolve(ISTANBUL),
                { timeout: 5000 }
            );
        });
    }

    static async reverseGeocode(lat, lon) {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr`,
                { headers: { 'User-Agent': 'BiHaber/1.0' } }
            );
            const d = await res.json();
            return d.address?.city || d.address?.town || d.address?.county || ISTANBUL.city;
        } catch {
            return ISTANBUL.city;
        }
    }

    static async getForecast(lat, lon) {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,weathercode,windspeed_10m` +
            `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
        );
        const d = await res.json();
        return {
            temp:  Math.round(d.current.temperature_2m),
            wind:  Math.round(d.current.windspeed_10m),
            code:  d.current.weathercode,
            daily: d.daily.time.map((t, i) => ({
                day:  DAYS_TR[new Date(t).getDay()],
                code: d.daily.weathercode[i],
                max:  Math.round(d.daily.temperature_2m_max[i]),
                min:  Math.round(d.daily.temperature_2m_min[i]),
            })),
        };
    }
}

export { ISTANBUL };
export default WeatherService;
