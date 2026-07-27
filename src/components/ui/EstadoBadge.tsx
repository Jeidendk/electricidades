interface EstadoConfig {
  label: string;
  cls: string;
  dot: string;
}

// Estados conocidos del dominio → estilo visual. Fallback: gris con el texto crudo.
const ESTADOS: Record<string, EstadoConfig> = {
  activo: { label: 'Activa', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200/50', dot: 'bg-emerald-500 animate-pulse' },
  en_reorganizacion: { label: 'Reorganización', cls: 'bg-amber-50 text-amber-600 border-amber-200/50', dot: 'bg-amber-500' },
  inactivo: { label: 'Inactiva', cls: 'bg-gray-100 text-gray-500 border-gray-200/60', dot: 'bg-gray-400' },
  mantenimiento: { label: 'Mantenimiento', cls: 'bg-orange-50 text-orange-600 border-orange-200/50', dot: 'bg-orange-500' },
  // Infraestructura / espacios
  operativo: { label: 'Operativo', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200/50', dot: 'bg-emerald-500 animate-pulse' },
  disponible: { label: 'Disponible', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200/50', dot: 'bg-emerald-500 animate-pulse' },
  ocupada: { label: 'Ocupada', cls: 'bg-blue-50 text-blue-600 border-blue-200/50', dot: 'bg-blue-500' },
};

interface EstadoBadgeProps {
  estado: string;
  /** Sobrescribe el texto del badge (p. ej. "Activo" en masculino). */
  label?: string;
}

export const EstadoBadge = ({ estado, label }: EstadoBadgeProps) => {
  const cfg = ESTADOS[estado] ?? { label: estado, cls: 'bg-gray-100 text-gray-500 border-gray-200/60', dot: 'bg-gray-400' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 w-max ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span> {label ?? cfg.label}
    </span>
  );
};
