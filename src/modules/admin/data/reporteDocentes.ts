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

/** Filtra por nombre de docente o de materia, ignorando tildes y mayúsculas. */
export const filtrarResumenes = (resumenes: ResumenDocente[], busqueda: string): ResumenDocente[] => {
  const termino = normalizarTexto(busqueda);
  if (!termino) return resumenes;

  return resumenes.filter(resumen =>
    normalizarTexto(resumen.docente).includes(termino) ||
    resumen.materias.some(materia => normalizarTexto(materia).includes(termino)),
  );
};
