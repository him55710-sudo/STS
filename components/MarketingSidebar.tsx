"use client";

import Link from "next/link";
import { useState } from "react";
import type { ComponentType } from "react";
import {
  ArrowUpRightIcon,
  BarChartIcon,
  BagIcon,
  EyeIcon,
  HomeIcon,
  ImageIcon,
  LinkIcon,
  TagIcon,
} from "@/components/Icons";

type MarketingIcon = ComponentType<{
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly className?: string;
}>;

type MarketingNavItem = {
  readonly href: string;
  readonly label: string;
  readonly detail: string;
  readonly Icon: MarketingIcon;
};

type MarketingNavGroup = {
  readonly title: string;
  readonly items: readonly MarketingNavItem[];
};

const NAV_GROUPS: readonly MarketingNavGroup[] = [
  {
    title: "쇼핑 경험",
    items: [
      { href: "#top", label: "STS 홈", detail: "오늘의 발견", Icon: HomeIcon },
      { href: "#experience", label: "상품 발견", detail: "사진 속 오브젝트", Icon: EyeIcon },
      { href: "#k-beauty", label: "K-뷰티 큐레이션", detail: "검증된 상품", Icon: ImageIcon },
    ],
  },
  {
    title: "함께 성장하기",
    items: [
      { href: "#creators", label: "크리에이터 수익", detail: "나만의 상품 숍", Icon: TagIcon },
      { href: "#affiliate-guide", label: "제휴 안내", detail: "구매와 수익 연결", Icon: LinkIcon },
    ],
  },
  {
    title: "운영 안내",
    items: [
      { href: "#how-it-works", label: "작동 방식", detail: "탐지부터 구매까지", Icon: BagIcon },
      { href: "#platform", label: "신뢰도 기준", detail: "AI 후보와 검수", Icon: BarChartIcon },
    ],
  },
];

type MarketingSidebarProps = {
  readonly platformHref: string;
  readonly platformLabel: string;
};

export default function MarketingSidebar({ platformHref, platformLabel }: MarketingSidebarProps) {
  const [activeHref, setActiveHref] = useState("#top");

  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-bg px-4 py-6 lg:flex">
      <div className="px-3">
        <Link href="#top" className="text-[22px] font-extrabold tracking-[0.15em]" onClick={() => setActiveHref("#top")}>
          STS<span className="text-primary">.</span>
        </Link>
        <p className="mt-1 text-[11px] leading-[1.5] text-ink-2">사진에서 시작하는<br />커머스 플랫폼</p>
      </div>

      <nav aria-label="STS 홈페이지 탐색" className="mt-9 space-y-7">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 text-[10px] font-bold tracking-[0.16em] text-ink-2">{group.title}</p>
            <div className="mt-2 space-y-1">
              {group.items.map((item) => (
                <MarketingNavLink key={item.href} item={item} active={activeHref === item.href} onSelect={setActiveHref} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-(--radius-card) border border-line bg-surface p-4">
        <p className="text-[10px] font-bold tracking-[0.14em] text-primary">START WITH STS</p>
        <p className="mt-2 text-[13px] font-bold leading-[1.45]">사진 하나로<br />상품을 연결하세요.</p>
        <Link href={platformHref} className="press mt-4 flex items-center justify-between rounded-(--radius-btn) bg-ink px-3 py-2.5 text-[11px] font-bold text-surface">
          {platformLabel}
          <ArrowUpRightIcon size={14} strokeWidth={1.8} />
        </Link>
      </div>
    </aside>
  );
}

function MarketingNavLink({
  item,
  active,
  onSelect,
}: {
  readonly item: MarketingNavItem;
  readonly active: boolean;
  readonly onSelect: (href: string) => void;
}) {
  const Icon = item.Icon;

  return (
    <a
      href={item.href}
      aria-current={active ? "location" : undefined}
      onClick={() => onSelect(item.href)}
      className={`press group flex items-center gap-3 rounded-(--radius-btn) px-3 py-2.5 transition-colors ${active ? "bg-surface text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-[9px] ${active ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-2 group-hover:text-ink"}`}>
        <Icon size={16} strokeWidth={active ? 1.9 : 1.55} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-bold">{item.label}</span>
        <span className="mt-0.5 block truncate text-[10px] text-ink-2">{item.detail}</span>
      </span>
    </a>
  );
}

export function MarketingMobileNav() {
  const items = NAV_GROUPS.flatMap((group) => group.items);

  return (
    <nav aria-label="STS 홈페이지 빠른 탐색" className="border-b border-line bg-bg px-5 py-3 lg:hidden">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.Icon;
          return (
            <a key={item.href} href={item.href} className="press flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-[11px] font-semibold text-ink-2">
              <Icon size={14} strokeWidth={1.6} className="text-primary" />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
