-- ═══════════════════════════════════════════════════════════════════
-- ACERVO · Configuración pendiente (copiar TODO y correr en Supabase → SQL Editor → Run)
-- Es idempotente: se puede correr de nuevo sin problema.
-- ═══════════════════════════════════════════════════════════════════


-- ── PARTE 1: columnas de perfil (nombre y RUT del usuario) ──────────
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists rut text;


-- ── PARTE 2: Biblioteca base del estudio ────────────────────────────
-- Libros que el admin marca y aparecen para TODOS los usuarios (solo lectura).

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

-- Archivos de la biblioteca base (ruta base/…): TODOS leen, solo admin escribe
drop policy if exists "base files read" on storage.objects;
create policy "base files read" on storage.objects
  for select to authenticated
  using (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'base');

drop policy if exists "base files write" on storage.objects;
create policy "base files write" on storage.objects
  for all to authenticated
  using      (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'base' and is_admin())
  with check (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'base' and is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- SI SALE ERROR "function is_admin() does not exist":
-- Borra en las 4 políticas de la Parte 2 la palabra  is_admin()  y reemplázala por:
--   (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
-- (o pídeme la versión ya reemplazada y te la paso completa)
-- ═══════════════════════════════════════════════════════════════════
