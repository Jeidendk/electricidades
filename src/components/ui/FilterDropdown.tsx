import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FilterOption {
  key: string;
  label: string;
}

interface FilterDropdownProps {
  icon?: React.ElementType;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (key: string) => void;
  className?: string;
}

export const FilterDropdown = ({ icon: Icon, label, value, options, onChange, className }: FilterDropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = options.find(o => o.key === value);

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 text-[12px] font-bold rounded-full py-2 px-4 border transition-all shadow-sm whitespace-nowrap',
          value && value !== 'todos' && value !== 'Todos' && value !== 'todas' && value !== 'Todas'
            ? 'bg-espoch-slate text-white border-transparent'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        )}
      >
        {Icon && <Icon className="w-3.5 h-3.5 opacity-70" />}
        {label}: {current?.label || value}
        <ChevronDown className={cn('w-3 h-3 opacity-50 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-50 min-w-[170px] animate-fade-in">
          {options.map(opt => (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={cn(
                'w-full text-left px-4 py-2 text-[12px] font-medium transition-colors',
                opt.key === value
                  ? 'bg-gray-100 text-gray-900 font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
