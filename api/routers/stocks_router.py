# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Stocks Router (Yahoo Finance public API, no key required)"""
import json
import urllib.request
import urllib.parse
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/stocks", tags=["Stocks"])

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
}


def _fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers=_HEADERS)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


@router.get("/quote")
async def get_quote(symbol: str):
    symbol = symbol.upper().strip()
    if not symbol:
        return JSONResponse({"ok": False, "error": "Symbol is required"}, status_code=400)
    try:
        # Current quote
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?interval=1d&range=5d"
        data = _fetch(url)

        result = data.get("chart", {}).get("result")
        if not result:
            err = data.get("chart", {}).get("error", {})
            return {"ok": False, "error": err.get("description", "Symbol not found")}

        r       = result[0]
        meta    = r.get("meta", {})
        closes  = (r.get("indicators", {}).get("quote", [{}])[0] or {}).get("close", [])
        ts      = r.get("timestamp", [])

        # Build 5-day history
        history = []
        for i, (t, c) in enumerate(zip(ts, closes)):
            if c is None:
                continue
            from datetime import datetime, timezone
            date_str = datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d")
            history.append({"date": date_str, "close": round(c, 4)})

        price      = meta.get("regularMarketPrice") or meta.get("chartPreviousClose", 0)
        prev_close = meta.get("previousClose") or meta.get("chartPreviousClose", price)
        change     = round(price - prev_close, 4) if prev_close else 0
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0

        # Currency symbol mapping
        currency_code = meta.get("currency", "USD")
        currency_map  = {"USD": "$", "EUR": "€", "GBP": "£", "TRY": "₺", "JPY": "¥"}
        currency_sym  = currency_map.get(currency_code, currency_code + " ")

        return {
            "ok": True,
            "quote": {
                "symbol":     meta.get("symbol", symbol),
                "name":       meta.get("longName") or meta.get("shortName", ""),
                "price":      round(price, 4),
                "change":     change,
                "change_pct": change_pct,
                "currency":   currency_sym,
                "market":     meta.get("exchangeName", ""),
                "history":    history,
            },
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}
