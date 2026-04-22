import os
import uuid
import shutil
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.models.voice import Voice
from app.models.project import JobStatus
from app.schemas.synthesis import CloningJobResponse
from app.schemas.voice import VoiceResponse
from app.tasks.cloning_tasks import run_voice_cloning

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@router.post("", response_model=CloningJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def clone_voice(
    name: str = Form(...),
    description: str = Form(""),
    audio_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a voice sample and start cloning.
    Audio should be 6–180 seconds of clean speech.
    Returns a job that resolves when cloning is complete.
    """
    # Validate content type
    if audio_file.content_type not in settings.ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported audio type: {audio_file.content_type}. "
                   f"Allowed: {settings.ALLOWED_AUDIO_TYPES}",
        )

    # Save uploaded file
    file_id = str(uuid.uuid4())
    upload_path = os.path.join(settings.UPLOADS_DIR, f"{file_id}_{audio_file.filename}")

    try:
        size = 0
        with open(upload_path, "wb") as f:
            while chunk := await audio_file.read(1024 * 1024):  # 1MB chunks
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large (max {settings.MAX_UPLOAD_SIZE_MB}MB)",
                    )
                f.write(chunk)
    except HTTPException:
        if os.path.exists(upload_path):
            os.remove(upload_path)
        raise

    # Convert to WAV if needed (requires pydub)
    wav_path = await _ensure_wav(upload_path)

    # Create voice record
    voice = Voice(
        name=name,
        description=description,
        category="cloned",
        sample_path=wav_path,
    )
    db.add(voice)
    await db.flush()
    await db.refresh(voice)

    # Dispatch Celery task
    task = run_voice_cloning.apply_async(
        args=[voice.id, wav_path],
        queue="cloning",
    )

    logger.info(f"Cloning job dispatched for voice {voice.id} (task={task.id})")

    from datetime import datetime, timezone
    return CloningJobResponse(
        job_id=task.id,
        voice_id=voice.id,
        status=JobStatus.PENDING,
        message="Voice cloning started. Poll /api/v1/cloning/status/{job_id} for updates.",
        created_at=datetime.now(timezone.utc),
    )


@router.get("/status/{task_id}")
async def get_cloning_status(task_id: str):
    """Poll Celery task status for a cloning job."""
    from app.core.celery_app import celery_app
    task = celery_app.AsyncResult(task_id)

    state_map = {
        "PENDING": JobStatus.PENDING,
        "STARTED": JobStatus.PROCESSING,
        "SUCCESS": JobStatus.COMPLETED,
        "FAILURE": JobStatus.FAILED,
        "RETRY": JobStatus.PROCESSING,
    }

    return {
        "task_id": task_id,
        "status": state_map.get(task.state, JobStatus.PENDING),
        "result": task.result if task.state == "SUCCESS" else None,
        "error": str(task.info) if task.state == "FAILURE" else None,
    }


@router.delete("/{voice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cloned_voice(voice_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a cloned voice and all associated files."""
    voice = await db.get(Voice, voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    if voice.category != "cloned":
        raise HTTPException(status_code=400, detail="Can only delete cloned voices via this endpoint")

    for path in [voice.sample_path, voice.embedding_path]:
        if path and os.path.exists(path):
            os.remove(path)

    await db.delete(voice)


async def _ensure_wav(audio_path: str) -> str:
    """Convert audio to WAV if it isn't already."""
    if audio_path.endswith(".wav"):
        return audio_path

    wav_path = audio_path.rsplit(".", 1)[0] + ".wav"
    try:
        from pydub import AudioSegment  # type: ignore
        audio = AudioSegment.from_file(audio_path)
        audio.export(wav_path, format="wav")
        os.remove(audio_path)
        return wav_path
    except ImportError:
        logger.warning("pydub not installed — returning original file as-is")
        return audio_path
    except Exception as e:
        logger.error(f"Audio conversion failed: {e}")
        return audio_path
