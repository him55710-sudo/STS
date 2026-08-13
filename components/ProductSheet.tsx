"use client";

import { useEffect } from "react";
import { buildProductSheetModel } from "@/lib/commerce/sheet-model";
import type { RankedOffer } from "@/lib/commerce/offer-resolver";
import { won } from "@/lib/format";
import { useApp, useProductLookup } from "@/lib/store";
import type { ObjectTag, Product } from "@/lib/types";
import { ArrowUpRightIcon, BookmarkIcon, SearchIcon, XIcon } from "./Icons";

/**
 * Product Bottom Sheet — PRD §13 + Phase 2 commerce graph.
 *
 * 구조: 착용 상품(exact canonical) → Buy CTA(best offer) → 다른 판매처 → 비슷한 스타일.
 * "무슨 상품인가"(canonical)와 "어디서 살까"(offers)가 분리되어 있고,
 * exact 상품 영역과 similar 스타일 영역은 절대 섞이지 않는다.
 */
export default function ProductSheet({
  postId,
  object,
  onClose,
}: {
  postId: string;
  object: ObjectTag;
  onClose: () => void;
}) {
  const lookup = useProductLookup();
  const model = buildProductSheetModel(object, lookup);
  const track = useApp((s) => s.track);
  const savedProducts = useApp((s) => s.savedProducts);
  const toggleSaveProduct = useApp((s) => s.toggleSaveProduct);

  const productId = object.productId;
  useEffect(() => {
    if (model) track("card_open", { postId, productId: productId ?? undefined, objectId: object.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.id]);

  const openUrl = (url: string, pid: string) => {
    track("outbound_click", { postId, productId: pid, objectId: object.id });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* 콘텐츠가 계속 보이도록 아주 옅은 backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2">
        <div className="sheet-enter max-h-[76dvh] overflow-y-auto rounded-t-(--radius-sheet) border border-b-0 border-line bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_rgba(21,23,25,0.10)]">
          {/* drag handle */}
          <div className="sticky top-0 z-10 -mx-5 bg-surface px-5 pb-1 pt-1">
            <div className="mx-auto h-1 w-9 rounded-full bg-line" />
          </div>

          <button
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-2"
          >
            <XIcon size={16} />
          </button>

          {model?.kind === "canonical" ? (
            <CanonicalSheet
              model={model}
              saved={savedProducts.includes(model.canonical.id)}
              onSave={() => toggleSaveProduct(model.canonical.id)}
              onOpen={(url) => openUrl(url, model.canonical.id)}
              onOpenSimilar={(p) => openUrl(p.url, p.id)}
            />
          ) : model?.kind === "legacy" ? (
            <LegacySheet
              model={model}
              saved={savedProducts.includes(model.product.id)}
              onSave={() => toggleSaveProduct(model.product.id)}
              onOpen={() => openUrl(model.product.url, model.product.id)}
              onOpenSimilar={(p) => openUrl(p.url, p.id)}
            />
          ) : (
            /* Unlinked Object — 상품 미연결 (PRD §58) */
            <div className="pb-1 pt-2">
              <p className="text-xs font-medium text-ink-2">아직 연결된 상품이 없어요</p>
              <h3 className="mt-1 text-[17px] font-semibold">{object.label}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                크리에이터가 상품을 연결하면 바로 여기서 살 수 있어요. 지금은 비슷한 상품을 찾아볼까요?
              </p>
              <button
                onClick={onClose}
                className="mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-(--radius-btn) bg-surface-2 text-[15px] font-semibold text-ink"
              >
                <SearchIcon size={17} />
                비슷한 상품 찾기
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── canonical product + offers ───────────────────────────────────────────────

function CanonicalSheet({
  model,
  saved,
  onSave,
  onOpen,
  onOpenSimilar,
}: {
  model: Extract<ReturnType<typeof buildProductSheetModel>, { kind: "canonical" }>;
  saved: boolean;
  onSave: () => void;
  onOpen: (url: string) => void;
  onOpenSimilar: (p: Product) => void;
}) {
  const { canonical, bestOffer, otherOffers, unavailableOffers, exactness } = model;
  const offerUrl = (r: RankedOffer) => r.offer.affiliateUrl ?? r.offer.productUrl;

  return (
    <>
      {/* 1. 착용 상품 — exact canonical product */}
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={canonical.primaryImage}
          alt={canonical.modelName}
          className="h-[92px] w-[92px] shrink-0 rounded-(--radius-prod) border border-line object-cover"
        />
        <div className="min-w-0 pt-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-ink-2">{canonical.brand}</p>
            <ExactBadge exactness={exactness} />
          </div>
          <h3 className="mt-0.5 truncate text-[17px] font-semibold leading-snug">
            {canonical.modelName}
          </h3>
          {bestOffer ? (
            <>
              <p className="mt-1 text-[17px] font-semibold tracking-tight">
                {won(bestOffer.offer.price)}
              </p>
              <p className="mt-0.5 text-xs text-ink-2">
                {bestOffer.merchant.name}
                {bestOffer.offer.shippingLabel && ` · ${bestOffer.offer.shippingLabel}`}
                {(bestOffer.offer.commissionRate ?? 0) > 0 && (
                  <span className="ml-1.5 rounded-[5px] bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    제휴 {Math.round((bestOffer.offer.commissionRate ?? 0) * 100)}%
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="mt-1 text-[13px] text-ink-2">지금은 구매 가능한 판매처가 없어요</p>
          )}
          {canonical.color && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-2">
              색상
              <span
                className="h-4 w-4 rounded-full border border-line"
                style={{ background: canonical.color }}
              />
            </p>
          )}
        </div>
      </div>

      {/* 2. Primary CTA — best offer */}
      <div className="mt-4 flex flex-col gap-2">
        {bestOffer && (
          <button
            onClick={() => onOpen(offerUrl(bestOffer))}
            className="press flex h-12 items-center justify-center gap-1.5 rounded-(--radius-btn) bg-primary text-[15px] font-bold text-white"
          >
            {bestOffer.merchant.name}에서 구매하기
            <ArrowUpRightIcon size={17} strokeWidth={2} />
          </button>
        )}
        <button
          onClick={onSave}
          className={`press flex h-11 items-center justify-center gap-1.5 rounded-(--radius-btn) border text-[14px] font-semibold transition-colors ${
            saved ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink"
          }`}
        >
          <BookmarkIcon size={16} filled={saved} />
          {saved ? "위시리스트에 저장됨" : "위시리스트에 저장"}
        </button>
      </div>

      {/* 3. 다른 판매처 — 같은 상품의 나머지 오퍼만 (similar와 절대 혼합 금지) */}
      {(otherOffers.length > 0 || unavailableOffers.length > 0) && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-ink-2">다른 판매처</p>
          <div className="overflow-hidden rounded-(--radius-card) border border-line">
            {otherOffers.map((r) => (
              <button
                key={r.offer.id}
                onClick={() => onOpen(offerUrl(r))}
                className="flex w-full items-center gap-2.5 border-b border-line bg-surface px-3 py-2.5 text-left last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[13px] font-medium">
                    {r.merchant.name}
                    {r.offer.stockStatus === "low_stock" && (
                      <span className="rounded-[4px] bg-[#fdf3e7] px-1 py-px text-[9.5px] font-semibold text-[#b3752e]">
                        품절 임박
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-ink-2">
                    {r.offer.shippingLabel ?? "배송비 판매처 기준"}
                    {(r.offer.commissionRate ?? 0) > 0 && " · 제휴"}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold">{won(r.offer.price)}</span>
                <ArrowUpRightIcon size={14} className="shrink-0 text-ink-2" />
              </button>
            ))}
            {unavailableOffers.map((r) => (
              <div
                key={r.offer.id}
                className="flex w-full items-center gap-2.5 border-b border-line bg-surface px-3 py-2.5 opacity-50 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">{r.merchant.name}</p>
                  <p className="text-[11px] text-ink-2">품절</p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold line-through">
                  {won(r.offer.price)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 비슷한 스타일 — similar 상품 전용 영역 (exact 오퍼와 절대 혼합 금지) */}
      {model.similarStyles.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-ink-2">비슷한 스타일</p>
          <SimilarRow products={model.similarStyles} onOpen={onOpenSimilar} />
        </div>
      )}

      <SheetFooter exactness={exactness} affiliate={(bestOffer?.offer.commissionRate ?? 0) > 0} />
    </>
  );
}

// ── legacy/커스텀 상품 폴백 (오퍼 그래프 밖 상품 — URL 직접 연결 등) ─────────

function LegacySheet({
  model,
  saved,
  onSave,
  onOpen,
  onOpenSimilar,
}: {
  model: Extract<ReturnType<typeof buildProductSheetModel>, { kind: "legacy" }>;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  onOpenSimilar: (p: Product) => void;
}) {
  const { product, exactness } = model;
  return (
    <>
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="h-[92px] w-[92px] shrink-0 rounded-(--radius-prod) border border-line object-cover"
        />
        <div className="min-w-0 pt-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-ink-2">{product.brand}</p>
            <ExactBadge exactness={exactness} />
          </div>
          <h3 className="mt-0.5 truncate text-[17px] font-semibold leading-snug">{product.name}</h3>
          {product.price > 0 && (
            <p className="mt-1 text-[17px] font-semibold tracking-tight">{won(product.price)}</p>
          )}
          <p className="mt-0.5 text-xs text-ink-2">{product.retailer}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={onOpen}
          className="press flex h-12 items-center justify-center gap-1.5 rounded-(--radius-btn) bg-primary text-[15px] font-bold text-white"
        >
          구매하러 가기
          <ArrowUpRightIcon size={17} strokeWidth={2} />
        </button>
        <button
          onClick={onSave}
          className={`press flex h-11 items-center justify-center gap-1.5 rounded-(--radius-btn) border text-[14px] font-semibold transition-colors ${
            saved ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink"
          }`}
        >
          <BookmarkIcon size={16} filled={saved} />
          {saved ? "위시리스트에 저장됨" : "위시리스트에 저장"}
        </button>
      </div>

      {model.similarStyles.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-ink-2">비슷한 스타일</p>
          <SimilarRow products={model.similarStyles} onOpen={onOpenSimilar} />
        </div>
      )}

      <SheetFooter exactness={exactness} affiliate={product.affiliate} />
    </>
  );
}

// ── 공용 조각 ────────────────────────────────────────────────────────────────

function SimilarRow({ products, onOpen }: { products: Product[]; onOpen: (p: Product) => void }) {
  return (
    <div className="no-scrollbar flex gap-2.5 overflow-x-auto">
      {products.map((sp) => (
        <button key={sp.id} onClick={() => onOpen(sp)} className="w-[76px] shrink-0 text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sp.image}
            alt={sp.name}
            className="h-[76px] w-[76px] rounded-(--radius-prod) border border-line object-cover"
          />
          <p className="mt-1 truncate text-[11px] text-ink-2">{sp.brand}</p>
          <p className="truncate text-xs font-medium">{won(sp.price)}</p>
        </button>
      ))}
    </div>
  );
}

function SheetFooter({ exactness, affiliate }: { exactness: "exact" | "similar"; affiliate: boolean }) {
  return (
    <p className="mt-3 text-center text-[10.5px] leading-relaxed text-ink-2">
      {exactness === "similar" && "크리에이터가 확인한 유사 상품이에요. "}
      {affiliate
        ? "제휴 파트너 상품 — 구매 시 수수료의 70%가 크리에이터에게 돌아가요."
        : "가격·재고는 판매처 기준이에요. 상품 페이지로 바로 연결됩니다."}
    </p>
  );
}

export function ExactBadge({ exactness }: { exactness: "exact" | "similar" }) {
  return exactness === "exact" ? (
    <span className="rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink">
      동일 상품
    </span>
  ) : (
    <span className="rounded-[5px] border border-line px-1.5 py-0.5 text-[10px] font-medium text-ink-2">
      유사 상품
    </span>
  );
}
