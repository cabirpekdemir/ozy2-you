"""OZY2 — Health Check Router"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
async def get_health():
    """Hızlı sağlık kontrolü — sonuçları döndürür."""
    try:
        from core.health_check import quick_check
        return await quick_check()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/send")
async def send_health_report():
    """Anında sağlık raporu çalıştır ve Telegram'a gönder."""
    try:
        from core.health_check import health_check_and_notify
        await health_check_and_notify()
        return {"ok": True, "message": "Rapor Telegram'a gönderildi"}
    except Exception as e:
        return {"ok": False, "error": str(e)}
