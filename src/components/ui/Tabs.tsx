import { cn } from '../../lib/utils';

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
  count?: number;
  Icon?: React.ElementType;
}

interface TabsProps<K extends string> {
  items: TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  className?: string;
}

export function Tabs<K extends string>({ items, active, onChange, className }: TabsProps<K>) {
  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {items.map(({ key, label, count, Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold border transition-all',
              isActive
                ? 'bg-espoch-slate text-white border-transparent shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
            {count !== undefined && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[9px] font-extrabold',
                isActive ? 'bg-espoch-yellow text-gray-900' : 'bg-gray-100 text-gray-500'
              )}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
