import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, FileSpreadsheet, BarChart2,
  Activity, Users, Map as MapIcon, Wrench, Calendar,
  MoreVertical, CheckCircle2, ChevronDown, ArrowRight
} from 'lucide-react';
import { useUsuariosStore } from '../../../store/usuariosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useSolicitudesAdminStore } from '../../../store/solicitudesAdminStore';

// Como no hay tabla de historial de reportes generados en la BD actualmente,
// dejamos este arreglo vacío para reflejar el estado real (vacío).
const historialData: any[] = [];

export const Reportes = () => {
  const { items: usuarios, fetchUsuarios } = useUsuariosStore();
  const { items: espacios, fetchEspacios } = useEspaciosStore();
  const { items: inventario, fetchItems: fetchInventario } = useInventarioStore();
  const { solicitudes, fetchSolicitudes } = useSolicitudesAdminStore();

  const chartData = useMemo(() => {
    const total = inventario.length;
    // Categorias
    const equipos = inventario.filter(i => i.categoria === 'equipos').length;
    const mobiliario = inventario.filter(i => i.categoria === 'mobiliario').length;
    const laboratorio = inventario.filter(i => i.categoria === 'material_laboratorio' || i.categoria === 'herramientas').length;
    const otros = total - (equipos + mobiliario + laboratorio);
    
    const maxCat = Math.max(equipos, mobiliario, laboratorio, otros, 1); // evitamos division por cero

    // Estados
    const activos = inventario.filter(i => i.estado === 'bueno' || i.estado === 'regular').length;
    const manten = inventario.filter(i => i.estado === 'reparacion').length;
    const inactivos = inventario.filter(i => i.estado === 'malo' || i.estado === 'baja').length;

    const pActivos = total ? Math.round((activos / total) * 100) : 0;
    const pManten = total ? Math.round((manten / total) * 100) : 0;
    const pInactivos = total ? Math.round((inactivos / total) * 100) : 0;

    // SVG dasharrays for donut chart
    const dashActivos = `${pActivos}, 100`;
    const dashManten = `${pActivos + pManten}, 100`;
    const dashInactivos = `100, 100`; // fill the rest

    return { 
      total, equipos, mobiliario, laboratorio, otros, maxCat,
      activos, manten, inactivos, pActivos, pManten, pInactivos,
      dashActivos, dashManten, dashInactivos
    };
  }, [inventario]);

  useEffect(() => {
    fetchUsuarios();
    fetchEspacios();
    fetchInventario();
    fetchSolicitudes();
  }, []);

  const [tipoReporte, setTipoReporte] = useState('Inventario');
  const [formato, setFormato] = useState('PDF');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert(`¡Reporte generado en formato ${formato}!`);
    }, 1500);
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'Inventario': return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">Inventario</span>;
      case 'Infraestructura': return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">Infraestructura</span>;
      case 'Usuarios': return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">Usuarios</span>;
      case 'Mantenimiento': return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100">Mantenimiento</span>;
      default: return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-100">{tipo}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
        {/* HERO SECTION */}
        <div className="w-full min-h-[120px] bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-5 border-b border-gray-800">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
          
          <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
                <BarChart2 className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[21px] md:text-[25px] font-bold text-white tracking-tight leading-none mb-1.5">
                  Reportes y Analíticas
                </h2>
                <p className="text-[13px] text-gray-400 font-medium">Generación de informes exportables del sistema.</p>
              </div>
            </div>
            <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">

              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{usuarios.length || 0}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Usuarios</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <Wrench className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{inventario.length || 0}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Activos Fijos</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <MapIcon className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{espacios.length || 0}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Espacios Acad.</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{solicitudes.length || 0}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Trámites/Mes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      
      <div className="flex-1 flex flex-col p-6 md:p-8 min-h-0 overflow-hidden bg-[#f4f7fb]/90 backdrop-blur-xl animate-fade-in">
      {/* CONTENT GRID */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pr-2">
        


        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 flex-1 min-h-0">
          
          {/* LEFT: Generador de Reportes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-espoch-red flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-gray-900 leading-tight">Generar Nuevo Reporte</h3>
                <p className="text-[10px] font-medium text-gray-500">Configure los parámetros de su reporte.</p>
              </div>
            </div>
            
            <form onSubmit={handleGenerateReport} className="flex flex-col gap-6 flex-1">
              <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">MÓDULO / TIPO DE DATOS</label>
                  <div className="relative">
                    <select value={tipoReporte} onChange={e => setTipoReporte(e.target.value)} className="appearance-none w-full bg-white text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-red font-medium cursor-pointer transition-all shadow-sm">
                        <option value="Inventario">Inventario General (Equipos, Mobiliario)</option>
                        <option value="Infraestructura">Infraestructura (Edificios, Aulas, Labs)</option>
                        <option value="Usuarios">Usuarios Registrados</option>
                        <option value="Mantenimiento">Historial de Mantenimientos</option>
                        <option value="Solicitudes">Trámites y Solicitudes</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
              </div>

              <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">FILTRO DE FECHA (OPCIONAL)</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input type="text" placeholder="dd/mm/aaaa" className="w-full bg-white text-[12px] text-gray-900 rounded-xl py-2.5 px-3 pl-4 outline-none border border-gray-200 focus:border-espoch-red font-medium transition-all shadow-sm" />
                      <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <span className="text-gray-300">-</span>
                    <div className="relative flex-1">
                      <input type="text" placeholder="dd/mm/aaaa" className="w-full bg-white text-[12px] text-gray-900 rounded-xl py-2.5 px-3 pl-4 outline-none border border-gray-200 focus:border-espoch-red font-medium transition-all shadow-sm" />
                      <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
              </div>

              <div className="flex flex-col gap-2 mb-4">
                  <label className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">FORMATO DE EXPORTACIÓN</label>
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    <label className={`relative flex flex-col items-center justify-center p-5 rounded-xl border-2 cursor-pointer transition-all ${formato === 'PDF' ? 'border-espoch-red bg-red-50/30' : 'border-gray-100 hover:border-gray-200 bg-white'}`} onClick={() => setFormato('PDF')}>
                      {formato === 'PDF' && <div className="absolute top-2 right-2 text-espoch-red"><CheckCircle2 className="w-4 h-4 fill-espoch-red text-white" /></div>}
                      <FileText className={`w-8 h-8 mb-2 ${formato === 'PDF' ? 'text-espoch-red' : 'text-gray-400'}`} strokeWidth={1.5} />
                      <span className={`text-[13px] font-extrabold ${formato === 'PDF' ? 'text-espoch-red' : 'text-gray-600'}`}>PDF</span>
                      <span className="text-[10px] font-medium text-gray-400 mt-0.5">Documento PDF</span>
                    </label>
                    <label className={`relative flex flex-col items-center justify-center p-5 rounded-xl border-2 cursor-pointer transition-all ${formato === 'Excel' ? 'border-green-500 bg-green-50/30' : 'border-gray-100 hover:border-gray-200 bg-white'}`} onClick={() => setFormato('Excel')}>
                      {formato === 'Excel' ? <div className="absolute top-2 right-2 text-green-500"><CheckCircle2 className="w-4 h-4 fill-green-500 text-white" /></div> : <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full border border-gray-300"></div>}
                      <FileSpreadsheet className={`w-8 h-8 mb-2 ${formato === 'Excel' ? 'text-green-600' : 'text-gray-400'}`} strokeWidth={1.5} />
                      <span className={`text-[13px] font-extrabold ${formato === 'Excel' ? 'text-green-600' : 'text-gray-600'}`}>Excel</span>
                      <span className="text-[10px] font-medium text-gray-400 mt-0.5">Hoja Excel</span>
                    </label>
                  </div>
              </div>

              <button type="submit" disabled={isGenerating} className="mt-auto py-3.5 rounded-xl bg-[#0f172a] hover:bg-black text-white text-[14px] font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 border border-gray-800">
                {isGenerating ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generando...</>
                ) : (
                  <><Download className="w-4 h-4" /> Generar y Descargar</>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT COL */}
          <div className="flex flex-col gap-6">
            
            {/* Top Charts */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[16px] font-extrabold text-gray-900">Resumen Analítico</h3>
                  <p className="text-[11px] font-medium text-gray-500 mt-0.5">Panorama general del sistema</p>
                </div>
                <div className="relative">
                  <select className="appearance-none bg-white border border-gray-200 text-gray-600 text-[11px] font-bold rounded-lg pl-3 pr-8 py-1.5 outline-none cursor-pointer">
                    <option>Últimos 30 días</option>
                  </select>
                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Chart 1: Bar Chart */}
                <div className="flex flex-col">
                  <h4 className="text-[10px] font-extrabold text-gray-800 mb-4">Activos por Categoría</h4>
                  <div className="flex-1 flex items-end gap-3 h-[120px] px-2 pb-2 relative">
                    {/* Y Axis */}
                    <div className="absolute left-0 top-0 bottom-6 w-6 flex flex-col justify-between text-[8px] font-bold text-gray-400 text-right pr-2">
                      <span>2K</span><span>1.5K</span><span>1K</span><span>500</span><span>0</span>
                    </div>
                    {/* Grid lines */}
                    <div className="absolute left-6 right-0 top-1.5 bottom-6 flex flex-col justify-between z-0">
                      <div className="w-full border-b border-gray-100/50"></div>
                      <div className="w-full border-b border-gray-100/50"></div>
                      <div className="w-full border-b border-gray-100/50"></div>
                      <div className="w-full border-b border-gray-100/50"></div>
                      <div className="w-full border-b border-gray-200"></div>
                    </div>
                    {/* Bars */}
                    <div className="flex-1 flex items-end justify-between h-full pl-6 z-10">
                      <div className="flex flex-col items-center gap-1.5 w-1/4">
                        <span className="text-[9px] font-extrabold text-gray-700">{chartData.equipos}</span>
                        <div className="w-8 md:w-10 bg-[#3b82f6] rounded-t-sm w-full transition-all" style={{ height: `${(chartData.equipos / chartData.maxCat) * 90 + 5}%` }}></div>
                        <span className="text-[8px] font-semibold text-gray-500">Equipos</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 w-1/4">
                        <span className="text-[9px] font-extrabold text-gray-700">{chartData.mobiliario}</span>
                        <div className="w-8 md:w-10 bg-[#10b981] rounded-t-sm w-full transition-all" style={{ height: `${(chartData.mobiliario / chartData.maxCat) * 90 + 5}%` }}></div>
                        <span className="text-[8px] font-semibold text-gray-500">Mobiliario</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 w-1/4">
                        <span className="text-[9px] font-extrabold text-gray-700">{chartData.laboratorio}</span>
                        <div className="w-8 md:w-10 bg-[#fbbf24] rounded-t-sm w-full transition-all" style={{ height: `${(chartData.laboratorio / chartData.maxCat) * 90 + 5}%` }}></div>
                        <span className="text-[8px] font-semibold text-gray-500">Laboratorio</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 w-1/4">
                        <span className="text-[9px] font-extrabold text-gray-700">{chartData.otros}</span>
                        <div className="w-8 md:w-10 bg-[#8b5cf6] rounded-t-sm w-full transition-all" style={{ height: `${(chartData.otros / chartData.maxCat) * 90 + 5}%` }}></div>
                        <span className="text-[8px] font-semibold text-gray-500">Otros</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart 2: Donut Chart */}
                <div className="flex flex-col border-l border-r border-gray-100 px-6">
                  <h4 className="text-[10px] font-extrabold text-gray-800 mb-2">Estado de Activos</h4>
                  <div className="flex-1 flex items-center gap-6">
                    <div className="relative w-28 h-28 shrink-0">
                      {/* SVG Donut */}
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        {/* Inactivos (Red) - Background / full circle */}
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ef4444" strokeWidth="8" strokeDasharray={chartData.dashInactivos} />
                        {/* En Mantenimiento (Yellow) */}
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray={chartData.dashManten} className="transition-all duration-1000" />
                        {/* Activos (Green) */}
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray={chartData.dashActivos} className="transition-all duration-1000" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold text-gray-900 leading-none">{chartData.total}</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Total</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div><span className="text-[10px] font-extrabold text-gray-700">Activos</span></div>
                        <span className="text-[9px] font-medium text-gray-500 pl-3.5">{chartData.activos} ({chartData.pActivos}%)</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div><span className="text-[10px] font-extrabold text-gray-700">En Mantenimiento</span></div>
                        <span className="text-[9px] font-medium text-gray-500 pl-3.5">{chartData.manten} ({chartData.pManten}%)</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ef4444]"></div><span className="text-[10px] font-extrabold text-gray-700">Inactivos</span></div>
                        <span className="text-[9px] font-medium text-gray-500 pl-3.5">{chartData.inactivos} ({chartData.pInactivos}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart 3: Line Chart */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-[10px] font-extrabold text-gray-800">Actividad de Reportes</h4>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900 leading-none block">87</span>
                      <span className="text-[8px] font-bold text-gray-400">Generados</span>
                    </div>
                  </div>
                  <div className="flex-1 relative w-full h-[100px]">
                     {/* Y Axis */}
                     <div className="absolute left-0 top-0 bottom-4 w-5 flex flex-col justify-between text-[8px] font-bold text-gray-400 text-right pr-1">
                      <span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
                    </div>
                    <div className="absolute left-5 right-0 top-0 bottom-4">
                      {/* SVG Line chart */}
                      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <polyline points="0,30 10,20 20,25 30,15 40,20 50,15 60,5 70,12 80,10 90,20 100,5" fill="none" stroke="#3b82f6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                        <polygon points="0,40 0,30 10,20 20,25 30,15 40,20 50,15 60,5 70,12 80,10 90,20 100,5 100,40" fill="url(#gradientArea)" />
                        <circle cx="10" cy="20" r="1.5" fill="white" stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        <circle cx="30" cy="15" r="1.5" fill="white" stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        <circle cx="60" cy="5" r="1.5" fill="white" stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        <circle cx="80" cy="10" r="1.5" fill="white" stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        <circle cx="100" cy="5" r="1.5" fill="white" stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      </svg>
                    </div>
                    {/* X Axis */}
                    <div className="absolute left-5 right-0 bottom-0 flex justify-between text-[8px] font-bold text-gray-400">
                      <span>22 Abr</span><span>29 Abr</span><span>6 May</span><span>13 May</span><span>20 May</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Historial Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col flex-1">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-[16px] font-extrabold text-gray-900">Historial de Reportes</h3>
                  <p className="text-[11px] font-medium text-gray-500 mt-0.5">Últimos documentos generados</p>
                </div>
                <button className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Ver todos <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                {historialData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-gray-100 rounded-xl bg-gray-50/50 mt-4">
                    <FileText className="w-12 h-12 text-gray-300 mb-3" strokeWidth={1.5} />
                    <h4 className="text-[14px] font-bold text-gray-800 mb-1">No hay reportes generados</h4>
                    <p className="text-[11px] font-medium text-gray-500">
                      Aún no se ha exportado ningún reporte en el sistema.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[700px] mt-4">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">ARCHIVO</th>
                        <th className="pb-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-center">TIPO</th>
                        <th className="pb-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-center">RANGO DE FECHA</th>
                        <th className="pb-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">CREADO</th>
                        <th className="pb-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-right">ACCIÓN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialData.map((rep) => (
                        <tr key={rep.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${rep.formato === 'PDF' ? 'bg-red-50 text-espoch-red border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                {rep.formato === 'PDF' ? <FileText className="w-4 h-4"/> : <FileSpreadsheet className="w-4 h-4"/>}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[12px] font-extrabold text-gray-900 leading-tight">{rep.nombre}</span>
                                <span className="text-[10px] font-semibold text-gray-400 mt-0.5">{rep.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            {getTipoBadge(rep.tipo)}
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <span className="text-[11px] font-medium text-gray-500">{rep.rango}</span>
                          </td>
                          <td className="py-3.5 px-2">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5"><Calendar className="w-3 h-3 text-gray-400"/> {rep.fecha}</span>
                              <span className="text-[10px] font-medium text-gray-500 mt-0.5 ml-4.5">{rep.creador}</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-right pl-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-espoch-red hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-all shadow-sm">
                                <Download className="w-4 h-4" />
                              </button>
                              <button className="w-8 h-8 rounded-lg border border-transparent text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
