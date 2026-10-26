# Historial de cambios — Cumplimiento y seguridad

**Proyecto:** Aplicación de la Facultad de Informática y Electrónica — ESPOCH
**Propósito:** registrar cambios de [PLAN_CUMPLIMIENTO_DATOS_Y_SEGURIDAD.md](./PLAN_CUMPLIMIENTO_DATOS_Y_SEGURIDAD.md).
**Regla:** añadir entradas nuevas al inicio de “Entradas”, conservar las anteriores y no cerrar un bloque sin evidencia.

## Formato para cada cambio

Cada Codex debe avisar en el chat antes de iniciar un bloque y al terminar cada cambio. Añadir una entrada con este formato:

### AAAA-MM-DD — Bloque N — Título breve

- **Responsable/Codex:** nombre de tarea o identificador disponible.
- **Aviso previo:** qué se informó que se cambiaría.
- **Cambio realizado:** descripción concreta.
- **Archivos/migraciones:** rutas relativas; aclarar si la migración solo se creó o también se aplicó.
- **Comprobaciones:** pruebas/revisión y resultado.
- **Pendientes/riesgos:** validación pendiente de DPD, Jurídico, DTIC o producción.
- **Estado:** `completo`, `parcial`, `pendiente de validación` o `revertido`.

---

## Entradas

### 2026-10-26 — Dashboard de autoridades — Ajuste a una pantalla de escritorio

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** el usuario indicó que la distribución asimétrica sobrepasaba el alto visible. Se explicó que se conservaría el scroll solo en tamaños pequeños y se autorizó ajustar el alto de escritorio.
- **Cambio realizado:** el contenido usa el alto restante real del módulo (`min-h-0`), mantiene los KPIs compactos y distribuye las dos filas analíticas con proporciones flexibles. En escritorio se evita el desplazamiento vertical y los gráficos reducen su altura dentro de cada panel; tablet y móvil conservan scroll para no superponer contenido.
- **Archivos/migraciones:** `src/modules/autoridad/pages/AutoridadDashboard.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, cálculos, roles, permisos, RLS ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta validación visual autenticada en 1366×768, 1600×900 y resolución móvil.
- **Estado:** `parcial`; corrección y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-26 — Dashboard de autoridades — Distribución asimétrica a pantalla completa

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se explicó que la cuadrícula 2×2 uniforme dejaba espacio inferior y hacía que todos los paneles se vieran demasiado rectos. El usuario autorizó ampliar gráficos y aprovechar el alto disponible.
- **Cambio realizado:** el área analítica usa una cuadrícula asimétrica de doce columnas. La tendencia semanal ocupa ocho columnas y crece verticalmente; el gráfico circular ocupa cuatro columnas y aumentó de tamaño; ocupación y top 5 se distribuyen en cinco y siete columnas. El conjunto se expande para cubrir el alto disponible y mantiene apilamiento responsive.
- **Archivos/migraciones:** `src/modules/autoridad/pages/AutoridadDashboard.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de cálculos, roles, datos, permisos, RLS ni Supabase.
- **Comprobaciones:** pendiente de registrar `npm run build`.
- **Pendientes/riesgos:** falta validación visual autenticada en resoluciones de escritorio, portátil y móvil.
- **Estado:** `parcial`; implementación terminada, compilación y validación visual pendientes.

### 2026-10-25 — Dashboard técnico — Reorganización analítica con paleta ESPOCH

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se revisaron las métricas y cargas existentes antes de modificar. El usuario autorizó adaptar el dashboard al diseño de referencia, sustituyendo los datos financieros del ejemplo por recursos y mantenimiento reales.
- **Cambio realizado:** el dashboard técnico presenta actividad real de los últimos siete días, distribución de órdenes por estado, cuatro tarjetas de resumen con la paleta institucional, alertas recientes y una tabla compacta de órdenes. Se conserva el acceso a Mantenimiento y Asignaciones y el filtrado exclusivo por el técnico autenticado.
- **Archivos/migraciones:** `src/modules/tecnico/pages/TecnicoDashboard.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin migraciones, cambios de permisos, escrituras de datos, cambios RLS ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta validación autenticada con técnicos con y sin órdenes, recursos y alertas, además de revisión responsive.
- **Estado:** `parcial`; implementación y compilación terminadas, validación autenticada pendiente.

### 2026-10-25 — Dashboard de autoridades — Reconocimiento de siglas de facultad

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se diagnosticó en lectura que Usuarios guarda `facultad_nombre` con la sigla disponible (por ejemplo, `FIE`), mientras el dashboard comparaba solo con el nombre completo. El usuario autorizó corregir únicamente esa identificación.
- **Cambio realizado:** el dashboard de Decano y Subdecano reconoce ahora la facultad asignada tanto por nombre completo como por siglas, con comparación normalizada para mayúsculas y tildes. Se conserva el filtrado estricto al ámbito asignado.
- **Archivos/migraciones:** `src/modules/autoridad/pages/AutoridadDashboard.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin migraciones, cambios de usuarios, escrituras de datos, cambios RLS ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta volver a iniciar o refrescar la sesión de Decano/Subdecano y validar visualmente los indicadores con la facultad `FIE`.
- **Estado:** `parcial`; corrección y compilación terminadas, validación autenticada pendiente.

### 2026-10-25 — Dashboard de autoridades — Indicadores académicos por ámbito

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se revisaron dependencias y alcance antes de editar. El usuario aprobó adaptar el diseño de referencia con datos reales para Decano, Subdecano y Coordinador, sin cambios de permisos ni base de datos.
- **Cambio realizado:** el dashboard de autoridades presenta cuatro indicadores, tendencia semanal, ocupación por edificios, distribución de espacios y los cinco espacios con mayor carga. Decano y Subdecano se limitan a su facultad; Coordinador se limita a su carrera. Los porcentajes de ocupación se calculan con horas reales frente a la franja semanal de lunes a viernes, 07:00–19:00. Si falta el ámbito asignado, se muestra una advertencia y no se mezclan datos.
- **Archivos/migraciones:** `src/modules/autoridad/pages/AutoridadDashboard.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin migraciones, escrituras de datos, cambios RLS ni Supabase.
- **Comprobaciones:** la primera compilación detectó un import no utilizado y se corrigió. La segunda ejecución de `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta validación autenticada con una cuenta de cada rol y confirmar con la institución si la franja disponible de 07:00–19:00 debe variar por periodo.
- **Estado:** `parcial`; implementación y compilación terminadas, validación autenticada por rol pendiente.

### 2026-10-25 — Reportes — Catálogo a ancho completo y tarjetas uniformes

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se identificó que el catálogo estaba limitado a 1400 px y que las tarjetas disponibles e inactivas tenían alturas diferentes; el usuario autorizó igualarlo con el ancho utilizado por los demás módulos.
- **Cambio realizado:** se retiró el ancho máximo del catálogo para aprovechar todo el espacio disponible con los márgenes existentes. La grilla usa filas uniformes y las seis tarjetas comparten una altura mínima; la acción “Configurar y generar” se alinea al pie de las tarjetas disponibles.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, navegación, permisos, reportes, exportaciones ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta validación visual autenticada en anchos de escritorio, portátil y móvil.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-25 — Reportes — Unificación de la tarjeta de carga docente

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se explicó que Carga docente tenía tres niveles visuales (tarjeta principal, tarjeta intermedia y tabla) y el usuario autorizó retirar únicamente el contenedor intermedio.
- **Cambio realizado:** Carga docente utiliza ahora una sola tarjeta exterior con la franja institucional superior. Dentro quedan directamente su título, métricas, buscador y tabla; las acciones de exportación permanecen en el pie de esa misma tarjeta. Se retiraron el borde, sombra, fondo, relleno y acento duplicados del componente intermedio.
- **Archivos/migraciones:** `src/modules/admin/components/ReporteDocentes.tsx`; `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, tablas, permisos, consultas, selección, paginación, detalle, exportaciones ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta validación visual autenticada en resoluciones de escritorio y portátil.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-25 — Reportes — Eliminación de encabezados externos duplicados

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** tras revisar la captura, se identificó que Carga docente e Historial ya poseen encabezados dentro de sus propias tarjetas; el usuario pidió eliminar la franja superior repetida y conservar solo la tarjeta funcional.
- **Cambio realizado:** se retiró el encabezado externo de Carga docente e Historial. Carga docente conserva exclusivamente el encabezado integrado con sus métricas, buscador y tabla; Historial conserva su encabezado integrado y listado. Horarios mantiene su encabezado porque no tiene un segundo título interno equivalente.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, tablas, permisos, selección, filtros, exportaciones ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta validación visual autenticada de las dos secciones corregidas.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-25 — Reportes — Encabezados directos en carga docente e historial

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** el usuario autorizó aplicar a Carga docente e Historial el mismo encabezado directo de Horarios, eliminando el elemento visual de vista sin modificar sus funciones.
- **Cambio realizado:** Carga docente e Historial de reportes ya no muestran el ícono del ojo ni un tratamiento de vista previa. Los tres tipos de reporte comparten ahora un encabezado limpio con la línea superior de la paleta institucional, título y descripción funcional.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, tablas, selección, filtros, exportaciones ni Supabase.
- **Comprobaciones:** pendiente de registrar `npm run build`.
- **Pendientes/riesgos:** falta validación visual autenticada de Carga docente e Historial.
- **Estado:** `parcial`; implementación terminada, compilación y validación visual pendientes.

### 2026-10-25 — Reportes — Tarjeta compacta de horarios por aula

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** el usuario aprobó recuperar la tarjeta sencilla anterior, sin usar los términos “Vista”, “Vista previa” ni “Visual”, conservando únicamente el resumen y las aulas agrupadas por edificio.
- **Cambio realizado:** la sección de Horarios quedó como una tarjeta directa titulada “Horarios por aula”, con dos contadores (edificios incluidos y aulas con clases) y una sección compacta por edificio. Las aulas se presentan como etiquetas consecutivas; se retiraron las fichas detalladas, el ícono de vista, capacidad, piso, estado y equipamiento de esta presentación.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, permisos, exportaciones ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta validación visual autenticada con uno y varios edificios.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-25 — Reportes — Sustitución del visor por paneles informativos

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** el usuario descartó el visor documental y pidió volver a información directa de edificios y aulas con un diseño mejorado.
- **Cambio realizado:** se eliminaron la hoja institucional simulada, zoom, pantalla completa, paginación y el concepto “Vista previa”. Horarios muestra indicadores generales y tarjetas agrupadas por edificio con sus aulas/laboratorios; Carga docente mantiene su tabla interactiva e Historial usa un listado directo. Los botones de exportación permanecen en el pie.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite).
- **Pendientes/riesgos:** falta validación visual autenticada con un edificio y con alcance de toda la facultad.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-25 — Reportes — Vista agrupada de edificios y aulas

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se informó que se sustituiría la tabla repetitiva por información agrupada y que solo se usarían datos reales disponibles.
- **Cambio realizado:** la vista previa de Horarios muestra una tarjeta por edificio con dirección, cantidad de espacios, pisos incluidos y capacidad acumulada. Cada aula/laboratorio aparece en una tarjeta con tipo, piso, capacidad, estado y equipamiento cuando existen. No se alteró el generador de horarios.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos ni Supabase.
- **Comprobaciones:** pendiente de registrar `npm run build`.
- **Pendientes/riesgos:** falta validación visual autenticada con un edificio y con toda la facultad. Los datos ausentes se omiten o muestran una etiqueta institucional neutra.
- **Estado:** `parcial`; implementación terminada, compilación y validación visual pendientes.

### 2026-10-25 — Reportes — Eliminación del selector redundante de módulo

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se confirmó que el tipo de reporte ya se elige en el catálogo y que el selector del panel de configuración era redundante.
- **Cambio realizado:** se eliminó “Módulo / Tipo de datos” del detalle. El reporte se cambia regresando al catálogo, y al abrir uno nuevo el formato interno se restablece a PDF para no heredar una exportación anterior.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite). La búsqueda estática confirmó que el detalle ya no contiene el selector de `tipoReporte`.
- **Pendientes/riesgos:** falta validación visual del flujo catálogo → reporte → volver al catálogo.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-25 — Reportes — Restauración de la tabla de carga docente

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se informó que el visor tipo documento se conservaría para Horarios e Historial, mientras Carga docente recuperaría su tabla interactiva.
- **Cambio realizado:** Carga docente vuelve a mostrar búsqueda, selección individual/total, materias, horas, paginación y apertura del horario por fila mediante `ReporteDocentes`. Los controles de zoom y página se ocultan en este módulo porque corresponden al visor documental. Las exportaciones continúan usando la selección activa.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos ni Supabase.
- **Comprobaciones:** la primera compilación detectó que las métricas superiores seguían usando `metricasDocentes`; se restauró ese cálculo compartido. La segunda ejecución de `npm run build` terminó correctamente (`tsc -b` y Vite).
- **Pendientes/riesgos:** falta prueba visual autenticada, búsqueda de un docente, selección y apertura de una fila.
- **Estado:** `parcial`; implementación y compilación terminadas, validación funcional autenticada pendiente.

### 2026-10-25 — Reportes — Configuración más ancha

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se informó que solo se ampliaría la columna de configuración, conservando el comportamiento adaptable.
- **Cambio realizado:** la tarjeta de configuración pasó de 380 px a 440 px en escritorio y 460 px en pantallas grandes; la vista previa ocupa el espacio restante mediante `minmax(0, 1fr)`.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite).
- **Pendientes/riesgos:** falta validación visual autenticada. En resoluciones menores se mantiene una sola columna para evitar desbordamiento.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-25 — Reportes — Vista previa tipo visor de documento

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se informó que el cambio sería solo visual: hoja centrada, fondo gris, sombra, controles de ajuste/zoom y menos filas en la miniatura, sin alterar exportaciones.
- **Cambio realizado:** la vista previa ahora presenta una hoja institucional sobre un lienzo gris, con selector de escala, zoom, pantalla completa y barra inferior de navegación. La miniatura limita sus filas para conservar proporción de documento y avisa cuántos registros adicionales aparecerán al exportar.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios en Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite). La revisión confirmó que los límites de 12/10/12 filas solo afectan a la miniatura y que los generadores continúan recibiendo las colecciones completas.
- **Pendientes/riesgos:** falta validación visual autenticada en resolución de escritorio y pantalla pequeña. Los controles de página muestran `1 / 1` porque la vista es un resumen, no una réplica paginada del archivo final.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-25 — Reportes — Eliminación del selector duplicado de formato

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se informó que se quitarían únicamente las tarjetas PDF/Excel o PDF/Word del panel izquierdo y que se revisaría su dependencia antes de editar.
- **Cambio realizado:** se eliminó el bloque visual “Formato de exportación”. Los botones de la derecha ahora envían el formato explícito al generador, evitando depender de una actualización asíncrona del selector eliminado. PDF, Excel y Word conservan su disponibilidad según el tipo de reporte; las exportaciones de horarios iniciadas desde la derecha también pasan por la bitácora existente.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de base de datos.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite). La revisión estática confirmó que ya no existe el bloque “Formato de exportación” y que los tres botones derechos llaman al generador con un formato explícito.
- **Pendientes/riesgos:** falta comprobación visual autenticada de la pantalla y una descarga de cada formato disponible.
- **Estado:** `parcial`; implementación y compilación terminadas, prueba visual autenticada pendiente.

### 2026-10-25 — Bloque 6 — Aislamiento de iconos SVG en horarios

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se informó que se sustituirían únicamente las dos inserciones de iconos dinámicos en `HorarioVista.tsx`, sin tocar Supabase, horarios ni estructura académica. Se explicó que un icono heredado inválido podría dejar de mostrarse. El usuario autorizó el cambio.
- **Cambio realizado:** los iconos personalizados ya no se insertan mediante `dangerouslySetInnerHTML`. Ahora se muestran con `<img>`; se admiten las imágenes Data URL existentes y los SVG antiguos en texto se analizan para retirar scripts, objetos activos, eventos, estilos y referencias externas antes de convertirlos en una fuente de imagen aislada.
- **Archivos/migraciones:** `src/modules/admin/components/Horarios/HorarioVista.tsx`; `PLAN_CUMPLIMIENTO_DATOS_Y_SEGURIDAD.md`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. No se creó ni ejecutó ninguna migración.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y compilación de Vite). La búsqueda estática confirmó que `HorarioVista.tsx` ya no inserta `customSvg` mediante HTML dinámico. La advertencia de fragmentos grandes de Vite ya existía y no impide la compilación.
- **Pendientes/riesgos:** un valor antiguo que no sea imagen ni SVG válido se oculta deliberadamente. Falta la comprobación visual autenticada de un horario que use icono personalizado.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-25 — Bloque 5 — Preparación conjunta de asignaciones y catálogo de equipos

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** ante la solicitud de avanzar en bloques más amplios, se informó que se agruparían dos tablas de bajo riesgo, manteniendo sus lecturas y permisos legítimos.
- **Cambio realizado:** se preparó una migración transaccional y defensiva que crea lectura autenticada explícita en `asignaciones` y elimina únicamente `allow_all` de `asignaciones` y `catalogo_equipos`. Antes de actuar comprueba RLS, funciones y políticas existentes; cualquier diferencia cancela toda la transacción.
- **Archivos/migraciones:** `supabase/migrations/0057_restringir_asignaciones_y_catalogo.sql` — creada, **no ejecutada**; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`.
- **Comprobaciones:** revisión estática: no contiene operaciones sobre filas ni altera tablas; conserva `asignaciones_staff`, `catalogo_equipos_read` y `catalogo_equipos_admin_write`. Incluye consulta posterior y reversión de emergencia comentada.
- **Pendientes/riesgos:** requiere autorización y ejecución manual en Supabase. Después deben probarse mapa/consulta de asignaciones con Estudiante, gestión de asignaciones con Técnico y gestión del catálogo con Administrador. `formatos`, `recursos` y `ordenes_mantenimiento` se mantienen sin cambios porque sus flujos requieren una revisión adicional.
- **Estado:** `pendiente de validación`; archivo preparado, base de datos intacta.

### 2026-10-25 — Bloque 4 — Aplicación y verificación inicial del inventario

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se explicó que `allow_all` permite escritura de inventario a cualquier cuenta autenticada y que se conservarían lectura general y escritura de Administrador/Técnico. El usuario autorizó preparar la migración sin ejecutarla.
- **Cambio realizado:** se creó una migración defensiva que comprueba RLS, `is_staff()`, `inventario_read` e `inventario_write` antes de eliminar únicamente `allow_all` de `public.inventario`. El usuario informó que la ejecutó en Supabase. Incluye verificación, pruebas funcionales y reversión comentada.
- **Archivos/migraciones:** `supabase/migrations/0056_restringir_escritura_inventario.sql` — creada y aplicada manualmente por el usuario en Supabase; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`.
- **Comprobaciones:** consulta posterior: `allow_all` ya no aparece; permanecen `inventario_read` (`SELECT`, `true`) e `inventario_write` (`ALL`, `is_staff()` en `USING` y `WITH CHECK`). No se modificaron filas, imágenes, préstamos, asignaciones ni estados.
- **Pendientes/riesgos:** falta comprobar el catálogo desde Estudiante y la pantalla Inventario desde Técnico/Administrador. Una prueba de escritura debe usar un registro controlado y autorización específica, sin alterar equipos reales.
- **Estado:** `parcial`; políticas verificadas en la base, pruebas funcionales pendientes.

### 2026-10-25 — Bloque 3 — Aplicación y verificación inicial de horarios individuales

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se explicó que `allow_all` permite acceso total a inscripciones ajenas y que se conservarían las políticas existentes de propietario/staff. El usuario autorizó preparar la migración sin ejecutarla.
- **Cambio realizado:** se creó una migración defensiva que comprueba RLS, `is_staff()`, `horario_owner_read` y `horario_owner_write` antes de eliminar únicamente `allow_all` de `public.horario_estudiante`. El usuario informó que la ejecutó en Supabase. Incluye verificación, pruebas funcionales y reversión comentada.
- **Archivos/migraciones:** `supabase/migrations/0055_restringir_horario_estudiante.sql` — creada y aplicada manualmente por el usuario en Supabase; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`.
- **Comprobaciones:** consulta posterior: `allow_all` ya no aparece; permanecen `horario_owner_read` para SELECT y `horario_owner_write` para ALL, ambas con condición `id_usuario = auth.uid() OR is_staff()` y `WITH CHECK` equivalente en escritura. El SQL no modificó datos ni redefinió las políticas conservadas.
- **Pendientes/riesgos:** el usuario confirmó que el horario de Estudiante continúa funcionando. Faltan pruebas controladas de acceso de Administrador/Técnico y rechazo de lectura ajena; no se deben usar datos reales de otra persona como ensayo.
- **Estado:** `parcial`; políticas y flujo estudiantil verificados, pruebas administrativas controladas pendientes.

### 2026-10-25 — Bloque 2 — Aplicación y verificación inicial de la escritura de imágenes

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se explicó que se conservaría la lectura pública de imágenes y se reemplazarían únicamente las políticas públicas de INSERT, UPDATE y DELETE. El usuario autorizó preparar la migración sin ejecutarla.
- **Cambio realizado:** se creó una migración defensiva que exige la política pública de lectura y las tres políticas públicas de escritura esperadas antes de actuar. El usuario informó que la ejecutó en Supabase. Elimina las escrituras con rol `public` y crea permisos para avatar propio y para Administrador/Técnico en `avatares`, `inventario`, `edificios` y `espacios`.
- **Archivos/migraciones:** `supabase/migrations/0054_restringir_escritura_imagenes.sql` — creada y aplicada manualmente por el usuario en Supabase; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`.
- **Comprobaciones:** consulta posterior: permanece `POLITICAS 1ktc4f5_0` como SELECT público; las políticas públicas `_1`, `_2` y `_3` desaparecieron; existen `imagenes_sube_autorizado`, `imagenes_actualiza_autorizado` e `imagenes_borra_autorizado` para `authenticated`, con condiciones de staff o avatar propio. No se modificaron objetos, configuración del bucket, límites ni tipos MIME.
- **Pendientes/riesgos:** el usuario confirmó que avatares, inventario e infraestructura continúan mostrando sus imágenes. Faltan pruebas controladas de carga por usuario común, Técnico y Administrador. El objeto vacío de `espacios` permanece intacto. Límites de tamaño y tipos MIME quedan para un bloque separado.
- **Estado:** `parcial`; políticas verificadas en la base, pruebas funcionales pendientes.

### 2026-10-25 — Bloque 1 — Aplicación y verificación inicial de la escritura de roles

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se informó que se prepararía una migración reversible para impedir que cuentas no administradoras modifiquen el catálogo de roles, conservando la gestión de docentes del Técnico. El usuario autorizó crearla y pidió registrar el cambio en Markdown.
- **Cambio realizado:** se creó la migración que comprueba primero RLS, `roles_read`, `roles_admin_write` e `is_admin()` y elimina únicamente `allow_all` de `public.roles`. El usuario informó que la ejecutó en Supabase. Incluye consulta de verificación y SQL comentado de reversión de emergencia.
- **Archivos/migraciones:** `supabase/migrations/0053_restringir_escritura_roles.sql` — creada y aplicada manualmente por el usuario en Supabase; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`.
- **Comprobaciones:** revisión estática del código: la aplicación solo consulta `public.roles`; la asignación de roles a usuarios modifica `usuarios.id_rol`. El Técnico gestiona filas de Docente mediante `usuarios_docente_staff_*`. Consulta posterior a la ejecución: `allow_all` ya no aparece y permanecen `roles_read` (`SELECT`, `true`) y `roles_admin_write` (`ALL`, `is_admin()` en `USING` y `WITH CHECK`).
- **Pendientes/riesgos:** la migración se aplicó en la instancia conectada sin un entorno aislado. El usuario confirmó que la comprobación indicada con Técnico quedó lista. Faltan inicio de sesión/lectura con los demás perfiles y acceso completo del Administrador. Las pruebas de escritura requieren una cuenta o registro controlado y autorización específica.
- **Estado:** `parcial`; política verificada en la base, pruebas funcionales pendientes.

### 2026-10-25 — Preparación del plan — Documentación

- **Responsable/Codex:** Codex.
- **Aviso previo:** se indicó que se crearían un plan de trabajo y una bitácora separada.
- **Cambio realizado:** creados el plan por bloques y el formato de historial para los Codex que implementen cambios futuros.
- **Archivos/migraciones:** `PLAN_CUMPLIMIENTO_DATOS_Y_SEGURIDAD.md`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`.
- **Comprobaciones:** archivos creados en la raíz del repositorio.
- **Pendientes/riesgos:** no se modificó la aplicación. Quedan pendientes la validación institucional, la revisión completa de políticas DTIC y la ejecución de los bloques del plan.
- **Estado:** documentación creada; Bloque 0 pendiente.
### 2026-10-26 — Reportes — Ruta integrada en la cabecera

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se informó que se movería el rastro del reporte desde la franja clara hacia la cabecera oscura, sin cambiar filtros, exportaciones ni permisos; el usuario autorizó el cambio.
- **Cambio realizado:** en el detalle de Reportes, la ruta `Reportes > reporte activo` aparece junto al icono dentro del encabezado oscuro. `Reportes` conserva la navegación al catálogo y se eliminó la fila clara duplicada que ocupaba espacio debajo.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, roles, permisos, RLS ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta validación visual autenticada de los tres reportes disponibles.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-26 — Reportes — Descargas directas en PDF y Word

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se explicó que se retiraría Excel y el botón duplicado `Generar y Descargar`, se habilitaría Word real para carga docente y se conservaría Word para horarios; el usuario autorizó el cambio.
- **Cambio realizado:** el pie de Reportes ofrece únicamente `Exportar PDF` y `Exportar Word`. Word usa el color oscuro institucional y genera un DOCX editable para la carga docente o los horarios. El botón adicional del panel de configuración fue eliminado.
- **Archivos/migraciones:** `src/modules/admin/pages/Reportes.tsx`; `src/modules/admin/data/exportarReporteDocentes.ts`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, roles, permisos, RLS ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta abrir un DOCX de carga docente en Word y validar visualmente una selección de uno y varios docentes.
- **Estado:** `parcial`; implementación y compilación terminadas, falta abrir y revisar visualmente el DOCX generado.

### 2026-10-26 — Usuarios — Acciones principales en una sola fila

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se explicó que se impediría el salto de línea entre `Exportar` y `Nuevo registro`, conservando sus acciones y permisos; el usuario autorizó el cambio.
- **Cambio realizado:** el grupo de acciones de Usuarios ya no se comprime en columnas. `Exportar`, `Nuevo registro` y la acción de eliminación múltiple, cuando aparece, permanecen alineados en una misma fila y sus textos no se dividen.
- **Archivos/migraciones:** `src/modules/admin/pages/Usuarios.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, roles, permisos, RLS ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2925 módulos transformados).
- **Pendientes/riesgos:** falta validación visual autenticada en escritorio y pantalla estrecha.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-26 — Dashboard docente — Adaptación visual del panel Técnico

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se detalló la adaptación del diseño del Técnico a información docente y se advirtió que el fallback demostrativo podía mostrar clases ajenas; el usuario autorizó el bloque completo.
- **Cambio realizado:** el dashboard Docente incorpora gráfico de carga semanal, distribución circular por asignatura, cuatro indicadores de color, próximas clases, tabla de asignaturas y accesos docentes. Una cuenta Docente sin coincidencias muestra un estado vacío y ya no recibe todas las clases como contenido demostrativo.
- **Archivos/migraciones:** `src/modules/docente/pages/DocenteDashboard.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, roles, permisos, RLS ni Supabase.
- **Comprobaciones:** compilación pendiente.
- **Pendientes/riesgos:** falta validación visual autenticada con un docente con clases y otro sin asignaciones.
- **Estado:** `parcial`; implementación terminada, compilación y validación visual pendientes.

### 2026-10-26 — Dashboard docente — Ajuste a una pantalla

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se explicó que se retirarían las cuatro tarjetas inferiores y que el panel usaría tres filas ajustadas al alto visible en escritorio, conservando scroll en pantallas pequeñas; el usuario autorizó el cambio.
- **Cambio realizado:** se eliminaron los accesos rápidos duplicados del dashboard. En escritorio, gráficos, indicadores, próximas clases y asignaturas ocupan el alto restante sin desplazamiento general; las listas extensas se contienen dentro de sus propias tarjetas. Tablet y móvil conservan desplazamiento seguro.
- **Archivos/migraciones:** `src/modules/docente/pages/DocenteDashboard.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, roles, permisos, RLS ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2922 módulos transformados).
- **Pendientes/riesgos:** falta validación visual autenticada en 1366×768, 1600×900 y móvil.
- **Estado:** `parcial`; implementación y compilación terminadas, validación visual autenticada pendiente.

### 2026-10-26 — Rol Docente — Retiro de Trámites y Recursos

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se explicó que se retirarían Trámites y Recursos del menú, se bloquearían sus cuatro rutas directas y se dejaría de cargar Recursos en el layout Docente. También se aclaró que este bloque no modifica RLS; el usuario autorizó el cambio.
- **Cambio realizado:** el rol Docente ya no muestra Trámites ni Recursos. Las rutas de solicitudes, préstamos, material académico y formatos redirigen al dashboard, incluso si se abren desde un marcador antiguo. El layout dejó de solicitar recursos al iniciar.
- **Archivos/migraciones:** `src/modules/docente/layout/DocenteSidebar.tsx`; `src/modules/docente/layout/DocenteLayout.tsx`; `src/router/index.tsx`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. Sin cambios de datos, roles, políticas RLS ni Supabase.
- **Comprobaciones:** `npm run build` terminó correctamente (`tsc -b` y Vite, 2922 módulos transformados).
- **Pendientes/riesgos:** las políticas RLS de las tablas relacionadas no se cambiaron; falta validación autenticada de menú y redirecciones.
- **Estado:** `parcial`; implementación y compilación terminadas, validación autenticada y revisión RLS pendientes.

### 2026-10-26 — Despliegue GitHub — Exclusión de Supabase y CLAUDE.md

- **Responsable/Codex:** Codex, tarea actual.
- **Aviso previo:** se confirmó que ambos elementos estaban rastreados y se explicó que retirarlos del índice los elimina del siguiente estado de GitHub, pero no del equipo local. El usuario autorizó la exclusión y el envío de los cambios a GitHub por motivos de seguridad.
- **Cambio realizado:** `/supabase/` y `/CLAUDE.md` se declararon como contenido exclusivamente local. Se retirarán del seguimiento de Git conservando sus archivos físicos, y las futuras modificaciones quedarán fuera de commits y despliegues.
- **Archivos/migraciones:** `.gitignore`; `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md`; `CLAUDE.md`. No se ejecutaron migraciones ni se modificó la base remota.
- **Comprobaciones:** ambos paths siguen presentes localmente, quedaron fuera del índice y las reglas se validaron con `git check-ignore`. `npm run build` terminó correctamente (`tsc -b` y Vite, 2922 módulos transformados). El remoto ya contenía commits que eliminaban esos paths.
- **Pendientes/riesgos:** GitHub dejará de contener el historial de migraciones; la copia local deberá respaldarse de forma segura.
- **Estado:** `parcial`; exclusiones y verificaciones terminadas, publicación del conjunto de cambios pendiente.
