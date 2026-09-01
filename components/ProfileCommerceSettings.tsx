"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/lib/store";
import type { DemoPaymentAccount } from "@/lib/demo-payment";
import { CheckIcon, ChevronRightIcon, SettingsIcon } from "./Icons";

export default function ProfileCommerceSettings() {
  const [showConnectPanel, setShowConnectPanel] = useState(false);
  const account = useApp((state) => state.demoPaymentAccount);
  const connectDemoPaymentAccount = useApp((state) => state.connectDemoPaymentAccount);
  const disconnectDemoPaymentAccount = useApp((state) => state.disconnectDemoPaymentAccount);

  const connectAccount = () => {
    connectDemoPaymentAccount();
    setShowConnectPanel(false);
  };

  return (
    <section className="mx-4 mt-4 border-y border-line bg-surface py-1" aria-label="쇼핑 프로필 설정">
      <Link href="/profile/edit" className="press flex items-center gap-3 px-1 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-(--radius-btn) bg-surface-2 text-ink">
          <SettingsIcon size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold">프로필 설정</span>
          <span className="mt-0.5 block truncate text-[11px] text-ink-2">이름, 아이디, 소개, 프로필 사진</span>
        </span>
        <ChevronRightIcon size={16} className="text-ink-2" />
      </Link>
      <div className="border-t border-line px-1 py-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-(--radius-btn) bg-primary-soft text-primary">
            <CheckIcon size={17} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">빠른 계좌 결제</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-2">토스 계좌 연동 흐름을 보여주는 로컬 데모예요.</p>
          </div>
        </div>
        <div className="mt-3 rounded-(--radius-card) bg-surface-2 px-3 py-3">
          <PaymentAccountState account={account} />
        </div>
        <div className="mt-2.5 flex gap-2">
          <PaymentAccountAction
            account={account}
            onDisconnect={disconnectDemoPaymentAccount}
            onOpenConnection={() => setShowConnectPanel(true)}
          />
        </div>
        {showConnectPanel && (
          <div className="fade-in mt-2.5 rounded-(--radius-card) border border-primary/25 bg-primary-soft px-3 py-3">
            <p className="text-[12px] font-semibold text-primary">토스뱅크 · •••• 0921</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-2">계좌번호, 비밀번호, 인증 요청 없이 이 기기에서만 연결 상태를 저장합니다.</p>
            <button type="button" onClick={connectAccount} className="press mt-3 flex h-10 w-full items-center justify-center rounded-(--radius-btn) bg-primary text-[12px] font-bold text-white">
              이 데모 계좌 연결하기
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function PaymentAccountState({ account }: { readonly account: DemoPaymentAccount }) {
  switch (account.kind) {
    case "not_connected":
      return (
        <div>
          <p className="text-[12px] font-semibold">아직 연결된 데모 계좌가 없어요</p>
          <p className="mt-1 text-[11px] text-ink-2">연결하면 상품 시트에서 빠른 결제 체험을 바로 시작할 수 있어요.</p>
        </div>
      );
    case "connected":
      return (
        <div>
          <p className="text-[12px] font-semibold">{account.bankName} · {account.maskedNumber}</p>
          <p className="mt-1 text-[11px] text-ink-2">{account.accountName} · 이 브라우저의 데모 상태</p>
        </div>
      );
    default:
      return assertNever(account);
  }
}

type PaymentAccountActionProps = {
  readonly account: DemoPaymentAccount;
  readonly onDisconnect: () => void;
  readonly onOpenConnection: () => void;
};

function PaymentAccountAction({ account, onDisconnect, onOpenConnection }: PaymentAccountActionProps) {
  switch (account.kind) {
    case "not_connected":
      return (
        <button
          type="button"
          onClick={onOpenConnection}
          className="press flex h-10 flex-1 items-center justify-center rounded-(--radius-btn) bg-primary text-[12px] font-bold text-white"
        >
          데모 계좌 연결
        </button>
      );
    case "connected":
      return (
        <button
          type="button"
          onClick={onDisconnect}
          className="press flex h-10 flex-1 items-center justify-center rounded-(--radius-btn) border border-line bg-surface text-[12px] font-semibold text-ink-2"
        >
          데모 연결 해제
        </button>
      );
    default:
      return assertNever(account);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected profile payment state: ${JSON.stringify(value)}`);
}
