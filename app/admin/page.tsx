"use client";

import Link from "next/link";
import { POSTS, PRODUCTS } from "@/lib/catalog";
import { isDemoMode } from "@/lib/config";
import { useApp, useCreatorLookup, useHydrated } from "@/lib/store";
import AdminCommerce from "@/components/AdminCommerce";
import { ChevronLeftIcon } from "@/components/Icons";

const EVENT_LABEL: Record<string, string> = {
  asset_view: "콘텐츠 조회",
  object_hint_view: "오브젝트 힌트",
  object_tap: "오브젝트 탭",
  card_open: "상품 카드",
  outbound_click: "구매처 이동",
  product_save: "상품 저장",
  post_save: "게시물 저장",
  post_like: "좋아요",
  publish: "발행",
};

/** Admin (lite) — 사업계획서 §17 Ops dashboard: 콘텐츠·AI 상태·이벤트 로그 */
export default function AdminPage() {
  const hydrated = useHydrated();
  const { userPosts, events, customProducts, remotePosts } = useApp();
  const lookupCreator = useCreatorLookup();
  const demo = isDemoMode();
  const allPosts = [
    ...remotePosts,
    ...(hydrated && demo ? userPosts : []),
    ...(demo ? POSTS : []),
  ];
  const recent = hydrated ? [...events].reverse().slice(0, 30) : [];

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-2 py-2.5 backdrop-blur-sm">
        <Link href="/profile" aria-label="뒤로" className="flex h-9 w-9 items-center justify-center text-ink">
          <ChevronLeftIcon size={22} />
        </Link>
        <p className="text-[15px] font-semibold">운영 대시보드</p>
      </header>

      <div className="grid grid-cols-3 gap-2.5 px-4 pt-4">
        <Card label="콘텐츠" value={allPosts.length} />
        <Card label="상품" value={PRODUCTS.length + (hydrated ? customProducts.length : 0)} />
        <Card label="이벤트" value={hydrated ? events.length : 0} />
      </div>

      <Section title="콘텐츠 / AI 처리 상태">
        <div className="overflow-hidden rounded-(--radius-card) border border-line bg-surface">
          {allPosts.map((p) => (
            <div key={p.id} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="" className="h-9 w-9 rounded-[6px] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">{p.caption}</p>
                <p className="text-[11px] text-ink-2">
                  @{lookupCreator(p.creatorId).handle} · 객체 {p.objects.length} · 연결{" "}
                  {p.objects.filter((o) => o.productId).length}
                </p>
              </div>
              <span className="rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">
                published
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="최근 이벤트 로그">
        {recent.length ? (
          <div className="overflow-hidden rounded-(--radius-card) border border-line bg-surface">
            {recent.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 border-b border-line px-3 py-2 text-[12px] last:border-b-0">
                <span className="font-medium">{EVENT_LABEL[ev.type] ?? ev.type}</span>
                <span className="truncate text-ink-2">
                  {ev.postId ?? ""} {ev.productId ? `· ${ev.productId}` : ""}
                </span>
                <span className="ml-auto shrink-0 text-[11px] text-ink-2">
                  {new Date(ev.ts).toLocaleTimeString("ko-KR", { hour12: false })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-(--radius-card) border border-line bg-surface px-3 py-6 text-center text-[12px] text-ink-2">
            아직 수집된 이벤트가 없어요. 피드에서 물건을 탭해보세요.
          </p>
        )}
      </Section>

      {/* 커머스 운영 — 클릭/전환/원장/반전/실패 postback (관리자 RLS) */}
      <AdminCommerce />
      <div className="h-8" />
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-(--radius-card) border border-line bg-surface p-3.5">
      <p className="text-[11px] text-ink-2">{label}</p>
      <p className="mt-0.5 text-[20px] font-bold">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-5">
      <p className="mb-2 text-[13px] font-semibold">{title}</p>
      {children}
    </div>
  );
}
