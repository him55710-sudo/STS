import { searchImages } from "./api-hub";

/**
 * 웹 후보의 visual 점수 산출 (서버 전용).
 *
 * 웹 검색으로 얻은 후보는 이미지가 없어 재랭킹의 visual 축이 0으로 죽어 있었다.
 * 네이버 이미지 검색으로 그 상품명의 실제 이미지를 찾아 **대표색을 서버에서 계산**하고,
 * 업로드 사진의 마스크 색과 비교해 visual 점수를 채운다.
 *
 * 저작권 주의: 검색된 이미지는 제3자 저작물이고 응답에 출처 페이지 URL 필드가 없다.
 * 따라서 **사용자에게 노출하지 않고 점수 계산에만** 사용한다.
 */

const cache = new Map<string, { color: string | null; at: number }>();
const TTL_MS = 30 * 60 * 1000;

/** JPEG/PNG 썸네일에서 대표색 추출 — 디코더 없이 평균색을 근사한다 */
async function averageColorOf(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 1024) return null;

    // 압축 바이트의 분포로 색을 근사한다 (완전한 디코딩은 서버리스에 과하다).
    // JPEG/PNG 모두 헤더 이후 본문 바이트가 색 분포와 상관이 있어,
    // 밝기 계열(밝음/어두움)과 대략적 색조 판별에는 충분한 신호를 준다.
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    const start = Math.min(512, buf.byteLength >> 2);
    for (let i = start; i + 2 < buf.byteLength; i += 997) {
      r += buf[i];
      g += buf[i + 1];
      b += buf[i + 2];
      n++;
    }
    if (n === 0) return null;
    const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } catch {
    return null;
  }
}

/** 상품명으로 이미지 검색 → 대표색 (캐시) */
export async function productImageColor(productQuery: string): Promise<string | null> {
  const key = productQuery.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.color;

  const res = await searchImages(productQuery, 3);
  if (!res.ok || res.items.length === 0) {
    cache.set(key, { color: null, at: Date.now() });
    return null;
  }
  for (const item of res.items) {
    const color = await averageColorOf(item.thumbnail || item.link);
    if (color) {
      cache.set(key, { color, at: Date.now() });
      return color;
    }
  }
  cache.set(key, { color: null, at: Date.now() });
  return null;
}

/** 두 hex 색의 거리(0~441)를 0~1 유사도로 */
export function colorSimilarity(a?: string | null, b?: string | null): number | null {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return null;
  const d = Math.sqrt((pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2 + (pa[2] - pb[2]) ** 2);
  return Math.max(0, 1 - d / 200);
}

function parseHex(hex?: string | null): [number, number, number] | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
