import type { Category, DetectedObject } from "./types";

/**
 * 온디바이스 객체 탐지 — 오픈소스 사전학습 모델 기반 (서버·API 키 불필요).
 *
 * 모델: SSDLite MobileNetV2 (COCO 80클래스, TensorFlow.js coco-ssd).
 * 가중치(약 18MB)는 /public/models/coco-ssd 에 셀프호스팅 — 외부 CDN 의존 없이
 * same-origin으로 로드되고 이후 브라우저 캐시를 탄다.
 *
 * COCO에는 셔츠/팬츠/신발 같은 세부 패션 클래스가 없으므로,
 * person 탐지 결과를 착장 존(상의/하의/신발)으로 분할해 쇼핑 가능한
 * 오브젝트로 변환한다 (가방·백팩·머그·가구·가전 등은 직접 매핑).
 */

export interface DetectedRegion extends DetectedObject {
  tone?: string;
}

type CocoPrediction = { bbox: [number, number, number, number]; class: string; score: number };
type CocoModel = { detect: (img: HTMLImageElement, maxNum?: number, minScore?: number) => Promise<CocoPrediction[]> };

/** COCO 클래스 → 쇼핑 도메인 매핑 (구매 대상이 아닌 클래스는 제외) */
const COCO_MAP: Record<string, { label: string; labelKo: string; category: Category }> = {
  handbag: { label: "bag shoulder crossbody", labelKo: "가방", category: "fashion" },
  backpack: { label: "backpack bag", labelKo: "백팩", category: "fashion" },
  tie: { label: "tie", labelKo: "넥타이", category: "fashion" },
  suitcase: { label: "suitcase luggage", labelKo: "캐리어", category: "fashion" },
  umbrella: { label: "umbrella", labelKo: "우산", category: "lifestyle" },
  cup: { label: "mug cup", labelKo: "머그컵", category: "lifestyle" },
  "wine glass": { label: "glass", labelKo: "글라스", category: "lifestyle" },
  bottle: { label: "bottle", labelKo: "보틀", category: "lifestyle" },
  bowl: { label: "bowl", labelKo: "볼", category: "lifestyle" },
  chair: { label: "chair", labelKo: "체어", category: "interior" },
  couch: { label: "sofa couch", labelKo: "소파", category: "interior" },
  bed: { label: "bed", labelKo: "침대", category: "interior" },
  "dining table": { label: "table", labelKo: "테이블", category: "interior" },
  "potted plant": { label: "plant pot", labelKo: "화분", category: "interior" },
  vase: { label: "vase", labelKo: "화병", category: "interior" },
  tv: { label: "tv monitor display", labelKo: "TV·모니터", category: "tech" },
  laptop: { label: "laptop", labelKo: "노트북", category: "tech" },
  keyboard: { label: "keyboard", labelKo: "키보드", category: "tech" },
  mouse: { label: "mouse", labelKo: "마우스", category: "tech" },
  "cell phone": { label: "smartphone", labelKo: "스마트폰", category: "tech" },
  remote: { label: "remote", labelKo: "리모컨", category: "tech" },
  clock: { label: "clock watch", labelKo: "시계", category: "lifestyle" },
  book: { label: "book magazine", labelKo: "북·매거진", category: "lifestyle" },
  "teddy bear": { label: "doll toy", labelKo: "인형", category: "lifestyle" },
  "hair drier": { label: "hair dryer", labelKo: "드라이어", category: "beauty" },
};

/** 사람 박스 → 착장 존 분할 비율 (박스 기준 상대 좌표) */
const PERSON_ZONES = [
  { label: "top shirt", labelKo: "상의", fx: 0.1, fy: 0.11, fw: 0.8, fh: 0.41, conf: 0.92 },
  { label: "bottom pants", labelKo: "하의", fx: 0.16, fy: 0.5, fw: 0.68, fh: 0.37, conf: 0.88 },
  { label: "shoes", labelKo: "신발", fx: 0.1, fy: 0.87, fw: 0.8, fh: 0.13, conf: 0.85 },
];

let modelPromise: Promise<CocoModel> | null = null;

/** 모델은 한 번만 로드 (약 18MB — 이후 브라우저 캐시) */
function loadModel(): Promise<CocoModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [tf, cocoSsd] = await Promise.all([
        import("@tensorflow/tfjs"),
        import("@tensorflow-models/coco-ssd"),
      ]);
      await tf.ready();
      return cocoSsd.load({ modelUrl: "/models/coco-ssd/model.json" }) as Promise<CocoModel>;
    })();
    modelPromise.catch(() => {
      modelPromise = null; // 실패 시 다음 시도에서 재로드
    });
  }
  return modelPromise;
}

export async function detectOnDevice(dataUrl: string): Promise<DetectedRegion[]> {
  const [img, model] = await Promise.all([loadImage(dataUrl), loadModel()]);
  const preds = await model.detect(img, 15, 0.35);
  const W = img.width;
  const H = img.height;

  const regions: DetectedRegion[] = [];
  for (const p of preds) {
    const [bx, by, bw, bh] = p.bbox;
    if (p.class === "person") {
      // 사람은 상품이 아니다 — 착장 존 3분할로 변환
      for (const z of PERSON_ZONES) {
        regions.push(
          clampRegion({
            label: z.label,
            labelKo: z.labelKo,
            category: "fashion",
            x: (bx + bw * z.fx) / W,
            y: (by + bh * z.fy) / H,
            w: (bw * z.fw) / W,
            h: (bh * z.fh) / H,
            confidence: round2(p.score * z.conf),
          })
        );
      }
    } else if (COCO_MAP[p.class]) {
      const m = COCO_MAP[p.class];
      regions.push(
        clampRegion({
          label: m.label,
          labelKo: m.labelKo,
          category: m.category,
          x: bx / W,
          y: by / H,
          w: bw / W,
          h: bh / H,
          confidence: round2(p.score),
        })
      );
    }
  }

  const picked = dedupe(regions)
    .filter((r) => r.w * r.h > 0.004)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);

  for (const r of picked) r.tone = regionTone(img, r);
  return picked;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function clampRegion(r: DetectedRegion): DetectedRegion {
  const x = Math.max(0, Math.min(1, r.x));
  const y = Math.max(0, Math.min(1, r.y));
  return { ...r, x, y, w: Math.min(1 - x, r.w), h: Math.min(1 - y, r.h) };
}

/** 같은 라벨이 크게 겹치면 신뢰도 높은 쪽만 남긴다 */
function dedupe(regions: DetectedRegion[]): DetectedRegion[] {
  const kept: DetectedRegion[] = [];
  for (const r of [...regions].sort((a, b) => b.confidence - a.confidence)) {
    if (kept.some((k) => k.labelKo === r.labelKo && iou(k, r) > 0.45)) continue;
    kept.push(r);
  }
  return kept;
}

function iou(a: DetectedRegion, b: DetectedRegion): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
}

/** 영역 중앙부(60%)의 평균 색 — 배경 영향을 줄인다 */
function regionTone(img: HTMLImageElement, r: DetectedRegion): string | undefined {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const sx = (r.x + r.w * 0.2) * img.width;
    const sy = (r.y + r.h * 0.2) * img.height;
    ctx.drawImage(img, sx, sy, r.w * 0.6 * img.width, r.h * 0.6 * img.height, 0, 0, 8, 8);
    const d = ctx.getImageData(0, 0, 8, 8).data;
    let rr = 0, gg = 0, bb = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      rr += d[i];
      gg += d[i + 1];
      bb += d[i + 2];
    }
    return `#${hex(rr / n)}${hex(gg / n)}${hex(bb / n)}`;
  } catch {
    return undefined; // canvas 오염 등 — tone 없이 진행
  }
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
const round2 = (n: number) => Math.round(n * 100) / 100;
