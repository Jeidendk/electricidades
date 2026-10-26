# Plan de cumplimiento de datos personales y seguridad

**Proyecto:** Aplicación de la Facultad de Informática y Electrónica — ESPOCH
**Preparado:** 25 de octubre de 2026
**Estado:** plan de trabajo; los puntos todavía no están implementados.
**Bitácora:** [HISTORIAL_CAMBIOS_CUMPLIMIENTO.md](./HISTORIAL_CAMBIOS_CUMPLIMIENTO.md)

## Objetivo y validación

Organizar los cambios técnicos y de gobernanza identificados en la revisión de la aplicación. Cada bloque puede ser atendido por un Codex distinto. Este plan es técnico, no un dictamen jurídico: Jurídico, DTIC y el Delegado de Protección de Datos (DPD) de ESPOCH deben validar bases legales, finalidades, plazos, avisos, contratos y decisiones institucionales. Revisar la LOPDP, su Reglamento, normativa vigente de la SPDP y políticas vigentes de ESPOCH.

## Instrucciones para cada Codex

1. Antes de iniciar cada bloque, avisar en el chat qué atenderá, qué archivos prevé modificar y cómo comprobará el resultado.
2. Trabajar por bloques. Marcar `[x]` solo cuando se haya implementado y comprobado; `[~]` si queda parcial, explicando lo pendiente.
3. Al terminar cada cambio, avisar qué cambió, qué comprobaciones pasaron o fallaron y qué queda pendiente.
4. Añadir una entrada a `HISTORIAL_CAMBIOS_CUMPLIMIENTO.md` sin borrar ni reescribir entradas anteriores.
5. Diferenciar entre crear una migración y aplicarla. No afirmar que producción está actualizada sin verificarlo.
6. No inventar bases legales, plazos, responsables, contactos ni proveedores aprobados. Dejarlos pendientes de validación institucional.
7. No registrar secretos, credenciales, tokens ni datos personales reales en documentos, mensajes o evidencias.
8. No ejecutar cambios destructivos o de permisos en producción sin la autorización institucional correspondiente; primero preparar y comprobar en pruebas.

## Hallazgos técnicos de partida

Volver a comprobar estos puntos al iniciar el trabajo porque el estado del código o de producción puede haber cambiado:

- `supabase/migrations/0028_rls_usuarios_cerrar_escritura.sql` deja lectura de `public.usuarios` a cualquier autenticado y comenta que falta acotarla por rol. La tabla incluye datos como cédula, correo, firma y última conexión.
- `supabase/migrations/0052_rls_cerrar_escritura_academica.sql` cierra escritura en tablas académicas, pero dice que pueden quedar políticas `allow_all` en otras tablas. El repositorio no demuestra cuáles migraciones están desplegadas.
- El registro recopila datos personales y académicos sin aviso de privacidad visible.
- No se encontró canal de privacidad en la aplicación ni matriz de conservación y eliminación.
- Se exportan horarios por edificio/facultad y carga docente con personas identificables.
- `src/modules/admin/components/Horarios/HorarioVista.tsx` inserta SVG de la base con `dangerouslySetInnerHTML`; revisar sanitización y permisos de carga.
- La app usa proveedores externos para base de datos, hosting y recursos web; confirmar ubicación, contratos y tratamiento con ESPOCH.
- MFA existe, pero puede desactivarse; falta confirmar obligatoriedad por rol.
- `vercel.json` no declara cabeceras de seguridad.
- Hay bitácoras de reportes y cambios en la base; revisar cobertura, acceso y conservación.
- La firma estudiantil se guarda en un bucket privado por usuario; revisar la conservación de copias insertadas en trámites presentados.

## Bloques de trabajo

### Bloque 0 — Validación institucional y alcance

- [ ] Confirmar responsable del tratamiento, unidad administradora y contacto oficial del DPD.
- [ ] Obtener y revisar las políticas DTIC vigentes: Resolución 423.CP.2024, seguridad informática y servicios en la nube.
- [ ] Inventariar ambientes, proyectos Supabase, hosting, región, respaldos y subencargados.
- [ ] Inventariar tablas, buckets, funciones, exportaciones y procesos con datos personales.
- [ ] Documentar titulares, datos, finalidades, base legal propuesta, accesos, destinatarios, conservación y controles.

**Cierre:** alcance y responsables documentados; decisiones legales pendientes asignadas.

### Bloque 1 — Acceso a base de datos (prioridad crítica)

- [ ] Consultar en Supabase las políticas RLS reales de todas las tablas y buckets.
- [ ] Detectar y retirar `allow_all` o políticas equivalentes que den permisos excesivos.
- [ ] Limitar la lectura de `usuarios` por rol y necesidad funcional.
- [ ] En horarios, exponer solo los campos de docente necesarios; excluir cédula, correo, firma y última conexión.
- [ ] Usar vistas/RPC de campos limitados para consultas entre usuarios.
- [ ] Revisar permisos de funciones `SECURITY DEFINER`, `GRANT` y Storage.
- [ ] Impedir que una persona pueda cambiarse el rol o ampliar su ámbito.
- [ ] Probar permisos en pruebas para anónimo, estudiante, docente, coordinador, autoridad, técnico y administrador.

**Cierre:** pruebas por rol pasan y no quedan políticas abiertas sin justificación; documentar por separado lo que falte desplegar.

### Bloque 2 — Aviso de privacidad y transparencia

- [ ] Redactar y aprobar el aviso con Jurídico/DPD.
- [ ] Mostrarlo antes del registro y enlazarlo desde login, perfil y trámites.
- [ ] Informar responsable, DPD, datos recopilados, finalidades, bases legales, encargados/destinatarios, transferencias, conservación y derechos.
- [ ] Distinguir datos obligatorios y opcionales y explicar sus consecuencias.
- [ ] Versionar el aviso y registrar su presentación/aceptación cuando corresponda.
- [ ] Validar que no se use consentimiento genérico para tratamientos obligatorios o finalidades distintas.

**Cierre:** aviso aprobado, visible antes de recopilar datos y versionado.

### Bloque 3 — Derechos de titulares

- [ ] Acordar el proceso para acceso, rectificación/actualización, eliminación, oposición, portabilidad y suspensión.
- [ ] Publicar un canal y contacto oficial aprobado.
- [ ] Implementar un flujo con fecha, tipo, estado, responsable y respuesta.
- [ ] Impedir que una persona acceda a solicitudes de otras.
- [ ] Permitir descarga estructurada de datos propios cuando corresponda.
- [ ] Documentar las excepciones legales que obliguen a conservar datos.
- [ ] Validar plazos y excepciones con Jurídico/DPD.

**Cierre:** canal probado de extremo a extremo y procedimiento aprobado.

### Bloque 4 — Conservación y eliminación

- [ ] Aprobar plazos para perfiles, cédulas, accesos, firmas, trámites, versiones, préstamos, reportes, intentos de login y auditoría.
- [ ] Definir eliminación, bloqueo o anonimización al terminar cada finalidad.
- [ ] Considerar respaldos, Storage, réplicas y exportaciones.
- [ ] Definir qué ocurre con firmas del perfil y copias en trámites presentados.
- [ ] Documentar retención y autorización de purgas de reportes/auditoría.
- [ ] Implementar procesos verificables y registrar su ejecución.

**Cierre:** matriz aprobada y procedimiento comprobable, respetando las obligaciones de archivo institucional.

### Bloque 5 — Reportes y exportaciones

- [ ] Definir roles y alcances para exportar por aula, edificio, carrera y facultad.
- [ ] Limitar coordinadores y autoridades a su ámbito institucional.
- [ ] Incluir solo los datos necesarios en cada reporte.
- [ ] Registrar usuario, fecha, tipo, alcance, formato y volumen exportado.
- [ ] Evaluar marca de agua y leyenda institucional con DPD/Jurídico.
- [ ] Definir manejo de descargas en equipos compartidos.
- [ ] Revisar acceso y conservación de la bitácora de reportes.

**Cierre:** matriz de permisos aprobada y aplicada en interfaz y base de datos.

### Bloque 6 — Proveedores, nube y transferencias

- [ ] Confirmar contratos, proveedor y región de Supabase y hosting.
- [ ] Revisar subencargados, respaldos, soporte, incidentes, devolución y eliminación.
- [ ] Determinar con DPD/Jurídico si hay transferencias internacionales y documentar garantías.
- [ ] Confirmar aprobación de DTIC para servicios en la nube.
- [ ] Inventariar solicitudes a Google Fonts, Unsplash, mapas, Drive y SharePoint.
- [ ] Reducir llamadas externas innecesarias y evaluar alojar recursos localmente.
- [ ] Reflejar destinatarios y finalidades en el aviso.

**Cierre:** proveedores aprobados y acuerdos/evaluaciones documentados; secretos no expuestos al cliente.

### Bloque 7 — Seguridad de aplicación y sesiones

- [x] Sanitizar SVG y bloquear scripts, eventos y referencias externas en los iconos dinámicos de horarios; se reemplazó la inserción HTML por imágenes aisladas y se conservaron formatos heredados seguros.
- [ ] Revisar archivos subidos, tipo MIME, tamaño, rutas y permisos de Storage.
- [ ] Configurar CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
- [ ] Exigir MFA a roles privilegiados y definir recuperación segura.
- [ ] Configurar expiración por inactividad, cierre en equipos compartidos y revocación de sesiones.
- [ ] Evitar datos personales o firmas persistentes en el navegador.
- [ ] Excluir datos personales, credenciales y tokens de logs.
- [ ] Verificar límites contra abuso en login/API y probar restauración de respaldos.

**Cierre:** controles comprobados y revisión documentada en pruebas.

### Bloque 8 — Riesgos, impacto e incidentes

- [ ] Analizar riesgos según datos y volumen, titulares, finalidades, accesos, proveedores y consecuencias de exposición.
- [ ] Consultar al DPD si corresponde evaluación de impacto conforme al artículo 42 de la LOPDP.
- [ ] Mantener inventario de tratamientos y evidencia de controles.
- [ ] Aprobar procedimiento de incidente: detección, contención, investigación, comunicación y notificaciones exigibles.
- [ ] Asignar responsables y canales de escalamiento.
- [ ] Realizar un simulacro y registrar acciones correctivas.

**Cierre:** análisis y procedimiento aprobados, simulacro documentado.

### Bloque 9 — Validación y producción

- [ ] Confirmar migraciones en el ambiente objetivo, sin incluir datos personales en evidencia.
- [ ] Ejecutar pruebas de permisos por rol y exportaciones.
- [ ] Revisar aviso, conservación, contratos e incidentes con DPD/Jurídico/DTIC.
- [ ] Registrar riesgos residuales, aceptación y responsables.
- [ ] Obtener aprobación institucional antes de declarar producción lista.

**Cierre:** aprobación institucional y evidencias disponibles.

## Fuentes

- [Políticas DTIC de ESPOCH](https://www.espoch.edu.ec/politicas_dtic/)
- [Normativa de protección de datos — SPDP](https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/general/normativa/)
- [Derechos de titulares — SPDP](https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/cuales-son-mis-derechos/)
- [Responsable del tratamiento — SPDP](https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/general/responsable-del-tratamiento/)
- [Delegado de Protección de Datos — SPDP](https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/general/delegado-de-proteccion-de-datos/)
- [Seguridad e incidentes — SPDP](https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/general/seguridad-e-incidentes/)
- [LOPDP publicada por la SPDP](https://spdp.gob.ec/wp-content/uploads/2024/12/03.pdf.pdf)

> La página DTIC enumera la Resolución 423.CP.2024 y políticas relacionadas. La comparación numeral por numeral queda pendiente hasta revisar los documentos íntegros vigentes facilitados por ESPOCH/DTIC.
