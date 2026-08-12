"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORY_LABEL, CREATORS, POSTS, PRODUCTS, creatorById } from "@/lib/catalog";
import { useApp, useHydrated } from "@/lib/store";
import { compact } from "@/lib/format";
import { BagIcon, EyeIcon, HeartIcon, SearchIcon } from "@/components/Icons";
import type { Category } from "@/lib/types";

const CATS: (Category | "all")[] = ["all", "fashion", "beauty", "interior", "tech", "lifestyle"];
const TRENDING = ["Quiet Luxury", "스트리트웨어", "미니멀", "데스크셋업", "빈티지"];

/** Explore by Style — SEEIT Discover */
const STYLES = [
  { name: "미니멀", desc: "군더더기 없는 라인", q: "미니멀" },
  { name: "클래식", desc: "10년을 입는 옷", q: "클래식" },
  { name: "Quiet Luxury", desc: "절제된 고급감", q: "Quiet Luxury" },
  { name: "시티보이", desc: "일상 속 아웃도어", q: "아웃도어" },
  { name: "스트리트", desc: "데일리 스트리트 핏", q: "후디" },
];

/** Discover — PRD §53. 이미지 그리드 중심, Pinterest식 마소너리 + 에이블리식 카테고리 칩 */
export default function DiscoverPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const hydrated = useHydrated();
  const userPosts = useApp((s) => s.userPosts);

  const results = useMemo(() => {
    const all = [...(hydrated ? userPosts : []), ...POSTS];
    const needle = q.trim().toLowerCase();
    return all.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!needle) return true;
      const creator = CREATORS.find((c) => c.id === p.creatorId);
      const products = p.objects
        .map((o) => PRODUCTS.find((pr) => pr.id === o.productId))
        .filter(Boolean);
      const hay = [
        p.caption,
        creator?.handle,
        creator?.name,
        ...p.objects.map((o) => o.label),
        ...products.map((pr) => `${pr!.brand} ${pr!.name}`),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [q, cat, hydrated, userPosts]);

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 px-4 pb-3 pt-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-(--radius-btn) bg-surface-2 px-3">
          <SearchIcon size={17} className="shrink-0 text-ink-2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="상품, 크리에이터, 스타일 검색"
            className="h-10 w-full bg-transparent text-[14px] outline-none placeholder:text-ink-2"
          />
        </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-(--radius-btn) px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                cat === c ? "bg-ink text-surface" : "bg-surface text-ink-2 border border-line"
              }`}
            >
              {c === "all" ? "전체" : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </header>

      {!q && cat === "all" && (
        <>
          <div className="px-4 pt-4">
            <p className="text-[14px] font-bold">스타일로 탐색</p>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-2.5">
            {STYLES.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setQ(s.q)}
                className="press card-in w-[128px] shrink-0 rounded-(--radius-card) border border-line bg-surface px-3.5 py-3 text-left"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <p className="text-[13px] font-bold">{s.name}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-2">{s.desc}</p>
              </button>
            ))}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
            {TRENDING.map((t) => (
              <button
                key={t}
                onClick={() => setQ(t === "데스크셋업" ? "데스크" : t === "스트리트웨어" ? "후디" : t)}
                className="shrink-0 text-[12px] text-ink-2 underline-offset-2 hover:underline"
              >
                #{t}
              </button>
            ))}
          </div>
          <p className="px-4 pt-4 text-[14px] font-bold">지금 뜨는 콘텐츠</p>
        </>
      )}

      <div className="masonry px-2 pt-3">
        {results.map((post) => {
          const creator = creatorById(post.creatorId);
          const linked = post.objects.filter((o) => o.productId).length;
          return (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="block overflow-hidden rounded-(--radius-card) border border-line bg-surface"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image}
                  alt={post.caption}
                  className="w-full"
                  style={{ aspectRatio: `${post.ratio}` }}
                  loading="lazy"
                />
                {linked > 0 && (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-ink backdrop-blur-sm">
                    <BagIcon size={11} />
                    {linked}
                  </span>
                )}
                {/* 조회·좋아요 오버레이 — SEEIT trending */}
                <span className="rail-shadow absolute bottom-1.5 left-2 flex items-center gap-2 text-[10.5px] font-semibold text-white">
                  <span className="flex items-center gap-0.5">
                    <EyeIcon size={12} strokeWidth={2} /> {compact(post.likes * 13)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <HeartIcon size={11} strokeWidth={2} /> {compact(post.likes)}
                  </span>
                </span>
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-[12px] leading-snug">{post.caption}</p>
                <p className="mt-0.5 text-[11px] text-ink-2">@{creator.handle}</p>
              </div>
            </Link>
          );
        })}
      </div>
      {results.length === 0 && (
        <p className="px-4 py-16 text-center text-sm text-ink-2">검색 결과가 없어요.</p>
      )}
    </div>
  );
}
