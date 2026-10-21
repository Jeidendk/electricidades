/**
 * A quién se dirige un trámite académico.
 *
 * Hasta la migración 0045 el coordinador existía solo como texto (`carreras.director`), que
 * sirve para imprimirlo en el oficio pero no para mandarle nada ni para darle permisos. Ahora
 * `carreras.id_director` apunta a una cuenta real, y es esa cuenta la que recibe el trámite.
 *
 * Si no está configurada, esto devuelve el destino **sin cuenta**: la pantalla lo muestra como
 * limitación y no deja presentar. Inventar un destinatario o mandárselo a todos los
 * administradores sería peor que decir que falta un dato.
 */
import { supabase } from './supabase';
import { componerNombreCompleto } from './texto';

export interface DestinoInstitucional {
  /** Clave del selector. */
  id: string;
  /** Cuenta que recibirá el trámite; null si nadie la ha configurado. */
  idUsuario: string | null;
  titulo: string;
  nombre: string;
  cargo: string;
  /** Carrera o facultad de la que sale, para agrupar en el selector. */
  origen: string;
}

/** Separa "Ing. Juan Pérez" en tratamiento y nombre; sin tratamiento reconocible, todo es nombre. */
const separarTitulo = (texto: string): { titulo: string; nombre: string } => {
  const coincidencia = texto.trim().match(/^(Ing\.|Lic\.|Mgs\.|MSc\.|PhD\.|Dr\.|Dra\.)\s+(.+)$/i);
  return coincidencia
    ? { titulo: coincidencia[1], nombre: coincidencia[2] }
    : { titulo: '', nombre: texto.trim() };
};

/**
 * Los destinos que le corresponden a un estudiante: el coordinador de su carrera y el decano de
 * su facultad. El nombre impreso sale de la cuenta cuando existe, y del texto de la ficha
 * cuando no, para que el oficio siga saliendo bien aunque falte la configuración.
 */
export const cargarDestinosDelEstudiante = async (
  carreraId: string | null | undefined,
  facultadNombre: string | null | undefined,
): Promise<DestinoInstitucional[]> => {
  const destinos: DestinoInstitucional[] = [];

  if (carreraId) {
    const { data } = await supabase
      .from('carreras')
      .select('id, nombre, director, id_director, usuarios:id_director (id, nombre, apellido, titulo)')
      .eq('id', carreraId)
      .maybeSingle();

    if (data) {
      const carrera = data as any;
      const cuenta = carrera.usuarios;
      const desdeTexto = separarTitulo(carrera.director || '');
      destinos.push({
        id: `carrera-${carrera.id}`,
        idUsuario: cuenta?.id ?? null,
        titulo: cuenta?.titulo || desdeTexto.titulo,
        nombre: cuenta ? componerNombreCompleto(cuenta.nombre, cuenta.apellido) : desdeTexto.nombre,
        cargo: `DIRECTOR/A DE LA CARRERA DE ${String(carrera.nombre || '').toLocaleUpperCase('es')}`,
        origen: carrera.nombre,
      });
    }
  }

  if (facultadNombre) {
    const { data } = await supabase
      .from('facultades')
      .select('id, nombre, decano, id_decano, usuarios:id_decano (id, nombre, apellido, titulo)')
      .eq('nombre', facultadNombre)
      .maybeSingle();

    if (data) {
      const facultad = data as any;
      const cuenta = facultad.usuarios;
      const desdeTexto = separarTitulo(facultad.decano || '');
      destinos.push({
        id: `facultad-${facultad.id}`,
        idUsuario: cuenta?.id ?? null,
        titulo: cuenta?.titulo || desdeTexto.titulo,
        nombre: cuenta ? componerNombreCompleto(cuenta.nombre, cuenta.apellido) : desdeTexto.nombre,
        cargo: `DECANO/A DE ${String(facultad.nombre || '').toLocaleUpperCase('es')}`,
        origen: facultad.nombre,
      });
    }
  }

  return destinos.filter(destino => destino.nombre.trim() || destino.idUsuario);
};
