# VoiceForge Backend — Install Guide

## The golden rule
**Every command must be run inside the venv.**
Always activate first: `source venv/bin/activate`
You should see `(venv)` at the start of your terminal prompt.

---

## macOS Apple Silicon (M1 / M2 / M3) — Python 3.9

### Step 1 — Install system dependencies
```bash
brew install python@3.9 redis ffmpeg
```

### Step 2 — Create and activate the virtual environment
```bash
cd "backend 3"          # or whatever your folder is named
python3.9 -m venv venv
source venv/bin/activate
# ✅ Your prompt should now show (venv)
```

### Step 3 — Install all Python packages (inside venv)
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> ⚠️ If `TTS==0.22.0` fails on ARM64, install it without deps then patch:
> ```bash
> pip install TTS==0.22.0 --no-deps
> pip install trainer coqpit bangla anyascii gruut inflect
> ```

### Step 4 — Set up environment variables
```bash
cp .env.example .env
# Defaults work for local dev — no changes needed
```

### Step 5 — Start Redis (required for Celery)
```bash
brew services start redis
redis-cli ping    # should print: PONG
```

### Step 6 — Run database migrations (inside venv)
```bash
# Make sure (venv) is active!
alembic upgrade head
# ✅ Should print: INFO Running upgrade -> <revision>, ...
```

### Step 7 — Start the API server (inside venv)
```bash
uvicorn app.main:app --reload --port 8000
# ✅ API docs: http://localhost:8000/api/docs
# ✅ Health:   http://localhost:8000/api/health
```

### Step 8 — Start Celery worker (new terminal tab, inside venv)
```bash
cd "backend 3"
source venv/bin/activate
celery -A app.core.celery_app worker \
  --loglevel=info \
  --queues=synthesis,cloning \
  --concurrency=2
```

### Step 9 — (Optional) Start MLflow (new terminal tab, inside venv)
```bash
source venv/bin/activate
mlflow server --host 0.0.0.0 --port 5000
# ✅ MLflow UI: http://localhost:5000
```

---

## Common errors

| Error | Fix |
|---|---|
| `zsh: command not found: alembic` | You ran it outside the venv. Run `source venv/bin/activate` first |
| `ModuleNotFoundError: No module named 'pydantic_settings'` | Same — not inside venv |
| `ModuleNotFoundError: No module named 'X'` | Run `pip install -r requirements.txt` inside the venv |
| `redis.exceptions.ConnectionError` | Redis isn't running. Run `brew services start redis` |
| `ERROR: Could not find a version that satisfies scipy==1.14.1` | You have an old requirements.txt — use the latest one from the zip |

---

## Quick sanity check after install
```bash
# All of these should return the module version, not an error:
python -c "import fastapi; print(fastapi.__version__)"
python -c "import sqlalchemy; print(sqlalchemy.__version__)"
python -c "import celery; print(celery.__version__)"
python -c "import alembic; print(alembic.__version__)"
```
