import type { ClaseUI } from '../components/Horarios/mapearClases';
import { esAula, esLaboratorio, esOficina } from './espaciosData';
import { normalizarTexto } from '../../../lib/texto';

/** Un espacio físico que una carrera usa: el aula o laboratorio más su edificio. */
export interface EspacioOcupado {
  idEspacio: string;
  nombre: string;
  tipo: string;
  /** Cuántos bloques de clase de la carrera caen sobre el espacio en la semana. */
  bloques: number;
}

/** Agrupación por edificio dentro de la ocupación de una carrera. */
export interface EdificioOcupado {
  idEdificio: string;
  nombre: string;
  aulas: EspacioOcupado[];
  laboratorios: EspacioOcupado[];
  /** Oficinas y otros espacios que no son aula ni laboratorio. */
  otros: EspacioOcupado[];
}

/** Resumen de ocupación de una carrera: qué edificios y qué espacios usa. */
export interface ResumenOcupacionCarrera {
  idCarrera: string;
  carrera: string;
  idFacultad: string;
  edificios: EdificioOcupado[];
  totalEspacios: number;
  totalAulas: number;
  totalLaboratorios: number;
}

const sinRepetirEspacios = (items: EspacioOcupado[]): EspacioOcupado[] => {
  const mapa = new Map<string, EspacioOcupado>();
  for (const item of items) {
    const previo = mapa.get(item.idEspacio);
    if (previo) {
      previo.bloques += item.bloques;
    } else {
      mapa.set(item.idEspacio, { ...item });
    }
  }
  return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
};

/**
 * Agrupa las clases por carrera → edificio → espacios (separando aulas, laboratorios y otros).
 *
 * Es el reporte que pide la coordinación: "qué aulas y qué laboratorios usa tal carrera, en qué
 * edificios". Se calcula sobre las clases ya cargadas en Horarios; una carrera sin clases
 * programadas no aparece —no sabemos en qué edificio debería estar—.
 *
 * `nombreEdificio` se recibe de fuera porque los edificios viven en otro store y este módulo
 * se mantiene puro, igual que `reporteDocentes`.
 */
export const resumirOcupacionCarreras = (
  clases: ClaseUI[],
  nombreEdificio: (id: string) => string,
): ResumenOcupacionCarrera[] => {
  const porCarrera = new Map<string, {
    resumen: ResumenOcupacionCarrera;
    porEdificio: Map<string, {
      edificio: EdificioOcupado;
      aulas: EspacioOcupado[];
      laboratorios: EspacioOcupado[];
      otros: EspacioOcupado[];
    }>;
  }>();

  for (const clase of clases) {
    if (!clase.idCarrera || !clase.idEspacio) continue;

    if (!porCarrera.has(clase.idCarrera)) {
      porCarrera.set(clase.idCarrera, {
        resumen: {
          idCarrera: clase.idCarrera,
          carrera: clase.carrera || clase.idCarrera,
          idFacultad: clase.idFacultad,
          edificios: [],
          totalEspacios: 0,
          totalAulas: 0,
          totalLaboratorios: 0,
        },
        porEdificio: new Map(),
      });
    }

    const entrada = porCarrera.get(clase.idCarrera)!;
    const idEdificio = clase.edificio || 'sin-edificio';
    if (!entrada.porEdificio.has(idEdificio)) {
      entrada.porEdificio.set(idEdificio, {
        edificio: {
          idEdificio,
          nombre: idEdificio === 'sin-edificio' ? 'Edificio sin asignar' : nombreEdificio(idEdificio),
          aulas: [],
          laboratorios: [],
          otros: [],
        },
        aulas: [],
        laboratorios: [],
        otros: [],
      });
    }

    const grupo = entrada.porEdificio.get(idEdificio)!;
    const espacio: EspacioOcupado = {
      idEspacio: clase.idEspacio,
      nombre: clase.aula,
      tipo: clase.tipoEspacio,
      bloques: 1,
    };
    if (esAula(clase.tipoEspacio)) grupo.aulas.push(espacio);
    else if (esLaboratorio(clase.tipoEspacio)) grupo.laboratorios.push(espacio);
    else if (esOficina(clase.tipoEspacio)) grupo.otros.push(espacio);
    else grupo.otros.push(espacio);
  }

  return [...porCarrera.values()]
    .map(({ resumen, porEdificio }) => {
      const edificios = [...porEdificio.values()]
        .map(grupo => ({
          ...grupo.edificio,
          aulas: sinRepetirEspacios(grupo.aulas),
          laboratorios: sinRepetirEspacios(grupo.laboratorios),
          otros: sinRepetirEspacios(grupo.otros),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

      const totalAulas = edificios.reduce((suma, ed) => suma + ed.aulas.length, 0);
      const totalLaboratorios = edificios.reduce((suma, ed) => suma + ed.laboratorios.length, 0);
      const totalOtros = edificios.reduce((suma, ed) => suma + ed.otros.length, 0);
      return {
        ...resumen,
        edificios,
        totalAulas,
        totalLaboratorios,
        totalEspacios: totalAulas + totalLaboratorios + totalOtros,
      };
    })
    .sort((a, b) => a.carrera.localeCompare(b.carrera, 'es'));
};

/** Filtra por nombre de carrera, aula o edificio, ignorando tildes y mayúsculas. */
export const filtrarOcupacionCarreras = (
  resumenes: ResumenOcupacionCarrera[],
  busqueda: string,
): ResumenOcupacionCarrera[] => {
  const termino = normalizarTexto(busqueda);
  if (!termino) return resumenes;

  return resumenes.filter(resumen => {
    if (normalizarTexto(resumen.carrera).includes(termino)) return true;
    return resumen.edificios.some(edificio =>
      normalizarTexto(edificio.nombre).includes(termino) ||
      [...edificio.aulas, ...edificio.laboratorios, ...edificio.otros].some(
        espacio => normalizarTexto(espacio.nombre).includes(termino),
      ),
    );
  });
};

export interface MetricasOcupacion {
  totalCarreras: number;
  totalEspacios: number;
  totalAulas: number;
  totalLaboratorios: number;
}

/** Cifras de cabecera: cuántas carreras cubre el reporte y cuántos espacios totales. */
export const metricasOcupacion = (resumenes: ResumenOcupacionCarrera[]): MetricasOcupacion => ({
  totalCarreras: resumenes.length,
  totalEspacios: resumenes.reduce((suma, r) => suma + r.totalEspacios, 0),
  totalAulas: resumenes.reduce((suma, r) => suma + r.totalAulas, 0),
  totalLaboratorios: resumenes.reduce((suma, r) => suma + r.totalLaboratorios, 0),
});
