/** Transcripción de la estructura entregada por la carrera. No incluye documentos. */
export interface CarpetaReferencia { codigo: string; nombre: string; padre: string | null; orden: number }
type Rama = string | [string, Rama[]];
const estructura: Rama[] = [
  ['Programas analíticos', ['Nivelación 2025', 'Carrera 2026']],
  'Sílabos',
  ['POA', ['2024', '2025', '2026']],
  'Reconocimientos profesores', 'Reconocimientos estudiantes', 'Movilidad estudiantil', 'Experiencia graduados',
  ['Gestión de calidad y servicios', [
    ['Evidencias de evaluación y acreditación', [
      ['Pertinencia y desarrollo curricular', ['Pertinencia y prospectiva', ['Diseños curriculares', ['Diseño inicial 2021', 'Rediseño 2025']], 'Líneas de investigación']],
      ['Planificación y gestión de carrera', ['Normativa institucional', 'Planificación académica y administrativa', ['Informes de gestión', [
        ['2024', ['abr', 'may', 'jun', 'jul', 'sep', 'oct', 'nov', 'dic']],
        ['2025', ['ene', 'mar', 'abr', 'may', 'jun', 'sep', 'oct', 'nov', 'dic']],
        ['2026', ['ene–jul (carpeta conjunta)']],
      ]]]],
      ['Seguimiento del proceso académico', ['Seguimiento y evaluación del sílabo', 'Resultados de aprendizaje', 'Prácticas formativas', 'Informes TAC',
        ['Capacitación estudiantil', ['Cursos 2024-2S', 'Cursos 2025-2S', 'Cursos 2026-1S']], 'Asignaturas online',
        ['Actividades complementarias', ['2024', '2025', '2026']], 'Instrumentos y aula virtual', ['Estrategias didácticas', ['2025', '2026']],
      ]],
      'Tutorías y acompañamiento',
      ['Titulación y graduados', ['Seguimiento del proceso de titulación', 'Eficiencia terminal de titulación', 'Seguimiento y retroalimentación de graduados']],
      ['Personal académico', ['Afinidad y rotación docente', 'Trayectoria y desarrollo docente', 'Movilidad, becas y redes', 'Capacitación docente', 'Evaluación docente']],
      ['Investigación, innovación, vinculación y transferencia', ['Proyectos de investigación e innovación', 'Proyectos de vinculación', 'Transferencia de tecnología y conocimiento']],
      ['Prácticas preprofesionales y convenios', ['Laborales', 'Servicio comunitario', 'Convenios gestionados']],
      ['Ambientes de aprendizaje y recursos', [['Manuales de laboratorios', [['Normativa Lab Electricidad', ['Propuesta Braulio']]]], 'Ambientes de aprendizaje', 'Herramientas pedagógicas']],
    ]],
    ['Información, procesos y formatos estudiantiles', [
      'Formatos de trámites académicos',
      ['Prácticas preprofesionales', ['Formatos anexos A–F', ['Servicio comunitario', ['Ayudantía: docencia e investigación']]]],
      ['Proceso de titulación', ['Referencias IEEE']],
    ]],
  ]],
];

function aplanar(ramas: Rama[], padre: string | null = null): CarpetaReferencia[] {
  return ramas.flatMap((rama, index) => {
    const numero = String(index + 1).padStart(2, '0');
    const codigo = padre ? `${padre}.${numero}` : numero;
    const nombre = typeof rama === 'string' ? rama : rama[0];
    return [{ codigo, nombre, padre, orden: index + 1 }, ...aplanar(typeof rama === 'string' ? [] : rama[1], codigo)];
  });
}
export const carpetasReferencia = aplanar(estructura);

export type PerfilRepositorioId = 'todos' | 'estudiantes' | 'docentes' | 'gestion';

export interface PerfilRepositorio {
  id: PerfilRepositorioId;
  nombre: string;
  descripcion: string;
  /** Categorías principales visibles para el perfil; sus descendientes se incluyen solos. */
  codigos: string[];
}

/**
 * Vistas del repositorio por público. Una categoría puede aparecer en más de una vista porque
 * tutorías, titulación o vinculación producen documentación útil para varios perfiles.
 */
export const perfilesRepositorio: PerfilRepositorio[] = [
  { id: 'todos', nombre: 'Todo el repositorio', descripcion: 'Todas las categorías institucionales.', codigos: [] },
  { id: 'estudiantes', nombre: 'Estudiantes', descripcion: 'Trámites, prácticas, titulación, movilidad y acompañamiento.', codigos: ['05', '06', '07', '08.01.04', '08.01.05', '08.01.08', '08.02'] },
  { id: 'docentes', nombre: 'Docentes', descripcion: 'Planificación, seguimiento académico, personal y recursos.', codigos: ['01', '02', '03', '04', '08.01.03', '08.01.04', '08.01.06', '08.01.07', '08.01.09'] },
  { id: 'gestion', nombre: 'Gestión de calidad', descripcion: 'Acreditación, planificación, normativa y evidencias.', codigos: ['03', '05', '07', '08.01'] },
];

export interface ProcesoRepositorio {
  id: string;
  publico: 'Estudiantes' | 'Docentes' | 'Gestión de calidad';
  titulo: string;
  descripcion: string;
  carpeta: string;
  busqueda?: string;
  orientacion: string;
}

/** Rutas documentales, no requisitos o plazos normativos inventados. */
export const procesosRepositorio: ProcesoRepositorio[] = [
  { id: 'inasistencia', publico: 'Estudiantes', titulo: 'Justificación de inasistencia', descripcion: 'Encuentra la solicitud y sus documentos de apoyo.', carpeta: '08.02.01', busqueda: 'inasistencia', orientacion: 'Consulta el formato vigente y completa los datos, fechas y asignaturas que solicite. Revisa los respaldos y el canal de presentación con la carrera.' },
  { id: 'convalidaciones', publico: 'Estudiantes', titulo: 'Convalidaciones', descripcion: 'Ubica solicitudes de homologación y convalidación.', carpeta: '08.02.01', orientacion: 'Revisa la solicitud aplicable y la normativa institucional. Los requisitos dependen del tipo de convalidación; confírmalos antes de presentar la documentación.' },
  { id: 'practicas', publico: 'Estudiantes', titulo: 'Prácticas preprofesionales', descripcion: 'Anexos A–F, servicio comunitario y documentos del proceso.', carpeta: '08.02.02', orientacion: 'Abre la carpeta del proceso y revisa los anexos disponibles. Confirma con el responsable qué documentos corresponden al inicio, seguimiento y cierre.' },
  { id: 'ayudantias', publico: 'Estudiantes', titulo: 'Ayudantías', descripcion: 'Documentos de docencia e investigación.', carpeta: '08.02.02.02.01', orientacion: 'Revisa los formatos disponibles y confirma la convocatoria, responsables y fechas vigentes con la carrera.' },
  { id: 'titulacion', publico: 'Estudiantes', titulo: 'Proceso de titulación', descripcion: 'Formatos del proceso y referencias IEEE.', carpeta: '08.02.03', orientacion: 'Selecciona los documentos que correspondan a tu modalidad y etapa. Confirma el cronograma vigente y los requisitos con la coordinación de titulación.' },
  { id: 'movilidad', publico: 'Estudiantes', titulo: 'Movilidad estudiantil', descripcion: 'Consulta documentos y formatos de movilidad.', carpeta: '06', orientacion: 'Revisa la documentación de movilidad y verifica la convocatoria y condiciones aplicables antes de preparar la solicitud.' },
  { id: 'silabos', publico: 'Docentes', titulo: 'Sílabos y programas analíticos', descripcion: 'Planificación de asignaturas y contenidos académicos.', carpeta: '02', orientacion: 'Consulta los sílabos disponibles. Los programas analíticos se encuentran en la carpeta 01 del repositorio.' },
  { id: 'seguimiento', publico: 'Docentes', titulo: 'Seguimiento académico', descripcion: 'Resultados de aprendizaje, prácticas formativas e informes TAC.', carpeta: '08.01.03', orientacion: 'Ubica la subcarpeta del tipo de evidencia y verifica el período antes de registrar o utilizar un documento.' },
  { id: 'tutorias', publico: 'Docentes', titulo: 'Tutorías y acompañamiento', descripcion: 'Organiza documentos de seguimiento y apoyo estudiantil.', carpeta: '08.01.04', orientacion: 'Consulta los formatos de tutoría y acompaña cada registro con el período y la asignatura que corresponda.' },
  { id: 'didacticas', publico: 'Docentes', titulo: 'Estrategias didácticas', descripcion: 'Planificación y evidencias organizadas por año.', carpeta: '08.01.03.09', orientacion: 'Elige el año y consulta los documentos disponibles para planificación y reporte.' },
  { id: 'personal', publico: 'Docentes', titulo: 'Personal académico', descripcion: 'Afinidad, trayectoria, capacitación y evaluación.', carpeta: '08.01.06', orientacion: 'Selecciona la subcarpeta correspondiente al tipo de documento del personal académico.' },
  { id: 'normativa', publico: 'Gestión de calidad', titulo: 'Normativa y planificación', descripcion: 'Normativa institucional y gestión de carrera.', carpeta: '08.01.02', orientacion: 'Verifica la fecha, resolución y vigencia de cada documento antes de usarlo como referencia.' },
  { id: 'curricular', publico: 'Gestión de calidad', titulo: 'Pertinencia y currículo', descripcion: 'Prospectiva, diseños curriculares e investigación.', carpeta: '08.01.01', orientacion: 'Consulta las evidencias de pertinencia y distingue el diseño inicial del rediseño en sus respectivas carpetas.' },
  { id: 'ambientes', publico: 'Gestión de calidad', titulo: 'Ambientes y laboratorios', descripcion: 'Manuales, ambientes de aprendizaje y herramientas pedagógicas.', carpeta: '08.01.09', orientacion: 'Revisa los manuales y evidencias del espacio. La disponibilidad horaria se consulta en el módulo Horarios.' },
  { id: 'investigacion', publico: 'Gestión de calidad', titulo: 'Investigación y vinculación', descripcion: 'Proyectos, innovación y transferencia de conocimiento.', carpeta: '08.01.07', orientacion: 'Organiza las evidencias por proyecto y por su función: investigación, vinculación o transferencia.' },
];
