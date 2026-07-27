import { useState, useMemo, useEffect } from 'react';
import {
  UserCog, Plus, CheckCircle, Search, User, Mail, Building2, Layers, Trash2,
  Wrench, Sofa, Settings, MonitorPlay, Package, LayoutGrid, AlertTriangle,
  FileText, FileDown, QrCode, History, DoorOpen, Microscope
} from 'lucide-react';
import { CATEGORIAS, type CategoriaInventario } from '../data/inventarioData';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useUsuariosStore } from '../../../store/usuariosStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useAsignacionesStore, resKey, type RecursoKind } from '../../../store/asignacionesStore';
import { useMantenimientoStore } from '../../../store/mantenimientoStore';
import { FilterDropdown } from '../../../components/ui/FilterDropdown';
import { generarActaAsignacion, exportarAsignacionesPdf, type RecursoActa } from '../utils/asignacionesPdfHelper';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

const CAT_ICON: Record<CategoriaInventario, React.ElementType> = {
  equipos: Settings, herramientas: Wrench, mobiliario: Sofa, tecnologico: MonitorPlay,
};

// Recurso normalizado para render uniforme entre ítems / espacios / edificios.
interface Res {
  key: string;
  id: string;
  nombre: string;
  sub: string;
  estado?: string;
  group?: string;          // para tabs: categoria (item) o 'aula'/'lab' (espacio)
  edificio?: string;       // para filtro
  kind: RecursoKind;
  danado: boolean;
  Icon: React.ElementType;
  invRef?: any;            // ítem de inventario original (para mantenimiento)
}

const KINDS: { key: RecursoKind; label: string; Icon: React.ElementType }[] = [
  { key: 'item', label: 'Recursos', Icon: Package },
  { key: 'espacio', label: 'Espacios', Icon: DoorOpen },
  { key: 'edificio', label: 'Edificios', Icon: Building2 },
];

export const Asignaciones = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const invItems = useInventarioStore(state => state.items);
  const fetchInventario = useInventarioStore(state => state.fetchItems);
  const espacios = useEspaciosStore(state => state.items);
  const fetchEspacios = useEspaciosStore(state => state.fetchEspacios);
  const asignaciones = useAsignacionesStore(state => state.asignaciones);
  const { fetchAsignaciones } = useAsignacionesStore();
  const assign = useAsignacionesStore(state => state.assign);
  const assignMany = useAsignacionesStore(state => state.assignMany);
  const unassign = useAsignacionesStore(state => state.unassign);
  const addOrden = useMantenimientoStore(state => state.addOrden);
  
  const { items: rawUsers, fetchUsuarios } = useUsuariosStore();
  const { items: edificios, fetchEdificios } = useEdificiosStore();

  // Técnicos (usuarios)
  const tecnicos = useMemo(() => {
    return rawUsers
      .filter(u => {
        const rolName = u.roles?.nombre || u.rol || '';
        return rolName.toLowerCase().includes('tecnico') || rolName.toLowerCase().includes('técnico');
      })
      .map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        departamento: u.departamento || 'General',
        avatar: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre)}&background=475569&color=fff`,
      }));
  }, [rawUsers]);

  // Si entra un técnico, queda bloqueado a su propio perfil (no ve a otros)
  const authUser = useAuthStore(s => s.user);
  const locked = authUser?.role === 'tecnico';
  const lockedId = authUser?.tecnicoId;
  const [selectedTecnico, setSelectedTecnico] = useState<string | null>(locked && lockedId ? lockedId : null);

  // Inicializar selectedTecnico cuando cargan
  useEffect(() => {
    if (!selectedTecnico && tecnicos.length > 0 && !locked) {
      setSelectedTecnico(tecnicos[0].id);
    }
  }, [tecnicos, selectedTecnico, locked]);

  useEffect(() => {
    fetchUsuarios();
    fetchAsignaciones();
    fetchEdificios();
    fetchEspacios();
    fetchInventario();
  }, []);

  const [searchTecnico, setSearchTecnico] = useState('');
  const [resourceKind, setResourceKind] = useState<RecursoKind>('item');
  const [activeCat, setActiveCat] = useState('todos');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterEdificio, setFilterEdificio] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // guarda res.key
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const isDanado = (estado?: string) => estado === 'malo' || estado === 'dañado';

  // Pool completo normalizado según el tipo de recurso activo
  const allResources = useMemo<Res[]>(() => {
    if (resourceKind === 'item') {
      return invItems.map(i => {
        const space = espacios.find(e => e.id === i.id_espacio);
        const edificioNombre = space ? (edificios.find(ed => ed.id === space.id_edificio)?.nombre ?? 'Sin edificio') : 'Sin edificio';
        const aulaStr = space ? space.nombre : '';
        return {
          key: resKey('item', i.id), id: i.id, nombre: i.nombre,
          sub: `${i.serie} · ${edificioNombre}${aulaStr ? ` · ${aulaStr}` : ''}`,
          estado: i.estado, group: i.categoria, edificio: edificioNombre,
          kind: 'item' as RecursoKind, danado: isDanado(i.estado),
          Icon: CAT_ICON[i.categoria as CategoriaInventario] ?? Package, invRef: i,
        };
      });
    }
    if (resourceKind === 'espacio') {
      return espacios.map(e => {
        const edificioNombre = edificios.find(ed => ed.id === e.id_edificio)?.nombre ?? 'Sin edificio';
        return {
          key: resKey('espacio', e.id), id: e.id, nombre: e.nombre,
          sub: `${edificioNombre} · Piso ${e.piso}`,
          estado: e.estado, group: e.tipo === 'Académica' ? 'aula' : 'lab', edificio: edificioNombre,
          kind: 'espacio' as RecursoKind, danado: false,
          Icon: e.tipo === 'Académica' ? DoorOpen : Microscope,
        };
      });
    }
    return edificios.map(e => ({
      key: resKey('edificio', e.id), id: e.id, nombre: e.nombre,
      sub: 'Edificio del campus', edificio: e.nombre,
      kind: 'edificio' as RecursoKind, danado: false, Icon: Building2,
    }));
  }, [resourceKind, invItems, espacios, edificios]);

  const matchesCat = (r: Res) => {
    if (activeCat === 'todos') return true;
    if (resourceKind === 'item' && activeCat === 'mantenimiento') return r.danado;
    return r.group === activeCat;
  };

  const assignedRes = useMemo(
    () => allResources.filter(r => asignaciones[r.key] === selectedTecnico && matchesCat(r)),
    [allResources, asignaciones, selectedTecnico, activeCat, resourceKind]
  );

  const availableRes = useMemo(() => allResources.filter(r => {
    if (asignaciones[r.key]) return false;
    if (!matchesCat(r)) return false;
    if (filterEstado && r.estado !== filterEstado) return false;
    if (filterEdificio && r.edificio !== filterEdificio) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.nombre.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q);
    }
    return true;
  }), [allResources, asignaciones, activeCat, search, filterEstado, filterEdificio, resourceKind]);

  // Unidades disponibles por nombre de artículo (para el badge ×N)
  const unidadesDisponibles = useMemo(() => {
    const map: Record<string, number> = {};
    availableRes.forEach(r => {
      const k = r.nombre.trim().toLowerCase();
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [availableRes]);

  // Tabs según el tipo de recurso
  const tabItems = useMemo(() => {
    const unassigned = allResources.filter(r => !asignaciones[r.key]);
    const count = (pred: (r: Res) => boolean) => unassigned.filter(pred).length;
    if (resourceKind === 'item') {
      return [
        { key: 'todos', label: 'Todos', count: unassigned.length },
        ...CATEGORIAS.map(c => ({ key: c.key, label: c.label, count: count(r => r.group === c.key) })),
        { key: 'mantenimiento', label: 'Mantenimiento', count: count(r => r.danado) },
      ];
    }
    if (resourceKind === 'espacio') {
      return [
        { key: 'todos', label: 'Todos', count: unassigned.length },
        { key: 'aula', label: 'Aulas', count: count(r => r.group === 'aula') },
        { key: 'lab', label: 'Laboratorios', count: count(r => r.group === 'lab') },
      ];
    }
    return [{ key: 'todos', label: 'Todos', count: unassigned.length }];
  }, [allResources, asignaciones, resourceKind]);

  const kpis = useMemo(() => ({
    tecnicos: tecnicos.length,
    asignados: Object.keys(asignaciones).length,
    disponibles: allResources.filter(r => !asignaciones[r.key]).length,
    mantenimiento: invItems.filter(i => isDanado(i.estado)).length,
  }), [allResources, asignaciones, invItems]);

  const tecnico = tecnicos.find(t => t.id === selectedTecnico);
  const totalAsignados = Object.values(asignaciones).filter(t => t === selectedTecnico).length;

  // Helper to provide a fallback space ID required by the db schema
  const getIdEspacio = (r?: Res) => r?.kind === 'espacio' ? r.id : (espacios.length > 0 ? espacios[0].id : null);

  const attemptFixDB = async () => {
    if (edificios.length === 0) {
      Swal.fire('Error', 'Debe existir al menos un edificio para reparar la base de datos.', 'error');
      return false;
    }
    
    Swal.fire({ title: 'Reparando base de datos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const { error } = await supabase.from('espacios').upsert([{
      id: '00000000-0000-0000-0000-000000000000',
      nombre: 'Espacio Sistema (No Borrar)',
      id_edificio: edificios[0].id,
      piso: 1,
      capacidad: 1,
      m2: 1,
      estado: 'disponible'
    }]);
    
    if (error) {
      Swal.fire('Error', 'No se pudo reparar la base de datos automáticamente: ' + error.message, 'error');
      return false;
    }
    
    await fetchEspacios();
    Swal.close();
    return true;
  };

  const safeAssign = async (key: string, tecnicoId: string, r?: Res) => {
    const sp = getIdEspacio(r);
    if (!sp) {
      const fixed = await attemptFixDB();
      if (fixed) {
        // Retry with newly fetched espacios
        const newSp = useEspaciosStore.getState().items[0]?.id || '00000000-0000-0000-0000-000000000000';
        assign(key, tecnicoId, newSp);
      }
      return;
    }
    assign(key, tecnicoId, sp);
  };

  // Selección en lote (excluye dañados)
  const selectableAvail = availableRes.filter(r => !r.danado);
  const toggleSelect = (key: string) =>
    setSelectedIds(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  const handleAssignSelected = async () => {
    if (selectedIds.length === 0 || !selectedTecnico) return;
    
    if (espacios.length === 0) {
      const fixed = await attemptFixDB();
      if (!fixed) return;
    }
    
    const currentEspacios = useEspaciosStore.getState().items;
    const fallbackId = currentEspacios[0]?.id || '00000000-0000-0000-0000-000000000000';

    const payload = selectedIds.map(key => {
      const r = allResources.find(x => x.key === key);
      return { key, idEspacio: r?.kind === 'espacio' ? r.id : fallbackId };
    });
    assignMany(payload, selectedTecnico);
    setSelectedIds([]);
  };

  const changeKind = (k: RecursoKind) => {
    setResourceKind(k);
    setActiveCat('todos');
    setSelectedIds([]);
    setSearch('');
    setFilterEstado('');
    setFilterEdificio('');
  };

  const handleMantenimiento = (r: Res) => {
    const item = r.invRef;
    if (!item) return;
    addOrden({
      id_inventario: item.id, recurso_nombre: item.nombre, categoria: item.categoria,
      ubicacion: `${item.edificio}${item.aula ? ` · ${item.aula}` : ''}`,
      descripcion: item.danioDesc || 'Reportado desde Asignaciones',
      prioridad: 'media', estado: 'pendiente', id_tecnico: selectedTecnico,
      fecha_reporte: new Date().toISOString().slice(0, 10), fecha_cierre: null,
    });
    Swal.fire({ icon: 'success', title: 'Orden creada', text: `Mantenimiento generado para ${item.nombre}.`, timer: 2000, showConfirmButton: false });
  };

  // Todos los recursos asignados al técnico (los 3 tipos) — para PDF/historial
  const assignedFull = useMemo<RecursoActa[]>(() => {
    const out: RecursoActa[] = [];
    invItems.forEach(i => {
      if (asignaciones[resKey('item', i.id)] === selectedTecnico) {
        const esp = espacios.find(e => e.id === i.id_espacio);
        const edi = edificios.find(ed => ed.id === esp?.id_edificio);
        out.push({ tipo: 'Recurso', nombre: i.nombre, ubicacion: `${edi?.nombre ?? 'Sin edificio'}${esp?.nombre ? ` · ${esp.nombre}` : ''}`, estado: i.estado });
      }
    });
    espacios.forEach(e => {
      if (asignaciones[resKey('espacio', e.id)] === selectedTecnico) {
        const edi = edificios.find(ed => ed.id === e.id_edificio);
        out.push({ tipo: 'Espacio', nombre: e.nombre, ubicacion: `${edi?.nombre ?? 'Sin edificio'} · Piso ${e.piso}`, estado: e.estado });
      }
    });
    edificios.forEach(e => { if (asignaciones[resKey('edificio', e.id)] === selectedTecnico) out.push({ tipo: 'Edificio', nombre: e.nombre, ubicacion: 'Campus ESPOCH', estado: '—' }); });
    return out;
  }, [invItems, espacios, edificios, asignaciones, selectedTecnico]);

  const tecnicoActa = tecnico ? { nombre: tecnico.nombre, email: tecnico.email, departamento: tecnico.departamento } : null;
  const sinRecursos = () => Swal.fire({ icon: 'info', title: 'Sin recursos', text: 'Este técnico no tiene recursos asignados.' });

  const handleActa = () => { if (!tecnicoActa) return; if (assignedFull.length === 0) return sinRecursos(); generarActaAsignacion(tecnicoActa, assignedFull); };
  const handleExportPdf = () => { if (!tecnicoActa) return; if (assignedFull.length === 0) return sinRecursos(); exportarAsignacionesPdf(tecnicoActa, assignedFull); };
  const handleQr = () => Swal.fire({ icon: 'info', title: 'Escaneo QR', text: 'Requiere módulo de cámara. Próximamente.' });
  const handleHistorial = () => {
    if (!tecnico) return;
    const rows = assignedFull.length
      ? assignedFull.map(r => `<tr><td style="padding:4px 8px;text-align:left;font-size:12px">${r.tipo}</td><td style="padding:4px 8px;text-align:left;font-size:12px;font-weight:600">${r.nombre}</td><td style="padding:4px 8px;text-align:left;font-size:11px;color:#6b7280">${r.ubicacion}</td></tr>`).join('')
      : '<tr><td colspan="3" style="padding:8px;color:#9ca3af">Sin asignaciones.</td></tr>';
    Swal.fire({
      title: `Asignaciones · ${tecnico.nombre}`,
      html: `<table style="width:100%;border-collapse:collapse">${rows}</table>`,
      width: 560,
      confirmButtonColor: '#0f172a',
    });
  };

  const getEstadoBadge = (estado?: string) => {
    if (!estado) return null;
    const map: Record<string, string> = {
      bueno: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
      disponible: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
      ocupada: 'bg-blue-50 text-blue-600 border-blue-200/50',
      malo: 'bg-red-50 text-red-600 border-red-200/50',
      dañado: 'bg-red-50 text-red-600 border-red-200/50',
      mantenimiento: 'bg-orange-50 text-orange-600 border-orange-200/50',
    };
    const labels: Record<string, string> = {
      bueno: 'Bueno', disponible: 'Disponible', ocupada: 'Ocupada',
      malo: 'Malo', dañado: 'Dañado', mantenimiento: 'Mantenim.',
    };
    return (
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${map[estado] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
        {labels[estado] ?? estado}
      </span>
    );
  };

  const showFilters = resourceKind !== 'edificio';
  const estadoOptions = resourceKind === 'espacio'
    ? [{ key: 'todos', label: 'Todos' }, { key: 'disponible', label: 'Disponible' }, { key: 'ocupada', label: 'Ocupada' }, { key: 'mantenimiento', label: 'Mantenimiento' }]
    : [{ key: 'todos', label: 'Todos' }, { key: 'bueno', label: 'Bueno' }, { key: 'malo', label: 'Malo' }, { key: 'dañado', label: 'Dañado' }];
  const kindLabel = KINDS.find(k => k.key === resourceKind)?.label;
  const headingLabel = activeCat === 'todos' ? kindLabel : tabItems.find(t => t.key === activeCat)?.label;

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-screen'} bg-[#f4f7fb]`}>
      {/* HERO SECTION */}
      {!embedded && (
      <div className="w-full min-h-[120px] bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-5 border-b border-gray-800">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>

        <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
              <UserCog className="w-7 h-7" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[28px] md:text-[34px] font-bold text-white tracking-tight leading-none mb-1.5">Asignaciones</h2>
              <p className="text-[13px] text-gray-400 font-medium">Asigna recursos, espacios y edificios a técnicos responsables.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{kpis.tecnicos}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Técnicos</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{kpis.asignados}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Asignados</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{kpis.disponibles}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Disponibles</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{kpis.mantenimiento}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Mantenim.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="flex-1 flex p-6 md:p-8 min-h-0 bg-[#f4f7fb]/90 gap-6 overflow-hidden">
        {/* ── LEFT: Lista técnicos (oculta para rol técnico) ── */}
        {!locked && (
        <div className="w-[260px] shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
              <User className="w-3.5 h-3.5" /> Técnicos Responsables
            </p>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={searchTecnico}
                onChange={e => setSearchTecnico(e.target.value)}
                placeholder="Buscar técnico..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-[12px] font-medium text-gray-700 outline-none focus:bg-white focus:border-gray-300 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
            {tecnicos.filter(t => t.nombre.toLowerCase().includes(searchTecnico.toLowerCase())).map(t => {
              const count = Object.values(asignaciones).filter(v => v === t.id).length;
              const isSelected = t.id === selectedTecnico;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTecnico(t.id); setSelectedIds([]); }}
                  className={`relative w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left overflow-hidden ${
                    isSelected ? 'bg-indigo-50/60 border border-indigo-200 shadow-sm' : 'bg-white hover:bg-gray-50 border border-transparent hover:border-gray-100'
                  }`}
                >
                  {isSelected && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500" />}
                  <img src={t.avatar} className={`w-10 h-10 rounded-full object-cover shrink-0 border-2 ${isSelected ? 'border-indigo-200' : 'border-gray-200'}`} alt={t.nombre} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-bold truncate leading-tight ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>{t.nombre}</p>
                    <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-indigo-400' : 'text-gray-500'}`}>{t.departamento}</p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                    isSelected ? 'bg-white text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count} <span className="font-normal text-[9px] opacity-70">asig.</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* ── RIGHT: Panel asignaciones ── */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Técnico seleccionado + acciones */}
          {tecnico && (
            <div className="px-6 py-4 border-b border-gray-100 shrink-0 flex items-center gap-4 bg-white flex-wrap">
              <div className="w-14 h-14 rounded-full border border-gray-200 shrink-0 overflow-hidden shadow-sm p-0.5">
                <img src={tecnico.avatar} className="w-full h-full rounded-full object-cover" alt={tecnico.nombre} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <p className="text-xl font-bold text-gray-900 leading-tight">{tecnico.nombre}</p>
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                    <Layers className="w-3.5 h-3.5 text-gray-400" /> {totalAsignados} recursos asignados
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-500 font-medium flex-wrap">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> {tecnico.email}</span>
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-gray-400" /> {tecnico.departamento}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleActa} className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"><FileText className="w-3.5 h-3.5" /> Generar acta</button>
                <button onClick={handleExportPdf} className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"><FileDown className="w-3.5 h-3.5" /> Exportar PDF</button>
                <button onClick={handleQr} className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"><QrCode className="w-3.5 h-3.5" /> Escanear QR</button>
                <button onClick={handleHistorial} className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"><History className="w-3.5 h-3.5" /> Historial</button>
              </div>
            </div>
          )}

          {/* Split — Asignados / Disponibles */}
          <div className="flex-1 flex min-h-0">

            {/* Asignados */}
            <div className="w-[460px] shrink-0 flex flex-col min-h-0 border-r border-gray-100">
              {/* Header columna: selector tipo + etiqueta */}
              <div className="px-6 py-3 border-b border-gray-100 shrink-0 flex flex-col gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mr-1">Asignar:</span>
                  {KINDS.map(k => {
                    const isActive = resourceKind === k.key;
                    return (
                      <button
                        key={k.key}
                        onClick={() => changeKind(k.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all ${
                          isActive ? 'bg-[#0f172a] text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <k.Icon className="w-3.5 h-3.5" /> {k.label}
                      </button>
                    );
                  })}
                </div>
                <h3 className="text-[13px] font-extrabold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-400" />
                  {headingLabel} Asignados
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] border border-gray-200">{assignedRes.length}</span>
                </h3>
              </div>
              <div
                className={`flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-3 relative transition-all duration-300 ${isDraggingOver ? 'bg-yellow-50/30 ring-2 ring-inset ring-yellow-200/50' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragEnter={e => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={e => { e.preventDefault(); setIsDraggingOver(false); }}
                onDrop={e => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  const key = e.dataTransfer.getData('text/plain');
                  const r = allResources.find(x => x.key === key);
                  if (key && !asignaciones[key] && r && !r.danado && selectedTecnico) {
                    safeAssign(key, selectedTecnico, r);
                  }
                }}
              >
                {assignedRes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-3 shadow-sm">
                      <LayoutGrid className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="text-[12px] font-bold text-gray-700">Arrastra recursos aquí</p>
                    <p className="text-[10px] text-gray-400 mt-1">o usa el botón Asignar</p>
                  </div>
                ) : (
                  assignedRes.map(r => (
                    <div key={r.key} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl group transition-all hover:shadow-md hover:border-gray-200">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.danado ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        <r.Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 truncate mb-0.5">{r.nombre}</p>
                        <p className="text-[11px] text-gray-400 truncate">{r.sub}</p>
                      </div>
                      {getEstadoBadge(r.estado)}
                      <button
                        onClick={() => unassign(r.key)}
                        className="ml-2 px-3 py-1.5 flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shrink-0 text-[11px] font-bold opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" /> Quitar
                      </button>
                    </div>
                  ))
                )}
                {/* Zona de drop persistente cuando ya hay asignados */}
                {assignedRes.length > 0 && (
                  <div className={`mt-1 flex flex-col items-center justify-center py-6 text-center border-2 border-dashed rounded-2xl transition-all ${isDraggingOver ? 'border-espoch-yellow bg-yellow-50' : 'border-gray-200 bg-gray-50/40'}`}>
                    <LayoutGrid className={`w-6 h-6 mb-1.5 ${isDraggingOver ? 'text-espoch-yellow' : 'text-gray-300'}`} />
                    <p className="text-[11px] font-bold text-gray-500">Arrastra más recursos aquí</p>
                  </div>
                )}
              </div>
            </div>

            {/* Disponibles */}
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              <div className="px-5 py-3 border-b border-gray-100 shrink-0 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
                    <Plus className="w-3 h-3" /> Disponibles <span className="ml-1 text-gray-600">({availableRes.length})</span>
                  </p>
                  {selectableAvail.length > 0 && (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-[11px] font-bold text-gray-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectableAvail.every(r => selectedIds.includes(r.key))}
                          onChange={e => setSelectedIds(e.target.checked ? selectableAvail.map(r => r.key) : [])}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer"
                        />
                        {selectedIds.length} seleccionados
                      </label>
                      {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-fade-in">
                          <button onClick={() => setSelectedIds([])} className="text-[11px] font-bold text-gray-500 hover:text-gray-700 px-2 py-1">Cancelar</button>
                          <button onClick={handleAssignSelected} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0f172a] hover:bg-black text-white text-[11px] font-bold shadow-sm border border-gray-800 transition-colors">
                            <User className="w-3.5 h-3.5" /> Asignar seleccionados
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {tabItems.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {tabItems.map(tab => {
                      const isActive = activeCat === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => { setActiveCat(tab.key); setSelectedIds([]); }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                            isActive ? 'bg-[#0f172a] text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar por nombre o ubicación..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-medium text-gray-700 outline-none focus:bg-white focus:border-gray-300 transition-all placeholder:text-gray-400"
                    />
                  </div>
                  {showFilters && (
                    <>
                      <FilterDropdown label="Estado" value={filterEstado || 'todos'} options={estadoOptions} onChange={k => setFilterEstado(k === 'todos' ? '' : k)} />
                      <FilterDropdown label="Edificio" value={filterEdificio || 'todos'} options={[{ key: 'todos', label: 'Todos' }, ...edificios.map(e => ({ key: e.nombre, label: e.nombre }))]} onChange={k => setFilterEdificio(k === 'todos' ? '' : k)} />
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-3">
                {availableRes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <CheckCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-[12px] font-bold text-gray-700">Sin recursos disponibles</p>
                  </div>
                ) : availableRes.map(r => {
                  const checked = selectedIds.includes(r.key);
                  return (
                    <div
                      key={r.key}
                      draggable={!r.danado}
                      onDragStart={e => { e.dataTransfer.setData('text/plain', r.key); e.dataTransfer.effectAllowed = 'copyMove'; }}
                      className={`flex items-center gap-3 p-4 bg-white border rounded-2xl hover:shadow-md group select-none transition-all ${checked ? 'border-[#0f172a]/30 bg-[#0f172a]/[0.03]' : 'border-gray-100 hover:border-gray-200'} ${r.danado ? '' : 'cursor-grab active:cursor-grabbing'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={r.danado}
                        onChange={() => toggleSelect(r.key)}
                        className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.danado ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        <r.Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 truncate mb-0.5 flex items-center gap-1.5">
                          {r.nombre}
                          {(unidadesDisponibles[r.nombre.trim().toLowerCase()] || 0) > 1 && (
                            <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full shrink-0" title={`${unidadesDisponibles[r.nombre.trim().toLowerCase()]} unidades disponibles de este artículo`}>
                              ×{unidadesDisponibles[r.nombre.trim().toLowerCase()]}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">{r.sub}</p>
                      </div>
                      {getEstadoBadge(r.estado)}
                      {r.danado ? (
                        <button
                          onClick={() => handleMantenimiento(r)}
                          className="ml-1 px-3 py-1.5 flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors shrink-0 text-[11px] font-bold"
                        >
                          <Wrench className="w-3 h-3" /> Mantenimiento
                        </button>
                      ) : (
                        <button
                          onClick={() => selectedTecnico && safeAssign(r.key, selectedTecnico, r)}
                          className="ml-1 px-3 py-1.5 flex items-center gap-1.5 rounded-lg border border-gray-800 text-[#0f172a] hover:bg-[#0f172a] hover:text-white transition-colors shrink-0 text-[11px] font-bold"
                        >
                          <Plus className="w-3 h-3" /> Asignar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Asignaciones;
