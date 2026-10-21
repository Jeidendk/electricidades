import React from 'react';
import {
  Clock,
  FileText,
  ChevronRight,
  MapPin,
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
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Hace ${d} día${d !== 1 ? 's' : ''}`;
}

export interface SolicitudReciente {
  id: string;
  equipmentName: string;
  requestCode: string;
  timeAgo: string;
  status: 'Pendiente' | 'En revisión' | 'Aprobada' | 'Entregada' | 'Devuelto' | 'Finalizada' | 'Rechazada' | 'Cancelada' | string;
}

interface LabRightSidebarProps {
  /** Lista de N ítems más recientes para la sección "Actividad reciente" */
  activityItems: EquipoCatalogo[];
  solicitudesRecientes?: SolicitudReciente[];
  onViewAllActivities?: () => void;
  onViewAllRequests?: () => void;
  onSelectItem?: (item: EquipoCatalogo) => void;
}

export const LabRightSidebar: React.FC<LabRightSidebarProps> = ({
  activityItems,
  solicitudesRecientes = [],
  onViewAllActivities,
  onViewAllRequests,
  onSelectItem,
}) => {
  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Pendiente': 'bg-amber-100 text-amber-800 border border-amber-200/60',
      'En revisión': 'bg-sky-100 text-sky-800 border border-sky-200/60',
      'Aprobada': 'bg-emerald-100 text-emerald-800 border border-emerald-200/60',
      'Entregada': 'bg-blue-100 text-blue-800 border border-blue-200/60',
      'Devuelto': 'bg-slate-100 text-slate-700 border border-slate-200/60',
      'Finalizada': 'bg-slate-100 text-slate-700 border border-slate-200/60',
      'Rechazada': 'bg-red-100 text-red-800 border border-red-200/60',
      'Cancelada': 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${map[status] || 'bg-slate-100 text-slate-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6" style={{ scrollbarWidth: 'thin' }}>
      {/* Widget: Actividad reciente */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">Actividad reciente</h3>
          </div>
          <button
            onClick={onViewAllActivities}
            className="text-xs font-semibold text-red-600 hover:text-red-700 transition cursor-pointer flex items-center gap-0.5"
          >
            Ver todas
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {activityItems.map((item) => {
            const foto = fotoDe(item);
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem?.(item)}
                className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/70 px-1 rounded-lg transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    {foto ? (
                      <img src={foto} alt={item.nombre} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                        <span className="text-[10px] font-black text-white opacity-70">
                          {item.nombre.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-red-600 transition">
                      {item.nombre}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      {item.ubicacion}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {tiempoRelativo(item.created_at)}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 pr-1">
                  <span
                    className={`w-2 h-2 rounded-full block ${
                      item.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
            );
          })}

          {activityItems.length === 0 && (
            <p className="text-xs text-slate-400 py-3 text-center">Sin actividad reciente.</p>
          )}
        </div>
      </div>

      {/* Widget 3: Solicitudes recientes */}
      {solicitudesRecientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">Solicitudes recientes</h3>
            </div>
            <button
              onClick={onViewAllRequests}
              className="text-xs font-semibold text-red-600 hover:text-red-700 transition cursor-pointer flex items-center gap-0.5"
            >
              Ver todas
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {solicitudesRecientes.map((req) => (
              <div
                key={req.id}
                className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {req.equipmentName}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{req.requestCode}</p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{req.timeAgo}</span>
                </div>
                <div className="shrink-0">{getStatusBadge(req.status)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
