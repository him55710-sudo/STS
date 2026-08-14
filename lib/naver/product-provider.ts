import { naverSearch, searchImages } from "./api-hub";

/**
 * 네이버 검색 기반 실상품 후보 provider (서버 전용).
 *
 * 배경: 쇼핑 검색 API(/v1/search/shop.json)는 2026-07-31 종료되어 상품 데이터를
 * 직접 받을 공식 경로가 없다. 대신 두 검색을 조합해 **실제 판매 페이지**를 찾는다:
 *
 *   1) webkr(웹문서 검색): 네이버 웹 인덱스에서 스마트스토어·무신사·29CM 등
 *      **쇼핑몰 상품 페이지 URL**을 직접 얻는다. 도메인 허용목록으로 몰만 남긴다.
 *   2) image(이미지 검색): webkr이 미등록/실패면 이미지 검색 결과의 상품명 제목으로
 *      후보를 만들고, 링크는 네이버쇼핑 검색 딥링크(항상 유효)로 연결한다.
 *
 * LLM이 전혀 없어도 동작한다 — "웹 후보 0개 → 카탈로그만 노출" 문제의 직접 해결.
 * 크롤링은 하지 않는다(검색 API 응답만 사용). 이미지 원본은 노출하지 않는다.
 */

export interface NaverWebCandidate {
  id: string;
  brand: string | null;
  productName: string;
  category: string | null;
  color: string | null;
  price: { value: number | null; currency: string | null };
  retailer: string;
  url: string;
  imageUrls: string[];
  source: string;
  sourceUrl?: string;
  pageTrust?: number;
}

interface WebkrItem {
  title: string;
  link: string;
  description: string;
}

/** 알려진 쇼핑몰 도메인 → 표시명·신뢰도. 여기 없는 도메인(블로그·뉴스 등)은 버린다. */
const MALLS: { re: RegExp; name: string; trust: number }[] = [
  { re: /brand\.naver\.com/i, name: "네이버 브랜드스토어", trust: 0.9 },
  { re: /smartstore\.naver\.com/i, name: "네이버 스마트스토어", trust: 0.85 },
  { re: /shopping\.naver\.com/i, name: "네이버쇼핑", trust: 0.85 },
  { re: /musinsa\.com/i, name: "무신사", trust: 0.9 },
  { re: /29cm\.co\.kr/i, name: "29CM", trust: 0.9 },
  { re: /wconcept\.co\.kr/i, name: "W컨셉", trust: 0.85 },
  { re: /ssfshop\.com/i, name: "SSF샵", trust: 0.85 },
  { re: /zigzag\.kr/i, name: "지그재그", trust: 0.85 },
  { re: /kream\.co\.kr/i, name: "KREAM", trust: 0.85 },
  { re: /a-bly\.com/i, name: "에이블리", trust: 0.8 },
  { re: /oliveyoung\.co\.kr/i, name: "올리브영", trust: 0.8 },
  { re: /ssg\.com/i, name: "SSG", trust: 0.8 },
  { re: /lotteon\.com/i, name: "롯데온", trust: 0.78 },
  { re: /hyundaihmall\.com/i, name: "현대Hmall", trust: 0.78 },
  { re: /coupang\.com/i, name: "쿠팡", trust: 0.75 },
  { re: /gmarket\.co\.kr/i, name: "G마켓", trust: 0.7 },
  { re: /11st\.co\.kr/i, name: "11번가", trust: 0.7 },
];

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .trim();

/** "129,000원" / "12900원" → 129000 */
export function extractPriceKRW(text: string): number | null {
  const m = /(\d{1,3}(?:,\d{3})+|\d{4,8})\s*원/.exec(text);
  if (!m) return null;
  const v = parseInt(m[1].replace(/,/g, ""), 10);
  // 의류 가격으로 비현실적인 값은 버린다 (오탐: 전화번호·연도 등)
  return v >= 1000 && v <= 20_000_000 ? v : null;
}

function mallOf(url: string): { name: string; trust: number } | null {
  for (const m of MALLS) if (m.re.test(url)) return { name: m.name, trust: m.trust };
  return null;
}

/** 몰 페이지 제목 정리 — " : 무신사" / " - 29CM" 같은 몰 접미어 제거 */
function cleanTitle(title: string): string {
  return stripTags(title)
    .replace(/\s*[:|\-–]\s*(무신사|29CM|W컨셉|네이버|스마트스토어|브랜드스토어|SSG|쿠팡|지그재그|KREAM|올리브영)[^]*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const nvDeeplink = (q: string) =>
  `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`;

/**
 * 1차: webkr 웹문서 검색으로 쇼핑몰 상품 페이지를 찾는다.
 * 반환이 비면(미등록·무결과) 빈 배열 — 호출측에서 이미지 검색 폴백을 쓴다.
 */
export async function searchWebkrProducts(
  queries: string[],
  perQuery = 8
): Promise<NaverWebCandidate[]> {
  const qs = queries.slice(0, 3);
  const results = await Promise.all(
    qs.map((q) => naverSearch<WebkrItem>("webkr", q, { display: perQuery, start: 1 }))
  );

  const seen = new Set<string>();
  const out: NaverWebCandidate[] = [];
  for (const res of results) {
    if (!res.ok) continue;
    for (const item of res.items) {
      const mall = mallOf(item.link);
      if (!mall) continue; // 쇼핑몰 페이지만
      const url = item.link.split("#")[0];
      const key = url.replace(/\?.*$/, "");
      if (seen.has(key)) continue;
      seen.add(key);

      const name = cleanTitle(item.title);
      if (name.length < 5) continue;
      const desc = stripTags(item.description ?? "");
      out.push({
        id: `nvweb-${out.length}`,
        brand: null,
        productName: name,
        category: null,
        color: null,
        price: { value: extractPriceKRW(`${name} ${desc}`), currency: "KRW" },
        retailer: mall.name,
        url,
        imageUrls: [],
        source: "naver-web",
        sourceUrl: url,
        pageTrust: mall.trust,
      });
    }
  }
  return out.slice(0, 8);
}

/**
 * 2차 폴백: 이미지 검색 제목으로 후보 생성.
 * 이미지 검색 응답엔 페이지 URL이 없으므로 링크는 네이버쇼핑 검색 딥링크로 연결한다.
 * (이미지 자체는 제3자 저작물 — 노출하지 않고 제목 텍스트만 사용)
 */
export async function searchImageTitleProducts(queries: string[]): Promise<NaverWebCandidate[]> {
  const q = queries[0];
  if (!q) return [];
  const res = await searchImages(q, 8);
  if (!res.ok) return [];

  const seen = new Set<string>();
  const out: NaverWebCandidate[] = [];
  for (const item of res.items) {
    // 몰 상품 이미지 제목 관례: "상품명 : 몰이름" / "상품명 - 몰이름"
    const [rawName, mallName] = stripTags(item.title).split(/\s+[:|\-–]\s+/);
    const name = (rawName ?? "").trim();
    if (name.length < 5 || seen.has(name)) continue;
    seen.add(name);
    out.push({
      id: `nvimg-${out.length}`,
      brand: null,
      productName: name,
      category: null,
      color: null,
      price: { value: null, currency: null },
      retailer: mallName?.trim() || "네이버쇼핑",
      url: nvDeeplink(name),
      imageUrls: [],
      source: "naver-image-title",
      pageTrust: 0.6,
    });
  }
  return out.slice(0, 6);
}

/** webkr → 이미지 제목 순으로 시도하는 통합 진입점 */
export async function searchNaverProducts(queries: string[]): Promise<NaverWebCandidate[]> {
  const webkr = await searchWebkrProducts(queries);
  if (webkr.length > 0) return webkr;
  return searchImageTitleProducts(queries);
}
