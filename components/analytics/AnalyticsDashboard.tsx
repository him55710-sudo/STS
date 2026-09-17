"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("month");
  const [selectedZoneTab, setSelectedZoneTab] = useState<"all" | "lips" | "nose" | "eyes" | "eyebrows" | "cheeks">("all");

  const facialZoneStats = [
    {
      id: "lips",
      name: "입술 (Lips)",
      icon: "💋",
      clicks: "148,200회",
      share: 38.4,
      cvr: "11.2%",
      roas: "920%",
      topProduct: "rom&nd 쥬시 래스팅 틴트 #25",
      revenue: "3억 8,400만원",
      color: "from-rose-500 to-pink-500",
      textColor: "text-rose-400",
      bgColor: "bg-rose-500/10 border-rose-500/30",
    },
    {
      id: "cheeks",
      name: "볼 / 치크 (Cheeks)",
      icon: "🌸",
      clicks: "100,800회",
      share: 26.1,
      cvr: "8.9%",
      roas: "840%",
      topProduct: "3CE 무드레시피 & 클리오 쿠션",
      revenue: "2억 6,100만원",
      color: "from-pink-500 to-indigo-500",
      textColor: "text-pink-400",
      bgColor: "bg-pink-500/10 border-pink-500/30",
    },
    {
      id: "nose",
      name: "코 / 콧대 (Nose)",
      icon: "👃",
      clicks: "71,500회",
      share: 18.5,
      cvr: "7.6%",
      roas: "780%",
      topProduct: "투쿨포스쿨 바이로댕 쉐딩 마스터",
      revenue: "1억 8,500만원",
      color: "from-amber-500 to-orange-500",
      textColor: "text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/30",
    },
    {
      id: "eyes",
      name: "눈 / 아이 (Eyes)",
      icon: "👁️",
      clicks: "47,500회",
      share: 12.3,
      cvr: "6.8%",
      roas: "710%",
      topProduct: "클리오 워터프루프 킬브라운 펜라이너",
      revenue: "1억 2,300만원",
      color: "from-purple-500 to-violet-500",
      textColor: "text-purple-400",
      bgColor: "bg-purple-500/10 border-purple-500/30",
    },
    {
      id: "eyebrows",
      name: "눈썹 (Eyebrows)",
      icon: "✏️",
      clicks: "18,200회",
      share: 4.7,
      cvr: "5.1%",
      roas: "640%",
      topProduct: "에뛰드 드로잉 슬림 아이브로우",
      revenue: "4,700만원",
      color: "from-emerald-500 to-teal-500",
      textColor: "text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/30",
    },
  ];

  const creatorRankings = [
    { rank: 1, handle: "@yoon.glow", name: "윤글로우", gmv: "4억 1,200만원", orders: 18420, roas: "980%", avatar: "/kbeauty-models/kb-creator-01.jpg", badge: "글래스 스킨 1위" },
    { rank: 2, handle: "@minji.makeup", name: "민지메이크업", gmv: "3억 7,800만원", orders: 15200, roas: "910%", avatar: "/kbeauty-models/kb-creator-02.jpg", badge: "도자기 베이스 1위" },
    { rank: 3, handle: "@jiwoo.clean", name: "지우클린", gmv: "2억 9,400만원", orders: 12890, roas: "860%", avatar: "/kbeauty-models/kbeauty-hero-model.jpg", badge: "선케어 1위" },
    { rank: 4, handle: "@haein.beauty", name: "해인뷰티", gmv: "2억 4,100만원", orders: 10450, roas: "820%", avatar: "/kbeauty-models/kb-creator-05.jpg", badge: "트러블 진정 1위" },
    { rank: 5, handle: "@chaewon.daily", name: "채원데일리", gmv: "1억 9,800만원", orders: 8900, roas: "790%", avatar: "/kbeauty-models/kb-creator-04.jpg", badge: "수분 보습 1위" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="h-16 px-6 sm:px-12 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white">STS</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold tracking-wider">
              ANALYTICS PRO
            </span>
          </Link>
          <span className="hidden md:inline-block text-xs text-neutral-400 border-l border-neutral-800 pl-3">
            실시간 AI 비주얼 커머스 & 안면 세그멘테이션 데이터 인텔리전스
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/reels" 
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5"
          >
            <span>📱</span>
            <span>릴스 뷰어</span>
          </Link>
          <Link 
            href="/feed" 
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5"
          >
            <span>🛍️</span>
            <span>소셜 피드</span>
          </Link>
          <Link 
            href="/" 
            className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-sm"
          >
            홈으로
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                AI 비주얼 커머스 성과 인텔리전스
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                실시간 동기화 LIVE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              코, 입술, 눈, 눈썹, 볼 등 안면 부위별 SVG 폴리곤 태그 반응도 및 1초 구매 전환 분석
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-1 shrink-0">
            {(["today", "week", "month", "year"] as const).map((p) => {
              const labelMap = { today: "오늘", week: "이번 주", month: "이번 달 (9월)", year: "연간" };
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    period === p
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {labelMap[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Core Metric Cards (Toss style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/40 transition">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold">누적 총 거래액 (GMV)</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold">+28.4%</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">18억 4,200만</span>
              <span className="text-sm font-semibold text-neutral-400">원</span>
            </div>
            <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1">
              <span>전월 대비</span>
              <strong className="text-emerald-400 font-bold">+4억 1,000만원 증가</strong>
            </p>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition" />
          </div>

          <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold">평균 1초 구매 전환율 (CVR)</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold">3.4x</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">8.42%</span>
              <span className="text-xs text-neutral-400">(일반 이커머스: 2.4%)</span>
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              화장 부위 터치 후 즉시 간편결제 연결 효과
            </p>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition" />
          </div>

          <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/40 transition">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold">K-뷰티 협업 ROAS</span>
              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold">최고효율</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-400 tracking-tight">840%</span>
              <span className="text-xs text-neutral-400">(투자 대비 8.4배)</span>
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              뷰티 크리에이터 1인당 평균 마진율 14.8%
            </p>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition" />
          </div>

          <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold">AI 폴리곤 안면 인식 정확도</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold">SOTA</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400 tracking-tight">99.8%</span>
              <span className="text-xs text-neutral-400">468 Landmarker</span>
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              코, 입술, 눈, 눈썹, 볼 5대 부위 자동 레이어링
            </p>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition" />
          </div>
        </div>

        {/* Section: Facial 5-Zone AI Segmentation Breakdown (HIGHLIGHT OF USER REQUIREMENT) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <h2 className="text-xl font-bold text-white">
                  안면 5대 부위별 (코 · 입술 · 눈 · 눈썹 · 볼) AI 세그멘테이션 구매 전환 분석
                </h2>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                사용자가 얼굴의 특정 화장 부위를 클릭했을 때 발생한 실시간 클릭 점유율과 구매 전환 데이터
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold self-start sm:self-auto">
              정밀 다각형 폴리곤 메쉬 기반 집계
            </span>
          </div>

          {/* Visual Distribution Bar */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded-full overflow-hidden flex shadow-inner bg-neutral-800">
              <div style={{ width: "38.4%" }} className="bg-rose-500 transition-all duration-500" title="입술 38.4%" />
              <div style={{ width: "26.1%" }} className="bg-pink-400 transition-all duration-500" title="볼 26.1%" />
              <div style={{ width: "18.5%" }} className="bg-amber-500 transition-all duration-500" title="코 18.5%" />
              <div style={{ width: "12.3%" }} className="bg-purple-500 transition-all duration-500" title="눈 12.3%" />
              <div style={{ width: "4.7%" }} className="bg-emerald-500 transition-all duration-500" title="눈썹 4.7%" />
            </div>
            <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 pt-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> 입술 (38.4%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-400" /> 볼/치크 (26.1%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 코/콧대 (18.5%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> 눈/아이 (12.3%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 눈썹 (4.7%)</span>
            </div>
          </div>

          {/* Detailed 5-Zone Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {facialZoneStats.map((zone) => (
              <div
                key={zone.id}
                className={`p-4 rounded-2xl border transition hover:scale-[1.02] cursor-pointer ${zone.bgColor}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{zone.icon}</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white/10 text-white">
                    {zone.share}% 점유
                  </span>
                </div>
                <h3 className="font-extrabold text-sm text-white mt-2">{zone.name}</h3>
                
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-300">
                    <span>태그 클릭수</span>
                    <strong className="text-white font-bold">{zone.clicks}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-300">
                    <span>구매전환율 (CVR)</span>
                    <strong className="text-emerald-400 font-bold">{zone.cvr}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-300">
                    <span>발생 매출</span>
                    <strong className={zone.textColor}>{zone.revenue}</strong>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/10">
                  <span className="text-[10px] text-neutral-400 block">최고 판매 효자 상품</span>
                  <span className="text-xs font-semibold text-white truncate block mt-0.5" title={zone.topProduct}>
                    {zone.topProduct}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2-Column: Revenue Chart & Top Creator Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Simulation & Time-series Trends (2 cols) */}
          <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📈</span>
                  <span>일자별 매출 & 1초 간편결제 전환 추이</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">최근 30일간 STS 비주얼 커머스 성장 곡선</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                ▲ +41.2% 폭발적 성장세
              </span>
            </div>

            {/* SVG Interactive Trend Chart */}
            <div className="h-64 w-full relative pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="40" x2="700" y2="40" stroke="#333" strokeDasharray="3 3" />
                <line x1="0" y1="90" x2="700" y2="90" stroke="#333" strokeDasharray="3 3" />
                <line x1="0" y1="140" x2="700" y2="140" stroke="#333" strokeDasharray="3 3" />
                <line x1="0" y1="190" x2="700" y2="190" stroke="#333" strokeDasharray="3 3" />

                {/* Area Fill */}
                <path
                  d="M 0 190 Q 70 180, 140 160 T 280 130 T 420 85 T 560 50 T 700 20 L 700 210 L 0 210 Z"
                  fill="url(#chartGrad)"
                />

                {/* Stroke Line */}
                <path
                  d="M 0 190 Q 70 180, 140 160 T 280 130 T 420 85 T 560 50 T 700 20"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Highlight Point */}
                <circle cx="700" cy="20" r="6" fill="#60a5fa" stroke="#ffffff" strokeWidth="2" />
              </svg>

              {/* X Axis Labels */}
              <div className="flex justify-between text-[11px] text-neutral-400 mt-3 pt-2 border-t border-neutral-800">
                <span>9월 1일 (런칭)</span>
                <span>9월 5일</span>
                <span>9월 10일 (릴스 오픈)</span>
                <span>9월 14일</span>
                <span className="font-bold text-blue-400">9월 17일 (오늘 최고치 달성)</span>
              </div>
            </div>

            {/* Quick Channel Contribution Badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 text-center">
                <span className="text-xs text-neutral-400 block">릴스 숏폼 커머스</span>
                <strong className="text-sm font-extrabold text-blue-400 mt-0.5 block">52.4% (9.6억원)</strong>
              </div>
              <div className="p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 text-center">
                <span className="text-xs text-neutral-400 block">크리에이터 소셜 피드</span>
                <strong className="text-sm font-extrabold text-purple-400 mt-0.5 block">28.1% (5.1억원)</strong>
              </div>
              <div className="p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 text-center">
                <span className="text-xs text-neutral-400 block">AI 폴리곤 인터랙션</span>
                <strong className="text-sm font-extrabold text-emerald-400 mt-0.5 block">19.5% (3.6억원)</strong>
              </div>
            </div>
          </div>

          {/* Top Creators Leaderboard (1 col) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>👑</span>
                  <span>탑 크리에이터 랭킹</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">실시간 매출 및 리워드 정산 순위</p>
              </div>
              <span className="text-xs text-blue-400 font-semibold">전체보기</span>
            </div>

            <div className="space-y-3">
              {creatorRankings.map((c) => (
                <div
                  key={c.rank}
                  className="flex items-center justify-between p-3 rounded-2xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-center font-black text-sm ${
                      c.rank === 1 ? "text-amber-400" : c.rank === 2 ? "text-neutral-300" : c.rank === 3 ? "text-amber-600" : "text-neutral-500"
                    }`}>
                      {c.rank}
                    </span>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700 shrink-0 border border-white/10">
                      <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{c.name}</span>
                        <span className="text-[10px] text-neutral-400">{c.handle}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                        {c.badge}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-white block">{c.gmv}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">ROAS {c.roas}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-700/40 text-xs">
              <strong className="text-blue-300 block">💡 실시간 AI 인사이트</strong>
              <p className="text-neutral-300 mt-1">
                입술(Lips) 부위와 콧대(Nose) 부위를 동시에 태깅한 숏폼 콘텐츠의 전환율이 단일 태그 대비 <strong>2.8배</strong> 높게 측정되었습니다.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
