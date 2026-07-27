-- Campos que el formulario de Estructura Académica edita pero no existían en BD.
-- Sin estas columnas, N° PAO / Director / Estado (carrera) y Decano / Estado (facultad)
-- se descartaban silenciosamente al guardar.

alter table public.carreras
  add column if not exists semestres integer not null default 9,
  add column if not exists director text not null default 'No Asignado',
  add column if not exists estado text not null default 'activo';

alter table public.facultades
  add column if not exists decano text not null default 'No Asignado',
  add column if not exists estado text not null default 'activo';
