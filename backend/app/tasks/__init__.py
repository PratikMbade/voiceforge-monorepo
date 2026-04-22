# Intentionally empty — Celery discovers tasks via the `include` list
# in app/core/celery_app.py. Do not import tasks here as it triggers
# the full Celery + SQLAlchemy stack during alembic/pytest startup.
