"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronRight, Copy, RotateCcw, Shirt } from "lucide-react";
import { getProduct } from "@/lib/beauty-commerce/catalog";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, translator } from "@/lib/beauty-commerce/types";
import type { BeautyLook, BeautyStep, Region } from "@/lib/beauty-commerce/types";
import { ProductPanel } from "./ProductPanel";
import styles from "./LookExperience.module.css";

const REGIONS = {
  skin: { en: "Skincare", vi: "Dưỡng da", ko: "스킨" }, base: { en: "Base", vi: "Lớp nền", ko: "베이스" },
  eye: { en: "Eyes", vi: "Mắt", ko: "눈" }, cheek: { en: "Cheeks", vi: "Má", ko: "치크" }, lip: { en: "Lips", vi: "Môi", ko: "립" },
} as const;

type LookExperienceProps = { readonly look: BeautyLook; readonly initialStepId?: string };

export function LookExperience({ look, initialStepId }: LookExperienceProps) {
  const { locale, savedLookIds, savedProductIds, toggleLook, toggleProduct } = useBeautyCommerce();
  const initialStep = look.steps.find((step) => step.id === initialStepId);
  const [activeId, setActiveId] = useState(initialStep?.id ?? look.steps[0]?.id ?? "");
  const [region, setRegion] = useState<Region | "all">("all");
  const [tab, setTab] = useState<"process" | "products">("process");
  const [mediaError, setMediaError] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [playbackMessage, setPlaybackMessage] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const stopAt = useRef<number | null>(null);
  const mode = useRef<"full" | "segment" | "held">("full");
  const pendingStep = useRef<{ readonly step: BeautyStep; readonly play: boolean } | null>(initialStep ? { step: initialStep, play: false } : null);
  const t = translator(locale);
  const activeStep = look.steps.find((step) => step.id === activeId) ?? look.steps[0];
  const activeProduct = activeStep ? getProduct(activeStep.productId) : undefined;
  const saved = savedLookIds.includes(look.id);
  const regions = [...new Set(look.steps.map((step) => step.region))];
  const visibleSteps = region === "all" ? look.steps : look.steps.filter((step) => step.region === region);
  const productIds = [...new Set(look.steps.map((step) => step.productId))];
  const savedProductSet = new Set(savedProductIds);
  const routineSaved = productIds.length > 0 && productIds.every((id) => savedProductSet.has(id));

  useEffect(() => {
    const player = video.current;
    if (player?.error) setMediaError(true);
    const pending = pendingStep.current;
    if (pending && player && player.readyState >= 1) {
      pendingStep.current = null;
      seekStep(pending.step, pending.play);
    }
  }, [look.id]);

  function saveRoutine() {
    if (!saved) toggleLook(look.id);
    for (const id of productIds) {
      if (!savedProductSet.has(id)) toggleProduct(id);
    }
  }

  function seekStep(step: BeautyStep, play: boolean) {
    const player = video.current;
    if (!player || look.media.kind !== "licensed") return;
    if (player.readyState < 1 || !Number.isFinite(player.duration)) {
      pendingStep.current = { step, play };
      setPlaybackMessage(t("Loading your selected segment…", "Đang tải đoạn đã chọn…", "선택한 구간을 불러오고 있습니다…"));
      return;
    }
    if (step.start < 0 || step.end <= step.start || step.end > player.duration) {
      setPlaybackMessage(t("This segment is unavailable. You can watch the full video instead.", "Đoạn này chưa sẵn sàng. Bạn có thể xem toàn bộ video.", "이 구간을 재생할 수 없습니다. 전체 영상으로 확인해 주세요."));
      return;
    }
    player.currentTime = step.start;
    stopAt.current = step.end;
    mode.current = "segment";
    setPlaybackMessage("");
    if (play) void player.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setPlaybackMessage(t("Press play on the video to continue.", "Nhấn nút phát trên video để tiếp tục.", "영상의 재생 버튼을 눌러 계속하세요."));
        return;
      }
      setMediaError(true);
    });
  }

  function selectStep(step: BeautyStep) {
    setActiveId(step.id);
    const url = new URL(window.location.href);
    url.searchParams.set("step", step.id);
    window.history.replaceState(window.history.state, "", url);
    seekStep(step, true);
  }

  async function shareLook() {
    if (!navigator.clipboard) {
      setShareStatus(t("Copy the page address from your browser to share.", "Sao chép địa chỉ trang trong trình duyệt.", "브라우저 주소를 복사해 공유하세요."));
      return;
    }
    try {
      const url = new URL(window.location.href);
      if (activeStep) url.searchParams.set("step", activeStep.id);
      await navigator.clipboard.writeText(url.toString());
      setShareStatus(t("Link copied", "Đã sao chép liên kết", "링크를 복사했습니다"));
    } catch (error) {
      if (error instanceof Error) setShareStatus(t("Please copy the address from your browser.", "Hãy sao chép địa chỉ trên trình duyệt.", "브라우저 주소를 복사해 주세요."));
      else throw error;
    }
  }

  return (
    <div className={styles.page} data-testid="look-detail">
      <div className={styles.breadcrumb}>
        <Link href="/"><ArrowLeft size={16} />{t("Explore the looks", "Khám phá các look", "룩 둘러보기")}</Link>
        <span>K-BEAUTY <ChevronRight size={12} /> {localize(REGIONS[look.category], locale)}</span>
      </div>
      <div className={styles.experience}>
        <section className={styles.mediaColumn} aria-label={t("Look photos and video", "Hình ảnh và video", "룩 이미지와 영상")}>
          <div className={styles.mediaFrame}>
            {look.media.kind === "licensed" ? (
              <video
                key={look.media.src} ref={video} src={look.media.src} poster={look.image} data-testid="look-video"
                controls playsInline preload="metadata" aria-label={localize(look.title, locale)}
                onError={() => setMediaError(true)} onLoadedData={() => setMediaError(false)}
                onLoadedMetadata={() => { const pending = pendingStep.current; pendingStep.current = null; if (pending) seekStep(pending.step, pending.play); }}
                onPlay={() => { if (mode.current === "held") { mode.current = "full"; stopAt.current = null; } }}
                onTimeUpdate={() => {
                  const player = video.current;
                  if (!player || mode.current === "held") return;
                  if (mode.current === "segment" && stopAt.current !== null && player.currentTime >= stopAt.current) {
                    mode.current = "held"; player.pause(); return;
                  }
                  const current = look.steps.find((step) => player.currentTime >= step.start && player.currentTime < step.end);
                  if (current) setActiveId(current.id);
                }}
                onSeeked={() => {
                  if (video.current && stopAt.current !== null && video.current.currentTime > stopAt.current) { stopAt.current = null; mode.current = "full"; }
                }}
              >
                {look.media.captions?.map((caption) => <track key={caption.locale} kind="captions" src={caption.src} srcLang={caption.locale} label={caption.label} />)}
                {t("Your browser does not support video playback.", "Trình duyệt không hỗ trợ video.", "브라우저가 영상 재생을 지원하지 않습니다.")}
              </video>
            ) : (
              <Image src={look.image} alt={localize(look.title, locale)} width={720} height={1000} sizes="(max-width: 700px) calc(100vw - 40px), 50vw" priority style={{ objectPosition: look.position }} />
            )}
            <span className={styles.mediaBadge}>{look.media.kind === "licensed" ? t("Real application", "Kỹ thuật thực tế", "실제 도포 영상") : t("Look inspiration", "Cảm hứng làm đẹp", "룩 참고 이미지")}</span>
            {mediaError && (
              <div className={styles.mediaError} role="alert">
                <p>{t("The video could not load. Please try again.", "Không thể tải video. Hãy thử lại.", "영상을 불러오지 못했습니다. 다시 시도해 주세요.")}</p>
                <button type="button" onClick={() => { setMediaError(false); video.current?.load(); }}><RotateCcw size={16} />{t("Try again", "Thử lại", "다시 시도")}</button>
              </div>
            )}
          </div>
          <p className={styles.playbackStatus} role="status">{playbackMessage}</p>
          {look.media.kind === "licensed" ? (
            <p className={styles.mediaCredit}><a href={look.media.sourceUrl} target="_blank" rel="noopener noreferrer">{look.media.credit} · {look.media.license}</a></p>
          ) : <p className={styles.mediaCredit}>{t("Style reference image · a verified tutorial video is not yet available.", "Ảnh tham khảo phong cách · chưa có video hướng dẫn được xác nhận.", "스타일 참고 이미지 · 확인된 사용 영상은 준비 중입니다.")}</p>}
          <div className={styles.mediaCaption}>
            <span className={styles.editorMark}>s.</span><div><strong>{look.creator}</strong><p>{t("Choose a step. Explore how the look comes together.", "Chọn một bước. Khám phá cách tạo nên look.", "궁금한 단계를 골라, 룩이 만들어지는 과정을 확인하세요.")}</p></div>
          </div>
        </section>

        <section className={styles.contentColumn}>
          <div className={styles.eyebrow}><span>{t("THE STORY OF THE LOOK", "CÂU CHUYỆN CỦA LOOK", "THE STORY OF THE LOOK")}</span><span>{look.duration}</span></div>
          <h1>{localize(look.title, locale)}</h1>
          <p className={styles.subtitle}>{localize(look.subtitle, locale)}</p>
          <div className={styles.tags}>{look.tags.map((tag) => <span key={tag.vi}>{localize(tag, locale)}</span>)}</div>
          <div className={styles.lookActions}>
            <button type="button" className={styles.saveLook} onClick={() => toggleLook(look.id)} aria-pressed={saved}><Bookmark size={17} fill={saved ? "currentColor" : "none"} />{saved ? t("Look saved", "Đã lưu look", "룩 저장됨") : t("Save look", "Lưu look", "룩 저장")}</button>
            <button type="button" className={styles.shareLook} onClick={() => void shareLook()}><Copy size={16} />{t("Share", "Chia sẻ", "공유")}</button>
          </div>
          <p className={styles.shareStatus} role="status">{shareStatus}</p>
          <div className={styles.tabs} role="group" aria-label={t("Choose content", "Chọn nội dung", "상세 내용 선택")}>
            <button type="button" aria-pressed={tab === "process"} onClick={() => setTab("process")}>{t("Step by step", "Từng bước một", "바르는 과정")}<span>{look.steps.length.toString().padStart(2, "0")}</span></button>
            <button type="button" aria-pressed={tab === "products"} onClick={() => setTab("products")}>{t("Editorial suggestion", "Sản phẩm gợi ý", "참고 제품")}<span>{productIds.length.toString().padStart(2, "0")}</span></button>
          </div>
          {tab === "process" ? (
            <div className={styles.processContent}>
              <div className={styles.regions} aria-label={t("Choose a makeup area", "Chọn vùng trang điểm", "메이크업 부위 선택")}>
                <button type="button" aria-pressed={region === "all"} onClick={() => setRegion("all")}>{t("All", "Tất cả", "전체")}</button>
                {regions.map((value) => <button type="button" key={value} aria-pressed={region === value} onClick={() => { setRegion(value); const first = look.steps.find((step) => step.region === value); if (first) selectStep(first); }}>{localize(REGIONS[value], locale)}</button>)}
              </div>
              <ol className={styles.timeline}>
                {visibleSteps.map((step) => (
                  <li key={step.id}>
                    <button type="button" data-testid={`look-step-${step.id}`} aria-pressed={activeStep?.id === step.id} onClick={() => selectStep(step)}>
                      <span className={styles.stepNumber}>{(look.steps.indexOf(step) + 1).toString().padStart(2, "0")}</span>
                      <span>{localize(step.label, locale)}</span><ArrowRight size={17} />
                    </button>
                  </li>
                ))}
              </ol>
              {activeStep && <p className={styles.instruction} aria-live="polite">{localize(activeStep.instruction, locale)}</p>}
              {activeProduct && <ProductPanel key={activeProduct.id} product={activeProduct} match={activeStep?.match} />}
            </div>
          ) : (
            <div className={styles.productsContent}>{productIds.map((id) => { const product = getProduct(id); return product ? <ProductPanel key={id} product={product} /> : null; })}</div>
          )}
          <section className={styles.routine}>
            <div><span className={styles.overline}>YOUR LITTLE ROUTINE</span><h2>{t("Make a little routine of your own.", "Giữ lại những điều hợp với bạn.", "나에게 맞는 루틴으로.")}</h2><p>{t("Keep the products you want to explore, then choose when you are ready.", "Lưu những sản phẩm bạn muốn tìm hiểu, rồi lựa chọn khi sẵn sàng.", "궁금한 제품을 모아 두고, 준비됐을 때 하나씩 골라보세요.")}</p></div>
            <button type="button" aria-pressed={routineSaved} onClick={saveRoutine}>{routineSaved ? <Check size={17} /> : <Bookmark size={17} />}{routineSaved ? t("Routine saved", "Đã lưu routine", "루틴 저장됨") : t("Save the routine", "Lưu cả routine", "전체 루틴 저장")}</button>
          </section>
          <Link href="/discover?category=fashion" className={styles.relatedStyle}><Shirt size={20} /><span><strong>{t("Complete the look", "Hoàn thiện phong cách", "룩을 완성하는 스타일")}</strong><small>{t("Explore clothing and accessories", "Khám phá trang phục & phụ kiện", "의상과 액세서리 함께 보기")}</small></span><ArrowRight size={18} /></Link>
        </section>
      </div>
    </div>
  );
}
