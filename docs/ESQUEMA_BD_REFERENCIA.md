# ESQUEMA_BD_REFERENCIA.md — DDL/RLS de referencia documental

> **Naturaleza de este documento.** Es una **referencia documental reconstruida a partir de
> los scripts `.sql` incluidos en el paquete de código fuente** y del uso observado en la
> aplicación. **NO** es un volcado en vivo del servidor: no se accedió a Supabase ni a datos
> de producción (no se dispone de credenciales y las reglas del encargo lo prohíben). Para el
> conjunto completo y autoritativo debe **exportarse el esquema desde el panel de Supabase**
> (ítem marcado como PENDIENTE más abajo).

## A) Objetos CON definición en el repositorio (incluidos en el paquete)
Estos objetos tienen su DDL/RLS **verificable** en los archivos `supabase/sql/*.sql` del
paquete `acervo-v1.0-early-access-source.zip`:

| Objeto | Tipo | Archivo fuente (en el paquete) | RLS |
|---|---|---|---|
| `public.profiles` (columnas `display_name`, `rut`) | `ALTER TABLE ADD COLUMN` | `acervo-setup.sql` | (tabla base gestionada por Auth) |
| `public.acervo_base_books` | `CREATE TABLE` + políticas | `acervo-setup.sql`, `biblioteca-base.sql` | Sí (lectura autenticados / escritura admin) |
| `public.shared_docs` | `CREATE TABLE` + políticas | `acervo-sql-libros-compartidos.sql` | Sí |
| `public.shared_doc_members` | `CREATE TABLE` + políticas | `acervo-sql-libros-compartidos.sql` | Sí |
| Funciones `is_doc_owner`, `is_doc_member` | `CREATE FUNCTION` | `acervo-sql-libros-compartidos.sql` | — |
| `public.shared_causas` | Políticas RLS (ver nota B) | `acervo-sql-pendiente.sql` | Sí |
| `public.shared_causa_members` | Políticas RLS (ver nota B) | `acervo-sql-pendiente.sql` | Sí |
| Funciones `is_causa_owner`, `is_causa_member`, `is_causa_editor` | `CREATE FUNCTION` | `acervo-sql-pendiente.sql` | — |
| `public.acervo_connections` | `CREATE TABLE` + políticas | `social-setup.sql` | Sí |
| Bucket `acervo-files` + políticas de `storage.objects` | `INSERT bucket` + políticas | `acervo-sql-pendiente.sql`, `acervo-setup.sql`, `acervo-sql-libros-compartidos.sql` | Sí (por carpeta: `<uid>/`, `causa/`, `doc/`, `base/`) |
| Configuración de tiempo real (`replica identity full`, publicación) | `ALTER TABLE` / `ALTER PUBLICATION` | `realtime-setup.sql` | — |

> **Función `is_admin()`**: es referenciada por políticas de `acervo-files` (carpeta `base`).
> Verificar que su `CREATE FUNCTION` esté presente/desplegado. **PENDIENTE DE VALIDACIÓN.**

## B) Objetos REFERENCIADOS por la aplicación SIN DDL en el repositorio
Estas tablas/columnas **son usadas por el código** (`.from('...')`) pero **su `CREATE TABLE`
no consta** en los `.sql` del repositorio (se crearon directamente en el panel de Supabase).
**Deben exportarse desde el panel** para completar el expediente:

| Objeto referenciado | Uso observado en el código | Estado |
|---|---|---|
| `public.acervo_state` | Estado por usuario (JSONB): biblioteca, causas, personas, flashcards, config | **DDL NO EN REPO — exportar del panel** |
| `public.acervo_master` | Plantilla del estudio (JSONB); solo `replica identity` consta | **DDL NO EN REPO — exportar del panel** |
| `public.shared_books` | Libros compartidos | **DDL NO EN REPO — exportar del panel** |
| `public.shared_book_access` | Acceso a libros compartidos | **DDL NO EN REPO — exportar del panel** |
| `public.shared_causas` / `shared_causa_members` (CREATE TABLE) | Causas compartidas; en el repo solo constan sus **políticas/funciones**, no el `CREATE TABLE` | **CREATE TABLE NO EN REPO — exportar del panel** |
| `public.profiles` (CREATE completo) | Perfil, rol, `approved`, `perms`, `firma` | **CREATE + columnas `perms`/`firma` NO EN REPO — exportar del panel** |

> **Estructura inferida (solo orientativa, NO autoritativa):** por el uso en el código,
> `acervo_state` ≈ (`user_id uuid`, `data jsonb`, `updated_at timestamptz`);
> `acervo_master` ≈ (`id text`, `data jsonb`, `updated_at`);
> `profiles` ≈ (`id uuid`, `email`, `role`, `approved bool`, `perms jsonb`, `display_name`,
> `rut`, `firma jsonb`). **Esta inferencia debe confirmarse contra el esquema real.**

## C) Procedimiento sugerido para el volcado autoritativo (PENDIENTE, requiere acceso humano)
Con acceso al proyecto (por una persona autorizada), exportar el esquema **sin datos**:
```bash
# Requiere el string de conexión del proyecto (NO incluir en el expediente).
pg_dump --schema-only --no-owner --no-privileges "$SUPABASE_DB_URL" > esquema_supabase.sql
# Para políticas RLS y funciones, --schema-only ya las incluye.
```
> El resultado (`esquema_supabase.sql`) se adjuntaría a `licencias-terceros/`… **no** — se
> adjuntaría junto a este documento como respaldo. **No** debe contener datos ni credenciales.
> **PENDIENTE DE VALIDACIÓN HUMANA.**

## D) Aislamiento y seguridad (resumen verificable)
- **RLS activo** en las tablas con DDL en el repo; aislamiento por `user_id` y por membresía
  (`shared_*`).
- **Storage** segmentado por carpetas con políticas por rol/propietario/miembro.
- La seguridad **no depende** de ocultar la clave publicable del cliente, sino de RLS +
  validación de admin en las Edge Functions.
