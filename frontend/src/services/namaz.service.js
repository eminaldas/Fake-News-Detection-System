class NamazService {
    static async getTimings(city = 'Istanbul', country = 'Turkey') {
        const today = new Date();
        const date  = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
        const res   = await fetch(
            `https://api.aladhan.com/v1/timingsByCity/${date}?city=${city}&country=${country}&method=13`
        );
        const d = await res.json();
        return d.data?.timings ?? null;
    }
}

export default NamazService;
