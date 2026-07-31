# INFORME TÉCNICO — Acervo 1.0 (Early Access)
### Documento para estudio y comprensión del sistema · Fecha de corte 2026-07-29

Este informe describe **cómo está construido y cómo funciona** Acervo, con el detalle
técnico suficiente para estudiarlo, mantenerlo y explicarlo. Se basa exclusivamente en el
código real de la obra.

**Contenido**
1. Visión general y filosofía de diseño
2. Arquitectura y stack
3. Estructura del archivo único (frontend)
4. Modelo de datos (Supabase / PostgreSQL)
5. Almacenamiento de archivos (Storage)
6. Autenticación, roles y permisos
7. Edge Functions (servidor)
8. Sincronización y tiempo real
9. Plantilla del estudio (maestra) y multi-usuario
10. Módulo de redacción (motor de escritos)
11. Redacción masiva
12. Módulo de estudio y Flashcards (algoritmo SRS)
13. Colaboración: "Mi equipo" y compartición
14. PWA / offline
15. Despliegue y versionado
16. Seguridad: resumen y decisiones
17. Glosario técnico

---

## 1. Visión general y filosofía de diseño

Acervo es una **aplicación web de página única (SPA)** que combina un **espacio de trabajo
jurídico** (causas, personas, redacción de escritos) con un **espacio de estudio**
(biblioteca/lector, apuntes, flashcards). Está pensada para un estudio pequeño (~10 usuarios)
con uso por invitación.

**Principios de diseño observables en el código:**
- **Sin framework:** todo el frontend es HTML + CSS + JavaScript "vanilla" en **un solo
  archivo** (`index.html`, ~13.822 líneas). Esto simplifica el despliegue (un archivo estático)
  y evita cadenas de compilación.
- **Sin IA en tiempo de ejecución:** todas las funciones "inteligentes" (detección de datos al
  pegar, detector de tribunales, individualización, importación) son **determinísticas** (reglas
  y expresiones regulares). Ventajas: privacidad (datos sensibles no salen a terceros), costo
  cero por uso, funcionamiento predecible y offline parcial.
- **Backend gestionado (BaaS):** la lógica de datos se apoya en Supabase; el cliente habla
  directo con la base bajo seguridad a nivel de fila (RLS).
- **Estado local sincronizado:** el grueso del estado de cada usuario se guarda como **un
  documento JSON** por usuario, lo que da flexibilidad sin migraciones de esquema constantes.

## 2. Arquitectura y stack

```
Navegador (PWA)  ──HTTPS──►  Cloudflare Pages (sirve index.html estático)
      │
      ├── @supabase/supabase-js  ──►  Supabase
      │        ├── Auth (correo/contraseña)
      │        ├── PostgreSQL + RLS (datos)
      │        ├── Storage (bucket acervo-files)
      │        └── Edge Functions (Deno) [operaciones admin]
      │
      └── Librerías CDN: pdf.js (ver PDF), mammoth (leer .docx), jspdf (crear PDF)
```

- **Frontend:** `index.html` + `sw.js` (Service Worker) + `manifest.webmanifest` + íconos.
- **Backend:** Supabase (Auth + PostgreSQL + Storage + Edge Functions Deno/TypeScript).
- **Hosting:** Cloudflare Pages (estático).
- **Dependencias de terceros (runtime, CDN):** `pdf.js 3.11.174` (Apache-2.0), `mammoth 1.6.0`
  (BSD-2-Clause), `jspdf 2.5.1` (MIT), `@supabase/supabase-js v2` (MIT).

## 3. Estructura del archivo único (frontend)

`index.html` concentra:
- **HTML de las vistas:** contenedores `view-*` (uno por módulo): `inicio`, `estudiodash`,
  `oficinadash`, `expedientes` (causas), `redactar`, `clientes` (personas), `documentos`,
  `apuntes`, `flashcards`, `agenda`, `estante` (lector), `favoritos`, `progreso`, `mapa`,
  `admin`, y auxiliares (`grid`, `lista`, `kanban`).
- **CSS** con variables de tema (paleta navy/gold) y diseño responsive (media queries para
  móvil).
- **JavaScript** organizado por dominios funcionales: estado (`STATE`), persistencia
  (`saveState`/`loadState`), render por vista (`render*`), motor de redacción (`rw*`,
  `generarEscritoTexto`), flashcards (`gradeCard`, `startStudy`…), administración (`renderUsersAdmin`…),
  compartición (`shared*`) y utilidades.

**Estado central:** el objeto `STATE` mantiene en memoria todo lo del usuario (biblioteca,
causas, personas, flashcards, configuración, perfil). Se **serializa a JSON** y se guarda en
la nube (ver §4) con *debounce* (agrupa escrituras para no saturar la red).

## 4. Modelo de datos (Supabase / PostgreSQL)

El modelo mezcla **tablas relacionales** (para compartición y colaboración) con un
**documento JSON por usuario** (para el grueso del estado).

### 4.1 Estado por usuario
- **`acervo_state`** ≈ (`user_id uuid`, `data jsonb`, `updated_at`). Guarda el objeto `STATE`
  completo del usuario (biblioteca, causas, personas, flashcards, mazos, config, etc.). Es el
  corazón del "estado local sincronizado".

### 4.2 Identidad y configuración
- **`profiles`** ≈ (`id uuid`, `email`, `role` [admin|user], `approved` bool, `perms` jsonb,
  `display_name`, `rut`, `firma` jsonb). Rol, aprobación, permisos por módulo, nivel de acceso
  (`perms.access` = full|study) y **firma** (nombre/RUT/domicilio/correo) para colaboración.
- **`acervo_master`** ≈ (`id text`, `data jsonb`): la **plantilla del estudio** que el admin
  publica a todos (tipos de escrito, estructura, comparecencia, individualización, etc.).
- **`acervo_base_books`**: biblioteca base del estudio (libros que el admin comparte a todos en
  solo lectura).

### 4.3 Colaboración y compartición
- **`acervo_connections`** (equipo): relación entre usuarios (`requester_id`, `addressee_id`,
  `status` pending|accepted).
- **`shared_docs`** + **`shared_doc_members`**: documentos/apuntes/paquetes de flashcards
  compartidos (con miembros).
- **`shared_causas`** + **`shared_causa_members`**: causas compartidas.
- **`shared_books`** + **`shared_book_access`**: libros compartidos.

### 4.4 Estado del DDL (importante para estudio)
Los scripts `.sql` del paquete definen: `acervo_base_books`, `shared_docs`+miembros,
`acervo_connections`, las **funciones RLS** (`is_doc_owner`, `is_causa_editor`, etc.), las
políticas de Storage y la configuración de tiempo real. El `CREATE TABLE` de `acervo_state`,
`profiles`, `acervo_master`, `shared_causas`/miembros, `shared_books`/acceso se creó en el
panel de Supabase y **no consta como script** (ver `ESQUEMA_BD_REFERENCIA.md`).

## 5. Almacenamiento de archivos (Storage)

- Bucket **`acervo-files`**. Las rutas siguen una convención de carpetas que las políticas RLS
  usan para autorizar:
  - `<uid>/…` — archivos privados del usuario (política "archivos propios").
  - `causa/<causaId>/…` — archivos de causas (acceso por propietario/miembro/editor de la causa).
  - `doc/<docId>/…` — archivos de documentos compartidos.
  - `base/…` — biblioteca base (lectura para todos, escritura admin).
- La autorización se resuelve con `storage.foldername(name)[n]` + funciones `is_*` que consultan
  las tablas de membresía. Es un patrón elegante: **la ruta del archivo codifica su dueño/contexto**.

## 6. Autenticación, roles y permisos

- **Auth:** Supabase Auth (correo/contraseña). La sesión se guarda en `localStorage` (si el
  usuario marcó "mantener sesión") o `sessionStorage` (se borra al cerrar). Hay recuperación de
  contraseña y pantalla de espera para cuentas no aprobadas.
- **Roles:** `role` = `admin` | `user`.
- **Aprobación:** `approved`; sin aprobación no se ingresa.
- **Nivel de acceso:** `perms.access` = `full` (Trabajo+Estudio) | `study` (solo Estudio). El
  cliente oculta el espacio de Trabajo a los `study` (`accessLevel()`, `spaceAllowed()`).
- **Permisos por módulo:** objeto `perms` con banderas por función.
- **Doble defensa:** el cliente aplica la UI según permisos, y el servidor (RLS + validación de
  admin en Edge Functions) impide el acceso indebido a datos.

## 7. Edge Functions (servidor, Deno/TypeScript)

Operaciones que requieren la clave secreta `service_role` — **que nunca está en el cliente**:
- **`admin-create-user`**: crea el usuario en Auth y su fila en `profiles`.
- **`admin-manage-user`**: `action: 'update'` (cambia correo/contraseña) o `'delete'` (elimina
  la cuenta). Valida que el invocador sea admin.
- **`admin-storage-usage`**: suma el tamaño de todos los archivos del bucket (consulta
  `storage.objects` o recorre el bucket) para el medidor de espacio. Solo admin.

Patrón común de cada función: (1) leer el JWT del invocador, (2) verificar `role='admin'` en
`profiles`, (3) ejecutar la operación con `service_role`, (4) responder JSON. CORS habilitado.

## 8. Sincronización y tiempo real

- **Persistencia:** `saveState()` serializa `STATE` y hace *upsert* en `acervo_state`
  (con *debounce* de ~350 ms). `loadState()` lo recupera al entrar.
- **Tiempo real:** se suscriben canales `postgres_changes` sobre las tablas compartidas
  (`shared_*`, `acervo_connections`, `acervo_master`). Como respaldo hay un **sondeo cada ~30 s**
  con detección de cambios por firma (`_rtSignature()`), para no re-renderizar de más.
- `realtime-setup.sql` marca `replica identity full` y agrega las tablas a la publicación de
  realtime.

## 9. Plantilla del estudio (maestra) y multi-usuario

- El **administrador** define la "forma" de los escritos (tipos, estructura, comparecencia,
  individualización, materias, roles) y la publica en `acervo_master`.
- Al entrar, cada usuario ejecuta `applyMasterToSession()`, que **reemplaza** su set de tipos
  por los que el admin marcó "para todos" (`paraTodos`). Si el admin no marca ninguno, el usuario
  ve solo el tipo "Libre" (corrección de esta sesión).
- El admin trabaja sobre su propio borrador; `initMasterBaseline()` fija una "foto" para que solo
  los cambios reales del admin se propaguen (`syncMaster()` compara firmas).

## 10. Módulo de redacción (motor de escritos)

Es el componente más sofisticado. Convierte datos de una causa + piezas elegidas en un escrito
judicial con formato.

### 10.1 Conceptos
- **Tipo de documento** (`TIPOSDOC`): Escritos, Demandas, Contratos, Extra. Cada uno tiene un
  **motor** (`judicial` | `documental`) y una **estructura** de partes editables.
- **Pieza/modelo** (`MODELOS`): la petición concreta (ej. PYP, "téngase presente"), con su cuerpo,
  "por tanto", variables y roles.
- **Estructura de partes:** `presuma`, `titulo` (suma), `tribunal`, `comparecencia`, `cuerpo`,
  `portanto`, `otrosies`, `pie`. Cada parte es una plantilla con *tokens* `{{...}}`.

### 10.2 Pipeline de generación (`generarEscritoTexto(cx, escs)`)
1. Se ordenan las piezas (la principal = primera que no es otrosí).
2. Se construyen los valores: `buildSuma()` (título/suma), `buildCompareciente()` (según poder/
   mandato/cliente y plantillas `compareceTpl`), `buildCausaStr()` (párrafo de la causa),
   cuerpo y "por tanto" de cada pieza, y los **otrosíes** con su ordinal en letras.
3. Se rellenan las plantillas de cada parte con `fillMarkers()` (sustitución de `{{token}}`) y
   `resolveTokens()` (tokens de personas, con género y pluralización).
4. Se ensambla el texto con marcadores de formato propios: `[[B]]…[[/B]]` (negrita),
   `[[ALIGN:x]]…[[/ALIGN]]`, `[[PRESUMA]]…`. Estos marcadores luego se convierten a HTML/PDF.

### 10.3 Individualización
- `buildIndividualizacion(persona)` arma la individualización completa según plantillas
  editables por tipo (`natural`, `juridica`, `nino`, y **`abogado`** —agregado esta sesión—).
- Cada plantilla usa segmentos separados por `|`; **si un dato viene vacío, ese segmento se omite
  solo**. Soporta variantes por género (`{{domiciliado}}`, `{{don}}`, etc.).

### 10.4 Salida
- El texto con marcadores se convierte a HTML paginado en vivo (editor `contenteditable`) y a
  **PDF con `jspdf`** (`pdfTextoReal`), con membrete/pie por página. El escrito se guarda como
  registro en `EXDOCS` asociado a la causa.

## 11. Redacción masiva (novedad de esta sesión)

Permite generar **el mismo escrito para varias causas** (ej. un PYP idéntico salvo el
encabezado de cada causa).

- **Estado:** `_RW.masivoIds` (lista de causas). Cuando existe, `rwSteps()` **omite** el paso de
  causa única y el de partes.
- **Entradas:** botón "Redactar para varias causas" en el asistente, o selección múltiple en
  Causas → "Redactar (N)".
- **Generación (`rwGenerarMasivo`):** por cada causa se construye su `cx` con
  `cxFromExpediente()`, se heredan las banderas de comparecencia elegidas, se regenera el texto
  con `generarEscritoTexto()` (para que el tribunal/rol/carátula/cliente sean los de esa causa),
  y se crea un `EXDOCS` por causa.
- **Exportación:** un **PDF por causa**, generados en secuencia con pausas (`_masivoPdfAll`) para
  que el navegador no bloquee descargas múltiples. Pantalla de resultados con botón PDF/Abrir por
  causa.
- **Límite conocido:** la edición manual de la hoja no se replica (cada causa se arma con sus
  datos); las piezas con roles personalizados usan las partes guardadas en cada causa (best-effort).

## 12. Módulo de estudio y Flashcards (algoritmo SRS)

- **Repaso espaciado (SRS)** tipo SM-2. Cada tarjeta guarda `ease`, `interval`, `due`, `reps`.
  `gradeCard(grade)` ajusta:
  - `again`: baja `ease`, intervalo 0 (repite hoy).
  - `hard`: intervalo × ~1.2.
  - `good`: intervalo × `ease`.
  - `easy`: intervalo × `ease` × ~1.35 y sube `ease`.
  La nueva fecha `due` = hoy + intervalo.
- **Mazos** (`STATE.mazos`): colecciones tipo *playlist*. Una tarjeta puede estar en **varios**
  mazos (`card.mazos` es una **lista**). Se comparten como "paquetes" (llegan como un mazo listo).
- **"Me la sé"** (`card.known`): saca la tarjeta del repaso; el triaje permite marcar en lote.
- **Gestos móviles:** en la tarjeta, deslizar → siguiente, ← atrás, ↑ buena (`good`), ↓ mala
  (`again`); con instructivo la primera vez (`seenSwipeTip`).
- **Racha** (`STATE.streak`): días seguidos estudiando.

## 13. Colaboración: "Mi equipo" y compartición

- **Mi equipo** = conexiones aceptadas en `acervo_connections`. Cada miembro comparte su **firma**
  (nombre/RUT/domicilio/correo) vía `profiles.firma`, escrita al guardar su perfil (`pushMiFirma`).
- Al **redactar con colaboradores**, la lista sale del equipo (`teamColaboradores()`), con los
  datos ya cargados; los abogados externos (que no usan la app) se cargan aparte a mano.
- **Compartir** documentos/causas/libros/paquetes crea filas en las tablas `shared_*` +
  membresías; el permiso de descarga y las notas se controlan por bandera.

## 14. PWA / offline

- `manifest.webmanifest` declara la app instalable (nombre, íconos, colores).
- `sw.js` (Service Worker) cachea la "cáscara" (`index.html`, manifest, íconos) con nombre de
  caché `acervo-vN`. Estrategia: **navegación = red primero** (cae a caché si no hay red);
  recursos = caché primero. Las llamadas a Supabase **nunca** se cachean (datos siempre frescos).
- Al desplegar una versión nueva se **incrementa `acervo-vN`** para invalidar la caché anterior.

## 15. Despliegue y versionado

- **Frontend:** editar el archivo de desarrollo → validar la sintaxis JS → copiar a la carpeta de
  despliegue como `index.html` → subir el número de caché en `sw.js` → publicar en Cloudflare Pages.
- **Versión de corte para el DDI:** commit Git `2007eee8…`, etiqueta
  `acervo-v1.0-early-access-2026-07-29`; paquete con SHA-256
  `5e5ac6e5…eb9b9f`. La app desplegada corresponde a `acervo-v354`.

## 16. Seguridad: resumen y decisiones

- **`service_role` solo en el servidor** (Edge Functions), jamás en el cliente. Verificado.
- En el cliente solo está la **clave publicable** (`sb_publishable_...`), **pública por diseño**;
  la seguridad real la dan **RLS** + validación de admin en las funciones.
- **RLS** en las tablas compartidas y **políticas por carpeta** en Storage.
- **Aviso de confidencialidad** de aceptación obligatoria (etapa Early Access).
- **Sin IA en runtime** → los datos sensibles (causas, Clave Única) no se envían a terceros.

## 17. Glosario técnico
- **SPA / PWA:** aplicación de página única / app web instalable con soporte offline.
- **BaaS:** Backend as a Service (Supabase).
- **RLS:** Row Level Security — reglas de acceso por fila en PostgreSQL.
- **Edge Function:** función de servidor (Deno) desplegada en el borde.
- **JSONB:** tipo JSON binario de PostgreSQL (permite guardar documentos flexibles).
- **SRS (SM-2):** repetición espaciada; algoritmo de programación de repasos.
- **Debounce:** agrupar eventos rápidos en una sola acción diferida.
- **Marcadores `[[B]]`…:** convención propia para formato en el texto de los escritos, luego
  convertida a HTML/PDF.

---

*Informe elaborado a partir del código de la obra en la fecha de corte. Para el detalle de
archivos, dependencias y esquema, ver el expediente en `Desktop/legal/ddi-acervo-v1.0/`.*
