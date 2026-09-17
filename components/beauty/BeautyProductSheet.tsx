"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRightIcon, XIcon } from "@/components/Icons";
import { Check, ShoppingBag, Sparkles } from "lucide-react";
import { useBeautyDialogFocus } from "@/hooks/useBeautyDialogFocus";
import type { BeautyApplicationStep, BeautyProduct } from "@/lib/beauty/types";

type BeautyProductSheetProps = Readonly<{
  step: BeautyApplicationStep;
  product: BeautyProduct | null;
  similarProducts: readonly BeautyProduct[];
  onClose: () => void;
  onViewRoutine: () => void;
  onCheckoutProduct?: (amount: number, count: number, title: string) => void;
}>;

const PRICE_FORMATTER = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

function readable(value: string): string {
  return value.trim() || "정보 확인 필요";
}

function ProductImage({ product, size }: Readonly<{ product: BeautyProduct; size: number }>) {
  if (!product.image) {
    return (
      <div
        role="img"
        aria-label={`${readable(product.name)} 제품 이미지 없음`}
        className="flex shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-center text-[11px] font-medium text-ink-2"
        style={{ width: size, height: size }}
      >
        이미지 없음
      </div>
    );
  }

  return (
    <Image
      src={product.image}
      alt={`${readable(product.brand)} ${readable(product.name)}`}
      width={size}
      height={size}
      sizes={`${size}px`}
      className="shrink-0 rounded-2xl bg-surface-2 object-cover border border-line"
    />
  );
}

export function BeautyProductSheet({
  step,
  product,
  similarProducts,
  onClose,
  onViewRoutine,
  onCheckoutProduct,
}: BeautyProductSheetProps) {
  const { dialogRef, closeButtonRef } = useBeautyDialogFocus(onClose);
  const [selectedProduct, setSelectedProduct] = useState<BeautyProduct | null>(product);

  const activeProd = selectedProduct ?? product;
  const productPrice = activeProd?.price ?? 13900;
  const productUrl = activeProd?.url?.trim() || "https://romand.co.kr";

  const handleInstantBuy = () => {
    if (onCheckoutProduct && activeProd) {
      onCheckoutProduct(
        productPrice,
        1,
        `${activeProd.brand} ${activeProd.name} (${activeProd.shade})`,
      );
    }
  };

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="제품 정보 닫기"
        onClick={onClose}
        className="absolute inset-0 z-40 bg-black/40 backdrop-blur-xs"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="선택한 메이크업 단계의 제품 정보"
        className="absolute inset-x-0 bottom-0 z-50 max-h-[82%] overflow-y-auto overscroll-contain rounded-t-3xl border border-b-0 border-line bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 shadow-2xl beauty-sheet-enter text-ink"
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line" />
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="제품 정보 닫기"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-beauty"
        >
          <XIcon size={17} />
        </button>

        <header className="border-b border-line pb-4 pr-12">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-beauty/15 px-2.5 py-0.5 text-[10px] font-bold text-beauty-ink">
              USED IN THIS STEP
            </span>
            <span className="text-[11px] font-semibold text-ink-2">
              STEP {step.order === null ? "—" : String(step.order).padStart(2, "0")} · {step.region.toUpperCase()}
            </span>
          </div>
          <h2 className="mt-2 text-base font-bold text-ink leading-snug">
            {activeProd ? activeProd.name : readable(step.label)}
          </h2>
          <p className="mt-0.5 text-xs text-ink-2">
            {activeProd ? `${activeProd.brand} · ${activeProd.shade}` : "브랜드 및 쉐이드 정보"}
          </p>
        </header>

        {/* Product Spec Card */}
        {activeProd && (
          <div className="mt-4 flex items-center gap-3.5 rounded-2xl bg-surface-2 p-3.5 border border-line">
            <ProductImage product={activeProd} size={72} />
            <div className="min-w-0 flex-1">
              <span className="inline-block rounded bg-beauty/10 px-2 py-0.5 text-[10px] font-bold text-beauty-ink">
                EXACT MATCH (정확히 일치)
              </span>
              <p className="mt-1 text-sm font-bold text-ink">{activeProd.name}</p>
              <p className="text-xs text-ink-2">{activeProd.shade}</p>
              <p className="mt-1 text-base font-black text-beauty-ink">
                {PRICE_FORMATTER.format(productPrice)}
              </p>
            </div>
          </div>
        )}

        {/* How it was used (PDF 13p 4번) */}
        <section aria-label="메이크업 과정 상세" className="border-b border-line py-4">
          <p className="text-[11px] font-bold tracking-[0.12em] text-ink-2">HOW IT WAS USED (사용법 & 팁)</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-surface-2 p-2.5">
              <dt className="text-[11px] font-medium text-ink-2">사용량</dt>
              <dd className="mt-1 font-bold text-ink">{readable(step.amount)}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-2.5">
              <dt className="text-[11px] font-medium text-ink-2">레이어링</dt>
              <dd className="mt-1 font-bold text-ink">{step.layerCount ?? 1}회 도포</dd>
            </div>
            <div className="col-span-2 rounded-xl bg-surface-2 p-2.5">
              <dt className="text-[11px] font-medium text-ink-2">적용 방법 및 영역</dt>
              <dd className="mt-1 font-semibold text-ink leading-relaxed">
                {readable(step.method)} ({readable(step.applicationArea)})
              </dd>
            </div>
          </dl>
        </section>

        {/* PDF 13p 7번: SIMILAR SHADES (비슷한 컬러 추천) */}
        <section aria-label="비슷한 컬러" className="border-b border-line py-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-2">SIMILAR SHADES (유사 컬러 추천)</p>
            <span className="text-[11px] font-semibold text-beauty-ink">발색 칩 비교</span>
          </div>

          {similarProducts.length > 0 ? (
            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {similarProducts.map((similar) => {
                const isSelected = activeProd?.id === similar.id;
                return (
                  <button
                    key={similar.id}
                    type="button"
                    onClick={() => setSelectedProduct(similar)}
                    className={`w-[96px] shrink-0 rounded-2xl p-2 text-left border transition-all ${
                      isSelected
                        ? "border-beauty bg-beauty-soft ring-1 ring-beauty"
                        : "border-line bg-surface-2 hover:bg-surface-3"
                    }`}
                  >
                    <div className="relative">
                      <ProductImage product={similar} size={80} />
                      {isSelected && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-beauty text-white">
                          <Check size={12} />
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-[11px] font-bold text-ink">{similar.shade}</p>
                    <p className="text-[10px] text-ink-2">{similar.price?.toLocaleString()}원</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink-2">등록된 추천 컬러가 없습니다.</p>
          )}
        </section>

        {/* Purchase Action Buttons */}
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleInstantBuy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-beauty text-[15px] font-bold text-white shadow-lg shadow-beauty/25 transition-all hover:bg-beauty/95 active:scale-[0.98]"
          >
            <ShoppingBag size={18} />
            단품 즉시 구매 ({PRICE_FORMATTER.format(productPrice)})
          </button>

          <div className="flex gap-2">
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-surface-2 transition-all"
            >
              공식 판매처 방문
              <ArrowUpRightIcon size={14} />
            </a>
            <button
              type="button"
              onClick={onViewRoutine}
              className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-line bg-surface-2 text-xs font-bold text-beauty-ink hover:bg-surface-3 transition-all"
            >
              <Sparkles size={14} />
              전체 루틴 세트 보기
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
