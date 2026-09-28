# Repositorio y procesos de Electricidad

La pantalla Recursos → Repositorio conserva `/admin/formatos` y `/tecnico/formatos`.
Tiene tres vistas: Procesos y formatos, Repositorio documental y Consultas y servicios.

## Activación de las carpetas

1. Respaldar la base antes de ejecutar migraciones.
2. Si no existe `series_formatos`, aplicar `supabase/migrations/0033_series_y_archivos_de_formatos.sql`.
3. Aplicar `supabase/migrations/0034_estructura_repositorio_electricidad.sql` en el SQL Editor de Supabase.
4. Recargar el sistema. Verificar las ocho raíces y las ramas 08.01 (evaluación y acreditación) y 08.02 (procesos estudiantiles).

La migración 0034 crea 96 carpetas según la imagen de referencia. Es transaccional y repetible por código. Reutiliza carpetas con el mismo nombre exacto (ignorando mayúsculas y espacios exteriores) dentro del mismo padre. No elimina ni mueve documentos. Carpetas antiguas con nombres abreviados o diferentes se conservan por separado; revisar su clasificación manualmente antes de fusionar nada.

`src/modules/admin/data/repositorioElectricidad.ts` contiene la referencia del árbol y las rutas de los procesos. Los códigos son estables aunque se renombre la carpeta. La prueba comprueba que SQL y referencia coincidan.

## Uso

- Procesos: elegir Estudiantes, Docentes o Gestión de calidad y abrir los documentos relacionados. Estas categorías organizan contenido; no crean roles ni permisos.
- Repositorio: navegar por carpetas, buscar documentos, descargar archivos o usar el generador existente. Editar un documento permite cambiar su carpeta. En móvil hay un selector de carpetas.
- Consultas: búsqueda por nombre, descripción y carpeta; accesos al horario y material académico del sistema. El asistente externo se abre en una pestaña y se identifica como externo.
- La estructura se puede consultar antes de activar la migración. Las carpetas aún no creadas aparecen pendientes y no simulan tener archivos.

## Alcance

No se importaron los 109 documentos del sitio externo ni sus bases de estudiantes, respuestas normativas o servicios de IA. Las orientaciones locales sirven para localizar documentos y requieren verificar requisitos y vigencia con la carrera. Los permisos existentes de administrador/técnico se conservan; no se publicó evidencia institucional a estudiantes.

La carga actual de archivos utiliza Supabase Storage. Google Drive y OAuth no están conectados en esta etapa. No se han creado credenciales de Google ni desplegado APIs nuevas. La migración 0034 está preparada localmente y debe ejecutarse en la base del proyecto antes de utilizar sus carpetas.

## Validación

`node --experimental-strip-types --test src/modules/admin/data/repositorioElectricidad.test.ts`

`npm run build`
