-- 0036 · Público de las categorías personalizadas del repositorio
--
-- Las categorías institucionales conservan `publico = null` y se clasifican por su código.
-- Las creadas desde la interfaz guardan la vista donde nacieron para no aparecer también en
-- Estudiantes, Docentes y Gestión de calidad.

begin;

alter table public.series_formatos
  add column if not exists publico text;

alter table public.series_formatos
  drop constraint if exists series_formatos_publico_valido;

alter table public.series_formatos
  add constraint series_formatos_publico_valido
  check (publico is null or publico in ('estudiantes', 'docentes', 'gestion'));

comment on column public.series_formatos.publico is
  'Vista del repositorio para categorías personalizadas. NULL usa la clasificación institucional por código.';

-- Categoría creada durante la prueba desde Estudiantes antes de existir esta columna.
update public.series_formatos
   set publico = 'estudiantes'
 where codigo is null
   and id_padre is null
   and upper(btrim(nombre)) in ('OFICIO', 'OFICIOS')
   and publico is null;

-- Recupera la última plantilla dinámica creada durante esa misma prueba: el formulario antiguo
-- no enviaba id_serie aunque OFICIO estuviera seleccionado.
with categoria_oficio as (
  select id
    from public.series_formatos
   where publico = 'estudiantes'
     and upper(btrim(nombre)) in ('OFICIO', 'OFICIOS')
   order by created_at desc
   limit 1
), plantilla_prueba as (
  select id
    from public.formatos
   where id_serie is null
     and tipo = 'DINAMICO'
   order by created_at desc
   limit 1
)
update public.formatos formato
   set id_serie = categoria.id
  from categoria_oficio categoria, plantilla_prueba plantilla
 where formato.id = plantilla.id;

commit;

select nombre, publico
  from public.series_formatos
 where codigo is null
 order by nombre;
