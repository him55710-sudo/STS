"use client";

import React, { useState, useEffect } from "react";
import { RealProduct } from "@/lib/real-products-data";

export interface CheckoutProduct {
  id: string;
  brand: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  option?: string;
  creatorReward?: string;
}

interface InstantCheckoutSheetProps {
  product: CheckoutProduct | null;
  isOpen: boolean;
  onClose: () => void;
  creatorHandle?: string;
}

export default function InstantCheckoutSheet({
  product,
  isOpen,
  onClose,
  creatorHandle = "yoon.glow"
}: InstantCheckoutSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<"toss" | "kakao" | "naver" | "apple">("toss");
  const [selectedOption, setSelectedOption] = useState("기본 단품 기획");
  const [useCoupon, setUseCoupon] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setIsProcessing(false);
      setOrderComplete(false);
      setOrderNumber("STS-" + Math.floor(100000 + Math.random() * 900000));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const itemPrice = product.price;
  const couponDiscount = useCoupon ? Math.round(itemPrice * 0.1) : 0;
  const deliveryFee = 0; // 무료배송
  const totalPrice = (itemPrice * quantity) - couponDiscount + deliveryFee;

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setOrderComplete(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md transition-opacity animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-slideUp border border-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
              ⚡
            </span>
            <span className="font-bold text-neutral-900 text-sm">STS 1초 간편결제</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
              무료배송
            </span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {!orderComplete ? (
            <>
              {/* Creator Sponsoring Tag */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span>크리에이터 <strong>@{creatorHandle}</strong> 단독 파트너 특가</span>
                </div>
                <span className="font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md shadow-xs">
                  최대 혜택 적용
                </span>
              </div>

              {/* Product Info Card */}
              <div className="flex gap-4 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-neutral-200 shrink-0 relative">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {product.discount && (
                    <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-md">
                      {product.discount}%
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-blue-600 tracking-tight">{product.brand}</span>
                  <h4 className="text-sm font-bold text-neutral-900 line-clamp-1 mt-0.5">{product.name}</h4>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-base font-extrabold text-neutral-900">
                      {itemPrice.toLocaleString()}원
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs text-neutral-400 line-through">
                        {product.originalPrice.toLocaleString()}원
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Options & Quantity */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-700 block">색상 / 옵션 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  {["#25 베어그레이프 (기획)", "03 리넨 (쿠션 본품+리필)", "02 킬브라운 (워터프루프)", "01 바이로댕 (브러쉬증정)"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelectedOption(opt)}
                      className={`text-xs p-2.5 rounded-xl text-left border transition ${
                        selectedOption === opt
                          ? "border-blue-600 bg-blue-50/50 text-blue-700 font-bold"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-neutral-700">구매 수량</span>
                  <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1.5 text-sm font-bold text-neutral-600 hover:bg-neutral-200 transition"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 text-sm font-bold text-neutral-900 bg-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-1.5 text-sm font-bold text-neutral-600 hover:bg-neutral-200 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Coupon / Discount Checkbox */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="coupon-check"
                    checked={useCoupon}
                    onChange={(e) => setUseCoupon(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="coupon-check" className="text-xs font-medium text-emerald-900 cursor-pointer">
                    크리에이터 첫구매 10% 추가 할인 쿠폰
                  </label>
                </div>
                <span className="text-xs font-bold text-emerald-700">
                  -{couponDiscount.toLocaleString()}원
                </span>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-700 block">간편결제 수단</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "toss", name: "토스페이", color: "text-blue-600", bg: "bg-blue-50 border-blue-600" },
                    { id: "kakao", name: "카카오페이", color: "text-yellow-900", bg: "bg-yellow-50 border-yellow-500" },
                    { id: "naver", name: "네이버페이", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-500" },
                    { id: "apple", name: "Apple Pay", color: "text-neutral-900", bg: "bg-neutral-100 border-neutral-900" },
                  ].map((pay) => (
                    <button
                      key={pay.id}
                      onClick={() => setSelectedPayment(pay.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center justify-center gap-1 ${
                        selectedPayment === pay.id
                          ? `${pay.bg} shadow-xs`
                          : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                      }`}
                    >
                      <span className="text-sm">⚡</span>
                      <span className={selectedPayment === pay.id ? pay.color : ""}>{pay.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <span>📍 기본 배송지</span>
                    <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1 rounded">기본</span>
                  </div>
                  <p className="text-neutral-500 mt-0.5">서울시 강남구 테헤란로 152 강남파이낸스센터 18층</p>
                </div>
                <button className="text-blue-600 font-semibold hover:underline shrink-0">변경</button>
              </div>

              {/* Pricing Summary */}
              <div className="pt-2 border-t border-neutral-100 space-y-1.5 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>상품 금액</span>
                  <span>{(itemPrice * quantity).toLocaleString()}원</span>
                </div>
                {useCoupon && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>쿠폰 할인</span>
                    <span>-{couponDiscount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>배송비</span>
                  <span className="text-blue-600 font-bold">무료 (STS 제휴)</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-neutral-900 pt-2 border-t border-dashed border-neutral-200">
                  <span>최종 결제 금액</span>
                  <span className="text-base text-blue-600">{totalPrice.toLocaleString()}원</span>
                </div>
              </div>
            </>
          ) : (
            /* Order Completed Success View */
            <div className="py-8 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Payment Success</span>
                <h3 className="text-xl font-extrabold text-neutral-900 mt-1">1초 즉시 결제 완료!</h3>
                <p className="text-xs text-neutral-500 mt-1">주문이 정상 접수되어 내일 오전 즉시 출고됩니다.</p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-left space-y-2 text-xs">
                <div className="flex justify-between pb-2 border-b border-neutral-200 font-bold text-neutral-800">
                  <span>주문번호</span>
                  <span className="font-mono text-blue-600">{orderNumber}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>결제 상품</span>
                  <span className="font-semibold text-neutral-900 truncate max-w-[200px]">{product.name}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>선택 옵션</span>
                  <span>{selectedOption}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>결제 수단</span>
                  <span className="font-bold text-neutral-800">
                    {selectedPayment === "toss" ? "토스페이" : selectedPayment === "kakao" ? "카카오페이" : selectedPayment === "naver" ? "네이버페이" : "Apple Pay"}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-200 font-extrabold text-sm text-neutral-900">
                  <span>결제 완료 금액</span>
                  <span className="text-blue-600">{totalPrice.toLocaleString()}원</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800">
                🎉 크리에이터 <strong>@{creatorHandle}</strong> 님에게 리워드 {Math.round(totalPrice * 0.15).toLocaleString()}원이 즉시 적립되었습니다.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-neutral-100">
          {!orderComplete ? (
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-base shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>안전하게 결제 승인 중...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>{totalPrice.toLocaleString()}원 1초 즉시 결제하기</span>
                </>
              )}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="py-3.5 rounded-xl border border-neutral-300 font-bold text-neutral-700 hover:bg-neutral-50 transition text-sm"
              >
                쇼핑 계속하기
              </button>
              <button
                onClick={onClose}
                className="py-3.5 rounded-xl bg-neutral-900 text-white font-bold hover:bg-black transition text-sm shadow-md"
              >
                주문 상세 보기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
