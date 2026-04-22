from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.project import JobStatus
from app.schemas.voice import VoiceSettings
from pydantic import BaseModel, Field, model_validator


# ─── Synthesis ──────────────────────────────────────────────────────────────

class SynthesisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: str
    model_id: str = "eleven_multilingual_v2"
    voice_settings: Optional[VoiceSettings] = None
    project_id: Optional[str] = None


class SynthesisResponse(BaseModel):
    job_id: Optional[str] = None
    id: Optional[str] = None
    status: JobStatus
    audio_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    characters_used: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def set_job_id(self) -> "SynthesisResponse":
        if not self.job_id and self.id:
            self.job_id = self.id
        return self

class SynthesisJobDetail(SynthesisResponse):
    text: str
    voice_id: str
    model_id: str
    voice_settings: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    completed_at: Optional[datetime] = None
    file_size_bytes: Optional[int] = None


# ─── Projects ────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    default_voice_id: Optional[str] = None
    default_model_id: str = "eleven_multilingual_v2"


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    default_voice_id: Optional[str] = None
    default_model_id: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    default_voice_id: Optional[str]
    default_model_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Voice Cloning ───────────────────────────────────────────────────────────

class CloningJobResponse(BaseModel):
    job_id: str
    voice_id: Optional[str] = None
    status: JobStatus
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}
