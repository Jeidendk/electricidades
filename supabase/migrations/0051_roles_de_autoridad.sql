-- 0051 · Roles de autoridad: Decano, Subdecano y Coordinador
--
-- Son roles de CONSULTA: ven Horarios, Infraestructura, Estructura Académica y Reportes, y no
-- pueden crear, editar ni eliminar nada. Quien hace cumplir eso es la migración 0052 (RLS);
-- esta solo da de alta los roles.
--
-- EL COORDINADOR SE LIMITA A SU CARRERA. No hace falta columna nueva: `usuarios.carrera_nombre`
-- ya existe y es lo que usa el técnico para lo mismo. Hay que cargarla al crear la cuenta, o el
-- coordinador no verá ninguna carrera (ver el paso 3).
--
-- Ejecutar en Supabase → SQL Editor, con el script completo y SIN NADA SELECCIONADO.

begin;

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. Alta de los tres roles. Idempotente: si ya existen, no se duplican.
--    Los nombres importan: `authStore` los reconoce por texto (ver el paso 4).
-- ───────────────────────────────────────────────────────────────────────────────
insert into public.roles (nombre)
select v.nombre
from   (values ('Decano'), ('Subdecano'), ('Coordinador')) as v(nombre)
where  not exists (select 1 from public.roles r where lower(r.nombre) = lower(v.nombre));

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. Comprobación: deben aparecer los tres con su id.
-- ───────────────────────────────────────────────────────────────────────────────
-- select id, nombre from public.roles order by nombre;

commit;

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. PENDIENTE DE CONFIGURACIÓN, NO ES CÓDIGO.
--    Las cuentas se crean desde Usuarios como cualquier otra, eligiendo el rol nuevo.
--    Al COORDINADOR hay que completarle la carrera: sin `carrera_nombre` no se le filtra nada
--    y Estructura Académica le queda vacía. Para ver quién está sin asignar:
--
-- select u.nombre, u.apellido, u.email, r.nombre as rol, u.carrera_nombre
-- from   public.usuarios u
-- join   public.roles r on r.id = u.id_rol
-- where  lower(r.nombre) = 'coordinador'
--   and  (u.carrera_nombre is null or u.carrera_nombre = '');
-- ───────────────────────────────────────────────────────────────────────────────
