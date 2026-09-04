-- 0030 · Se elimina el nombre completo duplicado: quedan `nombre` y `apellido`
--
-- QUÉ CAMBIA
--   usuarios.nombre     (nombre completo)  →  SE ELIMINA
--   usuarios.nombres    (nombres de pila)  →  se llama `nombre`
--   usuarios.apellidos                     →  se llama `apellido`
--
-- NO SE PIERDE NINGÚN DATO: las dos columnas que se conservan son las mismas, solo cambian de
-- nombre. La que se borra era un valor DERIVADO de ellas, que el trigger de la 0025 mantenía
-- sincronizado. El nombre completo ahora se arma al leer, en la aplicación.
--
-- ATENCIÓN: ESTA MIGRACIÓN Y EL DESPLIEGUE VAN JUNTOS.
-- La versión anterior del código pide `usuarios.nombre` esperando el nombre completo y escribe
-- `nombres`/`apellidos`. En cuanto se ejecute esto, esa versión escribe contra columnas que ya
-- no existen. Entre el SQL y el despliegue hay unos minutos de servicio roto: es el precio de
-- renombrar, y por eso conviene hacerlo con poca gente usando el sistema.
--
-- Ejecutar en Supabase → SQL Editor.


-- ---------------------------------------------------------------------------
-- Paso 1 · Guardar la definición de las vistas antes de borrarlas.
-- Ninguna la usa la aplicación (se verificó en el código), pero Postgres impide borrar una
-- columna de la que dependa una vista. Copia este resultado antes de seguir: si alguna hacía
-- falta, esto es lo único que queda de ella.
-- ---------------------------------------------------------------------------
select table_name, view_definition
  from information_schema.views
 where table_schema = 'public'
   and table_name in ('v_usuarios_completo', 'v_tecnicos', 'v_clases_completo',
                      'v_horario_estudiante_completo', 'docentes');

-- Sin CASCADE a propósito: si algo más dependiera de ellas, preferimos el error a un borrado
-- en cadena silencioso.
drop view if exists public.v_usuarios_completo;
drop view if exists public.v_tecnicos;
drop view if exists public.v_clases_completo;
drop view if exists public.v_horario_estudiante_completo;
drop view if exists public.docentes;


-- ---------------------------------------------------------------------------
-- Paso 2 · Quitar lo que cuelga de la columna que se va.
-- El índice único de docentes está construido sobre `nombre`; se rehace en el paso 5.
-- El CHECK "o los dos o ninguno" pierde sentido: ambas columnas son NOT NULL.
-- ---------------------------------------------------------------------------
drop index if exists public.usuarios_docente_nombre_unico;
alter table public.usuarios drop constraint if exists usuarios_nombre_repartido_check;
drop trigger if exists componer_nombre on public.usuarios;


-- ---------------------------------------------------------------------------
-- Paso 3 · El renombrado.
-- ---------------------------------------------------------------------------
alter table public.usuarios drop column nombre;
alter table public.usuarios rename column nombres   to nombre;
alter table public.usuarios rename column apellidos to apellido;

comment on column public.usuarios.nombre is
  'Nombres de pila, en mayusculas. Puede llevar mas de uno: JUAN CARLOS.';
comment on column public.usuarios.apellido is
  'Apellidos, en mayusculas. Puede llevar mas de uno: PEREZ MORENO.';


-- ---------------------------------------------------------------------------
-- Paso 4 · El trigger ya no compone nada: normaliza.
-- Sigue haciendo falta para que el mismo nombre escrito con otra caja o con espacios de más no
-- se cuele como una persona distinta ante el índice único.
-- ---------------------------------------------------------------------------
create or replace function public.componer_nombre_usuario()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  new.nombre   := upper(btrim(regexp_replace(new.nombre,   '\s+', ' ', 'g')));
  new.apellido := upper(btrim(regexp_replace(new.apellido, '\s+', ' ', 'g')));
  return new;
end;
$fn$;

comment on function public.componer_nombre_usuario() is
  'Normaliza nombre y apellido a mayusculas con espacios colapsados, antes de guardarlos.';

create trigger componer_nombre
  before insert or update of nombre, apellido on public.usuarios
  for each row execute function public.componer_nombre_usuario();


-- ---------------------------------------------------------------------------
-- Paso 5 · El índice único de docentes, ahora sobre los dos campos juntos.
-- Mismo criterio que la 0022: el predicado de un índice no admite subconsultas, así que el id
-- del rol se resuelve aquí y se incrusta como literal. Si cambian los ids de `roles`, rehacer.
-- ---------------------------------------------------------------------------
do $$
declare
  v_id_rol_docente integer;
begin
  select id into v_id_rol_docente from public.roles where nombre = 'Docente';

  if v_id_rol_docente is null then
    raise exception 'No existe el rol Docente en public.roles.';
  end if;

  execute format(
    $ddl$
      create unique index if not exists usuarios_docente_nombre_unico
        on public.usuarios (
          lower(translate(btrim(regexp_replace(nombre || ' ' || apellido, '\s+', ' ', 'g')), %L, %L))
        )
        where id_rol = %s
    $ddl$,
    'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun', v_id_rol_docente
  );
end $$;

comment on index public.usuarios_docente_nombre_unico is
  'Impide dos docentes con el mismo nombre completo, ignorando mayusculas, tildes y espacios.';


-- ---------------------------------------------------------------------------
-- Paso 6 · El trigger de auth escribe en las columnas nuevas.
-- Mismo cuerpo que la 0027; cambian los nombres de columna y las claves de metadata, que ahora
-- son `nombre` y `apellido`. El respaldo sigue igual: nunca se deja una cuenta sin ficha, y lo
-- que no se sepa se marca de forma visible en vez de inventar un reparto.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
DECLARE
  c_por_completar constant text := 'POR COMPLETAR';

  v_rol_nombre text := coalesce(nullif(new.raw_user_meta_data->>'rol', ''), 'Estudiante');
  v_id_rol integer;
  v_pao text;
  v_nombre text;
  v_apellido text;
BEGIN
  SELECT id INTO v_id_rol FROM public.roles WHERE lower(nombre) = lower(v_rol_nombre) LIMIT 1;
  IF v_id_rol IS NULL THEN
    SELECT id INTO v_id_rol FROM public.roles WHERE lower(nombre) LIKE '%estudiante%' LIMIT 1;
  END IF;

  v_pao := nullif(new.raw_user_meta_data->>'pao', '');

  v_nombre   := nullif(btrim(new.raw_user_meta_data->>'nombre'), '');
  v_apellido := nullif(btrim(new.raw_user_meta_data->>'apellido'), '');

  -- Sin datos: se usa la parte local del correo como nombre y se marca el apellido. No se
  -- parte nada por la mitad para adivinar dónde termina el nombre.
  IF v_nombre IS NULL AND v_apellido IS NULL THEN
    v_nombre   := upper(split_part(new.email, '@', 1));
    v_apellido := c_por_completar;
  ELSE
    v_nombre   := coalesce(v_nombre,   c_por_completar);
    v_apellido := coalesce(v_apellido, c_por_completar);
  END IF;

  INSERT INTO public.usuarios (
    id, nombre, apellido, email, id_rol, estado,
    departamento, codigo_institucional, facultad_nombre, carrera_nombre, pao
  )
  VALUES (
    new.id,
    v_nombre,
    v_apellido,
    new.email,
    v_id_rol,
    'activo',
    coalesce(nullif(new.raw_user_meta_data->>'departamento', ''), 'FIE'),
    nullif(new.raw_user_meta_data->>'codigo_institucional', ''),
    nullif(new.raw_user_meta_data->>'facultad_nombre', ''),
    nullif(new.raw_user_meta_data->>'carrera_nombre', ''),
    v_pao
  )
  ON CONFLICT (id) DO UPDATE SET
    id_rol = excluded.id_rol,
    nombre = coalesce(nullif(public.usuarios.nombre, ''), excluded.nombre),
    apellido = coalesce(nullif(public.usuarios.apellido, ''), excluded.apellido),
    departamento = coalesce(public.usuarios.departamento, excluded.departamento),
    codigo_institucional = coalesce(public.usuarios.codigo_institucional, excluded.codigo_institucional),
    facultad_nombre = coalesce(public.usuarios.facultad_nombre, excluded.facultad_nombre),
    carrera_nombre = coalesce(public.usuarios.carrera_nombre, excluded.carrera_nombre),
    pao = coalesce(public.usuarios.pao, excluded.pao);
  RETURN new;
EXCEPTION WHEN others THEN
  RAISE WARNING 'handle_new_auth_user FALLO uid=% email=%: % (%)', new.id, new.email, sqlerrm, sqlstate;
  RETURN new;
END;
$fn$;


-- ---------------------------------------------------------------------------
-- Comprobación 1 · Las columnas. Deben salir `nombre` y `apellido`, ambas NOT NULL, y NO debe
-- aparecer ninguna llamada `nombres` ni `apellidos`.
-- ---------------------------------------------------------------------------
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'usuarios'
   and column_name in ('nombre', 'apellido', 'nombres', 'apellidos')
 order by column_name;

-- ---------------------------------------------------------------------------
-- Comprobación 2 · Los datos siguen enteros. Ninguna fila vacía.
-- ---------------------------------------------------------------------------
select count(*)                                     as fichas,
       count(*) filter (where btrim(nombre) = '')   as sin_nombre,
       count(*) filter (where btrim(apellido) = '') as sin_apellido,
       min(nombre || ' ' || apellido)               as ejemplo_primero,
       max(nombre || ' ' || apellido)               as ejemplo_ultimo
  from public.usuarios;

-- ---------------------------------------------------------------------------
-- Comprobación 3 · El índice único quedó rehecho.
-- ---------------------------------------------------------------------------
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public' and indexname = 'usuarios_docente_nombre_unico';
