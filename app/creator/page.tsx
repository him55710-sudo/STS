import Link from "next/link";
import { CREATORS, POSTS } from "@/lib/catalog";
import Avatar from "@/components/Avatar";
import { ArrowUpRightIcon, BarChartIcon, CheckIcon, ImageIcon, TagIcon } from "@/components/Icons";

const CREATOR_BENEFITS = [
  { title: "사진 속 상품을 바로 태깅", body: "AI가 후보를 찾고, 크리에이터가 동일 상품과 유사 상품을 확정합니다.", Icon: TagIcon },
  { title: "나만의 디지털 숍", body: "게시물에 사용한 상품이 자동으로 모여 팔로워가 다시 찾기 쉬운 숍이 됩니다.", Icon: ImageIcon },
  { title: "성과를 한눈에 확인", body: "조회·오브젝트 탭·상품 카드·구매처 이동을 하나의 퍼널로 확인합니다.", Icon: BarChartIcon },
];

export default function CreatorHubPage() {
  const creators = CREATORS.filter((creator) => creator.id !== "c-me");

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur-sm">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-primary">STS CREATOR</p>
          <h1 className="mt-1 text-[19px] font-bold tracking-[-0.035em]">크리에이터</h1>
        </div>
        <Link href="/create" className="press inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2.5 text-[11px] font-bold text-surface">
          콘텐츠 만들기 <ArrowUpRightIcon size={14} />
        </Link>
      </header>

      <div className="px-4 pb-14 pt-5">
        <section className="overflow-hidden rounded-[20px] bg-primary p-5 text-white sm:p-6">
          <p className="text-[10px] font-bold tracking-[0.16em] text-white/65">CREATE · CURATE · EARN</p>
          <h2 className="mt-3 max-w-[420px] text-[28px] font-bold leading-[1.17] tracking-[-0.05em]">
            취향을 보여주고,
            <br />
            발견을 수익으로 바꾸세요.
          </h2>
          <p className="mt-4 max-w-[430px] text-[12px] leading-[1.7] text-white/70">
            STS는 크리에이터의 콘텐츠를 상품 객체 중심의 쇼핑 경험으로 바꿉니다. 한 번 연결한 추천은 숍과 링크에서 계속 작동합니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-semibold text-white/80">
            {["AI 후보 매칭", "크리에이터 확정", "제휴 수익", "성과 분석"].map((item) => (
              <span key={item} className="rounded-full border border-white/20 bg-white/10 px-3 py-2">{item}</span>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-[11px] font-bold tracking-[0.16em] text-primary">WHY STS</p>
          <h2 className="mt-2 text-[22px] font-bold tracking-[-0.035em]">콘텐츠를 만드는 순간부터 수익을 설계합니다.</h2>
          <div className="mt-5 grid gap-2">
            {CREATOR_BENEFITS.map(({ title, body, Icon }) => (
              <div key={title} className="flex gap-3 rounded-[16px] border border-line bg-surface p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon size={18} /></span>
                <div>
                  <h3 className="text-[13px] font-bold">{title}</h3>
                  <p className="mt-1 text-[11px] leading-[1.6] text-ink-2">{body}</p>
                </div>
                <CheckIcon size={15} className="ml-auto mt-1 shrink-0 text-primary" />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-primary">CREATOR NETWORK</p>
              <h2 className="mt-2 text-[22px] font-bold tracking-[-0.035em]">STS에서 발견하는 취향</h2>
            </div>
            <span className="text-[11px] text-ink-2">{creators.length}명</span>
          </div>
          <div className="mt-5 grid gap-2">
            {creators.map((creator) => {
              const postCount = POSTS.filter((post) => post.creatorId === creator.id).length;
              return (
                <Link key={creator.id} href={`/creator/${creator.id}`} className="press flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3.5 transition-colors hover:bg-surface-2">
                  <Avatar creator={creator} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{creator.name} <span className="font-medium text-ink-2">@{creator.handle}</span></p>
                    <p className="mt-1 truncate text-[11px] text-ink-2">{postCount}개 게시물 · 팔로워 {creator.followers.toLocaleString("ko-KR")}</p>
                  </div>
                  <ArrowUpRightIcon size={17} className="shrink-0 text-ink-2" />
                </Link>
              );
            })}
          </div>
        </section>

        <Link href="/create" className="press mt-8 flex items-center justify-center gap-2 rounded-[13px] bg-ink py-3.5 text-[13px] font-bold text-surface">
          내 콘텐츠로 시작하기 <ArrowUpRightIcon size={16} />
        </Link>
      </div>
    </div>
  );
}
