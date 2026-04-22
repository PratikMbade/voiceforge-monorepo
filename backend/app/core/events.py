import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


async def startup_event():
    """Run on application startup."""
    logger.info(f"🚀 Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info(f"   Environment : {settings.ENV}")
    logger.info(f"   TTS Model   : {settings.TTS_MODEL}")
    logger.info(f"   MLflow URI  : {settings.MLFLOW_TRACKING_URI}")


async def shutdown_event():
    """Run on application shutdown."""
    logger.info("Cleaning up resources...")
