-- 0025 · Nombres y apellidos para TODOS los roles (no solo docentes)
--
-- La 0021 agregó `nombres` y `apellidos` pensando en docentes. Ahora los capturan los cuatro
-- roles, en el alta administrativa, en el registro público y en "Mi perfil".
--
-- QUÉ HACE ESTA MIGRACIÓN
--   1. Un diagnóstico para ver qué falta por repartir.
--   2. Un trigger que COMPONE `nombre` a partir de los dos campos.
--   3. Un CHECK que impide dejar el reparto a medias (uno lleno y el otro vacío).
--
-- QUÉ **NO** HACE, A PROPÓSITO
--   · No reparte ningún nombre automáticamente. Los docentes se repartieron en la 0021 solo
--     cuando tenían exactamente 4 términos; el resto se corrige a mano desde la pantalla
--     Usuarios. Y hay un motivo extra para no hacerlo aquí: los docentes estaban guardados
--     como APELLIDOS NOMBRES, pero los administradores y técnicos están al revés
--     ("BRAULIO PAUL BALSECA DAHUA" = NOMBRES APELLIDOS). Un mismo reparto automático
--     acertaría en un grupo y se equivocaría en el otro.
--   · No pone `nombres`/`apellidos` en NOT NULL. Ver la nota del final: falta actualizar
--     antes el trigger `on_auth_user_created`, que hoy crea la fila solo con `nombre`.
--
-- Ejecutar en Supabase → SQL Editor.


-- ---------------------------------------------------------------------------
-- Paso 1 · Diagnóstico. Cuántas fichas faltan por repartir, por rol.
-- ---------------------------------------------------------------------------
select r.nombre                                                   as rol,
       count(*)                                                   as fichas,
       count(*) filter (where u.nombres is not null
                          and u.apellidos is not null)            as repartidas,
       count(*) filter (where u.nombres is null
                          and u.apellidos is null)                as sin_repartir,
       count(*) filter (where (u.nombres is null) <> (u.apellidos is null)) as a_medias
  from public.usuarios u
  join public.roles r on r.id = u.id_rol
 group by r.nombre
 order by r.nombre;


-- ---------------------------------------------------------------------------
-- Paso 2 · `nombre` se compone, no se teclea.
--
-- `nombre` es el nombre completo canónico: lo leen los horarios, los avatares y el índice
-- único de docentes. Lo escriben CUATRO sitios distintos (el alta administrativa, el registro
-- público a través del trigger de auth, "Mi perfil" y la sincronización del primer acceso), y
-- basta que uno se olvide de recomponerlo para que diga algo distinto de lo que muestran los
-- dos campos.
--
-- Se resuelve con un trigger BEFORE y no con una columna GENERATED a propósito: una columna
-- generada hace **fallar** todo INSERT o UPDATE que mencione `nombre`, incluido el trigger de
-- auth que crea las cuentas nuevas. Eso obligaría a cambiar la base y las cuatro rutas de
-- escritura en el mismo instante, y mientras tanto nadie podría registrarse. El trigger da la
-- misma garantía sin ese corte.
-- ---------------------------------------------------------------------------
create or replace function public.componer_nombre_usuario()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  -- Solo actúa cuando la ficha está repartida. Las que todavía no lo están conservan su
  -- `nombre` tal como se guardó: no se inventa un reparto.
  if coalesce(btrim(new.nombres), '') <> '' and coalesce(btrim(new.apellidos), '') <> '' then
    new.nombres   := upper(btrim(regexp_replace(new.nombres,   '\s+', ' ', 'g')));
    new.apellidos := upper(btrim(regexp_replace(new.apellidos, '\s+', ' ', 'g')));
    new.nombre    := new.nombres || ' ' || new.apellidos;
  end if;
  return new;
end;
$fn$;

comment on function public.componer_nombre_usuario() is
  'Mantiene usuarios.nombre igual a "NOMBRES APELLIDOS" cuando la ficha tiene los dos campos.';

drop trigger if exists componer_nombre on public.usuarios;

-- `update of` limita el disparo a las columnas del nombre: un update de `ultima_conexion`
-- o del avatar no tiene por qué pasar por aquí.
create trigger componer_nombre
  before insert or update of nombre, nombres, apellidos on public.usuarios
  for each row execute function public.componer_nombre_usuario();


-- ---------------------------------------------------------------------------
-- Paso 3 · O están los dos campos, o ninguno.
--
-- Una ficha con apellidos y sin nombres muestra media identidad y hace creer que la otra
-- mitad no existe. NOT VALID: la regla rige de aquí en adelante y no bloquea las filas que
-- todavía están a medias (las del "a_medias" del paso 1).
-- ---------------------------------------------------------------------------
alter table public.usuarios
  drop constraint if exists usuarios_nombre_repartido_check;

alter table public.usuarios
  add constraint usuarios_nombre_repartido_check
  check ((nombres is null) = (apellidos is null))
  not valid;


-- ---------------------------------------------------------------------------
-- Paso 4 · Fichas que quedan por repartir a mano, desde la pantalla Usuarios.
-- Al guardarlas, el trigger del paso 2 recompone `nombre` solo.
-- ---------------------------------------------------------------------------
select r.nombre                                              as rol,
       u.nombre                                              as guardado,
       array_length(string_to_array(btrim(u.nombre), ' '), 1) as terminos,
       u.nombres,
       u.apellidos
  from public.usuarios u
  join public.roles r on r.id = u.id_rol
 where u.nombres is null or u.apellidos is null
 order by r.nombre, u.nombre;


-- ---------------------------------------------------------------------------
-- PENDIENTE (no se hace aquí): poner `nombres` y `apellidos` en NOT NULL.
--
-- Bloqueado por el trigger `on_auth_user_created` de auth.users (migración 0016): crea la
-- fila de public.usuarios tomando `nombre` de raw_user_meta_data, pero no conoce los dos
-- campos nuevos, así que toda cuenta nueva nacería con ellos en NULL y el registro fallaría.
--
-- Mientras tanto no se pierden: el formulario los manda en la metadata y `syncPerfilOnLogin`
-- los guarda en el primer acceso.
--
-- Para poder avanzar hace falta el código actual de ese trigger:
--
--   select p.prosrc
--     from pg_trigger t
--     join pg_proc p on p.oid = t.tgfoid
--    where t.tgrelid = 'auth.users'::regclass
--      and not t.tgisinternal;
--
-- Con eso se le agregan `nombres` y `apellidos`, y recién después:
--
--   alter table public.usuarios validate constraint usuarios_nombre_repartido_check;
--   alter table public.usuarios alter column nombres   set not null;
--   alter table public.usuarios alter column apellidos set not null;
-- ---------------------------------------------------------------------------
