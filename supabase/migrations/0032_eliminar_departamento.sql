-- 0032 · Fuera `departamento`
--
-- SE EJECUTA DESPUÉS DEL DESPLIEGUE que deja de usarla. Con el código nuevo arriba, nadie la
-- lee ni la escribe; lo único que queda apuntándole es el trigger de auth, que se corrige aquí.
--
-- Duplicaba `facultad_nombre` en todas las escrituras, sin ningún trigger que las mantuviera
-- sincronizadas. La pantalla Usuarios, el listado de técnicos de Asignaciones y el acta en PDF
-- usan ya `facultad_nombre`.
--
-- Ejecutar en Supabase → SQL Editor.


-- ---------------------------------------------------------------------------
-- Paso 1 · Última comprobación antes de borrar.
-- Lista las filas donde `departamento` diga algo que `facultad_nombre` no tenga. Debe salir
-- vacío; si aparece alguna, PARAR y copiar ese valor a `facultad_nombre` primero.
-- (Las dos que difieren por `''` contra NULL no cuentan: significan lo mismo, sin facultad.)
-- ---------------------------------------------------------------------------
select id, nombre, apellido, departamento, facultad_nombre
  from public.usuarios
 where coalesce(nullif(btrim(departamento), ''), '') <> ''
   and coalesce(nullif(btrim(departamento), ''), '')
       is distinct from coalesce(nullif(btrim(facultad_nombre), ''), '');


-- ---------------------------------------------------------------------------
-- Paso 2 · El trigger de auth deja de escribirla.
-- Mismo cuerpo que la 0030; solo desaparece `departamento` del INSERT y del ON CONFLICT.
-- El valor que le ponía ('FIE' por defecto) ya lo cubre `facultad_nombre`.
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
    codigo_institucional, facultad_nombre, carrera_nombre, pao
  )
  VALUES (
    new.id,
    v_nombre,
    v_apellido,
    new.email,
    v_id_rol,
    'activo',
    nullif(new.raw_user_meta_data->>'codigo_institucional', ''),
    nullif(new.raw_user_meta_data->>'facultad_nombre', ''),
    nullif(new.raw_user_meta_data->>'carrera_nombre', ''),
    v_pao
  )
  ON CONFLICT (id) DO UPDATE SET
    id_rol = excluded.id_rol,
    nombre = coalesce(nullif(public.usuarios.nombre, ''), excluded.nombre),
    apellido = coalesce(nullif(public.usuarios.apellido, ''), excluded.apellido),
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
-- Paso 3 · La columna.
-- ---------------------------------------------------------------------------
alter table public.usuarios drop column departamento;


-- ---------------------------------------------------------------------------
-- Comprobación · no deben aparecer ni `departamento` ni `especialidad`.
-- ---------------------------------------------------------------------------
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'usuarios'
 order by ordinal_position;
