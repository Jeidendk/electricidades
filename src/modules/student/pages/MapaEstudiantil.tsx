import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Map as MapIcon, ChevronRight, Search, Star, User, Phone, Mail, Clock, 
  Check, Calendar, Filter, Building, Maximize, Plus, Minus, Navigation, Disc, BookOpen, GraduationCap, FlaskConical
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { studentClases } from '../data/studentSchedule';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { watchPosition } from '../../../lib/geolocation';
import { useSolicitudesEquipoStore } from '../../../store/solicitudesEquipoStore';
import { EdificioPopupCard } from '../../admin/components/EdificioPopupCard';

// Componente para manejar el centrado del mapa y zoom desde botones externos
const MapController = ({ center, zoom, layer }: { center: [number, number], zoom: number, layer: string }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  useEffect(() => {
    // We handle the layer changes externally by changing the TileLayer URL in the parent,
    // so we don't strictly need to do anything with 'layer' here unless we want to do custom map config
  }, [layer, map]);

  return null;
};

// Coordenadas de aulas del horario estudiantil
const aulaLocations: Record<string, { coords: [number, number]; edificio: string; tipo: string }> = {
  'FIE-201': { coords: [-1.6582, -78.6778], edificio: 'Edificio FIE-A', tipo: 'Aula' },
  'FIE-302': { coords: [-1.6584, -78.6783], edificio: 'Edificio FIE-B', tipo: 'Aula' },
  'FIE-105': { coords: [-1.6581, -78.6776], edificio: 'Edificio FIE-A', tipo: 'Aula' },
  'FIE-104': { coords: [-1.6581, -78.6774], edificio: 'Edificio FIE-A', tipo: 'Aula' },
  'Aula 101': { coords: [-1.6583, -78.6780], edificio: 'Edificio FIE-A', tipo: 'Aula' },
  'Aula 102': { coords: [-1.6583, -78.6782], edificio: 'Edificio FIE-A', tipo: 'Aula' },
  'Lab. Circuitos': { coords: [-1.6585, -78.6750], edificio: 'Edificio FIE-A', tipo: 'Laboratorio' },
  'Lab. Electrónica': { coords: [-1.6586, -78.6752], edificio: 'Edificio FIE-A', tipo: 'Laboratorio' },
  'Lab. Potencia': { coords: [-1.6580, -78.6780], edificio: 'Edificio FIE-B', tipo: 'Laboratorio' },
  'Lab. Control': { coords: [-1.6572, -78.6765], edificio: 'Bloque de Laboratorios', tipo: 'Laboratorio' },
  'Lab. Redes Eléctricas': { coords: [-1.6587, -78.6754], edificio: 'Edificio FIE-A', tipo: 'Laboratorio' },
  'Lab. Cómputo 1': { coords: [-1.6590, -78.6760], edificio: 'Centro de Cómputo', tipo: 'Lab Informático' },
};

export const MapaEstudiantil = () => {
  const [searchParams] = useSearchParams();
  const aulaParam = searchParams.get('aula');
  const coordsESPOCH: [number, number] = [-1.6588, -78.6775];
  const [mapCenter, setMapCenter] = useState<[number, number]>(coordsESPOCH);
  const [mapZoom, setMapZoom] = useState(17);
  const [mapLayer, setMapLayer] = useState<'mapa' | 'satelite' | 'hibrido'>('mapa');
  const [filterType, setFilterType] = useState<'Todos' | 'Edificios' | 'Laboratorios' | 'Aulas'>('Todos');
  const [isFavorite, setIsFavorite] = useState(false);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [highlightedAula, setHighlightedAula] = useState<string | null>(aulaParam);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  const { items: espacios, fetchEspacios } = useEspaciosStore();
  const { items: edificios, fetchEdificios } = useEdificiosStore();
  const { user } = useAuthStore();
  const { items: misSolicitudes, fetchItems: fetchSolicitudes } = useSolicitudesEquipoStore();

  // Posición GPS real del usuario (sobrescribe el punto simulado cuando hay permiso).
  useEffect(() => {
    const stop = watchPosition(
      (c) => setUserLocation([c.lat, c.lng]),
      () => {},
    );
    return stop;
  }, []);

  useEffect(() => {
    fetchEspacios();
    fetchEdificios();
  }, [fetchEspacios, fetchEdificios]);

  useEffect(() => {
    if (user?.id) {
      fetchSolicitudes(user.id);
    }
  }, [user?.id, fetchSolicitudes]);

  const activeEdificio = useMemo(() => {
    return edificios.find(e => e.nombre === highlightedAula);
  }, [edificios, highlightedAula]);

  const activeEspacio = useMemo(() => {
    if (!espacios.length) return null;
    if (highlightedAula) {
      return espacios.find(e => e.nombre === highlightedAula) || (!activeEdificio ? espacios[0] : null);
    }
    return espacios[0];
  }, [espacios, highlightedAula, activeEdificio]);

  const [responsable, setResponsable] = useState<{nombre: string, email: string} | null>(null);
  const [equiposEspacio, setEquiposEspacio] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDetails() {
      if (!activeEspacio) return;
      
      // Fetch responsable (técnico asignado al espacio)
      const { data: asigData } = await supabase
        .from('asignaciones')
        .select(`
          usuarios ( nombre, email )
        `)
        .eq('id_espacio', activeEspacio.id)
        .eq('activa', true)
        .limit(1)
        .single();
        
      if (asigData?.usuarios) {
        setResponsable(asigData.usuarios as any);
      } else {
        setResponsable(null);
      }

      // Fetch equipos del inventario en este espacio
      const { data: invData } = await supabase
        .from('inventario')
        .select('*')
        .eq('id_espacio', activeEspacio.id)
        .limit(5);
        
      setEquiposEspacio(invData || []);
    }
    
    fetchDetails();
  }, [activeEspacio]);

  // Transformar espacios a formato de marcadores
  const espaciosLocations = useMemo(() => {
    const locs: Record<string, any> = {};
    espacios.forEach(e => {
      if (e.lat && e.lng) {
        locs[e.nombre] = { coords: [e.lat, e.lng], edificio: e.id_edificio, tipo: e.tipo };
      }
    });
    return locs;
  }, [espacios]);



  // Si llega con ?aula=, enfocar en esa aula
  useEffect(() => {
    if (aulaParam && espaciosLocations[aulaParam]) {
      setMapCenter(espaciosLocations[aulaParam].coords);
      setMapZoom(19);
      setHighlightedAula(aulaParam);
    } else if (aulaParam && aulaLocations[aulaParam]) {
      setMapCenter(aulaLocations[aulaParam].coords);
      setMapZoom(19);
      setHighlightedAula(aulaParam);
    }
  }, [aulaParam, espaciosLocations]);

  const getTileUrl = () => {
    switch(mapLayer) {
      case 'satelite': return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'hibrido': return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      case 'mapa': 
      default: return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapWrapperRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleZoomIn = () => setMapZoom(prev => Math.min(prev + 1, 19));
  const handleZoomOut = () => setMapZoom(prev => Math.max(prev - 1, 10));
  const centerMap = () => {
    setMapCenter([...coordsESPOCH] as [number, number]);
    setMapZoom(17);
  };

  const trazarRutaReal = () => {
    let destLat = -1.6580;
    let destLng = -78.6780;
    
    if (activeEspacio && activeEspacio.lat && activeEspacio.lng) {
      destLat = activeEspacio.lat;
      destLng = activeEspacio.lng;
    } else if (activeEdificio && activeEdificio.lat && activeEdificio.lng) {
      destLat = activeEdificio.lat;
      destLng = activeEdificio.lng;
    }

    const destinoCoords: [number, number] = [destLat, destLng];
    
    // Ruta que simula las calles desde el usuario hasta el objetivo
    const rutaCalles: [number, number][] = [
      [-1.6618, -78.6808], // Entrada principal
      [-1.6605, -78.6795], // Curva vía principal
      [-1.6598, -78.6789], // Intersección central
      [-1.6588, -78.6780], // Avenida Longitudinal 1
      destinoCoords        // Destino Final
    ];

    setUserLocation(rutaCalles[0]);
    setRoute(rutaCalles);
    
    // Calcular el centro aproximado para que se vea toda la ruta
    setMapCenter([-1.6599, -78.6794]);
    setMapZoom(16);
  };

  const userIcon = L.divIcon({ className: 'bg-transparent', html: `<div class="relative w-8 h-8 flex items-center justify-center"><div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div><div class="absolute inset-0 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div></div>`, iconSize: [32, 32], iconAnchor: [16, 16] });

  return (
    <div className="h-full flex-1 flex flex-col min-h-0 bg-[#f4f7fb] overflow-hidden relative">
      
      {/* HERO BANNER - UNIFIED */}
      <div className="w-full bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-5 border-b border-gray-800">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
        
        <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
              <MapIcon className="w-7 h-7" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[12px] font-extrabold text-white tracking-tight leading-none mb-1.5">
                Ubicaciones
              </h2>
              <p className="text-[11px] text-gray-400 font-medium">Encuentra fácilmente los laboratorios y equipos que solicitaste en el campus.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
            <div className="flex items-center gap-3">
              <Building className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-white leading-tight">{edificios.length}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Edificios</span>
              </div>
            </div>
            
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            
            <div className="flex items-center gap-3">
              <FlaskConical className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-white leading-tight">{espacios.filter(e => e.tipo.toLowerCase().includes('laboratorio')).length}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Laboratorios</span>
              </div>
            </div>
            
            <div className="w-px h-8 bg-white/10 mx-1"></div>

            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-white leading-tight">{espacios.filter(e => e.tipo.toLowerCase().includes('aula') || e.tipo.toLowerCase().includes('academica')).length}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Aulas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WORKSPACE DEL MAPA */}
      <div className="flex-1 flex flex-col lg:flex-row p-3 sm:p-4 lg:p-6 gap-4 w-full mx-auto min-h-0 overflow-hidden animate-fade-in">
        
        {/* PANEL LATERAL (SIDEBAR) */}
        <aside id="sidebar-panel" className="w-full h-[40vh] lg:h-full lg:w-[360px] xl:w-[400px] bg-white rounded-[24px] shadow-sm border border-gray-200/60 flex flex-col shrink-0 overflow-hidden relative z-[50] transition-all duration-300 min-h-0">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-espoch-yellow via-orange-500 to-espoch-red z-20"></div>
          
          <div className="flex-1 overflow-y-auto p-6 pb-24 min-h-0" style={{scrollbarWidth: 'thin'}}>
            
            {/* Buscador */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar laboratorio, equipo o asignatura..."
                value={highlightedAula || ''}
                onChange={(e) => setHighlightedAula(e.target.value)}
                className="w-full bg-gray-50 text-[13px] text-gray-800 rounded-xl py-3 pl-10 pr-4 outline-none border border-gray-200 focus:border-gray-300 transition-all font-medium placeholder:text-gray-400" />
            </div>

            {activeEspacio ? (
              <>
                {/* Título y Favorito */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-[18px] font-black text-gray-900 leading-tight">{activeEspacio.nombre}</h3>
                    <p className="text-[12px] font-medium text-gray-500 mt-0.5 cursor-pointer hover:text-gray-700" onClick={centerMap}>{activeEspacio.id_edificio} - Piso {activeEspacio.piso}</p>
                  </div>
                  <button onClick={() => setIsFavorite(!isFavorite)} className={`${isFavorite ? 'text-espoch-red' : 'text-gray-300'} hover:text-espoch-darkred transition-colors`} title="Favorito">
                    <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Imagen con Badge */}
                <div className="relative rounded-xl overflow-hidden mb-6 border border-gray-100 shadow-sm h-[140px] cursor-pointer group">
                  <img src={Array.isArray(activeEspacio.fotos_json) && activeEspacio.fotos_json.length > 0 ? (activeEspacio.fotos_json[0] as string) : "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=600&auto=format&fit=crop"} alt="Laboratorio" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-3 left-3 bg-white text-green-600 border border-green-100 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Disponible
                  </div>
                </div>

                {/* Estadísticas Rápidas */}
                <div className="grid grid-cols-4 gap-2 mb-6 border-b border-gray-100 pb-5">
                  <div className="flex flex-col items-center justify-center text-center gap-1">
                    <span className="text-[14px] font-black text-gray-900">{equiposEspacio.length}</span>
                    <span className="text-[9px] font-medium text-gray-500">Equipos</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center gap-1 border-l border-gray-100">
                    <span className="text-[14px] font-black text-gray-900 truncate w-full px-1" title={activeEspacio.id_edificio}>{activeEspacio.id_edificio}</span>
                    <span className="text-[9px] font-medium text-gray-500">Edificio</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center gap-1 border-l border-gray-100">
                    <span className="text-[14px] font-black text-gray-900">Piso {activeEspacio.piso}</span>
                    <span className="text-[9px] font-medium text-gray-500">Piso</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center gap-1 border-l border-gray-100">
                    <span className="text-[14px] font-black text-gray-900">{activeEspacio.capacidad}</span>
                    <span className="text-[9px] font-medium text-gray-500">Capacidad</span>
                  </div>
                </div>

                {/* Detalles: Responsable y Horario */}
                <div className="flex flex-col gap-4 mt-2">
                  {responsable && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 tracking-wide">Responsable</span>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold text-gray-900">{responsable.nombre}</span>
                            <span className="text-[10px] font-medium text-gray-500">{responsable.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button className="w-8 h-8 rounded-lg bg-white border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors shadow-sm"><Phone className="w-3.5 h-3.5" /></button>
                          <button className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shadow-sm"><Mail className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 border-b border-gray-100 pb-5">
                    <span className="text-[10px] font-bold text-gray-400 tracking-wide">Horario disponible</span>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-gray-900">08:00 - 17:00</span>
                          <span className="text-[10px] font-medium text-gray-500">Lunes a Viernes</span>
                        </div>
                      </div>
                      <div className="bg-green-50 text-green-600 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Abierto ahora
                      </div>
                    </div>
                  </div>
                </div>

                {/* Equipos solicitados list */}
                <div className="mt-5">
                  <h4 className="text-[12px] font-extrabold text-gray-900 mb-4">Equipos en este laboratorio ({equiposEspacio.length})</h4>
                  <div className="flex flex-col gap-3">
                    {equiposEspacio.map(equipo => (
                      <div key={equipo.id} className="flex items-center gap-3 p-1.5 cursor-pointer group">
                        <img src={Array.isArray(equipo.fotos_json) && equipo.fotos_json.length > 0 ? equipo.fotos_json[0] : "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?q=80&w=150&auto=format&fit=crop"} className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200 shadow-sm group-hover:scale-105 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-gray-900 truncate">{equipo.nombre}</p>
                          <p className="text-[9px] text-gray-400 font-medium">SN: {equipo.serie}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 shrink-0 border ${
                          equipo.estado === 'bueno' ? 'bg-green-50 text-green-600 border-green-100' :
                          equipo.estado === 'malo' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-yellow-50 text-yellow-600 border-yellow-100'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            equipo.estado === 'bueno' ? 'bg-green-500' :
                            equipo.estado === 'malo' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}></div> {equipo.estado === 'bueno' ? 'Operativo' : 'Mantenimiento'}
                        </div>
                      </div>
                    ))}
                    {equiposEspacio.length === 0 && (
                      <p className="text-xs text-gray-500">No hay equipos registrados en este espacio.</p>
                    )}
                  </div>
                </div>
              </>
            ) : activeEdificio ? (
              <>
                {/* Edificio Layout (When an Edificio is selected) */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-[18px] font-black text-gray-900 leading-tight">{activeEdificio.nombre}</h3>
                    <p className="text-[12px] font-medium text-gray-500 mt-0.5">{activeEdificio.direccion || 'Campus Principal'}</p>
                  </div>
                </div>
                <div className="relative rounded-xl overflow-hidden mb-6 border border-gray-100 shadow-sm h-[140px]">
                  <img src={activeEdificio.imagen_url || "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=300&auto=format&fit=crop"} alt={activeEdificio.nombre} className="w-full h-full object-cover" />
                  <div className={`absolute bottom-3 left-3 bg-white border px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm ${
                    activeEdificio.estado === 'operativo' ? 'text-green-600 border-green-100' : 'text-orange-600 border-orange-100'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${activeEdificio.estado === 'operativo' ? 'bg-green-500' : 'bg-orange-500'}`}></div> {activeEdificio.estado === 'operativo' ? 'Activo' : 'En Mantenimiento'}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-6 border-b border-gray-100 pb-5">
                  <div className="flex flex-col items-center justify-center text-center gap-1">
                    <span className="text-[14px] font-black text-gray-900">{activeEdificio.pisos}</span>
                    <span className="text-[9px] font-medium text-gray-500">Pisos Totales</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center gap-1 border-l border-gray-100">
                    <span className="text-[14px] font-black text-gray-900 truncate w-full px-1">{activeEdificio.aulas_academicas + activeEdificio.laboratorios}</span>
                    <span className="text-[9px] font-medium text-gray-500">Espacios</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center gap-1 border-l border-gray-100">
                    <span className="text-[14px] font-black text-gray-900">{activeEdificio.ocupacion_pct}%</span>
                    <span className="text-[9px] font-medium text-gray-500">Ocupación</span>
                  </div>
                </div>
                <div className="mt-2 text-center text-gray-500 text-sm">
                  Haz clic en "Cómo llegar" para trazar la ruta hacia este edificio, o selecciona un laboratorio específico en el mapa.
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-gray-500 font-medium text-sm">Selecciona una ubicación en el mapa</div>
            )}
          </div>
          
          {/* Botón Acción Inferior Fijo */}
          <div className="absolute bottom-0 left-0 w-full p-4 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <button onClick={trazarRutaReal} disabled={!activeEspacio && !activeEdificio} className="w-full bg-espoch-red hover:bg-espoch-darkred disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(176,0,0,0.25)] transition-all">
              <Navigation className="w-4 h-4" /> Cómo llegar
            </button>
          </div>
        </aside>

        {/* CONTENEDOR DEL MAPA (DERECHA) */}
        <div ref={mapWrapperRef} className="flex-1 bg-[#e5e7eb] rounded-[24px] shadow-sm border border-gray-200/60 relative overflow-hidden flex flex-col z-[10]">
          
          <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            zoomControl={false} 
            className="absolute inset-0 z-0 h-full w-full"
            style={{background: '#e5e7eb'}}
          >
            <TileLayer url={getTileUrl()} />
            <MapController center={mapCenter} zoom={mapZoom} layer={mapLayer} />
            
            {/* Los marcadores fijos se reemplazan por los dinámicos */}

            {/* Marcadores dinámicos de espacios */}
            {espacios.filter((espacio) => {
              if (filterType === 'Edificios') return false; // Hide spaces if looking only for buildings
              if (filterType === 'Todos') return true;
              const typeLower = espacio.tipo.toLowerCase();
              if (filterType === 'Laboratorios') return typeLower.includes('laboratorio');
              if (filterType === 'Aulas') return typeLower.includes('academica') || typeLower.includes('aula');
              return true;
            }).map((espacio) => {
              // Si el espacio no tiene lat/lng, usar las del edificio si existen
              const ed = edificios.find(e => e.id === espacio.id_edificio);
              const lat = espacio.lat || ed?.lat;
              const lng = espacio.lng || ed?.lng;
              if (!lat || !lng) return null;

              const isHighlighted = highlightedAula === espacio.nombre;
              const isLab = espacio.tipo.toLowerCase().includes('laboratorio');
              const aulaIcon = L.divIcon({
                className: 'bg-transparent',
                html: `
                  <div class="relative group cursor-pointer" style="margin-top: -8px;">
                    <div class="relative flex items-center bg-white rounded-full shadow-${isHighlighted ? 'lg' : 'sm'} border ${isHighlighted ? 'border-red-300 ring-2 ring-red-400/40' : 'border-gray-100'} p-1 w-9 group-hover:w-[130px] transition-all duration-300 ease-in-out overflow-hidden z-10 hover:z-50 origin-left">
                      <div class="relative w-7 h-7 shrink-0 flex items-center justify-center z-10 rounded-full">
                        ${isHighlighted ? '<div class="absolute inset-0 bg-red-500/50 rounded-full animate-ping"></div>' : ''}
                        <div class="absolute inset-0 ${isLab ? 'bg-purple-500' : 'bg-blue-500'} rounded-full shadow-inner"></div>
                        <svg class="relative z-10 w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          ${isLab ? '<path d="M9 3h6v8H9z"/><path d="M6 14h12l-3 7H9l-3-7z"/>' : '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'}
                        </svg>
                      </div>
                      <span class="ml-1.5 font-extrabold text-[10px] text-gray-800 tracking-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 z-10">${espacio.nombre}</span>
                    </div>
                    <div class="absolute -bottom-1.5 left-[13px] w-2.5 h-2.5 bg-white rotate-45 border-r border-b border-gray-100 z-0"></div>
                  </div>`,
                iconSize: [36, 40],
                iconAnchor: [18, 40],
                popupAnchor: [0, -36]
              });
              return (
                <Marker 
                  key={espacio.id} 
                  position={[lat, lng]} 
                  icon={aulaIcon}
                  eventHandlers={{
                    click: () => {
                      setHighlightedAula(espacio.nombre);
                    }
                  }}
                >
                  <Popup closeButton={false} offset={[0, -36]} className="custom-popup">
                    <div className="w-[200px] flex flex-col overflow-hidden -m-[13px] rounded-xl bg-white shadow-sm">
                      <img 
                        src={Array.isArray(espacio.fotos_json) && espacio.fotos_json.length > 0 ? (espacio.fotos_json[0] as string) : (isLab ? 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=300&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=300&auto=format&fit=crop')} 
                        className="w-full h-[90px] object-cover" 
                        alt={espacio.nombre} 
                      />
                      <div className="p-3">
                      <h4 className="text-[13px] font-black text-gray-900 mb-1">{espacio.nombre}</h4>
                      <p className="text-[10px] text-gray-500 font-medium mb-2">{ed?.nombre || espacio.id_edificio} — {espacio.tipo}</p>
                      <div className="flex flex-col gap-1 border-t border-gray-100 pt-2">
                        {studentClases.filter(c => c.aula === espacio.nombre).slice(0, 3).map(c => (
                          <div key={c.id} className="flex items-center gap-1.5">
                            <GraduationCap className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="text-[10px] font-bold text-gray-700 truncate">{c.materia}</span>
                            <span className="text-[9px] text-gray-400 font-medium shrink-0">{c.dia.substring(0,3)}</span>
                          </div>
                        ))}
                      </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Marcadores dinámicos de Edificios (Solo si filtro = Todos o Edificios) */}
            {(filterType === 'Todos' || filterType === 'Edificios') && edificios.map((edificio) => {
              if (!edificio.lat || !edificio.lng) return null;
              
              const edificioIcon = L.divIcon({
                className: 'bg-transparent',
                html: `
                  <div class="relative group cursor-pointer" style="margin-top: -8px;">
                    <div class="relative flex items-center bg-white rounded-full shadow-md border border-gray-100 p-1 w-11 group-hover:w-[150px] transition-all duration-300 ease-in-out overflow-hidden z-[40] hover:z-[60] origin-left">
                      <div class="relative w-9 h-9 shrink-0 flex items-center justify-center z-10 rounded-full">
                        <div class="absolute inset-0 bg-gray-800 rounded-full shadow-inner"></div>
                        <svg class="relative z-10 w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 10v11h16V10"/><path d="M10 21v-4h4v4"/><path d="M2 10l10-7 10 7"/>
                        </svg>
                      </div>
                      <span class="ml-2 font-extrabold text-[11px] text-gray-800 tracking-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 z-10">${edificio.nombre}</span>
                    </div>
                    <div class="absolute -bottom-1.5 left-[16px] w-3 h-3 bg-white rotate-45 border-r border-b border-gray-100 z-0"></div>
                  </div>`,
                iconSize: [44, 48],
                iconAnchor: [22, 48],
                popupAnchor: [0, -44]
              });

              return (
                <Marker 
                  key={edificio.id} 
                  position={[edificio.lat, edificio.lng]} 
                  icon={edificioIcon}
                  eventHandlers={{
                    click: () => {
                      // Al hacer clic en un edificio, seleccionamos su primer espacio para actualizar el panel
                      const primerEspacio = espacios.find(e => e.id_edificio === edificio.id);
                      if (primerEspacio) {
                        setHighlightedAula(primerEspacio.nombre);
                      } else {
                        // Si no tiene espacios, podríamos setearlo al edificio mismo si la UI lo soportara,
                        // por ahora lo dejamos vacío o seteamos un string especial
                        setHighlightedAula(edificio.nombre);
                      }
                    }
                  }}
                >
                  <Popup closeButton={false} offset={[0, -44]} className="custom-leaflet-popup">
                    <EdificioPopupCard
                      ed={{
                        id: edificio.id,
                        nombre: edificio.nombre,
                        direccion: edificio.direccion || '',
                        estado: edificio.estado,
                        ocupacion: edificio.ocupacion_pct || 0,
                        imagen: edificio.imagen_url || 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=300&auto=format&fit=crop',
                        espacios: (edificio as any).espacios || [],
                      }}
                    />
                  </Popup>
                </Marker>
              );
            })}

            {/* Si hay ruta simulada, dibujar userMarker y polyline */}
            {userLocation && (
              <Marker position={userLocation} icon={userIcon} />
            )}
            
            {route && (
              <Polyline 
                positions={route} 
                pathOptions={{ color: '#b00000', weight: 5, opacity: 0.8, dashArray: '10, 10', lineJoin: 'round' }} 
              />
            )}
          </MapContainer>
          
          {/* Toolbar Flotante Superior */}
          <div className="absolute top-4 left-4 right-4 z-[400] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pointer-events-none">
            
            <div className="flex flex-wrap items-center gap-3 pointer-events-auto">
              <div className="relative bg-white rounded-xl shadow-sm border border-gray-100">
                <select className="appearance-none bg-transparent text-gray-700 text-[12px] font-bold py-2 pl-9 pr-7 outline-none cursor-pointer">
                  <option>Este PAO</option>
                </select>
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none rotate-90" />
              </div>
              <div className="relative bg-white rounded-xl shadow-sm border border-gray-100">
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'Todos' | 'Edificios' | 'Laboratorios' | 'Aulas')}
                  className="appearance-none bg-transparent text-gray-700 text-[12px] font-bold py-2 pl-9 pr-7 outline-none cursor-pointer"
                >
                  <option value="Todos">Todas las ubicaciones</option>
                  <option value="Edificios">Solo edificios</option>
                  <option value="Laboratorios">Solo laboratorios</option>
                  <option value="Aulas">Solo aulas</option>
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none rotate-90" />
              </div>

            </div>

            {/* Controles Capas */}
            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                <button onClick={() => setMapLayer('mapa')} className={`px-5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${mapLayer === 'mapa' ? 'bg-red-50 text-espoch-red' : 'text-gray-500 hover:text-gray-900'}`}>Mapa</button>
                <button onClick={() => setMapLayer('satelite')} className={`px-5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${mapLayer === 'satelite' ? 'bg-red-50 text-espoch-red' : 'text-gray-500 hover:text-gray-900'}`}>Satélite</button>
                <button onClick={() => setMapLayer('hibrido')} className={`px-5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${mapLayer === 'hibrido' ? 'bg-red-50 text-espoch-red' : 'text-gray-500 hover:text-gray-900'}`}>Híbrido</button>
              </div>
              <button onClick={toggleFullscreen} className="w-8 h-8 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-black hover:bg-gray-100 transition-colors">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Controles de Zoom (Derecha Centro) */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[400] flex flex-col gap-1.5 pointer-events-auto bg-white rounded-xl shadow-md border border-gray-100 p-1">
            <button onClick={handleZoomIn} className="w-7 h-7 flex items-center justify-center text-black hover:bg-gray-100 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
            <div className="w-full h-px bg-gray-100 my-0.5"></div>
            <button onClick={handleZoomOut} className="w-7 h-7 flex items-center justify-center text-black hover:bg-gray-100 rounded-lg transition-colors"><Minus className="w-4 h-4" /></button>
            <div className="w-full h-px bg-gray-100 my-0.5"></div>
            <button onClick={centerMap} className="w-7 h-7 flex items-center justify-center text-black hover:bg-gray-100 rounded-lg transition-colors" title="Centrar mapa"><Navigation className="w-4 h-4" /></button>
          </div>

          {/* Elementos Inferiores */}
          <div className="absolute bottom-3 left-3 right-3 z-[400] flex flex-col lg:flex-row items-start lg:items-end justify-between gap-3 pointer-events-none">
            
            {/* Leyenda */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 px-3 py-2 flex flex-wrap items-center gap-3 pointer-events-auto cursor-default">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-[10px] font-bold text-gray-600">Aprobado</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-[10px] font-bold text-gray-600">Pendiente</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[10px] font-bold text-gray-600">Rechazado</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-400"></div><span className="text-[10px] font-bold text-gray-600">Devuelto</span></div>
              <div className="flex items-center gap-1.5"><Disc className="w-3 h-3 text-blue-500" /><span className="text-[10px] font-bold text-gray-600">Clúster de equipos</span></div>
            </div>

            {/* Widget: Actividad Reciente */}
            <div className="flex items-stretch gap-4 pointer-events-auto">
              <div className="hidden lg:block bg-white rounded-2xl shadow-lg border border-gray-100 w-[260px] p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[12px] font-black text-gray-900">Actividad reciente</h4>
                  <a href="/student/requests" className="text-[10px] font-bold text-blue-600 hover:underline">Ver todas</a>
                </div>
                <div className="flex flex-col gap-4">
                  {misSolicitudes.length > 0 ? (
                    misSolicitudes.slice(0, 2).map((sol) => (
                      <div key={sol.id} className="flex gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                          sol.estado === 'Aprobada' ? 'bg-green-50 border-green-100 text-green-600' :
                          sol.estado === 'Rechazada' ? 'bg-red-50 border-red-100 text-red-600' :
                          'bg-yellow-50 border-yellow-100 text-yellow-600'
                        }`}>
                          {sol.estado === 'Aprobada' ? <Check className="w-3.5 h-3.5" /> :
                           sol.estado === 'Rechazada' ? <Disc className="w-3.5 h-3.5" /> :
                           <Clock className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-gray-900 truncate">
                            {sol.items && sol.items.length > 0 ? sol.items[0].nombre : 'Solicitud general'}
                          </p>
                          <p className="text-[9px] text-gray-400 font-medium truncate">
                            {sol.estado === 'Pendiente' ? 'Solicitud realizada' : `Estado: ${sol.estado}`}
                          </p>
                        </div>
                        <span className="text-[8px] text-gray-400 font-bold shrink-0 mt-0.5">
                          {sol.fecha.substring(5)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-2">No tienes actividad reciente.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
