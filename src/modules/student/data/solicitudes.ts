export interface PDFItem {
  nombre: string;
  serie: string;
  categoria: string;
  cantidad: number;
}

export interface Solicitud {
  id: string;
  numero: string;
  asignatura: string;
  itemsStr: string; // for display in table
  items: PDFItem[]; // for PDF generation
  fecha: string; // ISO date string
  hora: string;
  estado: 'Aprobada' | 'Pendiente' | 'Devuelto' | 'Rechazada';
}

export const solicitudesData: Solicitud[] = [
  {
    id: '1',
    numero: 'SOL-2026-0042',
    asignatura: 'Circuitos Eléctricos I',
    itemsStr: 'Multímetro Fluke, Osciloscopio',
    items: [
      { nombre: 'Multímetro Fluke', serie: 'MLT-2041', categoria: 'Medición', cantidad: 1 },
      { nombre: 'Osciloscopio', serie: 'OSC-1022', categoria: 'Medición', cantidad: 1 }
    ],
    fecha: '2026-05-22',
    hora: '10:30 AM',
    estado: 'Aprobada'
  },
  {
    id: '2',
    numero: 'SOL-2026-0038',
    asignatura: 'Electrónica Analógica',
    itemsStr: 'Protoboard, Fuente DC',
    items: [
      { nombre: 'Protoboard', serie: 'PRT-001', categoria: 'Accesorios', cantidad: 1 },
      { nombre: 'Fuente DC', serie: 'FDC-042', categoria: 'Fuentes', cantidad: 1 }
    ],
    fecha: '2026-05-20',
    hora: '09:15 AM',
    estado: 'Aprobada'
  },
  {
    id: '3',
    numero: 'SOL-2026-0051',
    asignatura: 'Control Automático',
    itemsStr: 'PLC S7-1200, Motor 5HP',
    items: [
      { nombre: 'PLC S7-1200', serie: 'PLC-S712', categoria: 'Control', cantidad: 1 },
      { nombre: 'Motor 5HP', serie: 'MOT-5HP', categoria: 'Máquinas', cantidad: 1 }
    ],
    fecha: '2026-05-23',
    hora: '02:45 PM',
    estado: 'Pendiente'
  },
  {
    id: '4',
    numero: 'SOL-2026-0062',
    asignatura: 'Máquinas Eléctricas',
    itemsStr: 'Motor Inducción Trifásico',
    items: [
      { nombre: 'Motor Inducción Trifásico', serie: 'MOT-IND3', categoria: 'Máquinas', cantidad: 1 }
    ],
    fecha: '2026-05-24',
    hora: '11:20 AM',
    estado: 'Pendiente'
  },
  {
    id: '5',
    numero: 'SOL-2026-0012',
    asignatura: 'Sistemas Digitales',
    itemsStr: 'Compuertas Lógicas, Arduino UNO',
    items: [
      { nombre: 'Compuertas Lógicas Kit', serie: 'KIT-LOG', categoria: 'Componentes', cantidad: 1 },
      { nombre: 'Arduino UNO', serie: 'ARD-UNO', categoria: 'Microcontroladores', cantidad: 1 }
    ],
    fecha: '2026-05-10',
    hora: '08:00 AM',
    estado: 'Devuelto'
  },
  {
    id: '6',
    numero: 'SOL-2026-0005',
    asignatura: 'Instalaciones Eléctricas',
    itemsStr: 'Pinzas Amperimétricas, Multímetro',
    items: [
      { nombre: 'Pinza Amperimétrica', serie: 'PNZ-AMP', categoria: 'Medición', cantidad: 1 },
      { nombre: 'Multímetro Básico', serie: 'MLT-BAS', categoria: 'Medición', cantidad: 1 }
    ],
    fecha: '2026-05-02',
    hora: '04:10 PM',
    estado: 'Rechazada'
  }
];
