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

| Enum | Etiquetas | Usado en |
|---|---|---|
| `dia_semana` | `Lunes`, `Martes`, `Miercoles`, `Jueves`, `Viernes` — **sin tilde** | `clases.dia` |
| `categoria_inventario` | *(sin verificar)* | `catalogo_equipos.categoria` |
| `estado_catalogo` | *(sin verificar)* | `catalogo_equipos.estado` |
| `estado_usuario` | *(sin verificar)* | `docentes.estado` |
| `estado_edificio` | *(sin verificar)* | `edificios.estado` |
| `tipo_espacio` | *(sin verificar)* | `espacios.tipo` |
| `estado_espacio` | *(sin verificar)* | `espacios.estado` |
| `tipo_formato`, `estado_formato` | *(sin verificar)* | `formatos.tipo`, `formatos.estado` |

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
