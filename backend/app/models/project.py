from sqlalchemy import Column, String, Float, DateTime, Text, Integer, JSON, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SynthesisJob(Base):
    __tablename__ = "synthesis_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    celery_task_id = Column(String, nullable=True, index=True)

    # Input
    text = Column(Text, nullable=False)
    voice_id = Column(String, nullable=False)
    model_id = Column(String, default="eleven_multilingual_v2")

    # Voice settings at time of generation
    voice_settings = Column(JSON, default=dict)

    # Output
    audio_url = Column(String(500), nullable=True)
    audio_path = Column(String(500), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    characters_used = Column(Integer, nullable=True)

    # Status
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    error_message = Column(Text, nullable=True)

    # Meta
    project_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    default_voice_id = Column(String, nullable=True)
    default_model_id = Column(String, default="eleven_multilingual_v2")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
