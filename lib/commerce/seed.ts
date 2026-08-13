import { PRODUCT_TONES } from "../product-colors";
import type { Product } from "../types";
import type {
  AffiliateProgram,
  CanonicalProduct,
  Merchant,
  MerchantOffer,
} from "./types";

/**
 * 시드 상품 그래프 — 기존 39개 시드 Product를 canonical + offer로 이관한다.
 *
 *  - canonical id는 기존 product id를 그대로 계승한다
 *    (object_product_links.product_id·savedProducts·KEYWORDS·PRODUCT_TONES 전부 호환).
 *  - 상품마다 공식몰 오퍼 1개가 기본 생성되고, 대표 상품 몇 개는 복수 판매처
 *    오퍼를 가진다 (CanonicalProduct 1:N MerchantOffer 실증 + resolver 검증 데이터).
 *  - 실제 제휴 연동은 없다: affiliateUrl은 전부 null, provider는 자리표시 문자열.
 *  - 이 파일이 데모 모드의 진실이고, DB 시드 마이그레이션은 여기서 생성된다
 *    (scripts/generate-commerce-seed.mjs) — 두 곳이 어긋날 수 없다.
 */

const nv = (q: string) => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`;

/** 판매처 자체 검색 딥링크 — 가짜 상품 페이지 URL을 만들지 않는다 (기존 관행과 동일) */
const marketplaceSearch: Record<string, (q: string) => string> = {
  "m-gmarket": (q) => `https://browse.gmarket.co.kr/search?keyword=${encodeURIComponent(q)}`,
  "m-coupang": (q) => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`,
  "m-ssg": (q) => `https://www.ssg.com/search.ssg?query=${encodeURIComponent(q)}`,
  "m-musinsa": (q) => `https://www.musinsa.com/search/goods?keyword=${encodeURIComponent(q)}`,
  "m-29cm": (q) => `https://shop.29cm.co.kr/search?keyword=${encodeURIComponent(q)}`,
};

// ── 기준 상품 데이터 (구 lib/catalog.ts LOOK_PRODUCTS · LOOK_PRODUCTS_W 이관) ──
// price/retailer/url은 "공식몰 오퍼"의 재료가 되고, 나머지는 canonical 속성이 된다.
const BASE: Product[] = [
  // 남성 룩 1~5
  { id: "pl-polo-oxford", brand: "Polo Ralph Lauren", name: "아이코닉 옥스포드 셔츠 클래식 핏", price: 259000, currency: "KRW", retailer: "폴로 공식몰", url: nv("폴로 랄프로렌 아이코닉 옥스포드 셔츠 클래식핏 블루"), image: "/looks/pl-polo-oxford.jpg", category: "fashion", affiliate: true, commissionRate: 0.07, similarIds: ["plw-polo-oxford", "pl-uniqlo-tee"] },
  { id: "pl-levis-501", brand: "Levi's", name: "501 오리지널 라이트 워시", price: 91300, currency: "KRW", retailer: "리바이스 공식몰", url: nv("리바이스 501 오리지널 라이트 인디고"), image: "/looks/pl-levis-501.jpg", category: "fashion", affiliate: true, commissionRate: 0.08, similarIds: ["pl-apc-jeans", "plw-levis-ribcage"] },
  { id: "pl-dm-1461", brand: "Dr. Martens", name: "1461 스무스 블랙", price: 195000, currency: "KRW", retailer: "닥터마틴 공식몰", url: nv("닥터마틴 1461 스무스 블랙 3홀"), image: "/looks/pl-dm-1461.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["pl-samba"] },
  { id: "pl-prada-bag", brand: "Prada", name: "리나일론 사피아노 숄더백", price: 2300000, currency: "KRW", retailer: "프라다 공식", url: nv("프라다 리나일론 사피아노 숄더백 블랙"), image: "/looks/pl-prada-bag.jpg", category: "fashion", affiliate: false, similarIds: ["plw-prada-re2005"] },
  { id: "pl-barbour-bedale", brand: "Barbour", name: "비데일 왁스 자켓 세이지", price: 384000, currency: "KRW", retailer: "바버 공식몰", url: nv("바버 비데일 왁스자켓 세이지"), image: "/looks/pl-barbour-bedale.jpg", category: "fashion", affiliate: true, commissionRate: 0.07, similarIds: ["plw-barbour-beadnell", "pl-patagonia-retrox"] },
  { id: "pl-uniqlo-tee", brand: "Uniqlo", name: "수피마 코튼 크루넥 티셔츠", price: 19900, currency: "KRW", retailer: "유니클로", url: nv("유니클로 수피마 코튼 크루넥 티셔츠 화이트"), image: "/looks/pl-uniqlo-tee.jpg", category: "fashion", affiliate: true, commissionRate: 0.03, similarIds: [] },
  { id: "pl-apc-jeans", brand: "A.P.C.", name: "쁘띠 스탠다드 로우 인디고 셀비지", price: 329000, currency: "KRW", retailer: "A.P.C. 공식", url: nv("아페쎄 쁘띠 스탠다드 셀비지 데님"), image: "/looks/pl-apc-jeans.jpg", category: "fashion", affiliate: false, similarIds: ["pl-levis-501", "plw-cos-dark-jeans"] },
  { id: "pl-clarks-wallabee", brand: "Clarks Originals", name: "왈라비 메이플 스웨이드", price: 259000, currency: "KRW", retailer: "클락스 공식몰", url: nv("클락스 왈라비 메이플 스웨이드"), image: "/looks/pl-clarks-wallabee.jpg", category: "fashion", affiliate: true, commissionRate: 0.08, similarIds: ["pl-birken-boston"] },
  { id: "pl-omega-speedmaster", brand: "Omega", name: "스피드마스터 문워치 프로페셔널", price: 11500000, currency: "KRW", retailer: "오메가 부티크", url: nv("오메가 스피드마스터 문워치 프로페셔널"), image: "/looks/pl-omega-speedmaster.jpg", category: "fashion", affiliate: false, similarIds: ["pl-cartier-tank"] },
  { id: "pl-acne-sweat", brand: "Acne Studios", name: "러버 로고 플리스 스웨트셔츠", price: 450000, currency: "KRW", retailer: "아크네 공식", url: nv("아크네 스튜디오 로고 스웨트셔츠 그레이"), image: "/looks/pl-acne-sweat.jpg", category: "fashion", affiliate: false, similarIds: ["plw-acne-sweat-oat"] },
  { id: "pl-acne-scarf", brand: "Acne Studios", name: "투톤 울 스카프 라이트 베이지", price: 290000, currency: "KRW", retailer: "아크네 공식", url: nv("아크네 스튜디오 울 머플러 베이지"), image: "/looks/pl-acne-scarf.jpg", category: "fashion", affiliate: false, similarIds: [] },
  { id: "pl-cos-pants", brand: "COS", name: "와이드 레그 울 트라우저 블랙", price: 159000, currency: "KRW", retailer: "COS 공식몰", url: nv("COS 와이드 레그 트라우저 블랙"), image: "/looks/pl-cos-pants.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["pl-tnf-pants"] },
  { id: "pl-margiela-replica", brand: "Maison Margiela", name: "레플리카 스니커즈 화이트", price: 790000, currency: "KRW", retailer: "마르지엘라 공식", url: nv("메종 마르지엘라 레플리카 스니커즈 화이트"), image: "/looks/pl-margiela-replica.jpg", category: "fashion", affiliate: false, similarIds: ["pl-samba", "plw-samba-white"] },
  { id: "pl-patagonia-retrox", brand: "Patagonia", name: "클래식 레트로X 플리스 자켓", price: 289000, currency: "KRW", retailer: "파타고니아 코리아", url: nv("파타고니아 클래식 레트로X 자켓 내추럴"), image: "/looks/pl-patagonia-retrox.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["pl-barbour-bedale"] },
  { id: "pl-tnf-pants", brand: "The North Face", name: "카고 조거 팬츠 다크 그레이", price: 139000, currency: "KRW", retailer: "노스페이스 코리아", url: nv("노스페이스 카고 조거 팬츠 다크그레이"), image: "/looks/pl-tnf-pants.jpg", category: "fashion", affiliate: true, commissionRate: 0.07, similarIds: ["pl-cos-pants"] },
  { id: "pl-birken-boston", brand: "Birkenstock", name: "보스턴 소프트풋베드 스웨이드 토프", price: 229000, currency: "KRW", retailer: "버켄스탁 공식몰", url: nv("버켄스탁 보스턴 소프트풋베드 스웨이드 토프"), image: "/looks/pl-birken-boston.jpg", category: "fashion", affiliate: true, commissionRate: 0.08, similarIds: ["pl-clarks-wallabee"] },
  { id: "pl-arc-heliad", brand: "Arc'teryx", name: "헬리어드 15 백팩 블랙", price: 180000, currency: "KRW", retailer: "아크테릭스 코리아", url: nv("아크테릭스 헬리어드 15 백팩"), image: "/looks/pl-arc-heliad.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: [] },
  { id: "pl-ami-knit", brand: "AMI Paris", name: "아미 드 쾨르 크루넥 울 니트 내추럴", price: 595000, currency: "KRW", retailer: "AMI 공식", url: nv("아미 파리 하트로고 크루넥 니트 내추럴"), image: "/looks/pl-ami-knit.jpg", category: "fashion", affiliate: false, similarIds: ["plw-acne-sweat-oat"] },
  { id: "pl-ysl-jeans", brand: "Saint Laurent", name: "슬림핏 진 다크 블루 블랙", price: 1340000, currency: "KRW", retailer: "생로랑 공식", url: nv("생로랑 슬림핏 데님 블랙"), image: "/looks/pl-ysl-jeans.jpg", category: "fashion", affiliate: false, similarIds: ["plw-cos-dark-jeans"] },
  { id: "pl-samba", brand: "Adidas", name: "삼바 OG 블랙", price: 139000, currency: "KRW", retailer: "아디다스 코리아", url: nv("아디다스 삼바 OG 블랙"), image: "/looks/pl-samba.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["plw-samba-white", "pl-dm-1461"] },
  { id: "pl-cartier-tank", brand: "Cartier", name: "탱크 머스트 레더 스트랩", price: 4300000, currency: "KRW", retailer: "까르띠에 부티크", url: nv("까르띠에 탱크 머스트"), image: "/looks/pl-cartier-tank.jpg", category: "fashion", affiliate: false, similarIds: ["pl-omega-speedmaster"] },
  // 여성 룩 6~10
  { id: "plw-polo-oxford", brand: "Polo Ralph Lauren", name: "클래식 핏 옥스포드 셔츠 스카이 블루", price: 198000, currency: "KRW", retailer: "폴로 공식몰", url: nv("폴로 랄프로렌 여성 클래식핏 옥스포드 셔츠 블루"), image: "/looks/plw-polo-oxford.jpg", category: "fashion", affiliate: true, commissionRate: 0.07, similarIds: ["pl-polo-oxford"] },
  { id: "plw-levis-ribcage", brand: "Levi's", name: "리브케이지 스트레이트 앵클 라이트 워시", price: 148000, currency: "KRW", retailer: "리바이스 공식몰", url: nv("리바이스 리브케이지 스트레이트 앵클 라이트"), image: "/looks/plw-levis-ribcage.jpg", category: "fashion", affiliate: true, commissionRate: 0.08, similarIds: ["pl-levis-501"] },
  { id: "plw-samba-white", brand: "Adidas", name: "삼바 OG 클라우드 화이트 · 검", price: 139000, currency: "KRW", retailer: "아디다스 코리아", url: nv("아디다스 삼바 OG 화이트 검"), image: "/looks/plw-samba-white.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["pl-samba"] },
  { id: "plw-prada-re2005", brand: "Prada", name: "리에디션 2005 리나일론 숄더백 블랙", price: 2150000, currency: "KRW", retailer: "프라다 공식", url: nv("프라다 리에디션 2005 리나일론 숄더백 블랙"), image: "/looks/plw-prada-re2005.jpg", category: "fashion", affiliate: false, similarIds: ["pl-prada-bag"] },
  { id: "plw-tiffany-heart", brand: "Tiffany & Co.", name: "리턴 투 티파니 하트 태그 펜던트", price: 545000, currency: "KRW", retailer: "티파니 공식", url: nv("티파니 리턴투티파니 하트 태그 펜던트 실버"), image: "/looks/plw-tiffany-heart.jpg", category: "fashion", affiliate: false, similarIds: ["plw-gold-chain"] },
  { id: "plw-silver-hoop", brand: "OST", name: "실버 925 미니 후프 이어링", price: 49000, currency: "KRW", retailer: "OST 공식몰", url: nv("실버 925 미니 후프 이어링"), image: "/looks/plw-silver-hoop.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-gold-hoop", "plw-silver-stud"] },
  { id: "plw-barbour-beadnell", brand: "Barbour", name: "비드넬 왁스 자켓 올리브", price: 399000, currency: "KRW", retailer: "바버 공식몰", url: nv("바버 비드넬 왁스자켓 올리브 여성"), image: "/looks/plw-barbour-beadnell.jpg", category: "fashion", affiliate: true, commissionRate: 0.07, similarIds: ["pl-barbour-bedale"] },
  { id: "plw-cos-dark-jeans", brand: "COS", name: "스트레이트 레그 진 다크 인디고", price: 139000, currency: "KRW", retailer: "COS 공식몰", url: nv("COS 스트레이트 레그 진 다크 인디고"), image: "/looks/plw-cos-dark-jeans.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["pl-apc-jeans"] },
  { id: "plw-longchamp", brand: "Longchamp", name: "르 플리아쥬 오리지널 L 롱핸들 블랙", price: 165000, currency: "KRW", retailer: "롱샴 공식몰", url: nv("롱샴 르플리아쥬 오리지널 L 롱핸들 블랙"), image: "/looks/plw-longchamp.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-polene-bag"] },
  { id: "plw-gold-hoop", brand: "Lloyd", name: "14K 골드 미니 후프 이어링", price: 129000, currency: "KRW", retailer: "로이드 공식몰", url: nv("14K 골드 미니 후프 이어링"), image: "/looks/plw-gold-hoop.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-silver-hoop"] },
  { id: "plw-silver-rings", brand: "OST", name: "실버 925 레이어드 링 세트", price: 59000, currency: "KRW", retailer: "OST 공식몰", url: nv("실버 925 레이어드 반지 세트"), image: "/looks/plw-silver-rings.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-silver-hoop"] },
  { id: "plw-acne-sweat-oat", brand: "Acne Studios", name: "오버사이즈 코튼 스웨트셔츠 오트밀", price: 420000, currency: "KRW", retailer: "아크네 공식", url: nv("아크네 스튜디오 오버사이즈 스웨트셔츠 오트밀"), image: "/looks/plw-acne-sweat-oat.jpg", category: "fashion", affiliate: false, similarIds: ["pl-acne-sweat", "pl-ami-knit"] },
  { id: "plw-celine-bag", brand: "Celine", name: "트리옹프 스몰 숄더백 블랙", price: 5900000, currency: "KRW", retailer: "셀린느 공식", url: nv("셀린느 트리옹프 숄더백 블랙"), image: "/looks/plw-celine-bag.jpg", category: "fashion", affiliate: false, similarIds: ["plw-polene-bag", "plw-prada-re2005"] },
  { id: "plw-gold-chain", brand: "골든듀", name: "14K 라운드 체인 네크리스", price: 298000, currency: "KRW", retailer: "골든듀 공식몰", url: nv("14K 골드 체인 목걸이 레이어드"), image: "/looks/plw-gold-chain.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-tiffany-heart"] },
  { id: "plw-gold-bracelet", brand: "골든듀", name: "14K 체인 브레이슬릿", price: 248000, currency: "KRW", retailer: "골든듀 공식몰", url: nv("14K 골드 체인 팔찌"), image: "/looks/plw-gold-bracelet.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-gold-chain"] },
  { id: "plw-socks", brand: "Uniqlo", name: "리브 크루 삭스 화이트", price: 9900, currency: "KRW", retailer: "유니클로", url: nv("유니클로 리브 크루 삭스 화이트"), image: "/looks/plw-socks.jpg", category: "fashion", affiliate: true, commissionRate: 0.03, similarIds: [] },
  { id: "plw-silver-stud", brand: "OST", name: "실버 925 미니 스터드 이어링", price: 39000, currency: "KRW", retailer: "OST 공식몰", url: nv("실버 925 미니 스터드 귀걸이"), image: "/looks/plw-silver-stud.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-silver-hoop"] },
  { id: "plw-polene-bag", brand: "Polène", name: "뉴메로 위 나노 블랙", price: 580000, currency: "KRW", retailer: "폴렌 공식", url: nv("폴렌 뉴메로 위 나노 블랙"), image: "/looks/plw-polene-bag.jpg", category: "fashion", affiliate: false, similarIds: ["plw-celine-bag", "plw-longchamp"] },
];

// ── 판매처 ──────────────────────────────────────────────────────────────────
// 공식몰: retailer 문자열 → 판매처. 도메인은 공개된 공식 도메인 기준의 시드 값.
const OFFICIAL: Record<string, { id: string; domain: string; trust: number }> = {
  "폴로 공식몰": { id: "m-polo", domain: "ralphlauren.co.kr", trust: 0.9 },
  "리바이스 공식몰": { id: "m-levis", domain: "levi.co.kr", trust: 0.88 },
  "닥터마틴 공식몰": { id: "m-drmartens", domain: "drmartens.co.kr", trust: 0.88 },
  "프라다 공식": { id: "m-prada", domain: "prada.com", trust: 0.95 },
  "바버 공식몰": { id: "m-barbour", domain: "barbour.com", trust: 0.9 },
  "유니클로": { id: "m-uniqlo", domain: "uniqlo.com", trust: 0.88 },
  "A.P.C. 공식": { id: "m-apc", domain: "apc.fr", trust: 0.9 },
  "클락스 공식몰": { id: "m-clarks", domain: "clarks.co.kr", trust: 0.86 },
  "오메가 부티크": { id: "m-omega", domain: "omegawatches.com", trust: 0.96 },
  "아크네 공식": { id: "m-acne", domain: "acnestudios.com", trust: 0.92 },
  "COS 공식몰": { id: "m-cos", domain: "cos.com", trust: 0.88 },
  "마르지엘라 공식": { id: "m-margiela", domain: "maisonmargiela.com", trust: 0.93 },
  "파타고니아 코리아": { id: "m-patagonia", domain: "patagonia.co.kr", trust: 0.9 },
  "노스페이스 코리아": { id: "m-tnf", domain: "thenorthface.co.kr", trust: 0.88 },
  "버켄스탁 공식몰": { id: "m-birkenstock", domain: "birkenstock.co.kr", trust: 0.87 },
  "아크테릭스 코리아": { id: "m-arcteryx", domain: "arcteryx.co.kr", trust: 0.89 },
  "AMI 공식": { id: "m-ami", domain: "amiparis.com", trust: 0.92 },
  "생로랑 공식": { id: "m-ysl", domain: "ysl.com", trust: 0.95 },
  "아디다스 코리아": { id: "m-adidas", domain: "adidas.co.kr", trust: 0.88 },
  "까르띠에 부티크": { id: "m-cartier", domain: "cartier.com", trust: 0.96 },
  "티파니 공식": { id: "m-tiffany", domain: "tiffany.co.kr", trust: 0.95 },
  "OST 공식몰": { id: "m-ost", domain: "brand.naver.com", trust: 0.84 },
  "롱샴 공식몰": { id: "m-longchamp", domain: "longchamp.com", trust: 0.92 },
  "로이드 공식몰": { id: "m-lloyd", domain: "lloydgift.com", trust: 0.85 },
  "셀린느 공식": { id: "m-celine", domain: "celine.com", trust: 0.95 },
  "골든듀 공식몰": { id: "m-goldendew", domain: "goldendew.com", trust: 0.86 },
  "폴렌 공식": { id: "m-polene", domain: "polene-paris.com", trust: 0.9 },
};

const MARKETPLACES: Merchant[] = [
  { id: "m-ssg", name: "SSG닷컴", domain: "ssg.com", logoUrl: null, trustScore: 0.84, status: "active" },
  { id: "m-musinsa", name: "무신사", domain: "musinsa.com", logoUrl: null, trustScore: 0.85, status: "active" },
  { id: "m-29cm", name: "29CM", domain: "29cm.co.kr", logoUrl: null, trustScore: 0.84, status: "active" },
  { id: "m-coupang", name: "쿠팡", domain: "coupang.com", logoUrl: null, trustScore: 0.8, status: "active" },
  { id: "m-gmarket", name: "G마켓", domain: "gmarket.co.kr", logoUrl: null, trustScore: 0.78, status: "active" },
];

export const SEED_MERCHANTS: Merchant[] = [
  ...Object.entries(OFFICIAL).map(([name, m]) => ({
    id: m.id,
    name,
    domain: m.domain,
    logoUrl: null,
    trustScore: m.trust,
    status: "active" as const,
  })),
  ...MARKETPLACES,
];

// ── canonical products ──────────────────────────────────────────────────────
export const SEED_CANONICAL_PRODUCTS: CanonicalProduct[] = BASE.map((p) => ({
  id: p.id,
  brand: p.brand,
  modelName: p.name,
  sku: null,
  gtin: null,
  category: p.category,
  color: PRODUCT_TONES[p.id] ?? null,
  attributes: { similarIds: p.similarIds },
  primaryImage: p.image,
}));

// ── offers ──────────────────────────────────────────────────────────────────
// 공식몰 오퍼: 상품마다 1개 자동 생성 (기존 단일 URL 동작의 이관)
const officialOffers: MerchantOffer[] = BASE.map((p) => ({
  id: `of-${p.id}--${OFFICIAL[p.retailer].id}`,
  canonicalProductId: p.id,
  merchantId: OFFICIAL[p.retailer].id,
  externalProductId: null,
  title: `${p.brand} ${p.name}`,
  price: p.price,
  currency: "KRW",
  stockStatus: "in_stock",
  shippingLabel: p.price >= 50000 ? "무료배송" : null,
  productUrl: p.url,
  affiliateUrl: null,
  commissionRate: p.affiliate ? (p.commissionRate ?? 0.05) : null,
  lastSyncedAt: null,
}));

/** 대표 상품 복수 판매처 오퍼 — resolver의 실제 판단 대상이 되는 다양성 데이터 */
interface ExtraOfferSpec {
  productId: string;
  merchantId: string;
  price: number;
  stock: MerchantOffer["stockStatus"];
  shipping: string | null;
  commission: number | null;
  query: string;
}

const EXTRA: ExtraOfferSpec[] = [
  // Polo Oxford — 과제 예시 그대로: 공식몰 + 백화점몰 + 마켓플레이스들
  { productId: "pl-polo-oxford", merchantId: "m-ssg", price: 259000, stock: "in_stock", shipping: "무료배송", commission: 0.04, query: "폴로 랄프로렌 옥스포드 셔츠 클래식핏" },
  { productId: "pl-polo-oxford", merchantId: "m-gmarket", price: 231000, stock: "in_stock", shipping: null, commission: 0.02, query: "폴로 랄프로렌 옥스포드 셔츠" },
  { productId: "pl-polo-oxford", merchantId: "m-coupang", price: 228900, stock: "low_stock", shipping: "로켓배송", commission: 0.03, query: "폴로 랄프로렌 옥스포드 셔츠" },
  // Levi's 501 — 품절 + 고수수료 오퍼 (resolver가 절대 고르면 안 되는 케이스)
  { productId: "pl-levis-501", merchantId: "m-musinsa", price: 89000, stock: "in_stock", shipping: "무료배송", commission: 0.05, query: "리바이스 501 라이트 워시" },
  { productId: "pl-levis-501", merchantId: "m-coupang", price: 84500, stock: "out_of_stock", shipping: "로켓배송", commission: 0.09, query: "리바이스 501" },
  // Samba
  { productId: "pl-samba", merchantId: "m-29cm", price: 139000, stock: "in_stock", shipping: "무료배송", commission: 0.04, query: "아디다스 삼바 OG 블랙" },
  { productId: "pl-samba", merchantId: "m-gmarket", price: 126000, stock: "in_stock", shipping: null, commission: 0.02, query: "아디다스 삼바 OG 블랙" },
  // Dr. Martens 1461
  { productId: "pl-dm-1461", merchantId: "m-musinsa", price: 189000, stock: "low_stock", shipping: "무료배송", commission: 0.06, query: "닥터마틴 1461 스무스 블랙" },
  // Longchamp
  { productId: "plw-longchamp", merchantId: "m-ssg", price: 158000, stock: "in_stock", shipping: "무료배송", commission: 0.04, query: "롱샴 르플리아쥬 L 블랙" },
];

const baseById = new Map(BASE.map((p) => [p.id, p]));

const extraOffers: MerchantOffer[] = EXTRA.map((e) => ({
  id: `of-${e.productId}--${e.merchantId}`,
  canonicalProductId: e.productId,
  merchantId: e.merchantId,
  externalProductId: null,
  title: `${baseById.get(e.productId)!.brand} ${baseById.get(e.productId)!.name}`,
  price: e.price,
  currency: "KRW",
  stockStatus: e.stock,
  shippingLabel: e.shipping,
  productUrl: marketplaceSearch[e.merchantId](e.query),
  affiliateUrl: null,
  commissionRate: e.commission,
  lastSyncedAt: null,
}));

export const SEED_OFFERS: MerchantOffer[] = [...officialOffers, ...extraOffers];

// ── 제휴 프로그램 (자리표시 — 실연동은 click attribution 단계) ────────────────
const MARKETPLACE_PROGRAMS: AffiliateProgram[] = [
  { id: "ap-m-coupang", merchantId: "m-coupang", provider: "coupang-partners", commissionType: "percentage", defaultRate: 0.03, cookieWindowHours: 24, status: "pending" },
  { id: "ap-m-gmarket", merchantId: "m-gmarket", provider: "linkprice", commissionType: "percentage", defaultRate: 0.02, cookieWindowHours: 720, status: "pending" },
  { id: "ap-m-ssg", merchantId: "m-ssg", provider: "linkprice", commissionType: "percentage", defaultRate: 0.04, cookieWindowHours: 720, status: "pending" },
  { id: "ap-m-musinsa", merchantId: "m-musinsa", provider: "direct", commissionType: "percentage", defaultRate: 0.05, cookieWindowHours: 168, status: "pending" },
  { id: "ap-m-29cm", merchantId: "m-29cm", provider: "linkprice", commissionType: "percentage", defaultRate: 0.04, cookieWindowHours: 720, status: "pending" },
];

// 수수료 오퍼가 있는 공식몰: direct 프로그램 자동 생성 (default = 해당 몰 최대율)
const officialPrograms: AffiliateProgram[] = (() => {
  const maxRate = new Map<string, number>();
  for (const o of officialOffers) {
    if (o.commissionRate != null) {
      maxRate.set(o.merchantId, Math.max(maxRate.get(o.merchantId) ?? 0, o.commissionRate));
    }
  }
  return [...maxRate.entries()].map(([merchantId, rate]) => ({
    id: `ap-${merchantId}`,
    merchantId,
    provider: "direct",
    commissionType: "percentage" as const,
    defaultRate: rate,
    cookieWindowHours: 720,
    status: "pending" as const,
  }));
})();

export const SEED_AFFILIATE_PROGRAMS: AffiliateProgram[] = [
  ...officialPrograms,
  ...MARKETPLACE_PROGRAMS,
];
