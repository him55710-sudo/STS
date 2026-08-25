create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.posts (
  id text primary key,
  creator_id uuid references auth.users(id) on delete set null,
  creator_key text,
  caption text not null default '',
  category text not null default 'fashion' check (category in ('fashion', 'beauty', 'interior', 'tech', 'lifestyle')),
  visibility text not null default 'public' check (visibility in ('public', 'private', 'unlisted')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.posts(id) on delete cascade,
  storage_path text,
  public_url text not null,
  width integer,
  height integer,
  source text not null default 'user_upload',
  license_note text,
  content_hash text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (content_hash)
);

create table if not exists public.products (
  id text primary key,
  brand text not null,
  name text not null,
  price integer,
  currency text not null default 'KRW',
  retailer text not null,
  destination_url text not null,
  image_url text,
  category text not null default 'fashion' check (category in ('fashion', 'beauty', 'interior', 'tech', 'lifestyle')),
  affiliate boolean not null default false,
  commission_rate numeric(6, 5),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_objects (
  id text primary key,
  post_id text not null references public.posts(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  label text not null,
  geometry jsonb not null default '{}'::jsonb,
  exactness text not null default 'similar' check (exactness in ('exact', 'similar')),
  confidence numeric(5, 4),
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  network text not null,
  destination_url text not null,
  affiliate_url text,
  status text not null default 'active' check (status in ('active', 'paused', 'rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, network)
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  click_id text not null unique,
  product_id text references public.products(id) on delete set null,
  post_id text references public.posts(id) on delete set null,
  object_id text,
  creator_id uuid references auth.users(id) on delete set null,
  creator_key text,
  network text not null default 'direct',
  destination_url text not null,
  affiliate_url text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  session_id text,
  post_id text references public.posts(id) on delete set null,
  product_id text references public.products(id) on delete set null,
  object_id text,
  source text not null default 'web',
  is_demo boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists posts_public_created_idx on public.posts (visibility, created_at desc);
create index if not exists posts_creator_created_idx on public.posts (creator_id, created_at desc);
create index if not exists media_assets_post_idx on public.media_assets (post_id);
create index if not exists post_objects_post_idx on public.post_objects (post_id);
create index if not exists post_objects_product_idx on public.post_objects (product_id);
create index if not exists affiliate_clicks_product_created_idx on public.affiliate_clicks (product_id, created_at desc);
create index if not exists affiliate_clicks_creator_created_idx on public.affiliate_clicks (creator_id, created_at desc);
create index if not exists analytics_events_type_created_idx on public.analytics_events (event_type, created_at desc);

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists affiliate_links_set_updated_at on public.affiliate_links;
create trigger affiliate_links_set_updated_at
before update on public.affiliate_links
for each row execute function public.set_updated_at();

alter table public.posts enable row level security;
alter table public.media_assets enable row level security;
alter table public.products enable row level security;
alter table public.post_objects enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
for select using (visibility = 'public' or creator_id = auth.uid());

drop policy if exists posts_owner_insert on public.posts;
create policy posts_owner_insert on public.posts
for insert with check (creator_id = auth.uid());

drop policy if exists posts_owner_update on public.posts;
create policy posts_owner_update on public.posts
for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());

drop policy if exists posts_owner_delete on public.posts;
create policy posts_owner_delete on public.posts
for delete using (creator_id = auth.uid());

drop policy if exists media_assets_visible_read on public.media_assets;
create policy media_assets_visible_read on public.media_assets
for select using (
  exists (
    select 1 from public.posts
    where posts.id = media_assets.post_id
      and (posts.visibility = 'public' or posts.creator_id = auth.uid())
  )
);

drop policy if exists media_assets_owner_write on public.media_assets;
create policy media_assets_owner_write on public.media_assets
for all using (
  exists (select 1 from public.posts where posts.id = media_assets.post_id and posts.creator_id = auth.uid())
) with check (
  exists (select 1 from public.posts where posts.id = media_assets.post_id and posts.creator_id = auth.uid())
);

drop policy if exists post_objects_visible_read on public.post_objects;
create policy post_objects_visible_read on public.post_objects
for select using (
  exists (
    select 1 from public.posts
    where posts.id = post_objects.post_id
      and (posts.visibility = 'public' or posts.creator_id = auth.uid())
  )
);

drop policy if exists post_objects_owner_write on public.post_objects;
create policy post_objects_owner_write on public.post_objects
for all using (
  exists (select 1 from public.posts where posts.id = post_objects.post_id and posts.creator_id = auth.uid())
) with check (
  exists (select 1 from public.posts where posts.id = post_objects.post_id and posts.creator_id = auth.uid())
);

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
for select using (true);

drop policy if exists affiliate_links_public_read on public.affiliate_links;
create policy affiliate_links_public_read on public.affiliate_links
for select using (status = 'active');

comment on table public.affiliate_clicks is 'Server-written attribution ledger. No client insert policy by design.';
comment on table public.analytics_events is 'Server-written analytics events. Demo rows are explicitly marked.';
