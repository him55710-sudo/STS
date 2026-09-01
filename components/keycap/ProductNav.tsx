import Link from "next/link";

export type ProductTab = "board" | "collection" | "studio" | "rewards";

export type ProductNavProps = {
  readonly active: ProductTab;
};

type NavItem = {
  readonly tab: ProductTab;
  readonly label: string;
  readonly href: `/${ProductTab}`;
  readonly iconPath: string;
};

const NAV_ITEMS = [
  {
    tab: "board",
    label: "Board",
    href: "/board",
    iconPath: "M4.5 6.5h15v11h-15zM7.5 9.5h2v2h-2zM11 9.5h2v2h-2zM14.5 9.5h2v2h-2zM7.5 13h9v2h-9z",
  },
  {
    tab: "collection",
    label: "Collection",
    href: "/collection",
    iconPath: "M5 5.5h5.5V11H5zM13.5 5.5H19V11h-5.5zM5 14h5.5v5.5H5zM13.5 14H19v5.5h-5.5z",
  },
  {
    tab: "studio",
    label: "Studio",
    href: "/studio",
    iconPath: "M5 7h14M5 17h14M9 5v4M15 15v4",
  },
  {
    tab: "rewards",
    label: "Rewards",
    href: "/rewards",
    iconPath: "M4.5 9h15v10h-15zM3.5 6.5h17V9h-17zM12 6.5V19M12 6.5H8.5a2 2 0 1 1 2-2c0 1.2 1.5 2 1.5 2Zm0 0h3.5a2 2 0 1 0-2-2c0 1.2-1.5 2-1.5 2Z",
  },
] as const satisfies readonly NavItem[];

export function ProductNav({ active }: ProductNavProps) {
  return (
    <nav
      aria-label="TACTILE sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(23,23,20,0.10)] bg-[#FBFAF7]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:sticky md:top-0 md:bottom-auto md:border-y md:pb-0"
    >
      <div className="mx-auto grid max-w-[1120px] grid-cols-4 gap-1 px-2 py-1.5 md:flex md:h-14 md:items-center md:justify-center md:gap-2 md:px-6 md:py-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.tab === active;

          return (
            <Link
              key={item.tab}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-semibold tracking-[0.02em] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171714] md:min-h-11 md:flex-row md:gap-2 md:px-4 md:text-[11px] ${
                isActive
                  ? "bg-[rgba(23,23,20,0.06)] text-[#171714]"
                  : "text-[#6D6A63] hover:bg-[rgba(23,23,20,0.04)] hover:text-[#171714]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0 h-0.5 w-6 rounded-full bg-[#6E655E] ${isActive ? "opacity-100" : "opacity-0"}`}
              />
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-none stroke-current"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.iconPath} />
              </svg>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
