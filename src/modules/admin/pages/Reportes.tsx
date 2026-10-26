import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, BookOpen, Clock, Download, BarChart2,
  Users, Calendar, CheckCircle2, ChevronRight, Eye, Trash2, X, Building2,
} from 'lucide-react';
import { useReportesStore } from '../../../store/reportesStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { useClasesStore } from '../../../store/clasesStore';
import { mapearClases } from '../components/Horarios/mapearClases';
import { CAMPOS_CLASE_POR_DEFECTO } from '../components/Horarios/horariosData';
import { exportarHorariosWord, imprimirHorariosPdf, ubicacionesConClases, type OpcionesHorario } from '../data/exportarHorarios';
import { ReporteDocentes } from '../components/ReporteDocentes';
import { filasCsvDocentes, metricasDocentes, type ResumenDocente } from '../data/reporteDocentes';
import { exportarPdfDocentes, exportarWordDocentes } from '../data/exportarReporteDocentes';
import { avisoError, avisoInfo } from '../../../lib/aviso';

type AccionRapida = 'vista_previa' | 'limpiar';
type FormatoReporte = 'PDF' | 'Word';

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
  const { items: espacios, fetchEspacios } = useEspaciosStore();
  const { carreras, fetchAll: fetchFacultades } = useFacultadesStore();
  const { clases: clasesRaw, fetchClases } = useClasesStore();
  const clases = useMemo(() => mapearClases(clasesRaw, carreras), [clasesRaw, carreras]);



  useEffect(() => {
    fetchReportes();
    fetchEdificios();
    fetchEspacios();
    fetchFacultades();
    fetchClases();
  }, []);

  const [alcanceHorarios, setAlcanceHorarios] = useState<'edificio' | 'facultad'>('edificio');
  const [edificioHorariosId, setEdificioHorariosId] = useState('');
  const [horarioConfig, setHorarioConfig] = useState<Pick<OpcionesHorario, 'orientation' | 'paperSize' | 'typography' | 'documentFontSize' | 'exportPeriodo' | 'includeFooter' | 'camposClase'>>(() => {
    let guardado: Partial<OpcionesHorario> = {};
    try { guardado = JSON.parse(localStorage.getItem('horario-export-prefs') || '{}'); } catch { /* preferencias opcionales */ }
    return {
      orientation: 'horizontal',
      paperSize: 'A4',
      typography: 'Times New Roman',
      documentFontSize: 6,
      exportPeriodo: guardado.exportPeriodo ?? 'MARZO 2026 - SEPTIEMBRE 2026',
      includeFooter: guardado.includeFooter ?? true,
      camposClase: { ...CAMPOS_CLASE_POR_DEFECTO, ...guardado.camposClase },
    };
  });
  const edificiosConHorario = useMemo(() => {
    const ids = new Set(clases.map(clase => clase.idEspacio));
    const edificiosIds = new Set(espacios.filter(espacio => ids.has(espacio.id)).map(espacio => espacio.id_edificio));
    return [...edificios].filter(edificio => edificiosIds.has(edificio.id)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [edificios, espacios, clases]);
  const edificioHorariosVigente = edificiosConHorario.some(edificio => edificio.id === edificioHorariosId)
    ? edificioHorariosId : edificiosConHorario[0]?.id ?? '';
  const ubicacionesHorario = useMemo(() => ubicacionesConClases(
    edificios, espacios, clases, alcanceHorarios === 'edificio' ? edificioHorariosVigente : undefined,
  ), [edificios, espacios, clases, alcanceHorarios, edificioHorariosVigente]);
  const resumenEdificiosHorario = useMemo(() => {
    const grupos = new Map<string, { edificio: any; espacios: any[] }>();
    ubicacionesHorario.forEach(ubicacion => {
      const grupo = grupos.get(ubicacion.edificio.id) ?? {
        edificio: edificios.find(edificio => edificio.id === ubicacion.edificio.id) ?? ubicacion.edificio,
        espacios: [],
      };
      const espacioCompleto = espacios.find(espacio => espacio.id === ubicacion.espacio.id) ?? ubicacion.espacio;
      grupo.espacios.push(espacioCompleto);
      grupos.set(ubicacion.edificio.id, grupo);
    });
    return [...grupos.values()].map(grupo => ({
      ...grupo,
      espacios: grupo.espacios.sort((a, b) => (a.piso ?? 0) - (b.piso ?? 0) || a.nombre.localeCompare(b.nombre, 'es')),
    }));
  }, [ubicacionesHorario, edificios, espacios]);
  const opcionesHorario: OpcionesHorario = {
    ...horarioConfig,
    headerImg: localStorage.getItem('espoch_header_img') || '',
    footerImg: localStorage.getItem('espoch_footer_img') || '',
    clases,
  };

  const [tipoReporte, setTipoReporte] = useState('Docentes');
  /**
   * Dos vistas: la grilla de tarjetas por tipo de reporte (como un catálogo) y el panel detalle
   * con el generador. Se arranca en la grilla y se entra al detalle al elegir una tarjeta: así
   * no caes directo en el formulario de carga docente al abrir Reportes.
   */
  const [vistaReportes, setVistaReportes] = useState<'inicio' | 'detalle'>('inicio');
  const tituloReporteActivo = ({
    Docentes: 'Carga docente',
    Horarios: 'Horarios por aula',
    Historial: 'Historial de reportes',
  } as Record<string, string>)[tipoReporte] ?? tipoReporte;
  const abrirReporte = (tipo: string) => {
    setTipoReporte(tipo);
    setFormato('PDF');
    setVistaReportes('detalle');
  };

  /** KPIs sobre la bitácora de reportes generados. */
  const kpisBitacora = useMemo(() => {
    const ahora = new Date();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
    const inicioSemana = inicioDia - ahora.getDay() * 24 * 60 * 60 * 1000;
    const hoy = historial.filter(r => new Date(r.created_at).getTime() >= inicioDia).length;
    const semana = historial.filter(r => new Date(r.created_at).getTime() >= inicioSemana).length;
    return { total: historial.length, hoy, semana };
  }, [historial]);
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
  const [formato, setFormato] = useState<FormatoReporte>('PDF');
  const [isGenerating, setIsGenerating] = useState(false);

  const [vistaPreviaAbierta, setVistaPreviaAbierta] = useState(false);

  const ejecutarAccionRapida = (accion: AccionRapida) => {
    if (accion === 'vista_previa') {
      setVistaPreviaAbierta(true);
      return;
    }
    setDocentesSeleccionados([]);
  };

  const generarReporte = async (formatoElegido: FormatoReporte) => {
    setFormato(formatoElegido);

    if (tipoReporte === 'Horarios') {
      if (ubicacionesHorario.length === 0) {
        void avisoInfo('No hay horarios', 'No hay aulas con clases para el alcance elegido.');
        return;
      }
      setIsGenerating(true);
      try {
        const edificio = edificios.find(item => item.id === edificioHorariosVigente);
        const nombre = alcanceHorarios === 'edificio' ? `Horarios_${edificio?.nombre || 'Edificio'}` : 'Horarios_Facultad';
        if (formatoElegido === 'Word') {
          await exportarHorariosWord(ubicacionesHorario, `${nombre}.docx`, opcionesHorario);
        } else {
          await imprimirHorariosPdf(ubicacionesHorario, nombre, opcionesHorario);
        }
        await registrarReporte({
          tipo: 'Horarios', formato: formatoElegido,
          filtros: alcanceHorarios === 'edificio' ? { edificio: edificio?.nombre } : { alcance: 'facultad' },
          filas: ubicacionesHorario.length,
        }).catch(() => {});
        fetchReportes();
      } catch (error) {
        console.error('No se pudo generar el reporte de horarios:', error);
        void avisoError('No se pudo generar el reporte', 'Vuelve a intentar la descarga de horarios.');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // La carga docente y los horarios producen archivos reales; los demás módulos siguen sin
    // implementar y decirlo es mejor que fingir una descarga.
    if (tipoReporte !== 'Docentes') {
      void avisoInfo('Reporte no disponible', 'Por ahora están disponibles la carga docente y los horarios por aula.');
      return;
    }
    if (docentesAExportar.length === 0) return;

    setIsGenerating(true);
    try {
      const seleccion = docentesSeleccionados.length > 0;

      if (formatoElegido === 'Word') {
        await exportarWordDocentes(docentesAExportar, nombreEdificio);
      } else {
        exportarPdfDocentes(docentesAExportar);
      }

      // La bitácora es informativa: que falle no debe deshacer la descarga, que ya ocurrió.
      await registrarReporte({
        tipo: 'Docentes',
        formato: formatoElegido,
        filtros: seleccion ? { docentes: docentesAExportar.map(d => d.docente) } : {},
        filas: filasCsvDocentes(docentesAExportar, nombreEdificio).length,
      }).catch(() => {});
      fetchReportes();
    } finally {
      setIsGenerating(false);
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
              <div className="flex flex-col gap-1.5">
                {vistaReportes === 'detalle' ? (
                  <nav className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.08em]" aria-label="Ruta de reportes">
                    <button
                      type="button"
                      onClick={() => setVistaReportes('inicio')}
                      className="text-gray-400 transition-colors hover:text-white"
                    >
                      Reportes
                    </button>
                    <ChevronRight className="h-3 w-3 text-gray-600" aria-hidden="true" />
                    <span className="text-espoch-yellow">{tituloReporteActivo}</span>
                  </nav>
                ) : (
                  <h2 className="text-[12px] font-extrabold text-white tracking-tight leading-none">
                    Reportes y Analíticas
                  </h2>
                )}
                <p className="text-[11px] text-gray-400 font-medium">Generación de informes exportables del sistema.</p>
              </div>
            </div>
            {/* Las cifras del banner describen lo que esta pantalla reporta: la carga docente.
                Antes contaban usuarios, activos y trámites, que no son de aquí. */}
            <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
              {(tipoReporte === 'Horarios' ? [
                { Icono: Building2, valor: new Set(ubicacionesHorario.map(item => item.edificio.id)).size, etiqueta: 'Edificios' },
                { Icono: BookOpen, valor: ubicacionesHorario.length, etiqueta: 'Aulas con clases' },
                { Icono: Clock, valor: clases.length, etiqueta: 'Clases cargadas' },
                { Icono: FileText, valor: historial.length, etiqueta: 'Reportes generados' },
              ] : [
                { Icono: Users, valor: metricas.totalDocentes, etiqueta: 'Docentes con carga' },
                { Icono: BookOpen, valor: metricas.totalMaterias, etiqueta: 'Materias distintas' },
                { Icono: Clock, valor: metricas.totalHoras, etiqueta: 'Horas / semana' },
                { Icono: FileText, valor: historial.length, etiqueta: 'Reportes generados' },
              ]).map(({ Icono, valor, etiqueta }, indice) => (
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
      
      {/* VISTA INICIO: catálogo de reportes como grilla de tarjetas. */}
      {vistaReportes === 'inicio' && (
      <div className="flex-1 overflow-y-auto bg-[#f4f7fb] p-6 md:p-8 animate-fade-in">
        <div className="flex w-full flex-col gap-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-[18px] font-extrabold text-gray-900">Catálogo de reportes</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">Elige un reporte para configurarlo y generarlo.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                <FileText className="w-4 h-4 text-espoch-red" />
                <span className="text-[11px] font-bold text-gray-700">{kpisBitacora.total}</span>
                <span className="text-[10px] text-gray-500">generados</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-[11px] font-bold text-gray-700">{kpisBitacora.hoy}</span>
                <span className="text-[10px] text-gray-500">hoy</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-[11px] font-bold text-gray-700">{kpisBitacora.semana}</span>
                <span className="text-[10px] text-gray-500">esta semana</span>
              </div>
            </div>
          </div>

          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {([
              { tipo: 'Docentes', titulo: 'Carga docente', descripcion: 'Horas semanales por docente, materias y aulas asignadas.', Icono: Users, color: 'red', disponible: true },
              { tipo: 'Horarios', titulo: 'Horarios por aula', descripcion: 'Grilla semanal exportable por aula, edificio o toda la facultad.', Icono: Clock, color: 'blue', disponible: true },
              { tipo: 'Historial', titulo: 'Historial de reportes', descripcion: 'Bitácora de lo generado: qué, cuándo y quién lo pidió.', Icono: FileText, color: 'green', disponible: true },
              { tipo: 'Inventario', titulo: 'Inventario', descripcion: 'Equipos, mobiliario y estado del catálogo.', Icono: BookOpen, color: 'orange', disponible: false },
              { tipo: 'Infraestructura', titulo: 'Infraestructura', descripcion: 'Edificios, aulas y laboratorios registrados.', Icono: Building2, color: 'purple', disponible: false },
              { tipo: 'Mantenimiento', titulo: 'Mantenimiento', descripcion: 'Órdenes abiertas, cerradas y promedio de resolución.', Icono: BarChart2, color: 'gray', disponible: false },
            ] as const).map(opcion => {
              const colores: Record<string, string> = {
                red: 'bg-red-50 text-espoch-red group-hover:bg-red-100',
                blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
                green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
                orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
                purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
                gray: 'bg-gray-100 text-gray-500 group-hover:bg-gray-200',
              };
              return (
                <button
                  key={opcion.tipo}
                  onClick={() => opcion.disponible && abrirReporte(opcion.tipo)}
                  disabled={!opcion.disponible}
                  className={`group relative flex min-h-[118px] h-full flex-col text-left bg-white border border-gray-200/70 rounded-2xl p-5 shadow-sm transition-all ${opcion.disponible ? 'hover:border-espoch-red/30 hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${colores[opcion.color]}`}>
                      <opcion.Icono className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[14px] font-extrabold text-gray-900 truncate">{opcion.titulo}</h4>
                        {!opcion.disponible && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Pronto</span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-gray-500 mt-1 leading-relaxed">{opcion.descripcion}</p>
                    </div>
                  </div>
                  {opcion.disponible && (
                    <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-gray-400">
                      <span>Configurar y generar</span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-espoch-red transition-colors" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* VISTA DETALLE: el panel de configuración y generación que ya existía. */}
      {vistaReportes === 'detalle' && (
      <div className="flex-1 flex flex-col p-6 md:p-8 min-h-0 overflow-hidden bg-[#f4f7fb]/90 backdrop-blur-xl animate-fade-in">
        {/* Los indicadores permanecen al inicio del contenido; el rastro de navegación ahora
            vive en el encabezado oscuro para evitar una franja adicional bajo el banner. */}
        <div className="shrink-0 mb-5 flex flex-col gap-5">
          {/* 4 KPIs blancos, estilo del mock. Honestos: no hay "Pendientes" ni "Plantillas"
              porque la bitácora no los tiene, así que se muestran métricas que sí existen. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { Icono: FileText, color: 'bg-green-50 text-green-600', titulo: 'Reportes generados', valor: kpisBitacora.total, detalle: 'En total' },
              { Icono: Calendar, color: 'bg-blue-50 text-blue-600', titulo: 'Hoy', valor: kpisBitacora.hoy, detalle: 'Exportados hoy' },
              { Icono: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', titulo: 'Esta semana', valor: kpisBitacora.semana, detalle: 'Últimos 7 días' },
              { Icono: BarChart2, color: 'bg-indigo-50 text-indigo-600', titulo: 'Tipos activos', valor: 3, detalle: 'Reportes disponibles' },
            ].map(kpi => (
              <div key={kpi.titulo} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                  <kpi.Icono className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-500 leading-tight">{kpi.titulo}</p>
                  <p className="text-[22px] font-extrabold text-gray-900 leading-tight mt-1">{kpi.valor}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{kpi.detalle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* CONTENT GRID */}
      <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden custom-scrollbar flex flex-col gap-6 pr-2">



        <div className="grid grid-cols-1 xl:grid-cols-[440px_minmax(0,1fr)] 2xl:grid-cols-[460px_minmax(0,1fr)] gap-6 flex-1 min-h-0">

          {/* LEFT: Generador de Reportes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-6 flex flex-col min-h-0">
            {/* Cabecera estilo mock: ícono verde + título + descripción. */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[13px] font-extrabold text-gray-900 leading-tight">Configuración del reporte</h3>
                <p className="text-[10.5px] text-gray-500 mt-0.5">Personaliza los parámetros antes de generar la vista previa.</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-6 flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-6 pr-1">
              {tipoReporte !== 'Horarios' && <div className="flex flex-col gap-2">
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
              </div>}

              {tipoReporte === 'Horarios' && (
                <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Qué horarios incluir</label>
                  <select value={alcanceHorarios} onChange={e => setAlcanceHorarios(e.target.value as 'edificio' | 'facultad')} className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-[12px] font-semibold text-gray-800">
                    <option value="edificio">Todas las aulas de un edificio</option>
                    <option value="facultad">Toda la facultad, por edificio</option>
                  </select>
                  {alcanceHorarios === 'edificio' && (
                    <select value={edificioHorariosVigente} onChange={e => setEdificioHorariosId(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-[12px] font-semibold text-gray-800">
                      {edificiosConHorario.length === 0 && <option value="">Sin edificios con horarios</option>}
                      {edificiosConHorario.map(edificio => <option key={edificio.id} value={edificio.id}>{edificio.nombre}</option>)}
                    </select>
                  )}
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Período académico</label>
                  <input value={horarioConfig.exportPeriodo} onChange={e => setHorarioConfig(actual => ({ ...actual, exportPeriodo: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-[11px] font-semibold text-gray-800" />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-semibold text-gray-600">Orientación
                      <select value={horarioConfig.orientation} onChange={e => setHorarioConfig(actual => ({ ...actual, orientation: e.target.value as 'vertical' | 'horizontal' }))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-[11px]"><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select>
                    </label>
                    <label className="text-[10px] font-semibold text-gray-600">Papel
                      <select value={horarioConfig.paperSize} onChange={e => setHorarioConfig(actual => ({ ...actual, paperSize: e.target.value as 'A4' | 'Carta' }))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-[11px]"><option value="A4">A4</option><option value="Carta">Carta</option></select>
                    </label>
                    <label className="text-[10px] font-semibold text-gray-600">Tamaño de letra (pt)
                      <input type="number" min="5" max="30" value={horarioConfig.documentFontSize} onChange={e => setHorarioConfig(actual => ({ ...actual, documentFontSize: Number(e.target.value) || 10 }))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-[11px]" />
                    </label>
                    <label className="text-[10px] font-semibold text-gray-600">Tipografía
                      <select value={horarioConfig.typography} onChange={e => setHorarioConfig(actual => ({ ...actual, typography: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-[11px]"><option>Inter</option><option>Roboto</option><option>Montserrat</option><option>Open Sans</option><option>Arial</option><option>Times New Roman</option></select>
                    </label>
                  </div>
                  <div className="flex flex-col gap-1.5 border-t border-gray-200 pt-3">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Datos de clase</span>
                    {([
                      ['paoParalelo', 'PAO y paralelo'], ['carrera', 'Carrera'], ['docente', 'Docente'],
                    ] as const).map(([clave, etiqueta]) => (
                      <label key={clave} className="flex items-center gap-2 text-[10px] font-semibold text-gray-700">
                        <input type="checkbox" checked={horarioConfig.camposClase[clave]} onChange={e => setHorarioConfig(actual => ({ ...actual, camposClase: { ...actual.camposClase, [clave]: e.target.checked } }))} className="accent-espoch-red" />{etiqueta}
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700"><input type="checkbox" checked={horarioConfig.includeFooter} onChange={e => setHorarioConfig(actual => ({ ...actual, includeFooter: e.target.checked }))} className="accent-espoch-red" />Pie institucional</label>
                  <p className="text-[10px] text-gray-500">{ubicacionesHorario.length} {ubicacionesHorario.length === 1 ? 'aula con clases' : 'aulas con clases'} en la selección.</p>
                </div>
              )}

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

            </div>
          </div>

          {/* RIGHT COL: información y selección del reporte activo. */}
          <div className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm ${tipoReporte === 'Horarios' || tipoReporte === 'Docentes' ? 'relative before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-amber-400 before:via-orange-500 before:to-red-700' : ''}`}>
            {tipoReporte === 'Horarios' && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 pb-4 pt-5">
                <div className="min-w-0">
                  <h3 className="truncate text-[13px] font-extrabold leading-tight text-gray-900">Horarios por aula</h3>
                  <p className="mt-0.5 truncate text-[10.5px] text-gray-500">Cada aula se coloca después de la anterior, agrupada por edificio.</p>
                </div>
              </div>
            )}
            <div className="min-w-0 min-h-0 flex-1 overflow-auto custom-scrollbar bg-white p-4">
            <div className="flex min-h-full w-full flex-col gap-4">

            {/* Una sola tabla: el selector de la izquierda decide qué se muestra. Antes había dos
                apiladas —la carga docente y el historial— y la pantalla no cabía a 100%. */}
            {tipoReporte === 'Horarios' && (
              <div className="flex w-full flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3.5">
                    <p className="text-[9px] font-extrabold text-slate-500">Edificios incluidos</p>
                    <p className="mt-1 text-[20px] font-extrabold text-slate-900">{resumenEdificiosHorario.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3.5">
                    <p className="text-[9px] font-extrabold text-slate-500">Aulas con clases</p>
                    <p className="mt-1 text-[20px] font-extrabold text-slate-900">{ubicacionesHorario.length}</p>
                  </div>
                </div>
                {ubicacionesHorario.length === 0 ? (
                  <p className="text-center text-[10.5px] text-gray-500 py-8 italic">No hay aulas con clases para esta selección.</p>
                ) : (
                  <div className="space-y-3">
                    {resumenEdificiosHorario.map(({ edificio, espacios: aulas }) => (
                      <section key={edificio.id} className="min-h-[150px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                          <h5 className="truncate text-[10px] font-extrabold uppercase tracking-tight text-slate-800">{edificio.nombre}</h5>
                          <span className="shrink-0 text-[8.5px] font-bold text-slate-500">{aulas.length} {aulas.length === 1 ? 'aula' : 'aulas'}</span>
                        </div>
                        <div className="flex flex-wrap content-start gap-2 p-4">
                          {aulas.map(espacio => (
                            <span key={espacio.id} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold text-slate-600 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50/40 hover:text-red-700">
                              {espacio.nombre}
                            </span>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tipoReporte === 'Docentes' && (
              <ReporteDocentes
                seleccionados={docentesSeleccionados}
                onCambiarSeleccion={setDocentesSeleccionados}
                onResumenes={setResumenesDocentes}
                nombreEdificio={nombreEdificio}
              />
            )}


            {tipoReporte === 'Historial' && (
              <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <h4 className="text-[12px] font-extrabold text-slate-900">Reportes generados</h4>
                    <p className="mt-0.5 text-[9px] text-slate-500">{historial.length} {historial.length === 1 ? 'registro' : 'registros'} en la bitácora</p>
                  </div>
                  <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-bold text-slate-600">Últimos 12</span>
                </div>
                {historial.length === 0 ? (
                  <p className="text-center text-[10.5px] text-gray-500 py-8 italic">Aún no se ha exportado ningún reporte.</p>
                ) : (
                  <table className="w-full text-[10px] border-collapse">
                    <thead className="bg-gray-100 border-b-2 border-gray-300 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-bold text-gray-700 w-8">#</th>
                        <th className="text-left px-2 py-1.5 font-bold text-gray-700">Tipo</th>
                        <th className="text-left px-2 py-1.5 font-bold text-gray-700 w-16">Formato</th>
                        <th className="text-left px-2 py-1.5 font-bold text-gray-700">Generado por</th>
                        <th className="text-right px-2 py-1.5 font-bold text-gray-700">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.slice(0, 12).map((r, i) => (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="px-2 py-1 text-gray-500">{i + 1}</td>
                          <td className="px-2 py-1 text-gray-800">{r.tipo}</td>
                          <td className="px-2 py-1 text-gray-700 font-semibold">{r.formato}</td>
                          <td className="px-2 py-1 text-gray-700 truncate">{r.generadoPorNombre || 'Cuenta eliminada'}</td>
                          <td className="px-2 py-1 text-right text-gray-500">{formatearFecha(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {historial.length > 12 && (
                  <p className="border-t border-slate-100 py-2 text-center text-[9px] italic text-gray-400">...y {historial.length - 12} más.</p>
                )}
              </div>
            )}
            {tipoReporte !== 'Docentes' && tipoReporte !== 'Historial' && tipoReporte !== 'Horarios' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 flex flex-col items-center text-center gap-3">
                <BarChart2 className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
                <h3 className="text-[14px] font-bold text-gray-800">Este reporte todavía no está disponible</h3>
                <p className="text-[11px] font-medium text-gray-500 max-w-[360px] leading-relaxed">
                  Por ahora están implementados la carga docente, los horarios y el historial. Elige uno de
                  esos tipos en el selector de la izquierda.
                </p>
              </div>
            )}


            </div>
            </div>
            {/* PDF y Word son las únicas acciones de descarga. Ambos generan el archivo
                directamente y solo se deshabilitan para la bitácora o una selección vacía. */}
            <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-2 text-[10.5px] text-gray-400">
                <Eye className="w-3.5 h-3.5" />
                <span>El archivo se genera al exportar; no hay archivo guardado hasta entonces.</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => { if (tipoReporte === 'Docentes' || tipoReporte === 'Horarios') void generarReporte('PDF'); }}
                  disabled={isGenerating || tipoReporte === 'Historial' || (tipoReporte === 'Docentes' && docentesAExportar.length === 0) || (tipoReporte === 'Horarios' && ubicacionesHorario.length === 0)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 text-[11.5px] font-bold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText className="w-3.5 h-3.5" /> Exportar PDF
                </button>
                <button
                  type="button"
                  onClick={() => { if (tipoReporte === 'Docentes' || tipoReporte === 'Horarios') void generarReporte('Word'); }}
                  disabled={isGenerating || tipoReporte === 'Historial' || (tipoReporte === 'Docentes' && docentesAExportar.length === 0) || (tipoReporte === 'Horarios' && ubicacionesHorario.length === 0)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-800 bg-[#0f172a] hover:bg-black text-white text-[11.5px] font-bold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar Word
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}

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
