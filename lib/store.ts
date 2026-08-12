"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { productById } from "./catalog";
import type { EventType, Post, Product, SessionUser, TrackedEvent } from "./types";

interface AppState {
  savedProducts: string[];
  savedPosts: string[];
  likedPosts: string[];
  following: string[];
  /** object-level event log — 사업계획서 §10 taxonomy */
  events: TrackedEvent[];
  /** 크리에이터가 이 세션에서 발행한 게시물 */
  userPosts: Post[];
  /** URL 직접 입력 등으로 만들어진 커스텀 상품 (PRD §58 방법 2·3) */
  customProducts: Product[];
  /** 데모 로그인 세션 (실 OAuth는 클라이언트 키 등록 후 NextAuth로 대체) */
  user: SessionUser | null;

  signIn: (user: SessionUser) => void;
  signOut: () => void;
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

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      savedProducts: [],
      savedPosts: [],
      likedPosts: [],
      following: ["c-seoul", "c-daily"],
      events: [],
      userPosts: [],
      customProducts: [],
      user: null,

      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
      addCustomProduct: (p) => set((s) => ({ customProducts: [...s.customProducts, p] })),
      toggleSaveProduct: (id) => {
        const has = get().savedProducts.includes(id);
        set((s) => ({
          savedProducts: has ? s.savedProducts.filter((x) => x !== id) : [...s.savedProducts, id],
        }));
        if (!has) get().track("product_save", { productId: id });
      },
      toggleSavePost: (id) => {
        const has = get().savedPosts.includes(id);
        set((s) => ({
          savedPosts: has ? s.savedPosts.filter((x) => x !== id) : [...s.savedPosts, id],
        }));
        if (!has) get().track("post_save", { postId: id });
      },
      toggleLike: (id) => {
        const has = get().likedPosts.includes(id);
        set((s) => ({
          likedPosts: has ? s.likedPosts.filter((x) => x !== id) : [...s.likedPosts, id],
        }));
        if (!has) get().track("post_like", { postId: id });
      },
      toggleFollow: (id) =>
        set((s) => ({
          following: s.following.includes(id)
            ? s.following.filter((x) => x !== id)
            : [...s.following, id],
        })),
      track: (type, ref) =>
        set((s) => ({
          // 이벤트는 최근 500개만 유지 (데모용 로컬 저장)
          events: [...s.events.slice(-499), { id: eid(), type, ts: Date.now(), ...ref }],
        })),
      addUserPost: (post) => {
        set((s) => ({ userPosts: [post, ...s.userPosts] }));
        get().track("publish", { postId: post.id });
      },
      removeUserPost: (id) =>
        set((s) => ({ userPosts: s.userPosts.filter((p) => p.id !== id) })),
    }),
    {
      name: "objet-store-v1",
      storage: createJSONStorage(() => localStorage),
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

/** 시드 카탈로그 + 커스텀 상품 통합 조회 */
export function useProductLookup() {
  const customProducts = useApp((s) => s.customProducts);
  return (id: string | null | undefined) =>
    productById(id) ?? customProducts.find((p) => p.id === id);
}
