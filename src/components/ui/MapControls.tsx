import { Plus, Minus, Navigation, Maximize, Layers as LayersIcon } from 'lucide-react';

export type MapLayer = 'mapa' | 'satelite' | 'hibrido';

// URL de tiles según la capa (compartido por todos los mapas).
export const getTileUrl = (layer: MapLayer): string => {
  switch (layer) {
    case 'satelite': return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    case 'hibrido': return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    case 'mapa':
    default: return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  }
};

export interface LegendItem {
  label: string;
  dotClass: string; // ej: 'bg-emerald-500'
}

interface MapControlsProps {
  layer: MapLayer;
  onLayer: (l: MapLayer) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  onFullscreen: () => void;
  legend?: LegendItem[];
  actionLabel?: string;
  onAction?: () => void;
}

const LAYERS: { key: MapLayer; label: string }[] = [
  { key: 'mapa', label: 'Mapa' },
  { key: 'satelite', label: 'Satélite' },
  { key: 'hibrido', label: 'Híbrido' },
];

// Controles unificados para los mapas (admin y estudiante).
export const MapControls = ({ layer, onLayer, onZoomIn, onZoomOut, onCenter, onFullscreen, legend, actionLabel, onAction }: MapControlsProps) => (
  <>
    {/* Top derecha: capas + pantalla completa + acción */}
    <div className="absolute right-4 top-4 z-[1000] flex items-center gap-2 pointer-events-auto">
      <div className="flex bg-white rounded-xl shadow-md border border-gray-100 p-1">
        {LAYERS.map(l => (
          <button
            key={l.key}
            onClick={() => onLayer(l.key)}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${layer === l.key ? 'bg-red-50 text-espoch-red' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <button onClick={onFullscreen} title="Pantalla completa" className="w-9 h-9 bg-white rounded-xl shadow-md border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors">
        <Maximize className="w-4 h-4" />
      </button>
      {actionLabel && onAction && (
        <button onClick={onAction} className="flex items-center gap-1.5 bg-espoch-ink hover:bg-black text-white text-[11px] font-bold px-3.5 py-2 rounded-xl shadow-md border border-gray-800 transition-colors">
          <Plus className="w-3.5 h-3.5" /> {actionLabel}
        </button>
      )}
    </div>

    {/* Derecha centro: zoom + centrar */}
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-1 pointer-events-auto bg-white rounded-xl shadow-md border border-gray-100 p-1">
      <button onClick={onZoomIn} title="Acercar" className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
      <div className="w-full h-px bg-gray-100"></div>
      <button onClick={onZoomOut} title="Alejar" className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><Minus className="w-4 h-4" /></button>
      <div className="w-full h-px bg-gray-100"></div>
      <button onClick={onCenter} title="Centrar" className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><Navigation className="w-4 h-4" /></button>
    </div>

    {/* Abajo izquierda: leyenda */}
    {legend && legend.length > 0 && (
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-md border border-gray-200 pointer-events-auto">
        <h4 className="text-[10px] font-bold text-gray-800 mb-2.5 uppercase tracking-widest flex items-center gap-2">
          <LayersIcon className="w-3 h-3 text-gray-500" /> Leyenda
        </h4>
        <div className="flex flex-col gap-2">
          {legend.map(item => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`}></span>
              <span className="text-[10px] font-bold text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </>
);
