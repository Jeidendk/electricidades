import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  total: number;
  perPage: number;
  onPerPageChange?: (n: number) => void;
}

export const Pagination = ({ page, totalPages, onChange, total, perPage, onPerPageChange }: PaginationProps) => {
  const start = (page - 1) * perPage;
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + perPage, total);

  return (
    <div className="flex items-center justify-between gap-4 mt-4 shrink-0 flex-wrap">

      {/* Izquierda: ícono + texto "Mostrando X-Y de Z" */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        <span className="text-[12px] font-medium text-gray-500">
          Mostrando <span className="font-bold text-gray-700">{from}-{to}</span> de <span className="font-bold text-gray-700">{total}</span> {total === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* Izquierda: "Filas por página: 10 ▾" */}
      {onPerPageChange && (
        <div className="flex items-center gap-2 text-[12px] font-medium text-gray-500">
          <span>Filas por página:</span>
          <select
            value={perPage}
            onChange={(e) => { onPerPageChange(Number(e.target.value)); onChange(1); }}
            className="border border-gray-200 bg-white rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-gray-50 text-[12px] font-bold text-gray-700 focus:border-indigo-300 transition-colors"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
          </select>
        </div>
      )}

      {/* Derecha: botones de páginas */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={cn('w-7 h-7 flex items-center justify-center rounded-lg text-xs', page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100')}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            className={cn('w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold', page === i + 1 ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100')}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={cn('w-7 h-7 flex items-center justify-center rounded-lg text-xs', page === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100')}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
