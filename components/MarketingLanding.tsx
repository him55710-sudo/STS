"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { KBEAUTY_PRODUCTS, PRODUCTS } from "@/lib/catalog";
import { getCanonicalProductForLegacyId, getCommerceOffersForCanonicalId } from "@/lib/commerce/canonical-repository";
import { rankCommerceCandidates } from "@/lib/commerce/ranker";
import type { Product } from "@/lib/types";
import { DEFAULT_PLATFORM_PATH } from "@/lib/navigation";
import { buildTrackedOfferOutboundPath } from "@/lib/affiliate/outbound-url";
import { resolvePurchaseCtaDecision } from "@/lib/commerce/cta-policy";
import { useApp, useHydrated } from "@/lib/store";
import MarketingSidebar, { MarketingMobileNav } from "@/components/MarketingSidebar";
import {
  ArrowUpRightIcon,
  BagIcon,
  BarChartIcon,
  CheckIcon,
  ChevronRightIcon,
  EyeIcon,
  ImageIcon,
  LinkIcon,
  TagIcon,
} from "@/components/Icons";

type DemoObject = {
  id: string;
  label: string;
  productId: string;
  left: number;
  top: number;
  confidence: number;
  exactness: "exact" | "similar";
};

const DEMO_OBJECTS: DemoObject[] = [
  { id: "top", label: "스웨트셔츠", productId: "plw-acne-sweat-oat", left: 46, top: 34, confidence: 82, exactness: "similar" },
  { id: "bag", label: "숄더백", productId: "plw-celine-bag", left: 62, top: 42, confidence: 89, exactness: "similar" },
  { id: "pants", label: "와이드 팬츠", productId: "pl-cos-pants", left: 46, top: 65, confidence: 92, exactness: "exact" },
  { id: "shoes", label: "스니커즈", productId: "plw-samba-white", left: 51, top: 91, confidence: 94, exactness: "exact" },
];

const STEPS = [
  { no: "01", title: "이미지에서 발견", body: "모델이 입은 옷과 들고 있는 가방을 하나의 상품 객체로 이해합니다.", Icon: ImageIcon },
  { no: "02", title: "원하는 것을 탭", body: "사진을 보는 흐름을 끊지 않고, 관심 있는 아이템만 직접 선택합니다.", Icon: TagIcon },
  { no: "03", title: "구매와 수익으로", body: "상품 정보와 구매처를 확인하고, 크리에이터에게 성과가 돌아갑니다.", Icon: BagIcon },
];

const PLATFORM_POINTS = [
  { title: "AI가 먼저 찾고", body: "객체 탐지, 브랜드 단서, 시각 임베딩을 조합해 후보를 좁힙니다.", Icon: EyeIcon },
  { title: "크리에이터가 확정하고", body: "동일 상품과 유사 상품을 직접 확인해 콘텐츠의 신뢰도를 지킵니다.", Icon: CheckIcon },
  { title: "STS가 연결합니다", body: "제휴 가능한 구매처와 클릭·전환 데이터를 한 흐름으로 관리합니다.", Icon: BarChartIcon },
];

const KBEAUTY_HIGHLIGHTS = [
  { productId: "kb-anua-heartleaf-toner", concern: "진정 · 수분", label: "어성초 77%" },
  { productId: "kb-medicube-booster-pro", concern: "흡수 · 탄력", label: "AGE-R" },
  { productId: "kb-cosrx-snail-96", concern: "장벽 · 보습", label: "스네일 96" },
] as const;

function productById(id: string): Product {
  const product = PRODUCTS.find((item) => item.id === id);
  if (!product) throw new Error(`Unknown demo product: ${id}`);
  return product;
}

function primaryOfferForProduct(product: Product) {
  const canonical = getCanonicalProductForLegacyId(product.id);
  return canonical ? rankCommerceCandidates(getCommerceOffersForCanonicalId(canonical.id))[0] ?? null : null;
}

export default function MarketingLanding() {
  const hydrated = useHydrated();
  const user = useApp((state) => state.user);
  const [selectedId, setSelectedId] = useState("top");
  const selectedObject = useMemo(
    () => DEMO_OBJECTS.find((item) => item.id === selectedId) ?? DEMO_OBJECTS[0],
    [selectedId]
  );
  const selectedProduct = productById(selectedObject.productId);
  const selectedOffer = primaryOfferForProduct(selectedProduct);
  const selectedDecision = resolvePurchaseCtaDecision(selectedOffer);
  const platformHref = hydrated && user ? DEFAULT_PLATFORM_PATH : `/login?next=${encodeURIComponent(DEFAULT_PLATFORM_PATH)}`;
  const platformLabel = hydrated && user ? "플랫폼 열기" : "로그인";

  return (
    <div id="top" className="marketing-site min-h-dvh overflow-hidden bg-bg">
      <div className="flex min-h-dvh">
        <MarketingSidebar platformHref={platformHref} platformLabel={platformLabel} />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
              <Link href="#top" className="text-[21px] font-extrabold tracking-[0.15em]">
            STS<span className="text-primary">.</span>
              </Link>
              <nav className="hidden items-center gap-7 text-[13px] font-medium text-ink-2 md:flex">
                <a href="#experience" className="transition-colors hover:text-ink">제품 경험</a>
                <a href="#k-beauty" className="transition-colors hover:text-ink">K-뷰티</a>
                <a href="#creators" className="transition-colors hover:text-ink">크리에이터</a>
                <a href="#partnerships" className="transition-colors hover:text-ink">브랜드 도입</a>
              </nav>
              <div className="flex items-center gap-2.5">
                <Link href={platformHref} className="press rounded-full border border-line bg-surface px-3.5 py-2.5 text-[12px] font-bold text-ink">
                  {platformLabel}
                </Link>
                <Link href="/creator" className="press rounded-full bg-ink px-4 py-2.5 text-[12px] font-bold text-surface">
                  크리에이터 시작
                </Link>
              </div>
            </div>
          </header>

      <MarketingMobileNav />

      <main>
        <section className="marketing-grid relative">
          <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-primary-soft/80 blur-3xl" />
          <div className="mx-auto grid max-w-[1240px] gap-14 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:gap-20 lg:pb-32 lg:pt-16">
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                K-BEAUTY FIRST · CREATOR COMMERCE
              </div>
              <h1 className="max-w-[620px] text-[45px] font-bold leading-[1.08] tracking-[-0.055em] sm:text-[62px] lg:text-[70px]">
                사진 속 모든 것이,
                <br />
                <span className="text-primary">바로 쇼핑</span>이 된다.
              </h1>
              <p className="mt-7 max-w-[490px] text-[16px] leading-[1.75] text-ink-2 sm:text-[18px]">
                STS는 이미지 속 화장품과 패션 상품을 객체 단위로 이해하고, 탭 한 번으로 구매와 크리에이터 수익을 연결합니다. 오늘 올린 일상 포스트가 내일의 판매 채널이 됩니다.
              </p>
              <p className="mt-4 flex items-center gap-2 text-[13px] font-bold text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                누구나 시작하고, 구매가 발생하면 수익이 쌓입니다.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#experience" className="press inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3.5 text-[13px] font-bold text-surface">
                  인터랙티브 데모 보기
                  <ChevronRightIcon size={16} strokeWidth={2} />
                </a>
                <Link href={platformHref} className="press inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3.5 text-[13px] font-bold text-ink">
                  {platformLabel}
                  <ArrowUpRightIcon size={16} strokeWidth={1.8} />
                </Link>
              </div>
              <div className="mt-12 grid max-w-[470px] grid-cols-3 gap-4 border-t border-line pt-5">
                {[
                  ["01", "object-first", "상품 객체 중심"],
                  ["02", "AI-assisted", "AI 후보 매칭"],
                  ["03", "creator-led", "크리에이터 확정"],
                ].map(([no, title, body]) => (
                  <div key={no}>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-primary">{no}</p>
                    <p className="mt-2 text-[12px] font-bold">{title}</p>
                    <p className="mt-1 text-[11px] text-ink-2">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <InteractiveDemo
              selectedId={selectedId}
              selectedObject={selectedObject}
              selectedProduct={selectedProduct}
              selectedOfferId={selectedOffer?.id ?? null}
              selectedDecision={selectedDecision}
              onSelect={setSelectedId}
            />
          </div>
        </section>

        <KBeautySection />

        <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
            <div className="max-w-[620px]">
              <p className="text-[11px] font-bold tracking-[0.18em] text-primary">ONE TAP COMMERCE</p>
              <h2 className="mt-4 text-[34px] font-bold leading-[1.15] tracking-[-0.045em] sm:text-[48px]">
                발견의 순간을
                <br />
                구매의 순간으로.
              </h2>
              <p className="mt-5 text-[15px] leading-[1.7] text-ink-2">
                검색창으로 이동하지 않아도 됩니다. 이미지 안에서 관심 있는 아이템을 발견하고, 확인하고, 바로 이어서 구매합니다.
              </p>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-[22px] border border-line bg-line md:grid-cols-3">
              {STEPS.map(({ no, title, body, Icon }) => (
                <div key={no} className="bg-surface p-7 sm:p-9">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-[0.16em] text-primary">{no}</span>
                    <Icon size={21} strokeWidth={1.45} className="text-primary" />
                  </div>
                  <h3 className="mt-16 text-[20px] font-bold tracking-[-0.03em]">{title}</h3>
                  <p className="mt-3 text-[13px] leading-[1.7] text-ink-2">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="creators" className="scroll-mt-20 bg-ink text-surface">
          <div className="mx-auto grid max-w-[1240px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-24 lg:py-28">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-[#b8b1c9]">FOR EVERYDAY CREATORS</p>
              <h2 className="mt-4 text-[34px] font-bold leading-[1.15] tracking-[-0.05em] sm:text-[50px]">
                일상을 올리고,
                <br />
                추천을 수익으로.
              </h2>
              <p className="mt-6 max-w-[500px] text-[15px] leading-[1.75] text-white/60">
                데일리 메이크업, 오늘의 파우치, 출근 준비처럼 이미 만들던 콘텐츠에 상품 객체를 태그하세요. STS는 AI가 후보를 찾고, 크리에이터가 확인한 추천을 구매까지 추적해 제휴 수익으로 연결합니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-2 text-[11px] font-semibold text-white/75">
                {['디지털 숍', '자동 제휴 링크', '성과 대시보드', '크리에이터 확정'].map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/5 px-3 py-2">{item}</span>
                ))}
              </div>
              <div className="mt-8 grid max-w-[500px] grid-cols-3 border-y border-white/10 py-4">
                {[
                  ["01", "일상 포스트", "그대로 올리기"],
                  ["02", "AI 상품 인식", "객체로 태깅"],
                  ["03", "구매 발생", "수익으로 적립"],
                ].map(([no, title, body]) => (
                  <div key={no} className="pr-3 last:pr-0">
                    <p className="text-[10px] font-bold tracking-[0.14em] text-[#b8b1c9]">{no}</p>
                    <p className="mt-2 text-[12px] font-bold text-white">{title}</p>
                    <p className="mt-1 text-[10px] text-white/45">{body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/creator" className="press inline-flex items-center gap-2 rounded-full bg-surface px-5 py-3.5 text-[13px] font-bold text-ink">
                  크리에이터 스튜디오 보기
                  <ArrowUpRightIcon size={16} strokeWidth={1.8} />
                </Link>
                <Link href="/login" className="press inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3.5 text-[13px] font-bold text-surface">
                  무료로 시작하기
                </Link>
              </div>
            </div>

            <CreatorPreview />
          </div>
        </section>

        <section id="platform" className="scroll-mt-20 bg-bg">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div className="max-w-[600px]">
                <p className="text-[11px] font-bold tracking-[0.18em] text-primary">BUILT FOR TRUST</p>
                <h2 className="mt-4 text-[34px] font-bold leading-[1.15] tracking-[-0.045em] sm:text-[48px]">AI가 찾고, 사람이 믿게 만드는 플랫폼.</h2>
              </div>
              <Link href="/create" className="inline-flex items-center gap-2 text-[13px] font-bold text-primary">
                태깅 워크플로우 확인 <ArrowUpRightIcon size={16} strokeWidth={1.8} />
              </Link>
            </div>
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {PLATFORM_POINTS.map(({ title, body, Icon }, index) => (
                <div key={title} className="rounded-[22px] border border-line bg-surface p-7 sm:p-8">
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Icon size={20} strokeWidth={1.55} />
                    </span>
                    <span className="text-[11px] font-bold tracking-[0.16em] text-ink-2">0{index + 1}</span>
                  </div>
                  <h3 className="mt-14 text-[20px] font-bold tracking-[-0.03em]">{title}</h3>
                  <p className="mt-3 text-[13px] leading-[1.7] text-ink-2">{body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="marketing-grid rounded-[22px] border border-line p-7 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.16em] text-primary">CONTENT → COMMERCE</p>
                    <h3 className="mt-3 text-[22px] font-bold tracking-[-0.035em]">한 장의 콘텐츠가 만드는 흐름</h3>
                  </div>
                  <LinkIcon size={22} strokeWidth={1.45} className="text-primary" />
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
                  {['게시물', '오브젝트 탭', '상품 카드', '구매처 이동', '크리에이터 수익'].map((item, index) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="rounded-full border border-line bg-surface px-3 py-2">{item}</span>
                      {index < 4 && <ChevronRightIcon size={14} className="text-primary" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[22px] bg-primary p-7 text-surface sm:p-8">
                <p className="text-[11px] font-bold tracking-[0.16em] text-white/65">SEE IT. TAP IT. SHOP IT.</p>
                <h3 className="mt-3 max-w-[330px] text-[24px] font-bold leading-[1.25] tracking-[-0.04em]">다음 쇼핑 경험을 STS와 함께 시작하세요.</h3>
                <Link href={platformHref} className="press mt-12 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-3 text-[12px] font-bold text-ink">
                  {platformLabel} <ArrowUpRightIcon size={15} strokeWidth={1.8} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="partnerships" className="scroll-mt-20 border-t border-line bg-surface">
          <span id="affiliate-guide" className="block scroll-mt-20" aria-hidden="true" />
          <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:items-end lg:gap-24 lg:py-28">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-primary">FOR BRANDS &amp; PLATFORMS</p>
              <h2 className="mt-4 max-w-[680px] text-[34px] font-bold leading-[1.15] tracking-[-0.05em] sm:text-[52px]">
                좋은 제품을,
                <br />
                좋은 취향 옆에 놓습니다.
              </h2>
              <p className="mt-6 max-w-[600px] text-[15px] leading-[1.75] text-ink-2">
                K-뷰티 브랜드와 커머스 팀은 이미 만들어진 크리에이터 콘텐츠 안에서 제품을 발견하게 하세요. 쿠팡 판매 상품과 APR·medicube 같은 브랜드를 정확한 상품 후보, 신뢰도 높은 태깅, 구매 성과 데이터로 연결합니다.
              </p>
            </div>
            <div className="rounded-[24px] bg-ink p-7 text-surface sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-[0.16em] text-white/55">PARTNERSHIP INQUIRY</p>
                <LinkIcon size={20} strokeWidth={1.45} className="text-[#b8b1c9]" />
              </div>
              <h3 className="mt-5 text-[24px] font-bold leading-[1.25] tracking-[-0.04em]">크리에이터 섭외부터<br />상품 도입까지 함께 설계합니다.</h3>
              <p className="mt-4 text-[13px] leading-[1.7] text-white/55">브랜드·에이전시·플랫폼 팀이라면 STS의 K-뷰티 큐레이션과 도입 방식을 확인해 보세요.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/creator" className="press inline-flex items-center gap-2 rounded-full bg-surface px-4 py-3 text-[12px] font-bold text-ink">
                  도입 문의 시작하기 <ArrowUpRightIcon size={15} strokeWidth={1.8} />
                </Link>
                <Link href="/create" className="press inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-3 text-[12px] font-bold text-surface">
                  태깅 데모 보기
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-8 text-[12px] text-ink-2 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-extrabold tracking-[0.15em] text-ink">STS<span className="text-primary">.</span></p>
            <p className="mt-1">See it. Tap it. Shop it.</p>
          </div>
          <div className="flex flex-wrap gap-5 font-medium">
            <Link href="/feed" className="hover:text-ink">제품 보기</Link>
            <Link href="/creator" className="hover:text-ink">크리에이터</Link>
            <Link href={platformHref} className="hover:text-ink">{platformLabel}</Link>
          </div>
        </div>
      </footer>
        </div>
      </div>
    </div>
  );
}

function KBeautySection() {
  return (
    <section id="k-beauty" className="border-b border-line bg-[#efeee9]">
      <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-20">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-primary">K-BEAUTY FIRST</p>
            <h2 className="mt-4 text-[34px] font-bold leading-[1.15] tracking-[-0.05em] sm:text-[50px]">
              일상 속 K-뷰티부터,
              <br />
              수익이 되는 발견으로.
            </h2>
          </div>
          <div className="max-w-[540px] lg:justify-self-end">
            <p className="text-[15px] leading-[1.75] text-ink-2">
              데일리 스킨케어, 파우치 공개, 피부 고민 루틴처럼 이미 만들던 콘텐츠에 제품을 태그하세요. STS는 아누아·COSRX·메디큐브처럼 사람들이 찾는 K-뷰티 상품을 이미지 속 객체와 구매 흐름으로 연결합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold text-primary">
              <span className="rounded-full border border-primary/20 bg-white/60 px-3 py-2">쿠팡 상품 후보</span>
              <span className="rounded-full border border-primary/20 bg-white/60 px-3 py-2">AI 객체 인식</span>
              <span className="rounded-full border border-primary/20 bg-white/60 px-3 py-2">구매 성과 추적</span>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {KBEAUTY_HIGHLIGHTS.map((highlight, index) => {
            const product = KBEAUTY_PRODUCTS.find((item) => item.id === highlight.productId);
            if (!product) return null;
            return <KBeautyProductCard key={product.id} product={product} highlight={highlight} index={index} />;
          })}
        </div>

        <div className="mt-7 flex flex-col gap-4 border-t border-black/10 pt-5 text-[12px] text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <p>상품 상세 페이지는 검증 후 연결하고, 검색 후보는 동일 상품으로 표시하지 않습니다.</p>
          <Link href="/create" className="inline-flex items-center gap-2 font-bold text-primary">
            내 K-뷰티 콘텐츠 태깅하기 <ArrowUpRightIcon size={15} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function KBeautyProductCard({
  product,
  highlight,
  index,
}: {
  product: Product;
  highlight: (typeof KBEAUTY_HIGHLIGHTS)[number];
  index: number;
}) {
  const artBackgrounds = ["bg-[#dfe8df]", "bg-[#24232a]", "bg-[#e8e1d4]"] as const;
  const artBackground = artBackgrounds[index] ?? artBackgrounds[0];
  const offer = primaryOfferForProduct(product);

  return (
    <article className="overflow-hidden rounded-[22px] border border-black/10 bg-surface">
      <div className={`relative h-[270px] overflow-hidden ${artBackground}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.7),transparent_48%)]" />
        <span className={`absolute left-5 top-5 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${index === 1 ? "bg-white/10 text-white/70" : "bg-white/70 text-primary"}`}>
          {highlight.label}
        </span>
        <KBeautyArtwork index={index} product={product} />
        <span className={`absolute bottom-5 right-5 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${index === 1 ? "bg-white/10 text-white/70" : "bg-white/70 text-primary"}`}>
          쿠팡 상품
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold tracking-[0.12em] text-primary">{product.brand}</p>
          <span className="text-[11px] font-semibold text-ink-2">{highlight.concern}</span>
        </div>
        <h3 className="mt-3 min-h-[44px] text-[16px] font-bold leading-[1.4] tracking-[-0.03em]">{product.name}</h3>
        <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
          <div>
            <p className="text-[10px] text-ink-2">참고가</p>
            <p className="mt-1 text-[17px] font-bold">₩{product.price.toLocaleString("ko-KR")}</p>
          </div>
          {offer ? (
            <a href={buildTrackedOfferOutboundPath(offer.id, { postId: "marketing-kbeauty" })} target="_blank" rel="noreferrer" className="press inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2.5 text-[11px] font-bold text-surface">
              상품 확인 <ArrowUpRightIcon size={14} strokeWidth={1.9} />
            </a>
          ) : (
            <span className="inline-flex items-center rounded-full bg-surface-2 px-3.5 py-2.5 text-[11px] font-semibold text-ink-2">
              검증된 상세 링크 없음
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function KBeautyArtwork({ product, index }: { product: Product; index: number }) {
  const bodyClasses = [
    "h-[158px] w-[92px] rounded-[24px_24px_18px_18px] bg-white shadow-[0_18px_35px_rgba(42,57,46,0.2)]",
    "h-[174px] w-[64px] rounded-[24px_24px_16px_16px] bg-[#111116] shadow-[0_18px_35px_rgba(0,0,0,0.45)]",
    "h-[166px] w-[84px] rounded-[16px_16px_22px_22px] bg-[#f7f3ea] shadow-[0_18px_35px_rgba(74,62,42,0.18)]",
  ] as const;
  const labelClasses = ["text-primary", "text-white/80", "text-[#27231e]"] as const;
  const productMarks = ["HEARTLEAF 77", "AGE-R", "SNAIL 96"] as const;
  const bodyClass = bodyClasses[index] ?? bodyClasses[0];
  const labelClass = labelClasses[index] ?? labelClasses[0];
  const productMark = productMarks[index] ?? productMarks[0];

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        <span className={`absolute -top-5 h-8 w-11 rounded-[9px_9px_4px_4px] ${index === 1 ? "bg-[#69656e]" : "bg-white/80"}`} />
        <div className={`relative flex flex-col items-center justify-center ${bodyClass}`}>
          <p className={`text-[9px] font-extrabold tracking-[0.12em] ${labelClass}`}>{product.brand}</p>
          <p className={`mt-3 max-w-[62px] text-center text-[9px] font-bold leading-[1.3] tracking-[0.08em] ${labelClass}`}>{productMark}</p>
          <span className={`mt-3 h-px w-8 ${index === 1 ? "bg-white/25" : "bg-black/15"}`} />
          <p className={`mt-2 text-[8px] font-semibold ${labelClass}`}>{index === 1 ? "PRO" : "K-BEAUTY"}</p>
        </div>
      </div>
    </div>
  );
}

function InteractiveDemo({
  selectedId,
  selectedObject,
  selectedProduct,
  selectedOfferId,
  selectedDecision,
  onSelect,
}: {
  selectedId: string;
  selectedObject: DemoObject;
  selectedProduct: Product;
  selectedOfferId: string | null;
  selectedDecision: ReturnType<typeof resolvePurchaseCtaDecision>;
  onSelect: (id: string) => void;
}) {
  return (
    <div id="experience" className="relative z-10 overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_20px_70px_rgba(17,18,20,0.12)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-4 text-[11px] font-semibold text-ink-2 sm:px-6">
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> STS / OBJECT VIEW</div>
        <span>사진 속 상품을 눌러보세요</span>
      </div>
      <div className="grid md:grid-cols-[1fr_0.86fr]">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-2 md:aspect-auto md:min-h-[580px]">
          <img src="/looks/look8.jpg" alt="스웨트셔츠와 와이드 팬츠를 입은 모델" className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5" />
          {DEMO_OBJECTS.map((object) => {
            const active = object.id === selectedId;
            return (
              <button
                key={object.id}
                type="button"
                aria-label={`${object.label} 상품 선택`}
                onClick={() => onSelect(object.id)}
                style={{ left: `${object.left}%`, top: `${object.top}%` }}
                className={`marketing-hotspot absolute -translate-x-1/2 -translate-y-1/2 transition-all ${active ? "z-20 scale-105" : "z-10 opacity-80 hover:opacity-100"}`}
              >
                <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold shadow-lg backdrop-blur-md ${active ? "border-white bg-white text-ink" : "border-white/60 bg-ink/65 text-white"}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full ${active ? "bg-primary text-white" : "bg-white/20 text-white"}`}>+</span>
                  {object.label}
                </span>
              </button>
            );
          })}
          <div className="absolute bottom-4 left-4 rounded-full bg-ink/70 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur-md">
            AI가 찾은 오브젝트 4개
          </div>
        </div>

        <div className="flex flex-col p-5 sm:p-6">
          <div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-primary">EXPLORE THE LOOK</p>
            <h2 className="mt-2 text-[21px] font-bold tracking-[-0.035em]">원하는 아이템을 선택하세요</h2>
            <p className="mt-2 text-[12px] leading-[1.6] text-ink-2">이미지 위의 태그나 아래의 객체명을 누르면 실제 상품 후보가 열립니다.</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {DEMO_OBJECTS.map((object) => (
              <button
                key={object.id}
                type="button"
                aria-pressed={object.id === selectedId}
                onClick={() => onSelect(object.id)}
                className={`rounded-full px-3 py-2 text-[11px] font-semibold transition-colors ${object.id === selectedId ? "bg-ink text-surface" : "bg-surface-2 text-ink-2 hover:text-ink"}`}
              >
                {object.label}
              </button>
            ))}
          </div>

          <div className="mt-7 flex-1 rounded-[18px] border border-line bg-bg p-4" aria-live="polite">
            <div className="flex items-start gap-3">
              <img src={selectedProduct.image} alt="" className="h-16 w-16 rounded-[11px] border border-line object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-[5px] px-1.5 py-1 text-[9px] font-bold ${selectedObject.exactness === "exact" ? "bg-primary text-white" : "bg-surface-2 text-ink-2"}`}>
                    {selectedObject.exactness === "exact" ? "동일 상품" : "유사 상품"}
                  </span>
                  <span className="text-[10px] font-semibold text-primary">신뢰도 {selectedObject.confidence}%</span>
                </div>
                <p className="mt-2 truncate text-[11px] font-semibold text-ink-2">{selectedProduct.brand}</p>
                <p className="truncate text-[13px] font-bold">{selectedProduct.name}</p>
              </div>
            </div>
          <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
            <div>
              <p className="text-[10px] text-ink-2">{selectedProduct.retailer}</p>
              <p className="mt-1 text-[17px] font-bold">₩{selectedProduct.price.toLocaleString("ko-KR")}</p>
            </div>
              {selectedOfferId && selectedDecision.kind === "purchase" ? (
                <a
                  href={buildTrackedOfferOutboundPath(selectedOfferId, { postId: "marketing-demo" })}
                  target="_blank"
                  rel="noreferrer"
                  className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2.5 text-[11px] font-bold text-white"
                >
                  구매하러 가기 <ArrowUpRightIcon size={14} strokeWidth={1.9} />
                </a>
              ) : (
                <span className="inline-flex items-center rounded-full bg-surface-2 px-3.5 py-2.5 text-[11px] font-semibold text-ink-2">
                  리뷰/유사 상품만 보기
                </span>
              )}
            </div>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-[10px] leading-[1.5] text-ink-2"><CheckIcon size={13} className="text-primary" /> AI 후보를 크리에이터가 확인하고 연결합니다.</p>
        </div>
      </div>
    </div>
  );
}

function CreatorPreview() {
  return (
    <div className="overflow-hidden rounded-[25px] border border-white/10 bg-[#242329] shadow-[0_20px_70px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-[11px] font-semibold text-white/50 sm:px-6">
        <span>CREATOR STUDIO</span>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-white/70">live preview</span>
      </div>
      <div className="p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-full bg-white/10">
            <img src="/looks/look1.jpg" alt="" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">minu.archive <span className="ml-1 text-[10px] text-[#b8b1c9]">● verified</span></p>
            <p className="mt-1 text-[11px] text-white/45">오늘의 스마트 캐주얼</p>
          </div>
          <button type="button" className="ml-auto rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-semibold text-white/65">공개됨</button>
        </div>
        <div className="mt-6 rounded-[17px] bg-[#302f37] p-4">
          <div className="flex items-center justify-between text-[10px] text-white/45"><span>이번 게시물의 흐름</span><span>실시간</span></div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[
              ["2.4k", "조회"],
              ["184", "오브젝트 탭"],
              ["62", "상품 카드"],
              ["₩38k", "예상 수익"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[11px] bg-white/5 p-2.5">
                <p className="text-[15px] font-bold text-white">{value}</p>
                <p className="mt-1 text-[9px] text-white/45">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 text-[10px]">
            {["게시물 발행", "상품 객체 확정", "구매처 이동"].map((item, index) => (
              <div key={item} className="flex items-center gap-2 text-white/65"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#b8b1c9] text-[9px] font-bold text-ink">{index + 1}</span>{item}<span className="ml-auto text-white/35">{index === 2 ? "측정 중" : "완료"}</span></div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-white/45">publish once, share everywhere</p>
            <div className="mt-2 flex gap-1.5 text-[9px] font-semibold text-white/65"><span className="rounded bg-white/10 px-2 py-1">STS Shop</span><span className="rounded bg-white/10 px-2 py-1">Instagram</span><span className="rounded bg-white/10 px-2 py-1">Link</span></div>
          </div>
          <Link href="/create" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-[11px] font-bold text-ink">콘텐츠 만들기 <ArrowUpRightIcon size={13} /></Link>
        </div>
      </div>
    </div>
  );
}
