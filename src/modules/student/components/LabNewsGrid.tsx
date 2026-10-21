import React, { useState } from 'react';
import {
  RotateCw,
  Clock,
  MoreHorizontal,
  MapPin,
  Bookmark,
  Send,
  Wrench,
  Cpu,
  Layers,
  Copy,
} from 'lucide-react';
import type { EquipoCatalogo } from '../../../store/catalogoEquiposStore';

function fotoDe(item: EquipoCatalogo): string {
  const f = item.fotos_json;
  if (Array.isArray(f) && f.length > 0) return String(f[0] || '');
  if (typeof f === 'string') return f;
  return '';
}

function tiempoRelativo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} hora${h !== 1 ? 's' : ''}`;
  const d = Math.floor(h / 24);
  return `Hace ${d} día${d !== 1 ? 's' : ''}`;
}

interface LabNewsGridProps {
  items: EquipoCatalogo[];
  bookmarkedIds?: Set<string>;
  onRefresh?: () => Promise<void> | void;
  onToggleBookmark?: (id: string) => void;
  onSolicitar?: (item: EquipoCatalogo) => void;
}

export const LabNewsGrid: React.FC<LabNewsGridProps> = ({
  items,
  bookmarkedIds = new Set(),
  onRefresh,
  onToggleBookmark,
  onSolicitar,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const handleCopySerial = (item: EquipoCatalogo) => {
    navigator.clipboard?.writeText(item.serie);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMenuId(null);
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 flex items-center justify-center font-bold text-red-600 mt-0.5">
            <span className="text-lg leading-none select-none">((•))</span>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              Novedades del laboratorio
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-tight mt-0.5">
              Equipos recientemente ingresados, actualizaciones y disponibilidad en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-600 font-medium select-none">
              Actualización automática
            </span>
          </div>
          <button
            onClick={handleRefresh}
            title="Actualizar datos"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No se encontraron equipos</p>
          <p className="text-xs text-slate-400 mt-1">
            Intenta cambiar los filtros seleccionados o el término de búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isTool = item.categoria === 'herramientas';
            const foto = fotoDe(item);
            const isBookmarked = bookmarkedIds.has(item.id);
            const isAvailable = item.estado === 'disponible' && item.stock > 0;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200/90 overflow-hidden hover:shadow-md transition duration-200 flex flex-col group relative"
              >
                {/* Image */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                  {foto ? (
                    <img
                      src={foto}
                      alt={item.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                      <span className="text-slate-400 font-black text-3xl opacity-40">
                        {item.nombre.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                    <div className="pointer-events-auto">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-xs backdrop-blur-xs ${
                          isTool
                            ? 'bg-amber-100/90 text-amber-800 border border-amber-200/60'
                            : 'bg-sky-100/90 text-sky-800 border border-sky-200/60'
                        }`}
                      >
                        {isTool ? <Wrench className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                        <span className="capitalize">{item.categoria}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/90 text-slate-700 border border-slate-200/80 shadow-2xs backdrop-blur-xs">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{tiempoRelativo(item.created_at)}</span>
                      </span>

                      {/* More Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                          className="w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 flex items-center justify-center shadow-2xs transition cursor-pointer"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 text-xs">
                            <button
                              onClick={() => handleCopySerial(item)}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copiar serie</span>
                            </button>
                            <button
                              onClick={() => { onToggleBookmark?.(item.id); setActiveMenuId(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                            >
                              <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                              <span>{isBookmarked ? 'Quitar guardado' : 'Guardar equipo'}</span>
                            </button>
                            <button
                              onClick={() => { onSolicitar?.(item); setActiveMenuId(null); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-red-600 font-medium flex items-center gap-2"
                            >
                              <Send className="w-3.5 h-3.5 text-red-600" />
                              <span>Solicitar préstamo</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3.5 flex flex-col flex-1">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                    {item.nombre}
                  </h3>

                  <div className="flex items-center gap-1 text-slate-500 text-xs mt-1 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.ubicacion}</span>
                  </div>

                  {/* Serial */}
                  <div className="mt-auto mb-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] border border-slate-200/60">
                      SN: {item.serie}
                    </span>
                    {copiedId === item.id && (
                      <span className="ml-2 text-[10px] text-emerald-600 font-medium">¡Copiado!</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className={`text-xs font-semibold ${isAvailable ? 'text-emerald-700' : 'text-red-700'}`}>
                        {item.stock} {item.stock === 1 ? 'disponible' : 'disponibles'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggleBookmark?.(item.id)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          isBookmarked
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-red-600' : ''}`} />
                      </button>

                      <button
                        onClick={() => onSolicitar?.(item)}
                        disabled={!isAvailable}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer ${
                          isAvailable ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-3 h-3 rotate-45" />
                        <span>Solicitar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
