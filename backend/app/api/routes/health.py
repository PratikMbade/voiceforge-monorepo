import time
import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

START_TIME = time.time()


@router.get("/health")
async def health_check():
    """Liveness probe — always returns 200 if the process is running."""
    return {"status": "ok", "version": settings.VERSION}


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Readiness probe — checks DB and Redis connectivity.
    Returns 200 only when the app is ready to serve traffic.
    """
    checks: Dict[str, Any] = {}
    overall = "ok"

    # Database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        overall = "degraded"

    # Redis / Celery broker
    try:
        import redis  # type: ignore
        r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        overall = "degraded"

    # MLflow (non-critical)
    try:
        import httpx  # type: ignore
        async with httpx.AsyncClient(timeout=2) as client:
            resp = await client.get(f"{settings.MLFLOW_TRACKING_URI}/health")
            checks["mlflow"] = "ok" if resp.status_code == 200 else "unreachable"
    except Exception:
        checks["mlflow"] = "unreachable"   # non-critical, don't degrade

    return {
        "status": overall,
        "version": settings.VERSION,
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "checks": checks,
    }


@router.get("/health/live")
async def liveness():
    """Simple liveness — used by Kubernetes / Docker healthcheck."""
    return {"alive": True}
