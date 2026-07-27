-- =====================================================================
-- Horario por PAO: el aula es opcional al crear la clase
-- =====================================================================
-- Flujo: 1) se arma el horario de cada PAO (materia → día/hora/docente),
--        2) luego se asignan las aulas (pantalla Horarios room-centric).
-- Para poder crear la clase en el paso 1 sin aula todavía, id_espacio debe
-- admitir NULL.
--
-- Aplicar: supabase db push  (o pegar en SQL Editor). Idempotente.
-- =====================================================================

alter table public.clases
  alter column id_espacio drop not null;
