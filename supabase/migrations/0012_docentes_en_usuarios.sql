-- 0012_docentes_en_usuarios.sql
-- Arquitectura final: los docentes viven en public.usuarios y se distinguen
-- mediante public.roles. No se crea una tabla adicional.
--
-- Un docente registrado desde administración NO se crea en auth.users:
-- no recibe correo, contraseña ni acceso.

-- Los usuarios con cuenta siguen requiriendo correo desde la aplicación.
-- La columna se vuelve nullable para permitir docentes sin autenticación.
alter table public.usuarios
  alter column email drop not null;

-- 1. Rol reutilizable por el formulario y los filtros.
insert into public.roles (nombre, descripcion, activo)
select
  'Docente',
  'Docente disponible para asignación de horarios, sin acceso por defecto.',
  true
where not exists (
  select 1
  from public.roles
  where lower(nombre) = 'docente'
);

-- 2. Vista de compatibilidad para consultas históricas.
-- Solo expone usuarios cuyo rol real es Docente.
create or replace view public.docentes
  with (security_invoker = false)
  as
  select
    u.id,
    u.nombre,
    u.estado,
    u.facultad_nombre
  from public.usuarios u
  join public.roles r on r.id = u.id_rol
  where lower(r.nombre) = 'docente';

revoke all on public.docentes from anon;
grant select on public.docentes to authenticated;

-- 3. Las clases referencian directamente la misma fila de public.usuarios.
alter table public.clases
  drop constraint if exists clases_id_docente_fkey;

alter table public.clases
  add constraint clases_id_docente_fkey
  foreign key (id_docente)
  references public.usuarios(id)
  on update cascade
  on delete restrict;

notify pgrst, 'reload schema';
