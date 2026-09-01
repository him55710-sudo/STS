from __future__ import annotations

from typing import Annotated, Final

from pydantic import BaseModel, ConfigDict, Field

from app.model import MAX_IMAGE_BYTES

MAX_IMAGE_BASE64_LENGTH: Final = 4 * ((MAX_IMAGE_BYTES + 2) // 3)


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    status: str
    model_name: str
    model_version: str
    embedding_dimension: int


class EmbedRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    image_base64: Annotated[str, Field(min_length=1, max_length=MAX_IMAGE_BASE64_LENGTH)]
    image_mime_type: Annotated[str, Field(min_length=5, pattern=r"^image/[a-z0-9.+-]+$")]


class EmbedResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    model_name: str
    model_version: str
    embedding_dimension: int
    embedding: list[float]
