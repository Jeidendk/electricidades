# Esquema real de la base (referencia)

Volcado desde `information_schema.columns` en Supabase. **No es una migración**: no se ejecuta,
sirve para no adivinar tipos ni valores de enum al escribir consultas.

> **Parcial.** Llega hasta `horario_estudiante`. Faltan las tablas posteriores en orden
> alfabético (`inventario`, `mantenimiento`, `materias`, `prestamos`, `recursos`,
> `solicitudes_admin`, `solicitudes_equipo`, `usuarios`, `roles`…). Completar cuando haga falta.

## Enums — la fuente habitual de errores

Una columna `USER-DEFINED` es un enum de Postgres: solo acepta sus etiquetas exactas.
Escribir un valor que no existe da error 400, y **comparar contra un valor de otro enum
no da error, simplemente no devuelve nada**.

| Enum | Etiquetas exactas |
|---|---|
| `categoria_inventario` | `equipos`, `herramientas`, `mobiliario`, `tecnologico` ⚠️ sin tilde |
| `dia_semana` | `Lunes`, `Martes`, `Miercoles` ⚠️ sin tilde, `Jueves`, `Viernes` |
| `estado_catalogo` | `disponible`, `agotado` |
| `estado_edificio` | `operativo`, `mantenimiento` |
| `estado_espacio` | `disponible`, `ocupada`, `mantenimiento` |
| `estado_formato` | `activo`, `inactivo` |
| `estado_inscripcion` | `inscrito`, `asistiendo`, `completado`, `rechazado` |
| `estado_inventario` | `bueno`, `malo`, `danado` ⚠️ **sin ñ** |
| `estado_ot` | `pendiente`, `en_proceso`, `resuelto` |
| `estado_prestamo` | `activo`, `devuelto` |
| `estado_solicitud` | `Aprobada`, `Pendiente`, `Devuelto`, `Rechazada` ⚠️ **con mayúscula** |
| `estado_solicitud_admin` | `pendiente`, `aprobado`, `rechazado` ⚠️ **minúscula, y en masculino** |
| `estado_usuario` | `activo`, `inactivo` |
| `prioridad_ot` | `baja`, `media`, `alta` |
| `tipo_espacio` | `Academica` ⚠️ sin tilde, `Laboratorio Tecnico`, `Laboratorio de Informatica` |
| `tipo_formato` | `DINAMICO` ⚠️ sin tilde y en mayúsculas, `PDF` |
| `tipo_recurso` | `libro`, `software` |
| `tipo_recurso_rel` | `recomendado`, `obligatorio` |
| `tipo_solicitud_admin` | `Uso de laboratorio`, `Reporte de dano` ⚠️ **sin ñ**, `Oficio`, `Mantenimiento`, `Prestamo especial` ⚠️ sin tilde |

**Ojo con `estado_solicitud` vs `estado_solicitud_admin`:** son enums distintos con grafías
distintas para el mismo concepto (`Pendiente` vs `pendiente`). Ya causó un bug en el Dashboard.

`dia_semana` no lleva tilde mientras la interfaz muestra "Miércoles". La traducción entre
ambos vive en un solo sitio: `diaEnBD()` en `src/modules/admin/components/Horarios/horariosData.ts`.
Para **comparar** días usar `mismoDia()` de `src/lib/texto.ts`, nunca `===`.

Para completar las etiquetas que faltan:

```sql
select t.typname as enum, e.enumlabel as etiqueta
  from pg_enum e join pg_type t on t.oid = e.enumtypid
 where t.typnamespace = 'public'::regnamespace
 order by t.typname, e.enumsortorder;
```

## Columnas

| Tabla | Columna | Tipo |
|---|---|---|
| asignaciones | id, id_espacio, tipo_especialidad, descripcion | text |
| asignaciones | id_tecnico | uuid |
| asignaciones | fecha_desde, fecha_hasta | date |
| asignaciones | activa | boolean |
| asignaciones | created_at | timestamptz |
| carreras | id, id_facultad, nombre, color_hex, icono, custom_svg, director, estado | text |
| carreras | semestres (= N.º de PAO) | integer |
| carreras | created_at, updated_at | timestamptz |
| catalogo_equipos | id, serie, nombre, ubicacion | text |
| catalogo_equipos | categoria | **enum** `categoria_inventario` |
| catalogo_equipos | estado | **enum** `estado_catalogo` |
| catalogo_equipos | stock, stock_total | smallint |
| catalogo_equipos | fotos_json | jsonb |
| catalogo_equipos | created_at, updated_at | timestamptz |
| clases | id, id_materia, id_espacio | text |
| clases | id_docente, creado_por | uuid |
| clases | **dia** | **enum** `dia_semana` |
| clases | hora_inicio, hora_fin | time |
| clases | semana_desde, semana_hasta | date |
| clases | created_at, updated_at | timestamptz |
| docentes | id | uuid |
| docentes | nombre, facultad_nombre | text |
| docentes | estado | **enum** `estado_usuario` |
| edificios | id, nombre, imagen_url, direccion, icono | text |
| edificios | pisos, aulas_academicas, laboratorios, ocupacion_pct, area_m2 | smallint |
| edificios | estado | **enum** `estado_edificio` |
| edificios | rating, lat, lng | numeric |
| edificios | ultimo_mantenimiento | date |
| edificios | created_at, updated_at | timestamptz |
| espacios | id, nombre, id_edificio, equipamiento | text |
| espacios | piso, capacidad, m2 | smallint |
| espacios | tipo | **enum** `tipo_espacio` |
| espacios | estado | **enum** `estado_espacio` |
| espacios | fotos_json | jsonb |
| espacios | lat, lng | numeric |
| espacios | created_at, updated_at | timestamptz |
| facultades | id, siglas, nombre, color_hex, icono, custom_svg, decano, estado | text |
| facultades | created_at, updated_at | timestamptz |
| formatos | id, nombre, descripcion | text |
| formatos | tipo | **enum** `tipo_formato` |
| formatos | estado | **enum** `estado_formato` |
| formatos | datos | jsonb |
| formatos | creado_por | uuid |
| formatos | created_at, updated_at | timestamptz |
| horario_estudiante | id, id_clase | text |
| horario_estudiante | id_usuario | uuid |
