-- 0022 · Un docente no puede repetirse (garantía en la base, no solo en el formulario)
--
-- La pantalla Usuarios ya avisa si el nombre existe, pero eso es una comprobación de cliente:
-- dos administradores guardando a la vez ven la lista sin duplicado y ambos pasan. Un docente
-- duplicado no da error visible; simplemente reparte sus clases entre dos fichas y al asignar
-- horario nadie sabe cuál de las dos elegir.
--
-- Se usa un ÍNDICE ÚNICO (no un trigger) a propósito: el índice lo resuelve el motor de forma
-- atómica, mientras que un trigger que consulta y luego inserta tiene la misma carrera que el
-- formulario. La comparación normaliza mayúsculas, tildes y espacios sobrantes, para que
-- "PEREZ GOMEZ ANA" y "Pérez  Gómez  Ana" cuenten como la misma persona.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ANTES DE EJECUTAR: si ya hay docentes duplicados, la creación del índice FALLA.
-- Es lo correcto: obliga a depurarlos primero. Esta consulta los lista.
--
--   select lower(translate(u.nombre, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) as normalizado,
--          count(*), array_agg(u.id), array_agg(u.nombre)
--     from public.usuarios u join public.roles r on r.id = u.id_rol
--    where r.nombre = 'Docente' group by 1 having count(*) > 1;
--
-- Si sale algo: en Horarios mueve las clases a UNA sola ficha y recién ahí borra la otra en
-- Usuarios. Al revés da error de clave foránea.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Ejecutar en Supabase → SQL Editor.

-- El predicado de un índice no admite subconsultas, así que el id del rol se resuelve aquí y
-- se incrusta como literal. Si algún día cambian los ids de `roles`, hay que rehacer el índice.
do $$
declare
  v_id_rol_docente integer;
begin
  select id into v_id_rol_docente from public.roles where nombre = 'Docente';

  if v_id_rol_docente is null then
    raise exception 'No existe el rol Docente en public.roles; ejecuta antes la migración 0012.';
  end if;

  execute format(
    $ddl$
      create unique index if not exists usuarios_docente_nombre_unico
        on public.usuarios (lower(translate(trim(regexp_replace(nombre, '\s+', ' ', 'g')), %L, %L)))
        where id_rol = %s
    $ddl$,
    'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun', v_id_rol_docente
  );
end $$;

comment on index public.usuarios_docente_nombre_unico is
  'Impide dos docentes con el mismo nombre ignorando mayúsculas, tildes y espacios repetidos.';

-- Verificación: debe aparecer una fila.
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public' and indexname = 'usuarios_docente_nombre_unico';
