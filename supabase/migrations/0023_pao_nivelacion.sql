-- 0023 · Permitir el PAO 0 (nivelación) en las materias
--
-- `materias_semestre_check` exigía `semestre >= 1`, así que guardar una materia de nivelación
-- fallaba. La nivelación se numera 0 para que ordene antes que el PAO 1 sin casos especiales.
-- El tope de 12 se conserva.
--
-- Ejecutar en Supabase → SQL Editor.

alter table public.materias
  drop constraint if exists materias_semestre_check;

alter table public.materias
  add constraint materias_semestre_check
  check (semestre >= 0 and semestre <= 12);

comment on column public.materias.semestre is
  'PAO al que pertenece la materia. 0 = nivelación; 1..12 = periodos de la malla.';

-- Verificación.
select conname, pg_get_constraintdef(oid) as definicion
  from pg_constraint
 where conrelid = 'public.materias'::regclass
   and conname = 'materias_semestre_check';
