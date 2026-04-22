import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    response = await client.post("/api/v1/projects", json={
        "name": "My Audiobook",
        "description": "Chapter narrations",
        "default_model_id": "eleven_multilingual_v2",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Audiobook"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient):
    await client.post("/api/v1/projects", json={"name": "Project Alpha"})
    await client.post("/api/v1/projects", json={"name": "Project Beta"})

    response = await client.get("/api/v1/projects")
    assert response.status_code == 200
    projects = response.json()
    assert len(projects) >= 2


@pytest.mark.asyncio
async def test_get_project_not_found(client: AsyncClient):
    response = await client.get("/api/v1/projects/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient):
    create_resp = await client.post("/api/v1/projects", json={"name": "Old Name"})
    project_id = create_resp.json()["id"]

    update_resp = await client.patch(f"/api/v1/projects/{project_id}", json={"name": "New Name"})
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient):
    create_resp = await client.post("/api/v1/projects", json={"name": "To Delete"})
    project_id = create_resp.json()["id"]

    delete_resp = await client.delete(f"/api/v1/projects/{project_id}")
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/projects/{project_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_project_history(client: AsyncClient):
    create_resp = await client.post("/api/v1/projects", json={"name": "History Test"})
    project_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/projects/{project_id}/history")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
