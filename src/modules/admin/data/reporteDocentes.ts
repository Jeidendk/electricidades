import { calcularDuracion } from '../components/Horarios/horariosData';
import type { ClaseUI } from '../components/Horarios/mapearClases';
import { normalizarTexto } from '../../../lib/texto';

/** Un bloque de clase tal como aparece en el horario de un docente. */
export interface BloqueDocente {
  dia: string;
  horaInicio: string;
  horaFin: string;
  horas: number;
  materia: string;
  carrera: string;
  pao: number | null;
  paralelo: number | null;
  aula: string;
  edificio: string;
}

/** Carga semanal de un docente, con su horario completo. */
export interface ResumenDocente {
  idDocente: string;
  docente: string;
  /** Nombres de materia sin repetir; una materia puede dictarse en varios bloques. */
  materias: string[];
  /** Aulas distintas donde dicta. */
  aulas: string[];
  horasSemana: number;
  bloques: BloqueDocente[];
}

const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

/** Ordena por día de la semana y, dentro del día, por hora de inicio. */
const compararBloques = (a: BloqueDocente, b: BloqueDocente) => {
  const diferenciaDia = ORDEN_DIAS.indexOf(normalizarTexto(a.dia)) - ORDEN_DIAS.indexOf(normalizarTexto(b.dia));
  return diferenciaDia !== 0 ? diferenciaDia : a.horaInicio.localeCompare(b.horaInicio);
};

const sinRepetir = (valores: string[]) =>
  [...new Set(valores.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

/**
 * Agrupa las clases por docente: cuántas horas dicta por semana, qué materias y su horario.
 *
 * Las clases sin docente asignado se descartan: no representan carga de nadie y ensuciarían
 * el listado con una fila "Sin docente".
 */
export const resumirDocentes = (clases: ClaseUI[]): ResumenDocente[] => {
  const porDocente = new Map<string, ResumenDocente>();

  for (const clase of clases) {
    if (!clase.idDocente) continue;

    if (!porDocente.has(clase.idDocente)) {
      porDocente.set(clase.idDocente, {
        idDocente: clase.idDocente,
        docente: clase.docente,
        materias: [],
        aulas: [],
        horasSemana: 0,
        bloques: [],
      });
    }

    const resumen = porDocente.get(clase.idDocente)!;
    const horas = calcularDuracion(clase.horaInicio, clase.horaFin);

    resumen.horasSemana += horas;
    resumen.bloques.push({
      dia: clase.dia,
      horaInicio: clase.horaInicio,
      horaFin: clase.horaFin,
      horas,
      materia: clase.materia,
      carrera: clase.carrera,
      pao: clase.pao,
      paralelo: clase.paralelo,
      aula: clase.aula,
      edificio: clase.edificio,
    });
  }

  return [...porDocente.values()]
    .map(resumen => ({
      ...resumen,
      materias: sinRepetir(resumen.bloques.map(bloque => bloque.materia)),
      aulas: sinRepetir(resumen.bloques.map(bloque => bloque.aula)),
      bloques: [...resumen.bloques].sort(compararBloques),
    }))
    .sort((a, b) => a.docente.localeCompare(b.docente, 'es'));
};

export const CABECERAS_CSV_DOCENTES = [
  'Docente', 'Día', 'Hora inicio', 'Hora fin', 'Horas',
  'Materia', 'PAO', 'Paralelo', 'Carrera', 'Aula', 'Edificio',
];

/**
 * Una fila por bloque de clase: es el detalle que sirve para revisar o archivar.
 * `nombreEdificio` se recibe de fuera porque los edificios viven en otro store y este módulo
 * se mantiene puro, sin dependencias de datos.
 */
export const filasCsvDocentes = (
  resumenes: ResumenDocente[],
  nombreEdificio: (id: string) => string,
): string[][] =>
  resumenes.flatMap(resumen =>
    resumen.bloques.map(bloque => [
      resumen.docente, bloque.dia, bloque.horaInicio, bloque.horaFin, String(bloque.horas),
      bloque.materia,
      bloque.pao != null ? String(bloque.pao) : '',
      bloque.paralelo != null ? String(bloque.paralelo) : '',
      bloque.carrera, bloque.aula, nombreEdificio(bloque.edificio),
    ]),
  );

/**
 * Umbral de horas semanales a partir del cual se considera que un docente tiene carga
 * completa. **Es un valor por confirmar con la dirección de carrera**: no existe en la base
 * ni en ningún reglamento cargado, así que vive aquí, con nombre, para cambiarlo en un sitio.
 */
export const HORAS_CARGA_COMPLETA = 16;

export type EstadoCarga = 'completa' | 'parcial' | 'sin_carga';

export const ETIQUETA_ESTADO_CARGA: Record<EstadoCarga, string> = {
  completa: 'Carga completa',
  parcial: 'Carga parcial',
  sin_carga: 'Sin carga',
};

export const estadoDeCarga = (horasSemana: number): EstadoCarga => {
  if (horasSemana <= 0) return 'sin_carga';
  return horasSemana >= HORAS_CARGA_COMPLETA ? 'completa' : 'parcial';
};

export interface MetricasDocentes {
  totalDocentes: number;
  totalMaterias: number;
  totalHoras: number;
  /** Cuántos docentes hay en cada estado, para el gráfico de reparto. */
  porEstado: Record<EstadoCarga, number>;
}

/** Cifras de cabecera del reporte. Todas salen de las clases cargadas, ninguna es estimada. */
export const metricasDocentes = (resumenes: ResumenDocente[]): MetricasDocentes => {
  const materias = new Set<string>();
  const porEstado: Record<EstadoCarga, number> = { completa: 0, parcial: 0, sin_carga: 0 };

  for (const resumen of resumenes) {
    for (const materia of resumen.materias) materias.add(materia);
    porEstado[estadoDeCarga(resumen.horasSemana)] += 1;
  }

  return {
    totalDocentes: resumenes.length,
    totalMaterias: materias.size,
    totalHoras: resumenes.reduce((suma, resumen) => suma + resumen.horasSemana, 0),
    porEstado,
  };
};

/** Filtra por nombre de docente o de materia, ignorando tildes y mayúsculas. */
export const filtrarResumenes = (resumenes: ResumenDocente[], busqueda: string): ResumenDocente[] => {
  const termino = normalizarTexto(busqueda);
  if (!termino) return resumenes;

  return resumenes.filter(resumen =>
    normalizarTexto(resumen.docente).includes(termino) ||
    resumen.materias.some(materia => normalizarTexto(materia).includes(termino)),
  );
};
