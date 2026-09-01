import type { ReactNode } from "react";

type StudioControlProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly hint?: string;
  readonly htmlFor?: string;
  readonly id: string;
  readonly label: string;
};

export function StudioControl({
  children,
  className = "",
  hint,
  htmlFor,
  id,
  label,
}: StudioControlProps) {
  const labelId = `${id}-label`;

  return (
    <div className={`grid min-w-0 content-start gap-2 ${className}`}>
      <div className="flex min-h-5 items-baseline justify-between gap-3">
        {htmlFor === undefined ? (
          <p id={labelId} className="text-[11px] font-semibold text-tactile-ink">
            {label}
          </p>
        ) : (
          <label id={labelId} htmlFor={htmlFor} className="text-[11px] font-semibold text-tactile-ink">
            {label}
          </label>
        )}
        {hint && <span className="text-right text-[10px] text-tactile-muted">{hint}</span>}
      </div>
      <div
        className="min-w-0"
        role={htmlFor === undefined ? "group" : undefined}
        aria-labelledby={htmlFor === undefined ? labelId : undefined}
      >
        {children}
      </div>
    </div>
  );
}
