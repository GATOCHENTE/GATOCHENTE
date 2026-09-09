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

alter table public.project_posts
add column if not exists image_url text;

alter table public.project_posts
add column if not exists project_year text;

alter table public.project_posts
add column if not exists body text;

alter table public.project_posts
add column if not exists updated_at timestamptz not null default now();

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

create or replace function public.get_public_project_posts()
returns table (
  id uuid,
  title text,
  category text,
  summary text,
  body text,
  image_url text,
  project_year text,
  tags text[],
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    project_posts.id,
    project_posts.title,
    project_posts.category,
    project_posts.summary,
    project_posts.body,
    project_posts.image_url,
    project_posts.project_year,
    project_posts.tags,
    project_posts.created_at
  from public.project_posts
  order by project_posts.created_at desc;
$$;

revoke all on function public.get_public_project_posts() from public;
grant execute on function public.get_public_project_posts() to anon, authenticated;

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

insert into public.project_posts (
  id,
  title,
  category,
  summary,
  body,
  image_url,
  project_year,
  tags,
  created_at
)
values
  (
    '44444444-4444-4444-8444-444444444444',
    'CatPack',
    'Aplicacion para Windows',
    'Archivador moderno creado por GATOCHENTE para comprimir, extraer, inspeccionar y verificar archivos .gcat en Windows.',
    'Utiliza compresion ZSTD, hashes SHA-256, metadata propia y un sistema de actualizacion desde GATOCHENTE. Objetivo: crear una herramienta propia para empaquetar archivos con una experiencia simple y moderna.',
    '/img/catpack-logo.png',
    '2026',
    array['Windows', '.gcat', 'ZSTD', 'SHA-256'],
    '2026-01-01 12:00:00+00'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'Bano ecologico',
    'Proyecto escolar',
    'Maqueta de bano ecologico con sistema de ahorro de agua y reciclaje de residuos.',
    'Utiliza Circuitos, Protoboard, Bomba de agua y Pulsador. Objetivo: representar una solucion simple para cuidar el agua.',
    '/img/proyecto1.jpg',
    '2023',
    array['Circuitos', 'Protoboard', 'Bomba de agua', 'Pulsador'],
    '2023-01-01 12:00:00+00'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'Innovador paso peatonal',
    'Prototipo con Arduino',
    'Maqueta de paso peatonal con barreras automaticas y semaforo inteligente.',
    'Utiliza un temporizador para avisar a peatones y vehiculos, activando las barreras y cambiando el semaforo en consecuencia. Utiliza Arduino, Protoboard, LEDs y Servomotores.',
    '/img/proyecto2.jpg',
    '2024',
    array['Arduino', 'Protoboard', 'LEDs', 'Servomotores'],
    '2024-01-01 12:00:00+00'
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    'Detecta y protege',
    'Sistema de alerta',
    'Maqueta de sistema de seguridad ante sismos con sensores de movimiento y vibracion.',
    'Utiliza sensores de movimiento y vibracion para detectar actividad sismica. Utiliza Arduino, Protoboard, Sensores de Vibracion y LEDs.',
    '/img/proyecto3.jpg',
    '2025',
    array['Arduino', 'Sensores', 'LEDs'],
    '2025-01-01 12:00:00+00'
  )
on conflict (id) do update
set
  title = excluded.title,
  category = excluded.category,
  summary = excluded.summary,
  body = excluded.body,
  image_url = excluded.image_url,
  project_year = excluded.project_year,
  tags = excluded.tags;

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

notify pgrst, 'reload schema';
