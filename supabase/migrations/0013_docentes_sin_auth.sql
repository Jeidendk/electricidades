-- Permite mantener docentes dentro de public.usuarios sin crearles una cuenta
-- en auth.users. Los demás roles continúan necesitando una cuenta de acceso.

alter table public.usuarios
  drop constraint if exists usuarios_id_fkey;

create or replace function public.validar_usuario_auth_o_docente()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_rol text;
begin
  select lower(r.nombre)
    into v_rol
  from public.roles r
  where r.id = new.id_rol;

  if v_rol is distinct from 'docente'
     and not exists (
       select 1
       from auth.users au
       where au.id = new.id
     )
  then
    raise exception
      'El rol % necesita una cuenta de autenticación asociada.',
      coalesce(v_rol, 'desconocido')
      using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists usuarios_auth_o_docente_insert on public.usuarios;
create trigger usuarios_auth_o_docente_insert
before insert on public.usuarios
for each row
execute function public.validar_usuario_auth_o_docente();

drop trigger if exists usuarios_auth_o_docente_update on public.usuarios;
create trigger usuarios_auth_o_docente_update
before update of id, id_rol on public.usuarios
for each row
execute function public.validar_usuario_auth_o_docente();

notify pgrst, 'reload schema';
