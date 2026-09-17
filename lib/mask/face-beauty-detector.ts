import type { DetectedObject } from "../types";
import { polygonBounds } from "./geometry";

type MpVision = typeof import("@mediapipe/tasks-vision");

let landmarkerPromise: Promise<import("@mediapipe/tasks-vision").FaceLandmarker> | null = null;

/**
 * MediaPipe Tasks Vision FaceLandmarker (Google 오픈소스, Apache-2.0, 셀프호스팅).
 * 브라우저 온디바이스에서 478개 3D 얼굴 랜드마크를 추출하여
 * 입술, 눈, 볼, 눈썹, 베이스 피부 등 세부 뷰티 객체 구분선(polygons)을 실시간 생성.
 */
export async function loadFaceLandmarker(): Promise<import("@mediapipe/tasks-vision").FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const mp: MpVision = await import("@mediapipe/tasks-vision");
      const fileset = await mp.FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const landmarker = await mp.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "/models/mediapipe/face_landmarker.task",
          delegate: "CPU",
        },
        numFaces: 2,
        minFaceDetectionConfidence: 0.35,
        minFacePresenceConfidence: 0.35,
        minTrackingConfidence: 0.35,
        outputFaceBlendshapes: false,
        runningMode: "IMAGE",
      });
      return landmarker;
    })();
    landmarkerPromise.catch(() => {
      landmarkerPromise = null;
    });
  }
  return landmarkerPromise;
}

// MediaPipe canonical 랜드마크 인덱스 루프 정의
export const LIPS_OUTER_LOOP = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146,
];

export const UPPER_LIP_LOOP = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78,
];

export const LOWER_LIP_LOOP = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78,
];

export const LEFT_IRIS_LOOP = [469, 470, 471, 472];
export const RIGHT_IRIS_LOOP = [474, 475, 476, 477];

export const LEFT_EYE_LOOP = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
];

export const RIGHT_EYE_LOOP = [
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
];

export const LEFT_EYEBROW_LOOP = [
  70, 63, 105, 66, 107, 55, 65, 52, 53, 46,
];

export const RIGHT_EYEBROW_LOOP = [
  336, 296, 334, 293, 300, 276, 283, 282, 295, 285,
];

export const LEFT_CHEEK_LOOP = [
  116, 123, 147, 213, 192, 138, 135,
];

export const RIGHT_CHEEK_LOOP = [
  345, 352, 376, 433, 416, 367, 364,
];

export const NOSE_SHADING_LOOP = [
  168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 327,
];

export const FACE_OVAL_LOOP = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
];

export function smoothPolygon(poly: [number, number][], iterations = 1): [number, number][] {
  let curr = poly;
  for (let it = 0; it < iterations; it++) {
    const next: [number, number][] = [];
    const n = curr.length;
    for (let i = 0; i < n; i++) {
      const p0 = curr[i];
      const p1 = curr[(i + 1) % n];
      next.push([0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1]]);
      next.push([0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1]]);
    }
    curr = next;
  }
  return curr;
}

export function sampleAverageTone(
  ctx: CanvasRenderingContext2D | null,
  poly: [number, number][],
  w: number,
  h: number,
  fallback = "#e08a8a"
): string {
  if (!ctx) return fallback;
  try {
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;
    // 샘플링: 폴리곤 중심 및 각 점 내부 샘플링
    let cx = 0;
    let cy = 0;
    for (const [px, py] of poly) {
      cx += px;
      cy += py;
    }
    cx /= poly.length;
    cy /= poly.length;

    const pointsToSample = [[cx, cy], ...poly];
    for (const [px, py] of pointsToSample) {
      const ix = Math.max(0, Math.min(w - 1, Math.round(px * w)));
      const iy = Math.max(0, Math.min(h - 1, Math.round(py * h)));
      const pixel = ctx.getImageData(ix, iy, 1, 1).data;
      sumR += pixel[0];
      sumG += pixel[1];
      sumB += pixel[2];
      count++;
    }
    if (count === 0) return fallback;
    const r = Math.round(sumR / count);
    const g = Math.round(sumG / count);
    const b = Math.round(sumB / count);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch {
    return fallback;
  }
}

/**
 * 랜드마크 인덱스로부터 닫힌 폴리곤 좌표 추출
 */
export function extractPolygon(
  landmarks: { x: number; y: number; z?: number }[],
  indices: number[],
  smooth = true
): [number, number][] {
  const poly: [number, number][] = [];
  for (const idx of indices) {
    const pt = landmarks[idx];
    if (pt) {
      poly.push([Math.max(0, Math.min(1, pt.x)), Math.max(0, Math.min(1, pt.y))]);
    }
  }
  return smooth && poly.length >= 4 ? smoothPolygon(poly, 1) : poly;
}

/**
 * 랜드마크 배열로부터 뷰티 객체들을 추출하는 순수 함수.
 * 단위 테스트 및 온디바이스 탐지 파이프라인에서 공유하여 사용합니다.
 */
export function extractBeautyObjectsFromLandmarks(
  landmarks: { x: number; y: number; z?: number }[],
  ctx?: CanvasRenderingContext2D | null,
  W = 1000,
  H = 1000
): DetectedObject[] {
  if (!landmarks || landmarks.length < 468) return [];

  const objects: DetectedObject[] = [];

  // 1. 눈동자 렌즈 / 아이리스 (Color Contact Lens - 468~477번 랜드마크)
  if (landmarks.length >= 478) {
    const leftIrisPoly = extractPolygon(landmarks, LEFT_IRIS_LOOP, true);
    const rightIrisPoly = extractPolygon(landmarks, RIGHT_IRIS_LOOP, true);
    const irisPolys = [leftIrisPoly, rightIrisPoly].filter((p) => p.length >= 3);
    if (irisPolys.length > 0) {
      const b0 = polygonBounds(leftIrisPoly);
      const b1 = polygonBounds(rightIrisPoly);
      const minX = Math.min(b0.x, b1.x);
      const minY = Math.min(b0.y, b1.y);
      const maxX = Math.max(b0.x + b0.w, b1.x + b1.w);
      const maxY = Math.max(b0.y + b0.h, b1.y + b1.h);
      const tone = sampleAverageTone(ctx ?? null, leftIrisPoly, W, H, "#3e2723");
      objects.push({
        label: "color contact lens iris",
        labelKo: "컬러 렌즈 (아이리스)",
        category: "beauty",
        zone: "lens",
        subCategory: "lens",
        canonicalClass: "lens",
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        confidence: 0.96,
        polygon: leftIrisPoly,
        polygons: irisPolys,
        tone,
      });
    }
  }

  // 2. 입술 (Lips - 전체 외곽선 및 상/하입술 정밀 구조화)
  const lipsPoly = extractPolygon(landmarks, LIPS_OUTER_LOOP, true);
  const upperLipPoly = extractPolygon(landmarks, UPPER_LIP_LOOP, true);
  const lowerLipPoly = extractPolygon(landmarks, LOWER_LIP_LOOP, true);
  const lipRings = [lipsPoly, upperLipPoly, lowerLipPoly].filter((p) => p.length >= 3);

  if (lipsPoly.length >= 3) {
    const bounds = polygonBounds(lipsPoly);
    const tone = sampleAverageTone(ctx ?? null, lipsPoly, W, H, "#d84f67");
    objects.push({
      label: "lips tint lipstick gloss",
      labelKo: "립 메이크업 (틴트·립스틱)",
      category: "beauty",
      zone: "lips",
      subCategory: "lip_makeup",
      canonicalClass: "lips",
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      confidence: 0.95,
      polygon: lipsPoly,
      polygons: lipRings.length > 0 ? lipRings : [lipsPoly],
      tone,
    });
  }

  // 3. 눈 (Left Eye & Right Eye)
  const leftEyePoly = extractPolygon(landmarks, LEFT_EYE_LOOP, true);
  const rightEyePoly = extractPolygon(landmarks, RIGHT_EYE_LOOP, true);
  const eyePolys = [leftEyePoly, rightEyePoly].filter((p) => p.length >= 3);
  if (eyePolys.length > 0) {
    const bounds0 = polygonBounds(leftEyePoly);
    const bounds1 = polygonBounds(rightEyePoly);
    const minX = Math.min(bounds0.x, bounds1.x);
    const minY = Math.min(bounds0.y, bounds1.y);
    const maxX = Math.max(bounds0.x + bounds0.w, bounds1.x + bounds1.w);
    const maxY = Math.max(bounds0.y + bounds0.h, bounds1.y + bounds1.h);
    const tone = sampleAverageTone(ctx ?? null, leftEyePoly, W, H, "#6b4438");
    objects.push({
      label: "eye makeup shadow mascara",
      labelKo: "아이 메이크업 (섀도우·라이너)",
      category: "beauty",
      zone: "eyes",
      subCategory: "eye_makeup",
      canonicalClass: "eyes",
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
      confidence: 0.93,
      polygon: leftEyePoly,
      polygons: eyePolys,
      tone,
    });
  }

  // 4. 치크 / 블러셔 (Left & Right Cheeks)
  const leftCheekPoly = extractPolygon(landmarks, LEFT_CHEEK_LOOP, true);
  const rightCheekPoly = extractPolygon(landmarks, RIGHT_CHEEK_LOOP, true);
  const cheekPolys = [leftCheekPoly, rightCheekPoly].filter((p) => p.length >= 3);
  if (cheekPolys.length > 0) {
    const b0 = polygonBounds(leftCheekPoly);
    const b1 = polygonBounds(rightCheekPoly);
    const minX = Math.min(b0.x, b1.x);
    const minY = Math.min(b0.y, b1.y);
    const maxX = Math.max(b0.x + b0.w, b1.x + b1.w);
    const maxY = Math.max(b0.y + b0.h, b1.y + b1.h);
    const tone = sampleAverageTone(ctx ?? null, leftCheekPoly, W, H, "#f49ba3");
    objects.push({
      label: "cheeks blush",
      labelKo: "치크·블러셔",
      category: "beauty",
      zone: "cheeks",
      subCategory: "blusher",
      canonicalClass: "cheeks",
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
      confidence: 0.9,
      polygon: leftCheekPoly,
      polygons: cheekPolys,
      tone,
    });
  }

  // 5. 아이브로우 (Left & Right Eyebrows)
  const leftBrowPoly = extractPolygon(landmarks, LEFT_EYEBROW_LOOP, true);
  const rightBrowPoly = extractPolygon(landmarks, RIGHT_EYEBROW_LOOP, true);
  const browPolys = [leftBrowPoly, rightBrowPoly].filter((p) => p.length >= 3);
  if (browPolys.length > 0) {
    const b0 = polygonBounds(leftBrowPoly);
    const b1 = polygonBounds(rightBrowPoly);
    const minX = Math.min(b0.x, b1.x);
    const minY = Math.min(b0.y, b1.y);
    const maxX = Math.max(b0.x + b0.w, b1.x + b1.w);
    const maxY = Math.max(b0.y + b0.h, b1.y + b1.h);
    const tone = sampleAverageTone(ctx ?? null, leftBrowPoly, W, H, "#3d302a");
    objects.push({
      label: "eyebrow pencil browcara",
      labelKo: "아이브로우",
      category: "beauty",
      zone: "eyebrows",
      subCategory: "eyebrow",
      canonicalClass: "eyebrows",
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
      confidence: 0.91,
      polygon: leftBrowPoly,
      polygons: browPolys,
      tone,
    });
  }

  // 6. 노즈 쉐딩 / 하이라이터 (Nose Shading & Contour)
  const shadingPoly = extractPolygon(landmarks, NOSE_SHADING_LOOP, true);
  if (shadingPoly.length >= 3) {
    const bounds = polygonBounds(shadingPoly);
    const tone = sampleAverageTone(ctx ?? null, shadingPoly, W, H, "#a68a78");
    objects.push({
      label: "nose shading contour highlighter",
      labelKo: "쉐딩·컨투어링",
      category: "beauty",
      zone: "shading",
      subCategory: "contour",
      canonicalClass: "shading",
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      confidence: 0.88,
      polygon: shadingPoly,
      polygons: [shadingPoly],
      tone,
    });
  }

  // 7. 얼굴 피부 / 베이스 메이크업 (Face Oval / Skin)
  const faceOvalPoly = extractPolygon(landmarks, FACE_OVAL_LOOP, true);
  if (faceOvalPoly.length >= 3) {
    const bounds = polygonBounds(faceOvalPoly);
    const tone = sampleAverageTone(ctx ?? null, faceOvalPoly, W, H, "#fce3d2");
    objects.push({
      label: "face cushion foundation skin",
      labelKo: "베이스 메이크업 (쿠션·파운데이션)",
      category: "beauty",
      zone: "skin",
      subCategory: "base_makeup",
      canonicalClass: "skin",
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      confidence: 0.94,
      polygon: faceOvalPoly,
      polygons: [faceOvalPoly],
      tone,
    });
  }

  return objects;
}

/**
 * 온디바이스 얼굴 및 뷰티 부위 정밀 탐지.
 * MediaPipe FaceLandmarker 오픈소스 모델을 활용하여
 * 입술, 눈, 볼, 눈썹, 베이스 메이크업 부위를 자동 탐지하고
 * 정밀한 객체 구분선(polygon)과 색상(tone)을 생성합니다.
 */
export async function detectFaceBeautyOnDevice(
  source: HTMLImageElement | HTMLCanvasElement
): Promise<DetectedObject[]> {
  try {
    const W = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
    const H = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;
    if (W <= 0 || H <= 0) return [];

    const canvas = document.createElement("canvas");
    canvas.width = Math.min(1024, W);
    canvas.height = Math.round((canvas.width / W) * H);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const landmarker = await loadFaceLandmarker();
    const result = landmarker.detect(canvas);
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      return [];
    }

    const allObjects: DetectedObject[] = [];
    for (let faceIdx = 0; faceIdx < result.faceLandmarks.length; faceIdx++) {
      const landmarks = result.faceLandmarks[faceIdx];
      const faceObjs = extractBeautyObjectsFromLandmarks(landmarks, ctx, canvas.width, canvas.height);
      allObjects.push(...faceObjs);
    }

    return allObjects;
  } catch (err) {
    console.warn("[vision] detectFaceBeautyOnDevice failed:", err);
    return [];
  }
}
