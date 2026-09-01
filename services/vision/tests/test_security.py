from __future__ import annotations

import base64
import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import ValidationError

from app import main
from app.model import InvalidImageError, MAX_IMAGE_BYTES, decode_image
from app.schemas import EmbedRequest, MAX_IMAGE_BASE64_LENGTH


class DummyModel:
    model_name = "patrickjohncyh/fashion-clip"
    model_version = "fashionclip-v1"
    embedding_dimension = 4

    def encode_image(self, _: object) -> list[float]:
        return [0.1, 0.2, 0.3, 0.4]


def test_embed_request_rejects_oversized_base64_boundary() -> None:
    with pytest.raises(ValidationError):
        EmbedRequest(
            image_base64="A" * (MAX_IMAGE_BASE64_LENGTH + 1),
            image_mime_type="image/png",
        )


def test_decode_image_rejects_oversized_encoded_bytes() -> None:
    with pytest.raises(InvalidImageError):
        decode_image(b"0" * (MAX_IMAGE_BYTES + 1))


def test_embed_rejects_pixel_bomb_before_model_execution(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "_MODEL", DummyModel())
    client = TestClient(main.app)

    buffer = io.BytesIO()
    Image.new("RGB", (2_001, 2_000), color=(255, 255, 255)).save(buffer, format="PNG")
    png = base64.b64encode(buffer.getvalue()).decode("ascii")

    response = client.post("/embed", json={"image_base64": png, "image_mime_type": "image/png"})

    assert response.status_code == 422
