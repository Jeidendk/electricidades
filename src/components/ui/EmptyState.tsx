import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  /** Acción principal: botón oscuro tipo pill (p. ej. "Crear primera carrera"). */
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ElementType;
  /** Acción secundaria: link de texto (p. ej. "Limpiar filtros"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** 'card' envuelve en tarjeta punteada; 'plain' solo centra el contenido. */
  variant?: 'plain' | 'card';
  className?: string;
}

export const EmptyState = ({
  icon: Icon, title, description,
  actionLabel, onAction, actionIcon: ActionIcon = Plus,
  secondaryLabel, onSecondary,
  variant = 'plain', className,
}: EmptyStateProps) => (
  <div className={cn(
    'flex flex-col items-center justify-center text-center',
    variant === 'card' ? 'py-12 bg-white border border-dashed border-gray-200 rounded-2xl' : 'py-16',
    className,
  )}>
    <Icon className="w-10 h-10 text-gray-200 mb-3" />
    <p className="text-[13px] font-bold text-gray-500 mb-1">{title}</p>
    {description && <p className="text-[11px] text-gray-400">{description}</p>}
    {actionLabel && onAction && (
      <button onClick={onAction} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#0f172a] hover:bg-black text-white rounded-full text-[11px] font-bold transition-all shadow-sm">
        <ActionIcon className="w-3.5 h-3.5" /> {actionLabel}
      </button>
    )}
    {secondaryLabel && onSecondary && (
      <button onClick={onSecondary} className="mt-2 text-[11px] font-bold text-indigo-600 hover:text-indigo-700">{secondaryLabel}</button>
    )}
  </div>
);
