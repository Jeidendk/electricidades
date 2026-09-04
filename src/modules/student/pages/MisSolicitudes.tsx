import { useState, useMemo, useRef, useEffect } from 'react';
import { ClipboardList, ChevronRight, Search, Filter, Download, Plus, Copy, Calendar, Eye, FileText, X, ChevronsUpDown, CheckCircle2, Clock } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useSolicitudesEquipoStore, type SolicitudEquipo } from '../../../store/solicitudesEquipoStore';
import { generarPDFComprobante } from '../../../utils/pdfGenerator';
import ExcelJS from 'exceljs';
import { Link } from 'react-router-dom';
import { Pagination } from '../../../components/ui/Pagination';

export const MisSolicitudes = () => {
  const { user } = useAuthStore();
  const { items: solicitudes, fetchItems, cancelarSolicitud: storeCancelar } = useSolicitudesEquipoStore();
  
  const [search, setSearch] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof SolicitudEquipo; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchItems(user.id);
    }
  }, [user, fetchItems]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filter Dropdown State
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (key: keyof SolicitudEquipo) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let items = [...solicitudes];

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        i =>
          i.numero.toLowerCase().includes(q) ||
          i.asignatura.toLowerCase().includes(q) ||
          i.itemsStr.toLowerCase().includes(q)
      );
    }

    if (dateStart) {
      items = items.filter(i => new Date(i.fecha) >= new Date(dateStart));
    }
    if (dateEnd) {
      items = items.filter(i => new Date(i.fecha) <= new Date(dateEnd));
    }
    
    if (statusFilter !== 'Todos') {
      items = items.filter(i => i.estado === statusFilter);
    }

    if (sortConfig !== null) {
      items.sort((a, b) => {
        const av = a[sortConfig.key] ?? '';
        const bv = b[sortConfig.key] ?? '';
        if (av < bv) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (av > bv) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return items;
  }, [solicitudes, search, dateStart, dateEnd, statusFilter, sortConfig]);

  // Pagination logic
  const totalItems = filteredAndSorted.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const currentItems = filteredAndSorted.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado!');
  };

  const cancelarSolicitud = async (id: string) => {
    if (window.confirm('¿Está seguro de cancelar esta solicitud?')) {
      try {
        await storeCancelar(id);
      } catch (err) {
        alert('Error al cancelar la solicitud');
      }
    }
  };

  const exportarAExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Mis_Solicitudes');

    ws.columns = [
      { header: 'Nº SOLICITUD', key: 'numero', width: 18 },
      { header: 'ASIGNATURA', key: 'asignatura', width: 28 },
      { header: 'ÍTEM / EQUIPO', key: 'item', width: 42 },
      { header: 'FECHA', key: 'fecha', width: 22 },
      { header: 'ESTADO', key: 'estado', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };

    filteredAndSorted.forEach(s => {
      ws.addRow({ numero: s.numero, asignatura: s.asignatura, item: s.itemsStr, fecha: `${s.fecha} ${s.hora}`, estado: s.estado });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Historial_Solicitudes.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generarPDF = (sol: SolicitudEquipo) => {
    generarPDFComprobante({
      numeroSolicitud: sol.numero.replace('SOL-', ''),
      fecha: new Date(sol.fecha).toLocaleDateString('es-ES'),
      nombre: 'Juan Carlos Pérez López',
      cedula: '0604789123',
      carrera: 'Ingeniería en Electricidad',
      asignatura: sol.asignatura,
      tipoMovimiento: 'Sacar',
      items: sol.items
    });
  };

  const getStatusBadge = (estado: SolicitudEquipo['estado']) => {
    switch (estado) {
      case 'Aprobada':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-600 text-[11px] font-bold tracking-wide">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Aprobada
          </div>
        );
      case 'Pendiente':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-100 text-yellow-600 text-[11px] font-bold tracking-wide">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> Pendiente
          </div>
        );
      case 'Rechazada':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold tracking-wide">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Rechazada
          </div>
        );
      case 'Devuelto':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-600 text-[11px] font-bold tracking-wide">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div> Devuelto
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-[#f4f7fb]">
      {/* HERO SECTION - UNIFIED BANNER */}
      <div className="w-full bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-5 border-b border-gray-800">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
        
        <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
              <ClipboardList className="w-7 h-7" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[12px] font-extrabold text-white tracking-tight leading-none mb-1.5">
                Mis Solicitudes
              </h2>
              <p className="text-[11px] text-gray-400 font-medium">Historial de todas tus solicitudes de equipamiento y reportes.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-white leading-tight">15</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Total solicitudes</span>
              </div>
            </div>
            
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-white leading-tight">8</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Aprobadas</span>
              </div>
            </div>
            
            <div className="w-px h-8 bg-white/10 mx-1"></div>

            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-white leading-tight">5</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Pendientes</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-[#212730] px-4 py-2 rounded-full border border-white/5">
            <span className="hover:text-gray-200 cursor-pointer transition-colors">INICIO</span>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <span className="text-espoch-yellow">MIS SOLICITUDES</span>
          </div>
        </div>
      </div>

      {/* WORKSPACE TABLA */}
      <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 lg:p-8 w-full mx-auto">
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[24px] shadow-sm border border-gray-200/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-espoch-yellow via-orange-500 to-espoch-red z-20"></div>

          {/* TOOLBAR */}
          <div className="shrink-0 p-5 pt-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white z-30 relative">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              {/* Buscador */}
              <div className="relative w-full lg:w-[350px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por Nº solicitud, asignatura o ítem..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-white text-[13px] text-gray-800 rounded-xl py-2.5 pl-10 pr-4 outline-none border border-gray-200 focus:border-gray-300 transition-all font-medium placeholder:text-gray-400 shadow-sm"
                />
              </div>

              {/* Rango de Fechas */}
              <div className="hidden md:flex items-center gap-2 shrink-0 bg-gray-50/50 p-1 rounded-xl border border-gray-200/80 shadow-sm">
                <div className="flex items-center">
                  <span className="text-[11px] font-bold text-gray-400 pl-3 pr-2 uppercase">Desde</span>
                  <input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setCurrentPage(1); }} className="bg-transparent text-gray-700 text-[12px] font-semibold py-1.5 pr-2 outline-none cursor-pointer" />
                </div>
                <div className="w-px h-5 bg-gray-300"></div>
                <div className="flex items-center">
                  <span className="text-[11px] font-bold text-gray-400 pl-3 pr-2 uppercase">Hasta</span>
                  <input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setCurrentPage(1); }} className="bg-transparent text-gray-700 text-[12px] font-semibold py-1.5 pr-2 outline-none cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              
              {/* Filtro Dropdown */}
              <div className="relative" ref={filterRef}>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-white border ${statusFilter !== 'Todos' ? 'border-espoch-red text-espoch-red bg-red-50' : 'border-gray-200 text-gray-700'} rounded-xl text-[13px] font-semibold shadow-sm hover:bg-gray-50 transition-all`}
                >
                  <Filter className="w-4 h-4" />
                  {statusFilter === 'Todos' ? 'Filtros' : statusFilter}
                  {statusFilter !== 'Todos' && (
                    <div 
                      className="ml-1 p-0.5 rounded-full hover:bg-red-100 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setStatusFilter('Todos'); setCurrentPage(1); }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
                
                {showFilters && (
                  <div className="absolute top-[calc(100%+8px)] right-0 w-48 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 z-[60] p-2 animate-fade-in origin-top-right">
                    {/* Flecha apuntando al botón */}
                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-l border-t border-gray-100 transform rotate-45"></div>
                    
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2 mt-1 relative z-10">Estado de Solicitud</p>
                    <div className="relative z-10">
                      {['Aprobada', 'Pendiente', 'Rechazada', 'Devuelto'].map((status) => (
                        <button
                          key={status}
                          onClick={() => { setStatusFilter(status); setShowFilters(false); setCurrentPage(1); }}
                          className={`w-full text-left px-3 py-2 text-[13px] font-medium rounded-lg transition-colors flex items-center justify-between ${statusFilter === status ? 'bg-red-50 text-espoch-red font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          {status}
                          {statusFilter === status && <div className="w-1.5 h-1.5 rounded-full bg-espoch-red"></div>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={exportarAExcel} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-sm">
                <Download className="w-4 h-4" /> Exportar
              </button>

              <Link to="/student/catalog" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b00000] hover:bg-[#8b0000] text-white text-[13px] font-bold transition-all shadow-md border border-red-500/30">
                <Plus className="w-4 h-4" /> Nueva Solicitud
              </Link>
            </div>
          </div>

          {/* TABLA */}
          <div className="flex-1 overflow-y-auto overflow-x-auto relative bg-white">
            <table className="w-full text-left border-collapse min-w-[1050px]">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#f3f4f6]">
                <tr className="select-none">
                  <th className="py-4 px-6 w-12 text-center">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  </th>
                  <th className="py-4 px-4 w-16 cursor-pointer group hover:bg-gray-50 transition-colors" onClick={() => handleSort('id')}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-800 transition-colors">#</span>
                      <ChevronsUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </th>
                  <th className="py-4 px-4 w-44 cursor-pointer group hover:bg-gray-50 transition-colors" onClick={() => handleSort('numero')}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-800 transition-colors">Nº Solicitud</span>
                      <ChevronsUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </th>
                  <th className="py-4 px-4 cursor-pointer group hover:bg-gray-50 transition-colors" onClick={() => handleSort('asignatura')}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-800 transition-colors">Asignatura</span>
                      <ChevronsUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </th>
                  <th className="py-4 px-4 w-1/4 cursor-pointer group hover:bg-gray-50 transition-colors" onClick={() => handleSort('itemsStr')}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-800 transition-colors">Ítem / Equipo</span>
                      <ChevronsUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </th>
                  <th className="py-4 px-4 cursor-pointer group hover:bg-gray-50 transition-colors" onClick={() => handleSort('fecha')}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-800 transition-colors">Fecha</span>
                      <ChevronsUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </th>
                  <th className="py-4 px-4 cursor-pointer group hover:bg-gray-50 transition-colors" onClick={() => handleSort('estado')}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-800 transition-colors">Estado</span>
                      <ChevronsUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </th>
                  <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {currentItems.map((sol, index) => (
                  <tr key={sol.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors group">
                    <td className="py-4 px-6 text-center">
                      <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    </td>
                    <td className="py-4 px-4 font-semibold text-gray-400">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 group/copy cursor-pointer" onClick={() => copyToClipboard(sol.numero)}>
                        <span className="font-bold text-gray-900">{sol.numero}</span>
                        <Copy className="w-3.5 h-3.5 text-gray-300 group-hover/copy:text-gray-600 transition-colors" />
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-gray-800">{sol.asignatura}</td>
                    <td className="py-4 px-4 font-medium text-gray-500">{sol.itemsStr}</td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-700">{new Date(sol.fecha).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <span className="text-[11px] font-medium text-gray-400">{sol.hora}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(sol.estado)}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="w-8 h-8 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors shadow-sm" title="Ver Detalles">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => generarPDF(sol)} disabled={sol.estado === 'Rechazada'} className={`w-8 h-8 rounded-lg border border-purple-100 bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center transition-colors shadow-sm ${sol.estado === 'Rechazada' ? 'opacity-50 cursor-not-allowed' : ''}`} title={sol.estado === 'Rechazada' ? 'PDF no disponible' : 'Descargar PDF'}>
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => cancelarSolicitud(sol.id)} disabled={sol.estado !== 'Pendiente'} className={`w-8 h-8 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors shadow-sm ${sol.estado !== 'Pendiente' ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-50' : ''}`} title={sol.estado !== 'Pendiente' ? 'No se puede cancelar una solicitud ya procesada' : 'Cancelar Solicitud'}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="shrink-0 p-4 border-t border-gray-100 bg-white/50 backdrop-blur-sm">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
              total={totalItems}
              perPage={rowsPerPage}
              onPerPageChange={setRowsPerPage}
              className="mt-0"
            />
          </div>
          
        </div>
      </div>
    </div>
  );
};
