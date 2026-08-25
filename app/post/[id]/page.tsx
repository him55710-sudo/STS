"use client";

import Link from "next/link";
import { use } from "react";
import { POSTS, creatorById } from "@/lib/catalog";
import { useApp, useHydrated } from "@/lib/store";
import PostCard from "@/components/PostCard";
import { ChevronLeftIcon } from "@/components/Icons";

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const hydrated = useHydrated();
  const userPosts = useApp((s) => s.userPosts);
  const post = [...(hydrated ? userPosts : []), ...POSTS].find((p) => p.id === id);

  if (!post) {
    return (
      <div className="px-4 py-16 text-center text-sm text-ink-2">
        {hydrated ? "게시물을 찾을 수 없어요." : "불러오는 중..."}
      </div>
    );
  }

  const related = POSTS.filter((p) => p.id !== post.id && p.category === post.category).slice(0, 4);

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-2 py-2.5 backdrop-blur-sm">
        <Link href="/discover" aria-label="뒤로" className="flex h-9 w-9 items-center justify-center text-ink">
          <ChevronLeftIcon size={22} />
        </Link>
        <p className="text-[15px] font-semibold">게시물</p>
      </header>

      <PostCard post={post} />

      {related.length > 0 && (
        <div className="px-4 pb-6 pt-5">
          <p className="mb-2.5 text-[13px] font-semibold text-ink-2">비슷한 콘텐츠</p>
          <div className="grid grid-cols-2 gap-2">
            {related.map((p) => (
              <Link key={p.id} href={`/post/${p.id}`} className="overflow-hidden rounded-(--radius-card) border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.caption} className="w-full" style={{ aspectRatio: `${p.ratio}` }} loading="lazy" />
                <p className="truncate bg-surface px-2 py-1.5 text-[11px] text-ink-2">
                  @{creatorById(p.creatorId).handle}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
