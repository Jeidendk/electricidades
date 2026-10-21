import { useState, useMemo, useEffect } from 'react';
import {
  FileText, Layers, Clock, CheckCircle, XCircle,
  Upload, Download, ArrowUpDown, Eye, Trash2, FileX, UploadCloud, X, AlertTriangle,
  Calendar, RotateCcw, Tag, FileDown
} from 'lucide-react';
import { exportarSolicitudes } from '../utils/solicitudesPdfHelper';
import { FilterDropdown } from '../../../components/ui/FilterDropdown';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/ui/Pagination';
import { useTramitesStore, type EventoTramite, type VersionTramite } from '../../../store/tramitesStore';
import { useAuthStore } from '../../../store/authStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { AcentoTarjeta } from '../../../components/ui/AcentoTarjeta';
import { avisoError, avisoExito, avisoInfo, confirmarAccion, pedirTexto } from '../../../lib/aviso';
import { friendlyDbError } from '../../../lib/notifyError';
import {
  ETIQUETA_ACCION_TRAMITE, ETIQUETA_ESTADO_TRAMITE, esReenvio, puedeRevisarlo, puedeRevisarse,
} from '../../../lib/tramitesAcademicos';
import { generatePreviewPDF } from '../utils/documentGenerator';

export const Solicitudes = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const tramites = useTramitesStore(estado => estado.tramites);
  const errorTramites = useTramitesStore(estado => estado.error);
  const procesando = useTramitesStore(estado => estado.procesando);
  const fetchSolicitudes = useTramitesStore(estado => estado.fetchTramites);
  const revisarTramite = useTramitesStore(estado => estado.revisar);
  const removeSolicitud = useTramitesStore(estado => estado.eliminar);
  const cargarHistorial = useTramitesStore(estado => estado.cargarHistorial);
  const usuarioActual = useAuthStore(estado => estado.user);
  const esAdministrador = usuarioActual?.role === 'admin';

  useEffect(() => { void fetchSolicitudes(); }, []);

  // Los borradores no han sido presentados: el coordinador no debe verlos en su bandeja.
  const data = useMemo(() => tramites
    .filter(tramite => tramite.estado !== 'borrador')
    .map(tramite => ({
      id: String(tramite.id),
      idNumero: tramite.id,
      numero: tramite.numero,
      asunto: tramite.asunto,
      tipo: tramite.tipo || 'Oficio',
      solicitante: tramite.estudiante,
      carrera: tramite.carrera || '—',
      fecha: tramite.enviadaEn ? tramite.enviadaEn.slice(0, 10) : tramite.fecha,
      estado: tramite.estado,
      descripcion: tramite.descripcion || '',
      version: tramite.version,
      destinatario: tramite.destinatario,
      idUsuario: tramite.idUsuario,
      idDestinatario: tramite.idDestinatario,
      observaciones: tramite.observaciones,
      decididoPor: tramite.decididoPor,
    })), [tramites]);

  // KPIs
  const kpi = useMemo(() => ({
    total: data.length,
    pendientes: data.filter(s => s.estado === 'pendiente').length,
    conCambios: data.filter(s => s.estado === 'cambios_solicitados').length,
    aprobados: data.filter(s => s.estado === 'aprobado').length,
    rechazados: data.filter(s => s.estado === 'rechazado').length,
  }), [data]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortCol, setSortCol] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  // Filtros adicionales
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [tipoFilter, setTipoFilter] = useState('Todos');
  const [fechaFilter, setFechaFilter] = useState('todos');


  // Selecciones
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [modalType, setModalType] = useState<null | 'create' | 'view' | 'import' | 'delete' | 'bulkDelete'>(null);
  const [selectedSol, setSelectedSol] = useState<any>(null);
  const [selectedSolForDetail, setSelectedSolForDetail] = useState<any>(null);

  // Filtering & Sorting
  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.asunto.toLowerCase().includes(q) || 
        s.solicitante.toLowerCase().includes(q) || 
        s.tipo.toLowerCase().includes(q)
      );
    }
    if (estadoFilter !== 'Todos') {
      result = result.filter(s => s.estado.toLowerCase() === estadoFilter.toLowerCase());
    }
    if (tipoFilter !== 'Todos') {
      result = result.filter(s => s.tipo.toLowerCase() === tipoFilter.toLowerCase());
    }
    // Filtro de fecha
    if (fechaFilter !== 'todos') {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      result = result.filter(s => {
        const fecha = s.fecha;
        if (fechaFilter === 'hoy') return fecha === todayStr;
        if (fechaFilter === 'semana') {
          const d = new Date(now); d.setDate(d.getDate() - d.getDay());
          return fecha >= d.toISOString().slice(0, 10);
        }
        if (fechaFilter === 'mes') return fecha.slice(0, 7) === todayStr.slice(0, 7);
        if (fechaFilter === 'anio') return fecha.slice(0, 4) === todayStr.slice(0, 4);
        return true;
      });
    }
    if (sortCol) {
      result.sort((a: any, b: any) => {
        const va = a[sortCol] || '';
        const vb = b[sortCol] || '';
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return result;
  }, [data, searchQuery, sortCol, sortAsc, estadoFilter, tipoFilter, fechaFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const start = (currentPage - 1) * perPage;
  const pageData = filteredData.slice(start, start + perPage);



  // Historial de la solicitud abierta: versiones presentadas y decisiones tomadas.
  const [historial, setHistorial] = useState<{ versiones: VersionTramite[]; eventos: EventoTramite[] } | null>(null);

  /**
   * Revisar NO es escribir un estado: es llamar a `revisar_solicitud_academica`, que comprueba en
   * el servidor que quien decide sea el destinatario (o un administrador), que no sea su propio
   * trámite y que nadie lo haya decidido antes. El `<select>` de estados que había aquí permitía
   * poner "aprobado" sin dejar rastro de quién ni por qué.
   */
  const revisar = async (
    solicitud: any,
    decision: 'aprobado' | 'rechazado' | 'cambios_solicitados',
  ) => {
    let observaciones: string | null = null;

    if (decision === 'aprobado') {
      const confirmado = await confirmarAccion({
        title: `¿Aprobar ${solicitud.numero}?`,
        text: 'Aprobar no inserta ninguna firma en el documento: deja constancia de tu decisión.',
        confirmar: 'Sí, aprobar',
      });
      if (!confirmado) return;
    } else {
      observaciones = await pedirTexto({
        title: decision === 'rechazado' ? `Rechazar ${solicitud.numero}` : `Pedir cambios en ${solicitud.numero}`,
        text: decision === 'rechazado'
          ? 'El estudiante verá este motivo en Mis trámites.'
          : 'Escribe qué debe corregir; podrá editarlo y volver a presentarlo.',
        confirmar: decision === 'rechazado' ? 'Rechazar' : 'Pedir cambios',
        obligatorio: true,
      });
      if (observaciones === null) return;
    }

    try {
      const hecho = await revisarTramite(solicitud.idNumero, decision, observaciones ?? undefined);
      if (!hecho) return;
      setSelectedSolForDetail(null);
      void avisoExito(
        decision === 'aprobado' ? 'Trámite aprobado'
          : decision === 'rechazado' ? 'Trámite rechazado'
            : 'Cambios solicitados',
      );
    } catch (err: any) {
      const amigable = friendlyDbError(err);
      void avisoError(amigable.title, err?.message || amigable.text);
    }
  };

  /** Abre el documento tal como lo presentó el estudiante, no como saldría hoy de la plantilla. */
  const verVersion = (version: VersionTramite) => {
    try {
      const documento = version.documento;
      const url = URL.createObjectURL(generatePreviewPDF({
        headerImgBase64: documento.encabezadoImagen || undefined,
        footerImgBase64: documento.pieImagen || undefined,
        tituloAutoridad: documento.destinatario?.titulo || '',
        nombreAutoridad: documento.destinatario?.nombre || '',
        cargo: documento.destinatario?.cargo || '',
        lugarFecha: `${documento.valores?.ciudadOficio || ''} ${documento.valores?.fechaOficio || ''}`.trim(),
        asunto: documento.contenido?.asunto,
        cuerpo: documento.contenido?.parrafos ?? [],
        adjuntos: documento.contenido?.adjuntos ?? [],
        studentName: documento.valores?.nombreFirma || '',
        studentCI: documento.valores?.ciFirma || '',
        firmaImagen: documento.firmaImagen,
      }));
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      void avisoError('No se pudo abrir el documento', 'La versión sigue guardada; vuelve a intentarlo.');
    }
  };
  useEffect(() => {
    if (!selectedSolForDetail) { setHistorial(null); return; }
    let vigente = true;
    void cargarHistorial(Number(selectedSolForDetail.idNumero))
      .then(datos => { if (vigente) setHistorial(datos); })
      .catch(() => { if (vigente) setHistorial(null); });
    return () => { vigente = false; };
  }, [selectedSolForDetail?.idNumero, cargarHistorial]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pageData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pageData.map(s => s.id));
    }
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) return;
    const toExport = data.filter(s => selectedIds.includes(s.id));
    exportarSolicitudes(toExport);
    setSelectedIds([]); // clean up
  };

  const downloadCsvTemplate = () => {
    const csvContent = "Asunto,Tipo,Solicitante,Descripcion\nEj: Uso de laboratorio,Uso de laboratorio,Juan Perez,Solicito laboratorio 1 para prueba\nEj: Oficio de adquisicion,Oficio,Maria Gomez,Compra de equipos";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_solicitudes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Badges
  const getEstadoBadge = (estado: string) => {
    const etiqueta = ETIQUETA_ESTADO_TRAMITE[estado as keyof typeof ETIQUETA_ESTADO_TRAMITE] ?? estado;
    if (estado === 'pendiente') return <span className="bg-yellow-50 text-yellow-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-yellow-200/50 flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>{etiqueta}</span>;
    if (estado === 'cambios_solicitados') return <span className="bg-amber-50 text-amber-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-200/50 flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{etiqueta}</span>;
    if (estado === 'aprobado') return <span className="bg-green-50 text-green-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-green-200/50 flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>{etiqueta}</span>;
    return <span className="bg-red-50 text-red-500 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-red-200/50 flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{etiqueta}</span>;
  };

  const getTipoBadge = (tipo: string) => {
    const map: any = {
      'Oficio': 'bg-indigo-50 text-indigo-600 border-indigo-200/50',
      'Reporte de daño': 'bg-red-50 text-red-600 border-red-200/50',
      'Uso de laboratorio': 'bg-blue-50 text-blue-600 border-blue-200/50',
      'Mantenimiento': 'bg-orange-50 text-orange-600 border-orange-200/50',
      'Préstamo especial': 'bg-purple-50 text-purple-600 border-purple-200/50'
    };
    const cls = map[tipo] || 'bg-gray-50 text-gray-600 border-gray-200/50';
    return <span className={`${cls} text-[9px] font-extrabold px-2 py-0.5 rounded-md border`}>{tipo}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
        {/* HERO SECTION */}
        {!embedded && (
        <div className="w-full min-h-[92px] bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-4 border-b border-gray-800">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
          
          <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
                <FileText className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[12px] font-extrabold text-white tracking-tight leading-none mb-1.5">
                  Solicitudes Recibidas
                </h2>
                <p className="text-[11px] text-gray-400 font-medium">Bandeja de oficios y reportes enviados por los estudiantes.</p>
              </div>
            </div>
            <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.total}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Total</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.pendientes}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Pendientes</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.aprobados}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Aprobados</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.rechazados}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Rechazados</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

      <div className="flex-1 flex flex-col p-6 md:p-8 min-h-0 relative bg-[#f4f7fb]/90 backdrop-blur-xl h-full animate-fade-in">
        {/* Una consulta fallida no puede parecerse a una bandeja vacía. */}
        {errorTramites && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-extrabold text-red-800">No se pudo leer la bandeja completa</p>
              <p className="text-[11px] text-red-700 mt-0.5">{errorTramites}</p>
            </div>
          </div>
        )}

        {/* PANEL SPLIT */}
        <div className="flex-1 flex flex-row min-h-0 gap-6 relative">

      {/* TABLE PANEL */}
      <div className="bg-white/95 backdrop-blur-xl rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative overflow-hidden flex-1 min-w-0 transition-all duration-300">
        <AcentoTarjeta />
        
        {/* TOOLBAR */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SearchInput
              value={searchQuery}
              onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
              placeholder="Buscar por asunto o solicitante..."
              className="w-full sm:w-[220px] shrink-0"
            />

            <FilterDropdown
              icon={Layers}
              label="Estado"
              value={estadoFilter}
              options={[
                { key: 'Todos', label: `Todos (${kpi.total})` },
                { key: 'pendiente', label: `Por revisar (${kpi.pendientes})` },
                { key: 'cambios_solicitados', label: `Con cambios pedidos (${kpi.conCambios})` },
                { key: 'aprobado', label: `Aprobados (${kpi.aprobados})` },
                { key: 'rechazado', label: `Rechazados (${kpi.rechazados})` },
              ]}
              onChange={(k) => { setEstadoFilter(k); setCurrentPage(1); }}
            />

            <FilterDropdown
              icon={Tag}
              label="Tipo"
              value={tipoFilter === 'Todos' ? 'Todos' : tipoFilter}
              options={[
                { key: 'Todos', label: 'Todos' },
                { key: 'Oficio', label: 'Oficio' },
                { key: 'Reporte de daño', label: 'Reporte de daño' },
                { key: 'Uso de laboratorio', label: 'Uso de laboratorio' },
                { key: 'Mantenimiento', label: 'Mantenimiento' },
                { key: 'Préstamo especial', label: 'Préstamo especial' },
              ]}
              onChange={(k) => { setTipoFilter(k); setCurrentPage(1); }}
            />

            <FilterDropdown
              icon={Calendar}
              label="Fecha"
              value={fechaFilter}
              options={[
                { key: 'todos', label: 'Todos' },
                { key: 'hoy', label: 'Hoy' },
                { key: 'semana', label: 'Esta semana' },
                { key: 'mes', label: 'Este mes' },
                { key: 'anio', label: 'Este año' },
              ]}
              onChange={(k) => { setFechaFilter(k); setCurrentPage(1); }}
            />

            <button 
              onClick={() => {
                setSearchQuery('');
                setEstadoFilter('Todos');
                setTipoFilter('Todos');
                setFechaFilter('todos');
                setCurrentPage(1);
              }}
              className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium hover:text-gray-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {selectedIds.length > 0 ? (
              <>
                <button onClick={handleExportSelected} className="flex items-center gap-2 px-5 py-2 rounded-full border border-gray-200 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Exportar ({selectedIds.length})
                </button>
                <button onClick={() => setModalType('bulkDelete')} className="flex items-center gap-2 px-5 py-2 rounded-full border border-red-200 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedIds.length})
                </button>
              </>
            ) : (
              <>
                <button onClick={() => exportarSolicitudes(filteredData)} className="flex items-center gap-2 px-5 py-2 rounded-full border border-gray-200 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Exportar
                </button>
                <button onClick={() => setModalType('import')} className="flex items-center gap-2 px-5 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Importar
                </button>
              </>
            )}
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full overflow-auto flex-1 flex flex-col min-h-0 relative custom-scrollbar">
          <div className="min-w-[900px] grid grid-cols-[40px_1.5fr_1fr_0.8fr_0.8fr_0.6fr_100px] gap-4 px-4 pb-3 border-b border-gray-100 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest sticky top-0 bg-white z-10 shrink-0">
            <div className="flex items-center justify-center">
              <input 
                type="checkbox" 
                checked={pageData.length > 0 && selectedIds.length === pageData.length}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer" 
              />
            </div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('asunto')}>ASUNTO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('tipo')}>TIPO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('solicitante')}>SOLICITANTE <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('fecha')}>FECHA <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('estado')}>ESTADO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="text-right">ACCIONES</div>
          </div>
          
          <div className="flex flex-col min-w-[900px]">
            {pageData.length === 0 ? (
              <EmptyState
                icon={FileX}
                title={data.length === 0 ? 'Sin solicitudes recibidas' : 'Sin resultados con estos filtros'}
                description={data.length === 0 ? 'Aquí aparecerán los oficios y reportes que envíen los estudiantes.' : undefined}
                secondaryLabel={data.length > 0 ? 'Limpiar filtros' : undefined}
                onSecondary={data.length > 0 ? () => { setSearchQuery(''); setEstadoFilter('Todos'); setTipoFilter('Todos'); setFechaFilter('todos'); setCurrentPage(1); } : undefined}
              />
            ) : (
              pageData.map((s, i) => (
                <div key={s.id} onClick={(e) => {
                  if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                  setSelectedSolForDetail(s);
                }} className={`grid grid-cols-[40px_1.5fr_1fr_0.8fr_0.8fr_0.6fr_100px] gap-4 px-4 py-3 border-b border-gray-50 transition-colors items-center animate-fade-in cursor-pointer ${selectedIds.includes(s.id) || selectedSolForDetail?.id === s.id ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`} style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer" 
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-gray-900 truncate">{s.asunto}</span>
                    <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                      {s.numero}
                      {/* El reenvío se deduce de la versión: no hace falta un estado aparte. */}
                      {esReenvio(s.version) && (
                        <span className="rounded-full bg-indigo-50 px-1.5 font-sans font-extrabold text-indigo-600">v{s.version}</span>
                      )}
                    </span>
                  </div>
                  <div>{getTipoBadge(s.tipo)}</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-gray-500 font-bold text-[10px]">{s.solicitante.charAt(0)}</div>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-semibold text-gray-700 truncate">{s.solicitante}</span>
                      <span className="block text-[10px] text-gray-400 truncate">{s.carrera}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">
                    {new Date(s.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div>{getEstadoBadge(s.estado)}</div>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setSelectedSolForDetail(s)} className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors" title="Ver detalle"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setSelectedSol(s); setModalType('delete'); }} className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PAGINATION */}
        <div className="border-t border-gray-100/60 pt-2 shrink-0">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
            total={filteredData.length}
            perPage={perPage}
            onPerPageChange={(n) => { setPerPage(n); setCurrentPage(1); setSelectedIds([]); }}
          />
        </div>
      </div>

      {/* PANEL DERECHO (Detalle de la solicitud) */}
      {(selectedSolForDetail && selectedIds.length <= 1) && (
          <div className="w-1/4 min-w-[300px] bg-white rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative shrink-0 overflow-hidden animate-fade-in z-10">
            <button onClick={() => setSelectedSolForDetail(null)} className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Detalle de Solicitud</p>
            <h2 className="text-sm font-bold text-gray-900 leading-tight mb-1">{selectedSolForDetail.asunto}</h2>
            <div className="flex items-center gap-2 mb-4">
               {getTipoBadge(selectedSolForDetail.tipo)} {getEstadoBadge(selectedSolForDetail.estado)} <p className="text-[10px] text-gray-400 font-mono ml-auto">{selectedSolForDetail.id}</p>
            </div>

            <div className="w-full flex-1 bg-white rounded-xl border border-gray-200 flex flex-col mb-6 relative overflow-hidden shadow-sm p-5 min-h-0">
               <div className="w-full h-full bg-white p-5 overflow-y-auto text-[10px] leading-[1.5] text-gray-800 border border-gray-100 shadow-inner rounded-sm custom-scrollbar relative z-10 pointer-events-auto">
                  <div className="flex justify-between items-center border-b border-gray-300 pb-3 mb-4">
                    <div className="text-center flex-1 px-2">
                      <div className="font-bold text-[12px]">ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO</div>
                      <div className="text-[10px] uppercase">SISTEMA DE SOLICITUDES ESTUDIANTILES</div>
                    </div>
                  </div>
                  
                  <div className="text-right mb-6">
                    Fecha de solicitud: {new Date(selectedSolForDetail.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>

                  <div className="mb-6">
                    <div><strong>De:</strong> {selectedSolForDetail.solicitante}</div>
                    <div><strong>Asunto:</strong> {selectedSolForDetail.asunto}</div>
                    <div><strong>Tipo:</strong> {selectedSolForDetail.tipo}</div>
                  </div>

                  <div className="text-justify mb-6 opacity-90">
                    <strong>Descripción / Detalle:</strong><br/><br/>
                    {selectedSolForDetail.descripcion || 'Sin descripción.'}
                  </div>

                  {selectedSolForDetail.observaciones && (
                    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <strong className="text-amber-800">Observaciones registradas:</strong>
                      <p className="mt-1 whitespace-pre-line text-amber-900">{selectedSolForDetail.observaciones}</p>
                    </div>
                  )}

                  <div className="mb-6">
                    <strong>Documento presentado</strong>
                    {!historial ? (
                      <p className="mt-1 text-gray-400">Cargando…</p>
                    ) : historial.versiones.length === 0 ? (
                      <p className="mt-1 text-gray-400">Este trámite no tiene versiones guardadas (se registró antes de la 0045).</p>
                    ) : (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {historial.versiones.map(version => (
                          <button
                            key={version.id}
                            onClick={() => verVersion(version)}
                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left hover:bg-gray-50"
                          >
                            <span>Versión {version.version} · {new Date(version.creadaEn).toLocaleDateString('es-ES')}</span>
                            <span className="font-bold text-espoch-red">Ver PDF</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <strong>Historial</strong>
                    {!historial ? (
                      <p className="mt-1 text-gray-400">Cargando…</p>
                    ) : (
                      <ol className="mt-2 flex flex-col gap-1.5 border-l border-gray-200 pl-3">
                        {historial.eventos.map(evento => (
                          <li key={evento.id}>
                            <span className="font-semibold">
                              {ETIQUETA_ACCION_TRAMITE[evento.accion] ?? evento.accion}
                            </span>
                            {evento.actor ? ` · ${evento.actor}` : ''}
                            <span className="text-gray-400"> · {new Date(evento.creadoEn).toLocaleDateString('es-ES')}</span>
                            {evento.observaciones && <p className="text-gray-600">{evento.observaciones}</p>}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto shrink-0">
               {/* Las acciones solo aparecen para quien puede ejecutarlas. Ocultarlas no es el
                   control: el control es la función del servidor, que vuelve a comprobarlo. */}
               {puedeRevisarse(selectedSolForDetail.estado) && puedeRevisarlo(
                 { id_usuario: selectedSolForDetail.idUsuario, id_destinatario: selectedSolForDetail.idDestinatario },
                 usuarioActual?.id ?? null,
                 esAdministrador,
               ) ? (
                 <div className="flex flex-col gap-2">
                   <button
                      onClick={() => void revisar(selectedSolForDetail, 'aprobado')}
                      disabled={procesando !== null}
                      className="w-full bg-[#0f172a] hover:bg-black disabled:opacity-50 text-white text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-gray-800"
                   >
                      <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                   </button>
                   <div className="flex gap-2">
                     <button
                        onClick={() => void revisar(selectedSolForDetail, 'cambios_solicitados')}
                        disabled={procesando !== null}
                        className="flex-1 bg-white border border-gray-200 hover:bg-amber-50 hover:border-amber-200 disabled:opacity-50 text-amber-700 text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                     >
                        <RotateCcw className="w-3.5 h-3.5" /> Pedir cambios
                     </button>
                     <button
                        onClick={() => void revisar(selectedSolForDetail, 'rechazado')}
                        disabled={procesando !== null}
                        className="flex-1 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 disabled:opacity-50 text-red-600 text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                     >
                        <XCircle className="w-3.5 h-3.5" /> Rechazar
                     </button>
                   </div>
                 </div>
               ) : (
                 <p className="rounded-lg bg-gray-50 px-3 py-2 text-[10.5px] text-gray-500">
                   {puedeRevisarse(selectedSolForDetail.estado)
                     ? `Lo revisa ${selectedSolForDetail.destinatario || 'su destinatario'}.`
                     : `${ETIQUETA_ESTADO_TRAMITE[selectedSolForDetail.estado as keyof typeof ETIQUETA_ESTADO_TRAMITE] ?? selectedSolForDetail.estado}${selectedSolForDetail.decididoPor ? ` por ${selectedSolForDetail.decididoPor}` : ''}.`}
                 </p>
               )}
               <button onClick={() => exportarSolicitudes([selectedSolForDetail])} className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm mt-1">
                 <Download className="w-3.5 h-3.5" /> Descargar PDF
               </button>
            </div>
          </div>
      )}
      </div>

      {/* MODALS */}
      {modalType && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          <div className={`bg-white rounded-[20px] p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full overflow-y-auto custom-scrollbar relative animate-scale-in`} style={{ maxWidth: (modalType === 'create' ? '560px' : modalType === 'view' ? '550px' : modalType === 'delete' || modalType === 'bulkDelete' ? '420px' : '500px'), maxHeight: '85vh' }}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors bg-transparent p-1 z-10"><X className="w-5 h-5" /></button>
            
            {modalType === 'create' && (
              <>
                <h3 className="text-lg font-extrabold text-gray-900 mb-1">Nueva Solicitud</h3>
                <p className="text-xs text-gray-500 mb-6">Complete los datos del formato o solicitud.</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  void avisoInfo('Las crean los estudiantes', 'Una solicitud nace en el portal del estudiante; desde aquí se revisan y se responden.');
                  setModalType(null);
                }} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Asunto</label><input name="asunto" required placeholder="Ej: Solicitud de uso de laboratorio" className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo de Solicitud</label>
                      <select name="tipo" className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer">
                        <option value="Uso de laboratorio">Uso de laboratorio</option>
                        <option value="Oficio">Oficio</option>
                        <option value="Reporte de daño">Reporte de daño</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                        <option value="Préstamo especial">Préstamo especial</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Solicitante</label><input name="solicitante" required placeholder="Nombre completo" className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium" /></div>
                  </div>
                  <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Descripcion / Detalle</label><textarea name="descripcion" rows={3} required placeholder="Describa el motivo de la solicitud..." className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium resize-none"></textarea></div>
                  <div className="flex gap-3 mt-4 justify-end">
                    <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                    <button type="submit" className="bg-[#0f172a] hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all border border-gray-800">Registrar Solicitud</button>
                  </div>
                </form>
              </>
            )}



            {modalType === 'import' && (
              <>
                <h3 className="text-lg font-extrabold text-gray-900 mb-1">Importar Solicitudes</h3>
                <p className="text-xs text-gray-500 mb-6">Cargue un archivo CSV con solicitudes.</p>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-espoch-yellow/50 transition-colors cursor-pointer relative" onClick={() => document.getElementById('import-input')?.click()}>
                  <UploadCloud className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm font-bold text-gray-600">Haga clic o arrastre un archivo</p>
                  <p className="text-[10px] text-gray-400 mt-1">Formatos: CSV (.csv)</p>
                  <input type="file" id="import-input" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { void avisoInfo('Importación en desarrollo', `Todavía no se procesa ${e.target.files[0].name}.`); setModalType(null); } }} />
                </div>
                <div className="flex items-center justify-between mt-6">
                  <button type="button" onClick={downloadCsvTemplate} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 underline underline-offset-2">
                    <FileDown className="w-3.5 h-3.5" /> Descargar formato de ejemplo
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                  </div>
                </div>
              </>
            )}

            {/* CONFIRM DELETE MODAL (Replicating global.js Modal.confirm) */}
            {(modalType === 'delete' || modalType === 'bulkDelete') && (
              <div className="text-center py-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
                  <AlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-[18px] font-extrabold text-gray-900 mb-2">Eliminar Solicitud{modalType === 'bulkDelete' ? 'es' : ''}</h3>
                <p className="text-[13px] text-gray-500 mb-7 leading-relaxed">
                  {modalType === 'bulkDelete' 
                    ? `Se eliminarán permanentemente las ${selectedIds.length} solicitudes seleccionadas.`
                    : `Se eliminará permanentemente la solicitud "${selectedSol?.asunto}".`}
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setModalType(null)} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={async () => {
                    if (modalType === 'bulkDelete') {
                      for (const id of selectedIds) {
                        await removeSolicitud(Number(id));
                      }
                      setSelectedIds([]);
                    } else {
                      await removeSolicitud(Number(selectedSol.id));
                    }
                    await fetchSolicitudes();
                    setModalType(null);
                  }} className="flex-1 py-3 rounded-xl border border-transparent bg-espoch-red hover:bg-espoch-darkred text-white font-bold text-[13px] shadow-[0_0_12px_rgba(176,0,0,0.4)] transition-colors">
                    Confirmar
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
      </div>
    </div>
  );
};
