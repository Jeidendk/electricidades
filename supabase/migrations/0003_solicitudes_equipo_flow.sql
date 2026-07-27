-- =====================================================================
-- Flujo Solicitud de equipo -> Préstamo
-- =====================================================================
-- 1) Un pedido de equipo del estudiante no requiere obligatoriamente una
--    materia (asignatura). Se hace id_materia opcional para poder crear la
--    solicitud desde el catálogo sin forzar un FK de materias.
-- 2) (RLS de solicitudes_equipo y prestamos ya están en 0001_rls_policies.sql)
--
-- Aplicar: supabase db push  (o pegar en SQL Editor). Idempotente.
-- =====================================================================

alter table public.solicitudes_equipo
  alter column id_materia drop not null;
