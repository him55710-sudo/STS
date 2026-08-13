/**
 * 상품 대표색 — 실제 상품의 정색(ground truth) 기준.
 * 온디바이스 탐지가 추출한 영역 평균색과 비교해 후보 랭킹에 반영한다.
 * (크롭 이미지 평균은 배경 오염이 커서 제품 실색을 수동 지정)
 */
export const PRODUCT_TONES: Record<string, string> = {
  // 실상품 (룩 게시물)
  "pl-polo-oxford": "#a9c3e2",
  "pl-levis-501": "#a9bccd",
  "pl-dm-1461": "#1c1d1f",
  "pl-prada-bag": "#17181a",
  "pl-barbour-bedale": "#4b4f3d",
  "pl-uniqlo-tee": "#f0f0ee",
  "pl-apc-jeans": "#2c3442",
  "pl-clarks-wallabee": "#c3a274",
  "pl-omega-speedmaster": "#2e3138",
  "pl-acne-sweat": "#c9c9cb",
  "pl-acne-scarf": "#cfc4b2",
  "pl-cos-pants": "#3a3b3d",
  "pl-margiela-replica": "#eceae6",
  "pl-patagonia-retrox": "#cfc4b4",
  "pl-tnf-pants": "#4a4c4e",
  "pl-birken-boston": "#8f8175",
  "pl-arc-heliad": "#202124",
  "pl-ami-knit": "#e6dfd0",
  "pl-ysl-jeans": "#23262e",
  "pl-samba": "#232324",
  "pl-cartier-tank": "#6b5340",
  // 여성 룩 상품
  "plw-polo-oxford": "#a9cdea",
  "plw-levis-ribcage": "#b3cbdb",
  "plw-samba-white": "#f4f3ee",
  "plw-prada-re2005": "#0b0b0c",
  "plw-tiffany-heart": "#d5d5d5",
  "plw-silver-hoop": "#d5d5d5",
  "plw-barbour-beadnell": "#3d4134",
  "plw-cos-dark-jeans": "#182431",
  "plw-longchamp": "#101010",
  "plw-gold-hoop": "#c9a14a",
  "plw-silver-rings": "#d5d5d5",
  "plw-acne-sweat-oat": "#d7d0c4",
  "plw-celine-bag": "#101010",
  "plw-gold-chain": "#c5a04f",
  "plw-gold-bracelet": "#c5a04f",
  "plw-socks": "#f4f3ef",
  "plw-silver-stud": "#d5d5d5",
  "plw-polene-bag": "#121212",
};

/** RGB 거리 (0 ~ 441) */
export function colorDistance(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return Infinity;
  return Math.sqrt((pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2 + (pa[2] - pb[2]) ** 2);
}

function parse(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
