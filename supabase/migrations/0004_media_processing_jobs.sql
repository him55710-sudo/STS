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
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
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

create or replace function public.complete_media_upload_and_enqueue(
  p_asset_id uuid,
  p_content_hash text
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
         and posts.creator_id = (select auth.uid())
     )
   returning * into v_asset;

  if v_asset.id is null then
    raise exception 'media upload is not completable' using errcode = 'P0002';
  end if;

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
    (select auth.uid()),
    'queued'
  );

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

create or replace function public.claim_media_processing_job()
returns table (
  id uuid,
  media_asset_id uuid,
  owner_id uuid,
  post_id text,
  status text,
  attempts integer,
  error_code text
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
       and (
         (select auth.role()) = 'service_role'
         or (select public.is_admin())
       )
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
     processing_jobs.error_code;
$$;

drop trigger if exists processing_jobs_set_updated_at on public.processing_jobs;
create trigger processing_jobs_set_updated_at
before update on public.processing_jobs
for each row execute function public.set_updated_at();

alter table public.processing_jobs enable row level security;

revoke all on table public.processing_jobs from anon;
revoke all on table public.processing_jobs from authenticated;
grant select, insert on table public.processing_jobs to authenticated;

revoke all on function public.complete_media_upload_and_enqueue(uuid, text) from anon;
revoke all on function public.claim_media_processing_job() from anon;
grant execute on function public.complete_media_upload_and_enqueue(uuid, text) to authenticated;
grant execute on function public.claim_media_processing_job() to authenticated;
grant execute on function public.claim_media_processing_job() to service_role;

drop policy if exists processing_jobs_owner_select on public.processing_jobs;
create policy processing_jobs_owner_select on public.processing_jobs
for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists processing_jobs_owner_insert on public.processing_jobs;
create policy processing_jobs_owner_insert on public.processing_jobs
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.posts
    where posts.id = processing_jobs.post_id
      and posts.creator_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.media_assets
    where media_assets.id = processing_jobs.media_asset_id
      and media_assets.post_id = processing_jobs.post_id
  )
);

drop policy if exists processing_jobs_admin_manage on public.processing_jobs;
create policy processing_jobs_admin_manage on public.processing_jobs
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
