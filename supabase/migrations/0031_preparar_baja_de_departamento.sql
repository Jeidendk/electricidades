-- 0031 · Preparar la baja de `departamento` y eliminar `especialidad`
--
-- SE EJECUTA ANTES DEL DESPLIEGUE, y no rompe nada por sí sola.
--
-- `departamento` guarda lo mismo que `facultad_nombre`: en cada escritura de la pantalla
-- Usuarios se les asigna el mismo valor. Es la misma duplicación que se quitó del nombre, pero
-- aquí NO hay ningún trigger que las mantenga sincronizadas: si alguien escribe solo una de las
-- dos, se separan en silencio.
--
-- Las dos únicas filas donde hoy difieren son administradores, y no es una diferencia real: el
-- código pone `''` en una rama y `NULL` en la otra para decir lo mismo, "sin facultad".
--
-- POR QUÉ EN TRES ETAPAS
-- Borrar sí admite hacerse por partes, al revés que el renombrado de la 0030:
--   1. (esta) `departamento` deja de ser obligatoria. El código actual la sigue escribiendo.
--   2. Despliegue: el código deja de leerla y escribirla, y usa `facultad_nombre`.
--   3. (0032) se borra la columna y se quita del trigger de auth.
-- En ningún momento hay código pidiendo una columna que no existe: cero minutos de corte.
--
-- Ejecutar en Supabase → SQL Editor.


-- ---------------------------------------------------------------------------
-- Paso 1 · Comprobar que `especialidad` sigue vacía antes de borrarla.
-- Debe dar `con_dato = 0`. Si no, PARAR y mirar qué hay ahí.
-- ---------------------------------------------------------------------------
select count(*) as filas, count(especialidad) as con_dato from public.usuarios;


-- ---------------------------------------------------------------------------
-- Paso 2 · Fuera `especialidad`.
-- No la escribe ni la lee nadie: aparecía solo en `database.types.ts`, el archivo de tipos
-- escrito a mano, nunca en una consulta ni en una pantalla.
-- ---------------------------------------------------------------------------
alter table public.usuarios drop column if exists especialidad;


-- ---------------------------------------------------------------------------
-- Paso 3 · `departamento` deja de ser obligatoria.
-- Esto es lo que permite que el despliegue siguiente deje de escribirla sin que fallen los
-- INSERT. La columna sigue ahí y con sus datos: todavía no se borra nada.
-- ---------------------------------------------------------------------------
alter table public.usuarios alter column departamento drop not null;

comment on column public.usuarios.departamento is
  'EN RETIRADA (migracion 0032). Duplica facultad_nombre; usar esa.';


-- ---------------------------------------------------------------------------
-- Comprobación · `especialidad` no debe aparecer, y `departamento` debe salir como YES.
-- ---------------------------------------------------------------------------
select column_name, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'usuarios'
   and column_name in ('departamento', 'facultad_nombre', 'especialidad')
 order by column_name;
