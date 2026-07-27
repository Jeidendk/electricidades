export interface Equipo {
  id: string;
  serie: string;
  nombre: string;
  categoria: 'herramientas' | 'equipos' | 'tecnologico' | 'mobiliario';
  stock: number;
  stockTotal: number;
  estado: 'disponible' | 'agotado';
  foto: string;
  ubicacion: string;
}

export const catalogoData: Equipo[] = [
  { id: 'EQ001', serie: 'MUL-1001', nombre: 'Multímetro Digital Fluke 87V', categoria: 'herramientas', stock: 8, stockTotal: 10, estado: 'disponible', foto: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=400&h=300&fit=crop', ubicacion: 'Lab. Circuitos' },
  { id: 'EQ002', serie: 'OSC-2005', nombre: 'Osciloscopio Tektronix TBS1072C', categoria: 'herramientas', stock: 3, stockTotal: 5, estado: 'disponible', foto: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop', ubicacion: 'Lab. Circuitos' },
  { id: 'EQ003', serie: 'GEN-001', nombre: 'Generador de Funciones GW Instek', categoria: 'herramientas', stock: 0, stockTotal: 4, estado: 'agotado', foto: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop', ubicacion: 'Lab. Circuitos' },
  { id: 'EQ004', serie: 'PLC-1200', nombre: 'Módulo PLC Siemens S7-1200', categoria: 'equipos', stock: 6, stockTotal: 8, estado: 'disponible', foto: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop', ubicacion: 'Lab. Control' },
  { id: 'EQ005', serie: 'MOT-3F01', nombre: 'Motor Trifásico WEG 5HP', categoria: 'equipos', stock: 2, stockTotal: 3, estado: 'disponible', foto: 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=400&h=300&fit=crop', ubicacion: 'Lab. Potencia' },
  { id: 'EQ006', serie: 'FTE-AC01', nombre: 'Fuente de Alimentación DC 30V/5A', categoria: 'herramientas', stock: 5, stockTotal: 10, estado: 'disponible', foto: 'https://images.unsplash.com/photo-1530124566582-a45a7c79f2a6?w=400&h=300&fit=crop', ubicacion: 'Lab. Electrónica' },
  { id: 'EQ007', serie: 'PROY-012', nombre: 'Proyector Epson PowerLite X51+', categoria: 'tecnologico', stock: 1, stockTotal: 2, estado: 'disponible', foto: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=300&fit=crop', ubicacion: 'Aula Magna' },
  { id: 'EQ008', serie: 'PC-3001', nombre: 'Computadora HP ProDesk i7', categoria: 'tecnologico', stock: 12, stockTotal: 20, estado: 'disponible', foto: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400&h=300&fit=crop', ubicacion: 'Lab. Cómputo 1' },
  { id: 'EQ009', serie: 'PIN-001', nombre: 'Pinza Amperimétrica Fluke 376', categoria: 'herramientas', stock: 4, stockTotal: 6, estado: 'disponible', foto: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=300&fit=crop', ubicacion: 'Lab. Potencia' },
  { id: 'EQ010', serie: 'PAN-001', nombre: 'Panel Solar Monocristalino 300W', categoria: 'equipos', stock: 0, stockTotal: 2, estado: 'agotado', foto: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=300&fit=crop', ubicacion: 'Lab. Energías' },
  { id: 'EQ011', serie: 'PROTO-01', nombre: 'Protoboard Grande 2390 puntos', categoria: 'herramientas', stock: 15, stockTotal: 30, estado: 'disponible', foto: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=400&h=300&fit=crop', ubicacion: 'Lab. Electrónica' },
  { id: 'EQ012', serie: 'ROU-001', nombre: 'Router Cisco 2911', categoria: 'tecnologico', stock: 3, stockTotal: 4, estado: 'disponible', foto: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop', ubicacion: 'Lab. Telecom' },
];
