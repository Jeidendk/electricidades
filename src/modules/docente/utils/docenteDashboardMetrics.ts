// Métricas y utilidades del panel del docente.
//
// Lógica pura (sin Supabase directo): procesa las clases del store y devuelve
// datos listos para pintar métricas, gráficos de carga horaria y resumen semanal.

export interface ClaseDocente {
  id: string;
  id_docente: string;
  docente_nombre: string;
  materia_id: string;
  materia_nombre: string;
  materia_codigo: string;
  espacio_nombre: string;
  espacio_tipo: string;
  edificio_nombre: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  paralelo: number;
  semestre?: number | string;
}

export interface HorasPorDia {
  dia: string;
  horas: number;
  clases: number;
}

export interface HorasPorMateria {
  name: string;
  horas: number;
  porcentaje: string;
  color: string;
}

export interface KpisDocente {
  totalClases: number;
  totalHorasSemanales: number;
  totalMaterias: number;
  totalEspacios: number;
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const COLORES_MATERIAS = [
  '#B00020', // Rojo ESPOCH
  '#2563EB', // Azul
  '#059669', // Esmeralda
  '#D97706', // Ámbar
  '#7C3AED', // Violeta
  '#0891B2', // Cian
  '#DB2777', // Rosa
];

/** Calcula la duración en horas entre dos marcas de tiempo formato HH:mm */
export const calcularHoras = (horaInicio: string, horaFin: string): number => {
  if (!horaInicio || !horaFin) return 1;
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  if (Number.isNaN(h1) || Number.isNaN(h2)) return 1;
  const minInicio = h1 * 60 + (m1 || 0);
  const minFin = h2 * 60 + (m2 || 0);
  const dif = (minFin - minInicio) / 60;
  return dif > 0 ? dif : 1;
};

/** Resume los principales KPIs del docente */
export const calcularKpisDocente = (clases: ClaseDocente[]): KpisDocente => {
  const materias = new Set(clases.map(c => c.materia_nombre).filter(Boolean));
  const espacios = new Set(clases.map(c => c.espacio_nombre).filter(Boolean));
  const totalHoras = clases.reduce((acc, c) => acc + calcularHoras(c.hora_inicio, c.hora_fin), 0);

  return {
    totalClases: clases.length,
    totalHorasSemanales: Math.round(totalHoras * 10) / 10,
    totalMaterias: materias.size,
    totalEspacios: espacios.size,
  };
};

/** Distribución de horas académicas por día de la semana */
export const horasPorDiaSemana = (clases: ClaseDocente[]): HorasPorDia[] => {
  return DIAS_SEMANA.map(dia => {
    const clasesDelDia = clases.filter(c => (c.dia || '').toLowerCase() === dia.toLowerCase());
    const horas = clasesDelDia.reduce((acc, c) => acc + calcularHoras(c.hora_inicio, c.hora_fin), 0);
    return {
      dia: dia.slice(0, 3).toUpperCase(),
      horas: Math.round(horas * 10) / 10,
      clases: clasesDelDia.length,
    };
  });
};

/** Distribución y porcentaje de horas por materia */
export const distribucionPorMateria = (clases: ClaseDocente[]): HorasPorMateria[] => {
  const porMateria = new Map<string, number>();

  for (const c of clases) {
    const nom = c.materia_nombre || 'Sin Asignar';
    const h = calcularHoras(c.hora_inicio, c.hora_fin);
    porMateria.set(nom, (porMateria.get(nom) || 0) + h);
  }

  const totalHoras = Array.from(porMateria.values()).reduce((a, b) => a + b, 0);

  let index = 0;
  const out: HorasPorMateria[] = [];
  for (const [name, horas] of porMateria.entries()) {
    const pct = totalHoras > 0 ? `${Math.round((horas / totalHoras) * 100)}%` : '0%';
    out.push({
      name,
      horas: Math.round(horas * 10) / 10,
      porcentaje: pct,
      color: COLORES_MATERIAS[index % COLORES_MATERIAS.length],
    });
    index++;
  }

  return out;
};
