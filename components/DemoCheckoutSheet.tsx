"use client";

import { useState } from "react";
import { canUseDemoPayment } from "@/lib/demo-payment";
import { won } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { DemoPaymentAccount } from "@/lib/demo-payment";
import type { Product } from "@/lib/types";
import { CheckIcon, ChevronLeftIcon, XIcon } from "./Icons";

type CheckoutStage = "summary" | "connect" | "complete";

type DemoCheckoutSheetProps = {
  readonly product: Product;
  readonly onClose: () => void;
};

export default function DemoCheckoutSheet({ product, onClose }: DemoCheckoutSheetProps) {
  const [stage, setStage] = useState<CheckoutStage>("summary");
  const account = useApp((state) => state.demoPaymentAccount);
  const connectDemoPaymentAccount = useApp((state) => state.connectDemoPaymentAccount);

  const startAccountConnection = () => setStage("connect");
  const completeAccountConnection = () => {
    connectDemoPaymentAccount();
    setStage("summary");
  };
  const completeDemoPayment = () => setStage("complete");

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-ink/20" onClick={onClose} aria-hidden />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="데모 빠른 결제"
        className="fixed bottom-0 left-1/2 z-[61] w-full max-w-[430px] -translate-x-1/2 sheet-enter rounded-t-(--radius-sheet) border border-b-0 border-line bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" />
        <button
          type="button"
          onClick={onClose}
          aria-label="결제 데모 닫기"
          className="press absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-2"
        >
          <XIcon size={16} />
        </button>
        {renderCheckoutStage({
          stage,
          product,
          account,
          onBack: () => setStage("summary"),
          onConnect: startAccountConnection,
          onConnected: completeAccountConnection,
          onComplete: completeDemoPayment,
          onClose,
        })}
      </section>
    </>
  );
}

type CheckoutStageRendererProps = {
  readonly stage: CheckoutStage;
  readonly product: Product;
  readonly account: DemoPaymentAccount;
  readonly onBack: () => void;
  readonly onConnect: () => void;
  readonly onConnected: () => void;
  readonly onComplete: () => void;
  readonly onClose: () => void;
};

function renderCheckoutStage({
  stage,
  product,
  account,
  onBack,
  onConnect,
  onConnected,
  onComplete,
  onClose,
}: CheckoutStageRendererProps) {
  switch (stage) {
    case "summary":
      return (
        <CheckoutSummary
          product={product}
          account={account}
          onConnect={onConnect}
          onComplete={onComplete}
        />
      );
    case "connect":
      return <DemoAccountConnection onBack={onBack} onConnected={onConnected} />;
    case "complete":
      return <DemoPaymentComplete product={product} onClose={onClose} />;
    default:
      return assertNever(stage);
  }
}

type CheckoutSummaryProps = {
  readonly product: Product;
  readonly account: DemoPaymentAccount;
  readonly onConnect: () => void;
  readonly onComplete: () => void;
};

function CheckoutSummary({ product, account, onConnect, onComplete }: CheckoutSummaryProps) {
  const canPay = canUseDemoPayment(account);

  return (
    <div className="pb-1 pt-2">
      <p className="text-[12px] font-semibold text-primary">빠른 계좌 결제 · 데모</p>
      <h2 className="mt-1 text-[20px] font-bold tracking-tight">{product.name}</h2>
      <p className="mt-1 text-[14px] text-ink-2">{product.brand} · {product.retailer}</p>
      <p className="mt-5 text-[24px] font-bold tracking-tight">{won(product.price)}</p>
      <div className="mt-5 border-y border-line py-4">
        <PaymentAccountSummary account={account} />
      </div>
      <button
        type="button"
        onClick={canPay ? onComplete : onConnect}
        className="press mt-5 flex h-12 w-full items-center justify-center rounded-(--radius-btn) bg-primary text-[15px] font-bold text-white"
      >
        {canPay ? `${won(product.price)} 데모 결제하기` : "데모 계좌 연결하기"}
      </button>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-2">
        토스 계좌 연동 흐름을 재현한 화면입니다. 실제 계좌 인증·출금·주문은 진행되지 않아요.
      </p>
    </div>
  );
}

function PaymentAccountSummary({ account }: { readonly account: DemoPaymentAccount }) {
  switch (account.kind) {
    case "not_connected":
      return (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold">연결된 데모 계좌가 없어요</p>
            <p className="mt-1 text-[11px] text-ink-2">연결을 눌러 결제 흐름을 체험해보세요.</p>
          </div>
          <span className="shrink-0 rounded-(--radius-btn) bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-2">미연결</span>
        </div>
      );
    case "connected":
      return (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold">{account.bankName} · {account.maskedNumber}</p>
            <p className="mt-1 text-[11px] text-ink-2">{account.accountName} · 로컬 데모 연결됨</p>
          </div>
          <span className="shrink-0 rounded-(--radius-btn) bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">데모 연결</span>
        </div>
      );
    default:
      return assertNever(account);
  }
}

type DemoAccountConnectionProps = {
  readonly onBack: () => void;
  readonly onConnected: () => void;
};

function DemoAccountConnection({ onBack, onConnected }: DemoAccountConnectionProps) {
  return (
    <div className="pb-1 pt-2">
      <button type="button" onClick={onBack} className="press -ml-1.5 flex h-9 w-9 items-center justify-center text-ink" aria-label="결제 요약으로 돌아가기">
        <ChevronLeftIcon size={20} />
      </button>
      <p className="mt-3 text-[12px] font-semibold text-primary">토스 계좌 연동 흐름 · 데모</p>
      <h2 className="mt-1 text-[20px] font-bold tracking-tight">빠른 결제에 사용할 계좌</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">실제 은행 앱이나 금융 정보를 열지 않고, 이 브라우저 안에서만 연결 상태를 보여줍니다.</p>
      <div className="mt-5 rounded-(--radius-card) border border-primary/25 bg-primary-soft px-4 py-4">
        <p className="text-[12px] font-semibold text-primary">선택된 데모 계좌</p>
        <p className="mt-2 text-[16px] font-bold">토스뱅크 · •••• 0921</p>
        <p className="mt-1 text-[11px] text-ink-2">나의 데모 계좌</p>
      </div>
      <button type="button" onClick={onConnected} className="press mt-5 flex h-12 w-full items-center justify-center rounded-(--radius-btn) bg-primary text-[15px] font-bold text-white">
        데모 계좌 연결 완료
      </button>
    </div>
  );
}

function DemoPaymentComplete({ product, onClose }: { readonly product: Product; readonly onClose: () => void }) {
  return (
    <div className="pb-1 pt-7 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <CheckIcon size={26} strokeWidth={2} />
      </span>
      <p className="mt-4 text-[20px] font-bold tracking-tight">데모 결제가 완료됐어요</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{product.name} 구매 흐름을 확인했습니다. 실제 주문·청구는 발생하지 않았어요.</p>
      <button type="button" onClick={onClose} className="press mt-6 flex h-12 w-full items-center justify-center rounded-(--radius-btn) bg-ink text-[15px] font-bold text-surface">
        상품으로 돌아가기
      </button>
    </div>
  );
}

function assertNever(value: never): never {
  throw new Error(`Unexpected checkout state: ${JSON.stringify(value)}`);
}
