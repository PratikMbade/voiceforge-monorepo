from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Voice(Base):
    __tablename__ = "voices"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="cloned")       # cloned | premade
    labels = Column(JSON, default=dict)                    # {accent, age, gender, use_case}

    # Audio sample paths
    preview_url = Column(String(500), nullable=True)
    sample_path = Column(String(500), nullable=True)       # Raw uploaded sample
    embedding_path = Column(String(500), nullable=True)    # Speaker embedding .npy

    # Voice settings
    stability = Column(Float, default=0.75)
    similarity_boost = Column(Float, default=0.75)
    style = Column(Float, default=0.0)
    use_speaker_boost = Column(Boolean, default=True)

    # Meta
    is_public = Column(Boolean, default=False)
    owner_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
