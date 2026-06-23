import asyncio
import httpx
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


RANGE_MAP = {
    "1g": ("1d", "15m"),
    "1h": ("5d", "60m"),
    "1a": ("1mo", "1d"),
}


def _resolve_yf(symbol):
    """Band sembolü -> (yf_symbol, name, currency, gold_convert)."""
    if symbol == "gram-altin":
        return ("GC=F", "Gram Altın", "TRY", True)
    if symbol == "USD":
        return ("USDTRY=X", "Dolar / TL", "TRY", False)
    if symbol == "EUR":
        return ("EURTRY=X", "Euro / TL", "TRY", False)
    if symbol == "BIST 100":
        return ("XU100.IS", "BIST 100", "", False)
    if symbol in CRYPTO_SYMBOLS:
        return (symbol, CRYPTO_NAMES[symbol], "USD", False)
    if symbol in STOCK_SYMBOLS:
        return (symbol, STOCK_NAMES[symbol], "TRY", False)
    return (None, None, None, False)


def _fetch_detail_sync(symbol, rng):
    import yfinance as yf
    yf_symbol, name, currency, gold_convert = _resolve_yf(symbol)
    if yf_symbol is None:
        return None
    period, interval = RANGE_MAP.get(rng, RANGE_MAP["1g"])

    hist = yf.Ticker(yf_symbol).history(period=period, interval=interval, auto_adjust=True)
    closes = hist["Close"].dropna()
    if len(closes) == 0:
        raise RuntimeError("no history")

    mult = 1.0
    if gold_convert:
        # gram altın TRY = ons_usd / 31.1035 * USDTRY (sabit çarpan → sparkline şekli korunur)
        usd = yf.Ticker("USDTRY=X").history(period="1d", interval="15m")["Close"].dropna()
        usd_now = float(usd.iloc[-1]) if len(usd) else 1.0
        mult = usd_now / GOLD_OZ_TO_GRAM

    spark = [round(float(c) * mult, 4) for c in closes.tolist()][-60:]
    price = spark[-1]
    prev_close = round(float(closes.iloc[-2]) * mult, 4) if len(closes) >= 2 else price
    change_abs = round(price - prev_close, 4)
    change_pct = round((change_abs / prev_close) * 100, 2) if prev_close else 0.0

    return {
        "symbol":     symbol,
        "name":       name,
        "currency":   currency,
        "price":      price,
        "change_pct": change_pct,
        "change_abs": change_abs,
        "open":       round(float(closes.iloc[0]) * mult, 4),
        "prev_close": prev_close,
        "day_high":   round(float(closes.max()) * mult, 4),
        "day_low":    round(float(closes.min()) * mult, 4),
        "spark":      spark,
        "range":      rng,
    }


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


@router.get("/detail/{symbol:path}", tags=["Market"])
async def get_market_detail(symbol: str, range: str = "1g", redis: Redis = Depends(get_redis)):
    """Tek sembol detayı (fiyat + geçmiş sparkline). Public veri, 300 sn Redis cache."""
    rng = range if range in RANGE_MAP else "1g"
    if symbol not in KNOWN_TICKERS:
        return JSONResponse(status_code=404, content={"error": "bilinmeyen sembol"})

    cache_key = f"market:detail:{symbol}:{rng}"
    try:
        cached = await redis.get(cache_key)
        if cached:
            return JSONResponse(content=json.loads(cached))
    except Exception:
        pass

    try:
        loop = asyncio.get_running_loop()
        data = await loop.run_in_executor(_executor, _fetch_detail_sync, symbol, rng)
        if data is None:
            return JSONResponse(status_code=404, content={"error": "bilinmeyen sembol"})
        try:
            await redis.setex(cache_key, 300, json.dumps(data))
        except Exception:
            pass
        return JSONResponse(content=data)
    except Exception as exc:
        logging.warning("market/detail %s failed: %s", symbol, exc)
        return JSONResponse(status_code=502, content={"error": str(exc)})


_YAHOO_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search"


def _yahoo_type(quote_type, exchange):
    qt = (quote_type or "").upper()
    ex = (exchange or "").upper()
    if qt == "CRYPTOCURRENCY":
        return "Kripto"
    if qt == "CURRENCY":
        return "Döviz"
    if qt == "INDEX":
        return "Endeks"
    if qt == "FUTURE":
        return "Emtia"
    if ex in ("IST", "ISE"):
        return "BIST"
    return "Hisse"


@router.get("/search", tags=["Market"])
async def market_search(q: str, redis: Redis = Depends(get_redis)):
    """Yahoo Finance sembol arama proxy'si. 60 sn cache."""
    q = q.strip()
    if len(q) < 2:
        return JSONResponse(content=[])
    cache_key = f"market:search:{q.lower()}"
    try:
        cached = await redis.get(cache_key)
        if cached:
            return JSONResponse(content=json.loads(cached))
    except Exception:
        pass
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(_YAHOO_SEARCH,
                                   params={"q": q, "quotesCount": 12, "newsCount": 0},
                                   headers={"User-Agent": "NeHaber/1.0"})
            res.raise_for_status()
            quotes = res.json().get("quotes", [])
        out = []
        for it in quotes:
            sym = it.get("symbol")
            if not sym:
                continue
            out.append({
                "symbol":   sym,
                "name":     it.get("shortname") or it.get("longname") or sym,
                "type":     _yahoo_type(it.get("quoteType"), it.get("exchange")),
                "exchange": it.get("exchange") or "",
            })
        try:
            await redis.setex(cache_key, 60, json.dumps(out))
        except Exception:
            pass
        return JSONResponse(content=out)
    except Exception as exc:
        logging.warning("market/search failed: %s", exc)
        return JSONResponse(content=[])


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
