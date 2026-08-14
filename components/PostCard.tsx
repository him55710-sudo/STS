"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sharePost } from "@/lib/backend/social-actions";
import type { SourceSurface } from "@/lib/commerce/click";
import { compact, timeAgo } from "@/lib/format";
import { useApp, useCreatorLookup } from "@/lib/store";
import type { ObjectTag, Post } from "@/lib/types";
import Avatar from "./Avatar";
import { BagIcon, BookmarkIcon, HeartIcon, MoreIcon, ShareIcon } from "./Icons";
import ObjectLayer from "./ObjectLayer";
import ProductSheet from "./ProductSheet";

export default function PostCard({
  post,
  surface = "feed",
}: {
  post: Post;
  surface?: SourceSurface;
}) {
  const creator = useCreatorLookup()(post.creatorId);
  const [selected, setSelected] = useState<ObjectTag | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const { likedPosts, savedPosts, following, toggleLike, toggleSavePost, toggleFollow, track } =
    useApp();
  const session = useApp((s) => s.session);
  const hidePost = useApp((s) => s.hidePost);
  const engagement = useApp((s) => s.engagement);
  const liked = likedPosts.includes(post.id);
  const saved = savedPosts.includes(post.id);
  const follows = following.includes(post.creatorId);
  const shareCount = engagement[post.id]?.share_count ?? 0;

  /** 공유 — navigator.share 우선, 없으면 링크 복사. 취소는 기록하지 않는다 */
  const onShare = async () => {
    const result = await sharePost(post.id, post.caption, surface, session?.userId ?? null);
    if (result.shared) track("post_share", { postId: post.id });
    if (result.notice) {
      setShareNotice(result.notice);
      setTimeout(() => setShareNotice(null), 2000);
    }
  };

  // asset_view — 카드가 50% 이상 보였을 때 1회 기록
  const viewRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!viewedRef.current && entries.some((e) => e.intersectionRatio >= 0.5)) {
          viewedRef.current = true;
          track("asset_view", { postId: post.id });
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const linkedCount = post.objects.filter((o) => o.productId).length;

  return (
    <article ref={viewRef} className="border-b border-line bg-surface pb-3">
      {/* creator row */}
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <Link href={`/creator/${creator.id}`} className="flex items-center gap-2.5">
          <Avatar creator={creator} size={34} />
          <div className="leading-tight">
            <p className="text-[13px] font-semibold">{creator.handle}</p>
            <p className="text-[11px] text-ink-2">{timeAgo(post.createdAt)}</p>
          </div>
        </Link>
        {!post.isUserPost && (
          <button
            onClick={() => toggleFollow(post.creatorId)}
            className={`ml-auto rounded-(--radius-btn) px-3 py-1.5 text-xs font-semibold transition-colors ${
              follows ? "bg-surface-2 text-ink-2" : "bg-ink text-surface"
            }`}
          >
            {follows ? "팔로잉" : "팔로우"}
          </button>
        )}
      </div>

      {/* content — 객체 자체가 인터페이스 + 우측 액션 레일 (SEEIT) */}
      <div className="relative">
        <ObjectLayer
          postId={post.id}
          objects={post.objects}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image}
            alt={post.caption}
            className="w-full object-cover"
            style={{ aspectRatio: `${post.ratio}` }}
            loading="lazy"
          />
        </ObjectLayer>

        <div className="pointer-events-none absolute bottom-3 right-2.5 flex flex-col items-center gap-3.5 text-white">
          <button
            onClick={() => toggleLike(post.id)}
            aria-label="좋아요"
            className="press rail-shadow pointer-events-auto flex flex-col items-center gap-0.5"
          >
            <span key={liked ? "on" : "off"} className={liked ? "heart-pop block text-[#f04452]" : "block"}>
              <HeartIcon size={26} filled={liked} strokeWidth={1.75} />
            </span>
            <span className="text-[11px] font-semibold">{compact(post.likes + (liked ? 1 : 0))}</span>
          </button>
          <button
            onClick={() => toggleSavePost(post.id)}
            aria-label="게시물 저장"
            className="press rail-shadow pointer-events-auto"
          >
            <BookmarkIcon size={24} filled={saved} strokeWidth={1.75} />
          </button>
          <button
            onClick={onShare}
            aria-label="공유"
            className="press rail-shadow pointer-events-auto flex flex-col items-center gap-0.5"
          >
            <ShareIcon size={23} strokeWidth={1.75} />
            {shareCount > 0 && <span className="text-[11px] font-semibold">{compact(shareCount)}</span>}
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="더보기"
            className="press rail-shadow pointer-events-auto"
          >
            <MoreIcon size={22} strokeWidth={1.75} />
          </button>
        </div>

        {/* 관심 없음 / 숨기기 — 부정 신호가 있어야 추천이 학습한다 */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute bottom-14 right-2.5 z-50 w-44 overflow-hidden rounded-(--radius-card) border border-line bg-surface shadow-lg">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  void hidePost(post.id, "not_interested");
                }}
                className="block w-full px-3.5 py-2.5 text-left text-[13px] hover:bg-surface-2"
              >
                관심 없음
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  void hidePost(post.id, "hide");
                }}
                className="block w-full border-t border-line px-3.5 py-2.5 text-left text-[13px] hover:bg-surface-2"
              >
                이 게시물 숨기기
              </button>
            </div>
          </>
        )}
      </div>

      {shareNotice && (
        <p className="px-4 pt-2 text-[12px] font-medium text-primary">{shareNotice}</p>
      )}

      <p className="px-4 pt-2.5 text-[14px] leading-relaxed">
        <Link href={`/creator/${creator.id}`} className="mr-1.5 font-semibold">
          {creator.handle}
        </Link>
        {post.caption}
      </p>

      {/* 상품 chip — 탭하면 객체 힌트 유도 */}
      {linkedCount > 0 && (
        <p className="mt-1.5 flex items-center gap-1 px-4 text-xs text-ink-2">
          <BagIcon size={13} />
          이 콘텐츠에는 상품 {linkedCount}개가 있어요 · 화면 속 물건을 탭해보세요
        </p>
      )}

      {selected && (
        <ProductSheet
          postId={post.id}
          creatorId={post.creatorId}
          surface={surface}
          object={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </article>
  );
}
