import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.models import User

router = APIRouter()

RATE_KEYS = ["USD", "EUR", "gram-altin", "BIST 100"]

GOLD_OZ_TO_GRAM = 31.1035

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

KNOWN_TICKERS = set(RATE_KEYS) | set(STOCK_SYMBOLS) | set(CRYPTO_SYMBOLS)

_executor = ThreadPoolExecutor(max_workers=2)


def _last_prev_from(raw, sym, multi):
    try:
        closes = (raw[sym]["Close"] if multi else raw["Close"]).dropna()
        if len(closes) >= 2:
            return float(closes.iloc[-1]), float(closes.iloc[-2])
        if len(closes) == 1:
            v = float(closes.iloc[-1])
            return v, v
    except Exception as exc:
        logging.warning("rates parse error for %s: %s", sym, exc)
    return None, None


def _fetch_rates_sync():
    """USD, EUR, BIST 100, gram-altın'ı yfinance'ten döner. Çıktı eski Truncgil şekliyle aynı."""
    import yfinance as yf
    syms = ["USDTRY=X", "EURTRY=X", "XU100.IS", "GC=F"]
    raw = yf.download(" ".join(syms), period="2d", auto_adjust=True,
                      group_by="ticker", progress=False, threads=True)
    multi = len(syms) > 1

    out = {}

    def put(key, last, prev):
        if last is None:
            return
        chg = round((last - prev) / prev * 100, 2) if prev else 0.0
        out[key] = {"buy": round(last, 4), "sell": round(last, 4), "change": str(chg)}

    usd_l, usd_p = _last_prev_from(raw, "USDTRY=X", multi)
    eur_l, eur_p = _last_prev_from(raw, "EURTRY=X", multi)
    bist_l, bist_p = _last_prev_from(raw, "XU100.IS", multi)
    gold_l, gold_p = _last_prev_from(raw, "GC=F", multi)

    put("USD", usd_l, usd_p)
    put("EUR", eur_l, eur_p)
    put("BIST 100", bist_l, bist_p)

    if gold_l is not None and usd_l is not None:
        gram_l = gold_l / GOLD_OZ_TO_GRAM * usd_l
        gram_p = (gold_p / GOLD_OZ_TO_GRAM * usd_p) if (gold_p and usd_p) else gram_l
        put("gram-altin", gram_l, gram_p)

    return out


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
async def get_market_rates(redis: Redis = Depends(get_redis)):
    """USD, EUR, Gram Altın, BIST 100 — yfinance üzerinden. 5 dk Redis cache."""
    try:
        cached = await redis.get("market:rates")
        if cached:
            return JSONResponse(content=json.loads(cached))
    except Exception:
        pass  # Redis unavailable — cache atlanır, canlı veriye geç

    try:
        loop = asyncio.get_running_loop()
        data = await loop.run_in_executor(_executor, _fetch_rates_sync)
        try:
            await redis.setex("market:rates", 300, json.dumps(data))
        except Exception:
            pass  # Redis write hatası — veri yine de dönebilir
        return JSONResponse(content=data)
    except Exception as exc:
        logging.warning("market/rates fetch failed: %s", exc)
        return JSONResponse(content={"error": str(exc), "unavailable": True})


@router.get("/stocks", tags=["Market"])
async def get_market_stocks(redis: Redis = Depends(get_redis)):
    """Yahoo Finance üzerinden 10 BIST hissesini döner. 60 sn Redis cache."""
    cached = await redis.get("market:stocks")
    if cached:
        return JSONResponse(content=json.loads(cached))

    try:
        loop   = asyncio.get_running_loop()
        result = await loop.run_in_executor(_executor, _fetch_stocks_sync)
        await redis.setex("market:stocks", 60, json.dumps(result))
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
