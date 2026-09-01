import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 · STS",
  description: "STS 개인정보처리방침 안내",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-10 text-ink sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[820px]">
        <Link href="/home" className="font-serif text-[32px] tracking-[-0.08em]">
          STS<span className="text-primary">.</span>
        </Link>
        <p className="mt-20 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">LEGAL</p>
        <h1 className="mt-5 font-serif text-[clamp(3rem,7vw,6.5rem)] leading-[0.9] tracking-[-0.08em]">개인정보<br />처리방침</h1>
        <div className="mt-12 border-t border-line pt-8 text-[14px] leading-[1.9] text-ink-2">
          <p>STS는 사진 속 상품을 발견하고 구매 가능한 상품으로 연결하는 서비스를 준비하고 있습니다.</p>
          <p className="mt-5">정식 서비스 출시와 함께 수집 항목, 이용 목적, 보관 기간 및 이용자 권리를 포함한 개인정보처리방침을 이 페이지에 게시하겠습니다.</p>
          <p className="mt-5">정책에 관한 문의는 <a className="font-semibold text-ink underline underline-offset-4" href="mailto:partnerships@sts.kr">partnerships@sts.kr</a>로 보내주세요.</p>
        </div>
        <Link href="/home" className="mt-12 inline-flex rounded-full bg-ink px-5 py-3 text-[12px] font-bold text-surface">홈으로 돌아가기</Link>
      </div>
    </main>
  );
}
