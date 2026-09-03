-- 0019 · Escribe las etiquetas de enum como se leen en español
--
-- Varias etiquetas se crearon sin tilde ni ñ ("danado", "Miercoles", "Academica",
-- "Reporte de dano"), mientras la interfaz las muestra acentuadas. Eso obligaba a traducir
-- de ida y vuelta en el código y ya causó tres bugs: clases de miércoles invisibles, aulas
-- clasificadas como laboratorio, y equipos que no se podían guardar como dañados.
--
-- RENAME VALUE solo cambia la etiqueta: las filas existentes siguen válidas sin migrar nada,
-- porque Postgres guarda internamente un identificador, no el texto.
--
-- Verificado antes de escribir esto: ninguna función ni política RLS menciona estas etiquetas.
--
-- ORDEN DE APLICACIÓN — importante:
--   1. Ejecutar este archivo en Supabase → SQL Editor.
--   2. Desplegar el código que acompaña a esta migración.
-- Entre ambos pasos, GUARDAR una clase, un espacio, un equipo dañado o una solicitud falla
-- (el formulario todavía manda la etiqueta vieja). Leer sigue funcionando: el código compara
-- normalizando tildes. Hacerlo fuera de horario de uso.

alter type dia_semana           rename value 'Miercoles'                  to 'Miércoles';

alter type estado_inventario    rename value 'danado'                     to 'dañado';

alter type tipo_espacio         rename value 'Academica'                  to 'Académica';
alter type tipo_espacio         rename value 'Laboratorio Tecnico'        to 'Laboratorio Técnico';
alter type tipo_espacio         rename value 'Laboratorio de Informatica' to 'Laboratorio de Informática';

alter type tipo_solicitud_admin rename value 'Reporte de dano'            to 'Reporte de daño';
alter type tipo_solicitud_admin rename value 'Prestamo especial'          to 'Préstamo especial';

-- No se toca `categoria_inventario` ('tecnologico'): es una clave interna en minúsculas que
-- el usuario nunca ve en crudo, así que renombrarla sería churn sin beneficio.

-- Verificación.
select t.typname as enum, e.enumlabel as etiqueta
  from pg_enum e join pg_type t on t.oid = e.enumtypid
 where t.typname in ('dia_semana', 'estado_inventario', 'tipo_espacio', 'tipo_solicitud_admin')
 order by t.typname, e.enumsortorder;
