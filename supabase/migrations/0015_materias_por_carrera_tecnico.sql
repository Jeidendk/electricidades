-- Los técnicos consultan el catálogo completo para que los horarios mantengan
-- los nombres de las materias, pero solo administran materias creadas por ellos
-- dentro de la carrera asignada en su perfil.

-- Facultades y carreras son catálogos de solo lectura para técnicos.
drop policy if exists allow_all on public.facultades;
drop policy if exists facultades_read on public.facultades;
create policy facultades_read
on public.facultades
for select
to anon, authenticated
using (true);

drop policy if exists facultades_admin_write on public.facultades;
create policy facultades_admin_write
on public.facultades
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists allow_all on public.carreras;
drop policy if exists carreras_read on public.carreras;
create policy carreras_read
on public.carreras
for select
to anon, authenticated
using (true);

drop policy if exists carreras_admin_write on public.carreras;
create policy carreras_admin_write
on public.carreras
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.materias
  add column if not exists creado_por uuid null;

alter table public.materias
  alter column creado_por set default auth.uid();

alter table public.materias enable row level security;

drop policy if exists allow_all on public.materias;

drop policy if exists materias_read on public.materias;
create policy materias_read
on public.materias
for select
to authenticated
using (true);

drop policy if exists materias_admin_write on public.materias;
create policy materias_admin_write
on public.materias
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists materias_tecnico_insert on public.materias;
create policy materias_tecnico_insert
on public.materias
for insert
to authenticated
with check (
  creado_por = auth.uid()
  and exists (
    select 1
    from public.usuarios u
    join public.roles r on r.id = u.id_rol
    join public.carreras c on c.id = materias.id_carrera
    where u.id = auth.uid()
      and lower(r.nombre) in ('tecnico', 'técnico')
      and lower(coalesce(u.carrera_nombre, '')) = lower(c.nombre)
  )
);

drop policy if exists materias_tecnico_update on public.materias;
create policy materias_tecnico_update
on public.materias
for update
to authenticated
using (
  creado_por = auth.uid()
  and exists (
    select 1
    from public.usuarios u
    join public.roles r on r.id = u.id_rol
    join public.carreras c on c.id = materias.id_carrera
    where u.id = auth.uid()
      and lower(r.nombre) in ('tecnico', 'técnico')
      and lower(coalesce(u.carrera_nombre, '')) = lower(c.nombre)
  )
)
with check (
  creado_por = auth.uid()
  and exists (
    select 1
    from public.usuarios u
    join public.roles r on r.id = u.id_rol
    join public.carreras c on c.id = materias.id_carrera
    where u.id = auth.uid()
      and lower(r.nombre) in ('tecnico', 'técnico')
      and lower(coalesce(u.carrera_nombre, '')) = lower(c.nombre)
  )
);

drop policy if exists materias_tecnico_delete on public.materias;
create policy materias_tecnico_delete
on public.materias
for delete
to authenticated
using (
  creado_por = auth.uid()
  and exists (
    select 1
    from public.usuarios u
    join public.roles r on r.id = u.id_rol
    join public.carreras c on c.id = materias.id_carrera
    where u.id = auth.uid()
      and lower(r.nombre) in ('tecnico', 'técnico')
      and lower(coalesce(u.carrera_nombre, '')) = lower(c.nombre)
  )
);

-- Los recursos vinculados siguen la propiedad de la materia.
drop policy if exists allow_all on public.materia_recursos;

drop policy if exists materia_recursos_read on public.materia_recursos;
create policy materia_recursos_read
on public.materia_recursos
for select
to authenticated
using (true);

drop policy if exists materia_recursos_admin_write on public.materia_recursos;
create policy materia_recursos_admin_write
on public.materia_recursos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists materia_recursos_tecnico_insert on public.materia_recursos;
create policy materia_recursos_tecnico_insert
on public.materia_recursos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.materias m
    join public.carreras c on c.id = m.id_carrera
    join public.usuarios u on u.id = auth.uid()
    join public.roles r on r.id = u.id_rol
    where m.id = materia_recursos.id_materia
      and m.creado_por = auth.uid()
      and lower(r.nombre) in ('tecnico', 'técnico')
      and lower(coalesce(u.carrera_nombre, '')) = lower(c.nombre)
  )
);

drop policy if exists materia_recursos_tecnico_delete on public.materia_recursos;
create policy materia_recursos_tecnico_delete
on public.materia_recursos
for delete
to authenticated
using (
  exists (
    select 1
    from public.materias m
    join public.carreras c on c.id = m.id_carrera
    join public.usuarios u on u.id = auth.uid()
    join public.roles r on r.id = u.id_rol
    where m.id = materia_recursos.id_materia
      and m.creado_por = auth.uid()
      and lower(r.nombre) in ('tecnico', 'técnico')
      and lower(coalesce(u.carrera_nombre, '')) = lower(c.nombre)
  )
);

notify pgrst, 'reload schema';
