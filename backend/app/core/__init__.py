# Intentionally empty — import directly from submodules to avoid
# circular imports during alembic migrations and celery startup:
#
#   from app.core.config import settings
#   from app.core.database import get_db, Base
#   from app.core.celery_app import celery_app
