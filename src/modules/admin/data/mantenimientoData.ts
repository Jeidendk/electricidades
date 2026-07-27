export type PrioridadOT = 'baja' | 'media' | 'alta';
export type EstadoOT = 'pendiente' | 'en_proceso' | 'resuelto';

export interface OrdenMantenimiento {
  id: string;
  recursoId: string;       // id del ítem de inventario (EQxxx)
  recursoNombre: string;   // denormalizado para mostrar
  categoria: string;       // equipos / herramientas / mobiliario / tecnologico
  ubicacion: string;       // "Edificio · Aula"
  descripcion: string;     // detalle del problema
  prioridad: PrioridadOT;
  estado: EstadoOT;
  tecnicoId: string | null;
  fechaReporte: string;    // YYYY-MM-DD
  fechaCierre: string | null;
}

export const mantenimientoData: OrdenMantenimiento[] = [
  { id: 'OT001', recursoId: 'EQ002', recursoNombre: 'Osciloscopio Tektronix', categoria: 'herramientas', ubicacion: 'Edificio FIE-A · Lab. Circuitos', descripcion: 'Problema en el canal 2 de lectura', prioridad: 'media', estado: 'en_proceso', tecnicoId: 'TEC001', fechaReporte: '2026-06-10', fechaCierre: null },
  { id: 'OT002', recursoId: 'EQ015', recursoNombre: 'Generador de Funciones', categoria: 'herramientas', ubicacion: 'Edificio FIE-A · Lab. Circuitos', descripcion: 'No enciende', prioridad: 'alta', estado: 'pendiente', tecnicoId: null, fechaReporte: '2026-06-14', fechaCierre: null },
  { id: 'OT003', recursoId: 'EQ004', recursoNombre: 'Computadora Core i7', categoria: 'tecnologico', ubicacion: 'Centro de Cómputo · Lab. Cómputo 1', descripcion: 'Fuente de poder quemada', prioridad: 'alta', estado: 'pendiente', tecnicoId: 'TEC003', fechaReporte: '2026-06-15', fechaCierre: null },
  { id: 'OT004', recursoId: 'EQ006', recursoNombre: 'Silla Universitaria #045', categoria: 'mobiliario', ubicacion: 'Edificio FIE-B · Aula 103', descripcion: 'Patas chuecas', prioridad: 'baja', estado: 'resuelto', tecnicoId: 'TEC002', fechaReporte: '2026-05-28', fechaCierre: '2026-06-02' },
  { id: 'OT005', recursoId: 'EQ012', recursoNombre: 'Computadora Core i7', categoria: 'tecnologico', ubicacion: 'Centro de Cómputo · Lab. Cómputo 2', descripcion: 'Disco duro defectuoso', prioridad: 'media', estado: 'en_proceso', tecnicoId: 'TEC003', fechaReporte: '2026-06-08', fechaCierre: null },
];
