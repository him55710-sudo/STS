from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Final, Protocol

from PIL import Image, UnidentifiedImageError
from PIL.Image import DecompressionBombError

MAX_IMAGE_BYTES: Final = 100 * 1024
MAX_IMAGE_PIXELS: Final = 4_000_000


class ImageEncoder(Protocol):
    def __call__(self, image: Image.Image) -> list[float]: ...


@dataclass(frozen=True, slots=True)
class LoadedModel:
    model_name: str
    model_version: str
    embedding_dimension: int
    image_size: int
    encode_image: ImageEncoder


class ModelUnavailableError(RuntimeError):
    pass


class InvalidImageError(RuntimeError):
    pass


def decode_image(data: bytes) -> Image.Image:
    if len(data) == 0 or len(data) > MAX_IMAGE_BYTES:
        raise InvalidImageError("image payload exceeds byte limit")
    try:
        image = Image.open(BytesIO(data))
        if image.width * image.height > MAX_IMAGE_PIXELS:
            raise InvalidImageError("image payload exceeds pixel limit")
        image.load()
    except (DecompressionBombError, UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("invalid image payload") from exc
    return image.convert("RGB")


def normalize_embedding(values: list[float], dimension: int) -> list[float]:
    if len(values) != dimension:
        raise ModelUnavailableError("model returned the wrong embedding dimension")
    return [float(value) for value in values]
