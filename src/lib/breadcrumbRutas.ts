/**
 * Sección y título de cada ruta, para el rastro de navegación del banner.
 *
 * Vivía dentro de `AdminTopbar`, que ya no se muestra en escritorio. Se extrajo aquí para que
 * el hero de cada página pueda decir dónde está parado el usuario sin duplicar la tabla.
 */
export interface RutaNombrada {
  seccion: string;
  titulo: string;
}

const RUTAS: Record<string, RutaNombrada> = {
  '/admin/dashboard': { seccion: 'Inicio', titulo: 'Panel de Control' },
  '/admin/tramites': { seccion: 'Trámites', titulo: 'Trámites' },
  '/admin/formatos': { seccion: 'Trámites', titulo: 'Formatos' },
  '/admin/horarios': { seccion: 'Académico', titulo: 'Horarios' },
  '/admin/activos': { seccion: 'Recursos', titulo: 'Activos' },
  '/admin/infraestructura': { seccion: 'Infraestructura', titulo: 'Infraestructura' },
  '/admin/estructura-academica': { seccion: 'Institución', titulo: 'Estructura Académica' },
  '/admin/recursos': { seccion: 'Académico', titulo: 'Recursos' },
  '/admin/usuarios': { seccion: 'Administración', titulo: 'Usuarios' },
  '/admin/reportes': { seccion: 'Sistema', titulo: 'Reportes' },
  '/admin/asignacion-mapa': { seccion: 'Gestión', titulo: 'Mapa de Asignaciones' },
};

/**
 * Resuelve la ruta actual. Acepta `/admin/*` y `/tecnico/*`: para el técnico se busca por el
 * último segmento, porque comparte pantallas con el admin bajo otro prefijo.
 * Devuelve `null` en rutas sin nombre, para que el banner simplemente no dibuje el rastro.
 */
export const rutaNombrada = (pathname: string): RutaNombrada | null => {
  const ultimoSegmento = pathname.split('/').filter(Boolean).pop() || '';
  return RUTAS[pathname] ?? RUTAS['/admin/' + ultimoSegmento] ?? null;
};
