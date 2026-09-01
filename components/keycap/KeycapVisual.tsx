import type { CSSProperties } from "react";
import type {
  KeycapDefinition,
  KeycapFinish,
  KeycapFont,
  KeycapLegendPosition,
  KeycapMaterial,
  KeycapPattern,
  KeycapProfile,
  KeycapSize,
  KeycapStudioState,
} from "@/lib/keycap-types";

export type KeycapScale = "board" | "hero" | "preview" | "card";

export type KeycapVisualProps = {
  readonly keycap: KeycapDefinition;
  readonly appearance?: Partial<KeycapStudioState>;
  readonly pressed?: boolean;
  readonly scale?: KeycapScale;
  readonly className?: string;
};

type ScaleSpec = { readonly unit: number; readonly depth: number; readonly travel: number; readonly font: number };
type MaterialSpec = {
  readonly coverage: number;
  readonly highlight: number;
  readonly highlightStop: number;
  readonly texture: string;
  readonly textureOpacity: number;
  readonly blur: number;
};
type ProfileSpec = { readonly height: number; readonly inset: number; readonly radius: number; readonly tilt: number };
type FinishSpec = { readonly shine: number; readonly brightness: number; readonly saturation: number; readonly blur: number };
type PatternSpec = { readonly image: string; readonly size: string; readonly opacity: number };
type LegendPositionSpec = {
  readonly justifyContent: CSSProperties["justifyContent"];
  readonly alignItems: CSSProperties["alignItems"];
  readonly padding: string;
};

const SCALE_SPECS = {
  board: { unit: 64, depth: 8, travel: 5, font: 9 },
  card: { unit: 88, depth: 11, travel: 6, font: 11 },
  hero: { unit: 148, depth: 18, travel: 8, font: 16 },
  preview: { unit: 188, depth: 22, travel: 8, font: 19 },
} as const satisfies Readonly<Record<KeycapScale, ScaleSpec>>;

const SIZE_WIDTHS = { "1U": 1, "1.25U": 1.25, "1.5U": 1.5, "2U": 2 } as const satisfies Readonly<Record<KeycapSize, number>>;
const PROFILE_SPECS = {
  Cherry: { height: 0.86, inset: 0.045, radius: 0.16, tilt: -4 },
  SA: { height: 1.06, inset: 0.085, radius: 0.22, tilt: -7 },
  XDA: { height: 0.92, inset: 0.035, radius: 0.2, tilt: -2 },
  DSA: { height: 0.8, inset: 0.055, radius: 0.24, tilt: -1 },
} as const satisfies Readonly<Record<KeycapProfile, ProfileSpec>>;
const MATERIAL_SPECS = {
  PBT: { coverage: 1, highlight: 0.34, highlightStop: 26, texture: "radial-gradient(circle, rgb(255 255 255 / .72) 0 .5px, transparent .8px)", textureOpacity: 0.22, blur: 0 },
  ABS: { coverage: 1, highlight: 0.52, highlightStop: 30, texture: "linear-gradient(112deg, transparent 32%, rgb(255 255 255 / .42) 49%, transparent 64%)", textureOpacity: 0.25, blur: 0 },
  translucent: { coverage: 0.72, highlight: 0.64, highlightStop: 22, texture: "linear-gradient(135deg, rgb(255 255 255 / .36), transparent 38%)", textureOpacity: 0.42, blur: 1 },
  "clear resin": { coverage: 0.42, highlight: 0.86, highlightStop: 16, texture: "radial-gradient(circle at 28% 18%, rgb(255 255 255 / .8), transparent 23%)", textureOpacity: 0.6, blur: 1 },
  frosted: { coverage: 0.66, highlight: 0.46, highlightStop: 24, texture: "radial-gradient(circle, rgb(255 255 255 / .55) 0 .7px, transparent 1.1px)", textureOpacity: 0.38, blur: 2 },
  "ceramic-like": { coverage: 1, highlight: 0.7, highlightStop: 17, texture: "linear-gradient(155deg, rgb(255 255 255 / .46), transparent 30%)", textureOpacity: 0.28, blur: 0 },
  metallic: { coverage: 1, highlight: 0.9, highlightStop: 12, texture: "repeating-linear-gradient(92deg, rgb(255 255 255 / .24) 0 1px, transparent 1px 5px)", textureOpacity: 0.32, blur: 0 },
  "glossy artisan": { coverage: 1, highlight: 0.94, highlightStop: 14, texture: "radial-gradient(ellipse at 32% 12%, rgb(255 255 255 / .76), transparent 31%)", textureOpacity: 0.54, blur: 0 },
} as const satisfies Readonly<Record<KeycapMaterial, MaterialSpec>>;
const DEFAULT_FINISHES = {
  PBT: "matte",
  ABS: "satin",
  translucent: "satin",
  "clear resin": "gloss",
  frosted: "matte",
  "ceramic-like": "satin",
  metallic: "satin",
  "glossy artisan": "gloss",
} as const satisfies Readonly<Record<KeycapMaterial, KeycapFinish>>;
const FINISH_SPECS = {
  matte: { shine: 0.26, brightness: 0.98, saturation: 0.92, blur: 2 },
  satin: { shine: 0.52, brightness: 1.02, saturation: 1, blur: 1 },
  gloss: { shine: 0.88, brightness: 1.06, saturation: 1.08, blur: 0 },
} as const satisfies Readonly<Record<KeycapFinish, FinishSpec>>;
const PATTERN_SPECS = {
  none: { image: "none", size: "auto", opacity: 0 },
  grid: { image: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)", size: "12px 12px", opacity: 0.2 },
  noise: { image: "radial-gradient(circle, currentColor 0 .7px, transparent .9px)", size: "5px 5px", opacity: 0.2 },
  stripes: { image: "repeating-linear-gradient(125deg, currentColor 0 2px, transparent 2px 9px)", size: "auto", opacity: 0.16 },
} as const satisfies Readonly<Record<KeycapPattern, PatternSpec>>;
const FONT_STACKS = {
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  grotesk: 'var(--font-sans, "Pretendard Variable", sans-serif)',
  rounded: '"Arial Rounded MT Bold", "Pretendard Variable", sans-serif',
} as const satisfies Readonly<Record<KeycapFont, string>>;
const LEGEND_POSITIONS = {
  center: { justifyContent: "center", alignItems: "center", padding: "14%" },
  top: { justifyContent: "flex-start", alignItems: "flex-start", padding: "15% 14%" },
  bottom: { justifyContent: "flex-end", alignItems: "flex-start", padding: "15% 14%" },
} as const satisfies Readonly<Record<KeycapLegendPosition, LegendPositionSpec>>;

function mix(color: string, amount: number, withColor: string): string {
  return `color-mix(in srgb, ${color} ${amount}%, ${withColor})`;
}

export function KeycapVisual({ keycap, appearance, pressed = false, scale = "board", className }: KeycapVisualProps) {
  const color = appearance?.color ?? keycap.color;
  const material = appearance?.material ?? keycap.material;
  const size = appearance?.size ?? keycap.size;
  const profile = appearance?.profile ?? keycap.profile;
  const finish = appearance?.finish ?? DEFAULT_FINISHES[material];
  const pattern = appearance?.backgroundPattern ?? "none";
  const legendPosition = appearance?.legendPosition ?? "center";
  const legend = appearance?.legend ?? keycap.legend;
  const icon = appearance?.icon ?? keycap.icon;
  const font = appearance?.font ?? "grotesk";
  const glow = appearance?.glow ?? false;
  const transparency = Math.min(100, Math.max(0, appearance?.transparency ?? 0));
  const scaleSpec = SCALE_SPECS[scale];
  const profileSpec = PROFILE_SPECS[profile];
  const materialSpec = MATERIAL_SPECS[material];
  const finishSpec = FINISH_SPECS[finish];
  const patternSpec = PATTERN_SPECS[pattern];
  const positionSpec = LEGEND_POSITIONS[legendPosition];
  const width = Math.round(scaleSpec.unit * SIZE_WIDTHS[size]);
  const topHeight = Math.round(scaleSpec.unit * profileSpec.height);
  const height = topHeight + scaleSpec.depth;
  const inset = Math.round(scaleSpec.unit * profileSpec.inset);
  const radius = Math.round(scaleSpec.unit * profileSpec.radius);
  const coverage = Math.max(8, Math.round(materialSpec.coverage * (100 - transparency)));
  const body = mix(color, coverage, "transparent");
  const highlight = mix("white", Math.round(materialSpec.highlight * 100), body);
  const shade = mix(keycap.accent, 42, mix(color, Math.min(100, coverage + 18), "transparent"));
  const duration = pressed ? "96ms" : "220ms";
  const easing = pressed ? "cubic-bezier(.3,.7,.4,1)" : "cubic-bezier(.18,.9,.24,1.14)";
  const textureImage = patternSpec.image === "none" ? materialSpec.texture : `${patternSpec.image}, ${materialSpec.texture}`;

  return (
    <span aria-hidden="true" className={`pointer-events-none relative inline-block max-w-full shrink-0 select-none align-middle ${className ?? ""}`} data-keycap-id={keycap.id} data-material={material} data-profile={profile} data-size={size} data-scale={scale} data-finish={finish} data-pattern={pattern} data-font={font} data-legend-position={legendPosition} data-transparency={transparency} data-glow={glow ? "true" : "false"} data-pressed={pressed ? "true" : "false"} style={{ width, height }}>
      <span className="keycap-contact-shadow absolute motion-reduce:transition-none" data-keycap-part="contact-shadow" style={{ left: "8%", right: "8%", bottom: 0, height: scaleSpec.depth * 1.25, borderRadius: "50%", background: mix(keycap.accent, glow ? 36 : 22, "transparent"), boxShadow: glow ? `0 0 ${scaleSpec.depth * 2}px ${mix(keycap.accent, 44, "transparent")}` : "none", filter: `blur(${Math.max(2, scaleSpec.depth * 0.34)}px)`, opacity: pressed ? 0.46 : 0.82, transform: `scaleX(${pressed ? 0.76 : 1}) translateY(${pressed ? -1 : 0}px)`, transition: `transform ${duration} ${easing}, opacity ${duration} ${easing}` }} />
      <span className="keycap-switch-well absolute" data-keycap-part="switch-well" style={{ left: "11%", right: "11%", bottom: 1, height: scaleSpec.depth * 1.4, borderRadius: radius, background: mix("#171714", 28, "transparent"), boxShadow: `inset 0 ${scaleSpec.depth * 0.3}px ${scaleSpec.depth}px ${mix("#171714", 32, "transparent")}` }} />
      <span className="keycap-side-wall absolute motion-reduce:transition-none" data-keycap-part="side-wall" style={{ left: Math.max(1, inset / 2), right: Math.max(1, inset / 2), top: scaleSpec.depth * 0.55, bottom: scaleSpec.depth * 0.18, border: `1px solid ${mix("#171714", 15, "transparent")}`, borderRadius: radius + 2, background: `linear-gradient(105deg, ${mix(shade, 82, "black")} 0%, ${shade} 48%, ${mix(shade, 74, "black")} 100%)`, clipPath: "polygon(3% 0, 97% 0, 100% 90%, 94% 100%, 6% 100%, 0 90%)", filter: `brightness(${finishSpec.brightness}) saturate(${finishSpec.saturation})`, transform: `translateY(${pressed ? scaleSpec.travel * 0.62 : 0}px)`, transition: `transform ${duration} ${easing}` }} />
      <span className="keycap-top absolute overflow-hidden motion-reduce:transition-none" data-keycap-part="top" style={{ left: inset, right: inset, top: 0, height: topHeight, boxSizing: "border-box", border: `1px solid ${mix("white", 35, mix("#171714", 12, "transparent"))}`, borderRadius: radius, background: `linear-gradient(145deg, ${highlight} 0%, ${body} ${materialSpec.highlightStop}%, ${mix(color, coverage, "transparent")} 58%, ${shade} 100%)`, backdropFilter: materialSpec.blur > 0 ? `blur(${materialSpec.blur}px)` : undefined, boxShadow: `${glow ? `0 0 ${scaleSpec.depth * 2.4}px ${mix(keycap.accent, 48, "transparent")}, ` : ""}inset 0 1px 0 ${mix("white", 68, "transparent")}, inset 0 -${Math.max(2, scaleSpec.depth * 0.38)}px ${scaleSpec.depth}px ${mix("#171714", 16, "transparent")}`, filter: `brightness(${finishSpec.brightness}) saturate(${finishSpec.saturation})`, transformOrigin: "50% 100%", transform: `perspective(${scaleSpec.unit * 6}px) translateY(${pressed ? scaleSpec.travel : 0}px) rotateX(${pressed ? 0 : profileSpec.tilt}deg)`, transition: `transform ${duration} ${easing}` }}>
        <span className="keycap-texture absolute inset-0" data-keycap-part="texture" style={{ color: keycap.accent, backgroundImage: textureImage, backgroundSize: patternSpec.image === "none" ? "6px 6px" : `${patternSpec.size}, 6px 6px`, mixBlendMode: "soft-light", opacity: Math.max(materialSpec.textureOpacity, patternSpec.opacity) }} />
        <span className="keycap-highlight absolute" data-keycap-part="highlight" style={{ left: "9%", right: "17%", top: "7%", height: "19%", borderRadius: radius, background: "linear-gradient(180deg, rgb(255 255 255 / .82), transparent)", filter: `blur(${finishSpec.blur}px)`, opacity: finishSpec.shine * materialSpec.highlight }} />
        <span className="keycap-legend-plane absolute inset-0 flex" data-keycap-part="legend-plane" style={{ justifyContent: positionSpec.justifyContent, alignItems: positionSpec.alignItems, padding: positionSpec.padding, boxSizing: "border-box", color: mix(keycap.accent, 68, "#171714"), fontFamily: FONT_STACKS[font], textShadow: `0 1px 1px ${mix("white", 38, "transparent")}` }}>
          <span className="keycap-legend relative z-10 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-bold uppercase" data-keycap-part="legend" style={{ fontSize: scaleSpec.font, letterSpacing: "0.1em", lineHeight: 1 }}>{legend}</span>
          <span className="keycap-icon absolute z-10" data-keycap-part="icon" style={{ right: "12%", top: legendPosition === "bottom" ? "12%" : undefined, bottom: legendPosition === "bottom" ? undefined : "12%", fontSize: scaleSpec.font * 1.12, lineHeight: 1, opacity: 0.76 }}>{icon}</span>
        </span>
      </span>
    </span>
  );
}
