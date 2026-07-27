-- =====================================================================
-- Lectura pública (anónima) de facultades y carreras
-- =====================================================================
-- El formulario de REGISTRO necesita listar facultades y carreras ANTES
-- de iniciar sesión (usuario anónimo). Con RLS de solo-autenticados, esos
-- selects salen vacíos. Esta migración reemplaza la política de lectura
-- por una que también permite al rol `anon`.
--
-- Aplicar: supabase db push   (o pegar en SQL Editor del panel).
-- Es idempotente (usa drop policy if exists).
-- =====================================================================

drop policy if exists facultades_read on public.facultades;
drop policy if exists carreras_read   on public.carreras;

create policy facultades_read on public.facultades
  for select to anon, authenticated using (true);

create policy carreras_read on public.carreras
  for select to anon, authenticated using (true);
