# CLAUDE.md — Memoria del proyecto (leer PRIMERO)

> Este archivo lo carga Claude Code automáticamente al iniciar. Es la memoria del proyecto:
> qué es, cómo se trabaja y qué se ha hecho. **Actualízalo cada vez que hagas cambios**
> (agrega una línea en el "Registro de cambios" al final).

## Qué es
Sistema de gestión académica **ESPOCH – Electricidad**: aulas, recursos, inventario,
infraestructura (edificios/espacios), estructura académica (facultades/carreras/materias),
horarios semestrales, usuarios y docentes. Interfaces por rol: **admin**, **técnico**,
**estudiante**, y **docente** (registro sin cuenta de acceso).

## Stack
- React 19 + TypeScript + **Vite 6** + **Tailwind v4** (`@theme` en `src/index.css`).
- **Supabase** (Auth + Postgres + Storage bucket `imagenes`). Cliente en `src/lib/supabase.ts`.
- **Zustand** (stores en `src/store/*`). Router en `src/router/index.tsx` (guard `RequireAuth` por rol).
- SweetAlert2 para diálogos. Recharts (Dashboard). Leaflet/react-leaflet (mapas). jsPDF/exceljs (export).
- Íconos: `lucide-react`.

## Repo / Deploy
- GitHub: `https://github.com/Jeidendk/electricidades` (rama `main`).
- Vercel autodespliega `main` → **electricidades-beta.vercel.app** (producción del equipo).
- Build: `npm run build` (= `tsc -b && vite build`). **Vercel usa devDependencies-en-dependencies**:
  el tooling de build (typescript, vite, plugins) está en `dependencies` a propósito (no mover).
- Env vars (Vercel + `.env` local): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_SITE_URL` (URL pública para enlaces de correo; sin esto usa `window.location.origin`).
- `.env` NO se sube (gitignore). `.claude/` tampoco.

## Reglas de trabajo (IMPORTANTES)
1. **Migraciones NO se aplican solas.** Están en `supabase/migrations/*.sql`. El usuario las corre
   manualmente en **Supabase → SQL Editor**. Si creas una, dile explícitamente que la ejecute.
2. **Assets deben agregarse a git** (`git add`). Un import a un archivo untracked (p.ej. `.webp`)
   compila local (Windows, case-insensitive) pero **rompe el build en Vercel** (`Could not resolve`).
3. Flujo típico: editar → `npm run build` (validar) → `git add` → commit → `git push` (autodeploy).
   A veces el usuario pide **NO** subir ("no deployes") para revisar local primero — respétalo.
4. Los errores/screenshots suelen ser de **caché o deploy viejo** — pedir recarga fuerte (Ctrl+Shift+R).
5. No se puede iniciar sesión desde este entorno (Supabase real, crear cuentas prohibido) → las
   pantallas admin/técnico no se pueden previsualizar; validar con `npm run build` y que el usuario pruebe.
6. Estilo de respuesta activo: **caveman** (conciso). Código/commits en español normal.

## Modelo de datos / RLS (clave)
- `usuarios` (perfil): `id`(=auth.uid), `nombre, email, id_rol, estado, departamento,
  codigo_institucional, facultad_nombre, carrera_nombre, pao`(int), `avatar_url, ultima_conexion`.
  Docentes viven aquí con rol "Docente" **sin fila en auth.users** (migración 0012/0013).
- `roles` (Administrador/Estudiante/Tecnico/Docente), `facultades`(siglas), `carreras`(`semestres` = Nº PAO),
  `materias`, `edificios`, `espacios`(`piso`, `tipo`, `id_edificio`), `clases`(horarios), `inventario`, etc.
- **Trigger clave (migración 0016)**: `on_auth_user_created` en `auth.users` crea/completa la fila en
  `public.usuarios` tomando el ROL y datos desde `raw_user_meta_data` (rol, nombre, pao::int, etc.).
  Elimina cualquier trigger previo en `auth.users` para evitar `duplicate key`.
- **Migración 0017**: RLS para que staff (admin+técnico) gestione filas de rol Docente.
- Errores de BD → `src/lib/notifyError.ts` (`friendlyDbError`): traduce FK/único/etc. a mensajes claros
  (p.ej. FK = "está en uso en {tabla}") en vez de SQL crudo.

## Flujos con detalle
- **Crear usuario (admin, pantalla Usuarios)**: `signInWithOtp(shouldCreateUser)` → correo con enlace de un
  solo uso → `/set-password`. La metadata (rol + académico) se sincroniza a la fila en el primer login
  (`authStore.syncPerfilOnLogin`) + el trigger 0016. Estudiante lleva facultad/carrera/PAO/código;
  técnico lleva facultad/carrera; admin nada académico. Nombre de docente único.
- **Técnicos**: pueden entrar a Usuarios (`/tecnico/usuarios`) SOLO para gestionar **docentes**
  (filtro fijo Docente, sin ver otros roles).
- **Horarios**: filtros por edificio/aula; panel lateral "Ubicaciones" (maestro-detalle Edificio→Piso→Aula,
  overlay sobre la tabla). Search "clase/docente" ignora el filtro de aula para ver dónde dicta un docente.
  Export PDF/Word usa `src/assets/Bandera-ESPOCH-HORARIOS.webp` como encabezado; config de "Generar Formato"
  se recuerda en localStorage.

## Pendiente / notas
- El correo de invitación sale **en inglés** y su enlace puede ir a **localhost**: se arregla en el
  **dashboard de Supabase** (Auth → URL Configuration: Site URL + Redirect URLs; Email Templates a español).
  No es código.
- La sección "Documentos" (sílabo/programa) de materias está **oculta temporalmente** (subida no persistía).
- Favoritos del panel Ubicaciones se quitaron (dependían de localStorage por-navegador).

## Registro de cambios (más reciente arriba)
- **Horarios recuerda la última ubicación abierta.** `filterEdificio`/`filterAula` eran `useState`
  en memoria y un efecto que siempre elegía el primer edificio y la primera aula, así que
  recargar o cambiar de pestaña devolvía al usuario al inicio. Ahora se guardan en
  `uiPrefsStore` (zustand `persist`, mismo patrón que densidad y `lastPath`) y solo se cae a la
  primera si no hay nada guardado o si esa ubicación ya no existe.
- **Migración 0019 (HAY QUE EJECUTARLA, y ANTES de desplegar): tildes en las etiquetas de enum.**
  `RENAME VALUE` sobre `dia_semana` (`Miercoles`→`Miércoles`), `estado_inventario`
  (`danado`→`dañado`), `tipo_espacio` (las 3) y `tipo_solicitud_admin` (`Reporte de daño`,
  `Préstamo especial`). Las filas existentes siguen válidas solas: Postgres guarda un id, no el
  texto. Verificado que ninguna función ni política RLS menciona esas etiquetas. **Orden: SQL
  primero, deploy después** — en medio, guardar falla porque el formulario manda la etiqueta
  vieja (leer sí aguanta, las comparaciones normalizan). No se tocó `categoria_inventario`
  (`tecnologico`): clave interna que nadie ve. De paso desaparece el typo visible "Reporte de
  dano"/"Prestamo especial" que salía en el select de Solicitudes.
- **Fix: no se podía guardar un equipo como "Dañado".** `inventario.estado` es el enum
  `estado_inventario`, cuyas etiquetas son `bueno | malo | danado` (**sin ñ**). La app mandaba
  `'dañado'` con ñ, así que Postgres rechazaba el insert/update. Al leer pasaba lo simétrico:
  el KPI "Dañados", el filtro por estado, el aviso de descripción del daño, los contadores de
  Activos y Asignaciones y las alertas del dashboard técnico comparaban contra `'dañado'` y
  **siempre daban 0**. Ahora `ESTADO_FISICO`/`ETIQUETA_ESTADO_FISICO` en `inventarioData.ts`
  separan el valor de la base del texto en pantalla: se guarda `danado`, se lee "Dañado".
  Sin migración (el enum impidió que se guardaran filas malas).
- **Auditoría de enums contra el código.** `supabase/ESQUEMA.md` ya lista las **19** etiquetas
  reales. Varias van sin tilde ni ñ (`Academica`, `danado`, `Reporte de dano`, `tecnologico`)
  y `estado_solicitud` (`Pendiente`) usa otra grafía que `estado_solicitud_admin` (`pendiente`).
  **Bug encontrado y corregido**: `Asignaciones.tsx:130,132` comparaba `e.tipo === 'Académica'`
  con tilde contra el enum sin tilde → ningún espacio entraba por la rama de aula y **todas las
  aulas se agrupaban como laboratorio, con ícono de microscopio**. Ahora hay un solo helper
  `esAula()` en `espaciosData.ts`, usado también por `Infraestructura.tsx` (que ya cubría las
  dos grafías a mano). **Causa estructural, no resuelta**: `src/lib/database.types.ts` está
  escrito a mano, declara `Enums: Record<string, never>` y tipa TODA columna enum como `string`,
  así que TypeScript no detecta ni uno de estos errores. Regenerarlo con
  `supabase gen types typescript` los convertiría en errores de compilación.
- **Fix: clases de miércoles invisibles y "Aula ocupada" sobre una casilla vacía.** El enum
  `dia_semana` de Postgres usa `Miercoles` **sin tilde**; la UI muestra `Miércoles` con tilde.
  El select traducía bien al guardar, pero la grilla (`HorarioVista.tsx:65`), el PDF, el Word,
  el horario del estudiante y los choques al importar comparaban con `===` contra el valor
  acentuado → la clase no se dibujaba, mientras la validación de choques (que sí usaba el valor
  sin tilde) la encontraba. Mismo origen del 2.º síntoma: el botón «+» de la celda mandaba
  `Miércoles`, ninguna `<option>` tenía ese valor y el navegador caía a **Lunes**.
  Ahora: `mismoDia()` en `src/lib/texto.ts` para **comparar** (nunca `===`) y `diaEnBD()` en
  `horariosData.ts` como único punto de traducción UI→enum. **Sin migración: la base estaba bien,
  el error era del lado JS.** Esquema real volcado en `supabase/ESQUEMA.md` (parcial) — antes de
  tocar una columna `USER-DEFINED`, verificar ahí sus etiquetas en vez de adivinarlas.
- **Responsive de admin, lote 1 (solo clases, sin tocar lógica).** Los modales CRUD tenían
  `grid-cols-2`/`-3` fijos sin breakpoint → ahora `grid-cols-1 md:grid-cols-2`; de `md` en
  adelante se ve idéntico. En Horarios, la barra de la vista previa de exportación era una fila
  rígida (`h-16`, sin `flex-wrap`) dentro de un `overflow-hidden`: los botones PDF/DOCX quedaban
  recortados e inalcanzables en pantallas angostas. Pendiente del resto: `src/components/ui/*`
  no tiene ni un prefijo responsive, 1216 tamaños de fuente en px fijos, y los 2 cambios que sí
  alteran comportamiento (quitar `overflow-x-hidden` de `AdminLayout.tsx:42`, `h-screen`→`h-dvh`).
  **UI muerta detectada, no tocada**: los botones de página anterior/siguiente de esa misma barra
  (`Horarios.tsx:648-650`) no tienen `onClick` y el contador siempre dice "1 / 1".
- **Fix: cambiar la contraseña no desbloqueaba la cuenta.** Tras superar el límite de intentos,
  el usuario recuperaba su contraseña por correo (`/set-password`) pero la fila de
  `intentos_login` seguía con `bloqueado_hasta` a futuro, así que al volver al login
  `consultarBloqueo` (`Login.tsx:108`) lo rechazaba con la contraseña nueva y correcta.
  `SetPassword.tsx` ahora llama a `limpiarIntentos()` **antes** de `signOut()` (la función SQL
  toma el correo del token, así que necesita la sesión del enlace de recuperación). No abre un
  bypass: exige acceso al buzón, el mismo requisito que tomar la cuenta entera.
- **Caché de frescura en los stores** (`src/lib/frescura.ts`, TTL 60 s): layouts y páginas pedían los
  mismos datos en cada montaje (los logs mostraban `inventario`, `espacios` y `recursos` 4 veces en
  11 s). Aplicado a inventario, espacios, recursos, préstamos, mantenimiento, asignaciones, edificios
  y catálogo. **Tras escribir hay que llamar con `{ forzar: true }`** o se lee la copia vieja.
- **Dashboard admin: dos consultas estaban rotas y fallaban en silencio.** `espacios` filtraba por
  `estado='operativo'` (valor de *edificios*; el enum de espacios es disponible/ocupada/mantenimiento
  → 400) y consultaba la tabla `solicitudes`, que no existe (→ 404). Ahora cuenta espacios que no
  están en mantenimiento y suma `solicitudes_admin` (`pendiente`) + `solicitudes_equipo`
  (`Pendiente`). Si una consulta falla se muestra "—", nunca un 0 inventado.
- **Fix de exposición de UI de admin al técnico** en Estructura Académica: `selectFacultad` caía en
  la rama del admin cuando `carreraTecnico` aún no estaba resuelto (carreras sin cargar o nombre con
  tildes distintas), mostrando la vista de facultad con acciones de alta/baja. Ahora la condición
  depende **solo del rol**, la carrera del técnico se cruza con `normalizarTexto`, y la vista de
  facultad y el breadcrumb "volver" no se renderizan para técnico. Recordatorio: ocultar UI no es
  control de acceso — el control real son las políticas RLS de `facultades`/`carreras`/`materias`.
- Banner de carrera: el subtítulo "FIE > 9 PAO" pasó a "{Facultad} · Malla de N PAOs · Dir. X",
  omitiendo las partes que no existan.
- **Bloqueo por intentos fallidos** (migración **0018**, hay que ejecutarla): 3 intentos → bloqueo
  10 min, duplicando en cada bloqueo (10/20/40…) con tope de 24 h. Estado en la tabla
  `intentos_login`, accesible solo por funciones SECURITY DEFINER; `limpiar_intentos_login()` no
  recibe parámetros (toma el correo del token) para que nadie desbloquee cuentas ajenas.
  Cliente en `src/lib/bloqueoLogin.ts`. **Solo cubre el login de la app**: quien llame directo a la
  API de Supabase Auth no pasa por aquí (para eso, rate limits del dashboard o una Edge Function).
- Horario del estudiante: la carrera del perfil se cruza **normalizando** el nombre (sin tildes ni
  mayúsculas) en vez de con igualdad exacta, y el PAO acepta "5" o "5to" (`src/lib/texto.ts`).
  Era la causa probable de que el horario saliera vacío.
- Horario del estudiante: el aula del card es un botón; pide confirmación ("¿Ir a X?") y lleva al
  mapa con `?aula=`.
- **Cambiar contraseña** desde el menú de usuario (admin, técnico y estudiante):
  `src/components/ui/CambiarPasswordModal.tsx`. Pide la contraseña actual y la verifica con
  `signInWithPassword` **solo si la cuenta NO tiene 2FA** (con 2FA la sesión ya es aal2 y
  reautenticar la degradaría a aal1, obligando a repetir el código). Tras el cambio cierra las
  sesiones de otros dispositivos (`signOut({ scope: 'others' })`).
- **Dashboard del técnico enrutado**: `/tecnico/dashboard` renderiza `TecnicoDashboard` (antes
  redirigía a horarios y el componente nunca se montaba). El enlace del sidebar salió del flag
  `MOSTRAR_MODULOS_FUTUROS`. El inicio del técnico (login, `/tecnico`, "Ver como") ahora es el dashboard.
- **Dashboard técnico** rehecho con el lenguaje del admin: banner + gráficos (órdenes por prioridad,
  estado de órdenes), recursos por categoría, estado de equipos, alertas y listados. Métricas en
  `src/modules/tecnico/pages/tecnicoDashboardMetrics.ts` (lógica pura) y **todas calculadas con datos
  reales** de los stores; alertas derivadas (prioridad alta abierta, orden sin cerrar > 7 días, equipo
  dañado/malo a cargo).
- Dashboard admin: banner a todo el ancho vía `PageHero` (título "Bienvenido, {nombre}") con los 4 KPIs
  dentro; se eliminaron la fila de tarjetas KPI y la franja de métricas secundarias (y con ella 3
  consultas a Supabase que ya no se mostraban). `HeroStat` acepta `trend` opcional.
- Sidebar admin: se quitó "Cerrar sesión" (solo hacía `navigate('/login')`, no cerraba sesión real).
  El cierre de sesión vive únicamente en el menú de usuario del topbar.
- Modal de clase: el select de aula se dividió en **Piso + Aula**.
- Horarios: botón **Importar** (.xlsx/.csv) con vista previa y validación fila por fila, y botón
  **Borrar aula** (borra solo el aula filtrada, deshabilitado si no hay aula o tiene 0 clases, con
  confirmación que muestra el conteo). Lógica pura en `importarHorario.ts`; `exceljs` se carga con
  `await import()` para no pesar al abrir la pantalla. Store: `addClases`, `removeClasesByEspacio`.
- Banners: `PageHero` acepta `backgroundImage`; catálogo de fondos temáticos en
  `src/components/ui/heroBackgrounds.ts` (imágenes remotas Unsplash, degradan a fondo sólido).
- Horarios: panel "Ubicaciones" (botón izq del search) maestro-detalle Edificio→Piso→Aula, overlay que no
  desplaza la tabla, chips Edificio/Piso/Aula en vez de selects, search que traza docente/materia en celdas.
- Horarios: al chocar docente muestra edificio+aula donde ya dicta; precarga edificio/aula en Nueva Clase;
  refresca grilla al guardar; recuerda config de export; escudo Bandera en plantillas.
- Fix `useExclusiveModal`: los modales CRUD no abrían (se cerraban solos al cambiar de id al abrir).
- Errores de BD amigables (FK/único). Dashboard alineado a paleta ESPOCH. WebP al subir imágenes.
- Infraestructura: geoloc re-centra mapa, card edificio en una fila, marcador SVG, botones Agregar a la
  derecha, "Mi ubicación" con SweetAlert (Edificio/Espacio/Cancelar).
- Usuarios: filtro de rol como botones, columnas dinámicas por rol, crear por rol, "última conexión" al
  restaurar sesión. Técnicos gestionan docentes (rutas + RLS 0017).
- Login responsive (reloj como chip móvil, entra en una pantalla). PAO dinámico según carrera.
- Migraciones nuevas: 0016 (trigger auth→usuarios con rol), 0017 (RLS técnicos-docentes).
</content>
