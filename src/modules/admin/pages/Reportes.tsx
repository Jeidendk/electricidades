import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, BookOpen, Clock, Download, FileSpreadsheet, BarChart2,
  Activity, Users, Map as MapIcon, Wrench, Calendar,
  CheckCircle2, ChevronDown, ArrowRight
} from 'lucide-react';
import { useUsuariosStore } from '../../../store/usuariosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useSolicitudesAdminStore } from '../../../store/solicitudesAdminStore';
import { useReportesStore } from '../../../store/reportesStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { ReporteDocentes } from '../components/ReporteDocentes';
import { filasCsvDocentes, metricasDocentes, type ResumenDocente } from '../data/reporteDocentes';
import { exportarExcelDocentes, exportarPdfDocentes } from '../data/exportarReporteDocentes';

/** Fecha corta y legible para la bitácora: "3 sept 2026, 10:47". */
const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-EC', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export const Reportes = () => {
  const { items: usuarios, fetchUsuarios } = useUsuariosStore();
  const { items: espacios, fetchEspacios } = useEspaciosStore();
  const { items: inventario, fetchItems: fetchInventario } = useInventarioStore();
  const { solicitudes, fetchSolicitudes } = useSolicitudesAdminStore();
  const { reportes: historial, fetchReportes, registrarReporte } = useReportesStore();
  const { items: edificios, fetchEdificios } = useEdificiosStore();



  useEffect(() => {
    fetchUsuarios();
    fetchEspacios();
    fetchInventario();
    fetchSolicitudes();
    fetchReportes();
    fetchEdificios();
  }, []);

  const [tipoReporte, setTipoReporte] = useState('Docentes');
  const [docentesSeleccionados, setDocentesSeleccionados] = useState<string[]>([]);
  const [resumenesDocentes, setResumenesDocentes] = useState<ResumenDocente[]>([]);

  const metricas = useMemo(() => metricasDocentes(resumenesDocentes), [resumenesDocentes]);

  const nombreEdificio = useCallback(
    (id: string) => edificios.find((e: any) => e.id === id)?.nombre || id || '—',
    [edificios],
  );

  /** Sin marcar nada se exporta todo: es lo que se espera de un botón que dice "generar". */
  const docentesAExportar = useMemo(() => {
    if (docentesSeleccionados.length === 0) return resumenesDocentes;
    const marcados = new Set(docentesSeleccionados);
    return resumenesDocentes.filter(resumen => marcados.has(resumen.idDocente));
  }, [resumenesDocentes, docentesSeleccionados]);
  const [formato, setFormato] = useState('PDF');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();

    // Por ahora solo la carga docente produce un archivo real; los demás módulos siguen sin
    // implementar y decirlo es mejor que fingir una descarga.
    if (tipoReporte !== 'Docentes') {
      alert('Por ahora solo el reporte de carga docente genera archivo. Elige "Carga docente".');
      return;
    }
    if (docentesAExportar.length === 0) return;

    setIsGenerating(true);
    try {
      const seleccion = docentesSeleccionados.length > 0;

      if (formato === 'Excel') {
        await exportarExcelDocentes(docentesAExportar, nombreEdificio, 'carga-docente.xlsx');
      } else {
        exportarPdfDocentes(docentesAExportar);
      }

      // La bitácora es informativa: que falle no debe deshacer la descarga, que ya ocurrió.
      await registrarReporte({
        tipo: 'Docentes',
        formato,
        filtros: seleccion ? { docentes: docentesAExportar.map(d => d.docente) } : {},
        filas: filasCsvDocentes(docentesAExportar, nombreEdificio).length,
      }).catch(() => {});
      fetchReportes();
    } finally {
      setIsGenerating(false);
    }
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
    <div className="flex flex-col flex-1 min-h-0 bg-[#f4f7fb]">
        {/* HERO SECTION */}
        <div className="w-full min-h-[92px] bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-4 border-b border-gray-800">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
          
          <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
                <BarChart2 className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[12px] font-extrabold text-white tracking-tight leading-none mb-1.5">
                  Reportes y Analíticas
                </h2>
                <p className="text-[11px] text-gray-400 font-medium">Generación de informes exportables del sistema.</p>
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
                        <option value="Docentes">Carga docente (horarios por docente)</option>
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

              {tipoReporte === 'Docentes' && (
                <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 p-4 flex flex-col gap-2">
                  <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">Alcance</span>
                  <span className="text-[13px] font-bold text-gray-900">
                    {docentesSeleccionados.length > 0
                      ? `${docentesAExportar.length} ${docentesAExportar.length === 1 ? 'docente marcado' : 'docentes marcados'}`
                      : `Todos (${resumenesDocentes.length})`}
                  </span>
                  <p className="text-[10px] font-medium text-gray-500 leading-relaxed">
                    {docentesSeleccionados.length > 0
                      ? 'Se exportará solo lo marcado en la tabla de la derecha.'
                      : 'Marca docentes en la tabla de la derecha para exportar únicamente esos.'}
                  </p>
                  <span className="text-[10px] font-bold text-blue-700">
                    {docentesAExportar.reduce((suma, resumen) => suma + resumen.horasSemana, 0)} h/semana en total
                  </span>
                  {docentesSeleccionados.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDocentesSeleccionados([])}
                      className="text-[10px] font-bold text-gray-500 hover:text-gray-900 underline self-start transition-colors"
                    >
                      Quitar selección
                    </button>
                  )}
                </div>
              )}

              <button type="submit" disabled={isGenerating || (tipoReporte === 'Docentes' && docentesAExportar.length === 0)} className="mt-auto py-3.5 rounded-xl bg-[#0f172a] hover:bg-black text-white text-[14px] font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 border border-gray-800">
                {isGenerating ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generando...</>
                ) : (
                  <><Download className="w-4 h-4" /> Generar y Descargar</>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT COL */}
          <div className="flex flex-col gap-6 min-w-0">
            
            {/* Cifras de cabecera. Todas salen de las clases cargadas: ninguna es estimada,
                y no hay comparativas contra "el periodo anterior" porque no se guarda historia. */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { Icono: Users, etiqueta: 'Docentes con carga', valor: metricas.totalDocentes, color: 'text-blue-600 bg-blue-50' },
                { Icono: BookOpen, etiqueta: 'Materias distintas', valor: metricas.totalMaterias, color: 'text-purple-600 bg-purple-50' },
                { Icono: Clock, etiqueta: 'Horas / semana', valor: metricas.totalHoras, color: 'text-emerald-600 bg-emerald-50' },
                { Icono: FileText, etiqueta: 'Reportes generados', valor: historial.length, color: 'text-amber-600 bg-amber-50' },
              ].map(({ Icono, etiqueta, valor, color }) => (
                <div key={etiqueta} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icono className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[20px] font-extrabold text-gray-900 leading-none">{valor}</span>
                    <span className="text-[10px] font-semibold text-gray-500 truncate mt-1">{etiqueta}</span>
                  </div>
                </div>
              ))}
            </div>

            <ReporteDocentes
              seleccionados={docentesSeleccionados}
              onCambiarSeleccion={setDocentesSeleccionados}
              onResumenes={setResumenesDocentes}
              nombreEdificio={nombreEdificio}
            />

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
                {historial.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-gray-100 rounded-xl bg-gray-50/50 mt-4">
                    <FileText className="w-12 h-12 text-gray-300 mb-3" strokeWidth={1.5} />
                    <h4 className="text-[14px] font-bold text-gray-800 mb-1">No hay reportes generados</h4>
                    <p className="text-[11px] font-medium text-gray-500">
                      Aún no se ha exportado ningún reporte en el sistema.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[620px] mt-4">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Tipo</th>
                        <th className="pb-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-center">Formato</th>
                        <th className="pb-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-center">Filas</th>
                        <th className="pb-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Generado por</th>
                        <th className="pb-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-right">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((reporte) => (
                        <tr key={reporte.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${reporte.formato === 'PDF' ? 'bg-red-50 text-espoch-red border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                {reporte.formato === 'PDF' ? <FileText className="w-4 h-4"/> : <FileSpreadsheet className="w-4 h-4"/>}
                              </div>
                              {getTipoBadge(reporte.tipo)}
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <span className="text-[11px] font-bold text-gray-700">{reporte.formato}</span>
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <span className="text-[11px] font-medium text-gray-500">{reporte.filas}</span>
                          </td>
                          <td className="py-3.5 px-2">
                            <span className="text-[11px] font-medium text-gray-600">{reporte.generadoPorNombre || 'Cuenta eliminada'}</span>
                          </td>
                          <td className="py-3.5 text-right pl-4">
                            <span className="text-[11px] font-medium text-gray-500 flex items-center justify-end gap-1.5">
                              <Calendar className="w-3 h-3 text-gray-400"/> {formatearFecha(reporte.created_at)}
                            </span>
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
