import asyncio
import httpx
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import User

router = APIRouter()

TRUNCGIL_URL = "https://finans.truncgil.com/v4/today.json"

KEY_MAP = {
    "USD":         "USD",
    "EUR":         "EUR",
    "GREMSEALTIN": "gram-altin",
    "XU100":       "BIST 100",
}

STOCK_SYMBOLS = [
    "THYAO.IS", "AKBNK.IS", "GARAN.IS", "SISE.IS", "KCHOL.IS",
    "EREGL.IS", "SAHOL.IS", "BIMAS.IS", "ASELS.IS", "PGSUS.IS",
]

STOCK_NAMES = {
    "THYAO.IS": "Türk Hava Yolları",
    "AKBNK.IS": "Akbank",
    "GARAN.IS": "Garanti BBVA",
    "SISE.IS":  "Şişecam",
    "KCHOL.IS": "Koç Holding",
    "EREGL.IS": "Ereğli Demir",
    "SAHOL.IS": "Sabancı Holding",
    "BIMAS.IS": "BİM",
    "ASELS.IS": "Aselsan",
    "PGSUS.IS": "Pegasus",
}

CRYPTO_SYMBOLS = ["BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD", "XRP-USD"]

CRYPTO_NAMES = {
    "BTC-USD": "Bitcoin",
    "ETH-USD": "Ethereum",
    "BNB-USD": "BNB",
    "SOL-USD": "Solana",
    "XRP-USD": "XRP",
}

ALL_FETCH_SYMBOLS = STOCK_SYMBOLS + CRYPTO_SYMBOLS

KNOWN_TICKERS = set(KEY_MAP.values()) | set(STOCK_SYMBOLS) | set(CRYPTO_SYMBOLS)

_STOCKS_CACHE: dict = {}
_STOCKS_TTL   = 60
_executor     = ThreadPoolExecutor(max_workers=2)


def _stocks_cache_get():
    e = _STOCKS_CACHE.get("stocks")
    if e and (datetime.now(timezone.utc).timestamp() - e["ts"]) < _STOCKS_TTL:
        return e["data"]
    return None


def _stocks_cache_set(data):
    _STOCKS_CACHE["stocks"] = {"data": data, "ts": datetime.now(timezone.utc).timestamp()}


def _fetch_stocks_sync():
    import yfinance as yf
    result = []
    try:
        raw = yf.download(
            " ".join(ALL_FETCH_SYMBOLS),
            period="2d",
            auto_adjust=True,
            group_by="ticker",
            progress=False,
            threads=True,
        )
    except Exception as exc:
        raise RuntimeError(f"yfinance download failed: {exc}")

    for symbol in ALL_FETCH_SYMBOLS:
        is_crypto = symbol in CRYPTO_SYMBOLS
        name      = CRYPTO_NAMES.get(symbol) or STOCK_NAMES.get(symbol, symbol)
        currency  = "USD" if is_crypto else "TRY"
        try:
            closes = raw[symbol]["Close"] if len(ALL_FETCH_SYMBOLS) > 1 else raw["Close"]
            closes = closes.dropna()
            if len(closes) >= 2:
                prev, last = float(closes.iloc[-2]), float(closes.iloc[-1])
                chg = round((last - prev) / prev * 100, 2)
            elif len(closes) == 1:
                last = float(closes.iloc[-1])
                chg = 0.0
            else:
                last = None
                chg  = 0.0
        except Exception as sym_exc:
            logging.warning("yfinance parse error for %s: %s", symbol, sym_exc)
            last = None
            chg  = 0.0
        result.append({
            "symbol":     symbol,
            "name":       name,
            "price":      round(last, 2) if last is not None else None,
            "change_pct": chg,
            "currency":   currency,
            "category":   "crypto" if is_crypto else "bist",
        })
    return result


class MarketPrefsRequest(BaseModel):
    tickers: List[str]

    @field_validator("tickers")
    @classmethod
    def validate_tickers(cls, v: List[str]) -> List[str]:
        if len(v) > 12:
            raise ValueError("En fazla 12 ticker seçilebilir.")
        unknown = set(v) - KNOWN_TICKERS
        if unknown:
            raise ValueError(f"Bilinmeyen semboller: {', '.join(sorted(unknown))}")
        return v


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


@router.get("/stocks", tags=["Market"])
async def get_market_stocks():
    """Yahoo Finance üzerinden 10 BIST hissesini döner. 60 sn cache'li."""
    cached = _stocks_cache_get()
    if cached:
        return cached

    try:
        loop   = asyncio.get_running_loop()
        result = await loop.run_in_executor(_executor, _fetch_stocks_sync)
        _stocks_cache_set(result)
        return result
    except Exception as exc:
        return JSONResponse(status_code=502, content={"error": str(exc)})


@router.put("/preferences", tags=["Market"])
async def save_market_preferences(
    body:         MarketPrefsRequest,
    current_user: User         = Depends(get_current_user),
    db:           AsyncSession = Depends(get_db),
):
    """Kullanıcının MarketBand tercihlerini User.preferences JSONB'ye kaydeder."""
    prefs = dict(current_user.preferences or {})
    prefs["market_tickers"] = body.tickers
    current_user.preferences = prefs
    await db.commit()
    return {"tickers": body.tickers}
