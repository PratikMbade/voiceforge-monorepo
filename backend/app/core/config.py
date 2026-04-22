from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "VoiceForge API"
    VERSION: str = "1.0.0"
    ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://frontend:5173",
    ]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./voiceforge.db"
    # For production: postgresql+asyncpg://user:pass@host/db

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # ML / Model paths
    MODELS_DIR: str = "./models"
    VOICES_DIR: str = "./storage/voices"
    AUDIO_OUTPUT_DIR: str = "./storage/audio"
    UPLOADS_DIR: str = "./storage/uploads"

    # TTS settings
    TTS_MODEL: str = "tts_models/multilingual/multi-dataset/xtts_v2"
    TTS_VOCODER: str = "vocoder_models/en/ljspeech/multiband-melgan"
    TTS_DEFAULT_SPEAKER: str = "Claribel Dervla"

    DEFAULT_SPEAKER_WAV: str = ""
    MAX_TEXT_LENGTH: int = 5000
    AUDIO_SAMPLE_RATE: int = 22050

    # Voice Cloning
    CLONING_MIN_AUDIO_SECONDS: float = 6.0
    CLONING_MAX_AUDIO_SECONDS: float = 180.0

    # MLflow
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MLFLOW_EXPERIMENT_NAME: str = "voiceforge-tts"

    # File Storage
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_AUDIO_TYPES: List[str] = ["audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg", "audio/flac"]

    # Task queue
    TASK_TIME_LIMIT: int = 300  # 5 min per task
    TASK_SOFT_TIME_LIMIT: int = 240

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"        # ← add this line



settings = Settings()

# Ensure storage directories exist
for directory in [
    settings.MODELS_DIR,
    settings.VOICES_DIR,
    settings.AUDIO_OUTPUT_DIR,
    settings.UPLOADS_DIR,
]:
    os.makedirs(directory, exist_ok=True)
