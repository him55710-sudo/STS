import { PRODUCTS } from "@/lib/catalog";
import type { Product } from "@/lib/types";

const configuredShare = Number(process.env.NEXT_PUBLIC_CREATOR_REVENUE_SHARE);

export const CREATOR_REVENUE_SHARE = Number.isFinite(configuredShare) && configuredShare > 0 && configuredShare <= 100
  ? Math.round(configuredShare)
  : 80;

export type HomeMenuId = "shoppers" | "creators" | "brands";

export type HomeMenu = {
  readonly id: HomeMenuId;
  readonly label: string;
  readonly intro: string;
  readonly items: readonly { readonly title: string; readonly body: string; readonly href: string }[];
};

export const HOME_MENUS: readonly HomeMenu[] = [
  {
    id: "shoppers",
    label: "쇼핑하기",
    intro: "사진 속 상품을 발견하고, 바로 구매하세요.",
    items: [
      { title: "사진으로 쇼핑", body: "SNS와 콘텐츠 속 아이템을 한 번의 탭으로 확인합니다.", href: "/discover" },
      { title: "크리에이터로 쇼핑", body: "좋아하는 사람의 실제 스타일에서 상품을 찾습니다.", href: "/feed" },
      { title: "AI Similar Search", body: "마음에 든 상품과 가장 가까운 대안을 비교합니다.", href: "/discover" },
      { title: "카테고리 & 브랜드", body: "패션, K-뷰티, 라이프스타일을 장면별로 둘러봅니다.", href: "#discovery" },
    ],
  },
  {
    id: "creators",
    label: "크리에이터",
    intro: "콘텐츠는 그대로. 수익은 자동으로.",
    items: [
      { title: "Creator on STS", body: "사진을 올리고 나만의 상품 숍을 만듭니다.", href: "/login?next=%2Fcreator" },
      { title: "자동 상품 인식", body: "사진 속 패션과 뷰티 객체를 AI가 먼저 탐지합니다.", href: "/login?next=%2Fcreate" },
      { title: "상품 매칭 & Affiliate", body: "실제 판매 가능한 SKU와 승인된 구매 경로를 연결합니다.", href: "#technology" },
      { title: "Creator Analytics", body: "클릭, 판매, 전환 흐름을 한 화면에서 확인합니다.", href: "/login?next=%2Fanalytics" },
    ],
  },
  {
    id: "brands",
    label: "브랜드",
    intro: "콘텐츠에서 판매까지 연결되는 인프라.",
    items: [
      { title: "Discover", body: "제품을 실제로 사용하는 크리에이터와 콘텐츠를 발견합니다.", href: "#audiences" },
      { title: "Match", body: "AI가 콘텐츠의 상품 객체와 카탈로그를 연결합니다.", href: "#technology" },
      { title: "Performance", body: "노출이 아니라 클릭, 전환, 판매 성과를 측정합니다.", href: "#revenue" },
      { title: "파트너 문의", body: "브랜드와 에이전시를 위한 도입 상담을 시작합니다.", href: "#inquiry" },
    ],
  },
] as const;

export const HERO_OBJECTS = [
  { id: "shirt", label: "옥스포드 셔츠", productId: "plw-polo-oxford", left: 54, top: 34, confidence: 96, state: "동일 상품" },
  { id: "bag", label: "숄더백", productId: "plw-celine-bag", left: 75, top: 49, confidence: 92, state: "유사 상품" },
  { id: "shoes", label: "스니커즈", productId: "plw-samba-white", left: 53, top: 86, confidence: 94, state: "동일 상품" },
] as const;

export const DISCOVERY_TILES = [
  { title: "옥스포드 셔츠", kicker: "EVERYDAY ICON", image: "/looks/plw-polo-oxford.jpg", href: "/discover" },
  { title: "K-뷰티 루틴", kicker: "OBJECT-FIRST BEAUTY", image: "/looks/look7.jpg", href: "/discover" },
  { title: "모던 테일러링", kicker: "QUIET FORM", image: "/looks/pl-cos-pants.jpg", href: "/discover" },
  { title: "시티 스니커즈", kicker: "THE DAILY PAIR", image: "/looks/plw-samba-white.jpg", href: "/discover" },
  { title: "가죽 & 나일론", kicker: "CARRY OBJECTS", image: "/looks/plw-celine-bag.jpg", href: "/discover" },
  { title: "브리티시 헤리티지", kicker: "OUTER LAYERS", image: "/looks/plw-barbour-beadnell.jpg", href: "/discover" },
] as const;

export const FOOTER_COLUMNS = [
  { title: "For Shoppers", links: [["Discover", "/discover"], ["Categories", "#discovery"], ["Creators", "#audiences"], ["Brands", "#audiences"]] },
  { title: "For Creators", links: [["Start Creating", "/login?next=%2Fcreator"], ["Product tagging", "/login?next=%2Fcreate"], ["Analytics", "/login?next=%2Fanalytics"], ["Revenue", "#revenue"]] },
  { title: "For Brands", links: [["STS for Brands", "#audiences"], ["Partnerships", "#inquiry"], ["Commerce infrastructure", "#technology"], ["Contact", "#inquiry"]] },
  { title: "Company", links: [["About STS", "#top"], ["How it works", "#how-it-works"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
] as const;

export function marketingProduct(productId: string): Product {
  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) throw new Error(`Unknown homepage product: ${productId}`);
  return product;
}
