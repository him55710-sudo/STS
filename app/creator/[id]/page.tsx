"use client";

import Link from "next/link";
import { use, useState } from "react";
import { CREATORS, POSTS, productById } from "@/lib/catalog";
import { compact, won } from "@/lib/format";
import { useApp, useHydrated } from "@/lib/store";
import Avatar from "@/components/Avatar";
import { ChevronLeftIcon } from "@/components/Icons";

/** Creator Profile — PRD §54. Posts / Shop 탭, Shop은 콘텐츠에 쓰인 상품 자동 정리 */
export default function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<"posts" | "shop">("posts");
  const hydrated = useHydrated();
  const { following, toggleFollow, track } = useApp();
  const creator = CREATORS.find((c) => c.id === id);

  if (!creator) return <div className="px-4 py-16 text-center text-sm text-ink-2">크리에이터를 찾을 수 없어요.</div>;

  const posts = POSTS.filter((p) => p.creatorId === id);
  const shopProducts = [
    ...new Set(posts.flatMap((p) => p.objects.map((o) => o.productId)).filter((x) => x != null)),
  ].map((pid) => productById(pid)!);
  const follows = hydrated && following.includes(id);

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-2 py-2.5 backdrop-blur-sm">
        <Link href="/" aria-label="뒤로" className="flex h-9 w-9 items-center justify-center text-ink">
          <ChevronLeftIcon size={22} />
        </Link>
        <p className="text-[15px] font-semibold">@{creator.handle}</p>
      </header>

      <div className="flex items-center gap-4 px-4 pt-5">
        {/* 스토리 링 아바타 (인스타 스타일) */}
        <span className="story-ring shrink-0 rounded-full p-[2.5px]">
          <span className="block rounded-full bg-bg p-[2.5px]">
            <Avatar creator={creator} size={72} />
          </span>
        </span>
        <div className="flex flex-1 justify-around text-center">
          <Stat n={posts.length} label="게시물" />
          <Stat n={creator.followers} label="팔로워" compactNum />
          <Stat n={shopProducts.length} label="상품" />
        </div>
      </div>
      <div className="px-4 pt-3">
        <p className="flex items-center gap-1 text-[14px] font-semibold">
          {creator.name}
          {creator.verified && (
            <svg viewBox="0 0 20 20" className="h-[15px] w-[15px]" aria-label="인증됨">
              <circle cx="10" cy="10" r="9" fill="#5b556e" />
              <path d="m6 10.2 2.6 2.6L14 7.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </p>
        <p className="mt-0.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{creator.bio}</p>
        {creator.verified && (
          <span className="mt-2 inline-block rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
            수익 공유 크리에이터 · 제휴 판매 수수료 70% 배분
          </span>
        )}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => toggleFollow(id)}
            className={`press flex-1 rounded-(--radius-btn) py-2.5 text-[14px] font-bold transition-colors ${
              follows ? "bg-surface-2 text-ink-2" : "bg-primary text-white"
            }`}
          >
            {follows ? "팔로잉" : "팔로우"}
          </button>
          <button className="press flex-1 rounded-(--radius-btn) bg-surface-2 py-2.5 text-[14px] font-semibold text-ink">
            메시지
          </button>
        </div>
      </div>

      {/* 하이라이트 (인스타 스타일) */}
      {creator.avatarImage && (
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pt-5">
          {posts.slice(0, 4).map((p, i) => (
            <Link key={p.id} href={`/post/${p.id}`} className="flex w-[64px] shrink-0 flex-col items-center gap-1">
              <span className="rounded-full border border-line p-[2.5px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" className="h-[56px] w-[56px] rounded-full object-cover" />
              </span>
              <span className="text-[11px] text-ink-2">{["데일리", "클래식", "미니멀", "아웃도어"][i]}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 flex border-b border-line">
        {(
          [
            ["posts", "게시물"],
            ["shop", "Shop"],
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

      {tab === "posts" ? (
        <div className="grid grid-cols-3 gap-0.5 pt-0.5">
          {posts.map((p) => (
            <Link key={p.id} href={`/post/${p.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.caption} className="aspect-square w-full object-cover" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-3">
          {/* Featured Picks — SEEIT creator shop */}
          {shopProducts.length > 2 && (
            <>
              <p className="px-1 pb-2 text-[13px] font-bold">추천 픽</p>
              <div className="no-scrollbar mb-4 flex gap-2.5 overflow-x-auto">
                {shopProducts.slice(0, 4).map((p) => (
                  <button
                    key={`feat-${p.id}`}
                    onClick={() => {
                      track("outbound_click", { productId: p.id });
                      window.open(p.url, "_blank", "noopener,noreferrer");
                    }}
                    className="press w-[104px] shrink-0 text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt={p.name} className="h-[104px] w-[104px] rounded-(--radius-prod) border border-line object-cover" />
                    <p className="mt-1 truncate text-[11px] text-ink-2">{p.brand}</p>
                    <p className="truncate text-[12px] font-semibold">{won(p.price)}</p>
                  </button>
                ))}
              </div>
              <p className="px-1 pb-2 text-[13px] font-bold">룩으로 쇼핑</p>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
          {shopProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                track("outbound_click", { productId: p.id });
                window.open(p.url, "_blank", "noopener,noreferrer");
              }}
              className="overflow-hidden rounded-(--radius-card) border border-line bg-surface text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
              <div className="px-2.5 py-2">
                <p className="text-[11px] text-ink-2">{p.brand}</p>
                <p className="truncate text-[12px] font-medium">{p.name}</p>
                <p className="mt-0.5 text-[13px] font-semibold">{won(p.price)}</p>
              </div>
            </button>
          ))}
          {shopProducts.length === 0 && (
            <p className="col-span-2 py-12 text-center text-sm text-ink-2">아직 연결된 상품이 없어요.</p>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ n, label, compactNum }: { n: number; label: string; compactNum?: boolean }) {
  return (
    <div>
      <p className="text-[16px] font-bold">{compactNum ? compact(n) : n}</p>
      <p className="text-[12px] text-ink-2">{label}</p>
    </div>
  );
}
