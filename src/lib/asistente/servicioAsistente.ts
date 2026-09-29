/**
 * Servicio del asistente — fase 1.
 *
 * El motor de lenguaje corre en un servidor y el navegador nunca habla con él directamente:
 * la topología prevista es navegador → backend autenticado → recuperación y consultas → modelo.
 * Mientras ese backend no exista, este módulo devuelve un estado honesto y no responde nada.
 *
 * Reemplazar esto por la implementación real no debería tocar la pantalla: `ServicioAsistente`
 * es el único contrato que la pantalla conoce.
 */
import type {
  ContextoUsuario,
  EstadoMotor,
  RespuestaAsistente,
  ServicioAsistente,
} from './tipos.ts';

/**
 * Qué falta para que el asistente responda. Se muestra tal cual en la interfaz, así que dice
 * lo que hay que hacer y no solo que algo falta.
 */
const MOTIVO_SIN_MOTOR =
  'El motor local todavía no está configurado en el servidor. Mientras tanto puedes buscar '
  + 'documentos del repositorio en la pestaña "Buscar documentos".';

/**
 * Servicio que no responde porque no hay con qué.
 *
 * No devuelve texto de ejemplo ni respuestas prefabricadas: una respuesta inventada sobre un
 * trámite académico es peor que ninguna, porque el estudiante la seguiría.
 */
export const asistenteNoConfigurado: ServicioAsistente = {
  async estadoMotor(): Promise<EstadoMotor> {
    return { configurado: false, detalle: MOTIVO_SIN_MOTOR };
  },

  // La firma completa se conserva aunque hoy no se usen los argumentos: es el contrato que la
  // implementación real tendrá que cumplir, y cambiarlo obligaría a tocar la pantalla.
  async preguntar(): Promise<RespuestaAsistente> {
    return {
      texto: MOTIVO_SIN_MOTOR,
      origen: 'motor-no-configurado',
      documentos: [],
      datos: [],
    };
  },
};

/**
 * El servicio que usa la pantalla.
 *
 * Cuando exista el backend, aquí se elegirá entre este y el real según lo que responda
 * `estadoMotor()`; hoy solo hay uno y la pantalla ya sabe comportarse con él.
 */
export const servicioAsistente: ServicioAsistente = asistenteNoConfigurado;

/**
 * Preguntas sugeridas según quién mira la pantalla.
 *
 * Rellenan el cuadro de consulta; no disparan respuestas. Cada una corresponde a algo que el
 * sistema realmente sabe —horario por carrera/PAO/paralelo, espacios sin clases, catálogo de
 * equipos, documentos del repositorio—, para no prometer lo que no se va a poder contestar.
 */
export const sugerenciasPorRol = (rol: ContextoUsuario['rol']): string[] => {
  if (rol === 'student') {
    return [
      '¿Cómo inicio mis prácticas preprofesionales?',
      '¿Qué documentos necesito para titulación?',
      '¿Dónde tengo mi siguiente clase?',
      '¿Cómo solicito un equipo?',
    ];
  }
  if (rol === 'tecnico') {
    return [
      '¿Qué aulas no tienen clases registradas hoy?',
      '¿Qué equipos están disponibles en el laboratorio?',
      '¿Dónde está el formato de reporte de daño?',
      '¿Qué solicitudes de equipos están pendientes?',
    ];
  }
  return [
    '¿Qué aulas no tienen clases registradas hoy?',
    '¿Qué documentos hay sobre prácticas preprofesionales?',
    '¿Cómo se registra un docente nuevo?',
    '¿Qué formatos existen para titulación?',
  ];
};
