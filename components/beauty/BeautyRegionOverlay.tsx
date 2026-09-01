import type { CSSProperties } from "react";
import type { BeautyApplicationStep } from "@/lib/beauty/types";

export type BeautyRegionOverlayProps = {
  readonly step: BeautyApplicationStep | null;
  readonly visible: boolean;
};

export function BeautyRegionOverlay({ step, visible }: BeautyRegionOverlayProps) {
  if (!visible || step === null) return null;

  if (step.hotspot === null) return null;

  const hotspotStyle: CSSProperties = {
    left: `${step.hotspot.x}%`,
    top: `${step.hotspot.y}%`,
    width: `${step.hotspot.w}%`,
    height: `${step.hotspot.h}%`,
    boxShadow:
      "0 0 0 999px color-mix(in srgb, var(--color-beauty-veil) 12%, transparent)",
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <span
        data-beauty-region={step.region}
        className="absolute rounded-full border border-beauty bg-beauty/10 opacity-100 transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        style={hotspotStyle}
      />
    </div>
  );
}
