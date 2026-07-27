import { carrerasMock } from '../components/Horarios/horariosData';

// Reexport para que el módulo Académico consuma las mismas carreras que Horarios
export const carreras = carrerasMock;

export interface Materia {
  id: string;
  idCarrera: string;
  semestre: number;        // 1..n
  nombre: string;
  codigo: string;
  creditos: number;
  silaboUrl: string | null;    // PDF del sílabo
  programaUrl: string | null;  // PDF del programa analítico
  recursosIds: number[];       // ids de recursosData (libros/software)
}

// Malla curricular (mock). Cada materia cuelga de una carrera + semestre.
export const materiasData: Materia[] = [
  // ── CAR003 · Electrónica y Automatización ──
  { id: 'MAT001', idCarrera: 'CAR003', semestre: 1, nombre: 'Física I', codigo: 'FIS-101', creditos: 4, silaboUrl: '#', programaUrl: '#', recursosIds: [] },
  { id: 'MAT002', idCarrera: 'CAR003', semestre: 1, nombre: 'Cálculo Diferencial', codigo: 'MAT-101', creditos: 4, silaboUrl: '#', programaUrl: null, recursosIds: [] },
  { id: 'MAT003', idCarrera: 'CAR003', semestre: 2, nombre: 'Física II', codigo: 'FIS-201', creditos: 4, silaboUrl: '#', programaUrl: '#', recursosIds: [4] },
  { id: 'MAT004', idCarrera: 'CAR003', semestre: 2, nombre: 'Análisis de Circuitos', codigo: 'ELE-201', creditos: 5, silaboUrl: '#', programaUrl: '#', recursosIds: [1, 6] },
  { id: 'MAT005', idCarrera: 'CAR003', semestre: 3, nombre: 'Electrónica Analógica', codigo: 'ELE-301', creditos: 5, silaboUrl: null, programaUrl: null, recursosIds: [1, 6] },
  { id: 'MAT006', idCarrera: 'CAR003', semestre: 3, nombre: 'Máquinas Eléctricas I', codigo: 'ELE-302', creditos: 4, silaboUrl: '#', programaUrl: '#', recursosIds: [3, 8] },
  { id: 'MAT007', idCarrera: 'CAR003', semestre: 4, nombre: 'Sistemas de Control', codigo: 'ELE-401', creditos: 5, silaboUrl: '#', programaUrl: '#', recursosIds: [2, 5] },
  { id: 'MAT008', idCarrera: 'CAR003', semestre: 4, nombre: 'Sistemas de Potencia', codigo: 'ELE-402', creditos: 4, silaboUrl: null, programaUrl: '#', recursosIds: [8] },

  // ── CAR001 · Ingeniería de Software ──
  { id: 'MAT020', idCarrera: 'CAR001', semestre: 1, nombre: 'Fundamentos de Programación', codigo: 'SW-101', creditos: 5, silaboUrl: '#', programaUrl: '#', recursosIds: [] },
  { id: 'MAT021', idCarrera: 'CAR001', semestre: 1, nombre: 'Matemática Discreta', codigo: 'MAT-110', creditos: 4, silaboUrl: '#', programaUrl: null, recursosIds: [] },
  { id: 'MAT022', idCarrera: 'CAR001', semestre: 2, nombre: 'Estructuras de Datos', codigo: 'SW-201', creditos: 5, silaboUrl: '#', programaUrl: '#', recursosIds: [] },
  { id: 'MAT023', idCarrera: 'CAR001', semestre: 3, nombre: 'Programación Web', codigo: 'SW-301', creditos: 5, silaboUrl: '#', programaUrl: '#', recursosIds: [5] },
  { id: 'MAT024', idCarrera: 'CAR001', semestre: 3, nombre: 'Bases de Datos', codigo: 'SW-302', creditos: 4, silaboUrl: null, programaUrl: null, recursosIds: [] },
];
