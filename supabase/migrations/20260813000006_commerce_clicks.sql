-- STS Phase 3a — 어트리뷰션 클릭 레이어.
-- 모든 판매처 아웃바운드는 /go/[offerId]를 거치며, 이 테이블이 클릭의 권위 기록이다.
-- (클라이언트 이벤트 로그는 UX 분석용이고, 수익 어트리뷰션은 이 행에서만 출발한다)
--
-- creator_id/post_id/object_id가 text인 이유: 시드 콘텐츠(post-look1, c-minu)와
-- 백엔드 콘텐츠(uuid)가 공존하는 하이브리드 세계에서 어트리뷰션을 잃지 않기 위해.
-- 시드 크리에이터로 귀속된 클릭은 정산 대상이 아니지만 기록은 남는다.
-- 로그인 없이도 어트리뷰션된다: anonymous_id = 1st-party sts_anon_id 쿠키.

create table public.commerce_clicks (
  id                   uuid primary key default gen_random_uuid(),
  viewer_id            uuid references public.profiles (id) on delete set null,
  anonymous_id         text,
  creator_id           text,
  post_id              text,
  object_id            text,
  canonical_product_id text,
  offer_id             text not null,
  merchant_id          text not null,
  provider             text not null default 'mock',
  source_surface       text not null default 'feed'
                       check (source_surface in ('feed','post','creator_shop','saved','discover')),
  created_at           timestamptz not null default now(),
  -- 익명이든 로그인이든 최소 한 축의 식별자는 있어야 어트리뷰션이 성립한다
  check (viewer_id is not null or anonymous_id is not null)
);

create index commerce_clicks_creator_idx on public.commerce_clicks (creator_id, created_at desc);
create index commerce_clicks_offer_idx on public.commerce_clicks (offer_id, created_at desc);
create index commerce_clicks_viewer_idx on public.commerce_clicks (viewer_id, created_at desc);

alter table public.commerce_clicks enable row level security;

-- 쓰기: /go 라우트가 방문자의 세션 컨텍스트(anon 또는 로그인)로 삽입한다.
-- 로그인 사용자가 남의 viewer_id를 위조하는 것은 불가능하다.
create policy "clicks are inserted with own identity"
  on public.commerce_clicks for insert
  with check (viewer_id is null or viewer_id = (select auth.uid()));

-- 읽기: 크리에이터는 자신에게 귀속된 클릭(수익 드릴다운), 관리자는 전체.
create policy "creators read own attributed clicks"
  on public.commerce_clicks for select
  using (
    creator_id = (select auth.uid())::text
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );
