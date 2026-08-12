"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ObjectTag } from "@/lib/types";
import { useApp } from "@/lib/store";

/**
 * Object Interaction UX — PRD §12
 * Idle: 아무 표시 없음 → First tap: 600~900ms 은은한 하이라이트 → Object tap: 선택 + Bottom Sheet
 * Bounding box 대신 mask(accent 7~10%) + 1~1.5px outline (PRD §39)
 */
export default function ObjectLayer({
  postId,
  objects,
  selectedId,
  onSelect,
  children,
}: {
  postId: string;
  objects: ObjectTag[];
  selectedId: string | null;
  onSelect: (obj: ObjectTag | null) => void;
  children: React.ReactNode;
}) {
  const [hintAt, setHintAt] = useState(0); // 0이 아니면 hint 애니메이션 재생
  const ref = useRef<HTMLDivElement>(null);
  const track = useApp((s) => s.track);

  const hitTest = useCallback(
    (clientX: number, clientY: number): ObjectTag | null => {
      const el = ref.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = (clientX - r.left) / r.width;
      const y = (clientY - r.top) / r.height;
      // tap target은 넉넉하게 — 영역을 6%씩 확장해 작은 객체도 선택 가능 (사업계획서 §17)
      const pad = 0.03;
      const hits = objects.filter(
        (o) => x >= o.x - pad && x <= o.x + o.w + pad && y >= o.y - pad && y <= o.y + o.h + pad
      );
      if (hits.length === 0) return null;
      // 겹칠 경우 가장 작은 객체 우선 (셔츠 위의 백 등)
      return hits.sort((a, b) => a.w * a.h - b.w * b.h)[0];
    },
    [objects]
  );

  const handleTap = (e: React.MouseEvent) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      track("object_tap", { postId, objectId: hit.id, productId: hit.productId ?? undefined });
      onSelect(hit);
    } else if (objects.length > 0) {
      // 콘텐츠 탭 → shoppable objects 잠깐 하이라이트
      setHintAt(Date.now());
      track("object_hint_view", { postId });
      onSelect(null);
    }
  };

  // hint 종료 후 상태 정리
  useEffect(() => {
    if (!hintAt) return;
    const t = setTimeout(() => setHintAt(0), 900);
    return () => clearTimeout(t);
  }, [hintAt]);

  return (
    <div ref={ref} className="relative cursor-pointer select-none" onClick={handleTap}>
      {children}

      {/* Hint highlight — 850ms 후 자동 소멸 */}
      {hintAt > 0 &&
        objects.map((o) => (
          <div
            key={`hint-${o.id}-${hintAt}`}
            className="object-hint pointer-events-none absolute rounded-[6px]"
            style={{
              left: `${o.x * 100}%`,
              top: `${o.y * 100}%`,
              width: `${o.w * 100}%`,
              height: `${o.h * 100}%`,
              background: "color-mix(in srgb, var(--color-accent) 9%, transparent)",
              boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 55%, white)",
            }}
          >
            <Dot />
          </div>
        ))}

      {/* Selected outline — 선택된 객체만 유지 */}
      {objects
        .filter((o) => o.id === selectedId)
        .map((o) => (
          <div
            key={`sel-${o.id}`}
            className="fade-in pointer-events-none absolute rounded-[6px]"
            style={{
              left: `${o.x * 100}%`,
              top: `${o.y * 100}%`,
              width: `${o.w * 100}%`,
              height: `${o.h * 100}%`,
              background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
              boxShadow:
                "inset 0 0 0 1.5px color-mix(in srgb, var(--color-accent) 85%, white), 0 0 0 1px rgba(255,255,255,0.35)",
            }}
          >
            <Dot active />
          </div>
        ))}
    </div>
  );
}

/** 작은 product indicator dot */
function Dot({ active }: { active?: boolean }) {
  return (
    <span
      className="object-dot absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        width: active ? 18 : 16,
        height: active ? 18 : 16,
        borderRadius: 999,
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 1px 6px rgba(21,23,25,0.25)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <span
        style={{
          width: active ? 7 : 6,
          height: active ? 7 : 6,
          borderRadius: 999,
          background: "var(--color-accent)",
        }}
      />
    </span>
  );
}
