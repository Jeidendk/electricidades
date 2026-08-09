// Importación de horarios desde Excel/CSV.
//
// Este módulo es lógica pura (sin React ni Supabase): lee el archivo, normaliza las filas
// y las valida contra los catálogos y las clases ya registradas. Devuelve qué filas se pueden
// insertar y cuáles se rechazan, con el motivo exacto de cada rechazo.

import { dias, horasFinDisponibles, horasSeleccionables } from './horariosData';

/** Columnas que reconoce el importador; el orden de la plantilla es este. */
export const COLUMNAS_PLANTILLA = ['materia', 'docente', 'dia', 'hora_inicio', 'hora_fin', 'aula', 'edificio'] as const;

/** Fila del archivo ya normalizada a texto, antes de validar. */
export interface FilaCruda {
  numeroFila: number;
  materia: string;
  docente: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  aula: string;
  edificio: string;
}

/** Fila que pasó todas las validaciones y está lista para insertarse. */
export interface ClaseImportable {
  numeroFila: number;
  idMateria: string;
  idDocente: string;
  idEspacio: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  materia: string;
  docente: string;
  aula: string;
}

export interface FilaRechazada {
  numeroFila: number;
  motivo: string;
  resumen: string;
}

export interface ResultadoValidacion {
  importables: ClaseImportable[];
  rechazadas: FilaRechazada[];
}

export interface CatalogosImportacion {
  materias: any[];
  docentes: any[];
  espacios: any[];
  edificios: any[];
  /** Clases ya registradas (filas crudas de Supabase) para detectar cruces. */
  clasesExistentes: any[];
  /** Aula que se usa cuando la fila no trae columna "aula". Puede ir vacía. */
  idEspacioPorDefecto: string;
}

const EXTENSIONES_EXCEL = ['.xlsx', '.xlsm'];
const MINUTOS_POR_DIA = 24 * 60;

/** Compara textos ignorando tildes, mayúsculas y espacios repetidos. */
const normalizar = (valor: unknown): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

const ALIAS_COLUMNAS: Record<string, keyof Omit<FilaCruda, 'numeroFila'>> = {
  'materia': 'materia', 'asignatura': 'materia', 'codigo materia': 'materia',
  'docente': 'docente', 'profesor': 'docente', 'nombre docente': 'docente',
  'dia': 'dia',
  'hora inicio': 'horaInicio', 'hora_inicio': 'horaInicio', 'horainicio': 'horaInicio', 'inicio': 'horaInicio',
  'hora fin': 'horaFin', 'hora_fin': 'horaFin', 'horafin': 'horaFin', 'fin': 'horaFin',
  'aula': 'aula', 'espacio': 'aula',
  'edificio': 'edificio',
};

const DIA_CANONICO: Record<string, string> = Object.fromEntries(dias.map(d => [normalizar(d), d]));

/** Acepta "7:00", "07:00:00", una hora de Excel (Date) o una fracción de día. */
const normalizarHora = (valor: unknown): string => {
  if (valor == null || valor === '') return '';

  if (valor instanceof Date) {
    return `${String(valor.getUTCHours()).padStart(2, '0')}:${String(valor.getUTCMinutes()).padStart(2, '0')}`;
  }

  if (typeof valor === 'number') {
    const minutos = Math.round(valor * MINUTOS_POR_DIA);
    return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
  }

  const texto = String(valor).trim();
  const partes = texto.match(/^(\d{1,2}):(\d{2})/);
  if (!partes) return texto;
  return `${partes[1].padStart(2, '0')}:${partes[2]}`;
};

/** Texto plano de una celda de ExcelJS (que puede traer fórmulas o texto enriquecido). */
const textoDeCelda = (valor: any): string => {
  if (valor == null) return '';
  if (typeof valor === 'object') {
    if (valor.text) return String(valor.text);
    if (valor.result != null) return String(valor.result);
    if (Array.isArray(valor.richText)) return valor.richText.map((t: any) => t.text).join('');
    if (valor instanceof Date) return valor.toISOString();
  }
  return String(valor).trim();
};

const filaVacia = (numeroFila: number): FilaCruda => ({
  numeroFila, materia: '', docente: '', dia: '', horaInicio: '', horaFin: '', aula: '', edificio: '',
});

/** Une celdas de encabezado con los campos de FilaCruda. Devuelve índice de columna → campo. */
const mapearEncabezados = (celdas: string[]): Map<number, keyof Omit<FilaCruda, 'numeroFila'>> => {
  const mapa = new Map<number, keyof Omit<FilaCruda, 'numeroFila'>>();
  celdas.forEach((celda, indice) => {
    const campo = ALIAS_COLUMNAS[normalizar(celda)];
    if (campo) mapa.set(indice, campo);
  });
  return mapa;
};

const construirFila = (
  celdas: unknown[],
  encabezados: Map<number, keyof Omit<FilaCruda, 'numeroFila'>>,
  numeroFila: number,
): FilaCruda => {
  const fila = filaVacia(numeroFila);
  encabezados.forEach((campo, indice) => {
    const valor = celdas[indice];
    fila[campo] = campo === 'horaInicio' || campo === 'horaFin'
      ? normalizarHora(valor)
      : textoDeCelda(valor).trim();
  });
  return fila;
};

const estaVacia = (fila: FilaCruda) =>
  !fila.materia && !fila.docente && !fila.dia && !fila.horaInicio && !fila.horaFin && !fila.aula;

/** Divide una línea CSV respetando comillas dobles y comillas escapadas ("" dentro del campo). */
const dividirLineaCsv = (linea: string, separador: string): string[] => {
  const campos: string[] = [];
  let actual = '';
  let dentroDeComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const caracter = linea[i];

    if (caracter === '"') {
      if (dentroDeComillas && linea[i + 1] === '"') { actual += '"'; i++; continue; }
      dentroDeComillas = !dentroDeComillas;
      continue;
    }
    if (caracter === separador && !dentroDeComillas) { campos.push(actual); actual = ''; continue; }
    actual += caracter;
  }
  campos.push(actual);
  return campos.map(c => c.trim());
};

const detectarSeparador = (primeraLinea: string): string =>
  (primeraLinea.split(';').length > primeraLinea.split(',').length ? ';' : ',');

const leerCsv = (contenido: string): FilaCruda[] => {
  // Se numera ANTES de descartar las l\u00EDneas en blanco: el n\u00FAmero que se le muestra
  // al usuario tiene que ser el de su archivo, no el de la lista ya filtrada.
  const lineas = contenido
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((texto, indice) => ({ numero: indice + 1, texto }))
    .filter(({ texto }) => texto.trim() !== '');
  if (lineas.length === 0) return [];

  const [encabezado, ...cuerpo] = lineas;
  const separador = detectarSeparador(encabezado.texto);
  const encabezados = mapearEncabezados(dividirLineaCsv(encabezado.texto, separador));
  if (encabezados.size === 0) {
    throw new Error('El archivo no tiene una fila de encabezados reconocible (materia, docente, dia, hora_inicio, hora_fin, aula).');
  }

  return cuerpo
    .map(({ numero, texto }) => construirFila(dividirLineaCsv(texto, separador), encabezados, numero))
    .filter(fila => !estaVacia(fila));
};

const leerExcel = async (archivo: File): Promise<FilaCruda[]> => {
  // exceljs pesa ~940 kB: se carga solo cuando el usuario importa un .xlsx,
  // no al entrar a la pantalla de Horarios.
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(await archivo.arrayBuffer());

  const hoja = libro.worksheets[0];
  if (!hoja) throw new Error('El archivo de Excel no tiene ninguna hoja con datos.');

  // Se conserva el número de fila real de la hoja para que los errores apunten
  // a la fila que el usuario ve en Excel, aunque haya filas vacías intermedias.
  const filasCrudas: { numero: number; celdas: unknown[] }[] = [];
  hoja.eachRow({ includeEmpty: false }, (fila) => {
    const valores = fila.values as unknown[];
    filasCrudas.push({ numero: fila.number, celdas: valores.slice(1) }); // ExcelJS deja vacío el índice 0
  });
  if (filasCrudas.length === 0) throw new Error('La hoja está vacía.');

  const [encabezado, ...cuerpo] = filasCrudas;
  const encabezados = mapearEncabezados(encabezado.celdas.map(textoDeCelda));
  if (encabezados.size === 0) {
    throw new Error('El archivo no tiene una fila de encabezados reconocible (materia, docente, dia, hora_inicio, hora_fin, aula).');
  }

  return cuerpo
    .map(({ numero, celdas }) => construirFila(celdas, encabezados, numero))
    .filter(fila => !estaVacia(fila));
};

/** Lee un .xlsx/.xlsm o .csv y devuelve las filas normalizadas. Lanza error si el formato no sirve. */
export const leerArchivoDeHorario = async (archivo: File): Promise<FilaCruda[]> => {
  const nombre = archivo.name.toLowerCase();
  if (EXTENSIONES_EXCEL.some(ext => nombre.endsWith(ext))) return leerExcel(archivo);
  if (nombre.endsWith('.csv')) return leerCsv(await archivo.text());
  throw new Error('Formato no soportado. Usa un archivo .xlsx o .csv.');
};

const buscarMateria = (materias: any[], texto: string) => {
  const buscado = normalizar(texto);
  return materias.find(m => normalizar(m.nombre) === buscado)
    || materias.find(m => normalizar(m.codigo) === buscado);
};

const buscarDocente = (docentes: any[], texto: string) => {
  const buscado = normalizar(texto);
  return docentes.find(d => normalizar(d.nombre) === buscado);
};

const buscarEspacio = (espacios: any[], edificios: any[], nombreAula: string, nombreEdificio: string) => {
  const aulaBuscada = normalizar(nombreAula);
  const candidatos = espacios.filter(e => normalizar(e.nombre) === aulaBuscada);
  if (candidatos.length <= 1 || !nombreEdificio) return candidatos[0];

  const edificio = edificios.find(e => normalizar(e.nombre) === normalizar(nombreEdificio));
  return candidatos.find(e => e.id_edificio === edificio?.id) || candidatos[0];
};

const resumirFila = (fila: FilaCruda) =>
  `${fila.materia || '—'} · ${fila.docente || '—'} · ${fila.dia || '—'} ${fila.horaInicio || '—'}-${fila.horaFin || '—'}`;

/** Dos bloques del mismo día se solapan si uno empieza antes de que el otro termine. */
const seSolapan = (
  a: { dia: string; inicio: string; fin: string },
  b: { dia: string; inicio: string; fin: string },
) => a.dia === b.dia && a.inicio < b.fin && a.fin > b.inicio;

interface BloqueOcupado {
  dia: string;
  inicio: string;
  fin: string;
  idEspacio: string;
  idDocente: string;
  etiqueta: string;
}

const bloquesDeClasesExistentes = (clases: any[]): BloqueOcupado[] =>
  clases.map(c => ({
    dia: c.dia,
    inicio: String(c.hora_inicio || '').slice(0, 5),
    fin: String(c.hora_fin || '').slice(0, 5),
    idEspacio: c.id_espacio || '',
    idDocente: c.id_docente || '',
    etiqueta: c.materias?.nombre || 'otra clase',
  }));

/**
 * Valida las filas contra los catálogos y las clases existentes.
 * Las filas aceptadas también se comparan entre sí: un archivo no puede traer dos clases
 * que choquen en la misma aula o con el mismo docente.
 */
export const validarFilas = (filas: FilaCruda[], catalogos: CatalogosImportacion): ResultadoValidacion => {
  const { materias, docentes, espacios, edificios, clasesExistentes, idEspacioPorDefecto } = catalogos;

  const importables: ClaseImportable[] = [];
  const rechazadas: FilaRechazada[] = [];
  const ocupados = bloquesDeClasesExistentes(clasesExistentes);

  const rechazar = (fila: FilaCruda, motivo: string) =>
    rechazadas.push({ numeroFila: fila.numeroFila, motivo, resumen: resumirFila(fila) });

  for (const fila of filas) {
    if (!fila.materia || !fila.docente || !fila.dia || !fila.horaInicio || !fila.horaFin) {
      rechazar(fila, 'Faltan datos obligatorios (materia, docente, día, hora inicio y hora fin).');
      continue;
    }

    const dia = DIA_CANONICO[normalizar(fila.dia)];
    if (!dia) {
      rechazar(fila, `Día "${fila.dia}" no válido. Use: ${dias.join(', ')}.`);
      continue;
    }

    if (!horasSeleccionables.includes(fila.horaInicio)) {
      rechazar(fila, `Hora de inicio "${fila.horaInicio}" fuera de la jornada (${horasSeleccionables[0]} a ${horasSeleccionables[horasSeleccionables.length - 1]}).`);
      continue;
    }

    if (!horasFinDisponibles(fila.horaInicio).includes(fila.horaFin)) {
      rechazar(fila, `Hora de fin "${fila.horaFin}" no válida: debe ser posterior al inicio y durar como máximo cuatro horas.`);
      continue;
    }

    const materia = buscarMateria(materias, fila.materia);
    if (!materia) {
      rechazar(fila, `La materia "${fila.materia}" no existe. Regístrala en Estructura Académica o corrige el nombre.`);
      continue;
    }

    const docente = buscarDocente(docentes, fila.docente);
    if (!docente) {
      rechazar(fila, `El docente "${fila.docente}" no existe. Regístralo en Usuarios o corrige el nombre.`);
      continue;
    }

    const espacio = fila.aula
      ? buscarEspacio(espacios, edificios, fila.aula, fila.edificio)
      : espacios.find(e => e.id === idEspacioPorDefecto);
    if (!espacio) {
      rechazar(fila, fila.aula
        ? `El aula "${fila.aula}" no existe. Regístrala en Infraestructura o corrige el nombre.`
        : 'La fila no indica aula y no hay un aula seleccionada en la vista.');
      continue;
    }

    const bloque = { dia, inicio: fila.horaInicio, fin: fila.horaFin };

    const duplicada = ocupados.find(o =>
      o.dia === dia && o.inicio === fila.horaInicio && o.fin === fila.horaFin
      && o.idEspacio === espacio.id && o.idDocente === docente.id);
    if (duplicada) {
      rechazar(fila, 'Esa clase ya está registrada con el mismo día, hora, aula y docente.');
      continue;
    }

    const choqueAula = ocupados.find(o => o.idEspacio === espacio.id && seSolapan(bloque, o));
    if (choqueAula) {
      rechazar(fila, `El aula ${espacio.nombre} ya tiene "${choqueAula.etiqueta}" el ${dia} de ${choqueAula.inicio} a ${choqueAula.fin}.`);
      continue;
    }

    const choqueDocente = ocupados.find(o => o.idDocente === docente.id && seSolapan(bloque, o));
    if (choqueDocente) {
      rechazar(fila, `${docente.nombre} ya dicta "${choqueDocente.etiqueta}" el ${dia} de ${choqueDocente.inicio} a ${choqueDocente.fin}.`);
      continue;
    }

    importables.push({
      numeroFila: fila.numeroFila,
      idMateria: materia.id,
      idDocente: docente.id,
      idEspacio: espacio.id,
      dia,
      horaInicio: fila.horaInicio,
      horaFin: fila.horaFin,
      materia: materia.nombre,
      docente: docente.nombre,
      aula: espacio.nombre,
    });

    // La fila aceptada pasa a ocupar su bloque: así el propio archivo no se contradice.
    ocupados.push({ ...bloque, idEspacio: espacio.id, idDocente: docente.id, etiqueta: materia.nombre });
  }

  return { importables, rechazadas };
};

/** Plantilla CSV de ejemplo para que el usuario sepa qué columnas se esperan. */
export const construirPlantillaCsv = (): string => {
  const ejemplo = ['Programación I', 'Juan Pérez', 'Lunes', '07:00', '09:00', 'Aula 102', 'Edificio de Aulas'];
  return `${COLUMNAS_PLANTILLA.join(',')}\n${ejemplo.join(',')}\n`;
};
