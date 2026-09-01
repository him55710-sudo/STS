"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { BeautyApplicationStep } from "@/lib/beauty/types";

export type BeautyPlaybackStatus = "loading" | "final-loop" | "paused" | "step-playing" | "step-complete" | "segment-unavailable" | "media-unavailable";

type TimeSegment = { readonly start: number; readonly end: number };

type ActiveSegment =
  | { readonly kind: "final-look"; readonly timing: TimeSegment }
  | { readonly kind: "step"; readonly timing: TimeSegment; readonly step: BeautyApplicationStep };

type PauseReason = "complete" | "state-change" | null;

export type BeautyVideoControllerOptions = Readonly<{
  videoSrc: string | null; finalLookStart: number | null; finalLookEnd: number | null;
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

export function useBeautyVideoController({ videoSrc, finalLookStart, finalLookEnd }: BeautyVideoControllerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeSegmentRef = useRef<ActiveSegment | null>(null);
  const pendingStepRef = useRef<BeautyApplicationStep | null>(null);
  const pauseReasonRef = useRef<PauseReason>(null);
  const completionHandledRef = useRef(false);
  const [status, setStatus] = useState<BeautyPlaybackStatus>(
    sourceIsPresent(videoSrc) ? "loading" : "media-unavailable",
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState<BeautyApplicationStep | null>(null);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(
    sourceIsPresent(videoSrc) ? null : "영상 소스가 준비되지 않았습니다.",
  );

  const requestPlay = useCallback((video: HTMLVideoElement) => {
    void video.play().catch((reason: unknown) => {
      setIsPlaying(false);
      if (reason instanceof DOMException && reason.name === "NotAllowedError") {
        setStatus("paused");
        return;
      }
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setStatus("media-unavailable");
      setUnavailableMessage(
        reason instanceof Error
          ? "영상 재생을 시작할 수 없습니다."
          : "영상 재생 상태를 확인할 수 없습니다.",
      );
    });
  }, []);

  const startFinalLoop = useCallback(
    (video: HTMLVideoElement) => {
      const timing = resolveSegment(finalLookStart, finalLookEnd, video.duration);
      setActiveStep(null);
      setProgress(0);
      completionHandledRef.current = false;
      if (timing === null) {
        pauseReasonRef.current = "state-change";
        video.pause();
        activeSegmentRef.current = null;
        setStatus("segment-unavailable");
        setUnavailableMessage("최종 룩 구간의 수동 검증 타임스탬프가 필요합니다.");
        return;
      }
      activeSegmentRef.current = { kind: "final-look", timing };
      video.currentTime = timing.start;
      setCurrentTime(timing.start);
      setUnavailableMessage(null);
      requestPlay(video);
    },
    [finalLookEnd, finalLookStart, requestPlay],
  );

  const startStep = useCallback(
    (video: HTMLVideoElement, step: BeautyApplicationStep) => {
      const timing = resolveSegment(step.startTime, step.endTime, video.duration);
      setActiveStep(step);
      setProgress(0);
      completionHandledRef.current = false;
      if (timing === null) {
        pauseReasonRef.current = "state-change";
        video.pause();
        activeSegmentRef.current = null;
        setStatus("segment-unavailable");
        setUnavailableMessage("이 단계의 수동 검증 타임스탬프가 필요합니다.");
        return;
      }
      activeSegmentRef.current = { kind: "step", timing, step };
      video.currentTime = timing.start;
      setCurrentTime(timing.start);
      setUnavailableMessage(null);
      requestPlay(video);
    },
    [requestPlay],
  );

  const playStep = useCallback(
    (step: BeautyApplicationStep) => {
      const video = videoRef.current;
      setActiveStep(step);
      if (status === "media-unavailable" || !sourceIsPresent(videoSrc) || (video !== null && video.error !== null)) {
        pendingStepRef.current = null;
        setStatus("media-unavailable");
        setUnavailableMessage("영상 파일을 불러올 수 없습니다.");
        return;
      }
      if (video === null || video.readyState === 0) {
        pendingStepRef.current = step;
        setStatus("loading");
        setUnavailableMessage("영상 메타데이터를 불러오는 중입니다.");
        return;
      }
      pendingStepRef.current = null;
      startStep(video, step);
    },
    [startStep, status, videoSrc],
  );

  const reset = useCallback(() => {
    pendingStepRef.current = null;
    setActiveStep(null);
    const video = videoRef.current;
    if (!sourceIsPresent(videoSrc)) {
      setStatus("media-unavailable");
      setUnavailableMessage("영상 소스가 준비되지 않았습니다.");
      return;
    }
    if (video === null) {
      setStatus("loading");
      setUnavailableMessage(null);
      return;
    }
    if (video.readyState === 0) {
      setStatus("loading");
      setUnavailableMessage(null);
      pauseReasonRef.current = "state-change";
      video.load();
      return;
    }
    startFinalLoop(video);
  }, [startFinalLoop, videoSrc]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (video === null || status === "loading" || status === "media-unavailable") return;
    if (!video.paused) {
      video.pause();
      return;
    }
    const activeSegment = activeSegmentRef.current;
    if (activeSegment === null) {
      startFinalLoop(video);
      return;
    }
    const { start, end } = activeSegment.timing;
    if (video.currentTime < start || video.currentTime >= end) video.currentTime = start;
    completionHandledRef.current = false;
    setProgress(Math.max(0, Math.min(1, (video.currentTime - start) / (end - start))));
    requestPlay(video);
  }, [requestPlay, startFinalLoop, status]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video === null) return;
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
    activeSegmentRef.current = null;
    pendingStepRef.current = null;
    setIsPlaying(false);
    setStatus("media-unavailable");
    setUnavailableMessage("영상 파일을 불러올 수 없습니다.");
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    activeSegmentRef.current = null;
    pendingStepRef.current = null;
    setActiveStep(null);
    setCurrentTime(0);
    setProgress(0);
    setIsPlaying(false);
    setStatus(sourceIsPresent(videoSrc) ? "loading" : "media-unavailable");
    setUnavailableMessage(
      sourceIsPresent(videoSrc) ? null : "영상 소스가 준비되지 않았습니다.",
    );
    if (video !== null) {
      pauseReasonRef.current = "state-change";
      video.pause();
      video.load();
    }
  }, [finalLookEnd, finalLookStart, videoSrc]);

  return {
    videoRef, status, isPlaying, currentTime, progress, activeStep, unavailableMessage,
    togglePlayback, playStep, reset,
    videoHandlers: {
      onLoadedMetadata, onTimeUpdate, onPlay, onPause, onError, onEnded: onTimeUpdate,
    },
  };
}

export type BeautyVideoController = ReturnType<typeof useBeautyVideoController>;
