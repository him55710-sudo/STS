"use client";

import Link from "next/link";
import { useState } from "react";
import { POSTS } from "@/lib/catalog";
import { productOutboundUrl } from "@/lib/commerce/outbound";
import { won } from "@/lib/format";
import { useApp, useHydrated, useProductLookup } from "@/lib/store";
import { ArrowUpRightIcon, BookmarkIcon } from "@/components/Icons";

/** Saved — 상품/게시물 탭 (PRD §10) */
export default function SavedPage() {
  const [tab, setTab] = useState<"products" | "posts">("products");
  const hydrated = useHydrated();
  const { savedProducts, savedPosts, toggleSaveProduct, track, userPosts, remotePosts } = useApp();
  const lookup = useProductLookup();

  const products = hydrated ? savedProducts.map(lookup).filter((p) => p != null) : [];
  const posts = hydrated
    ? savedPosts
        .map((id) => [...remotePosts, ...userPosts, ...POSTS].find((p) => p.id === id))
        .filter((p) => p != null)
    : [];

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
        <h1 className="px-4 pt-3.5 text-[19px] font-bold">저장됨</h1>
        <div className="mt-2 flex">
          {(
            [
              ["products", `상품 ${products.length}`],
              ["posts", `게시물 ${posts.length}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 border-b-[1.5px] pb-2.5 text-[14px] transition-colors ${
                tab === key ? "border-ink font-semibold text-ink" : "border-transparent text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === "products" ? (
        products.length ? (
          <ul className="divide-y divide-line">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3.5 bg-surface px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-[72px] w-[72px] rounded-(--radius-prod) border border-line object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-2">{p.brand}</p>
                  <p className="truncate text-[14px] font-medium">{p.name}</p>
                  <p className="mt-0.5 text-[15px] font-semibold">{won(p.price)}</p>
                </div>
                <button
                  onClick={() => {
                    track("outbound_click", { productId: p.id });
                    // 저장 목록 아웃바운드도 /go 경유 (saved 어트리뷰션)
                    window.open(
                      productOutboundUrl(p.id, p.url, { surface: "saved" }),
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                  aria-label="구매하러 가기"
                  className="flex h-9 w-9 items-center justify-center rounded-(--radius-btn) bg-ink text-surface"
                >
                  <ArrowUpRightIcon size={16} />
                </button>
                <button
                  onClick={() => toggleSaveProduct(p.id)}
                  aria-label="저장 해제"
                  className="flex h-9 w-9 items-center justify-center rounded-(--radius-btn) border border-line text-ink"
                >
                  <BookmarkIcon size={16} filled />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="콘텐츠 속 물건을 탭하고 저장해보세요." />
        )
      ) : posts.length ? (
        <div className="grid grid-cols-3 gap-0.5 pt-0.5">
          {posts.map((p) => (
            <Link key={p.id} href={`/post/${p.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.caption} className="aspect-square w-full object-cover" />
            </Link>
          ))}
        </div>
      ) : (
        <Empty text="저장한 게시물이 여기에 모여요." />
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-20 text-center">
      <BookmarkIcon size={28} className="text-line" strokeWidth={1.25} />
      <p className="text-sm text-ink-2">{text}</p>
      <Link href="/" className="mt-2 rounded-(--radius-btn) bg-ink px-4 py-2 text-[13px] font-semibold text-surface">
        피드 둘러보기
      </Link>
    </div>
  );
}
