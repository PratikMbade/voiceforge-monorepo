import logging
from typing import Optional, Dict, Any
from functools import wraps

from app.core.config import settings

logger = logging.getLogger(__name__)


class MLflowTracker:
    """Wrapper around MLflow for experiment tracking."""

    _client = None
    _available = False

    @classmethod
    def _get_client(cls):
        if cls._client is None:
            try:
                import mlflow  # type: ignore
                mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
                mlflow.set_experiment(settings.MLFLOW_EXPERIMENT_NAME)
                cls._client = mlflow
                cls._available = True
                logger.info("✅ MLflow connected")
            except Exception as e:
                logger.warning(f"MLflow not available: {e}")
                cls._available = False
        return cls._client

    @classmethod
    def log_synthesis(
        cls,
        job_id: str,
        voice_id: str,
        text_length: int,
        duration_seconds: float,
        latency_seconds: float,
        model_id: str,
    ):
        """Log a synthesis run to MLflow."""
        client = cls._get_client()
        if not cls._available or client is None:
            return

        try:
            with client.start_run(run_name=f"synthesis_{job_id[:8]}"):
                client.log_params({
                    "job_id": job_id,
                    "voice_id": voice_id,
                    "model_id": model_id,
                })
                client.log_metrics({
                    "text_length": text_length,
                    "audio_duration_s": duration_seconds,
                    "synthesis_latency_s": latency_seconds,
                    "chars_per_second": text_length / max(latency_seconds, 0.001),
                })
        except Exception as e:
            logger.warning(f"MLflow logging failed (non-fatal): {e}")

    @classmethod
    def log_cloning(
        cls,
        voice_id: str,
        audio_duration: float,
        quality_score: float,
        processing_time: float,
    ):
        """Log a voice cloning run to MLflow."""
        client = cls._get_client()
        if not cls._available or client is None:
            return

        try:
            with client.start_run(run_name=f"cloning_{voice_id[:8]}"):
                client.log_params({"voice_id": voice_id})
                client.log_metrics({
                    "input_audio_duration_s": audio_duration,
                    "embedding_quality_score": quality_score,
                    "processing_time_s": processing_time,
                })
        except Exception as e:
            logger.warning(f"MLflow logging failed (non-fatal): {e}")

    @classmethod
    def register_model(
        cls,
        model_path: str,
        model_name: str,
        metrics: Optional[Dict[str, Any]] = None,
    ):
        """Register a model in the MLflow model registry."""
        client = cls._get_client()
        if not cls._available or client is None:
            return None

        try:
            with client.start_run(run_name=f"register_{model_name}"):
                if metrics:
                    client.log_metrics(metrics)
                result = client.register_model(
                    f"runs:/{client.active_run().info.run_id}/{model_name}",
                    model_name,
                )
                logger.info(f"✅ Model registered: {model_name} v{result.version}")
                return result
        except Exception as e:
            logger.warning(f"Model registration failed: {e}")
            return None


tracker = MLflowTracker()
