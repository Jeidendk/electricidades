import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CrudModalProps {
  open: boolean;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Botones del pie (Cancelar / Guardar). Sin footer no se renderiza la franja. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string;
}

// Esqueleto estándar de modal CRUD admin: overlay + header con ícono + cuerpo scrollable + footer.
export const CrudModal = ({ open, icon: Icon, title, subtitle, onClose, footer, children, maxWidthClass = 'max-w-[500px]' }: CrudModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className={cn('bg-white rounded-[24px] w-full max-h-[90vh] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-scale-up', maxWidthClass)}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
              {subtitle && <p className="text-[10px] font-semibold text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-white shadow-sm border border-gray-200 rounded-full p-1.5 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar">{children}</div>
        {footer && <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-white shrink-0">{footer}</div>}
      </div>
    </div>
  );
};
