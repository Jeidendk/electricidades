-- 0020 · Paralelo por bloque de clase
--
-- Una misma materia puede dictarse en varios paralelos, y la cantidad cambia de semestre a
-- semestre. Por eso el paralelo va en `clases` (cada bloque) y no en `materias`: no se sabe de
-- antemano cuántos habrá, y ponerlo en la materia obligaría a duplicar materias.
--
-- Se numeran 1, 2, 3, 4… (no con letras). Nullable a propósito: las clases ya cargadas no
-- tienen paralelo asignado y no hay forma de adivinarlo. Donde falta, la interfaz simplemente
-- no lo muestra en vez de inventar un "1".
--
-- Ejecutar en Supabase → SQL Editor.

alter table public.clases
  add column if not exists paralelo smallint;

alter table public.clases
  drop constraint if exists clases_paralelo_positivo;

-- Sin tope superior: la cantidad de paralelos varía cada periodo.
alter table public.clases
  add constraint clases_paralelo_positivo
  check (paralelo is null or paralelo >= 1);

comment on column public.clases.paralelo is
  'Paralelo del bloque, numerado desde 1. NULL = clase antigua sin paralelo asignado.';

-- Verificación.
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'clases' and column_name = 'paralelo';
