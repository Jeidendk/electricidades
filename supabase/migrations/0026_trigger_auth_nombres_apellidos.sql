-- 0026 · El trigger de auth.users también copia `nombres` y `apellidos`
--
-- POR QUÉ
-- `handle_new_auth_user` crea la fila de public.usuarios con los datos que el formulario deja
-- en raw_user_meta_data. Conocía `nombre` pero no los dos campos separados, así que toda
-- cuenta nueva nacía con `nombres` y `apellidos` en NULL. Eso es lo que impide ponerlos en
-- NOT NULL (ver la 0025).
--
-- QUÉ CAMBIA
-- Solo se AGREGAN las dos columnas al INSERT y al ON CONFLICT. El resto del cuerpo queda
-- idéntico: el mismo modo de resolver el rol, el mismo `pao`, los mismos coalesce y el mismo
-- manejo de error.
--
-- SE PUEDE EJECUTAR ANTES DEL DESPLIEGUE, sin esperar al código nuevo: si la metadata no trae
-- los campos (la versión que está hoy en producción no los manda), `nullif` los deja en NULL
-- y la fila se crea exactamente como hasta ahora.
--
-- Ejecutar en Supabase → SQL Editor.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer                      -- inserta en public.usuarios desde el contexto de auth
set search_path = public, pg_temp
as $fn$
DECLARE
  v_rol_nombre text := coalesce(nullif(new.raw_user_meta_data->>'rol', ''), 'Estudiante');
  v_id_rol integer;
  v_pao text;
BEGIN
  SELECT id INTO v_id_rol FROM public.roles WHERE lower(nombre) = lower(v_rol_nombre) LIMIT 1;
  IF v_id_rol IS NULL THEN
    SELECT id INTO v_id_rol FROM public.roles WHERE lower(nombre) LIKE '%estudiante%' LIMIT 1;
  END IF;

  -- Validar PAO: solo convertir a int si es numérico
  v_pao := nullif(new.raw_user_meta_data->>'pao', '');

  INSERT INTO public.usuarios (
    id, nombre, nombres, apellidos, email, id_rol, estado,
    departamento, codigo_institucional, facultad_nombre, carrera_nombre, pao
  )
  VALUES (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nombre', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'nombres', ''),
    nullif(new.raw_user_meta_data->>'apellidos', ''),
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
    nombres = coalesce(public.usuarios.nombres, excluded.nombres),
    apellidos = coalesce(public.usuarios.apellidos, excluded.apellidos),
    departamento = coalesce(public.usuarios.departamento, excluded.departamento),
    codigo_institucional = coalesce(public.usuarios.codigo_institucional, excluded.codigo_institucional),
    facultad_nombre = coalesce(public.usuarios.facultad_nombre, excluded.facultad_nombre),
    carrera_nombre = coalesce(public.usuarios.carrera_nombre, excluded.carrera_nombre),
    pao = coalesce(public.usuarios.pao, excluded.pao);
  RETURN new;
EXCEPTION WHEN others THEN
  -- Se conserva tal cual para no cambiar el comportamiento del registro en esta migración.
  -- OJO: esto se traga el error. Si el INSERT falla, la cuenta de auth se crea igual y la
  -- persona queda sin fila en public.usuarios; el único rastro es este WARNING en los logs.
  RAISE WARNING 'handle_new_auth_user FALLO uid=% email=%: % (%)', new.id, new.email, sqlerrm, sqlstate;
  RETURN new;
END;
$fn$;

-- Un solo trigger en auth.users. Se borran los que hubiera —con cualquier nombre— porque dos
-- triggers insertando la misma fila terminan en `duplicate key` (es lo que ya arregló la 0016).
--
-- El BEFORE/AFTER no se decide aquí: se LEE del trigger que existe y se vuelve a poner igual.
-- Adivinarlo sería el peor error posible de esta migración; con AFTER la fila de auth.users ya
-- existe cuando se inserta en public.usuarios, con BEFORE todavía no, y confundirlos rompe el
-- registro de cuentas nuevas.
do $$
declare
  t record;
  v_momento text := 'after';        -- solo se usa si no había ningún trigger que copiar
  v_leido boolean := false;
begin
  for t in
    select tgname, tgtype from pg_trigger
     where tgrelid = 'auth.users'::regclass and not tgisinternal
  loop
    if not v_leido then
      -- tgtype: el bit de valor 2 marca BEFORE; sin ese bit, es AFTER.
      v_momento := case when (t.tgtype & 2) = 2 then 'before' else 'after' end;
      v_leido := true;
    end if;
    execute format('drop trigger %I on auth.users', t.tgname);
  end loop;

  execute format(
    'create trigger on_auth_user_created %s insert on auth.users '
    'for each row execute function public.handle_new_auth_user()',
    v_momento);

  raise notice 'Trigger recreado como % INSERT', upper(v_momento);
end $$;

-- Comprobación: debe devolver exactamente una fila.
select t.tgname as trigger, p.proname as funcion, p.prosecdef as security_definer
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
 where t.tgrelid = 'auth.users'::regclass
   and not t.tgisinternal;
