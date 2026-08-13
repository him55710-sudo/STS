-- STS Phase 3b — 전환 어트리뷰션 + 크리에이터 수익 원장.
--
-- 재무 진실의 단일 출처:
--   conversions            = provider가 통보한 전환 사실 (원문 payload 보존, audit)
--   creator_ledger_entries = 전환 1건당 정확히 1행의 수익 분배 기록
--
-- 쓰기 경로는 SECURITY DEFINER RPC(ingest_conversion) 하나뿐이다.
-- 클라이언트 쓰기 정책은 존재하지 않고, RPC는 provider_secrets의 공유 시크릿
-- 검증을 통과해야만 동작한다 (service-role 키 불필요 — 서버리스 친화).
-- (provider, external_conversion_id) 유니크 + 전이 규칙으로 중복 webhook이
-- 중복 수익을 만들 수 없다.

create table public.conversions (
  id                     uuid primary key default gen_random_uuid(),
  provider               text not null,
  external_conversion_id text not null,
  click_id               uuid references public.commerce_clicks (id) on delete set null,
  external_order_id      text,
  gross_order_value      numeric not null default 0 check (gross_order_value >= 0),
  eligible_value         numeric not null default 0 check (eligible_value >= 0),
  commission_amount      numeric not null default 0 check (commission_amount >= 0),
  currency               text not null default 'KRW',
  status                 text not null check (status in ('pending','confirmed','reversed')),
  occurred_at            timestamptz not null,
  confirmed_at           timestamptz,
  raw_payload            jsonb not null,
  created_at             timestamptz not null default now(),
  unique (provider, external_conversion_id)
);

create index conversions_click_idx on public.conversions (click_id);
create index conversions_status_idx on public.conversions (status, occurred_at desc);

create table public.creator_ledger_entries (
  id               uuid primary key default gen_random_uuid(),
  creator_id       text not null,
  conversion_id    uuid not null references public.conversions (id) on delete cascade,
  gross_commission numeric not null check (gross_commission >= 0),
  creator_share    numeric not null check (creator_share >= 0),
  platform_share   numeric not null check (platform_share >= 0),
  status           text not null check (status in ('pending','confirmed','reversed','payable','paid')),
  available_at     timestamptz,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  -- 전환 1건 = 원장 1행 (중복 수익 2차 방어선)
  unique (conversion_id),
  -- 분배 무결성: 몫의 합은 항상 총수수료와 같다
  constraint split_sums_to_gross check (creator_share + platform_share = gross_commission)
);

create index ledger_creator_idx on public.creator_ledger_entries (creator_id, created_at desc);
create index ledger_status_idx on public.creator_ledger_entries (status);

-- postback 스키마/시크릿 검증 실패 기록 (운영 가시성)
create table public.postback_failures (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,
  reason      text not null,
  raw_payload jsonb,
  created_at  timestamptz not null default now()
);

-- provider 공유 시크릿 — RLS 정책이 전혀 없어 PostgREST로는 어떤 역할도 읽지 못한다.
-- SECURITY DEFINER 함수만 접근한다. 운영 전환 시 값 교체:
--   update provider_secrets set secret = '...' where provider = 'mock';
create table public.provider_secrets (
  provider text primary key,
  secret   text not null
);
alter table public.provider_secrets enable row level security;

insert into public.provider_secrets (provider, secret)
values ('mock', 'sts-mock-postback-dev-secret')
on conflict (provider) do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.conversions enable row level security;
alter table public.creator_ledger_entries enable row level security;
alter table public.postback_failures enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "creators read own ledger"
  on public.creator_ledger_entries for select
  using (creator_id = (select auth.uid())::text or public.is_admin());

create policy "creators read own conversions"
  on public.conversions for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.creator_ledger_entries l
      where l.conversion_id = conversions.id and l.creator_id = (select auth.uid())::text
    )
  );

create policy "admins read postback failures"
  on public.postback_failures for select
  using (public.is_admin());

-- ── ingest_conversion — 유일한 전환/원장 쓰기 경로 ───────────────────────────
-- 멱등성 규칙:
--   * 신규 (provider, external_conversion_id) → 전환 + (귀속 가능 시) 원장 생성
--   * 동일 status 재전송                       → 'duplicate' no-op
--   * pending → confirmed                      → 전이 + 원장 confirmed/available_at
--   * pending|confirmed → reversed             → 전이 + 원장 reversed
--   * 그 외(다운그레이드·reversed 이후 변경)   → 'ignored_downgrade' no-op
-- 분배 금액은 호출자(서버 라우트, DEFAULT_CREATOR_SHARE 설정 반영)가 계산해
-- 전달하고, DB는 합계 불변식(check)으로 무결성만 강제한다.
create or replace function public.ingest_conversion(
  p_provider               text,
  p_secret                 text,
  p_external_conversion_id text,
  p_external_order_id      text,
  p_click_id               uuid,
  p_gross                  numeric,
  p_eligible               numeric,
  p_commission             numeric,
  p_currency               text,
  p_status                 text,
  p_occurred_at            timestamptz,
  p_creator_share_amount   numeric,
  p_platform_share_amount  numeric,
  p_raw                    jsonb,
  p_hold_days              integer default 30
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing    public.conversions%rowtype;
  v_click       public.commerce_clicks%rowtype;
  v_conv_id     uuid;
  v_creator     text;
  v_outcome     text;
begin
  -- 시크릿 검증 — 실패는 예외 (호출자는 401로 응답)
  if not exists (
    select 1 from public.provider_secrets s
    where s.provider = p_provider and s.secret = p_secret
  ) then
    raise exception 'invalid provider secret' using errcode = '28000';
  end if;

  if p_status not in ('pending','confirmed','reversed') then
    raise exception 'invalid status %', p_status;
  end if;
  if p_creator_share_amount + p_platform_share_amount <> p_commission then
    raise exception 'split does not sum to commission';
  end if;

  select * into v_existing
  from public.conversions
  where provider = p_provider and external_conversion_id = p_external_conversion_id
  for update;

  if not found then
    -- 신규 전환
    insert into public.conversions (
      provider, external_conversion_id, click_id, external_order_id,
      gross_order_value, eligible_value, commission_amount, currency,
      status, occurred_at, confirmed_at, raw_payload
    ) values (
      p_provider, p_external_conversion_id, p_click_id, p_external_order_id,
      p_gross, p_eligible, p_commission, p_currency,
      p_status, p_occurred_at,
      case when p_status = 'confirmed' then now() end,
      p_raw
    )
    returning id into v_conv_id;

    -- 클릭 → 크리에이터 귀속 (클릭이 없거나 크리에이터 미상이면 원장 없이 전환만 보존)
    if p_click_id is not null then
      select * into v_click from public.commerce_clicks where id = p_click_id;
      v_creator := v_click.creator_id;
    end if;

    if v_creator is not null and p_status <> 'reversed' then
      insert into public.creator_ledger_entries (
        creator_id, conversion_id, gross_commission, creator_share, platform_share,
        status, available_at
      ) values (
        v_creator, v_conv_id, p_commission, p_creator_share_amount, p_platform_share_amount,
        case when p_status = 'confirmed' then 'confirmed' else 'pending' end,
        case when p_status = 'confirmed' then now() + make_interval(days => p_hold_days) end
      );
    end if;

    return jsonb_build_object(
      'outcome', 'created',
      'conversion_id', v_conv_id,
      'attributed', v_creator is not null
    );
  end if;

  -- 기존 전환 — 전이 판정
  if v_existing.status = p_status then
    return jsonb_build_object('outcome', 'duplicate', 'conversion_id', v_existing.id);
  end if;

  if v_existing.status = 'pending' and p_status = 'confirmed' then
    update public.conversions
    set status = 'confirmed', confirmed_at = now(), raw_payload = p_raw
    where id = v_existing.id;
    update public.creator_ledger_entries
    set status = 'confirmed', available_at = now() + make_interval(days => p_hold_days)
    where conversion_id = v_existing.id and status = 'pending';
    v_outcome := 'confirmed';

  elsif p_status = 'reversed' and v_existing.status in ('pending','confirmed') then
    update public.conversions
    set status = 'reversed', raw_payload = p_raw
    where id = v_existing.id;
    -- paid 이후의 반전은 상태만 기록한다 — 회수(clawback)는 지급 단계의 수동 절차 (문서화된 한계)
    update public.creator_ledger_entries
    set status = 'reversed'
    where conversion_id = v_existing.id and status in ('pending','confirmed','payable');
    v_outcome := 'reversed';

  else
    return jsonb_build_object('outcome', 'ignored_downgrade', 'conversion_id', v_existing.id);
  end if;

  return jsonb_build_object('outcome', v_outcome, 'conversion_id', v_existing.id);
end;
$$;

revoke execute on function public.ingest_conversion(text,text,text,text,uuid,numeric,numeric,numeric,text,text,timestamptz,numeric,numeric,jsonb,integer) from public;
grant execute on function public.ingest_conversion(text,text,text,text,uuid,numeric,numeric,numeric,text,text,timestamptz,numeric,numeric,jsonb,integer) to anon, authenticated;

-- postback 검증 실패 기록 (시크릿 통과한 provider만)
create or replace function public.record_postback_failure(
  p_provider text,
  p_secret   text,
  p_reason   text,
  p_raw      jsonb
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
  insert into public.postback_failures (provider, reason, raw_payload)
  values (p_provider, p_reason, p_raw);
end;
$$;

revoke execute on function public.record_postback_failure(text,text,text,jsonb) from public;
grant execute on function public.record_postback_failure(text,text,text,jsonb) to anon, authenticated;

-- confirmed → payable 승격: 보류 기간(available_at)이 지난 행의 시간 기반 전이.
-- 결정적·멱등 — 수익 페이지/관리 화면이 기회적으로 호출한다.
create or replace function public.promote_payable_entries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.creator_ledger_entries
  set status = 'payable'
  where status = 'confirmed' and available_at is not null and available_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.promote_payable_entries() from public;
grant execute on function public.promote_payable_entries() to authenticated;
