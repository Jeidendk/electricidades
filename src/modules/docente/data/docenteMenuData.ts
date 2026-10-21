import { Calendar, Inbox, Library, FileText, type LucideIcon } from 'lucide-react';

export interface AccionRapidaDocente {
  titulo: string;
  descripcion: string;
  ruta: string;
  Icono: LucideIcon;
  colorFondo: string;
  colorTexto: string;
}

export const ACCIONES_RAPIDAS_DOCENTE: AccionRapidaDocente[] = [
  {
    titulo: 'Mi Horario',
    descripcion: 'Consulta de horas y espacios',
    ruta: '/docente/horarios',
    Icono: Calendar,
    colorFondo: 'bg-red-50',
    colorTexto: 'text-espoch-red',
  },
  {
    titulo: 'Trámites y Solicitudes',
    descripcion: 'Préstamos y permisos de aula',
    ruta: '/docente/solicitudes',
    Icono: Inbox,
    colorFondo: 'bg-blue-50',
    colorTexto: 'text-blue-600',
  },
  {
    titulo: 'Material Académico',
    descripcion: 'Guías, laboratorios y software',
    ruta: '/docente/recursos',
    Icono: Library,
    colorFondo: 'bg-emerald-50',
    colorTexto: 'text-emerald-600',
  },
  {
    titulo: 'Formatos y Oficios',
    descripcion: 'Modelos institucionales ESPOCH',
    ruta: '/docente/formatos',
    Icono: FileText,
    colorFondo: 'bg-amber-50',
    colorTexto: 'text-amber-600',
  },
];
