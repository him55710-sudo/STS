from __future__ import annotations

import base64
import io

import pytest

from fastapi.testclient import TestClient
from PIL import Image

from app import main


class DummyModel:
    model_name = "patrickjohncyh/fashion-clip"
    model_version = "fashionclip-v1"
    embedding_dimension = 4

    def encode_image(self, _: object) -> list[float]:
        return [0.1, 0.2, 0.3, 0.4]


def test_health_and_embed_when_model_is_loaded(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "_MODEL", DummyModel())
    client = TestClient(main.app)

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["embedding_dimension"] == 4

    buffer = io.BytesIO()
    Image.new("RGB", (1, 1), color=(255, 255, 255)).save(buffer, format="PNG")
    png = base64.b64encode(buffer.getvalue()).decode("ascii")
    response = client.post("/embed", json={"image_base64": png, "image_mime_type": "image/png"})
    assert response.status_code == 200
    assert response.json()["embedding"] == [0.1, 0.2, 0.3, 0.4]


def test_embed_rejects_invalid_image(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "_MODEL", DummyModel())
    client = TestClient(main.app)

    response = client.post(
        "/embed",
        json={"image_base64": base64.b64encode(b"not an image").decode("ascii"), "image_mime_type": "image/png"},
    )
    assert response.status_code == 422
