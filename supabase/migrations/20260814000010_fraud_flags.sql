-- STS Phase 7 — 결정적 사기 방지 (ML 없음).
--
-- 규칙 임계값은 코드(lib/integrity/fraud.ts)에 단일 정의되어 있고, 서버가 RPC
-- 파라미터로 넘긴다. SQL에 값을 중복 정의하지 않으므로 드리프트가 생기지 않는다.
--
-- 플래그는 사용자를 차단하지 않는다 — 기록하고 정산 검토 대상으로 표시할 뿐이다.

create table public.fraud_flags (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in (
                 'duplicate_callback','click_burst','self_click','conversion_replay'
               )),
  severity     text not null default 'warn' check (severity in ('info','warn','critical')),
  subject_type text not null check (subject_type in ('click','conversion','creator')),
  subject_id   text not null,
  creator_id   text,
  reason       text not null,
  detail       jsonb,
  created_at   timestamptz not null default now()
);

create index fraud_flags_kind_idx on public.fraud_flags (kind, created_at desc);
create index fraud_flags_subject_idx on public.fraud_flags (subject_type, subject_id);

alter table public.fraud_flags enable row level security;

-- 관리자만 조회한다 (크리에이터에게 노출하면 회피 학습을 돕는다)
create policy "admins read fraud flags"
  on public.fraud_flags for select using (public.is_admin());

/**
 * 클릭 기록 + 결정적 사기 검사 (1회 왕복).
 *
 * 삽입과 판정을 한 트랜잭션에서 처리해 /go 리다이렉트 지연을 최소화한다.
 * 임계값(p_burst_window_seconds, p_burst_threshold)은 호출자가 넘긴다 —
 * 규칙의 단일 출처는 코드다.
 *
 * **security definer인 이유**: fraud_flags는 관리자 SELECT 정책만 두고 INSERT
 * 정책을 두지 않는다 (사기 기록을 당사자가 쓰거나 지울 수 있으면 안 된다).
 * 따라서 플래그 기록은 호출자 권한으로 불가능하다. 대신 definer로 올리면서
 * commerce_clicks의 INSERT 정책이 보장하던 신원 불변식
 * `viewer_id is null or viewer_id = auth.uid()`을 아래에서 명시적으로 다시
 * 검사한다 — 남의 uid로 클릭을 위조할 수 없다.
 */
create or replace function public.record_commerce_click(
  p_id                    uuid,
  p_viewer_id             uuid,
  p_anonymous_id          text,
  p_creator_id            text,
  p_post_id               text,
  p_object_id             text,
  p_canonical_product_id  text,
  p_offer_id              text,
  p_merchant_id           text,
  p_provider              text,
  p_source_surface        text,
  p_burst_window_seconds  integer,
  p_burst_threshold       integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent  integer := 0;
  v_flags   jsonb := '[]'::jsonb;
  v_actor   text := coalesce(p_viewer_id::text, p_anonymous_id);
begin
  -- 신원 불변식 (RLS INSERT 정책과 동일): 남의 신원으로 클릭을 만들 수 없다.
  if p_viewer_id is not null and p_viewer_id <> (select auth.uid()) then
    raise exception 'viewer identity mismatch' using errcode = '42501';
  end if;

  -- 같은 행위자 · 같은 오퍼의 최근 클릭 수 (이번 클릭 제외)
  select count(*) into v_recent
  from public.commerce_clicks c
  where c.offer_id = p_offer_id
    and c.created_at > now() - make_interval(secs => greatest(p_burst_window_seconds, 1))
    and (
      (p_viewer_id is not null and c.viewer_id = p_viewer_id)
      or (p_viewer_id is null and p_anonymous_id is not null and c.anonymous_id = p_anonymous_id)
    );

  insert into public.commerce_clicks (
    id, viewer_id, anonymous_id, creator_id, post_id, object_id,
    canonical_product_id, offer_id, merchant_id, provider, source_surface
  ) values (
    p_id, p_viewer_id, p_anonymous_id, p_creator_id, p_post_id, p_object_id,
    p_canonical_product_id, p_offer_id, p_merchant_id, p_provider, p_source_surface
  );

  -- 규칙 1: 크리에이터 자기 클릭 (수수료 자기거래)
  if p_viewer_id is not null and p_creator_id is not null and p_viewer_id::text = p_creator_id then
    insert into public.fraud_flags (kind, severity, subject_type, subject_id, creator_id, reason, detail)
    values ('self_click', 'warn', 'click', p_id::text, p_creator_id,
            '크리에이터가 자기 콘텐츠의 상품 링크를 클릭했습니다 (자기거래 가능성)',
            jsonb_build_object('offer_id', p_offer_id, 'post_id', p_post_id));
    v_flags := v_flags || '["self_click"]'::jsonb;
  end if;

  -- 규칙 2: 클릭 버스트
  if v_recent >= p_burst_threshold then
    insert into public.fraud_flags (kind, severity, subject_type, subject_id, creator_id, reason, detail)
    values ('click_burst', 'warn', 'click', p_id::text, p_creator_id,
            format('%s초 내 같은 오퍼 클릭 %s회 (임계 %s)', p_burst_window_seconds, v_recent + 1, p_burst_threshold),
            jsonb_build_object('offer_id', p_offer_id, 'recent_count', v_recent, 'actor', v_actor));
    v_flags := v_flags || '["click_burst"]'::jsonb;
  end if;

  return jsonb_build_object('click_id', p_id, 'recent_count', v_recent, 'flags', v_flags);
end;
$$;

revoke execute on function public.record_commerce_click(uuid,uuid,text,text,text,text,text,text,text,text,text,integer,integer) from public;
grant execute on function public.record_commerce_click(uuid,uuid,text,text,text,text,text,text,text,text,text,integer,integer) to anon, authenticated;

/**
 * 사기 플래그 기록 — postback 경로에서 사용 (provider 시크릿 검증 필요).
 * 전환 관련 규칙(중복 콜백·리플레이)은 코드가 판정하고 여기에 기록한다.
 */
create or replace function public.record_fraud_flag(
  p_provider     text,
  p_secret       text,
  p_kind         text,
  p_severity     text,
  p_subject_type text,
  p_subject_id   text,
  p_creator_id   text,
  p_reason       text,
  p_detail       jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.provider_secrets s
    where s.provider = p_provider and s.secret = p_secret
  ) then
    raise exception 'invalid provider secret' using errcode = '28000';
  end if;
  insert into public.fraud_flags (kind, severity, subject_type, subject_id, creator_id, reason, detail)
  values (p_kind, p_severity, p_subject_type, p_subject_id, p_creator_id, p_reason, p_detail);
end;
$$;

revoke execute on function public.record_fraud_flag(text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.record_fraud_flag(text,text,text,text,text,text,text,text,jsonb) to anon, authenticated;

/** 관리자 운영 요약 — 한 번의 호출로 콘솔 상단 지표를 채운다 */
create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'creators', (select count(*) from public.profiles),
    'posts_published', (select count(*) from public.posts where status = 'published'),
    'posts_draft', (select count(*) from public.posts where status = 'draft'),
    'objects', (select count(*) from public.objects),
    'objects_linked', (select count(*) from public.object_product_links),
    'objects_exact', (select count(*) from public.object_product_links where relationship = 'exact'),
    'canonical_products', (select count(*) from public.canonical_products),
    'merchant_offers', (select count(*) from public.merchant_offers),
    'merchants', (select count(*) from public.merchants),
    'clicks', (select count(*) from public.commerce_clicks),
    'conversions', (select count(*) from public.conversions),
    'failed_postbacks', (select count(*) from public.postback_failures),
    'ledger_pending', (select coalesce(sum(creator_share), 0) from public.creator_ledger_entries where status = 'pending'),
    'ledger_confirmed', (select coalesce(sum(creator_share), 0) from public.creator_ledger_entries where status = 'confirmed'),
    'ledger_payable', (select coalesce(sum(creator_share), 0) from public.creator_ledger_entries where status = 'payable'),
    'ledger_paid', (select coalesce(sum(creator_share), 0) from public.creator_ledger_entries where status = 'paid'),
    'ledger_reversed', (select count(*) from public.creator_ledger_entries where status = 'reversed'),
    'tiktok_connections', (select count(*) from public.external_connections where provider = 'tiktok'),
    'tiktok_imports', (select count(*) from public.tiktok_video_imports),
    'fraud_flags', (select count(*) from public.fraud_flags),
    'fraud_critical', (select count(*) from public.fraud_flags where severity = 'critical')
  );
end;
$$;

revoke execute on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;
