import React from 'react';
import { Zap, ChevronRight } from 'lucide-react';
import type { EquipoCatalogo } from '../../../store/catalogoEquiposStore';

/** Devuelve la primera foto del array fotos_json o vacío. */
function fotoDe(item: EquipoCatalogo): string {
  const f = item.fotos_json;
  if (Array.isArray(f) && f.length > 0) return String(f[0] || '');
  if (typeof f === 'string') return f;
  return '';
}

interface RecentArrivalsProps {
  items: EquipoCatalogo[];
  onVerTodos?: () => void;
  onSelectItem?: (item: EquipoCatalogo) => void;
}

export const RecentArrivals: React.FC<RecentArrivalsProps> = ({
  items,
  onVerTodos,
  onSelectItem,
}) => {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="text-red-600">
            <Zap className="w-5 h-5 fill-red-600" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              Ingresos recientes
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-tight mt-0.5">
              Últimos equipos incorporados al catálogo
            </p>
          </div>
        </div>

        <button
          onClick={onVerTodos}
          className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-0.5 transition cursor-pointer"
        >
          <span>Ver todos</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        className="flex items-start gap-3.5 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {items.map((item) => {
          const foto = fotoDe(item);
          return (
            <div
              key={item.id}
              onClick={() => onSelectItem?.(item)}
              className="flex flex-col items-center shrink-0 group cursor-pointer"
            >
              <div className="w-[108px] h-[135px] rounded-xl overflow-hidden relative border border-slate-200/90 shadow-2xs group-hover:shadow-md transition duration-200">
                <div className="w-full h-full transform group-hover:scale-105 transition duration-300">
                  {foto ? (
                    <img
                      src={foto}
                      alt={item.nombre}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <EquipPlaceholder nombre={item.nombre} />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
                  <p className="text-[11px] font-bold text-white leading-tight line-clamp-2 drop-shadow-xs">
                    {item.nombre}
                  </p>
                </div>
              </div>
              <div className="h-1 w-6 rounded-full bg-red-600 mt-1.5 transition-all group-hover:w-10" />
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="text-xs text-slate-400 py-4">No hay equipos recientes.</p>
        )}
      </div>
    </section>
  );
};

function EquipPlaceholder({ nombre }: { nombre: string }) {
  const initials = nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 flex items-center justify-center">
      <span className="text-white font-black text-xl opacity-60">{initials}</span>
    </div>
  );
}
