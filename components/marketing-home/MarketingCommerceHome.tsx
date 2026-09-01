"use client";

import Link from "next/link";
import { ArrowUpRightIcon, BarChartIcon, CheckIcon, ChevronRightIcon, EyeIcon, ImageIcon, LinkIcon, TagIcon } from "@/components/Icons";
import { useApp, useHydrated } from "@/lib/store";
import { buildTrackedProductOfferPath } from "@/lib/affiliate/outbound-url";
import { CREATOR_REVENUE_SHARE, DISCOVERY_TILES, FOOTER_COLUMNS, marketingProduct } from "@/lib/marketing-home";
import HomeHeader from "./HomeHeader";
import InteractiveCommerceDemo from "./InteractiveCommerceDemo";

const PRODUCT_RAIL = ["plw-polo-oxford", "plw-celine-bag", "plw-samba-white", "kb-anua-heartleaf-toner"] as const;

const PIPELINE = [
  { no: "01", label: "UPLOAD", title: "일상의 사진 업로드", body: "평소처럼 찍고, 평소처럼 올립니다.", Icon: ImageIcon },
  { no: "02", label: "UNDERSTAND", title: "사진 속 상품 이해", body: "객체, 속성, 브랜드 단서를 분리합니다.", Icon: EyeIcon },
  { no: "03", label: "MATCH", title: "판매 SKU 매칭", body: "실제 카탈로그와 후보를 대조합니다.", Icon: TagIcon },
  { no: "04", label: "COMMERCE", title: "구매 가능한 경로", body: "검증된 상세·제휴 경로만 연결합니다.", Icon: LinkIcon },
  { no: "05", label: "EARN", title: "자동 성과 정산", body: "구매와 전환이 수익으로 쌓입니다.", Icon: BarChartIcon },
] as const;

const TECHNOLOGY = [
  ["Visual understanding", "사진 전체의 장면과 분위기를 읽습니다."],
  ["Object detection", "셔츠, 가방, 신발을 객체 단위로 분리합니다."],
  ["Attribute extraction", "컬러, 실루엣, 소재, 로고 단서를 정리합니다."],
  ["Candidate retrieval", "제품 카탈로그에서 가까운 후보를 검색합니다."],
  ["SKU verification", "동일 상품과 유사 상품을 구분합니다."],
  ["Commerce availability", "구매 가능한 제휴 경로만 공개합니다."],
] as const;

export default function MarketingCommerceHome() {
  const hydrated = useHydrated();
  const user = useApp((state) => state.user);
  const platformHref = hydrated && user ? "/feed" : "/login?next=%2Ffeed";
  const platformLabel = hydrated && user ? "플랫폼 열기" : "로그인";
  const shopperProductHref = buildTrackedProductOfferPath("plw-levis-ribcage", { postId: "marketing-shopper" });

  return (
    <div id="top" className="min-h-dvh overflow-hidden bg-bg text-ink">
      <section className="relative isolate min-h-[760px] overflow-hidden bg-dark text-surface sm:min-h-[840px]">
        <img src="/looks/look1.jpg" alt="하늘색 옥스포드 셔츠를 입은 크리에이터의 실제 스타일 사진" width="900" height="900" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-center opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/58 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" />
        <HomeHeader platformHref={platformHref} platformLabel={platformLabel} />
        <div className="relative mx-auto grid min-h-[760px] max-w-[1440px] items-end gap-12 px-5 pb-14 pt-32 sm:min-h-[840px] sm:px-8 sm:pb-20 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:gap-16 lg:px-12 lg:pb-0">
          <div className="commerce-reveal max-w-[620px]">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> AI VISUAL COMMERCE
            </p>
            <h1 className="font-serif text-[clamp(3.6rem,7vw,7.4rem)] font-normal leading-[0.89] tracking-[-0.08em] text-wrap-balance">사진 한 장이<br /><em className="font-normal text-lilac">쇼핑</em>이 됩니다.</h1>
            <p className="mt-8 max-w-[480px] text-[15px] leading-[1.75] text-white/75 sm:text-[18px]">일상의 사진만 올리세요. STS가 사진 속 상품을 찾고, 실제 판매 상품과 연결하고, 구매와 수익까지 추적합니다.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?next=%2Fcreate" className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-surface px-5 py-2 text-[12px] font-bold text-ink transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">사진으로 시작하기<span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/8 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><ArrowUpRightIcon size={16} strokeWidth={1.8} /></span></Link>
              <a href="#experience" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/35 px-5 py-3 text-[12px] font-semibold text-white transition-[background-color,border-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">작동 방식 보기 <ChevronRightIcon size={15} strokeWidth={1.7} /></a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/55"><span>Object recognition</span><span>SKU matching</span><span>Tracked revenue</span></div>
          </div>
          <div id="experience" className="commerce-reveal scroll-mt-20 lg:mt-16" style={{ animationDelay: "160ms" }}><InteractiveCommerceDemo /></div>
        </div>
      </section>

      <div className="flex min-h-[78px] items-center justify-between gap-5 overflow-hidden border-b border-white/10 bg-dark px-5 text-surface sm:px-8 lg:px-12">
        <p className="font-serif text-[20px] tracking-[-0.04em] sm:text-[27px]">콘텐츠를 만드는 순간, Commerce가 시작됩니다.</p>
        <div className="hidden gap-7 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 sm:flex"><span>Photo</span><span>→</span><span>Product</span><span>→</span><span>Revenue</span></div>
      </div>

      <section id="how-it-works" className="scroll-mt-16 border-b border-line bg-stone">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <SectionIntro eyebrow="THE STS ENGINE" title={<>사진을 올리면,<br /><em>다음 단계는 자동입니다.</em></>} body="상품을 찾는 데 필요한 반복 작업을 AI가 앞에서 처리하고, 크리에이터는 콘텐츠와 마지막 확인에 집중합니다." />
          <div className="mt-16 grid gap-px border border-line bg-line lg:grid-cols-5">
            {PIPELINE.map(({ no, label, title, body, Icon }) => <div key={no} className="group bg-stone p-6 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-surface sm:p-8"><div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[0.18em] text-primary">{no}</span><Icon size={20} strokeWidth={1.45} className="text-primary transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><p className="mt-12 text-[10px] font-bold tracking-[0.16em] text-ink-2">{label}</p><h3 className="mt-3 text-[17px] font-bold leading-[1.35] tracking-[-0.03em]">{title}</h3><p className="mt-3 text-[12px] leading-[1.7] text-ink-2">{body}</p></div>)}
          </div>
        </div>
      </section>

      <section id="creator" className="scroll-mt-16 bg-bg">
        <div className="mx-auto grid max-w-[1440px] gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:gap-24 lg:px-12 lg:py-36">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">FOR CREATORS</p><h2 className="mt-5 max-w-[580px] font-serif text-[clamp(3rem,5.5vw,6.2rem)] leading-[0.9] tracking-[-0.08em]">콘텐츠는 그대로.<br /><em>수익은 자동으로.</em></h2><p className="mt-7 max-w-[480px] text-[15px] leading-[1.8] text-ink-2">촬영하고, 상품을 검색하고, 제휴 링크를 만들고, 게시 후 성과를 확인하는 일. STS에서는 사진을 올리는 것으로 시작합니다.</p><Link href="/login?next=%2Fcreator" className="group mt-8 inline-flex items-center gap-3 rounded-full bg-ink px-5 py-2.5 text-[12px] font-bold text-surface transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">크리에이터로 시작하기<span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><ArrowUpRightIcon size={16} strokeWidth={1.8} /></span></Link></div>
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2"><CreatorFlowCard title="기존 방식" items={["촬영", "상품 검색", "쇼핑몰 확인", "제휴 링크 생성", "상품 태그", "판매 추적"]} /><CreatorFlowCard title="STS" accent items={["사진 업로드", "AI 상품 인식", "크리에이터 확인", "구매 가능한 링크", "판매 추적", "수익 정산"]} /></div>
        </div>
        <div className="border-y border-line bg-ink text-surface"><div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-5 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:px-12 lg:py-16"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">CREATOR SHARE · CONFIGURABLE</p><p className="mt-3 font-serif text-[clamp(3.6rem,7vw,7.5rem)] leading-none tracking-[-0.08em]">최대 {CREATOR_REVENUE_SHARE}%</p></div><p className="max-w-[390px] text-[14px] leading-[1.75] text-white/60">제휴 수익 배분율은 운영 정책에 따라 변경할 수 있습니다. 크리에이터가 벌어야 STS도 성장합니다.</p></div></div>
      </section>

      <section id="shopper" className="scroll-mt-16 bg-stone">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-24 lg:px-12 lg:py-36">
          <div className="relative overflow-hidden rounded-[24px] border border-line bg-dark p-1.5 shadow-[0_25px_70px_rgba(17,18,20,0.14)]"><div className="relative aspect-[4/5] overflow-hidden rounded-[18px] sm:aspect-[5/4]"><img src="/looks/look2.jpg" alt="실제 STS 상품 발견 경험을 보여주는 크리에이터 콘텐츠" width="900" height="900" loading="lazy" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/5" /><div className="absolute bottom-4 left-4 right-4 rounded-[16px] border border-white/20 bg-black/65 p-4 text-white backdrop-blur-md sm:left-auto sm:w-[min(330px,calc(100%-32px))]"><div className="flex items-center justify-between text-[10px] text-white/55"><span>STS / PRODUCT SHEET</span><span className="rounded-full bg-white/10 px-2 py-1">동일 상품</span></div><div className="mt-4 flex gap-3"><img src="/looks/plw-levis-ribcage.jpg" alt="리바이스 실제 상품 이미지" width="84" height="84" className="h-16 w-16 rounded-[10px] object-cover" /><div className="min-w-0"><p className="text-[10px] font-semibold text-white/55">Levi's</p><p className="mt-1 line-clamp-2 text-[13px] font-bold">리브케이지 스트레이트 앵클 라이트 워시</p><p className="mt-2 text-[14px] font-bold">₩148,000</p></div></div><a href={shopperProductHref ?? "/discover"} className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-surface text-[11px] font-bold text-ink">{shopperProductHref ? "검증된 상품 보기" : "상품 후보 보기"} <ArrowUpRightIcon size={14} className="ml-2" /></a></div></div></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">FOR SHOPPERS</p><h2 className="mt-5 font-serif text-[clamp(3rem,5vw,5.6rem)] leading-[0.9] tracking-[-0.08em]">보고. 누르고.<br /><em>바로 찾습니다.</em></h2><p className="mt-7 max-w-[420px] text-[15px] leading-[1.8] text-ink-2">검색창에서 다시 헤매지 마세요. 사진 속 관심 있는 객체를 누르면 동일 상품, 유사 상품, 가격과 구매처를 한 번에 확인합니다.</p><div className="mt-8 grid gap-4 border-t border-line pt-6 text-[12px] text-ink-2 sm:grid-cols-2"><div><p className="font-bold text-ink">Exact match</p><p className="mt-2 leading-[1.6]">검증된 동일 상품만 구매 CTA를 엽니다.</p></div><div><p className="font-bold text-ink">Similar search</p><p className="mt-2 leading-[1.6]">같은 상품으로 오인하지 않고 대안으로 분리합니다.</p></div></div></div>
        </div>
      </section>

      <section id="technology" className="scroll-mt-16 border-y border-line bg-bg">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"><SectionIntro eyebrow="STS TECHNOLOGY" title={<>사진을 보는 AI가 아니라,<br /><em>상품을 찾는 AI.</em></>} body="후보를 많이 보여주는 것이 목표가 아닙니다. 객체를 이해하고, 카탈로그를 대조하고, 구매 가능한 연결만 남기는 것이 STS의 기준입니다." /><div className="mt-16 grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-3">{TECHNOLOGY.map(([title, body], index) => <div key={title} className="group bg-bg p-6 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-stone sm:p-8"><div className="flex items-center justify-between"><span className="font-mono text-[11px] text-primary">0{index + 1}</span><span className="h-2 w-2 rounded-full border border-primary transition-colors duration-500 group-hover:bg-primary" /></div><h3 className="mt-14 text-[16px] font-bold">{title}</h3><p className="mt-3 max-w-[280px] text-[12px] leading-[1.7] text-ink-2">{body}</p></div>)}</div></div>
      </section>

      <section id="catalog" className="scroll-mt-16 border-b border-line bg-surface"><div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">REAL CATALOG CONNECTION</p><h2 className="mt-5 font-serif text-[clamp(2.8rem,4.5vw,5rem)] leading-[0.92] tracking-[-0.08em]">사진에서 발견한<br /><em>실제 상품.</em></h2></div><p className="max-w-[330px] text-[13px] leading-[1.7] text-ink-2">홈페이지 데모도 STS 카탈로그의 실제 상품 이미지와 검증된 구매 경로를 사용합니다.</p></div><div className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">{PRODUCT_RAIL.map((productId) => { const product = marketingProduct(productId); const href = buildTrackedProductOfferPath(product.id, { postId: "marketing-catalog" }); return <article key={product.id} className="group bg-surface p-4 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-stone sm:p-5"><div className="relative aspect-square overflow-hidden rounded-[12px] bg-stone"><img src={product.image} alt={`${product.brand} ${product.name} 실제 상품 이미지`} width="420" height="420" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105" /></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{product.brand}</p><h3 className="mt-2 min-h-[42px] text-[14px] font-bold leading-[1.45]">{product.name}</h3><div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4"><span className="text-[14px] font-bold tabular-nums">₩{product.price.toLocaleString("ko-KR")}</span>{href ? <a href={href} className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">확인 <ArrowUpRightIcon size={13} /></a> : <span className="text-[10px] text-ink-2">연결 준비 중</span>}</div></article>; })}</div></div></section>

      <section id="discovery" className="scroll-mt-16 bg-stone"><div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"><div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">SHOP WHAT YOU SEE</p><h2 className="mt-5 font-serif text-[clamp(3rem,5vw,5.8rem)] leading-[0.9] tracking-[-0.08em]">발견은<br /><em>이미지에서 시작됩니다.</em></h2></div><Link href="/discover" className="group inline-flex items-center gap-2 border-b border-ink pb-2 text-[12px] font-bold">모든 상품 발견하기 <ArrowUpRightIcon size={14} className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link></div><div className="mt-16 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">{DISCOVERY_TILES.map((tile, index) => <Link key={tile.title} href={tile.href} className={`group relative isolate min-h-[330px] overflow-hidden bg-dark text-surface ${index === 0 ? "sm:row-span-2 sm:min-h-[670px]" : ""}`}><img src={tile.image} alt={`${tile.title} 실제 상품 또는 콘텐츠 이미지`} width="900" height="900" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-5 sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">{tile.kicker}</p><h3 className="mt-3 font-serif text-[28px] leading-none tracking-[-0.06em]">{tile.title}</h3><span className="mt-5 inline-flex items-center gap-1 text-[10px] font-bold opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-y-0 group-hover:opacity-100">상품 둘러보기 <ChevronRightIcon size={13} /></span></div></Link>)}</div></div></section>

      <section id="audiences" className="scroll-mt-16 bg-ink text-surface"><div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"><SectionIntro dark eyebrow="ONE INFRASTRUCTURE · THREE EXPERIENCES" title={<>누구의 화면에서도<br /><em>Commerce는 이어집니다.</em></>} body="크리에이터는 올리고, 쇼퍼는 누르고, 브랜드는 성과를 봅니다. 같은 상품 객체가 각자의 다음 행동으로 연결됩니다." /><div className="mt-16 grid gap-px border border-white/15 bg-white/15 md:grid-cols-3"><AudienceCard title="CREATORS" heading="사진을 수익으로." body="Upload once. STS identifies and monetizes the products." href="/login?next=%2Fcreator" action="Creator 시작하기" /><AudienceCard title="SHOPPERS" heading="사진 속 상품을 바로 구매." body="No endless searching. Tap what you see." href="/feed" action="쇼핑 시작하기" /><AudienceCard title="BRANDS" heading="콘텐츠에서 판매까지." body="Measure real commerce, not vanity metrics." href="#inquiry" action="파트너 문의" /></div></div></section>

      <section id="revenue" className="scroll-mt-16 border-b border-line bg-bg"><div className="mx-auto max-w-[1100px] px-5 py-24 text-center sm:px-8 lg:py-36"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">A FAIR COMMERCE LOOP</p><h2 className="mx-auto mt-5 max-w-[760px] font-serif text-[clamp(3rem,5.5vw,6rem)] leading-[0.9] tracking-[-0.08em]">크리에이터가 벌어야<br /><em>STS도 성장합니다.</em></h2><div className="mx-auto mt-16 grid max-w-[780px] items-center gap-3 text-left sm:grid-cols-[1fr_auto_1fr_auto_1fr]"><RevenueStep label="Purchase" detail="구매 발생" /><span className="hidden text-primary sm:block">→</span><RevenueStep label="Commission" detail="제휴 수수료" /><span className="hidden text-primary sm:block">→</span><RevenueStep label={`Creator · ${CREATOR_REVENUE_SHARE}%`} detail="크리에이터 배분" accent /></div></div></section>

      <section id="inquiry" className="scroll-mt-16 bg-stone"><div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12 lg:py-32"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">STS FOR PARTNERS</p><h2 className="mt-5 max-w-[760px] font-serif text-[clamp(3rem,5vw,5.8rem)] leading-[0.9] tracking-[-0.08em]">좋은 콘텐츠가<br /><em>판매로 이어지도록.</em></h2><p className="mt-6 max-w-[440px] text-[14px] leading-[1.75] text-ink-2">브랜드·에이전시·플랫폼 팀이라면 STS의 카탈로그 연결과 크리에이터 커머스 인프라를 함께 설계할 수 있습니다.</p></div><a href="mailto:partnerships@sts.kr?subject=STS%20파트너십%20문의" className="group inline-flex min-h-12 items-center justify-between gap-8 rounded-full bg-ink px-5 py-2.5 text-[12px] font-bold text-surface transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">파트너 문의하기<span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><ArrowUpRightIcon size={16} /></span></a></div></section>

      <section className="bg-dark text-surface"><div className="mx-auto max-w-[1000px] px-5 py-24 text-center sm:px-8 lg:py-36"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">SEE IT. TAP IT. SHOP IT.</p><h2 className="mx-auto mt-5 max-w-[720px] font-serif text-[clamp(3rem,5.5vw,6rem)] leading-[0.9] tracking-[-0.08em]">좋아하는 것을 공유하는 일이<br /><em className="text-lilac">수익이 되는 가장 쉬운 방법.</em></h2><Link href="/login?next=%2Fcreate" className="group mt-9 inline-flex min-h-12 items-center gap-3 rounded-full bg-surface px-5 py-2 text-[12px] font-bold text-ink transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">사진 한 장으로 시작하기<span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/8 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><ArrowUpRightIcon size={16} /></span></Link></div></section>

      <footer className="bg-ink text-surface"><div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"><div className="flex flex-col gap-12 border-b border-white/15 pb-12 lg:flex-row lg:justify-between"><div><Link href="#top" className="font-serif text-[34px] tracking-[-0.08em]">STS<span className="text-lilac">.</span></Link><p className="mt-4 max-w-[240px] text-[12px] leading-[1.7] text-white/50">사진 속 상품을 찾고, 실제 커머스로 연결합니다.</p></div><div className="grid grid-cols-2 gap-x-10 gap-y-10 sm:grid-cols-4 sm:gap-x-14">{FOOTER_COLUMNS.map((column) => <div key={column.title}><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">{column.title}</p><div className="mt-5 grid gap-3 text-[12px] text-white/70">{column.links.map(([label, href]) => <Link key={label} href={href} className="transition-colors duration-500 hover:text-white">{label}</Link>)}</div></div>)}</div></div><div className="flex flex-col gap-3 pt-7 text-[11px] text-white/40 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 STS. See it. Tap it. Shop it.</span><span>상품 연결과 제휴 관계는 각 상품 카드에서 확인할 수 있습니다.</span></div></div></footer>
    </div>
  );
}

function SectionIntro({ eyebrow, title, body, dark = false }: { readonly eyebrow: string; readonly title: React.ReactNode; readonly body: string; readonly dark?: boolean }) {
  return <div className="grid gap-8 lg:grid-cols-[1fr_0.7fr] lg:items-end"><div><p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${dark ? "text-white/50" : "text-primary"}`}>{eyebrow}</p><h2 className={`mt-5 max-w-[760px] font-serif text-[clamp(3rem,5vw,5.8rem)] leading-[0.9] tracking-[-0.08em] ${dark ? "text-surface" : "text-ink"}`}>{title}</h2></div><p className={`max-w-[420px] text-[14px] leading-[1.75] ${dark ? "text-white/55" : "text-ink-2"}`}>{body}</p></div>;
}

function CreatorFlowCard({ title, items, accent = false }: { readonly title: string; readonly items: readonly string[]; readonly accent?: boolean }) {
  return <div className={`p-6 sm:p-9 ${accent ? "bg-ink text-surface" : "bg-surface"}`}><div className="flex items-center justify-between"><p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${accent ? "text-white/50" : "text-ink-2"}`}>{title}</p>{accent && <CheckIcon size={18} strokeWidth={1.8} className="text-lilac" />}</div><div className="mt-10 grid gap-4">{items.map((item, index) => <div key={item} className={`flex items-center gap-3 border-b pb-3 text-[12px] ${accent ? "border-white/10 text-white/80" : "border-line text-ink-2"}`}><span className={`font-mono text-[10px] ${accent ? "text-white/45" : "text-primary"}`}>0{index + 1}</span>{item}</div>)}</div></div>;
}

function AudienceCard({ title, heading, body, href, action }: { readonly title: string; readonly heading: string; readonly body: string; readonly href: string; readonly action: string }) {
  return <div className="group bg-ink p-6 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-dark-raised sm:p-9"><p className="text-[10px] font-bold tracking-[0.18em] text-white/45">{title}</p><h3 className="mt-16 max-w-[250px] font-serif text-[30px] leading-[0.98] tracking-[-0.06em]">{heading}</h3><p className="mt-4 max-w-[250px] text-[12px] leading-[1.7] text-white/50">{body}</p><Link href={href} className="mt-12 inline-flex items-center gap-2 text-[11px] font-bold text-white/80 transition-colors duration-500 group-hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{action}<ArrowUpRightIcon size={14} /></Link></div>;
}

function RevenueStep({ label, detail, accent = false }: { readonly label: string; readonly detail: string; readonly accent?: boolean }) {
  return <div className={`rounded-[18px] border p-5 ${accent ? "border-primary bg-primary text-white" : "border-line bg-surface"}`}><p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${accent ? "text-white/65" : "text-primary"}`}>{label}</p><p className={`mt-3 text-[13px] font-semibold ${accent ? "text-white" : "text-ink"}`}>{detail}</p></div>;
}
