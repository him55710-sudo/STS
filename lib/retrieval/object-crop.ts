import type { DetectedObject } from "../types";

type NormalizedBox = Pick<DetectedObject, "x" | "y" | "w" | "h">;

type CropRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type CropRectInput = {
  readonly box: NormalizedBox;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly paddingRatio?: number;
};

export type CropMode = "polygon" | "bbox";

const MAX_CROP_EDGE = 448;
const MAX_IMAGE_BYTES = 96 * 1024;

export function paddedCropRect(input: CropRectInput): CropRect {
  const imageWidth = Math.max(1, Math.round(input.imageWidth));
  const imageHeight = Math.max(1, Math.round(input.imageHeight));
  const paddingRatio = Math.max(0, input.paddingRatio ?? 0.08);
  const x = clamp(input.box.x);
  const y = clamp(input.box.y);
  const w = Math.max(0.001, clamp(input.box.w));
  const h = Math.max(0.001, clamp(input.box.h));
  const left = clamp(x - w * paddingRatio);
  const top = clamp(y - h * paddingRatio);
  const right = clamp(x + w + w * paddingRatio);
  const bottom = clamp(y + h + h * paddingRatio);
  const pixelX = Math.round(left * imageWidth);
  const pixelY = Math.round(top * imageHeight);
  const pixelRight = Math.min(imageWidth, Math.round(right * imageWidth));
  const pixelBottom = Math.min(imageHeight, Math.round(bottom * imageHeight));

  return {
    x: pixelX,
    y: pixelY,
    width: Math.max(1, pixelRight - pixelX),
    height: Math.max(1, pixelBottom - pixelY),
  };
}

export async function cropObjectImage(
  imageDataUrl: string,
  object: DetectedObject
): Promise<string | null> {
  const image = await loadImage(imageDataUrl);
  if (!image) return null;

  const crop = paddedCropRect({
    box: object,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
  });
  const scale = Math.min(1, MAX_CROP_EDGE / Math.max(crop.width, crop.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const drawImage = () => context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  const rings = maskRingsForObject(object);
  if (rings.length > 0) {
    const scaleX = canvas.width / crop.width;
    const scaleY = canvas.height / crop.height;
    context.save();
    context.beginPath();
    rings.forEach((ring) => {
      ring.forEach(([normalizedX, normalizedY], index) => {
        const x = (normalizedX * image.naturalWidth - crop.x) * scaleX;
        const y = (normalizedY * image.naturalHeight - crop.y) * scaleY;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
    });
    context.clip("evenodd");
    drawImage();
    context.restore();
  } else {
    drawImage();
  }

  for (const quality of [0.82, 0.7, 0.58, 0.46, 0.36]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrlByteLength(dataUrl) <= MAX_IMAGE_BYTES) return dataUrl;
  }
  return null;
}

export function cropModeForObject(object: DetectedObject): CropMode {
  return maskRingsForObject(object).length > 0 ? "polygon" : "bbox";
}

export function maskRingsForObject(
  object: DetectedObject
): readonly (readonly [number, number][])[] {
  const rings = object.polygons?.length
    ? object.polygons
    : object.polygon
      ? [object.polygon]
      : [];
  return rings.filter((ring) => ring.length >= 3);
}

export function dataUrlByteLength(dataUrl: string): number {
  const separator = dataUrl.indexOf(",");
  if (separator < 0) return 0;
  const encoded = dataUrl.slice(separator + 1).replace(/\s/g, "");
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((encoded.length * 3) / 4) - padding);
}

function loadImage(source: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
