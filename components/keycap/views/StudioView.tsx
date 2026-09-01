"use client";

import type { ChangeEvent, ReactNode } from "react";
import { KeycapVisual } from "@/components/keycap/KeycapVisual";
import { PressableKeycap } from "@/components/keycap/PressableKeycap";
import { StudioControl } from "@/components/keycap/StudioControl";
import { useKeycapStore } from "@/lib/keycap-store";
import {
  KEYCAP_FINISHES,
  KEYCAP_FONTS,
  KEYCAP_LEGEND_POSITIONS,
  KEYCAP_MATERIALS,
  KEYCAP_PATTERNS,
  KEYCAP_PROFILES,
  KEYCAP_SIZES,
  KEYCAP_SOUND_PRESETS,
  KEYCAP_SWITCH_FEELINGS,
} from "@/lib/keycap-types";
import { KEYCAPS } from "@/lib/keycaps";

const inputClass = "min-h-11 w-full min-w-0 max-w-full rounded-tactile-control border border-tactile-line bg-tactile-raised px-3 text-sm text-tactile-ink outline-none focus-visible:ring-2 focus-visible:ring-tactile-unlock focus-visible:ring-offset-2 focus-visible:ring-offset-tactile-canvas";

export function StudioView() {
  const board = useKeycapStore((state) => state.board);
  const applyStudioToSlot = useKeycapStore((state) => state.applyStudioToSlot);
  const hasHydrated = useKeycapStore((state) => state.hasHydrated);
  const loadStudioKeycap = useKeycapStore((state) => state.loadStudioKeycap);
  const ownedKeycapIds = useKeycapStore((state) => state.ownedKeycapIds);
  const selectBoardSlot = useKeycapStore((state) => state.selectBoardSlot);
  const selectedBoardSlotId = useKeycapStore((state) => state.selectedBoardSlotId);
  const soundEnabled = useKeycapStore((state) => state.soundEnabled);
  const studio = useKeycapStore((state) => state.studio);
  const toggleSound = useKeycapStore((state) => state.toggleSound);
  const updateStudio = useKeycapStore((state) => state.updateStudio);

  if (!hasHydrated) {
    return <section aria-busy="true" aria-label="Loading keycap studio" className="min-h-dvh bg-tactile-canvas" />;
  }

  const baseKeycap = KEYCAPS.find((keycap) => keycap.id === studio.keycapId) ?? KEYCAPS[0];
  const ownedKeycaps = KEYCAPS.filter((keycap) => ownedKeycapIds.includes(keycap.id));
  const selectedSlot = board.find((slot) => slot.id === selectedBoardSlotId);
  const equippedKeycap = KEYCAPS.find((keycap) => keycap.id === selectedSlot?.keycapId);

  return (
    <section aria-labelledby="studio-title" className="min-h-dvh bg-tactile-canvas px-4 pb-12 pt-6 text-tactile-ink sm:px-6 sm:pt-10">
      <div className="mx-auto w-full max-w-[1040px]">
        <header className="border-b border-tactile-line pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-tactile-muted">Live object workshop</p>
          <h1 id="studio-title" className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">Studio and Sound Lab</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-tactile-muted">Shape one owned specimen, hear its switch, then place it on the selected board slot.</p>
        </header>

        <div className="grid min-w-0 gap-7 py-7 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-10">
          <aside aria-label="Live keycap preview" className="order-first min-w-0 lg:sticky lg:top-24">
            <div className="rounded-tactile-frame border border-tactile-line bg-tactile-raised p-4 shadow-tactile-frame sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-tactile-muted">Live preview</p>
                  <h2 className="mt-1 text-lg font-bold tracking-[-0.025em]">{baseKeycap.name}</h2>
                </div>
                <span className="text-right text-[11px] leading-5 text-tactile-muted">{studio.profile}<br />{studio.size}</span>
              </div>
              <div className="mt-5 flex min-h-64 items-center justify-center rounded-tactile-control bg-tactile-canvas p-5">
                <KeycapVisual keycap={baseKeycap} appearance={studio} scale="preview" />
              </div>

              <div className="mt-5 grid gap-4 border-t border-tactile-line pt-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <StudioControl id="studio-base" label="Owned base" htmlFor="studio-base-select">
                  <select
                    id="studio-base-select"
                    value={studio.keycapId}
                    onChange={(event) => {
                      const keycap = ownedKeycaps.find((item) => item.id === event.currentTarget.value);
                      if (keycap !== undefined) loadStudioKeycap(keycap.id);
                    }}
                    className={inputClass}
                  >
                    {ownedKeycaps.map((keycap) => <option key={keycap.id} value={keycap.id}>{keycap.name}</option>)}
                  </select>
                </StudioControl>
                <StudioControl id="studio-slot" label="Board slot" htmlFor="studio-slot-select">
                  <select id="studio-slot-select" value={selectedBoardSlotId} onChange={(event) => selectBoardSlot(event.currentTarget.value)} className={inputClass}>
                    {board.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
                  </select>
                </StudioControl>
              </div>

              <p aria-live="polite" className="mt-4 text-xs text-tactile-muted">Currently: {equippedKeycap?.name ?? "No specimen"}</p>
              <button
                type="button"
                disabled={selectedSlot === undefined}
                onClick={() => {
                  if (selectedSlot !== undefined) applyStudioToSlot(selectedSlot.id);
                }}
                className="mt-3 min-h-11 w-full rounded-btn bg-tactile-ink px-4 text-sm font-semibold text-white outline-none transition-transform active:scale-[0.98] disabled:cursor-default disabled:bg-tactile-line disabled:text-tactile-muted focus-visible:ring-2 focus-visible:ring-tactile-unlock focus-visible:ring-offset-2 focus-visible:ring-offset-tactile-raised motion-reduce:transition-none"
              >
                {`Apply to ${selectedSlot?.label ?? "board"}`}
              </button>
            </div>
          </aside>

          <div className="min-w-0 divide-y divide-tactile-line border-y border-tactile-line">
            <ControlGroup title="Legend" description="Set the face copy and its alignment.">
              <StudioControl id="studio-legend" label="Legend" htmlFor="studio-legend-input">
                <input id="studio-legend-input" value={studio.legend} maxLength={12} autoComplete="off" onChange={(event) => updateStudio({ legend: event.currentTarget.value })} className={inputClass} />
              </StudioControl>
              <StudioControl id="studio-font" label="Font" htmlFor="studio-font-select"><OptionSelect id="studio-font-select" value={studio.font} options={KEYCAP_FONTS} onChange={(font) => updateStudio({ font })} /></StudioControl>
              <StudioControl id="studio-position" label="Position" htmlFor="studio-position-select"><OptionSelect id="studio-position-select" value={studio.legendPosition} options={KEYCAP_LEGEND_POSITIONS} onChange={(legendPosition) => updateStudio({ legendPosition })} /></StudioControl>
              <StudioControl id="studio-icon" label="Icon" htmlFor="studio-icon-input"><input id="studio-icon-input" value={studio.icon} maxLength={4} autoComplete="off" onChange={(event) => updateStudio({ icon: event.currentTarget.value })} className={inputClass} /></StudioControl>
            </ControlGroup>

            <ControlGroup title="Body" description="Color and material define the object surface.">
              <StudioControl id="studio-color" label="Color" htmlFor="studio-color-input" hint={studio.color.toUpperCase()}><input id="studio-color-input" type="color" value={studio.color} onChange={(event) => updateStudio({ color: event.currentTarget.value })} className="h-11 w-full cursor-pointer rounded-tactile-control border border-tactile-line bg-tactile-raised p-1 outline-none focus-visible:ring-2 focus-visible:ring-tactile-unlock" /></StudioControl>
              <StudioControl id="studio-material" label="Material" htmlFor="studio-material-select"><OptionSelect id="studio-material-select" value={studio.material} options={KEYCAP_MATERIALS} onChange={(material) => updateStudio({ material })} /></StudioControl>
              <StudioControl id="studio-pattern" label="Pattern" htmlFor="studio-pattern-select"><OptionSelect id="studio-pattern-select" value={studio.backgroundPattern} options={KEYCAP_PATTERNS} onChange={(backgroundPattern) => updateStudio({ backgroundPattern })} /></StudioControl>
            </ControlGroup>

            <ControlGroup title="Light" description="Tune transmission and the edge response.">
              <StudioControl id="studio-transparency" label="Transparency" htmlFor="studio-transparency-input" hint={`${studio.transparency}%`} className="sm:col-span-2"><input id="studio-transparency-input" type="range" min={0} max={100} step={5} value={studio.transparency} onChange={(event) => updateStudio({ transparency: event.currentTarget.valueAsNumber })} className="h-11 w-full cursor-pointer accent-tactile-violet" /></StudioControl>
              <StudioControl id="studio-glow" label="Glow" hint={studio.glow ? "On" : "Off"} className="sm:col-span-2"><label htmlFor="studio-glow-input" className="flex min-h-11 cursor-pointer items-center justify-between rounded-tactile-control border border-tactile-line bg-tactile-raised px-3 text-sm font-medium"><span>Edge illumination</span><input id="studio-glow-input" type="checkbox" checked={studio.glow} onChange={(event) => updateStudio({ glow: event.currentTarget.checked })} className="h-5 w-5 accent-tactile-violet" /></label></StudioControl>
            </ControlGroup>

            <ControlGroup title="Profile" description="Footprint and sculpt stay independent.">
              <StudioControl id="studio-profile" label="Profile" htmlFor="studio-profile-select"><OptionSelect id="studio-profile-select" value={studio.profile} options={KEYCAP_PROFILES} onChange={(profile) => updateStudio({ profile })} /></StudioControl>
              <StudioControl id="studio-size" label="Size" htmlFor="studio-size-select"><OptionSelect id="studio-size-select" value={studio.size} options={KEYCAP_SIZES} onChange={(size) => updateStudio({ size })} /></StudioControl>
              <StudioControl id="studio-finish" label="Finish" htmlFor="studio-finish-select" className="sm:col-span-2"><OptionSelect id="studio-finish-select" value={studio.finish} options={KEYCAP_FINISHES} onChange={(finish) => updateStudio({ finish })} /></StudioControl>
            </ControlGroup>

            <ControlGroup title="Feel" description="Choose a tone, switch response, and test the result.">
              <StudioControl id="studio-sound" label="Sound preset" hint={studio.sound} className="sm:col-span-2">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{KEYCAP_SOUND_PRESETS.map((sound) => <button key={sound} type="button" aria-pressed={studio.sound === sound} onClick={() => updateStudio({ sound })} className={`min-h-11 rounded-tactile-control border px-2 text-xs font-semibold capitalize outline-none focus-visible:ring-2 focus-visible:ring-tactile-unlock ${studio.sound === sound ? "border-tactile-ink bg-tactile-ink text-white" : "border-tactile-line bg-tactile-raised text-tactile-ink"}`}>{sound}</button>)}</div>
              </StudioControl>
              <StudioControl id="studio-feeling" label="Switch feeling" htmlFor="studio-feeling-select"><OptionSelect id="studio-feeling-select" value={studio.switchFeeling} options={KEYCAP_SWITCH_FEELINGS} onChange={(switchFeeling) => updateStudio({ switchFeeling })} /></StudioControl>
              <StudioControl id="studio-sound-toggle" label="Sound output"><button type="button" aria-pressed={soundEnabled} onClick={toggleSound} className="min-h-11 w-full rounded-tactile-control border border-tactile-line bg-tactile-raised px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-tactile-unlock">{soundEnabled ? "Sound on" : "Sound off"}</button></StudioControl>
              <div className="grid grid-cols-1 items-center gap-4 border-t border-tactile-line pt-4 sm:col-span-2 sm:grid-cols-[176px_minmax(0,1fr)]">
                <PressableKeycap keycap={baseKeycap} appearance={studio} scale="card" soundEnabled={soundEnabled} accessibleLabel={`Test ${studio.sound} sound on ${baseKeycap.name}`} onPress={() => undefined} />
                <div><p className="text-sm font-semibold">Test sound</p><p className="mt-1 text-xs leading-5 text-tactile-muted">Press the specimen to hear the current preset. Preview presses do not add reward progress.</p></div>
              </div>
            </ControlGroup>
          </div>
        </div>
      </div>
    </section>
  );
}

type OptionSelectProps<T extends string> = { readonly id: string; readonly onChange: (value: T) => void; readonly options: readonly T[]; readonly value: T };

function OptionSelect<T extends string>({ id, onChange, options, value }: OptionSelectProps<T>) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = options.find((option) => option === event.currentTarget.value);
    if (nextValue !== undefined) onChange(nextValue);
  };
  return <select id={id} value={value} onChange={handleChange} className={inputClass}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function ControlGroup({ children, description, title }: { readonly children: ReactNode; readonly description: string; readonly title: string }) {
  return <fieldset className="grid min-w-0 gap-4 py-6 sm:grid-cols-2"><legend className="text-lg font-bold tracking-[-0.025em]">{title}</legend><p className="-mt-3 text-xs leading-5 text-tactile-muted sm:col-span-2">{description}</p>{children}</fieldset>;
}
