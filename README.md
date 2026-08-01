# Acervo — Source code and documentation (for review)

A PWA web application that combines **legal work** (cases, document drafting, people,
deadlines) and **legal study** (library/reader, notes, flashcards). Deployed version:
**acervo-v354**.

> To understand the system in depth, read **`docs/INFORME_TECNICO.md`** first.

## Folder structure
```
acervoapp/
├── README.md                         ← this file
├── Dockerfile                        ← static local runtime with nginx
├── docker-compose.yml                ← local Docker workflow
├── app/                              ← frontend application source
│   ├── index.html                    ← complete app (HTML+CSS+JS in one unminified file, ~13.8k lines)
│   ├── sw.js                         ← Service Worker (PWA / offline)
│   ├── manifest.webmanifest          ← PWA manifest
│   └── icon-180/192/512.png          ← icons
├── supabase/
│   ├── functions/                    ← Edge Functions (Deno/TypeScript, admin operations)
│   │   ├── admin-create-user.ts
│   │   ├── admin-manage-user.ts      ← update (email/password) / delete user
│   │   └── admin-storage-usage.ts    ← storage usage reporting
│   └── sql/                          ← database structure scripts (DDL/RLS)
│       ├── acervo-setup.sql
│       ├── acervo-sql-libros-compartidos.sql
│       ├── acervo-sql-pendiente.sql
│       ├── biblioteca-base.sql
│       ├── realtime-setup.sql
│       └── social-setup.sql
└── docs/
    ├── INFORME_TECNICO.md            ← full technical report (architecture, modules, flows)
    ├── ESQUEMA_BD_REFERENCIA.md      ← schema map: what DDL exists in SQL files and what is still missing
    ├── ENGINEERING_QUALITY_IMPROVEMENT_PLAN.md
    └── PROJECT_SCOPE_MAP.md
```

## Stack
- **Frontend:** HTML5 + CSS3 + vanilla JavaScript, all in a single `index.html`.
- **Backend (BaaS):** Supabase — Auth (email/password), PostgreSQL + RLS, Storage
  (bucket `acervo-files`), Edge Functions (Deno).
- **Hosting:** Cloudflare Pages (static site).
- **Third-party runtime libraries (CDN):** pdf.js 3.11.174 (Apache-2.0), mammoth 1.6.0
  (BSD-2-Clause), jspdf 2.5.1 (MIT), @supabase/supabase-js v2 (MIT). There is no `node_modules`
  directory and no build step; the source is served directly.

## Running locally
- **Inspect the code:** open `app/index.html` in an editor.
- **Recommended local run path (Docker):**
  ```bash
  docker compose up --build
  # open http://localhost:8080
  ```
  This serves the `app/` folder through nginx in a local container.
- **Run minimal automated checks in Docker:**
  ```bash
  docker compose run --rm test
  ```
  This uses a separate Node container and keeps the static app runtime unchanged.
- **Standard test gate before committing changes:**
  ```bash
  docker compose run --rm test npm test
  docker compose run --rm test npm run test:security
  docker compose run --rm test npm run test:all
  ```
  Use `npm test` for the current unit checks, `npm run test:security` for the repository
  smoke checks, and `npm run test:all` as the final combined gate before pushing or opening
  a pull request.
- **If you already have Node locally and want to run the same checks without Docker:**
  ```bash
  npm test
  npm run test:security
  npm run test:all
  ```
- **Fallback local run path (without Docker):**
  ```bash
  cd app && python3 -m http.server 8080
  # open http://localhost:8080
  ```
- The app connects to a real Supabase project using the **publishable key** included in
  `index.html`. For isolated testing, point it to your own Supabase project — see below.
- **Deployment:** publish the `app/` folder to Cloudflare Pages. When updating, increment the
  Service Worker cache name (`const CACHE = 'acervo-vN'` in `sw.js`).

## Backend setup (reference)
1. Create a Supabase project.
2. Run the `.sql` files in `supabase/sql/` (they define sharing tables, RLS functions,
   Storage policies, and realtime configuration). **Note:** part of the schema
   (`acervo_state`, `profiles`, `acervo_master`, `shared_causas`, `shared_books`, `firma` column)
   was created manually in the dashboard and is **not yet** present as versioned SQL — see
   `docs/ESQUEMA_BD_REFERENCIA.md`.
3. Create the `acervo-files` bucket.
4. Deploy the Edge Functions (`supabase functions deploy <name>`). They require
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables.
5. In `app/index.html`, adjust `SUPA_URL` and `SUPA_KEY` (around lines 2567–2568) to your own project.

## Security notes (important for reviewers)
- `index.html` contains `SUPA_URL` and `SUPA_KEY`. **`SUPA_KEY` is the publishable key
  (`sb_publishable_...`), public by design**; it is NOT the `service_role` key. The `service_role`
  key exists **only** on the server side (Edge Functions via environment variables) and is not
  present in this source code.
- Data security relies on **RLS** (PostgreSQL) plus admin validation in Edge Functions.
- The app does **not** use AI at runtime; all behavior is deterministic.

## Known review points (improvement candidates)
- Pin the **exact sub-version** of `@supabase/supabase-js` (currently `@2`).
- Export the **full DDL/RLS schema** from the dashboard so the entire backend is versioned.
- `index.html` is a large monolithic file; modularization should be evaluated as the project evolves.
- Review security notices for third-party library versions before a release.

## What is intentionally not included
Real user/client data, secret credentials, tokens, `.env`, `node_modules`, and personal working
files are not included. This package is **code and documentation only**.
