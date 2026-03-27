"""
OZY2 — Otomatik Sağlık Kontrol Sistemi
Tüm servisleri test eder, sonuçları Telegram'a gönderir.
Günde 2 kez çalışır (09:00 ve 21:00).
"""
import asyncio
import time
import json
import logging
from datetime import datetime
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

# ── Port okuma ────────────────────────────────────────────────────────────────

def _get_port() -> int:
    try:
        cfg = Path(__file__).parent.parent / "config" / "settings.json"
        return int(json.loads(cfg.read_text()).get("port", 8082))
    except Exception:
        return 8082


# ── Test tanımları ────────────────────────────────────────────────────────────
# (kategori, emoji, isim, method, path, beklenen_key, zorunlu_mu)

CHECKS = [
    # Core
    ("Core",         "⚙️",  "Settings API",    "GET", "/api/settings",              "ok",        True),
    ("Core",         "🔐",  "Auth Durumu",      "GET", "/api/auth/status",           "ok",        True),

    # Google
    ("Google",       "🔗",  "Google OAuth",     "GET", "/api/google/status",              "connected", False),
    ("Google",       "📧",  "Gmail",            "GET", "/api/gmail/messages?max_results=1","ok",        False),
    ("Google",       "📅",  "Calendar",         "GET", "/api/calendar/today",             "ok",        False),
    ("Google",       "💾",  "Drive",            "GET", "/api/drive/files?max_results=1",  "ok",        False),

    # Üretkenlik
    ("Üretkenlik",   "✅",  "Tasks",            "GET", "/api/tasks",                      "ok",        True),
    ("Üretkenlik",   "🧠",  "Memory",           "GET", "/api/memory/facts",               "ok",        True),
    ("Üretkenlik",   "☀️",  "Briefing",         "GET", "/api/briefing",              "ok",        True),

    # İletişim
    ("İletişim",     "✈️",  "Telegram Bot",     "GET", "/api/telegram/status",       "ok",        False),

    # Medya
    ("Medya",        "▶️",  "YouTube Kanallar", "GET", "/api/youtube/channels",      "ok",        True),
    ("Medya",        "📖",  "Kitap Takipçi",    "GET", "/api/books/",                "ok",        True),

    # Akıllı Ev
    ("Akıllı Ev",    "🏠",  "Smart Home",       "GET", "/api/smarthome/config",      "ok",        False),
]


# ── Tek test çalıştır ─────────────────────────────────────────────────────────

async def _run_check(client: httpx.AsyncClient, base: str, check: tuple) -> dict:
    category, emoji, name, method, path, expected_key, required = check
    url   = f"{base}{path}"
    start = time.monotonic()
    try:
        if method == "GET":
            r = await client.get(url, timeout=8)
        else:
            r = await client.post(url, timeout=8)
        ms   = int((time.monotonic() - start) * 1000)
        data = r.json()

        val = data.get(expected_key)
        # "ok" key için True, "connected" için True, sayısal ok için 0 değil kontrolü
        passed = bool(val) if val is not None else (r.status_code < 400)

        return {
            "category": category,
            "emoji":    emoji,
            "name":     name,
            "passed":   passed,
            "ms":       ms,
            "required": required,
            "detail":   data.get("error") or data.get("reason") or data.get("message") or "",
        }
    except httpx.TimeoutException:
        ms = int((time.monotonic() - start) * 1000)
        return {"category": category, "emoji": emoji, "name": name,
                "passed": False, "ms": ms, "required": required, "detail": "Zaman aşımı"}
    except Exception as e:
        ms = int((time.monotonic() - start) * 1000)
        return {"category": category, "emoji": emoji, "name": name,
                "passed": False, "ms": ms, "required": required, "detail": str(e)[:80]}


# ── Tüm testleri çalıştır ─────────────────────────────────────────────────────

async def run_all_checks() -> list[dict]:
    port  = _get_port()
    base  = f"http://127.0.0.1:{port}"
    results = []
    async with httpx.AsyncClient() as client:
        tasks = [_run_check(client, base, c) for c in CHECKS]
        results = await asyncio.gather(*tasks, return_exceptions=False)
    return list(results)


# ── Telegram mesajı formatla ──────────────────────────────────────────────────

def _format_telegram(results: list[dict], duration_ms: int) -> str:
    now     = datetime.now().strftime("%d %B %Y · %H:%M")
    total   = len(results)
    passed  = sum(1 for r in results if r["passed"])
    failed  = total - passed
    critical_fail = sum(1 for r in results if not r["passed"] and r["required"])

    # Genel durum
    if critical_fail == 0 and failed == 0:
        status_line = "✅ <b>Tamamen Sağlıklı</b>"
    elif critical_fail == 0:
        status_line = "🟡 <b>Kısmen Sağlıklı</b> (zorunlu servisler çalışıyor)"
    else:
        status_line = f"🔴 <b>Kritik Sorun!</b> {critical_fail} zorunlu servis çöktü"

    # Kategorilere göre grupla
    categories: dict[str, list] = {}
    for r in results:
        categories.setdefault(r["category"], []).append(r)

    lines = [
        f"🏥 <b>OZY2 Sağlık Raporu</b>",
        f"📅 {now}",
        "",
        status_line,
        f"<code>{'█' * passed}{'░' * failed}</code>  {passed}/{total} test geçti",
        "",
        "─────────────────────",
    ]

    for cat, items in categories.items():
        cat_passed = sum(1 for i in items if i["passed"])
        cat_total  = len(items)
        cat_icon   = "🟢" if cat_passed == cat_total else ("🟡" if cat_passed > 0 else "🔴")
        lines.append(f"\n{cat_icon} <b>{cat}</b>")
        for item in items:
            mark = "✅" if item["passed"] else "❌"
            ms_txt = f"<i>{item['ms']}ms</i>" if item["passed"] else ""
            detail = f" — <i>{item['detail'][:50]}</i>" if not item["passed"] and item["detail"] else ""
            lines.append(f"  {mark} {item['emoji']} {item['name']} {ms_txt}{detail}")

    lines += [
        "",
        "─────────────────────",
        f"⏱ Toplam süre: <i>{duration_ms}ms</i>",
    ]

    if failed > 0:
        lines.append(f"\n⚠️ <b>Sorunlu Servisler:</b>")
        for r in results:
            if not r["passed"]:
                tag = " 🔴 KRİTİK" if r["required"] else ""
                lines.append(f"  • {r['name']}{tag}: {r['detail'][:60] or 'yanıt vermedi'}")

    return "\n".join(lines)


# ── Ana fonksiyon (scheduler tarafından çağrılır) ─────────────────────────────

async def health_check_and_notify():
    """Tüm kontrolleri çalıştır ve sonucu Telegram'a gönder."""
    logger.info("[HealthCheck] Başlatılıyor...")
    start = time.monotonic()
    try:
        results      = await run_all_checks()
        duration_ms  = int((time.monotonic() - start) * 1000)
        message      = _format_telegram(results, duration_ms)

        from integrations.telegram import send_message
        ok = await send_message(message, parse_mode="HTML")

        passed = sum(1 for r in results if r["passed"])
        logger.info(f"[HealthCheck] Tamamlandı: {passed}/{len(results)} geçti, "
                    f"Telegram: {'✓' if ok else '✗'}, süre: {duration_ms}ms")
    except Exception as e:
        logger.error(f"[HealthCheck] Hata: {e}")
        try:
            from integrations.telegram import send_message
            await send_message(f"🔴 <b>OZY2 Sağlık Kontrolü Başarısız</b>\n\nHata: {e}", parse_mode="HTML")
        except Exception:
            pass


# ── Manuel tetikleme için ─────────────────────────────────────────────────────

async def quick_check() -> dict:
    """Hızlı kontrol — sadece sonuçları döndürür, Telegram göndermez."""
    start   = time.monotonic()
    results = await run_all_checks()
    ms      = int((time.monotonic() - start) * 1000)
    passed  = sum(1 for r in results if r["passed"])
    return {
        "ok":        True,
        "passed":    passed,
        "total":     len(results),
        "score_pct": int(passed / len(results) * 100),
        "duration_ms": ms,
        "results":   results,
        "report":    _format_telegram(results, ms),
    }
