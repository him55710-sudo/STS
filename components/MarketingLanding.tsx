"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PRODUCTS } from "@/lib/catalog";
import type { Product } from "@/lib/types";
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
  { id: "top", label: "스웨트셔츠", productId: "plw-acne-sweat-oat", left: 46, top: 34, confidence: 96, exactness: "exact" },
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

function productById(id: string): Product {
  const product = PRODUCTS.find((item) => item.id === id);
  if (!product) throw new Error(`Unknown demo product: ${id}`);
  return product;
}

export default function MarketingLanding() {
  const [selectedId, setSelectedId] = useState("top");
  const selectedObject = useMemo(
    () => DEMO_OBJECTS.find((item) => item.id === selectedId) ?? DEMO_OBJECTS[0],
    [selectedId]
  );
  const selectedProduct = productById(selectedObject.productId);

  return (
    <div className="marketing-site min-h-dvh overflow-hidden bg-bg">
      <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-[21px] font-extrabold tracking-[0.15em]">
            STS<span className="text-primary">.</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] font-medium text-ink-2 md:flex">
            <a href="#experience" className="transition-colors hover:text-ink">제품 경험</a>
            <a href="#how-it-works" className="transition-colors hover:text-ink">작동 방식</a>
            <a href="#creators" className="transition-colors hover:text-ink">크리에이터</a>
            <a href="#platform" className="transition-colors hover:text-ink">플랫폼</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link href="/login" className="hidden px-3 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink sm:block">
              로그인
            </Link>
            <Link href="/creator" className="press rounded-full bg-ink px-4 py-2.5 text-[12px] font-bold text-surface">
              크리에이터 시작
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="marketing-grid relative">
          <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-primary-soft/80 blur-3xl" />
          <div className="mx-auto grid max-w-[1240px] gap-14 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:gap-20 lg:pb-32 lg:pt-24">
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                VISUAL COMMERCE, REIMAGINED
              </div>
              <h1 className="max-w-[620px] text-[45px] font-bold leading-[1.08] tracking-[-0.055em] sm:text-[62px] lg:text-[70px]">
                사진 속 모든 것이,
                <br />
                <span className="text-primary">바로 쇼핑</span>이 된다.
              </h1>
              <p className="mt-7 max-w-[490px] text-[16px] leading-[1.75] text-ink-2 sm:text-[18px]">
                STS는 이미지 속 상품 객체를 이해하고, 탭 한 번으로 구매와 크리에이터 수익을 연결합니다. 보는 경험을 쇼핑의 시작으로 바꿔보세요.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#experience" className="press inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3.5 text-[13px] font-bold text-surface">
                  인터랙티브 데모 보기
                  <ChevronRightIcon size={16} strokeWidth={2} />
                </a>
                <Link href="/feed" className="press inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3.5 text-[13px] font-bold text-ink">
                  실제 피드 열기
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
              onSelect={setSelectedId}
            />
          </div>
        </section>

        <section id="how-it-works" className="border-y border-line bg-surface">
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

        <section id="creators" className="bg-ink text-surface">
          <div className="mx-auto grid max-w-[1240px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-24 lg:py-28">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-[#b8b1c9]">FOR CREATORS</p>
              <h2 className="mt-4 text-[34px] font-bold leading-[1.15] tracking-[-0.05em] sm:text-[50px]">
                취향은 콘텐츠로,
                <br />
                콘텐츠는 수익으로.
              </h2>
              <p className="mt-6 max-w-[500px] text-[15px] leading-[1.75] text-white/60">
                한 번 만든 게시물을 STS Shop, 소셜, 링크로 확장하세요. 크리에이터가 직접 상품을 확인하고 연결할수록 추천은 더 믿을 수 있고, 수익은 더 투명해집니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-2 text-[11px] font-semibold text-white/75">
                {['디지털 숍', '자동 제휴 링크', '성과 대시보드', '크리에이터 확정'].map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/5 px-3 py-2">{item}</span>
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

        <section id="platform" className="bg-bg">
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
                <Link href="/login" className="press mt-12 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-3 text-[12px] font-bold text-ink">
                  STS 시작하기 <ArrowUpRightIcon size={15} strokeWidth={1.8} />
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
            <Link href="/login" className="hover:text-ink">로그인</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function InteractiveDemo({
  selectedId,
  selectedObject,
  selectedProduct,
  onSelect,
}: {
  selectedId: string;
  selectedObject: DemoObject;
  selectedProduct: Product;
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
              <a
                href={`/api/outbound?productId=${selectedProduct.id}&source=marketing-demo`}
                target="_blank"
                rel="noreferrer"
                className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2.5 text-[11px] font-bold text-white"
              >
                구매처 확인 <ArrowUpRightIcon size={14} strokeWidth={1.9} />
              </a>
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
