import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2, Map as MapIcon, Plus, Search, X, MapPin, LayoutGrid,
  Edit2, Trash2, ChevronRight, Layers, DoorOpen, Microscope,
  Image as ImageIcon, CheckCircle, Info, AlertTriangle, Wrench,
  BookOpen, Monitor, Activity, Coffee, Camera, RotateCcw,
  Users, FileText, Ruler, Briefcase, Lock, LockOpen } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PageHero } from '../../../components/ui/PageHero';
import { AcentoTarjeta } from '../../../components/ui/AcentoTarjeta';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { ViewToggle } from '../../../components/ui/ViewToggle';
import { DataTable } from '../../../components/ui/DataTable';
import { EstadoBadge } from '../../../components/ui/EstadoBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { FilterDropdown } from '../../../components/ui/FilterDropdown';
import { MapControls, getTileUrl, atribucionTiles, type MapLayer } from '../../../components/ui/MapControls';
import { UserLocationMarker } from '../../../components/ui/UserLocationMarker';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { uploadImage } from '../../../lib/upload';
import { getCurrentPosition } from '../../../lib/geolocation';
import { TIPOS_ESPACIO, esAula, esLaboratorio, esOficina, formatoPiso, formatoPisoCorto, generarOpcionesPisos } from '../data/espaciosData';
import { BotonPanelLateral } from '../../../components/ui/PanelLateral';
import { avisoError, avisoInfo } from '../../../lib/aviso';

// --- CONSTANTS ---
const baseLat = -1.6575;
const baseLng = -78.6770;
const FALLBACK_ED = 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=250&fit=crop';
const FALLBACK_ESP = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&h=250&fit=crop';

const buildingIcons: Record<string, React.ElementType> = {
  building: Building2, microscope: Microscope, book: BookOpen, monitor: Monitor, activity: Activity, coffee: Coffee,
};

const isAula = esAula;

const getBuildingSvg = (icono: string) => {
  switch (icono) {
    case 'microscope': return '<path d="M6 18h8M3 22h18M14 22a7 7 0 1 0 0-14h-1M9 14h2M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>';
    case 'book': return '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>';
    case 'monitor': return '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>';
    case 'activity': return '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>';
    case 'coffee': return '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>';
    default: return '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>';
  }
};

// --- MAP SUBCOMPONENTS ---
function MapController({ center, zoom, activeId }: { center: [number, number]; zoom: number; activeId: string | null }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 0.8, easeLinearity: 0.25 }); }, [center, zoom, activeId]);
  useEffect(() => {
    setTimeout(() => map.invalidateSize({ animate: true }), 300);
    setTimeout(() => map.invalidateSize({ animate: true }), 500);
  }, [map]);
  return null;
}

// Re-centra el mapa del modal cuando cambian lat/lng (p.ej. tras "Usar mi ubicación" o al tocar el mapa).
// Necesario porque React-Leaflet ignora cambios del prop `center` de <MapContainer> tras el montaje.
function RecenterMap({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng]);
  return null;
}

function MapClickPicker({ isPicking, onPick }: { isPicking: boolean; onPick: (p: [number, number]) => void }) {
  const map = useMapEvents({ click(e) { if (isPicking) onPick([e.latlng.lat, e.latlng.lng]); } });
  useEffect(() => { map.getContainer().style.cursor = isPicking ? 'crosshair' : ''; }, [isPicking, map]);
  return null;
}

// Pin SVG para el marcador que se coloca (evita el ícono PNG por defecto de Leaflet, que sale roto).
const pickerIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="#B00020"/><circle cx="15" cy="15" r="5.5" fill="#ffffff"/></svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -38],
});

function LocationPicker({ position, setPosition }: { position: [number, number] | null; setPosition: (p: [number, number]) => void }) {
  const map = useMapEvents({ click(e) { setPosition([e.latlng.lat, e.latlng.lng]); } });
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100); }, [map]);
  return position ? <Marker position={position} icon={pickerIcon} /> : null;
}

const campusMarkerIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `
    <div class="flex flex-col items-center pointer-events-none">
      <div class="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse"></div>
      <div class="mt-1 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] font-bold text-red-700 tracking-widest border border-red-100 shadow-sm uppercase">Campus ESPOCH</div>
    </div>`,
  iconSize: [100, 40],
  iconAnchor: [50, 20],
});

// --- MAIN PAGE ---
type EspTab = 'todos' | 'aula' | 'lab' | 'oficina';

export const Infraestructura = () => {
  // STORES
  const { items: edificiosRaw, fetchEdificios, addEdificio, updateEdificio, removeEdificio } = useEdificiosStore();
  const espacios = useEspaciosStore(s => s.items);
  const fetchEspacios = useEspaciosStore(s => s.fetchEspacios);
  const addEspacio = useEspaciosStore(s => s.addEspacio);
  const updateEspacio = useEspaciosStore(s => s.updateEspacio);
  const removeEspacio = useEspaciosStore(s => s.removeEspacio);

  useEffect(() => { fetchEdificios(); fetchEspacios(); }, []);

  // MAPPED DATA
  const edificios = useMemo(() => edificiosRaw.map((e: any) => ({
    id: e.id,
    nombre: e.nombre,
    pisos: e.pisos,
    aulasAcademicas: e.aulas_academicas,
    laboratorios: e.laboratorios,
    estado: e.estado,
    ocupacion: e.ocupacion_pct,
    imagen: e.imagen_url || FALLBACK_ED,
    direccion: e.direccion || 'Campus Politécnico',
    icono: e.icono || 'building',
    lat: e.lat ?? baseLat,
    lng: e.lng ?? baseLng,
    area: e.area_m2 ?? 450,
  })), [edificiosRaw]);

  const espaciosMapped = useMemo(() => espacios.map((e: any) => {
    const ed = edificiosRaw.find((b: any) => b.id === e.id_edificio);
    return {
      ...e,
      idEdificio: e.id_edificio,
      edificio: ed ? ed.nombre : 'Sin Edificio',
      equipamiento: e.equipamiento ?? '',
      fotos: (Array.isArray(e.fotos_json) ? e.fotos_json : []) as string[],
    };
  }), [espacios, edificiosRaw]);

  const espaciosPorEdificio = useMemo(() => {
    const map: Record<string, number> = {};
    espaciosMapped.forEach(e => { map[e.idEdificio] = (map[e.idEdificio] || 0) + 1; });
    return map;
  }, [espaciosMapped]);

  // GLOBAL KPIs
  const kpis = useMemo(() => ({
    edificios: edificios.length,
    espacios: espaciosMapped.length,
    aulas: espaciosMapped.filter(e => isAula(e.tipo)).length,
    // Por descarte contaría también las oficinas, que no son laboratorios.
    labs: espaciosMapped.filter(e => esLaboratorio(e.tipo)).length,
  }), [edificios, espaciosMapped]);

  // NAV / SELECTION
  const [view, setView] = useState<'gestion' | 'mapa'>('gestion');
  const [selectedEdificioId, setSelectedEdificioId] = useState<string | null>(null);
  const [searchNav, setSearchNav] = useState('');
  /** El árbol se superpone en vez de quedarse fijo: se consulta a ratos, no todo el rato. */
  const [panelAbierto, setPanelAbierto] = useState(false);

  /**
   * Qué tarjeta del panel se ve EN CELULAR. Apiladas, elegir un edificio dejaba sus pisos fuera
   * de pantalla y había que desplazarse a ciegas. Se navega de a un paso —edificios, luego sus
   * pisos, con un botón para volver—, que es lo que hace cualquier app móvil con maestro-detalle.
   * De `sm` en adelante no se usa: ahí las dos tarjetas caben lado a lado.
   */
  const [pasoPanelMovil, setPasoPanelMovil] = useState<'edificios' | 'pisos'>('edificios');

  useEffect(() => {
    if (!selectedEdificioId && edificios.length > 0) {
      setSelectedEdificioId(edificios[0].id);
    }
  }, [edificios, selectedEdificioId]);

  const selectedEdificio = edificios.find(e => e.id === selectedEdificioId) || null;

  // Elegir un edificio NO cierra el panel: es el maestro de un maestro-detalle, y sus pisos
  // aparecen en la columna de al lado. El panel se cierra al elegir un espacio.
  const selectEdificio = (id: string) => setSelectedEdificioId(id);

  const filteredNavEdificios = useMemo(() => {
    const q = searchNav.toLowerCase();
    return edificios.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      espaciosMapped.some(s => s.idEdificio === e.id && s.nombre.toLowerCase().includes(q))
    );
  }, [edificios, espaciosMapped, searchNav]);

  // BUILDING-DETAIL: espacios de la facultad seleccionada
  const [espTab, setEspTab] = useState<EspTab>('todos');
  const [espSearch, setEspSearch] = useState('');
  const [espEstadoFilter, setEspEstadoFilter] = useState('');
  const [espView, setEspView] = useState<'grid' | 'list'>('grid');
  const [selectedPiso, setSelectedPiso] = useState<number | null>(null);

  useEffect(() => { setEspTab('todos'); setEspSearch(''); setEspEstadoFilter(''); setSelectedPiso(null); }, [selectedEdificioId]);

  const edificioEspacios = useMemo(() => espaciosMapped.filter(e => e.idEdificio === selectedEdificioId), [espaciosMapped, selectedEdificioId]);

  const edificioKpis = useMemo(() => ({
    total: edificioEspacios.length,
    aulas: edificioEspacios.filter(e => isAula(e.tipo)).length,
    labs: edificioEspacios.filter(e => esLaboratorio(e.tipo)).length,
    oficinas: edificioEspacios.filter(e => esOficina(e.tipo)).length,
    mantenimiento: edificioEspacios.filter(e => e.estado === 'mantenimiento').length,
  }), [edificioEspacios]);

  const filteredEspacios = useMemo(() => {
    let result = edificioEspacios;
    if (selectedPiso !== null) result = result.filter(e => (e.piso ?? 0) === selectedPiso);
    if (espTab === 'aula') result = result.filter(e => isAula(e.tipo));
    else if (espTab === 'lab') result = result.filter(e => esLaboratorio(e.tipo));
    else if (espTab === 'oficina') result = result.filter(e => esOficina(e.tipo));
    if (espEstadoFilter) result = result.filter(e => e.estado === espEstadoFilter);
    if (espSearch.trim()) {
      const q = espSearch.toLowerCase();
      result = result.filter(e => e.nombre.toLowerCase().includes(q) || (e.equipamiento || '').toLowerCase().includes(q));
    }
    return result;
  }, [edificioEspacios, selectedPiso, espTab, espEstadoFilter, espSearch]);

  const hasEspFilters = !!espSearch || !!espEstadoFilter || espTab !== 'todos' || selectedPiso !== null;

  const espTabItems = [
    { key: 'todos' as EspTab, label: 'Todos', count: edificioKpis.total, Icon: Layers },
    { key: 'aula' as EspTab, label: 'Aulas', count: edificioKpis.aulas, Icon: DoorOpen },
    { key: 'lab' as EspTab, label: 'Laboratorios', count: edificioKpis.labs, Icon: Microscope },
    { key: 'oficina' as EspTab, label: 'Oficinas', count: edificioKpis.oficinas, Icon: Briefcase },
  ];

  const tipoBadge = (tipo: string) => {
    if (tipo === 'Laboratorio Técnico') return <Badge color="amber" icon={Wrench}>Especialización</Badge>;
    if (tipo === 'Laboratorio de Informática') return <Badge color="purple" icon={Monitor}>Info.</Badge>;
    if (esOficina(tipo)) return <Badge color="green" icon={Briefcase}>Oficina</Badge>;
    return <Badge color="blue" icon={BookOpen}>Académica</Badge>;
  };

  // MAP STATE
  const [mapCenter, setMapCenter] = useState<[number, number]>([baseLat, baseLng]);
  const [mapZoom, setMapZoom] = useState(16);
  const [mapLayer, setMapLayer] = useState<MapLayer>('mapa');
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [picking, setPicking] = useState<null | 'edificio' | 'espacio'>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const handleZoomIn = () => setMapZoom(z => Math.min(z + 1, 19));
  const handleZoomOut = () => setMapZoom(z => Math.max(z - 1, 10));
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) mapWrapperRef.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };
  // (El botón de la brújula ahora usa "Mi ubicación"; se retiró el centrar-en-campus.)

  const getBuildingIcon = (ed: any) => {
    const isActive = activeMarkerId === ed.id;
    const color = ed.estado === 'operativo' ? 'text-emerald-500' : 'text-orange-500';
    const dark = mapLayer !== 'mapa';
    const bg = dark ? 'bg-[#181C26]' : 'bg-white';
    const border = isActive ? 'border-espoch-red scale-110 shadow-md ring-4 ring-red-500/20' : (dark ? 'border-gray-700' : 'border-gray-200');
    const txt = dark ? 'text-white' : 'text-gray-900';
    const shadow = dark
      ? 'text-shadow: 1px 1px 3px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.8);'
      : 'text-shadow: 1px 1px 0px white, -1px -1px 0px white, 1px -1px 0px white, -1px 1px 0px white;';
    return L.divIcon({
      className: 'bg-transparent border-none',
      html: `<div class="flex items-center gap-2 cursor-pointer transition-all hover:scale-105">
          <div class="w-8 h-8 rounded-full ${bg} border ${border} flex items-center justify-center shadow-lg shrink-0">
            <div class="${color}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${getBuildingSvg(ed.icono)}</svg></div>
          </div>
          <span class="text-[11px] font-bold ${txt}" style="${shadow}">${ed.nombre}</span>
        </div>`,
      iconSize: [0, 0], iconAnchor: [0, 0],
    });
  };

  const getSpaceIcon = (esp: any) => {
    const isActive = activeMarkerId === esp.id;
    const color = esp.estado === 'disponible' ? 'text-emerald-500' : (esp.estado === 'ocupada' ? 'text-blue-500' : 'text-orange-500');
    const border = isActive ? 'border-espoch-red scale-110 ring-4 ring-red-500/20' : 'border-gray-300';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/></svg>';
    return L.divIcon({
      className: 'bg-transparent border-none',
      html: `<div class="w-6 h-6 rounded-full bg-white border ${border} flex items-center justify-center shadow cursor-pointer transition-all hover:scale-110"><div class="${color}">${svg}</div></div>`,
      iconSize: [0, 0], iconAnchor: [0, 0],
    });
  };

  // ============ MODALS: EDIFICIO ============
  const edDefaults = { nombre: '', pisos: 1, area: 0, aulasAcademicas: 0, laboratorios: 0, estado: 'operativo', imagen: '', fotoFile: null as File | null, icono: 'building', lat: null as number | null, lng: null as number | null };
  const [edModal, setEdModal] = useState<null | 'create' | 'edit' | 'delete'>(null);
  const [edForm, setEdForm] = useState(edDefaults);
  const [selectedEdForm, setSelectedEdForm] = useState<any>(null);
  const [gpsEd, setGpsEd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accionesDesbloqueadas, setAccionesDesbloqueadas] = useState(false);

  const alternarCandado = async () => {
    if (accionesDesbloqueadas) {
      setAccionesDesbloqueadas(false);
      return;
    }

    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: '¿Habilitar acciones destructivas?',
      html: 'Se mostrará la opción <b>Eliminar edificio</b>.<br/>Eliminar un edificio afectará a sus pisos, aulas, laboratorios y horarios asociados.',
      showCancelButton: true,
      confirmButtonText: 'Sí, habilitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B00020',
      focusCancel: true,
    });
    if (isConfirmed) setAccionesDesbloqueadas(true);
  };

  const edToForm = (ed: any) => ({
    nombre: ed.nombre ?? '', pisos: ed.pisos ?? 1, area: ed.area ?? 0,
    aulasAcademicas: ed.aulasAcademicas ?? 0, laboratorios: ed.laboratorios ?? 0,
    estado: ed.estado ?? 'operativo', imagen: ed.imagen ?? '', fotoFile: null,
    icono: ed.icono ?? 'building', lat: ed.lat ?? null, lng: ed.lng ?? null,
  });

  // Conteos reales derivados de los espacios registrados (solo tienen valor al editar)
  const edFormEspacios = useMemo(() => selectedEdForm ? espaciosMapped.filter(e => e.idEdificio === selectedEdForm.id) : [], [selectedEdForm, espaciosMapped]);
  const derivedAulas = edFormEspacios.filter(e => isAula(e.tipo)).length;
  const derivedLabs = edFormEspacios.length - derivedAulas;
  const derivedCapacidad = edFormEspacios.reduce((sum, e) => sum + (e.capacidad || 0), 0);

  const openCreateEdificio = (lat: number | null = null, lng: number | null = null) => {
    setSelectedEdForm(null); setEdForm({ ...edDefaults, lat, lng }); setEdModal('create');
  };
  const openEditEdificio = (ed: any) => { setSelectedEdForm(ed); setEdForm(edToForm(ed)); setEdModal('edit'); };

  const handleEdificioFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEdForm(f => ({ ...f, imagen: URL.createObjectURL(file), fotoFile: file }));
  };

  const useMyLocationEd = async () => {
    setGpsEd(true);
    try { const c = await getCurrentPosition(); setEdForm(f => ({ ...f, lat: c.lat, lng: c.lng })); setMapCenter([c.lat, c.lng]); }
    catch (err: any) { import('sweetalert2').then(S => S.default.fire('Ubicación', err?.message || 'No se pudo obtener la ubicación.', 'warning')); }
    finally { setGpsEd(false); }
  };

  const handleSaveEdificio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (edForm.lat === null || edForm.lng === null) { void avisoInfo('Falta la ubicación', 'Marca en el mapa dónde está el edificio.'); return; }
    setSubmitting(true);
    let img = edForm.imagen || FALLBACK_ED;
    if (edForm.fotoFile) { const u = await uploadImage(edForm.fotoFile, 'edificios'); if (u) img = u; }
    const payload = {
      nombre: edForm.nombre, pisos: edForm.pisos, aulas_academicas: derivedAulas, laboratorios: derivedLabs,
      estado: edForm.estado, imagen_url: img, direccion: 'Campus Politécnico', ultimo_mantenimiento: new Date().toISOString().slice(0, 10),
      icono: edForm.icono, area_m2: edForm.area, lat: edForm.lat as number, lng: edForm.lng as number,
    };
    if (edModal === 'create') await addEdificio({ id: 'ED' + Date.now(), ...payload, ocupacion_pct: 0, rating: 4.5 } as any);
    else if (edModal === 'edit' && selectedEdForm) await updateEdificio(selectedEdForm.id, payload);
    setEdModal(null); setSubmitting(false);
  };

  const handleDeleteEdificio = async () => {
    if (!selectedEdForm) return;
    await removeEdificio(selectedEdForm.id);
    if (selectedEdificioId === selectedEdForm.id) setSelectedEdificioId(null);
    setEdModal(null); setSelectedEdForm(null); setAccionesDesbloqueadas(false);
  };

  // ============ MODALS: ESPACIO ============
  // `equipamiento` sigue en el formulario aunque ya no se muestre: así se conserva el valor
  // que tenga el espacio en vez de borrarlo al guardar. Vincular equipos se hace desde
  // Activos, en el campo "Aula / Ubicación" de cada equipo.
  const espDefaults = { nombre: '', idEdificio: '', piso: 0, tipo: 'Académica', capacidad: 20, m2: 60, equipamiento: '', estado: 'disponible', fotos: [] as string[], fotoFiles: [] as (File | null)[], lat: null as number | null, lng: null as number | null };
  const [espModal, setEspModal] = useState<null | 'create' | 'edit' | 'delete' | 'fotos'>(null);
  const [espForm, setEspForm] = useState(espDefaults);
  const [selectedEsp, setSelectedEsp] = useState<any>(null);
  const [gpsEsp, setGpsEsp] = useState(false);

  const opcionesPisos = useMemo(() => generarOpcionesPisos(), []);

  const openCreateEspacio = (opts: { lat?: number | null; lng?: number | null; tipo?: string; piso?: number } = {}) => {
    setSelectedEsp(null);
    setEspForm({
      ...espDefaults,
      idEdificio: selectedEdificioId || '',
      piso: opts.piso ?? 0,
      lat: opts.lat ?? null, lng: opts.lng ?? null,
      tipo: opts.tipo ?? (espTab === 'lab' ? 'Laboratorio Técnico' : espTab === 'oficina' ? 'Oficina de Docentes' : 'Académica'),
    });
    setEspModal('create');
  };

  const openEditEspacio = (esp: any) => {
    setSelectedEsp(esp);
    setEspForm({
      nombre: esp.nombre, idEdificio: esp.idEdificio, piso: esp.piso ?? 0, tipo: esp.tipo,
      capacidad: esp.capacidad, m2: esp.m2, equipamiento: esp.equipamiento, estado: esp.estado,
      fotos: esp.fotos || [], fotoFiles: [], lat: esp.lat, lng: esp.lng,
    });
    setEspModal('edit');
  };

  const useMyLocationEsp = async () => {
    setGpsEsp(true);
    try { const c = await getCurrentPosition(); setEspForm(f => ({ ...f, lat: c.lat, lng: c.lng })); setMapCenter([c.lat, c.lng]); }
    catch (err: any) { import('sweetalert2').then(S => S.default.fire('Ubicación', err?.message || 'No se pudo obtener la ubicación.', 'warning')); }
    finally { setGpsEsp(false); }
  };

  // Botón "Mi ubicación" del mapa: ubica al usuario por GPS y pregunta qué desea colocar.
  const handleMiUbicacion = async () => {
    const S = (await import('sweetalert2')).default;
    S.fire({ title: 'Obteniendo tu ubicación…', allowOutsideClick: false, didOpen: () => S.showLoading() });
    try {
      const c = await getCurrentPosition();
      setMapCenter([c.lat, c.lng]);
      setMapZoom(18);
      const res = await S.fire({
        icon: 'question',
        title: 'Tu ubicación',
        text: '¿Deseas colocar aquí una ubicación de edificio o espacio?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Edificio',
        denyButtonText: 'Espacio',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#0f172a',
        denyButtonColor: '#B00020',
      });
      if (res.isConfirmed) openCreateEdificio(c.lat, c.lng);
      else if (res.isDenied) openCreateEspacio({ lat: c.lat, lng: c.lng });
    } catch (err: any) {
      S.fire('Ubicación', err?.message || 'No se pudo obtener tu ubicación.', 'warning');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fotos = [...espForm.fotos], files = [...espForm.fotoFiles];
    fotos[index] = URL.createObjectURL(file); files[index] = file;
    setEspForm({ ...espForm, fotos, fotoFiles: files });
  };

  const handleSaveEspacio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espForm.nombre.trim()) { void avisoInfo('Falta el nombre', 'Escribe cómo se llama el espacio.'); return; }
    if (!espForm.idEdificio) { void avisoInfo('Falta el edificio', 'Elige en qué edificio está el espacio.'); return; }
    if (espForm.lat === null || espForm.lng === null) { void avisoInfo('Falta la ubicación', 'Marca en el mapa dónde está el espacio.'); return; }
    setSubmitting(true);
    let finalFotos = [...espForm.fotos];
    for (let i = 0; i < espForm.fotoFiles.length; i++) {
      if (espForm.fotoFiles[i]) { const u = await uploadImage(espForm.fotoFiles[i]!, 'espacios'); if (u) finalFotos[i] = u; }
    }
    finalFotos = finalFotos.filter(f => f && !f.startsWith('blob:'));
    // Se reenvía tal cual el valor que ya tenía el espacio: el campo dejó de mostrarse, pero
    // guardar no debe borrar lo que haya cargado. El 'N/A' es el valor por defecto de siempre.
    const equipamiento = espForm.equipamiento?.trim() || 'N/A';
    const espId = espModal === 'create' ? 'ESP' + Date.now() : selectedEsp?.id;
    const payload = {
      nombre: espForm.nombre, id_edificio: espForm.idEdificio, piso: espForm.piso, tipo: espForm.tipo,
      capacidad: espForm.capacidad, m2: espForm.m2, equipamiento, estado: espForm.estado,
      fotos_json: finalFotos, lat: espForm.lat as number, lng: espForm.lng as number,
    };
    try {
      if (espModal === 'create') await addEspacio({ id: espId, ...payload } as any);
      else if (espModal === 'edit' && selectedEsp) await updateEspacio(selectedEsp.id, payload as any);
    } catch (err: any) {
      void avisoError('No se pudo guardar', err?.message || 'Vuelve a intentarlo.');
      setSubmitting(false); return;
    }
    setSubmitting(false); setEspModal(null);
  };

  const handleDeleteEspacio = () => {
    if (selectedEsp) { removeEspacio(selectedEsp.id); setEspModal(null); setSelectedEsp(null); }
  };

  // Marcadores del mapa campus (filtrados por búsqueda de espacios en gestión no aplica aquí)
  const mapEspacios = espaciosMapped.filter(e => e.lat !== null && e.lng !== null);

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      <PageHero
        icon={Building2}
        title="Infraestructura"
        subtitle="Edificios, aulas y laboratorios del campus."
        backgroundImage={HERO_BG.infraestructura}
        stats={[
          { Icon: Building2, value: kpis.edificios, label: 'Edificios' },
          { Icon: Microscope, value: kpis.espacios, label: 'Espacios' },
          { Icon: DoorOpen, value: kpis.aulas, label: 'Aulas' },
          { Icon: Microscope, value: kpis.labs, label: 'Labs' },
        ]}
      >
        {/* Conmutador integrado al hero (patrón de Horarios): sin fila extra vacía */}
        {/* `max-w-full` + `shrink-0` en los botones: en celular "Mapa Campus" se salía del hero
            y quedaba inalcanzable. Si no entra, el grupo se desplaza en horizontal. */}
        <div className="flex max-w-full items-center overflow-x-auto bg-espoch-herocard/80 rounded-xl p-1 border border-white/5 shadow-inner">
          {([
            { key: 'gestion' as const, label: 'Gestión', Icon: LayoutGrid },
            { key: 'mapa' as const, label: 'Mapa Campus', Icon: MapIcon },
          ]).map(t => (
            <button key={t.key} onClick={() => setView(t.key)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 sm:px-5 py-2 rounded-lg text-[12px] font-bold transition-all ${view === t.key ? 'bg-[#df0000] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <t.Icon className="w-4 h-4 shrink-0" /> {t.label}
            </button>
          ))}
        </div>
      </PageHero>

      {view === 'gestion' ? (
        // Debajo de lg scrollea la PÁGINA; de lg en adelante cada panel lleva su propio scroll.
        // Con `overflow-hidden` fijo, en celular la ficha y la barra ocupaban casi todo y la
        // lista quedaba recortada sin forma de desplazarse.
        <div className="relative flex-1 flex items-start lg:items-stretch p-3 sm:p-6 md:p-8 min-h-0 bg-[#f4f7fb]/90 gap-6 overflow-y-auto lg:overflow-hidden">
          {/* LEFT: MAESTRO-DETALLE DE EDIFICIOS (mismo patrón que Ubicaciones en Horarios) */}
          {/* PANEL UBICACIONES — flotante, mismo lenguaje que Horarios: dos tarjetas sueltas
              sobre el contenido en vez de un contenedor blanco con cabecera y pie. */}
          {panelAbierto && <div className="absolute inset-0 z-[30]" onClick={() => setPanelAbierto(false)} />}
          <div className={`absolute inset-y-0 left-0 z-[40] flex w-[620px] max-w-[94%] flex-col transition-transform duration-300 pointer-events-none ${panelAbierto ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="shrink-0 px-3 pt-3 pb-2 pointer-events-auto">
              <div className="relative w-[280px] max-w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input type="text" placeholder="Buscar edificio o espacio..." value={searchNav} onChange={e => setSearchNav(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-[12.5px] text-gray-700 shadow-sm outline-none transition-colors focus:border-indigo-400 focus:bg-white placeholder:text-gray-400" />
              </div>
            </div>

            {/* En celular las dos tarjetas se apilan: a 375px no entran 280px + el detalle. */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto custom-scrollbar px-3 pb-3 pointer-events-none sm:flex-row sm:items-start sm:overflow-visible">
              {/* IZQUIERDA: edificios. Seleccionar uno muestra sus pisos al lado, así que nunca
                  hay dos edificios desplegados a la vez como pasaba con el árbol. */}
              <div className={`pointer-events-auto w-full shrink-0 flex-col gap-0.5 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-lg custom-scrollbar sm:flex sm:max-h-full sm:w-[280px] sm:overflow-y-auto ${pasoPanelMovil === 'edificios' ? 'flex' : 'hidden'}`}>
                <div className="flex items-center gap-1 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                  <Building2 className="h-3 w-3" /> Edificios
                </div>
                {filteredNavEdificios.length === 0 && (
                  <p className="px-2 py-3 text-[11px] italic text-gray-400">Sin coincidencias.</p>
                )}
                {filteredNavEdificios.map(ed => {
                  const isSel = selectedEdificioId === ed.id;
                  const edSpaces = espaciosMapped.filter(s => s.idEdificio === ed.id);
                  const IconCmp = buildingIcons[ed.icono] || Building2;
                  return (
                    <button
                      key={ed.id}
                      onClick={() => { selectEdificio(ed.id); setPasoPanelMovil('pisos'); }}
                      className={`flex items-start gap-2 rounded-xl px-2 py-2 text-left transition-colors ${isSel ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <span className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${ed.estado === 'operativo' ? 'bg-emerald-50 text-emerald-500' : 'bg-orange-50 text-orange-500'}`}>
                        <IconCmp className="h-3.5 w-3.5" />
                      </span>
                      {/* Sin `truncate`: el nombre completo se parte en dos líneas. Abreviado
                          ("MODULAR DE TELEC...") no se distingue de los otros tres modulares. */}
                      <span className={`flex-1 break-words text-[12px] leading-snug ${isSel ? 'font-extrabold' : 'font-bold'}`}>{ed.nombre}</span>
                      <span className="mt-0.5 shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-extrabold text-gray-500">{edSpaces.length}</span>
                    </button>
                  );
                })}
                <button onClick={() => openCreateEdificio()} className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 py-2 text-[10.5px] font-bold text-gray-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600">
                  <Plus className="h-3 w-3" /> Nuevo edificio
                </button>
                <p className="px-2 pt-1.5 pb-0.5 text-center text-[10px] font-bold text-gray-400">
                  {edificios.length} {edificios.length === 1 ? 'edificio' : 'edificios'} · {kpis.espacios} espacios
                </p>
              </div>

              {/* DERECHA: solo los pisos del edificio elegido. Al seleccionar un piso se filtra abajo en el edificio */}
              <div className={`pointer-events-auto min-w-0 flex-1 flex-col gap-1.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg custom-scrollbar sm:flex sm:max-h-full sm:overflow-y-auto ${pasoPanelMovil === 'pisos' ? 'flex' : 'hidden'}`}>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                  {/* Volver a la lista de edificios en móvil */}
                  <button
                    onClick={() => setPasoPanelMovil('edificios')}
                    className="-ml-1 mr-0.5 flex h-5 w-5 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 sm:hidden"
                    title="Volver a edificios"
                  >
                    <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                  </button>
                  <Layers className="h-3.5 w-3.5 text-gray-400" />
                  <span className="truncate">{selectedEdificio ? selectedEdificio.nombre : 'Pisos'}</span>
                </div>
                {!selectedEdificio ? (
                  <p className="px-2 py-3 text-[11px] italic text-gray-400">Elige un edificio.</p>
                ) : (() => {
                  const edSpaces = espaciosMapped.filter(s => s.idEdificio === selectedEdificio.id);
                  if (edSpaces.length === 0) {
                    return <p className="px-2 py-3 text-[11px] italic text-gray-400">Sin espacios registrados.</p>;
                  }
                  const pisosUnicos = [...new Set(edSpaces.map(sp => sp.piso ?? 0))].sort((a, b) => a - b);
                  return (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => { setSelectedPiso(null); setPanelAbierto(false); }}
                        className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-bold transition-all border ${
                          selectedPiso === null
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50 border-transparent'
                        }`}
                      >
                        <Layers className={`h-3.5 w-3.5 shrink-0 ${selectedPiso === null ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <span className="flex-1 truncate text-left">Todos los pisos</span>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${selectedPiso === null ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-500'}`}>
                          {edSpaces.length}
                        </span>
                      </button>
                      {pisosUnicos.map(piso => {
                        const delPiso = edSpaces.filter(sp => (sp.piso ?? 0) === piso);
                        const isActivo = selectedPiso === piso;
                        return (
                          <button
                            key={piso}
                            onClick={() => {
                              setSelectedPiso(piso);
                              setPanelAbierto(false);
                            }}
                            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-bold transition-all border ${
                              isActivo
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                                : 'text-gray-700 hover:bg-gray-50 border-gray-100'
                            }`}
                          >
                            <Layers className={`h-3.5 w-3.5 shrink-0 ${isActivo ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className="flex-1 truncate text-left">{formatoPiso(piso)}</span>
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${isActivo ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-500'}`}>
                              {delPiso.length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
                {selectedEdificio && (
                  <button onClick={() => openCreateEspacio(selectedPiso !== null ? { piso: selectedPiso } : {})} className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 py-2 text-[10.5px] font-bold text-gray-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600">
                    <Plus className="h-3 w-3" /> Agregar espacio
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* RIGHT: BUILDING DETAIL */}
          {/* `overflow-hidden` se conserva: AcentoTarjeta lo necesita para que su franja respete
              las esquinas. Lo que clipaba en celular era la altura fija, no el recorte: con
              `items-start` arriba la caja crece con el contenido y no sobra nada que cortar. */}
          <div className="relative w-full flex-1 flex flex-col lg:min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
            <AcentoTarjeta />
            {!selectedEdificio ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
                <Building2 className="w-16 h-16 text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">Selecciona un edificio</h3>
                <p className="text-sm text-gray-500 max-w-sm">Elige un edificio del panel izquierdo para gestionar sus aulas y laboratorios, o crea uno nuevo.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col lg:min-h-0 lg:overflow-hidden bg-gray-50/30 p-3 sm:p-6 md:p-8">
                {/* IDENTITY CARD */}
                <div className="shrink-0 bg-white border border-gray-100 rounded-[24px] shadow-sm mb-6 flex flex-col md:flex-row md:items-center p-3 gap-4 md:gap-5">
                  <img src={selectedEdificio.imagen} alt={selectedEdificio.nombre} className="w-full md:w-[150px] h-[120px] md:h-[90px] object-cover rounded-2xl shrink-0" />
                  <div className="flex-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 min-w-0">
                    {/* Nombre + ubicación */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[19px] sm:text-[26px] font-extrabold text-[#0f172a] truncate leading-none tracking-tight">{selectedEdificio.nombre}</h3>
                        <EstadoBadge estado={selectedEdificio.estado} />
                      </div>
                      <p className="text-[12px] font-medium text-gray-500 flex items-center gap-1.5 mt-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {selectedEdificio.direccion}</p>
                    </div>

                    {/* Métricas */}
                    <div className="flex items-center gap-4 lg:gap-5 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
                        <div className="flex flex-col">
                          <span className="text-[17px] font-extrabold text-slate-900 leading-none">{selectedEdificio.pisos}</span>
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5">pisos</span>
                        </div>
                      </div>
                      <div className="w-px h-9 bg-gray-200"></div>
                      <div className="flex items-center gap-2.5">
                        <MapIcon className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
                        <div className="flex flex-col">
                          <span className="text-[17px] font-extrabold text-slate-900 leading-none">{selectedEdificio.area} m²</span>
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5">Área total</span>
                        </div>
                      </div>
                      <div className="w-px h-9 bg-gray-200"></div>
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
                        <div className="flex flex-col">
                          <span className="text-[17px] font-extrabold text-slate-900 leading-none">{selectedEdificio.ocupacion}%</span>
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5">Ocupación</span>
                        </div>
                      </div>
                      {edificioKpis.mantenimiento > 0 && (
                        <>
                          <div className="w-px h-9 bg-gray-200"></div>
                          <div className="flex items-center gap-2.5">
                            <AlertTriangle className="w-6 h-6 text-orange-500" strokeWidth={1.5} />
                            <div className="flex flex-col">
                              <span className="text-[17px] font-extrabold text-orange-600 leading-none">{edificioKpis.mantenimiento}</span>
                              <span className="text-[11px] text-orange-500 font-medium mt-0.5">en mantenim.</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Acciones */}
                    {/* En celular ocupan la fila a medias; desde sm vuelven a su ancho natural. */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={alternarCandado}
                        title={accionesDesbloqueadas
                          ? 'Ocultar acción de eliminar edificio'
                          : 'Habilitar acción destructiva (Eliminar edificio)'}
                        className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-colors shadow-sm ${
                          accionesDesbloqueadas
                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {accionesDesbloqueadas ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEditEdificio(selectedEdificio)} className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>
                      {accionesDesbloqueadas && (
                        <button onClick={() => { setSelectedEdForm(selectedEdificio); setEdModal('delete'); }} className="flex-1 sm:flex-none bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm flex items-center justify-center gap-2 animate-fade-in">
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* TOOLBAR */}
                <div className="shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm px-3 sm:px-5 py-3 mb-4 flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full lg:w-auto">
                    <BotonPanelLateral
                      abierto={panelAbierto}
                      // Al abrirlo se vuelve siempre a la lista de edificios: reaparecer en los
                      // pisos del que se miró la vez anterior desorienta más de lo que ahorra.
                      onClick={() => {
                        if (!panelAbierto) setPasoPanelMovil('edificios');
                        setPanelAbierto(!panelAbierto);
                      }}
                      titulo="Edificios y espacios"
                    />
                    {/* El buscador toma el resto de la fila en celular; desde sm vuelve a 200px. */}
                    <div className="relative flex-1 min-w-[140px] sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={espSearch} onChange={e => setEspSearch(e.target.value)} placeholder="Buscar espacio..." className="w-full sm:w-[200px] pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-700 outline-none focus:border-indigo-400 transition-colors" />
                    </div>
                    {espTabItems.map(tab => {
                      const active = espTab === tab.key;
                      return (
                        <button key={tab.key} onClick={() => setEspTab(tab.key)} className={`flex items-center gap-1.5 text-[12px] font-bold rounded-full py-2 px-3.5 border transition-all shadow-sm whitespace-nowrap ${active ? 'bg-espoch-slate text-white border-transparent' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                          <tab.Icon className="w-3.5 h-3.5 opacity-80" /> {tab.label}
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
                        </button>
                      );
                    })}
                    <FilterDropdown label="Estado" value={espEstadoFilter || 'todos'} options={[{ key: 'todos', label: 'Todos' }, { key: 'disponible', label: 'Disponible' }, { key: 'ocupada', label: 'Ocupada' }, { key: 'mantenimiento', label: 'Mantenimiento' }]} onChange={k => setEspEstadoFilter(k === 'todos' ? '' : k)} />
                    {selectedPiso !== null && (
                      <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm">
                        <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {formatoPiso(selectedPiso)}
                        <button
                          onClick={() => setSelectedPiso(null)}
                          title="Ver todos los pisos"
                          className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {hasEspFilters && (
                      <button onClick={() => { setEspSearch(''); setEspEstadoFilter(''); setEspTab('todos'); setSelectedPiso(null); }} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                        <RotateCcw className="w-3 h-3" /> Limpiar
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <ViewToggle value={espView} onChange={setEspView} />
                    <button onClick={() => openCreateEspacio({})} className="bg-[#0f172a] hover:bg-black text-white px-4 py-2 rounded-lg text-[12px] font-bold transition-all shadow-sm flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Agregar Espacio
                    </button>
                  </div>
                </div>

                {/* SPACES */}
                <div className="flex-1 lg:min-h-0 flex flex-col">
                {filteredEspacios.length === 0 ? (
                  <EmptyState
                    icon={Microscope}
                    variant="card"
                    title={edificioEspacios.length === 0 ? 'Sin espacios registrados' : 'Sin resultados con estos filtros'}
                    description={edificioEspacios.length === 0 ? 'Registra la primera aula o laboratorio de este edificio.' : undefined}
                    actionLabel={edificioEspacios.length === 0 ? 'Agregar primer espacio' : undefined}
                    onAction={edificioEspacios.length === 0 ? () => openCreateEspacio({}) : undefined}
                    secondaryLabel={edificioEspacios.length > 0 ? 'Limpiar filtros' : undefined}
                    onSecondary={edificioEspacios.length > 0 ? () => { setEspSearch(''); setEspEstadoFilter(''); setEspTab('todos'); } : undefined}
                  />
                ) : espView === 'list' ? (
                  <DataTable
                    fill
                    rows={filteredEspacios}
                    rowKey={sp => sp.id}
                    minWidthClass="min-w-[940px]"
                    columns={[
                      {
                        key: 'nombre', header: 'Nombre', width: '1.4fr', sortValue: sp => sp.nombre,
                        render: sp => (
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-bold text-gray-900 truncate">{sp.nombre}</span>
                          </div>
                        ),
                      },
                      {
                        key: 'edificio', header: 'Edificio', width: '1fr', sortValue: sp => sp.edificio,
                        render: sp => (
                          <span className="flex items-center gap-1.5 min-w-0 text-[11px] font-semibold text-gray-600">
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                            <span className="truncate">{sp.edificio}</span>
                          </span>
                        ),
                      },
                      { key: 'tipo', header: 'Tipo', width: '0.8fr', sortValue: sp => sp.tipo, render: sp => tipoBadge(sp.tipo) },
                      { key: 'piso', header: 'Piso', width: '0.6fr', align: 'center', sortValue: sp => sp.piso, render: sp => <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">{formatoPisoCorto(sp.piso)}</span> },
                      { key: 'capacidad', header: 'Capac.', width: '0.6fr', align: 'center', sortValue: sp => sp.capacidad, render: sp => <span className="text-[11px] font-bold text-gray-700">{sp.capacidad} <span className="text-[9px] text-gray-400 font-normal">est.</span></span> },
                      { key: 'estado', header: 'Estado', width: '0.8fr', sortValue: sp => sp.estado, render: sp => <EstadoBadge estado={sp.estado} /> },
                      {
                        key: 'acciones', header: 'Acciones', width: '110px', align: 'right',
                        render: sp => (
                          <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setSelectedEsp(sp); setEspModal('fotos'); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-purple-400 hover:text-purple-600 border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all shadow-sm" title="Fotos"><Camera className="w-3.5 h-3.5" /></button>
                            <button onClick={() => openEditEspacio(sp)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-blue-400 hover:text-blue-600 border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setSelectedEsp(sp); setEspModal('delete'); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-red-400 hover:text-red-600 border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredEspacios.map(sp => (
                      <div key={sp.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-lg transition-all group flex flex-col">
                        <div className="relative h-[120px] overflow-hidden bg-gray-100">
                          <img src={sp.fotos.length > 0 ? sp.fotos[0] : FALLBACK_ESP} alt={sp.nombre} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2"><EstadoBadge estado={sp.estado} /></div>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-[14px] font-bold text-gray-900 leading-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">{sp.nombre}</h4>
                            {tipoBadge(sp.tipo)}
                          </div>
                          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-[11px] font-bold text-[#0f172a]">
                              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-500" strokeWidth={1.5} /> {formatoPiso(sp.piso)}</span>
                              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-500" strokeWidth={1.5} /> {sp.capacidad} est.</span>
                              <span className="flex items-center gap-1.5"><Ruler className="w-4 h-4 text-slate-500" strokeWidth={1.5} /> {sp.m2} m²</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setSelectedEsp(sp); setEspModal('fotos'); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Fotos"><Camera className="w-3.5 h-3.5" /></button>
                              <button onClick={() => openEditEspacio(sp)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => { setSelectedEsp(sp); setEspModal('delete'); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ===== MAPA CAMPUS ===== */
        <div className="flex-1 flex p-6 md:p-8 min-h-0 bg-[#f4f7fb]/90 gap-6 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <div ref={mapWrapperRef} className="flex-1 rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden relative">
              {/* Banner de modo "ubicar" (solo mientras se coloca) */}
              {picking && (
                <div className="absolute left-4 top-4 z-[1000]">
                  <div className="bg-gray-900/90 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md">
                    <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-espoch-red opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                    <span className="text-[12px] font-bold">Clic en el mapa para ubicar {picking === 'edificio' ? 'el edificio' : 'el espacio'}</span>
                    <button onClick={() => setPicking(null)} className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              )}

              {/* Botones AGREGAR — derecha, en columna, junto a pantalla completa */}
              {!picking && (
                <div className="absolute right-4 top-[64px] z-[1000] flex flex-col gap-2 pointer-events-auto">
                  <button onClick={() => setPicking('edificio')} className="flex items-center gap-2 bg-[#0f172a] hover:bg-black text-white text-[11px] font-bold px-3.5 py-2 rounded-xl shadow-md border border-gray-800 transition-colors">
                    <Plus className="w-3.5 h-3.5 shrink-0" /> <Building2 className="w-3.5 h-3.5 shrink-0" /> Edificio
                  </button>
                  <button onClick={() => setPicking('espacio')} className="flex items-center gap-2 bg-[#0f172a] hover:bg-black text-white text-[11px] font-bold px-3.5 py-2 rounded-xl shadow-md border border-gray-800 transition-colors">
                    <Plus className="w-3.5 h-3.5 shrink-0" /> <Microscope className="w-3.5 h-3.5 shrink-0" /> Espacio
                  </button>
                </div>
              )}

              <div className="absolute inset-0 z-0">
                <MapContainer center={mapCenter} zoom={mapZoom} zoomControl={false} className="w-full h-full" style={{ background: '#f8f9fa' }}>
                  <MapController center={mapCenter} zoom={mapZoom} activeId={activeMarkerId} />
                  <MapClickPicker isPicking={!!picking} onPick={p => {
                    const which = picking; setPicking(null);
                    if (which === 'edificio') openCreateEdificio(p[0], p[1]);
                    else if (which === 'espacio') openCreateEspacio({ lat: p[0], lng: p[1] });
                  }} />
                  <TileLayer url={getTileUrl(mapLayer)} attribution={atribucionTiles(mapLayer)} />
                  <Marker position={[baseLat, baseLng]} icon={campusMarkerIcon} interactive={false} zIndexOffset={2000} />
                  <UserLocationMarker />
                  {!picking && edificios.map(ed => (
                    <Marker key={ed.id} position={[ed.lat, ed.lng]} icon={getBuildingIcon(ed)} zIndexOffset={activeMarkerId === ed.id ? 1000 : 0}
                      eventHandlers={{ click: () => { if (!picking) { setActiveMarkerId(ed.id); setMapCenter([ed.lat, ed.lng]); setMapZoom(18); } } }}>
                      <Popup offset={[0, -20]} className="custom-leaflet-popup">
                        <div className="bg-white rounded-xl p-2 w-[190px] flex flex-col gap-2">
                          <img src={ed.imagen} className="w-full h-[80px] object-cover rounded-lg" alt={ed.nombre} />
                          <div className="px-1">
                            <h4 className="font-bold text-gray-900 text-[12px] leading-tight">{ed.nombre}</h4>
                            <p className="text-[9px] text-gray-500">{espaciosPorEdificio[ed.id] || 0} espacios · {ed.pisos} pisos</p>
                            <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100">
                              <button onClick={() => { setView('gestion'); selectEdificio(ed.id); }} className="flex-1 bg-gray-900 text-white py-1.5 rounded-lg text-[9px] font-extrabold hover:bg-black transition-colors">Gestionar</button>
                              <button onClick={() => openEditEdificio(ed)} className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-1.5 rounded-lg text-[9px] font-extrabold transition-colors"><Edit2 className="w-3 h-3" /> Editar</button>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {!picking && mapEspacios.map(sp => (
                    <Marker key={sp.id} position={[sp.lat as number, sp.lng as number]} icon={getSpaceIcon(sp)} zIndexOffset={activeMarkerId === sp.id ? 1000 : 0}
                      eventHandlers={{ click: () => { if (!picking) { setActiveMarkerId(sp.id); setMapCenter([sp.lat as number, sp.lng as number]); setMapZoom(19); } } }}>
                      <Popup offset={[0, -14]} className="custom-leaflet-popup">
                        <div className="bg-white rounded-xl p-2 w-[180px] flex flex-col gap-2">
                          <img src={sp.fotos.length > 0 ? sp.fotos[0] : FALLBACK_ESP} className="w-full h-[70px] object-cover rounded-lg" alt={sp.nombre} />
                          <div className="px-1">
                            <h4 className="font-bold text-gray-900 text-[11px] leading-tight">{sp.nombre}</h4>
                            <p className="text-[9px] text-gray-500 truncate">{sp.edificio} · {formatoPiso(sp.piso)}</p>
                            <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100">
                              <button onClick={() => openEditEspacio(sp)} className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-1.5 rounded-lg text-[9px] font-extrabold transition-colors"><Edit2 className="w-3 h-3" /> Editar</button>
                              <button onClick={() => { setSelectedEsp(sp); setEspModal('delete'); }} className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 py-1.5 rounded-lg text-[9px] font-extrabold transition-colors"><Trash2 className="w-3 h-3" /> Borrar</button>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
                <MapControls
                  layer={mapLayer} onLayer={setMapLayer} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut}
                  onCenter={handleMiUbicacion} centerTitle="Mi ubicación" onFullscreen={toggleFullscreen}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL EDIFICIO (crear/editar) ===== */}
      {(edModal === 'create' || edModal === 'edit') && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-[850px] relative animate-scale-in flex flex-col p-5 sm:p-8 max-h-[95vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <button onClick={() => setEdModal(null)} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-gray-600 transition-colors p-1"><X className="w-5 h-5" /></button>
            <div className="mb-6">
              <h3 className="text-[22px] font-bold text-gray-900 tracking-tight leading-none mb-1.5">{edModal === 'create' ? 'Registrar Edificio' : 'Editar Edificio'}</h3>
              <p className="text-[13px] text-gray-500 font-medium">{edModal === 'create' ? 'Agregue un nuevo edificio al campus.' : `Modifique los datos de ${selectedEdForm?.nombre}.`}</p>
            </div>
            <form onSubmit={handleSaveEdificio} className="flex flex-col">
              <div className="flex flex-col md:flex-row gap-5 md:gap-8">
                <div className="flex flex-col gap-6 flex-[0.8] md:max-w-[340px]">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Imagen del Edificio</label>
                    <div className="border-[1.5px] border-dashed border-espoch-yellow rounded-xl h-[180px] flex flex-col items-center justify-center gap-3 hover:bg-yellow-50/30 transition-colors cursor-pointer group relative overflow-hidden" onClick={() => document.getElementById('inf-edf-foto')?.click()}>
                      {!edForm.imagen ? (
                        <><ImageIcon className="w-10 h-10 text-gray-300 group-hover:text-espoch-yellow transition-colors" strokeWidth={1.5} /><div className="flex flex-col items-center text-center"><span className="text-[13px] font-bold text-gray-600">Clic para subir imagen</span><span className="text-[10px] font-bold text-gray-400">JPG, PNG — Máx. 5MB</span></div></>
                      ) : (<img src={edForm.imagen} className="w-full h-full object-cover absolute inset-0" alt="preview" />)}
                      <button type="button" title="Tomar foto" onClick={e => { e.stopPropagation(); document.getElementById('inf-edf-cam')?.click(); }} className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow flex items-center justify-center text-gray-600 hover:text-espoch-red hover:bg-white transition-colors"><Camera className="w-4 h-4" /></button>
                      <input type="file" id="inf-edf-foto" accept="image/*" className="hidden" onChange={handleEdificioFoto} />
                      <input type="file" id="inf-edf-cam" accept="image/*" capture="environment" className="hidden" onChange={handleEdificioFoto} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Ubicación en Mapa</label>
                      <button type="button" onClick={useMyLocationEd} disabled={gpsEd} className="flex items-center gap-1.5 text-[11px] font-bold text-espoch-red hover:text-espoch-darkred disabled:opacity-50 transition-colors"><MapPin className="w-3.5 h-3.5" /> {gpsEd ? 'Ubicando…' : 'Usar mi ubicación'}</button>
                    </div>
                    <div className="w-full h-[200px] rounded-xl border border-gray-200 bg-gray-50 overflow-hidden relative z-0">
                      <MapContainer center={edForm.lat && edForm.lng ? [edForm.lat, edForm.lng] : mapCenter} zoom={16} zoomControl={false} className="w-full h-full">
                        <TileLayer url={getTileUrl('mapa')} attribution={atribucionTiles('mapa')} />
                        {/* Marcadores de edificios ocultos mientras se agrega/edita, para no chocar con el nuevo. */}
                        <UserLocationMarker />
                        <RecenterMap lat={edForm.lat} lng={edForm.lng} />
                        <LocationPicker position={edForm.lat && edForm.lng ? [edForm.lat, edForm.lng] : null} setPosition={p => setEdForm({ ...edForm, lat: p[0], lng: p[1] })} />
                      </MapContainer>
                    </div>
                    {edForm.lat ? (
                      <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Ubicación seleccionada.</p>
                    ) : (
                      <p className="text-[11px] font-bold text-gray-500 mt-1 flex items-center gap-1.5"><Info className="w-4 h-4 text-espoch-red" /> Haz clic en el mapa para ubicar.</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-5 flex-1">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Nombre del Edificio</label>
                    <input required value={edForm.nombre} onChange={e => setEdForm({ ...edForm, nombre: e.target.value })} placeholder="Edificio FIE-C" className="bg-[#fafafa] text-[13px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-red focus:bg-white font-medium transition-all w-full placeholder:text-gray-400" />
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Icono Representativo</label>
                    <div className="flex gap-3 mt-1">
                      {Object.entries(buildingIcons).map(([id, IconCmp]) => (
                        <button key={id} type="button" onClick={() => setEdForm({ ...edForm, icono: id })} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${edForm.icono === id ? 'bg-espoch-red text-white shadow-md ring-2 ring-red-500/20 scale-110' : 'bg-[#fafafa] text-gray-400 border border-gray-200 hover:bg-gray-100 hover:text-gray-600'}`}>
                          <IconCmp className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Pisos</label>
                      <input required type="number" min="1" value={edForm.pisos} onChange={e => setEdForm({ ...edForm, pisos: parseInt(e.target.value) || 0 })} className="bg-[#fafafa] text-[14px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-red focus:bg-white font-bold transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Área (m²)</label>
                      <input required type="number" min="0" value={edForm.area || ''} onChange={e => setEdForm({ ...edForm, area: parseInt(e.target.value) || 0 })} placeholder="1000" className="bg-[#fafafa] text-[14px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-red focus:bg-white font-bold transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Aulas Académicas</label>
                      <div className="bg-[#fafafa]/60 text-[14px] text-gray-800 rounded-xl py-3 px-4 border border-gray-200 font-bold flex items-center shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] select-none" title="Se calcula con los espacios registrados en este edificio">
                        {derivedAulas}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Laboratorios</label>
                      <div className="bg-[#fafafa]/60 text-[14px] text-gray-800 rounded-xl py-3 px-4 border border-gray-200 font-bold flex items-center shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] select-none" title="Se calcula con los espacios registrados en este edificio">
                        {derivedLabs}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Estado</label>
                      <select value={edForm.estado} onChange={e => setEdForm({ ...edForm, estado: e.target.value })} className="bg-[#fafafa] text-[14px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-red focus:bg-white font-bold transition-all cursor-pointer">
                        <option value="operativo">Operativo</option>
                        <option value="mantenimiento">En Mantenimiento</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-[#fafafa] border border-gray-100 rounded-xl p-4 flex justify-between items-center mt-1">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-extrabold text-gray-600 uppercase tracking-widest">Capacidad Total (Auto)</span>
                      <span className="text-[10px] font-medium text-gray-400">Suma de capacidad de sus espacios</span>
                    </div>
                    <span className="text-[32px] font-bold text-espoch-red leading-none">{derivedCapacidad}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                <button type="button" disabled={submitting} onClick={() => setEdModal(null)} className="px-6 py-3 rounded-full border border-gray-200 bg-white text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={submitting} className="px-8 py-3 rounded-full bg-[#cc0000] hover:bg-[#aa0000] text-white text-[13px] font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2">
                  {submitting && <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>}
                  {edModal === 'create' ? 'Registrar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL ESPACIO (crear/editar) ===== */}
      {(espModal === 'create' || espModal === 'edit') && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-[850px] relative animate-scale-in flex flex-col p-5 sm:p-8 max-h-[95vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <button onClick={() => setEspModal(null)} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-gray-600 transition-colors p-1"><X className="w-5 h-5" /></button>
            <div className="mb-6">
              <h3 className="text-[22px] font-bold text-gray-900 tracking-tight leading-none mb-1.5">{espModal === 'create' ? 'Registrar Espacio' : 'Editar Espacio'}</h3>
              <p className="text-[13px] text-gray-500 font-medium">{espModal === 'create' ? 'Agregue un aula o laboratorio.' : `Modifique los datos de ${selectedEsp?.nombre}.`}</p>
            </div>
            <form onSubmit={handleSaveEspacio} className="flex flex-col">
              <div className="flex flex-col md:flex-row gap-5 md:gap-8">
                <div className="flex flex-col gap-6 flex-[0.8] md:max-w-[340px]">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Fotos</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[0, 1].map(index => (
                        <div key={index} className="border-[1.5px] border-dashed border-espoch-yellow rounded-xl h-[100px] flex items-center justify-center cursor-pointer hover:bg-yellow-50/30 transition-colors overflow-hidden relative" onClick={() => document.getElementById(`inf-esp-foto-${index}`)?.click()}>
                          {!espForm.fotos[index] ? (
                            <div className="flex flex-col items-center text-gray-400"><ImageIcon className="w-6 h-6 mb-1 text-gray-300" strokeWidth={1.5} /><p className="text-[10px] font-bold text-gray-600">{index === 0 ? 'Entrada' : 'Interior'}</p></div>
                          ) : (<img src={espForm.fotos[index]} className="w-full h-full object-cover absolute inset-0" alt={`foto-${index}`} />)}
                          <button type="button" title="Tomar foto" onClick={e => { e.stopPropagation(); document.getElementById(`inf-esp-cam-${index}`)?.click(); }} className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow flex items-center justify-center text-gray-600 hover:text-espoch-red hover:bg-white transition-colors"><Camera className="w-3.5 h-3.5" /></button>
                          <input type="file" id={`inf-esp-foto-${index}`} accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, index)} />
                          <input type="file" id={`inf-esp-cam-${index}`} accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoUpload(e, index)} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Ubicación en Mapa</label>
                      <button type="button" onClick={useMyLocationEsp} disabled={gpsEsp} className="flex items-center gap-1.5 text-[11px] font-bold text-espoch-red hover:text-espoch-darkred disabled:opacity-50 transition-colors"><MapPin className="w-3.5 h-3.5" /> {gpsEsp ? 'Ubicando…' : 'Usar mi ubicación'}</button>
                    </div>
                    <div className="w-full h-[200px] rounded-xl border border-gray-200 bg-gray-50 overflow-hidden relative z-0">
                      <MapContainer center={espForm.lat !== null && espForm.lng !== null ? [espForm.lat, espForm.lng] : [baseLat, baseLng]} zoom={17} zoomControl={false} className="w-full h-full">
                        <TileLayer url={getTileUrl('mapa')} attribution={atribucionTiles('mapa')} />
                        {/* Marcadores de edificios ocultos mientras se agrega/edita, para no chocar con el nuevo. */}
                        <UserLocationMarker />
                        <RecenterMap lat={espForm.lat} lng={espForm.lng} />
                        <LocationPicker position={espForm.lat !== null && espForm.lng !== null ? [espForm.lat, espForm.lng] : null} setPosition={p => setEspForm({ ...espForm, lat: p[0], lng: p[1] })} />
                      </MapContainer>
                    </div>
                    {espForm.lat ? (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 w-fit"><CheckCircle className="w-3 h-3 shrink-0" /><span className="text-[10px] font-bold">Ubicación seleccionada.</span></div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-md bg-orange-50 text-orange-600 w-fit"><Info className="w-3 h-3 shrink-0" /><span className="text-[10px] font-bold">Haz clic en el mapa para ubicar.</span></div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-5 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Nombre</label>
                      <input required value={espForm.nombre} onChange={e => setEspForm({ ...espForm, nombre: e.target.value })} placeholder="Lab. de Electrónica" className="bg-[#fafafa] text-[14px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:bg-white font-bold transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Edificio</label>
                      <select value={espForm.idEdificio} onChange={e => setEspForm({ ...espForm, idEdificio: e.target.value })} className="bg-[#fafafa] text-[14px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:bg-white font-bold transition-all cursor-pointer">
                        <option value="">Seleccione Edificio</option>
                        {edificios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Piso</label>
                      <select
                        required
                        value={espForm.piso}
                        onChange={e => setEspForm({ ...espForm, piso: parseInt(e.target.value, 10) })}
                        className="bg-[#fafafa] text-[14px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:bg-white font-bold transition-all cursor-pointer"
                      >
                        {opcionesPisos.map(op => (
                          <option key={op.valor} value={op.valor}>{op.etiqueta}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Tipo</label>
                      <select value={espForm.tipo} onChange={e => setEspForm({ ...espForm, tipo: e.target.value })} className="bg-[#fafafa] text-[14px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:bg-white font-bold transition-all cursor-pointer">
                        {TIPOS_ESPACIO.map(({ valor, etiqueta }) => (
                          <option key={valor} value={valor}>{etiqueta}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Dos campos numéricos cortos: caben lado a lado hasta en celular, y así el
                      formulario no obliga a desplazar dos pantallas más. */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Capacidad</label>
                      <input required type="number" min="1" value={espForm.capacidad} onChange={e => setEspForm({ ...espForm, capacidad: parseInt(e.target.value) || 30 })} className="bg-[#fafafa] text-[14px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:bg-white font-bold transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Área (m²)</label>
                      <input required type="number" min="1" value={espForm.m2} onChange={e => setEspForm({ ...espForm, m2: parseInt(e.target.value) || 40 })} className="bg-[#fafafa] text-[14px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:bg-white font-bold transition-all" />
                    </div>
                  </div>
                  {espModal === 'edit' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Estado</label>
                      <select value={espForm.estado} onChange={e => setEspForm({ ...espForm, estado: e.target.value })} className="bg-[#fafafa] text-[14px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:bg-white font-bold transition-all cursor-pointer">
                        <option value="disponible">Disponible</option>
                        <option value="ocupada">Ocupada</option>
                        <option value="mantenimiento">Mantenimiento</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              {/* En celular los dos botones se reparten la fila; desde sm vuelven a la derecha. */}
              <div className="flex justify-stretch sm:justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                <button type="button" disabled={submitting} onClick={() => setEspModal(null)} className="flex-1 sm:flex-none px-6 py-3 rounded-full border border-gray-200 bg-white text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 sm:flex-none px-8 py-3 rounded-full bg-espoch-ink hover:bg-black text-white text-[13px] font-bold shadow-lg transition-all border border-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>}
                  {espModal === 'create' ? 'Registrar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL FOTOS ESPACIO ===== */}
      {espModal === 'fotos' && selectedEsp && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-[480px] relative animate-scale-in flex flex-col p-6">
            <button onClick={() => setEspModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">{selectedEsp.nombre}</h3>
            <p className="text-xs text-gray-500 mb-4">{selectedEsp.edificio} - {formatoPiso(selectedEsp.piso)}</p>
            {selectedEsp.fotos && selectedEsp.fotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {selectedEsp.fotos.map((f: string, i: number) => (
                  <div key={i} className="relative rounded-xl overflow-hidden h-[140px]">
                    <img src={f} className="w-full h-full object-cover" alt={`foto-${i}`} />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">{i === 0 ? 'Entrada' : 'Interior'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-gray-300"><Camera className="w-10 h-10 mb-2" /><p className="text-xs font-bold">Sin fotos</p></div>
            )}
            <div className="flex justify-end mt-2"><button onClick={() => setEspModal(null)} className="px-5 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">Cerrar</button></div>
          </div>
        </div>
      )}

      {/* ===== CONFIRMS ===== */}
      <ConfirmDialog
        open={edModal === 'delete'}
        title="Eliminar Edificio"
        message={<>¿Eliminar <b>{selectedEdForm?.nombre}</b>? Se perderán también sus espacios asociados. Esta acción no se puede deshacer.</>}
        onConfirm={handleDeleteEdificio}
        onCancel={() => setEdModal(null)}
      />
      <ConfirmDialog
        open={espModal === 'delete'}
        title="Eliminar Espacio"
        message={<>¿Eliminar <b>{selectedEsp?.nombre}</b>? Esta acción no se puede deshacer.</>}
        onConfirm={handleDeleteEspacio}
        onCancel={() => setEspModal(null)}
      />
    </div>
  );
};

export default Infraestructura;

