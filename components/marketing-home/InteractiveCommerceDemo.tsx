"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRightIcon, CheckIcon, EyeIcon } from "@/components/Icons";
import { buildTrackedProductOfferPath } from "@/lib/affiliate/outbound-url";
import { HERO_OBJECTS, marketingProduct } from "@/lib/marketing-home";

type DemoPhase = "scanning" | "ready";

export default function InteractiveCommerceDemo() {
  const [phase, setPhase] = useState<DemoPhase>("scanning");
  const [selectedId, setSelectedId] = useState("shirt");
  const selectedObject = useMemo(
    () => HERO_OBJECTS.find((item) => item.id === selectedId) ?? HERO_OBJECTS[0],
    [selectedId]
  );
  const selectedProduct = marketingProduct(selectedObject.productId);
  const purchasePath = buildTrackedProductOfferPath(selectedProduct.id, { postId: "marketing-home", objectId: selectedObject.id, creatorId: "demo" });

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase("ready"), 1650);
    return () => window.clearTimeout(timer);
  }, []);

  const replay = () => {
    setPhase("scanning");
    window.setTimeout(() => setPhase("ready"), 1650);
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/8 p-1.5 shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
      <div className="overflow-hidden rounded-[22px] bg-dark">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[10px] font-semibold tracking-[0.12em] text-white/55 sm:px-5">
          <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-lilac" /> STS / VISUAL COMMERCE</span>
          <button type="button" onClick={replay} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[10px] text-white/75 transition-[background-color,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><EyeIcon size={13} strokeWidth={1.6} /> 다시 분석</button>
        </div>

        <div className="grid lg:grid-cols-[1.04fr_0.96fr]">
          <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[5/6] lg:aspect-auto lg:min-h-[610px]">
            <img src="/looks/look1.jpg" alt="하늘색 옥스포드 셔츠를 입은 크리에이터의 실제 스타일 사진" width="900" height="900" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/5" />
            {phase === "scanning" && <div className="commerce-scan-line pointer-events-none absolute inset-x-0 top-0 h-1/5 bg-gradient-to-b from-transparent via-white/70 to-transparent blur-[2px]" />}
            {HERO_OBJECTS.map((object) => {
              const active = object.id === selectedObject.id;
              return (
                <button
                  key={object.id}
                  type="button"
                  aria-label={`${object.label} ${object.state} 후보 보기`}
                  aria-pressed={active}
                  onClick={() => { setSelectedId(object.id); setPhase("ready"); }}
                  style={{ left: `${object.left}%`, top: `${object.top}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${active ? "z-20 scale-105" : "z-10 opacity-85 hover:scale-105 hover:opacity-100"}`}
                >
                  <span className={`flex items-center gap-2 rounded-full border px-2.5 py-2 text-[10px] font-bold shadow-lg backdrop-blur-md ${active ? "border-white bg-white text-ink" : "border-white/60 bg-ink/70 text-white"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full ${active ? "bg-primary text-white" : "bg-white/20 text-white"}`}>{active ? <CheckIcon size={11} strokeWidth={2.3} /> : "+"}</span>
                    {object.label}
                  </span>
                </button>
              );
            })}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 text-[10px] font-semibold text-white/80">
              <span className="rounded-full bg-black/45 px-3 py-2 backdrop-blur-md">{phase === "scanning" ? "사진 속 상품을 찾는 중" : "3 products detected"}</span>
              <span className="rounded-full border border-white/25 px-3 py-2 backdrop-blur-md">AI object view</span>
            </div>
          </div>

          <div className="flex flex-col bg-dark px-5 py-6 text-white sm:px-7 sm:py-8">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-lilac">PHOTO → PRODUCT → COMMERCE</p>
              <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3.4rem)] leading-[0.98] tracking-[-0.07em]">사진 속 상품을<br /><em className="font-normal text-lilac">바로 연결합니다.</em></h2>
              <p className="mt-4 max-w-[330px] text-[13px] leading-[1.7] text-white/55">탭한 객체를 실제 카탈로그 상품과 대조하고, 확인된 구매 경로만 보여줍니다.</p>
            </div>

            <div className="mt-7 flex gap-2 overflow-x-auto pb-1">
              {HERO_OBJECTS.map((object) => (
                <button key={object.id} type="button" onClick={() => { setSelectedId(object.id); setPhase("ready"); }} aria-pressed={object.id === selectedObject.id} className={`flex min-w-[92px] shrink-0 items-center gap-2 rounded-[12px] border p-2 text-left transition-[background-color,border-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${object.id === selectedObject.id ? "border-white/45 bg-white/12" : "border-white/10 bg-white/5"}`}>
                  <img src={marketingProduct(object.productId).image} alt="" width="42" height="42" className="h-10 w-10 rounded-[8px] object-cover" />
                  <span className="min-w-0"><span className="block truncate text-[10px] font-bold">{object.label}</span><span className="mt-1 block text-[9px] text-white/50">{object.confidence}%</span></span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-[18px] border border-white/10 bg-white/6 p-4">
              <div className="flex gap-3">
                <img src={selectedProduct.image} alt={`${selectedProduct.brand} ${selectedProduct.name} 실제 상품 이미지`} width="96" height="96" className="h-20 w-20 rounded-[12px] bg-stone object-cover" />
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold text-white/75">{selectedObject.state}</span>
                  <p className="mt-2 text-[10px] font-semibold text-white/45">{selectedProduct.brand}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] font-bold leading-[1.35]">{selectedProduct.name}</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
                <div><p className="text-[10px] text-white/45">{selectedProduct.retailer}</p><p className="mt-1 text-[18px] font-bold tabular-nums">₩{selectedProduct.price.toLocaleString("ko-KR")}</p></div>
                <span className="text-right text-[10px] font-semibold text-lilac">{phase === "scanning" ? "매칭 중" : "상품 연결 완료"}</span>
              </div>
            </div>

            <div className="mt-auto pt-6">
              {purchasePath ? <a href={purchasePath} className="group flex min-h-12 items-center justify-between rounded-full bg-surface px-4 py-2 text-[12px] font-bold text-ink transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><span>검증된 상품 확인</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/8 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><ArrowUpRightIcon size={16} strokeWidth={1.8} /></span></a> : <span className="flex min-h-12 items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-white/45">검증된 구매 경로 없음</span>}
              <div className="mt-4 flex items-center justify-between text-[10px] text-white/45"><span>Viewer taps product</span><span>→</span><span>Purchase</span><span>→</span><span className="text-white/80">Creator earns</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
