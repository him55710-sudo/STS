"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  REAL_KBEAUTY_BESTSELLERS,
  REAL_BRAND_LOGOS,
  KBEAUTY_CREATOR_POSTS,
  RealProduct,
  KBeautyCreatorPost
} from "@/lib/real-products-data";
import Iphone16ProMockup from "@/components/landing/Iphone16ProMockup";
import {
  Sparkles,
  ArrowRight,
  Check,
  ShieldCheck,
  Zap,
  Tag,
  ShoppingBag,
  TrendingUp,
  Sliders,
  DollarSign,
  Gift,
  HelpCircle,
  Layers,
  ChevronDown,
  Heart,
  Eye,
  Share2
} from "lucide-react";

type CollabTab = "market" | "ad" | "sponsor" | "reward";

export default function ZvzoStyleLanding() {
  const [activeCollabTab, setActiveCollabTab] = useState<CollabTab>("market");
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [selectedProduct, setSelectedProduct] = useState<RealProduct | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [appliedProducts, setAppliedProducts] = useState<Record<string, boolean>>({});

  // K-뷰티 모델 피드 쇼케이스 & 정밀 AI 폴리곤 세그멘테이션 상태
  const [activeCreatorIndex, setActiveCreatorIndex] = useState<number>(0);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [showPolygonMesh, setShowPolygonMesh] = useState<boolean>(true);

  // K-Beauty 프로세스 데모 활성 단계
  const [activeProcessStep, setActiveProcessStep] = useState<number>(0);

  // 카테고리 필터링
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "전체") return REAL_KBEAUTY_BESTSELLERS;
    return REAL_KBEAUTY_BESTSELLERS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const categories = ["전체", "스킨케어", "선케어", "메이크업", "클렌징", "디바이스"];

  const handleApplyCollab = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAppliedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const processSteps = [
    {
      step: "01",
      title: "화장품 AI 실시간 객체 인식",
      tag: "VISION AI",
      desc: "사진과 릴스 속 선크림, 쿠션, 틴트 등의 패키지와 제형을 AI가 0.2초 만에 스캔하여 정확한 상품명과 브랜드를 찾아냅니다.",
      badge: "인식 정확도 99.4%",
      highlightColor: "text-[#2F54EB]",
    },
    {
      step: "02",
      title: "올리브영 1위 공식 정품 매칭",
      tag: "CATALOG MATCH",
      desc: "가짜 화장품 걱정 없이, 올리브영 어워즈 1위 및 국내외 공인된 베스트셀러 데이터베이스와 동일 상품으로 100% 매칭합니다.",
      badge: "2,000+ 브랜드 연동",
      highlightColor: "text-emerald-500",
    },
    {
      step: "03",
      title: "단독 최저가 마켓 & 태그 생성",
      tag: "INSTANT COMMERCE",
      desc: "크리에이터 단독 할인가를 적용해 프로필 링크에 걸어두면, 팔로워가 최저가 혜택으로 바로 구매할 수 있는 전용 숍이 열립니다.",
      badge: "평균 할인율 30%+",
      highlightColor: "text-purple-500",
    },
    {
      step: "04",
      title: "토스 스타일의 실시간 정산",
      tag: "AUTO PAYOUT",
      desc: "배송완료 7일 후 구매가 확정되면 리워드가 즉시 적립되며, 수수료 0원으로 언제든지 내 계좌로 1초 만에 출금할 수 있습니다.",
      badge: "수수료 0원 즉시 출금",
      highlightColor: "text-blue-500",
    },
  ];

  const faqs = [
    {
      q: "STS는 어떤 서비스인가요?",
      a: "브랜드와 크리에이터를 잇는 K-뷰티 중심의 올인원 비주얼 커머스 플랫폼이에요. 사진·릴스 속 화장품과 옷을 AI가 정밀 인식하여 마켓·광고·공유리워드·무료협찬 중 내 채널에 딱 맞는 제안을 골라 참여하고 수익을 창출할 수 있습니다.",
    },
    {
      q: "비용이 전혀 들지 않나요?",
      a: "네, STS 가입비와 월 이용료는 0원입니다. 판매 커미션, 광고비, 신상품 무료협찬 등 모든 제안별 혜택과 정산 조건은 각 상품 카드에서 투명하게 공개됩니다.",
    },
    {
      q: "수익 구조와 정산 방식은 어떻게 되나요?",
      a: "마켓과 공유리워드는 구매가 확정된 실판매액에 제안별 커미션율(평균 12~20%)을 곱해 정산됩니다. 광고는 계약된 광고비를 수령하며, 무료협찬은 본품 무상 제공과 함께 링크 판매 리워드가 추가됩니다. 구매확정 시 토스처럼 즉시 적립되어 원클릭 출금이 가능합니다.",
    },
    {
      q: "팔로워가 적은 나노·마이크로 크리에이터도 시작할 수 있나요?",
      a: "물론입니다! STS는 단순 팔로워 수보다 채널의 진정성 있는 소통과 콘텐츠 퀄리티를 최우선으로 검토합니다. 팔로워 1,000명 이상의 크리에이터도 인기 K-뷰티 상품 협업에 즉시 참여할 수 있습니다.",
    },
    {
      q: "진짜 판매되는 유명 K-뷰티 상품만 있는 게 맞나요?",
      a: "네, STS는 조선미녀, 아누아, 달바, 라운드랩, 롬앤, 클리오, 마녀공장, 메디큐브 등 올리브영 랭킹 1위 및 국내외 어워즈를 석권한 100% 실존 공식 정품만을 엄선하여 연동합니다.",
    },
    {
      q: "기존 인스타그램이나 유튜브 콘텐츠에도 적용할 수 있나요?",
      a: "네! 새로 콘텐츠를 만들 필요 없이, 이미 채널에 올려둔 인기 룩이나 스킨케어 루틴 사진/영상에 STS 태그 링크만 연결해도 즉시 판매 리워드가 발생합니다.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#FBFBFC] text-[#111318] antialiased selection:bg-[#2F54EB]/15 selection:text-[#2F54EB] overflow-x-hidden font-sans">
      
      {/* ── 1. 플로팅 필 네비게이션 헤더 ── */}
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4 pointer-events-none">
        <div className="pointer-events-auto flex h-14 w-full max-w-[1080px] items-center justify-between gap-4 rounded-full border border-black/[0.08] bg-white/85 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl sm:h-16 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1.5 text-[22px] font-black tracking-[-0.04em]">
              <span className="text-[#111318]">STS</span>
              <span className="h-2 w-2 rounded-full bg-[#2F54EB] animate-pulse"></span>
            </Link>
            <div className="hidden sm:flex items-center text-[13px] font-semibold text-neutral-500">
              <span className="text-[#2F54EB] bg-[#2F54EB]/10 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                <Sparkles size={11} /> K-BEAUTY FIRST
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-[14px] font-semibold tracking-[-0.01em]">
            <Link href="/" className="relative text-[#2F54EB]">
              크리에이터
              <span className="absolute -bottom-2 left-0 h-[2px] w-full rounded-full bg-[#2F54EB]" />
            </Link>
            <Link href="#beauty-process" className="text-neutral-500 transition-colors hover:text-black">
              K-뷰티 시스템
            </Link>
            <Link href="#products-section" className="text-neutral-500 transition-colors hover:text-black">
              베스트셀러 상품
            </Link>
            <Link href="/feed" className="text-neutral-500 transition-colors hover:text-black">
              소셜 피드
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/feed"
              className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-200 bg-white px-4 text-[13px] font-bold text-neutral-800 transition-all hover:bg-neutral-50"
            >
              피드 보기
            </Link>
            <Link
              href="/create"
              className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#111318] px-4 text-[13px] font-bold text-white transition-all hover:bg-[#2F54EB] shadow-md"
            >
              앱 다운로드
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. 대형 라운드 히어로 섹션 (모션 그래픽 오버레이) ── */}
      <section className="px-3 pt-20 pb-10 sm:px-6 sm:pt-24 md:pb-16 max-w-[1360px] mx-auto">
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] bg-[#0E1118] text-white shadow-2xl min-h-[580px] sm:min-h-[660px] flex flex-col items-center justify-center text-center px-4 py-20 sm:px-8 sm:py-24">
          
          {/* 배경 비주얼 & 빛나는 애니메이션 오브 */}
          <div className="absolute inset-0 z-0">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-luminosity scale-105 transition-transform duration-1000 ease-out"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=2000&q=80')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0D14]/80 via-[#0A0D14]/60 to-[#0A0D14]/95" />
            
            {/* 은은하게 숨쉬는 모션 글로우 */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-[#2F54EB]/35 rounded-full blur-[120px] pointer-events-none animate-glow" />
          </div>

          {/* 3D 플로팅 K-뷰티 뱃지들 (모션 그래픽 1) */}
          <div className="hidden lg:block absolute left-12 top-32 z-10 animate-float-gentle pointer-events-none">
            <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3 shadow-xl text-left">
              <img src="/products/kb-boj-sun.jpg" alt="" className="w-10 h-10 rounded-xl bg-white object-contain p-0.5" />
              <div>
                <span className="text-[10px] font-extrabold text-[#92ABFF]">올리브영 1위</span>
                <p className="text-[12px] font-bold text-white">조선미녀 맑은쌀선크림</p>
                <p className="text-[10px] text-white/70">커미션 15% 확정</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block absolute right-12 bottom-28 z-10 animate-float-reverse pointer-events-none">
            <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3 shadow-xl text-left">
              <img src="/products/kb-romand-tint.jpg" alt="" className="w-10 h-10 rounded-xl bg-white object-contain p-0.5" />
              <div>
                <span className="text-[10px] font-extrabold text-pink-300">탕후루 광택 립</span>
                <p className="text-[12px] font-bold text-white">롬앤 쥬시래스팅 틴트</p>
                <p className="text-[10px] text-white/70">리워드 15% 적립</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center max-w-[840px] mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[12px] font-bold tracking-[0.14em] text-white/90 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#4E75FF] animate-ping" />
              STS FOR K-BEAUTY CREATORS
            </div>

            <h1 className="mt-6 sm:mt-8 text-[42px] sm:text-[64px] md:text-[76px] font-black leading-[1.06] tracking-[-0.04em] text-white">
              브랜드 협업과 뷰티 쇼핑,
              <br />
              이제 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-[#92ABFF]">STS 하나로</span>
            </h1>

            <p className="mt-5 sm:mt-7 text-[16px] sm:text-[20px] text-white/80 font-normal leading-relaxed max-w-[640px] text-balance">
              올리던 메이크업 릴스와 스킨케어 사진 그대로.
              <br className="hidden sm:inline" />
              <strong className="text-white font-bold">진짜 판매되는 K-뷰티 1위 상품</strong>을 탭 한 번으로 연결해 즉시 수익을 만드세요.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                href="/create"
                className="group relative overflow-hidden flex h-[58px] w-full sm:w-auto min-w-[210px] items-center justify-center gap-3 rounded-full bg-white px-8 text-[16px] font-bold text-black transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98] shadow-xl"
              >
                {/* 럭셔리 시머 샤인 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent animate-shimmer pointer-events-none" />
                앱 다운로드
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <Link
                href="#products-section"
                className="flex h-[58px] w-full sm:w-auto items-center justify-center rounded-full border border-white/25 bg-white/10 px-8 text-[15px] font-bold text-white transition-all hover:bg-white/20 backdrop-blur-md"
              >
                실제 판매 상품 둘러보기
              </Link>
            </div>

            <p className="mt-8 sm:mt-12 text-[13px] text-white/60 font-medium tracking-wide">
              크리에이터가 만든 실시간 상품 태깅 콘텐츠 <strong className="text-white font-bold">58,000+</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. 공식 브랜드 파트너십 증명 (실제 공식 브랜드 SVG 로고 티커 & 뷰티 브랜드) ── */}
      <section className="py-12 sm:py-16 max-w-[1280px] mx-auto px-5 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#2F54EB]/10 px-3.5 py-1 text-[12px] font-bold tracking-[0.14em] text-[#2F54EB]">
          <Sparkles size={13} /> OFFICIAL BRAND PARTNERS
        </div>
        <h2 className="mt-3 text-[28px] sm:text-[38px] font-extrabold tracking-[-0.035em] text-[#111318]">
          협업하고 싶던 브랜드, 이미 STS에 있어요
        </h2>
        <p className="mt-2 text-[15px] sm:text-[17px] font-medium text-neutral-500 max-w-[620px] mx-auto">
          올리브영 1위 K-뷰티부터 트렌디 패션까지 2,000개 이상의 공식 파트너 브랜드와 함께합니다.
        </p>

        {/* 럭셔리 다크 배경 + 듀얼 무한 롤링 실제 SVG 로고 티커 */}
        <div className="mt-8 overflow-hidden rounded-[30px] bg-[#0E1118] py-8 sm:py-10 text-white shadow-2xl relative border border-white/10">
          {/* 좌우 부드러운 페이드 그라디언트 */}
          <div className="absolute inset-y-0 left-0 w-24 sm:w-36 bg-gradient-to-r from-[#0E1118] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 sm:w-36 bg-gradient-to-l from-[#0E1118] to-transparent z-10 pointer-events-none" />

          {/* 1열 무한 롤링 (좌로 스크롤) */}
          <div className="overflow-hidden py-3">
            <div className="animate-marquee flex items-center gap-12 sm:gap-16">
              {[...REAL_BRAND_LOGOS.slice(0, 12), ...REAL_BRAND_LOGOS.slice(0, 12)].map((brand, i) => (
                <div
                  key={`${brand.id}-row1-${i}`}
                  className="flex items-center justify-center shrink-0 grayscale hover:grayscale-0 transition-all duration-300"
                  title={brand.name}
                >
                  <img
                    src={brand.svg}
                    alt={brand.name}
                    className="h-6 sm:h-8 max-w-[120px] object-contain filter brightness-0 invert opacity-70 hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 2열 무한 롤링 (우로 스크롤) */}
          <div className="overflow-hidden py-3 border-t border-white/5">
            <div className="animate-marquee-reverse flex items-center gap-12 sm:gap-16">
              {[...REAL_BRAND_LOGOS.slice(12), ...REAL_BRAND_LOGOS.slice(12)].map((brand, i) => (
                <div
                  key={`${brand.id}-row2-${i}`}
                  className="flex items-center justify-center shrink-0 grayscale hover:grayscale-0 transition-all duration-300"
                  title={brand.name}
                >
                  <img
                    src={brand.svg}
                    alt={brand.name}
                    className="h-6 sm:h-8 max-w-[120px] object-contain filter brightness-0 invert opacity-70 hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* K-뷰티 대표 연동 브랜드 뱃지 태그 바 */}
          <div className="mt-5 pt-5 border-t border-white/10 px-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[12px] font-bold text-white/80">
            <span className="text-[#8FA5FF] font-extrabold mr-1">주요 K-뷰티 파트너 :</span>
            {["조선미녀", "달바 (d'Alba)", "롬앤 (rom&nd)", "클리오 (CLIO)", "라운드랩", "마녀공장", "토리든", "아누아 (Anua)", "에스트라", "메디큐브"].map((name) => (
              <span
                key={name}
                className="rounded-full bg-white/10 px-3 py-1 text-white/90 border border-white/15 hover:bg-white/20 transition-colors"
              >
                {name}
              </span>
            ))}
            <span className="rounded-full bg-[#2F54EB] px-3.5 py-1 text-[12px] font-bold text-white shadow-md">
              +2,000 Brands
            </span>
          </div>
        </div>
      </section>

      {/* ── 4. K-뷰티 중심 UI/UX 워크플로우 & 모션 그래픽 쇼케이스 (핵심 요구 2 반영!) ── */}
      <section id="beauty-process" className="py-16 sm:py-24 bg-[#F2F4F8] border-y border-neutral-200/80">
        <div className="max-w-[1280px] mx-auto px-5">
          <div className="text-center max-w-[760px] mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2F54EB]/10 px-3.5 py-1 text-[12px] font-bold tracking-[0.14em] text-[#2F54EB]">
              <Sparkles size={13} /> K-BEAUTY FIRST COMMERCE
            </span>
            <h2 className="mt-3 text-[32px] sm:text-[46px] font-extrabold tracking-[-0.04em] text-[#111318] leading-[1.18]">
              사진 속 화장품이
              <br />
              어떻게 바로 쇼핑과 수익이 될까요?
            </h2>
            <p className="mt-3 text-[16px] sm:text-[18px] text-neutral-600 font-medium">
              복잡한 과정 없이, STS의 비전 AI가 사진과 영상 속 화장품을 실시간 인식하여 단 1초 만에 수익으로 전환합니다.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step, idx) => (
              <div
                key={step.step}
                onClick={() => setActiveProcessStep(idx)}
                className={`relative flex flex-col rounded-[26px] p-6 transition-all duration-300 cursor-pointer border ${
                  activeProcessStep === idx
                    ? "bg-white border-[#2F54EB] shadow-xl ring-2 ring-[#2F54EB]/20 scale-[1.02]"
                    : "bg-white/70 border-neutral-200/80 hover:bg-white hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[24px] font-black ${step.highlightColor}`}>
                    {step.step}
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                    {step.tag}
                  </span>
                </div>

                <h3 className="mt-4 text-[17px] font-extrabold text-[#111318] leading-snug">
                  {step.title}
                </h3>

                <p className="mt-2 text-[13px] text-neutral-500 leading-relaxed flex-1">
                  {step.desc}
                </p>

                <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-700">{step.badge}</span>
                  <span className={`text-[12px] font-bold ${activeProcessStep === idx ? "text-[#2F54EB]" : "text-neutral-400"}`}>
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. 실제 iPhone 16 Pro 티타늄 모크업 & 4대 협업 방식 (핵심 요구 3 반영!) ── */}
      <section className="py-16 sm:py-24 max-w-[1240px] mx-auto px-5">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
          
          {/* 좌측 설명 및 탭 */}
          <div>
            <span className="text-[13px] font-bold tracking-[0.16em] text-[#2F54EB]">COLLABORATION & TOSS PAYOUT</span>
            <h2 className="mt-3 text-[34px] sm:text-[46px] font-extrabold tracking-[-0.04em] text-[#111318] leading-[1.18]">
              내 콘텐츠로 다양하게
              <br />
              협업하고 즉시 정산받아요
            </h2>

            <div className="mt-8 space-y-4">
              {/* 마켓 탭 */}
              <button
                type="button"
                onClick={() => setActiveCollabTab("market")}
                className={`w-full text-left p-6 rounded-[22px] transition-all border ${
                  activeCollabTab === "market"
                    ? "bg-white border-[#2F54EB]/40 shadow-xl shadow-blue-500/5 ring-2 ring-[#2F54EB]/20"
                    : "bg-transparent border-transparent hover:bg-neutral-100/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[19px] font-bold text-[#111318]">마켓</span>
                  <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-[#2F54EB]/10 text-[#2F54EB]">
                    단독 최저가 & 최대 커미션
                  </span>
                </div>
                <h3 className="mt-2 text-[15px] font-bold text-neutral-800">
                  나만의 단독 최저가로 크게 수익이 나요
                </h3>
                <p className="mt-1 text-[13px] text-neutral-500 leading-relaxed">
                  내 링크에서만 열리는 기간 한정 마켓이에요. 팔로워가 브랜드 단독 혜택가로 구매를 확정하면 평균 15~25%의 높은 커미션이 지급됩니다.
                </p>
              </button>

              {/* 공유리워드 탭 (토스 스타일 지갑) */}
              <button
                type="button"
                onClick={() => setActiveCollabTab("reward")}
                className={`w-full text-left p-6 rounded-[22px] transition-all border ${
                  activeCollabTab === "reward"
                    ? "bg-white border-[#2F54EB]/40 shadow-xl shadow-blue-500/5 ring-2 ring-[#2F54EB]/20"
                    : "bg-transparent border-transparent hover:bg-neutral-100/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[19px] font-bold text-[#111318]">공유리워드 & 토스식 정산</span>
                  <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#2F54EB]">
                    1초 만에 계좌 입금
                  </span>
                </div>
                <h3 className="mt-2 text-[15px] font-bold text-neutral-800">
                  링크 하나로 끝나는 패시브 인컴
                </h3>
                <p className="mt-1 text-[13px] text-neutral-500 leading-relaxed">
                  새 콘텐츠를 만들 필요 없이, 내가 쓰던 뷰티 추천 템 링크만 걸어두면 토스처럼 실시간으로 리워드가 쌓이고 수수료 0원으로 출금됩니다.
                </p>
              </button>

              {/* 무료협찬 탭 */}
              <button
                type="button"
                onClick={() => setActiveCollabTab("sponsor")}
                className={`w-full text-left p-6 rounded-[22px] transition-all border ${
                  activeCollabTab === "sponsor"
                    ? "bg-white border-[#2F54EB]/40 shadow-xl shadow-blue-500/5 ring-2 ring-[#2F54EB]/20"
                    : "bg-transparent border-transparent hover:bg-neutral-100/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[19px] font-bold text-[#111318]">무료협찬</span>
                  <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600">
                    신상품 본품 무상 지원
                  </span>
                </div>
                <h3 className="mt-2 text-[15px] font-bold text-neutral-800">
                  써보고 싶던 신상 뷰티 제품을 0원에
                </h3>
                <p className="mt-1 text-[13px] text-neutral-500 leading-relaxed">
                  비용 부담 없이 원하는 정품을 신청하여 받아보세요. 마음에 드는 제품만 자유롭게 일상 피드에 소개해 보세요.
                </p>
              </button>
            </div>
          </div>

          {/* 우측: 실제 iPhone 16 Pro 티타늄 모크업 컴포넌트 탑재! */}
          <div className="flex flex-col items-center">
            <p className="text-[12px] font-bold text-neutral-400 mb-3 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              직접 눌러서 체험해보는 iPhone 16 Pro 라이브 인터랙션
            </p>
            <Iphone16ProMockup activeMode={activeCollabTab} />
          </div>

        </div>
      </section>

      {/* ── 6. 핵심 섹션: 실제 판매되는 100% 공식 실사 베스트셀러 K-뷰티 상품 그리드 ── */}
      <section id="products-section" className="py-16 sm:py-24 bg-white border-y border-neutral-200/80">
        <div className="max-w-[1280px] mx-auto px-5">
          <div className="text-center max-w-[780px] mx-auto">
            <span className="inline-block rounded-full bg-[#2F54EB]/10 px-3.5 py-1 text-[12px] font-bold tracking-[0.14em] text-[#2F54EB]">
              협업 신청
            </span>
            <h2 className="mt-3 text-[32px] sm:text-[46px] font-extrabold tracking-[-0.04em] text-[#111318] leading-[1.18]">
              팔고 싶은 상품 골라
              <br />
              협업 신청까지 한 번에
            </h2>
            <p className="mt-3 text-[16px] sm:text-[18px] text-neutral-500 font-medium">
              이상하게 만든 가짜 그래픽이 아닌, 올리브영 1위 및 국내외 베스트셀러 <strong className="text-black font-bold">100% 실물 공식 정품</strong>을 직접 골라 협업을 신청하세요.
            </p>
          </div>

          {/* 카테고리 필터 탭 */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-5 py-2.5 text-[14px] font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-[#111318] text-white shadow-md"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 실제 상품 카드 그리드 */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const isApplied = !!appliedProducts[product.id];

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="group relative flex flex-col rounded-[26px] border border-neutral-200/80 bg-[#FAFAFC] p-4 transition-all duration-300 hover:shadow-2xl hover:border-[#2F54EB]/40 hover:-translate-y-1.5 cursor-pointer"
                >
                  {/* 상단 랭킹 배지 & 협업 태그 */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-black text-white">
                      {product.rankBadge}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        product.collabType === "마켓"
                          ? "bg-blue-50 text-[#2F54EB]"
                          : product.collabType === "광고"
                          ? "bg-emerald-50 text-emerald-600"
                          : product.collabType === "무료협찬"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {product.collabType}
                    </span>
                  </div>

                  {/* 실제 제품 공식 실사 사진 */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-white border border-neutral-100 p-3 flex items-center justify-center">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="absolute bottom-2.5 left-2.5 text-[10px] font-bold bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-neutral-200 text-neutral-700">
                      실물 상품
                    </span>
                  </div>

                  {/* 상품 정보 */}
                  <div className="mt-4 flex flex-col flex-1">
                    <span className="text-[12px] font-bold text-neutral-500">{product.brand}</span>
                    <h3 className="mt-1 text-[15px] font-bold text-[#111318] line-clamp-2 leading-snug">
                      {product.name}
                    </h3>

                    {/* 가격 정보 */}
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-[18px] font-extrabold text-red-500">
                        {product.discountRate}%
                      </span>
                      <span className="text-[19px] font-black text-[#111318]">
                        {product.salePrice.toLocaleString()}원
                      </span>
                      <span className="text-[12px] text-neutral-400 line-through">
                        {product.originalPrice.toLocaleString()}원
                      </span>
                    </div>

                    {/* 혜택 / 리워드 박스 */}
                    <div className="mt-3 rounded-xl bg-blue-50/80 p-2.5 border border-blue-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-600">제안 리워드</span>
                      <span className="text-[12px] font-extrabold text-[#2F54EB]">{product.rewardRate}</span>
                    </div>

                    {/* 협업 신청 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => handleApplyCollab(product.id, e)}
                      className={`mt-4 w-full rounded-full py-3 text-[13px] font-bold transition-all ${
                        isApplied
                          ? "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                          : "bg-[#111318] text-white hover:bg-[#2F54EB] hover:shadow-lg shadow-black/5"
                      }`}
                    >
                      {isApplied ? "✓ 신청 완료 (제안 대기)" : "협업 신청하기"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. 실제 iPhone 16 Pro 피드 쇼케이스 & 정밀 AI 비전 폴리곤 세그멘테이션 ── */}
      <section className="py-16 sm:py-24 max-w-[1320px] mx-auto px-5">
        <div className="text-center max-w-[780px] mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2F54EB]/10 px-3.5 py-1 text-[12px] font-bold tracking-[0.14em] text-[#2F54EB]">
            <Sparkles size={13} /> AI VISION POLYGON SEGMENTATION
          </span>
          <h2 className="mt-3 text-[32px] sm:text-[46px] font-extrabold tracking-[-0.04em] text-[#111318] leading-[1.18]">
            입술과 볼을 직접 터치해보세요,
            <br />
            정밀 폴리곤 AI가 바른 화장품을 즉시 분석합니다
          </h2>
          <p className="mt-3 text-[16px] sm:text-[18px] text-neutral-500 font-medium">
            단순한 점 좌표가 아닌, 피부와 입술 윤곽선을 픽셀 단위로 추출한 <strong className="text-black font-bold">정밀 폴리곤 세그멘테이션 레이어</strong>.
            모델의 입술이나 볼을 누르면 칠해진 K-뷰티 1위 제품의 텍스처와 발색 정보를 0.1초 만에 확인합니다.
          </p>
        </div>

        {/* 8인의 K-뷰티 실사 크리에이터 모델 선택 바 (스토리 썸네일 레일) */}
        <div className="mt-10 flex items-center justify-start lg:justify-center gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-2 no-scrollbar">
          {KBEAUTY_CREATOR_POSTS.map((post, idx) => {
            const isSelected = activeCreatorIndex === idx;
            return (
              <button
                key={post.id}
                type="button"
                onClick={() => {
                  setActiveCreatorIndex(idx);
                  setSelectedZoneId(post.faceZones[0]?.id || "");
                }}
                className={`group flex flex-col items-center shrink-0 transition-transform active:scale-95 ${
                  isSelected ? "scale-105" : "hover:scale-102 opacity-75 hover:opacity-100"
                }`}
              >
                <div
                  className={`relative p-0.5 rounded-full transition-all ${
                    isSelected
                      ? "bg-gradient-to-tr from-[#2F54EB] via-[#92ABFF] to-pink-500 shadow-lg shadow-blue-500/20"
                      : "bg-neutral-200 group-hover:bg-neutral-300"
                  }`}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white bg-neutral-100">
                    <img
                      src={post.modelImage}
                      alt={post.creatorName}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  {isSelected && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#2F54EB] text-white text-[9px] font-black px-2 py-0.2 rounded-full shadow-sm">
                      LIVE
                    </span>
                  )}
                </div>
                <span
                  className={`mt-2 text-[12px] font-bold truncate max-w-[76px] ${
                    isSelected ? "text-[#2F54EB]" : "text-neutral-600"
                  }`}
                >
                  {post.creatorName}
                </span>
              </button>
            );
          })}
        </div>

        {/* 메인 쇼케이스: 좌측 iPhone 16 Pro 정밀 폴리곤 세그멘테이션 + 우측 AI 부위별 레이어 분석 맵 */}
        {(() => {
          const currentPost = KBEAUTY_CREATOR_POSTS[activeCreatorIndex] || KBEAUTY_CREATOR_POSTS[0];
          const activeZone =
            currentPost.faceZones.find((z) => z.id === selectedZoneId) || currentPost.faceZones[0];
          const matchedProduct = REAL_KBEAUTY_BESTSELLERS.find((p) => p.id === activeZone.productId);

          return (
            <div className="mt-10 grid lg:grid-cols-[1fr_1.18fr] gap-10 lg:gap-14 items-center bg-white rounded-[36px] border border-neutral-200/80 p-6 sm:p-10 shadow-xl">
              
              {/* 좌측: 실제 iPhone 16 Pro 하드웨어 섀시 디자인 */}
              <div className="flex flex-col items-center">
                
                {/* 상단 퀵 컨트롤 바 (폴리곤 마스크 ON/OFF & 부위별 탭) */}
                <div className="w-full max-w-[340px] sm:max-w-[360px] mb-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPolygonMesh((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                      showPolygonMesh
                        ? "bg-[#2F54EB] text-white border-[#2F54EB] shadow-sm"
                        : "bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${showPolygonMesh ? "bg-white animate-pulse" : "bg-neutral-400"}`} />
                    {showPolygonMesh ? "폴리곤 마스크 ON" : "폴리곤 마스크 OFF"}
                  </button>

                  {/* 부위별 즉시 선택 버튼 */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {currentPost.faceZones.map((z) => {
                      const isCurActive = activeZone.id === z.id;
                      return (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() => setSelectedZoneId(z.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 border ${
                            isCurActive
                              ? "bg-black text-white border-black shadow-sm"
                              : "bg-neutral-100/90 text-neutral-600 border-neutral-200 hover:bg-neutral-200"
                          }`}
                        >
                          {z.zoneIcon} {z.zoneName.split(" ")[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative w-full max-w-[340px] sm:max-w-[360px] select-none">
                  {/* 외장 하드웨어 버튼: 액션 버튼, 볼륨키 상/하 */}
                  <div className="absolute -left-[13px] top-[115px] h-9 w-[3px] rounded-l-sm bg-[#3A3F4B] shadow-sm" />
                  <div className="absolute -left-[13px] top-[165px] h-12 w-[3px] rounded-l-sm bg-[#3A3F4B] shadow-sm" />
                  <div className="absolute -left-[13px] top-[225px] h-12 w-[3px] rounded-l-sm bg-[#3A3F4B] shadow-sm" />
                  {/* 전원 버튼 */}
                  <div className="absolute -right-[13px] top-[170px] h-16 w-[3px] rounded-r-sm bg-[#3A3F4B] shadow-sm" />

                  {/* 정밀 티타늄 바디 케이스 */}
                  <div className="iphone-pro-chassis">
                    <div className="iphone-pro-screen aspect-[9/19.5] w-full bg-black flex flex-col justify-between text-white overflow-hidden relative">
                      
                      {/* 배경: K-뷰티 모델 실사 이미지 */}
                      <img
                        key={currentPost.id}
                        src={currentPost.modelImage}
                        alt={currentPost.routineTitle}
                        className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.94] transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/15 to-black/35 pointer-events-none" />

                      {/* ── 정밀 AI 폴리곤 세그멘테이션 SVG 레이어 ── */}
                      {showPolygonMesh && (
                        <svg
                          className="absolute inset-0 w-full h-full pointer-events-auto z-20"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                        >
                          {currentPost.faceZones.map((z) => {
                            const isSelected = activeZone.id === z.id;
                            const isHovered = hoveredZoneId === z.id;
                            const isActive = isSelected || isHovered;

                            return (
                              <g
                                key={z.id}
                                className="cursor-pointer"
                                onClick={() => setSelectedZoneId(z.id)}
                                onMouseEnter={() => setHoveredZoneId(z.id)}
                                onMouseLeave={() => setHoveredZoneId(null)}
                              >
                                {/* 폴리곤 영역 면 & 테두리 */}
                                <polygon
                                  points={z.polygonPoints}
                                  fill={isActive ? z.fillColor : "rgba(255, 255, 255, 0.08)"}
                                  stroke={isActive ? z.strokeColor : "rgba(255, 255, 255, 0.40)"}
                                  strokeWidth={isSelected ? "1.6" : "0.9"}
                                  strokeDasharray={isSelected ? "none" : "3, 2"}
                                  className={isSelected ? "ai-polygon-active" : "ai-polygon-mesh"}
                                  style={{
                                    filter: isSelected ? `drop-shadow(0 0 6px ${z.glowColor})` : undefined,
                                  }}
                                />

                                {/* 정밀 타겟 십자선 포인트 */}
                                {isSelected && (
                                  <g>
                                    <circle
                                      cx={z.anchorX}
                                      cy={z.anchorY}
                                      r="2.8"
                                      fill={z.strokeColor}
                                      className="animate-ping opacity-75"
                                    />
                                    <circle cx={z.anchorX} cy={z.anchorY} r="1.4" fill="#ffffff" />
                                    {/* 십자선 */}
                                    <line
                                      x1={z.anchorX - 3.5}
                                      y1={z.anchorY}
                                      x2={z.anchorX + 3.5}
                                      y2={z.anchorY}
                                      stroke="#ffffff"
                                      strokeWidth="0.6"
                                    />
                                    <line
                                      x1={z.anchorX}
                                      y1={z.anchorY - 3.5}
                                      x2={z.anchorX}
                                      y2={z.anchorY + 3.5}
                                      stroke="#ffffff"
                                      strokeWidth="0.6"
                                    />
                                  </g>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      )}

                      {/* 상단 다이내믹 아일랜드 & 상태바 */}
                      <div className="relative z-30 pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-bold text-white">
                        <span>9:41</span>
                        {/* Dynamic Island 인터랙션 바 */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-2.5 h-[26px] w-[102px] rounded-full bg-black flex items-center justify-between px-2.5 shadow-md border border-neutral-800/80">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[9px] font-bold text-white tracking-wider">AI MESH</span>
                          </div>
                          <div className="h-2.5 w-2.5 rounded-full bg-neutral-900 border border-neutral-700" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span>5G</span>
                          <div className="w-5 h-2.5 rounded-[3px] border border-white/80 p-0.5 flex items-center">
                            <div className="h-full w-full bg-white rounded-2xs" />
                          </div>
                        </div>
                      </div>

                      {/* 상단 크리에이터 프로필 정보 */}
                      <div className="relative z-30 px-4 pt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-md py-1 px-2.5 border border-white/20">
                          <img
                            src={currentPost.modelImage}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-white/60"
                          />
                          <div>
                            <p className="text-[12px] font-extrabold text-white leading-tight">
                              @{currentPost.creatorHandle}
                            </p>
                            <p className="text-[10px] text-white/70">K-뷰티 정밀 스캔</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-[#2F54EB] text-white px-2.5 py-0.8 text-[10px] font-extrabold shadow-md">
                          정확도 {activeZone.confidence}%
                        </span>
                      </div>

                      {/* 화면 중앙: 선택된 부위 활성 타겟 뱃지 플로팅 */}
                      <div className="relative z-30 flex-1 flex flex-col justify-center pointer-events-none px-4">
                        <div
                          style={{ top: `${activeZone.anchorY - 9}%`, left: `${activeZone.anchorX}%` }}
                          className="absolute -translate-x-1/2 -translate-y-full transition-all duration-300"
                        >
                          <div
                            className="flex items-center gap-2 rounded-full px-3 py-1.5 shadow-2xl backdrop-blur-md border text-white"
                            style={{
                              backgroundColor: "rgba(10, 14, 24, 0.85)",
                              borderColor: activeZone.strokeColor,
                              boxShadow: `0 0 16px ${activeZone.glowColor}`,
                            }}
                          >
                            <span className="text-[12px]">{activeZone.zoneIcon}</span>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-[#92ABFF] leading-tight">
                                {activeZone.zoneName.toUpperCase()} · {activeZone.confidence}%
                              </p>
                              <p className="text-[11px] font-extrabold text-white leading-tight truncate max-w-[120px]">
                                {activeZone.productName}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 우측 소셜 액션 바 */}
                        <div className="absolute right-3 bottom-4 flex flex-col items-center gap-3 pointer-events-auto">
                          <button type="button" className="flex flex-col items-center text-white/90 hover:text-red-400 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
                              <Heart size={16} className="fill-red-500 text-red-500" />
                            </div>
                            <span className="text-[9px] font-bold mt-0.5">{(currentPost.likes / 1000).toFixed(1)}k</span>
                          </button>
                          <button type="button" className="flex flex-col items-center text-white/90">
                            <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
                              <Layers size={16} />
                            </div>
                            <span className="text-[9px] font-bold mt-0.5">{currentPost.faceZones.length}개 부위</span>
                          </button>
                          <button type="button" className="flex flex-col items-center text-white/90">
                            <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
                              <Share2 size={16} />
                            </div>
                            <span className="text-[9px] font-bold mt-0.5">공유</span>
                          </button>
                        </div>
                      </div>

                      {/* 하단 화장품 바텀 시트 (선택된 부위에 바른 화장품 레이어 상세) */}
                      <div className="relative z-30 p-3 pt-0">
                        <div className="rounded-2xl bg-white/95 backdrop-blur-xl p-3.5 text-neutral-900 shadow-2xl border border-white/40 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          {/* 부위 레이어 상태 표시 */}
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 text-[10px] font-extrabold">
                            <span className="flex items-center gap-1 text-[#2F54EB]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#2F54EB] animate-ping" />
                              {activeZone.zoneIcon} {activeZone.zoneName} 세그멘테이션 감지
                            </span>
                            <span className="text-neutral-400">인식 신뢰도 {activeZone.confidence}%</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <img
                              src={activeZone.productImage}
                              alt={activeZone.productName}
                              className="w-13 h-13 rounded-xl object-contain bg-white border border-neutral-100 p-0.5 shadow-sm shrink-0"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-extrabold text-[#2F54EB] bg-blue-50 px-1.5 py-0.5 rounded">
                                  {activeZone.brand}
                                </span>
                                <span className="text-[9px] font-extrabold text-red-500">
                                  {activeZone.discount}% OFF
                                </span>
                              </div>
                              <p className="text-[11px] font-bold text-neutral-900 truncate mt-0.5">
                                {activeZone.productName}
                              </p>
                              <p className="text-[10px] text-neutral-500 truncate">
                                {activeZone.cosmeticRole}
                              </p>
                              <p className="text-[12px] font-black text-neutral-900">
                                {activeZone.price.toLocaleString()}원
                              </p>
                            </div>
                            <a
                              href={matchedProduct?.purchaseUrl || `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(activeZone.productName)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-[#111318] hover:bg-[#2F54EB] text-white px-3 py-2 text-[11px] font-bold shrink-0 shadow-md transition-colors"
                            >
                              구매처
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* 홈 바 */}
                      <div className="relative z-30 pb-2 pt-1 flex justify-center">
                        <div className="h-1 w-28 rounded-full bg-white/60" />
                      </div>

                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[12px] font-bold text-neutral-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  얼굴 속 <strong className="text-neutral-800">입술이나 볼의 폴리곤</strong>을 직접 클릭하면 해당 레이어로 전환됩니다
                </p>
              </div>

              {/* 우측: AI 비전 부위별 세그멘테이션 레이어 맵 & 발색/제형 분석 */}
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 text-[#2F54EB] px-3 py-1 text-[11px] font-extrabold border border-blue-100">
                      AI FACIAL MESH SEGMENTATION
                    </span>
                    <span className="text-[12px] font-bold text-neutral-400">
                      스캔 정확도 99.8%
                    </span>
                  </div>

                  <h3 className="mt-3 text-[26px] sm:text-[32px] font-extrabold text-[#111318] leading-tight">
                    {currentPost.routineTitle}
                  </h3>

                  <p className="mt-2 text-[14px] sm:text-[15px] text-neutral-600 leading-relaxed">
                    "{currentPost.caption}"
                  </p>

                  <div className="mt-6 pt-5 border-t border-neutral-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[15px] font-black text-neutral-900 flex items-center gap-2">
                        <Layers size={16} className="text-[#2F54EB]" />
                        <span>화장 부위별 AI 세그멘테이션 레이어 ({currentPost.faceZones.length})</span>
                      </h4>
                      <span className="text-[11px] text-neutral-400 font-bold">터치하여 폴리곤 활성화</span>
                    </div>

                    {/* 부위별 세그멘테이션 상세 카드 리스트 */}
                    <div className="space-y-3">
                      {currentPost.faceZones.map((zone) => {
                        const isSelected = activeZone.id === zone.id;

                        return (
                          <div
                            key={zone.id}
                            onClick={() => setSelectedZoneId(zone.id)}
                            className={`flex flex-col p-4 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-50/60 border-[#2F54EB] shadow-md ring-2 ring-[#2F54EB]/25"
                                : "bg-neutral-50/70 border-neutral-200/80 hover:bg-neutral-100/70"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[16px]">{zone.zoneIcon}</span>
                                <span className="text-[14px] font-black text-neutral-900">
                                  {zone.zoneName}
                                </span>
                                <span
                                  className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: zone.fillColor,
                                    color: zone.strokeColor,
                                    border: `1px solid ${zone.strokeColor}`,
                                  }}
                                >
                                  정확도 {zone.confidence}%
                                </span>
                              </div>
                              <span
                                className={`text-[12px] font-bold ${
                                  isSelected ? "text-[#2F54EB]" : "text-neutral-400"
                                }`}
                              >
                                {isSelected ? "● 레이어 활성" : "선택"}
                              </span>
                            </div>

                            {/* 상품 정보 및 발색 효과 */}
                            <div className="mt-3 flex items-center gap-3.5 bg-white p-3 rounded-xl border border-neutral-100 shadow-2xs">
                              <img
                                src={zone.productImage}
                                alt={zone.productName}
                                className="w-14 h-14 rounded-lg object-contain bg-neutral-50 p-1 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-bold text-[#2F54EB]">
                                  {zone.brand}
                                </span>
                                <p className="text-[13px] font-bold text-neutral-900 truncate">
                                  {zone.productName}
                                </p>
                                <p className="text-[11px] text-neutral-600 mt-0.5 truncate">
                                  <strong className="text-neutral-800 font-bold">발색 :</strong> {zone.appliedEffect}
                                </p>
                                <p className="text-[11px] text-neutral-500 truncate">
                                  <strong className="text-neutral-700 font-bold">제형 :</strong> {zone.textureNote}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[11px] font-extrabold text-red-500 block">
                                  {zone.discount}% OFF
                                </span>
                                <span className="text-[13px] font-black text-neutral-900 block">
                                  {zone.price.toLocaleString()}원
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-5 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12px] font-bold text-neutral-500">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    컴퓨터 비전 기반 K-뷰티 메이크업 자동 세그멘테이션
                  </div>
                  <Link
                    href="/feed"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#2F54EB] hover:underline"
                  >
                    소셜 피드 전체보기 →
                  </Link>
                </div>
              </div>

            </div>
          );
        })()}
      </section>

      {/* ── 8. 자주 묻는 질문 (FAQ Accordion) ── */}
      <section className="py-16 sm:py-24 max-w-[880px] mx-auto px-5">
        <div className="text-center">
          <span className="text-[13px] font-bold tracking-[0.16em] text-[#2F54EB]">FAQ</span>
          <h2 className="mt-3 text-[32px] sm:text-[44px] font-extrabold tracking-[-0.04em] text-[#111318]">
            자주 묻는 질문
          </h2>
          <p className="mt-2 text-[15px] text-neutral-500">
            궁금한 점이 있으신가요? support@sts-commerce.io 로 문의해 주세요.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-[22px] border border-neutral-200/80 bg-white p-5 sm:p-6 transition-all shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between text-left gap-4"
                >
                  <span className="text-[16px] sm:text-[18px] font-bold text-[#111318]">{faq.q}</span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-[#2F54EB] text-white" : ""
                    }`}
                  >
                    <ChevronDown size={16} />
                  </span>
                </button>
                {isOpen && (
                  <p className="mt-4 text-[14px] sm:text-[15px] text-neutral-600 leading-relaxed border-t border-neutral-100 pt-4 animate-in fade-in duration-200">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 9. 하단 최종 CTA 배너 ── */}
      <section className="py-16 sm:py-24 px-5 max-w-[1240px] mx-auto text-center">
        <div className="rounded-[32px] bg-[#111318] p-10 sm:p-16 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-[#2F54EB]/35 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-[700px] mx-auto">
            <span className="text-[12px] font-bold tracking-[0.16em] text-[#8FA5FF]">시작하기</span>
            <h2 className="mt-4 text-[34px] sm:text-[50px] font-extrabold tracking-[-0.04em] leading-[1.15]">
              지금 신청하고,
              <br />
              다양한 협업 기회를 찾아보세요
            </h2>
            <p className="mt-4 text-[16px] sm:text-[18px] text-white/75 font-medium leading-relaxed">
              나와 팔로워의 취향에 맞는 인기 K-뷰티 상품을 다양한 형태로 소개하고 매력적인 수익을 만들어보세요.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/create"
                className="group flex h-[58px] w-full sm:w-auto min-w-[220px] items-center justify-center gap-3 rounded-full bg-white px-8 text-[16px] font-bold text-black transition-all hover:bg-neutral-100 shadow-xl"
              >
                앱 다운로드
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <Link
                href="/feed"
                className="flex h-[58px] w-full sm:w-auto items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 text-[15px] font-bold text-white transition-all hover:bg-white/20 backdrop-blur-md"
              >
                라이브 피드 바로가기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. 회사 정보 & 푸터 ── */}
      <footer className="border-t border-neutral-200 bg-white py-12 px-5 text-neutral-500 text-[13px]">
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-1.5 text-[20px] font-black text-[#111318]">
              <span>STS</span>
              <span className="h-2 w-2 rounded-full bg-[#2F54EB]"></span>
            </div>
            <p className="mt-3 max-w-[360px] text-neutral-500 leading-relaxed">
              STS는 크리에이터와 패션·뷰티 브랜드를 연결하고, 콘텐츠를 AI 비주얼 쇼핑 경험으로 전환하는 차세대 크리에이터 커머스 플랫폼입니다.
            </p>
            <p className="mt-4 text-[12px] text-neutral-400">
              © 2026 STS Platform Inc. All rights reserved.
            </p>
          </div>

          <div className="flex flex-wrap gap-12">
            <div>
              <p className="font-bold text-neutral-900 mb-3">서비스</p>
              <ul className="space-y-2">
                <li><Link href="/feed" className="hover:text-black">크리에이터 피드</Link></li>
                <li><Link href="/beauty-demo" className="hover:text-black">뷰티 라이브 데모</Link></li>
                <li><Link href="/create" className="hover:text-black">AI 상품 태깅 스튜디오</Link></li>
                <li><Link href="/creator" className="hover:text-black">크리에이터 허브</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-neutral-900 mb-3">회사 & 정책</p>
              <ul className="space-y-2">
                <li><Link href="/terms" className="hover:text-black">이용약관</Link></li>
                <li><Link href="/privacy" className="hover:text-black">개인정보처리방침</Link></li>
                <li><a href="mailto:support@sts-commerce.io" className="hover:text-black">제휴 및 입점 문의</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* 상품 상세 모달 */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="relative w-full max-w-[480px] rounded-[30px] bg-white p-6 shadow-2xl text-neutral-900 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-black text-white">
                {selectedProduct.rankBadge}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2F54EB]">
                {selectedProduct.collabType}
              </span>
            </div>

            <div className="flex gap-4 mt-3">
              <div className="w-24 h-24 rounded-2xl bg-white border border-neutral-100 p-2 shrink-0 flex items-center justify-center">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-contain" />
              </div>
              <div>
                <span className="text-[12px] font-bold text-neutral-500">{selectedProduct.brand}</span>
                <h3 className="text-[16px] font-bold leading-snug">{selectedProduct.name}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[17px] font-black text-red-500">{selectedProduct.discountRate}%</span>
                  <span className="text-[18px] font-black">{selectedProduct.salePrice.toLocaleString()}원</span>
                  <span className="text-[12px] text-neutral-400 line-through">{selectedProduct.originalPrice.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 text-[13px]">
              <p className="font-bold text-neutral-800 mb-1">소구 포인트 & 특징</p>
              <ul className="space-y-1 text-neutral-600">
                {selectedProduct.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-[#2F54EB]">✓</span> {feat}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-3 text-[13px] text-neutral-500 leading-relaxed">
              {selectedProduct.description}
            </p>

            <div className="mt-5 flex gap-2.5">
              <a
                href={selectedProduct.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-full border border-neutral-300 py-3 text-center text-[13px] font-bold text-neutral-800 hover:bg-neutral-50"
              >
                실제 판매처 확인
              </a>
              <button
                type="button"
                onClick={() => {
                  handleApplyCollab(selectedProduct.id);
                  setSelectedProduct(null);
                }}
                className="flex-1 rounded-full bg-[#111318] py-3 text-[13px] font-bold text-white hover:bg-[#2F54EB]"
              >
                {appliedProducts[selectedProduct.id] ? "신청 취소하기" : "협업 제안 신청"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
