"use client";

export function MixedFeedCarouselControls({
  activeIndex,
  count,
  postId,
  onMove,
}: {
  readonly activeIndex: number;
  readonly count: number;
  readonly postId: string;
  readonly onMove: (index: number) => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 px-4">
      <button
        type="button"
        aria-label="이전 미디어"
        disabled={activeIndex === 0}
        onClick={() => onMove(activeIndex - 1)}
        className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-ink/65 text-[16px] font-semibold text-white backdrop-blur-sm disabled:opacity-35"
      >
        ‹
      </button>
      <div className="flex items-center gap-1.5 rounded-(--radius-btn) bg-ink/55 px-2.5 py-1.5 backdrop-blur-sm">
        {Array.from({ length: count }, (_, index) => (
          <button
            key={`${postId}-dot-${index}`}
            type="button"
            aria-label={`미디어 ${index + 1} 보기`}
            aria-current={index === activeIndex}
            onClick={() => onMove(index)}
            className={`pointer-events-auto h-1.5 rounded-full transition-[width,background-color] ${
              index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/45"
            }`}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label="다음 미디어"
        disabled={activeIndex === count - 1}
        onClick={() => onMove(activeIndex + 1)}
        className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-ink/65 text-[16px] font-semibold text-white backdrop-blur-sm disabled:opacity-35"
      >
        ›
      </button>
    </div>
  );
}
