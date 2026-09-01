"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRightIcon, XIcon } from "@/components/Icons";
import { useBeautyDialogFocus } from "@/hooks/useBeautyDialogFocus";
import type { BeautyApplicationStep, BeautyProduct } from "@/lib/beauty/types";

type BeautyRoutineSheetProps = Readonly<{
  steps: readonly BeautyApplicationStep[];
  products: readonly BeautyProduct[];
  selectedStepId: string | null;
  onSelectStep: (step: BeautyApplicationStep) => void;
  onClose: () => void;
}>;

type RoutineView = "steps" | "products";

function readable(value: string): string {
  return value.trim() || "정보 확인 필요";
}

function timestamp(seconds: number | null): string {
  if (seconds === null) return "시간 정보 확인 필요";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function productForStep(
  products: readonly BeautyProduct[],
  step: BeautyApplicationStep,
): BeautyProduct | null {
  return products.find((candidate) => candidate.id === step.productId) ?? null;
}

function ordered(steps: readonly BeautyApplicationStep[]): readonly BeautyApplicationStep[] {
  return steps
    .map((step, index) => ({ step, index }))
    .sort((left, right) => {
      if (left.step.order === null && right.step.order === null) return left.index - right.index;
      if (left.step.order === null) return 1;
      if (right.step.order === null) return -1;
      return left.step.order - right.step.order || left.index - right.index;
    })
    .map(({ step }) => step);
}

function RoutineProductImage({ product }: Readonly<{ product: BeautyProduct | null }>) {
  if (!product?.image) {
    return (
      <div
        role="img"
        aria-label="제품 이미지 없음"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-(--radius-prod) bg-surface-2 text-center text-[10px] font-medium text-ink-2"
      >
        이미지 없음
      </div>
    );
  }

  return (
    <Image
      src={product.image}
      alt={`${readable(product.brand)} ${readable(product.name)}`}
      width={56}
      height={56}
      sizes="56px"
      className="h-14 w-14 shrink-0 rounded-(--radius-prod) bg-surface-2 object-cover"
    />
  );
}

export function BeautyRoutineSheet({
  steps,
  products,
  selectedStepId,
  onSelectStep,
  onClose,
}: BeautyRoutineSheetProps) {
  const [view, setView] = useState<RoutineView>("steps");
  const { dialogRef, closeButtonRef } = useBeautyDialogFocus(onClose);
  const orderedSteps = ordered(steps);
  const sequenceDataReady =
    orderedSteps.length > 0 &&
    orderedSteps.every(
      (step) =>
        !step.id.endsWith("-pending") &&
        step.order !== null &&
        step.startTime !== null &&
        step.endTime !== null,
    );
  const productDataReady =
    orderedSteps.length > 0 &&
    orderedSteps.every((step) => {
      const product = productForStep(products, step);
      return product !== null && !product.id.endsWith("-pending");
    });

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="전체 루틴 닫기"
        onClick={onClose}
        className="absolute inset-0 z-40 bg-ink/15"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="메이크업 전체 루틴"
        className="absolute inset-x-0 bottom-0 z-50 flex max-h-[76%] flex-col rounded-t-(--radius-sheet) border border-b-0 border-line bg-surface pb-[max(20px,env(safe-area-inset-bottom))] shadow-beauty-sheet beauty-sheet-enter"
      >
        <div className="mx-auto mb-2 mt-2 h-1 w-9 shrink-0 rounded-full bg-line" />
        <header className="shrink-0 border-b border-line px-5 pb-4 pr-14">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-beauty-ink">COMPLETE ROUTINE</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            {view === "steps" ? "전체 루틴" : "루틴 제품"}
          </h2>
          <p className="mt-1 break-keep text-xs leading-relaxed text-ink-2">
            {view === "steps"
              ? sequenceDataReady
                ? "수동으로 확인된 적용 순서와 영상 구간입니다."
                : "적용 순서와 영상 구간 데이터 확인을 기다리고 있습니다."
              : productDataReady
                ? "각 단계에 연결된 실제 사용 제품만 모았습니다."
                : "크리에이터 확인 제품 데이터 입력을 기다리고 있습니다."}
          </p>
        </header>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="전체 루틴 닫기"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beauty"
        >
          <XIcon size={17} />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
          {orderedSteps.length === 0 ? (
            <p className="rounded-(--radius-card) bg-surface-2 px-4 py-5 text-sm text-ink-2">
              확인된 루틴 단계가 없습니다.
            </p>
          ) : view === "steps" ? (
            <ol className="space-y-2">
              {orderedSteps.map((step) => {
                const candidateProduct = productForStep(products, step);
                const product = candidateProduct?.id.endsWith("-pending") ? null : candidateProduct;
                const selected = step.id === selectedStepId;
                const stepNumber = step.order === null ? "—" : String(step.order).padStart(2, "0");
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      aria-label={`STEP ${stepNumber}, ${step.region}, ${readable(step.label)}, ${timestamp(step.startTime)}부터 보기`}
                      aria-current={selected ? "step" : undefined}
                      onClick={() => onSelectStep(step)}
                      className={`flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-3 text-left transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beauty ${
                        selected ? "bg-beauty-soft" : "bg-surface-2"
                      }`}
                    >
                      <span className={`w-8 shrink-0 text-center text-xs font-semibold ${selected ? "text-beauty-ink" : "text-ink-2"}`}>
                        {stepNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-ink-2">
                          <span>{step.region.toUpperCase()}</span>
                          <span aria-hidden>·</span>
                          <span>{timestamp(step.startTime)}</span>
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold text-ink">{readable(step.label)}</span>
                        <span className="mt-1 block truncate text-xs text-ink-2">
                          {product ? `${readable(product.brand)} · ${readable(product.name)}` : "제품 정보 확인 필요"}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-ink-2">
                          {readable(step.amount)} · {readable(step.method)}
                        </span>
                      </span>
                      <ChevronRightIcon size={16} className={selected ? "text-beauty-ink" : "text-ink-2"} />
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <ol className="space-y-2" aria-label="루틴 실제 사용 제품 목록">
              {orderedSteps.map((step) => {
                const candidateProduct = productForStep(products, step);
                const product = candidateProduct?.id.endsWith("-pending") ? null : candidateProduct;
                const stepNumber = step.order === null ? "—" : String(step.order).padStart(2, "0");
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      aria-label={`STEP ${stepNumber} 실제 사용 제품, ${product ? readable(product.name) : "제품 정보 확인 필요"}`}
                      onClick={() => onSelectStep(step)}
                      className="flex w-full items-center gap-3 rounded-(--radius-card) bg-surface-2 px-3 py-3 text-left transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beauty"
                    >
                      <RoutineProductImage product={product} />
                      <span className="min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-beauty-ink">
                          {product ? "실제 사용 제품" : "제품 데이터 확인 대기"} · STEP {stepNumber}
                        </span>
                        <span className="mt-1 block truncate text-xs font-medium text-ink-2">
                          {product ? readable(product.brand) : "브랜드 정보 확인 필요"}
                        </span>
                        <span className="block truncate text-sm font-semibold text-ink">
                          {product ? readable(product.name) : "제품 정보 확인 필요"}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-2">
                          {product ? readable(product.shade) : "컬러 정보 확인 필요"}
                        </span>
                      </span>
                      <ChevronRightIcon size={16} className="text-ink-2" />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {orderedSteps.length > 0 && (
          <div className="shrink-0 border-t border-line px-5 pt-3">
            <button
              type="button"
              onClick={() => setView(view === "steps" ? "products" : "steps")}
              className="flex h-12 w-full items-center justify-center rounded-(--radius-btn) bg-beauty text-[15px] font-semibold text-ink transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beauty"
            >
              {view === "steps" ? "Shop the routine" : "과정 순서 보기"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
