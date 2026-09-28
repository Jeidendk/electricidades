-- 0033 · Series documentales de formatos, con subseries, y archivos de verdad
--
-- QUÉ RESUELVE
-- La pantalla Formatos es una lista plana: con 28 plantillas no se navega. Y la columna
-- TAMAÑO mostraba un guion fijo, porque `formatos` guardaba definiciones de plantilla
-- (`datos` JSON) pero nunca un archivo.
--
-- POR QUÉ "SERIE" Y NO "CARPETA"
-- La numeración que ya usan -01_PROGRAMAS_ANALITICOS, 02_SILABOS, 03_POA…- es un cuadro de
-- clasificación documental. En ese vocabulario, una **serie** agrupa documentos producidos por
-- la misma función y se divide en **subseries**, que es exactamente el anidamiento que se
-- necesita. "Carpeta" describe el dibujo de la pantalla, no lo que la cosa es.
--
-- DOS ORÍGENES, A PROPÓSITO
--   · tipo = 'DINAMICO' → no hay archivo; `datos` tiene la definición del oficio que genera
--     el Generador. Se sigue editando como hasta ahora.
--   · cualquier otro    → hay un archivo subido al bucket privado `formatos`.
-- Son cosas distintas y la interfaz las distingue: una se edita, la otra se descarga.
--
-- Ejecutar en Supabase → SQL Editor.


-- ---------------------------------------------------------------------------
-- Paso 1 · Las series.
--
-- `on delete restrict` en el padre: borrar una serie que tiene subseries debe fallar, no
-- llevarse el subárbol por delante. Un borrado en cascada aquí significaría perder documentos
-- institucionales por equivocarse de fila en un menú.
-- ---------------------------------------------------------------------------
create table if not exists public.series_formatos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text        not null,
  descripcion text,
  id_padre    uuid        references public.series_formatos(id) on delete restrict,
  orden       smallint    not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint series_formatos_no_es_su_propio_padre check (id <> id_padre)
);

comment on table public.series_formatos is
  'Cuadro de clasificacion de los formatos. Una serie con id_padre es una subserie.';
comment on column public.series_formatos.id_padre is
  'Serie de la que cuelga. NULL = serie de primer nivel.';

-- Dos series hermanas que solo se diferencian en mayusculas o en un espacio son la misma para
-- quien las lee, y tenerlas duplicadas reparte los documentos entre las dos. Se comparan dentro
-- del mismo padre: `02_SILABOS` puede existir bajo dos series distintas sin conflicto.
create unique index if not exists series_formatos_nombre_unico_por_padre
  on public.series_formatos (coalesce(id_padre, '00000000-0000-0000-0000-000000000000'::uuid),
                             lower(btrim(nombre)));

drop trigger if exists set_updated_at on public.series_formatos;
create trigger set_updated_at
  before update on public.series_formatos
  for each row execute function public.fn_set_updated_at();


-- ---------------------------------------------------------------------------
-- Paso 2 · Que ninguna serie sea su propia antecesora.
--
-- El CHECK de arriba solo impide que una serie sea su propio padre. Un ciclo mas largo
-- -A → B → A- pasaria el CHECK y dejaria al arbol de la pantalla recorriendose para siempre:
-- el navegador se cuelga. Se recorre la cadena de padres antes de guardar.
-- ---------------------------------------------------------------------------
create or replace function public.evitar_ciclo_series_formatos()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  v_ancestro uuid := new.id_padre;
  v_saltos   int  := 0;
begin
  while v_ancestro is not null loop
    if v_ancestro = new.id then
      raise exception 'Esa serie no puede colgar de una de sus propias subseries.'
        using errcode = '23514';
    end if;
    -- Cinturon por si quedara un ciclo previo en los datos: nunca un bucle infinito.
    v_saltos := v_saltos + 1;
    if v_saltos > 50 then
      raise exception 'La jerarquia de series es demasiado profunda o tiene un ciclo.'
        using errcode = '23514';
    end if;
    select id_padre into v_ancestro from public.series_formatos where id = v_ancestro;
  end loop;
  return new;
end;
$fn$;

drop trigger if exists evitar_ciclo on public.series_formatos;
create trigger evitar_ciclo
  before insert or update of id_padre on public.series_formatos
  for each row execute function public.evitar_ciclo_series_formatos();


-- ---------------------------------------------------------------------------
-- Paso 3 · `formatos` gana la serie y los datos del archivo.
--
-- `on delete set null`: borrar una serie NO borra sus formatos, los deja sin clasificar y
-- siguen apareciendo en la lista completa.
-- ---------------------------------------------------------------------------
alter table public.formatos
  add column if not exists id_serie       uuid references public.series_formatos(id) on delete set null,
  add column if not exists archivo_path   text,
  add column if not exists archivo_nombre text,
  add column if not exists tamano_bytes   bigint,
  add column if not exists tipo_mime      text;

comment on column public.formatos.id_serie is
  'Serie a la que pertenece. NULL = sin clasificar, se muestra igual en la lista completa.';
comment on column public.formatos.archivo_path is
  'Ruta dentro del bucket privado `formatos`. NULL en las plantillas dinamicas, que no tienen archivo.';
comment on column public.formatos.archivo_nombre is
  'Nombre original del archivo, con su extension. Es lo que ve y descarga el usuario.';
comment on column public.formatos.tamano_bytes is
  'Peso real del archivo. La columna TAMANO de la pantalla mostraba un guion fijo antes de esto.';

create index if not exists formatos_id_serie_idx on public.formatos (id_serie);


-- ---------------------------------------------------------------------------
-- Paso 4 · Quien puede tocar las series.
-- Administradores y tecnicos: son los dos roles que llegan a la pantalla Formatos.
-- ---------------------------------------------------------------------------
alter table public.series_formatos enable row level security;

drop policy if exists series_formatos_staff on public.series_formatos;
create policy series_formatos_staff on public.series_formatos
  for all to authenticated
  using (public.es_staff())
  with check (public.es_staff());


-- ---------------------------------------------------------------------------
-- Paso 5 · El bucket, PRIVADO.
--
-- El bucket `imagenes` es publico y devuelve URLs eternas; el linter ya lo marco por permitir
-- listar todos sus archivos. Estos son documentos institucionales: se sirven con URL firmada
-- que caduca, no con un enlace que quien lo copie abre para siempre.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('formatos', 'formatos', false)
on conflict (id) do update set public = false;

drop policy if exists formatos_archivos_staff_lee   on storage.objects;
drop policy if exists formatos_archivos_staff_sube  on storage.objects;
drop policy if exists formatos_archivos_staff_borra on storage.objects;

create policy formatos_archivos_staff_lee on storage.objects
  for select to authenticated
  using (bucket_id = 'formatos' and public.es_staff());

create policy formatos_archivos_staff_sube on storage.objects
  for insert to authenticated
  with check (bucket_id = 'formatos' and public.es_staff());

create policy formatos_archivos_staff_borra on storage.objects
  for delete to authenticated
  using (bucket_id = 'formatos' and public.es_staff());


-- ---------------------------------------------------------------------------
-- OPCIONAL · Las series que usa la carrera hoy.
--
-- Salen del asistente publico de Electricidad, que ya clasifica sus 109 formatos asi. Se usan
-- esas y no una invencion propia: si el repositorio ordena los documentos distinto de como los
-- busca la gente, nadie encuentra nada.
--
-- Descomentar antes de ejecutar. `on conflict do nothing` la hace repetible.
-- ---------------------------------------------------------------------------
-- insert into public.series_formatos (nombre, orden) values
--   ('Solicitudes',              1),
--   ('Titulacion',               2),
--   ('Practicas',                3),
--   ('Ayudantias',               4),
--   ('Giras',                    5),
--   ('Estrategias metodologicas', 6),
--   ('Otros formatos',           7)
-- on conflict do nothing;


-- ---------------------------------------------------------------------------
-- Comprobación 1 · Las columnas nuevas de `formatos`.
-- ---------------------------------------------------------------------------
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'formatos'
   and column_name in ('id_serie', 'archivo_path', 'archivo_nombre', 'tamano_bytes', 'tipo_mime')
 order by column_name;

-- ---------------------------------------------------------------------------
-- Comprobación 2 · El bucket debe existir y salir con public = false.
-- ---------------------------------------------------------------------------
select id, name, public from storage.buckets where id = 'formatos';
