import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Pagination } from './Pagination';
import { cn } from '../../lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Fracción o medida para grid-template-columns (default '1fr'). */
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** Si está presente, la columna es ordenable con este valor. */
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  minWidthClass?: string;
  /** Paginación integrada estilo Inventario (default true). */
  paginate?: boolean;
  defaultPerPage?: number;
  emptyState?: React.ReactNode;
  /** Estira la tarjeta a toda la altura del contenedor (como la tabla de Inventario). */
  fill?: boolean;
}

// Tabla estándar admin (formato Inventario): header sticky ordenable + filas animadas + paginación.
export function DataTable<T>({
  columns, rows, rowKey, onRowClick,
  minWidthClass = 'min-w-[820px]', paginate = true, defaultPerPage = 10, emptyState, fill = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  const sorted = useMemo(() => {
    const col = columns.find(c => c.key === sortKey);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a), vb = col.sortValue!(b);
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  }, [rows, columns, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, totalPages);
  const visible = paginate ? sorted.slice((safePage - 1) * perPage, safePage * perPage) : sorted;

  const handleSort = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return;
    if (sortKey === col.key) setSortAsc(!sortAsc);
    else { setSortKey(col.key); setSortAsc(true); }
  };

  const template = columns.map(c => c.width || '1fr').join(' ');
  const alignCls = (a?: string) => a === 'center' ? 'justify-center text-center' : a === 'right' ? 'justify-end text-right' : '';

  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden', fill && 'h-full')}>
      <div className={cn('overflow-auto custom-scrollbar', fill && 'flex-1 min-h-0')}>
        <div className={cn(minWidthClass, 'grid gap-4 px-4 pt-3 pb-3 border-b border-gray-100 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest sticky top-0 bg-white z-10')} style={{ gridTemplateColumns: template }}>
          {columns.map(col => (
            <div key={col.key} onClick={() => handleSort(col)} className={cn('flex items-center gap-1.5', alignCls(col.align), col.sortValue && 'cursor-pointer hover:text-gray-700')}>
              {col.header} {col.sortValue && <ArrowUpDown className="w-3 h-3" />}
            </div>
          ))}
        </div>
        {visible.length === 0 && emptyState}
        {visible.map((row, i) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            style={{ gridTemplateColumns: template, animationDelay: `${i * 30}ms` }}
            className={cn(minWidthClass, 'grid gap-4 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors items-center group animate-fade-in', onRowClick && 'cursor-pointer')}
          >
            {columns.map(col => (
              <div key={col.key} className={cn('min-w-0 flex items-center', alignCls(col.align))}>{col.render(row)}</div>
            ))}
          </div>
        ))}
      </div>
      {paginate && sorted.length > 0 && (
        <div className="px-4 pb-3 mt-auto">
          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} total={sorted.length} perPage={perPage} onPerPageChange={n => { setPerPage(n); setPage(1); }} />
        </div>
      )}
    </div>
  );
}
