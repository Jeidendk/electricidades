# Asistente institucional — fase 1

Esta fase construye la pantalla y los contratos. **No hay modelo de lenguaje**: el servicio
responde que el motor no está configurado y la interfaz lo dice. Nada simula una respuesta.

## Qué funciona hoy

| Función | Estado |
|---|---|
| Conversación (mensajes, historial, cancelar, copiar) | Operativa, sin motor que responda |
| Sugerencias por rol | Operativas — rellenan el cuadro, no responden |
| Buscar documentos | **Operativa**: búsqueda por palabras sobre el repositorio real |
| Base de conocimiento (admin y técnico) | Operativa en lectura; indexar está deshabilitado |
| Respuestas con fuentes | Contrato definido, sin datos que citar |
| Consultas al sistema | Contrato definido, sin implementación |

## Archivos

- `src/lib/asistente/tipos.ts` — contratos: mensajes, respuesta, referencias, estado del motor,
  y las piezas que se reemplazarán (`ProveedorGeneracion`, `ProveedorEmbeddings`,
  `AlmacenVectorial`, `RecuperadorDocumentos`, `ConsultasSistema`, `AlmacenConversaciones`).
- `src/lib/asistente/servicioAsistente.ts` — la única implementación: declara que el motor no
  está configurado. También las sugerencias por rol.
- `src/lib/asistente/baseConocimiento.ts` (+ `.test.ts`, 5 pruebas) — clasifica cada documento
  del repositorio: pendiente, requiere OCR, sin acceso o excluido.
- `src/store/asistenteStore.ts` — conversaciones **en memoria**.
- `src/modules/admin/pages/Asistente.tsx` — la pantalla, con sus tres pestañas.

## Decisiones

**El navegador no habla con el modelo.** La topología prevista es
`navegador → backend autenticado → recuperación y consultas → modelo local`. El backend
comprueba identidad y permisos; lo que el navegador diga sobre su rol no basta.

**`localhost` en el hosting es el hosting.** Si el sitio está desplegado en Vercel, `localhost`
apunta a ese servidor y no a la computadora del administrador. Conectar un modelo que corre en
un equipo de la facultad exigirá una topología explícita —red privada o túnel autenticado—, con
su propia autorización. En esta fase no se abre ningún puerto ni túnel.

**Ninguna configuración sensible en `VITE_*`.** Todo lo que empieza por `VITE_` termina dentro
del paquete que descarga el navegador. La dirección del servicio, el modelo, los límites de
contexto y el tiempo de espera son configuración de servidor.

**Las conversaciones no se persisten.** Pueden contener el trámite personal de un estudiante, y
guardarlas exige antes decidir permisos, retención y borrado. Hoy viven durante la sesión.

**Un enlace no es contenido.** Los documentos que viven en Google Drive o SharePoint aparecen
como *Sin acceso*: el sistema no puede leerlos sin una autorización propia contra ese servicio.
Marcarlos como indexables sería prometer una cita que nunca se podría comprobar.

**Nada se marca como indexado sin vectores reales.** El estado `indexado` solo puede escribirlo
el proceso que extraiga el texto y guarde los vectores. Hasta entonces el botón está
deshabilitado y dice por qué.

**Excluir no borra.** Un documento excluido del asistente sigue en el repositorio.

**Sin SQL generado por el modelo.** Las consultas al sistema son funciones con nombre
(`horarioDelEstudiante`, `espaciosSinClases`…), cada una con su permiso y su forma. Una consulta
escrita por un modelo no se puede revisar antes de ejecutarse.

**El contenido de un documento es información, no instrucciones.** Lo que diga un PDF no cambia
lo que el asistente puede hacer ni a qué datos llega.

## Dónde vivirán los datos

| Dato | Hoy | Previsto |
|---|---|---|
| Documentos | Supabase (`formatos`) y enlaces externos | igual |
| Fragmentos y vectores | no existen | detrás de `AlmacenVectorial`: pgvector o índice local |
| Conversaciones | memoria del navegador | por decidir, con retención y borrado definidos |
| Preguntas | no salen del navegador | backend propio; nunca a un proveedor externo |

Que el modelo sea local no significa que los datos lo sean: los fragmentos y los vectores
contienen el texto de los documentos y necesitan la misma protección que el original.

## Pendiente

1. Backend autenticado que exponga `estadoMotor` y `preguntar`.
2. Extracción de texto (y OCR donde haga falta) + `ProveedorEmbeddings`.
3. Decidir el `AlmacenVectorial` y aplicarle permisos.
4. Implementar `ConsultasSistema` reutilizando lo que ya existe: `horarioEstudianteStore`,
   `disponibilidadEspacios`, catálogo de equipos y solicitudes del usuario.
5. Definir permisos, retención y borrado antes de persistir conversaciones.
6. Decidir si el asistente se abre también al estudiante; hoy la pantalla es de admin y técnico.

## Zona horaria

Las respuestas sobre horarios deben usar `America/Guayaquil`. Todavía no hay consultas de
horario implementadas, así que no hay conversión que revisar.
