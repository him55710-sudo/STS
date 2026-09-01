create table if not exists public.content_sources (
  id text primary key,
  source_kind text not null check (source_kind in ('user_upload', 'licensed_editorial', 'brand_feed', 'official_embed', 'demo_seed')),
  provider text not null,
  canonical_url text,
  external_id text,
  creator_id uuid references auth.users(id) on delete set null,
  embed_html text,
  metadata jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_kind, provider, external_id)
);

alter table public.posts
  add column if not exists content_kind text not null default 'photo' check (content_kind in ('photo', 'carousel', 'reel', 'video', 'story', 'lookbook')),
  add column if not exists source_id text references public.content_sources(id) on delete set null,
  add column if not exists publish_state text not null default 'draft' check (publish_state in ('draft', 'scheduled', 'published', 'archived')),
  add column if not exists display_state text not null default 'pending' check (display_state in ('pending', 'approved', 'blocked')),
  add column if not exists published_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists disclosure text not null default 'none' check (disclosure in ('none', 'affiliate', 'sponsored', 'partner', 'official', 'editorial', 'demo')),
  add column if not exists reposted_from_post_id text references public.posts(id) on delete set null;

alter table public.media_assets
  add column if not exists asset_order integer not null default 0 check (asset_order >= 0),
  add column if not exists media_kind text not null default 'photo' check (media_kind in ('photo', 'video', 'embed', 'poster', 'thumbnail')),
  add column if not exists alt_text text,
  add column if not exists poster_url text,
  add column if not exists hls_url text,
  add column if not exists duration_ms integer check (duration_ms is null or duration_ms >= 0),
  add column if not exists mime_type text,
  add column if not exists byte_size bigint check (byte_size is null or byte_size >= 0),
  add column if not exists processing_state text not null default 'ready' check (processing_state in ('uploaded', 'processing', 'ready', 'blocked', 'failed')),
  add column if not exists processing_error text,
  add column if not exists perceptual_hash text;

create table if not exists public.content_rights (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.posts(id) on delete cascade,
  source_id text references public.content_sources(id) on delete set null,
  rights_status text not null default 'pending' check (rights_status in ('pending', 'approved', 'rejected', 'expired', 'takedown')),
  license_scope text not null default 'user_owned' check (license_scope in ('user_owned', 'licensed', 'display_only', 'public_embed', 'demo_seed')),
  rights_evidence_url text,
  rights_note text,
  territories text[] not null default array['worldwide']::text[],
  expires_at timestamptz,
  takedown_at timestamptz,
  can_display boolean not null default false,
  can_embed boolean not null default false,
  can_derive boolean not null default false,
  can_tag boolean not null default false,
  can_use_for_commerce_matching boolean not null default false,
  can_redistribute boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id)
);

create table if not exists public.media_variants (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  variant_kind text not null check (variant_kind in ('original', 'poster', 'thumbnail', 'hls_1080p', 'hls_720p', 'hls_480p')),
  storage_path text,
  public_url text not null,
  mime_type text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  byte_size bigint check (byte_size is null or byte_size >= 0),
  content_hash text,
  processing_state text not null default 'ready' check (processing_state in ('uploaded', 'processing', 'ready', 'blocked', 'failed')),
  created_at timestamptz not null default now(),
  unique (media_asset_id, variant_kind, public_url)
);

create table if not exists public.story_groups (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text,
  cover_media_asset_id uuid references public.media_assets(id) on delete set null,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'unlisted')),
  publish_state text not null default 'draft' check (publish_state in ('draft', 'published', 'archived')),
  display_state text not null default 'pending' check (display_state in ('pending', 'approved', 'blocked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_items (
  id uuid primary key default gen_random_uuid(),
  story_group_id uuid not null references public.story_groups(id) on delete cascade,
  post_id text references public.posts(id) on delete set null,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  item_order integer not null check (item_order >= 0),
  duration_ms integer not null default 5000 check (duration_ms > 0),
  caption text,
  created_at timestamptz not null default now(),
  unique (story_group_id, item_order)
);

create table if not exists public.story_item_views (
  id uuid primary key default gen_random_uuid(),
  story_item_id uuid not null references public.story_items(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (story_item_id, viewer_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  moderation_state text not null default 'pending' check (moderation_state in ('pending', 'approved', 'blocked')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.posts(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like', 'save')),
  created_at timestamptz not null default now(),
  unique (post_id, actor_id, reaction_type)
);

create table if not exists public.creator_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);

create table if not exists public.post_reposts (
  id uuid primary key default gen_random_uuid(),
  original_post_id text not null references public.posts(id) on delete cascade,
  repost_post_id text not null references public.posts(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  permission_state text not null default 'pending' check (permission_state in ('pending', 'approved', 'rejected')),
  attribution text not null,
  created_at timestamptz not null default now(),
  unique (original_post_id, repost_post_id)
);

create index if not exists posts_social_public_idx on public.posts (publish_state, display_state, visibility, published_at desc);
create index if not exists posts_source_idx on public.posts (source_id);
create index if not exists media_assets_social_post_idx on public.media_assets (post_id, asset_order);
create index if not exists media_assets_processing_idx on public.media_assets (processing_state, created_at desc);
create index if not exists content_sources_kind_idx on public.content_sources (source_kind, provider);
create index if not exists content_rights_post_idx on public.content_rights (post_id, rights_status);
create index if not exists content_rights_review_idx on public.content_rights (rights_status, reviewed_at desc);
create index if not exists media_variants_asset_idx on public.media_variants (media_asset_id, variant_kind);
create index if not exists story_groups_public_idx on public.story_groups (visibility, publish_state, display_state, expires_at);
create index if not exists story_items_group_idx on public.story_items (story_group_id, item_order);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at desc);
create index if not exists post_reactions_post_idx on public.post_reactions (post_id, reaction_type);
create index if not exists creator_follows_creator_idx on public.creator_follows (creator_id, created_at desc);
create index if not exists post_reposts_original_idx on public.post_reposts (original_post_id, created_at desc);

create or replace function public.enforce_content_rights_commerce_matching()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.license_scope in ('display_only', 'public_embed') then
    new.can_use_for_commerce_matching = false;
  elsif new.source_id is not null and exists (
    select 1
    from public.content_sources
    where content_sources.id = new.source_id
      and content_sources.source_kind = 'official_embed'
  ) then
    new.can_use_for_commerce_matching = false;
  end if;

  return new;
end;
$$;

drop trigger if exists content_rights_enforce_commerce_matching on public.content_rights;
create trigger content_rights_enforce_commerce_matching
before insert or update on public.content_rights
for each row execute function public.enforce_content_rights_commerce_matching();

create or replace function public.is_public_displayable_post(target_post_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts
    where posts.id = target_post_id
      and posts.visibility = 'public'
      and posts.publish_state = 'published'
      and posts.display_state = 'approved'
      and posts.published_at is not null
      and (posts.expires_at is null or posts.expires_at > now())
      and exists (
        select 1
        from public.content_rights
        where content_rights.post_id = posts.id
          and content_rights.can_display = true
          and content_rights.rights_status = 'approved'
          and content_rights.takedown_at is null
          and (content_rights.expires_at is null or content_rights.expires_at > now())
      )
  );
$$;

revoke all on function public.is_public_displayable_post(text) from public;
grant execute on function public.is_public_displayable_post(text) to anon, authenticated;

drop trigger if exists content_sources_set_updated_at on public.content_sources;
create trigger content_sources_set_updated_at before update on public.content_sources for each row execute function public.set_updated_at();
drop trigger if exists content_rights_set_updated_at on public.content_rights;
create trigger content_rights_set_updated_at before update on public.content_rights for each row execute function public.set_updated_at();
drop trigger if exists story_groups_set_updated_at on public.story_groups;
create trigger story_groups_set_updated_at before update on public.story_groups for each row execute function public.set_updated_at();
drop trigger if exists post_comments_set_updated_at on public.post_comments;
create trigger post_comments_set_updated_at before update on public.post_comments for each row execute function public.set_updated_at();

alter table public.content_sources enable row level security;
alter table public.content_rights enable row level security;
alter table public.media_variants enable row level security;
alter table public.story_groups enable row level security;
alter table public.story_items enable row level security;
alter table public.story_item_views enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.creator_follows enable row level security;
alter table public.post_reposts enable row level security;

revoke all on table public.posts from anon;
revoke all on table public.media_assets from anon;
revoke all on table public.post_comments from anon;
revoke all on table public.post_reactions from anon;
revoke all on table public.creator_follows from anon;
revoke all on table public.post_reposts from anon;
revoke all on table
  public.content_sources,
  public.content_rights,
  public.media_variants,
  public.story_groups,
  public.story_items,
  public.story_item_views
from anon;

revoke all on table
  public.posts,
  public.media_assets,
  public.content_sources,
  public.content_rights,
  public.media_variants,
  public.story_groups,
  public.story_items,
  public.story_item_views,
  public.post_comments,
  public.post_reactions,
  public.creator_follows,
  public.post_reposts
from authenticated;

grant select on table
  public.posts,
  public.media_assets,
  public.content_sources,
  public.content_rights,
  public.media_variants,
  public.story_groups,
  public.story_items,
  public.post_comments,
  public.post_reactions,
  public.creator_follows,
  public.post_reposts
to anon, authenticated;

grant insert, update, delete on table
  public.posts,
  public.media_assets,
  public.content_sources,
  public.content_rights,
  public.media_variants,
  public.story_groups,
  public.story_items,
  public.story_item_views,
  public.post_comments,
  public.post_reactions,
  public.creator_follows,
  public.post_reposts
to authenticated;

drop policy if exists posts_public_read on public.posts;
drop policy if exists posts_owner_insert on public.posts;
drop policy if exists posts_owner_update on public.posts;
drop policy if exists posts_owner_delete on public.posts;
drop policy if exists media_assets_visible_read on public.media_assets;
drop policy if exists media_assets_owner_write on public.media_assets;
drop policy if exists post_objects_visible_read on public.post_objects;
drop policy if exists post_objects_owner_write on public.post_objects;

drop policy if exists posts_public_published_select on public.posts;
create policy posts_public_published_select on public.posts
for select to anon, authenticated
using (
  visibility = 'public'
  and publish_state = 'published'
  and display_state = 'approved'
  and published_at is not null
  and (expires_at is null or expires_at > now())
  and exists (
    select 1
    from public.content_rights
    where content_rights.post_id = posts.id
      and can_display = true
      and rights_status = 'approved'
      and takedown_at is null
      and (content_rights.expires_at is null or content_rights.expires_at > now())
  )
);

drop policy if exists posts_creator_select on public.posts;
create policy posts_creator_select on public.posts
for select to authenticated
using ((select auth.uid()) = creator_id);

drop policy if exists posts_creator_insert on public.posts;
create policy posts_creator_insert on public.posts
for insert to authenticated
with check (
  (select auth.uid()) = creator_id
  and display_state = 'pending'
);

drop policy if exists posts_creator_update on public.posts;
create policy posts_creator_update on public.posts
for update to authenticated
using ((select auth.uid()) = creator_id)
with check (
  (select auth.uid()) = creator_id
  and display_state = 'pending'
);

drop policy if exists posts_creator_delete on public.posts;
create policy posts_creator_delete on public.posts
for delete to authenticated
using ((select auth.uid()) = creator_id);

drop policy if exists posts_admin_moderate on public.posts;
create policy posts_admin_moderate on public.posts
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists media_assets_public_published_select on public.media_assets;
create policy media_assets_public_published_select on public.media_assets
for select to anon, authenticated
using (
  processing_state = 'ready'
  and public.is_public_displayable_post(media_assets.post_id)
);

drop policy if exists media_assets_owner_write on public.media_assets;
create policy media_assets_owner_write on public.media_assets
for all to authenticated
using (exists (select 1 from public.posts where posts.id = media_assets.post_id and posts.creator_id = (select auth.uid())))
with check (
  processing_state in ('uploaded', 'processing', 'failed')
  and exists (select 1 from public.posts where posts.id = media_assets.post_id and posts.creator_id = (select auth.uid()))
);

drop policy if exists media_assets_admin_review on public.media_assets;
create policy media_assets_admin_review on public.media_assets
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists content_sources_public_displayable_select on public.content_sources;
create policy content_sources_public_displayable_select on public.content_sources
for select to anon, authenticated
using (
  exists (
    select 1
    from public.posts
    join public.content_rights on content_rights.post_id = posts.id
    where posts.source_id = content_sources.id
      and posts.visibility = 'public'
      and posts.publish_state = 'published'
      and posts.display_state = 'approved'
      and posts.published_at is not null
      and (posts.expires_at is null or posts.expires_at > now())
      and content_rights.can_display = true
      and content_rights.rights_status = 'approved'
      and content_rights.takedown_at is null
      and (content_rights.expires_at is null or content_rights.expires_at > now())
  )
);

drop policy if exists content_sources_creator_insert on public.content_sources;
create policy content_sources_creator_insert on public.content_sources
for insert to authenticated
with check (creator_id is null or creator_id = (select auth.uid()));

drop policy if exists content_sources_creator_update on public.content_sources;
create policy content_sources_creator_update on public.content_sources
for update to authenticated
using (creator_id = (select auth.uid()))
with check (creator_id = (select auth.uid()));

drop policy if exists content_sources_admin_manage on public.content_sources;
create policy content_sources_admin_manage on public.content_sources
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists content_rights_public_displayable_select on public.content_rights;
create policy content_rights_public_displayable_select on public.content_rights
for select to anon, authenticated
using (
  can_display = true
  and rights_status = 'approved'
  and takedown_at is null
  and (expires_at is null or expires_at > now())
  and exists (
    select 1
    from public.posts
    where posts.id = content_rights.post_id
      and visibility = 'public'
      and publish_state = 'published'
      and display_state = 'approved'
      and published_at is not null
      and (expires_at is null or expires_at > now())
  )
);

drop policy if exists content_rights_owner_insert on public.content_rights;
create policy content_rights_owner_insert on public.content_rights
for insert to authenticated
with check (
  rights_status = 'pending'
  and can_display = false
  and can_embed = false
  and can_derive = false
  and can_tag = false
  and can_use_for_commerce_matching = false
  and can_redistribute = false
  and reviewed_by is null
  and reviewed_at is null
  and exists (select 1 from public.posts where posts.id = content_rights.post_id and posts.creator_id = (select auth.uid()))
);

drop policy if exists content_rights_admin_review on public.content_rights;
create policy content_rights_admin_review on public.content_rights
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists media_variants_public_ready_select on public.media_variants;
create policy media_variants_public_ready_select on public.media_variants
for select to anon, authenticated
using (
  processing_state = 'ready'
  and exists (
    select 1
    from public.media_assets
    where media_assets.id = media_variants.media_asset_id
      and media_assets.processing_state = 'ready'
      and public.is_public_displayable_post(media_assets.post_id)
  )
);

drop policy if exists media_variants_owner_write on public.media_variants;
create policy media_variants_owner_write on public.media_variants
for all to authenticated
using (
  exists (
    select 1
    from public.media_assets
    join public.posts on posts.id = media_assets.post_id
    where media_assets.id = media_variants.media_asset_id
      and posts.creator_id = (select auth.uid())
  )
)
with check (
  processing_state in ('uploaded', 'processing', 'failed')
  and exists (
    select 1
    from public.media_assets
    join public.posts on posts.id = media_assets.post_id
    where media_assets.id = media_variants.media_asset_id
      and posts.creator_id = (select auth.uid())
  )
);

drop policy if exists media_variants_admin_review on public.media_variants;
create policy media_variants_admin_review on public.media_variants
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists story_groups_public_active_select on public.story_groups;
create policy story_groups_public_active_select on public.story_groups
for select to anon, authenticated
using (
  visibility = 'public'
  and publish_state = 'published'
  and display_state = 'approved'
  and starts_at <= now()
  and expires_at > now()
  and exists (
    select 1
    from public.story_items
    join public.media_assets on media_assets.id = story_items.media_asset_id
    where story_items.story_group_id = story_groups.id
      and media_assets.processing_state = 'ready'
      and public.is_public_displayable_post(media_assets.post_id)
  )
);

drop policy if exists story_groups_creator_write on public.story_groups;
create policy story_groups_creator_write on public.story_groups
for all to authenticated
using (creator_id = (select auth.uid()))
with check (
  creator_id = (select auth.uid())
  and display_state = 'pending'
);

drop policy if exists story_groups_admin_moderate on public.story_groups;
create policy story_groups_admin_moderate on public.story_groups
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists story_items_public_active_select on public.story_items;
create policy story_items_public_active_select on public.story_items
for select to anon, authenticated
using (
  exists (
    select 1
    from public.story_groups
    where story_groups.id = story_items.story_group_id
      and visibility = 'public'
      and publish_state = 'published'
      and display_state = 'approved'
      and starts_at <= now()
      and expires_at > now()
  )
  and exists (
    select 1
    from public.media_assets
    where media_assets.id = story_items.media_asset_id
      and media_assets.processing_state = 'ready'
      and public.is_public_displayable_post(media_assets.post_id)
  )
);

drop policy if exists story_items_creator_write on public.story_items;
create policy story_items_creator_write on public.story_items
for all to authenticated
using (exists (select 1 from public.story_groups where story_groups.id = story_items.story_group_id and story_groups.creator_id = (select auth.uid())))
with check (exists (select 1 from public.story_groups where story_groups.id = story_items.story_group_id and story_groups.creator_id = (select auth.uid())));

drop policy if exists story_item_views_viewer_insert on public.story_item_views;
create policy story_item_views_viewer_insert on public.story_item_views
for insert to authenticated
with check ((select auth.uid()) = viewer_id);

drop policy if exists story_item_views_viewer_select on public.story_item_views;
create policy story_item_views_viewer_select on public.story_item_views
for select to authenticated
using ((select auth.uid()) = viewer_id or (select public.is_admin()));

drop policy if exists post_comments_public_approved_select on public.post_comments;
create policy post_comments_public_approved_select on public.post_comments
for select to anon, authenticated
using (
  moderation_state = 'approved'
  and deleted_at is null
  and public.is_public_displayable_post(post_comments.post_id)
);

drop policy if exists post_comments_author_insert on public.post_comments;
create policy post_comments_author_insert on public.post_comments
for insert to authenticated
with check (
  (select auth.uid()) = author_id
  and moderation_state = 'pending'
);

drop policy if exists post_comments_author_update on public.post_comments;
create policy post_comments_author_update on public.post_comments
for update to authenticated
using ((select auth.uid()) = author_id)
with check (
  (select auth.uid()) = author_id
  and moderation_state = 'pending'
);

drop policy if exists post_comments_admin_moderate on public.post_comments;
create policy post_comments_admin_moderate on public.post_comments
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists post_reactions_actor_select on public.post_reactions;
create policy post_reactions_actor_select on public.post_reactions
for select to authenticated
using ((select auth.uid()) = actor_id or (select public.is_admin()));

drop policy if exists post_reactions_actor_insert on public.post_reactions;
create policy post_reactions_actor_insert on public.post_reactions
for insert to authenticated
with check ((select auth.uid()) = actor_id);

drop policy if exists post_reactions_actor_delete on public.post_reactions;
create policy post_reactions_actor_delete on public.post_reactions
for delete to authenticated
using ((select auth.uid()) = actor_id);

drop policy if exists creator_follows_visible_select on public.creator_follows;
create policy creator_follows_visible_select on public.creator_follows
for select to authenticated
using ((select auth.uid()) = follower_id or (select auth.uid()) = creator_id or (select public.is_admin()));

drop policy if exists creator_follows_follower_insert on public.creator_follows;
create policy creator_follows_follower_insert on public.creator_follows
for insert to authenticated
with check ((select auth.uid()) = follower_id);

drop policy if exists creator_follows_follower_delete on public.creator_follows;
create policy creator_follows_follower_delete on public.creator_follows
for delete to authenticated
using ((select auth.uid()) = follower_id);

drop policy if exists post_reposts_public_select on public.post_reposts;
create policy post_reposts_public_select on public.post_reposts
for select to anon, authenticated
using (
  permission_state = 'approved'
  and public.is_public_displayable_post(post_reposts.original_post_id)
  and public.is_public_displayable_post(post_reposts.repost_post_id)
);

drop policy if exists post_reposts_creator_insert on public.post_reposts;
create policy post_reposts_creator_insert on public.post_reposts
for insert to authenticated
with check (
  (select auth.uid()) = creator_id
  and permission_state = 'pending'
);

drop policy if exists post_reposts_admin_review on public.post_reposts;
create policy post_reposts_admin_review on public.post_reposts
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists post_objects_public_published_select on public.post_objects;
create policy post_objects_public_published_select on public.post_objects
for select to anon, authenticated
using (
  public.is_public_displayable_post(post_objects.post_id)
);

drop policy if exists post_objects_owner_write on public.post_objects;
create policy post_objects_owner_write on public.post_objects
for all to authenticated
using (exists (select 1 from public.posts where posts.id = post_objects.post_id and posts.creator_id = (select auth.uid())))
with check (
  public.is_public_displayable_post(post_objects.post_id)
  and exists (
    select 1
    from public.content_rights
    where content_rights.post_id = post_objects.post_id
      and content_rights.can_use_for_commerce_matching = true
      and content_rights.rights_status = 'approved'
      and content_rights.takedown_at is null
      and (content_rights.expires_at is null or content_rights.expires_at > now())
  )
  and exists (select 1 from public.posts where posts.id = post_objects.post_id and posts.creator_id = (select auth.uid()))
);

drop policy if exists post_objects_admin_review on public.post_objects;
create policy post_objects_admin_review on public.post_objects
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

comment on table public.analytics_events is 'Server-written analytics events. Demo rows are explicitly marked. No client insert policy by design.';
comment on table public.affiliate_clicks is 'Server-written attribution ledger. No client insert policy by design.';
