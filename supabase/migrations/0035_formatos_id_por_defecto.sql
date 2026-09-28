-- 0035 · `formatos.id` se genera solo
--
-- EL PROBLEMA
-- Guardar un modelo en el Generador de Oficios fallaba con "Datos incompletos · Falta
-- completar el campo «id»". No faltaba ningún dato del formulario: la columna `formatos.id`
-- es uuid NOT NULL y **no tiene DEFAULT**, así que cualquier INSERT que no la mande a mano es
-- rechazado.
--
-- El cliente la omite en los tres sitios donde inserta, y con razón —el comentario del código
-- dice "id y created_at los genera la BD"—. Lo que faltaba era que la base cumpliera esa parte.
--
-- Arreglarlo aquí y no en el cliente es deliberado: poner `crypto.randomUUID()` en cada
-- llamada obliga a acordarse en todas las futuras, y basta olvidarlo una vez para reproducir
-- el mismo error.
--
-- No toca ninguna fila existente: `set default` solo afecta a los INSERT que vengan después.
--
-- Ejecutar en Supabase → SQL Editor.

alter table public.formatos alter column id set default gen_random_uuid();


-- ---------------------------------------------------------------------------
-- Comprobación 1 · `column_default` debe decir `gen_random_uuid()`.
-- ---------------------------------------------------------------------------
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'formatos' and column_name = 'id';


-- ---------------------------------------------------------------------------
-- Comprobación 2 · ¿Hay MÁS tablas con el mismo defecto?
--
-- Lista las claves primarias uuid que no generan valor solas. Cada una es un error idéntico
-- esperando a que alguien inserte sin mandar el id a mano. Si aparece alguna, se arregla con
-- la misma línea de arriba cambiando el nombre de la tabla.
-- ---------------------------------------------------------------------------
select c.table_name, c.column_name, c.column_default
  from information_schema.columns c
  join information_schema.key_column_usage k
    on k.table_schema = c.table_schema
   and k.table_name = c.table_name
   and k.column_name = c.column_name
  join information_schema.table_constraints t
    on t.constraint_name = k.constraint_name
   and t.table_schema = k.table_schema
   and t.constraint_type = 'PRIMARY KEY'
 where c.table_schema = 'public'
   and c.data_type = 'uuid'
   and c.column_default is null
 order by c.table_name;
