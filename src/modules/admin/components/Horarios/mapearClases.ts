import { nombreConTitulo } from '../../data/docentesData';
import { componerNombreCompleto } from '../../../../lib/texto';

/**
 * Fila de `clases` ya resuelta: con los nombres de materia, docente, aula y carrera en vez de
 * los ids. Es lo que consumen la grilla, las plantillas de exportación y los reportes.
 */
export interface ClaseUI {
  id: string;
  materia: string;
  docente: string;
  aula: string;
  edificio: string;
  tipoEspacio: string;
  idFacultad: string;
  idCarrera: string;
  carrera: string;
  pao: number | null;
  paralelo: number | null;
  idMateria: string;
  idDocente: string;
  idEspacio: string;
  dia: string;
  hora: string;
  horaInicio: string;
  horaFin: string;
  creadoPor: string;
  _raw: any;
}

/**
 * Traduce las filas crudas de Supabase al formato de la interfaz.
 *
 * Vivía dentro de `Horarios.tsx`; se extrajo para que los reportes usen exactamente el mismo
 * mapeo y no aparezcan diferencias entre lo que muestra el horario y lo que dice el informe.
 */
export const mapearClases = (
  filas: any[],
  carreras: { id: string; nombre: string; id_facultad: string }[],
): ClaseUI[] =>
  filas.map((fila: any) => {
    const idCarrera = fila.materias?.id_carrera || '';
    const carrera = carreras.find(item => item.id === idCarrera);
    return {
      id: fila.id,
      materia: fila.materias?.nombre || 'Sin materia',
      docente: nombreConTitulo(
        fila.docentes?.titulo,
        componerNombreCompleto(fila.docentes?.nombre, fila.docentes?.apellido),
      ) || 'Sin docente',
      aula: fila.espacios?.nombre || 'Sin aula',
      edificio: fila.espacios?.id_edificio || '',
      tipoEspacio: fila.espacios?.tipo || 'Académica',
      idFacultad: carrera ? carrera.id_facultad : '',
      idCarrera,
      carrera: carrera?.nombre || '',
      pao: fila.materias?.semestre ?? null,
      paralelo: fila.paralelo ?? null,
      idMateria: fila.id_materia || '',
      idDocente: fila.id_docente || '',
      idEspacio: fila.id_espacio || '',
      dia: fila.dia,
      hora: `${fila.hora_inicio?.slice(0, 5)} - ${fila.hora_fin?.slice(0, 5)}`,
      horaInicio: fila.hora_inicio?.slice(0, 5) || '07:00',
      horaFin: fila.hora_fin?.slice(0, 5) || '08:00',
      creadoPor: fila.creado_por || '',
      _raw: fila,
    };
  });
