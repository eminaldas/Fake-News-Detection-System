const IN_TURKEY = (lon, lat) =>
    lat >= 35.8 && lat <= 42.1 && lon >= 25.7 && lon <= 44.8;

class DepremService {
    static async getRecentQuakes() {
        const res = await fetch(
            'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
        );
        const d = await res.json();
        return d.features
            .filter(f => {
                const [lon, lat] = f.geometry.coordinates;
                return IN_TURKEY(lon, lat);
            })
            .slice(0, 5)
            .map(f => ({
                id:    f.id,
                mag:   f.properties.mag,
                place: f.properties.place
                    .replace(/^\d+ km [A-Z]+ of /i, '')
                    .replace(/, Turkey$/i, '')
                    .trim(),
                time:  f.properties.time,
                depth: Math.round(f.geometry.coordinates[2]),
            }));
    }
}

export default DepremService;
