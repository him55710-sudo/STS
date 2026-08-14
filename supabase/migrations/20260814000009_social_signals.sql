-- STS Phase 5 — 실 소셜 영속화 + 취향 신호.
--
-- 설계 노트: post_id를 text로 둔다. 시드 콘텐츠(post-look1)와 백엔드 콘텐츠(uuid)가
-- 공존하는 하이브리드 세계에서 공유·부정 피드백·상호작용 신호를 모두 기록해야
-- 랭킹이 의미를 갖기 때문이다. 좋아요/저장은 기존 uuid FK 테이블을 그대로 쓴다.
--
-- interaction_events는 약한 신호(조회·오브젝트 탭)를 담는다. 강한 신호는 이미
-- 권위 테이블에 있다: product_saves(저장), commerce_clicks(아웃바운드),
-- conversions(구매). 취향 프로필은 이 둘을 합쳐 계산한다.

-- ── 공유 ─────────────────────────────────────────────────────────────────────
create table public.post_shares (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles (id) on delete set null,
  anonymous_id   text,
  post_id        text not null,
  /** navigator.share 성공 | 링크 복사 폴백 */
  method         text not null default 'copy' check (method in ('web_share', 'copy')),
  source_surface text not null default 'feed'
                 check (source_surface in ('feed','post','creator_shop','saved','discover')),
  created_at     timestamptz not null default now()
);

create index post_shares_post_idx on public.post_shares (post_id, created_at desc);

alter table public.post_shares enable row level security;

-- 공유 수는 공개 지표다 (누가 공유했는지가 아니라 몇 번 공유됐는지)
create policy "share counts are publicly readable"
  on public.post_shares for select using (true);

create policy "users record own shares"
  on public.post_shares for insert
  with check (user_id is null or user_id = (select auth.uid()));

-- ── 부정 피드백 (숨기기 / 관심 없음) ─────────────────────────────────────────
create table public.content_feedback (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  post_id    text not null,
  kind       text not null check (kind in ('hide', 'not_interested')),
  /** 선택 사유 — 향후 이유별 가중치 조정에 사용 */
  reason     text,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index content_feedback_user_idx on public.content_feedback (user_id, created_at desc);

alter table public.content_feedback enable row level security;

-- 부정 피드백은 본인만 본다 (크리에이터에게 노출되면 위축 효과가 생긴다)
create policy "users read own feedback"
  on public.content_feedback for select using (user_id = (select auth.uid()));
create policy "users write own feedback"
  on public.content_feedback for insert with check (user_id = (select auth.uid()));
create policy "users update own feedback"
  on public.content_feedback for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "users delete own feedback"
  on public.content_feedback for delete using (user_id = (select auth.uid()));

-- ── 상호작용 이벤트 (약한 취향 신호) ─────────────────────────────────────────
create table public.interaction_events (
  id           bigint generated always as identity primary key,
  user_id      uuid references public.profiles (id) on delete cascade,
  anonymous_id text,
  post_id      text,
  object_id    text,
  product_id   text,
  creator_id   text,
  type         text not null check (type in (
                 'asset_view','object_tap','card_open','post_like','post_save','post_share'
               )),
  created_at   timestamptz not null default now(),
  check (user_id is not null or anonymous_id is not null)
);

create index interaction_events_user_idx on public.interaction_events (user_id, created_at desc);
create index interaction_events_post_idx on public.interaction_events (post_id, type);

alter table public.interaction_events enable row level security;

-- 본인 신호만 읽는다 (취향 프로필 계산용). 집계 지표는 별도 뷰로 공개한다.
create policy "users read own interaction events"
  on public.interaction_events for select using (user_id = (select auth.uid()));

create policy "users write own interaction events"
  on public.interaction_events for insert
  with check (user_id is null or user_id = (select auth.uid()));

-- ── 게시물 공개 집계 (랭킹의 콘텐츠 품질 신호) ───────────────────────────────
-- security_invoker=false 뷰로 집계만 노출한다 — 개별 행 소유자는 드러나지 않는다.
create or replace view public.post_engagement
with (security_invoker = false) as
select
  p.id::text                                              as post_id,
  p.creator_id::text                                      as creator_id,
  p.category,
  p.published_at,
  coalesce(l.likes, 0)                                    as like_count,
  coalesce(s.shares, 0)                                   as share_count,
  coalesce(c.comments, 0)                                 as comment_count,
  coalesce(v.views, 0)                                    as view_count,
  coalesce(t.taps, 0)                                     as tap_count
from public.posts p
left join (select post_id, count(*) likes from public.post_likes group by post_id) l on l.post_id = p.id
left join (select post_id, count(*) shares from public.post_shares group by post_id) s on s.post_id = p.id::text
left join (select post_id, count(*) comments from public.comments where deleted_at is null group by post_id) c on c.post_id = p.id
left join (select post_id, count(*) views from public.interaction_events where type = 'asset_view' group by post_id) v on v.post_id = p.id::text
left join (select post_id, count(*) taps from public.interaction_events where type = 'object_tap' group by post_id) t on t.post_id = p.id::text
where p.status = 'published';

grant select on public.post_engagement to anon, authenticated;
