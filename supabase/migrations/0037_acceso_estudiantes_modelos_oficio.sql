-- 0037 · Lectura de modelos de oficio para estudiantes
--
-- El repositorio administrativo conserva escritura exclusiva para staff. Esta política añade
-- únicamente lectura de plantillas dinámicas activas clasificadas para estudiantes.

begin;

alter table public.series_formatos enable row level security;
alter table public.formatos enable row level security;

drop policy if exists series_formatos_estudiantes_lee on public.series_formatos;
create policy series_formatos_estudiantes_lee on public.series_formatos
  for select to authenticated
  using (
    publico = 'estudiantes'
    or codigo = any (array['05', '06', '07', '08.01.04', '08.01.05', '08.01.08', '08.02'])
    or codigo like any (array['05.%', '06.%', '07.%', '08.01.04.%', '08.01.05.%', '08.01.08.%', '08.02.%'])
  );

drop policy if exists formatos_estudiantes_lee_modelos on public.formatos;
create policy formatos_estudiantes_lee_modelos on public.formatos
  for select to authenticated
  using (
    tipo = 'DINAMICO'
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

