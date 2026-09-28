-- 0039 · El estudiante también ve los documentos enlazados
--
-- EL PROBLEMA
-- La política de la 0037 exigía `tipo = 'DINAMICO'`, escrita cuando ese era el único origen de
-- documentos que existía. Desde la 0038 hay un segundo (`ENLACE`: el documento vive en OneDrive
-- o Drive y aquí se guarda su dirección), así que un documento enlazado dentro de una categoría
-- para estudiantes no llegaba al cliente: RLS lo filtraba antes.
--
-- Se amplía a los dos tipos y NO se quita la condición: `estado = 'activo'` y la pertenencia a
-- una categoría para estudiantes siguen siendo lo que decide, igual que antes. El repositorio
-- administrativo conserva escritura exclusiva para staff; esto solo es lectura.
--
-- Ejecutar en Supabase → SQL Editor, DESPUÉS de la 0038 (usa la etiqueta que aquella crea).

begin;

drop policy if exists formatos_estudiantes_lee_modelos on public.formatos;
create policy formatos_estudiantes_lee_modelos on public.formatos
  for select to authenticated
  using (
    tipo in ('DINAMICO', 'ENLACE')
    and estado = 'activo'
    and exists (
      select 1
        from public.series_formatos serie
       where serie.id = formatos.id_serie
         and (
           serie.publico = 'estudiantes'
           or serie.codigo = any (array['05', '06', '07', '08.01.04', '08.01.05', '08.01.08', '08.02'])
           or serie.codigo like any (array['05.%', '06.%', '07.%', '08.01.04.%', '08.01.05.%', '08.01.08.%', '08.02.%'])
         )
    )
  );

commit;


-- ---------------------------------------------------------------------------
-- Comprobación · la política debe nombrar los dos tipos.
-- ---------------------------------------------------------------------------
select policyname, qual
  from pg_policies
 where schemaname = 'public' and tablename = 'formatos'
   and policyname = 'formatos_estudiantes_lee_modelos';
