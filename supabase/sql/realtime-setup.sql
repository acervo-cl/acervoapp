-- ═══════════════════════════════════════════════════════════════════
-- ACERVO · Tiempo real (lo compartido aparece sin recargar)
-- Correr en Supabase → SQL Editor → Run. Idempotente.
-- Sin esto, la app igual actualiza sola cada ~30 s (sondeo). Con esto, es INSTANTÁNEO.
-- ═══════════════════════════════════════════════════════════════════

-- Agrega las tablas de "compartir" a la publicación de realtime de Supabase.
-- (Si alguna tabla ya está en la publicación, el "add" da error inofensivo: puedes ignorarlo
--  o correr las líneas una por una.)

do $$
begin
  -- shared_docs
  begin execute 'alter publication supabase_realtime add table public.shared_docs'; exception when duplicate_object then null; when undefined_table then null; end;
  -- shared_doc_members
  begin execute 'alter publication supabase_realtime add table public.shared_doc_members'; exception when duplicate_object then null; when undefined_table then null; end;
  -- shared_causas
  begin execute 'alter publication supabase_realtime add table public.shared_causas'; exception when duplicate_object then null; when undefined_table then null; end;
  -- shared_causa_members
  begin execute 'alter publication supabase_realtime add table public.shared_causa_members'; exception when duplicate_object then null; when undefined_table then null; end;
  -- acervo_connections (Social)
  begin execute 'alter publication supabase_realtime add table public.acervo_connections'; exception when duplicate_object then null; when undefined_table then null; end;
  -- acervo_master (plantilla del estudio: al guardar el admin, el equipo la recibe sin recargar)
  begin execute 'alter publication supabase_realtime add table public.acervo_master'; exception when duplicate_object then null; when undefined_table then null; end;
end $$;

-- Para que los eventos UPDATE/DELETE lleguen completos (no solo la PK):
alter table if exists public.shared_docs          replica identity full;
alter table if exists public.shared_doc_members   replica identity full;
alter table if exists public.shared_causas        replica identity full;
alter table if exists public.shared_causa_members replica identity full;
alter table if exists public.acervo_connections   replica identity full;
alter table if exists public.acervo_master         replica identity full;

-- ── Verificar qué tablas están publicadas para realtime ──
-- select * from pg_publication_tables where pubname = 'supabase_realtime';
