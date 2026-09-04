import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  total: number;
  perPage: number;
  onPerPageChange?: (n: number) => void;
  /** Para el pie que ya vive dentro de un contenedor con su propio espaciado. */
  className?: string;
}

/** Tamaños de página ofrecidos. Si la tabla arranca con otro, se añade para no dejar el select vacío. */
const FILAS_POR_PAGINA = [5, 10, 20, 50];

/** Máximo de botones numerados. Sin tope, 60 docentes a 5 por página dibujan 12 y rompen la fila. */
const MAX_BOTONES_PAGINA = 5;

/** Ventana de páginas alrededor de la actual. */
const paginasVisibles = (actual: number, total: number): number[] => {
  if (total <= MAX_BOTONES_PAGINA) return Array.from({ length: total }, (_, i) => i + 1);
  const mitad = Math.floor(MAX_BOTONES_PAGINA / 2);
  const inicio = Math.min(Math.max(1, actual - mitad), total - MAX_BOTONES_PAGINA + 1);
  return Array.from({ length: MAX_BOTONES_PAGINA }, (_, i) => inicio + i);
};

/**
 * Pie de tabla: cuántos registros se ven, cuántas filas por página y el paginador.
 *
 * Es el mismo pie en todas las tablas del sistema; antes cada pantalla lo escribía a mano y
 * cada copia había derivado en un tamaño de texto y una lista de opciones distintos.
 */
export const Pagination = ({ page, totalPages, onChange, total, perPage, onPerPageChange, className }: PaginationProps) => {
  const start = (page - 1) * perPage;
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + perPage, total);

  const opcionesFilas = FILAS_POR_PAGINA.includes(perPage)
    ? FILAS_POR_PAGINA
    : [...FILAS_POR_PAGINA, perPage].sort((a, b) => a - b);

  const botonPagina = 'w-8 h-8 flex items-center justify-center rounded-lg transition-colors';

  return (
    <div className={cn('flex flex-col md:flex-row justify-between items-center gap-4 mt-4 shrink-0', className)}>

      <div className="flex items-center gap-4 text-[11px] font-bold">
        <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full flex items-center gap-1.5 tracking-wider">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          {from}-{to} de {total}
        </span>

        {onPerPageChange && (
          <div className="flex items-center gap-2 text-gray-500">
            <span>Filas:</span>
            <select
              value={perPage}
              onChange={e => { onPerPageChange(Number(e.target.value)); onChange(1); }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
            >
              {opcionesFilas.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Página anterior"
          className={cn(botonPagina, page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100')}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {paginasVisibles(page, totalPages).map(numero => (
          <button
            key={numero}
            onClick={() => onChange(numero)}
            className={cn(
              botonPagina, 'text-xs font-bold',
              page === numero ? 'bg-espoch-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100',
            )}
          >
            {numero}
          </button>
        ))}

        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Página siguiente"
          className={cn(botonPagina, page === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100')}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
