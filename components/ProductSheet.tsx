"use client";

import { useEffect } from "react";
import { productById } from "@/lib/catalog";
import { won } from "@/lib/format";
import { isMarketplaceDetailUrl } from "@/lib/marketplace-links";
import { useApp, useProductLookup } from "@/lib/store";
import { buildTrackedOutboundPath } from "@/lib/affiliate/outbound-url";
import type { ObjectTag, Product } from "@/lib/types";
import { ArrowUpRightIcon, BookmarkIcon, SearchIcon, XIcon } from "./Icons";

/**
 * Product Bottom Sheet — PRD §13
 * 시청을 끊지 않는 쇼핑 (Principle 5). 화면 하단 30~38%, CTA는 하나만 강하게.
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
  const product = lookup(object.productId);
  const track = useApp((s) => s.track);
  const savedProducts = useApp((s) => s.savedProducts);
  const toggleSaveProduct = useApp((s) => s.toggleSaveProduct);

  useEffect(() => {
    if (product) track("card_open", { postId, productId: product.id, objectId: object.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.id]);

  const openOutbound = (p: Product) => {
    track("outbound_click", { postId, productId: p.id, objectId: object.id });
    const outboundUrl = p.id.startsWith("custom-")
      ? p.url
      : buildTrackedOutboundPath(p.id, { postId, objectId: object.id });
    window.open(outboundUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* 콘텐츠가 계속 보이도록 아주 옅은 backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2">
        <div className="sheet-enter rounded-t-(--radius-sheet) border border-b-0 border-line bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_rgba(21,23,25,0.10)]">
          {/* drag handle */}
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" />

          <button
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-2"
          >
            <XIcon size={16} />
          </button>

          {product ? (
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
                    <ExactBadge exactness={object.exactness} />
                  </div>
                  <h3 className="mt-0.5 truncate text-[17px] font-semibold leading-snug">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-[17px] font-semibold tracking-tight">{won(product.price)}</p>
                  <p className="mt-0.5 text-xs text-ink-2">
                    {product.retailer}
                    {product.affiliate && (
                      <span className="ml-1.5 rounded-[5px] bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        제휴 {product.commissionRate ? `${Math.round(product.commissionRate * 100)}%` : ""}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* 비슷한 상품 */}
              {product.similarIds.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-ink-2">비슷한 상품</p>
                  <div className="no-scrollbar flex gap-2.5 overflow-x-auto">
                    {product.similarIds.map((sid) => {
                      const sp = productById(sid);
                      if (!sp) return null;
                      return (
                        <button
                          key={sid}
                          onClick={() => openOutbound(sp)}
                          className="w-[76px] shrink-0 text-left"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sp.image}
                            alt={sp.name}
                            className="h-[76px] w-[76px] rounded-(--radius-prod) border border-line object-cover"
                          />
                          <p className="mt-1 truncate text-[11px] text-ink-2">{sp.brand}</p>
                          <p className="truncate text-xs font-medium">{won(sp.price)}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CTA — 버튼 하나만 강하게 (PRD §13) */}
              {/* 색상 스와치 (데모) — SEEIT bottom sheet */}
              <div className="mt-3.5 flex items-center gap-2">
                <p className="text-xs text-ink-2">색상</p>
                {["#111214", "#b9afa3", "#efefed"].map((c, i) => (
                  <span
                    key={c}
                    className={`h-5 w-5 rounded-full border ${
                      i === 0 ? "border-ink ring-1 ring-ink ring-offset-1" : "border-line"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>

              <div className="mt-3.5 flex flex-col gap-2">
                <button
                  onClick={() => openOutbound(product)}
                  className="press flex h-12 items-center justify-center gap-1.5 rounded-(--radius-btn) bg-primary text-[15px] font-bold text-white"
                >
                  {isMarketplaceDetailUrl(product.url) ? "구매하러 가기" : "판매처 후보 확인"}
                  <ArrowUpRightIcon size={17} strokeWidth={2} />
                </button>
                <button
                  onClick={() => toggleSaveProduct(product.id)}
                  className={`press flex h-11 items-center justify-center gap-1.5 rounded-(--radius-btn) border text-[14px] font-semibold transition-colors ${
                    savedProducts.includes(product.id)
                      ? "border-ink bg-ink text-surface"
                      : "border-line bg-surface text-ink"
                  }`}
                >
                  <BookmarkIcon size={16} filled={savedProducts.includes(product.id)} />
                  {savedProducts.includes(product.id) ? "위시리스트에 저장됨" : "위시리스트에 저장"}
                </button>
              </div>
              <p className="mt-2 text-center text-[10.5px] leading-relaxed text-ink-2">
                {object.exactness === "similar" && "크리에이터가 확인한 유사 상품이에요. "}
                {product.affiliate
                  ? `제휴 파트너 상품 — 구매 시 수수료의 70%가 크리에이터에게 돌아가요.`
                  : "가격·재고는 판매처 기준이에요. 상품 페이지로 바로 연결됩니다."}
              </p>
            </>
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
