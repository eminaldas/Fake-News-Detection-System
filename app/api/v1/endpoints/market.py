import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

TRUNCGIL_URL = "https://finans.truncgil.com/v4/today.json"

# API key → frontend key
KEY_MAP = {
    "USD":         "USD",
    "EUR":         "EUR",
    "GREMSEALTIN": "gram-altin",
    "XU100":       "BIST 100",
}


@router.get("/rates", tags=["Market"])
async def get_market_rates():
    """USD, EUR, Gram Altın ve BIST 100 verilerini Truncgil üzerinden proxy eder."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(TRUNCGIL_URL, headers={"User-Agent": "BiHaber/1.0"})
            res.raise_for_status()
            raw = res.json()

        def parse(v):
            try:
                return float(v) if v is not None else None
            except (ValueError, TypeError):
                return None

        data = {}
        for api_key, out_key in KEY_MAP.items():
            entry = raw.get(api_key, {})
            data[out_key] = {
                "buy":    parse(entry.get("Buying")),
                "sell":   parse(entry.get("Selling")),
                "change": str(entry.get("Change", "")),
            }

        return data

    except Exception as exc:
        return JSONResponse(status_code=502, content={"error": str(exc)})
