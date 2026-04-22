import os
import uuid
import shutil
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.models.voice import Voice
from app.schemas.voice import VoiceCreate, VoiceUpdate, VoiceResponse, VoiceSettings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=List[VoiceResponse])
async def list_voices(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all voices in the library."""
    query = select(Voice)
    if category:
        query = query.where(Voice.category == category)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{voice_id}", response_model=VoiceResponse)
async def get_voice(voice_id: str, db: AsyncSession = Depends(get_db)):
    voice = await db.get(Voice, voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    return voice


@router.post("", response_model=VoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_voice(
    data: VoiceCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new premade/base voice entry."""
    voice = Voice(
        name=data.name,
        description=data.description,
        category="premade",
        labels=data.labels.model_dump() if data.labels else {},
        stability=data.settings.stability if data.settings else 0.75,
        similarity_boost=data.settings.similarity_boost if data.settings else 0.75,
        style=data.settings.style if data.settings else 0.0,
        use_speaker_boost=data.settings.use_speaker_boost if data.settings else True,
    )
    db.add(voice)
    await db.flush()
    await db.refresh(voice)
    return voice


@router.patch("/{voice_id}", response_model=VoiceResponse)
async def update_voice(
    voice_id: str,
    data: VoiceUpdate,
    db: AsyncSession = Depends(get_db),
):
    voice = await db.get(Voice, voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    update_data = data.model_dump(exclude_unset=True)
    if "settings" in update_data and update_data["settings"]:
        s = update_data.pop("settings")
        for k, v in s.items():
            setattr(voice, k, v)
    if "labels" in update_data:
        voice.labels = update_data.pop("labels")

    for key, value in update_data.items():
        setattr(voice, key, value)

    await db.flush()
    await db.refresh(voice)
    return voice


@router.delete("/{voice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voice(voice_id: str, db: AsyncSession = Depends(get_db)):
    voice = await db.get(Voice, voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    # Clean up files
    for path in [voice.sample_path, voice.embedding_path, voice.preview_url]:
        if path and os.path.exists(path):
            os.remove(path)

    await db.delete(voice)


@router.post("/{voice_id}/settings", response_model=VoiceResponse)
async def update_voice_settings(
    voice_id: str,
    settings_data: VoiceSettings,
    db: AsyncSession = Depends(get_db),
):
    """Update voice generation settings (stability, similarity_boost, etc.)."""
    voice = await db.get(Voice, voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    voice.stability = settings_data.stability
    voice.similarity_boost = settings_data.similarity_boost
    voice.style = settings_data.style
    voice.use_speaker_boost = settings_data.use_speaker_boost

    await db.flush()
    await db.refresh(voice)
    return voice
