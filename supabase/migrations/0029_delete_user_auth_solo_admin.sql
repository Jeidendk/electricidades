-- 0029 · Borrar una cuenta de acceso es cosa de administradores
--
-- EL PROBLEMA
-- `public.delete_user_auth(uuid)` era, entera:
--
--     DELETE FROM auth.users WHERE id = user_id;
--
-- SECURITY DEFINER, sin ninguna comprobación de quién llama, y expuesta en la API REST a
-- cualquier sesión iniciada. Una sola petición con la clave anónima que ya viaja en el bundle
-- borraba la cuenta de cualquier persona, incluidos todos los administradores.
--
-- Es más grave que lo del rol (0028): aquello daba permisos de más, esto destruye cuentas.
--
-- LA CORRECCIÓN
-- El cuerpo no cambia. Se le antepone la comprobación que le faltaba y se le quita el permiso
-- de ejecución a `anon`, que no tiene por qué llegar a llamarla nunca.
--
-- `is_admin()` funciona bien aquí aunque la función sea SECURITY DEFINER: `auth.uid()` lee el
-- token de la petición, no el rol de base de datos, así que evalúa a quien de verdad llama.
--
-- `search_path` vacío, como estaba: por eso todo va calificado con su esquema.
--
-- Ejecutar en Supabase → SQL Editor.

create or replace function public.delete_user_auth(user_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede eliminar una cuenta de acceso'
      USING errcode = '42501';
  END IF;

  DELETE FROM auth.users WHERE id = user_id;
END;
$function$;

comment on function public.delete_user_auth(uuid) is
  'Borra la cuenta de acceso. Solo administradores: la funcion es SECURITY DEFINER y esta expuesta en la API REST.';

-- Sin sesión no hay administrador posible, así que `anon` no la necesita.
revoke execute on function public.delete_user_auth(uuid) from anon;


-- ---------------------------------------------------------------------------
-- Comprobación · debe seguir siendo SECURITY DEFINER y ya no estar en manos de `anon`.
-- ---------------------------------------------------------------------------
select p.proname,
       p.prosecdef as security_definer,
       has_function_privilege('anon',          p.oid, 'execute') as puede_anon,
       has_function_privilege('authenticated', p.oid, 'execute') as puede_autenticado
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace
   and p.proname = 'delete_user_auth';
