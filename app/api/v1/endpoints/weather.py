import asyncio
import json

import httpx
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from redis.asyncio import Redis

from app.db.redis import get_redis

router = APIRouter()

_OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
_NOMINATIM  = "https://nominatim.openstreetmap.org/reverse"


@router.get("")
async def get_weather(
    lat:   float = Query(..., ge=-90,  le=90),
    lon:   float = Query(..., ge=-180, le=180),
    redis: Redis = Depends(get_redis),
):
    key    = f"weather:{round(lat, 2)}:{round(lon, 2)}"
    cached = await redis.get(key)
    if cached:
        return JSONResponse(content=json.loads(cached))

    async with httpx.AsyncClient(timeout=8.0) as client:
        weather_req = client.get(_OPEN_METEO, params={
            "latitude":  lat,
            "longitude": lon,
            "current":   "temperature_2m,weathercode,windspeed_10m",
            "daily":     "weathercode,temperature_2m_max,temperature_2m_min",
            "timezone":  "auto",
            "forecast_days": 7,
        })
        geo_req = client.get(_NOMINATIM, params={
            "lat": lat, "lon": lon, "format": "json", "accept-language": "tr",
        }, headers={"User-Agent": "NeHaber/1.0"})

        weather_res, geo_res = await asyncio.gather(
            weather_req, geo_req, return_exceptions=True
        )

    if isinstance(weather_res, Exception) or weather_res.status_code >= 400:
        return JSONResponse(status_code=502, content={"error": "Hava durumu alınamadı"})

    d    = weather_res.json()
    city = "İstanbul"
    if not isinstance(geo_res, Exception) and geo_res.status_code < 400:
        addr = geo_res.json().get("address", {})
        city = addr.get("city") or addr.get("town") or addr.get("county") or city

    result = {
        "temp":  round(d["current"]["temperature_2m"]),
        "code":  d["current"]["weathercode"],
        "wind":  round(d["current"]["windspeed_10m"]),
        "city":  city,
        "daily": [
            {
                "date": d["daily"]["time"][i],
                "code": d["daily"]["weathercode"][i],
                "max":  round(d["daily"]["temperature_2m_max"][i]),
                "min":  round(d["daily"]["temperature_2m_min"][i]),
            }
            for i in range(len(d["daily"]["weathercode"]))
        ],
    }

    await redis.setex(key, 1800, json.dumps(result))
    return result
