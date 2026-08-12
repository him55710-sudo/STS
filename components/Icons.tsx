/** Lucide 스타일 인라인 아이콘 — 1.5px stroke, outline 위주 (PRD §43) */

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  filled?: boolean;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const HomeIcon = ({ size = 24, strokeWidth = 1.5, className, filled }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} fill={filled ? "currentColor" : "none"}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
);

export const SearchIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const PlusIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const BookmarkIcon = ({ size = 24, strokeWidth = 1.5, className, filled }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} fill={filled ? "currentColor" : "none"}>
    <path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4.5L5 21V5a1 1 0 0 1 1-1z" />
  </svg>
);

export const UserIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
);

export const HeartIcon = ({ size = 24, strokeWidth = 1.5, className, filled }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.5C7 16.5 3 13.2 3 9.3 3 6.4 5.2 4.5 7.7 4.5c1.8 0 3.4 1 4.3 2.6.9-1.6 2.5-2.6 4.3-2.6 2.5 0 4.7 1.9 4.7 4.8 0 3.9-4 7.2-9 11.2z" />
  </svg>
);

export const ShareIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M21 3 10.5 13.5" />
    <path d="M21 3l-6.8 18-3.7-7.5L3 9.8 21 3z" />
  </svg>
);

export const BagIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M6 8h12l1 13H5L6 8z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
  </svg>
);

export const XIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ChevronRightIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const ChevronLeftIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const ArrowUpRightIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export const TagIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M3 11V4a1 1 0 0 1 1-1h7l10 10-8 8L3 11z" />
    <circle cx="8" cy="8" r="1.4" />
  </svg>
);

export const ImageIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <circle cx="9" cy="9" r="1.8" />
    <path d="m4 18 5.5-5.5 3 3L17 11l3 3" />
  </svg>
);

export const TrashIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 14h10l1-14" />
  </svg>
);

export const LinkIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L11.6 6" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6" />
  </svg>
);

export const CheckIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const BarChartIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M5 20V12M12 20V6M19 20v-5" />
  </svg>
);

export const SettingsIcon = ({ size = 24, strokeWidth = 1.5, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
  </svg>
);
