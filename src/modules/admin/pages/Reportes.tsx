import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, BookOpen, Clock, Download, FileSpreadsheet, BarChart2,
  Users, Calendar, CheckCircle2, ChevronDown, ChevronRight, Eye, Trash2, X
} from 'lucide-react';
import { useReportesStore, type Reporte } from '../../../store/reportesStore';
import { DataTable } from '../../../components/ui/DataTable';
import { AcentoTarjeta } from '../../../components/ui/AcentoTarjeta';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { ReporteDocentes } from '../components/ReporteDocentes';
import { filasCsvDocentes, metricasDocentes, type ResumenDocente } from '../data/reporteDocentes';
import { exportarExcelDocentes, exportarPdfDocentes } from '../data/exportarReporteDocentes';

type AccionRapida = 'vista_previa' | 'limpiar';

/**
 * Acciones del panel. No hay "Programar reporte": recibir un informe automáticamente exige
 * tareas en el servidor, y un botón que lo prometa sin ellas no cumpliría.
 */
const ACCIONES_RAPIDAS: {
  clave: AccionRapida; Icono: React.ElementType; titulo: string; detalle: string; color: string;
}[] = [
  { clave: 'vista_previa', Icono: Eye, titulo: 'Vista previa de selección',
    detalle: 'Revisa qué docentes se incluyen', color: 'bg-blue-50 text-blue-600' },
  { clave: 'limpiar', Icono: Trash2, titulo: 'Limpiar selección',
    detalle: 'Vuelve a incluir a todos', color: 'bg-red-50 text-red-500' },
];

/** Fecha corta y legible para la bitácora: "3 sept 2026, 10:47". */
const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-EC', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export const Reportes = () => {
  const { reportes: historial, fetchReportes, registrarReporte } = useReportesStore();
  const { items: edificios, fetchEdificios } = useEdificiosStore();



  useEffect(() => {
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

  const [vistaPreviaAbierta, setVistaPreviaAbierta] = useState(false);

  const ejecutarAccionRapida = (accion: AccionRapida) => {
    if (accion === 'vista_previa') {
      setVistaPreviaAbierta(true);
      return;
    }
    setDocentesSeleccionados([]);
  };

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
            {/* Las cifras del banner describen lo que esta pantalla reporta: la carga docente.
                Antes contaban usuarios, activos y trámites, que no son de aquí. */}
            <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
              {[
                { Icono: Users, valor: metricas.totalDocentes, etiqueta: 'Docentes con carga' },
                { Icono: BookOpen, valor: metricas.totalMaterias, etiqueta: 'Materias distintas' },
                { Icono: Clock, valor: metricas.totalHoras, etiqueta: 'Horas / semana' },
                { Icono: FileText, valor: historial.length, etiqueta: 'Reportes generados' },
              ].map(({ Icono, valor, etiqueta }, indice) => (
                <Fragment key={etiqueta}>
                  {indice > 0 && <div className="w-px h-8 bg-white/10 mx-1" />}
                  <div className="flex items-center gap-3">
                    <Icono className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                    <div className="flex flex-col">
                      <span className="text-[15px] font-bold text-white leading-tight">{valor}</span>
                      <span className="text-[10px] font-medium text-gray-400 leading-none whitespace-nowrap">{etiqueta}</span>
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      
      <div className="flex-1 flex flex-col p-6 md:p-8 min-h-0 overflow-hidden bg-[#f4f7fb]/90 backdrop-blur-xl animate-fade-in">
      {/* CONTENT GRID */}
      <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden custom-scrollbar flex flex-col gap-6 pr-2">
        


        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 flex-1 min-h-0">
          
          {/* LEFT: Generador de Reportes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-espoch-red flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-gray-900 leading-tight">Generar Nuevo Reporte</h3>
                <p className="text-[10px] font-medium text-gray-500">Configure los parámetros de su reporte.</p>
              </div>
            </div>
            
            <form onSubmit={handleGenerateReport} className="flex flex-col gap-6 flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-6 pr-1">
              <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">MÓDULO / TIPO DE DATOS</label>
                  <div className="relative">
                    <select value={tipoReporte} onChange={e => setTipoReporte(e.target.value)} className="appearance-none w-full bg-white text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-red font-medium cursor-pointer transition-all shadow-sm">
                        <option value="Docentes">Carga docente (horarios por docente)</option>
                        <option value="Historial">Historial de reportes generados</option>
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
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">Acciones rápidas</label>
                  <div className="rounded-xl border border-gray-200/70 bg-gray-50/40 divide-y divide-gray-200/60 overflow-hidden">
                    {ACCIONES_RAPIDAS.map(({ clave, Icono, titulo, detalle, color }) => (
                      <button
                        key={clave}
                        type="button"
                        onClick={() => ejecutarAccionRapida(clave)}
                        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-white transition-colors text-left"
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                          <Icono className="w-3.5 h-3.5" />
                        </span>
                        <span className="flex flex-col min-w-0 flex-1">
                          <span className="text-[11px] font-bold text-gray-800">{titulo}</span>
                          <span className="text-[9px] font-medium text-gray-500 truncate">{detalle}</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              </div>

              <button type="submit" disabled={isGenerating || (tipoReporte === 'Docentes' && docentesAExportar.length === 0)} className="shrink-0 py-3.5 rounded-xl bg-[#0f172a] hover:bg-black text-white text-[14px] font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 border border-gray-800">
                {isGenerating ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generando...</>
                ) : (
                  <><Download className="w-4 h-4" /> Generar y Descargar</>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT COL */}
          <div className="flex flex-col gap-6 min-w-0 min-h-0">
            
            {/* Una sola tabla: el selector de la izquierda decide qué se muestra. Antes había dos
                apiladas —la carga docente y el historial— y la pantalla no cabía a 100%. */}
            {tipoReporte === 'Docentes' && (
              <ReporteDocentes
              seleccionados={docentesSeleccionados}
              onCambiarSeleccion={setDocentesSeleccionados}
              onResumenes={setResumenesDocentes}
              nombreEdificio={nombreEdificio}
              />
            )}


            {tipoReporte === 'Historial' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col min-w-0 flex-1 min-h-0 relative overflow-hidden">
                <AcentoTarjeta />
                <div className="mb-4">
                  <h3 className="text-[16px] font-extrabold text-gray-900">Historial de reportes</h3>
                  <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                    Se guarda el registro de lo generado, no el archivo: el reporte se vuelve a producir cuando haga falta.
                  </p>
                </div>

                <DataTable
                  fill
                  rows={historial}
                  rowKey={(reporte: Reporte) => reporte.id}
                  minWidthClass="min-w-[620px]"
                  defaultPerPage={8}
                  emptyState={
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mb-3" strokeWidth={1.5} />
                      <h4 className="text-[14px] font-bold text-gray-800 mb-1">No hay reportes generados</h4>
                      <p className="text-[11px] font-medium text-gray-500">
                        Aún no se ha exportado ningún reporte en el sistema.
                      </p>
                    </div>
                  }
                  columns={[
                    {
                      key: 'tipo',
                      header: 'Tipo',
                      width: '1.4fr',
                      sortValue: (reporte: Reporte) => reporte.tipo,
                      render: (reporte: Reporte) => (
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${reporte.formato === 'PDF' ? 'bg-red-50 text-espoch-red border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                            {reporte.formato === 'PDF' ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                          </span>
                          {getTipoBadge(reporte.tipo)}
                        </div>
                      ),
                    },
                    {
                      key: 'formato',
                      header: 'Formato',
                      width: '110px',
                      align: 'center',
                      sortValue: (reporte: Reporte) => reporte.formato,
                      render: (reporte: Reporte) => <span className="text-[11px] font-bold text-gray-700">{reporte.formato}</span>,
                    },
                    {
                      key: 'filas',
                      header: 'Filas',
                      width: '90px',
                      align: 'center',
                      sortValue: (reporte: Reporte) => reporte.filas,
                      render: (reporte: Reporte) => <span className="text-[11px] font-medium text-gray-500">{reporte.filas}</span>,
                    },
                    {
                      key: 'autor',
                      header: 'Generado por',
                      width: '1.4fr',
                      sortValue: (reporte: Reporte) => reporte.generadoPorNombre || '',
                      render: (reporte: Reporte) => (
                        <span className="text-[11px] font-medium text-gray-600 truncate">
                          {reporte.generadoPorNombre || 'Cuenta eliminada'}
                        </span>
                      ),
                    },
                    {
                      key: 'fecha',
                      header: 'Fecha',
                      width: '190px',
                      align: 'right',
                      sortValue: (reporte: Reporte) => reporte.created_at,
                      render: (reporte: Reporte) => (
                        <span className="text-[11px] font-medium text-gray-500 flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Calendar className="w-3 h-3 text-gray-400" /> {formatearFecha(reporte.created_at)}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            )}
            {tipoReporte !== 'Docentes' && tipoReporte !== 'Historial' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 flex flex-col items-center text-center gap-3">
                <BarChart2 className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
                <h3 className="text-[14px] font-bold text-gray-800">Este reporte todavía no está disponible</h3>
                <p className="text-[11px] font-medium text-gray-500 max-w-[360px] leading-relaxed">
                  Por ahora solo están implementados la carga docente y el historial. Elige uno de
                  esos dos en el selector de la izquierda.
                </p>
              </div>
            )}


          </div>
        </div>
      </div>
      </div>

      {/* Vista previa: qué se va a incluir, antes de generar nada. */}
      {vistaPreviaAbierta && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setVistaPreviaAbierta(false)} />
          <div className="relative z-10 w-full max-w-[520px] max-h-[80vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">Vista previa de la selección</h3>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                  {docentesAExportar.length} {docentesAExportar.length === 1 ? 'docente' : 'docentes'} ·{' '}
                  {docentesAExportar.reduce((suma, r) => suma + r.horasSemana, 0)} h/semana · formato {formato}
                </p>
              </div>
              <button
                onClick={() => setVistaPreviaAbierta(false)}
                className="text-gray-400 hover:text-gray-700 bg-white shadow-sm border border-gray-200 rounded-full p-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar divide-y divide-gray-100">
              {docentesAExportar.length === 0 ? (
                <p className="text-[12px] text-gray-400 font-medium text-center py-6">
                  No hay docentes que incluir.
                </p>
              ) : docentesAExportar.map(resumen => (
                <div key={resumen.idDocente} className="py-2 flex items-center justify-between gap-3">
                  <span className="text-[12px] font-bold text-gray-800 truncate">{resumen.docente}</span>
                  <span className="text-[10px] font-bold text-blue-700 shrink-0">{resumen.horasSemana} h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
