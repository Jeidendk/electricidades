-- =====================================================================
-- RLS (Row Level Security) por rol — Sistema Estudiantil ESPOCH
-- =====================================================================
-- IMPORTANTE: Revisar antes de aplicar. Supuestos:
--   * public.usuarios.id == auth.uid() (el perfil usa el id del usuario de Auth).
--   * public.usuarios.id_rol -> public.roles.id ; roles.nombre contiene
--     'admin', 'tecnic'/'técnic' o (cualquier otro) = estudiante.
--   * Columnas de propiedad confirmadas en database.types.ts:
--       solicitudes_equipo.id_usuario, solicitudes_admin.id_usuario,
--       horario_estudiante.id_usuario, prestamos.id_usuario_estudiante,
--       ordenes_mantenimiento.id_tecnico.
-- Aplicar con: supabase db push   (o pegar en el SQL Editor del panel).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: rol normalizado del usuario autenticado ('admin'|'tecnico'|'student')
-- SECURITY DEFINER para poder leer usuarios/roles sin recursión de RLS.
-- ---------------------------------------------------------------------
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when lower(r.nombre) like '%admin%' then 'admin'
    when lower(r.nombre) like '%tecnic%' or lower(r.nombre) like '%técnic%' then 'tecnico'
    else 'student'
  end
  from public.usuarios u
  join public.roles r on r.id = u.id_rol
  where u.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.current_role_name() = 'admin' $$;

create or replace function public.is_staff() returns boolean
language sql stable as $$ select public.current_role_name() in ('admin','tecnico') $$;

-- ---------------------------------------------------------------------
-- Habilitar RLS en todas las tablas
-- ---------------------------------------------------------------------
alter table public.roles                 enable row level security;
alter table public.usuarios              enable row level security;
alter table public.facultades            enable row level security;
alter table public.carreras              enable row level security;
alter table public.edificios             enable row level security;
alter table public.espacios              enable row level security;
alter table public.materias              enable row level security;
alter table public.recursos              enable row level security;
alter table public.materia_recursos      enable row level security;
alter table public.inventario            enable row level security;
alter table public.catalogo_equipos      enable row level security;
alter table public.clases                enable row level security;
alter table public.horario_estudiante    enable row level security;
alter table public.prestamos             enable row level security;
alter table public.ordenes_mantenimiento enable row level security;
alter table public.solicitudes_equipo    enable row level security;
alter table public.solicitudes_admin     enable row level security;
alter table public.asignaciones          enable row level security;
alter table public.formatos              enable row level security;

-- ---------------------------------------------------------------------
-- Catálogo / referencia: lectura para cualquier autenticado.
-- Escritura: admin (inventario y catálogo también técnico).
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'roles','edificios','espacios','materias',
    'recursos','materia_recursos','clases','catalogo_equipos'
  ] loop
    execute format('create policy %I_read on public.%I for select to authenticated using (true);', t, t);
    execute format('create policy %I_admin_write on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());', t, t);
  end loop;
end $$;

-- facultades y carreras: lectura PÚBLICA (anon incluido) porque el formulario de
-- REGISTRO las necesita antes de iniciar sesión. Escritura solo admin.
create policy facultades_read on public.facultades for select to anon, authenticated using (true);
create policy facultades_admin_write on public.facultades for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy carreras_read on public.carreras for select to anon, authenticated using (true);
create policy carreras_admin_write on public.carreras for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Inventario y órdenes: lectura todos, escritura staff (admin+técnico).
create policy inventario_read  on public.inventario for select to authenticated using (true);
create policy inventario_write on public.inventario for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- usuarios: cada quien ve/edita su propia fila; el admin gestiona todas.
-- ---------------------------------------------------------------------
create policy usuarios_self_read   on public.usuarios for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy usuarios_self_update on public.usuarios for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy usuarios_admin_all   on public.usuarios for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Tablas propiedad del estudiante: el dueño ve/crea las suyas; staff ve todas.
-- ---------------------------------------------------------------------
-- solicitudes_equipo
create policy sol_equipo_owner_read on public.solicitudes_equipo for select to authenticated
  using (id_usuario = auth.uid() or public.is_staff());
create policy sol_equipo_owner_ins  on public.solicitudes_equipo for insert to authenticated
  with check (id_usuario = auth.uid() or public.is_staff());
create policy sol_equipo_owner_upd  on public.solicitudes_equipo for update to authenticated
  using (id_usuario = auth.uid() or public.is_staff()) with check (id_usuario = auth.uid() or public.is_staff());
create policy sol_equipo_staff_del  on public.solicitudes_equipo for delete to authenticated
  using (id_usuario = auth.uid() or public.is_staff());

-- solicitudes_admin
create policy sol_admin_owner_read on public.solicitudes_admin for select to authenticated
  using (id_usuario = auth.uid() or public.is_staff());
create policy sol_admin_owner_ins  on public.solicitudes_admin for insert to authenticated
  with check (id_usuario = auth.uid() or public.is_staff());
create policy sol_admin_staff_upd  on public.solicitudes_admin for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- horario_estudiante
create policy horario_owner_read on public.horario_estudiante for select to authenticated
  using (id_usuario = auth.uid() or public.is_staff());
create policy horario_owner_write on public.horario_estudiante for all to authenticated
  using (id_usuario = auth.uid() or public.is_staff()) with check (id_usuario = auth.uid() or public.is_staff());

-- prestamos (lectura del estudiante dueño; gestión staff)
create policy prestamos_owner_read on public.prestamos for select to authenticated
  using (id_usuario_estudiante = auth.uid() or public.is_staff());
create policy prestamos_staff_write on public.prestamos for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- ordenes_mantenimiento: admin total; técnico ve/edita las asignadas a él.
-- ---------------------------------------------------------------------
create policy ot_staff_read on public.ordenes_mantenimiento for select to authenticated
  using (public.is_staff());
create policy ot_admin_all on public.ordenes_mantenimiento for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy ot_tecnico_upd on public.ordenes_mantenimiento for update to authenticated
  using (id_tecnico = auth.uid()) with check (id_tecnico = auth.uid());

-- ---------------------------------------------------------------------
-- asignaciones y formatos: gestión de staff/admin.
-- ---------------------------------------------------------------------
create policy asignaciones_staff on public.asignaciones for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy formatos_read on public.formatos for select to authenticated using (public.is_staff());
create policy formatos_admin on public.formatos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- TODO verificar tras aplicar:
--   * Que roles.nombre realmente contenga 'admin'/'tecnico'; si usan otros
--     textos, ajustar current_role_name().
--   * Que el flujo de registro (signUp) pueda insertar en usuarios: si el
--     perfil se crea desde el cliente, añadir policy de insert propia
--     (id = auth.uid()) o crearlo vía trigger on auth.users.
-- =====================================================================
