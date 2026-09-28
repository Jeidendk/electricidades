-- 0038 · Documentos que son un ENLACE, no un archivo subido
--
-- EL PROBLEMA
-- Guardar un documento con su URL fallaba con:
--     invalid input value for enum tipo_formato: "ENLACE"
-- `formatos.tipo` es el enum `tipo_formato`, cuyas únicas etiquetas son `DINAMICO` y `PDF`.
-- La pantalla ya no sube archivos —los documentos viven en OneDrive o Drive y se registra su
-- dirección—, así que hacía falta una etiqueta para ese tercer origen.
--
-- Se agrega una etiqueta en vez de reutilizar `PDF` porque no es lo mismo: un enlace no tiene
-- archivo en el bucket, no tiene peso que mostrar y se abre en otra pestaña en lugar de
-- descargarse. Marcarlo `PDF` obligaría a adivinar el origen mirando si `archivo_path` está
-- vacío, que es justo el tipo de comprobación indirecta que se rompe sola.
--
-- De paso se registra aquí la columna `enlace`, que existe en la base pero no constaba en
-- ninguna migración: recrear el esquema desde cero lo dejaría sin ella.
--
-- Ejecutar en Supabase → SQL Editor. NO va dentro de begin/commit: `alter type ... add value`
-- y el uso de esa etiqueta no pueden compartir transacción.

alter type public.tipo_formato add value if not exists 'ENLACE';

alter table public.formatos add column if not exists enlace text;

comment on column public.formatos.enlace is
  'URL del documento cuando tipo = ENLACE. El repositorio guarda la dirección, no una copia.';


-- ---------------------------------------------------------------------------
-- Comprobación · las tres etiquetas y la columna.
-- ---------------------------------------------------------------------------
select enumlabel from pg_enum
 where enumtypid = 'public.tipo_formato'::regtype
 order by enumsortorder;

select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'formatos' and column_name = 'enlace';
