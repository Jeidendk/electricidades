-- 0049 · Restaurar un cambio desde la auditoría
--
-- Requiere la 0048. Permite deshacer un movimiento registrado:
--   DELETE → vuelve a insertar la fila con los datos que tenía.
--   UPDATE → devuelve a su valor anterior SOLO los campos que ese movimiento cambió.
--   INSERT → borra la fila que se creó.
--
-- POR QUÉ UNA FUNCIÓN Y NO ESCRIBIRLO DESDE EL NAVEGADOR: restaurar toca tablas con reglas
-- (claves foráneas, ids únicos) y necesita comprobaciones que no se pueden confiar al cliente.
-- Además debe ser atómica: a medias deja la base peor que antes.
--
-- LO QUE NO HACE, Y HAY QUE SABERLO:
--   · NO restaura en cascada. Si al borrar un aula se borraron también sus clases, restaurar el
--     aula NO devuelve las clases: son movimientos distintos y hay que restaurarlos uno por uno,
--     el aula primero. Hacerlo automático significaría adivinar qué borrados van juntos.
--   · NO revive lo que la fila referenciaba. Si el edificio del aula también se borró, la
--     restauración falla por clave foránea hasta que se restaure el edificio.
--   · La restauración QUEDA REGISTRADA como un movimiento más (los triggers de la 0048 siguen
--     activos). Deshacer no borra el rastro: se suma a él.
--
-- Ejecutar en Supabase → SQL Editor, DESPUÉS de la 0048.

begin;

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. Marcar qué movimientos ya se restauraron, para no restaurar dos veces.
-- ───────────────────────────────────────────────────────────────────────────────
alter table public.auditoria add column if not exists restaurado_en  timestamptz;
alter table public.auditoria add column if not exists restaurado_por uuid references public.usuarios(id) on delete set null;

comment on column public.auditoria.restaurado_en is
  'Cuándo se deshizo este movimiento. Null = no se ha restaurado.';

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. La función.
--    SECURITY DEFINER porque escribe en tablas sobre las que quien restaura puede no tener
--    permiso directo; el control es `is_admin()`, comprobado en la primera línea.
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.restaurar_auditoria(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v           public.auditoria%rowtype;
  v_cols      text;
  v_existe    boolean;
  v_actual    jsonb;
  v_campo     text;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede restaurar cambios.';
  end if;

  select * into v from public.auditoria where id = p_id;
  if not found then
    raise exception 'El movimiento % no existe.', p_id;
  end if;

  if v.restaurado_en is not null then
    raise exception 'Ese movimiento ya se restauró el %.', to_char(v.restaurado_en, 'DD/MM/YYYY HH24:MI');
  end if;

  if v.registro_id is null then
    raise exception 'El movimiento no guardó el id del registro: no se puede ubicar qué restaurar.';
  end if;

  -- Solo tablas que la 0048 audita. El valor viene del propio trigger, pero la lista acota el
  -- SQL dinámico a un conjunto conocido en vez de confiar en el contenido de una fila.
  if not exists (
    select 1 from information_schema.triggers
     where trigger_name = 'auditar_' || v.tabla
       and event_object_table = v.tabla
  ) then
    raise exception 'La tabla % no está bajo auditoría: no se restaura desde aquí.', v.tabla;
  end if;

  -- ── DELETE → volver a insertar ──────────────────────────────────────────────
  if v.operacion = 'DELETE' then
    execute format('select exists (select 1 from public.%I where id::text = $1)', v.tabla)
      into v_existe using v.registro_id;

    if v_existe then
      raise exception 'Ya existe un registro con ese id: alguien lo volvió a crear. Revísalo antes de restaurar.';
    end if;

    -- Si falta algo a lo que la fila apuntaba (su edificio, su materia), esto falla con 23503
    -- y el mensaje del cliente lo explica. Es lo correcto: insertar una fila huérfana sería peor.
    execute format(
      'insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)',
      v.tabla, v.tabla
    ) using v.datos_antes;

  -- ── UPDATE → devolver los campos que cambiaron ──────────────────────────────
  elsif v.operacion = 'UPDATE' then
    execute format('select to_jsonb(t) from public.%I t where t.id::text = $1', v.tabla)
      into v_actual using v.registro_id;

    if v_actual is null then
      raise exception 'El registro ya no existe: primero restaura su eliminación.';
    end if;

    -- Si alguien lo modificó DESPUÉS de este movimiento, revertir pisaría ese cambio más nuevo
    -- sin avisar. Se compara contra el estado que este movimiento dejó.
    foreach v_campo in array v.campos_cambiados loop
      if v_actual -> v_campo is distinct from v.datos_despues -> v_campo then
        raise exception
          'El campo "%" cambió después de este movimiento. Restaurar borraría ese cambio más reciente; revísalo primero.',
          v_campo;
      end if;
    end loop;

    select string_agg(format('%I', c), ', ') into v_cols
      from unnest(v.campos_cambiados) as c;

    execute format(
      'update public.%I t set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where t.id::text = $2',
      v.tabla, v_cols, v_cols, v.tabla
    ) using v.datos_antes, v.registro_id;

  -- ── INSERT → borrar lo que se creó ──────────────────────────────────────────
  elsif v.operacion = 'INSERT' then
    execute format('select exists (select 1 from public.%I where id::text = $1)', v.tabla)
      into v_existe using v.registro_id;

    if not v_existe then
      raise exception 'El registro ya no existe: no hay nada que deshacer.';
    end if;

    -- Si de ese registro cuelga algo (un horario en el aula), la clave foránea lo impide y el
    -- mensaje lo explica. No se fuerza: borrar en cascada desde aquí sería destruir más de lo pedido.
    execute format('delete from public.%I where id::text = $1', v.tabla) using v.registro_id;
  end if;

  update public.auditoria
     set restaurado_en = now(), restaurado_por = auth.uid()
   where id = p_id;

  return format('Movimiento %s sobre %s restaurado.', v.operacion, v.tabla);
end;
$$;

comment on function public.restaurar_auditoria(bigint) is
  'Deshace un movimiento de la bitácora. Solo administradores. La restauración queda registrada.';

revoke all on function public.restaurar_auditoria(bigint) from public, anon;
grant execute on function public.restaurar_auditoria(bigint) to authenticated;

commit;

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. Verificación sugerida (en una fila de prueba, NO sobre datos reales):
--      1. Crear un espacio cualquiera.
--      2. Editarle el nombre. Borrarlo.
--      3. En la bitácora, restaurar el DELETE → vuelve con el nombre editado.
--      4. Restaurar el UPDATE → vuelve al nombre original.
--      5. Comprobar que cada restauración generó su propio movimiento.
--
-- select id, tabla, operacion, registro_etiqueta, restaurado_en
-- from   public.auditoria
-- order  by created_at desc
-- limit  20;
