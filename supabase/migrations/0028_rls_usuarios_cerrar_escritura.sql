-- 0028 · Nadie se asciende a administrador
--
-- EL PROBLEMA
-- `public.usuarios` tenía la política `allow_all` con `using (true)` y `with check (true)`
-- para `authenticated`, es decir las cuatro operaciones para cualquiera con sesión iniciada.
-- Cualquier estudiante o técnico podía, con la clave anónima que viaja en el bundle:
--   · leer la tabla completa, con todos los correos institucionales,
--   · cambiar su propio id_rol a Administrador,
--   · borrar usuarios.
--
-- Las otras seis políticas de la tabla ya describían el acceso correcto, pero las políticas
-- permisivas se SUMAN con OR: basta que una diga `true` para que el resto no restrinja nada.
-- Esta migración no inventa reglas: quita `allow_all` y deja actuar a las que ya existían.
--
-- LO QUE **NO** CAMBIA: LA LECTURA
-- Se repone con una política explícita. Cerrarla hoy romperia dos cosas:
--   · el estudiante dejaría de ver el nombre de su docente en el horario (la app lee
--     `usuarios` directamente y solo alcanzaría su propia fila),
--   · el técnico dejaría de ver quién firma en Trámites y Préstamos, porque las políticas de
--     staff solo le dan las filas de rol Docente.
-- Afinar la lectura exige decidir antes qué puede ver un estudiante. Queda pendiente.
--
-- Ejecutar en Supabase → SQL Editor.


-- ---------------------------------------------------------------------------
-- Paso 1 · Fuera la política que anulaba a las demás.
-- ---------------------------------------------------------------------------
drop policy if exists allow_all on public.usuarios;


-- ---------------------------------------------------------------------------
-- Paso 2 · Reponer SOLO la lectura que daba `allow_all`.
-- Explícita y separada, para que se vea que es una decisión y no un descuido.
-- ---------------------------------------------------------------------------
drop policy if exists usuarios_lectura_autenticada on public.usuarios;

create policy usuarios_lectura_autenticada on public.usuarios
  for select to authenticated
  using (true);

comment on policy usuarios_lectura_autenticada on public.usuarios is
  'Lectura abierta a cualquier sesión: el horario del estudiante necesita el nombre del docente y Trámites el del solicitante. PENDIENTE de acotar por rol.';


-- ---------------------------------------------------------------------------
-- Paso 3 · El rol no se cambia uno mismo.
--
-- RLS filtra FILAS, no columnas: `usuarios_self_update` deja a cada quien escribir en su
-- propia fila, y ahí dentro está `id_rol`. Sin esto, quitar `allow_all` no cierra la escalada.
--
-- La excepción de `auth.uid() is null` es deliberada: sin JWT la operación viene del servidor
-- —el trigger que crea la ficha al registrarse, el panel de Supabase, service_role—. Si se
-- bloqueara ahí, el `ON CONFLICT DO UPDATE SET id_rol` del trigger de auth fallaría y las
-- cuentas nuevas volverían a quedarse sin ficha.
-- ---------------------------------------------------------------------------
create or replace function public.proteger_rol_usuario()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  if new.id_rol is distinct from old.id_rol then
    if auth.uid() is null then
      return new;                       -- operación del servidor, no de una sesión
    end if;
    if not public.is_admin() then
      raise exception 'Solo un administrador puede cambiar el rol de un usuario'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$fn$;

comment on function public.proteger_rol_usuario() is
  'Impide que alguien se cambie el id_rol a sí mismo. RLS no puede: filtra filas, no columnas.';

drop trigger if exists proteger_rol on public.usuarios;

create trigger proteger_rol
  before update of id_rol on public.usuarios
  for each row execute function public.proteger_rol_usuario();


-- ---------------------------------------------------------------------------
-- Comprobación 1 · Políticas que quedan. No debe aparecer ninguna con `true` en
-- with_check, salvo la de lectura (que no tiene with_check).
-- ---------------------------------------------------------------------------
select polname,
       case polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                   when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end as operacion,
       pg_get_expr(polqual, polrelid)      as using_expr,
       pg_get_expr(polwithcheck, polrelid) as with_check
  from pg_policy
 where polrelid = 'public.usuarios'::regclass
 order by polname;
