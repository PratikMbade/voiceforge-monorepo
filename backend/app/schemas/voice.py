from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class VoiceSettings(BaseModel):
    stability: float = Field(0.75, ge=0.0, le=1.0)
    similarity_boost: float = Field(0.75, ge=0.0, le=1.0)
    style: float = Field(0.0, ge=0.0, le=1.0)
    use_speaker_boost: bool = True


class VoiceLabels(BaseModel):
    accent: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    use_case: Optional[str] = None
    language: Optional[str] = "en"


class VoiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    labels: Optional[VoiceLabels] = None
    settings: Optional[VoiceSettings] = None


class VoiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    labels: Optional[VoiceLabels] = None
    settings: Optional[VoiceSettings] = None


class VoiceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    category: str
    labels: Optional[Dict[str, Any]]
    preview_url: Optional[str]
    stability: float
    similarity_boost: float
    style: float
    use_speaker_boost: bool
    is_public: bool
    created_at: datetime

    model_config = {"from_attributes": True}
