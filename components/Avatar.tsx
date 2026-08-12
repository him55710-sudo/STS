import type { Creator } from "@/lib/types";

/** 이니셜 아바타 — 무채색 톤 (콘텐츠보다 튀지 않게) */
export default function Avatar({ creator, size = 34 }: { creator: Creator; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: creator.tone, fontSize: size * 0.4 }}
      aria-hidden
    >
      {creator.name[0]}
    </span>
  );
}
