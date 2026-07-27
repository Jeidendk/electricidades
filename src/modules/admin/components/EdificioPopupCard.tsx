import { useState, useMemo } from 'react';
import { Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface Espacio {
  id: string;
  nombre: string;
  piso?: number;
  tipo?: string;
  estado?: string;
  capacidad?: number;
}

interface EdificioPopupCardProps {
  ed: {
    nombre: string;
    imagen: string;
    estado: string;
    ocupacion: number;
    espacios?: Espacio[];
    [key: string]: any;
  };
  onEdit?: (ed: any) => void;
  onDelete?: (ed: any) => void;
}

// Tarjeta de popup del mapa: datos del edificio + acordeón de pisos y sus espacios.
export const EdificioPopupCard = ({ ed, onEdit, onDelete }: EdificioPopupCardProps) => {
  const [openPiso, setOpenPiso] = useState<number | null>(null);

  const pisosMap = useMemo(() => {
    if (!ed.espacios) return {} as Record<number, Espacio[]>;
    return ed.espacios.reduce((acc, esp) => {
      const p = esp.piso || 0;
      (acc[p] ||= []).push(esp);
      return acc;
    }, {} as Record<number, Espacio[]>);
  }, [ed.espacios]);

  const pisos = Object.keys(pisosMap).map(Number).sort((a, b) => a - b);

  return (
    <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-2 w-[280px] max-h-[480px] flex flex-col pointer-events-auto">
      <div className="flex-shrink-0 flex flex-col gap-2">
        <img src={ed.imagen} className="w-full h-[100px] object-cover rounded-lg" alt={ed.nombre} />
        <div className="flex flex-col px-1">
          <h4 className="font-bold text-gray-900 text-sm leading-tight mb-0.5">{ed.nombre}</h4>
          <p className="text-[10px] font-medium text-gray-500 leading-tight truncate">Campus Académico - Zona Principal</p>
          <div className="flex justify-between items-center mt-2.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${ed.estado === 'operativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
              {ed.estado === 'operativo' ? 'Activo' : 'En Mantenimiento'}
            </span>
            <span className="text-[10px] font-extrabold text-gray-700">{ed.ocupacion}% Ocu.</span>
          </div>
          {onEdit && onDelete && (
            <div className="flex gap-1.5 mt-3">
              <button onClick={(e) => { e.stopPropagation(); onEdit(ed); }} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 py-1.5 rounded-lg text-[10px] font-extrabold transition-colors">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(ed); }} className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-100 py-1.5 rounded-lg text-[10px] font-extrabold transition-colors">
                <Trash2 className="w-3 h-3" /> Borrar
              </button>
            </div>
          )}
        </div>
      </div>

      {pisos.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
          <h5 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 px-1">Pisos y Espacios</h5>
          {pisos.map(piso => {
            const espacios = pisosMap[piso];
            const disponibles = espacios.filter(t => t.estado?.toLowerCase() === 'disponible').length;
            const isOpen = openPiso === piso;
            return (
              <div key={piso} className="flex flex-col bg-gray-50/50 rounded-lg border border-gray-100 overflow-hidden shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setOpenPiso(isOpen ? null : piso); }} className="w-full flex items-center justify-between p-2 hover:bg-gray-100/80 transition-colors">
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-bold text-gray-800">Piso {piso}</span>
                    <span className="text-[9px] font-semibold text-gray-500">{disponibles} disponibles / {espacios.length} total</span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-1.5 p-2 bg-white border-t border-gray-100">
                    {espacios.map(t => {
                      const tipoCls = t.tipo?.toLowerCase().includes('laboratorio')
                        ? 'bg-green-50 text-green-600 border-green-100'
                        : t.tipo?.toLowerCase().includes('admin')
                          ? 'bg-gray-50 text-gray-600 border-gray-100'
                          : 'bg-blue-50 text-blue-600 border-blue-100';
                      const dot = t.estado?.toLowerCase() === 'ocupado'
                        ? 'bg-[#f97316]'
                        : t.estado?.toLowerCase() === 'mantenimiento'
                          ? 'bg-[#dc2626]'
                          : 'bg-[#16a34a]';
                      return (
                        <div key={t.id} className="flex flex-col p-2 rounded-md border border-gray-100 bg-gray-50/30">
                          <div className="flex justify-between items-start mb-1.5">
                            <h6 className="text-[11px] font-bold text-gray-800 leading-tight">{t.nombre}</h6>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${tipoCls}`}>{t.tipo}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                              <span className="text-[9px] font-semibold text-gray-500 capitalize">{t.estado}</span>
                            </div>
                            <span className="text-[9px] font-bold text-gray-600">{t.capacidad} cap.</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EdificioPopupCard;
