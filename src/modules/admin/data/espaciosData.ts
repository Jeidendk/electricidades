import { normalizarTexto } from '../../../lib/texto';

export type TipoEspacio = 'Académica' | 'Laboratorio Técnico' | 'Laboratorio de Informática';

/**
 * True si el espacio es un aula y no un laboratorio.
 * El enum `tipo_espacio` de Postgres guarda "Academica" SIN tilde, pero los datos de
 * ejemplo y varias pantallas la escriben con tilde: comparar con === falla en silencio
 * y clasifica todas las aulas como laboratorio.
 */
export const esAula = (tipo: string | null | undefined): boolean =>
  normalizarTexto(tipo) === 'academica';
export type EstadoEspacio = 'disponible' | 'ocupada' | 'mantenimiento';

export interface Espacio {
  id: string;
  nombre: string;
  edificio: string;
  piso: number;
  tipo: TipoEspacio;
  capacidad: number;
  m2: number;
  equipamiento: string;
  estado: EstadoEspacio;
  fotos: string[];
  lat: number;
  lng: number;
}

export const EDIFICIOS = [
  'Edificio FIE-A',
  'Edificio FIE-B',
  'Bloque de Laboratorios',
  'Centro de Cómputo',
  'Bloque Administrativo',
  'Auditorio Principal',
];

const baseLat = -1.6575;
const baseLng = -78.6770;

// Fuente única: fusiona Aulas (tipo Académica) + Laboratorios (Técnico / Informática).
const seed: Omit<Espacio, 'lat' | 'lng'>[] = [
  // ── Aulas ──
  { id: 'AUL001', nombre: 'Aula 101', edificio: 'Edificio FIE-A', piso: 1, tipo: 'Académica', capacidad: 30, m2: 45, equipamiento: 'Proyector, Pizarra digital', estado: 'disponible', fotos: ['https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=250&fit=crop'] },
  { id: 'AUL002', nombre: 'Aula 102', edificio: 'Edificio FIE-A', piso: 1, tipo: 'Académica', capacidad: 30, m2: 45, equipamiento: 'Proyector, Pizarra', estado: 'ocupada', fotos: [] },
  { id: 'AUL003', nombre: 'Aula 201', edificio: 'Edificio FIE-A', piso: 2, tipo: 'Académica', capacidad: 30, m2: 45, equipamiento: 'Proyector', estado: 'disponible', fotos: [] },
  { id: 'AUL004', nombre: 'Aula 103', edificio: 'Edificio FIE-B', piso: 1, tipo: 'Académica', capacidad: 30, m2: 40, equipamiento: 'Proyector, Pizarra', estado: 'disponible', fotos: [] },
  { id: 'AUL005', nombre: 'Aula 104', edificio: 'Edificio FIE-B', piso: 1, tipo: 'Académica', capacidad: 30, m2: 40, equipamiento: 'Proyector', estado: 'disponible', fotos: [] },
  { id: 'AUL006', nombre: 'Aula 202', edificio: 'Edificio FIE-B', piso: 2, tipo: 'Académica', capacidad: 30, m2: 45, equipamiento: 'Proyector, Pizarra digital', estado: 'ocupada', fotos: [] },
  { id: 'AUL007', nombre: 'Aula Magna', edificio: 'Bloque Administrativo', piso: 1, tipo: 'Académica', capacidad: 60, m2: 120, equipamiento: 'Sistema de audio, Proyector HD', estado: 'disponible', fotos: ['https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop'] },
  { id: 'AUL008', nombre: 'Aula 203', edificio: 'Edificio FIE-A', piso: 2, tipo: 'Académica', capacidad: 30, m2: 45, equipamiento: 'Proyector, Pizarra', estado: 'disponible', fotos: [] },
  { id: 'AUL009', nombre: 'Aula 204', edificio: 'Edificio FIE-A', piso: 2, tipo: 'Académica', capacidad: 30, m2: 45, equipamiento: 'Proyector, Pizarra digital', estado: 'ocupada', fotos: [] },
  { id: 'AUL010', nombre: 'Aula 301', edificio: 'Edificio FIE-B', piso: 3, tipo: 'Académica', capacidad: 40, m2: 50, equipamiento: 'Proyector', estado: 'disponible', fotos: [] },
  { id: 'AUL011', nombre: 'Aula 105', edificio: 'Edificio FIE-B', piso: 1, tipo: 'Académica', capacidad: 30, m2: 40, equipamiento: 'Proyector, Pizarra', estado: 'ocupada', fotos: [] },
  { id: 'AUL012', nombre: 'Aula de Reuniones', edificio: 'Bloque Administrativo', piso: 2, tipo: 'Académica', capacidad: 15, m2: 30, equipamiento: 'TV interactiva', estado: 'disponible', fotos: [] },

  // ── Laboratorios ──
  { id: 'LAB001', nombre: 'Lab. Circuitos', edificio: 'Edificio FIE-A', piso: 3, tipo: 'Laboratorio Técnico', capacidad: 20, m2: 60, equipamiento: 'Osciloscopios, Multímetros, Fuentes DC', estado: 'disponible', fotos: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&h=250&fit=crop'] },
  { id: 'LAB002', nombre: 'Lab. Electrónica', edificio: 'Edificio FIE-A', piso: 3, tipo: 'Laboratorio Técnico', capacidad: 20, m2: 60, equipamiento: 'Protoboards, Generadores de señal', estado: 'mantenimiento', fotos: [] },
  { id: 'LAB003', nombre: 'Lab. Potencia', edificio: 'Edificio FIE-B', piso: 3, tipo: 'Laboratorio Técnico', capacidad: 20, m2: 80, equipamiento: 'Transformadores, Motores trifásicos', estado: 'disponible', fotos: [] },
  { id: 'LAB004', nombre: 'Lab. Control', edificio: 'Bloque de Laboratorios', piso: 1, tipo: 'Laboratorio Técnico', capacidad: 20, m2: 65, equipamiento: 'PLCs, HMI, Sensores', estado: 'disponible', fotos: [] },
  { id: 'LAB005', nombre: 'Lab. Telecomunicaciones', edificio: 'Bloque de Laboratorios', piso: 1, tipo: 'Laboratorio Técnico', capacidad: 20, m2: 65, equipamiento: 'Routers, Switches, Analizador de espectro', estado: 'ocupada', fotos: [] },
  { id: 'LAB006', nombre: 'Lab. Energías Renovables', edificio: 'Bloque de Laboratorios', piso: 2, tipo: 'Laboratorio Técnico', capacidad: 20, m2: 70, equipamiento: 'Paneles solares, Inversores, Simuladores', estado: 'disponible', fotos: [] },
  { id: 'LAB007', nombre: 'Lab. Cómputo 1', edificio: 'Centro de Cómputo', piso: 1, tipo: 'Laboratorio de Informática', capacidad: 25, m2: 50, equipamiento: '25 PCs, Proyector, Software MATLAB', estado: 'mantenimiento', fotos: [] },
  { id: 'LAB008', nombre: 'Lab. Cómputo 2', edificio: 'Centro de Cómputo', piso: 1, tipo: 'Laboratorio de Informática', capacidad: 25, m2: 50, equipamiento: '25 PCs, Proyector, AutoCAD', estado: 'disponible', fotos: [] },
  { id: 'LAB009', nombre: 'Lab. Robótica', edificio: 'Bloque de Laboratorios', piso: 2, tipo: 'Laboratorio Técnico', capacidad: 20, m2: 70, equipamiento: 'Brazos robóticos, Computadoras', estado: 'mantenimiento', fotos: [] },
  { id: 'LAB010', nombre: 'Lab. Redes Eléctricas', edificio: 'Edificio FIE-A', piso: 3, tipo: 'Laboratorio Técnico', capacidad: 25, m2: 65, equipamiento: 'Tableros de simulación, Osciloscopios', estado: 'disponible', fotos: [] },
  { id: 'LAB011', nombre: 'Lab. Cómputo 3', edificio: 'Centro de Cómputo', piso: 2, tipo: 'Laboratorio de Informática', capacidad: 30, m2: 60, equipamiento: '30 PCs, Proyector, Software Multisim', estado: 'disponible', fotos: [] },
  { id: 'LAB012', nombre: 'Lab. Electromagnetismo', edificio: 'Bloque de Laboratorios', piso: 1, tipo: 'Laboratorio Técnico', capacidad: 20, m2: 60, equipamiento: 'Bobinas, Generadores, Multímetros', estado: 'ocupada', fotos: [] },
];

export const espaciosData: Espacio[] = seed.map((e) => ({
  ...e,
  lat: baseLat + (Math.random() - 0.5) * 0.008,
  lng: baseLng + (Math.random() - 0.5) * 0.008,
}));
