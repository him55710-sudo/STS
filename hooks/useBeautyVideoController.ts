"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BeautyApplicationStep } from "@/lib/beauty/types";

export type BeautyPlaybackStatus =
  | "loading"
  | "final-loop"
  | "paused"
  | "step-playing"
  | "step-complete"
  | "segment-unavailable"
  | "media-unavailable";

type TimeSegment = { readonly start: number; readonly end: number };

type ActiveSegment =
  | { readonly kind: "final-look"; readonly timing: TimeSegment }
  | { readonly kind: "step"; readonly timing: TimeSegment; readonly step: BeautyApplicationStep };

type PauseReason = "complete" | "state-change" | null;

export type BeautyVideoControllerOptions = Readonly<{
  videoSrc: string | null;
  finalLookStart: number | null;
  finalLookEnd: number | null;
}>;

function resolveSegment(start: number | null, end: number | null, duration: number): TimeSegment | null {
  if (start === null || end === null || !Number.isFinite(duration)) return null;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || end <= start || end > duration) return null;
  return { start, end };
}

function sourceIsPresent(videoSrc: string | null): boolean {
  return videoSrc !== null && videoSrc.trim().length > 0;
}

export function useBeautyVideoController({
  videoSrc,
  finalLookStart,
  finalLookEnd,
}: BeautyVideoControllerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeSegmentRef = useRef<ActiveSegment | null>(null);
  const pendingStepRef = useRef<BeautyApplicationStep | null>(null);
  const pauseReasonRef = useRef<PauseReason>(null);
  const completionHandledRef = useRef(false);
  const simulationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<BeautyPlaybackStatus>("final-loop");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState<BeautyApplicationStep | null>(null);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);

  const clearSimulation = useCallback(() => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
  }, []);

  const runSimulatedStep = useCallback((step: BeautyApplicationStep) => {
    clearSimulation();
    setActiveStep(step);
    setIsPlaying(true);
    setStatus("step-playing");
    setProgress(0);
    setUnavailableMessage(null);

    const durationMs = 3500;
    const intervalMs = 50;
    const totalTicks = durationMs / intervalMs;
    let currentTick = 0;

    simulationTimerRef.current = setInterval(() => {
      currentTick += 1;
      const currentProgress = Math.min(1, currentTick / totalTicks);
      setProgress(currentProgress);
      setCurrentTime((step.startTime ?? 0) + currentProgress * ((step.endTime ?? 5) - (step.startTime ?? 0)));

      if (currentTick >= totalTicks) {
        clearSimulation();
        setIsPlaying(false);
        setStatus("step-complete");
      }
    }, intervalMs);
  }, [clearSimulation]);

  const requestPlay = useCallback((video: HTMLVideoElement) => {
    void video.play().catch(() => {
      setIsPlaying(false);
      setStatus("paused");
    });
  }, []);

  const startFinalLoop = useCallback(
    (video: HTMLVideoElement) => {
      clearSimulation();
      setActiveStep(null);
      setProgress(0);
      completionHandledRef.current = false;
      const timing = resolveSegment(finalLookStart, finalLookEnd, video.duration);
      if (timing === null) {
        activeSegmentRef.current = null;
        setStatus("final-loop");
        return;
      }
      activeSegmentRef.current = { kind: "final-look", timing };
      video.currentTime = timing.start;
      setCurrentTime(timing.start);
      requestPlay(video);
    },
    [clearSimulation, finalLookEnd, finalLookStart, requestPlay],
  );

  const startStep = useCallback(
    (video: HTMLVideoElement, step: BeautyApplicationStep) => {
      clearSimulation();
      const timing = resolveSegment(step.startTime, step.endTime, video.duration);
      setActiveStep(step);
      setProgress(0);
      completionHandledRef.current = false;
      if (timing === null) {
        runSimulatedStep(step);
        return;
      }
      activeSegmentRef.current = { kind: "step", timing, step };
      video.currentTime = timing.start;
      setCurrentTime(timing.start);
      requestPlay(video);
    },
    [clearSimulation, requestPlay, runSimulatedStep],
  );

  const playStep = useCallback(
    (step: BeautyApplicationStep) => {
      setActiveStep(step);
      const video = videoRef.current;
      if (!video || !sourceIsPresent(videoSrc) || video.error || video.readyState < 2) {
        runSimulatedStep(step);
        return;
      }
      startStep(video, step);
    },
    [runSimulatedStep, startStep, videoSrc],
  );

  const reset = useCallback(() => {
    clearSimulation();
    pendingStepRef.current = null;
    setActiveStep(null);
    setIsPlaying(false);
    setProgress(0);
    setStatus("final-loop");
    const video = videoRef.current;
    if (video) {
      pauseReasonRef.current = "state-change";
      video.currentTime = 0;
      video.pause();
    }
  }, [clearSimulation]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      setIsPlaying((prev) => !prev);
      return;
    }
    if (!video.paused) {
      video.pause();
      return;
    }
    requestPlay(video);
  }, [requestPlay]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const pendingStep = pendingStepRef.current;
    pendingStepRef.current = null;
    if (pendingStep !== null) {
      startStep(video, pendingStep);
      return;
    }
    startFinalLoop(video);
  }, [startFinalLoop, startStep]);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    const activeSegment = activeSegmentRef.current;
    if (video === null || activeSegment === null) return;
    const { start, end } = activeSegment.timing;
    setCurrentTime(video.currentTime);
    setProgress(Math.max(0, Math.min(1, (video.currentTime - start) / (end - start))));
    if (video.currentTime < end) return;
    if (activeSegment.kind === "final-look") {
      video.currentTime = start;
      setCurrentTime(start);
      setProgress(0);
      return;
    }
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;
    video.currentTime = end;
    pauseReasonRef.current = "complete";
    video.pause();
    setIsPlaying(false);
    setProgress(1);
    setStatus("step-complete");
  }, []);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
    setUnavailableMessage(null);
    setStatus(activeSegmentRef.current?.kind === "step" ? "step-playing" : "final-loop");
  }, []);

  const onPause = useCallback(() => {
    const pauseReason = pauseReasonRef.current;
    pauseReasonRef.current = null;
    setIsPlaying(false);
    if (pauseReason !== null) return;
    setStatus("paused");
  }, []);

  const onError = useCallback(() => {
    // If video element encounters error, fallback smoothly to simulation
    activeSegmentRef.current = null;
    pendingStepRef.current = null;
    setIsPlaying(false);
    setStatus("final-loop");
  }, []);

  useEffect(() => {
    return () => {
      clearSimulation();
    };
  }, [clearSimulation]);

  return {
    videoRef,
    status,
    isPlaying,
    currentTime,
    progress,
    activeStep,
    unavailableMessage,
    togglePlayback,
    playStep,
    reset,
    videoHandlers: {
      onLoadedMetadata,
      onTimeUpdate,
      onPlay,
      onPause,
      onError,
      onEnded: onTimeUpdate,
    },
  };
}

export type BeautyVideoController = ReturnType<typeof useBeautyVideoController>;
