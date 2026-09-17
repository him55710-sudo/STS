"use client";

import React, { useState, useEffect } from "react";
import { RealProduct, REAL_KBEAUTY_BESTSELLERS } from "@/lib/real-products-data";
import { Sparkles, Check, ArrowRight, ShieldCheck, Zap, Heart, ShoppingBag } from "lucide-react";

interface IphoneMockupProps {
  activeMode?: "market" | "ad" | "sponsor" | "reward";
  onProductClick?: (product: RealProduct) => void;
}

export default function Iphone16ProMockup({ activeMode = "market" }: IphoneMockupProps) {
  // 모드별 내부 탭
  const [internalTab, setInternalTab] = useState<"scan" | "toss-wallet" | "sponsor">("scan");
  const [selectedScanItem, setSelectedScanItem] = useState<string>("romand");
  const [withdrawn, setWithdrawn] = useState(false);
  const [balance, setBalance] = useState(485200);
  const [sponsoredItems, setSponsoredItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeMode === "market" || activeMode === "ad") {
      setInternalTab("scan");
    } else if (activeMode === "reward") {
      setInternalTab("toss-wallet");
    } else if (activeMode === "sponsor") {
      setInternalTab("sponsor");
    }
  }, [activeMode]);

  const handleWithdraw = () => {
    if (withdrawn) return;
    setWithdrawn(true);
    setTimeout(() => {
      setBalance(0);
    }, 400);
  };

  const handleSponsorClick = (id: string) => {
    setSponsoredItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[360px] select-none">
      {/* ── 실제 iPhone 16 Pro 물리 외형 디테일 ── */}
      {/* 좌측 버튼류: 액션 버튼 & 볼륨 상/하 */}
      <div className="absolute -left-[13px] top-[115px] h-9 w-[3px] rounded-l-sm bg-[#3A3F4B] shadow-sm" />
      <div className="absolute -left-[13px] top-[165px] h-12 w-[3px] rounded-l-sm bg-[#3A3F4B] shadow-sm" />
      <div className="absolute -left-[13px] top-[225px] h-12 w-[3px] rounded-l-sm bg-[#3A3F4B] shadow-sm" />
      {/* 우측 전원 버튼 */}
      <div className="absolute -right-[13px] top-[170px] h-16 w-[3px] rounded-r-sm bg-[#3A3F4B] shadow-sm" />

      {/* 정밀 티타늄 바디 케이스 (3D 베벨 + 림 반사) */}
      <div className="iphone-pro-chassis">
        {/* 내부 디스플레이 화면 (OLED 블랙) */}
        <div className="iphone-pro-screen aspect-[9/19.5] w-full bg-[#FAFAFC] flex flex-col justify-between text-neutral-900 overflow-hidden font-sans">
          
          {/* 상단 다이내믹 아일랜드 & 상태바 */}
          <div className="relative z-30 pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-bold text-neutral-900 bg-transparent">
            <span>9:41</span>
            
            {/* Dynamic Island 인터랙션 바 */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2.5 h-[28px] w-[95px] rounded-full bg-black flex items-center justify-between px-2.5 shadow-md">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2F54EB] animate-pulse" />
                <span className="text-[9px] font-bold text-white tracking-wider">STS</span>
              </div>
              <div className="h-3 w-3 rounded-full bg-neutral-900 border border-neutral-700/60" />
            </div>

            <div className="flex items-center gap-1 text-[10px]">
              <span>5G</span>
              <div className="w-5 h-2.5 rounded-[3px] border border-neutral-800 p-0.5 flex items-center">
                <div className="h-full w-full bg-neutral-900 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* 상단 퀵 네비게이션 탭 (토스/피그마 감성) */}
          <div className="relative z-20 px-4 pt-1 pb-2">
            <div className="flex items-center justify-between rounded-full bg-neutral-200/70 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setInternalTab("scan")}
                className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-full transition-all ${
                  internalTab === "scan" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"
                }`}
              >
                뷰티 AI 스캔
              </button>
              <button
                type="button"
                onClick={() => setInternalTab("toss-wallet")}
                className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-full transition-all ${
                  internalTab === "toss-wallet" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"
                }`}
              >
                정산·수익
              </button>
              <button
                type="button"
                onClick={() => setInternalTab("sponsor")}
                className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-full transition-all ${
                  internalTab === "sponsor" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"
                }`}
              >
                0원 협찬
              </button>
            </div>
          </div>

          {/* 탭 1: 뷰티 AI 정밀 폴리곤 세그멘테이션 스캐너 */}
          {internalTab === "scan" && (
            <div className="relative flex-1 flex flex-col justify-between overflow-hidden px-3.5 pb-3">
              {/* 카메라 뷰파인더 영역 */}
              <div className="relative rounded-[28px] overflow-hidden aspect-[4/4.8] bg-neutral-900 border border-neutral-200/50 shadow-inner">
                {/* 실사 K-뷰티 모델 배경 */}
                <img
                  src="/kbeauty-models/kb-creator-02.jpg"
                  alt="K-뷰티 모델 스킨케어/메이크업"
                  className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.92]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35" />

                {/* 레이저 스캔 빔 모션 그래픽 */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#2F54EB] to-transparent shadow-[0_0_18px_#2F54EB] animate-laser pointer-events-none" />

                {/* ── 정밀 AI 세그멘테이션 SVG 폴리곤 레이어 ── */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-auto z-10"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {/* 1. 입술 (Lips) 폴리곤 */}
                  <polygon
                    points="44,61 47,59.2 50,60 53,59.2 56,61 58,63.5 55,66.8 50,68.5 45,66.8 42,63.5"
                    fill={selectedScanItem === "romand" ? "rgba(244, 63, 94, 0.40)" : "rgba(255, 255, 255, 0.10)"}
                    stroke={selectedScanItem === "romand" ? "rgba(251, 113, 133, 0.98)" : "rgba(255, 255, 255, 0.45)"}
                    strokeWidth={selectedScanItem === "romand" ? "1.8" : "0.9"}
                    strokeDasharray={selectedScanItem === "romand" ? "none" : "3, 2"}
                    className="cursor-pointer transition-all hover:opacity-100"
                    onClick={() => setSelectedScanItem("romand")}
                    style={{
                      filter: selectedScanItem === "romand" ? "drop-shadow(0 0 8px rgba(244, 63, 94, 0.8))" : undefined,
                    }}
                  />

                  {/* 2. 코 / 콧대 (Nose) 폴리곤 */}
                  <polygon
                    points="47,43 51,43 53,49 54,54 55,57 51,59 47,57 45,54 46,49"
                    fill={selectedScanItem === "toocool" ? "rgba(245, 158, 11, 0.40)" : "rgba(255, 255, 255, 0.10)"}
                    stroke={selectedScanItem === "toocool" ? "rgba(251, 191, 36, 0.98)" : "rgba(255, 255, 255, 0.45)"}
                    strokeWidth={selectedScanItem === "toocool" ? "1.8" : "0.9"}
                    strokeDasharray={selectedScanItem === "toocool" ? "none" : "3, 2"}
                    className="cursor-pointer transition-all hover:opacity-100"
                    onClick={() => setSelectedScanItem("toocool")}
                    style={{
                      filter: selectedScanItem === "toocool" ? "drop-shadow(0 0 8px rgba(245, 158, 11, 0.8))" : undefined,
                    }}
                  />

                  {/* 3. 눈 / 아이 (Eyes) 폴리곤 */}
                  <polygon
                    points="29,41 36,38 43,41 40,45 33,45"
                    fill={selectedScanItem === "clio-liner" ? "rgba(168, 85, 247, 0.40)" : "rgba(255, 255, 255, 0.10)"}
                    stroke={selectedScanItem === "clio-liner" ? "rgba(192, 132, 252, 0.98)" : "rgba(255, 255, 255, 0.45)"}
                    strokeWidth={selectedScanItem === "clio-liner" ? "1.8" : "0.9"}
                    strokeDasharray={selectedScanItem === "clio-liner" ? "none" : "3, 2"}
                    className="cursor-pointer transition-all hover:opacity-100"
                    onClick={() => setSelectedScanItem("clio-liner")}
                    style={{
                      filter: selectedScanItem === "clio-liner" ? "drop-shadow(0 0 8px rgba(168, 85, 247, 0.8))" : undefined,
                    }}
                  />

                  {/* 4. 눈썹 (Eyebrows) 폴리곤 */}
                  <polygon
                    points="27,33 35,30 43,32 42,35 35,33 27,35"
                    fill={selectedScanItem === "etude" ? "rgba(16, 185, 129, 0.40)" : "rgba(255, 255, 255, 0.10)"}
                    stroke={selectedScanItem === "etude" ? "rgba(52, 211, 153, 0.98)" : "rgba(255, 255, 255, 0.45)"}
                    strokeWidth={selectedScanItem === "etude" ? "1.8" : "0.9"}
                    strokeDasharray={selectedScanItem === "etude" ? "none" : "3, 2"}
                    className="cursor-pointer transition-all hover:opacity-100"
                    onClick={() => setSelectedScanItem("etude")}
                    style={{
                      filter: selectedScanItem === "etude" ? "drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))" : undefined,
                    }}
                  />

                  {/* 5. 볼 (Cheeks) 폴리곤 */}
                  <polygon
                    points="27,46 36,43 43,47 44,56 39,63 29,61 24,53"
                    fill={selectedScanItem === "clio" ? "rgba(59, 130, 246, 0.35)" : "rgba(255, 255, 255, 0.10)"}
                    stroke={selectedScanItem === "clio" ? "rgba(96, 165, 250, 0.98)" : "rgba(255, 255, 255, 0.45)"}
                    strokeWidth={selectedScanItem === "clio" ? "1.8" : "0.9"}
                    strokeDasharray={selectedScanItem === "clio" ? "none" : "3, 2"}
                    className="cursor-pointer transition-all hover:opacity-100"
                    onClick={() => setSelectedScanItem("clio")}
                    style={{
                      filter: selectedScanItem === "clio" ? "drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))" : undefined,
                    }}
                  />
                </svg>

                {/* 상단 HUD 오버레이 */}
                <div className="absolute top-2.5 inset-x-3 flex items-center justify-between z-20">
                  <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur-md border border-white/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>AI POLYGON 5-ZONE ACTIVE</span>
                  </div>
                  <span className="text-[9px] font-black text-[#92ABFF] bg-black/60 px-2 py-0.8 rounded-full border border-blue-500/30">
                    99.8% 정확도
                  </span>
                </div>

                {/* 5대 부위 터치 선택 칩 */}
                <div className="absolute bottom-2 inset-x-2 flex items-center justify-center gap-1 z-20 overflow-x-auto no-scrollbar">
                  {[
                    { id: "romand", name: "💋 입술", color: "bg-pink-500" },
                    { id: "toocool", name: "👃 코", color: "bg-amber-500" },
                    { id: "clio-liner", name: "👁️ 눈", color: "bg-purple-500" },
                    { id: "etude", name: "✏️ 눈썹", color: "bg-emerald-500" },
                    { id: "clio", name: "🌸 볼", color: "bg-blue-500" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setSelectedScanItem(chip.id)}
                      className={`px-1.5 py-0.8 rounded-full text-[9px] font-bold transition-all border shrink-0 ${
                        selectedScanItem === chip.id
                          ? `${chip.color} text-white border-white/60 shadow-md scale-105`
                          : "bg-black/60 text-white/80 border-white/20 hover:bg-black"
                      }`}
                    >
                      {chip.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 하단 탐지된 상품 플로팅 카드 (선택된 폴리곤 부위 실시간 반응) */}
              <div className="mt-2.5 rounded-[22px] bg-white p-3 shadow-md border border-neutral-100 flex items-center justify-between animate-pop">
                {selectedScanItem === "romand" && (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src="/products/kb-romand-tint.jpg"
                        alt="롬앤"
                        className="w-12 h-12 rounded-xl object-contain bg-neutral-50 p-1 border border-neutral-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">
                          💋 입술 폴리곤 인식 완료
                        </span>
                        <p className="text-[12px] font-bold text-neutral-900 truncate mt-0.5">
                          롬앤 쥬시래스팅 #25 베어그레이프
                        </p>
                        <p className="text-[11px] font-extrabold text-neutral-900">
                          <span className="text-red-500">32%</span> 8,900원 · <span className="text-[#2F54EB]">커미션 15%</span>
                        </p>
                      </div>
                    </div>
                    <button className="h-8 px-3 rounded-full bg-[#111318] text-white text-[10px] font-bold hover:bg-[#2F54EB] transition-colors shrink-0 shadow-sm">
                      1초구매
                    </button>
                  </>
                )}

                {selectedScanItem === "toocool" && (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src="/products/kb-toocool-shading.jpg"
                        alt="투쿨"
                        className="w-12 h-12 rounded-xl object-contain bg-neutral-50 p-1 border border-neutral-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          👃 코 / 콧대 쉐딩 인식
                        </span>
                        <p className="text-[12px] font-bold text-neutral-900 truncate mt-0.5">
                          투쿨포스쿨 아트클래스 바이로댕
                        </p>
                        <p className="text-[11px] font-extrabold text-neutral-900">
                          <span className="text-red-500">30%</span> 11,200원 · <span className="text-[#2F54EB]">커미션 14%</span>
                        </p>
                      </div>
                    </div>
                    <button className="h-8 px-3 rounded-full bg-[#111318] text-white text-[10px] font-bold hover:bg-[#2F54EB] transition-colors shrink-0 shadow-sm">
                      1초구매
                    </button>
                  </>
                )}

                {selectedScanItem === "clio-liner" && (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src="/products/kb-clio-liner.jpg"
                        alt="클리오 라이너"
                        className="w-12 h-12 rounded-xl object-contain bg-neutral-50 p-1 border border-neutral-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                          👁️ 눈 / 아이라이너 인식
                        </span>
                        <p className="text-[12px] font-bold text-neutral-900 truncate mt-0.5">
                          클리오 워터프루프 킬브라운 펜라이너
                        </p>
                        <p className="text-[11px] font-extrabold text-neutral-900">
                          <span className="text-red-500">30%</span> 12,600원 · <span className="text-[#2F54EB]">커미션 13%</span>
                        </p>
                      </div>
                    </div>
                    <button className="h-8 px-3 rounded-full bg-[#111318] text-white text-[10px] font-bold hover:bg-[#2F54EB] transition-colors shrink-0 shadow-sm">
                      1초구매
                    </button>
                  </>
                )}

                {selectedScanItem === "etude" && (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src="/products/kb-etude-brow.jpg"
                        alt="에뛰드"
                        className="w-12 h-12 rounded-xl object-contain bg-neutral-50 p-1 border border-neutral-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          ✏️ 눈썹 / 아이브로우 인식
                        </span>
                        <p className="text-[12px] font-bold text-neutral-900 truncate mt-0.5">
                          에뛰드 드로잉 슬림 0.05mm
                        </p>
                        <p className="text-[11px] font-extrabold text-neutral-900">
                          <span className="text-red-500">30%</span> 3,500원 · <span className="text-[#2F54EB]">커미션 12%</span>
                        </p>
                      </div>
                    </div>
                    <button className="h-8 px-3 rounded-full bg-[#111318] text-white text-[10px] font-bold hover:bg-[#2F54EB] transition-colors shrink-0 shadow-sm">
                      1초구매
                    </button>
                  </>
                )}

                {selectedScanItem === "clio" && (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src="/products/kb-clio-cushion.jpg"
                        alt="클리오"
                        className="w-12 h-12 rounded-xl object-contain bg-neutral-50 p-1 border border-neutral-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-[#2F54EB] bg-blue-50 px-1.5 py-0.5 rounded">
                          🌸 볼 / 베이스 폴리곤 완료
                        </span>
                        <p className="text-[12px] font-bold text-neutral-900 truncate mt-0.5">
                          클리오 킬커버 파운웨어 쿠션
                        </p>
                        <p className="text-[11px] font-extrabold text-neutral-900">
                          <span className="text-red-500">30%</span> 25,200원 · <span className="text-emerald-600">광고비 150만</span>
                        </p>
                      </div>
                    </div>
                    <button className="h-8 px-3 rounded-full bg-[#111318] text-white text-[10px] font-bold hover:bg-[#2F54EB] transition-colors shrink-0 shadow-sm">
                      1초구매
                    </button>
                  </>
                )}

                {selectedScanItem === "boj" && (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src="/products/kb-boj-sun.jpg"
                        alt="조선미녀"
                        className="w-12 h-12 rounded-xl object-contain bg-neutral-50 p-1 border border-neutral-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          ✨ T존/이마 폴리곤 인식 완료
                        </span>
                        <p className="text-[12px] font-bold text-neutral-900 truncate mt-0.5">
                          조선미녀 맑은쌀선크림 SPF50+
                        </p>
                        <p className="text-[11px] font-extrabold text-neutral-900">
                          <span className="text-red-500">25%</span> 13,500원 · <span className="text-[#2F54EB]">커미션 15%</span>
                        </p>
                      </div>
                    </div>
                    <button className="h-8 px-3 rounded-full bg-[#111318] text-white text-[10px] font-bold hover:bg-[#2F54EB] transition-colors shrink-0 shadow-sm">
                      태그 확정
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 탭 2: 토스(Toss) 스타일 실시간 정산 및 지갑 데모 */}
          {internalTab === "toss-wallet" && (
            <div className="relative flex-1 flex flex-col justify-between p-4 bg-[#F2F4F8]">
              <div>
                <div className="rounded-[24px] bg-white p-5 shadow-sm border border-neutral-100">
                  <div className="flex items-center justify-between text-neutral-500 text-[12px] font-medium">
                    <span>내 STS 커머스 지갑</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      실시간 입금 가능
                    </span>
                  </div>

                  <div className="mt-2">
                    <p className="text-[32px] font-black text-neutral-900 tracking-tight">
                      {balance.toLocaleString()}
                      <span className="text-[20px] font-bold ml-1">원</span>
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      이번 달 정산 누적: +1,240,000원
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={withdrawn || balance === 0}
                    className={`mt-4 w-full rounded-2xl py-3 text-[13px] font-bold transition-all shadow-md ${
                      withdrawn
                        ? "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
                        : "bg-[#2F54EB] text-white hover:bg-blue-700 active:scale-98"
                    }`}
                  >
                    {withdrawn ? "✓ 토스뱅크 입금 완료 (수수료 0원)" : "토스 계좌로 1초 만에 보내기"}
                  </button>
                </div>

                {/* 최근 정산 내역 피드 */}
                <div className="mt-4">
                  <p className="text-[12px] font-bold text-neutral-500 px-1 mb-2">실시간 판매 리워드</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white text-[12px] shadow-2xs border border-neutral-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-[10px]">
                          마켓
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">롬앤 베어그레이프 25호</p>
                          <p className="text-[10px] text-neutral-400">구매확정 완료 · 10분 전</p>
                        </div>
                      </div>
                      <span className="font-extrabold text-[#2F54EB]">+1,335원</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white text-[12px] shadow-2xs border border-neutral-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2F54EB] flex items-center justify-center font-bold text-[10px]">
                          공유
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">조선미녀 맑은쌀선크림</p>
                          <p className="text-[10px] text-neutral-400">구매확정 완료 · 1시간 전</p>
                        </div>
                      </div>
                      <span className="font-extrabold text-[#2F54EB]">+2,025원</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white/70 p-2.5 text-center text-[10px] text-neutral-400">
                수수료 평생 0원 · 365일 24시간 실시간 입금
              </div>
            </div>
          )}

          {/* 탭 3: 0원 무료협찬 쇼핑 신청 데모 */}
          {internalTab === "sponsor" && (
            <div className="relative flex-1 flex flex-col justify-between p-3.5 bg-white overflow-y-auto no-scrollbar">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-[14px] font-extrabold text-neutral-900">이달의 0원 협찬 신청</h4>
                    <p className="text-[10px] text-neutral-500">배송비까지 전액 브랜드 본사 지원</p>
                  </div>
                  <span className="rounded-full bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-0.5">
                    정품 무상 지원
                  </span>
                </div>

                <div className="space-y-2.5">
                  {REAL_KBEAUTY_BESTSELLERS.slice(0, 3).map((item) => {
                    const isSponsored = sponsoredItems[item.id];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl border border-neutral-100 bg-[#FAFAFC]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={item.image}
                            alt=""
                            className="w-11 h-11 rounded-xl object-contain bg-white p-0.5 border border-neutral-200/60"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-neutral-900 truncate">{item.name}</p>
                            <p className="text-[10px] text-neutral-400 font-medium">정가 {item.originalPrice.toLocaleString()}원 → <strong className="text-purple-600 font-bold">0원</strong></p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSponsorClick(item.id)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                            isSponsored
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                          }`}
                        >
                          {isSponsored ? "✓ 신청완료" : "0원 신청"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-purple-50 p-2.5 text-center text-[10px] font-bold text-purple-700">
                신청 후 평균 2일 내 우체국 택배 발송
              </div>
            </div>
          )}

          {/* 홈 바 */}
          <div className="relative z-30 pb-2 pt-1 flex justify-center bg-transparent">
            <div className="h-1 w-28 rounded-full bg-neutral-900/30" />
          </div>

        </div>
      </div>
    </div>
  );
}
