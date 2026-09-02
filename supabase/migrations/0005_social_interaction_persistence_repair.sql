create table if not exists public.social_interactions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (operation in ('like', 'save', 'follow', 'comment', 'share', 'view', 'repost')),
  target_id text not null check (length(trim(target_id)) > 0),
  idempotency_key text not null check (length(trim(idempotency_key)) between 1 and 160),
  moderation_state text not null default 'approved' check (moderation_state in ('pending', 'approved', 'blocked')),
  created_at timestamptz not null default now(),
  unique (actor_id, idempotency_key)
);

create index if not exists social_interactions_actor_created_idx
  on public.social_interactions (actor_id, created_at desc);

create index if not exists social_interactions_target_idx
  on public.social_interactions (operation, target_id, created_at desc);

alter table public.social_interactions enable row level security;

revoke all on table public.social_interactions from public;
revoke all on table public.social_interactions from anon, authenticated;
revoke all on table public.social_interactions from service_role;
grant select, insert, update on table public.social_interactions to service_role;

drop policy if exists social_interactions_service_manage on public.social_interactions;
create policy social_interactions_service_manage on public.social_interactions
for all to service_role
using (true)
with check (true);

create or replace function public.get_social_interaction_by_idempotency_key(
  p_actor_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_interaction public.social_interactions%rowtype;
begin
  if (select auth.uid()) is distinct from p_actor_id and not public.is_admin() then
    raise exception 'social interaction actor mismatch' using errcode = '42501';
  end if;

  select social_interactions.*
    into v_interaction
    from public.social_interactions
   where social_interactions.actor_id = p_actor_id
     and social_interactions.idempotency_key = p_idempotency_key;

  if v_interaction.id is null then
    return null;
  end if;

  return to_jsonb(v_interaction);
end;
$$;

create or replace function public.record_social_interaction(
  p_actor_id uuid,
  p_operation text,
  p_target_id text,
  p_idempotency_key text,
  p_moderation_state text default 'approved'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interaction public.social_interactions%rowtype;
begin
  if (select auth.uid()) is distinct from p_actor_id and not public.is_admin() then
    raise exception 'social interaction actor mismatch' using errcode = '42501';
  end if;

  if p_operation not in ('like', 'save', 'follow', 'comment', 'share', 'view', 'repost') then
    raise exception 'invalid social interaction operation' using errcode = '22023';
  end if;

  if length(trim(p_target_id)) = 0 or length(trim(p_idempotency_key)) not between 1 and 160 then
    raise exception 'invalid social interaction target or idempotency key' using errcode = '22023';
  end if;

  if p_moderation_state not in ('pending', 'approved', 'blocked') then
    raise exception 'invalid social interaction moderation state' using errcode = '22023';
  end if;

  if p_operation <> 'follow' and not public.is_public_displayable_post(p_target_id) then
    raise exception 'social interaction target unavailable' using errcode = 'P0002';
  end if;

  insert into public.social_interactions (
    actor_id,
    operation,
    target_id,
    idempotency_key,
    moderation_state
  )
  values (
    p_actor_id,
    p_operation,
    p_target_id,
    p_idempotency_key,
    p_moderation_state
  )
  on conflict (actor_id, idempotency_key)
  do update set idempotency_key = excluded.idempotency_key
  returning * into v_interaction;

  return to_jsonb(v_interaction);
end;
$$;

revoke all on function public.get_social_interaction_by_idempotency_key(uuid, text) from public;
revoke all on function public.get_social_interaction_by_idempotency_key(uuid, text) from anon;
revoke all on function public.get_social_interaction_by_idempotency_key(uuid, text) from authenticated;
revoke all on function public.get_social_interaction_by_idempotency_key(uuid, text) from service_role;
revoke all on function public.record_social_interaction(uuid, text, text, text, text) from public;
revoke all on function public.record_social_interaction(uuid, text, text, text, text) from anon;
revoke all on function public.record_social_interaction(uuid, text, text, text, text) from authenticated;
revoke all on function public.record_social_interaction(uuid, text, text, text, text) from service_role;
grant execute on function public.get_social_interaction_by_idempotency_key(uuid, text) to authenticated, service_role;
grant execute on function public.record_social_interaction(uuid, text, text, text, text) to authenticated, service_role;

alter table public.post_reposts
  drop constraint if exists post_reposts_attribution_nonblank;

alter table public.post_reposts
  add constraint post_reposts_attribution_nonblank check (length(trim(attribution)) > 0) not valid;

create or replace function public.can_write_social_repost(
  target_original_post_id text,
  target_repost_post_id text,
  target_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_public_displayable_post(target_original_post_id)
    and exists (
      select 1
      from public.content_rights
      where content_rights.post_id = target_original_post_id
        and content_rights.can_redistribute = true
        and content_rights.rights_status = 'approved'
        and content_rights.takedown_at is null
        and (content_rights.expires_at is null or content_rights.expires_at > now())
    )
    and exists (
      select 1
      from public.posts
      where posts.id = target_repost_post_id
        and posts.creator_id = target_actor_id
        and posts.display_state = 'pending'
        and (posts.expires_at is null or posts.expires_at > now())
        and target_original_post_id <> target_repost_post_id
        and not exists (
          select 1
          from public.content_rights
          where content_rights.post_id = posts.id
            and (
              content_rights.rights_status in ('rejected', 'expired', 'takedown')
              or content_rights.takedown_at is not null
              or content_rights.expires_at <= now()
            )
        )
    );
$$;

revoke all on function public.can_write_social_repost(text, text, uuid) from public;
grant execute on function public.can_write_social_repost(text, text, uuid) to authenticated;

drop policy if exists post_reposts_creator_insert on public.post_reposts;
create policy post_reposts_creator_insert on public.post_reposts
for insert to authenticated
with check (
  (select auth.uid()) = creator_id
  and permission_state = 'pending'
  and length(trim(post_reposts.attribution)) > 0
  and public.can_write_social_repost(
    post_reposts.original_post_id,
    post_reposts.repost_post_id,
    (select auth.uid())
  )
);
