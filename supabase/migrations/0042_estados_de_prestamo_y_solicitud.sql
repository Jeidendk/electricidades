-- 0042 · Estados que faltaban para separar reserva, entrega y devolución
--
-- EJECUTAR ESTA MIGRACIÓN **ANTES** DE LA 0043 Y ANTES DE DESPLEGAR.
--
-- Hasta hoy aprobar una solicitud creaba el préstamo ya en estado `activo`: el sistema no
-- distinguía "autorizado y reservado" de "entregado en mano". Son dos hechos distintos y con
-- fechas distintas —la fecha de devolución se cuenta desde la entrega, no desde la firma—, así
-- que hacen falta etiquetas propias.
--
--   estado_prestamo   activo, devuelto        → + reservado, cancelado
--   estado_solicitud  Pendiente, Aprobada,    → + Entregada, Cancelada
--                     Rechazada, Devuelto
--
-- QUÉ PASA CON LOS REGISTROS QUE YA EXISTEN
-- Nada se reinterpreta. Las filas de `prestamos` en `activo` se crearon al aprobar y se
-- entregaron (o no) fuera del sistema: siguen significando "préstamo en curso", que es lo que
-- `activo` seguirá significando. `reservado` es un estado nuevo que solo tendrán las
-- aprobaciones hechas a partir de ahora. Ninguna fila cambia de valor en esta migración.
--
-- VA EN SU PROPIO ARCHIVO A PROPÓSITO: `alter type ... add value` y el uso de la etiqueta nueva
-- no pueden compartir transacción, y la 0043 usa estas etiquetas en un índice parcial. Si se
-- ejecutan juntas, Postgres responde «unsafe use of new value of enum type».
-- Ejecutar en Supabase → SQL Editor. NO va dentro de begin/commit.

alter type public.estado_prestamo add value if not exists 'reservado';
alter type public.estado_prestamo add value if not exists 'cancelado';

alter type public.estado_solicitud add value if not exists 'Entregada';
alter type public.estado_solicitud add value if not exists 'Cancelada';


-- ---------------------------------------------------------------------------
-- Comprobación · deben salir 4 etiquetas de préstamo y 6 de solicitud.
-- ---------------------------------------------------------------------------
select t.typname as enum, e.enumlabel as etiqueta
  from pg_enum e
  join pg_type t on t.oid = e.enumtypid
 where t.typname in ('estado_prestamo', 'estado_solicitud')
 order by t.typname, e.enumsortorder;
