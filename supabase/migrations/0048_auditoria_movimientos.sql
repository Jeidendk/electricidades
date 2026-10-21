-- 0048 · Auditoría: quién crea, edita y borra en el sistema
--
-- No había forma de saber quién hizo un cambio. Si un aula desaparecía o un horario cambiaba,
-- la única pista era preguntar. Esto registra cada alta, edición y baja de las tablas que
-- importan, con el usuario, la fecha y qué cambió exactamente.
--
-- POR QUÉ UN TRIGGER Y NO REGISTRARLO DESDE LA APLICACIÓN:
-- un registro escrito por el navegador solo cubre lo que pasa por los botones de la aplicación.
-- Cualquiera con la clave anónima puede llamar a la API REST de Supabase directamente y saltarse
-- ese camino por completo; y un error en el cliente simplemente no registra nada. El trigger vive
-- dentro de la base: se dispara venga el cambio de donde venga, y no se puede omitir desde fuera.
--
-- LO QUE NO CUBRE: quien use la clave `service_role` (tareas del servidor) queda registrado con
-- `usuario_id` nulo, porque no hay sesión de la cual deducirlo. Tampoco registra LECTURAS: saber
-- quién CONSULTÓ un dato necesitaría otro mecanismo y multiplicaría el volumen.
--
-- CÓMO EJECUTARLA. En Supabase → SQL Editor, con el script COMPLETO pegado y SIN NADA
-- SELECCIONADO (si hay texto seleccionado, el editor ejecuta solo eso y corta la función por la
-- mitad: da "syntax error at or near ..." señalando una línea del medio).
-- Si aun así falla, ejecutar los bloques numerados DE A UNO, en orden: 0 y 1, luego 2, luego 3,
-- luego 4. Cada bloque es independiente.

begin;

-- ───────────────────────────────────────────────────────────────────────────────
-- 0. `is_admin()` ya existe en la base (la usan las migraciones 0028 y 0029) pero no está
--    definida en ninguna migración. No se redefine aquí a ciegas: si su definición real
--    difiere de lo que supongamos, cambiaríamos el comportamiento de esas dos. Se comprueba
--    que exista y, si no, se aborta con un mensaje claro.
-- ───────────────────────────────────────────────────────────────────────────────
-- NOTA SOBRE LAS COMILLAS: los bloques se delimitan con etiquetas con nombre
-- (guarda_admin, fn_auditar, enganchar) en vez del delimitador anónimo de dos signos de dólar.
-- El editor SQL de Supabase parte el script por punto y coma, y con el delimitador anónimo puede
-- cortar el cuerpo de una función por la mitad; el trozo suelto da "syntax error at or near ...".
-- Con etiqueta propia el cuerpo viaja entero.
do $guarda_admin$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception
      'Falta la función public.is_admin(). La usan las migraciones 0028 y 0029; créala antes de correr esta.';
  end if;
end $guarda_admin$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. La bitácora.
-- ───────────────────────────────────────────────────────────────────────────────
create table if not exists public.auditoria (
  id               bigint generated always as identity primary key,
  tabla            text        not null,
  operacion        text        not null check (operacion in ('INSERT', 'UPDATE', 'DELETE')),
  -- `text` y no uuid: los ids del proyecto son de los dos tipos ('ESP123…' y uuid).
  registro_id      text,
  -- Etiqueta legible del registro (el nombre del aula, de la materia…) para no tener que ir a
  -- buscar qué era `ESP1738…`, sobre todo cuando la fila ya se borró y no existe adónde ir.
  registro_etiqueta text,
  usuario_id       uuid        references public.usuarios(id) on delete set null,
  datos_antes      jsonb,
  datos_despues    jsonb,
  -- Solo en UPDATE: qué columnas cambiaron. Evita comparar dos jsonb enteros al mostrarlo.
  campos_cambiados text[],
  created_at       timestamptz not null default now()
);

comment on table public.auditoria is
  'Bitácora de altas, ediciones y bajas. Append-only: sin políticas de update ni delete.';

-- El uso real es "lo último primero", y filtrar por tabla, usuario u operación.
create index if not exists auditoria_created_at_idx on public.auditoria (created_at desc);
create index if not exists auditoria_tabla_idx      on public.auditoria (tabla, created_at desc);
create index if not exists auditoria_usuario_idx    on public.auditoria (usuario_id, created_at desc);
create index if not exists auditoria_registro_idx   on public.auditoria (tabla, registro_id);

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. La función del trigger.
--    SECURITY DEFINER para poder escribir en `auditoria` aunque quien provoca el cambio no
--    tenga ningún permiso de escritura sobre ella: justamente no debe tenerlo.
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn_auditar$
declare
  v_antes    jsonb;
  v_despues  jsonb;
  v_campos   text[];
  v_id       text;
  v_etiqueta text;
  v_fila     jsonb;
  v_usuario  uuid;
begin
  if tg_op = 'INSERT' then
    v_despues := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_antes   := to_jsonb(old);
    v_despues := to_jsonb(new);
  else
    v_antes   := to_jsonb(old);
  end if;

  -- La fila de referencia para sacar id y etiqueta: la nueva si existe, si no la vieja.
  v_fila := coalesce(v_despues, v_antes);
  v_id   := v_fila ->> 'id';

  -- Nombre legible. Se prueban varias columnas porque no todas las tablas usan `nombre`.
  -- CADA SENTENCIA EN UNA SOLA LÍNEA, aunque queden largas: partida en varias, el editor SQL
  -- de Supabase la corta y aparece "syntax error" señalando el principio de la segunda línea.
  v_etiqueta := coalesce(v_fila ->> 'nombre', v_fila ->> 'titulo', v_fila ->> 'codigo', v_fila ->> 'serie', v_fila ->> 'numero');

  if tg_op = 'UPDATE' then
    -- Qué columnas cambiaron de verdad. `updated_at` se excluye: lo mueve un trigger en cada
    -- guardado y haría parecer modificada toda fila aunque no se tocara ningún dato real.
    select array_agg(clave order by clave) into v_campos from jsonb_object_keys(v_despues) as clave where v_despues -> clave is distinct from v_antes -> clave and clave <> 'updated_at';

    -- Un UPDATE que no cambia nada no se registra: son la mayoría del ruido de una bitácora
    -- (guardar un formulario sin editar nada) y enterrarían los cambios que sí importan.
    if v_campos is null or array_length(v_campos, 1) is null then
      return null;
    end if;
  end if;

  v_usuario := auth.uid();

  insert into public.auditoria (tabla, operacion, registro_id, registro_etiqueta, usuario_id, datos_antes, datos_despues, campos_cambiados) values (tg_table_name, tg_op, v_id, v_etiqueta, v_usuario, v_antes, v_despues, v_campos);

  return null; -- AFTER trigger: el valor de retorno se ignora.
end;
$fn_auditar$;

comment on function public.registrar_auditoria() is
  'Trigger AFTER que vuelca cada INSERT/UPDATE/DELETE en public.auditoria.';

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. Enganchar el trigger a las tablas que interesan.
--    Para auditar una tabla nueva basta agregarla a esta lista y volver a correr el bloque.
-- ───────────────────────────────────────────────────────────────────────────────
do $enganchar$
declare
  t text;
  tablas text[] := array[
    'espacios', 'edificios', 'clases', 'materias', 'carreras', 'facultades',
    'inventario', 'usuarios', 'asignaciones', 'ordenes_mantenimiento',
    'prestamos', 'solicitudes_equipo', 'solicitudes_admin', 'formatos', 'recursos'
  ];
begin
  foreach t in array tablas loop
    -- Se saltean las que no existan en esta base en vez de abortar la migración entera.
    if to_regclass('public.' || t) is null then
      raise notice 'Tabla % inexistente: se omite.', t;
      continue;
    end if;

    execute format('drop trigger if exists %I on public.%I', 'auditar_' || t, t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.registrar_auditoria()',
      'auditar_' || t, t
    );
    raise notice 'Auditoría activada en %.', t;
  end loop;
end $enganchar$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. RLS. Solo el administrador lee; NADIE escribe desde la API.
--    Sin políticas de insert/update/delete, RLS las bloquea todas. El trigger escribe igual
--    porque es SECURITY DEFINER y su dueño es el propietario de la tabla.
--    Una bitácora que su propio sujeto puede editar no sirve de nada.
-- ───────────────────────────────────────────────────────────────────────────────
alter table public.auditoria enable row level security;

drop policy if exists auditoria_lectura_admin on public.auditoria;
create policy auditoria_lectura_admin on public.auditoria
  for select to authenticated
  using (public.is_admin());

commit;

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. Verificación: provocar un cambio y mirar que quede registrado.
-- ───────────────────────────────────────────────────────────────────────────────
-- select tabla, operacion, registro_etiqueta, campos_cambiados, usuario_id, created_at
-- from   public.auditoria
-- order  by created_at desc
-- limit  20;

-- Triggers activos:
-- select event_object_table, trigger_name
-- from   information_schema.triggers
-- where  trigger_name like 'auditar_%'
-- order  by event_object_table;

-- ───────────────────────────────────────────────────────────────────────────────
-- 6. CRECIMIENTO. Cada UPDATE guarda la fila entera dos veces (antes y después). En las tablas
--    que se tocan seguido esto crece rápido, y el plan gratuito de Supabase da 500 MB de base.
--    Conviene purgar lo viejo de forma periódica. NO se programa aquí: dejarlo corriendo sin
--    que nadie lo sepa borraría evidencia justo cuando se la necesita. Para hacerlo a mano:
--
-- delete from public.auditoria where created_at < now() - interval '12 months';
--
--    Tamaño actual:
-- select pg_size_pretty(pg_total_relation_size('public.auditoria')) as tamano,
--        count(*) as registros
-- from   public.auditoria;
