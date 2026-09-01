"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowUpRightIcon,
  ChevronRightIcon,
  SearchIcon,
  XIcon,
} from "@/components/Icons";

type MenuId = "shoppers" | "creators" | "brands";

type MenuItem = {
  title: string;
  body: string;
  href: string;
};

type Menu = {
  id: MenuId;
  label: string;
  items: MenuItem[];
};

type ImageTile = {
  title: string;
  kicker: string;
  image: string;
  href: string;
};

const PARTNERSHIP_EMAIL = process.env.NEXT_PUBLIC_PARTNERSHIP_EMAIL ?? "partnerships@sts.kr";

const MENUS: Menu[] = [
  {
    id: "shoppers",
    label: "쇼핑하기",
    items: [
      { title: "큐레이터로 찾기", body: "사람의 취향으로 고른 오늘의 상품을 발견하세요.", href: "/discover" },
      { title: "서클로 찾기", body: "같은 취향의 사람들이 함께 고른 리스트를 둘러보세요.", href: "#circles" },
      { title: "카테고리로 찾기", body: "패션과 K-뷰티를 원하는 장면에서 골라보세요.", href: "#categories" },
      { title: "브랜드로 찾기", body: "좋아하는 브랜드의 실제 상품 연결을 확인하세요.", href: "#brands" },
    ],
  },
  {
    id: "creators",
    label: "크리에이터",
    items: [
      { title: "STS 크리에이터", body: "내 콘텐츠를 쇼핑 가능한 디지털 숍으로 바꿉니다.", href: "/creator" },
      { title: "AI 상품 태깅", body: "사진 속 객체를 찾고, 직접 확인해 신뢰도를 지킵니다.", href: "/login?next=%2Fcreate" },
      { title: "제휴 링크와 수익", body: "구매와 전환을 추적해 추천이 수익으로 이어집니다.", href: "#creator-story" },
      { title: "크리에이터 파트너 신청", body: "지금 올리는 콘텐츠로 STS 네트워크를 시작하세요.", href: "/login?next=%2Fcreator" },
    ],
  },
  {
    id: "brands",
    label: "브랜드",
    items: [
      { title: "브랜드 도입", body: "좋은 제품을 좋은 취향 옆에 놓는 방법을 설계합니다.", href: "#partnerships" },
      { title: "크리에이터 네트워크", body: "팔로워 수보다 실제 취향과 구매 흐름을 확인하세요.", href: "#curators" },
      { title: "상품 데이터 연결", body: "정확한 후보와 구매처 링크를 하나의 경험으로 연결합니다.", href: "#trust" },
      { title: "도입 문의", body: "브랜드·에이전시·플랫폼 팀의 협업을 기다립니다.", href: "#inquiry" },
    ],
  },
];

const CURATOR_TILES: ImageTile[] = [
  { title: "민우의 스마트 캐주얼", kicker: "minu.archive", image: "/looks/look1.jpg", href: "/creator/c-minu" },
  { title: "하나의 출근 루틴", kicker: "hana.weekday", image: "/looks/look4.jpg", href: "/creator/c-hana" },
  { title: "조용한 헤리티지", kicker: "rin.heritage", image: "/looks/look2.jpg", href: "/creator/c-rin" },
  { title: "매일의 오브젝트", kicker: "edit.eunseo", image: "/looks/look10.jpg", href: "/creator/c-eun" },
  { title: "도시를 오래 걷는 법", kicker: "jiho.finds", image: "/looks/look6.jpg", href: "/creator/c-jiho" },
  { title: "한 장의 주말", kicker: "soo.frame", image: "/looks/look3.jpg", href: "/creator/c-soo" },
  { title: "오늘의 레이어", kicker: "yun.closet", image: "/looks/look9.jpg", href: "/creator/c-yun" },
];

const CIRCLE_TILES: ImageTile[] = [
  { title: "스마트 캐주얼", kicker: "스타일 큐레이터", image: "/looks/look8.jpg", href: "#curators" },
  { title: "클린 뷰티 루틴", kicker: "K-뷰티 인사이더", image: "/imported/asset_943d1003d847bb01-insta_ootd_1.jpg", href: "#categories" },
  { title: "테이블 위의 취향", kicker: "테이스트 메이커", image: "/imported/asset_04732a7191913467-dining_banner.jpg", href: "#categories" },
  { title: "일하는 공간", kicker: "데스크테리어", image: "/imported/asset_9ac8bbbd1dbe2813-deskterior_banner.jpg", href: "#categories" },
  { title: "아웃도어 시티", kicker: "트래블 & 아웃도어", image: "/imported/asset_efbe44f786385a32-travel_banner.jpg", href: "#categories" },
  { title: "오늘의 웰니스", kicker: "라이프스타일", image: "/imported/asset_49696e2fd3beff3a-fitness_banner.jpg", href: "#categories" },
  { title: "사진 속 발견", kicker: "STS 커뮤니티", image: "/imported/asset_20e358cab2c3e704-insta_ootd_2.jpg", href: "/feed" },
  { title: "취향을 공유하는 사람들", kicker: "새로운 서클", image: "/imported/asset_b9c24706a0511b84-real_fashion_04.jpg", href: "/feed" },
];

const CATEGORY_TILES = [
  { title: "옥스포드 셔츠", image: "/looks/pl-polo-oxford.jpg", href: "/discover" },
  { title: "데님", image: "/looks/pl-apc-jeans.jpg", href: "/discover" },
  { title: "스니커즈", image: "/looks/pl-samba.jpg", href: "/discover" },
  { title: "숄더백", image: "/looks/pl-prada-bag.jpg", href: "/discover" },
  { title: "자켓", image: "/looks/pl-barbour-bedale.jpg", href: "/discover" },
  { title: "로퍼 & 슈즈", image: "/looks/pl-clarks-wallabee.jpg", href: "/discover" },
  { title: "시계 & 주얼리", image: "/looks/pl-omega-speedmaster.jpg", href: "/discover" },
  { title: "K-뷰티", image: "/looks/look7.jpg", href: "/discover" },
];

const BRAND_TILES: ImageTile[] = [
  { title: "Polo Ralph Lauren", kicker: "CLASSIC AMERICAN", image: "/looks/pl-polo-oxford.jpg", href: "/discover" },
  { title: "COS", kicker: "MODERN MINIMAL", image: "/looks/pl-cos-pants.jpg", href: "/discover" },
  { title: "Adidas", kicker: "EVERYDAY ICONS", image: "/looks/pl-samba.jpg", href: "/discover" },
  { title: "Barbour", kicker: "BRITISH HERITAGE", image: "/looks/pl-barbour-bedale.jpg", href: "/discover" },
  { title: "Acne Studios", kicker: "QUIET STATEMENT", image: "/looks/pl-acne-sweat.jpg", href: "/discover" },
  { title: "A.P.C.", kicker: "PARISIAN ESSENTIALS", image: "/looks/pl-apc-jeans.jpg", href: "/discover" },
  { title: "Celine", kicker: "OBJECTS OF DESIRE", image: "/looks/plw-celine-bag.jpg", href: "/discover" },
  { title: "Anua", kicker: "K-BEAUTY EDIT", image: "/looks/look7.jpg", href: "/discover" },
];

export default function MarketingEditorialHome() {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [inquiry, setInquiry] = useState({ name: "", email: "", message: "" });

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const closeMobileMenuOnDesktop = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setMobileOpen(false);
    };

    window.addEventListener("resize", closeMobileMenuOnDesktop);
    closeMobileMenuOnDesktop();
    return () => window.removeEventListener("resize", closeMobileMenuOnDesktop);
  }, []);

  const closeMenus = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  const submitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = [`담당자: ${inquiry.name}`, `이메일: ${inquiry.email}`, "", inquiry.message].join("\n");
    window.location.href = `mailto:${PARTNERSHIP_EMAIL}?subject=${encodeURIComponent("STS 브랜드 도입 문의")}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="marketing-editorial min-h-dvh bg-bg text-ink">
      <header className="absolute inset-x-0 top-0 z-50 text-surface">
        <div className="mx-auto flex h-[84px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="#top" className="font-serif text-[25px] tracking-[-0.06em] sm:text-[29px]">
            STS<span className="text-lilac">.</span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="홍보 홈페이지 메뉴">
            {MENUS.map((menu) => (
              <div key={menu.id} className="relative">
                <button
                  type="button"
                  aria-expanded={openMenu === menu.id}
                  aria-controls={`${menu.id}-menu`}
                  onClick={() => setOpenMenu(openMenu === menu.id ? null : menu.id)}
                  className="inline-flex items-center gap-2 py-3 text-[13px] font-semibold text-white/90 transition-colors hover:text-white"
                >
                  {menu.label}
                  <span className={`h-1.5 w-1.5 rotate-45 border-b border-r border-white/80 transition-transform ${openMenu === menu.id ? "-translate-y-0.5 rotate-[225deg]" : ""}`} />
                </button>
                {openMenu === menu.id && <MenuPanel id={`${menu.id}-menu`} menu={menu} onNavigate={closeMenus} />}
              </div>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button type="button" aria-label="상품 검색 열기" onClick={() => setSearchOpen((value) => !value)} className="rounded-full p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <SearchIcon size={18} strokeWidth={1.7} />
            </button>
            <Link href="/login?next=%2Ffeed" className="text-[13px] font-semibold text-white/90 hover:text-white">로그인</Link>
            <Link href="/login?next=%2Fcreator" className="rounded-[3px] border border-white/65 px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-white hover:text-ink">회원가입</Link>
            <button type="button" aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setMobileOpen((value) => !value)} className="p-2 text-white/85 hover:text-white">
              {mobileOpen ? <XIcon size={19} strokeWidth={1.8} /> : <MenuIcon />}
            </button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/login?next=%2Ffeed" className="text-[11px] font-bold text-white">로그인</Link>
            <button type="button" aria-label={mobileOpen ? "모바일 메뉴 닫기" : "모바일 메뉴 열기"} onClick={() => setMobileOpen((value) => !value)} className="rounded-full border border-white/50 p-2 text-white">
              {mobileOpen ? <XIcon size={17} strokeWidth={1.8} /> : <MenuIcon size={17} />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <form action="/discover" method="get" className="absolute right-5 top-[72px] flex w-[min(360px,calc(100vw-40px))] items-center gap-2 rounded-[3px] bg-bg p-2 text-ink shadow-2xl sm:right-8 lg:right-12">
            <SearchIcon size={17} className="ml-2 text-ink-2" />
            <input name="query" value={search} onChange={(event) => setSearch(event.target.value)} autoFocus aria-label="찾고 싶은 상품이나 브랜드" placeholder="찾고 싶은 상품이나 브랜드" className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[13px] outline-none placeholder:text-ink-2" />
            <button type="submit" className="bg-ink px-3 py-2.5 text-[11px] font-bold text-surface">찾기</button>
          </form>
        )}

        {mobileOpen && <MobileMenu onNavigate={closeMenus} />}
      </header>

      <main>
        <section id="top" className="relative isolate flex min-h-[700px] items-end overflow-hidden bg-ink text-surface sm:min-h-[760px]">
          <Image src="/looks/look1.jpg" alt="하늘색 옥스포드 셔츠를 입은 크리에이터" fill priority sizes="100vw" className="marketing-hero-image object-cover object-[58%_42%]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,9,0.86)_0%,rgba(10,10,9,0.58)_36%,rgba(10,10,9,0.08)_74%,rgba(10,10,9,0.22)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(10,10,9,0.55),transparent_38%)]" />
          <div className="relative mx-auto flex min-h-[700px] w-full max-w-[1440px] items-end px-5 pb-16 pt-36 sm:min-h-[760px] sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
            <div className="marketing-hero-copy max-w-[590px]">
              <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">See it. Tap it. Shop it.</p>
              <h1 className="max-w-[680px] font-serif text-[clamp(3.8rem,8.5vw,7.7rem)] font-normal leading-[0.91] tracking-[-0.07em]">
                취향을
                <br />
                <em className="font-normal text-lilac">발견하고,</em>
                <br />
                바로 쇼핑하세요.
              </h1>
              <p className="mt-8 max-w-[390px] text-[15px] leading-[1.65] text-white/80 sm:text-[17px]">
                STS는 좋아하는 사람들의 사진에서 상품을 발견하고, 한 번의 탭으로 구매와 수익을 연결합니다.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/feed" className="inline-flex items-center gap-3 rounded-[3px] bg-surface px-5 py-3.5 text-[12px] font-bold text-ink transition-transform hover:-translate-y-0.5">
                  오늘의 발견 보기 <ArrowUpRightIcon size={15} strokeWidth={1.7} />
                </Link>
                <Link href="/login?next=%2Fcreator" className="inline-flex items-center gap-3 rounded-[3px] border border-white/55 px-5 py-3.5 text-[12px] font-bold text-white transition-colors hover:bg-white/10">
                  크리에이터로 시작 <ArrowUpRightIcon size={15} strokeWidth={1.7} />
                </Link>
              </div>
            </div>
            <a href="#curators" aria-label="큐레이터 섹션으로 이동" className="absolute bottom-8 right-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/60 transition-transform hover:translate-y-1 sm:right-10 lg:right-12">
              <ChevronRightIcon size={20} strokeWidth={1.5} className="rotate-90" />
            </a>
          </div>
        </section>

        <div className="flex min-h-[74px] items-center justify-between gap-6 overflow-hidden bg-ink px-5 text-surface sm:px-8 lg:px-12">
          <p className="font-serif text-[20px] tracking-[-0.03em] sm:text-[26px]">사진 속 발견을, 구매의 순간으로.</p>
          <div className="hidden items-center gap-7 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.17em] text-white/55 sm:flex">
            <span>Object-first</span><span>Creator-led</span><span>Tracked commerce</span>
          </div>
        </div>

        <EditorialSection
          id="curators"
          eyebrow="Shop by · Curator"
          title={<>사람의 취향으로<br /><em>발견하기.</em></>}
          body="팔로워 수가 아니라, 무엇을 고르고 왜 좋아하는지를 기준으로 만나는 큐레이터들입니다."
          actionLabel="모든 큐레이터 보기"
          actionHref="/discover"
        >
          <div className="grid grid-cols-2 gap-1 bg-bg md:grid-cols-4 md:grid-rows-2">
            <ImageTile item={CURATOR_TILES[0]} className="col-span-2 row-span-2 min-h-[520px] md:min-h-[680px]" />
            <ImageTile item={CURATOR_TILES[1]} className="min-h-[260px]" />
            <ImageTile item={CURATOR_TILES[2]} className="min-h-[260px]" />
            <ImageTile item={CURATOR_TILES[3]} className="min-h-[260px]" />
            <ImageTile item={CURATOR_TILES[4]} className="min-h-[260px]" />
          </div>
        </EditorialSection>

        <EditorialSection
          id="circles"
          tone="muted"
          eyebrow="Shop by · Circle"
          title={<>같은 취향을<br /><em>함께 고르기.</em></>}
          body="스타일, 뷰티, 공간, 여행. 좋아하는 것을 함께 발견하는 STS의 작은 커뮤니티입니다."
          actionLabel="서클 둘러보기"
          actionHref="/feed"
        >
          <div className="grid grid-cols-2 gap-1 bg-bg md:grid-cols-4">
            {CIRCLE_TILES.map((item) => <ImageTile key={item.title} item={item} className="min-h-[250px] md:min-h-[310px]" />)}
          </div>
        </EditorialSection>

        <section className="relative isolate flex min-h-[390px] items-center overflow-hidden bg-ink text-surface sm:min-h-[470px]">
          <Image src="/imported/asset_20e358cab2c3e704-insta_ootd_2.jpg" alt="카페에서 취향을 공유하는 크리에이터" fill sizes="100vw" className="object-cover object-center opacity-75" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative mx-auto w-full max-w-[1440px] px-5 py-20 text-center sm:px-8 lg:px-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">The best discoveries are worth sharing.</p>
            <h2 className="mx-auto mt-5 max-w-[700px] font-serif text-[clamp(2.6rem,5vw,5rem)] leading-[0.98] tracking-[-0.06em]">좋은 발견은<br /><em className="font-normal text-lilac">함께 나눌 때</em> 시작됩니다.</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login?next=%2Fcreator" className="rounded-[3px] bg-surface px-5 py-3.5 text-[12px] font-bold text-ink">크리에이터 시작</Link>
              <Link href="/feed" className="rounded-[3px] border border-white/50 px-5 py-3.5 text-[12px] font-bold text-white">STS 둘러보기</Link>
            </div>
          </div>
        </section>

        <EditorialSection
          id="categories"
          eyebrow="Shop by · Category"
          title={<>원하는 장면에서<br /><em>고르기.</em></>}
          body="사진에서 자주 만나는 상품들을 카테고리별로 큐레이션했습니다."
          actionLabel="모든 카테고리 보기"
          actionHref="/discover"
        >
          <div className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-4">
            {CATEGORY_TILES.map((item) => (
              <Link key={item.title} href={item.href} className="group border-b border-r border-line bg-surface p-5 text-center transition-colors hover:bg-stone sm:p-7">
                <div className="relative aspect-square overflow-hidden bg-surface-2">
                  <Image src={item.image} alt="" fill sizes="(min-width: 640px) 25vw, 50vw" className="object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                </div>
                <p className="mt-4 font-serif text-[18px] tracking-[-0.03em]">{item.title}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-ink-2">상품 보기 <ArrowUpRightIcon size={12} /></span>
              </Link>
            ))}
          </div>
        </EditorialSection>

        <EditorialSection
          id="brands"
          tone="muted"
          eyebrow="Shop by · Brand"
          title={<>좋아하는 브랜드를<br /><em>다시 발견하기.</em></>}
          body="알고 있던 브랜드부터 아직 만나지 못한 브랜드까지, 실제 상품과 콘텐츠를 함께 보여드립니다."
          actionLabel="모든 브랜드 보기"
          actionHref="/discover"
        >
          <div className="grid grid-cols-2 gap-1 bg-bg md:grid-cols-4">
            {BRAND_TILES.map((item) => <ImageTile key={item.title} item={item} className="min-h-[260px] md:min-h-[330px]" />)}
          </div>
        </EditorialSection>

        <section id="creator-story" className="border-t border-line bg-surface">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24 lg:px-12 lg:py-28">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">For Creators</p>
              <h2 className="mt-5 font-serif text-[clamp(2.6rem,5vw,5.4rem)] leading-[0.95] tracking-[-0.07em]">내가 좋아하는 것을<br /><em className="font-normal text-primary">수익으로</em> 연결하세요.</h2>
              <p className="mt-6 max-w-[420px] text-[15px] leading-[1.75] text-ink-2">사진을 올리고, AI가 찾은 상품을 확인하고, 내 이름의 숍으로 공유하세요. 추천이 구매되면 수익이 쌓입니다.</p>
              <Link href="/creator" className="mt-8 inline-flex items-center gap-2 border-b border-ink pb-2 text-[13px] font-bold">크리에이터 스튜디오 보기 <ArrowUpRightIcon size={15} /></Link>
            </div>
            <div className="grid grid-cols-2 gap-px bg-line">
              <CreatorFeature step="01" title="사진 업로드" body="이미 만들던 콘텐츠 그대로 시작합니다." />
              <CreatorFeature step="02" title="상품 확인" body="AI 후보를 내가 직접 확정합니다." />
              <CreatorFeature step="03" title="숍으로 공유" body="콘텐츠 속 상품이 한 곳에 모입니다." />
              <CreatorFeature step="04" title="성과 확인" body="탭과 구매를 투명하게 확인합니다." />
            </div>
          </div>
        </section>

        <section id="partnerships" className="border-t border-line bg-stone">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-end lg:gap-24">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">For Brands & Partners</p>
                <h2 className="mt-5 max-w-[760px] font-serif text-[clamp(2.8rem,5.7vw,6rem)] leading-[0.92] tracking-[-0.075em]">좋은 제품을,<br /><em className="font-normal text-primary">좋은 취향</em> 옆에.</h2>
              </div>
              <div className="max-w-[450px]">
                <p className="text-[15px] leading-[1.75] text-ink-2">브랜드·에이전시·플랫폼 팀이라면 STS의 크리에이터 네트워크, 상품 데이터 연결, 성과 추적을 함께 설계할 수 있습니다.</p>
                <a href="#inquiry" className="mt-7 inline-flex items-center gap-2 rounded-[3px] bg-ink px-5 py-3.5 text-[12px] font-bold text-surface">도입 문의 시작하기 <ArrowUpRightIcon size={15} /></a>
              </div>
            </div>

            <div id="trust" className="mt-16 grid gap-px bg-line md:grid-cols-3">
              <PartnerPoint title="발견" body="크리에이터의 실제 콘텐츠 안에서 제품을 보여줍니다." />
              <PartnerPoint title="연결" body="검증된 상품 후보와 구매처 링크를 정확하게 연결합니다." />
              <PartnerPoint title="측정" body="클릭부터 구매까지 성과를 하나의 흐름으로 확인합니다." />
            </div>
          </div>
        </section>

        <section id="inquiry" className="bg-ink text-surface">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24 lg:px-12 lg:py-24">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lilac">Partnership Inquiry</p>
              <h2 className="mt-5 font-serif text-[clamp(2.6rem,4.8vw,5rem)] leading-[0.95] tracking-[-0.07em]">함께 만들<br /><em className="font-normal text-lilac">쇼핑 경험</em>을<br />말해주세요.</h2>
              <p className="mt-6 max-w-[380px] text-[14px] leading-[1.75] text-white/60">작성한 문의는 이메일 앱에서 바로 전송할 수 있습니다. 운영 시작 전 실제 담당 이메일만 연결하면 됩니다.</p>
            </div>
            <form onSubmit={submitInquiry} className="grid gap-6 self-end">
              <label className="grid gap-2 text-[11px] font-semibold text-white/65">담당자 이름<input required value={inquiry.name} onChange={(event) => setInquiry((current) => ({ ...current, name: event.target.value }))} className="border-b border-white/25 bg-transparent px-0 py-3 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white" placeholder="홍길동" /></label>
              <label className="grid gap-2 text-[11px] font-semibold text-white/65">업무 이메일<input required type="email" value={inquiry.email} onChange={(event) => setInquiry((current) => ({ ...current, email: event.target.value }))} className="border-b border-white/25 bg-transparent px-0 py-3 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white" placeholder="name@company.com" /></label>
              <label className="grid gap-2 text-[11px] font-semibold text-white/65">문의 내용<textarea required value={inquiry.message} onChange={(event) => setInquiry((current) => ({ ...current, message: event.target.value }))} rows={3} className="resize-none border-b border-white/25 bg-transparent px-0 py-3 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white" placeholder="브랜드, 캠페인, API 연동 등 궁금한 내용을 적어주세요." /></label>
              <button type="submit" className="mt-2 inline-flex w-fit items-center gap-3 border-b border-white pb-2 text-[13px] font-bold text-white">문의 메일 작성하기 <ArrowUpRightIcon size={16} /></button>
            </form>
          </div>
        </section>
      </main>

      <footer className="bg-black text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <Link href="#top" className="font-serif text-[29px] tracking-[-0.06em]">STS<span className="text-lilac">.</span></Link>
              <p className="mt-4 max-w-[220px] text-[13px] leading-[1.7] text-white/45">사진 속 모든 것을 발견하고, 탭하고, 쇼핑하는 가장 사람다운 방법.</p>
            </div>
            <FooterColumn title="쇼핑하기" links={[["오늘의 발견", "/feed"], ["큐레이터", "#curators"], ["카테고리", "#categories"], ["브랜드", "#brands"]]} />
            <FooterColumn title="크리에이터" links={[["크리에이터 시작", "/login?next=%2Fcreator"], ["AI 상품 태깅", "/login?next=%2Fcreate"], ["크리에이터 스튜디오", "/creator"], ["수익 구조", "#creator-story"]]} />
            <FooterColumn title="파트너" links={[["브랜드 도입", "#partnerships"], ["도입 문의", "#inquiry"], ["신뢰도 기준", "#trust"], ["로그인", "/login?next=%2Ffeed"]]} />
          </div>
          <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-5 text-[10px] text-white/35 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 STS. See it. Tap it. Shop it.</span><span>All discoveries are better when shared.</span></div>
        </div>
      </footer>
    </div>
  );
}

function MenuPanel({ id, menu, onNavigate }: { id: string; menu: Menu; onNavigate: () => void }) {
  return (
    <div id={id} role="dialog" aria-label={`${menu.label} 메뉴`} className="absolute left-1/2 top-[54px] w-[min(720px,calc(100vw-32px))] -translate-x-1/2 rounded-[4px] bg-bg p-7 text-ink shadow-[0_25px_80px_rgba(0,0,0,0.25)]">
      <p className="mb-6 font-serif text-[23px] tracking-[-0.04em]">{menu.label}</p>
      <div className="grid gap-x-8 gap-y-7 md:grid-cols-2">
        {menu.items.map((item) => (
          <Link key={item.title} href={item.href} onClick={onNavigate} className="group block">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-serif text-[19px] tracking-[-0.035em] transition-colors group-hover:text-primary">{item.title}</h3>
              <ArrowUpRightIcon size={16} className="mt-1 shrink-0 text-ink-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <p className="mt-2 max-w-[240px] text-[12px] leading-[1.55] text-ink-2">{item.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobileMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="absolute inset-x-0 top-[84px] max-h-[calc(100dvh-84px)] overflow-y-auto border-t border-line bg-bg px-5 py-6 text-ink shadow-2xl lg:hidden">
      <div className="grid gap-8 sm:grid-cols-3">
        {MENUS.map((menu) => (
          <div key={menu.id}>
            <p className="font-serif text-[23px] tracking-[-0.04em]">{menu.label}</p>
            <div className="mt-4 grid gap-4">
              {menu.items.map((item) => (
                <Link key={item.title} href={item.href} onClick={onNavigate} className="border-b border-line pb-3">
                  <p className="text-[13px] font-bold">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-[1.5] text-ink-2">{item.body}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-3 border-t border-line pt-5">
        <Link href="/login?next=%2Ffeed" onClick={onNavigate} className="flex-1 border border-line py-3 text-center text-[12px] font-bold">로그인</Link>
        <Link href="/login?next=%2Fcreator" onClick={onNavigate} className="flex-1 bg-ink py-3 text-center text-[12px] font-bold text-surface">회원가입</Link>
      </div>
    </div>
  );
}

function EditorialSection({ id, eyebrow, title, body, actionLabel, actionHref, tone = "light", children }: { id: string; eyebrow: string; title: ReactNode; body: string; actionLabel: string; actionHref: string; tone?: "light" | "muted"; children: ReactNode }) {
  return (
    <section id={id} className={tone === "muted" ? "bg-stone" : "bg-bg"}>
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mb-12 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            <h2 className="mt-5 font-serif text-[clamp(2.8rem,5.5vw,6.2rem)] leading-[0.9] tracking-[-0.075em]">{title}</h2>
          </div>
          <div className="max-w-[360px] lg:pb-1">
            <p className="text-[14px] leading-[1.7] text-ink-2">{body}</p>
            <Link href={actionHref} className="mt-5 inline-flex items-center gap-2 border-b border-ink pb-2 text-[12px] font-bold">{actionLabel} <ArrowUpRightIcon size={14} /></Link>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function ImageTile({ item, className }: { item: ImageTile; className?: string }) {
  return (
    <Link href={item.href} className={`group relative isolate overflow-hidden bg-ink text-surface ${className ?? ""}`}>
      <Image src={item.image} alt={item.title} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent opacity-85" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">{item.kicker}</p>
        <h3 className="mt-2 max-w-[260px] font-serif text-[24px] leading-[1] tracking-[-0.05em] sm:text-[28px]">{item.title}</h3>
        <span className="mt-4 inline-flex translate-y-2 items-center gap-1 text-[10px] font-bold opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100">둘러보기 <ChevronRightIcon size={13} /></span>
      </div>
    </Link>
  );
}

function CreatorFeature({ step, title, body }: { step: string; title: string; body: string }) {
  return <div className="bg-bg p-6 sm:p-8"><p className="text-[10px] font-bold tracking-[0.18em] text-primary">{step}</p><h3 className="mt-16 font-serif text-[25px] tracking-[-0.04em]">{title}</h3><p className="mt-3 text-[12px] leading-[1.6] text-ink-2">{body}</p></div>;
}

function PartnerPoint({ title, body }: { title: string; body: string }) {
  return <div className="bg-stone p-6 sm:p-8"><p className="font-serif text-[26px] tracking-[-0.04em]">{title}</p><p className="mt-4 max-w-[290px] text-[13px] leading-[1.7] text-ink-2">{body}</p></div>;
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">{title}</p><div className="mt-5 grid gap-3 text-[12px] text-white/75">{links.map(([label, href]) => <Link key={label} href={href} className="transition-colors hover:text-white">{label}</Link>)}</div></div>;
}

function MenuIcon({ size = 19 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}
