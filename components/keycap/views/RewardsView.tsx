"use client";

import { KeycapVisual } from "@/components/keycap/KeycapVisual";
import { useKeycapStore } from "@/lib/keycap-store";
import {
  DAILY_ELIGIBLE_PRESS_LIMIT,
  KEYCAP_REWARD_TARGET,
} from "@/lib/keycap-state";
import { KEYCAPS } from "@/lib/keycaps";

const FALLBACK_KEYCAP = KEYCAPS[0];

export function RewardsView() {
  const hasHydrated = useKeycapStore((state) => state.hasHydrated);
  const rewardLedger = useKeycapStore((state) => state.rewardLedger);
  const rewardProgress = useKeycapStore((state) => state.rewardProgress);
  const selectedKeycapId = useKeycapStore((state) => state.selectedKeycapId);
  const studio = useKeycapStore((state) => state.studio);

  if (!hasHydrated) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading physical reward progress"
        className="min-h-dvh bg-tactile-canvas"
      />
    );
  }

  const selectedKeycap = KEYCAPS.find((keycap) => keycap.id === selectedKeycapId) ?? FALLBACK_KEYCAP;
  const studioVisualProps = studio.keycapId === selectedKeycapId
    ? { appearance: studio }
    : {};
  const progressPercent = Math.round(rewardProgress * 100);
  const milestoneComplete = rewardLedger.eligiblePresses >= KEYCAP_REWARD_TARGET;
  const milestoneRemaining = Math.max(0, KEYCAP_REWARD_TARGET - rewardLedger.eligiblePresses);
  const dailyRemaining = Math.max(
    0,
    DAILY_ELIGIBLE_PRESS_LIMIT - rewardLedger.dailyEligiblePresses,
  );
  const deliverySteps = [
    {
      title: "Local milestone",
      detail: milestoneComplete ? "Complete on this device" : `${milestoneRemaining.toLocaleString("en-US")} presses remaining`,
      state: milestoneComplete ? "complete" : "current",
    },
    {
      title: "Server verification",
      detail: milestoneComplete ? "Awaiting server verification." : "Begins after the milestone",
      state: milestoneComplete ? "current" : "pending",
    },
    { title: "Shipping eligibility", detail: "Address and region checks pending", state: "pending" },
    { title: "Delivery", detail: "No physical item has been reserved", state: "pending" },
  ] as const;
  const markerClasses = {
    complete: "bg-tactile-success",
    current: "bg-tactile-unlock",
    pending: "bg-tactile-line",
  } as const;

  return (
    <section
      aria-labelledby="rewards-title"
      className="min-h-dvh bg-tactile-canvas px-4 pb-12 pt-6 text-tactile-ink sm:px-6 sm:pt-10"
    >
      <div className="mx-auto w-full max-w-[960px]">
        <header className="border-b border-tactile-line pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-tactile-muted">
            Physical drop
          </p>
          <h1
            id="rewards-title"
            className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl"
          >
            Reward progress
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-tactile-muted">
            This device stores a local-only activity record. A future server check is required before shipping can begin.
          </p>
        </header>

        <div className="grid gap-8 py-7 md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)] md:gap-10">
          <div>
            <section aria-labelledby="local-progress-title">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p id="local-progress-title" className="text-sm font-semibold">
                    Local physical-drop progress
                  </p>
                  <p className="mt-1 text-xs text-tactile-muted">
                    {rewardLedger.eligiblePresses.toLocaleString("en-US")} of {KEYCAP_REWARD_TARGET.toLocaleString("en-US")} eligible presses
                  </p>
                </div>
                <p className="text-4xl font-bold tabular-nums tracking-[-0.06em]">
                  {progressPercent}%
                </p>
              </div>

              <div
                role="progressbar"
                aria-label="Local physical drop progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                className="mt-5 h-2 overflow-hidden bg-tactile-line"
              >
                <div
                  className="h-full origin-left bg-tactile-progress transition-transform duration-200 motion-reduce:transition-none"
                  style={{ transform: `scaleX(${rewardProgress})` }}
                />
              </div>
            </section>

            <dl className="mt-8 grid grid-cols-2 border-y border-tactile-line sm:grid-cols-3">
              <div className="border-b border-r border-tactile-line px-3 py-4 sm:border-b-0">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-tactile-muted">
                  Eligible presses
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums">
                  {rewardLedger.eligiblePresses.toLocaleString("en-US")}
                </dd>
              </div>
              <div className="border-b border-tactile-line px-3 py-4 sm:border-b-0 sm:border-r">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-tactile-muted">
                  Today&apos;s cap
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums">
                  {rewardLedger.dailyEligiblePresses.toLocaleString("en-US")} / {DAILY_ELIGIBLE_PRESS_LIMIT.toLocaleString("en-US")}
                </dd>
                <dd className="mt-0.5 text-[11px] text-tactile-muted">
                  {dailyRemaining.toLocaleString("en-US")} remaining
                </dd>
              </div>
              <div className="col-span-2 px-3 py-4 sm:col-span-1">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-tactile-muted">
                  Burst review hooks
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums">
                  {rewardLedger.suspiciousPresses.toLocaleString("en-US")}
                </dd>
                <dd className="mt-0.5 text-[11px] text-tactile-muted">Local rapid-interval signals</dd>
              </div>
            </dl>

            <section aria-labelledby="verification-title" className="border-b border-tactile-line py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="verification-title" className="text-sm font-semibold">Verification boundary</h2>
                <span className="rounded-full bg-tactile-raised px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-tactile-unlock">
                  {milestoneComplete ? "Awaiting server verification" : "Milestone in progress"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-tactile-muted">
                The {rewardLedger.verification} ledger is not proof of eligibility. Burst signals are review hooks only; future server-side rules must evaluate activity before a shipping decision exists.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-tactile-muted">Milestone requirement</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{KEYCAP_REWARD_TARGET.toLocaleString("en-US")} eligible presses</dd>
                </div>
                <div>
                  <dt className="text-tactile-muted">Shipping eligibility</dt>
                  <dd className="mt-1 font-semibold">{milestoneComplete ? "Awaiting server verification." : "Not eligible — milestone incomplete"}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="delivery-title" className="pt-6">
              <h2 id="delivery-title" className="text-sm font-semibold">Delivery state</h2>
              <ol className="mt-5 grid sm:grid-cols-4">
                {deliverySteps.map((step) => (
                  <li
                    key={step.title}
                    aria-current={step.state === "current" ? "step" : undefined}
                    className="relative border-l border-tactile-line pb-6 pl-5 last:pb-0 sm:border-l-0 sm:border-t sm:pb-0 sm:pl-0 sm:pr-5 sm:pt-5"
                  >
                    <span aria-hidden="true" className={`absolute -left-1.5 top-0 h-3 w-3 rounded-full sm:-top-1.5 sm:left-0 ${markerClasses[step.state]}`} />
                    <p className="text-xs font-semibold">{step.title}</p>
                    <p className="mt-1 text-[11px] leading-4 text-tactile-muted">{step.detail}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside aria-labelledby="selected-reward-title" className="border-t border-tactile-line pt-7 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-tactile-muted">
              Digital to physical
            </p>
            <div className="mt-5 grid min-h-52 grid-rows-[1fr_auto_1fr] items-center overflow-hidden rounded-tactile-frame border border-tactile-line bg-tactile-raised">
              <div className="flex flex-col items-center p-3 text-center">
                <KeycapVisual keycap={selectedKeycap} scale="card" {...studioVisualProps} />
                <span className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-tactile-muted">Digital</span>
              </div>
              <span className="border-y border-tactile-line px-2 py-2 text-center text-tactile-muted" aria-hidden="true">↓</span>
              <div className="flex flex-col items-center p-3 text-center">
                <div className="opacity-90 saturate-[0.86]">
                  <KeycapVisual keycap={selectedKeycap} scale="card" {...studioVisualProps} />
                </div>
                <span className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-tactile-muted">Physical concept</span>
              </div>
            </div>
            <h2 id="selected-reward-title" className="mt-5 text-lg font-bold tracking-[-0.025em]">
              {selectedKeycap.name}
            </h2>
            <p className="mt-1 text-xs text-tactile-muted">
              {selectedKeycap.collection} · {selectedKeycap.material} · {selectedKeycap.profile}
            </p>
            <p className="mt-3 text-xs leading-5 text-tactile-muted">
              Concept visualization only. The physical item is not manufactured, reserved, or guaranteed.
            </p>

            <p role="status" className="mt-6 text-sm font-semibold text-tactile-unlock">
              {milestoneComplete
                ? "You unlocked this keycap in real life."
                : `${milestoneRemaining.toLocaleString("en-US")} eligible presses to go`}
            </p>
            {milestoneComplete ? (
              <p className="mt-1 text-xs font-semibold text-tactile-muted">Awaiting server verification.</p>
            ) : null}

            <button
              type="button"
              disabled
              aria-describedby="claim-note"
              className="mt-6 min-h-11 w-full cursor-not-allowed rounded-btn border border-tactile-line bg-tactile-raised px-4 text-sm font-semibold text-tactile-muted opacity-70"
            >
              Claim physical keycap
            </button>
            <p id="claim-note" className="mt-3 text-xs leading-5 text-tactile-muted">
              Disabled even at 100% until server claim verification is implemented.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
