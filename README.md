# Acervo — Código fuente y documentación (para revisión)

Aplicación web (PWA) que reúne **trabajo jurídico** (causas, redacción de escritos, personas,
plazos) y **estudio del Derecho** (biblioteca/lector, apuntes, flashcards). Versión desplegada:
**acervo-v354**.

> Para entender el sistema a fondo, lee primero **`docs/INFORME_TECNICO.md`**.

## Estructura de esta carpeta
```
acervoapp/
├── README.md                         ← este archivo
├── app/                              ← el frontend (todo el código de la app)
│   ├── index.html                    ← aplicación completa (HTML+CSS+JS en un archivo, sin minificar, ~13.800 líneas)
│   ├── sw.js                         ← Service Worker (PWA / offline)
│   ├── manifest.webmanifest          ← manifiesto PWA
│   └── icon-180/192/512.png          ← íconos
├── supabase/
│   ├── functions/                    ← Edge Functions (Deno/TypeScript, operaciones admin)
│   │   ├── admin-create-user.ts
│   │   ├── admin-manage-user.ts      ← editar (correo/contraseña) / eliminar usuario
│   │   └── admin-storage-usage.ts    ← medición de almacenamiento
│   └── sql/                          ← scripts de estructura (DDL/RLS) de la base de datos
│       ├── acervo-setup.sql
│       ├── acervo-sql-libros-compartidos.sql
│       ├── acervo-sql-pendiente.sql
│       ├── biblioteca-base.sql
│       ├── realtime-setup.sql
│       └── social-setup.sql
└── docs/
    ├── INFORME_TECNICO.md            ← informe técnico completo (arquitectura, módulos, flujos)
    └── ESQUEMA_BD_REFERENCIA.md      ← mapa del esquema: qué DDL está en los .sql y qué falta exportar
```

## Stack
- **Frontend:** HTML5 + CSS3 + JavaScript "vanilla" (sin framework), en un único `index.html`.
- **Backend (BaaS):** Supabase — Auth (correo/contraseña), PostgreSQL + RLS, Storage
  (bucket `acervo-files`), Edge Functions (Deno).
- **Hosting:** Cloudflare Pages (sitio estático).
- **Librerías de terceros (CDN, runtime):** pdf.js 3.11.174 (Apache-2.0), mammoth 1.6.0
  (BSD-2-Clause), jspdf 2.5.1 (MIT), @supabase/supabase-js v2 (MIT). No hay `node_modules`
  ni build: se sirve el fuente tal cual.

## Cómo correrlo / revisarlo
- **Ver el código:** abrir `app/index.html` en un editor.
- **Ejecutar localmente:** servir la carpeta `app/` con cualquier servidor estático, p. ej.:
  ```bash
  cd app && python3 -m http.server 8080
  # abrir http://localhost:8080
  ```
  (La app se conecta a un proyecto Supabase real vía la **clave publicable** incluida en
  `index.html`. Para pruebas aisladas, apuntar a un proyecto Supabase propio — ver más abajo.)
- **Desplegar:** publicar la carpeta `app/` en Cloudflare Pages. Al actualizar, se incrementa el
  nombre de caché del Service Worker (`const CACHE = 'acervo-vN'` en `sw.js`).

## Backend: puesta en marcha (referencia)
1. Crear proyecto en Supabase.
2. Ejecutar los `.sql` de `supabase/sql/` (definen tablas de compartición, funciones RLS,
   políticas de Storage y realtime). **Nota:** parte del esquema (`acervo_state`, `profiles`,
   `acervo_master`, `shared_causas`, `shared_books`, columna `firma`) se creó por panel y **no**
   está como script — ver `docs/ESQUEMA_BD_REFERENCIA.md`.
3. Crear el bucket `acervo-files`.
4. Desplegar las Edge Functions (`supabase functions deploy <nombre>`). Requieren las variables
   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (las provee Supabase).
5. En `app/index.html`, ajustar `SUPA_URL` y `SUPA_KEY` (líneas ~2567–2568) al proyecto propio.

## Notas de seguridad (importante para el revisor)
- `index.html` contiene `SUPA_URL` y `SUPA_KEY`. **`SUPA_KEY` es la clave *publicable*
  (`sb_publishable_...`), pública por diseño**; NO es la `service_role`. La `service_role` vive
  **solo** en el servidor (Edge Functions, vía variables de entorno) y **no** está en este código.
- La seguridad de datos se apoya en **RLS** (PostgreSQL) + validación de admin en las Edge
  Functions. La app **no usa IA en runtime** (todo es determinístico).

## Puntos conocidos a revisar (candidatos de mejora)
- Fijar la **sub-versión exacta** de `@supabase/supabase-js` (hoy `@2`).
- Exportar el **DDL/RLS completo** desde el panel para tener todo el esquema versionado.
- `index.html` es un archivo grande y monolítico: evaluar modularización si el proyecto crece.
- Revisar avisos de seguridad de las versiones de las librerías de terceros antes de una release.

## Qué NO está incluido (a propósito)
Datos reales de usuarios/clientes, credenciales secretas, tokens, `.env`, `node_modules`, ni la
carpeta de trabajo personal. Este paquete es **solo código + documentación**.
