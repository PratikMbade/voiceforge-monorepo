import os

# Must be set BEFORE any torch/MPS imports — fixes macOS fork() crash with Metal
os.environ["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES"
os.environ["TOKENIZERS_PARALLELISM"] = "false"  # avoids HuggingFace fork warning

from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "voiceforge",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.synthesis_tasks",
        "app.tasks.cloning_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.TASK_TIME_LIMIT,
    task_soft_time_limit=settings.TASK_SOFT_TIME_LIMIT,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=50,
    result_expires=3600,
    worker_pool="solo",  # ← solo pool: no fork, fixes macOS MPS crash
    task_routes={
        "app.tasks.synthesis_tasks.*": {"queue": "synthesis"},
        "app.tasks.cloning_tasks.*": {"queue": "cloning"},
    },
)
