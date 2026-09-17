"use client";

import type { CSSProperties } from "react";
import type { BeautyApplicationStep, BeautyRegion } from "@/lib/beauty/types";

export type BeautyRegionOverlayProps = {
  readonly step: BeautyApplicationStep | null;
  readonly allSteps?: readonly BeautyApplicationStep[];
  readonly visible: boolean;
  readonly onSelectRegion?: (region: BeautyRegion) => void;
};

const REGION_LABELS: Record<BeautyRegion, string> = {
  lip: "LIP · 틴트 그라데이션",
  cheek: "CHEEK · 생기 치크",
  eye: "EYE · 무드 음영",
  base: "BASE · 킬커버 쿠션",
  skin: "SKIN · 수분 세럼",
};

export function BeautyRegionOverlay({
  step,
  allSteps = [],
  visible,
  onSelectRegion,
}: BeautyRegionOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none" aria-label="메이크업 부위 터치 레이어">
      {/* Active Selected Hotspot with Glow and Pulsing Ring */}
      {step?.hotspot && (
        <div
          data-beauty-region={step.region}
          className="absolute transition-all duration-300 pointer-events-none"
          style={{
            left: `${step.hotspot.x}%`,
            top: `${step.hotspot.y}%`,
            width: `${step.hotspot.w}%`,
            height: `${step.hotspot.h}%`,
          }}
        >
          <span className="absolute inset-0 rounded-2xl border-2 border-beauty bg-beauty/15 shadow-[0_0_20px_rgba(255,45,120,0.5)] animate-pulse" />
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-beauty px-2.5 py-0.5 text-[11px] font-bold text-white shadow-lg">
            {REGION_LABELS[step.region]}
          </span>
        </div>
      )}

      {/* Interactive Touch Targets for All Makeup Regions */}
      {onSelectRegion && allSteps.map((s) => {
        if (!s.hotspot) return null;
        const isSelected = step?.id === s.id;
        const style: CSSProperties = {
          left: `${s.hotspot.x}%`,
          top: `${s.hotspot.y}%`,
          width: `${s.hotspot.w}%`,
          height: `${s.hotspot.h}%`,
        };

        return (
          <button
            key={s.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectRegion(s.region);
            }}
            aria-label={`${s.label} 선택`}
            className={`pointer-events-auto absolute rounded-2xl transition-all duration-200 group flex items-center justify-center ${
              isSelected
                ? "border-2 border-beauty bg-beauty/10"
                : "border border-white/30 bg-black/10 hover:border-beauty/80 hover:bg-beauty/20 backdrop-blur-[1px]"
            }`}
            style={style}
          >
            <span
              className={`opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/80 px-2 py-0.5 text-[10px] text-white font-medium shadow-md ${
                isSelected ? "!opacity-0" : ""
              }`}
            >
              {s.region.toUpperCase()} 터치
            </span>
          </button>
        );
      })}
    </div>
  );
}
