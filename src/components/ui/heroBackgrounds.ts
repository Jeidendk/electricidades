// Fondos temáticos de los banners (PageHero y heros propios de cada pantalla).
// Cada pantalla usa una imagen acorde a su tema; se renderiza al 25% de opacidad
// bajo el degradado oscuro, por lo que funciona como textura, no como protagonista.
//
// Las imágenes son remotas (Unsplash, mismo proveedor que ya usaba el proyecto).
// Si no cargan, el banner queda con el fondo sólido: degradación suave, no rompe la UI.

const unsplashUrl = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?q=80&w=2000&auto=format&fit=crop`;

export const HERO_BG = {
  /** Portátil con panel de métricas */
  dashboard: unsplashUrl('photo-1460925895917-afdab827c52f'),
  /** Calendario */
  horarios: unsplashUrl('photo-1506784983877-45594efa4cbe'),
  /** Laboratorio de equipos */
  asignaciones: unsplashUrl('photo-1581091226825-a6a2a5aee158'),
  /** Placa de circuito */
  activos: unsplashUrl('photo-1518770660439-4636190af475'),
  /** Bodega con estanterías */
  inventario: unsplashUrl('photo-1553413077-190dd305871c'),
  /** Obra en construcción */
  infraestructura: unsplashUrl('photo-1541888946425-d81bb19240f5'),
  /** Soldadura / trabajo técnico */
  mantenimiento: unsplashUrl('photo-1504328345606-18bbc8c9d7d1'),
  /** Apretón de manos: entrega y devolución */
  prestamos: unsplashUrl('photo-1521791136064-7986c2920216'),
  /** Reunión con documentos */
  tramites: unsplashUrl('photo-1517048676732-d65bc937f952'),
  /** Edificio universitario */
  estructuraAcademica: unsplashUrl('photo-1562774053-701939374585'),
  /** Aula con estudiantes */
  aula: unsplashUrl('photo-1509062522246-3755977927d7'),
  /** Estación de trabajo con monitores */
  tecnico: unsplashUrl('photo-1581094794329-c8112a89af12'),
} as const;
