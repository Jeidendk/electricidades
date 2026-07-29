-- 0016_crear_usuario_desde_auth_con_rol.sql
-- Crea (o completa) la fila public.usuarios automáticamente cuando se registra un
-- usuario en auth.users, tomando el ROL y los datos desde la metadata de Auth.
--
-- IMPORTANTE: antes existía OTRO trigger en auth.users (creado desde el dashboard)
-- que también insertaba la fila con rol por defecto (Estudiante). Con dos triggers
-- insertando la misma id se producía `duplicate key ... usuarios_pkey` (500 al crear).
-- Por eso esta migración elimina TODOS los triggers personalizados de auth.users y
-- deja solo el nuestro, que además respeta el rol elegido y es a prueba de fallos.
--
-- Metadata enviada por el cliente (signUp / signInWithOtp options.data):
--   rol, nombre, departamento, codigo_institucional, facultad_nombre, carrera_nombre, pao.

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
exception when others then
  raise warning 'handle_new_auth_user FALLO uid=% email=%: % (%)', new.id, new.email, sqlerrm, sqlstate;
  return new;
end;
$$;

-- Elimina cualquier trigger personalizado previo en auth.users (evita duplicados).
do $$
declare t record;
begin
  for t in
    select tgname from pg_trigger
    where tgrelid = 'auth.users'::regclass and not tgisinternal
  loop
    execute format('drop trigger if exists %I on auth.users', t.tgname);
  end loop;
end $$;

-- Único trigger que gestiona la creación del perfil.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

notify pgrst, 'reload schema';
