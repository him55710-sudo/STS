"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  TrendingUp,
  Layers,
  ShoppingBag,
  ShieldCheck,
  Globe2,
  DollarSign,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

type IrServicePlanModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function IrServicePlanModal({ isOpen, onClose }: IrServicePlanModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "process" | "tech" | "market" | "bm">("overview");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex h-[92vh] max-h-[880px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f14] text-white shadow-2xl">
        {/* Top Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF2D78] to-purple-600 text-white font-black text-sm shadow-lg">
              STS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  STS 서비스 마스터플랜 & 비즈니스 아키텍처
                </h2>
                <span className="rounded-full bg-[#FF2D78]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#FF2D78]">
                  IR 2026 EDITION
                </span>
              </div>
              <p className="text-xs text-white/50">
                See it. Tap it. Shop it. · 사진과 영상 속 상품을 AI가 찾아 바로 구매로 연결합니다
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="모달 닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* Navigation Tabs */}
        <div className="flex shrink-0 border-b border-white/10 bg-white/[0.02] px-6 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "01. 비전 & 문제정의" },
            { id: "process", label: "02. 뷰티 8단계 프로세스 (Reveal the Process)" },
            { id: "tech", label: "03. 기술 해자 & 아키텍처" },
            { id: "market", label: "04. 동남아 K-뷰티 $3.2B 시장" },
            { id: "bm", label: "05. 비즈니스 모델 (70:30 정산)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap px-4 py-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === tab.id
                  ? "border-[#FF2D78] text-[#FF2D78]"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Area */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#FF2D78]/15 via-purple-500/10 to-transparent p-5">
                <span className="text-xs font-bold text-[#FF2D78]">INVESTMENT THESIS</span>
                <h3 className="mt-1 text-lg font-bold text-white">
                  "사람들은 SNS에서 상품을 발견하지만, 구매는 아직도 검색에서 시작됩니다."
                </h3>
                <p className="mt-2 text-xs text-white/70 leading-relaxed">
                  발견(Discovery)은 이미 콘텐츠 안에서 일어납니다. 문제는 “무엇을 샀는가”가 아니라 
                  어떤 장면의 어떤 객체가 구매 의도를 만들었는가를 아무도 구조화하지 못한다는 것입니다. 
                  그래서 사용자는 화면을 벗어나 검색창으로 이탈합니다. STS가 화면 위에서 그 해답을 제공합니다.
                </p>
              </div>

              {/* 3 Stakeholders Pain Points */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-xs font-bold text-pink-400">크리에이터</span>
                  <p className="mt-1 text-xs font-semibold text-white">링크를 찾아 붙이는 시간과 노력 과다</p>
                  <p className="mt-1 text-[11px] text-white/50">
                    상품 링크를 일일이 찾고 복사하는 번거로운 과정으로 인해 창작 집중이 어렵습니다.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-xs font-bold text-amber-400">쇼퍼 (소비자)</span>
                  <p className="mt-1 text-xs font-semibold text-white">키워드를 다시 검색해야 하는 번거로움</p>
                  <p className="mt-1 text-[11px] text-white/50">
                    기억에 의존해 키워드를 입력하다가 사고 싶은 즉각적인 타이밍을 놓치고 맙니다.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-xs font-bold text-indigo-400">브랜드 / 제조사</span>
                  <p className="mt-1 text-xs font-semibold text-white">구매 촉발 객체의 데이터 부재</p>
                  <p className="mt-1 text-[11px] text-white/50">
                    콘텐츠 중 어떤 상품/부위가 구매로 이어졌는지 몰라 마케팅 의사결정이 어렵습니다.
                  </p>
                </div>
              </div>

              {/* STS WEDGE */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-xs font-bold tracking-wider text-white/60">THE STS WEDGE (경쟁사 대비 절대 우위)</h4>
                <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-white/80 leading-relaxed">
                    TikTok Shop은 자기 플랫폼 안의 상품만 다루고, LTK는 외부 텍스트 링크에 불과합니다.
                    <strong> STS는 새 플랫폼으로의 이주 없이, 기존 인스타그램/유튜브 SNS 콘텐츠 위에 붙는 쇼핑 연결 레이어</strong>입니다.
                  </p>
                  <Link
                    href="/beauty-demo"
                    onClick={onClose}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl bg-[#FF2D78] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#FF2D78]/25 hover:bg-[#FF2D78]/90"
                  >
                    뷰티 데모 실행하기
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: 8-Step Beauty Process */}
          {activeTab === "process" && (
            <div className="space-y-5 animate-in fade-in">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-xs font-bold text-[#FF2D78]">KILLER UX · REVEAL THE PROCESS</span>
                <h3 className="mt-1 text-base font-bold text-white">
                  "뷰티는 '과정(Process)'이 핵심인 카테고리입니다"
                </h3>
                <p className="mt-1 text-xs text-white/60">
                  완성된 룩만 보면 어떤 제품을 어떻게 썼는지 알 수 없습니다. 궁금한 부위를 터치해 사용 과정과 제품을 바로 보여주는 8단계 여정입니다.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { step: "01", title: "피드 - 완성된 룩", desc: "완성된 메이크업 룩 감상 중 궁금한 안면 부위(입술, 볼, 눈)에 핫스팟/하이라이트가 자연스럽게 반응." },
                  { step: "02", title: "부위 터치 - 프로세스 공개", desc: "입술이나 볼을 터치하면 '이 룩이 만들어진 과정'이 펼쳐지며 타임라인 인터페이스가 부드럽게 전개." },
                  { step: "03", title: "타임라인 - 과정 선택", desc: "1. 속보습 세럼 -> 2. 킬커버 쿠션 -> 3. 아이 음영 -> 4. 치크 -> 5. 립 그라데이션 단계 선택 및 비디오/시뮬레이션 재생." },
                  { step: "04", title: "과정 시청 + 제품 정보", desc: "실제 도포량(예: 스포이드 2방울, 퍼프 반 펌프)과 테크닉 및 정품 제품 카드(롬앤 틴트 #23 누카다미아 등) 노출." },
                  { step: "05", title: "전체 제품 보기 (Shop the routine)", desc: "룩에 사용된 5개 정품 제품 리스트를 모아보고 각 제품의 스펙과 가격을 한눈에 확인." },
                  { step: "06", title: "루틴 한 번에 담기 (Bundle)", desc: "개별 결제 대비 10% 특별 할인된 번들 패키지(정가 92,400원 -> 번들 83,160원) 원클릭 카트 추가." },
                  { step: "07", title: "유사 컬러 추천 (Similar Shades)", desc: "웜톤/쿨톤에 맞는 대체 컬러 칩(#22 포멜로스킨, #24 필링앵두, #25 베어그레이프) 인터랙티브 비교." },
                  { step: "08", title: "구매 완료 & 크리에이터 정산 (70%)", desc: "결제 완료 즉시 플랫폼 마진 20% 중 70%가 콘텐츠를 만든 크리에이터에게 실시간 정산되는 내역 투명 공개." },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/5 transition-all">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FF2D78]/20 text-xs font-black text-[#FF2D78]">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <p className="mt-0.5 text-[11px] text-white/60 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Tech Moat */}
          {activeTab === "tech" && (
            <div className="space-y-5 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <span className="text-[11px] text-white/50">상품 인식률 (Recall)</span>
                  <div className="mt-1 text-2xl font-black text-emerald-400">86%</div>
                  <p className="mt-1 text-[10px] text-white/40">22개 테스트셋 중 19개 인식</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <span className="text-[11px] text-white/50">상품 영역 구분 성공 (Seg)</span>
                  <div className="mt-1 text-2xl font-black text-[#FF2D78]">96%</div>
                  <p className="mt-1 text-[10px] text-white/40">네모 박스 대신 정밀 실루엣</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <span className="text-[11px] text-white/50">신뢰성 안전장치</span>
                  <div className="mt-1 text-2xl font-black text-indigo-400">3단계</div>
                  <p className="mt-1 text-[10px] text-white/40">서버 / 엣지 기기 / 네트워크</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-xs font-bold text-white">데이터 중심의 확장 아키텍처 (PDF 7페이지)</h4>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white/5 p-2.5">
                    <span className="font-bold text-pink-400">이벤트 수집</span>
                    <p className="mt-1 text-[10px] text-white/50">조회·터치·장바구니·구매 기록</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2.5">
                    <span className="font-bold text-indigo-400">기여도 분석</span>
                    <p className="mt-1 text-[10px] text-white/50">어떤 접점이 전환 유발했는지</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2.5">
                    <span className="font-bold text-emerald-400">정산 시스템</span>
                    <p className="mt-1 text-[10px] text-white/50">Creator 70 / STS 30 자동 정산</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2.5">
                    <span className="font-bold text-amber-400">카탈로그 연동</span>
                    <p className="mt-1 text-[10px] text-white/50">SKU, 가격, 재고 통합 관리</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2.5">
                    <span className="font-bold text-purple-400">브랜드 SaaS</span>
                    <p className="mt-1 text-[10px] text-white/50">파트너 캠페인 B2B 데이터</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Target Market */}
          {activeTab === "market" && (
            <div className="space-y-5 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-[11px] text-white/50">글로벌 소셜 커머스</span>
                  <div className="mt-1 text-xl font-black text-white">$1.48T</div>
                  <span className="mt-1 inline-block text-[10px] text-emerald-400 font-semibold">CAGR 28%</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-[11px] text-white/50">크리에이터 제휴 커머스</span>
                  <div className="mt-1 text-xl font-black text-white">$23.9B</div>
                  <span className="mt-1 inline-block text-[10px] text-emerald-400 font-semibold">CAGR 31%</span>
                </div>
                <div className="rounded-2xl border border-[#FF2D78]/30 bg-[#FF2D78]/10 p-4">
                  <span className="text-[11px] text-[#FF2D78] font-bold">1차 진입: 동남아 K-뷰티</span>
                  <div className="mt-1 text-xl font-black text-white">$3.2B</div>
                  <span className="mt-1 inline-block text-[10px] text-[#FF2D78] font-bold">CAGR 34% (최고 성장률)</span>
                </div>
              </div>

              {/* 4 GTM Reasons */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                <h4 className="text-xs font-bold text-white">왜 동남아이고, 왜 뷰티인가?</h4>
                <ul className="space-y-2 text-xs text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF2D78] font-bold">✓</span>
                    <span><strong>검증된 수요</strong>: K-뷰티에 대한 높은 관심과 충성도로 수요 창출 비용 제로.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF2D78] font-bold">✓</span>
                    <span><strong>모바일 구매 습관</strong>: 소셜·라이브 커머스 비중이 높아 "콘텐츠 보다가 산다"는 행동이 가장 자연스러움.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF2D78] font-bold">✓</span>
                    <span><strong>소형 제조사의 갈증</strong>: 인지도 없는 소형 브랜드도 크리에이터 영상에서 발견되면 폭발적 판매로 연결.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF2D78] font-bold">✓</span>
                    <span><strong>경쟁 공백</strong>: LTK(북미 패션 중심), TikTok Shop(폐쇄몰) 사이에 동남아 K-뷰티를 아우르는 레이어 없음.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab 5: Business Model */}
          {activeTab === "bm" && (
            <div className="space-y-5 animate-in fade-in">
              <div className="rounded-2xl border border-[#FF2D78]/30 bg-gradient-to-r from-[#FF2D78]/15 to-transparent p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#FF2D78]">CORE REVENUE MODEL</span>
                  <span className="rounded-full bg-[#FF2D78]/20 px-3 py-0.5 text-xs font-bold text-[#FF2D78]">
                    Creator 70 / STS 30
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-white">
                  판매 수수료 (판매 마진 15~20% 중 70%는 크리에이터, 30%는 STS 수취)
                </h3>
                <p className="mt-1 text-xs text-white/70">
                  소형 화장품 제조사 제휴를 통해 20%의 마진을 확보하고, 이 중 70%를 크리에이터에게 분배하여 폭발적인 참여 동기를 부여합니다.
                </p>
              </div>

              {/* 5-Stage Growth Sequence */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white/70">5단계 수익화 확장 시퀀스 (PDF 10페이지)</h4>
                {[
                  { step: "1단계", name: "판매 수수료", tag: "메인 (Day 1)", desc: "크리에이터 콘텐츠에서 상품이 팔릴 때마다 70:30으로 즉시 분배 정산." },
                  { step: "2단계", name: "브랜드 스폰서드 광고", tag: "메인 (성장기)", desc: "브랜드가 특정 룩이나 부위 태그 상단 노출을 위해 CPC / CPS 광고 집행." },
                  { step: "3단계", name: "크리에이터 분석 도구", tag: "확장 (SaaS)", desc: "어떤 화장품과 부위가 반응이 좋은지 분석하는 구독형 인텔리전스 툴." },
                  { step: "4단계", name: "브랜드 B2B 대시보드", tag: "확장 (B2B SaaS)", desc: "브랜드사가 캠페인 전환율과 크리에이터별 ROAS를 한눈에 관리." },
                  { step: "5단계", name: "데이터 사업", tag: "확장 (엔터프라이즈)", desc: "익명화된 '장면·객체·구매' 행동 빅데이터를 기업 및 연구기관에 제공." },
                ].map((m) => (
                  <div key={m.step} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white">{m.step}</span>
                      <div>
                        <span className="font-bold text-white">{m.name}</span>
                        <p className="text-[11px] text-white/50">{m.desc}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                      {m.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="shrink-0 flex items-center justify-between border-t border-white/10 bg-white/5 px-6 py-3.5">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>KAIST Overedge & MARU 출신 창업팀</span>
            <span>·</span>
            <span>STS Platform v2.4</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/beauty-demo"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all"
            >
              8단계 뷰티 튜토리얼 데모
              <ExternalLink size={13} />
            </Link>
            <Link
              href="/analytics"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl bg-[#FF2D78] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#FF2D78]/25 hover:bg-[#FF2D78]/90 transition-all"
            >
              실시간 애널리틱스 보기
              <TrendingUp size={13} />
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
