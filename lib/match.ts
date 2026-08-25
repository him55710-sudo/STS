import { PRODUCTS } from "./catalog";
import { colorDistance, PRODUCT_TONES } from "./product-colors";
import type { DetectedObject, Product } from "./types";

/**
 * Product Retrieval — 사업계획서 §09 "Retrieve → Rank".
 * 실서비스에서는 visual embedding + pgvector 검색으로 대체되며,
 * 여기서는 (1) 라벨 키워드 (2) 카테고리 (3) 색상 유사도 (4) 제휴 가능 여부로
 * 후보를 순위화한다. 제휴 상품이 우선 추천되어야 수수료 셰어 BM이 돈다.
 */

export const KEYWORDS: Record<string, string[]> = {
  // ── 실상품 (룩 게시물 카탈로그) ──────────────────────────
  "pl-polo-oxford": ["shirt", "top", "oxford", "셔츠", "상의", "옥스포드"],
  "pl-uniqlo-tee": ["tee", "t-shirt", "top", "shirt", "티셔츠", "상의"],
  "pl-ami-knit": ["knit", "sweater", "top", "니트", "스웨터", "상의"],
  "pl-acne-sweat": ["sweatshirt", "sweat", "top", "hoodie", "스웨트", "맨투맨", "상의", "후디"],
  "pl-acne-scarf": ["scarf", "muffler", "스카프", "머플러", "목도리"],
  "pl-barbour-bedale": ["jacket", "outer", "coat", "wax", "자켓", "아우터", "코트", "왁스"],
  "pl-patagonia-retrox": ["fleece", "jacket", "outer", "top", "플리스", "자켓", "아우터", "상의"],
  "pl-levis-501": ["jeans", "denim", "bottom", "pants", "데님", "진", "하의", "바지", "팬츠", "청바지"],
  "pl-apc-jeans": ["jeans", "denim", "bottom", "pants", "selvedge", "데님", "진", "하의", "바지", "셀비지"],
  "pl-ysl-jeans": ["jeans", "denim", "bottom", "pants", "slim", "데님", "진", "하의", "바지", "슬림"],
  "pl-cos-pants": ["trousers", "pants", "bottom", "slacks", "wide", "트라우저", "팬츠", "슬랙스", "하의", "바지"],
  "pl-tnf-pants": ["cargo", "jogger", "pants", "bottom", "카고", "조거", "팬츠", "하의", "바지"],
  "pl-dm-1461": ["shoes", "derby", "boots", "더비", "슈즈", "신발", "구두", "1461"],
  "pl-samba": ["sneakers", "shoes", "trainer", "스니커즈", "신발", "운동화", "삼바"],
  "pl-margiela-replica": ["sneakers", "shoes", "trainer", "스니커즈", "신발", "운동화", "레플리카", "트레이너", "저먼"],
  "pl-clarks-wallabee": ["shoes", "wallabee", "moccasin", "왈라비", "신발", "모카신"],
  "pl-birken-boston": ["clogs", "shoes", "sandal", "mule", "클로그", "신발", "샌들", "뮬", "보스턴"],
  "pl-prada-bag": ["bag", "crossbody", "shoulder", "백", "가방", "크로스", "숄더"],
  "pl-arc-heliad": ["backpack", "bag", "백팩", "가방", "배낭"],
  "pl-omega-speedmaster": ["watch", "clock", "시계", "워치", "크로노"],
  "pl-cartier-tank": ["watch", "clock", "시계", "워치", "탱크"],
  // ── 여성 룩 상품 ────────────────────────────────────────
  "plw-polo-oxford": ["shirt", "top", "oxford", "blouse", "셔츠", "상의", "옥스포드", "블라우스"],
  "plw-acne-sweat-oat": ["sweatshirt", "sweat", "top", "knit", "스웨트", "맨투맨", "상의", "니트"],
  "plw-barbour-beadnell": ["jacket", "outer", "coat", "wax", "자켓", "재킷", "아우터", "코트", "왁스"],
  "plw-levis-ribcage": ["jeans", "denim", "bottom", "pants", "데님", "진", "하의", "바지", "청바지"],
  "plw-cos-dark-jeans": ["jeans", "denim", "bottom", "pants", "straight", "데님", "진", "하의", "바지", "청바지"],
  "plw-samba-white": ["sneakers", "shoes", "trainer", "스니커즈", "신발", "운동화", "삼바"],
  "plw-prada-re2005": ["bag", "shoulder", "crossbody", "백", "가방", "숄더", "크로스"],
  "plw-longchamp": ["bag", "tote", "handbag", "백", "가방", "토트", "핸드백"],
  "plw-celine-bag": ["bag", "shoulder", "handbag", "백", "가방", "숄더", "핸드백"],
  "plw-polene-bag": ["bag", "handbag", "shoulder", "백", "가방", "핸드백", "숄더"],
  "plw-tiffany-heart": ["necklace", "pendant", "목걸이", "펜던트", "네크리스"],
  "plw-gold-chain": ["necklace", "chain", "pendant", "목걸이", "체인", "네크리스"],
  "plw-gold-bracelet": ["bracelet", "chain", "팔찌", "브레이슬릿"],
  "plw-silver-hoop": ["earring", "earrings", "hoop", "귀걸이", "이어링", "후프"],
  "plw-gold-hoop": ["earring", "earrings", "hoop", "귀걸이", "이어링", "후프"],
  "plw-silver-stud": ["earring", "earrings", "stud", "귀걸이", "이어링", "스터드"],
  "plw-silver-rings": ["ring", "rings", "반지", "링"],
  "plw-socks": ["socks", "sock", "양말", "삭스"],
};

/**
 * 탐지 오브젝트의 상품 후보 랭킹.
 * 키워드 일치가 기본 관문이고, 제휴 여부·수수료율·색상 유사도가 순위를 가른다.
 */
export function candidatesFor(
  obj: Pick<DetectedObject, "label" | "labelKo" | "category" | "tone">
): Product[] {
  const needle = `${obj.label} ${obj.labelKo}`.toLowerCase();
  const scored = PRODUCTS.map((p) => {
    let score = 0;
    let hits = 0;
    for (const kw of KEYWORDS[p.id] ?? []) {
      if (needle.includes(kw.toLowerCase())) hits += 1;
    }
    if (hits > 0) score += 3 + Math.min(hits - 1, 2) * 0.5;
    if (p.category === obj.category) score += 1;
    // 제휴 가능 상품 우선 — 파트너 수수료 셰어 BM의 핵심
    if (p.affiliate) score += 1.5 + (p.commissionRate ?? 0.05) * 8;
    // 색상 유사도 — 탐지 영역 평균색 vs 상품 정색
    const tone = PRODUCT_TONES[p.id];
    if (obj.tone && tone) {
      const d = colorDistance(obj.tone, tone);
      if (d < 70) score += 2;
      else if (d < 120) score += 1;
      else if (d < 170) score += 0.4;
    }
    return { p, score, hits };
  })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 4).map((x) => x.p);
}

export function searchProducts(q: string): Product[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return PRODUCTS.filter((p) =>
    `${p.brand} ${p.name} ${p.retailer} ${(KEYWORDS[p.id] ?? []).join(" ")}`
      .toLowerCase()
      .includes(needle)
  )
    .sort((a, b) => Number(b.affiliate) - Number(a.affiliate))
    .slice(0, 10);
}
