export interface Recurso {
  id: number;
  tipo: 'libro' | 'software';
  titulo: string;
  portada: string;
  formato: string;
  size: string;
  // libro
  autor?: string;
  materia?: string;
  edicion?: string;
  // software
  descripcion?: string;
  tipoApp?: string;
  link?: string;
}

export const recursosData: Recurso[] = [
  { id: 1, tipo: 'libro', titulo: 'Circuitos Eléctricos', autor: 'James W. Nilsson', materia: 'Análisis de Circuitos', edicion: '11va Edición', portada: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300&h=400', formato: 'PDF', size: '25 MB' },
  { id: 2, tipo: 'libro', titulo: 'Sistemas de Control Automático', autor: 'Benjamin C. Kuo', materia: 'Sistemas de Control', edicion: '7ma Edición', portada: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=300&h=400', formato: 'Físico', size: 'Biblioteca' },
  { id: 3, tipo: 'libro', titulo: 'Máquinas Eléctricas', autor: 'Stephen J. Chapman', materia: 'Máquinas Eléctricas I', edicion: '5ta Edición', portada: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=300&h=400', formato: 'PDF', size: '15 MB' },
  { id: 4, tipo: 'libro', titulo: 'Física Universitaria Vol. 2', autor: 'Sears y Zemansky', materia: 'Física II', edicion: '14va Edición', portada: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=300&h=400', formato: 'PDF', size: '40 MB' },
  { id: 5, tipo: 'software', titulo: 'MATLAB R2023b', descripcion: 'Entorno de cálculo numérico y programación.', tipoApp: 'Simulación', link: '#', portada: 'https://images.unsplash.com/photo-1629654291663-b91ad427698f?q=80&w=300&h=400&auto=format&fit=crop', formato: 'App', size: 'Cloud/Local' },
  { id: 6, tipo: 'software', titulo: 'Proteus Design Suite 8.15', descripcion: 'Simulación de circuitos electrónicos.', tipoApp: 'Diseño Electrónico', link: '#', portada: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=300&h=400&auto=format&fit=crop', formato: 'App', size: 'Local' },
  { id: 7, tipo: 'software', titulo: 'AutoCAD Electrical 2024', descripcion: 'Software CAD para diseño.', tipoApp: 'CAD', link: '#', portada: 'https://images.unsplash.com/photo-1503694978374-8a2fa686963a?q=80&w=300&h=400&auto=format&fit=crop', formato: 'App', size: 'Local' },
  { id: 8, tipo: 'software', titulo: 'ETAP 22.0', descripcion: 'Análisis de sistemas de potencia.', tipoApp: 'Potencia', link: '#', portada: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?q=80&w=300&h=400&auto=format&fit=crop', formato: 'App', size: 'Local' },
];
