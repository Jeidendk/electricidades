import { Cpu, FlaskConical, Briefcase, Zap, Laptop, Wifi, Stethoscope, Globe, Palette, Microscope, PenTool, Database, Activity, Calculator, Compass, Leaf, Network, BookOpen, Building } from 'lucide-react';

export const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export const paralelos = [1, 2, 3, 4];

/** Paralelo con el que arranca una clase nueva. */
export const PARALELO_POR_DEFECTO = String(paralelos[0]);

/**
 * Línea "PAO 7 · PARALELO 1" del encabezado de una clase. Omite la parte que falte:
 * las clases cargadas antes de la migración 0020 no tienen paralelo, y no se inventa uno.
 * Devuelve cadena vacía si no hay ninguno de los dos, para no dibujar una línea suelta.
 */
export const etiquetaPaoParalelo = (
  pao?: number | null,
  paralelo?: number | null,
): string => [
  pao != null ? `PAO ${pao}` : null,
  paralelo != null ? `PARALELO ${paralelo}` : null,
].filter(Boolean).join(' · ');

/**
 * Formas canónicas del enum `dia_semana` (migración 0019: ya llevan tilde).
 */
const DIA_CANONICO: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes',
};

/**
 * Lleva cualquier forma de escribir un día ("miercoles", "MIÉRCOLES", "Miercoles") a la
 * etiqueta canónica. Necesario porque los horarios también entran por importación de Excel,
 * donde nadie garantiza la grafía. Devuelve el valor tal cual si no lo reconoce, para que un
 * día inesperado falle de forma visible en vez de convertirse en otro día.
 */
export const diaCanonico = (dia: string): string =>
  DIA_CANONICO[dia.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()] ?? dia;
export const diasFormales = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// Jornada académica continua. Cambiar estas dos constantes mueve la grilla, los selectores
// del formulario y las plantillas de PDF/Word a la vez: no hay ningún rango escrito aparte.
const HORA_INICIO_JORNADA = 7;  // 07:00, primera clase
const HORA_FIN_JORNADA = 19;    // 19:00, última hora en la que puede terminar una clase

const comoHora = (hora: number) => `${String(hora).padStart(2, '0')}:00`;

/** Bloques de una hora: "07:00 - 08:00" … "18:00 - 19:00". */
export const horas = Array.from(
  { length: HORA_FIN_JORNADA - HORA_INICIO_JORNADA },
  (_, indice) => {
    const inicio = HORA_INICIO_JORNADA + indice;
    return `${comoHora(inicio)} - ${comoHora(inicio + 1)}`;
  },
);

// Ambos selectores muestran siempre exactamente el mismo rango completo.
export const horasSeleccionables = Array.from(
  { length: HORA_FIN_JORNADA - HORA_INICIO_JORNADA + 1 },
  (_, indice) => comoHora(HORA_INICIO_JORNADA + indice),
);

export const horasInicio = horasSeleccionables;

const minutosDesdeHora = (hora: string) => {
  const [horasNumero, minutos] = hora.split(':').map(Number);
  return horasNumero * 60 + minutos;
};

const horaDesdeMinutos = (totalMinutos: number) => {
  const horasNumero = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${String(horasNumero).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
};

export const calcularHoraFin = (horaInicio: string, duracion: number) =>
  horaDesdeMinutos(minutosDesdeHora(horaInicio) + duracion * 60);

export const calcularDuracion = (horaInicio: string, horaFin: string) =>
  Math.max(1, Math.round((minutosDesdeHora(horaFin) - minutosDesdeHora(horaInicio)) / 60));

export const duracionesDisponibles = (horaInicio: string) =>
  [1, 2, 3, 4].filter(duracion =>
    Array.from({ length: duracion }, (_, indice) => {
      const inicioBloque = calcularHoraFin(horaInicio, indice);
      const finBloque = calcularHoraFin(horaInicio, indice + 1);
      return horas.includes(`${inicioBloque} - ${finBloque}`);
    }).every(Boolean)
  );

export const horasFinDisponibles = (horaInicio: string) =>
  horasSeleccionables.filter(horaFin => {
    const duracion = (minutosDesdeHora(horaFin) - minutosDesdeHora(horaInicio)) / 60;
    return duracion >= 1 && duracion <= 4;
  });

export const rangoIncluyeBloque = (rangoClase: string, bloque: string) => {
  const [inicioClase, finClase] = rangoClase.split(' - ');
  const [inicioBloque, finBloque] = bloque.split(' - ');
  if (!inicioClase || !finClase || !inicioBloque || !finBloque) return false;
  return inicioClase < finBloque && finClase > inicioBloque;
};

export const availableIcons: Record<string, any> = {
  Cpu, FlaskConical, Briefcase, Stethoscope, Globe, Palette, 
  Microscope, PenTool, Laptop, Zap, Database, Activity, Calculator,
  Compass, Leaf, Network, Wifi, BookOpen, Building
};

export const facultadesMock: { id: string; siglas: string; nombre: string; colorHex: string; icono: string; customSvg: string | null }[] = [
  { id: 'FAC001', siglas: 'FIE', nombre: 'Facultad de Informática y Electrónica', colorHex: '#9333ea', icono: 'Cpu', customSvg: null },
  { id: 'FAC002', siglas: 'FADE', nombre: 'Facultad de Administración de Empresas', colorHex: '#10b981', icono: 'Briefcase', customSvg: null },
  { id: 'FAC003', siglas: 'FM', nombre: 'Facultad de Mecánica', colorHex: '#2563eb', icono: 'Zap', customSvg: null },
];

export const carrerasMock: { id: string; idFacultad: string; nombre: string; colorHex: string; icono: string; customSvg: string | null }[] = [
  { id: 'CAR001', idFacultad: 'FAC001', nombre: 'Ingeniería de Software', colorHex: '#2563eb', icono: 'Laptop', customSvg: null },
  { id: 'CAR002', idFacultad: 'FAC001', nombre: 'Telecomunicaciones', colorHex: '#0891b2', icono: 'Wifi', customSvg: null },
  { id: 'CAR003', idFacultad: 'FAC001', nombre: 'Electrónica y Automatización', colorHex: '#e11d48', icono: 'Cpu', customSvg: null },
  { id: 'CAR004', idFacultad: 'FAC002', nombre: 'Administración de Empresas', colorHex: '#d97706', icono: 'Briefcase', customSvg: null },
  { id: 'CAR005', idFacultad: 'FAC003', nombre: 'Ingeniería Automotriz', colorHex: '#10b981', icono: 'Zap', customSvg: null },
];
