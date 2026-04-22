import os
import struct
import wave
import numpy as np

from app.ml.tts_engine import TTSEngine
from app.ml.cloning_engine import VoiceCloningEngine


def make_wav(path: str, duration_sec: float = 3.0, sample_rate: int = 22050):
    """Helper: create a real WAV file for testing."""
    num_samples = int(sample_rate * duration_sec)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        samples = [
            int(500 * np.sin(2 * np.pi * 440 * i / sample_rate))
            for i in range(num_samples)
        ]
        wf.writeframes(struct.pack(f"<{num_samples}h", *samples))


class TestTTSEngine:
    def test_singleton(self):
        engine1 = TTSEngine()
        engine2 = TTSEngine()
        assert engine1 is engine2

    def test_mock_synthesis(self, tmp_path):
        """Engine should produce a WAV file in mock mode."""
        engine = TTSEngine()
        engine._is_loaded = True  # Skip actual model loading
        engine._tts = None  # Force mock mode

        import unittest.mock as mock

        with mock.patch.object(engine, "_generate_mock_audio") as mock_gen:
            mock_gen.side_effect = lambda p, **kw: make_wav(p, 2.0)
            audio_path, duration = engine.synthesize(
                text="Hello world",
                voice_id="test-voice",
            )
        assert audio_path.endswith(".wav")

    def test_get_audio_duration(self, tmp_path):
        wav_path = str(tmp_path / "test.wav")
        make_wav(wav_path, duration_sec=2.5)
        engine = TTSEngine()
        duration = engine._get_audio_duration(wav_path)
        assert abs(duration - 2.5) < 0.1


class TestVoiceCloningEngine:
    def test_singleton(self):
        e1 = VoiceCloningEngine()
        e2 = VoiceCloningEngine()
        assert e1 is e2

    def test_validate_audio_too_short(self, tmp_path):
        wav_path = str(tmp_path / "short.wav")
        make_wav(wav_path, duration_sec=2.0)  # below 6s minimum
        engine = VoiceCloningEngine()
        is_valid, msg = engine.validate_audio(wav_path)
        assert is_valid is False
        assert "too short" in msg.lower()

    def test_validate_audio_valid(self, tmp_path):
        wav_path = str(tmp_path / "good.wav")
        make_wav(wav_path, duration_sec=10.0)
        engine = VoiceCloningEngine()
        is_valid, msg = engine.validate_audio(wav_path)
        assert is_valid is True

    def test_mock_embedding_extraction(self, tmp_path, monkeypatch):
        """Should save a .npy embedding file in mock mode."""
        wav_path = str(tmp_path / "sample.wav")
        make_wav(wav_path, duration_sec=10.0)

        engine = VoiceCloningEngine()
        engine._is_loaded = True
        engine._encoder = None  # Force mock mode

        # Patch storage dir to tmp
        monkeypatch.setattr("app.ml.cloning_engine.settings.VOICES_DIR", str(tmp_path))

        emb_path, quality = engine.extract_embedding(wav_path)
        assert os.path.exists(emb_path)
        assert emb_path.endswith(".npy")
        assert 0.0 <= quality <= 1.0

    def test_compute_similarity(self, tmp_path):
        e1 = np.random.randn(256).astype(np.float32)
        e2 = e1.copy()  # identical → similarity ≈ 1.0
        p1 = str(tmp_path / "e1.npy")
        p2 = str(tmp_path / "e2.npy")
        np.save(p1, e1)
        np.save(p2, e2)

        engine = VoiceCloningEngine()
        sim = engine.compute_similarity(p1, p2)
        assert abs(sim - 1.0) < 0.001
