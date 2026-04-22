import time
import logging
from datetime import datetime, timezone

from app.core.celery_app import celery_app
from app.ml.cloning_engine import cloning_engine
from app.ml.mlflow_tracker import tracker

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.tasks.cloning_tasks.run_voice_cloning",
    max_retries=1,
    default_retry_delay=5,
)
def run_voice_cloning(self, voice_id: str, audio_path: str):
    """
    Celery task: extract speaker embedding from uploaded audio
    and attach it to a Voice record.
    """
    logger.info(f"[Task] Starting voice cloning for voice: {voice_id}")
    start_time = time.time()

    # Lazy import to avoid circular deps
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.core.config import settings
    from app.models.voice import Voice
    from app.models.project import JobStatus

    sync_engine = create_engine(settings.DATABASE_URL.replace("+aiosqlite", ""))
    SyncSession = sessionmaker(sync_engine)

    with SyncSession() as session:
        voice = session.get(Voice, voice_id)
        if not voice:
            logger.error(f"Voice not found: {voice_id}")
            return {"status": "failed", "error": "Voice not found"}

        try:
            # Validate audio
            is_valid, message = cloning_engine.validate_audio(audio_path)
            if not is_valid:
                raise ValueError(message)

            # Extract speaker embedding
            embedding_path, quality_score = cloning_engine.extract_embedding(audio_path)

            # Update voice record
            voice.embedding_path = embedding_path
            voice.sample_path = audio_path
            session.commit()

            elapsed = time.time() - start_time

            # Log to MLflow
            import wave
            with wave.open(audio_path, "r") as wf:
                audio_duration = wf.getnframes() / float(wf.getframerate())

            tracker.log_cloning(
                voice_id=voice_id,
                audio_duration=audio_duration,
                quality_score=quality_score,
                processing_time=elapsed,
            )

            logger.info(f"✅ Voice cloning done for {voice_id} in {elapsed:.2f}s (quality={quality_score})")
            return {
                "status": "completed",
                "voice_id": voice_id,
                "quality_score": quality_score,
                "embedding_path": embedding_path,
            }

        except Exception as exc:
            logger.error(f"Cloning failed for {voice_id}: {exc}", exc_info=True)
            raise self.retry(exc=exc)
