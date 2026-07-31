-- ═══════════════════════════════════════════════════════════════════
-- ACERVO · Biblioteca base del estudio
-- Libros que el admin marca y aparecen para TODOS los usuarios (solo lectura).
-- Correr una sola vez en: Supabase → SQL Editor → New query → pegar → Run.
-- Es idempotente (usa "if not exists" y recrea las políticas), se puede correr de nuevo sin miedo.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Tabla del catálogo de la biblioteca base (todos leen, solo admin escribe)
create table if not exists public.acervo_base_books (
  id         text primary key default 'base',
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.acervo_base_books enable row level security;

drop policy if exists "base_books_read" on public.acervo_base_books;
create policy "base_books_read" on public.acervo_base_books
  for select to authenticated using (true);

drop policy if exists "base_books_write" on public.acervo_base_books;
create policy "base_books_write" on public.acervo_base_books
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- 2) Archivos de la biblioteca base (ruta base/…): TODOS leen, solo admin escribe
drop policy if exists "base files read" on storage.objects;
create policy "base files read" on storage.objects
  for select to authenticated
  using (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'base');

drop policy if exists "base files write" on storage.objects;
create policy "base files write" on storage.objects
  for all to authenticated
  using      (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'base' and is_admin())
  with check (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'base' and is_admin());

-- ── Si sale error "function is_admin() does not exist", usa ESTA versión en su lugar ──
-- (borra las 4 políticas de arriba y crea estas, que consultan profiles directamente)
--
-- drop policy if exists "base_books_write" on public.acervo_base_books;
-- create policy "base_books_write" on public.acervo_base_books
--   for all to authenticated
--   using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
--   with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
--
-- drop policy if exists "base files write" on storage.objects;
-- create policy "base files write" on storage.objects
--   for all to authenticated
--   using      (bucket_id='acervo-files' and (storage.foldername(name))[1]='base' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
--   with check (bucket_id='acervo-files' and (storage.foldername(name))[1]='base' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
