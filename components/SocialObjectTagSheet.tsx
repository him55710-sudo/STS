"use client";

import { productById } from "@/lib/catalog";
import { won } from "@/lib/format";
import type { MediaObjectTag } from "@/lib/types";
import { BagIcon, XIcon } from "./Icons";

type SocialObjectTagSheetProps = {
  readonly surfaceId: string;
  readonly object: MediaObjectTag;
  readonly disclosure: string;
  readonly attribution: string;
  readonly rights: string;
  readonly onClose: () => void;
};

export default function SocialObjectTagSheet({
  surfaceId,
  object,
  disclosure,
  attribution,
  rights,
  onClose,
}: SocialObjectTagSheetProps) {
  const product = object.productId ? productById(object.productId) : null;

  return (
    <>
      <div className="fixed inset-0 z-[80]" onClick={onClose} aria-hidden />
      <aside className="fixed bottom-0 left-1/2 z-[90] w-full max-w-[430px] -translate-x-1/2 rounded-t-(--radius-sheet) border border-b-0 border-line bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 text-ink shadow-[0_-8px_32px_rgba(21,23,25,0.16)]">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" />
        <button type="button" onClick={onClose} aria-label="태그 시트 닫기" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-2">
          <XIcon size={16} />
        </button>
        <p className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-2">
          <BagIcon size={13} />
          {object.exactness}
        </p>
        <h3 className="mt-3 pr-10 text-[18px] font-bold leading-snug">{object.label}</h3>
        {product ? (
          <div className="mt-3 flex gap-3">
            <img src={product.image} alt={product.name} className="h-20 w-20 rounded-(--radius-prod) border border-line object-cover" />
            <div className="min-w-0 pt-1">
              <p className="truncate text-[12px] font-semibold text-ink-2">{product.brand}</p>
              <p className="mt-0.5 line-clamp-2 text-[14px] font-bold">{product.name}</p>
              <p className="mt-1 text-[14px] font-bold">{won(product.price)}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
            이 태그는 repository 미디어의 객체 메타데이터입니다. 검증된 canonical offer가 없어서 구매 CTA를 표시하지 않아요.
          </p>
        )}
        <dl className="mt-4 grid gap-2 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-2">
          <div>
            <dt className="font-bold text-ink">Disclosure</dt>
            <dd>{disclosure}</dd>
          </div>
          <div>
            <dt className="font-bold text-ink">Attribution</dt>
            <dd className="break-words">{attribution}</dd>
          </div>
          <div>
            <dt className="font-bold text-ink">Media rights</dt>
            <dd>{rights}</dd>
          </div>
          <div>
            <dt className="font-bold text-ink">Surface</dt>
            <dd>{surfaceId}</dd>
          </div>
        </dl>
      </aside>
    </>
  );
}
