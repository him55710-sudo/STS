"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { KeycapDefinition, KeycapId, KeycapStudioState, KeycapSwitchFeeling } from "@/lib/keycap-types";
import { KeycapVisual } from "@/components/keycap/KeycapVisual";
import type { KeycapScale } from "@/components/keycap/KeycapVisual";
import { useKeycapAudio } from "@/components/keycap/useKeycapAudio";

export type PressableKeycapProps = {
  readonly keycap: KeycapDefinition;
  readonly appearance?: Partial<KeycapStudioState>;
  readonly scale?: KeycapScale;
  readonly className?: string;
  readonly soundEnabled: boolean;
  readonly disabled?: boolean;
  readonly selected?: boolean;
  readonly accessibleLabel?: string;
  readonly onPress: (keycapId: KeycapId) => void;
};

const HAPTIC_DURATIONS = { creamy: 10, snappy: 6, silent: 4, tactile: 14 } as const satisfies Readonly<Record<KeycapSwitchFeeling, number>>;

export function PressableKeycap({ keycap, appearance, scale = "board", className, soundEnabled, disabled = false, selected = false, accessibleLabel, onPress }: PressableKeycapProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const activePointerIdsRef = useRef<Set<number>>(new Set<number>());
  const keyboardActiveRef = useRef(false);
  const handledActivationRef = useRef(false);
  const guardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressed, setPressed] = useState(false);
  const playSound = useKeycapAudio();
  const sound = appearance?.sound ?? keycap.sound;
  const switchFeeling = appearance?.switchFeeling ?? "creamy";

  const activate = useCallback(() => {
    if (disabled) return;
    if (soundEnabled) playSound(sound);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(HAPTIC_DURATIONS[switchFeeling]);
    onPress(keycap.id);
  }, [disabled, keycap.id, onPress, playSound, sound, soundEnabled, switchFeeling]);

  const scheduleGuardReset = useCallback(() => {
    if (guardTimerRef.current !== null) globalThis.clearTimeout(guardTimerRef.current);
    guardTimerRef.current = globalThis.setTimeout(() => {
      handledActivationRef.current = false;
      guardTimerRef.current = null;
    }, 0);
  }, []);

  useEffect(() => () => {
    if (guardTimerRef.current !== null) globalThis.clearTimeout(guardTimerRef.current);
  }, []);

  useEffect(() => {
    if (!disabled) return;
    const button = buttonRef.current;
    for (const pointerId of activePointerIdsRef.current) {
      if (button !== null && typeof button.hasPointerCapture === "function" && button.hasPointerCapture(pointerId)) {
        button.releasePointerCapture(pointerId);
      }
    }
    activePointerIdsRef.current.clear();
    keyboardActiveRef.current = false;
    handledActivationRef.current = false;
    setPressed(false);
  }, [disabled]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0) || activePointerIdsRef.current.has(event.pointerId)) return;
    activePointerIdsRef.current.add(event.pointerId);
    if (typeof event.currentTarget.setPointerCapture === "function") event.currentTarget.setPointerCapture(event.pointerId);
    handledActivationRef.current = true;
    setPressed(true);
    activate();
  };

  const releasePointer = (event: PointerEvent<HTMLButtonElement>) => {
    activePointerIdsRef.current.delete(event.pointerId);
    if (typeof event.currentTarget.hasPointerCapture === "function" && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPressed(keyboardActiveRef.current || activePointerIdsRef.current.size > 0);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    releasePointer(event);
    scheduleGuardReset();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    releasePointer(event);
    handledActivationRef.current = false;
  };

  const handleLostPointerCapture = (event: PointerEvent<HTMLButtonElement>) => {
    activePointerIdsRef.current.delete(event.pointerId);
    setPressed(keyboardActiveRef.current || activePointerIdsRef.current.size > 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key !== "Enter" && event.key !== " ") || event.repeat || keyboardActiveRef.current || disabled) return;
    event.preventDefault();
    keyboardActiveRef.current = true;
    handledActivationRef.current = true;
    setPressed(true);
    activate();
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    keyboardActiveRef.current = false;
    setPressed(activePointerIdsRef.current.size > 0);
    scheduleGuardReset();
  };

  const handleClick = () => {
    if (handledActivationRef.current) {
      handledActivationRef.current = false;
      return;
    }
    activate();
  };

  const handleBlur = () => {
    keyboardActiveRef.current = false;
    setPressed(activePointerIdsRef.current.size > 0);
  };

  return (
    <button ref={buttonRef} type="button" aria-label={accessibleLabel ?? keycap.name} aria-pressed={selected || pressed} disabled={disabled} data-keycap-id={keycap.id} data-pressed={pressed ? "true" : "false"} data-selected={selected ? "true" : "false"} className={`relative inline-grid max-w-full appearance-none place-items-center border-0 bg-transparent p-0 align-middle outline-none focus-visible:rounded-[18px] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-4 disabled:cursor-not-allowed disabled:opacity-[0.45] ${selected ? "rounded-[18px] ring-1 ring-black/15 ring-offset-4 ring-offset-transparent" : ""} ${className ?? ""}`} style={{ touchAction: "none" }} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onLostPointerCapture={handleLostPointerCapture} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onClick={handleClick} onBlur={handleBlur}>
      <KeycapVisual keycap={keycap} appearance={appearance} pressed={pressed} scale={scale} />
    </button>
  );
}
