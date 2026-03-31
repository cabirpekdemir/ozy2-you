# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Stocks Router (Stooq public API, no key required, VPS-friendly)"""
import json
import urllib.request
import urllib.parse
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/stocks", tags=["Stocks"])

_HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

# Symbol mapping: OZY panel format → Stooq format
_CRYPTO_MAP = {
    "BTC-USD": "btc.v",
    "ETH-USD": "eth.v",
    "BNB-USD": "bnb.v",
    "SOL-USD": "sol.v",
    "XRP-USD": "xrp.v",
    "ADA-USD": "ada.v",
    "DOGE-USD": "doge.v",
}

def _to_stooq(symbol: str) -> str:
    """Convert panel symbol to Stooq format."""
    up = symbol.upper()
    if up in _CRYPTO_MAP:
        return _CRYPTO_MAP[up]
    # Already has exchange suffix (e.g. AAPL.US)
    if "." in up:
        return up.lower()
    # Default: US stock
    return f"{up.lower()}.us"


@router.get("/quote")
async def get_quote(symbol: str):
    symbol = symbol.upper().strip()
    if not symbol:
        return JSONResponse({"ok": False, "error": "Symbol is required"}, status_code=400)

    stooq_sym = _to_stooq(symbol)

    try:
        url = f"https://stooq.com/q/l/?s={urllib.parse.quote(stooq_sym)}&f=sd2t2ohlcv&h&e=json"
        req = urllib.request.Request(url, headers=_HEADERS)
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())

        symbols = data.get("symbols", [])
        if not symbols:
            return {"ok": False, "error": f"Symbol '{symbol}' not found"}

        q = symbols[0]
        price = float(q.get("close") or q.get("open") or 0)
        open_ = float(q.get("open") or price)
        change     = round(price - open_, 4)
        change_pct = round((change / open_) * 100, 2) if open_ else 0

        is_crypto = symbol in _CRYPTO_MAP or symbol.endswith("-USD")
        currency  = "" if is_crypto else "$"

        return {
            "ok": True,
            "quote": {
                "symbol":     symbol,
                "name":       q.get("symbol", symbol),
                "price":      round(price, 4),
                "open":       round(open_, 4),
                "high":       round(float(q.get("high") or price), 4),
                "low":        round(float(q.get("low")  or price), 4),
                "volume":     q.get("volume"),
                "change":     change,
                "change_pct": change_pct,
                "currency":   currency,
                "date":       q.get("date", ""),
                "time":       q.get("time", ""),
                "history":    [],
            },
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}
