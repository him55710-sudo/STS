from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class VisionSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="forbid",
        frozen=True,
    )

    model_name: str = Field(default="patrickjohncyh/fashion-clip", alias="VISION_MODEL_NAME")
    model_version: str = Field(default="fashionclip-v1", alias="VISION_MODEL_VERSION")
    embedding_dimension: int = Field(default=512, alias="VISION_EMBEDDING_DIMENSION", gt=0)
    image_size: int = Field(default=224, alias="VISION_IMAGE_SIZE", gt=0)
    device: str = Field(default="cpu", alias="VISION_DEVICE")


settings = VisionSettings()
