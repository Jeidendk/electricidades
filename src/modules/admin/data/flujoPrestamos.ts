/**
 * El recorrido de un préstamo de equipos, sin React y sin Supabase.
 *
 * Solicita el estudiante → el personal aprueba (reserva unidades) → entrega en mano → recibe la
 * devolución. Aprobar y entregar son dos hechos distintos: el plazo se cuenta desde la entrega.
 *
 * Las mismas reglas están escritas en las funciones de la migración 0043, que son las que
 * mandan: aquí sirven para no ofrecer un botón que el servidor va a rechazar.
 */

/** Estados de una fila de `prestamos` (enum `estado_prestamo`, migración 0042). */
export type EstadoPrestamo = 'reservado' | 'activo' | 'devuelto' | 'cancelado';

/** Estados de una solicitud de equipos (enum `estado_solicitud`, migración 0042). */
export type EstadoSolicitudEquipo =
  | 'Pendiente'
  | 'Aprobada'
  | 'Entregada'
  | 'Devuelto'
  | 'Rechazada'
  | 'Cancelada';

/** Cómo volvió el equipo. Coincide con las etiquetas de `estado_inventario`. */
export type CondicionDevolucion = 'bueno' | 'malo' | 'dañado';

/** Días de préstamo cuando quien aprueba no indica otro plazo. */
export const DIAS_PRESTAMO_POR_DEFECTO = 7;

/** Lo mínimo que hace falta de un préstamo para razonar sobre él. */
export interface PrestamoResumible {
  estado: string;
  fecha_devolucion_esperada: string;
}

/**
 * Una unidad ocupada no se puede volver a prestar. `devuelto` y `cancelado` la liberan.
 * El índice `prestamos_unidad_ocupada` de la 0043 usa exactamente estos dos estados.
 */
export const ESTADOS_QUE_OCUPAN_UNIDAD: readonly string[] = ['reservado', 'activo'];

export const ocupaUnidad = (estado: string): boolean =>
  ESTADOS_QUE_OCUPAN_UNIDAD.includes(estado);

/**
 * Atrasado es un hecho derivado, no un estado guardado: préstamo entregado cuya fecha de
 * devolución ya pasó. Una reserva sin entregar no puede estar atrasada.
 */
export const esAtrasado = (prestamo: PrestamoResumible, hoy: string): boolean =>
  prestamo.estado === 'activo' && prestamo.fecha_devolucion_esperada < hoy;

export const ETIQUETA_ESTADO_PRESTAMO: Record<EstadoPrestamo, string> = {
  reservado: 'Reservado',
  activo: 'Entregado',
  devuelto: 'Devuelto',
  cancelado: 'Cancelado',
};

export const ETIQUETA_ESTADO_SOLICITUD: Record<EstadoSolicitudEquipo, string> = {
  Pendiente: 'Pendiente',
  Aprobada: 'Aprobada',
  Entregada: 'Entregada',
  Devuelto: 'Devuelta',
  Rechazada: 'Rechazada',
  Cancelada: 'Cancelada',
};

// --- Qué se puede hacer con una solicitud, según su estado ------------------
// El servidor vuelve a comprobarlo todo; esto solo decide qué botón se dibuja.

export const puedeAprobarse = (estado: string) => estado === 'Pendiente';
export const puedeRechazarse = (estado: string) => estado === 'Pendiente';
export const puedeEntregarse = (estado: string) => estado === 'Aprobada';

/** El estudiante solo retira una solicitud que nadie ha procesado todavía. */
export const puedeCancelarlaElEstudiante = (estado: string) => estado === 'Pendiente';

/** El personal además puede liberar las unidades de una solicitud ya aprobada. */
export const puedeCancelarlaElPersonal = (estado: string) =>
  estado === 'Pendiente' || estado === 'Aprobada';

/**
 * Unidades que se pueden prestar de un grupo del catálogo.
 *
 * Estar en buen estado no basta: una unidad reservada o ya entregada sigue contando como
 * existencia del laboratorio, pero no está disponible. Contar solo el estado físico era lo que
 * permitía prestar dos veces el mismo osciloscopio.
 */
export const unidadesDisponibles = (
  unidades: { id: string; estado: string }[],
  ocupadas: ReadonlySet<string>,
): number => unidades.filter(unidad => unidad.estado === 'bueno' && !ocupadas.has(unidad.id)).length;

export interface ResumenPrestamos {
  reservados: number;
  activos: number;
  atrasados: number;
  devueltos: number;
}

/**
 * Las cifras del banner. `activos` excluye a los atrasados: si un préstamo se contara en los
 * dos, las tarjetas sumarían más préstamos de los que hay.
 */
export const resumirPrestamos = (
  prestamos: PrestamoResumible[],
  hoy: string,
): ResumenPrestamos => ({
  reservados: prestamos.filter(p => p.estado === 'reservado').length,
  activos: prestamos.filter(p => p.estado === 'activo' && !esAtrasado(p, hoy)).length,
  atrasados: prestamos.filter(p => esAtrasado(p, hoy)).length,
  devueltos: prestamos.filter(p => p.estado === 'devuelto').length,
});

/** Suma N días a una fecha `YYYY-MM-DD` sin arrastrar zona horaria. */
export const sumarDias = (fecha: string, dias: number): string => {
  const base = new Date(`${fecha}T00:00:00`);
  base.setDate(base.getDate() + dias);
  return base.toISOString().slice(0, 10);
};
