import type { DetectedObject } from "../types";
import { canonicalClass } from "../vision-config";
import type { RetrievalQuery } from "./types";

/**
 * Query Generation — 객체 속성에서 검색 쿼리 variant 3~5개를 만든다.
 * category-level("니트")에서 멈추지 않고 브랜드 후보·색상·로고 근거를 조합한다.
 * 예: "AMI Paris 아미 드 쾨르 크림 니트", "크림 니트 하트 로고 A", "cream heart logo sweater"
 */

/** canonical class → 한국어 검색 명사 */
const CLASS_KO: Record<string, string[]> = {
  top: ["니트", "셔츠", "티셔츠", "상의"],
  outerwear: ["자켓", "코트", "아우터"],
  pants: ["팬츠", "청바지", "바지"],
  shorts: ["반바지"],
  skirt: ["스커트"],
  dress: ["원피스"],
  shoes: ["스니커즈", "신발"],
  bag: ["가방", "숄더백"],
  hat: ["모자", "캡"],
  glasses: ["선글라스", "안경"],
  belt: ["벨트"],
  scarf: ["머플러", "스카프"],
  watch: ["시계", "워치"],
  bracelet: ["팔찌"],
  necklace: ["목걸이"],
  earrings: ["귀걸이"],
  ring: ["반지"],
};

/** hex → 대략적인 한국어/영어 색상명 (검색어용) */
export function colorName(hex?: string): { ko: string; en: string } | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = max === 0 ? 0 : (max - min) / max;

  if (sat < 0.14) {
    if (lum > 225) return { ko: "화이트", en: "white" };
    if (lum > 185) return { ko: "아이보리", en: "ivory" };
    if (lum > 130) return { ko: "그레이", en: "grey" };
    if (lum > 60) return { ko: "차콜", en: "charcoal" };
    return { ko: "블랙", en: "black" };
  }
  if (r >= g && g >= b) {
    if (lum > 190) return { ko: "크림", en: "cream" };
    if (lum > 130) return { ko: "베이지", en: "beige" };
    if (g > b + 40) return { ko: "카멜", en: "camel" };
    return { ko: "브라운", en: "brown" };
  }
  if (b > r && b > g) {
    if (lum > 170) return { ko: "라이트 블루", en: "light blue" };
    if (lum > 90) return { ko: "블루", en: "blue" };
    return { ko: "네이비", en: "navy" };
  }
  if (g > r && g > b) return { ko: "카키", en: "olive" };
  if (r > g + 60 && r > b + 60) return { ko: "레드", en: "red" };
  return { ko: "베이지", en: "beige" };
}

export function buildRetrievalQuery(obj: DetectedObject): RetrievalQuery {
  const cls = obj.canonicalClass ?? canonicalClass(`${obj.label} ${obj.labelKo}`);
  const nouns = CLASS_KO[cls] ?? [obj.labelKo];
  const color = colorName(obj.tone);
  const attrs = obj.attributes;
  const brand = attrs?.brandCandidates?.[0];
  const brandConfident = brand && brand.confidence >= 0.5;
  const logo = attrs?.logo?.detected ? attrs.logo : null;

  const queries: string[] = [];

  // 1) 브랜드 확신 시: 브랜드 + 라벨 + 색상 (가장 구체적)
  if (brandConfident) {
    queries.push([brand.brand, color?.ko, obj.labelKo].filter(Boolean).join(" "));
    queries.push([brand.brand, obj.label, color?.en].filter(Boolean).join(" "));
  }
  // 2) 로고/텍스트 근거 조합
  if (logo?.text || logo?.description) {
    queries.push([color?.ko, nouns[0], logo.text ?? logo.description].filter(Boolean).join(" "));
  }
  if (attrs?.visibleText?.length) {
    queries.push([attrs.visibleText[0], nouns[0], color?.ko].filter(Boolean).join(" "));
  }
  // 3) 색상 + 특징 + 명사
  const feature = attrs?.distinctiveFeatures?.[0];
  queries.push([color?.ko, feature, nouns[0]].filter(Boolean).join(" "));
  // 4) 라벨 원문 + 색상
  queries.push([color?.ko, obj.labelKo].filter(Boolean).join(" "));

  // dedupe + 빈 문자열 제거 + 최대 5개
  const seen = new Set<string>();
  const finalQueries = queries
    .map((q) => q.trim())
    .filter((q) => q.length > 1 && !seen.has(q) && (seen.add(q), true))
    .slice(0, 5);

  return {
    canonicalClass: cls,
    label: obj.label,
    labelKo: obj.labelKo,
    tone: obj.tone,
    secondaryTones: obj.secondaryTones,
    attributes: attrs,
    queries: finalQueries,
  };
}
