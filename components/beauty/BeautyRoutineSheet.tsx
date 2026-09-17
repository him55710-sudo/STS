"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRightIcon, XIcon } from "@/components/Icons";
import { ShoppingBag, Sparkles } from "lucide-react";
import { useBeautyDialogFocus } from "@/hooks/useBeautyDialogFocus";
import type { BeautyApplicationStep, BeautyProduct } from "@/lib/beauty/types";

type BeautyRoutineSheetProps = Readonly<{
  steps: readonly BeautyApplicationStep[];
  products: readonly BeautyProduct[];
  selectedStepId: string | null;
  onSelectStep: (step: BeautyApplicationStep) => void;
  onClose: () => void;
  onCheckoutBundle?: (amount: number, count: number, title: string) => void;
}>;

type RoutineView = "steps" | "products";

function readable(value: string): string {
  return value.trim() || "정보 확인 필요";
}

function timestamp(seconds: number | null): string {
  if (seconds === null) return "00:00";
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
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-center text-[10px] font-medium text-ink-2"
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
      className="h-14 w-14 shrink-0 rounded-xl bg-surface-2 object-cover"
    />
  );
}

export function BeautyRoutineSheet({
  steps,
  products,
  selectedStepId,
  onSelectStep,
  onClose,
  onCheckoutBundle,
}: BeautyRoutineSheetProps) {
  const [view, setView] = useState<RoutineView>("products");
  const { dialogRef, closeButtonRef } = useBeautyDialogFocus(onClose);
  const orderedSteps = ordered(steps);

  const totalRawPrice = orderedSteps.reduce((sum, step) => {
    const prod = productForStep(products, step);
    return sum + (prod?.price ?? 0);
  }, 0);

  const bundleDiscountRate = 0.1; // 10% 번들 특별 할인
  const bundleDiscountedPrice = Math.round(totalRawPrice * (1 - bundleDiscountRate));

  const handleBundleCheckout = () => {
    if (onCheckoutBundle) {
      onCheckoutBundle(
        bundleDiscountedPrice,
        orderedSteps.length,
        "동남아 K-뷰티 글래스 룩 올인원 루틴 세트",
      );
    }
  };

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="루틴 구조 닫기"
        onClick={onClose}
        className="absolute inset-0 z-40 bg-black/40 backdrop-blur-xs"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="선택한 룩의 메이크업 루틴 구조"
        className="absolute inset-x-0 bottom-0 z-50 flex max-h-[85%] flex-col rounded-t-3xl border border-b-0 border-line bg-surface pb-[max(16px,env(safe-area-inset-bottom))] pt-2 shadow-2xl beauty-sheet-enter text-ink"
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line" />
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="루틴 구조 닫기"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-beauty"
        >
          <XIcon size={17} />
        </button>

        <header className="border-b border-line px-5 pb-3 pr-14">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-beauty/15 px-2.5 py-0.5 text-[10px] font-bold text-beauty-ink">
              STS BEAUTY · PROCESS COMMERCE
            </span>
            <span className="text-[11px] font-medium text-ink-2">
              전체 {orderedSteps.length}개 단계
            </span>
          </div>
          <h2 className="mt-1 text-base font-bold text-ink tracking-tight">
            동남아 K-뷰티 글래스 스킨 & 너티 립 루틴
          </h2>
          <p className="mt-0.5 text-xs text-ink-2">
            완성된 룩에 사용된 정품 제품과 단계별 사용 팁을 한눈에 확인하세요.
          </p>

          {/* View Mode Toggle */}
          <div className="mt-3 flex rounded-xl bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => setView("products")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                view === "products"
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              사용 제품 모아보기 ({orderedSteps.length})
            </button>
            <button
              type="button"
              onClick={() => setView("steps")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                view === "steps"
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              단계별 타임라인
            </button>
          </div>
        </header>

        {/* Product or Steps List */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
          {view === "products" ? (
            <ol className="space-y-2.5" aria-label="루틴 실제 사용 제품 목록">
              {orderedSteps.map((step) => {
                const candidateProduct = productForStep(products, step);
                const stepNumber = step.order === null ? "—" : String(step.order).padStart(2, "0");
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => onSelectStep(step)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left transition-all hover:bg-surface-3 active:scale-[0.99]"
                    >
                      <RoutineProductImage product={candidateProduct} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-beauty/10 px-1.5 py-0.5 text-[10px] font-bold text-beauty-ink">
                            STEP {stepNumber} · {step.region.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-semibold text-ink">
                          {candidateProduct ? candidateProduct.name : "제품 정보 확인 필요"}
                        </p>
                        <p className="truncate text-[11px] text-ink-2">
                          {candidateProduct?.brand} · {candidateProduct?.shade}
                        </p>
                        <p className="mt-1 text-xs font-bold text-beauty-ink">
                          {candidateProduct?.price ? `${candidateProduct.price.toLocaleString()}원` : "가격 정보"}
                        </p>
                      </div>
                      <ChevronRightIcon size={16} className="text-ink-2" />
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <ol className="space-y-2.5" aria-label="루틴 단계별 순서">
              {orderedSteps.map((step) => {
                const candidateProduct = productForStep(products, step);
                const selected = step.id === selectedStepId;
                const stepNumber = step.order === null ? "—" : String(step.order).padStart(2, "0");
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => onSelectStep(step)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.99] ${
                        selected ? "border border-beauty bg-beauty-soft" : "bg-surface-2 hover:bg-surface-3"
                      }`}
                    >
                      <span className={`w-8 shrink-0 text-center text-xs font-bold ${selected ? "text-beauty-ink" : "text-ink-2"}`}>
                        {stepNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-ink-2">
                          <span className="font-bold text-beauty-ink">{step.region.toUpperCase()}</span>
                          <span>·</span>
                          <span>{timestamp(step.startTime)}</span>
                        </div>
                        <p className="mt-0.5 text-xs font-bold text-ink truncate">{step.label}</p>
                        <p className="text-[11px] text-ink-2 truncate">
                          {candidateProduct?.brand} · {candidateProduct?.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-3">
                          사용량: {step.amount} | {step.method}
                        </p>
                      </div>
                      <ChevronRightIcon size={16} className={selected ? "text-beauty-ink" : "text-ink-2"} />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* PDF 13p 6번: "이 루틴을 한 번에 담기 (번들 결제)" */}
        <footer className="shrink-0 border-t border-line px-5 pt-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-ink-2">루틴 5종 세트 정가</span>
            <span className="text-ink-2 line-through">{totalRawPrice.toLocaleString()}원</span>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-beauty-ink animate-pulse" />
              <span className="text-xs font-bold text-ink">루틴 번들 10% 특별가</span>
            </div>
            <span className="text-lg font-black text-beauty-ink">
              {bundleDiscountedPrice.toLocaleString()}원
            </span>
          </div>

          <button
            type="button"
            onClick={handleBundleCheckout}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-beauty text-[15px] font-bold text-white shadow-lg shadow-beauty/25 transition-all hover:bg-beauty/95 active:scale-[0.98]"
          >
            <ShoppingBag size={18} />
            이 루틴을 한 번에 담고 결제하기
          </button>
        </footer>
      </section>
    </>
  );
}
