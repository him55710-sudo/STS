"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ChevronDown, Film, Upload, X } from "lucide-react";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { translator } from "@/lib/beauty-commerce/types";
import styles from "./LocalVideoPreview.module.css";

type Preview = { readonly url: string; readonly name: string };

export function LocalVideoPreview() {
  const { locale } = useBeautyCommerce();
  const t = translator(locale);
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  function chooseVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size === 0 || !file.type.startsWith("video/")) {
      setError(t("Choose a non-empty video file to preview.", "Chọn tệp video có nội dung để xem thử.", "내용이 있는 영상 파일을 선택해 주세요."));
      event.target.value = "";
      return;
    }
    setError("");
    setPreview({ url: URL.createObjectURL(file), name: file.name });
  }

  function clearPreview() {
    setPreview(null);
    setError("");
    if (input.current) input.current.value = "";
  }

  return <details className={styles.disclosure}>
    <summary className={styles.summary}>
      <Film size={18} aria-hidden="true" />
      <span>{t("Preview your own video", "Xem thử video của bạn", "내 영상 미리보기")}</span>
      <ChevronDown size={17} className={styles.chevron} aria-hidden="true" />
    </summary>
    <div className={styles.content}>
      <p id={`${inputId}-privacy`} className={styles.description}>
        {t("Preview stays on this device for this session. Nothing is uploaded or saved.", "Video xem thử chỉ ở trên thiết bị này trong phiên hiện tại. Không có nội dung nào được tải lên hoặc lưu lại.", "미리보기는 현재 세션 동안 이 기기에만 유지됩니다. 파일은 업로드되거나 저장되지 않습니다.")}
      </p>
      <label className={styles.fileLabel} htmlFor={inputId}>
        <Upload size={16} aria-hidden="true" />
        {t("Choose a video", "Chọn video", "영상 선택")}
        <input ref={input} id={inputId} type="file" accept="video/*" onChange={chooseVideo} className={styles.fileInput} aria-describedby={`${inputId}-privacy ${inputId}-rights`} />
      </label>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {preview && <div className={styles.preview}>
        <div className={styles.previewHeading}>
          <p className={styles.fileName} title={preview.name}>{preview.name}</p>
          <button type="button" className={styles.remove} onClick={clearPreview} aria-label={t("Remove video preview", "Xóa video xem thử", "영상 미리보기 닫기")}><X size={17} aria-hidden="true" /></button>
        </div>
        <video key={preview.url} src={preview.url} className={styles.video} controls playsInline preload="metadata" aria-label={t("Your local video preview", "Video xem thử trên thiết bị của bạn", "내 로컬 영상 미리보기")} onError={() => setError(t("This browser could not play that video. Try another video format.", "Trình duyệt không thể phát video này. Hãy thử định dạng khác.", "브라우저가 이 영상을 재생하지 못했습니다. 다른 형식의 영상을 선택해 주세요."))} />
      </div>}
      <p id={`${inputId}-rights`} className={styles.rights}>{t("Publishing needs the creator’s video and music rights.", "Để xuất bản, cần có quyền sử dụng video và âm nhạc của nhà sáng tạo.", "게시하려면 크리에이터의 영상과 음악 사용 권한이 필요합니다.")}</p>
    </div>
  </details>;
}
