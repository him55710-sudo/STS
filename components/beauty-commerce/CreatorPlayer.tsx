"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { getReviewedSteps, normalizeTikTokUrl, parsePlayerMessage, TIKTOK_ORIGIN } from "@/lib/beauty-commerce/tiktok";
import type { CreatorRecord, ManualSegment } from "@/lib/beauty-commerce/tiktok";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, translator } from "@/lib/beauty-commerce/types";
import styles from "./CreatorLibrary.module.css";

export function CreatorPlayer({ record, segments, onChooseStep, requestedStep }: { readonly record: CreatorRecord; readonly segments: readonly ManualSegment[]; readonly onChooseStep?: (start: number) => void; readonly requestedStep?: ManualSegment | null }) {
  const { locale } = useBeautyCommerce();
  const t = translator(locale);
  const frame = useRef<HTMLIFrameElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const awaitingSeek = useRef<{ readonly target: number; readonly until: number } | null>(null);
  const stopAt = useRef<number | null>(null);
  const duration = useRef<number | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [activeStart, setActiveStart] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const [mounted, setMounted] = useState(false);
  const source = normalizeTikTokUrl(record.url);
  const reviewed = getReviewedSteps(record);
  const activeReview = reviewed.find((step) => step.start === activeStart);

  function send(type: "seekTo" | "play" | "pause", value?: number) {
    frame.current?.contentWindow?.postMessage({ "x-tiktok-player": true, type, value }, TIKTOK_ORIGIN);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => setState((current) => current === "loading" ? "unavailable" : current), 12_000);
    function resumePending() {
      if (pendingSeek.current === null) return;
      send("seekTo", pendingSeek.current); send("play"); pendingSeek.current = null;
    }
    function receive(event: MessageEvent<unknown>) {
      if (event.origin !== TIKTOK_ORIGIN || event.source !== frame.current?.contentWindow) return;
      const message = parsePlayerMessage(event.data);
      if (!message) return;
      switch (message.kind) {
        case "ready":
          setState("ready");
          resumePending();
          break;
        case "time":
          setState("ready");
          duration.current = message.duration;
          resumePending();
          if (awaitingSeek.current !== null) {
            const waiting = awaitingSeek.current;
            const landed = Math.abs(message.currentTime - waiting.target) <= .35 && (stopAt.current === null || message.currentTime < stopAt.current);
            if (!landed && performance.now() < waiting.until) return;
            awaitingSeek.current = null;
          }
          if (stopAt.current !== null && message.currentTime >= stopAt.current) { send("pause"); stopAt.current = null; }
          break;
        case "error": setState("unavailable"); break;
      }
    }
    window.addEventListener("message", receive);
    setMounted(true);
    return () => { window.clearTimeout(timer); window.removeEventListener("message", receive); };
  }, [reload]);

  function chooseSegment(segment: ManualSegment) {
    if (duration.current !== null && segment.start >= duration.current) { setState("unavailable"); return; }
    setActiveStart(segment.start);
    awaitingSeek.current = { target: segment.start, until: performance.now() + 1_500 };
    onChooseStep?.(segment.start);
    stopAt.current = segment.end;
    if (state === "ready") { send("seekTo", segment.start); send("play"); }
    else { pendingSeek.current = segment.start; send("play"); }
  }
  useEffect(() => { if (requestedStep) chooseSegment(requestedStep); }, [requestedStep]);
  if (!source) return null;
  return (
    <section className={styles.playerSection} aria-label={t("Original TikTok video", "Video TikTok gốc", "틱톡 원본 영상")}>
      <div className={styles.playerFrame}>
        {mounted && <iframe
          key={reload} ref={frame} src={source.embedUrl} title={`${record.author || `@${source.handle}`} · TikTok`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin" onError={() => setState("unavailable")}
        />}
      </div>
      {state !== "ready" && <div className={styles.playerNotice} role="status">
        <p>{state === "loading" ? t("Press play to start. Step controls activate when the video is ready.", "Nhấn phát để bắt đầu. Các bước bật khi video sẵn sàng.", "재생 버튼으로 시작하세요. 영상이 준비되면 단계 이동이 연결됩니다.") : t("The video could not start here. Try again; product notes remain available.", "Video chưa thể phát. Hãy thử lại; ghi chú sản phẩm vẫn khả dụng.", "영상을 재생하지 못했습니다. 다시 시도해 주세요. 제품 정보는 계속 볼 수 있습니다.")}</p>
        {state === "unavailable" && <button type="button" onClick={() => { setState("loading"); setReload((value) => value + 1); }}><RotateCcw size={14} />{t("Reload player", "Tải lại trình phát", "플레이어 다시 불러오기")}</button>}
      </div>}
      {segments.length > 0 && reviewed.length === 0 && <div className={styles.manualTimeline}>
        <p className={styles.smallLabel}>{reviewed.length ? t("REVIEWED APPLICATION STEPS", "CÁC BƯỚC ĐÃ XEM XÉT", "직접 검토한 도포 단계") : t("YOUR STEP MARKERS", "MỐC BƯỚC CỦA BẠN", "직접 입력한 단계")}</p>
        {reviewed.length > 0 && <p className={styles.finePrint}>{t("Approximate phases reviewed from original playback. Product identification is a separate source check.", "Các giai đoạn gần đúng đã xem trên video gốc. Nhận diện sản phẩm là bước kiểm tra riêng.", "원본을 직접 재생해 검토한 대략적인 탐색 구간입니다. 제품 식별 근거는 별도로 안내합니다.")}</p>}
        <ol>{segments.map((segment) => { const step = reviewed.find((item) => item.start === segment.start); return <li key={segment.start}><button type="button" onClick={() => chooseSegment(segment)} aria-pressed={activeStart === segment.start}><Play size={13} /><time>{Math.floor(segment.start / 60)}:{String(segment.start % 60).padStart(2, "0")}</time><span>{step ? localize(step.label, locale) : segment.label}</span></button></li>; })}</ol>
      </div>}
      {activeReview && <p className={styles.notice} aria-live="polite"><strong>{localize(activeReview.label, locale)}</strong><br />{localize(activeReview.observation, locale)}</p>}
      <p className={styles.finePrint}>{t("Original creator and music credits stay in the official player. Product notes are displayed beside it.", "Thông tin tác giả và nhạc được giữ trong trình phát chính thức. Ghi chú sản phẩm hiển thị bên cạnh.", "크리에이터와 음원 출처는 공식 플레이어에 유지됩니다. 제품 정보는 영상 옆에 표시합니다.")}</p>
    </section>
  );
}
