-- 0050 · La auditoría deja de registrar el rastro de los inicios de sesión
--
-- Requiere la 0048. Reemplaza `registrar_auditoria()`; no toca la tabla ni los triggers.
--
-- POR QUÉ: `usuarios.ultima_conexion` se actualiza en CADA inicio de sesión, así que la bitácora
-- se llenaba de "Fulano editó a Fulano" sin que nadie hubiera editado nada. En las primeras
-- pruebas, 7 de cada 10 movimientos eran eso, y enterraban los cambios que sí importan.
--
-- Se trata igual que `updated_at` desde la 0048: si lo ÚNICO que cambió es una de esas columnas,
-- no se registra el movimiento. Si cambian junto a un dato real (alguien edita el perfil y además
-- entra), el movimiento sí se registra y esas columnas quedan fuera de la lista de cambios.
--
-- LO QUE SE PIERDE: deja de haber rastro de los inicios de sesión. No es el objetivo de esta
-- bitácora —que es saber quién modifica datos— y Supabase ya guarda esa información aparte,
-- en los registros de Auth.
--
-- Ejecutar en Supabase → SQL Editor. Con el script completo pegado y SIN NADA SELECCIONADO.

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
  v_ignorar  text[] := array['updated_at', 'ultima_conexion'];
begin
  if tg_op = 'INSERT' then
    v_despues := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_antes   := to_jsonb(old);
    v_despues := to_jsonb(new);
  else
    v_antes   := to_jsonb(old);
  end if;
  v_fila := coalesce(v_despues, v_antes);
  v_id   := v_fila ->> 'id';
  v_etiqueta := coalesce(v_fila ->> 'nombre', v_fila ->> 'titulo', v_fila ->> 'codigo', v_fila ->> 'serie', v_fila ->> 'numero');
  if tg_op = 'UPDATE' then
    select array_agg(clave order by clave) into v_campos from jsonb_object_keys(v_despues) as clave where v_despues -> clave is distinct from v_antes -> clave and not (clave = any(v_ignorar));
    if v_campos is null or array_length(v_campos, 1) is null then
      return null;
    end if;
  end if;
  v_usuario := auth.uid();
  insert into public.auditoria (tabla, operacion, registro_id, registro_etiqueta, usuario_id, datos_antes, datos_despues, campos_cambiados) values (tg_table_name, tg_op, v_id, v_etiqueta, v_usuario, v_antes, v_despues, v_campos);
  return null;
end;
$fn_auditar$;

comment on function public.registrar_auditoria() is
  'Trigger AFTER que vuelca cada INSERT/UPDATE/DELETE en public.auditoria. Ignora updated_at y ultima_conexion.';

-- ───────────────────────────────────────────────────────────────────────────────
-- Limpieza de lo ya acumulado. OPCIONAL y NO automática: borra movimientos de la bitácora,
-- así que conviene mirar primero cuántos son y de qué.
--
-- 1) Cuántos sobran:
-- select count(*) from public.auditoria
--  where operacion = 'UPDATE' and tabla = 'usuarios' and campos_cambiados = array['ultima_conexion'];
--
-- 2) Si el número cuadra, borrarlos:
-- delete from public.auditoria
--  where operacion = 'UPDATE' and tabla = 'usuarios' and campos_cambiados = array['ultima_conexion'];
-- ───────────────────────────────────────────────────────────────────────────────
