import type { Creator } from "@/lib/types";

/** 아바타 — 실사 이미지가 있으면 사진, 없으면 이니셜 + 무채색 톤 */
export default function Avatar({ creator, size = 34 }: { creator: Creator; size?: number }) {
  if (creator.avatarImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={creator.avatarImage}
        alt={creator.name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, objectPosition: "50% 10%" }}
      />
    );
  }
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
