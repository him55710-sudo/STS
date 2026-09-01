import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon, CheckIcon, HeartIcon, TagIcon } from "@/components/Icons";
import { CREATOR_REVENUE_SHARE } from "@/lib/marketing-home";
import { BRAND_NAMES, PHONE_SLIDES, type PhoneSlide } from "./BrandHomeData";

function StatusDot({ label, active = true }: { readonly label: string; readonly active?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-ink-2">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-brand-live" : "bg-brand-coral"}`} />{label}
    </span>
  );
}

function MiniPhone({ slide, offset = "" }: { readonly slide: PhoneSlide; readonly offset?: string }) {
  return (
    <div className={`relative w-[124px] shrink-0 rounded-brand-mini-device border-2 border-ink/80 bg-brand-night p-1.5 shadow-brand-mini sm:w-[148px] ${offset}`}>
      <div className="relative aspect-[9/18] overflow-hidden rounded-brand-mini-inner bg-ink">
        <Image src={slide.image} alt={`${slide.creator} 크리에이터 숍 미리보기`} fill sizes="148px" className="object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-12 text-left text-white">
          <p className="text-[8px] text-white/70">{slide.creator}</p>
          <p className="mt-1 text-[10px] font-bold leading-[1.2]">{slide.title}</p>
        </div>
        <div className="absolute left-1/2 top-2 h-2.5 w-10 -translate-x-1/2 rounded-full bg-black/80" />
      </div>
    </div>
  );
}

export function DiscoverVisual() {
  return (
    <div className="relative mx-auto max-w-[560px]">
      <div className="relative aspect-[1.08] overflow-hidden rounded-brand-panel bg-brand-night p-2.5 shadow-brand-media sm:p-3">
        <div className="relative h-full overflow-hidden rounded-brand-inner">
          <Image src="/looks/look1.jpg" alt="STS에서 상품을 찾는 크리에이터 스타일 사진" fill sizes="(min-width: 1024px) 560px, 92vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/5" />
          <div className="absolute left-[23%] top-[27%] flex items-center gap-2 rounded-brand-pill border border-white/80 bg-brand-wine px-3 py-2 text-[10px] font-bold text-white shadow-brand-popover">
            <TagIcon size={13} strokeWidth={1.8} /> 셔츠
          </div>
          <div className="absolute right-[11%] top-[45%] flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-coral text-white">
            <span className="h-2 w-2 rounded-full bg-white" />
          </div>
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/65">object detected</p>
              <p className="mt-1 text-[17px] font-bold tracking-[-0.04em]">하늘색 옥스포드 셔츠</p>
            </div>
            <Link href="/discover" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4" aria-label="발견한 셔츠 상품 보기">
              <ArrowUpRightIcon size={16} strokeWidth={1.9} />
            </Link>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-7 -right-2 w-[min(230px,48%)] rounded-brand-float border border-brand-line bg-white p-3 shadow-brand-float-panel sm:-right-8">
        <div className="flex items-center justify-between text-[9px] font-semibold text-ink-2"><span>상품 후보</span><StatusDot label="검증 완료" /></div>
        <div className="mt-3 flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-prod bg-stone"><Image src="/looks/plw-polo-oxford.jpg" alt="옥스포드 셔츠 상품" fill sizes="48px" className="object-cover" /></div>
          <div className="min-w-0 text-left"><p className="truncate text-[11px] font-bold">Polo Oxford Shirt</p><p className="mt-1 text-[10px] text-ink-2">실제 상품 연결</p></div>
        </div>
      </div>
    </div>
  );
}

export function MatchVisual() {
  const candidates = PHONE_SLIDES.slice(0, 4);

  return (
    <div className="mx-auto max-w-[560px] rounded-brand-panel border border-brand-line bg-white p-5 shadow-brand-panel sm:p-6">
      <div className="flex items-start justify-between border-b border-brand-line pb-5 text-left">
        <div><p className="text-[15px] font-bold tracking-[-0.04em]">추천 큐레이터 리스트</p><p className="mt-1 text-[10px] text-ink-2">내 취향에 가까운 새로운 선택</p></div>
        <span className="rounded-full bg-brand-peach px-2.5 py-1.5 text-[10px] font-bold text-brand-peach-ink">새 리스트 12</span>
      </div>
      <div className="divide-y divide-brand-line">
        {candidates.map((candidate, index) => (
          <div key={candidate.creator} className={`flex items-center gap-3 py-4 text-left ${index === 2 ? "bg-brand-wash" : ""}`}>
            <span className="h-5 w-5 shrink-0 rounded-full border border-brand-coral" />
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-stone"><Image src={candidate.image} alt="" fill sizes="44px" className="object-cover" /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold">{candidate.creator}</p><p className="mt-1 text-[10px] text-ink-2">스타일 저장 2.4K · 최근 반응 양호</p></div>
            <span className="hidden max-w-[140px] truncate rounded-full bg-brand-blush px-3 py-2 text-[10px] font-semibold text-brand-wine sm:block">추천 메모 · {candidate.product}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-brand-line pt-4 text-[10px] text-ink-2"><span>마음에 드는 선택을 저장해 보세요</span><Link href="/feed" className="rounded-full bg-ink px-3.5 py-2 font-bold text-white transition-transform hover:-translate-y-0.5">피드 보기</Link></div>
    </div>
  );
}

export function CreatorShopVisual() {
  return (
    <div className="relative mx-auto flex max-w-[560px] items-end justify-center gap-3 overflow-hidden px-4 pb-5 pt-5 sm:gap-5">
      <MiniPhone slide={PHONE_SLIDES[1] ?? PHONE_SLIDES[0]} offset="translate-y-8 rotate-[-5deg]" />
      <MiniPhone slide={PHONE_SLIDES[0] ?? PHONE_SLIDES[1]} />
      <MiniPhone slide={PHONE_SLIDES[2] ?? PHONE_SLIDES[0]} offset="translate-y-10 rotate-[5deg]" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-brand-pill border border-brand-line bg-white px-4 py-2 text-[10px] font-bold text-brand-wine shadow-brand-nav">내 숍 링크 · sts.kr/minu</div>
    </div>
  );
}

export function TrackVisual() {
  const events = ["사진 업로드", "상품 링크 생성", "구매 전환", "수익 정산"] as const;

  return (
    <div className="mx-auto max-w-[560px] rounded-brand-panel border border-brand-line bg-white p-6 shadow-brand-panel sm:p-8">
      <div className="flex items-center justify-between border-b border-brand-line pb-5"><div className="text-left"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-wine">commerce timeline</p><p className="mt-2 text-[18px] font-bold tracking-[-0.05em]">하나의 추천, 네 번의 연결</p></div><StatusDot label="live" /></div>
      <div className="relative mt-8 grid gap-6 pl-8">
        <span className="absolute bottom-5 left-[9px] top-5 w-px bg-brand-line" />
        {events.map((event, index) => (
          <div key={event} className="relative flex items-center justify-between gap-5 text-left"><span className={`absolute -left-8 flex h-5 w-5 items-center justify-center rounded-full border ${index < 3 ? "border-brand-wine bg-brand-wine text-white" : "border-brand-line bg-white text-brand-wine"}`}>{index < 3 ? <CheckIcon size={11} strokeWidth={2.2} /> : <span className="h-1.5 w-1.5 rounded-full bg-brand-coral" />}</span><div><p className="text-[12px] font-bold">{event}</p><p className="mt-1 text-[10px] text-ink-2">{index < 3 ? "확인됨" : "다음 정산 예정"}</p></div><span className="font-mono text-[11px] text-ink-2">{index === 0 ? "09:42" : index === 1 ? "09:43" : index === 2 ? "10:11" : "D+1"}</span></div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-3 border-t border-brand-line pt-5 text-left"><div><p className="text-[10px] text-ink-2">탭</p><p className="mt-1 text-[19px] font-extrabold tracking-[-0.06em]">1,284</p></div><div><p className="text-[10px] text-ink-2">전환</p><p className="mt-1 text-[19px] font-extrabold tracking-[-0.06em]">86</p></div><div><p className="text-[10px] text-ink-2">상태</p><p className="mt-1 text-[19px] font-extrabold tracking-[-0.06em] text-brand-wine">LIVE</p></div></div>
    </div>
  );
}

export function CatalogVisual() {
  const products = [
    { image: "/looks/plw-polo-oxford.jpg", name: "Oxford shirt" },
    { image: "/looks/plw-celine-bag.jpg", name: "Celine bag" },
    { image: "/looks/plw-samba-white.jpg", name: "Samba" },
    { image: "/looks/plw-barbour-beadnell.jpg", name: "Bedale" },
  ] as const;

  return (
    <div className="mx-auto max-w-[560px] rounded-brand-panel border border-brand-line bg-white p-5 shadow-brand-panel sm:p-6">
      <div className="flex items-center justify-between border-b border-brand-line pb-5"><div className="text-left"><p className="text-[15px] font-bold">STS catalog match</p><p className="mt-1 text-[10px] text-ink-2">사진 속 후보와 실제 SKU를 비교합니다</p></div><StatusDot label="4 verified" /></div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.map((product) => <Link key={product.name} href="/discover" className="group text-left"><div className="relative aspect-square overflow-hidden rounded-prod bg-stone"><Image src={product.image} alt={`${product.name} 상품`} fill sizes="(min-width: 640px) 120px, 42vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /></div><p className="mt-2 truncate text-[10px] font-bold">{product.name}</p><p className="mt-1 text-[9px] text-brand-wine">동일 상품 확인</p></Link>)}
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-brand-line pt-4"><span className="text-[10px] text-ink-2">구매 경로가 확인된 상품만 노출</span><Link href="/discover" className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-wine">전체 보기 <ArrowUpRightIcon size={13} /></Link></div>
    </div>
  );
}

export function RevenueVisual() {
  const bars = ["h-[42%]", "h-[58%]", "h-[51%]", "h-[74%]", "h-[68%]", "h-[91%]", "h-[84%]"] as const;

  return (
    <div className="mx-auto max-w-[560px] rounded-brand-panel border border-brand-line bg-white p-6 shadow-brand-panel sm:p-8">
      <div className="flex items-start justify-between text-left"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-wine">creator revenue</p><p className="mt-2 text-[15px] font-bold">이번 달 추천 성과</p></div><HeartIcon size={18} strokeWidth={1.5} className="text-brand-wine" /></div>
      <div className="mt-7 flex items-end justify-between gap-5"><div><p className="text-[clamp(4rem,8vw,6.7rem)] font-black leading-[0.8] tracking-[-0.13em] text-brand-wine">{CREATOR_REVENUE_SHARE}</p><p className="mt-4 text-[11px] font-semibold text-ink-2">추천 수익 쉐어 · %</p></div><div className="flex h-24 flex-1 items-end justify-end gap-1.5 sm:h-32">{bars.map((bar, index) => <span key={bar} className={`w-full max-w-6 rounded-t-[4px] ${bar} ${index === bars.length - 1 ? "bg-brand-coral" : "bg-brand-line"}`} />)}</div></div>
      <div className="mt-7 grid grid-cols-2 gap-px bg-brand-line text-left"><div className="bg-brand-blush p-4"><p className="text-[10px] text-ink-2">연결된 구매</p><p className="mt-2 text-[18px] font-extrabold tracking-[-0.06em]">324건</p></div><div className="bg-brand-blush p-4"><p className="text-[10px] text-ink-2">다음 정산</p><p className="mt-2 text-[18px] font-extrabold tracking-[-0.06em]">D+1</p></div></div>
    </div>
  );
}

export function BrandRosterVisual() {
  return (
    <div className="mx-auto max-w-[560px] overflow-hidden rounded-brand-panel border border-brand-line bg-white shadow-brand-panel">
      <div className="flex items-center justify-between border-b border-brand-line px-5 py-5"><p className="text-[15px] font-bold">STS partner roster</p><span className="text-[10px] font-semibold tracking-[0.15em] text-brand-wine">CURATED WITH</span></div>
      <div className="grid grid-cols-2 divide-x divide-y divide-brand-line sm:grid-cols-4">{BRAND_NAMES.map((name) => <div key={name} className="flex min-h-20 items-center justify-center px-3 text-center font-serif text-[15px] font-bold tracking-[-0.05em] text-ink/75 transition-colors hover:bg-brand-blush hover:text-brand-wine">{name}</div>)}</div>
      <div className="flex items-center justify-between border-t border-brand-line px-5 py-4 text-[10px] text-ink-2"><span>패션 · 뷰티 · 라이프스타일</span><span className="font-mono text-brand-wine">+ more</span></div>
    </div>
  );
}
