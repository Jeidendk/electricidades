-- 0044 · Borrador y "cambios solicitados" para los trámites académicos
--
-- EJECUTAR ESTA MIGRACIÓN **ANTES** DE LA 0045 Y ANTES DE DESPLEGAR.
--
-- `solicitudes_admin.estado` es el enum `estado_solicitud_admin` y solo tenía `pendiente`,
-- `aprobado` y `rechazado`. El recorrido real del trámite tiene dos momentos más:
--
--   borrador            · el estudiante lo está escribiendo; todavía no lo ha presentado
--   cambios_solicitados · el coordinador lo devolvió con instrucciones
--
-- NO se agrega un estado "reenviada": el reenvío se distingue por el historial (la solicitud
-- vuelve a `pendiente` con una versión más). Un estado extra para lo mismo obligaría a
-- preguntar por dos valores en cada filtro y se desincronizaría solo.
--
-- QUÉ PASA CON LOS REGISTROS QUE YA EXISTEN
-- Nada se reinterpreta. Las solicitudes actuales siguen en `pendiente`, `aprobado` o
-- `rechazado` y esas etiquetas significan lo mismo que antes. Las dos nuevas solo las escriben
-- las funciones de la 0045, de aquí en adelante.
--
-- NO TOCA `solicitudes_equipo` NI SU ENUM `estado_solicitud`: son otro módulo (préstamos) y
-- comparten nombre de concepto pero no de tipo.
--
-- VA EN SU PROPIO ARCHIVO: `alter type ... add value` y el uso de la etiqueta nueva no pueden
-- compartir transacción. Ejecutar en Supabase → SQL Editor, NO dentro de begin/commit.

alter type public.estado_solicitud_admin add value if not exists 'borrador';
alter type public.estado_solicitud_admin add value if not exists 'cambios_solicitados';


-- ---------------------------------------------------------------------------
-- Comprobación · deben salir las cinco etiquetas.
-- ---------------------------------------------------------------------------
select enumlabel
  from pg_enum
 where enumtypid = 'public.estado_solicitud_admin'::regtype
 order by enumsortorder;
