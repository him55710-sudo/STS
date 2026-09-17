"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import BeautyDemoHeader from "@/components/beauty/BeautyDemoHeader";
import { BeautyPresentationGuide } from "@/components/beauty/BeautyPresentationGuide";
import { BeautyProcessTimeline } from "@/components/beauty/BeautyProcessTimeline";
import { BeautyProductSheet } from "@/components/beauty/BeautyProductSheet";
import { BeautyRoutineSheet } from "@/components/beauty/BeautyRoutineSheet";
import { BeautyStepCard } from "@/components/beauty/BeautyStepCard";
import { BeautyVideoPlayer } from "@/components/beauty/BeautyVideoPlayer";
import { BeautyCheckoutSettlementModal } from "@/components/beauty/BeautyCheckoutSettlementModal";
import { useBeautyVideoController } from "@/hooks/useBeautyVideoController";
import { AttributionEngine } from "@/lib/analytics/attribution-engine";
import { Sparkles, Layers } from "lucide-react";
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

  // Checkout and Settlement Modal State (PDF 13p 8번)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    orderTitle: string;
    orderAmount: number;
    itemCount: number;
  }>({
    orderTitle: "",
    orderAmount: 0,
    itemCount: 0,
  });

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

  const watched =
    controller.status === "step-complete" && controller.activeStep?.id === selectedStep?.id;

  // Track step completion
  useEffect(() => {
    if (watched && selectedStep) {
      AttributionEngine.track({
        type: "watch_step",
        stepId: selectedStep.id,
        creatorHandle: look.creatorHandle,
        region: selectedStep.region,
        productId: selectedStep.productId,
      });
    }
  }, [watched, selectedStep, look.creatorHandle]);

  const revealProcess = useCallback(() => {
    setProcessRevealed(true);
    setShowRevealHint(true);
    AttributionEngine.track({
      type: "view_look",
      creatorHandle: look.creatorHandle,
    });
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setShowRevealHint(false), 1400);
  }, [look.creatorHandle]);

  const selectStep = useCallback(
    (step: BeautyApplicationStep) => {
      setProcessRevealed(true);
      setSelectedStepId(step.id);
      setProductOpen(false);
      setRoutineOpen(false);
      AttributionEngine.track({
        type: "select_step",
        stepId: step.id,
        region: step.region,
        creatorHandle: look.creatorHandle,
        productId: step.productId,
      });
      playStep(step);
    },
    [look.creatorHandle, playStep],
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
      AttributionEngine.track({
        type: "touch_region",
        region,
        creatorHandle: look.creatorHandle,
      });
      const step = look.steps.find((candidate) => candidate.region === region);
      if (step) selectStep(step);
    },
    [look.creatorHandle, look.steps, selectStep],
  );

  const openProduct = useCallback(() => {
    setProductOpen(true);
    if (selectedProduct) {
      AttributionEngine.track({
        type: "view_product",
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        creatorHandle: look.creatorHandle,
        amount: selectedProduct.price ?? 0,
      });
    }
  }, [look.creatorHandle, selectedProduct]);

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

  // Checkout bundle handler (PDF 13p 6번, 8번)
  const handleCheckoutBundle = useCallback(
    (amount: number, count: number, title: string) => {
      AttributionEngine.track({
        type: "bundle_add_to_cart",
        amount,
        creatorHandle: look.creatorHandle,
      });
      AttributionEngine.track({
        type: "checkout_completed",
        amount,
        creatorHandle: look.creatorHandle,
        metadata: { title, count },
      });
      setCheckoutData({
        orderTitle: title,
        orderAmount: amount,
        itemCount: count,
      });
      setRoutineOpen(false);
      setCheckoutModalOpen(true);
    },
    [look.creatorHandle],
  );

  // Checkout single product handler
  const handleCheckoutSingle = useCallback(
    (amount: number, count: number, title: string) => {
      AttributionEngine.track({
        type: "add_to_cart",
        amount,
        creatorHandle: look.creatorHandle,
        productId: selectedProduct?.id,
        productName: selectedProduct?.name,
      });
      AttributionEngine.track({
        type: "checkout_completed",
        amount,
        creatorHandle: look.creatorHandle,
        productId: selectedProduct?.id,
        metadata: { title, count },
      });
      setCheckoutData({
        orderTitle: title,
        orderAmount: amount,
        itemCount: count,
      });
      setProductOpen(false);
      setCheckoutModalOpen(true);
    },
    [look.creatorHandle, selectedProduct],
  );

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
    <main className="flex min-h-dvh items-center justify-center bg-[#0d0d12] sm:p-4">
      <section
        className="beauty-phone-frame relative flex h-dvh max-h-[844px] w-full max-w-[390px] flex-col overflow-hidden bg-beauty-veil text-white sm:h-[min(844px,calc(100dvh-32px))] sm:rounded-[28px] sm:border sm:border-white/10 shadow-2xl"
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
            onSelectRegion={selectRegion}
          />

          {showRevealHint ? (
            <div
              className="beauty-hint-enter pointer-events-none absolute left-1/2 top-[45%] z-30 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-center text-xs font-bold text-white shadow-xl backdrop-blur border border-white/20"
              role="status"
            >
              ✨ 이 룩이 만들어진 과정 공개
            </div>
          ) : null}

          {/* Floating Routine Button (PDF 13p) */}
          {processRevealed && (
            <button
              type="button"
              onClick={openRoutine}
              className="absolute top-3 right-3 z-30 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-md border border-white/20 hover:bg-black/90 transition-all active:scale-95"
            >
              <Layers size={13} className="text-beauty-ink" />
              전체 루틴 (5)
            </button>
          )}

          {/* Bottom Card after step playback completes */}
          {selectedStep && watched ? (
            <BeautyStepCard
              step={selectedStep}
              product={selectedProduct}
              watched={watched}
              onReplay={replaySelectedStep}
              onViewProduct={openProduct}
            />
          ) : null}

          {/* Process Timeline Bottom Scroller */}
          {processRevealed ? (
            <BeautyProcessTimeline
              steps={look.steps}
              selectedRegion={selectedRegion}
              selectedStepId={selectedStepId}
              onSelectStep={selectStep}
            />
          ) : null}

          {/* Product Sheet (PDF 13p 4, 7) */}
          {productOpen && selectedStep ? (
            <BeautyProductSheet
              step={selectedStep}
              product={selectedProduct}
              similarProducts={similarProducts}
              onClose={closeProduct}
              onViewRoutine={viewRoutineFromProduct}
              onCheckoutProduct={handleCheckoutSingle}
            />
          ) : null}

          {/* Routine Sheet (PDF 13p 5, 6) */}
          {routineOpen ? (
            <BeautyRoutineSheet
              steps={look.steps}
              products={BEAUTY_PRODUCTS}
              selectedStepId={selectedStepId}
              onSelectStep={selectStep}
              onClose={closeRoutine}
              onCheckoutBundle={handleCheckoutBundle}
            />
          ) : null}

          {/* Checkout & Creator Settlement Modal (PDF 13p 8, PDF 10p) */}
          <BeautyCheckoutSettlementModal
            isOpen={checkoutModalOpen}
            onClose={() => setCheckoutModalOpen(false)}
            orderTitle={checkoutData.orderTitle}
            orderAmount={checkoutData.orderAmount}
            itemCount={checkoutData.itemCount}
            creatorHandle={look.creatorHandle}
            creatorName={look.creatorName}
          />

          {guideOpen ? <BeautyPresentationGuide onClose={closeGuide} /> : null}
        </div>
      </section>
    </main>
  );
}

export default BeautyDemoShell;
