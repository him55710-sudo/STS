import Link from "next/link";

const DEMOS = [
  {
    href: "/",
    index: "01",
    title: "Fashion",
    model: "Object Commerce",
    description: "완성된 스타일 속 오브젝트를 발견하고 제품으로 연결합니다.",
    action: "Fashion Demo",
    accent: false,
  },
  {
    href: "/beauty-demo?present=1",
    index: "02",
    title: "Beauty",
    model: "Process Commerce",
    description: "완성된 룩에서 확인된 과정과 제품으로 이어지는 구조를 보여줍니다.",
    action: "Beauty Demo",
    accent: true,
  },
] as const;

export default function DemoPage() {
  return (
    <main className="min-h-dvh bg-bg px-4 py-12 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100dvh-96px)] max-w-3xl flex-col justify-center">
        <header className="max-w-xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-2">STS Presentation</p>
          <h1 className="mt-3 text-[30px] font-extrabold tracking-[-0.04em] text-ink">Choose a commerce story</h1>
          <p className="mt-3 break-keep text-[15px] leading-6 text-ink-2">
            하나의 콘텐츠가 패션에서는 오브젝트로, 뷰티에서는 과정으로 전환되는 방식을 비교합니다.
          </p>
        </header>

        <ol className="mt-10 grid gap-3 sm:grid-cols-2">
          {DEMOS.map((demo) => (
            <li key={demo.href}>
              <Link
                href={demo.href}
                className={`group flex min-h-48 flex-col rounded-(--radius-card) border bg-surface p-5 transition-[transform,border-color,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-2 focus-visible:outline-offset-4 active:scale-[0.985] sm:p-6 ${
                  demo.accent
                    ? "border-beauty/45 focus-visible:outline-beauty"
                    : "border-line focus-visible:outline-ink"
                }`}
              >
                <span className={`text-[12px] font-semibold ${demo.accent ? "text-beauty-ink" : "text-ink-2"}`}>
                  {demo.index}
                </span>
                <span className="mt-5 text-[24px] font-bold tracking-[-0.03em] text-ink sm:mt-6">{demo.title}</span>
                <span className="mt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-2">{demo.model}</span>
                <span className="mt-3 break-keep text-[15px] leading-6 text-ink-2 sm:mt-4">{demo.description}</span>
                <span className={`mt-auto pt-6 text-[13px] font-bold sm:pt-8 ${demo.accent ? "text-beauty-ink" : "text-ink"}`}>
                  {demo.action} <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
