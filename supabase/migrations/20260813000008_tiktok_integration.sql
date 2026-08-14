-- STS Phase 4 — TikTok 크리에이터 온보딩 가속기 (공식 API 전용).
--
-- 원칙:
--   * 토큰은 절대 클라이언트로 가지 않는다. external_connections에는 클라이언트용
--     RLS 정책이 하나도 없어 PostgREST로는 어떤 역할도 읽지 못한다. 접근은
--     서버 시크릿을 요구하는 SECURITY DEFINER RPC 뿐이고, 토큰 값 자체도
--     Node에서 AES-256-GCM으로 암호화한 뒤 저장한다 (이중 방어).
--   * 가져온 영상은 항상 draft로 들어간다. 크리에이터가 상품을 확정하기 전에는
--     절대 자동 발행되지 않는다 (posts.status='draft').
--   * Display API는 원본 영상 파일을 주지 않는다. Phase-1 가져오기는 커버
--     이미지만 분석하며, 커버 URL은 만료되므로 우리 스토리지로 복사해 보존한다
--     (원본 cover_image_url도 audit용으로 남긴다 — /v2/video/query/로 갱신 가능).

create table public.external_connections (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  provider               text not null check (provider in ('tiktok')),
  provider_user_id       text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at             timestamptz,
  refresh_expires_at     timestamptz,
  scopes                 text[] not null default '{}',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (user_id, provider)
);

create index external_connections_user_idx on public.external_connections (user_id, provider);

-- RLS 활성 + 정책 0개 = PostgREST 경로로는 아무도 읽고 쓸 수 없다
alter table public.external_connections enable row level security;

-- TikTok 영상 메타데이터 — 가져오기의 감사 기록.
-- post_media가 embed/width/height/duration을 담고, 여기엔 provider 원본 필드를 보존한다.
create table public.tiktok_video_imports (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  post_id           uuid references public.posts (id) on delete set null,
  provider_video_id text not null,
  title             text,
  video_description text,
  share_url         text,
  embed_link        text,
  cover_image_url   text,          -- 원본 (만료됨 — /v2/video/query/로 갱신)
  cover_stored_path text,          -- 우리 스토리지 복사본 (영구)
  duration          numeric,
  width             integer,
  height            integer,
  create_time       timestamptz,
  imported_at       timestamptz not null default now(),
  unique (user_id, provider_video_id)
);

create index tiktok_imports_user_idx on public.tiktok_video_imports (user_id, imported_at desc);

alter table public.tiktok_video_imports enable row level security;

create policy "users read own tiktok imports"
  on public.tiktok_video_imports for select
  using (user_id = (select auth.uid()));

create policy "users insert own tiktok imports"
  on public.tiktok_video_imports for insert
  with check (user_id = (select auth.uid()));

create policy "users update own tiktok imports"
  on public.tiktok_video_imports for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 서버 시크릿 (Phase 3의 provider_secrets 재사용)
insert into public.provider_secrets (provider, secret)
values ('tiktok-server', 'sts-tiktok-server-dev-secret')
on conflict (provider) do nothing;

-- ── 연결 관리 RPC (서버 전용) ────────────────────────────────────────────────

create or replace function public.upsert_external_connection(
  p_secret          text,
  p_user_id         uuid,
  p_provider        text,
  p_provider_user_id text,
  p_access_token    text,
  p_refresh_token   text,
  p_expires_at      timestamptz,
  p_refresh_expires_at timestamptz,
  p_scopes          text[]
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.provider_secrets s
    where s.provider = 'tiktok-server' and s.secret = p_secret
  ) then
    raise exception 'invalid server secret' using errcode = '28000';
  end if;

  insert into public.external_connections (
    user_id, provider, provider_user_id, access_token_encrypted,
    refresh_token_encrypted, expires_at, refresh_expires_at, scopes, updated_at
  ) values (
    p_user_id, p_provider, p_provider_user_id, p_access_token,
    p_refresh_token, p_expires_at, p_refresh_expires_at, coalesce(p_scopes, '{}'), now()
  )
  on conflict (user_id, provider) do update set
    provider_user_id = excluded.provider_user_id,
    access_token_encrypted = excluded.access_token_encrypted,
    refresh_token_encrypted = excluded.refresh_token_encrypted,
    expires_at = excluded.expires_at,
    refresh_expires_at = excluded.refresh_expires_at,
    scopes = excluded.scopes,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.get_external_connection(
  p_secret   text,
  p_user_id  uuid,
  p_provider text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.external_connections%rowtype;
begin
  if not exists (
    select 1 from public.provider_secrets s
    where s.provider = 'tiktok-server' and s.secret = p_secret
  ) then
    raise exception 'invalid server secret' using errcode = '28000';
  end if;

  select * into v_row from public.external_connections
  where user_id = p_user_id and provider = p_provider;
  if not found then return null; end if;

  return jsonb_build_object(
    'provider_user_id', v_row.provider_user_id,
    'access_token_encrypted', v_row.access_token_encrypted,
    'refresh_token_encrypted', v_row.refresh_token_encrypted,
    'expires_at', v_row.expires_at,
    'refresh_expires_at', v_row.refresh_expires_at,
    'scopes', v_row.scopes
  );
end;
$$;

create or replace function public.delete_external_connection(
  p_secret   text,
  p_user_id  uuid,
  p_provider text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.provider_secrets s
    where s.provider = 'tiktok-server' and s.secret = p_secret
  ) then
    raise exception 'invalid server secret' using errcode = '28000';
  end if;
  delete from public.external_connections where user_id = p_user_id and provider = p_provider;
end;
$$;

-- 클라이언트용 연결 상태 — 토큰은 절대 반환하지 않는다
create or replace function public.my_connection_status(p_provider text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.external_connections%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('connected', false);
  end if;
  select * into v_row from public.external_connections
  where user_id = auth.uid() and provider = p_provider;
  if not found then
    return jsonb_build_object('connected', false);
  end if;
  return jsonb_build_object(
    'connected', true,
    'provider_user_id', v_row.provider_user_id,
    'scopes', v_row.scopes,
    'expires_at', v_row.expires_at,
    'connected_at', v_row.created_at
  );
end;
$$;

revoke execute on function public.upsert_external_connection(text,uuid,text,text,text,text,timestamptz,timestamptz,text[]) from public;
revoke execute on function public.get_external_connection(text,uuid,text) from public;
revoke execute on function public.delete_external_connection(text,uuid,text) from public;
revoke execute on function public.my_connection_status(text) from public;
grant execute on function public.upsert_external_connection(text,uuid,text,text,text,text,timestamptz,timestamptz,text[]) to authenticated;
grant execute on function public.get_external_connection(text,uuid,text) to authenticated;
grant execute on function public.delete_external_connection(text,uuid,text) to authenticated;
grant execute on function public.my_connection_status(text) to authenticated;

-- ── 드래프트 발행 ────────────────────────────────────────────────────────────
-- 가져오기는 draft를 만들 뿐이고, 크리에이터가 상품을 확정한 뒤에만 발행된다.
-- publish_post와 동일한 규칙: verified_by = auth.uid() 스탬프 →
-- exact_requires_verifier 제약이 "AI 단독 exact"를 구조적으로 막는다.
create or replace function public.publish_draft_post(
  p_post_id  uuid,
  p_caption  text,
  p_category text,
  p_objects  jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_media_id uuid;
  o          jsonb;
  v_obj_id   uuid;
  v_link     jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- RLS가 남의 게시물 수정을 막지만, 상태 검증은 명시적으로 한다
  if not exists (
    select 1 from public.posts p
    where p.id = p_post_id and p.creator_id = v_uid and p.status = 'draft'
  ) then
    raise exception 'draft not found or not owned';
  end if;

  select id into v_media_id from public.post_media
  where post_id = p_post_id order by position limit 1;

  -- 재확정 시 이전 객체를 교체 (cascade로 링크도 정리된다)
  delete from public.objects where post_id = p_post_id;

  for o in select * from jsonb_array_elements(coalesce(p_objects, '[]'::jsonb)) loop
    insert into public.objects (post_id, media_id, canonical_class, label, bbox, polygon, polygons, confidence, pipeline_version)
    values (
      p_post_id,
      v_media_id,
      o ->> 'canonical_class',
      coalesce(o ->> 'label', 'item'),
      coalesce(nullif(o -> 'bbox', 'null'::jsonb), '{}'::jsonb),
      nullif(o -> 'polygon', 'null'::jsonb),
      nullif(o -> 'polygons', 'null'::jsonb),
      coalesce((o ->> 'confidence')::real, 0),
      o ->> 'pipeline_version'
    )
    returning id into v_obj_id;

    v_link := nullif(o -> 'link', 'null'::jsonb);
    if v_link is not null and v_link ->> 'product_id' is not null then
      insert into public.object_product_links (object_id, product_id, relationship, verified_by, model_confidence, product_snapshot)
      values (
        v_obj_id,
        v_link ->> 'product_id',
        coalesce(v_link ->> 'relationship', 'similar'),
        v_uid,
        (v_link ->> 'model_confidence')::real,
        nullif(v_link -> 'product_snapshot', 'null'::jsonb)
      );
    end if;
  end loop;

  update public.posts
  set status = 'published',
      published_at = now(),
      caption = coalesce(nullif(trim(p_caption), ''), caption),
      category = coalesce(p_category, category)
  where id = p_post_id;

  return p_post_id;
end;
$$;

revoke execute on function public.publish_draft_post(uuid,text,text,jsonb) from public;
grant execute on function public.publish_draft_post(uuid,text,text,jsonb) to authenticated;
