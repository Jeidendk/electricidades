export type CategoriaInventario = 'equipos' | 'herramientas' | 'mobiliario' | 'tecnologico';
/** Etiquetas exactas del enum `estado_inventario` de Postgres (migración 0019: con ñ). */
export const ESTADO_FISICO = { bueno: 'bueno', malo: 'malo', danado: 'dañado' } as const;

export type EstadoFisico = (typeof ESTADO_FISICO)[keyof typeof ESTADO_FISICO];

/** Texto capitalizado para mostrar en pantalla. */
export const ETIQUETA_ESTADO_FISICO: Record<EstadoFisico, string> = {
  bueno: 'Bueno', malo: 'Malo', 'dañado': 'Dañado',
};

export interface InventarioItem {
  id: string;
  serie: string;
  nombre: string;
  categoria: CategoriaInventario;
  edificio: string;
  aula: string;
  estado: EstadoFisico;
  danioDesc: string;
  fotos: string[];
}

// Catálogo de categorías (label para tabs/badges). El icono se resuelve en el componente.
export const CATEGORIAS: { key: CategoriaInventario; label: string }[] = [
  { key: 'equipos', label: 'Equipos' },
  { key: 'herramientas', label: 'Herramientas' },
  { key: 'mobiliario', label: 'Mobiliario' },
  { key: 'tecnologico', label: 'Tecnológico' },
];

export const EDIFICIOS = [
  'Edificio FIE-A',
  'Edificio FIE-B',
  'Bloque de Laboratorios',
  'Centro de Cómputo',
  'Bloque Administrativo',
];

// Fuente única: fusiona los datos de las antiguas páginas
// Herramientas / Equipos / Mobiliario / Tecnológico.
export const inventarioData: InventarioItem[] = [
  // ── Herramientas ──
  { id: 'EQ001', serie: 'MUL-1001', nombre: 'Multímetro Digital Fluke', categoria: 'herramientas', edificio: 'Edificio FIE-A', aula: 'Lab. Circuitos', estado: 'bueno', danioDesc: '', fotos: ['https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=400&h=250&fit=crop'] },
  { id: 'EQ002', serie: 'OSC-2005', nombre: 'Osciloscopio Tektronix', categoria: 'herramientas', edificio: 'Edificio FIE-A', aula: 'Lab. Circuitos', estado: 'malo', danioDesc: 'Problema en el canal 2 de lectura', fotos: [] },
  { id: 'EQ013', serie: 'OSC-2006', nombre: 'Osciloscopio Rigol', categoria: 'herramientas', edificio: 'Edificio FIE-A', aula: 'Lab. Electrónica', estado: 'bueno', danioDesc: '', fotos: [] },
  { id: 'EQ015', serie: 'GEN-001', nombre: 'Generador de Funciones', categoria: 'herramientas', edificio: 'Edificio FIE-A', aula: 'Lab. Circuitos', estado: 'dañado', danioDesc: 'No enciende', fotos: [] },

  // ── Equipos ──
  { id: 'EQ008', serie: 'PLC-1200', nombre: 'Módulo PLC S7-1200', categoria: 'equipos', edificio: 'Bloque de Laboratorios', aula: 'Lab. Control', estado: 'bueno', danioDesc: '', fotos: [] },
  { id: 'EQ009', serie: 'MOT-3F01', nombre: 'Motor Trifásico 5HP', categoria: 'equipos', edificio: 'Edificio FIE-B', aula: 'Lab. Potencia', estado: 'bueno', danioDesc: '', fotos: [] },

  // ── Mobiliario ──
  { id: 'EQ005', serie: 'MES-001', nombre: 'Mesa de Laboratorio 6 puestos', categoria: 'mobiliario', edificio: 'Edificio FIE-A', aula: 'Lab. Electrónica', estado: 'bueno', danioDesc: '', fotos: [] },
  { id: 'EQ006', serie: 'SILL-045', nombre: 'Silla Universitaria', categoria: 'mobiliario', edificio: 'Edificio FIE-B', aula: 'Aula 103', estado: 'malo', danioDesc: 'Patas chuecas', fotos: [] },
  { id: 'EQ010', serie: 'SILL-046', nombre: 'Silla Universitaria', categoria: 'mobiliario', edificio: 'Edificio FIE-B', aula: 'Aula 103', estado: 'bueno', danioDesc: '', fotos: [] },
  { id: 'EQ011', serie: 'SILL-047', nombre: 'Silla Universitaria', categoria: 'mobiliario', edificio: 'Edificio FIE-B', aula: 'Aula 103', estado: 'bueno', danioDesc: '', fotos: [] },
  { id: 'EQ017', serie: 'MES-002', nombre: 'Mesa de Laboratorio 6 puestos', categoria: 'mobiliario', edificio: 'Bloque de Laboratorios', aula: 'Lab. Control', estado: 'malo', danioDesc: 'Superficie rayada', fotos: [] },

  // ── Tecnológico / Audiovisual ──
  { id: 'EQ003', serie: 'PC-3001', nombre: 'Computadora Core i7', categoria: 'tecnologico', edificio: 'Centro de Cómputo', aula: 'Lab. Cómputo 1', estado: 'bueno', danioDesc: '', fotos: [] },
  { id: 'EQ004', serie: 'PC-3002', nombre: 'Computadora Core i7', categoria: 'tecnologico', edificio: 'Centro de Cómputo', aula: 'Lab. Cómputo 1', estado: 'dañado', danioDesc: 'Fuente de poder quemada', fotos: [] },
  { id: 'EQ007', serie: 'PROY-012', nombre: 'Proyector Epson Infocus', categoria: 'tecnologico', edificio: 'Bloque Administrativo', aula: 'Aula Magna', estado: 'bueno', danioDesc: '', fotos: [] },
  { id: 'EQ012', serie: 'PC-3003', nombre: 'Computadora Core i7', categoria: 'tecnologico', edificio: 'Centro de Cómputo', aula: 'Lab. Cómputo 2', estado: 'malo', danioDesc: 'Disco duro defectuoso', fotos: [] },
  { id: 'EQ014', serie: 'PAN-001', nombre: 'Panel Solar 300W', categoria: 'tecnologico', edificio: 'Bloque de Laboratorios', aula: 'Lab. Energías Renovables', estado: 'bueno', danioDesc: '', fotos: [] },
  { id: 'EQ016', serie: 'PROY-013', nombre: 'Proyector Epson PowerLite', categoria: 'tecnologico', edificio: 'Edificio FIE-A', aula: 'Aula 201', estado: 'bueno', danioDesc: '', fotos: [] },
  { id: 'EQ018', serie: 'ROU-001', nombre: 'Router Cisco 2911', categoria: 'tecnologico', edificio: 'Bloque de Laboratorios', aula: 'Lab. Telecomunicaciones', estado: 'bueno', danioDesc: '', fotos: [] },
];
