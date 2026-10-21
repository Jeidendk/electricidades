-- 0043 · Préstamos trazables: unidad física, reserva y devolución
--
-- EJECUTAR DESPUÉS DE LA 0042 Y ANTES DE DESPLEGAR.
--
-- QUÉ ESTABA MAL
-- 1. `prestamos` no se relacionaba con la solicitud que lo originó: el vínculo era la frase
--    "Generado de solicitud SOL-2026-0042" dentro de `observaciones`. Buscar texto libre no es
--    una relación, y cerrar la solicitud al devolver era imposible sin adivinar.
-- 2. `equipo_id` guardaba el id del **primer** equipo del grupo del catálogo. El catálogo agrupa
--    varias unidades físicas por artículo y ubicación, así que prestar 3 multímetros dejaba tres
--    filas apuntando a la misma unidad y ninguna trazabilidad de cuál salió del laboratorio.
-- 3. La disponibilidad se calculaba como "unidades en estado bueno", sin descontar las que ya
--    estaban prestadas: la misma unidad se podía prestar dos veces.
-- 4. Aprobar eran dos operaciones sueltas desde el navegador (insertar préstamos + actualizar la
--    solicitud). Si la segunda fallaba quedaban préstamos sin solicitud aprobada; dos
--    administradores a la vez duplicaban los préstamos; un doble clic también.
--
-- CÓMO QUEDA
-- Una fila de `prestamos` = **una unidad física** (`id_inventario`), con `cantidad = 1`. La
-- devolución parcial sale gratis: se devuelven las filas que volvieron. La solicitud se cierra
-- sola cuando no le queda ninguna unidad fuera.
--
-- La protección contra doble reserva vive en la base, no en el botón: un índice único parcial
-- impide que una unidad tenga dos préstamos vivos, y la selección de unidades usa
-- `for update ... skip locked`, así que dos aprobaciones simultáneas toman unidades distintas.
--
-- LOS REGISTROS VIEJOS NO SE TOCAN. Las columnas nuevas quedan en NULL: un préstamo anterior
-- sigue diciendo a quién y qué se prestó (`equipo_id`, `equipo_nombre`), solo que sin unidad
-- identificada. El índice único ignora esas filas porque `id_inventario` es NULL.
--
-- Ejecutar en Supabase → SQL Editor.

begin;

-- ---------------------------------------------------------------------------
-- 1 · Numeración de solicitudes en el servidor
--
-- El navegador generaba `SOL-2026-` + 4 dígitos al azar: con 40 solicitudes la probabilidad de
-- choque ya es del 8 %, y el número se imprimía en el comprobante antes de guardar nada.
-- ---------------------------------------------------------------------------
create sequence if not exists public.solicitudes_equipo_numero_seq;

create or replace function public.numero_solicitud_equipo()
returns text
language sql
volatile
set search_path = public
as $$
  select 'SOL-'
      || to_char(now() at time zone 'America/Guayaquil', 'YYYY')
      || '-'
      || lpad(nextval('public.solicitudes_equipo_numero_seq')::text, 5, '0');
$$;

comment on function public.numero_solicitud_equipo() is
  'Número único de solicitud de equipos. La secuencia es la garantía: no hay azar.';

-- La secuencia arranca donde terminó lo que ya existe, para no chocar con los números viejos.
do $$
declare
  v_maximo bigint;
begin
  select coalesce(max(nullif(regexp_replace(numero, '^\D*\d{4}\D*', ''), '')::bigint), 0)
    into v_maximo
    from public.solicitudes_equipo
   where numero ~ '^\D*\d{4}\D*\d+$';

  if v_maximo > 0 then
    perform setval('public.solicitudes_equipo_numero_seq', v_maximo);
  end if;
exception when others then
  -- Un número con otro formato no debe impedir la migración: la secuencia arranca en 1 y el
  -- índice único avisaría de cualquier choque.
  raise notice 'No se pudo alinear la secuencia con los números existentes: %', sqlerrm;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2 · Solicitudes: quién decidió, por qué, y la asignatura de verdad
-- ---------------------------------------------------------------------------
alter table public.solicitudes_equipo
  add column if not exists asignatura_libre text,
  add column if not exists decidido_por     uuid references public.usuarios(id) on delete set null,
  add column if not exists decidido_en      timestamptz,
  add column if not exists motivo_rechazo   text;

comment on column public.solicitudes_equipo.asignatura_libre is
  'Asignatura escrita a mano cuando el estudiante no tiene carrera/PAO con materias cargadas. '
  'Si hay id_materia, esta columna va en NULL.';
comment on column public.solicitudes_equipo.motivo_rechazo is
  'Motivo que el personal escribe al rechazar. El estudiante lo ve en Mis Solicitudes.';

-- `id_materia` era NOT NULL y el formulario mandaba NULL: la solicitud fallaba al insertarse y
-- el error se tragaba un console.error, así que el estudiante creía haberla enviado.
alter table public.solicitudes_equipo alter column id_materia drop not null;

-- El número identifica la solicitud en el comprobante impreso: no puede repetirse.
do $$
begin
  if exists (
    select 1 from public.solicitudes_equipo group by numero having count(*) > 1
  ) then
    raise notice 'Hay números de solicitud repetidos: no se creó el índice único. Depurarlos y repetir.';
  else
    create unique index if not exists solicitudes_equipo_numero_unico
      on public.solicitudes_equipo (numero);
  end if;
end;
$$;

-- La materia debe existir; si algún registro viejo apunta a una que ya no está, se avisa en vez
-- de abortar la migración entera.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'solicitudes_equipo_id_materia_fkey'
  ) and not exists (
    select 1
      from public.solicitudes_equipo s
     where s.id_materia is not null
       and not exists (select 1 from public.materias m where m.id = s.id_materia)
  ) then
    alter table public.solicitudes_equipo
      add constraint solicitudes_equipo_id_materia_fkey
      foreign key (id_materia) references public.materias(id) on delete set null;
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3 · Préstamos: unidad física, solicitud de origen y quién hizo cada cosa
-- ---------------------------------------------------------------------------
create sequence if not exists public.prestamos_id_seq;

alter table public.prestamos
  add column if not exists id_solicitud         bigint  references public.solicitudes_equipo(id) on delete set null,
  add column if not exists id_inventario        text    references public.inventario(id) on delete restrict,
  add column if not exists item_indice          smallint,
  add column if not exists fecha_entrega        date,
  add column if not exists aprobado_por         uuid    references public.usuarios(id) on delete set null,
  add column if not exists entregado_por        uuid    references public.usuarios(id) on delete set null,
  add column if not exists recibido_por         uuid    references public.usuarios(id) on delete set null,
  add column if not exists condicion_devolucion text;

comment on column public.prestamos.id_inventario is
  'Unidad física prestada. Una fila = una unidad; por eso cantidad es 1 en todo lo nuevo.';
comment on column public.prestamos.fecha_entrega is
  'Entrega en mano. `fecha_prestamo` guarda la fecha de aprobación, que es anterior.';
comment on column public.prestamos.condicion_devolucion is
  'Cómo volvió el equipo. Si volvió dañado, el estado físico se corrige en `inventario`; '
  'el estado del préstamo sigue siendo devuelto.';

-- LA PROTECCIÓN REAL: una unidad no puede estar reservada o prestada dos veces.
-- Los préstamos anteriores tienen id_inventario NULL y no entran en el índice.
create unique index if not exists prestamos_unidad_ocupada
  on public.prestamos (id_inventario)
  where id_inventario is not null and estado in ('reservado', 'activo');

create index if not exists prestamos_id_solicitud_idx on public.prestamos (id_solicitud);
create index if not exists prestamos_estudiante_idx   on public.prestamos (id_usuario_estudiante);


-- ---------------------------------------------------------------------------
-- 4 · Qué unidades están ocupadas — lo único que el estudiante necesita saber
--
-- El catálogo del estudiante se arma agrupando `inventario`, y hasta ahora contaba disponible
-- toda unidad en estado `bueno`, aunque estuviera prestada. Necesita descontar las ocupadas,
-- pero NO puede leer `prestamos`: ahí está el nombre de otros estudiantes.
--
-- Esta vista devuelve solo ids de unidad. Sin `security_invoker`, se ejecuta con los permisos
-- de su dueño y por eso no expone las filas de `prestamos` a quien la consulta.
-- ---------------------------------------------------------------------------
create or replace view public.unidades_ocupadas as
  select distinct p.id_inventario as id
    from public.prestamos p
   where p.id_inventario is not null
     and p.estado in ('reservado', 'activo');

comment on view public.unidades_ocupadas is
  'Unidades del inventario con un préstamo vivo (reservado o activo). Solo ids: es lo que el '
  'catálogo necesita para no ofrecer lo que ya está fuera.';

grant select on public.unidades_ocupadas to authenticated;
revoke all on public.unidades_ocupadas from anon;

commit;


-- ---------------------------------------------------------------------------
-- 5 · Operaciones transaccionales
--
-- Todas validan identidad y permisos EN EL SERVIDOR. El navegador ya no inserta préstamos ni
-- cambia estados de solicitud: llama a estas funciones, que se ejecutan enteras o no se
-- ejecutan. `security definer` con `search_path` fijo, y sin permiso para `anon`.
-- ---------------------------------------------------------------------------

-- 5.1 · El estudiante crea su solicitud.
create or replace function public.crear_solicitud_equipo(
  p_id_materia       text,
  p_asignatura_libre text,
  p_items            jsonb,
  p_observacion      text
)
returns public.solicitudes_equipo
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario   uuid := auth.uid();
  v_item      jsonb;
  v_solicitud public.solicitudes_equipo;
  v_ahora     timestamp := now() at time zone 'America/Guayaquil';
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para solicitar equipos.' using errcode = '28000';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La solicitud no tiene equipos.' using errcode = '22023';
  end if;

  if p_id_materia is null and coalesce(btrim(p_asignatura_libre), '') = '' then
    raise exception 'Falta indicar la asignatura.' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce(btrim(v_item ->> 'nombre'), '') = '' then
      raise exception 'Hay un equipo sin nombre en la solicitud.' using errcode = '22023';
    end if;
    if coalesce((v_item ->> 'cantidad')::int, 0) < 1 then
      raise exception 'La cantidad de "%" debe ser al menos 1.', v_item ->> 'nombre'
        using errcode = '22023';
    end if;
  end loop;

  -- Reintento tras un corte de red: si el envío anterior sí llegó, se devuelve esa misma
  -- solicitud en vez de crear una gemela. El estudiante ve un solo número.
  select * into v_solicitud
    from public.solicitudes_equipo s
   where s.id_usuario = v_usuario
     and s.estado = 'Pendiente'
     and s.items = p_items
     and s.created_at > now() - interval '5 minutes'
   order by s.created_at desc
   limit 1;

  if found then
    return v_solicitud;
  end if;

  insert into public.solicitudes_equipo
    (numero, id_usuario, id_materia, asignatura_libre, fecha, hora, estado, items, observacion)
  values
    (public.numero_solicitud_equipo(), v_usuario, p_id_materia,
     nullif(btrim(p_asignatura_libre), ''),
     v_ahora::date, v_ahora::time, 'Pendiente', p_items,
     nullif(btrim(p_observacion), ''))
  returning * into v_solicitud;

  return v_solicitud;
end;
$$;


-- 5.2 · El personal aprueba: reserva unidades concretas. NO entrega nada.
create or replace function public.aprobar_solicitud_equipo(
  p_id   bigint,
  p_dias integer default 7
)
returns setof public.prestamos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sol        public.solicitudes_equipo;
  v_item       jsonb;
  v_indice     smallint := 0;
  v_cantidad   integer;
  v_tomadas    integer;
  v_unidad     record;
  v_fecha      date := (now() at time zone 'America/Guayaquil')::date;
  v_estudiante text;
begin
  if not public.es_staff() then
    raise exception 'Solo el personal autorizado aprueba solicitudes.' using errcode = '42501';
  end if;
  if p_dias is null or p_dias < 1 or p_dias > 180 then
    raise exception 'El plazo debe estar entre 1 y 180 días.' using errcode = '22023';
  end if;

  -- El bloqueo de fila serializa a dos administradores que aprueben a la vez: el segundo espera
  -- y luego encuentra la solicitud ya aprobada.
  select * into v_sol from public.solicitudes_equipo where id = p_id for update;
  if not found then
    raise exception 'La solicitud no existe.' using errcode = 'P0002';
  end if;
  if v_sol.estado <> 'Pendiente' then
    raise exception 'La solicitud ya fue procesada (estado actual: %).', v_sol.estado
      using errcode = '55000';
  end if;

  select coalesce(nullif(btrim(concat_ws(' ', u.nombre, u.apellido)), ''), 'Estudiante')
    into v_estudiante
    from public.usuarios u
   where u.id = v_sol.id_usuario;
  v_estudiante := coalesce(v_estudiante, 'Estudiante');

  for v_item in select * from jsonb_array_elements(v_sol.items) loop
    v_cantidad := greatest(coalesce((v_item ->> 'cantidad')::int, 1), 1);
    v_tomadas  := 0;

    -- `skip locked` evita que dos aprobaciones simultáneas peleen por la misma unidad: la
    -- segunda simplemente toma otra. El índice único es la red por si algo la esquiva.
    for v_unidad in
      select i.id, i.nombre
        from public.inventario i
       where lower(btrim(i.nombre)) = lower(btrim(v_item ->> 'nombre'))
         and (v_item ->> 'categoria' is null or i.categoria::text = v_item ->> 'categoria')
         and (v_item ->> 'id_espacio' is null or i.id_espacio is not distinct from (v_item ->> 'id_espacio'))
         and i.estado = 'bueno'
         and not exists (
           select 1
             from public.prestamos pr
            where pr.id_inventario = i.id
              and pr.estado in ('reservado', 'activo')
         )
       order by i.serie, i.id
       limit v_cantidad
         for update of i skip locked
    loop
      insert into public.prestamos (
        id, id_usuario_estudiante, estudiante_nombre, equipo_id, equipo_nombre, cantidad,
        fecha_prestamo, fecha_devolucion_esperada, estado,
        id_solicitud, id_inventario, item_indice, aprobado_por
      ) values (
        'PRST-' || lpad(nextval('public.prestamos_id_seq')::text, 6, '0'),
        v_sol.id_usuario, v_estudiante, v_unidad.id, v_unidad.nombre, 1,
        v_fecha, v_fecha + p_dias, 'reservado',
        v_sol.id, v_unidad.id, v_indice, auth.uid()
      );
      v_tomadas := v_tomadas + 1;
    end loop;

    if v_tomadas < v_cantidad then
      raise exception 'No hay unidades suficientes de "%": se piden % y hay % libres.',
        v_item ->> 'nombre', v_cantidad, v_tomadas
        using errcode = '23514';
    end if;

    v_indice := v_indice + 1;
  end loop;

  update public.solicitudes_equipo
     set estado         = 'Aprobada',
         decidido_por   = auth.uid(),
         decidido_en    = now(),
         motivo_rechazo = null,
         updated_at     = now()
   where id = p_id;

  return query select * from public.prestamos where id_solicitud = p_id;
end;
$$;


-- 5.3 · Entrega física: la reserva se convierte en préstamo y ahí empieza el plazo.
create or replace function public.entregar_solicitud_equipo(
  p_id   bigint,
  p_dias integer default null
)
returns setof public.prestamos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sol   public.solicitudes_equipo;
  v_fecha date := (now() at time zone 'America/Guayaquil')::date;
begin
  if not public.es_staff() then
    raise exception 'Solo el personal autorizado registra entregas.' using errcode = '42501';
  end if;
  if p_dias is not null and (p_dias < 1 or p_dias > 180) then
    raise exception 'El plazo debe estar entre 1 y 180 días.' using errcode = '22023';
  end if;

  select * into v_sol from public.solicitudes_equipo where id = p_id for update;
  if not found then
    raise exception 'La solicitud no existe.' using errcode = 'P0002';
  end if;
  if v_sol.estado <> 'Aprobada' then
    raise exception 'Solo se entrega una solicitud aprobada (estado actual: %).', v_sol.estado
      using errcode = '55000';
  end if;

  update public.prestamos
     set estado                    = 'activo',
         fecha_entrega             = v_fecha,
         fecha_prestamo            = v_fecha,
         fecha_devolucion_esperada = v_fecha
                                     + coalesce(p_dias, fecha_devolucion_esperada - fecha_prestamo),
         entregado_por             = auth.uid(),
         updated_at                = now()
   where id_solicitud = p_id
     and estado = 'reservado';

  if not found then
    raise exception 'La solicitud no tiene unidades reservadas por entregar.' using errcode = '55000';
  end if;

  update public.solicitudes_equipo
     set estado = 'Entregada', updated_at = now()
   where id = p_id;

  return query select * from public.prestamos where id_solicitud = p_id;
end;
$$;


-- 5.4 · Rechazo, con motivo.
create or replace function public.rechazar_solicitud_equipo(
  p_id     bigint,
  p_motivo text default null
)
returns public.solicitudes_equipo
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sol public.solicitudes_equipo;
begin
  if not public.es_staff() then
    raise exception 'Solo el personal autorizado rechaza solicitudes.' using errcode = '42501';
  end if;

  select * into v_sol from public.solicitudes_equipo where id = p_id for update;
  if not found then
    raise exception 'La solicitud no existe.' using errcode = 'P0002';
  end if;
  if v_sol.estado <> 'Pendiente' then
    raise exception 'Solo se rechaza una solicitud pendiente (estado actual: %).', v_sol.estado
      using errcode = '55000';
  end if;

  update public.solicitudes_equipo
     set estado         = 'Rechazada',
         motivo_rechazo = nullif(btrim(p_motivo), ''),
         decidido_por   = auth.uid(),
         decidido_en    = now(),
         updated_at     = now()
   where id = p_id
  returning * into v_sol;

  return v_sol;
end;
$$;


-- 5.5 · Devolución de UNA unidad. Varias llamadas = devolución parcial.
create or replace function public.devolver_prestamo(
  p_id            text,
  p_condicion     text default 'bueno',
  p_observaciones text default null
)
returns public.prestamos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prestamo public.prestamos;
  v_fecha    date := (now() at time zone 'America/Guayaquil')::date;
  v_pendientes integer;
begin
  if not public.es_staff() then
    raise exception 'Solo el personal autorizado registra devoluciones.' using errcode = '42501';
  end if;
  if p_condicion not in ('bueno', 'malo', 'dañado') then
    raise exception 'Condición de devolución desconocida: %.', p_condicion using errcode = '22023';
  end if;

  select * into v_prestamo from public.prestamos where id = p_id for update;
  if not found then
    raise exception 'El préstamo no existe.' using errcode = 'P0002';
  end if;
  if v_prestamo.estado <> 'activo' then
    raise exception 'Solo se devuelve un préstamo activo (estado actual: %).', v_prestamo.estado
      using errcode = '55000';
  end if;

  update public.prestamos
     set estado               = 'devuelto',
         fecha_devolucion_real = v_fecha,
         recibido_por          = auth.uid(),
         condicion_devolucion  = p_condicion,
         observaciones         = nullif(btrim(concat_ws(' · ', observaciones, p_observaciones)), ''),
         updated_at            = now()
   where id = p_id
  returning * into v_prestamo;

  -- El estado físico es del equipo, no del préstamo: una unidad que vuelve dañada NO vuelve a
  -- estar disponible, y se marca como tal en el inventario.
  if p_condicion <> 'bueno' and v_prestamo.id_inventario is not null then
    update public.inventario
       set estado     = p_condicion::public.estado_inventario,
           danio_desc = coalesce(nullif(btrim(p_observaciones), ''), danio_desc),
           updated_at = now()
     where id = v_prestamo.id_inventario;
  end if;

  -- La solicitud se cierra cuando ya no le queda ninguna unidad fuera.
  if v_prestamo.id_solicitud is not null then
    select count(*) into v_pendientes
      from public.prestamos
     where id_solicitud = v_prestamo.id_solicitud
       and estado in ('reservado', 'activo');

    if v_pendientes = 0 then
      update public.solicitudes_equipo
         set estado = 'Devuelto', updated_at = now()
       where id = v_prestamo.id_solicitud;
    end if;
  end if;

  return v_prestamo;
end;
$$;


-- 5.6 · Cancelación. El estudiante solo puede cancelar la suya y mientras esté pendiente;
--       el personal puede además liberar las unidades de una solicitud ya aprobada.
create or replace function public.cancelar_solicitud_equipo(
  p_id     bigint,
  p_motivo text default null
)
returns public.solicitudes_equipo
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sol   public.solicitudes_equipo;
  v_staff boolean := public.es_staff();
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para cancelar una solicitud.' using errcode = '28000';
  end if;

  select * into v_sol from public.solicitudes_equipo where id = p_id for update;
  if not found then
    raise exception 'La solicitud no existe.' using errcode = 'P0002';
  end if;

  if not v_staff and v_sol.id_usuario is distinct from auth.uid() then
    raise exception 'Solo puedes cancelar tus propias solicitudes.' using errcode = '42501';
  end if;

  if v_sol.estado = 'Pendiente' then
    null;
  elsif v_sol.estado = 'Aprobada' and v_staff then
    update public.prestamos
       set estado = 'cancelado', updated_at = now()
     where id_solicitud = p_id
       and estado = 'reservado';
  else
    raise exception 'Esta solicitud ya no se puede cancelar (estado actual: %).', v_sol.estado
      using errcode = '55000';
  end if;

  update public.solicitudes_equipo
     set estado         = 'Cancelada',
         motivo_rechazo = coalesce(nullif(btrim(p_motivo), ''), motivo_rechazo),
         decidido_por   = case when v_staff then auth.uid() else decidido_por end,
         decidido_en    = case when v_staff then now() else decidido_en end,
         updated_at     = now()
   where id = p_id
  returning * into v_sol;

  return v_sol;
end;
$$;


-- Ninguna de estas funciones es para visitantes sin sesión.
revoke all on function public.crear_solicitud_equipo(text, text, jsonb, text)   from anon;
revoke all on function public.aprobar_solicitud_equipo(bigint, integer)         from anon;
revoke all on function public.entregar_solicitud_equipo(bigint, integer)        from anon;
revoke all on function public.rechazar_solicitud_equipo(bigint, text)           from anon;
revoke all on function public.devolver_prestamo(text, text, text)               from anon;
revoke all on function public.cancelar_solicitud_equipo(bigint, text)           from anon;
revoke all on function public.numero_solicitud_equipo()                         from anon;

grant execute on function public.crear_solicitud_equipo(text, text, jsonb, text) to authenticated;
grant execute on function public.aprobar_solicitud_equipo(bigint, integer)       to authenticated;
grant execute on function public.entregar_solicitud_equipo(bigint, integer)      to authenticated;
grant execute on function public.rechazar_solicitud_equipo(bigint, text)         to authenticated;
grant execute on function public.devolver_prestamo(text, text, text)             to authenticated;
grant execute on function public.cancelar_solicitud_equipo(bigint, text)         to authenticated;


-- ---------------------------------------------------------------------------
-- 6 · RLS
--
-- Las funciones de arriba son `security definer`: se saltan RLS a propósito, porque ya
-- comprobaron identidad y permisos. Lo que sigue cierra el acceso DIRECTO a las tablas, que es
-- por donde hoy se puede aprobar una solicitud propia con una llamada a la API.
-- ---------------------------------------------------------------------------
begin;

alter table public.solicitudes_equipo enable row level security;
alter table public.prestamos          enable row level security;

-- Una política permisiva con `using (true)` anula a todas las demás, porque las permisivas se
-- suman con OR. `allow_all` es el nombre que usan las de este proyecto, pero se buscan por su
-- condición y no por su nombre: una que se llame distinto haría exactamente el mismo daño y
-- pasaría desapercibida. Se imprime cuál se quitó.
do $$
declare
  v_politica record;
begin
  for v_politica in
    select policyname, tablename
      from pg_policies
     where schemaname = 'public'
       and tablename in ('prestamos', 'solicitudes_equipo')
       and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')
  loop
    raise notice 'Se quita la política abierta %.%', v_politica.tablename, v_politica.policyname;
    execute format('drop policy %I on public.%I', v_politica.policyname, v_politica.tablename);
  end loop;
end;
$$;

-- El estudiante ve las suyas; el personal, todas.
drop policy if exists solicitudes_equipo_lectura on public.solicitudes_equipo;
create policy solicitudes_equipo_lectura on public.solicitudes_equipo
  for select to authenticated
  using (id_usuario = auth.uid() or public.es_staff());

-- Sin política de INSERT: la solicitud nace en `crear_solicitud_equipo`, que es quien pone el
-- número y el dueño. Sin política de DELETE: una solicitud no se borra, se cancela.
drop policy if exists solicitudes_equipo_staff_actualiza on public.solicitudes_equipo;
create policy solicitudes_equipo_staff_actualiza on public.solicitudes_equipo
  for update to authenticated
  using (public.es_staff())
  with check (public.es_staff());

-- El estudiante ve sus préstamos; el resto es cosa del personal.
drop policy if exists prestamos_lectura on public.prestamos;
create policy prestamos_lectura on public.prestamos
  for select to authenticated
  using (id_usuario_estudiante = auth.uid() or public.es_staff());

-- El personal conserva el alta manual (préstamo de mostrador, sin solicitud previa) y la
-- corrección de errores. El estudiante no tiene ninguna escritura.
drop policy if exists prestamos_staff_inserta on public.prestamos;
create policy prestamos_staff_inserta on public.prestamos
  for insert to authenticated
  with check (public.es_staff());

drop policy if exists prestamos_staff_actualiza on public.prestamos;
create policy prestamos_staff_actualiza on public.prestamos
  for update to authenticated
  using (public.es_staff())
  with check (public.es_staff());

drop policy if exists prestamos_staff_borra on public.prestamos;
create policy prestamos_staff_borra on public.prestamos
  for delete to authenticated
  using (public.es_staff());

commit;


-- ---------------------------------------------------------------------------
-- 7 · Comprobaciones
-- ---------------------------------------------------------------------------

-- 7.1 · Columnas nuevas de `prestamos` (deben salir 8).
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'prestamos'
   and column_name in ('id_solicitud', 'id_inventario', 'item_indice', 'fecha_entrega',
                       'aprobado_por', 'entregado_por', 'recibido_por', 'condicion_devolucion')
 order by column_name;

-- 7.2 · El índice que impide prestar dos veces la misma unidad.
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public' and indexname = 'prestamos_unidad_ocupada';

-- 7.3 · Las políticas que quedan en las dos tablas.
select tablename, policyname, cmd
  from pg_policies
 where schemaname = 'public' and tablename in ('prestamos', 'solicitudes_equipo')
 order by tablename, policyname;

-- 7.4 · Las seis funciones.
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('crear_solicitud_equipo', 'aprobar_solicitud_equipo',
                     'entregar_solicitud_equipo', 'rechazar_solicitud_equipo',
                     'devolver_prestamo', 'cancelar_solicitud_equipo')
 order by p.proname;

-- 7.5 · Ninguna unidad debería tener dos préstamos vivos (si el índice se creó, es imposible).
select id_inventario, count(*)
  from public.prestamos
 where id_inventario is not null and estado in ('reservado', 'activo')
 group by id_inventario
having count(*) > 1;
