import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_list_voices_empty(client: AsyncClient):
    response = await client.get("/api/v1/voices")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_voice(client: AsyncClient):
    payload = {
        "name": "Aria",
        "description": "A warm, natural voice",
        "labels": {"accent": "american", "gender": "female", "age": "young"},
        "settings": {
            "stability": 0.8,
            "similarity_boost": 0.9,
            "style": 0.1,
            "use_speaker_boost": True,
        },
    }
    response = await client.post("/api/v1/voices", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Aria"
    assert data["stability"] == 0.8
    assert "id" in data


@pytest.mark.asyncio
async def test_get_voice(client: AsyncClient, sample_voice):
    response = await client.get(f"/api/v1/voices/{sample_voice.id}")
    assert response.status_code == 200
    assert response.json()["id"] == sample_voice.id


@pytest.mark.asyncio
async def test_get_voice_not_found(client: AsyncClient):
    response = await client.get("/api/v1/voices/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_voice(client: AsyncClient, sample_voice):
    response = await client.patch(
        f"/api/v1/voices/{sample_voice.id}",
        json={"name": "Updated Name", "description": "Updated description"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_update_voice_settings(client: AsyncClient, sample_voice):
    response = await client.post(
        f"/api/v1/voices/{sample_voice.id}/settings",
        json={
            "stability": 0.5,
            "similarity_boost": 0.6,
            "style": 0.2,
            "use_speaker_boost": False,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["stability"] == 0.5
    assert data["similarity_boost"] == 0.6


@pytest.mark.asyncio
async def test_delete_voice(client: AsyncClient, db_session: AsyncSession):
    # Create a voice to delete
    create_resp = await client.post("/api/v1/voices", json={"name": "To Delete"})
    assert create_resp.status_code == 201
    voice_id = create_resp.json()["id"]

    delete_resp = await client.delete(f"/api/v1/voices/{voice_id}")
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/voices/{voice_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_filter_voices_by_category(client: AsyncClient):
    await client.post("/api/v1/voices", json={"name": "Premade Voice"})
    response = await client.get("/api/v1/voices?category=premade")
    assert response.status_code == 200
    voices = response.json()
    for v in voices:
        assert v["category"] == "premade"
