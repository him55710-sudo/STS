from __future__ import annotations

import base64
from contextlib import asynccontextmanager
from typing import Protocol

from fastapi import FastAPI, HTTPException
from app.config import settings
from app.model import InvalidImageError, LoadedModel, ModelUnavailableError, decode_image, normalize_embedding
from app.schemas import EmbedRequest, EmbedResponse, HealthResponse

_MODEL: LoadedModel | None = None


class TorchTensor(Protocol):
    def unsqueeze(self, dim: int) -> TorchTensor: ...
    def detach(self) -> TorchTensor: ...
    def cpu(self) -> TorchTensor: ...
    def float(self) -> TorchTensor: ...
    def tolist(self) -> list[float]: ...


class Preprocess(Protocol):
    def __call__(self, image: object) -> TorchTensor: ...


class OpenClipModel(Protocol):
    def encode_image(self, tensor: TorchTensor) -> TorchTensor: ...


def load_model() -> LoadedModel:
    try:
        import open_clip
        import torch
        from PIL import Image  # noqa: F401
    except ModuleNotFoundError as exc:
        raise ModelUnavailableError("open_clip_torch and torch must be installed to start the worker") from exc

    model, _, preprocess = open_clip.create_model_and_transforms(settings.model_name, device=settings.device)
    tokenizer = open_clip.get_tokenizer(settings.model_name)
    _ = tokenizer
    return LoadedModel(
        model_name=settings.model_name,
        model_version=settings.model_version,
        embedding_dimension=settings.embedding_dimension,
        image_size=settings.image_size,
        encode_image=lambda image: _encode_with_open_clip(model, preprocess, image),
    )


def _encode_with_open_clip(model: OpenClipModel, preprocess: Preprocess, image: object) -> list[float]:
    tensor = preprocess(image).unsqueeze(0)
    with __import__("torch").no_grad():
        features = model.encode_image(tensor)
    return features[0].detach().cpu().float().tolist()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _MODEL
    _MODEL = load_model()
    yield
    _MODEL = None


app = FastAPI(lifespan=lifespan)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    model = _require_model()
    return HealthResponse(
        status="ok",
        model_name=model.model_name,
        model_version=model.model_version,
        embedding_dimension=model.embedding_dimension,
    )


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest) -> EmbedResponse:
    model = _require_model()
    try:
        image_bytes = base64.b64decode(request.image_base64, validate=True)
        image = decode_image(image_bytes)
        embedding = normalize_embedding(model.encode_image(image), model.embedding_dimension)
    except (ValueError, InvalidImageError) as exc:
        raise HTTPException(status_code=422, detail="invalid image payload") from exc
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail="embedding model failure") from exc
    return EmbedResponse(
        model_name=model.model_name,
        model_version=model.model_version,
        embedding_dimension=model.embedding_dimension,
        embedding=embedding,
    )


def _require_model() -> LoadedModel:
    if _MODEL is None:
        raise HTTPException(status_code=503, detail="embedding model is not loaded")
    return _MODEL
