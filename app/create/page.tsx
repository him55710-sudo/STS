"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { candidatesFor, searchProducts } from "@/lib/match";
import { useApp, useProductLookup } from "@/lib/store";
import type { Category, DetectedObject, Exactness, Post, Product } from "@/lib/types";
import { CheckIcon, ImageIcon, LinkIcon, SearchIcon, TrashIcon, XIcon } from "@/components/Icons";
import { ExactBadge } from "@/components/ProductSheet";

/**
 * AI Tagging Creator Flow — PRD §14–15.
 * Upload → Analyzing → Objects detected → Product candidates → Creator confirmation → Publish.
 * 목표: 이미지 1장 60초 이내 shoppable 발행.
 */

interface DraftObject extends DetectedObject {
  id: string;
  productId: string | null;
  exactness: Exactness;
}

type Step = "select" | "analyzing" | "review" | "done";

const SAMPLES = [
  { src: "/seed/feed-ootd.svg", label: "OOTD" },
  { src: "/seed/feed-mug.svg", label: "카페" },
  { src: "/seed/feed-desk.svg", label: "데스크" },
];

export default function CreatePage() {
  const router = useRouter();
  const { addUserPost, addCustomProduct, track } = useApp();

  const [step, setStep] = useState<Step>("select");
  const [image, setImage] = useState<string | null>(null);
  const [ratio, setRatio] = useState(0.75);
  const [objects, setObjects] = useState<DraftObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [aiSource, setAiSource] = useState<string>("");
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [publishedId, setPublishedId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  // ── Step 1: 이미지 선택 ────────────────────────────────
  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => downscale(String(reader.result));
    reader.readAsDataURL(file);
  };

  const downscale = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1280;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      startAnalysis(canvas.toDataURL("image/jpeg", 0.85), img.width / img.height);
    };
    img.src = dataUrl;
  };

  const useSample = async (src: string) => {
    // SVG 샘플을 canvas로 래스터화해 실제 업로드와 동일한 경로를 태운다
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = Math.round(900 / (img.width / img.height));
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      startAnalysis(canvas.toDataURL("image/jpeg", 0.9), img.width / img.height);
    };
    img.src = src;
  };

  // ── Step 2: AI 분석 ───────────────────────────────────
  const startAnalysis = async (dataUrl: string, r: number) => {
    setImage(dataUrl);
    setRatio(r);
    setStep("analyzing");
    setStartedAt(Date.now());
    track("asset_view"); // upload_start에 해당
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const json = await res.json();
      const detected: DetectedObject[] = json.objects ?? [];
      setAiSource(json.source ?? "");
      setObjects(
        detected.map((o) => ({
          ...o,
          id: `d-${seq.current++}`,
          productId: candidatesFor(o)[0]?.id ?? null,
          exactness: "similar" as Exactness,
        }))
      );
      setSelectedId(null);
      setStep("review");
    } catch {
      setObjects([]);
      setStep("review");
    }
  };

  // ── Step 3: 객체/상품 편집 ─────────────────────────────
  const selected = objects.find((o) => o.id === selectedId) ?? null;

  const addObjectAt = (e: React.MouseEvent) => {
    const el = imgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const hit = objects.find(
      (o) => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h
    );
    if (hit) {
      setSelectedId(hit.id);
      return;
    }
    // 놓친 객체 직접 추가 (PRD §56 "Select anything we missed")
    const id = `d-${seq.current++}`;
    setObjects((prev) => [
      ...prev,
      {
        id,
        label: "item",
        labelKo: "직접 추가한 오브젝트",
        category: "fashion" as Category,
        x: Math.max(0, x - 0.09),
        y: Math.max(0, y - 0.06),
        w: 0.18,
        h: 0.12,
        confidence: 1,
        productId: null,
        exactness: "similar",
      },
    ]);
    setSelectedId(id);
  };

  const update = (id: string, patch: Partial<DraftObject>) =>
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const remove = (id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ── Step 4: 발행 ──────────────────────────────────────
  const publish = () => {
    if (!image) return;
    const id = `user-${Date.now().toString(36)}`;
    const post: Post = {
      id,
      creatorId: "c-me",
      image,
      ratio,
      caption: caption.trim() || "새 콘텐츠",
      category: objects[0]?.category ?? "lifestyle",
      likes: 0,
      createdAt: new Date().toISOString(),
      isUserPost: true,
      objects: objects.map((o, i) => ({
        id: `${id}-o${i}`,
        label: o.labelKo,
        x: o.x,
        y: o.y,
        w: o.w,
        h: o.h,
        productId: o.productId,
        exactness: o.exactness,
        confidence: o.confidence,
      })),
    };
    addUserPost(post);
    setElapsed(Math.round((Date.now() - startedAt) / 1000));
    setPublishedId(id);
    setStep("done");
  };

  const reset = () => {
    setStep("select");
    setImage(null);
    setObjects([]);
    setSelectedId(null);
    setCaption("");
  };

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 pt-3">
          <h1 className="text-[17px] font-bold">새 콘텐츠</h1>
          {step === "review" && (
            <button onClick={reset} aria-label="다시 시작" className="text-[13px] text-ink-2">
              다시 시작
            </button>
          )}
        </div>
        {/* 스텝 인디케이터 — SEEIT creator flow */}
        <div className="flex items-center gap-1.5 px-4 pb-3 pt-2">
          {["업로드", "AI 태깅", "상품 매칭", "발행"].map((label, i) => {
            const current = { select: 0, analyzing: 1, review: 2, done: 3 }[step];
            const state = i < current ? "done" : i === current ? "now" : "todo";
            return (
              <div key={label} className="flex flex-1 items-center gap-1.5">
                <span
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    state === "todo" ? "bg-surface-2" : "bg-primary"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium ${
                    state === "now" ? "font-bold text-primary" : state === "done" ? "text-ink" : "text-ink-2"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      {step === "select" && (
        <div className="px-4 pt-5">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2.5 rounded-(--radius-card) border border-dashed border-line bg-surface py-14"
          >
            <ImageIcon size={30} strokeWidth={1.25} className="text-ink-2" />
            <span className="text-[14px] font-medium">사진 업로드</span>
            <span className="text-[12px] text-ink-2">
              올리기만 하면 AI가 상품을 찾아드려요
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />

          <p className="mb-2 mt-7 text-[13px] font-semibold text-ink-2">샘플로 체험하기</p>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLES.map((s) => (
              <button key={s.src} onClick={() => useSample(s.src)} className="overflow-hidden rounded-(--radius-card) border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.label} className="aspect-[3/4] w-full object-cover" />
                <p className="bg-surface py-1.5 text-center text-[12px] text-ink-2">{s.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "analyzing" && image && (
        <div className="px-4 pt-5">
          <div className="relative overflow-hidden rounded-(--radius-card)">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="w-full opacity-90" />
            <div className="absolute inset-0 bg-surface/20" />
          </div>
          <div className="mt-5 flex items-center justify-center gap-2.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            <p className="text-[14px] text-ink-2">오브제를 찾고 있어요...</p>
          </div>
        </div>
      )}

      {step === "review" && image && (
        <div className="pb-8">
          {/* 이미지 + 객체 오버레이 — 빈 곳을 탭하면 객체 추가 */}
          <div ref={imgRef} className="relative cursor-crosshair select-none" onClick={addObjectAt}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="w-full" />
            {objects.map((o, i) => (
              <div
                key={o.id}
                className="absolute rounded-[6px] transition-shadow"
                style={{
                  left: `${o.x * 100}%`,
                  top: `${o.y * 100}%`,
                  width: `${o.w * 100}%`,
                  height: `${o.h * 100}%`,
                  background:
                    o.id === selectedId
                      ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                      : "color-mix(in srgb, var(--color-accent) 6%, transparent)",
                  boxShadow:
                    o.id === selectedId
                      ? "inset 0 0 0 1.5px var(--color-accent)"
                      : "inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 45%, white)",
                }}
              >
                <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-surface">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>

          <p className="px-4 pt-2.5 text-[12px] text-ink-2">
            {objects.length > 0
              ? `오브젝트 ${objects.length}개를 찾았어요 · 놓친 물건은 화면을 탭해 추가하세요`
              : "화면 속 물건을 탭해서 직접 추가해보세요"}
            {aiSource !== "gemini" && aiSource && " · 데모 탐지 모드"}
          </p>

          {/* Detected objects 목록 — PRD §15 2단 구조 */}
          <div className="stagger mt-3 flex flex-col gap-2 px-4">
            {objects.map((o, i) => {
              const isSel = o.id === selectedId;
              return (
                <div key={o.id} className="rounded-(--radius-card) border border-line bg-surface">
                  <button
                    onClick={() => setSelectedId(isSel ? null : o.id)}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[14px] font-medium">
                        {o.labelKo}
                        {o.confidence < 1 && (
                          <span className="shrink-0 text-[10.5px] font-semibold text-ink-2">
                            신뢰도 {Math.round(o.confidence * 100)}%
                          </span>
                        )}
                      </p>
                      <ObjectStatus obj={o} />
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(o.id);
                      }}
                      aria-label="객체 삭제"
                      className="flex h-8 w-8 items-center justify-center rounded-(--radius-btn) text-ink-2 hover:bg-surface-2"
                    >
                      <TrashIcon size={15} />
                    </span>
                  </button>
                  {isSel && (
                    <CandidatePanel
                      obj={o}
                      onPick={(productId, exactness) => update(o.id, { productId, exactness })}
                      onCustom={(p) => {
                        addCustomProduct(p);
                        update(o.id, { productId: p.id, exactness: "exact" });
                      }}
                      onUnlink={() => update(o.id, { productId: null })}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* caption + publish */}
          <div className="mt-5 px-4">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="캡션을 입력하세요"
              rows={2}
              className="w-full resize-none rounded-(--radius-card) border border-line bg-surface p-3.5 text-[14px] outline-none placeholder:text-ink-2 focus:border-accent"
            />
            <button
              onClick={publish}
              className="press mt-3 h-12 w-full rounded-(--radius-btn) bg-primary text-[15px] font-bold text-white"
            >
              발행하기
              {objects.filter((o) => o.productId).length > 0 &&
                ` · 상품 ${objects.filter((o) => o.productId).length}개 연결됨`}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center px-4 py-14 text-center">
          <span className="card-in flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <CheckIcon size={26} strokeWidth={2.2} />
          </span>
          <h2 className="mt-4 text-[18px] font-bold">발행 완료</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
            {elapsed}초 만에 shoppable 콘텐츠가 되었어요
            {elapsed <= 60 ? " · 60초 목표 달성 ✓" : ""}
            <br />
            이제 시청자가 화면 속 물건을 탭해 구매할 수 있어요.
          </p>
          <EarningsSummary objects={objects} />
          <div className="mt-6 flex w-full gap-2">
            <button
              onClick={reset}
              className="h-11 flex-1 rounded-(--radius-btn) border border-line bg-surface text-[14px] font-semibold"
            >
              하나 더 만들기
            </button>
            <button
              onClick={() => router.push(`/post/${publishedId}`)}
              className="h-11 flex-1 rounded-(--radius-btn) bg-ink text-[14px] font-semibold text-surface"
            >
              게시물 보기
            </button>
          </div>
          <Link href="/analytics" className="mt-4 text-[13px] text-accent underline-offset-2 hover:underline">
            성과는 애널리틱스에서 확인하세요
          </Link>
        </div>
      )}
    </div>
  );
}

/** 발행 완료 화면 — 게시물 하나가 만드는 수익 구조를 즉시 보여준다 */
function EarningsSummary({ objects }: { objects: DraftObject[] }) {
  const lookup = useProductLookup();
  const partnered = objects
    .map((o) => lookup(o.productId))
    .filter((p) => p != null && p.affiliate);
  if (partnered.length === 0) return null;
  const perSale = partnered.reduce(
    (sum, p) => sum + Math.round(p!.price * (p!.commissionRate ?? 0.05) * 0.7),
    0
  );
  return (
    <div className="card-in mt-5 w-full rounded-(--radius-card) border border-line bg-surface p-4 text-left" style={{ animationDelay: "120ms" }}>
      <p className="text-[12px] font-semibold text-primary">수익 배분 활성화됨</p>
      <p className="mt-1 text-[14px] leading-relaxed">
        제휴 상품 <b>{partnered.length}개</b> 연결 · 전 상품 1회 판매 시{" "}
        <b>₩{perSale.toLocaleString("ko-KR")}</b> 수익
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
        판매 수수료의 70%가 크리에이터 몫이에요. 정산 내역은 애널리틱스에서 확인됩니다.
      </p>
    </div>
  );
}

function ObjectStatus({ obj }: { obj: DraftObject }) {
  const lookup = useProductLookup();
  const product = lookup(obj.productId);
  return product ? (
    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-2">
      <ExactBadge exactness={obj.exactness} />
      {product.affiliate && (
        <span className="shrink-0 rounded-[5px] bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          수익 {Math.round((product.commissionRate ?? 0.05) * 100 * 0.7)}%
        </span>
      )}
      <span className="truncate">
        {product.brand} {product.name}
      </span>
    </p>
  ) : (
    <p className="mt-0.5 text-[12px] text-accent">상품 후보 보기 →</p>
  );
}

/** 상품 후보 패널 — AI 후보 / 검색 / URL / 미연결 (PRD §15, §58) */
function CandidatePanel({
  obj,
  onPick,
  onCustom,
  onUnlink,
}: {
  obj: DraftObject;
  onPick: (productId: string, exactness: Exactness) => void;
  onCustom: (p: Product) => void;
  onUnlink: () => void;
}) {
  const [mode, setMode] = useState<"candidates" | "search" | "url">("candidates");
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const lookup = useProductLookup();
  const candidates = candidatesFor(obj);
  const results = searchProducts(q);
  const current = lookup(obj.productId);

  const submitUrl = () => {
    if (!url.trim()) return;
    let host = "판매처";
    try {
      host = new URL(url).hostname.replace("www.", "");
    } catch {
      return;
    }
    onCustom({
      id: `custom-${Date.now().toString(36)}`,
      brand: host,
      name: name.trim() || "직접 연결한 상품",
      price: 0,
      currency: "KRW",
      retailer: host,
      url,
      image: "/seed/prod-mug.svg",
      category: obj.category,
      affiliate: false,
      similarIds: [],
    });
  };

  const Row = ({ p }: { p: Product }) => {
    const picked = obj.productId === p.id;
    return (
      <button
        onClick={() => onPick(p.id, obj.exactness)}
        className={`flex w-full items-center gap-2.5 rounded-(--radius-btn) border p-2 text-left transition-colors ${
          picked ? "border-accent bg-surface-2/60" : "border-line"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" className="h-11 w-11 rounded-[7px] border border-line object-cover" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[12px] text-ink-2">
            {p.brand}
            {p.affiliate && (
              <span className="shrink-0 rounded-[4px] bg-primary-soft px-1 py-px text-[9px] font-semibold text-primary">
                제휴
              </span>
            )}
          </p>
          <p className="truncate text-[13px] font-medium">{p.name}</p>
        </div>
        {picked && <CheckIcon size={16} className="shrink-0 text-primary" />}
      </button>
    );
  };

  return (
    <div className="border-t border-line px-3.5 pb-3.5 pt-3">
      <div className="mb-2.5 flex gap-1.5">
        {(
          [
            ["candidates", "AI 후보"],
            ["search", "검색"],
            ["url", "URL"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`rounded-(--radius-btn) px-2.5 py-1 text-[12px] font-medium ${
              mode === key ? "bg-ink text-surface" : "bg-surface-2 text-ink-2"
            }`}
          >
            {label}
          </button>
        ))}
        {current && (
          <button onClick={onUnlink} className="ml-auto flex items-center gap-1 text-[12px] text-ink-2">
            <XIcon size={12} />
            연결 해제
          </button>
        )}
      </div>

      {mode === "candidates" &&
        (candidates.length ? (
          <div className="flex flex-col gap-1.5">
            {candidates.map((p) => (
              <Row key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <p className="py-3 text-center text-[12px] text-ink-2">
            후보를 찾지 못했어요. 검색하거나 URL을 붙여넣어 보세요.
          </p>
        ))}

      {mode === "search" && (
        <div>
          <div className="flex items-center gap-2 rounded-(--radius-btn) bg-surface-2 px-2.5">
            <SearchIcon size={14} className="text-ink-2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="상품명, 브랜드 검색"
              className="h-9 w-full bg-transparent text-[13px] outline-none"
            />
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {results.map((p) => (
              <Row key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}

      {mode === "url" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-(--radius-btn) bg-surface-2 px-2.5">
            <LinkIcon size={14} className="shrink-0 text-ink-2" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="상품 URL 붙여넣기"
              className="h-9 w-full bg-transparent text-[13px] outline-none"
            />
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="상품명 (선택)"
            className="h-9 rounded-(--radius-btn) bg-surface-2 px-2.5 text-[13px] outline-none"
          />
          <button
            onClick={submitUrl}
            className="h-9 rounded-(--radius-btn) bg-ink text-[13px] font-semibold text-surface"
          >
            이 상품으로 연결
          </button>
        </div>
      )}

      {/* exact / similar 확정 — Creator-confirmed truth */}
      {current && (
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <p className="text-[12px] text-ink-2">이 상품은</p>
          {(
            [
              ["exact", "동일 상품"],
              ["similar", "유사 상품"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onPick(current.id, key)}
              className={`rounded-(--radius-btn) px-2.5 py-1 text-[12px] font-medium ${
                obj.exactness === key ? "bg-accent text-white" : "bg-surface-2 text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
