-- ACERVO · Libros / apuntes / documentos compartidos con colegas (con sus notas)
-- Supabase → SQL Editor. Todo idempotente (se puede correr de nuevo).
-- Mismo patrón que las causas compartidas (funciones SECURITY DEFINER para evitar recursión RLS).

-- ═══════════════════════════════════════════════════════════════════
-- PASO 1 · Tablas
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.shared_docs (
  id         text primary key,                 -- el id del libro/apunte/documento
  owner_id   uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'libro',    -- 'libro' | 'apunte' | 'documento'
  data       jsonb not null default '{}',      -- { doc, kind, withNotes, annotations[] }
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_doc_members (
  doc_id      text not null references public.shared_docs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text,
  role        text not null default 'viewer',  -- 'owner' | 'viewer'
  notes       jsonb default '[]',              -- notas que el lector DEVUELVE al dueño (si opta)
  share_notes boolean not null default false,
  added_at    timestamptz not null default now(),
  primary key (doc_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- PASO 2 · Funciones SECURITY DEFINER (cortan la recursión de RLS)
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.is_doc_owner(did text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from shared_docs d where d.id = did and d.owner_id = auth.uid());
$$;

create or replace function public.is_doc_member(did text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from shared_doc_members m where m.doc_id = did and m.user_id = auth.uid());
$$;

grant execute on function public.is_doc_owner(text)  to authenticated;
grant execute on function public.is_doc_member(text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- PASO 3 · Policies de shared_docs
-- ═══════════════════════════════════════════════════════════════════
alter table public.shared_docs enable row level security;

drop policy if exists "doc: ver" on shared_docs;
create policy "doc: ver" on shared_docs for select to authenticated
  using (owner_id = auth.uid() or is_doc_member(id));

drop policy if exists "doc: crear" on shared_docs;
create policy "doc: crear" on shared_docs for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "doc: editar" on shared_docs;
create policy "doc: editar" on shared_docs for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "doc: borrar" on shared_docs;
create policy "doc: borrar" on shared_docs for delete to authenticated
  using (owner_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- PASO 4 · Policies de shared_doc_members
-- ═══════════════════════════════════════════════════════════════════
alter table public.shared_doc_members enable row level security;

-- Ver: el dueño ve todos los miembros; cada quien ve su propia fila
drop policy if exists "docmiembros: ver" on shared_doc_members;
create policy "docmiembros: ver" on shared_doc_members for select to authenticated
  using (user_id = auth.uid() or is_doc_owner(doc_id));

-- Invitar/quitar: solo el dueño; y cada quien puede crear su propia fila 'owner' al compartir
drop policy if exists "docmiembros: agregar" on shared_doc_members;
create policy "docmiembros: agregar" on shared_doc_members for insert to authenticated
  with check (is_doc_owner(doc_id) or user_id = auth.uid());

drop policy if exists "docmiembros: quitar" on shared_doc_members;
create policy "docmiembros: quitar" on shared_doc_members for delete to authenticated
  using (is_doc_owner(doc_id) or user_id = auth.uid());

-- Actualizar: el dueño (roles) y cada lector SU propia fila (para devolver sus notas)
drop policy if exists "docmiembros: actualizar" on shared_doc_members;
create policy "docmiembros: actualizar" on shared_doc_members for update to authenticated
  using (is_doc_owner(doc_id) or user_id = auth.uid())
  with check (is_doc_owner(doc_id) or user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- PASO 5 · Archivos (PDF/imagen) de docs compartidos → bucket acervo-files, ruta doc/{docId}/…
--   (el bucket ya existe del SQL de causas; si no, córrelo primero)
-- ═══════════════════════════════════════════════════════════════════
drop policy if exists "acervo: doc archivos ver" on storage.objects;
create policy "acervo: doc archivos ver" on storage.objects for select to authenticated
  using (bucket_id = 'acervo-files'
         and (storage.foldername(name))[1] = 'doc'
         and (is_doc_member((storage.foldername(name))[2]) or is_doc_owner((storage.foldername(name))[2])));

drop policy if exists "acervo: doc archivos subir" on storage.objects;
create policy "acervo: doc archivos subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'acervo-files'
              and (storage.foldername(name))[1] = 'doc'
              and is_doc_owner((storage.foldername(name))[2]));

drop policy if exists "acervo: doc archivos actualizar" on storage.objects;
create policy "acervo: doc archivos actualizar" on storage.objects for update to authenticated
  using      (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'doc' and is_doc_owner((storage.foldername(name))[2]))
  with check (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'doc' and is_doc_owner((storage.foldername(name))[2]));

drop policy if exists "acervo: doc archivos borrar" on storage.objects;
create policy "acervo: doc archivos borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'doc' and is_doc_owner((storage.foldername(name))[2]));
