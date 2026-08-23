-- GATOCHENTE news backend for Supabase.
-- Keep your personal admin email inside Supabase, not in this repo.
-- After running this file, add your admin email from the Supabase SQL Editor:
-- insert into private.admin_users (email) values ('your-email@example.com');
-- For passkeys/WebAuthn, configure Supabase Auth with:
-- RP display name: GATOCHENTE
-- RP ID: gatochente.com
-- RP origins: https://www.gatochente.com, https://gatochente.com

create extension if not exists pgcrypto;

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  category text not null check (char_length(category) between 1 and 28),
  summary text not null check (char_length(summary) between 1 and 170),
  body text not null check (char_length(body) between 1 and 900),
  image_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_posts
add column if not exists image_url text;

create schema if not exists private;

create table if not exists private.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on table private.admin_users from public, anon, authenticated;
alter table private.admin_users enable row level security;

create or replace function public.is_news_admin()
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from private.admin_users
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.is_news_admin() from public;
grant execute on function public.is_news_admin() to authenticated;

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


create index if not exists news_posts_published_at_idx
on public.news_posts (published_at desc);

alter table public.news_posts enable row level security;

revoke all on table public.news_posts from anon, authenticated;
grant select on table public.news_posts to anon, authenticated;
grant insert, update, delete on table public.news_posts to authenticated;

drop policy if exists "Anyone can read news posts" on public.news_posts;
create policy "Anyone can read news posts"
on public.news_posts
for select
to anon, authenticated
using (true);

drop policy if exists "Only GATOCHENTE can create news posts" on public.news_posts;
create policy "Only GATOCHENTE can create news posts"
on public.news_posts
for insert
to authenticated
with check (public.is_news_admin());

drop policy if exists "Only GATOCHENTE can update news posts" on public.news_posts;
create policy "Only GATOCHENTE can update news posts"
on public.news_posts
for update
to authenticated
using (public.is_news_admin())
with check (public.is_news_admin());

drop policy if exists "Only GATOCHENTE can delete news posts" on public.news_posts;
create policy "Only GATOCHENTE can delete news posts"
on public.news_posts
for delete
to authenticated
using (public.is_news_admin());

create or replace function public.set_news_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_news_posts_updated_at on public.news_posts;
create trigger set_news_posts_updated_at
before update on public.news_posts
for each row
execute function public.set_news_posts_updated_at();

with duplicate_news as (
  select
    id,
    row_number() over (
      partition by title, category, summary, body
      order by published_at desc, created_at desc
    ) as copy_number
  from public.news_posts
)
delete from public.news_posts
where id in (
  select id from duplicate_news where copy_number > 1
);

insert into public.news_posts (id, title, category, summary, body, published_at)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'CatPack Beta ya tiene pagina propia',
    'CatPack',
    'El proyecto CatPack suma una presentacion mas clara, versiones y una experiencia visual conectada con el portafolio.',
    'CatPack sigue creciendo como archivador moderno para Windows. La pagina ahora muestra mejor el estado del proyecto, las versiones y lo que viene despues.',
    '2026-08-23 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'La web estrena noticiero',
    'Web',
    'GATOCHENTE ahora tiene un espacio para publicar novedades, cambios importantes y mini entradas tipo blog.',
    'Este noticiero nace para ordenar las actualizaciones del sitio, mostrar avances y dejar registro de las ideas nuevas.',
    '2026-08-23 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'FishingCat vive dentro del logo',
    'Juego',
    'El boton del logo une buscador, temas y una demostracion compacta de FishingCat en la navbar.',
    'El panel del logo mantiene la identidad del sitio y deja jugar una version pequena de FishingCat sin salir de la pagina.',
    '2026-08-22 12:00:00+00'
  )
on conflict (id) do nothing;
