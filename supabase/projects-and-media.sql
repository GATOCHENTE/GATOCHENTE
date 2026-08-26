-- Optional expansion: editable projects + image uploads.
-- Run this after supabase/news.sql.

create table if not exists public.project_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 90),
  category text not null check (char_length(category) between 1 and 32),
  summary text not null check (char_length(summary) between 1 and 220),
  body text not null check (char_length(body) between 1 and 1200),
  image_url text,
  project_year text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_posts
add column if not exists tags text[] not null default '{}';

alter table public.project_posts enable row level security;

revoke all on table public.project_posts from anon, authenticated;
grant select on table public.project_posts to anon, authenticated;
grant insert, update, delete on table public.project_posts to authenticated;

drop policy if exists "Anyone can read project posts" on public.project_posts;
create policy "Anyone can read project posts"
on public.project_posts
for select
to anon, authenticated
using (true);

drop policy if exists "Only GATOCHENTE can create project posts" on public.project_posts;
create policy "Only GATOCHENTE can create project posts"
on public.project_posts
for insert
to authenticated
with check (public.is_news_admin());

drop policy if exists "Only GATOCHENTE can update project posts" on public.project_posts;
create policy "Only GATOCHENTE can update project posts"
on public.project_posts
for update
to authenticated
using (public.is_news_admin())
with check (public.is_news_admin());

drop policy if exists "Only GATOCHENTE can delete project posts" on public.project_posts;
create policy "Only GATOCHENTE can delete project posts"
on public.project_posts
for delete
to authenticated
using (public.is_news_admin());

insert into storage.buckets (id, name, public)
values ('gatochente-media', 'gatochente-media', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can read GATOCHENTE media" on storage.objects;
create policy "Anyone can read GATOCHENTE media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'gatochente-media');

drop policy if exists "Only GATOCHENTE can upload media" on storage.objects;
create policy "Only GATOCHENTE can upload media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'gatochente-media' and public.is_news_admin());

drop policy if exists "Only GATOCHENTE can update media" on storage.objects;
create policy "Only GATOCHENTE can update media"
on storage.objects
for update
to authenticated
using (bucket_id = 'gatochente-media' and public.is_news_admin())
with check (bucket_id = 'gatochente-media' and public.is_news_admin());

drop policy if exists "Only GATOCHENTE can delete media" on storage.objects;
create policy "Only GATOCHENTE can delete media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'gatochente-media' and public.is_news_admin());
