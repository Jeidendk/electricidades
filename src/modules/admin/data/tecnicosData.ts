export interface Tecnico {
  id: string;
  nombre: string;
  email: string;
  departamento: string;
  avatar: string;
}

// Técnicos responsables (compartido entre Asignaciones y Mantenimiento).
export const tecnicos: Tecnico[] = [
  { id: 'TEC001', nombre: 'Pedro Alvarado', email: 'p.alvarado@espoch.edu.ec', departamento: 'FIE', avatar: 'https://i.pravatar.cc/150?u=10' },
  { id: 'TEC002', nombre: 'Sofía Núñez', email: 's.nunez@espoch.edu.ec', departamento: 'Lab. Control', avatar: 'https://i.pravatar.cc/150?u=11' },
  { id: 'TEC003', nombre: 'Marco Flores', email: 'm.flores@espoch.edu.ec', departamento: 'Centro de Cómputo', avatar: 'https://i.pravatar.cc/150?u=12' },
];

export const tecnicoById = (id: string | null) => tecnicos.find(t => t.id === id) || null;
