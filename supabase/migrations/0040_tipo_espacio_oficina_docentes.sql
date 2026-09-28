-- 0040 · Las oficinas de docentes son un tipo de espacio
--
-- `espacios.tipo` es el enum `tipo_espacio` y solo tenía `Académica`, `Laboratorio Técnico` y
-- `Laboratorio de Informática`. Una oficina de docentes se registraba como aula o como
-- laboratorio, que es lo único que había, y desde entonces contaba como tal en los KPI.
--
-- La etiqueta se escribe con tildes desde el principio (la 0019 tuvo que renombrar las otras
-- tres porque habían nacido sin ellas).
--
-- Ejecutar en Supabase → SQL Editor. NO va dentro de begin/commit: `alter type ... add value`
-- y el uso de esa etiqueta no pueden compartir transacción.

alter type public.tipo_espacio add value if not exists 'Oficina de Docentes';


-- ---------------------------------------------------------------------------
-- Comprobación · deben salir las cuatro etiquetas.
-- ---------------------------------------------------------------------------
select enumlabel from pg_enum
 where enumtypid = 'public.tipo_espacio'::regtype
 order by enumsortorder;
