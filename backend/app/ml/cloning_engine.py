import os
import uuid
import logging
import numpy as np
from typing import Optional, Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)


class VoiceCloningEngine:
    """
    Voice cloning using speaker embeddings.
    Uses Resemblyzer to extract speaker embeddings from audio samples.
    """

    _instance: Optional["VoiceCloningEngine"] = None
    _encoder = None
    _is_loaded = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_model(self):
        if self._is_loaded:
            return
        try:
            from resemblyzer import VoiceEncoder  # type: ignore

            self._encoder = VoiceEncoder()
            self._is_loaded = True
            logger.info("✅ Voice encoder loaded")
        except ImportError:
            logger.warning("⚠️  Resemblyzer not installed — mock mode active")
            self._is_loaded = True

    def extract_embedding(self, audio_path: str) -> Tuple[str, float]:
        """
        Extract speaker embedding from audio file.

        Returns:
            Tuple of (embedding_path, quality_score)
        """
        self.load_model()

        embedding_id = str(uuid.uuid4())
        embedding_path = os.path.join(settings.VOICES_DIR, f"{embedding_id}.npy")

        try:
            if self._encoder is not None:
                from resemblyzer import preprocess_wav  # type: ignore

                wav = preprocess_wav(audio_path)
                embedding = self._encoder.embed_utterance(wav)
                np.save(embedding_path, embedding)
                quality = self._compute_quality_score(embedding)
            else:
                # Mock: save a random embedding for dev
                logger.info(f"[MOCK] Extracting embedding from {audio_path}")
                embedding = np.random.randn(256).astype(np.float32)
                np.save(embedding_path, embedding)
                quality = 0.85

            logger.info(f"✅ Embedding saved: {embedding_path} (quality={quality:.2f})")
            return embedding_path, quality

        except Exception as e:
            logger.error(f"Embedding extraction failed: {e}")
            raise

    def compute_similarity(self, embedding_path_1: str, embedding_path_2: str) -> float:
        """Cosine similarity between two voice embeddings."""
        try:
            e1 = np.load(embedding_path_1)
            e2 = np.load(embedding_path_2)
            similarity = float(
                np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2))
            )
            return max(0.0, min(1.0, similarity))
        except Exception as e:
            logger.error(f"Similarity computation failed: {e}")
            return 0.0

    def validate_audio(self, audio_path: str) -> Tuple[bool, str]:
        """
        Validate uploaded audio for cloning suitability.

        Returns:
            Tuple of (is_valid, message)
        """
        try:
            import wave

            with wave.open(audio_path, "r") as wav_file:
                frames = wav_file.getnframes()
                rate = wav_file.getframerate()
                duration = frames / float(rate)

            if duration < settings.CLONING_MIN_AUDIO_SECONDS:
                return (
                    False,
                    f"Audio too short: {duration:.1f}s (min {settings.CLONING_MIN_AUDIO_SECONDS}s)",
                )
            if duration > settings.CLONING_MAX_AUDIO_SECONDS:
                return (
                    False,
                    f"Audio too long: {duration:.1f}s (max {settings.CLONING_MAX_AUDIO_SECONDS}s)",
                )

            return True, f"Valid audio ({duration:.1f}s)"

        except Exception as e:
            return False, f"Invalid audio file: {str(e)}"

    def _compute_quality_score(self, embedding: np.ndarray) -> float:
        """Heuristic quality score based on embedding properties."""
        norm = float(np.linalg.norm(embedding))
        # Well-formed embeddings typically have norm close to 1 (normalized)
        quality = min(1.0, norm / max(norm, 1.0))
        return round(quality, 4)


# Singleton
cloning_engine = VoiceCloningEngine()
