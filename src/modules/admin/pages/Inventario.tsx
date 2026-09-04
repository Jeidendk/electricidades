import { useState, useMemo, useEffect } from 'react';
import {
  MonitorSpeaker, Package, CheckCircle, AlertTriangle, XOctagon,
  Upload, Download, Plus, ArrowUpDown, Edit2, Trash2,
  Camera, Wrench, Monitor, Sofa, Settings, MonitorPlay,
  Image as ImageIcon, X, UploadCloud, RotateCcw
} from 'lucide-react';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { uploadImage } from '../../../lib/upload';
import { CATEGORIAS, type CategoriaInventario, type InventarioItem } from '../data/inventarioData';
import { PageHero } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/ui/Pagination';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Badge } from '../../../components/ui/Badge';
import { FilterDropdown } from '../../../components/ui/FilterDropdown';
import { AcentoTarjeta } from '../../../components/ui/AcentoTarjeta';

type TabKey = CategoriaInventario | 'todos';

const CAT_ICON: Record<CategoriaInventario, React.ElementType> = {
  equipos: Settings, herramientas: Wrench, mobiliario: Sofa, tecnologico: MonitorPlay,
};

export const Inventario = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const items = useInventarioStore(state => state.items);
  const addItem = useInventarioStore(state => state.addItem);
  const updateItem = useInventarioStore(state => state.updateItem);
  const removeItem = useInventarioStore(state => state.removeItem);
  const espacios = useEspaciosStore(state => state.items);
  const fetchEspacios = useEspaciosStore(state => state.fetchEspacios);
  const edificios = useEdificiosStore(state => state.items);
  const fetchEdificios = useEdificiosStore(state => state.fetchEdificios);
  const fetchItems = useInventarioStore(state => state.fetchItems);

  // Cargar datos de la base al montar
  useEffect(() => {
    fetchItems();
    fetchEspacios();
    fetchEdificios();
  }, []);

  const [activeCat, setActiveCat] = useState<TabKey>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortCol, setSortCol] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterEdificio, setFilterEdificio] = useState('');
  const [modalType, setModalType] = useState<null | 'create' | 'edit' | 'import' | 'view_fotos' | 'delete' | 'bulkDelete' | 'filters'>(null);
  const [selectedEq, setSelectedEq] = useState<any>(null);
  const [selectedEqForDetail, setSelectedEqForDetail] = useState<any>(null);

  const defaultFormValues = {
    nombre: '', serie: '', categoria: 'equipos' as CategoriaInventario,
    aula: '', edificio: '', estado: 'bueno', danioDesc: '', foto: '', fotoFile: null as File | null,
    cantidad: 1, serieMode: 'general' as 'general' | 'individual', serieStart: 1
  };
  const [formValues, setFormValues] = useState(defaultFormValues);

  // Mapea una fila enriquecida del inventario a los valores del formulario de edición.
  const itemToForm = (d: any): typeof defaultFormValues => ({
    nombre: d.nombre ?? '',
    serie: d.serie ?? '',
    categoria: (d.categoria ?? 'equipos') as CategoriaInventario,
    aula: d.id_espacio ?? '',
    edificio: d.edificio ?? '',
    estado: d.estado ?? 'bueno',
    danioDesc: d.danio_desc ?? '',
    foto: d.fotos?.[0] ?? '',
    fotoFile: null,
    cantidad: 1,
    serieMode: 'general',
    serieStart: 1,
  });

  const mappedItems = useMemo(() => {
    return items.map(d => {
      const espacio = espacios.find(e => e.id === d.id_espacio);
      const edificio = edificios.find(ed => ed.id === espacio?.id_edificio);
      return {
        ...d,
        fotos: (d as any).fotos_json || [],
        edificio: edificio?.nombre || espacio?.id_edificio || 'Sin edificio',
        aula: espacio?.nombre || 'Sin aula',
      };
    });
  }, [items, espacios, edificios]);

  // Unidades por nombre: los ítems se guardan 1 fila = 1 unidad física; este conteo
  // muestra "×N" cuando existen varias unidades del mismo artículo.
  const unidadesPorNombre = useMemo(() => {
    const map: Record<string, number> = {};
    mappedItems.forEach(d => {
      const k = d.nombre.trim().toLowerCase();
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [mappedItems]);

  const kpis = useMemo(() => ({
    total: mappedItems.length,
    buenos: mappedItems.filter(d => d.estado === 'bueno').length,
    regularesMalos: mappedItems.filter(d => d.estado === 'malo').length,
    danados: mappedItems.filter(d => d.estado === 'dañado').length,
  }), [mappedItems]);

  const tabItems = useMemo(() => [
    { key: 'todos' as TabKey, label: 'Todos', count: mappedItems.length, Icon: Package },
    ...CATEGORIAS.map(c => ({
      key: c.key as TabKey,
      label: c.label,
      count: mappedItems.filter(d => d.categoria === c.key).length,
      Icon: CAT_ICON[c.key as CategoriaInventario],
    })),
  ], [mappedItems]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const filteredData = useMemo(() => {
    let result = activeCat === 'todos' ? [...mappedItems] : mappedItems.filter(d => d.categoria === activeCat);
    if (filterEstado) result = result.filter(d => d.estado === filterEstado);
    if (filterEdificio) result = result.filter(d => d.edificio === filterEdificio);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.nombre.toLowerCase().includes(q) ||
        d.serie.toLowerCase().includes(q) ||
        d.aula.toLowerCase().includes(q)
      );
    }
    if (sortCol) {
      result = [...result].sort((a: any, b: any) => {
        const va = a[sortCol] || '';
        const vb = b[sortCol] || '';
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return result;
  }, [mappedItems, activeCat, searchQuery, sortCol, sortAsc, filterEstado, filterEdificio]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage));
  const start = (currentPage - 1) * perPage;
  const pageData = filteredData.slice(start, start + perPage);

  const toggleSelectAll = () => {
    if (selectedIds.length === pageData.length && pageData.length > 0) setSelectedIds([]);
    else setSelectedIds(pageData.map(d => d.id));
  };

  const categoriaBadge = (cat: string) => {
    if (cat === 'herramientas') return <Badge color="amber" icon={Wrench}>Herramienta</Badge>;
    if (cat === 'equipos') return <Badge color="blue" icon={Settings}>Equipo</Badge>;
    if (cat === 'tecnologico') return <Badge color="purple" icon={Monitor}>Tecnología</Badge>;
    return <Badge color="indigo" icon={Sofa}>Mobiliario</Badge>;
  };

  const estadoBadge = (est: string) => {
    if (est === 'bueno') return <Badge color="green" dot>Bueno</Badge>;
    if (est === 'malo') return <Badge color="amber" dot>Malo/Regular</Badge>;
    return <Badge color="red" dot pulse>Dañado</Badge>;
  };

  const handleExport = () => {
    if (filteredData.length === 0) { alert('No hay datos para exportar.'); return; }
    const toExport = selectedIds.length > 0 ? filteredData.filter(d => selectedIds.includes(d.id)) : filteredData;
    let csv = 'ID,Nombre,Serie,Categoria,Aula,Edificio,Estado\n';
    toExport.forEach(e => { csv += `${e.id},${e.nombre},${e.serie},${e.categoria},${e.aula},${e.edificio},${e.estado}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventario.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openCreate = () => {
    setFormValues({ ...defaultFormValues, categoria: activeCat === 'todos' ? 'equipos' : activeCat });
    setModalType('create');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let finalFotoUrl = formValues.foto;

    if (formValues.fotoFile) {
      const uploadedUrl = await uploadImage(formValues.fotoFile, 'inventario');
      if (uploadedUrl) {
        finalFotoUrl = uploadedUrl;
      }
    }

    const fotos = finalFotoUrl && !finalFotoUrl.startsWith('blob:') ? [finalFotoUrl] : (modalType === 'edit' ? (selectedEq?.fotos || []) : []);
    const base = {
      nombre: formValues.nombre,
      serie: formValues.serie.toUpperCase(),
      categoria: formValues.categoria,
      id_espacio: formValues.aula,
      estado: formValues.estado as InventarioItem['estado'],
      danio_desc: formValues.estado === 'bueno' ? '' : formValues.danioDesc,
      fotos_json: fotos,
    };
    if (modalType === 'edit' && selectedEq) {
      await updateItem(selectedEq.id, base);
      setModalType(null);
      setIsSubmitting(false);
      return;
    }

    if (modalType === 'create') {
      const qty = Math.max(1, formValues.cantidad || 1);
      const newId = (i: number) => `INV${Date.now()}${i}${Math.floor(Math.random() * 1000)}`;
      const series: string[] = [];
      if (qty === 1) {
        series.push(base.serie);
      } else if (formValues.serieMode === 'individual') {
        const start = formValues.serieStart || 1;
        const baseSerie = formValues.serie.toUpperCase().replace(/-+$/, '');
        for (let i = 0; i < qty; i++) series.push(`${baseSerie}-${String(start + i).padStart(3, '0')}`);
      } else {
        for (let i = 0; i < qty; i++) series.push(base.serie);
      }

      // Insertar una a una contando fallos: antes los errores (p. ej. serie duplicada)
      // se tragaban en el store y el admin creía haber creado N ítems.
      let ok = 0;
      let lastErr = '';
      for (let i = 0; i < series.length; i++) {
        try {
          await addItem({ ...base, id: newId(i), serie: series[i] });
          ok++;
        } catch (err: any) {
          lastErr = err?.message || 'Error desconocido';
        }
      }

      setIsSubmitting(false);
      if (ok === series.length) {
        setModalType(null);
        return;
      }
      const Swal = (await import('sweetalert2')).default;
      const esDuplicado = /duplicate|unique|23505/i.test(lastErr);
      Swal.fire({
        icon: ok > 0 ? 'warning' : 'error',
        title: ok > 0 ? `Se crearon ${ok} de ${series.length} ítems` : 'No se pudo crear el ítem',
        html: esDuplicado
          ? 'La base de datos exige que el <b>N° de serie sea único</b>.<br/>Usa el modo <b>"Serie individual"</b> para generar códigos autonuméricos (COD-001, COD-002…).'
          : `Error: ${lastErr}`,
        confirmButtonColor: '#b00000',
      });
      if (ok > 0) setModalType(null);
      return;
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (selectedEq) {
      await removeItem(selectedEq.id);
      if (selectedEqForDetail?.id === selectedEq.id) setSelectedEqForDetail(null);
      setModalType(null);
      setSelectedEq(null);
    }
  };

  const handleBulkDelete = async () => {
    await Promise.all(selectedIds.map(id => removeItem(id)));
    if (selectedEqForDetail && selectedIds.includes(selectedEqForDetail.id)) setSelectedEqForDetail(null);
    setSelectedIds([]);
    setModalType(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      {!embedded && (
        <PageHero
          icon={MonitorSpeaker}
          title="Inventario"
          subtitle="Equipos, herramientas, mobiliario y tecnología."
          backgroundImage={HERO_BG.inventario}
          stats={[
            { Icon: Package, value: kpis.total, label: 'Total' },
            { Icon: CheckCircle, value: kpis.buenos, label: 'Buen Estado' },
            { Icon: AlertTriangle, value: kpis.regularesMalos, label: 'Regular / Malo' },
            { Icon: XOctagon, value: kpis.danados, label: 'Dañados' },
          ]}
        />
      )}

      <div className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0 relative bg-[#f4f7fb]/90 backdrop-blur-xl h-full animate-fade-in flex flex-col">
        <div className="flex-1 flex flex-row min-h-0 gap-6 relative">

          {/* MAIN CONTAINER */}
          <div className="bg-white/95 backdrop-blur-xl rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative overflow-hidden flex-1 z-10 min-w-0 transition-all duration-300">
            <AcentoTarjeta />

            {/* TOOLBAR */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0 pt-2">
              <div className="flex items-center gap-3 flex-wrap flex-1 w-full xl:w-auto">
                <SearchInput
                  value={searchQuery}
                  onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
                  placeholder="Buscar ítem..."
                  className="w-[200px] sm:w-[240px] shrink-0"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterDropdown
                    label="Categoría"
                    value={activeCat}
                    options={tabItems.map(t => ({ key: t.key, label: `${t.label} (${t.count})` }))}
                    onChange={(k) => { setActiveCat(k as TabKey); setCurrentPage(1); setSelectedIds([]); }}
                  />
                  <FilterDropdown
                    label="Estado"
                    value={filterEstado || 'todos'}
                    options={[
                      { key: 'todos', label: 'Todos' },
                      { key: 'bueno', label: 'Bueno' },
                      { key: 'malo', label: 'Malo' },
                      { key: 'dañado', label: 'Dañado' },
                    ]}
                    onChange={(k) => { setFilterEstado(k === 'todos' ? '' : k); setCurrentPage(1); }}
                  />
                  <FilterDropdown
                    label="Edificio"
                    value={filterEdificio || 'todos'}
                    options={[
                      { key: 'todos', label: 'Todos' },
                      ...edificios.map(e => ({ key: e.id, label: e.nombre }))
                    ]}
                    onChange={(k) => { setFilterEdificio(k === 'todos' ? '' : k); setCurrentPage(1); }}
                  />
                  <button 
                    onClick={() => { setSearchQuery(''); setActiveCat('todos'); setFilterEstado(''); setFilterEdificio(''); setCurrentPage(1); setSelectedIds([]); }}
                    className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium hover:text-gray-700 transition-colors ml-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Limpiar filtros
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => setModalType('import')} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Importar
                </button>
                <button onClick={handleExport} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Exportar{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                </button>
                {selectedIds.length > 0 && (
                  <button onClick={() => setModalType('bulkDelete')} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-200 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedIds.length})
                  </button>
                )}
                <button onClick={openCreate} className="bg-[#0f172a] hover:bg-black text-white font-bold text-xs px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg transition-all border border-gray-800">
                  <Plus className="w-3.5 h-3.5" /> Nuevo Ítem
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="w-full overflow-auto flex-1 flex flex-col min-h-0 relative custom-scrollbar border border-gray-100 rounded-xl">
              <div className="min-w-[900px] grid grid-cols-[40px_1.5fr_1fr_1.2fr_0.8fr_100px] gap-4 px-4 pb-3 border-b border-gray-100 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest sticky top-0 bg-white z-10 shrink-0 pt-3">
                <div className="flex items-center justify-center">
                  <input type="checkbox" checked={pageData.length > 0 && selectedIds.length === pageData.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer" />
                </div>
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('nombre')}>NOMBRE <ArrowUpDown className="w-3 h-3" /></div>
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('categoria')}>CATEGORÍA <ArrowUpDown className="w-3 h-3" /></div>
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('estado')}>ESTADO FÍSICO <ArrowUpDown className="w-3 h-3" /></div>
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('edificio')}>UBICACIÓN <ArrowUpDown className="w-3 h-3" /></div>
                <div className="text-right">ACCIONES</div>
              </div>

              <div className="flex flex-col min-w-[900px]">
                {pageData.map((d, i) => (
                  <div key={d.id} onClick={(e) => {
                      if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                      setSelectedEqForDetail(d);
                    }}
                    className={`grid grid-cols-[40px_1.5fr_1fr_1.2fr_0.8fr_100px] gap-4 px-4 py-3 border-b border-gray-50 transition-colors items-center animate-fade-in cursor-pointer ${selectedIds.includes(d.id) || selectedEqForDetail?.id === d.id ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}
                    style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="flex items-center justify-center">
                      <input type="checkbox" checked={selectedIds.includes(d.id)} onChange={() => {
                        setSelectedIds(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]);
                      }} className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                        {d.nombre}
                        {(unidadesPorNombre[d.nombre.trim().toLowerCase()] || 0) > 1 && (
                          <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full shrink-0" title={`${unidadesPorNombre[d.nombre.trim().toLowerCase()]} unidades de este artículo`}>
                            ×{unidadesPorNombre[d.nombre.trim().toLowerCase()]}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">SN: {d.serie}</span>
                    </div>
                    <div>{categoriaBadge(d.categoria)}</div>
                    <div className="flex flex-col gap-1 w-max">
                      {estadoBadge(d.estado)}
                      {d.estado !== 'bueno' && d.danio_desc && <span className="text-[8px] text-red-400 truncate max-w-[120px]" title={d.danio_desc}>{d.danio_desc}</span>}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-semibold text-gray-700 truncate">{d.aula}</span>
                      <span className="text-[9px] text-gray-400 truncate">{d.edificio}</span>
                    </div>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setSelectedEq(d); setModalType('view_fotos'); }} className="w-7 h-7 flex items-center justify-center rounded-md bg-purple-50 text-purple-500 hover:bg-purple-100 transition-colors" title="Fotos"><Camera className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setSelectedEq(d); setFormValues(itemToForm(d)); setModalType('edit'); }} className="w-7 h-7 flex items-center justify-center rounded-md bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setSelectedEq(d); setModalType('delete'); }} className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                {pageData.length === 0 && (
                  <EmptyState
                    icon={Package}
                    title={items.length === 0 ? 'Sin ítems en el inventario' : 'Sin resultados con estos filtros'}
                    description={items.length === 0 ? 'Registra el primer equipo, herramienta o mobiliario.' : undefined}
                    actionLabel={items.length === 0 ? 'Nuevo Ítem' : undefined}
                    onAction={items.length === 0 ? openCreate : undefined}
                    secondaryLabel={items.length > 0 ? 'Limpiar filtros' : undefined}
                    onSecondary={items.length > 0 ? () => { setSearchQuery(''); setActiveCat('todos'); setFilterEstado(''); setFilterEdificio(''); setCurrentPage(1); } : undefined}
                  />
                )}
              </div>
            </div>

            {/* PAGINATION */}
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
              total={filteredData.length}
              perPage={perPage}
              onPerPageChange={(n) => { setPerPage(n); setCurrentPage(1); setSelectedIds([]); }}
            />
          </div>

          {/* PANEL DETALLE */}
          {(selectedEqForDetail && selectedIds.length <= 1) && (
            <div className="w-1/4 min-w-[300px] bg-white rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative shrink-0 overflow-hidden animate-fade-in z-10">
              <button onClick={() => setSelectedEqForDetail(null)} className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>

              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Detalle del Ítem</p>
              <h2 className="text-sm font-bold text-gray-900 leading-tight mb-1">{selectedEqForDetail.nombre}</h2>
              <div className="flex items-center gap-2 mb-4">
                {categoriaBadge(selectedEqForDetail.categoria)} {estadoBadge(selectedEqForDetail.estado)}
              </div>

              <div className="w-full flex-1 bg-white rounded-xl border border-gray-200 flex flex-col mb-6 relative overflow-hidden shadow-sm p-4 min-h-0 custom-scrollbar overflow-y-auto">
                {selectedEqForDetail.fotos && selectedEqForDetail.fotos.length > 0 ? (
                  <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 border border-gray-200">
                    <img src={selectedEqForDetail.fotos[0]} className="w-full h-full object-cover" alt={selectedEqForDetail.nombre} />
                  </div>
                ) : (
                  <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 border border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="space-y-3 text-[11px]">
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[9px] block mb-0.5">Nº Serie / Código</span>
                    <span className="font-mono text-gray-800 font-medium">{selectedEqForDetail.serie}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[9px] block mb-0.5">Ubicación</span>
                    <span className="text-gray-800 font-medium">{selectedEqForDetail.edificio} - {selectedEqForDetail.aula}</span>
                  </div>
                  {selectedEqForDetail.estado !== 'bueno' && selectedEqForDetail.danio_desc && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <span className="text-red-500 font-bold uppercase text-[9px] mb-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Reporte de Daño</span>
                      <span className="text-red-700 font-medium">{selectedEqForDetail.danio_desc}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-auto shrink-0">
                <button onClick={() => { setSelectedEq(selectedEqForDetail); setFormValues(itemToForm(selectedEqForDetail)); setModalType('edit'); }}
                  className="flex-1 bg-espoch-ink hover:bg-black text-white text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-gray-800">
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => { setSelectedEq(selectedEqForDetail); setModalType('delete'); }}
                  className="flex-1 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 text-red-600 text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS (non-delete) */}
      {modalType && modalType !== 'delete' && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          {(modalType === 'create' || modalType === 'edit') && (
            <div className="bg-white rounded-2xl w-full max-w-[640px] relative animate-scale-in flex flex-col p-8">
              <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"><X className="w-5 h-5"/></button>
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">{modalType === 'create' ? 'Registrar Ítem' : 'Editar Ítem'}</h3>
              <p className="text-xs text-gray-500 mb-6">{modalType === 'create' ? 'Agregue equipos, herramientas, tecnología o mobiliario.' : `Actualice la información de ${selectedEq?.nombre}.`}</p>

              <form onSubmit={handleSaveItem} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Foto del Ítem</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl h-[120px] flex items-center justify-center cursor-pointer hover:border-espoch-yellow/50 transition-colors overflow-hidden relative" onClick={() => document.getElementById('inv-foto-input')?.click()}>
                    {!formValues.foto ? (
                      <div className="flex flex-col items-center text-gray-400"><ImageIcon className="w-7 h-7 mb-2 opacity-50"/><p className="text-[10px] font-bold">Subir foto</p><p className="text-[8px] text-gray-300 mt-0.5">JPG, PNG</p></div>
                    ) : (
                      <img src={formValues.foto} className="w-full h-full object-cover absolute inset-0" alt="preview" />
                    )}
                    <button type="button" title="Tomar foto" onClick={(e) => { e.stopPropagation(); document.getElementById('inv-foto-camera')?.click(); }}
                      className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow flex items-center justify-center text-gray-600 hover:text-espoch-red hover:bg-white transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input type="file" id="inv-foto-input" accept="image/*" className="hidden" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setFormValues({...formValues, foto: URL.createObjectURL(file), fotoFile: file});
                      }
                    }} />
                    <input type="file" id="inv-foto-camera" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setFormValues({...formValues, foto: URL.createObjectURL(file), fotoFile: file});
                      }
                    }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nombre del Ítem</label>
                    <input required value={formValues.nombre} onChange={e => setFormValues({...formValues, nombre: e.target.value})} placeholder="Ej: Módulo PLC..." className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{modalType === 'create' && formValues.cantidad > 1 && formValues.serieMode === 'individual' ? 'Código base' : 'Nº de Serie / Código'}</label>
                    <input required value={formValues.serie} onChange={e => setFormValues({...formValues, serie: e.target.value})} placeholder={modalType === 'create' && formValues.cantidad > 1 && formValues.serieMode === 'individual' ? 'SILL → SILL-001' : 'SN-12345'} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium font-mono uppercase" />
                  </div>
                </div>

                {modalType === 'create' && (
                  <div className="flex flex-col gap-3 bg-gray-50/70 border border-gray-200 rounded-xl p-3.5">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1.5 w-[110px] shrink-0">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cantidad</label>
                        <input type="number" min={1} value={formValues.cantidad} onChange={e => setFormValues({...formValues, cantidad: Math.max(1, parseInt(e.target.value) || 1)})} className="bg-white text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-bold" />
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium leading-snug pt-5">
                        {formValues.cantidad > 1
                          ? `Se crearán ${formValues.cantidad} registros de este ítem.`
                          : 'Un solo registro. Sube la cantidad para carga en lote.'}
                      </p>
                    </div>

                    {formValues.cantidad > 1 && (
                      <div className="flex flex-col gap-2 animate-fade-in">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Modo de código</label>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setFormValues({...formValues, serieMode: 'general'})} className={`flex-1 text-left px-3 py-2 rounded-lg border text-[11px] font-bold transition-all ${formValues.serieMode === 'general' ? 'bg-espoch-ink text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                            Código general
                            <span className={`block text-[9px] font-medium ${formValues.serieMode === 'general' ? 'text-white/70' : 'text-gray-400'}`}>Misma serie para todas</span>
                          </button>
                          <button type="button" onClick={() => setFormValues({...formValues, serieMode: 'individual'})} className={`flex-1 text-left px-3 py-2 rounded-lg border text-[11px] font-bold transition-all ${formValues.serieMode === 'individual' ? 'bg-espoch-ink text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                            Código por unidad
                            <span className={`block text-[9px] font-medium ${formValues.serieMode === 'individual' ? 'text-white/70' : 'text-gray-400'}`}>Serie autoincremental</span>
                          </button>
                        </div>
                        {formValues.serieMode === 'individual' && (
                          <div className="flex items-center gap-3 animate-fade-in">
                            <div className="flex flex-col gap-1.5 w-[120px] shrink-0">
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Inicio numeración</label>
                              <input type="number" min={1} value={formValues.serieStart} onChange={e => setFormValues({...formValues, serieStart: Math.max(1, parseInt(e.target.value) || 1)})} className="bg-white text-sm text-gray-800 rounded-xl py-2 px-3 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-bold" />
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium pt-5 font-mono">
                              {(formValues.serie.toUpperCase().replace(/-+$/, '') || 'COD')}-{String(formValues.serieStart).padStart(3, '0')} … -{String(formValues.serieStart + formValues.cantidad - 1).padStart(3, '0')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Categoría</label>
                    <select value={formValues.categoria} onChange={e => setFormValues({...formValues, categoria: e.target.value as CategoriaInventario})} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer">
                      <option value="equipos">Equipos</option>
                      <option value="herramientas">Herramientas</option>
                      <option value="tecnologico">Tecnológico / Audiovisual</option>
                      <option value="mobiliario">Mobiliario</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Aula / Ubicación</label>
                    <select required value={formValues.aula} onChange={e => setFormValues({...formValues, aula: e.target.value})} disabled={!formValues.edificio} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                      <option value="">{formValues.edificio ? 'Seleccione...' : 'Elija edificio primero'}</option>
                      {espacios.filter(es => es.id_edificio === formValues.edificio).map(es => (
                        <option key={es.id} value={es.id}>{es.nombre}</option>
                      ))}
                      {/* Conserva el valor actual aunque no esté en la lista del edificio (datos legacy) */}
                      {formValues.aula && !espacios.some(es => es.id_edificio === formValues.edificio && es.id === formValues.aula) && (
                        <option value={formValues.aula}>{espacios.find(es => es.id === formValues.aula)?.nombre || formValues.aula}</option>
                      )}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Edificio</label>
                    <select required value={formValues.edificio} onChange={e => setFormValues({...formValues, edificio: e.target.value, aula: ''})} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer">
                      <option value="">Seleccione...</option>
                      {edificios.map(ed => (
                        <option key={ed.id} value={ed.id}>{ed.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado Físico</label>
                  <select value={formValues.estado} onChange={e => setFormValues({...formValues, estado: e.target.value})} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer">
                    <option value="bueno">Bueno</option>
                    <option value="malo">Malo / Regular</option>
                    <option value="dañado">Dañado</option>
                  </select>
                </div>
                {(formValues.estado === 'dañado' || formValues.estado === 'malo') && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Descripción del Daño</label>
                    <textarea required value={formValues.danioDesc} onChange={e => setFormValues({...formValues, danioDesc: e.target.value})} rows={2} placeholder="Describa el problema..." className="bg-red-50/50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-red-200 focus:border-red-400 font-medium resize-none"></textarea>
                  </div>
                )}
                <div className="flex gap-3 mt-4 justify-end">
                  <button type="button" onClick={() => setModalType(null)} disabled={isSubmitting} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="bg-espoch-ink hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all border border-gray-800 disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span> : null}
                    {modalType === 'create' ? (formValues.cantidad > 1 ? `Guardar ${formValues.cantidad} ítems` : 'Guardar Ítem') : 'Actualizar Ítem'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {modalType === 'view_fotos' && selectedEq && (
            <div className="bg-white rounded-2xl w-full max-w-[640px] relative animate-scale-in flex flex-col p-8">
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">Fotos: {selectedEq.nombre}</h3>
              <p className="text-xs text-gray-500 font-mono mb-4">SN: {selectedEq.serie}</p>
              <div className="flex flex-col gap-4">
                {selectedEq.fotos && selectedEq.fotos.length > 0 ? (
                  <div className="w-full rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                    <img src={selectedEq.fotos[0]} className="w-full h-auto object-contain bg-gray-100 max-h-[400px]" alt={selectedEq.nombre} />
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm font-medium border border-dashed rounded-xl border-gray-300">
                    No hay fotos registradas.
                  </div>
                )}
              </div>
              <div className="flex mt-6 justify-end">
                <button onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors bg-gray-50 border border-gray-200">Cerrar</button>
              </div>
            </div>
          )}

          {modalType === 'import' && (
            <div className="bg-white rounded-[20px] p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[500px] relative animate-scale-in text-center">
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">Importar Equipamiento</h3>
              <p className="text-xs text-gray-500 mb-6">Cargue un archivo CSV con los datos del equipamiento.</p>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-espoch-yellow/50 transition-colors cursor-pointer relative" onClick={() => document.getElementById('inv-import-file')?.click()}>
                <UploadCloud className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-600">Haga clic o arrastre un archivo</p>
                <p className="text-[10px] text-gray-400 mt-1">Formatos: CSV (.csv)</p>
                <input type="file" id="inv-import-file" accept=".csv" className="hidden" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    alert(`Archivo ${e.target.files[0].name} cargado correctamente.`);
                    setModalType(null);
                  }
                }} />
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" onClick={() => setModalType(null)} className="px-6 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              </div>
            </div>
          )}

          {modalType === 'filters' && (
            <div className="bg-white rounded-[20px] p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[400px] relative animate-scale-in">
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">Filtros Avanzados</h3>
              <p className="text-xs text-gray-500 mb-6">Filtre el equipamiento por estado o edificio.</p>
              <form onSubmit={(e) => { e.preventDefault(); setModalType(null); setCurrentPage(1); }} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado Físico</label>
                  <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer">
                    <option value="">Todos los estados</option>
                    <option value="bueno">Bueno</option>
                    <option value="malo">Malo / Regular</option>
                    <option value="dañado">Dañado</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Edificio</label>
                  <select value={filterEdificio} onChange={e => setFilterEdificio(e.target.value)} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer">
                    <option value="">Todos los edificios</option>
                    {edificios.map(ed => <option key={ed.id} value={ed.id}>{ed.nombre}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 mt-6 justify-end">
                  <button type="button" onClick={() => { setFilterEstado(''); setFilterEdificio(''); setModalType(null); }} className="px-6 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">Limpiar</button>
                  <button type="submit" className="px-6 py-2.5 rounded-full bg-espoch-ink hover:bg-black text-white text-xs font-bold shadow-lg transition-all border border-gray-800">Aplicar</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={modalType === 'delete'}
        title="Eliminar Ítem"
        message={<>¿Eliminar <b>{selectedEq?.nombre}</b> del inventario? Esta acción no se puede deshacer.</>}
        onConfirm={handleDelete}
        onCancel={() => setModalType(null)}
      />
      <ConfirmDialog
        open={modalType === 'bulkDelete'}
        title="Eliminar ítems"
        message={<>¿Eliminar <b>{selectedIds.length}</b> ítem(s) seleccionado(s) del inventario? Esta acción no se puede deshacer.</>}
        onConfirm={handleBulkDelete}
        onCancel={() => setModalType(null)}
      />
    </div>
  );
};
