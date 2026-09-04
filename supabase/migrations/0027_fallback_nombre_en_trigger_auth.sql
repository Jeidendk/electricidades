-- 0027 · El trigger de auth nunca deja una cuenta sin ficha
--
-- POR QUÉ
-- Con `nombres` y `apellidos` en NOT NULL (0025), una cuenta creada SIN esos datos en la
-- metadata hace fallar el INSERT en public.usuarios. El `EXCEPTION WHEN others` se traga el
-- error, la cuenta de auth se crea igual y la persona queda **sin fila en la aplicación**: al
-- entrar, `fetchPerfil` no la encuentra, cae en el respaldo y la trata como estudiante,
-- cualquiera que fuese su rol. El único rastro es un WARNING en los logs.
--
-- Las dos vías de la app mandan los dos campos. Esto cubre el resto: alta manual desde el
-- panel de Supabase, o cualquier vía futura que se olvide de mandarlos.
--
-- CÓMO
-- Se rellenan con lo que haya, y lo que no se sepa se marca de forma VISIBLE. No se parte el
-- nombre completo por la mitad para adivinar el apellido: es el mismo criterio de la 0021 y la
-- 0025, y un reparto inventado es peor que un hueco señalado, porque nadie lo va a corregir.
--
-- Ejecutar en Supabase → SQL Editor.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
DECLARE
  -- Marca para la ficha que hay que completar a mano. Aparece tal cual en la pantalla
  -- Usuarios y en la consulta del final, que es justamente lo que se busca.
  c_por_completar constant text := 'POR COMPLETAR';

  v_rol_nombre text := coalesce(nullif(new.raw_user_meta_data->>'rol', ''), 'Estudiante');
  v_id_rol integer;
  v_pao text;
  v_nombre_completo text;
  v_nombres text;
  v_apellidos text;
BEGIN
  SELECT id INTO v_id_rol FROM public.roles WHERE lower(nombre) = lower(v_rol_nombre) LIMIT 1;
  IF v_id_rol IS NULL THEN
    SELECT id INTO v_id_rol FROM public.roles WHERE lower(nombre) LIKE '%estudiante%' LIMIT 1;
  END IF;

  -- Validar PAO: solo convertir a int si es numérico
  v_pao := nullif(new.raw_user_meta_data->>'pao', '');

  v_nombre_completo := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'nombre'), ''),
    split_part(new.email, '@', 1)
  );
  v_nombres   := nullif(btrim(new.raw_user_meta_data->>'nombres'), '');
  v_apellidos := nullif(btrim(new.raw_user_meta_data->>'apellidos'), '');

  -- Sin ninguno de los dos: el nombre completo va entero a `nombres` y el apellido queda
  -- marcado. Sin partirlo, porque en "RAMIRO ISA" o "ROMULO RIVERA" no hay forma de saber
  -- dónde termina el nombre.
  IF v_nombres IS NULL AND v_apellidos IS NULL THEN
    v_nombres   := upper(v_nombre_completo);
    v_apellidos := c_por_completar;
  ELSE
    v_nombres   := coalesce(v_nombres,   c_por_completar);
    v_apellidos := coalesce(v_apellidos, c_por_completar);
  END IF;

  INSERT INTO public.usuarios (
    id, nombre, nombres, apellidos, email, id_rol, estado,
    departamento, codigo_institucional, facultad_nombre, carrera_nombre, pao
  )
  VALUES (
    new.id,
    v_nombre_completo,
    v_nombres,
    v_apellidos,
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
  -- Se conserva el comportamiento: el registro no se cae por un fallo al crear la ficha.
  -- Con los fallbacks de arriba ya no debería entrar aquí por un NOT NULL.
  RAISE WARNING 'handle_new_auth_user FALLO uid=% email=%: % (%)', new.id, new.email, sqlerrm, sqlstate;
  RETURN new;
END;
$fn$;

-- El trigger no se toca: sigue apuntando a esta misma función.

-- ---------------------------------------------------------------------------
-- Fichas creadas sin nombre completo. Deberían ser cero; si aparece alguna, se corrige
-- desde la pantalla Usuarios y el trigger de la 0025 recompone `nombre`.
-- ---------------------------------------------------------------------------
select u.id, u.email, u.nombre, u.nombres, u.apellidos, r.nombre as rol
  from public.usuarios u
  join public.roles r on r.id = u.id_rol
 where u.nombres = 'POR COMPLETAR' or u.apellidos = 'POR COMPLETAR'
 order by u.email;


-- ---------------------------------------------------------------------------
-- Cuentas de auth que se quedaron SIN ficha por este hueco, antes de esta migración.
-- Si devuelve filas, avisar: hay que crearles la fila a mano con su rol correcto.
-- ---------------------------------------------------------------------------
select a.id, a.email, a.created_at
  from auth.users a
  left join public.usuarios u on u.id = a.id
 where u.id is null
 order by a.created_at desc;
