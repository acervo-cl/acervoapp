-- ACERVO · SQL pendiente (Supabase → SQL Editor)
-- Todo es idempotente: se puede correr de nuevo sin romper nada.
-- IMPORTANTE: corre primero el PASO 0 y revisa el resultado antes de seguir.

-- ═══════════════════════════════════════════════════════════════════
-- PASO 0 · ¿Qué policies existen HOY?  (solo mira, no cambia nada)
-- ═══════════════════════════════════════════════════════════════════
-- Si aparecen policies con nombres distintos a los de abajo, hay que borrarlas
-- a mano: las policies se SUMAN (OR), así que una vieja recursiva seguiría
-- causando "infinite recursion" aunque agregues las nuevas.
select tablename, policyname, cmd
from pg_policies
where tablename in ('shared_causas','shared_causa_members')
order by tablename, policyname;


-- ═══════════════════════════════════════════════════════════════════
-- PASO 1 · Funciones SECURITY DEFINER (arreglan la recursión)
-- ═══════════════════════════════════════════════════════════════════
-- El problema: las policies de shared_causas y shared_causa_members se
-- consultaban entre sí → RLS se llamaba a sí misma. Estas funciones corren
-- como dueño de la BD (saltan RLS) y cortan el círculo.

create or replace function public.is_causa_owner(cid text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from shared_causas c where c.id = cid and c.owner_id = auth.uid());
$$;

create or replace function public.is_causa_member(cid text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from shared_causa_members m where m.causa_id = cid and m.user_id = auth.uid());
$$;

create or replace function public.is_causa_editor(cid text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from shared_causa_members m
                where m.causa_id = cid and m.user_id = auth.uid() and m.role in ('owner','editor'))
      or exists(select 1 from shared_causas c where c.id = cid and c.owner_id = auth.uid());
$$;

grant execute on function public.is_causa_owner(text)  to authenticated;
grant execute on function public.is_causa_member(text) to authenticated;
grant execute on function public.is_causa_editor(text) to authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- PASO 2 · Policies de las causas compartidas
-- ═══════════════════════════════════════════════════════════════════
alter table shared_causas enable row level security;

drop policy if exists "causa: ver" on shared_causas;
create policy "causa: ver" on shared_causas for select to authenticated
  using (owner_id = auth.uid() or is_causa_member(id));

drop policy if exists "causa: crear" on shared_causas;
create policy "causa: crear" on shared_causas for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "causa: editar" on shared_causas;
create policy "causa: editar" on shared_causas for update to authenticated
  using      (owner_id = auth.uid() or is_causa_editor(id))
  with check (owner_id = auth.uid() or is_causa_editor(id));

drop policy if exists "causa: borrar" on shared_causas;
create policy "causa: borrar" on shared_causas for delete to authenticated
  using (owner_id = auth.uid());   -- solo el dueño la borra de verdad


-- ═══════════════════════════════════════════════════════════════════
-- PASO 3 · Policies de los miembros (incluye "salir", que faltaba)
-- ═══════════════════════════════════════════════════════════════════
alter table shared_causa_members enable row level security;

drop policy if exists "miembros: ver" on shared_causa_members;
create policy "miembros: ver" on shared_causa_members for select to authenticated
  using (user_id = auth.uid() or is_causa_owner(causa_id));

drop policy if exists "miembros: invitar" on shared_causa_members;
create policy "miembros: invitar" on shared_causa_members for insert to authenticated
  with check (is_causa_owner(causa_id));

drop policy if exists "miembros: cambiar rol" on shared_causa_members;
create policy "miembros: cambiar rol" on shared_causa_members for update to authenticated
  using (is_causa_owner(causa_id)) with check (is_causa_owner(causa_id));

drop policy if exists "miembros: quitar" on shared_causa_members;
create policy "miembros: quitar" on shared_causa_members for delete to authenticated
  using (is_causa_owner(causa_id));

-- ESTA es la que falta para que "salir de la causa" funcione:
drop policy if exists "miembros: salir" on shared_causa_members;
create policy "miembros: salir" on shared_causa_members for delete to authenticated
  using (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════
-- PASO 4 · Bucket de archivos (si ya existe, no hace nada)
-- ═══════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('acervo-files','acervo-files', false)
on conflict (id) do nothing;


-- ═══════════════════════════════════════════════════════════════════
-- PASO 5 · Policies de archivos
-- ═══════════════════════════════════════════════════════════════════
-- Dos rutas conviven en el bucket:
--   {uid}/{docId}            → tus archivos personales
--   causa/{causaId}/{docId}  → archivos de una causa compartida (los ve el equipo)

-- 5a) Tus propios archivos
drop policy if exists "acervo: archivos propios" on storage.objects;
create policy "acervo: archivos propios" on storage.objects for all to authenticated
  using      (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- 5b) Archivos de causas compartidas: leen los miembros, escriben los editores
drop policy if exists "acervo: causa archivos ver" on storage.objects;
create policy "acervo: causa archivos ver" on storage.objects for select to authenticated
  using (bucket_id = 'acervo-files'
         and (storage.foldername(name))[1] = 'causa'
         and (is_causa_member((storage.foldername(name))[2])
              or is_causa_owner((storage.foldername(name))[2])));

drop policy if exists "acervo: causa archivos subir" on storage.objects;
create policy "acervo: causa archivos subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'acervo-files'
              and (storage.foldername(name))[1] = 'causa'
              and is_causa_editor((storage.foldername(name))[2]));

drop policy if exists "acervo: causa archivos actualizar" on storage.objects;
create policy "acervo: causa archivos actualizar" on storage.objects for update to authenticated
  using      (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'causa'
              and is_causa_editor((storage.foldername(name))[2]))
  with check (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'causa'
              and is_causa_editor((storage.foldername(name))[2]));

drop policy if exists "acervo: causa archivos borrar" on storage.objects;
create policy "acervo: causa archivos borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'acervo-files' and (storage.foldername(name))[1] = 'causa'
         and is_causa_editor((storage.foldername(name))[2]));


-- ═══════════════════════════════════════════════════════════════════
-- COMPROBACIÓN (opcional): debería listar las policies nuevas
-- ═══════════════════════════════════════════════════════════════════
-- select tablename, policyname, cmd from pg_policies
-- where tablename in ('shared_causas','shared_causa_members','objects')
-- order by tablename, policyname;
