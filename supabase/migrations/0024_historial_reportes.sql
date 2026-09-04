-- 0024 · Historial de reportes generados
--
-- La pantalla Reportes mostraba un historial vacío con un comentario que decía que la tabla no
-- existía, y "Generar" era un setTimeout con un alert: no guardaba ni producía nada.
--
-- Se guarda SOLO EL REGISTRO, no el archivo: qué se generó, con qué filtros, cuándo y quién.
-- El archivo se vuelve a producir cuando haga falta, que para un horario que cambia cada
-- semestre es preferible a acumular copias en Storage.
--
-- Ejecutar en Supabase → SQL Editor.

create table if not exists public.reportes (
  id           uuid primary key default gen_random_uuid(),
  tipo         text        not null,
  formato      text        not null,
  -- Qué se pidió: búsqueda, edificio, periodo… Varía por tipo de reporte, de ahí el jsonb.
  filtros      jsonb       not null default '{}'::jsonb,
  -- Cuántas filas salieron, para saber si el informe venía vacío sin regenerarlo.
  filas        integer     not null default 0,
  generado_por uuid        references public.usuarios(id) on delete set null,
  created_at   timestamptz not null default now()
);

comment on table public.reportes is
  'Bitácora de reportes generados. Solo el registro: el archivo no se almacena.';

create index if not exists reportes_created_at_idx on public.reportes (created_at desc);

alter table public.reportes enable row level security;

-- Solo el personal (admin y técnico) genera y consulta reportes.
create or replace function public.es_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.usuarios u
      join public.roles r on r.id = u.id_rol
     where u.id = auth.uid()
       and r.nombre in ('Administrador', 'Tecnico')
  );
$$;

drop policy if exists reportes_lectura_staff on public.reportes;
create policy reportes_lectura_staff on public.reportes
  for select to authenticated
  using (public.es_staff());

drop policy if exists reportes_alta_staff on public.reportes;
create policy reportes_alta_staff on public.reportes
  for insert to authenticated
  with check (public.es_staff() and generado_por = auth.uid());

-- Un historial no se edita: sin políticas de update ni delete, RLS los bloquea.

-- Verificación.
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'reportes'
 order by ordinal_position;
