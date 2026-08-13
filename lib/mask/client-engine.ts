import {
  ANATOMICAL_BAND,
  ANATOMICAL_PENALTY,
  canonicalClass,
  DEDUPE_IOU,
  DEFAULT_MIN_AREA,
  MIN_AREA_BY_CLASS,
  PIPELINE_VERSION,
  SEG,
  type FashionClass,
} from "../vision-config";
import type { DetectedObject } from "../types";
import { cleanMask, maskToPolygons, polygonArea, polygonBounds, polygonIou } from "./geometry";

/**
 * 온디바이스 실루엣 마스크 엔진 — MediaPipe Tasks Vision (Apache-2.0, wasm 셀프호스팅).
 *
 * 탐지 단계(Gemini 박스 or coco-ssd 존)가 준 bbox proposal마다:
 *   1. InteractiveSegmenter(magic_touch) — 박스 중심 포인트 프롬프트 → 객체 마스크 (SAM refinement 역할)
 *   2. ImageSegmenter(selfie_multiclass) — clothes/skin/hair 시맨틱 마스크 (human parsing 역할)
 *   3. Mask Fusion — 객체 마스크 ∩ (확장 박스), 의류 클래스는 ∩ clothes-mask, 후처리
 *   4. contour → simplify → normalized polygon (프론트 히트테스트/렌더용)
 *
 * 전부 브라우저에서 실행: GPU 서버·API 키 불필요, 실패 시 bbox로 자연 강등.
 */

export interface MaskedObject extends DetectedObject {
  polygon?: [number, number][];
  maskSource?: string;
}

// selfie_multiclass 카테고리 인덱스: 0=bg 1=hair 2=body-skin 3=face-skin 4=clothes 5=others
const MC_CLOTHES = 4;
const MC_OTHERS = 5;

type MpVision = typeof import("@mediapipe/tasks-vision");

let visionPromise: Promise<{
  interactive: import("@mediapipe/tasks-vision").InteractiveSegmenter;
  multiclass: import("@mediapipe/tasks-vision").ImageSegmenter;
}> | null = null;

function loadEngines() {
  if (!visionPromise) {
    visionPromise = (async () => {
      const mp: MpVision = await import("@mediapipe/tasks-vision");
      const fileset = await mp.FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const [interactive, multiclass] = await Promise.all([
        mp.InteractiveSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/models/mediapipe/magic_touch.tflite" },
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        }),
        mp.ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/models/mediapipe/selfie_multiclass.tflite" },
          outputCategoryMask: true,
          outputConfidenceMasks: false,
          runningMode: "IMAGE",
        }),
      ]);
      return { interactive, multiclass };
    })();
    visionPromise.catch(() => {
      visionPromise = null;
    });
  }
  return visionPromise;
}

const GARMENT_CLASSES: FashionClass[] = ["top", "outerwear", "pants", "shorts", "skirt", "dress", "scarf"];
/** 의류가 아닌 착용 물체 — multiclass "others" 클래스가 semantic prior */
const WORN_ITEM_CLASSES: FashionClass[] = ["bag", "shoes", "hat", "belt", "watch", "bracelet", "necklace", "earrings", "ring", "glasses"];

export interface MaskDebugInfo {
  timings: Record<string, number>;
  maskSources: Record<string, string>;
}

/**
 * 탐지 proposal들에 실루엣 폴리곤을 붙인다.
 * 실패한 객체는 polygon 없이 그대로 반환 (bbox 강등) — 전체 파이프라인은 절대 죽지 않는다.
 */
export async function extractSilhouettes(
  dataUrl: string,
  objects: DetectedObject[],
  onDebug?: (info: MaskDebugInfo) => void
): Promise<MaskedObject[]> {
  const timings: Record<string, number> = {};
  const maskSources: Record<string, string> = {};
  const t0 = performance.now();

  let engines: Awaited<ReturnType<typeof loadEngines>>;
  let img: HTMLImageElement;
  try {
    [engines, img] = await Promise.all([loadEngines(), loadImage(dataUrl)]);
  } catch {
    return objects; // 엔진 로드 실패 → bbox 그대로
  }
  timings.engineLoad = Math.round(performance.now() - t0);

  // 세그멘테이션 입력 해상도 — Boundary Accuracy가 핵심이므로 1024px까지 유지
  const canvas = document.createElement("canvas");
  const MAXW = SEG.inputMaxWidth;
  const scale = Math.min(1, MAXW / img.width);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const W = canvas.width;
  const H = canvas.height;
  // 색상 추출용 프레임 픽셀 (1회 읽기) — 마스크 내부 픽셀만 사용해 배경·피부 영향 제거
  let framePixels: Uint8ClampedArray | null = null;
  try {
    framePixels = ctx.getImageData(0, 0, W, H).data;
  } catch {
    framePixels = null;
  }

  // ── Human parsing 역할: 멀티클래스 시맨틱 마스크 (1회) ──
  // clothes(4) = 의류 픽셀, others(5) = 착용 액세서리·가방·신발 등 비의류 물체 픽셀
  let clothes: Uint8Array | null = null;
  let others: Uint8Array | null = null;
  const tParse = performance.now();
  try {
    const res = engines.multiclass.segment(canvas);
    const cat = res.categoryMask;
    if (cat) {
      const data = cat.getAsUint8Array();
      clothes = new Uint8Array(W * H);
      others = new Uint8Array(W * H);
      for (let i = 0; i < data.length; i++) {
        if (data[i] === MC_CLOTHES) clothes[i] = 1;
        else if (data[i] === MC_OTHERS) others[i] = 1;
      }
      cat.close();
    }
    res.close?.();
  } catch {
    clothes = null; // parsing 실패 → open-vocab 단독 (fallback graph)
    others = null;
  }
  timings.humanParsing = Math.round(performance.now() - tParse);

  const out: MaskedObject[] = [];
  const tSeg = performance.now();

  for (const obj of objects) {
    const cls = canonicalClass(`${obj.label} ${obj.labelKo}`);
    const masked: MaskedObject = { ...obj, canonicalClass: cls };

    try {
      // ── 포인트 프롬프트 세그멘테이션 (SAM refinement 역할) ──
      const cx = obj.x + obj.w / 2;
      const cy = obj.y + obj.h / 2;
      const res = engines.interactive.segment(canvas, {
        keypoint: { x: cx, y: cy },
      });
      const cat = res.categoryMask;
      if (!cat) {
        res.close?.();
        out.push(masked);
        continue;
      }
      const data = cat.getAsUint8Array();
      // 극성 판별: 프롬프트 지점은 반드시 객체에 속한다 (버전별 fg/bg 인코딩 차이 대응)
      const promptIdx = Math.min(data.length - 1, Math.round(cy * H) * W + Math.round(cx * W));
      const objectIsPositive = data[promptIdx] > 0;
      const isObject = (v: number) => (objectIsPositive ? v > 0 : v === 0);

      // ── Mask Fusion ──
      // 1) 확장 박스 constraint: 포인트 세그가 몸 전체로 번지는 것을 차단
      const pad = smallObject(cls) ? 0.35 : 0.12; // 작은 객체는 여유, 큰 객체는 타이트
      const bx0 = Math.max(0, Math.floor((obj.x - obj.w * pad) * W));
      const by0 = Math.max(0, Math.floor((obj.y - obj.h * pad) * H));
      const bx1 = Math.min(W, Math.ceil((obj.x + obj.w * (1 + pad)) * W));
      const by1 = Math.min(H, Math.ceil((obj.y + obj.h * (1 + pad)) * H));

      // 2) 클래스별 semantic prior: 의류는 clothes 마스크, 착용 물체(가방·신발·시계 등)는
      //    others 마스크를 AND — 포인트 마스크가 사람 전체로 번지는 것을 차단
      const isGarment = GARMENT_CLASSES.includes(cls);
      const isWornItem = WORN_ITEM_CLASSES.includes(cls);
      const boxAreaPx = (bx1 - bx0) * (by1 - by0);

      // others prior가 박스 안에서 충분히 잡히는지 먼저 확인
      let othersInBox = 0;
      if (others && isWornItem) {
        for (let y = by0; y < by1; y++)
          for (let x = bx0; x < bx1; x++) if (others[y * W + x]) othersInBox++;
      }
      const useOthers = others && isWornItem && othersInBox > boxAreaPx * 0.06;

      const bin = new Uint8Array(W * H);
      let inCount = 0;
      for (let y = by0; y < by1; y++) {
        for (let x = bx0; x < bx1; x++) {
          const i = y * W + x;
          if (useOthers) {
            // 착용 물체: semantic others ∩ box (포인트 마스크와 무관하게 가장 정확)
            if (others![i]) {
              bin[i] = 1;
              inCount++;
            }
          } else if (isObject(data[i])) {
            if (clothes && isGarment) {
              if (clothes[i]) {
                bin[i] = 1;
                inCount++;
              }
            } else {
              bin[i] = 1;
              inCount++;
            }
          }
        }
      }
      cat.close();
      res.close?.();

      // 3) fusion 결과 검증: 박스 대비 마스크가 너무 작으면 신뢰 불가 → 폴백 시도
      const boxArea = boxAreaPx;
      if (inCount < boxArea * 0.05 && clothes && GARMENT_CLASSES.includes(cls)) {
        // clothes ∩ box 자체를 마스크로 (parsing 단독 폴백)
        let c2 = 0;
        for (let y = by0; y < by1; y++) {
          for (let x = bx0; x < bx1; x++) {
            const i = y * W + x;
            bin[i] = clothes[i];
            if (clothes[i]) c2++;
          }
        }
        inCount = c2;
        maskSources[obj.label] = "parsing";
      } else {
        maskSources[obj.label] = useOthers
          ? "parsing-others"
          : clothes && GARMENT_CLASSES.includes(cls)
            ? "point+parsing"
            : "point";
      }

      if (inCount < 30) {
        out.push(masked); // 마스크 실패 → bbox 강등
        continue;
      }

      // ── Post processing: light smoothing → multi-ring contour → polygon ──
      // 좌/우 신발·분리 스트랩은 독립 링으로 유지한다 (링을 선으로 잇지 않는다).
      const cleaned = cleanMask(bin, W, H, 1);
      const rings = maskToPolygons(cleaned, W, H, {
        epsilonPx: Math.max(1.0, Math.hypot(W, H) * SEG.epsilonRatio),
        maxPointsPerRing: SEG.maxPointsPerRing,
        maxRings: SEG.maxRings,
        minRingAreaRatio: SEG.minRingAreaRatio,
        chaikinIterations: SEG.chaikinIterations,
      }).filter((p) => polygonArea(p) >= (MIN_AREA_BY_CLASS[cls] ?? DEFAULT_MIN_AREA));

      if (rings.length === 0) {
        out.push(masked);
        continue;
      }

      // bbox = 전체 링의 합집합 경계, polygon(하위호환) = 최대 링
      const allBounds = rings.map(polygonBounds);
      const minX = Math.min(...allBounds.map((b) => b.x));
      const minY = Math.min(...allBounds.map((b) => b.y));
      masked.polygon = rings[0];
      masked.polygons = rings;
      masked.maskSource = maskSources[obj.label];
      masked.x = minX;
      masked.y = minY;
      masked.w = Math.max(...allBounds.map((b) => b.x + b.w)) - minX;
      masked.h = Math.max(...allBounds.map((b) => b.y + b.h)) - minY;
      // 마스크 픽셀 기반 색상 (배경·피부 영향 없음 — 마스크 내부만 사용)
      if (framePixels) {
        const colors = dominantColors(framePixels, bin, W, bx0, by0, bx1, by1);
        if (colors.length > 0) {
          masked.tone = colors[0];
          if (colors.length > 1) masked.secondaryTones = colors.slice(1, 3);
        }
      }
      out.push(masked);
    } catch {
      out.push(masked); // 개별 객체 실패는 전체를 죽이지 않는다
    }
  }
  timings.segmentation = Math.round(performance.now() - tSeg);

  // ── 해부학적 일관성 + 중복 억제 ──
  const tFuse = performance.now();
  const persons = estimatePersonBand(objects);
  const final = dedupeMasked(
    out.map((o) => applyAnatomicalPenalty(o, persons)),
  );
  timings.fusion = Math.round(performance.now() - tFuse);
  timings.total = Math.round(performance.now() - t0);

  onDebug?.({ timings, maskSources });
  return final;
}

function smallObject(cls: FashionClass): boolean {
  return ["watch", "bracelet", "ring", "earrings", "necklace", "glasses", "belt"].includes(cls);
}

/** person 세로 밴드 추정 — 탐지 객체들의 상하 범위로 근사 (pose 모델 없이) */
function estimatePersonBand(objects: DetectedObject[]): { top: number; bottom: number } | null {
  const fashion = objects.filter((o) => canonicalClass(`${o.label} ${o.labelKo}`) !== "object");
  if (fashion.length < 2) return null;
  const top = Math.min(...fashion.map((o) => o.y));
  const bottom = Math.max(...fashion.map((o) => o.y + o.h));
  if (bottom - top < 0.2) return null;
  return { top, bottom };
}

function applyAnatomicalPenalty(o: MaskedObject, person: { top: number; bottom: number } | null): MaskedObject {
  if (!person || !o.canonicalClass || o.canonicalClass === "object") return o;
  const band = ANATOMICAL_BAND[o.canonicalClass as FashionClass];
  if (!band) return o;
  const cy = (o.y + o.h / 2 - person.top) / (person.bottom - person.top || 1);
  if (cy < band[0] - 0.08 || cy > band[1] + 0.08) {
    return { ...o, confidence: Math.round(o.confidence * (1 - ANATOMICAL_PENALTY) * 100) / 100 };
  }
  return o;
}

/** 클래스 인지 중복 억제 — mask IoU 우선, 없으면 bbox IoU */
function dedupeMasked(objects: MaskedObject[]): MaskedObject[] {
  const sorted = [...objects].sort((a, b) => b.confidence - a.confidence);
  const kept: MaskedObject[] = [];
  for (const o of sorted) {
    const dup = kept.some((k) => {
      if (k.canonicalClass !== o.canonicalClass) return false;
      if (k.polygon && o.polygon) return polygonIou(k.polygon, o.polygon, 48) > DEDUPE_IOU;
      const ix = Math.max(0, Math.min(k.x + k.w, o.x + o.w) - Math.max(k.x, o.x));
      const iy = Math.max(0, Math.min(k.y + k.h, o.y + o.h) - Math.max(k.y, o.y));
      const inter = ix * iy;
      return inter / (k.w * k.h + o.w * o.h - inter || 1) > DEDUPE_IOU;
    });
    if (!dup) kept.push(o);
  }
  return kept;
}

/**
 * 마스크 내부 픽셀의 dominant color 클러스터링.
 * 4bit/채널 히스토그램 → 상위 bin들을 거리 기준으로 병합 → 대표색 반환.
 * 하이라이트(거의 흰색)·딥섀도(거의 검정)는 옷 실색이 아닐 확률이 높아 가중치를 낮춘다.
 */
function dominantColors(
  pixels: Uint8ClampedArray,
  mask: Uint8Array,
  W: number,
  bx0: number,
  by0: number,
  bx1: number,
  by1: number
): string[] {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let y = by0; y < by1; y += 2) {
    for (let x = bx0; x < bx1; x += 2) {
      const i = y * W + x;
      if (!mask[i]) continue;
      const p = i * 4;
      const r = pixels[p];
      const g = pixels[p + 1];
      const b = pixels[p + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // 반사광·그림자 극단값은 절반 가중
      const w = lum > 245 || lum < 12 ? 0.5 : 1;
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      bin.n += w;
      bin.r += r * w;
      bin.g += g * w;
      bin.b += b * w;
      bins.set(key, bin);
    }
  }
  const top = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  if (top.length === 0) return [];
  // 가까운 bin 병합 (채도 낮은 옷은 인접 bin으로 흩어진다)
  const clusters: { n: number; r: number; g: number; b: number }[] = [];
  for (const t of top) {
    const cr = t.r / t.n;
    const cg = t.g / t.n;
    const cb = t.b / t.n;
    const near = clusters.find((c) => {
      const dr = c.r / c.n - cr;
      const dg = c.g / c.n - cg;
      const db = c.b / c.n - cb;
      return dr * dr + dg * dg + db * db < 42 * 42;
    });
    if (near) {
      near.n += t.n;
      near.r += t.r;
      near.g += t.g;
      near.b += t.b;
    } else {
      clusters.push({ ...t });
    }
  }
  const total = clusters.reduce((s, c) => s + c.n, 0);
  return clusters
    .sort((a, b) => b.n - a.n)
    .filter((c) => c.n / total > 0.08)
    .slice(0, 3)
    .map((c) => `#${hex2(c.r / c.n)}${hex2(c.g / c.n)}${hex2(c.b / c.n)}`);
}

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export { PIPELINE_VERSION };
