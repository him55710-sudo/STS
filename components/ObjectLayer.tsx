"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ObjectTag } from "@/lib/types";
import { useApp } from "@/lib/store";
import { pointInPolygon, polygonCentroid } from "@/lib/mask/geometry";
import { canonicalClass, INTERACTION_PRIORITY, type FashionClass } from "@/lib/vision-config";

/**
 * Object Interaction UX — PRD §12
 * Idle: 아무 표시 없음 → First tap: 약 3초 은은한 하이라이트 → Object tap: 선택 + Bottom Sheet
 * fashion_v2: polygon(실루엣)이 있으면 실제 object shape로 하이라이트/히트테스트,
 * 없으면 bbox mask + 1~1.5px outline로 강등 (PRD §39 — detection box 금지)
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
      // tap target은 넉넉하게 — bbox를 3%씩 확장해 작은 객체도 선택 가능 (사업계획서 §17)
      const pad = 0.03;
      const hits = objects.filter((o) => {
        const rings = o.polygons ?? (o.polygon && o.polygon.length >= 3 ? [o.polygon] : null);
        if (rings) {
          // 실루엣 정밀 히트 — 어느 링이든 내부면 hit. 작은 객체는 bbox 확장 범위도 허용
          if (rings.some((ring) => pointInPolygon(x, y, ring))) return true;
          const small = o.w * o.h < 0.02;
          return small && x >= o.x - pad && x <= o.x + o.w + pad && y >= o.y - pad && y <= o.y + o.h + pad;
        }
        return x >= o.x - pad && x <= o.x + o.w + pad && y >= o.y - pad && y <= o.y + o.h + pad;
      });
      if (hits.length === 0) return null;
      // 겹칠 경우: 액세서리 > 패션 아이템 > 기타 (INTERACTION_PRIORITY), 동순위면 작은 것 우선
      return hits.sort((a, b) => {
        const pa = INTERACTION_PRIORITY[(a.canonicalClass as FashionClass) || canonicalClass(a.label)] ?? 50;
        const pb = INTERACTION_PRIORITY[(b.canonicalClass as FashionClass) || canonicalClass(b.label)] ?? 50;
        if (pa !== pb) return pb - pa;
        return a.w * a.h - b.w * b.h;
      })[0];
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

  // hint 종료 후 상태 정리 — CSS 애니메이션(3000ms)이 끝난 뒤 언마운트
  useEffect(() => {
    if (!hintAt) return;
    const t = setTimeout(() => setHintAt(0), 3050);
    return () => clearTimeout(t);
  }, [hintAt]);

  return (
    <div ref={ref} className="relative cursor-pointer select-none" onClick={handleTap}>
      {children}

      {/* Hint highlight — 3초 후 자동 소멸 */}
      {hintAt > 0 && (
        <ShapeOverlay key={`hint-${hintAt}`} objects={objects} variant="hint" />
      )}

      {/* Selected outline — 선택된 객체만 유지 */}
      <ShapeOverlay objects={objects.filter((o) => o.id === selectedId)} variant="selected" />
    </div>
  );
}

/**
 * 실루엣/박스 하이라이트 오버레이.
 * polygon이 있으면 SVG path(실제 object shape), 없으면 rounded rect.
 */
function ShapeOverlay({ objects, variant }: { objects: ObjectTag[]; variant: "hint" | "selected" }) {
  if (objects.length === 0) return null;
  const hint = variant === "hint";
  // 얇고 정밀한 선이 원칙 — 기본 1.25px, 선택 1.75px / fill은 3~5%만
  const fillOpacity = hint ? 0.05 : 0.06;
  const strokeWidth = hint ? 1.25 : 1.75;

  return (
    <div className={`pointer-events-none absolute inset-0 ${hint ? "object-hint" : "fade-in"}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {objects.map((o) => {
          const rings = o.polygons ?? (o.polygon && o.polygon.length >= 3 ? [o.polygon] : null);
          return rings ? (
            <path
              key={o.id}
              d={ringsToPath(rings)}
              fillRule="evenodd"
              fill="var(--color-accent)"
              fillOpacity={fillOpacity}
              stroke={`color-mix(in srgb, var(--color-accent) ${hint ? 60 : 90}%, white)`}
              strokeOpacity={0.95}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <rect
              key={o.id}
              x={o.x * 100}
              y={o.y * 100}
              width={o.w * 100}
              height={o.h * 100}
              rx={1.2}
              fill="var(--color-accent)"
              fillOpacity={fillOpacity}
              stroke={`color-mix(in srgb, var(--color-accent) ${hint ? 60 : 90}%, white)`}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      {objects.map((o) => {
        const main = o.polygons?.[0] ?? o.polygon;
        const [cx, cy] =
          main && main.length >= 3 ? polygonCentroid(main) : [o.x + o.w / 2, o.y + o.h / 2];
        return <Dot key={`dot-${o.id}`} x={cx} y={cy} active={!hint} />;
      })}
    </div>
  );
}

/** 다중 링 → 단일 path (M..Z M..Z). 링끼리 선으로 연결되지 않는다. */
export function ringsToPath(rings: [number, number][][]): string {
  return rings
    .map(
      (ring) =>
        `M ${ring.map(([px, py]) => `${(px * 100).toFixed(2)} ${(py * 100).toFixed(2)}`).join(" L ")} Z`
    )
    .join(" ");
}

/** 작은 product indicator dot */
function Dot({ x, y, active }: { x: number; y: number; active?: boolean }) {
  return (
    <span
      className="object-dot absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
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
