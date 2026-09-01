"use client";

import type {
  BeautyApplicationStep,
  BeautyProduct,
  BeautyRegion,
} from "@/lib/beauty/types";

const REGION_LABELS = {
  skin: "SKIN",
  base: "BASE",
  eye: "EYE",
  cheek: "CHEEK",
  lip: "LIP",
} as const satisfies Readonly<Record<BeautyRegion, string>>;

export type BeautyStepCardProps = {
  readonly step: BeautyApplicationStep;
  readonly product: BeautyProduct | null;
  readonly watched: boolean;
  readonly onReplay: () => void;
  readonly onViewProduct: (() => void) | null;
};

export function BeautyStepCard({
  step,
  product,
  watched,
  onReplay,
  onViewProduct,
}: BeautyStepCardProps) {
  if (!watched) return null;

  const productReady = product !== null && onViewProduct !== null;

  return (
    <section
      className="beauty-sheet-enter absolute inset-x-0 bottom-0 z-50 rounded-t-(--radius-sheet) border-t border-line bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 text-ink shadow-beauty-sheet"
      aria-label="선택한 메이크업 단계 정보"
      aria-live="polite"
    >
      <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" aria-hidden="true" />
      <p className="text-[10px] font-semibold tracking-[0.12em] text-beauty-ink">
        STEP {step.order ?? "—"} · {REGION_LABELS[step.region]}
      </p>
      <div className="mt-2 border-b border-line pb-3">
        <p className="text-[11px] font-semibold text-ink-2">
          {product?.brand ?? "제품 정보 확인 필요"}
        </p>
        <h2 className="mt-0.5 text-[17px] font-bold leading-snug">
          {product?.name ?? "실제 사용 제품 정보 확인 필요"}
        </h2>
        <p className="mt-1 text-[12px] text-ink-2">
          {product?.shade ?? "쉐이드 정보 확인 필요"}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-card) bg-line">
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-[10px] font-semibold text-ink-2">사용량</dt>
          <dd className="mt-1 text-[12px] font-semibold leading-snug">{step.amount}</dd>
        </div>
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-[10px] font-semibold text-ink-2">도구 · 방법</dt>
          <dd className="mt-1 text-[12px] font-semibold leading-snug">{step.method}</dd>
        </div>
        <div className="col-span-2 bg-surface px-3 py-2.5">
          <dt className="text-[10px] font-semibold text-ink-2">적용 부위</dt>
          <dd className="mt-1 text-[12px] font-semibold leading-snug">
            {step.applicationArea}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onReplay}
          aria-label={`${step.label} 과정 다시 보기`}
          className="press min-h-11 rounded-(--radius-btn) border border-line bg-surface text-[13px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-beauty"
        >
          과정 다시 보기
        </button>
        <button
          type="button"
          disabled={!productReady}
          onClick={() => {
            if (onViewProduct !== null) onViewProduct();
          }}
          aria-label={`${step.label} 제품 보기`}
          className="press min-h-11 rounded-(--radius-btn) bg-beauty text-[13px] font-bold text-ink focus-visible:outline-2 focus-visible:outline-beauty focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-2"
        >
          제품 보기
        </button>
      </div>
      {!productReady && (
        <p className="mt-2 text-center text-[10px] leading-relaxed text-ink-2">
          확인된 제품 정보가 없어 제품 보기는 비활성화되어 있습니다.
        </p>
      )}
    </section>
  );
}
