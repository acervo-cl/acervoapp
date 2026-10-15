-- ACERVO · Private calendar feed tokens
-- Run manually in Supabase SQL Editor after review. This file is intentionally
-- not executed by the application or by the development test container.

create extension if not exists pgcrypto;

create table if not exists public.calendar_feed_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  last_used_at timestamptz
);

create index if not exists calendar_feed_tokens_user_idx
  on public.calendar_feed_tokens (user_id, created_at desc);

alter table public.calendar_feed_tokens enable row level security;

drop policy if exists "calendar_feed_tokens_select_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_select_own"
  on public.calendar_feed_tokens
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "calendar_feed_tokens_insert_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_insert_own"
  on public.calendar_feed_tokens
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "calendar_feed_tokens_update_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_update_own"
  on public.calendar_feed_tokens
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The client revokes a link by setting revoked_at. Physical deletion is not
-- required and keeping the row makes revocation auditable.
