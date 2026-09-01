"use client";

import Image from "next/image";
import { ArrowUpRightIcon, XIcon } from "@/components/Icons";
import { useBeautyDialogFocus } from "@/hooks/useBeautyDialogFocus";
import type { BeautyApplicationStep, BeautyProduct } from "@/lib/beauty/types";

type BeautyProductSheetProps = Readonly<{
  step: BeautyApplicationStep;
  product: BeautyProduct | null;
  similarProducts: readonly BeautyProduct[];
  onClose: () => void;
  onViewRoutine: () => void;
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
        className="flex shrink-0 items-center justify-center rounded-(--radius-prod) bg-surface-2 text-center text-[11px] font-medium text-ink-2"
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
      className="shrink-0 rounded-(--radius-prod) bg-surface-2 object-cover"
    />
  );
}

export function BeautyProductSheet({
  step,
  product,
  similarProducts,
  onClose,
  onViewRoutine,
}: BeautyProductSheetProps) {
  const { dialogRef, closeButtonRef } = useBeautyDialogFocus(onClose);
  const productDataReady = product !== null && !product.id.endsWith("-pending");
  const resolvedProduct = productDataReady ? product : null;
  const productUrl = resolvedProduct?.url?.trim() || null;
  const resolvedSimilarProducts = similarProducts.filter(
    (similar) =>
      !similar.id.endsWith("-pending") && similar.id !== resolvedProduct?.id,
  );

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="제품 정보 닫기"
        onClick={onClose}
        className="absolute inset-0 z-40 bg-ink/15"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="선택한 메이크업 단계의 제품 정보"
        className="absolute inset-x-0 bottom-0 z-50 max-h-[78%] overflow-y-auto overscroll-contain rounded-t-(--radius-sheet) border border-b-0 border-line bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 shadow-beauty-sheet beauty-sheet-enter"
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line" />
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="제품 정보 닫기"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beauty"
        >
          <XIcon size={17} />
        </button>

        <header className="border-b border-line pb-4 pr-12">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-beauty-ink">
            {productDataReady ? "USED IN THIS STEP" : "PRODUCT DATA"}
          </p>
          <p className="mt-1 text-xs text-ink-2">
            STEP {step.order === null ? "—" : String(step.order).padStart(2, "0")} · {step.region.toUpperCase()}
          </p>
        </header>

        <section aria-label="단계 제품 데이터" className="border-b border-line py-4">
          <p className="mb-3 text-xs font-semibold text-ink">
            {productDataReady ? "실제 사용 제품" : "제품 데이터 확인 대기"}
          </p>
          {resolvedProduct ? (
            <div className="flex gap-4">
              <ProductImage product={resolvedProduct} size={88} />
              <div className="min-w-0 self-center">
                <p className="text-xs font-medium text-ink-2">{readable(resolvedProduct.brand)}</p>
                <h2 className="mt-1 text-[17px] font-semibold leading-snug text-ink">{readable(resolvedProduct.name)}</h2>
                <p className="mt-1 text-sm text-ink-2">{readable(resolvedProduct.shade)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-(--radius-card) bg-surface-2 px-4 py-5 text-sm text-ink-2">
              크리에이터 확인 제품이 아직 입력되지 않았습니다.
            </div>
          )}
        </section>

        <section aria-label="이 단계의 사용 방법" className="border-b border-line py-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-2">HOW IT WAS USED</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-ink-2">사용량</dt>
              <dd className="mt-1 font-medium text-ink">{readable(step.amount)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">방법</dt>
              <dd className="mt-1 font-medium text-ink">{readable(step.method)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-ink-2">적용 부위</dt>
              <dd className="mt-1 font-medium text-ink">{readable(step.applicationArea)}</dd>
            </div>
            {step.layerCount !== null && (
              <div className="col-span-2">
                <dt className="text-xs text-ink-2">레이어</dt>
                <dd className="mt-1 font-medium text-ink">{step.layerCount}회</dd>
              </div>
            )}
          </dl>
        </section>

        <section aria-label="제품 구매 정보" className="border-b border-line py-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-2">VIEW PRODUCT</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-[17px] font-semibold text-ink">
                {resolvedProduct?.price === null || resolvedProduct?.price === undefined
                  ? "가격 정보 확인 필요"
                  : PRICE_FORMATTER.format(resolvedProduct.price)}
              </p>
              <p className="mt-1 text-xs text-ink-2">
                {resolvedProduct?.retailer ? readable(resolvedProduct.retailer) : "판매처 정보 확인 필요"}
              </p>
            </div>
          </div>
          {productUrl ? (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${readable(resolvedProduct?.name ?? "제품")} 외부 판매처에서 보기`}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-(--radius-btn) bg-beauty text-[15px] font-semibold text-ink transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beauty"
            >
              제품 보기
              <ArrowUpRightIcon size={16} />
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-label="외부 제품 링크 없음"
              className="mt-3 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-(--radius-btn) bg-surface-2 text-[15px] font-semibold text-ink-2"
            >
              데모용 제품 정보
            </button>
          )}
        </section>

        <section aria-label="비슷한 컬러" className="py-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-2">SIMILAR SHADES</p>
            <span className="text-xs font-semibold text-beauty-ink">비슷한 컬러</span>
          </div>
          {resolvedSimilarProducts.length > 0 ? (
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
              {resolvedSimilarProducts.map((similar) => (
                <article key={similar.id} className="w-[88px] shrink-0">
                  <ProductImage product={similar} size={88} />
                  <p className="mt-2 truncate text-[11px] font-medium text-ink-2">{readable(similar.brand)}</p>
                  <p className="truncate text-xs font-semibold text-ink">{readable(similar.shade)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-(--radius-card) bg-surface-2 px-4 py-3 text-sm text-ink-2">
              확인된 비슷한 컬러가 없습니다.
            </p>
          )}
        </section>

        <button
          type="button"
          onClick={onViewRoutine}
          className="flex h-11 w-full items-center justify-center rounded-(--radius-btn) border border-line bg-surface text-sm font-semibold text-ink transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beauty"
        >
          전체 루틴 보기
        </button>
      </section>
    </>
  );
}
