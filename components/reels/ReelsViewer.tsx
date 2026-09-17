"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { KBEAUTY_CREATOR_POSTS, KBeautyCreatorPost, FaceSegmentationZone } from "@/lib/real-products-data";
import InstantCheckoutSheet, { CheckoutProduct } from "@/components/checkout/InstantCheckoutSheet";

export default function ReelsViewer() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [showPolygonMask, setShowPolygonMask] = useState(true);
  const [selectedZone, setSelectedZone] = useState<FaceSegmentationZone | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<CheckoutProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const currentPost = KBEAUTY_CREATOR_POSTS[currentIndex] || KBEAUTY_CREATOR_POSTS[0];

  useEffect(() => {
    // 기본으로 첫번째 zone(입술) 활성화
    if (currentPost.faceZones && currentPost.faceZones.length > 0) {
      setSelectedZone(currentPost.faceZones[0]);
    }
  }, [currentIndex, currentPost]);

  const handleNext = () => {
    if (currentIndex < KBEAUTY_CREATOR_POSTS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(KBEAUTY_CREATOR_POSTS.length - 1);
    }
  };

  const toggleLike = (postId: string) => {
    const isLiked = likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !isLiked }));
    setLikeCounts(prev => ({
      ...prev,
      [postId]: (prev[postId] || currentPost.likes) + (isLiked ? -1 : 1)
    }));
  };

  const handleBuy = (product: {
    productId: string;
    brand: string;
    productName: string;
    price: number;
    discount: number;
    productImage: string;
  }) => {
    setCheckoutProduct({
      id: product.productId,
      brand: product.brand,
      name: product.productName,
      price: product.price,
      discount: product.discount,
      image: product.productImage
    });
    setIsCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Top Floating Navbar */}
      <header className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white">STS</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">REELS</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1 text-xs text-neutral-400">
            <span>K-뷰티 숏폼 릴스 커머스</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">AI 부위별 실시간 태깅</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/analytics" 
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5"
          >
            <span>📊</span>
            <span>애널리틱스</span>
          </Link>
          <Link 
            href="/feed" 
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5"
          >
            <span>🛍️</span>
            <span>소셜 피드</span>
          </Link>
          <Link 
            href="/" 
            className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition"
          >
            홈으로
          </Link>
        </div>
      </header>

      {/* Main Reels Viewport */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden relative">
        {/* Navigation Arrows for Desktop */}
        <button
          onClick={handlePrev}
          className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 items-center justify-center text-xl text-white backdrop-blur-md z-30 transition border border-white/10"
          title="이전 릴스 (↑)"
        >
          ▲
        </button>
        <button
          onClick={handleNext}
          className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 items-center justify-center text-xl text-white backdrop-blur-md z-30 transition border border-white/10"
          title="다음 릴스 (↓)"
        >
          ▼
        </button>

        {/* 9:16 Reels Frame */}
        <div className="w-full max-w-[430px] h-[85vh] max-h-[860px] bg-neutral-900 rounded-3xl overflow-hidden relative shadow-2xl border border-white/15 flex flex-col">
          {/* Background Visual (Model or Video) */}
          <div className="absolute inset-0 z-0 bg-neutral-900">
            <img 
              src={currentPost.modelImage} 
              alt={currentPost.creatorName}
              className="w-full h-full object-cover"
            />
            {/* Top & Bottom Gradient Shadows */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />
          </div>

          {/* SVG AI Polygon Segmentation Layer (Lips, Nose, Eyes, Eyebrows, Cheeks) */}
          {showPolygonMask && currentPost.faceZones && (
            <svg 
              className="absolute inset-0 w-full h-full z-10 pointer-events-auto"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="reels-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {currentPost.faceZones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                return (
                  <g key={zone.id} className="cursor-pointer group">
                    {/* Shadow Outline */}
                    <polygon
                      points={zone.polygonPoints}
                      fill={isSelected ? zone.fillColor : "rgba(255,255,255,0.06)"}
                      stroke={isSelected ? zone.strokeColor : "rgba(255,255,255,0.4)"}
                      strokeWidth={isSelected ? "0.8" : "0.3"}
                      strokeDasharray={isSelected ? "none" : "1.2,1.2"}
                      filter={isSelected ? "url(#reels-glow)" : undefined}
                      className="transition-all duration-300"
                      onClick={() => setSelectedZone(zone)}
                    />
                    {/* Center Pin Indicator */}
                    <circle
                      cx={zone.anchorX}
                      cy={zone.anchorY}
                      r={isSelected ? "1.8" : "1.2"}
                      fill={isSelected ? "#ffffff" : "rgba(255,255,255,0.8)"}
                      stroke={zone.strokeColor}
                      strokeWidth="0.5"
                      className={`transition-all duration-300 ${isSelected ? "animate-pulse" : ""}`}
                      onClick={() => setSelectedZone(zone)}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {/* Top Info Bar inside Reels */}
          <div className="relative z-20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-red-600/90 text-white backdrop-blur-md shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                LIVE REC
              </span>
              <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-black/50 text-white/80 backdrop-blur-md border border-white/10">
                AI 세그멘테이션 {showPolygonMask ? "ON" : "OFF"}
              </span>
            </div>

            <button
              onClick={() => setShowPolygonMask(!showPolygonMask)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition flex items-center gap-1"
            >
              <span>{showPolygonMask ? "👁️ 마스크 숨김" : "✨ 마스크 표시"}</span>
            </button>
          </div>

          {/* Facial Zones Quick Selector Chips (Nose, Lips, Eyes, Eyebrows, Cheeks) */}
          <div className="relative z-20 px-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {currentPost.faceZones.map((zone) => {
              const isActive = selectedZone?.id === zone.id;
              return (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZone(zone)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 backdrop-blur-md border ${
                    isActive
                      ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/40 scale-105"
                      : "bg-black/40 border-white/20 text-white/80 hover:bg-white/20"
                  }`}
                >
                  <span>{zone.zoneIcon}</span>
                  <span>{zone.zoneName.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Right Action Bar (Instagram/TikTok style) */}
          <div className="absolute right-3 bottom-32 z-30 flex flex-col items-center gap-4">
            {/* Like */}
            <button 
              onClick={() => toggleLike(currentPost.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition border ${
                likedPosts[currentPost.id]
                  ? "bg-rose-500/30 border-rose-500 text-rose-500 scale-110"
                  : "bg-black/40 border-white/20 text-white hover:bg-white/20"
              }`}>
                <span className="text-xl">{likedPosts[currentPost.id] ? "❤️" : "🤍"}</span>
              </div>
              <span className="text-[11px] font-bold text-white drop-shadow">
                {((likeCounts[currentPost.id] || currentPost.likes)).toLocaleString()}
              </span>
            </button>

            {/* Comments */}
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-11 h-11 rounded-full bg-black/40 border border-white/20 flex items-center justify-center backdrop-blur-md text-white hover:bg-white/20 transition">
                <span className="text-xl">💬</span>
              </div>
              <span className="text-[11px] font-bold text-white drop-shadow">1,248</span>
            </button>

            {/* Instant Buy Shortcut */}
            <button 
              onClick={() => selectedZone && handleBuy({
                productId: selectedZone.productId,
                brand: selectedZone.brand,
                productName: selectedZone.productName,
                price: selectedZone.price,
                discount: selectedZone.discount,
                productImage: selectedZone.productImage
              })}
              className="flex flex-col items-center gap-1 group"
              title="1초 간편결제"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400 flex items-center justify-center backdrop-blur-md text-white hover:scale-110 transition shadow-lg shadow-blue-500/50 animate-bounce">
                <span className="text-xl">⚡</span>
              </div>
              <span className="text-[10px] font-extrabold text-blue-400 drop-shadow">즉시구매</span>
            </button>

            {/* Share */}
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-11 h-11 rounded-full bg-black/40 border border-white/20 flex items-center justify-center backdrop-blur-md text-white hover:bg-white/20 transition">
                <span className="text-xl">↗️</span>
              </div>
              <span className="text-[11px] font-bold text-white drop-shadow">공유</span>
            </button>
          </div>

          {/* Bottom Area: Creator Profile & Interactive Cosmetic Product Card */}
          <div className="mt-auto relative z-20 p-4 space-y-3">
            {/* Creator Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500 overflow-hidden bg-neutral-800 shrink-0">
                  <img src={currentPost.creatorAvatar} alt={currentPost.creatorName} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm">@{currentPost.creatorHandle}</span>
                    <span className="text-blue-400 text-xs">✓</span>
                  </div>
                  <span className="text-xs text-neutral-300 font-medium">{currentPost.creatorName}</span>
                </div>
              </div>
              <button className="px-3 py-1 rounded-full bg-white text-neutral-900 text-xs font-bold hover:bg-neutral-200 transition">
                팔로우
              </button>
            </div>

            {/* Routine Title & Caption */}
            <div>
              <h3 className="text-sm font-bold text-white line-clamp-1">{currentPost.routineTitle}</h3>
              <p className="text-xs text-neutral-300 line-clamp-2 mt-0.5">{currentPost.caption}</p>
            </div>

            {/* Active Face Zone Cosmetic Product Card (Direct Purchase Link) */}
            {selectedZone && (
              <div className="p-3 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/20 flex items-center justify-between gap-3 shadow-xl animate-fadeIn">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-white/20 relative">
                    <img 
                      src={selectedZone.productImage} 
                      alt={selectedZone.productName} 
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-0.5 left-0.5 bg-red-500 text-white text-[9px] font-extrabold px-1 rounded">
                      {selectedZone.discount}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-blue-400 font-bold">{selectedZone.zoneIcon} {selectedZone.zoneName}</span>
                      <span className="text-neutral-400">•</span>
                      <span className="text-neutral-300 truncate">{selectedZone.brand}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate mt-0.5">{selectedZone.productName}</h4>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-xs font-extrabold text-white">{selectedZone.price.toLocaleString()}원</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">{selectedZone.appliedEffect}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleBuy({
                    productId: selectedZone.productId,
                    brand: selectedZone.brand,
                    productName: selectedZone.productName,
                    price: selectedZone.price,
                    discount: selectedZone.discount,
                    productImage: selectedZone.productImage
                  })}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shrink-0 shadow-md shadow-blue-500/30 flex items-center gap-1 transition active:scale-95"
                >
                  <span>⚡ 1초구매</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1-Second Instant Checkout Sheet Modal */}
      <InstantCheckoutSheet
        product={checkoutProduct}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        creatorHandle={currentPost.creatorHandle}
      />
    </div>
  );
}
