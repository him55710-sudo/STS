"use client";

import {
  CREATOR_CONTENT_KIND_OPTIONS,
  CREATOR_DISCLOSURE_OPTIONS,
  CREATOR_RIGHTS_KIND_OPTIONS,
  type CreatorPublishGate,
  type CreatorPublishMetadata,
  type CreatorUploadedAsset,
} from "./creator-publishing";

type CreatorPublishingControlsProps = {
  readonly metadata: CreatorPublishMetadata;
  readonly assets: readonly CreatorUploadedAsset[];
  readonly gate: CreatorPublishGate;
  readonly onMetadataChange: (patch: Partial<CreatorPublishMetadata>) => void;
  readonly onAssetAltTextChange: (localId: string, altText: string) => void;
  readonly onAssetApprovalChange: (localId: string, displayApproved: boolean) => void;
};

export function CreatorPublishingControls({
  metadata,
  assets,
  gate,
  onMetadataChange,
  onAssetAltTextChange,
  onAssetApprovalChange,
}: CreatorPublishingControlsProps) {
  return (
    <section className="mt-5 border-t border-line px-4 pt-5" aria-label="발행 설정">
      <div className="rounded-(--radius-card) border border-line bg-surface p-4">
        <div>
          <label htmlFor="creator-content-kind" className="text-[12px] font-semibold text-ink-2">
            콘텐츠 종류
          </label>
          <select
            id="creator-content-kind"
            value={metadata.contentKind}
            onChange={(event) => onMetadataChange({ contentKind: event.target.value as CreatorPublishMetadata["contentKind"] })}
            className="mt-1.5 h-10 w-full rounded-(--radius-btn) border border-line bg-surface px-3 text-[13px] outline-none focus:border-accent"
          >
            {CREATOR_CONTENT_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="출처 제공자" value={metadata.sourceProvider} onChange={(value) => onMetadataChange({ sourceProvider: value })} />
          <Field label="출처 식별자" value={metadata.sourceIdentity} onChange={(value) => onMetadataChange({ sourceIdentity: value })} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="광고/제휴 표시"
            value={metadata.disclosureKind}
            options={CREATOR_DISCLOSURE_OPTIONS}
            onChange={(value) => onMetadataChange({ disclosureKind: value })}
          />
          <Field label="표시 문구" value={metadata.disclosureLabel} onChange={(value) => onMetadataChange({ disclosureLabel: value })} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="권리 상태"
            value={metadata.rightsKind}
            options={CREATOR_RIGHTS_KIND_OPTIONS}
            onChange={(value) => onMetadataChange({ rightsKind: value })}
          />
          <Field label="권리 근거" value={metadata.rightsEvidence} onChange={(value) => onMetadataChange({ rightsEvidence: value })} />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <p className="text-[12px] font-semibold text-ink-2">미디어 검토</p>
          {assets.length === 0 ? (
            <p className="rounded-(--radius-btn) bg-surface-2 px-3 py-3 text-[12px] text-ink-2">
              업로드된 미디어가 없습니다.
            </p>
          ) : (
            assets.map((asset, index) => (
              <AssetReviewRow
                key={asset.localId}
                asset={asset}
                index={index}
                onAltTextChange={onAssetAltTextChange}
                onApprovalChange={onAssetApprovalChange}
              />
            ))
          )}
        </div>

        {gate.kind === "blocked" && (
          <p className="mt-3 rounded-(--radius-btn) bg-brand-peach px-3 py-2 text-[12px] font-medium text-brand-peach-ink">
            {gate.reason}
          </p>
        )}
      </div>
    </section>
  );
}

type FieldProps = {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
};

function Field({ label, value, onChange }: FieldProps) {
  const id = `creator-${label.replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={id} className="text-[12px] font-semibold text-ink-2">
      {label}
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-(--radius-btn) border border-line bg-surface px-3 text-[13px] font-normal text-ink outline-none focus:border-accent"
      />
    </label>
  );
}

type SelectFieldProps<TValue extends string> = {
  readonly label: string;
  readonly value: TValue;
  readonly options: readonly { readonly value: TValue; readonly label: string }[];
  readonly onChange: (value: TValue) => void;
};

function SelectField<TValue extends string>({ label, value, options, onChange }: SelectFieldProps<TValue>) {
  const id = `creator-${label.replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={id} className="text-[12px] font-semibold text-ink-2">
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as TValue)}
        className="mt-1.5 h-10 w-full rounded-(--radius-btn) border border-line bg-surface px-3 text-[13px] font-normal text-ink outline-none focus:border-accent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type AssetReviewRowProps = {
  readonly asset: CreatorUploadedAsset;
  readonly index: number;
  readonly onAltTextChange: (localId: string, altText: string) => void;
  readonly onApprovalChange: (localId: string, displayApproved: boolean) => void;
};

function AssetReviewRow({ asset, index, onAltTextChange, onApprovalChange }: AssetReviewRowProps) {
  const approvalEnabled = asset.uploadState === "ready" && asset.moderationState === "approved";
  return (
    <div className="rounded-(--radius-btn) border border-line p-3">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.previewUrl} alt="" className="h-14 w-11 shrink-0 rounded-[8px] border border-line object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">
            {index + 1}. {asset.fileName}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-2">
            처리 {asset.uploadState} · 모더레이션 {asset.moderationState} · 후보 {asset.reviewState}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-2">후보 {asset.candidates.length}개 연결됨</p>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-2">
          <input
            type="checkbox"
            checked={asset.displayApproved}
            disabled={!approvalEnabled}
            onChange={(event) => onApprovalChange(asset.localId, event.target.checked)}
            className="h-4 w-4 accent-(--color-accent)"
          />
          표시 승인
        </label>
      </div>
      <label htmlFor={`asset-alt-${asset.localId}`} className="mt-3 block text-[12px] font-semibold text-ink-2">
        대체 텍스트
        <input
          id={`asset-alt-${asset.localId}`}
          value={asset.altText}
          onChange={(event) => onAltTextChange(asset.localId, event.target.value)}
          className="mt-1.5 h-9 w-full rounded-(--radius-btn) border border-line bg-surface px-3 text-[13px] font-normal text-ink outline-none focus:border-accent"
        />
      </label>
      {asset.error && <p className="mt-2 text-[11px] font-medium text-brand-peach-ink">{asset.error}</p>}
    </div>
  );
}
