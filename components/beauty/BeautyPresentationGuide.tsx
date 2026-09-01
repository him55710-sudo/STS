"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/components/Icons";
import { useBeautyDialogFocus } from "@/hooks/useBeautyDialogFocus";

type BeautyPresentationGuideProps = Readonly<{
  onClose: () => void;
}>;

const GUIDE_STEPS = [
  {
    title: "Result is the entry point",
    description: "확인된 완성 룩 구간이 준비되면, 결과 화면이 과정 탐색의 시작점이 됩니다.",
  },
  {
    title: "Tap a region",
    description: "부위 데이터가 준비되면, 궁금한 얼굴 영역에서 연결된 과정 단계를 찾습니다.",
  },
  {
    title: "Watch the actual application",
    description: "수동 검증 타임스탬프가 입력되면 크리에이터의 실제 적용 장면으로 이동합니다.",
  },
  {
    title: "Reveal the exact product",
    description: "크리에이터 확인 제품이 연결되면, 과정을 본 뒤에만 제품과 사용법이 공개됩니다.",
  },
  {
    title: "View the complete routine",
    description: "적용 순서가 확인되면 전체 단계를 다시 보고 원하는 장면으로 이동할 수 있습니다.",
  },
  {
    title: "Purchase can later be attributed to the creator",
    description: "향후 구매 귀속이 연결될 수 있지만, 이 프로토타입은 실제 제휴 백엔드를 주장하지 않습니다.",
  },
] as const;

export function BeautyPresentationGuide({ onClose }: BeautyPresentationGuideProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { dialogRef, closeButtonRef } = useBeautyDialogFocus(onClose);
  const current = GUIDE_STEPS[activeIndex] ?? GUIDE_STEPS[0];
  const finalStep = activeIndex === GUIDE_STEPS.length - 1;

  return (
    <aside
      ref={dialogRef}
      aria-label="Beauty 데모 발표 가이드"
      className="absolute left-4 right-4 top-4 z-50 rounded-(--radius-card) border border-line bg-surface/95 px-4 pb-4 pt-3 shadow-beauty-frame beauty-sheet-enter"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-beauty-ink">PRESENTATION GUIDE</p>
          <p className="mt-1 text-xs font-medium text-ink-2">
            {activeIndex + 1} / {GUIDE_STEPS.length}
          </p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="발표 가이드 닫기"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beauty"
        >
          <XIcon size={15} />
        </button>
      </header>

      <div className="mt-3 flex gap-1" aria-hidden>
        {GUIDE_STEPS.map((step, index) => (
          <span
            key={step.title}
            className={`h-1 flex-1 rounded-full ${index <= activeIndex ? "bg-beauty" : "bg-line"}`}
          />
        ))}
      </div>

      <div className="mt-4 min-h-24" aria-live="polite">
        <p className="text-base font-semibold leading-snug text-ink">{current.title}</p>
        <p className="mt-2 break-keep text-sm leading-relaxed text-ink-2">{current.description}</p>
        {finalStep && (
          <p className="mt-3 border-l-2 border-beauty pl-3 text-sm font-semibold leading-relaxed text-ink">
            Fashion monetizes visible objects. Beauty monetizes the process behind the result.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="이전 발표 단계"
          disabled={activeIndex === 0}
          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
          className="flex h-11 items-center gap-1 rounded-(--radius-btn) px-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beauty"
        >
          <ChevronLeftIcon size={15} />
          이전
        </button>
        <span className="text-[10px] font-medium text-ink-2">P로 숨기기</span>
        <button
          type="button"
          aria-label={finalStep ? "발표 가이드 닫기" : "다음 발표 단계"}
          onClick={() => {
            if (finalStep) {
              onClose();
              return;
            }
            setActiveIndex((index) => Math.min(GUIDE_STEPS.length - 1, index + 1));
          }}
          className="flex h-11 items-center gap-1 rounded-(--radius-btn) bg-beauty px-4 text-sm font-semibold text-ink transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beauty"
        >
          {finalStep ? "닫기" : "다음"}
          {!finalStep && <ChevronRightIcon size={15} />}
        </button>
      </div>
    </aside>
  );
}
