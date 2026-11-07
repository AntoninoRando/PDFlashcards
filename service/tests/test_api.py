import pytest
from fastapi.testclient import TestClient

from app import config
from app.main import fastapi_app


@pytest.fixture
def client():
    return TestClient(fastapi_app)


def test_ping(client):
    response = client.get("/api/ping")
    assert response.status_code == 200
    assert response.json() == "pong!"


def test_parse_studyset(client):
    lines = ["[Title]", "Test", "[Cards]", "A card .. 3"]
    response = client.post("/api/flashcards/parse", json={"lines": lines})
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["title"] == "Test"
    assert data["flashcards"][0]["text"] == "A card"


def test_parse_invalid_studyset(client):
    response = client.post("/api/flashcards/parse", json={"lines": ["[Nope]", "x"]})
    assert response.status_code == 400


def test_autosave_writes_file(client, tmp_path, monkeypatch):
    target = tmp_path / "autosave.txt"
    monkeypatch.setattr(config, "AUTOSAVE_PATH", target)
    response = client.post("/api/studyset/autosave", json={"content": "[Title]\nX"})
    assert response.status_code == 200
    assert target.read_bytes() == b"[Title]\nX"


def test_autosave_rejects_invalid_payload(client):
    response = client.post("/api/studyset/autosave", json={"content": 3})
    assert response.status_code == 422


def test_camera_status_when_disabled(client):
    response = client.get("/api/camera/status")
    assert response.status_code == 200
    assert response.json()["enabled"] is False
