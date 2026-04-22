import os
import time
import logging
from datetime import datetime, timezone

from celery import shared_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.celery_app import celery_app
from app.ml.tts_engine import tts_engine
from app.ml.mlflow_tracker import tracker
from app.models.project import SynthesisJob, JobStatus

logger = logging.getLogger(__name__)

# Sync engine for Celery workers (Celery doesn't support asyncio natively)
sync_engine = create_engine(settings.DATABASE_URL.replace("+aiosqlite", ""))
SyncSession = sessionmaker(sync_engine)


@celery_app.task(
    bind=True,
    name="app.tasks.synthesis_tasks.run_synthesis",
    max_retries=2,
    default_retry_delay=10,
)
def run_synthesis(self, job_id: str):
    """
    Celery task: synthesize text to audio.
    Updates job status in DB and saves audio file.
    """
    logger.info(f"[Task] Starting synthesis job: {job_id}")
    start_time = time.time()

    with SyncSession() as session:
        job = session.get(SynthesisJob, job_id)
        if not job:
            logger.error(f"Job not found: {job_id}")
            return

        try:
            # Mark as processing
            job.status = JobStatus.PROCESSING
            session.commit()

            # Get voice embedding path if it's a cloned voice
            speaker_wav = _get_voice_sample(job.voice_id)

            # Run synthesis
            audio_path, duration = tts_engine.synthesize(
                text=job.text,
                voice_id=job.voice_id,
                speaker_wav=speaker_wav,
            )

            # Build public URL
            filename = os.path.basename(audio_path)
            audio_url = f"/api/v1/synthesis/audio/{filename}"
            file_size = os.path.getsize(audio_path) if os.path.exists(audio_path) else 0

            # Update job as completed
            job.status = JobStatus.COMPLETED
            job.audio_path = audio_path
            job.audio_url = audio_url
            job.duration_seconds = duration
            job.file_size_bytes = file_size
            job.characters_used = len(job.text)
            job.completed_at = datetime.now(timezone.utc)
            session.commit()

            elapsed = time.time() - start_time

            # Log to MLflow (non-blocking)
            tracker.log_synthesis(
                job_id=job_id,
                voice_id=job.voice_id,
                text_length=len(job.text),
                duration_seconds=duration,
                latency_seconds=elapsed,
                model_id=job.model_id,
            )

            logger.info(f"✅ Job {job_id} completed in {elapsed:.2f}s")
            return {"status": "completed", "audio_url": audio_url, "duration": duration}

        except Exception as exc:
            logger.error(f"Synthesis job {job_id} failed: {exc}", exc_info=True)
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            session.commit()

            # Retry on transient errors
            raise self.retry(exc=exc)


from typing import Optional

def _get_voice_sample(voice_id: str) -> Optional[str]:
    """Fetch speaker wav path for a voice, if it's a cloned voice."""
    with SyncSession() as session:
        from app.models.voice import Voice
        voice = session.get(Voice, voice_id)
        if voice and voice.sample_path and os.path.exists(voice.sample_path):
            return voice.sample_path
    return None
