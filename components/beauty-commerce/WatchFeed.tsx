"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Bookmark, Camera, Check, ChevronRight, Play, SlidersHorizontal, Volume2, VolumeX, X } from "lucide-react";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { beautyProfileSchema } from "@/lib/beauty-commerce/fit";
import { getLook, getProduct } from "@/lib/beauty-commerce/catalog";
import { buildWatchItems, DEFAULT_WATCH_PREFERENCES, parseWatchPreferences, rankWatchItems, WATCH_ITEMS, WATCH_PREFERENCES_KEY } from "@/lib/beauty-commerce/recommendations";
import type { WatchItem, WatchPreferences } from "@/lib/beauty-commerce/recommendations";
import { getCreatorSegments, normalizeTikTokUrl, parsePlayerMessage, SOURCE_PRODUCT_STACKS, TIKTOK_ORIGIN } from "@/lib/beauty-commerce/tiktok";
import type { ManualSegment } from "@/lib/beauty-commerce/tiktok";
import { localize, translator } from "@/lib/beauty-commerce/types";
import type { Region } from "@/lib/beauty-commerce/types";
import { usePersonalBeauty } from "./PersonalBeautyProvider";
import { useCreatorLibrary } from "./useCreatorLibrary";
import { LocalVideoPreview } from "./LocalVideoPreview";
import { CreatorProductLayers } from "./CreatorProductLayers";
import { ProductPanel } from "./ProductPanel";
import styles from "./WatchFeed.module.css";

const regionNames = { skin: { en: "Skin prep", vi: "Dưỡng da", ko: "피부 준비" }, base: { en: "Base", vi: "Lớp nền", ko: "베이스" }, eye: { en: "Eyes", vi: "Mắt", ko: "아이" }, cheek: { en: "Cheeks", vi: "Má", ko: "치크" }, lip: { en: "Lips", vi: "Môi", ko: "립" } } as const;
const toggle = <T,>(items: readonly T[], value: T): T[] => items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

export function WatchFeed() {
  const { locale } = useBeautyCommerce(); const t = translator(locale);
  const { profile, updateProfile } = usePersonalBeauty();
  const { records, hydrated: creatorHydrated } = useCreatorLibrary();
  const items = useMemo(() => creatorHydrated ? buildWatchItems(records) : WATCH_ITEMS, [records, creatorHydrated]);
  const creators = [...new Set(items.filter((item) => item.media.kind === "tiktok").map((item) => item.creator))];
  const [preferences, setPreferences] = useState<WatchPreferences>(DEFAULT_WATCH_PREFERENCES);
  const [hydrated, setHydrated] = useState(false); const [storageAvailable, setStorageAvailable] = useState(true);
  const [activeId, setActiveId] = useState(WATCH_ITEMS[0]?.id ?? ""); const [savedOnly, setSavedOnly] = useState(false);
  const [detailItem, setDetailItem] = useState<WatchItem | null>(null); const [modalOpen, setModalOpen] = useState(false);
  const [requested, setRequested] = useState<{ readonly id: string; readonly segment: ManualSegment } | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null); const [consent, setConsent] = useState(false); const [photoError, setPhotoError] = useState("");
  const viewport = useRef<HTMLDivElement>(null); const onboarding = useRef<HTMLDialogElement>(null); const details = useRef<HTMLDialogElement>(null); const photoInput = useRef<HTMLInputElement>(null);
  const ranked = useMemo(() => rankWatchItems(items, profile, preferences).filter((entry) => !savedOnly || preferences.savedVideoIds.includes(entry.item.id)), [items, profile, preferences, savedOnly]);
  useEffect(() => { if (!creatorHydrated) return; try { setPreferences(parseWatchPreferences(localStorage.getItem(WATCH_PREFERENCES_KEY), items)); } catch (error) { if (error instanceof Error) setStorageAvailable(false); else throw error; } setHydrated(true); }, [creatorHydrated]);
  useEffect(() => { if (!hydrated || !storageAvailable) return; try { localStorage.setItem(WATCH_PREFERENCES_KEY, JSON.stringify(preferences)); } catch (error) { if (error instanceof Error) setStorageAvailable(false); else throw error; } }, [preferences, hydrated, storageAvailable]);
  useEffect(() => { if (hydrated && preferences.status === "new" && !onboarding.current?.open) { onboarding.current?.showModal(); setModalOpen(true); } }, [hydrated, preferences.status]);
  useEffect(() => () => { if (selfie) URL.revokeObjectURL(selfie); }, [selfie]);
  useEffect(() => {
    const root = viewport.current; if (!root) return;
    const observer = new IntersectionObserver((entries) => { for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio > .6) setActiveId(entry.target.getAttribute("data-watch-id") ?? ""); }, { root, threshold: [.6, .8] });
    root.querySelectorAll("[data-watch-id]").forEach((element) => observer.observe(element)); return () => observer.disconnect();
  }, [ranked]);
  useEffect(() => {
    function sizeFeed() { const element = viewport.current; if (!element) return; const nav = document.querySelector(".bc-mobile-nav"); const navHeight = nav && getComputedStyle(nav).display !== "none" ? nav.getBoundingClientRect().height : 0; element.style.setProperty("--watch-height", `${Math.max(320, window.innerHeight - Math.max(0, element.getBoundingClientRect().top) - navHeight - 16)}px`); }
    const frame = requestAnimationFrame(sizeFeed); window.addEventListener("resize", sizeFeed); return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", sizeFeed); };
  }, [locale]);
  function clearPhoto() { setSelfie(null); setConsent(false); if (photoInput.current) photoInput.current.value = ""; }
  function closeOnboarding(status: "complete" | "skipped") { setPreferences((current) => ({ ...current, status })); onboarding.current?.close(); setModalOpen(false); clearPhoto(); setPhotoError(""); }
  function move(direction: number) { const index = ranked.findIndex((entry) => entry.item.id === activeId); const next = ranked[Math.max(0, Math.min(ranked.length - 1, index + direction))]; if (next) viewport.current?.querySelector(`[data-watch-id="${next.item.id}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" }); }
  function openDetails(item: WatchItem) { setDetailItem(item); details.current?.showModal(); setModalOpen(true); }
  function acceptSelfie(file: File | undefined) { if (!file || !consent) return; if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) { setPhotoError(t("Choose a JPG, PNG or WebP under 8 MB.", "Chọn JPG, PNG hoặc WebP dưới 8 MB.", "8MB 이하 JPG, PNG, WebP 이미지를 선택하세요.")); return; } setPhotoError(""); setSelfie(URL.createObjectURL(file)); }
  return <section className={styles.page} data-testid="watch-feed">
    <header className={styles.toolbar}><div><p>STS WATCH</p><h1>{t("A little beauty, in motion.", "Vẻ đẹp trong từng chuyển động.", "움직임으로 만나는 뷰티.")}</h1></div><button type="button" aria-label={t("Customize your feed", "Tùy chỉnh bảng tin", "나의 피드 설정")} onClick={() => { onboarding.current?.showModal(); setModalOpen(true); }}><SlidersHorizontal size={17} /><span>{t("For you", "Dành cho bạn", "나에게 맞게")}</span></button></header>
    <div className={styles.feedTabs}><button type="button" aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}>{t("For you", "Dành cho bạn", "추천")}</button><button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly(true)}>{t("Saved videos", "Video đã lưu", "저장한 영상")} <span>{preferences.savedVideoIds.length}</span></button></div>
    {!storageAvailable && <p className={styles.storageNotice} role="status">{t("Storage is blocked; choices last for this visit.", "Không thể lưu; lựa chọn chỉ giữ trong lần truy cập này.", "저장이 제한되어 이번 방문 동안만 선택을 유지합니다.")}</p>}
    <div className={styles.feedLayout}><div ref={viewport} className={styles.viewport} tabIndex={0} aria-label={t("Vertical video feed", "Bảng video dọc", "세로 영상 피드")} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1); } }}>
      {ranked.map(({ item, reasons }) => <article key={item.id} className={styles.card} data-watch-id={item.id}>
        <WatchCard item={item} active={activeId === item.id} paused={modalOpen} requested={requested?.id === item.id ? requested.segment : null} />
        <div className={styles.cardInfo}><div className={styles.creatorRow}><span>{item.creator}</span><button type="button" aria-pressed={preferences.savedVideoIds.includes(item.id)} aria-label={t("Save video", "Lưu video", "영상 저장")} onClick={() => setPreferences((current) => ({ ...current, savedVideoIds: toggle(current.savedVideoIds, item.id) }))}><Bookmark size={18} fill={preferences.savedVideoIds.includes(item.id) ? "currentColor" : "none"} /></button></div><h2>{localize(item.title, locale)}</h2><p>{localize(reasons[0] ?? { en: "Curated beauty video", vi: "Video tuyển chọn", ko: "뷰티 큐레이션" }, locale)}</p><div className={styles.cardLinks}><button type="button" onClick={() => openDetails(item)}>{t("Steps & products", "Các bước và sản phẩm", "과정과 제품")}<ChevronRight size={16} /></button><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{t("Source", "Nguồn", "출처")}<ArrowUpRight size={13} /></a></div></div>
      </article>)}
      {ranked.length === 0 && <div className={styles.empty}><Bookmark size={28} /><h2>{t("Save a video to return to it here.", "Lưu video để xem lại ở đây.", "마음에 드는 영상을 저장해 보세요.")}</h2><button type="button" onClick={() => setSavedOnly(false)}>{t("Explore videos", "Khám phá video", "영상 둘러보기")}</button></div>}
    </div><div className={styles.feedArrows}><button type="button" onClick={() => move(-1)} aria-label={t("Previous video", "Video trước", "이전 영상")}><ArrowUp size={22} /></button><button type="button" onClick={() => move(1)} aria-label={t("Next video", "Video tiếp", "다음 영상")}><ArrowDown size={22} /></button><p>{t("Scroll or swipe", "Cuộn hoặc vuốt", "스크롤 또는 스와이프")}</p></div></div><LocalVideoPreview />
    <dialog ref={onboarding} className={styles.dialog} aria-labelledby="watch-onboarding-title" onCancel={(event) => { event.preventDefault(); closeOnboarding("skipped"); }} onClose={() => { setModalOpen(false); clearPhoto(); }}>
      <button type="button" className={styles.close} aria-label={t("Close setup", "Đóng thiết lập", "설정 닫기")} onClick={() => closeOnboarding("skipped")}><X size={20} /></button><p className={styles.eyebrow}>YOUR BEAUTY, YOUR CHOICES</p><h2 id="watch-onboarding-title">{t("Make this feed feel like you.", "Tạo bảng tin theo sở thích của bạn.", "나의 취향으로 채우는 피드.")}</h2><p>{t("You choose the details. A photo never diagnoses skin type or predicts a verified shade match.", "Bạn tự chọn thông tin. Ảnh không chẩn đoán loại da hay xác nhận màu phù hợp.", "아래 정보는 직접 선택합니다. 사진으로 피부타입을 진단하거나 색상 적합성을 판정하지 않습니다.")}</p>
      <div className={styles.fields}><label>{t("Your skin type", "Loại da", "내 피부타입")}<select value={profile.skinType} onChange={(event) => updateProfile({ skinType: beautyProfileSchema.shape.skinType.parse(event.target.value) })}><option value="unsure">{t("Not sure / skip", "Chưa rõ / bỏ qua", "잘 모르겠어요 / 건너뛰기")}</option><option value="dry">{t("Dry", "Da khô", "건성")}</option><option value="oily">{t("Oily", "Da dầu", "지성")}</option><option value="combination">{t("Combination", "Da hỗn hợp", "복합성")}</option><option value="normal">{t("Normal", "Da thường", "중성")}</option></select></label><label>{t("Preferred finish", "Độ hoàn thiện", "원하는 마무리")}<select value={profile.finish} onChange={(event) => updateProfile({ finish: beautyProfileSchema.shape.finish.parse(event.target.value) })}><option value="any">{t("Open to both", "Cả hai", "둘 다 좋아요")}</option><option value="glossy">{t("Glossy / dewy", "Bóng / căng mướt", "윤기 / 광택")}</option><option value="matte">{t("Soft matte", "Lì nhẹ", "소프트 매트")}</option></select></label><label>{t("Your climate", "Khí hậu", "사용 환경")}<select value={profile.climate} onChange={(event) => updateProfile({ climate: beautyProfileSchema.shape.climate.parse(event.target.value) })}><option value="humid">{t("Hot & humid", "Nóng ẩm", "덥고 습해요")}</option><option value="mild">{t("Mild / indoors", "Ôn hòa / trong nhà", "온화 / 실내")}</option></select></label></div>
      <fieldset className={styles.choices}><legend>{t("What would you like to explore?", "Bạn muốn khám phá gì?", "어떤 과정을 보고 싶나요?")}</legend>{(Object.keys(regionNames).filter((value): value is Region => value in regionNames)).map((region) => <label key={region}><input type="checkbox" checked={preferences.interests.includes(region)} onChange={() => setPreferences((current) => ({ ...current, interests: toggle(current.interests, region) }))} />{localize(regionNames[region], locale)}</label>)}</fieldset>
      <fieldset className={styles.choices}><legend>{t("Creators to see more of", "Tác giả bạn muốn xem thêm", "더 보고 싶은 크리에이터")}</legend>{creators.map((creator) => <label key={creator}><input type="checkbox" checked={preferences.creators.includes(creator)} onChange={() => setPreferences((current) => ({ ...current, creators: toggle(current.creators, creator) }))} />{creator}</label>)}</fieldset>
      <div className={styles.fields}><label>{t("Self-selected skin tone", "Tông da tự chọn", "직접 고른 피부톤")}<select value={preferences.skinTone} onChange={(event) => { const value = event.target.value; if (value === "unsure" || value === "light" || value === "medium" || value === "deep") setPreferences((current) => ({ ...current, skinTone: value })); }}><option value="unsure">{t("Not sure / skip", "Chưa rõ / bỏ qua", "잘 모르겠어요 / 건너뛰기")}</option><option value="light">{t("Light", "Sáng", "밝은 톤")}</option><option value="medium">{t("Medium", "Trung bình", "중간 톤")}</option><option value="deep">{t("Deep", "Trầm", "깊은 톤")}</option></select></label><label>{t("Self-selected undertone", "Sắc độ tự chọn", "직접 고른 언더톤")}<select value={preferences.undertone} onChange={(event) => { const value = event.target.value; if (value === "unsure" || value === "warm" || value === "cool" || value === "neutral") setPreferences((current) => ({ ...current, undertone: value })); }}><option value="unsure">{t("Not sure / skip", "Chưa rõ / bỏ qua", "잘 모르겠어요 / 건너뛰기")}</option><option value="warm">{t("Warm", "Ấm", "웜")}</option><option value="cool">{t("Cool", "Lạnh", "쿨")}</option><option value="neutral">{t("Neutral", "Trung tính", "뉴트럴")}</option></select></label></div>
      <section className={styles.selfie}><label className={styles.consent}><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); if (!event.target.checked) setSelfie(null); }} />{t("Optional: preview a selfie for my own visual comparison.", "Tùy chọn: xem ảnh selfie để tự so sánh.", "선택: 직접 비교할 셀카 미리보기를 사용합니다.")}</label><label className={styles.camera}><Camera size={17} />{t("Choose a photo / camera", "Chọn ảnh / máy ảnh", "사진 선택 / 카메라")}<input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" capture="user" disabled={!consent} onChange={(event) => { acceptSelfie(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>{selfie && <div className={styles.selfiePreview}><Image src={selfie} alt={t("Your temporary selfie preview", "Ảnh selfie tạm thời của bạn", "내 셀카 임시 미리보기")} width={180} height={180} unoptimized /><button type="button" onClick={() => setSelfie(null)}>{t("Remove photo", "Xóa ảnh", "사진 지우기")}</button></div>}{photoError && <p role="alert">{photoError}</p>}<p>{t("Photo stays in page memory, is never uploaded or saved, and clears when this sheet closes. Your selected preferences are saved on this browser.", "Ảnh chỉ ở bộ nhớ trang, không tải lên hay lưu, và xóa khi đóng bảng. Lựa chọn được lưu trên trình duyệt.", "사진은 현재 페이지 메모리에서만 보이고 업로드·저장하지 않으며 이 창을 닫으면 지워집니다. 직접 선택한 취향만 브라우저에 저장됩니다.")}</p></section>
      <p className={styles.limit}>{profile.climate === "humid" ? t("Hot/humid is your selected context. Climate-specific wear and skin compatibility are not established by these videos.", "Nóng ẩm là môi trường bạn chọn. Video không xác minh độ bền trong khí hậu hay độ hợp da.", "고온다습은 직접 고른 사용 환경입니다. 영상으로 환경별 지속력이나 피부 적합성을 확인한 것은 아닙니다.") : t("Your choices guide content order, not a medical or shade diagnosis.", "Lựa chọn hướng dẫn thứ tự nội dung, không phải chẩn đoán da hay màu.", "선택은 콘텐츠 순서에 반영되며 피부·색상 진단 결과가 아닙니다.")}</p><div className={styles.dialogActions}><button type="button" onClick={() => closeOnboarding("skipped")}>{t("Skip for now", "Bỏ qua", "지금은 건너뛰기")}</button><button type="button" onClick={() => { closeOnboarding("complete"); setSavedOnly(false); viewport.current?.scrollTo({ top: 0 }); }}><Check size={16} />{t("Show my feed", "Xem bảng tin của tôi", "나의 피드 보기")}</button></div>
    </dialog>
    <dialog ref={details} className={styles.dialog} aria-labelledby="watch-details-title" onClose={() => { setModalOpen(false); setDetailItem(null); }}><button type="button" className={styles.close} aria-label={t("Close details", "Đóng chi tiết", "상세 닫기")} onClick={() => details.current?.close()}><X size={20} /></button><h2 id="watch-details-title">{detailItem ? localize(detailItem.title, locale) : t("Steps & products", "Các bước và sản phẩm", "과정과 제품")}</h2>{detailItem && <WatchDetails item={detailItem} onJump={(segment) => { setRequested({ id: detailItem.id, segment }); details.current?.close(); }} />}</dialog>
  </section>;
}

function WatchCard({ item, active, paused, requested }: { readonly item: WatchItem; readonly active: boolean; readonly paused: boolean; readonly requested: ManualSegment | null }) {
  const { locale } = useBeautyCommerce(); const t = translator(locale); const video = useRef<HTMLVideoElement>(null); const frame = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(true); const mutedRef = useRef(true); const [blocked, setBlocked] = useState(false); const [mounted, setMounted] = useState(false);
  const ready = useRef(false); const pending = useRef<ManualSegment | null>(null); const stopAt = useRef<number | null>(null);
  const canPlay = useRef(false);
  const awaitingSeek = useRef<{ readonly target: number; readonly until: number } | null>(null);
  function post(type: "play" | "pause" | "mute" | "unMute" | "seekTo", value?: number) { frame.current?.contentWindow?.postMessage({ "x-tiktok-player": true, type, value }, TIKTOK_ORIGIN); }
  function playLocal() { const player = video.current; if (player) void player.play().catch((error: unknown) => { if (error instanceof Error && error.name !== "AbortError") setBlocked(true); }); }
  function applyPending() {
    const segment = pending.current; if (!segment || !canPlay.current) return;
    const player = video.current;
    if (item.media.kind === "local" && (!player || player.readyState < 1 || !Number.isFinite(player.duration))) return;
    if (item.media.kind === "tiktok" && !ready.current) return;
    if (player && segment.start >= player.duration) { pending.current = null; setBlocked(true); return; }
    stopAt.current = segment.end; awaitingSeek.current = { target: segment.start, until: performance.now() + 1_500 };
    pending.current = null;
    if (player) { player.loop = false; player.currentTime = segment.start; playLocal(); }
    else { post("seekTo", segment.start); post("play"); }
  }
  function updateTime(currentTime: number) {
    if (awaitingSeek.current) {
      const waiting = awaitingSeek.current;
      const landed = Math.abs(currentTime - waiting.target) <= .35 && (stopAt.current === null || currentTime < stopAt.current);
      if (!landed && performance.now() < waiting.until) return;
      awaitingSeek.current = null;
    }
    if (stopAt.current !== null && currentTime >= stopAt.current) { video.current?.pause(); post("pause"); stopAt.current = null; }
  }
  useEffect(() => { canPlay.current = active && !paused; if (video.current) { if (canPlay.current) { playLocal(); applyPending(); } else video.current.pause(); } if (!canPlay.current) post("pause"); else if (ready.current) { if (pending.current) applyPending(); else post("play"); } }, [active, paused]);
  useEffect(() => { if (requested) { pending.current = requested; applyPending(); } }, [requested]);
  useEffect(() => {
    ready.current = false;
    if (!active || item.media.kind !== "tiktok") { setMounted(false); return; }
    const timer = window.setTimeout(() => { if (!ready.current) setBlocked(true); }, 12_000);
    function receive(event: MessageEvent<unknown>) {
      if (event.origin !== TIKTOK_ORIGIN || event.source !== frame.current?.contentWindow) return;
      const message = parsePlayerMessage(event.data); if (!message) return;
      switch (message.kind) {
        case "ready": ready.current = true; setBlocked(false); post(mutedRef.current ? "mute" : "unMute"); if (pending.current) applyPending(); else post(canPlay.current ? "play" : "pause"); break;
        case "time": if (!ready.current) { ready.current = true; applyPending(); } setBlocked(false); updateTime(message.currentTime); break;
        case "error": setBlocked(true); break;
      }
    }
    window.addEventListener("message", receive); setMounted(true);
    return () => { clearTimeout(timer); window.removeEventListener("message", receive); setMounted(false); };
  }, [active, item.media.kind]);
  return <div className={styles.mediaArea}><div className={styles.mediaFrame}>
    {item.media.kind === "local" ? <video ref={video} src={item.media.src} poster={item.media.poster} muted={muted} loop playsInline controls preload={active ? "metadata" : "none"} aria-label={localize(item.title, locale)} onError={() => setBlocked(true)} onPlaying={() => { setBlocked(false); if (video.current && stopAt.current === null) video.current.loop = true; }} onEnded={() => { stopAt.current = null; awaitingSeek.current = null; }} onLoadedMetadata={applyPending} onTimeUpdate={() => { if (video.current) updateTime(video.current.currentTime); }}>{item.media.captions && <track kind="captions" src={item.media.captions} srcLang={item.id === "local-brush-practice" ? "vi" : "en"} label={item.id === "local-brush-practice" ? "Tiếng Việt" : "English"} />}</video> : active && mounted ? <iframe ref={frame} src={item.media.embedUrl} title={`${item.creator} TikTok`} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <div className={styles.inactive}><Play size={32} /><strong>{item.creator}</strong><span>TikTok · {t("Original creator video", "Video gốc", "크리에이터 원본")}</span></div>}
    </div><div className={styles.playerTools}><span>{item.media.kind === "local" ? t("Licensed technique demo", "Video kỹ thuật được cấp phép", "사용 허락된 시연 영상") : "TikTok · Original"}</span><button type="button" aria-label={muted ? t("Unmute", "Bật tiếng", "소리 켜기") : t("Mute", "Tắt tiếng", "소리 끄기")} onClick={() => { const next = !mutedRef.current; mutedRef.current = next; setMuted(next); post(next ? "mute" : "unMute"); }}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button></div>{blocked && active && <p className={styles.playbackNotice} role="status">{t("Use the video play button to start. If playback is restricted, steps and product notes remain available here.", "Nhấn nút phát để bắt đầu. Nếu bị hạn chế, các bước và ghi chú vẫn có ở đây.", "영상의 재생 버튼으로 시작하세요. 재생이 제한되어도 이 화면에서 과정과 제품 정보를 확인할 수 있습니다.")}</p>}</div>;
}

function WatchDetails({ item, onJump }: { readonly item: WatchItem; readonly onJump: (segment: ManualSegment) => void }) {
  const { locale } = useBeautyCommerce(); const t = translator(locale);
  const look = item.id === "local-glow-lip" ? getLook("glow-lip") : undefined;
  const localProducts = [...new Set(look?.steps.map((step) => step.productId) ?? [])].map(getProduct).filter((product) => product !== undefined);
  const segments = item.media.kind === "tiktok" ? getCreatorSegments(item.media.record) : look?.steps.map((step) => ({ start: step.start, end: step.end, label: localize(step.label, locale) })) ?? [{ start: 0, end: 3, label: t("Load the brush", "Lấy sản phẩm bằng cọ", "브러시에 덜기") }, { start: 3, end: 10, label: t("Brush application", "Tán bằng cọ", "브러시 도포") }, { start: 14, end: 20, label: t("Around the nose", "Quanh mũi", "코 주변 정리") }];
  const products = item.media.kind === "tiktok" ? SOURCE_PRODUCT_STACKS[normalizeTikTokUrl(item.sourceUrl)?.videoId ?? ""] ?? [] : [];
  return <div className={styles.detailBody}><p>{t("Steps are manually reviewed or supplied markers. Creator product names are caption evidence; exact appearance, shade and availability may be unconfirmed.", "Các bước được xem thủ công hoặc do người dùng ghi. Tên sản phẩm từ chú thích; hình ảnh, màu và tình trạng bán có thể chưa rõ.", "단계는 직접 검토하거나 입력한 탐색 구간입니다. 크리에이터 제품명은 설명 근거이며 실제 등장·색상·판매 여부는 미확인일 수 있습니다.")}</p>{segments.length > 0 ? <ol>{segments.map((segment) => <li key={segment.start}><button type="button" onClick={() => onJump(segment)}><Play size={14} /><time>{Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, "0")}</time>{segment.label}</button></li>)}</ol> : <p>{t("Step timing has not been reviewed for this video.", "Chưa xem xét mốc bước của video này.", "이 영상은 단계 시간을 아직 검토하지 않았습니다.")}</p>}{localProducts.length > 0 && <><p>{t("The clip's actual brand and shade are unknown. These are editorial product suggestions.", "Chưa rõ nhãn hiệu và màu trong video. Đây là sản phẩm do biên tập gợi ý.", "영상 속 실제 브랜드와 색상은 확인되지 않았습니다. 아래는 에디터의 참고 제품 제안입니다.")}</p>{localProducts.map((product) => <ProductPanel key={product.id} product={product} />)}</>}{products.length > 0 && <CreatorProductLayers products={products} sourceUrl={item.sourceUrl} focus={null} autoSeekLabel={false} onSeekLabel={(start) => onJump({ start, end: start + 1, label: "Product label" })} />}<Link className={styles.fullDetail} href={item.detailHref}>{t("Open the full routine & product notes", "Mở routine và ghi chú đầy đủ", "전체 루틴과 제품 정보 열기")}<ChevronRight size={16} /></Link><a className={styles.source} href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.creator} · {t("Original source", "Nguồn gốc", "원본 출처")}<ArrowUpRight size={13} /></a></div>;
}
