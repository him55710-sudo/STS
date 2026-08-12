import { PRODUCTS } from "./catalog";
import type { DetectedObject, Product } from "./types";

/**
 * Product Retrieval (데모) — 사업계획서 §09 "Retrieve → Rank".
 * 실서비스에서는 visual embedding + pgvector 검색으로 대체되며,
 * 여기서는 label 키워드 + category 매칭으로 후보를 순위화한다.
 */

const KEYWORDS: Record<string, string[]> = {
  "p-mug": ["mug", "cup", "머그", "컵"],
  "p-mug-2": ["mug", "cup", "머그", "컵"],
  "p-mug-3": ["mug", "cup", "latte", "머그", "컵", "라떼"],
  "p-coat": ["coat", "jacket", "outer", "코트", "자켓", "아우터"],
  "p-coat-2": ["coat", "jacket", "코트", "자켓"],
  "p-shirt": ["shirt", "blouse", "top", "셔츠", "블라우스", "상의"],
  "p-jeans": ["jeans", "denim", "pants", "trousers", "데님", "팬츠", "바지", "하의", "진"],
  "p-loafers": ["loafer", "shoe", "로퍼", "구두", "신발"],
  "p-loafers-2": ["loafer", "shoe", "로퍼", "구두", "신발"],
  "p-bag": ["bag", "shoulder", "백", "숄더", "가방"],
  "p-bag-2": ["bag", "mini", "백", "가방"],
  "p-hoodie": ["hoodie", "sweatshirt", "top", "후디", "후드", "맨투맨", "상의"],
  "p-cap": ["cap", "hat", "캡", "모자", "볼캡"],
  "p-sneakers": ["sneaker", "shoe", "trainer", "스니커즈", "운동화", "신발"],
  "p-sneakers-2": ["sneaker", "shoe", "canvas", "스니커즈", "운동화", "신발"],
  "p-crossbody": ["crossbody", "bag", "크로스", "가방", "백"],
  "p-monitor": ["monitor", "display", "screen", "모니터", "디스플레이"],
  "p-keyboard": ["keyboard", "키보드"],
  "p-keyboard-2": ["keyboard", "키보드"],
  "p-lamp": ["lamp", "light", "램프", "조명", "스탠드"],
  "p-headphones": ["headphone", "headset", "헤드폰", "헤드셋"],
  "p-sofa": ["sofa", "couch", "소파", "카우치"],
  "p-sofa-2": ["sofa", "chair", "lounge", "소파", "체어", "의자"],
  "p-floorlamp": ["lamp", "floor", "램프", "조명", "플로어"],
  "p-sidetable": ["table", "테이블", "탁자"],
  "p-serum": ["serum", "ampoule", "bottle", "세럼", "앰플", "에센스"],
  "p-serum-2": ["serum", "세럼", "앰플"],
  "p-cream": ["cream", "jar", "moisturizer", "크림", "수분"],
  "p-toner": ["toner", "토너", "스킨"],
};

export function candidatesFor(obj: Pick<DetectedObject, "label" | "labelKo" | "category">): Product[] {
  const needle = `${obj.label} ${obj.labelKo}`.toLowerCase();
  const scored = PRODUCTS.map((p) => {
    let score = 0;
    for (const kw of KEYWORDS[p.id] ?? []) {
      if (needle.includes(kw.toLowerCase())) score += 3;
    }
    if (p.category === obj.category) score += 1;
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((x) => x.p);
}

export function searchProducts(q: string): Product[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return PRODUCTS.filter((p) =>
    `${p.brand} ${p.name} ${(KEYWORDS[p.id] ?? []).join(" ")}`.toLowerCase().includes(needle)
  ).slice(0, 8);
}
