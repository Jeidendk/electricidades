-- 0016_crear_usuario_desde_auth_con_rol.sql
-- Crea (o completa) la fila public.usuarios automáticamente cuando se registra un
-- usuario en auth.users, tomando el ROL y los datos desde la metadata de Auth
-- (raw_user_meta_data). Antes el rol elegido por el admin no se aplicaba: todos
-- quedaban como Estudiante y a veces la fila ni se creaba.
--
-- La metadata la envía el cliente en signUp / signInWithOtp (options.data):
--   rol, nombre, departamento, codigo_institucional, facultad_nombre,
--   carrera_nombre, pao.
--
-- SECURITY DEFINER: corre con privilegios del dueño (postgres), así evita RLS.
-- El trigger de validación 0013 (BEFORE INSERT en usuarios) pasa porque la fila
-- de auth.users ya existe cuando este trigger AFTER INSERT se dispara.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_rol_nombre text := coalesce(nullif(new.raw_user_meta_data->>'rol', ''), 'Estudiante');
  v_id_rol integer;
begin
  -- Resuelve el id del rol por nombre (case-insensitive); si no coincide, Estudiante.
  select id into v_id_rol from public.roles where lower(nombre) = lower(v_rol_nombre) limit 1;
  if v_id_rol is null then
    select id into v_id_rol from public.roles where lower(nombre) like '%estudiante%' limit 1;
  end if;

  insert into public.usuarios (
    id, nombre, email, id_rol, estado,
    departamento, codigo_institucional, facultad_nombre, carrera_nombre, pao
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nombre', ''), split_part(new.email, '@', 1)),
    new.email,
    v_id_rol,
    'activo',
    nullif(new.raw_user_meta_data->>'departamento', ''),
    nullif(new.raw_user_meta_data->>'codigo_institucional', ''),
    nullif(new.raw_user_meta_data->>'facultad_nombre', ''),
    nullif(new.raw_user_meta_data->>'carrera_nombre', ''),
    (nullif(new.raw_user_meta_data->>'pao', ''))::int
  )
  on conflict (id) do update set
    id_rol = excluded.id_rol,
    nombre = coalesce(nullif(public.usuarios.nombre, ''), excluded.nombre),
    departamento = coalesce(public.usuarios.departamento, excluded.departamento),
    codigo_institucional = coalesce(public.usuarios.codigo_institucional, excluded.codigo_institucional),
    facultad_nombre = coalesce(public.usuarios.facultad_nombre, excluded.facultad_nombre),
    carrera_nombre = coalesce(public.usuarios.carrera_nombre, excluded.carrera_nombre),
    pao = coalesce(public.usuarios.pao, excluded.pao);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

notify pgrst, 'reload schema';
