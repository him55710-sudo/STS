"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { fetchRemoteFeed } from "./backend/posts";
import { fetchEngagement, fetchUserSignals, type EngagementRow } from "./backend/signals";
import { fetchSocialState, setFollow, setPostLike, setPostSave, setProductSave } from "./backend/social";
import {
  clearFeedback,
  recordInteraction,
  setFeedback,
  type FeedbackKind,
  type InteractionType,
} from "./backend/social-actions";
import { CREATORS, productById } from "./catalog";
import { isUuid } from "./config";
import { buildTasteProfile, EMPTY_PROFILE, type TasteProfile } from "./recommendation/taste-profile";
import type { Creator, EventType, Post, Product, SessionUser, TrackedEvent } from "./types";

/**
 * 상태 원칙 (Phase 1):
 *  - 서버(Supabase)가 영속 진실이다 — 게시물·소셜 상태는 uuid id로 서버에 산다.
 *  - localStorage에는 (1) 데모 모드의 로컬 데이터 (2) UI 편의 캐시만 남는다.
 *  - 토글은 낙관적으로 즉시 반영하고, 서버 쓰기 실패 시 되돌린다.
 *  - 시드 콘텐츠 id(post-look1 등)는 서버 개체가 아니므로 절대 서버로 쓰지 않는다.
 */

/** 실 로그인 세션 (Supabase auth → AuthProvider가 채움) */
export interface RemoteSession {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
}

interface AppState {
  // ── 로컬 영속 (데모 모드 데이터 + 시드 대상 소셜 상태) ──
  savedProducts: string[];
  savedPosts: string[];
  likedPosts: string[];
  following: string[];
  /** object-level event log — 이벤트 파이프라인 단계 전까지 로컬 수집 */
  events: TrackedEvent[];
  /** 데모 모드에서 로컬 발행된 게시물 (백엔드 발행분은 remotePosts) */
  userPosts: Post[];
  /** URL 직접 입력 등으로 만들어진 커스텀 상품 (백엔드 발행 시 스냅샷으로 동행) */
  customProducts: Product[];
  /** 데모 세션 — NEXT_PUBLIC_DEMO_MODE=true에서만 의미 있음. 실 세션은 session */
  user: SessionUser | null;

  // ── 서버 상태 (비영속 — 진실은 DB) ──
  session: RemoteSession | null;
  remotePosts: Post[];
  remoteCreators: Record<string, Creator>;
  remoteProducts: Product[];
  remoteLoaded: boolean;

  // ── 추천 (서버 신호 기반, 비영속) ──
  /** 숨김/관심없음 처리한 게시물 */
  hiddenPosts: string[];
  /** 이미 본 게시물 (novelty 감점용) */
  seenPosts: string[];
  tasteProfile: TasteProfile;
  engagement: Record<string, EngagementRow>;
  signalsLoaded: boolean;

  // actions
  signIn: (user: SessionUser) => void;
  signOut: () => void;
  setSession: (s: RemoteSession | null) => void;
  loadRemoteFeed: () => Promise<void>;
  hydrateSocial: (userId: string) => Promise<void>;
  loadSignals: () => Promise<void>;
  hidePost: (postId: string, kind: FeedbackKind) => Promise<void>;
  unhidePost: (postId: string) => Promise<void>;
  addCustomProduct: (p: Product) => void;
  toggleSaveProduct: (id: string) => void;
  toggleSavePost: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleFollow: (id: string) => void;
  track: (type: EventType, ref?: { postId?: string; productId?: string; objectId?: string }) => void;
  addUserPost: (post: Post) => void;
  removeUserPost: (id: string) => void;
}

let seq = 0;
const eid = () => `ev-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** 배열 토글 공통 — 반환값: 토글 후 포함 여부 */
const toggled = (arr: string[], id: string): [string[], boolean] =>
  arr.includes(id) ? [arr.filter((x) => x !== id), false] : [[...arr, id], true];

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /**
       * 낙관적 토글 + 서버 동기화.
       * 서버 개체(uuid)이고 로그인 상태면 서버에 쓰고, 실패 시 로컬을 되돌린다.
       * 시드/로컬 id는 로컬에만 남는다 (데모 데이터가 서버를 오염시키지 않도록).
       */
      const syncToggle = (
        key: "savedProducts" | "savedPosts" | "likedPosts" | "following",
        id: string,
        write: (userId: string, id: string, on: boolean) => Promise<void>,
        serverEligible: (id: string) => boolean
      ): boolean => {
        const [next, on] = toggled(get()[key], id);
        set({ [key]: next } as Partial<AppState>);
        const session = get().session;
        if (session && serverEligible(id)) {
          write(session.userId, id, on).catch((e) => {
            console.warn(`[social] ${key} sync failed, reverting: ${e.message}`);
            const [reverted] = toggled(get()[key], id);
            set({ [key]: reverted } as Partial<AppState>);
          });
        }
        return on;
      };

      return {
        savedProducts: [],
        savedPosts: [],
        likedPosts: [],
        following: [],
        events: [],
        userPosts: [],
        customProducts: [],
        user: null,

        session: null,
        remotePosts: [],
        remoteCreators: {},
        remoteProducts: [],
        remoteLoaded: false,

        hiddenPosts: [],
        seenPosts: [],
        tasteProfile: EMPTY_PROFILE,
        engagement: {},
        signalsLoaded: false,

        signIn: (user) => set({ user }),
        signOut: () => set({ user: null }),

        setSession: (session) => {
          set({ session });
          if (!session) {
            // 로그아웃: 서버 기반 소셜 상태(uuid)는 더 이상 이 브라우저의 것이 아니다
            set((s) => ({
              savedProducts: s.savedProducts, // 상품 저장은 id가 텍스트라 구분 불가 → 유지
              savedPosts: s.savedPosts.filter((id) => !isUuid(id)),
              likedPosts: s.likedPosts.filter((id) => !isUuid(id)),
              following: s.following.filter((id) => !isUuid(id)),
            }));
          }
        },

        loadRemoteFeed: async () => {
          const feed = await fetchRemoteFeed(get().session?.userId ?? null);
          if (feed) {
            set({
              remotePosts: feed.posts,
              remoteCreators: feed.creators,
              remoteProducts: feed.products,
              remoteLoaded: true,
            });
          } else {
            set({ remoteLoaded: true });
          }
        },

        /**
         * 취향 신호 로드 — 서버 권위 데이터로 프로필을 만든다.
         * 참여 지표는 로그인 여부와 무관하게 (공개 집계) 가져온다.
         */
        loadSignals: async () => {
          const engagementMap = await fetchEngagement();
          const engagement: Record<string, EngagementRow> = {};
          for (const [k, v] of engagementMap) engagement[k] = v;

          const session = get().session;
          if (!session) {
            set({ engagement, tasteProfile: EMPTY_PROFILE, signalsLoaded: true });
            return;
          }

          const postsById = new Map<string, Post>();
          for (const p of [...get().remotePosts, ...get().userPosts]) postsById.set(p.id, p);
          const { POSTS } = await import("./catalog");
          for (const p of POSTS) postsById.set(p.id, p);

          const bundle = await fetchUserSignals(session.userId, postsById);
          set({
            engagement,
            tasteProfile: buildTasteProfile(bundle.signals),
            hiddenPosts: [...bundle.hidden],
            seenPosts: [...bundle.seen],
            signalsLoaded: true,
          });
        },

        hidePost: async (postId, kind) => {
          // 낙관적 반영 — 사용자가 아니라고 했으면 즉시 사라져야 한다
          set((s) => ({ hiddenPosts: [...new Set([...s.hiddenPosts, postId])] }));
          const session = get().session;
          if (!session) return;
          try {
            await setFeedback(session.userId, postId, kind);
          } catch (e) {
            console.warn(`[social] hide failed, reverting: ${(e as Error).message}`);
            set((s) => ({ hiddenPosts: s.hiddenPosts.filter((id) => id !== postId) }));
          }
        },

        unhidePost: async (postId) => {
          set((s) => ({ hiddenPosts: s.hiddenPosts.filter((id) => id !== postId) }));
          const session = get().session;
          if (session) await clearFeedback(session.userId, postId).catch(() => {});
        },

        hydrateSocial: async (userId) => {
          const server = await fetchSocialState(userId);
          if (!server) return;
          // 서버 진실 + 로컬(시드 대상) 상태 병합 — uuid는 서버가 이긴다
          set((s) => ({
            likedPosts: [...s.likedPosts.filter((id) => !isUuid(id)), ...server.likedPosts],
            savedPosts: [...s.savedPosts.filter((id) => !isUuid(id)), ...server.savedPosts],
            following: [...s.following.filter((id) => !isUuid(id)), ...server.following],
            // 상품 저장은 서버가 진실 (product_id는 카탈로그 id도 저장 가능)
            savedProducts: [
              ...s.savedProducts.filter((id) => !server.savedProducts.includes(id)),
              ...server.savedProducts,
            ],
          }));
        },

        addCustomProduct: (p) => set((s) => ({ customProducts: [...s.customProducts, p] })),

        toggleSaveProduct: (id) => {
          // 상품 id는 텍스트(카탈로그·커스텀 모두) — 로그인 상태면 항상 서버에 기록
          const on = syncToggle("savedProducts", id, setProductSave, () => true);
          if (on) get().track("product_save", { productId: id });
        },
        toggleSavePost: (id) => {
          const on = syncToggle("savedPosts", id, setPostSave, isUuid);
          if (on) get().track("post_save", { postId: id });
        },
        toggleLike: (id) => {
          const on = syncToggle("likedPosts", id, setPostLike, isUuid);
          if (on) get().track("post_like", { postId: id });
        },
        toggleFollow: (id) => {
          syncToggle("following", id, setFollow, isUuid);
        },

        track: (type, ref) => {
          set((s) => ({
            // 로컬 이벤트는 데모 애널리틱스용 — 취향 프로필의 진실은 서버다
            events: [...s.events.slice(-499), { id: eid(), type, ts: Date.now(), ...ref }],
          }));
          // 서버 취향 신호 기록 (로그인 상태에서만, 실패해도 UX를 막지 않는다)
          const session = get().session;
          if (!session) return;
          const mapped: InteractionType | null =
            type === "asset_view"
              ? "asset_view"
              : type === "object_tap"
                ? "object_tap"
                : type === "card_open"
                  ? "card_open"
                  : type === "post_like"
                    ? "post_like"
                    : type === "post_save"
                      ? "post_save"
                      : null;
          if (!mapped) return;
          if (mapped === "asset_view" && ref?.postId) {
            set((s) => ({ seenPosts: [...new Set([...s.seenPosts, ref.postId!])] }));
          }
          void recordInteraction(session.userId, mapped, {
            postId: ref?.postId,
            objectId: ref?.objectId,
            productId: ref?.productId,
          });
        },

        addUserPost: (post) => {
          set((s) => ({ userPosts: [post, ...s.userPosts] }));
          get().track("publish", { postId: post.id });
        },
        removeUserPost: (id) =>
          set((s) => ({ userPosts: s.userPosts.filter((p) => p.id !== id) })),
      };
    },
    {
      name: "objet-store-v1",
      storage: createJSONStorage(() => localStorage),
      // 서버 상태는 절대 localStorage로 가지 않는다 — 진실은 DB
      partialize: (s) => ({
        savedProducts: s.savedProducts,
        savedPosts: s.savedPosts,
        likedPosts: s.likedPosts,
        following: s.following,
        events: s.events,
        userPosts: s.userPosts,
        customProducts: s.customProducts,
        user: s.user,
      }),
    }
  )
);

/** SSR-safe hydration guard */
import { useEffect, useState } from "react";
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/** 시드 카탈로그 + 커스텀 상품 + 서버 스냅샷 상품 통합 조회 */
export function useProductLookup() {
  const customProducts = useApp((s) => s.customProducts);
  const remoteProducts = useApp((s) => s.remoteProducts);
  return (id: string | null | undefined) =>
    productById(id) ??
    customProducts.find((p) => p.id === id) ??
    remoteProducts.find((p) => p.id === id);
}

const FALLBACK_CREATOR: Omit<Creator, "id"> = {
  handle: "creator",
  name: "크리에이터",
  bio: "",
  followers: 0,
  category: "fashion",
  tone: "#77727F",
};

/** 시드 크리에이터 + 서버 프로필 통합 조회 — 어떤 id에도 크래시하지 않는다 */
export function useCreatorLookup() {
  const remoteCreators = useApp((s) => s.remoteCreators);
  return (id: string): Creator =>
    remoteCreators[id] ?? CREATORS.find((c) => c.id === id) ?? { id, ...FALLBACK_CREATOR };
}
