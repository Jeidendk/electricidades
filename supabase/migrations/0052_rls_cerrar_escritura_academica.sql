-- 0052 · Cerrar la escritura de las tablas académicas y de infraestructura
--
-- Requiere la 0051. EJECUTARLA ANTES DE DAR DE ALTA CUALQUIER CUENTA DE AUTORIDAD.
--
-- EL PROBLEMA QUE RESUELVE, Y QUE YA EXISTÍA:
-- `clases`, `espacios`, `edificios`, `materias`, `carreras` y `facultades` tienen la política
-- `allow_all` con `using (true) with check (true)`. Las políticas permisivas se SUMAN con OR,
-- así que esa sola anula a cualquier otra: hoy **cualquier cuenta con sesión** —un estudiante,
-- un docente, un decano— puede crear, editar o borrar un aula, una materia o un horario
-- llamando a la API REST de Supabase directamente, sin pasar por la aplicación.
--
-- Esconder los botones en la interfaz NO lo impide: la clave anónima va en el navegador y
-- cualquiera puede usarla contra la API. El control real son estas políticas.
--
-- QUÉ DEJA: la LECTURA abierta a cualquier autenticado (la necesitan el estudiante para su
-- horario, el docente, y las autoridades nuevas) y la ESCRITURA solo para admin y técnico.
--
-- RIESGO A VERIFICAR DESPUÉS DE EJECUTARLA: que admin y técnico sigan pudiendo guardar en las
-- seis tablas. Si algo deja de funcionar, la causa será que esa pantalla escribe con una cuenta
-- que `es_staff()` no reconoce. El paso 4 trae la consulta para revisarlo.

begin;

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. `es_staff()` ya existe (migración 0024) y cubre Administrador y Tecnico.
--    Se comprueba en vez de redefinirla: si su versión real difiere, redefinirla aquí
--    cambiaría el comportamiento de Reportes, Préstamos y Trámites.
-- ───────────────────────────────────────────────────────────────────────────────
do $guarda$
begin
  if to_regprocedure('public.es_staff()') is null then
    raise exception 'Falta public.es_staff() (migración 0024). Ejecútala antes que esta.';
  end if;
end $guarda$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. Quién es autoridad. Se usa para la LECTURA de la bitácora de reportes, que no es
--    pública: el resto de las tablas las lee cualquier autenticado.
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.es_autoridad()
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1
      from public.usuarios u
      join public.roles r on r.id = u.id_rol
     where u.id = auth.uid()
       and lower(r.nombre) in ('decano', 'subdecano', 'coordinador')
  );
$fn$;

comment on function public.es_autoridad() is
  'True si la sesión pertenece a Decano, Subdecano o Coordinador: roles de solo lectura.';

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. Lectura para todos los autenticados, escritura solo para admin y técnico.
--    Se recorren las seis tablas en vez de repetir el bloque seis veces.
-- ───────────────────────────────────────────────────────────────────────────────
do $cerrar$
declare
  t text;
  tablas text[] := array['clases', 'espacios', 'edificios', 'materias', 'carreras', 'facultades'];
begin
  foreach t in array tablas loop
    if to_regclass('public.' || t) is null then
      raise notice 'Tabla % inexistente: se omite.', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- La política abierta que anulaba a las demás.
    execute format('drop policy if exists allow_all on public.%I', t);

    execute format('drop policy if exists %I on public.%I', t || '_lectura_autenticados', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_lectura_autenticados', t
    );

    -- Una política por operación: así el error dice cuál faltó en vez de un "no autorizado" seco.
    execute format('drop policy if exists %I on public.%I', t || '_alta_staff', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.es_staff())',
      t || '_alta_staff', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_edicion_staff', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.es_staff()) with check (public.es_staff())',
      t || '_edicion_staff', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_baja_staff', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.es_staff())',
      t || '_baja_staff', t
    );

    raise notice 'Escritura cerrada en %.', t;
  end loop;
end $cerrar$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. Reportes: las autoridades necesitan LEER la bitácora, no escribirla.
--    La 0024 dejó la lectura solo para `es_staff()`.
-- ───────────────────────────────────────────────────────────────────────────────
drop policy if exists reportes_lectura_staff on public.reportes;
create policy reportes_lectura_staff on public.reportes
  for select to authenticated
  using (public.es_staff() or public.es_autoridad());

commit;

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. VERIFICACIÓN. Correr DESPUÉS y revisar que no quede ninguna `allow_all` en estas seis
--    y que cada una tenga sus cuatro políticas.
-- ───────────────────────────────────────────────────────────────────────────────
-- select tablename, policyname, cmd
-- from   pg_policies
-- where  schemaname = 'public'
--   and  tablename in ('clases','espacios','edificios','materias','carreras','facultades')
-- order  by tablename, cmd, policyname;
--
-- PRUEBA MANUAL, que es la que vale:
--   1. Con un admin: crear y borrar un aula de prueba. Debe funcionar.
--   2. Con un técnico: editar un horario. Debe funcionar.
--   3. Con un estudiante: su horario debe seguir viéndose.
--   4. Con un decano: ver las cuatro pantallas; guardar debe fallar.
--
-- ───────────────────────────────────────────────────────────────────────────────
-- 6. LO QUE NO CUBRE: quedan otras tablas con `allow_all` (inventario, asignaciones,
--    ordenes_mantenimiento, recursos, formatos…). Las autoridades no entran a esas pantallas,
--    así que no es urgente para ESTA función, pero el agujero sigue abierto para el resto.
--    Para listar las que faltan:
--
-- select tablename from pg_policies
-- where schemaname = 'public' and policyname = 'allow_all'
-- order by tablename;
-- ───────────────────────────────────────────────────────────────────────────────
