import { mismoDia, normalizarTexto } from './texto.ts';

export interface Tramo { inicio: number; fin: number }
export interface ClaseDisponibilidad {
  id_espacio: string | null;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
}

export function minutosHora(hora: string): number {
  if (!/^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(hora)) return NaN;
  const [h, m, s = 0] = hora.split(':').map(Number);
  return h < 24 && m < 60 && s < 60 ? h * 60 + m + s / 60 : NaN;
}

export function mostrarHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(Math.floor(minutos % 60)).padStart(2, '0')}`;
}

/**
 * Intervalos semiabiertos: una clase que termina a las 09:00 no ocupa las 09:00.
 *
 * `consulta` es OPCIONAL. Sin ella se devuelven igual todos los tramos libres del día y
 * `libre` pasa a significar "tiene alguna hora libre", que es lo que se quiere ver de entrada:
 * obligar a elegir una franja antes de mirar convierte la consulta en una adivinanza.
 */
export function calcularDisponibilidad(
  espacio: { id: string; estado: string },
  estadoEdificio: string | undefined,
  clases: ClaseDisponibilidad[],
  dia: string,
  jornada: Tramo,
  consulta?: Tramo,
): { libre: boolean; motivo: string; libres: Tramo[]; ocupados: Tramo[] } {
  const bloqueado = (motivo: string) => ({ libre: false, motivo, libres: [], ocupados: [] });
  if (consulta && (!(Number.isFinite(consulta.inicio) && Number.isFinite(consulta.fin)) ||
    consulta.inicio >= consulta.fin || consulta.inicio < jornada.inicio || consulta.fin > jornada.fin)) {
    return bloqueado('Intervalo inválido');
  }
  if (!estadoEdificio) return bloqueado('Edificio sin información');
  if (normalizarTexto(estadoEdificio) !== 'operativo') return bloqueado(`Edificio: ${estadoEdificio}`);
  if (normalizarTexto(espacio.estado) !== 'disponible') return bloqueado(`Espacio: ${espacio.estado || 'sin estado'}`);

  const intervalos = clases.filter(c => c.id_espacio === espacio.id && mismoDia(c.dia, dia))
    .map(c => ({ inicio: minutosHora(c.hora_inicio), fin: minutosHora(c.hora_fin) }));
  // No declarar libre un espacio cuyo horario no se puede interpretar.
  if (intervalos.some(t => !Number.isFinite(t.inicio) || !Number.isFinite(t.fin) || t.inicio >= t.fin)) {
    return bloqueado('Revisar horas de las clases');
  }
  const ocupados: Tramo[] = [];
  for (const tramo of intervalos.sort((a, b) => a.inicio - b.inicio)) {
    const inicio = Math.max(jornada.inicio, tramo.inicio);
    const fin = Math.min(jornada.fin, tramo.fin);
    if (inicio >= fin) continue;
    const anterior = ocupados.at(-1);
    if (anterior && inicio <= anterior.fin) anterior.fin = Math.max(anterior.fin, fin);
    else ocupados.push({ inicio, fin });
  }
  const libres: Tramo[] = [];
  let cursor = jornada.inicio;
  for (const tramo of ocupados) {
    if (cursor < tramo.inicio) libres.push({ inicio: cursor, fin: tramo.inicio });
    cursor = tramo.fin;
  }
  if (cursor < jornada.fin) libres.push({ inicio: cursor, fin: jornada.fin });
  if (!consulta) {
    const tieneHuecos = libres.length > 0;
    return {
      libre: tieneHuecos,
      motivo: tieneHuecos ? 'Con horas libres' : 'Ocupada todo el día',
      libres,
      ocupados,
    };
  }
  const libre = libres.some(t => t.inicio <= consulta.inicio && t.fin >= consulta.fin);
  return { libre, motivo: libre ? 'Libre en toda la franja' : 'Con clases en esta franja', libres, ocupados };
}
