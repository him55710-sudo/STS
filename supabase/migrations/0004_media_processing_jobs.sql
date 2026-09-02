alter table public.media_assets
  drop constraint if exists media_assets_content_hash_key;

create unique index if not exists media_assets_post_content_hash_uidx
  on public.media_assets (post_id, content_hash)
  where content_hash is not null;

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  job_kind text not null check (job_kind in ('media_processing')),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  post_id text not null references public.posts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'blocked')),
  attempts integer not null default 0 check (attempts >= 0),
  error_code text,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists processing_jobs_active_media_job_uidx
  on public.processing_jobs (job_kind, media_asset_id)
  where status in ('queued', 'running');

create index if not exists processing_jobs_claim_idx
  on public.processing_jobs (job_kind, status, available_at, created_at);

drop function if exists public.initiate_media_upload(text, uuid, text, text, integer, integer, text, text, bigint, integer, text);

create or replace function public.initiate_media_upload(
  p_post_id text,
  p_owner_id uuid,
  p_storage_path text,
  p_public_url text,
  p_width integer,
  p_height integer,
  p_media_kind text,
  p_mime_type text,
  p_byte_size bigint,
  p_duration_ms integer,
  p_license_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.media_assets%rowtype;
begin
  if p_media_kind not in ('photo', 'video') then
    raise exception 'invalid media kind' using errcode = '22023';
  end if;

  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm') then
    raise exception 'invalid media MIME type' using errcode = '22023';
  end if;

  if p_byte_size <= 0 then
    raise exception 'invalid media byte size' using errcode = '22023';
  end if;

  if (p_width is null) is distinct from (p_height is null) then
    raise exception 'incomplete media dimensions' using errcode = '22023';
  end if;

  if p_width is not null and (p_width <= 0 or p_height <= 0) then
    raise exception 'invalid media dimensions' using errcode = '22023';
  end if;

  if p_duration_ms is not null and p_duration_ms < 0 then
    raise exception 'invalid media duration' using errcode = '22023';
  end if;

  insert into public.media_assets (
    post_id,
    storage_path,
    public_url,
    width,
    height,
    source,
    media_kind,
    mime_type,
    byte_size,
    duration_ms,
    processing_state,
    processing_error,
    license_note,
    content_hash,
    is_demo
  )
  select
    p_post_id,
    p_storage_path,
    p_public_url,
    p_width,
    p_height,
    'user_upload',
    p_media_kind,
    p_mime_type,
    p_byte_size,
    p_duration_ms,
    'uploaded',
    null,
    p_license_note,
    null,
    false
  from public.posts
  where posts.id = p_post_id
    and posts.creator_id = p_owner_id
  returning * into v_asset;

  if v_asset.id is null then
    raise exception 'post is not uploadable' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_asset.id,
    'storage_path', v_asset.storage_path,
    'public_url', v_asset.public_url,
    'width', v_asset.width,
    'height', v_asset.height,
    'content_hash', v_asset.content_hash,
    'processing_state', v_asset.processing_state
  );
end;
$$;

drop function if exists public.complete_media_upload_and_enqueue(uuid, text);

create or replace function public.complete_media_upload_and_enqueue(
  p_asset_id uuid,
  p_content_hash text,
  p_owner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.media_assets%rowtype;
begin
  if p_content_hash !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'invalid content hash' using errcode = '22023';
  end if;

  update public.media_assets
     set processing_state = 'processing',
         processing_error = null,
         content_hash = p_content_hash
   where id = p_asset_id
     and processing_state = 'uploaded'
     and exists (
       select 1
       from public.posts
       where posts.id = media_assets.post_id
         and posts.creator_id = p_owner_id
     )
   returning * into v_asset;

  if v_asset.id is null then
    raise exception 'media upload is not completable' using errcode = 'P0002';
  end if;

  perform *
  from public.enqueue_media_processing_job(v_asset.id, p_owner_id);

  return jsonb_build_object(
    'id', v_asset.id,
    'storage_path', v_asset.storage_path,
    'public_url', v_asset.public_url,
    'width', v_asset.width,
    'height', v_asset.height,
    'content_hash', v_asset.content_hash,
    'processing_state', v_asset.processing_state,
    'processing_error', v_asset.processing_error
  );
end;
$$;

drop function if exists public.enqueue_media_processing_job(uuid);

create or replace function public.enqueue_media_processing_job(
  p_asset_id uuid,
  p_owner_id uuid
)
returns table (
  id uuid,
  media_asset_id uuid,
  owner_id uuid,
  post_id text,
  status text,
  attempts integer,
  error_code text,
  available_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.media_assets%rowtype;
begin
  select media_assets.*
    into v_asset
    from public.media_assets
    join public.posts on posts.id = media_assets.post_id
   where media_assets.id = p_asset_id
     and media_assets.processing_state = 'processing'
     and media_assets.content_hash ~ '^sha256:[a-f0-9]{64}$'
     and posts.creator_id = p_owner_id
   for update of media_assets;

  if v_asset.id is null then
    raise exception 'media processing job is not enqueueable' using errcode = 'P0002';
  end if;

  return query
  insert into public.processing_jobs (
    job_kind,
    media_asset_id,
    post_id,
    owner_id,
    status
  )
  values (
    'media_processing',
    v_asset.id,
    v_asset.post_id,
    p_owner_id,
    'queued'
  )
  on conflict (job_kind, media_asset_id) where status in ('queued', 'running')
  do update set updated_at = now()
  returning
    processing_jobs.id,
    processing_jobs.media_asset_id,
    processing_jobs.owner_id,
    processing_jobs.post_id,
    processing_jobs.status,
    processing_jobs.attempts,
    processing_jobs.error_code,
    processing_jobs.available_at;
end;
$$;

create or replace function public.claim_media_processing_job()
returns table (
  id uuid,
  media_asset_id uuid,
  owner_id uuid,
  post_id text,
  status text,
  attempts integer,
  error_code text,
  available_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  update public.processing_jobs
     set status = 'running',
         attempts = processing_jobs.attempts + 1,
         error_code = null,
         locked_at = now()
   where processing_jobs.id = (
     select next_job.id
     from public.processing_jobs as next_job
     where next_job.job_kind = 'media_processing'
       and next_job.status = 'queued'
       and next_job.available_at <= now()
     order by next_job.available_at asc, next_job.created_at asc
     for update skip locked
     limit 1
   )
   returning
     processing_jobs.id,
     processing_jobs.media_asset_id,
     processing_jobs.owner_id,
     processing_jobs.post_id,
     processing_jobs.status,
     processing_jobs.attempts,
     processing_jobs.error_code,
     processing_jobs.available_at;
$$;

drop trigger if exists processing_jobs_set_updated_at on public.processing_jobs;
create trigger processing_jobs_set_updated_at
before update on public.processing_jobs
for each row execute function public.set_updated_at();

alter table public.processing_jobs enable row level security;

revoke all on table public.processing_jobs from anon;
revoke all on table public.processing_jobs from authenticated;
revoke all on table public.processing_jobs from service_role;
grant select on table public.processing_jobs to authenticated;
grant select, insert, update on table public.processing_jobs to service_role;

revoke all on function public.initiate_media_upload(text, uuid, text, text, integer, integer, text, text, bigint, integer, text) from public;
revoke all on function public.initiate_media_upload(text, uuid, text, text, integer, integer, text, text, bigint, integer, text) from anon;
revoke all on function public.initiate_media_upload(text, uuid, text, text, integer, integer, text, text, bigint, integer, text) from authenticated;
revoke all on function public.initiate_media_upload(text, uuid, text, text, integer, integer, text, text, bigint, integer, text) from service_role;
revoke all on function public.complete_media_upload_and_enqueue(uuid, text, uuid) from public;
revoke all on function public.complete_media_upload_and_enqueue(uuid, text, uuid) from anon;
revoke all on function public.complete_media_upload_and_enqueue(uuid, text, uuid) from authenticated;
revoke all on function public.complete_media_upload_and_enqueue(uuid, text, uuid) from service_role;
revoke all on function public.enqueue_media_processing_job(uuid, uuid) from public;
revoke all on function public.enqueue_media_processing_job(uuid, uuid) from anon;
revoke all on function public.enqueue_media_processing_job(uuid, uuid) from authenticated;
revoke all on function public.enqueue_media_processing_job(uuid, uuid) from service_role;
revoke all on function public.claim_media_processing_job() from public;
revoke all on function public.claim_media_processing_job() from anon;
revoke all on function public.claim_media_processing_job() from authenticated;
revoke all on function public.claim_media_processing_job() from service_role;
grant execute on function public.initiate_media_upload(text, uuid, text, text, integer, integer, text, text, bigint, integer, text) to service_role;
grant execute on function public.complete_media_upload_and_enqueue(uuid, text, uuid) to service_role;
grant execute on function public.enqueue_media_processing_job(uuid, uuid) to service_role;
grant execute on function public.claim_media_processing_job() to service_role;

drop policy if exists processing_jobs_owner_select on public.processing_jobs;
create policy processing_jobs_owner_select on public.processing_jobs
for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists processing_jobs_owner_insert on public.processing_jobs;

drop policy if exists processing_jobs_admin_manage on public.processing_jobs;

drop policy if exists processing_jobs_service_manage on public.processing_jobs;
create policy processing_jobs_service_manage on public.processing_jobs
for all to service_role
using (true)
with check (true);
