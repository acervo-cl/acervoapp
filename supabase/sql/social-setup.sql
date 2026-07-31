-- ═══════════════════════════════════════════════════════════════════
-- ACERVO · Social (colaboradores: solicitud → aceptar)
-- Correr en Supabase → SQL Editor → Run. Idempotente.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.acervo_connections (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users(id) on delete cascade,
  addressee_id  uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'pending',   -- 'pending' | 'accepted'
  created_at    timestamptz default now(),
  unique (requester_id, addressee_id)
);

alter table public.acervo_connections enable row level security;

-- Ver solo las conexiones donde participo
drop policy if exists "conn_select" on public.acervo_connections;
create policy "conn_select" on public.acervo_connections
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Crear solicitud: yo debo ser quien invita
drop policy if exists "conn_insert" on public.acervo_connections;
create policy "conn_insert" on public.acervo_connections
  for insert to authenticated
  with check (auth.uid() = requester_id);

-- Aceptar / actualizar: cualquiera de los dos involucrados
drop policy if exists "conn_update" on public.acervo_connections;
create policy "conn_update" on public.acervo_connections
  for update to authenticated
  using (auth.uid() = addressee_id or auth.uid() = requester_id);

-- Cancelar / eliminar: cualquiera de los dos involucrados
drop policy if exists "conn_delete" on public.acervo_connections;
create policy "conn_delete" on public.acervo_connections
  for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
