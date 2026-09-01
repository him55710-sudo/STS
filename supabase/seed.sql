insert into public.catalog_sources (id, provider, feed_url)
values
  ('fixture', 'fixture', null),
  ('catalog-demo', 'feed', 'https://catalog.example.test/feed.json')
on conflict (id) do update
set provider = excluded.provider,
    feed_url = excluded.feed_url,
    updated_at = now();

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'admin@example.test', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'creator@example.test', '{}'::jsonb)
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
values
  ('00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'operator')
on conflict (user_id) do update
set role = excluded.role,
    updated_at = now();

insert into public.catalog_import_checkpoints (source_id, current_checkpoint, next_checkpoint)
values ('fixture', 'seed:v1', 'seed:v2')
on conflict (source_id) do update
set current_checkpoint = excluded.current_checkpoint,
    next_checkpoint = excluded.next_checkpoint,
    updated_at = now();
