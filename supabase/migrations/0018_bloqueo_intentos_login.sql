-- 0018 · Bloqueo de cuenta por intentos fallidos de inicio de sesión
--
-- Tras 3 intentos fallidos la cuenta queda bloqueada 10 minutos. Cada bloqueo posterior
-- duplica la espera (10 → 20 → 40 …) con un tope de 24 horas. Un inicio de sesión correcto
-- limpia el contador.
--
-- El estado vive en la base, no en el navegador: limpiar caché, usar otro equipo o abrir
-- una ventana privada NO evita el bloqueo.
--
-- Ejecutar en Supabase → SQL Editor.

create table if not exists public.intentos_login (
  correo             text primary key,
  intentos_fallidos  integer     not null default 0,
  bloqueos           integer     not null default 0,
  bloqueado_hasta    timestamptz,
  ultimo_intento     timestamptz not null default now()
);

comment on table public.intentos_login is
  'Control de fuerza bruta en el login. Solo se accede mediante las funciones SECURITY DEFINER de abajo.';

-- Nadie toca la tabla directamente: sin políticas, RLS bloquea todo acceso de anon/authenticated.
alter table public.intentos_login enable row level security;
revoke all on table public.intentos_login from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Consulta el estado actual sin modificar nada.
-- ---------------------------------------------------------------------------
create or replace function public.estado_bloqueo_login(p_correo text)
returns table (bloqueado boolean, segundos_restantes integer, intentos_restantes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  c_max_intentos constant integer := 3;
  v_fila public.intentos_login;
begin
  select * into v_fila from public.intentos_login where correo = lower(trim(p_correo));

  if not found then
    return query select false, 0, c_max_intentos;
    return;
  end if;

  if v_fila.bloqueado_hasta is not null and v_fila.bloqueado_hasta > now() then
    return query select
      true,
      ceil(extract(epoch from (v_fila.bloqueado_hasta - now())))::integer,
      0;
    return;
  end if;

  return query select false, 0, greatest(c_max_intentos - v_fila.intentos_fallidos, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Registra un intento fallido y bloquea si se alcanzó el límite.
-- ---------------------------------------------------------------------------
create or replace function public.registrar_intento_fallido(p_correo text)
returns table (bloqueado boolean, segundos_restantes integer, intentos_restantes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  c_max_intentos   constant integer := 3;
  c_minutos_base   constant integer := 10;
  c_minutos_tope   constant integer := 24 * 60;
  v_correo text := lower(trim(p_correo));
  v_fila   public.intentos_login;
  v_minutos integer;
begin
  if v_correo is null or v_correo = '' then
    return query select false, 0, c_max_intentos;
    return;
  end if;

  -- Si el bloqueo anterior ya venció, el contador arranca de nuevo en 1.
  insert into public.intentos_login as i (correo, intentos_fallidos, ultimo_intento)
  values (v_correo, 1, now())
  on conflict (correo) do update
    set intentos_fallidos = case
          when i.bloqueado_hasta is not null and i.bloqueado_hasta <= now() then 1
          else i.intentos_fallidos + 1
        end,
        bloqueado_hasta = case
          when i.bloqueado_hasta is not null and i.bloqueado_hasta <= now() then null
          else i.bloqueado_hasta
        end,
        ultimo_intento = now()
  returning * into v_fila;

  -- Ya estaba bloqueado: se informa el tiempo restante sin alargarlo.
  if v_fila.bloqueado_hasta is not null and v_fila.bloqueado_hasta > now() then
    return query select
      true,
      ceil(extract(epoch from (v_fila.bloqueado_hasta - now())))::integer,
      0;
    return;
  end if;

  if v_fila.intentos_fallidos >= c_max_intentos then
    v_minutos := least(c_minutos_base * power(2, v_fila.bloqueos)::integer, c_minutos_tope);

    update public.intentos_login
       set bloqueado_hasta   = now() + make_interval(mins => v_minutos),
           bloqueos          = bloqueos + 1,
           intentos_fallidos = 0
     where correo = v_correo;

    return query select true, v_minutos * 60, 0;
    return;
  end if;

  return query select false, 0, greatest(c_max_intentos - v_fila.intentos_fallidos, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Limpia el contador del usuario que acaba de autenticarse.
-- No recibe parámetros a propósito: toma el correo del token, de modo que nadie
-- pueda desbloquear una cuenta ajena (ni la propia sin haber entrado).
-- ---------------------------------------------------------------------------
create or replace function public.limpiar_intentos_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correo text := lower(auth.jwt() ->> 'email');
begin
  if v_correo is null or v_correo = '' then
    return;
  end if;

  delete from public.intentos_login where correo = v_correo;
end;
$$;

grant execute on function public.estado_bloqueo_login(text)     to anon, authenticated;
grant execute on function public.registrar_intento_fallido(text) to anon, authenticated;
grant execute on function public.limpiar_intentos_login()        to authenticated;
