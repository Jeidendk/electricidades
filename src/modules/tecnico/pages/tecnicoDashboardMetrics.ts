// Métricas del panel del técnico.
//
// Lógica pura (sin React ni Supabase): recibe las órdenes y los recursos que ya tiene el store
// y devuelve los datos listos para pintar. Todo sale de datos reales; nada está simulado.

export const ESTADO_ORDEN = {
  pendiente: 'pendiente',
  enProceso: 'en_proceso',
  resuelto: 'resuelto',
} as const;

export const PRIORIDAD_ORDEN = {
  alta: 'alta',
  media: 'media',
  baja: 'baja',
} as const;

export const ESTADO_INVENTARIO = {
  bueno: 'bueno',
  malo: 'malo',
  danado: 'dañado',
} as const;

/** Una orden abierta con más días que esto se marca como atrasada. */
export const DIAS_PARA_ORDEN_ATRASADA = 7;

/** Máximo de alertas que se muestran; el resto se resume en el contador de la cabecera. */
export const MAX_ALERTAS_VISIBLES = 6;

const COLOR = {
  pendiente: '#F59E0B',
  enProceso: '#2563EB',
  resuelto: '#10B981',
  danado: '#b00000',
  malo: '#F97316',
  bueno: '#10B981',
} as const;

export interface OrdenTecnico {
  id: string;
  recurso_nombre: string;
  categoria: string;
  ubicacion: string;
  prioridad: string;
  estado: string;
  fecha_reporte: string;
  fecha_cierre: string | null;
}

export interface RecursoAsignado {
  nombre: string;
  categoria: string;
}

export interface EquipoAsignado {
  id: string;
  nombre: string;
  estado: string;
  danio_desc?: string | null;
}

export interface PorcionGrafico {
  name: string;
  value: number;
  porcentaje: string;
  color: string;
}

export interface BarraCategoria {
  name: string;
  value: number;
  max: number;
}

export interface AlertaTecnico {
  id: string;
  titulo: string;
  detalle: string;
  severidad: 'critica' | 'aviso';
}

const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

/** Días transcurridos desde una fecha ISO. Devuelve 0 si la fecha no es válida. */
export const diasDesde = (fechaIso: string, ahora: Date = new Date()): number => {
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return 0;
  return Math.floor((ahora.getTime() - fecha.getTime()) / MILISEGUNDOS_POR_DIA);
};

const estaAbierta = (orden: OrdenTecnico) => orden.estado !== ESTADO_ORDEN.resuelto;

const porcentaje = (parte: number, total: number) =>
  total === 0 ? '0%' : `${Math.round((parte / total) * 100)}%`;

/** Conteos que alimentan los KPI del banner. */
export const contarOrdenes = (ordenes: OrdenTecnico[]) => ({
  pendientes: ordenes.filter(o => o.estado === ESTADO_ORDEN.pendiente).length,
  enProceso: ordenes.filter(o => o.estado === ESTADO_ORDEN.enProceso).length,
  resueltas: ordenes.filter(o => o.estado === ESTADO_ORDEN.resuelto).length,
});

/** Reparto de órdenes por estado, para el gráfico de anillo. */
export const distribucionPorEstado = (ordenes: OrdenTecnico[]): PorcionGrafico[] => {
  const { pendientes, enProceso, resueltas } = contarOrdenes(ordenes);
  const total = ordenes.length;

  return [
    { name: 'Pendientes', value: pendientes, porcentaje: porcentaje(pendientes, total), color: COLOR.pendiente },
    { name: 'En proceso', value: enProceso, porcentaje: porcentaje(enProceso, total), color: COLOR.enProceso },
    { name: 'Resueltas', value: resueltas, porcentaje: porcentaje(resueltas, total), color: COLOR.resuelto },
  ];
};

/** Órdenes agrupadas por prioridad y estado, para el gráfico de barras apiladas. */
export const ordenesPorPrioridad = (ordenes: OrdenTecnico[]) => {
  const etiquetas: { clave: string; nombre: string }[] = [
    { clave: PRIORIDAD_ORDEN.alta, nombre: 'Alta' },
    { clave: PRIORIDAD_ORDEN.media, nombre: 'Media' },
    { clave: PRIORIDAD_ORDEN.baja, nombre: 'Baja' },
  ];

  return etiquetas.map(({ clave, nombre }) => {
    const delGrupo = ordenes.filter(o => o.prioridad === clave);
    const { pendientes, enProceso, resueltas } = contarOrdenes(delGrupo);
    return { prioridad: nombre, pendientes, enProceso, resueltas };
  });
};

/** Recursos a cargo agrupados por categoría, ordenados de mayor a menor. */
export const recursosPorCategoria = (recursos: RecursoAsignado[]): BarraCategoria[] => {
  const conteos = new Map<string, number>();
  recursos.forEach(r => conteos.set(r.categoria, (conteos.get(r.categoria) || 0) + 1));

  const ordenados = [...conteos.entries()].sort((a, b) => b[1] - a[1]);
  const mayor = ordenados[0]?.[1] || 1;

  return ordenados.map(([name, value]) => ({ name, value, max: mayor }));
};

/** Estado de los equipos de inventario a cargo del técnico. */
export const estadoInventarioAsignado = (equipos: EquipoAsignado[]): PorcionGrafico[] => {
  const total = equipos.length;
  const contar = (estado: string) => equipos.filter(e => e.estado === estado).length;

  const buenos = contar(ESTADO_INVENTARIO.bueno);
  const malos = contar(ESTADO_INVENTARIO.malo);
  const danados = contar(ESTADO_INVENTARIO.danado);

  return [
    { name: 'En buen estado', value: buenos, porcentaje: porcentaje(buenos, total), color: COLOR.bueno },
    { name: 'En mal estado', value: malos, porcentaje: porcentaje(malos, total), color: COLOR.malo },
    { name: 'Dañados', value: danados, porcentaje: porcentaje(danados, total), color: COLOR.danado },
  ];
};

/**
 * Alertas derivadas de datos reales, no de ejemplos:
 * órdenes urgentes sin resolver, órdenes abiertas demasiado tiempo y equipos averiados a cargo.
 * Las críticas van primero.
 */
export const alertasDelTecnico = (
  ordenes: OrdenTecnico[],
  equipos: EquipoAsignado[],
  ahora: Date = new Date(),
): AlertaTecnico[] => {
  const urgentes: AlertaTecnico[] = ordenes
    .filter(o => estaAbierta(o) && o.prioridad === PRIORIDAD_ORDEN.alta)
    .map(o => ({
      id: `urgente-${o.id}`,
      titulo: `Prioridad alta: ${o.recurso_nombre}`,
      detalle: `${o.ubicacion || 'Sin ubicación'} · abierta hace ${diasDesde(o.fecha_reporte, ahora)} d`,
      severidad: 'critica' as const,
    }));

  const atrasadas: AlertaTecnico[] = ordenes
    .filter(o => estaAbierta(o)
      && o.prioridad !== PRIORIDAD_ORDEN.alta
      && diasDesde(o.fecha_reporte, ahora) > DIAS_PARA_ORDEN_ATRASADA)
    .map(o => ({
      id: `atrasada-${o.id}`,
      titulo: `Sin cerrar: ${o.recurso_nombre}`,
      detalle: `Reportada hace ${diasDesde(o.fecha_reporte, ahora)} días`,
      severidad: 'aviso' as const,
    }));

  const averiados: AlertaTecnico[] = equipos
    .filter(e => e.estado === ESTADO_INVENTARIO.danado || e.estado === ESTADO_INVENTARIO.malo)
    .map(e => ({
      id: `equipo-${e.id}`,
      titulo: `${e.nombre} en estado ${e.estado}`,
      detalle: e.danio_desc?.trim() || 'Equipo a tu cargo que requiere revisión',
      severidad: e.estado === ESTADO_INVENTARIO.danado ? ('critica' as const) : ('aviso' as const),
    }));

  return [...urgentes, ...averiados, ...atrasadas]
    .sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === 'critica' ? -1 : 1));
};
