"use client";

import { useState } from "react";
import { CheckCircle2, DollarSign, Sparkles, TrendingUp, X } from "lucide-react";
import { AttributionEngine, type SettlementShare } from "@/lib/analytics/attribution-engine";

type BeautyCheckoutSettlementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderTitle: string;
  orderAmount: number;
  itemCount: number;
  creatorHandle: string;
  creatorName: string;
};

export function BeautyCheckoutSettlementModal({
  isOpen,
  onClose,
  orderTitle,
  orderAmount,
  itemCount,
  creatorHandle,
  creatorName,
}: BeautyCheckoutSettlementModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const settlement: SettlementShare = AttributionEngine.calculateSettlement(orderAmount);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#121216] p-6 text-white shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Success Header */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
            <CheckCircle2 size={36} className="animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF2D78] text-white">
              <Sparkles size={12} />
            </span>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            결제 완료 · STS Instant Checkout
          </span>
          <h2 className="mt-2 text-xl font-bold text-white tracking-tight">
            구매가 완료되었습니다!
          </h2>
          <p className="mt-1 text-xs text-white/60">
            {orderTitle} ({itemCount}개 품목)
          </p>
        </div>

        {/* Order Amount Card */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">최종 결제 금액</span>
            <span className="text-lg font-black text-white">
              {orderAmount.toLocaleString()}원
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-white/50">
            <span>배송 상태</span>
            <span className="font-medium text-emerald-400">오늘 출발 준비 중 (우체국택배)</span>
          </div>
        </div>

        {/* Creator 70:30 Settlement Section (PDF 10p, 13p) */}
        <div className="mt-4 rounded-2xl border border-[#FF2D78]/30 bg-gradient-to-br from-[#FF2D78]/10 via-purple-500/5 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF2D78]/20 text-[#FF2D78]">
                <TrendingUp size={14} />
              </div>
              <span className="text-xs font-bold text-[#FF2D78]">
                크리에이터 실시간 정산 (70%)
              </span>
            </div>
            <span className="rounded-full bg-[#FF2D78]/20 px-2 py-0.5 text-[10px] font-semibold text-[#FF2D78]">
              Creator 70 / STS 30
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between items-center text-white/70">
              <span>기여 크리에이터</span>
              <span className="font-semibold text-white">
                {creatorName} ({creatorHandle})
              </span>
            </div>
            <div className="flex justify-between items-center text-white/70">
              <span>제휴 수수료 총액 (20%)</span>
              <span className="font-medium text-white">
                +{settlement.totalCommission.toLocaleString()}원
              </span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex justify-between items-center text-sm font-bold text-emerald-400">
              <span>크리에이터 배분 정산액 (70%)</span>
              <span className="flex items-center gap-1">
                <DollarSign size={14} />
                +{settlement.creatorSettlement.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-white/40">
              <span>STS 플랫폼 분배액 (30%)</span>
              <span>+{settlement.stsSettlement.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 rounded-xl border border-white/15 bg-white/10 py-3 text-xs font-semibold text-white hover:bg-white/15 transition-all"
          >
            {copied ? "공유 링크 복사됨!" : "구매 내역 공유"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-[#FF2D78] py-3 text-xs font-bold text-white hover:bg-[#FF2D78]/90 transition-all shadow-lg shadow-[#FF2D78]/30"
          >
            쇼핑 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}
