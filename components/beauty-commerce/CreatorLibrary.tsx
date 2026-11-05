"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, FileText, Link2, Play, Plus, Trash2 } from "lucide-react";
import { analyzeCreatorCaption, getCreatorSegments, getReviewedSteps, normalizeTikTokUrl, parseTimestampLines, SOURCE_PRODUCT_STACKS, tikTokMetadataSchema } from "@/lib/beauty-commerce/tiktok";
import type { CreatorRecord, ManualSegment } from "@/lib/beauty-commerce/tiktok";
import { getProduct } from "@/lib/beauty-commerce/catalog";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, translator } from "@/lib/beauty-commerce/types";
import type { Region } from "@/lib/beauty-commerce/types";
import { ProductPanel } from "./ProductPanel";
import { CreatorProductLayers } from "./CreatorProductLayers";
import { CreatorPlayer } from "./CreatorPlayer";
import { useCreatorLibrary } from "./useCreatorLibrary";
import styles from "./CreatorLibrary.module.css";

export function CreatorLibrary() {
  const { locale } = useBeautyCommerce();
  const t = translator(locale);
  const { records, hydrated, storageAvailable, addRecords, updateRecord, updateMetadata, removeRecord } = useCreatorLibrary();
  const [urls, setUrls] = useState("");
  const [error, setError] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");
  const [layerFocus, setLayerFocus] = useState<{ readonly region: Region | "all"; readonly productName?: string; readonly sourceUrl: string } | null>(null);
  const [requestedStep, setRequestedStep] = useState<(ManualSegment & { readonly sourceUrl: string }) | null>(null);
  const initialSelectionApplied = useRef(false);
  const [metadataStates, setMetadataStates] = useState<Readonly<Record<string, "loading" | "available" | "unavailable">>>({});
  const active = records.find((record) => record.url === selectedUrl) ?? records[0];

  useEffect(() => {
    if (!hydrated || initialSelectionApplied.current) return;
    initialSelectionApplied.current = true;
    const videoId = new URLSearchParams(window.location.search).get("video");
    const record = records.find((item) => normalizeTikTokUrl(item.url)?.videoId === videoId);
    if (record) setSelectedUrl(record.url);
  }, [hydrated, records]);

  function chooseRecord(record: CreatorRecord) {
    setSelectedUrl(record.url);
    setLayerFocus(null);
    setRequestedStep(null);
    const source = normalizeTikTokUrl(record.url);
    if (!source) return;
    const url = new URL(window.location.href);
    url.searchParams.set("video", source.videoId);
    window.history.replaceState(window.history.state, "", url);
  }

  function importVideos() {
    const lines = urls.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0 || lines.length > 20) { setError(t("Add 1–20 full video links, one per line.", "Thêm 1–20 liên kết đầy đủ, mỗi dòng một video.", "영상 전체 링크를 한 줄에 하나씩, 1~20개 입력하세요.")); return; }
    const sources = lines.map(normalizeTikTokUrl);
    if (sources.some((source) => source === null)) { setError(t("Use https://www.tiktok.com/@creator/video/id links only.", "Chỉ dùng liên kết https://www.tiktok.com/@creator/video/id.", "https://www.tiktok.com/@creator/video/id 형식의 링크를 사용하세요.")); return; }
    const incoming: CreatorRecord[] = [];
    for (const source of sources) if (source) incoming.push({ url: source.url, title: "", author: `@${source.handle}`, caption: "", timestamps: "", captionOrigin: "manual", titleOrigin: "manual", timestampOrigin: "manual" });
    const total = new Set([...records.map((record) => record.url), ...incoming.map((record) => record.url)]).size;
    if (total > 20) { setError(t("This library holds up to 20 videos. Remove a saved link first.", "Thư viện lưu tối đa 20 video. Hãy xóa một liên kết trước.", "최대 20개까지 보관할 수 있습니다. 기존 링크를 먼저 정리하세요.")); return; }
    addRecords(incoming);
    if (incoming[0]) chooseRecord(incoming[0]);
    setUrls(""); setError("");
  }

  async function fetchMetadata(record: CreatorRecord) {
    setMetadataStates((current) => ({ ...current, [record.url]: "loading" }));
    try {
      const response = await fetch("/api/beauty/tiktok", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: record.url }), signal: AbortSignal.timeout(7_000) });
      const raw: unknown = await response.json();
      const parsed = tikTokMetadataSchema.safeParse(raw);
      if (response.ok && parsed.success && parsed.data.status === "available") {
        updateMetadata(record.url, { title: parsed.data.title, author: parsed.data.author });
        setMetadataStates((current) => ({ ...current, [record.url]: "available" }));
      } else setMetadataStates((current) => ({ ...current, [record.url]: "unavailable" }));
    } catch (requestError) {
      if (requestError instanceof Error) setMetadataStates((current) => ({ ...current, [record.url]: "unavailable" }));
      else throw requestError;
    }
  }

  return (
    <div className={styles.page} data-testid="creator-library">
      <header className={styles.hero}>
        <p className={styles.eyebrow}>CREATOR ROUTINES · TIKTOK</p>
        <h1>{t("Real routines. Original creators.", "Routine thật. Tác giả gốc.", "크리에이터의 실제 루틴.")}</h1>
        <p>{t("Bring Korean beauty videos into one library. Keep the source, mark the steps, and explore products named in the creator’s text.", "Lưu video làm đẹp Hàn Quốc vào một thư viện. Giữ nguồn gốc, đánh dấu các bước và khám phá sản phẩm được nhắc trong nội dung.", "한국 뷰티 영상을 한곳에 모으고, 원문과 화장 단계, 크리에이터가 언급한 제품을 함께 확인하세요.")}</p>
        <a href="#import-videos">{t("Add creator videos", "Thêm video của tác giả", "크리에이터 영상 추가")}<ArrowDown size={15} /></a>
      </header>
      {!storageAvailable && <p className={styles.error} role="status">{t("Device storage is unavailable. Your library works for this visit only.", "Không thể lưu trên thiết bị. Thư viện chỉ khả dụng trong lần truy cập này.", "기기에 저장할 수 없어 이번 방문 동안만 라이브러리를 사용할 수 있습니다.")}</p>}
      {!active ? <section className={styles.empty}><Link2 size={26} /><h2>{t("Your first creator routine starts here.", "Routine đầu tiên của bạn bắt đầu ở đây.", "첫 크리에이터 루틴을 모아보세요.")}</h2><p>{t("Add an original TikTok link below to start your library.", "Thêm liên kết TikTok gốc bên dưới để bắt đầu.", "아래에 틱톡 원문 링크를 입력하면 영상과 제품 메모를 함께 보관할 수 있습니다.")}</p></section> : <>
        <div className={styles.libraryRail} aria-label={t("Saved creator videos", "Video tác giả đã lưu", "저장한 크리에이터 영상")}>{records.map((record, index) => <button key={record.url} type="button" onClick={() => chooseRecord(record)} aria-pressed={active.url === record.url}><span>{String(index + 1).padStart(2, "0")}</span>{record.author || normalizeTikTokUrl(record.url)?.handle}</button>)}</div>
        <section className={styles.detail} aria-label={t("Creator video details", "Chi tiết video tác giả", "크리에이터 영상 상세")}>
          <CreatorPlayer key={active.url} record={active} segments={getCreatorSegments(active)} requestedStep={requestedStep?.sourceUrl === active.url ? requestedStep : null} onChooseStep={(start) => { const step = getReviewedSteps(active).find((item) => item.start === start); if (step) setLayerFocus({ region: step.region, productName: step.productName, sourceUrl: active.url }); }} />
          <div className={styles.detailsColumn}>
            <div className={styles.videoHeading}><div><p className={styles.eyebrow}>ORIGINAL SOURCE</p><h2>{active.author}</h2></div><button type="button" className={styles.remove} onClick={() => { setRequestedStep(null); setLayerFocus(null); removeRecord(active.url); }} aria-label={t("Remove video", "Xóa video", "영상 삭제")}><Trash2 size={17} /></button></div>
            <a className={styles.sourceUrl} href={active.url} target="_blank" rel="noopener noreferrer">{active.url}<ArrowUpRight size={14} /></a>
            <button type="button" className={styles.metadataButton} onClick={() => void fetchMetadata(active)} disabled={metadataStates[active.url] === "loading"}><FileText size={15} />{metadataStates[active.url] === "loading" ? t("Loading public metadata…", "Đang tải thông tin công khai…", "공개 정보를 불러오는 중…") : t("Fetch public TikTok metadata", "Lấy thông tin công khai từ TikTok", "틱톡 공개 정보 불러오기")}</button>
            {metadataStates[active.url] === "unavailable" && <p className={styles.notice} role="status">{t("TikTok metadata is unavailable. Keep the original link and paste the creator’s product list below.", "Không lấy được thông tin TikTok. Giữ liên kết gốc và dán danh sách sản phẩm của tác giả bên dưới.", "틱톡 공개 정보를 가져올 수 없습니다. 원문 링크를 유지하고 아래에 크리에이터의 제품 목록을 붙여 넣어 주세요.")}</p>}
            {active.title && <blockquote className={styles.publicCaption}><span>{active.titleOrigin === "oembed" ? t("Public TikTok metadata", "Thông tin công khai từ TikTok", "틱톡 공개 정보") : t("Creator caption · source note", "Ghi chú nguồn được lập chỉ mục · không phải bản chép lời", "검색된 원문 정보 · 영상 대본 아님")}</span>{active.title}</blockquote>}
            {getReviewedSteps(active).length > 0 && <section className={styles.reviewedSteps} aria-label={t("Reviewed application steps", "Các bước đã xem xét", "직접 검토한 도포 단계")}>
              <h3>{t("Watch how the layers come together", "Xem từng lớp kết hợp ra sao", "레이어가 쌓이는 실제 과정")}</h3><p>{t("Manually reviewed, approximate phases. Choose one to jump in and explore that area's products.", "Các đoạn gần đúng đã xem thủ công. Chọn để chuyển đến đoạn và sản phẩm của vùng đó.", "원본을 직접 검토한 대략적인 구간입니다. 단계를 누르면 영상과 관련 부위의 제품이 함께 연결됩니다.")}</p>
              <div>{getReviewedSteps(active).map((step) => <button key={step.start} type="button" aria-pressed={requestedStep?.start === step.start} onClick={() => setRequestedStep({ start: step.start, end: step.end, label: step.label.en, sourceUrl: active.url })}><Play size={12} /><time>{Math.floor(step.start / 60)}:{String(step.start % 60).padStart(2, "0")}</time><span>{localize(step.label, locale)}</span></button>)}</div>
            </section>}
            <CreatorEvidence record={active} focus={layerFocus?.sourceUrl === active.url ? layerFocus : null} onSeekLabel={(start) => setRequestedStep({ start, end: start + 1, label: "Product label", sourceUrl: active.url })} />
            <details className={styles.editNotes}><summary>{t("Edit product notes & step markers", "Sửa ghi chú và mốc bước", "제품 메모와 단계 편집")}</summary><CreatorNotes key={active.url} record={active} onSave={updateRecord} /></details>
          </div>
        </section>
      </>}
      <section className={styles.importer} id="import-videos" aria-labelledby="import-title">
        <div><span className={styles.sectionIndex}>01 / LIBRARY</span><h2 id="import-title">{t("Start with the original links.", "Bắt đầu từ liên kết gốc.", "원문 링크로 시작하세요.")}</h2><p>{t("Saved on this device. Add captions and timestamps separately for each video.", "Lưu trên thiết bị này. Thêm chú thích và mốc thời gian riêng cho từng video.", "이 기기에 저장됩니다. 영상마다 설명과 타임스탬프를 따로 입력할 수 있습니다.")}</p></div>
        <form onSubmit={(event) => { event.preventDefault(); importVideos(); }}>
          <label htmlFor="creator-urls">{t("TikTok video links · one per line", "Liên kết TikTok · mỗi dòng một video", "틱톡 영상 링크 · 한 줄에 하나씩")}</label>
          <textarea id="creator-urls" value={urls} onChange={(event) => setUrls(event.target.value)} rows={3} maxLength={10_000} placeholder="https://www.tiktok.com/@creator/video/…" required />
          <div className={styles.formActions}><span>{records.length}/20 {t("videos", "video", "개 영상")}</span><button type="submit" disabled={!hydrated}><Plus size={16} />{t("Add to library", "Thêm vào thư viện", "라이브러리에 추가")}</button></div>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </form>
      </section>
    </div>
  );
}

function CreatorNotes({ record, onSave }: { readonly record: CreatorRecord; readonly onSave: (record: CreatorRecord) => void }) {
  const { locale } = useBeautyCommerce();
  const t = translator(locale);
  const [caption, setCaption] = useState(record.caption);
  const [timestamps, setTimestamps] = useState(record.timestamps);
  const [saved, setSaved] = useState(false);
  const parsed = parseTimestampLines(timestamps);
  return <form className={styles.notes} onSubmit={(event) => { event.preventDefault(); if (parsed.errors.length === 0) { onSave({ ...record, caption, timestamps, captionOrigin: "manual", timestampOrigin: "manual" }); setSaved(true); } }}>
    <label htmlFor="creator-caption">{t("Creator caption / product list", "Chú thích / danh sách sản phẩm của tác giả", "크리에이터 설명 / 제품 목록")}</label>
    <textarea id="creator-caption" value={caption} onChange={(event) => { setCaption(event.target.value); setSaved(false); }} rows={4} maxLength={12_000} placeholder={t("Paste the creator’s own product list, with brand and product names.", "Dán danh sách sản phẩm của tác giả, gồm tên thương hiệu và sản phẩm.", "브랜드와 제품명이 있는 크리에이터의 제품 목록을 붙여 넣어 주세요.")} />
    <label htmlFor="creator-timestamps">{t("Manual step timestamps · mm:ss step name", "Mốc thời gian thủ công · mm:ss tên bước", "직접 입력하는 단계 · mm:ss 단계명")}</label>
    <textarea id="creator-timestamps" value={timestamps} onChange={(event) => { setTimestamps(event.target.value); setSaved(false); }} rows={3} maxLength={4_000} placeholder={"00:00 Skin prep\n00:12 Base\n00:30 Lips"} />
    {parsed.errors.map((item) => <p className={styles.error} key={item.line}>Line {item.line}: {item.message}</p>)}
    <button type="submit" disabled={parsed.errors.length > 0}>{saved ? <Check size={16} /> : <Plus size={16} />}{saved ? t("Notes saved", "Đã lưu ghi chú", "메모 저장됨") : t("Save and analyze text", "Lưu và phân tích nội dung", "저장하고 텍스트 분석")}</button>
    <p className={styles.finePrint}>{t("Text and timestamps you provide are manual source notes, not independently verified usage.", "Nội dung và mốc thời gian do bạn cung cấp là ghi chú thủ công, chưa xác minh độc lập.", "입력한 설명과 시간은 사용자가 제공한 메모이며 실제 사용 사실을 독립적으로 확인한 정보는 아닙니다.")}</p>
  </form>;
}

function CreatorEvidence({ record, focus, onSeekLabel }: { readonly record: CreatorRecord; readonly focus: { readonly region: Region | "all"; readonly productName?: string } | null; readonly onSeekLabel: (start: number) => void }) {
  const { locale } = useBeautyCommerce();
  const t = translator(locale);
  const caption = record.caption || record.title;
  const evidence = analyzeCreatorCaption(caption);
  const sourceProducts = SOURCE_PRODUCT_STACKS[normalizeTikTokUrl(record.url)?.videoId ?? ""] ?? [];
  return <section className={styles.evidence} aria-labelledby="evidence-title">
    <p className={styles.sectionIndex}>02 / PRODUCT EVIDENCE</p><h2 id="evidence-title">{t("Products from the creator caption.", "Nội dung thực sự nhắc đến gì.", "텍스트에 실제로 언급된 제품.")}</h2>
    <p className={styles.notice}>{t("Name matching only. It does not confirm a product was used, its ingredients, or suitability for your skin.", "Chỉ đối chiếu tên. Không xác nhận sản phẩm đã dùng, thành phần hoặc độ phù hợp với da.", "이름을 대조한 결과입니다. 실제 사용 여부나 성분, 피부 적합성을 확인한 분석은 아닙니다.")}</p>
    {sourceProducts.length > 0 && <CreatorProductLayers key={record.url} products={sourceProducts} sourceUrl={record.url} focus={focus} onSeekLabel={onSeekLabel} />}
    {evidence.length === 0 && sourceProducts.length === 0 && <p className={styles.noEvidence}>{caption ? t("No named products matched the current STS catalog.", "Không có tên sản phẩm khớp danh mục STS hiện tại.", "현재 STS 카탈로그와 일치하는 제품명이 없습니다.") : t("Add the creator’s text to find catalog candidates.", "Thêm nội dung của tác giả để tìm sản phẩm gợi ý.", "크리에이터 설명을 추가하면 카탈로그 후보를 확인할 수 있습니다.")}</p>}
    {(sourceProducts.length === 0 || record.captionOrigin === "manual") && evidence.map((item) => { const product = getProduct(item.productId); const indexed = record.caption ? record.captionOrigin === "indexed-source" : record.titleOrigin === "indexed-source"; return product ? <div className={styles.candidate} key={item.productId}><span className={styles.evidenceLabel}>{item.strength === "product-name-mentioned" ? t("Product name mentioned", "Có nhắc tên sản phẩm", "제품명 언급") : t("Brand mentioned · product unconfirmed", "Nhắc thương hiệu · chưa rõ sản phẩm", "브랜드만 언급 · 제품 미확인")}</span><blockquote>{item.excerpt}</blockquote><small>{indexed ? t("Source: creator caption note · shade unconfirmed", "Nguồn: tên sản phẩm trong chú thích được lập chỉ mục · chưa rõ màu", "근거: 검색된 원문 설명의 제품명 · 색상 미확인") : record.caption ? t("Evidence: supplied caption", "Nguồn: chú thích được cung cấp", "근거: 입력한 설명") : t("Evidence: public metadata", "Nguồn: thông tin công khai", "근거: 공개 정보")}</small><ProductPanel product={product} /></div> : null; })}
  </section>;
}
