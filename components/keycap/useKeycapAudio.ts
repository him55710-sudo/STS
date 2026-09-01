"use client";

import type { KeycapSoundPreset } from "@/lib/keycap-types";

export type KeycapAudioPlayer = (preset: KeycapSoundPreset) => void;

type AudioPresetSpec = {
  readonly waveform: OscillatorType;
  readonly frequency: number;
  readonly pitchDrop: number;
  readonly decay: number;
  readonly filter: BiquadFilterType;
  readonly filterFrequency: number;
  readonly resonance: number;
  readonly gain: number;
};

const AUDIO_PRESETS = {
  creamy: { waveform: "sine", frequency: 168, pitchDrop: 0.88, decay: 0.19, filter: "lowpass", filterFrequency: 920, resonance: 0.7, gain: 0.14 },
  thock: { waveform: "triangle", frequency: 96, pitchDrop: 0.72, decay: 0.25, filter: "lowpass", filterFrequency: 510, resonance: 1.4, gain: 0.2 },
  clack: { waveform: "square", frequency: 430, pitchDrop: 0.94, decay: 0.065, filter: "highpass", filterFrequency: 1_260, resonance: 0.9, gain: 0.075 },
  marble: { waveform: "sine", frequency: 252, pitchDrop: 1.22, decay: 0.31, filter: "bandpass", filterFrequency: 1_480, resonance: 4.8, gain: 0.11 },
  poppy: { waveform: "square", frequency: 338, pitchDrop: 1.08, decay: 0.085, filter: "peaking", filterFrequency: 2_180, resonance: 2.6, gain: 0.065 },
  silent: { waveform: "sine", frequency: 120, pitchDrop: 1, decay: 0.04, filter: "lowpass", filterFrequency: 240, resonance: 0.2, gain: 0 },
  tactile: { waveform: "sawtooth", frequency: 186, pitchDrop: 0.82, decay: 0.13, filter: "bandpass", filterFrequency: 840, resonance: 3.2, gain: 0.09 },
  custom: { waveform: "triangle", frequency: 286, pitchDrop: 1.14, decay: 0.21, filter: "notch", filterFrequency: 1_740, resonance: 6.2, gain: 0.1 },
} as const satisfies Readonly<Record<KeycapSoundPreset, AudioPresetSpec>>;

const audioRuntime: { context: AudioContext | null } = { context: null };

const playPreset: KeycapAudioPlayer = (preset) => {
  const spec = AUDIO_PRESETS[preset];
  if (spec.gain === 0 || typeof window === "undefined" || typeof window.AudioContext !== "function") return;

  let context = audioRuntime.context;
  if (context === null || context.state === "closed") {
    context = new window.AudioContext();
    audioRuntime.context = context;
  }
  if (context.state === "suspended") void context.resume();

  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const now = context.currentTime;
  oscillator.type = spec.waveform;
  oscillator.frequency.setValueAtTime(spec.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(spec.frequency * spec.pitchDrop, now + spec.decay);
  filter.type = spec.filter;
  filter.frequency.setValueAtTime(spec.filterFrequency, now);
  filter.Q.setValueAtTime(spec.resonance, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(spec.gain, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.decay);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + spec.decay + 0.02);
};

export function useKeycapAudio(): KeycapAudioPlayer {
  return playPreset;
}
