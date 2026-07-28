-- 0008_usuarios_datos_registro.sql
-- Expone en public.usuarios los datos capturados en el formulario de registro
-- que hoy sólo viven en la metadata de auth.users (código, facultad, carrera, PAO).
-- Además deja lista la columna para "última conexión" (ya existía; no se altera).
--
-- Cómo aplicar: pégalo en Supabase → SQL Editor → Run. Es idempotente y no destructivo.

-- 1) Columnas nuevas (no rompe nada si ya existen).
alter table public.usuarios
  add column if not exists codigo_institucional text,
  add column if not exists facultad_nombre      text,
  add column if not exists carrera_nombre        text,
  add column if not exists pao                   integer;

-- 2) Backfill de los usuarios existentes desde la metadata de auth.users.
--    (auth.users es accesible en el SQL Editor con privilegios de servicio.)
update public.usuarios u
set
  codigo_institucional = coalesce(u.codigo_institucional, nullif(au.raw_user_meta_data->>'codigo_institucional', '')),
  facultad_nombre      = coalesce(u.facultad_nombre,      nullif(au.raw_user_meta_data->>'facultad_nombre', '')),
  carrera_nombre       = coalesce(u.carrera_nombre,       nullif(au.raw_user_meta_data->>'carrera_nombre', '')),
  pao                  = coalesce(u.pao,                  nullif(au.raw_user_meta_data->>'pao', '')::int)
from auth.users au
where au.id = u.id;

-- Nota: los nuevos inicios de sesión sincronizan estos campos automáticamente
-- desde el cliente (authStore.syncPerfilOnLogin), sin necesidad de modificar triggers.
