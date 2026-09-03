-- 0021 · Título académico y nombre partido en nombres + apellidos
--
-- Tres problemas del formulario de docentes:
--   1. No hay dónde guardar el título (Ing., Lic., Mgs., PhD…), que sí debe salir en el horario.
--   2. Un solo campo "Nombre completo": cada persona lo llenaba en un orden distinto.
--   3. Se llenaba en mayúsculas o minúsculas según quién lo hiciera.
--
-- `nombre` SE CONSERVA como el nombre completo canónico: es lo que leen los horarios, los
-- avatares y la validación de duplicados. `nombres` y `apellidos` son los campos que se
-- capturan; `nombre` se arma a partir de ellos como "NOMBRES APELLIDOS".
--
-- ATENCIÓN: los nombres guardados hoy están al revés ("MAZON MORENO ORLANDO DAVID", es decir
-- APELLIDOS NOMBRES). Esta migración los parte y los REESCRIBE invertidos. Es un cambio de
-- datos: conviene revisar el listado del final apenas termine.
--
-- Ejecutar en Supabase → SQL Editor.

alter table public.usuarios add column if not exists titulo    text;
alter table public.usuarios add column if not exists nombres   text;
alter table public.usuarios add column if not exists apellidos text;

comment on column public.usuarios.titulo is
  'Abreviatura del título académico: Ing., Lic., Mgs., PhD… NULL si no aplica.';
comment on column public.usuarios.nombres is
  'Nombres en mayúsculas. Junto con apellidos compone `nombre`.';
comment on column public.usuarios.apellidos is
  'Apellidos en mayúsculas. Junto con nombres compone `nombre`.';

-- ---------------------------------------------------------------------------
-- Paso 1 · Normalizar SOLO docentes: mayúsculas y espacios colapsados.
-- No se toca a administradores, estudiantes ni técnicos.
-- ---------------------------------------------------------------------------
update public.usuarios u
   set nombre = upper(trim(regexp_replace(u.nombre, '\s+', ' ', 'g')))
  from public.roles r
 where r.id = u.id_rol
   and r.nombre = 'Docente'
   and u.nombre is distinct from upper(trim(regexp_replace(u.nombre, '\s+', ' ', 'g')));

-- ---------------------------------------------------------------------------
-- Paso 2 · Partir e invertir, SOLO cuando el nombre tiene EXACTAMENTE 4 términos.
--
-- Ahí el reparto 2 apellidos + 2 nombres es el caso normal y no hay ambigüedad. Con 3 o 5
-- términos no se puede saber si sobra un apellido o falta un nombre, así que esas filas se
-- dejan intactas y salen listadas al final para corregirlas a mano desde la pantalla Usuarios.
--
-- Se guarda el nombre invertido: "MAZON MORENO ORLANDO DAVID" → "ORLANDO DAVID MAZON MORENO".
-- ---------------------------------------------------------------------------
with candidatos as (
  select u.id, string_to_array(u.nombre, ' ') as terminos
    from public.usuarios u
    join public.roles r on r.id = u.id_rol
   where r.nombre = 'Docente'
     and u.nombres is null
     and u.apellidos is null
     and array_length(string_to_array(u.nombre, ' '), 1) = 4
)
update public.usuarios u
   set apellidos = array_to_string(c.terminos[1:2], ' '),
       nombres   = array_to_string(c.terminos[3:4], ' '),
       nombre    = array_to_string(c.terminos[3:4], ' ') || ' ' || array_to_string(c.terminos[1:2], ' ')
  from candidatos c
 where c.id = u.id;

-- ---------------------------------------------------------------------------
-- REVISAR A MANO: docentes que quedaron sin repartir.
-- Su `nombre` sigue como estaba (probablemente APELLIDOS NOMBRES). Hay que abrirlos en
-- Usuarios y llenar Nombres y Apellidos; al guardar, `nombre` se recompone solo.
-- ---------------------------------------------------------------------------
select u.nombre,
       array_length(string_to_array(u.nombre, ' '), 1) as terminos,
       'Repartir a mano en Usuarios' as accion
  from public.usuarios u
  join public.roles r on r.id = u.id_rol
 where r.nombre = 'Docente'
   and (u.nombres is null or u.apellidos is null)
 order by u.nombre;

-- ---------------------------------------------------------------------------
-- REVISAR A MANO: docentes DUPLICADOS (mismo nombre, ignorando tildes y mayúsculas).
-- Un docente duplicado no da error, pero parte sus clases entre dos fichas y al asignar
-- horario es imposible saber cuál elegir. Si aparece alguno: mover sus clases a una sola
-- ficha desde Horarios y luego borrar la otra en Usuarios.
-- ---------------------------------------------------------------------------
select lower(translate(u.nombre, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) as nombre_normalizado,
       count(*)              as fichas,
       array_agg(u.id)       as ids,
       array_agg(u.nombre)   as tal_como_estan
  from public.usuarios u
  join public.roles r on r.id = u.id_rol
 where r.nombre = 'Docente'
 group by 1
having count(*) > 1
 order by 1;
