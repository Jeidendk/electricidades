-- =====================================================================
-- Vista pública de docentes (solo id + nombre)
-- =====================================================================
-- La RLS de public.usuarios solo deja a cada usuario ver SU propia fila,
-- así que el estudiante no puede leer el nombre del docente de sus clases.
-- Esta vista expone ÚNICAMENTE id y nombre (no email/teléfono) y corre con
-- los privilegios del owner (security_invoker desactivado) → evita la RLS de
-- usuarios sin exponer datos sensibles.
--
-- Aplicar: supabase db push  (o pegar en SQL Editor). Idempotente.
-- =====================================================================

create or replace view public.docentes
  with (security_invoker = false)
  as select id, nombre from public.usuarios;

grant select on public.docentes to anon, authenticated;
