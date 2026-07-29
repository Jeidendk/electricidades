-- 0017_tecnicos_gestionan_docentes.sql
-- Permite que el personal (admin + técnico) vea y administre las filas de DOCENTES
-- en public.usuarios. Objetivo: los técnicos pueden registrar/ver docentes (que dan
-- en varias carreras y materias) sin tocar admins, técnicos ni estudiantes.
--
-- Los docentes se identifican por su rol (roles.nombre = 'Docente'). Las políticas
-- son permisivas (se suman a las existentes): solo AMPLÍAN el acceso a filas docente.

drop policy if exists usuarios_docente_staff_read on public.usuarios;
create policy usuarios_docente_staff_read on public.usuarios for select to authenticated
  using (public.is_staff() and id_rol in (select id from public.roles where lower(nombre) = 'docente'));

drop policy if exists usuarios_docente_staff_ins on public.usuarios;
create policy usuarios_docente_staff_ins on public.usuarios for insert to authenticated
  with check (public.is_staff() and id_rol in (select id from public.roles where lower(nombre) = 'docente'));

drop policy if exists usuarios_docente_staff_upd on public.usuarios;
create policy usuarios_docente_staff_upd on public.usuarios for update to authenticated
  using (public.is_staff() and id_rol in (select id from public.roles where lower(nombre) = 'docente'))
  with check (public.is_staff() and id_rol in (select id from public.roles where lower(nombre) = 'docente'));

drop policy if exists usuarios_docente_staff_del on public.usuarios;
create policy usuarios_docente_staff_del on public.usuarios for delete to authenticated
  using (public.is_staff() and id_rol in (select id from public.roles where lower(nombre) = 'docente'));

notify pgrst, 'reload schema';
