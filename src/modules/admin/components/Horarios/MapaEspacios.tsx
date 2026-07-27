import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, SlidersHorizontal, Image as ImageIcon, UserCheck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { MapControls, getTileUrl, type MapLayer } from '../../../../components/ui/MapControls';

interface MapaEspaciosProps {
  mapLocations: any[];
  mapFilterType: string;
  setMapFilterType: (val: string) => void;
  mapSearchQuery: string;
  setMapSearchQuery: (val: string) => void;
  activeLocationId: string | null;
  setActiveLocationId: (val: string | null) => void;
  mapCenter: [number, number];
  setMapCenter: (val: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (val: number) => void;
}

function MapController({ center, zoom, activeId }: { center: [number, number], zoom: number, activeId: string | null }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8, easeLinearity: 0.25 });
  }, [center, zoom, activeId, map]);

  useEffect(() => {
    setTimeout(() => map.invalidateSize({animate: true}), 300);
    setTimeout(() => map.invalidateSize({animate: true}), 500);
  }, [map]);
  return null;
}

const getCustomIcon = (loc: any) => {
  let iconHtml = '';
  let bgColor = '';

  if (loc.estado === 'operativo' || loc.estado === 'disponible') bgColor = 'bg-emerald-500';
  else if (loc.estado === 'ocupada' || loc.estado === 'mantenimiento') bgColor = 'bg-blue-500';
  else bgColor = 'bg-gray-500';

  if (loc.tipo === 'Edificio') {
    iconHtml = `<div class="${bgColor} text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center" style="width: 36px; height: 36px;"> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg> </div>`;
  } else if (loc.tipo === 'Aula') {
    iconHtml = `<div class="${bgColor} text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center" style="width: 36px; height: 36px;"> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/></svg> </div>`;
  } else {
    // Laboratorio
    iconHtml = `<div class="${bgColor} text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center" style="width: 36px; height: 36px;"> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg> </div>`;
  }

  return L.divIcon({
    className: 'custom-div-icon',
    html: iconHtml,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

export const MapaEspacios: React.FC<MapaEspaciosProps> = ({
  mapLocations,
  mapFilterType,
  setMapFilterType,
  mapSearchQuery,
  setMapSearchQuery,
  activeLocationId,
  setActiveLocationId,
  mapCenter,
  setMapCenter,
  mapZoom,
  setMapZoom,
}) => {
  const [mapLayer, setMapLayer] = useState<MapLayer>('mapa');
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) mapWrapperRef.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  const filteredMapLocations = useMemo(() => {
    return mapLocations.filter(loc => {
      const matchType = mapFilterType === 'Todos' || loc.tipo === mapFilterType;
      const matchSearch = loc.nombre.toLowerCase().includes(mapSearchQuery.toLowerCase()) || loc.detalle.toLowerCase().includes(mapSearchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [mapLocations, mapFilterType, mapSearchQuery]);

  const selectLocationOnMap = (id: string) => {
    setActiveLocationId(id);
    const loc = mapLocations.find(l => l.id === id);
    if (loc) {
      setMapCenter([loc.lat, loc.lng]);
      setMapZoom(18);
    }
  };

  const centerMap = () => {
    setMapCenter([-1.6583, -78.6780]);
    setMapZoom(17);
    setActiveLocationId(null);
  };

  return (
    <div className="absolute inset-0 flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-[420px] h-[50%] lg:h-full bg-white rounded-[20px] shadow-sm border border-gray-200/60 flex flex-col shrink-0 overflow-hidden z-10 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-700 via-amber-400 to-red-700 opacity-80"></div>
        
        <div className="p-5 border-b border-gray-100/60 bg-white sticky top-0 z-10 pt-6">
          <h3 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-700" />
            Explorador de Espacios
          </h3>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Buscar por nombre o detalle..." 
                value={mapSearchQuery}
                onChange={(e) => setMapSearchQuery(e.target.value)}
                className="w-full bg-gray-50 text-xs text-gray-700 rounded-xl py-2.5 pl-9 pr-4 outline-none border border-gray-200 focus:border-blue-500 font-medium transition-colors hover:bg-gray-100" 
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0" />
              <select 
                value={mapFilterType}
                onChange={(e) => setMapFilterType(e.target.value)}
                className="flex-1 bg-gray-50 text-xs text-gray-700 rounded-xl py-2.5 px-3 outline-none border border-gray-200 focus:border-blue-500 font-medium cursor-pointer"
              >
                <option value="Todos">Todos los tipos</option>
                <option value="Edificio">Edificios</option>
                <option value="Aula">Aulas</option>
                <option value="Laboratorio">Laboratorios</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50/30 custom-scrollbar">
          {filteredMapLocations.map(loc => (
            <div 
              key={loc.id} 
              onClick={() => selectLocationOnMap(loc.id)}
              className={`bg-white p-3 rounded-xl border ${activeLocationId === loc.id ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'} cursor-pointer transition-all flex gap-3 group`}
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative bg-gray-100">
                {loc.imagen ? (
                  <img src={loc.imagen} alt={loc.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-8 h-8"/></div>
                )}
                <div className={`absolute top-1.5 left-1.5 w-2 h-2 rounded-full border border-white shadow-sm ${loc.estado === 'operativo' || loc.estado === 'disponible' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
              </div>
              <div className="flex flex-col flex-1 justify-center min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-xs font-bold text-gray-900 truncate" title={loc.nombre}>{loc.nombre}</h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${loc.tipo === 'Edificio' ? 'bg-indigo-50 text-indigo-600' : loc.tipo === 'Aula' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {loc.tipo}
                  </span>
                </div>
                <p className="text-[10px] font-medium text-gray-500 line-clamp-2 mb-1.5 leading-tight">{loc.detalle}</p>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400 mt-auto">
                  <span className="flex items-center gap-1"><UserCheck className="w-3 h-3"/> Cap: {loc.capacidad}</span>
                  <span className={`capitalize ${loc.estado === 'operativo' || loc.estado === 'disponible' ? 'text-emerald-600' : 'text-blue-600'}`}>{loc.estado}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredMapLocations.length === 0 && (
            <div className="text-center py-8 px-4 flex flex-col items-center">
              <Search className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-xs font-medium text-gray-500">No se encontraron espacios que coincidan con la búsqueda.</p>
            </div>
          )}
        </div>
      </div>

      <div ref={mapWrapperRef} className="flex-1 min-h-[400px] lg:min-h-0 flex flex-col min-w-0 rounded-[20px] bg-white shadow-sm border border-gray-200/60 overflow-hidden z-10 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-700 via-amber-400 to-red-700 opacity-80 z-[400]"></div>

        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="w-full h-full bg-[#f8f9fa] mt-1"
          zoomControl={false}
        >
          <MapController center={mapCenter} zoom={mapZoom} activeId={activeLocationId} />

          <TileLayer url={getTileUrl(mapLayer)} attribution="&copy; CARTO" />

          {filteredMapLocations.map((loc) => (
            <Marker 
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={getCustomIcon(loc)}
              eventHandlers={{
                click: () => selectLocationOnMap(loc.id)
              }}
            >
              <Popup className="custom-popup">
                <div className="w-48 overflow-hidden rounded-xl bg-white">
                  <div className="h-24 w-full relative">
                    <img src={loc.imagen} alt={loc.nombre} className="w-full h-full object-cover" />
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black text-white shadow-sm ${loc.estado === 'operativo' || loc.estado === 'disponible' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                      {loc.estado.toUpperCase()}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold text-gray-900 mb-1">{loc.nombre}</h4>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight mb-2">{loc.detalle}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md w-max">
                      <UserCheck className="w-3 h-3 text-gray-400"/>
                      Capacidad: {loc.capacidad}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Controles unificados: los mismos del mapa de Infraestructura */}
        <MapControls
          layer={mapLayer}
          onLayer={setMapLayer}
          onZoomIn={() => setMapZoom(Math.min(mapZoom + 1, 19))}
          onZoomOut={() => setMapZoom(Math.max(mapZoom - 1, 10))}
          onCenter={centerMap}
          onFullscreen={toggleFullscreen}
          legend={[
            { label: 'Disponible / Operativo', dotClass: 'bg-emerald-500' },
            { label: 'Ocupada', dotClass: 'bg-blue-500' },
          ]}
        />
      </div>
    </div>
  );
};
