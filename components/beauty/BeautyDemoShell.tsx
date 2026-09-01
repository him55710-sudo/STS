"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import BeautyDemoHeader from "@/components/beauty/BeautyDemoHeader";
import { BeautyPresentationGuide } from "@/components/beauty/BeautyPresentationGuide";
import { BeautyProcessTimeline } from "@/components/beauty/BeautyProcessTimeline";
import { BeautyProductSheet } from "@/components/beauty/BeautyProductSheet";
import { BeautyRoutineSheet } from "@/components/beauty/BeautyRoutineSheet";
import { BeautyStepCard } from "@/components/beauty/BeautyStepCard";
import { BeautyVideoPlayer } from "@/components/beauty/BeautyVideoPlayer";
import { useBeautyVideoController } from "@/hooks/useBeautyVideoController";
import {
  BEAUTY_DEMO_LOOK,
  BEAUTY_PRODUCTS,
} from "@/lib/beauty/demo-data";
import { BEAUTY_REGIONS, type BeautyApplicationStep, type BeautyRegion } from "@/lib/beauty/types";

type BeautyDemoShellProps = Readonly<{
  presentationMode?: boolean;
}>;

export function BeautyDemoShell({ presentationMode = false }: BeautyDemoShellProps) {
  const look = BEAUTY_DEMO_LOOK;
  const controller = useBeautyVideoController({
    videoSrc: look.videoSrc,
    finalLookStart: look.finalLookStart,
    finalLookEnd: look.finalLookEnd,
  });
  const [processRevealed, setProcessRevealed] = useState(false);
  const [showRevealHint, setShowRevealHint] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(presentationMode);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playStep = controller.playStep;
  const resetVideo = controller.reset;

  const selectedStep = useMemo(
    () => look.steps.find((step) => step.id === selectedStepId) ?? null,
    [look.steps, selectedStepId],
  );
  const selectedProduct = useMemo(
    () => BEAUTY_PRODUCTS.find((product) => product.id === selectedStep?.productId) ?? null,
    [selectedStep],
  );
  const similarProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return BEAUTY_PRODUCTS.filter((product) => selectedProduct.similarIds.includes(product.id));
  }, [selectedProduct]);
  const selectedRegion = selectedStep?.region ?? null;
  const pendingDemoData =
    look.steps.every((step) => step.startTime === null && step.endTime === null) &&
    BEAUTY_PRODUCTS.every((product) => product.id.endsWith("-pending"));
  const watched =
    controller.status === "step-complete" && controller.activeStep?.id === selectedStep?.id;

  const revealProcess = useCallback(() => {
    setProcessRevealed(true);
    setShowRevealHint(true);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setShowRevealHint(false), 1300);
  }, []);

  const selectStep = useCallback(
    (step: BeautyApplicationStep) => {
      setProcessRevealed(true);
      setSelectedStepId(step.id);
      setProductOpen(false);
      setRoutineOpen(false);
      playStep(step);
    },
    [playStep],
  );

  const reset = useCallback(() => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setProcessRevealed(false);
    setShowRevealHint(false);
    setSelectedStepId(null);
    setProductOpen(false);
    setRoutineOpen(false);
    setGuideOpen(false);
    resetVideo();
  }, [resetVideo]);

  const selectRegion = useCallback(
    (region: BeautyRegion) => {
      const step = look.steps.find((candidate) => candidate.region === region);
      if (step) selectStep(step);
    },
    [look.steps, selectStep],
  );

  const openProduct = useCallback(() => setProductOpen(true), []);
  const closeProduct = useCallback(() => setProductOpen(false), []);
  const openRoutine = useCallback(() => setRoutineOpen(true), []);
  const closeRoutine = useCallback(() => setRoutineOpen(false), []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const viewRoutineFromProduct = useCallback(() => {
    setProductOpen(false);
    setRoutineOpen(true);
  }, []);
  const replaySelectedStep = useCallback(() => {
    if (selectedStep) playStep(selectedStep);
  }, [playStep, selectedStep]);

  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const key = event.key.toLowerCase();
    if (key === "r") reset();
    if (key === "p") setGuideOpen((open) => !open);
    const regionIndex = Number.parseInt(event.key, 10) - 1;
    if (regionIndex >= 0 && regionIndex < BEAUTY_REGIONS.length) {
      selectRegion(BEAUTY_REGIONS[regionIndex]);
    }
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => handleShortcut(event);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    [],
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone sm:p-4">
      <section
        className="beauty-phone-frame relative flex h-dvh max-h-[844px] w-full max-w-[390px] flex-col overflow-hidden bg-beauty-veil text-white sm:h-[min(844px,calc(100dvh-32px))] sm:rounded-[28px] sm:border sm:border-line"
        aria-label="STS Beauty process commerce demo"
        data-testid="beauty-demo-shell"
      >
        <BeautyDemoHeader onReset={reset} />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <BeautyVideoPlayer
            look={look}
            controller={controller}
            processRevealed={processRevealed}
            onRevealProcess={revealProcess}
          />

          {showRevealHint ? (
            <p
              className="beauty-hint-enter pointer-events-none absolute left-1/2 top-[48%] z-30 -translate-x-1/2 rounded-full bg-ink/70 px-4 py-2 text-center text-[13px] font-semibold shadow-sm backdrop-blur-sm"
              role="status"
            >
              이 룩이 만들어진 과정
            </p>
          ) : null}

          {selectedStep && watched ? (
            <BeautyStepCard
              step={selectedStep}
              product={selectedProduct}
              watched={watched}
              onReplay={replaySelectedStep}
              onViewProduct={openProduct}
            />
          ) : null}

          {processRevealed ? (
            <>
              <BeautyProcessTimeline
                steps={look.steps}
                selectedRegion={selectedRegion}
                selectedStepId={selectedStepId}
                onSelectStep={selectStep}
              />
              {pendingDemoData ? (
                <button
                  type="button"
                  className="absolute bottom-[170px] right-4 z-[45] flex min-h-11 items-center rounded-full border border-line bg-surface/90 px-3 text-[11px] font-semibold text-ink shadow-sm backdrop-blur"
                  onClick={openRoutine}
                >
                  루틴 구조 보기
                </button>
              ) : null}
            </>
          ) : null}

          {productOpen && selectedStep ? (
            <BeautyProductSheet
              step={selectedStep}
              product={selectedProduct}
              similarProducts={similarProducts}
              onClose={closeProduct}
              onViewRoutine={viewRoutineFromProduct}
            />
          ) : null}

          {routineOpen ? (
            <BeautyRoutineSheet
              steps={look.steps}
              products={BEAUTY_PRODUCTS}
              selectedStepId={selectedStepId}
              onSelectStep={selectStep}
              onClose={closeRoutine}
            />
          ) : null}

          {guideOpen ? <BeautyPresentationGuide onClose={closeGuide} /> : null}
        </div>
      </section>
    </main>
  );
}

export default BeautyDemoShell;
