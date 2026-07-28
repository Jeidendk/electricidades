-- Todos los usuarios autenticados pueden consultar el horario completo.
-- Los técnicos solo pueden crear, editar y eliminar sus propias clases.
-- Los administradores conservan control total.

alter table public.clases enable row level security;

alter table public.clases
  alter column creado_por set default auth.uid();

-- Esta política permisiva anulaba cualquier restricción por propietario.
drop policy if exists allow_all on public.clases;

drop policy if exists clases_read on public.clases;
create policy clases_read
on public.clases
for select
to authenticated
using (true);

drop policy if exists clases_admin_write on public.clases;
create policy clases_admin_write
on public.clases
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists clases_creator_insert on public.clases;
create policy clases_creator_insert
on public.clases
for insert
to authenticated
with check (
  public.is_staff()
  and creado_por = auth.uid()
);

drop policy if exists clases_creator_update on public.clases;
create policy clases_creator_update
on public.clases
for update
to authenticated
using (
  public.is_staff()
  and creado_por = auth.uid()
)
with check (
  public.is_staff()
  and creado_por = auth.uid()
);

drop policy if exists clases_creator_delete on public.clases;
create policy clases_creator_delete
on public.clases
for delete
to authenticated
using (
  public.is_staff()
  and creado_por = auth.uid()
);

notify pgrst, 'reload schema';
