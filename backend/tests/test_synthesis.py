import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_submit_synthesis_voice_not_found(client: AsyncClient):
    """Should 404 if voice doesn't exist."""
    response = await client.post("/api/v1/synthesis", json={
        "text": "Hello world",
        "voice_id": "nonexistent-voice",
    })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_submit_synthesis_text_too_long(client: AsyncClient, sample_voice):
    """Should 422 if text exceeds max length."""
    response = await client.post("/api/v1/synthesis", json={
        "text": "a" * 6000,
        "voice_id": sample_voice.id,
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_submit_synthesis_success(client: AsyncClient, sample_voice):
    """Should accept job and return 202 with job_id."""
    with patch("app.api.routes.synthesis.run_synthesis") as mock_task:
        mock_result = MagicMock()
        mock_result.id = "celery-task-123"
        mock_task.apply_async.return_value = mock_result

        response = await client.post("/api/v1/synthesis", json={
            "text": "Hello, this is a test synthesis.",
            "voice_id": sample_voice.id,
            "model_id": "eleven_multilingual_v2",
        })

    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_get_synthesis_job_not_found(client: AsyncClient):
    response = await client.get("/api/v1/synthesis/nonexistent-job-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_synthesis_history(client: AsyncClient):
    response = await client.get("/api/v1/synthesis/history")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_serve_audio_path_traversal(client: AsyncClient):
    """Should reject path traversal attempts."""
    response = await client.get("/api/v1/synthesis/audio/../../../etc/passwd")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_serve_audio_not_found(client: AsyncClient):
    response = await client.get("/api/v1/synthesis/audio/nonexistent.wav")
    assert response.status_code == 404
