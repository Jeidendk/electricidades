export type EstadoPrestamo = 'activo' | 'devuelto';

export interface Prestamo {
  id: string;                      // 'PR001'
  estudiante: string;
  equipoId: string;                // id del catálogo (EQxxx)
  equipoNombre: string;
  cantidad: number;
  fechaPrestamo: string;           // YYYY-MM-DD
  fechaDevolucionEsperada: string; // YYYY-MM-DD
  fechaDevolucionReal: string | null;
  estado: EstadoPrestamo;
}

// "Atrasado" se deriva: activo + fecha esperada vencida.
export const esAtrasado = (p: Prestamo, hoy: string) =>
  p.estado === 'activo' && p.fechaDevolucionEsperada < hoy;

export const prestamosData: Prestamo[] = [
  { id: 'PR001', estudiante: 'Luis Morales', equipoId: 'EQ002', equipoNombre: 'Osciloscopio Tektronix TBS1072C', cantidad: 1, fechaPrestamo: '2026-06-12', fechaDevolucionEsperada: '2026-06-16', fechaDevolucionReal: null, estado: 'activo' },
  { id: 'PR002', estudiante: 'Jorge Silva', equipoId: 'EQ008', equipoNombre: 'Computadora HP ProDesk i7', cantidad: 2, fechaPrestamo: '2026-06-15', fechaDevolucionEsperada: '2026-06-22', fechaDevolucionReal: null, estado: 'activo' },
  { id: 'PR003', estudiante: 'María Fernanda Ruiz', equipoId: 'EQ001', equipoNombre: 'Multímetro Digital Fluke 87V', cantidad: 1, fechaPrestamo: '2026-05-20', fechaDevolucionEsperada: '2026-05-27', fechaDevolucionReal: '2026-05-26', estado: 'devuelto' },
  { id: 'PR004', estudiante: 'Ricardo Poveda', equipoId: 'EQ004', equipoNombre: 'Módulo PLC Siemens S7-1200', cantidad: 1, fechaPrestamo: '2026-06-10', fechaDevolucionEsperada: '2026-06-14', fechaDevolucionReal: null, estado: 'activo' },
  { id: 'PR005', estudiante: 'Jorge Silva', equipoId: 'EQ011', equipoNombre: 'Protoboard Grande 2390 puntos', cantidad: 3, fechaPrestamo: '2026-06-17', fechaDevolucionEsperada: '2026-06-24', fechaDevolucionReal: null, estado: 'activo' },
];
