# Phase 3 Backend Gap Analysis

Date: August 1, 2026
Status: Repo-only audit completed
Scope: Identify what the application expects from Supabase versus what is currently versioned in the repository

## 1. Purpose

This document is the safe starting point for Phase 3.

It is based only on:

- repository SQL files;
- Edge Functions source;
- frontend Supabase usage;
- existing technical documentation already present in the repo.

It does not use live database access and does not assume that production is safe to probe directly.

## 2. Current Conclusion

The repository contains only a partial Supabase reconstruction.

The app clearly depends on production objects whose full DDL is not versioned yet. The largest gap is not policies. The largest gap is missing authoritative `CREATE TABLE` and related schema definition for several core tables already used by the app.

## 3. What Is Clearly Versioned in the Repo

The following objects have meaningful SQL coverage in `supabase/sql/`:

- `public.acervo_base_books`
- `public.shared_docs`
- `public.shared_doc_members`
- `public.acervo_connections`
- functions:
  - `is_doc_owner`
  - `is_doc_member`
  - `is_causa_owner`
  - `is_causa_member`
  - `is_causa_editor`
- storage policies for bucket `acervo-files`
- realtime publication setup for selected tables
- partial `profiles` alterations:
  - `display_name`
  - `rut`

Repo evidence:

- [supabase/sql/acervo-setup.sql](/Users/ignacio/repos/acervo/acervoapp-dev/supabase/sql/acervo-setup.sql)
- [supabase/sql/acervo-sql-libros-compartidos.sql](/Users/ignacio/repos/acervo/acervoapp-dev/supabase/sql/acervo-sql-libros-compartidos.sql)
- [supabase/sql/acervo-sql-pendiente.sql](/Users/ignacio/repos/acervo/acervoapp-dev/supabase/sql/acervo-sql-pendiente.sql)
- [supabase/sql/biblioteca-base.sql](/Users/ignacio/repos/acervo/acervoapp-dev/supabase/sql/biblioteca-base.sql)
- [supabase/sql/realtime-setup.sql](/Users/ignacio/repos/acervo/acervoapp-dev/supabase/sql/realtime-setup.sql)
- [supabase/sql/social-setup.sql](/Users/ignacio/repos/acervo/acervoapp-dev/supabase/sql/social-setup.sql)

## 4. What the App Clearly Uses

From frontend and Edge Function usage, the app depends on these Supabase objects:

### Tables used directly

- `profiles`
- `acervo_state`
- `acervo_master`
- `acervo_base_books`
- `acervo_connections`
- `shared_causas`
- `shared_causa_members`
- `shared_books`
- `shared_book_access`
- `shared_docs`
- `shared_doc_members`

### Storage

- bucket `acervo-files`
- path families:
  - `<uid>/...`
  - `causa/<causaId>/...`
  - `doc/<docId>/...`
  - `base/...`

### Auth-dependent behavior

- `profiles.role`
- `profiles.approved`
- `profiles.perms`
- `profiles.firma`
- `profiles.display_name`
- `profiles.rut`

### Realtime

- `shared_causas`
- `acervo_master`

### Admin server-side capabilities

- create auth users
- update/delete auth users
- inspect bucket usage

Repo evidence:

- [app/js/auth.js](/Users/ignacio/repos/acervo/acervoapp-dev/app/js/auth.js)
- [app/js/state.js](/Users/ignacio/repos/acervo/acervoapp-dev/app/js/state.js)
- [app/js/storage.js](/Users/ignacio/repos/acervo/acervoapp-dev/app/js/storage.js)
- [app/js/realtime.js](/Users/ignacio/repos/acervo/acervoapp-dev/app/js/realtime.js)
- [app/js/admin-users.js](/Users/ignacio/repos/acervo/acervoapp-dev/app/js/admin-users.js)
- [app/js/admin-permissions.js](/Users/ignacio/repos/acervo/acervoapp-dev/app/js/admin-permissions.js)
- [supabase/functions/admin-create-user.ts](/Users/ignacio/repos/acervo/acervoapp-dev/supabase/functions/admin-create-user.ts)
- [supabase/functions/admin-manage-user.ts](/Users/ignacio/repos/acervo/acervoapp-dev/supabase/functions/admin-manage-user.ts)
- [supabase/functions/admin-storage-usage.ts](/Users/ignacio/repos/acervo/acervoapp-dev/supabase/functions/admin-storage-usage.ts)

## 5. Confirmed Gaps

These are the objects that are clearly required by the app but are not fully versioned in the repo.

| Object | Repo state | Risk |
|---|---|---|
| `public.acervo_state` | Referenced by app, no authoritative `CREATE TABLE` found | New environment cannot persist user state correctly |
| `public.acervo_master` | Referenced by app, realtime configured, no authoritative `CREATE TABLE` found | Master drafting config cannot be reconstructed reliably |
| `public.profiles` | Used heavily by auth/admin flows, only partial `ALTER TABLE` found | Roles, approval, perms, and signature schema are not reconstructable |
| `public.shared_causas` | RLS/functions present, authoritative `CREATE TABLE` missing | Shared causes feature depends on dashboard-only schema |
| `public.shared_causa_members` | RLS/functions present, authoritative `CREATE TABLE` missing | Membership model cannot be rebuilt safely |
| `public.shared_books` | Referenced in docs/app architecture, no authoritative DDL found | Shared books feature remains partially undocumented |
| `public.shared_book_access` | Referenced in docs/app architecture, no authoritative DDL found | Access model for shared books is not versioned |
| `public.profiles.firma` | Used in collaboration flows, no explicit migration found | Signature/profile collaboration data may break in new environments |
| `public.profiles.perms` | Used in admin permission flows, no explicit migration found | Permission model is not formally reconstructable |
| helper `is_admin()` | Referenced by storage policy SQL, no authoritative definition found in current repo audit | Base-library admin writes may rely on undeclared function |

## 6. Secondary Gaps

These are not necessarily missing features, but they are versioning or reconstruction risks:

- SQL files are setup-style scripts, not clearly ordered migrations.
- There is no single bootstrap sequence that guarantees a clean environment rebuild.
- Storage bucket creation is described in README, but bucket existence and policy dependency order are not centralized.
- Realtime setup assumes underlying tables already exist.
- Existing docs already admit that part of the production schema was created manually in the dashboard.

## 7. Practical Interpretation

The repo is currently enough to understand the system and run the frontend against the existing Supabase project.

It is not yet enough to recreate the backend with confidence from scratch.

That means the main goal of Phase 3 should be:

- convert dashboard-only schema into versioned SQL;
- normalize execution order;
- document exact environment bootstrap steps;
- reduce hidden production knowledge.

## 8. Recommended Phase 3 Work Order

### Step 1 — Normalize the repo-side schema map

Create one authoritative document that lists:

- every required table;
- every required function;
- every required policy;
- every required bucket/prefix rule;
- every required realtime object;
- whether each item is already versioned or still missing.

This document can be built entirely from the repo and this gap analysis.

### Step 2 — Prepare placeholder migration targets

Before touching production, define the missing migration targets:

- `profiles`
- `acervo_state`
- `acervo_master`
- `shared_causas`
- `shared_causa_members`
- `shared_books`
- `shared_book_access`
- `is_admin()` if it exists in production

Important: do not invent final DDL where production truth matters. Mark each target as “requires production schema export”.

### Step 3 — Human-run read-only verification

Only after the repo map is complete, compare it against the real project using read-only schema inspection run by you.

Recommended rule:

- schema-only inspection only;
- no writes;
- no policy changes;
- no migrations applied directly to production.

### Step 4 — Version the missing schema

Once the authoritative schema is captured:

- create ordered SQL migrations or a clearly ordered bootstrap set;
- keep each migration scoped to one object family;
- annotate dependencies between tables, functions, policies, and realtime setup.

### Step 5 — Add minimal checks

After backend schema is versioned enough:

- add one lightweight verification step for SQL inventory consistency;
- add one small automated test for extracted pure logic on the frontend side.

## 9. Commands I Recommend You Run Later, Only If You Decide To Verify Production

I am not running these. These are read-only commands for you to run manually if and when you want production verification.

### Option A — Full schema-only export

```bash
pg_dump --schema-only --no-owner --no-privileges "$SUPABASE_DB_URL" > esquema_supabase.sql
```

Purpose:

- capture the authoritative schema without data.

### Option B — Targeted read-only inventory with `psql`

List tables:

```bash
psql "$SUPABASE_DB_URL" -c "
select schemaname, tablename
from pg_tables
where schemaname in ('public', 'storage')
order by schemaname, tablename;
"
```

List functions:

```bash
psql "$SUPABASE_DB_URL" -c "
select n.nspname as schema_name, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public')
order by n.nspname, p.proname;
"
```

List policies:

```bash
psql "$SUPABASE_DB_URL" -c "
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
"
```

List bucket rows:

```bash
psql "$SUPABASE_DB_URL" -c "
select id, name, public
from storage.buckets
order by id;
"
```

Describe specific high-risk tables:

```bash
psql "$SUPABASE_DB_URL" -c "
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles',
    'acervo_state',
    'acervo_master',
    'shared_causas',
    'shared_causa_members',
    'shared_books',
    'shared_book_access'
  )
order by table_name, ordinal_position;
"
```

Safety note:

- these are metadata reads only;
- they should still be treated carefully because they target production infrastructure.

## 10. Immediate Next Action

The next safe implementation step is not a production query.

It is to create an authoritative repo-side schema inventory document in English, using current files only, and use that as the checklist before any human-run production verification.
