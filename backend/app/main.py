from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_db
from app.api.routes import voices, synthesis, cloning, projects, health
from app.core.events import startup_event, shutdown_event

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await startup_event()
    await init_db()
    logger.info("✅ Application started")
    yield
    await shutdown_event()
    logger.info("🛑 Application shutdown")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ElevenLabs-style TTS & Voice Cloning API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(voices.router, prefix="/api/v1/voices", tags=["Voices"])
app.include_router(synthesis.router, prefix="/api/v1/synthesis", tags=["Synthesis"])
app.include_router(cloning.router, prefix="/api/v1/cloning", tags=["Voice Cloning"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
