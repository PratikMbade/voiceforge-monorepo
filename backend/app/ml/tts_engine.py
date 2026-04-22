import os
import uuid
import time
import logging
import numpy as np
from typing import Optional, Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)


class TTSEngine:
    """
    Text-to-Speech engine wrapping Coqui TTS.
    Lazy-loaded on first use. Fork-safe via PID tracking.
    """

    _instance: Optional["TTSEngine"] = None
    _tts = None
    _is_loaded: bool = False
    _loaded_in_pid: int = -1

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_model(self, model_name: Optional[str] = None):
        """Load TTS model. Re-loads automatically in forked Celery workers."""
        current_pid = os.getpid()

        # Forked worker gets a copy of _is_loaded=True but _tts=None — force reload
        if self._is_loaded and self._loaded_in_pid != current_pid:
            logger.info(f"[PID {current_pid}] Forked worker — reloading TTS model")
            self._is_loaded = False
            self._tts = None

        if self._is_loaded:
            return

        try:
            from TTS.api import TTS  # type: ignore
            model = model_name or settings.TTS_MODEL
            logger.info(f"[PID {current_pid}] Loading TTS model: {model}")

            # Auto-accept XTTS v2 license (non-interactive for Celery workers)
            os.environ["COQUI_TOS_AGREED"] = "1"

            self._tts = TTS(model_name=model, progress_bar=False)
            self._is_loaded = True
            self._loaded_in_pid = current_pid
            logger.info(f"✅ TTS model loaded: {model}")

        except ImportError:
            logger.warning("⚠️  Coqui TTS not installed — mock mode active")
            self._is_loaded = True
            self._loaded_in_pid = current_pid

        except Exception as e:
            logger.error(f"❌ Failed to load TTS model: {e}", exc_info=True)
            raise

    def synthesize(
        self,
        text: str,
        voice_id: str,
        speaker_wav: Optional[str] = None,
        language: str = "en",
    ) -> Tuple[str, float]:
        """
        Synthesize text → WAV file.
        Returns (output_audio_path, duration_seconds).
        """
        self.load_model()

        output_filename = f"{uuid.uuid4()}.wav"
        output_path = os.path.join(settings.AUDIO_OUTPUT_DIR, output_filename)
        os.makedirs(settings.AUDIO_OUTPUT_DIR, exist_ok=True)

        start_time = time.time()

        if self._tts is not None:
            logger.info(f"🎙️  Synthesizing {len(text)} chars via Coqui TTS...")
            try:
                is_multi_speaker = self._tts.is_multi_speaker
                is_multi_lingual = self._tts.is_multi_lingual

                if speaker_wav and os.path.exists(speaker_wav):
                    # Voice cloning — use uploaded speaker audio sample
                    self._tts.tts_to_file(
                        text=text,
                        speaker_wav=speaker_wav,
                        language=language if is_multi_lingual else None,
                        file_path=output_path,
                    )
                elif is_multi_speaker:
                    # XTTS v2 — must provide a speaker name or wav
                    # Use configured default or first available built-in speaker
                    default_speaker = getattr(settings, "TTS_DEFAULT_SPEAKER", None)
                    if default_speaker:
                        speaker = default_speaker
                    else:
                        speakers = self._tts.speakers or []
                        speaker = speakers[0] if speakers else "Claribel Dervla"
                    logger.info(f"Using built-in speaker: {speaker}")
                    self._tts.tts_to_file(
                        text=text,
                        speaker=speaker,
                        language=language if is_multi_lingual else None,
                        file_path=output_path,
                    )
                else:
                    # Single-speaker model (tacotron2-DDC etc.)
                    self._tts.tts_to_file(
                        text=text,
                        file_path=output_path,
                    )

            except Exception as e:
                logger.error(f"TTS synthesis error: {e}", exc_info=True)
                raise

        else:
            # TTS not available — generate mock beep
            logger.warning("[MOCK MODE] TTS not loaded — generating beep audio")
            self._generate_mock_audio(output_path)

        elapsed = time.time() - start_time
        duration = self._get_audio_duration(output_path)
        logger.info(f"✅ Audio ready in {elapsed:.2f}s — {duration:.1f}s of audio")
        return output_path, duration

    def _generate_mock_audio(self, output_path: str, duration_sec: float = 2.0):
        """Fallback: sine-wave beep when TTS is unavailable."""
        import wave
        import struct
        sample_rate = settings.AUDIO_SAMPLE_RATE
        num_samples = int(sample_rate * duration_sec)
        with wave.open(output_path, "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            samples = [
                int(1000 * np.sin(2 * np.pi * 440 * i / sample_rate))
                for i in range(num_samples)
            ]
            wf.writeframes(struct.pack(f"<{num_samples}h", *samples))

    def _get_audio_duration(self, audio_path: str) -> float:
        """Get WAV duration in seconds."""
        try:
            import wave
            with wave.open(audio_path, "r") as wf:
                return wf.getnframes() / float(wf.getframerate())
        except Exception:
            return 0.0


# Singleton — each Celery worker process gets its own instance via fork-safety above
tts_engine = TTSEngine()