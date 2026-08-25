/**
 * 마스크 기하 엔진 — 서버/클라이언트 공용 순수 함수.
 * binary mask → contour 추출 → polygon 단순화 → 정규화,
 * point-in-polygon 히트 테스트, IoU, centroid.
 */

export type Point = [number, number];

/** 이진 마스크(Uint8Array, 0/1)에서 가장 큰 외곽 contour를 추출 (Moore-neighbor tracing) */
export function traceLargestContour(mask: Uint8Array, w: number, h: number): Point[] {
  return traceContours(mask, w, h, 1)[0] ?? [];
}

/** 상위 N개 외곽 contour (길이 내림차순) — 신발 페어 등 다중 컴포넌트 분리용 */
export function traceContours(mask: Uint8Array, w: number, h: number, maxContours = 2): Point[][] {
  const at = (x: number, y: number) => (x >= 0 && x < w && y >= 0 && y < h ? mask[y * w + x] : 0);

  const visited = new Uint8Array(w * h);
  const all: Point[][] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y) || visited[y * w + x]) continue;
      if (at(x - 1, y)) continue; // 왼쪽이 채워져 있으면 boundary 시작점 아님
      const contour = traceFrom(x, y);
      for (const [cx, cy] of contour) visited[cy * w + cx] = 1;
      if (contour.length > 8) all.push(contour);
    }
  }
  return all.sort((a, b) => b.length - a.length).slice(0, maxContours);

  function traceFrom(sx: number, sy: number): Point[] {
    // Moore neighborhood, 시계방향
    const DIRS: Point[] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const contour: Point[] = [];
    let cx = sx, cy = sy;
    let dir = 6; // 위쪽부터 탐색 시작
    const maxSteps = w * h;
    for (let step = 0; step < maxSteps; step++) {
      contour.push([cx, cy]);
      let found = false;
      for (let i = 0; i < 8; i++) {
        const d = (dir + i) % 8;
        const nx = cx + DIRS[d][0];
        const ny = cy + DIRS[d][1];
        if (at(nx, ny)) {
          cx = nx;
          cy = ny;
          dir = (d + 6) % 8; // backtrack 방향 기준 재설정
          found = true;
          break;
        }
      }
      if (!found) break; // 고립 픽셀
      if (cx === sx && cy === sy && contour.length > 2) break;
    }
    return contour;
  }
}

/** Douglas–Peucker 단순화 */
export function simplifyPolygon(points: Point[], epsilon: number): Point[] {
  if (points.length <= 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = pointLineDistance(points[i], points[a], points[b]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > epsilon && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

function pointLineDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** vertex 수 상한 — 균등 샘플링 */
export function capPolygon(points: Point[], maxPoints: number): Point[] {
  if (points.length <= maxPoints) return points;
  const out: Point[] = [];
  const step = points.length / maxPoints;
  for (let i = 0; i < maxPoints; i++) out.push(points[Math.floor(i * step)]);
  return out;
}

/**
 * Chaikin corner-cutting — 아주 가벼운 곡선화.
 * 소매 끝·신발 앞코 같은 실제 곡률은 살리고 픽셀 계단만 완화한다.
 */
export function chaikin(points: Point[], iterations = 1): Point[] {
  let pts = points;
  for (let it = 0; it < iterations; it++) {
    const out: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    pts = out;
  }
  return pts;
}

/**
 * binary mask → 정규화 다중 링 폴리곤.
 * 신발 좌/우, 분리된 스트랩처럼 한 객체가 여러 연결 컴포넌트를 가질 때
 * 링을 독립적으로 유지한다 (좌우 신발을 선으로 잇는 실패 케이스 방지).
 */
export function maskToPolygons(
  mask: Uint8Array,
  maskW: number,
  maskH: number,
  opts: {
    epsilonPx: number;
    maxPointsPerRing: number;
    maxRings: number;
    minRingAreaRatio: number;
    chaikinIterations?: number;
  }
): Point[][] {
  const contours = traceContours(mask, maskW, maskH, opts.maxRings);
  const rings = contours
    .map((c) => {
      let poly = simplifyPolygon(c, opts.epsilonPx);
      poly = capPolygon(poly, opts.maxPointsPerRing);
      if (opts.chaikinIterations) poly = chaikin(poly, opts.chaikinIterations);
      return poly.map(([px, py]) => [(px + 0.5) / maskW, (py + 0.5) / maskH] as Point);
    })
    .filter((p) => p.length >= 3);
  if (rings.length <= 1) return rings;
  const areas = rings.map(polygonArea);
  const maxArea = Math.max(...areas);
  return rings.filter((_, i) => areas[i] >= maxArea * opts.minRingAreaRatio);
}

/** point-in-polygon (ray casting) — 좌표계 일치 필요 (둘 다 normalized 권장) */
export function pointInPolygon(x: number, y: number, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** polygon 면적 (shoelace, normalized 좌표면 이미지 대비 비율) */
export function polygonArea(poly: Point[]): number {
  let s = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    s += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  }
  return Math.abs(s / 2);
}

export function polygonCentroid(poly: Point[]): Point {
  let x = 0, y = 0;
  for (const p of poly) {
    x += p[0];
    y += p[1];
  }
  return [x / poly.length, y / poly.length];
}

export function polygonBounds(poly: Point[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** bbox IoU */
export function boxIou(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
}

/**
 * polygon IoU 근사 — 저해상도 rasterization (성능·의존성 균형).
 * normalized polygon 2개를 64×64 grid에 래스터해 비교한다.
 */
export function polygonIou(a: Point[], b: Point[], res = 64): number {
  let inter = 0, union = 0;
  for (let gy = 0; gy < res; gy++) {
    for (let gx = 0; gx < res; gx++) {
      const x = (gx + 0.5) / res;
      const y = (gy + 0.5) / res;
      const ia = pointInPolygon(x, y, a);
      const ib = pointInPolygon(x, y, b);
      if (ia && ib) inter++;
      if (ia || ib) union++;
    }
  }
  return union === 0 ? 0 : inter / union;
}

/**
 * binary mask → normalized polygon 전체 파이프라인.
 * maskW/H 픽셀 좌표의 contour를 추출·단순화한 뒤 [0,1] 정규화 좌표로 변환.
 * offset/scale: 마스크가 원본 이미지의 부분 영역(box crop)일 때 좌표 복원용.
 */
export function maskToPolygon(
  mask: Uint8Array,
  maskW: number,
  maskH: number,
  opts: {
    offsetX: number; // 원본 이미지 내 crop 시작 (normalized)
    offsetY: number;
    scaleX: number; // crop 폭 (normalized) — mask 픽셀 → 원본 normalized 변환
    scaleY: number;
    epsilonPx?: number;
    maxPoints?: number;
  }
): Point[] {
  const contour = traceLargestContour(mask, maskW, maskH);
  if (contour.length < 3) return [];
  const eps = opts.epsilonPx ?? Math.max(1.2, Math.hypot(maskW, maskH) * 0.008);
  let poly = simplifyPolygon(contour, eps);
  poly = capPolygon(poly, opts.maxPoints ?? 48);
  return poly.map(([px, py]) => [
    opts.offsetX + ((px + 0.5) / maskW) * opts.scaleX,
    opts.offsetY + ((py + 0.5) / maskH) * opts.scaleY,
  ]);
}

/**
 * Morphological closing (dilate→erode, box kernel) —
 * 머리카락·스트랩이 옷을 가로질러 마스크를 조각내는 좁은 틈을 메운다.
 * radius는 픽셀 단위. 실제 옷 경계 곡률은 유지된다 (좁은 gap만 연결).
 */
export function closeMask(mask: Uint8Array, w: number, h: number, radius = 2): Uint8Array {
  const dilated = dilate(mask, w, h, radius);
  return erode(dilated, w, h, radius);
}

function dilate(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  // 분리형 box kernel: 가로 → 세로 2-pass
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dx = -r; dx <= r && !v; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < w && src[y * w + nx]) v = 1;
      }
      tmp[y * w + x] = v;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dy = -r; dy <= r && !v; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < h && tmp[ny * w + x]) v = 1;
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

function erode(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 1;
      for (let dx = -r; dx <= r && v; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= w || !src[y * w + nx]) v = 0;
      }
      tmp[y * w + x] = v;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 1;
      for (let dy = -r; dy <= r && v; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h || !tmp[ny * w + x]) v = 0;
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

/** 마스크 후처리: 작은 노이즈 제거 + hole filling 간이판 (fill: majority 3×3) */
export function cleanMask(mask: Uint8Array, w: number, h: number, iterations = 1): Uint8Array {
  let cur = mask;
  for (let it = 0; it < iterations; it++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && cur[ny * w + nx]) count++;
          }
        }
        next[y * w + x] = count >= 5 ? 1 : 0; // majority
      }
    }
    cur = next;
  }
  return cur;
}
