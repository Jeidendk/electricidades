// Horario personal del estudiante Juan Carlos Pérez López
// Carrera: Ingeniería en Electricidad (Electrónica y Automatización - CAR003)
// Semestre: 5to | Periodo: 2026-1

export interface ClaseEstudiante {
  id: string;
  materia: string;
  docente: string;
  aula: string;
  edificio: string;
  idCarrera: string;
  dia: string;
  hora: string;
  tipo: 'normal' | 'laboratorio' | 'tutoría';
}

export const studentInfo = {
  nombre: 'Juan Carlos Pérez López',
  cedula: '0604789123',
  carrera: 'Ingeniería en Electricidad',
  semestre: '5to Semestre',
  periodo: '2026-1',
  idCarrera: 'CAR003',
};

export const studentClases: ClaseEstudiante[] = [
  // === LUNES ===
  { id: 'SC001', materia: 'Sistemas Eléctricos de Potencia', docente: 'Ing. Roberto Sánchez', aula: 'FIE-201', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Lunes', hora: '07:00 - 08:00', tipo: 'normal' },
  { id: 'SC002', materia: 'Sistemas Eléctricos de Potencia', docente: 'Ing. Roberto Sánchez', aula: 'FIE-201', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Lunes', hora: '08:00 - 09:00', tipo: 'normal' },
  { id: 'SC003', materia: 'Máquinas Eléctricas II', docente: 'Ing. Patricia Morales', aula: 'FIE-302', edificio: 'Edificio FIE-B', idCarrera: 'CAR003', dia: 'Lunes', hora: '10:00 - 11:00', tipo: 'normal' },
  { id: 'SC004', materia: 'Máquinas Eléctricas II', docente: 'Ing. Patricia Morales', aula: 'FIE-302', edificio: 'Edificio FIE-B', idCarrera: 'CAR003', dia: 'Lunes', hora: '11:00 - 12:00', tipo: 'normal' },
  { id: 'SC005', materia: 'Lab. Circuitos Eléctricos', docente: 'Ing. Carlos Mendoza', aula: 'Lab. Circuitos', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Lunes', hora: '14:00 - 15:00', tipo: 'laboratorio' },
  { id: 'SC006', materia: 'Lab. Circuitos Eléctricos', docente: 'Ing. Carlos Mendoza', aula: 'Lab. Circuitos', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Lunes', hora: '15:00 - 16:00', tipo: 'laboratorio' },

  // === MARTES ===
  { id: 'SC007', materia: 'Electrónica de Potencia', docente: 'Ing. Ana Gómez', aula: 'Aula 101', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Martes', hora: '07:00 - 08:00', tipo: 'normal' },
  { id: 'SC008', materia: 'Electrónica de Potencia', docente: 'Ing. Ana Gómez', aula: 'Aula 101', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Martes', hora: '08:00 - 09:00', tipo: 'normal' },
  { id: 'SC009', materia: 'Análisis de Señales', docente: 'Ing. María López', aula: 'Lab. Cómputo 1', edificio: 'Centro de Cómputo', idCarrera: 'CAR003', dia: 'Martes', hora: '10:00 - 11:00', tipo: 'normal' },
  { id: 'SC010', materia: 'Control Automático', docente: 'Ing. Fernando Ruiz', aula: 'Lab. Control', edificio: 'Bloque de Laboratorios', idCarrera: 'CAR003', dia: 'Martes', hora: '14:00 - 15:00', tipo: 'normal' },
  { id: 'SC011', materia: 'Control Automático', docente: 'Ing. Fernando Ruiz', aula: 'Lab. Control', edificio: 'Bloque de Laboratorios', idCarrera: 'CAR003', dia: 'Martes', hora: '15:00 - 16:00', tipo: 'normal' },

  // === MIÉRCOLES ===
  { id: 'SC012', materia: 'Sistemas Eléctricos de Potencia', docente: 'Ing. Roberto Sánchez', aula: 'FIE-201', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Miércoles', hora: '07:00 - 08:00', tipo: 'normal' },
  { id: 'SC013', materia: 'Máquinas Eléctricas II', docente: 'Ing. Patricia Morales', aula: 'Lab. Potencia', edificio: 'Edificio FIE-B', idCarrera: 'CAR003', dia: 'Miércoles', hora: '09:00 - 10:00', tipo: 'laboratorio' },
  { id: 'SC014', materia: 'Máquinas Eléctricas II', docente: 'Ing. Patricia Morales', aula: 'Lab. Potencia', edificio: 'Edificio FIE-B', idCarrera: 'CAR003', dia: 'Miércoles', hora: '10:00 - 11:00', tipo: 'laboratorio' },
  { id: 'SC015', materia: 'Instalaciones Eléctricas', docente: 'Ing. Diego Paredes', aula: 'Aula 102', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Miércoles', hora: '14:00 - 15:00', tipo: 'normal' },
  { id: 'SC016', materia: 'Instalaciones Eléctricas', docente: 'Ing. Diego Paredes', aula: 'Aula 102', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Miércoles', hora: '15:00 - 16:00', tipo: 'normal' },

  // === JUEVES ===
  { id: 'SC017', materia: 'Electrónica de Potencia', docente: 'Ing. Ana Gómez', aula: 'Lab. Electrónica', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Jueves', hora: '07:00 - 08:00', tipo: 'laboratorio' },
  { id: 'SC018', materia: 'Electrónica de Potencia', docente: 'Ing. Ana Gómez', aula: 'Lab. Electrónica', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Jueves', hora: '08:00 - 09:00', tipo: 'laboratorio' },
  { id: 'SC019', materia: 'Análisis de Señales', docente: 'Ing. María López', aula: 'FIE-105', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Jueves', hora: '10:00 - 11:00', tipo: 'normal' },
  { id: 'SC020', materia: 'Análisis de Señales', docente: 'Ing. María López', aula: 'FIE-105', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Jueves', hora: '11:00 - 12:00', tipo: 'normal' },
  { id: 'SC021', materia: 'Control Automático', docente: 'Ing. Fernando Ruiz', aula: 'Lab. Control', edificio: 'Bloque de Laboratorios', idCarrera: 'CAR003', dia: 'Jueves', hora: '14:00 - 15:00', tipo: 'laboratorio' },

  // === VIERNES ===
  { id: 'SC022', materia: 'Instalaciones Eléctricas', docente: 'Ing. Diego Paredes', aula: 'Lab. Redes Eléctricas', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Viernes', hora: '07:00 - 08:00', tipo: 'laboratorio' },
  { id: 'SC023', materia: 'Instalaciones Eléctricas', docente: 'Ing. Diego Paredes', aula: 'Lab. Redes Eléctricas', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Viernes', hora: '08:00 - 09:00', tipo: 'laboratorio' },
  { id: 'SC024', materia: 'Tutoría Académica', docente: 'Ing. Roberto Sánchez', aula: 'FIE-201', edificio: 'Edificio FIE-A', idCarrera: 'CAR003', dia: 'Viernes', hora: '10:00 - 11:00', tipo: 'tutoría' },
];

// Colores por materia para diferenciarlas visualmente
export const materiaColors: Record<string, string> = {
  'Sistemas Eléctricos de Potencia': '#e11d48',   // rose
  'Máquinas Eléctricas II': '#2563eb',             // blue
  'Lab. Circuitos Eléctricos': '#9333ea',          // purple
  'Electrónica de Potencia': '#d97706',            // amber
  'Análisis de Señales': '#0891b2',                // cyan
  'Control Automático': '#059669',                 // emerald
  'Instalaciones Eléctricas': '#dc2626',           // red
  'Tutoría Académica': '#6b7280',                  // gray
};

// Resumen por materia
export const getMateriaSummary = () => {
  const summary: Record<string, { count: number; docente: string; tipo: string }> = {};
  studentClases.forEach(c => {
    if (!summary[c.materia]) {
      summary[c.materia] = { count: 0, docente: c.docente, tipo: c.tipo };
    }
    summary[c.materia].count++;
  });
  return summary;
};
