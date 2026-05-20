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
                ({ coords: { latitude: lat, longitude: lon } }) => resolve({ lat, lon }),
                () => resolve(ISTANBUL),
                { timeout: 5000 }
            );
        });
    }

    static async getForecast(lat, lon) {
        const res  = await fetch(`/api/v1/weather?lat=${lat}&lon=${lon}`);
        const d    = await res.json();
        return {
            temp:  d.temp,
            wind:  d.wind,
            code:  d.code,
            city:  d.city,
            daily: (d.daily || []).map(day => ({
                day:  DAYS_TR[new Date(day.date).getDay()],
                code: day.code,
                max:  day.max,
                min:  day.min,
            })),
        };
    }
}

export { ISTANBUL };
export default WeatherService;
