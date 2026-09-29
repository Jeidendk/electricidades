-- El paralelo del estudiante permite identificar su horario dentro del PAO.
-- Se deja NULL para cuentas existentes: no es posible deducirlo de la carrera.
alter table public.usuarios
  add column if not exists paralelo smallint;

alter table public.usuarios
  drop constraint if exists usuarios_paralelo_positivo;

alter table public.usuarios
  add constraint usuarios_paralelo_positivo
  check (paralelo is null or paralelo >= 1);

comment on column public.usuarios.paralelo is
  'Paralelo académico del estudiante. NULL significa que aún no está asignado.';

-- Mantiene la creación de perfiles desde Auth y agrega el paralelo a los metadatos
-- que se copian durante el registro. Una edición administrativa posterior prevalece.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  c_por_completar constant text := 'POR COMPLETAR';
  v_rol_nombre text := coalesce(nullif(new.raw_user_meta_data->>'rol', ''), 'Estudiante');
  v_id_rol integer;
  v_pao text;
  v_paralelo_texto text;
  v_paralelo smallint;
  v_nombre text;
  v_apellido text;
begin
  select id into v_id_rol from public.roles where lower(nombre) = lower(v_rol_nombre) limit 1;
  if v_id_rol is null then
    select id into v_id_rol from public.roles where lower(nombre) like '%estudiante%' limit 1;
  end if;

  v_pao := nullif(new.raw_user_meta_data->>'pao', '');
  v_paralelo_texto := nullif(new.raw_user_meta_data->>'paralelo', '');
  if v_paralelo_texto ~ '^[1-9][0-9]*$' and length(v_paralelo_texto) <= 5 then
    if v_paralelo_texto::integer <= 32767 then
      v_paralelo := v_paralelo_texto::smallint;
    end if;
  end if;

  v_nombre := nullif(btrim(new.raw_user_meta_data->>'nombre'), '');
  v_apellido := nullif(btrim(new.raw_user_meta_data->>'apellido'), '');
  if v_nombre is null and v_apellido is null then
    v_nombre := upper(split_part(new.email, '@', 1));
    v_apellido := c_por_completar;
  else
    v_nombre := coalesce(v_nombre, c_por_completar);
    v_apellido := coalesce(v_apellido, c_por_completar);
  end if;

  insert into public.usuarios (
    id, nombre, apellido, email, id_rol, estado,
    codigo_institucional, facultad_nombre, carrera_nombre, pao, paralelo
  ) values (
    new.id, v_nombre, v_apellido, new.email, v_id_rol, 'activo',
    nullif(new.raw_user_meta_data->>'codigo_institucional', ''),
    nullif(new.raw_user_meta_data->>'facultad_nombre', ''),
    nullif(new.raw_user_meta_data->>'carrera_nombre', ''),
    v_pao, v_paralelo
  )
  on conflict (id) do update set
    id_rol = excluded.id_rol,
    nombre = coalesce(nullif(public.usuarios.nombre, ''), excluded.nombre),
    apellido = coalesce(nullif(public.usuarios.apellido, ''), excluded.apellido),
    codigo_institucional = coalesce(public.usuarios.codigo_institucional, excluded.codigo_institucional),
    facultad_nombre = coalesce(public.usuarios.facultad_nombre, excluded.facultad_nombre),
    carrera_nombre = coalesce(public.usuarios.carrera_nombre, excluded.carrera_nombre),
    pao = coalesce(public.usuarios.pao, excluded.pao),
    paralelo = coalesce(public.usuarios.paralelo, excluded.paralelo);
  return new;
exception when others then
  raise warning 'handle_new_auth_user FALLO uid=% email=%: % (%)', new.id, new.email, sqlerrm, sqlstate;
  return new;
end;
$fn$;
