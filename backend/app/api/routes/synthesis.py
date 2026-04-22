import os
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.config import settings
from app.models.project import SynthesisJob, JobStatus
from app.models.voice import Voice
from app.schemas.synthesis import (
    SynthesisRequest,
    SynthesisResponse,
    SynthesisJobDetail,
)
from app.tasks.synthesis_tasks import run_synthesis

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=SynthesisResponse, status_code=status.HTTP_202_ACCEPTED)
async def submit_synthesis(
    request: SynthesisRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a text-to-speech synthesis job.
    Returns immediately with job_id; poll /status/{job_id} for result.
    """
    # Validate voice exists
    voice = await db.get(Voice, request.voice_id)
    if not voice:
        raise HTTPException(
            status_code=404, detail=f"Voice '{request.voice_id}' not found"
        )

    # Validate text length
    if len(request.text) > settings.MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"Text exceeds max length ({settings.MAX_TEXT_LENGTH} chars)",
        )

    # Create job record
    voice_settings = {}
    if request.voice_settings:
        voice_settings = request.voice_settings.model_dump()
    else:
        voice_settings = {
            "stability": voice.stability,
            "similarity_boost": voice.similarity_boost,
            "style": voice.style,
        }

    job = SynthesisJob(
        text=request.text,
        voice_id=request.voice_id,
        model_id=request.model_id,
        voice_settings=voice_settings,
        project_id=request.project_id,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)
    await db.commit()

    # Dispatch Celery task
    task = run_synthesis.apply_async(
        args=[job.id],
        queue="synthesis",
    )
    job.celery_task_id = task.id
    await db.flush()

    logger.info(f"Synthesis job {job.id} queued (task={task.id})")
    return job


@router.get("/history", response_model=List[SynthesisJobDetail])
async def get_history(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get synthesis history."""
    result = await db.execute(
        select(SynthesisJob)
        .order_by(desc(SynthesisJob.created_at))
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.get("/{job_id}", response_model=SynthesisJobDetail)
async def get_synthesis_status(job_id: str, db: AsyncSession = Depends(get_db)):
    """Poll synthesis job status and result."""
    job = await db.get(SynthesisJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/audio/{filename}")
async def serve_audio(filename: str):
    """Serve generated audio file."""
    # Security: only allow filenames (no path traversal)
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    audio_path = os.path.join(settings.AUDIO_OUTPUT_DIR, filename)
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        audio_path,
        media_type="audio/wav",
        filename=filename,
        headers={"Accept-Ranges": "bytes"},
    )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_synthesis(job_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a synthesis job and its audio file."""
    job = await db.get(SynthesisJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Clean up audio file
    if job.audio_path and os.path.exists(job.audio_path):
        os.remove(job.audio_path)

    await db.delete(job)
