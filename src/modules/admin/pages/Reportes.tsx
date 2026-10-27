import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, BookOpen, Clock, Download, BarChart2,
  Users, Calendar, ChevronRight, Eye, X, Building2,
  Search, ArrowLeft, Filter, RefreshCcw, ChevronLeft, ChevronDown,
  LayoutGrid, Armchair, CheckCircle2, SlidersHorizontal,
  Printer, Maximize2, Minimize2, ZoomIn, ZoomOut, Check, Bookmark,
} from 'lucide-react';
import { useReportesStore } from '../../../store/reportesStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { useClasesStore } from '../../../store/clasesStore';
import { mapearClases } from '../components/Horarios/mapearClases';
import { CAMPOS_CLASE_POR_DEFECTO, dias, diasFormales, horas, rangoIncluyeBloque, etiquetaPaoParalelo } from '../components/Horarios/horariosData';
import { PlantillaPDF } from '../components/Horarios/PlantillaPDF';
import { exportarHorariosWord, imprimirHorariosPdf, ubicacionesConClases, type OpcionesHorario } from '../data/exportarHorarios';
import { resumirDocentes, type ResumenDocente } from '../data/reporteDocentes';
import { exportarPdfDocentes, exportarWordDocentes } from '../data/exportarReporteDocentes';
import { calcularDisponibilidad, minutosHora, mostrarHora } from '../../../lib/disponibilidadEspacios';
import { normalizarTexto, mismoDia } from '../../../lib/texto';
import { exportarPdfDisponibilidad, exportarWordDisponibilidad } from '../data/exportarDisponibilidad';
import { exportarPdfHistorial, exportarWordHistorial } from '../data/exportarHistorial';
import { avisoError } from '../../../lib/aviso';
import banderaEspoch from '../../../assets/Bandera-ESPOCH-HORARIOS.webp';
import fondoCargaDocente from '../../../assets/reportes/carga-docente.webp';
import fondoHorariosAula from '../../../assets/reportes/horarios-aula.webp';
import fondoHistorialReportes from '../../../assets/reportes/historial-reportes.webp';
import fondoInventario from '../../../assets/reportes/inventario.webp';
import fondoInfraestructura from '../../../assets/reportes/infraestructura.webp';
import fondoMantenimiento from '../../../assets/reportes/mantenimiento.webp';

/** Retorna la fuente CSS correspondiente */
const getFontFamily = (font: string) => {
  switch (font) {
    case 'Inter': return '"Inter", sans-serif';
    case 'Roboto': return '"Roboto", sans-serif';
    case 'Montserrat': return '"Montserrat", sans-serif';
    case 'Open Sans': return '"Open Sans", sans-serif';
    case 'Times New Roman': return '"Times New Roman", Times, serif';
    case 'Arial': return 'Arial, Helvetica, sans-serif';
    case 'Helvetica': return 'Helvetica, Arial, sans-serif';
    case 'Courier New': return '"Courier New", Courier, monospace';
    case 'Verdana': return 'Verdana, Geneva, sans-serif';
    case 'Tahoma': return 'Tahoma, Geneva, sans-serif';
    default: return '"Inter", sans-serif';
  }
};

/** Fecha legible para la bitácora: "3 sep 2026, 10:47". */
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

  const [tipoReporte, setTipoReporte] = useState('Horarios');
  const [vistaReportes, setVistaReportes] = useState<'inicio' | 'detalle'>('inicio');
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalExportar, setModalExportar] = useState<{
    abierto: boolean;
    tipo: 'Horarios' | 'Docentes' | 'Historial' | 'Disponibilidad';
    formato: 'PDF' | 'Word';
    modo: 'masivo' | 'individual' | 'config';
    item?: any;
  } | null>(null);

  const [zoomPrevia, setZoomPrevia] = useState(100);
  const [paginaPrevia, setPaginaPrevia] = useState(1);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [incluirLogo, setIncluirLogo] = useState(true);
  const [incluirFirma, setIncluirFirma] = useState(true);
  const [vistaPreviaFullscreen, setVistaPreviaFullscreen] = useState(false);

  const tituloReporteActivo = ({
    Docentes: 'Carga docente',
    Horarios: 'Horarios por aula',
    Historial: 'Historial de reportes',
    Disponibilidad: 'Espacios disponibles',
  } as Record<string, string>)[tipoReporte] ?? tipoReporte;

  const abrirReporte = (tipo: string) => {
    setTipoReporte(tipo);
    setVistaReportes('detalle');
  };

  const nombreEdificio = useCallback(
    (id: string) => edificios.find((e: any) => e.id === id)?.nombre || id || '—',
    [edificios],
  );

  /** Ventana de máximo 5 páginas visibles alrededor de la actual para no saturar la barra */
  const obtenerPaginasVisibles = (actual: number, total: number, max: number = 5): number[] => {
    if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
    const mitad = Math.floor(max / 2);
    const inicio = Math.min(Math.max(1, actual - mitad), total - max + 1);
    return Array.from({ length: max }, (_, i) => inicio + i);
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. CONFIGURACIÓN Y TABLA DE HORARIOS POR AULA
  // ═════════════════════════════════════════════════════════════════════════════
  const [busquedaHorarios, setBusquedaHorarios] = useState('');
  const [aulasSeleccionadas, setAulasSeleccionadas] = useState<Set<string>>(new Set());
  const [paginaHorarios, setPaginaHorarios] = useState(1);
  const [filasPorPaginaHorarios, setFilasPorPaginaHorarios] = useState(10);
  const [filtroEstadoHorarios, setFiltroEstadoHorarios] = useState<'todos' | 'listo' | 'disponible'>('todos');
  const [alcanceHorarios, setAlcanceHorarios] = useState<'edificio' | 'facultad'>('edificio');
  const [edificioHorariosId, setEdificioHorariosId] = useState('');
  const [aulaPrevia, setAulaPrevia] = useState<any | null>(null);

  const [horarioConfig, setHorarioConfig] = useState<Pick<OpcionesHorario, 'orientation' | 'paperSize' | 'typography' | 'documentFontSize' | 'exportPeriodo' | 'includeFooter' | 'camposClase'>>(() => {
    let guardado: Partial<OpcionesHorario> = {};
    try { guardado = JSON.parse(localStorage.getItem('horario-export-prefs') || '{}'); } catch { /* preferencias */ }
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

  useEffect(() => {
    try {
      localStorage.setItem('horario-export-prefs', JSON.stringify(horarioConfig));
    } catch { /* ignorar */ }
  }, [horarioConfig]);

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

  const opcionesHorario: OpcionesHorario = {
    ...horarioConfig,
    headerImg: localStorage.getItem('espoch_header_img') || '',
    footerImg: localStorage.getItem('espoch_footer_img') || '',
    clases,
  };

  const filasTablaHorarios = useMemo(() => {
    const filas = ubicacionesHorario.map(ub => {
      const clasesEnAula = clases.filter(c => c.idEspacio === ub.espacio.id).length;
      return {
        id: ub.espacio.id,
        aula: ub.espacio.nombre,
        edificio: ub.edificio.nombre ?? ub.edificio.id,
        edificioObj: ub.edificio,
        espacioObj: ub.espacio,
        periodo: horarioConfig.exportPeriodo,
        clasesCargadas: clasesEnAula,
        estado: clasesEnAula > 0 ? 'listo' as const : 'disponible' as const,
      };
    });
    const q = busquedaHorarios.toLowerCase().trim();
    return filas.filter(f =>
      (!q || f.aula.toLowerCase().includes(q) || f.edificio.toLowerCase().includes(q)) &&
      (filtroEstadoHorarios === 'todos' || f.estado === filtroEstadoHorarios)
    );
  }, [ubicacionesHorario, clases, horarioConfig.exportPeriodo, busquedaHorarios, filtroEstadoHorarios]);

  const aulaParaPrevia = useMemo(() => {
    if (modalExportar?.item?.aula) return modalExportar.item;
    if (aulasSeleccionadas.size > 0) {
      const primerId = Array.from(aulasSeleccionadas)[0];
      return filasTablaHorarios.find(f => f.id === primerId) || filasTablaHorarios[0];
    }
    return filasTablaHorarios[0] || null;
  }, [modalExportar, aulasSeleccionadas, filasTablaHorarios]);

  const totalPaginasHorarios = Math.max(1, Math.ceil(filasTablaHorarios.length / filasPorPaginaHorarios));
  const filasHorariosVisibles = filasTablaHorarios.slice((paginaHorarios - 1) * filasPorPaginaHorarios, paginaHorarios * filasPorPaginaHorarios);
  useEffect(() => { setPaginaHorarios(1); }, [busquedaHorarios, filtroEstadoHorarios, filasPorPaginaHorarios]);

  const masterCheckHorarios = filasHorariosVisibles.length > 0 && filasHorariosVisibles.every(f => aulasSeleccionadas.has(f.id));
  const toggleMasterHorarios = () => {
    const siguiente = new Set(aulasSeleccionadas);
    if (masterCheckHorarios) {
      filasHorariosVisibles.forEach(f => siguiente.delete(f.id));
    } else {
      filasHorariosVisibles.forEach(f => siguiente.add(f.id));
    }
    setAulasSeleccionadas(siguiente);
  };
  const toggleFilaHorarios = (id: string) => {
    const siguiente = new Set(aulasSeleccionadas);
    if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
    setAulasSeleccionadas(siguiente);
  };

  const exportarAulaIndividual = async (fila: typeof filasTablaHorarios[number], fmt: 'PDF' | 'Word') => {
    const ub = [{ edificio: fila.edificioObj, espacio: fila.espacioObj }];
    setIsGenerating(true);
    try {
      const nombre = `Horario_${fila.edificio}_${fila.aula}`;
      if (fmt === 'Word') {
        await exportarHorariosWord(ub, `${nombre}.docx`, opcionesHorario);
      } else {
        await imprimirHorariosPdf(ub, nombre, opcionesHorario);
      }
      await registrarReporte({ tipo: 'Horarios', formato: fmt, filtros: { edificio: fila.edificio, aula: fila.aula }, filas: 1 }).catch(() => {});
      fetchReportes();
    } catch {
      void avisoError('No se pudo generar el reporte', 'Vuelve a intentar la descarga.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportarAulasSeleccionadas = async (fmt: 'PDF' | 'Word') => {
    if (aulasSeleccionadas.size === 0) return;
    const ubs = ubicacionesHorario.filter(ub => aulasSeleccionadas.has(ub.espacio.id));
    if (ubs.length === 0) return;
    setIsGenerating(true);
    try {
      const nombre = `Horarios_${ubs.length}_aulas`;
      if (fmt === 'Word') {
        await exportarHorariosWord(ubs, `${nombre}.docx`, opcionesHorario);
      } else {
        await imprimirHorariosPdf(ubs, nombre, opcionesHorario);
      }
      await registrarReporte({
        tipo: 'Horarios',
        formato: fmt,
        filtros: { aulas: ubs.map(u => u.espacio.nombre) },
        filas: ubs.length,
      }).catch(() => {});
      fetchReportes();
    } catch {
      void avisoError('No se pudo generar el reporte', 'Vuelve a intentar la descarga masiva.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. CONFIGURACIÓN Y TABLA DE CARGA DOCENTE
  // ═════════════════════════════════════════════════════════════════════════════
  const [busquedaDocente, setBusquedaDocente] = useState('');
  const [docentesSeleccionados, setDocentesSeleccionados] = useState<string[]>([]);
  const [paginaDocente, setPaginaDocente] = useState(1);
  const [filasPorPaginaDocente, setFilasPorPaginaDocente] = useState(10);
  const [docentePrevia, setDocentePrevia] = useState<ResumenDocente | null>(null);

  const todosDocentes = useMemo(() => resumirDocentes(clases), [clases]);
  const docentesFiltrados = useMemo(() => {
    const q = busquedaDocente.toLowerCase().trim();
    if (!q) return todosDocentes;
    return todosDocentes.filter(d =>
      d.docente.toLowerCase().includes(q) ||
      d.materias.some(m => m.toLowerCase().includes(q))
    );
  }, [todosDocentes, busquedaDocente]);

  const docenteParaPrevia = useMemo(() => {
    if (modalExportar?.item?.docente) return modalExportar.item;
    if (docentesSeleccionados.length > 0) {
      return todosDocentes.find(d => d.idDocente === docentesSeleccionados[0]) || todosDocentes[0];
    }
    return todosDocentes[0] || null;
  }, [modalExportar, docentesSeleccionados, todosDocentes]);

  const totalPaginasDocente = Math.max(1, Math.ceil(docentesFiltrados.length / filasPorPaginaDocente));
  const docentesVisibles = docentesFiltrados.slice((paginaDocente - 1) * filasPorPaginaDocente, paginaDocente * filasPorPaginaDocente);
  useEffect(() => { setPaginaDocente(1); }, [busquedaDocente, filasPorPaginaDocente]);

  const masterCheckDocentes = docentesVisibles.length > 0 && docentesVisibles.every(d => docentesSeleccionados.includes(d.idDocente));
  const toggleMasterDocentes = () => {
    if (masterCheckDocentes) {
      const visiblesIds = new Set(docentesVisibles.map(d => d.idDocente));
      setDocentesSeleccionados(actual => actual.filter(id => !visiblesIds.has(id)));
    } else {
      const nuevo = new Set(docentesSeleccionados);
      docentesVisibles.forEach(d => nuevo.add(d.idDocente));
      setDocentesSeleccionados([...nuevo]);
    }
  };
  const toggleDocente = (id: string) => {
    setDocentesSeleccionados(actual =>
      actual.includes(id) ? actual.filter(x => x !== id) : [...actual, id]
    );
  };

  const exportarDocenteIndividual = async (docente: ResumenDocente, fmt: 'PDF' | 'Word') => {
    setIsGenerating(true);
    try {
      if (fmt === 'Word') {
        await exportarWordDocentes([docente], nombreEdificio);
      } else {
        exportarPdfDocentes([docente]);
      }
      await registrarReporte({
        tipo: 'Docentes',
        formato: fmt,
        filtros: { docente: docente.docente },
        filas: docente.bloques.length,
      }).catch(() => {});
      fetchReportes();
    } catch {
      void avisoError('No se pudo generar el reporte', 'Vuelve a intentar la descarga.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportarDocentesSeleccionados = async (fmt: 'PDF' | 'Word') => {
    if (docentesSeleccionados.length === 0) return;
    const aExportar = todosDocentes.filter(d => docentesSeleccionados.includes(d.idDocente));
    if (aExportar.length === 0) return;
    setIsGenerating(true);
    try {
      if (fmt === 'Word') {
        await exportarWordDocentes(aExportar, nombreEdificio);
      } else {
        exportarPdfDocentes(aExportar);
      }
      await registrarReporte({
        tipo: 'Docentes',
        formato: fmt,
        filtros: { docentes: aExportar.map(d => d.docente) },
        filas: aExportar.reduce((acc, d) => acc + d.bloques.length, 0),
      }).catch(() => {});
      fetchReportes();
    } catch {
      void avisoError('No se pudo generar el reporte', 'Vuelve a intentar la descarga masiva.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. CONFIGURACIÓN Y TABLA DE HISTORIAL DE REPORTES
  // ═════════════════════════════════════════════════════════════════════════════
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [filtroTipoHistorial, setFiltroTipoHistorial] = useState<string>('todos');
  const [filtroFormatoHistorial, setFiltroFormatoHistorial] = useState<string>('todos');
  const [historialSeleccionados, setHistorialSeleccionados] = useState<Set<string>>(new Set());
  const [historialDetalle, setHistorialDetalle] = useState<any | null>(null);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [filasPorPaginaHistorial, setFilasPorPaginaHistorial] = useState(10);

  const historialFiltrado = useMemo(() => {
    const q = busquedaHistorial.toLowerCase().trim();
    return historial.filter(r => {
      const coincideQ = !q ||
        r.tipo.toLowerCase().includes(q) ||
        r.formato.toLowerCase().includes(q) ||
        (r.generadoPorNombre && r.generadoPorNombre.toLowerCase().includes(q));
      const coincideTipo = filtroTipoHistorial === 'todos' || r.tipo === filtroTipoHistorial;
      const coincideFmt = filtroFormatoHistorial === 'todos' || r.formato === filtroFormatoHistorial;
      return coincideQ && coincideTipo && coincideFmt;
    });
  }, [historial, busquedaHistorial, filtroTipoHistorial, filtroFormatoHistorial]);

  const totalPaginasHistorial = Math.max(1, Math.ceil(historialFiltrado.length / filasPorPaginaHistorial));
  const historialVisible = historialFiltrado.slice((paginaHistorial - 1) * filasPorPaginaHistorial, paginaHistorial * filasPorPaginaHistorial);
  useEffect(() => { setPaginaHistorial(1); }, [busquedaHistorial, filtroTipoHistorial, filtroFormatoHistorial, filasPorPaginaHistorial]);

  const toggleFilaHistorial = (id: string) => {
    setHistorialSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const masterCheckHistorial = useMemo(() => {
    if (historialVisible.length === 0) return false;
    return historialVisible.every(r => historialSeleccionados.has(r.id));
  }, [historialVisible, historialSeleccionados]);

  const toggleMasterHistorial = () => {
    if (masterCheckHistorial) {
      setHistorialSeleccionados(prev => {
        const next = new Set(prev);
        historialVisible.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setHistorialSeleccionados(prev => {
        const next = new Set(prev);
        historialVisible.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  const exportarHistorialSeleccionados = async (fmt: 'PDF' | 'Word') => {
    const seleccionados = historial.filter(r => historialSeleccionados.has(r.id));
    if (seleccionados.length === 0) return;
    setIsGenerating(true);
    try {
      if (fmt === 'Word') {
        await exportarWordHistorial(seleccionados, `${seleccionados.length} REGISTROS SELECCIONADOS`);
      } else {
        await exportarPdfHistorial(seleccionados, `${seleccionados.length} REGISTROS SELECCIONADOS`);
      }
    } catch (e) {
      console.error(e);
      void avisoError('Error al exportar', 'No se pudieron exportar los registros de auditoría seleccionados.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportarHistorialIndividual = async (r: any, fmt: 'PDF' | 'Word') => {
    setIsGenerating(true);
    try {
      if (fmt === 'Word') {
        await exportarWordHistorial([r], `REGISTRO AUDITORÍA #${r.id.slice(0, 8)}`);
      } else {
        await exportarPdfHistorial([r], `REGISTRO AUDITORÍA #${r.id.slice(0, 8)}`);
      }
    } catch (e) {
      console.error(e);
      void avisoError('Error al exportar', 'No se pudo exportar el registro de auditoría.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. CONFIGURACIÓN Y TABLA DE ESPACIOS DISPONIBLES
  // ═════════════════════════════════════════════════════════════════════════════
  const [diaDisponibilidad, setDiaDisponibilidad] = useState<string>('Lunes');
  const [edificioDisponibilidadId, setEdificioDisponibilidadId] = useState<string>('');
  const [tipoEspacioDisponibilidad, setTipoEspacioDisponibilidad] = useState<string>('');
  const [busquedaDisponibilidad, setBusquedaDisponibilidad] = useState('');
  const [espaciosSeleccionados, setEspaciosSeleccionados] = useState<Set<string>>(new Set());
  const [espacioDetalle, setEspacioDetalle] = useState<any | null>(null);
  const [paginaDisponibilidad, setPaginaDisponibilidad] = useState(1);
  const [filasPorPaginaDisponibilidad, setFilasPorPaginaDisponibilidad] = useState(10);

  const jornada = useMemo(() => ({ inicio: minutosHora('07:00'), fin: minutosHora('21:00') }), []);

  const espaciosDisponiblesData = useMemo(() => {
    const porEdificio = new Map(edificios.map(e => [e.id, e]));
    return espacios
      .filter(e => {
        const tipoNormal = normalizarTexto(e.tipo);
        const esLab = tipoNormal.includes('laboratorio');
        const esAula = tipoNormal === 'academica' || tipoNormal === 'aula';
        if (!esLab && !esAula) return false;
        if (edificioDisponibilidadId && e.id_edificio !== edificioDisponibilidadId) return false;
        if (tipoEspacioDisponibilidad === 'aula' && !esAula) return false;
        if (tipoEspacioDisponibilidad === 'laboratorio' && !esLab) return false;
        const nombreEdif = porEdificio.get(e.id_edificio)?.nombre || '';
        const q = busquedaDisponibilidad.toLowerCase().trim();
        if (q && !`${e.nombre} ${nombreEdif}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .map(espacio => {
        const edificio = porEdificio.get(espacio.id_edificio);
        const disp = calcularDisponibilidad(espacio, edificio?.estado, clases as any, diaDisponibilidad, jornada);
        const minutosLibres = disp.libres.reduce((sum, t) => sum + (t.fin - t.inicio), 0);
        return {
          id: espacio.id,
          nombre: espacio.nombre,
          edificio: edificio?.nombre || '—',
          tipo: espacio.tipo,
          libre: disp.libre,
          minutosLibres,
          horasLibres: Math.round(minutosLibres / 60 * 10) / 10,
          tramosLibres: disp.libres.map(t => `${mostrarHora(t.inicio)}–${mostrarHora(t.fin)}`),
          tramosOcupados: disp.ocupados.map(t => `${mostrarHora(t.inicio)}–${mostrarHora(t.fin)}`),
          motivo: disp.motivo,
        };
      })
      .sort((a, b) => b.minutosLibres - a.minutosLibres);
  }, [espacios, edificios, clases, diaDisponibilidad, edificioDisponibilidadId, tipoEspacioDisponibilidad, busquedaDisponibilidad, jornada]);

  const totalPaginasDisponibilidad = Math.max(1, Math.ceil(espaciosDisponiblesData.length / filasPorPaginaDisponibilidad));
  const espaciosDisponiblesVisibles = espaciosDisponiblesData.slice((paginaDisponibilidad - 1) * filasPorPaginaDisponibilidad, paginaDisponibilidad * filasPorPaginaDisponibilidad);
  useEffect(() => { setPaginaDisponibilidad(1); }, [busquedaDisponibilidad, diaDisponibilidad, edificioDisponibilidadId, tipoEspacioDisponibilidad, filasPorPaginaDisponibilidad]);

  const toggleFilaEspacio = (id: string) => {
    setEspaciosSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const masterCheckEspacios = useMemo(() => {
    if (espaciosDisponiblesVisibles.length === 0) return false;
    return espaciosDisponiblesVisibles.every(e => espaciosSeleccionados.has(e.id));
  }, [espaciosDisponiblesVisibles, espaciosSeleccionados]);

  const toggleMasterEspacios = () => {
    if (masterCheckEspacios) {
      setEspaciosSeleccionados(prev => {
        const next = new Set(prev);
        espaciosDisponiblesVisibles.forEach(e => next.delete(e.id));
        return next;
      });
    } else {
      setEspaciosSeleccionados(prev => {
        const next = new Set(prev);
        espaciosDisponiblesVisibles.forEach(e => next.add(e.id));
        return next;
      });
    }
  };

  const exportarEspaciosSeleccionados = async (fmt: 'PDF' | 'Word') => {
    const seleccionados = espaciosDisponiblesData.filter(e => espaciosSeleccionados.has(e.id));
    if (seleccionados.length === 0) return;
    setIsGenerating(true);
    try {
      const edificio = edificios.find(e => e.id === edificioDisponibilidadId);
      const nombreEdif = edificio?.nombre || 'Selección de espacios';
      if (fmt === 'Word') {
        await exportarWordDisponibilidad(seleccionados, diaDisponibilidad, nombreEdif);
      } else {
        await exportarPdfDisponibilidad(seleccionados, diaDisponibilidad, nombreEdif);
      }
      await registrarReporte({
        tipo: 'Disponibilidad',
        formato: fmt,
        filtros: { dia: diaDisponibilidad, edificio: nombreEdif, total: seleccionados.length },
        filas: seleccionados.length,
      }).catch(() => {});
      fetchReportes();
    } catch (e) {
      console.error(e);
      void avisoError('Error al exportar', 'No se pudieron exportar los espacios seleccionados.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportarEspacioIndividual = async (espacio: any, fmt: 'PDF' | 'Word') => {
    setIsGenerating(true);
    try {
      if (fmt === 'Word') {
        await exportarWordDisponibilidad([espacio], diaDisponibilidad, espacio.edificio);
      } else {
        await exportarPdfDisponibilidad([espacio], diaDisponibilidad, espacio.edificio);
      }
      await registrarReporte({
        tipo: 'Disponibilidad',
        formato: fmt,
        filtros: { dia: diaDisponibilidad, espacio: espacio.nombre, edificio: espacio.edificio },
        filas: 1,
      }).catch(() => {});
      fetchReportes();
    } catch (e) {
      console.error(e);
      void avisoError('Error al exportar', `No se pudo exportar el espacio ${espacio.nombre}.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmarExportacionModal = async (fmtOverride?: 'PDF' | 'Word') => {
    if (!modalExportar) return;
    const { tipo, modo, item } = modalExportar;
    const formato = fmtOverride || modalExportar.formato;
    setModalExportar(null);
    if (tipo === 'Horarios') {
      if (modo === 'masivo') await exportarAulasSeleccionadas(formato);
      else if (item) await exportarAulaIndividual(item, formato);
      else await exportarAulasSeleccionadas(formato);
    } else if (tipo === 'Docentes') {
      if (modo === 'masivo') await exportarDocentesSeleccionados(formato);
      else if (item) await exportarDocenteIndividual(item, formato);
      else await exportarDocentesSeleccionados(formato);
    } else if (tipo === 'Disponibilidad') {
      if (modo === 'masivo') await exportarEspaciosSeleccionados(formato);
      else if (item) await exportarEspacioIndividual(item, formato);
      else await exportarEspaciosSeleccionados(formato);
    } else if (tipo === 'Historial') {
      if (modo === 'masivo') await exportarHistorialSeleccionados(formato);
      else if (item) await exportarHistorialIndividual(item, formato);
      else await exportarHistorialSeleccionados(formato);
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
                    className="text-gray-400 transition-colors hover:text-white cursor-pointer"
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
              <p className="text-[11px] text-gray-400 font-medium">Generación de informes exportables del sistema institucional.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
            {(tipoReporte === 'Horarios' ? [
              { Icono: Building2, valor: new Set(ubicacionesHorario.map(item => item.edificio.id)).size, etiqueta: 'Edificios' },
              { Icono: BookOpen, valor: ubicacionesHorario.length, etiqueta: 'Aulas con clases' },
              { Icono: Clock, valor: clases.length, etiqueta: 'Clases cargadas' },
              { Icono: FileText, valor: historial.length, etiqueta: 'Reportes generados' },
            ] : tipoReporte === 'Docentes' ? [
              { Icono: Users, valor: todosDocentes.length, etiqueta: 'Docentes con carga' },
              { Icono: BookOpen, valor: new Set(clases.map(c => c.materia)).size, etiqueta: 'Materias distintas' },
              { Icono: Clock, valor: todosDocentes.reduce((acc, d) => acc + d.horasSemana, 0), etiqueta: 'Horas / semana' },
              { Icono: FileText, valor: historial.filter(r => r.tipo === 'Docentes').length, etiqueta: 'Reportes docentes' },
            ] : tipoReporte === 'Disponibilidad' ? [
              { Icono: Armchair, valor: espaciosDisponiblesData.length, etiqueta: 'Espacios evaluados' },
              { Icono: CheckCircle2, valor: espaciosDisponiblesData.filter(e => e.horasLibres > 0).length, etiqueta: 'Espacios con libres' },
              { Icono: Calendar, valor: diaDisponibilidad, etiqueta: 'Día seleccionado' },
              { Icono: FileText, valor: historial.filter(r => r.tipo === 'Disponibilidad').length, etiqueta: 'Reportes generados' },
            ] : [
              { Icono: FileText, valor: historial.length, etiqueta: 'Total reportes' },
              { Icono: Calendar, valor: historial.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length, etiqueta: 'Generados hoy' },
              { Icono: Clock, valor: historial.filter(r => r.formato === 'PDF').length, etiqueta: 'En formato PDF' },
              { Icono: BookOpen, valor: historial.filter(r => r.formato === 'Word').length, etiqueta: 'En formato Word' },
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

      {/* ═════════════════════════════════════════════════════════════════════════════
          VISTA INICIO: CATÁLOGO DE REPORTES
          ═════════════════════════════════════════════════════════════════════════════ */}
      {vistaReportes === 'inicio' && (
        <div className="flex min-h-0 flex-1 overflow-y-auto bg-[#f4f7fb] p-5 md:p-7 xl:overflow-hidden animate-fade-in">
          <div className="flex min-h-full w-full flex-col gap-5 xl:h-full xl:min-h-0">
            <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 xl:min-h-0 xl:grid-cols-3 xl:grid-rows-2">
              {([
                { tipo: 'Docentes', titulo: 'Carga docente', descripcion: 'Horas semanales por docente, materias y aulas asignadas.', etiquetas: ['Carga académica', 'PDF y Word'], imagen: fondoCargaDocente, Icono: Users, color: 'red', disponible: true },
                { tipo: 'Horarios', titulo: 'Horarios por aula', descripcion: 'Grilla semanal exportable por aula, edificio o toda la facultad.', etiquetas: ['Aulas y edificios', 'PDF y Word'], imagen: fondoHorariosAula, Icono: Clock, color: 'blue', disponible: true },
                { tipo: 'Historial', titulo: 'Historial de reportes', descripcion: 'Bitácora de lo generado: qué, cuándo y quién lo pidió.', etiquetas: ['Auditoría', 'Consulta'], imagen: fondoHistorialReportes, Icono: FileText, color: 'green', disponible: true },
                { tipo: 'Disponibilidad', titulo: 'Espacios disponibles', descripcion: 'Consulta de aulas y laboratorios libres por franja horaria y día.', etiquetas: ['Aulas libres', 'PDF y Word'], imagen: fondoInventario, Icono: LayoutGrid, color: 'orange', disponible: true },
                { tipo: 'Infraestructura', titulo: 'Infraestructura', descripcion: 'Edificios, aulas y laboratorios registrados.', etiquetas: ['Edificios', 'Espacios'], imagen: fondoInfraestructura, Icono: Building2, color: 'purple', disponible: false },
                { tipo: 'Mantenimiento', titulo: 'Mantenimiento', descripcion: 'Órdenes abiertas, cerradas y promedio de resolución.', etiquetas: ['Órdenes', 'Seguimiento'], imagen: fondoMantenimiento, Icono: BarChart2, color: 'gray', disponible: false },
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
                    className={`group relative flex h-full min-h-[210px] flex-col overflow-hidden rounded-[24px] border bg-white p-6 text-left shadow-[0_10px_25px_-8px_rgba(15,23,42,0.10)] transition-all xl:min-h-0 ${opcion.disponible ? 'cursor-pointer border-gray-200/80 hover:-translate-y-1 hover:border-espoch-red/30 hover:shadow-[0_18px_34px_-10px_rgba(15,23,42,0.16)]' : 'cursor-not-allowed border-gray-200/60 bg-white/75 opacity-65'}`}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-0 top-0 h-[74%] w-[62%] bg-cover bg-center opacity-75 transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{ backgroundImage: `url(${opcion.imagen})` }}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-[1]"
                      style={{
                        background: 'linear-gradient(90deg, #fff 38%, rgba(255,255,255,.96) 52%, rgba(255,255,255,.58) 76%, rgba(255,255,255,.12) 100%), linear-gradient(0deg, #fff 31%, rgba(255,255,255,.92) 48%, rgba(255,255,255,0) 75%)',
                      }}
                    />

                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${colores[opcion.color]}`}>
                        <opcion.Icono className="h-5 w-5" />
                      </div>
                      <span className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold ${opcion.disponible ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>
                        {opcion.disponible ? 'Disponible' : 'Pronto'}
                      </span>
                    </div>

                    <div className="relative z-10 mt-5 flex-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-gray-400">Reporte institucional</p>
                      <h4 className="mt-2 text-[18px] font-extrabold leading-tight text-gray-900">{opcion.titulo}</h4>
                      <p className="mt-2 max-w-[38rem] text-[12px] font-medium leading-relaxed text-gray-500">{opcion.descripcion}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {opcion.etiquetas.map(etiqueta => (
                          <span key={etiqueta} className="rounded-full border border-gray-200/90 bg-white/85 px-3 py-1.5 text-[10px] font-bold text-gray-600 shadow-sm backdrop-blur-sm">
                            {etiqueta}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="relative z-10 mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                      <div>
                        <p className="text-[12px] font-extrabold text-gray-800">{opcion.disponible ? 'Configurar reporte' : 'En preparación'}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-gray-400">{opcion.disponible ? 'Revisar parámetros y exportar' : 'Disponible próximamente'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-bold transition-colors ${opcion.disponible ? 'bg-[#151a22] text-white group-hover:bg-espoch-red' : 'bg-gray-100 text-gray-400'}`}>
                        {opcion.disponible ? 'Abrir' : 'Pronto'}
                        {opcion.disponible && <ChevronRight className="h-4 w-4" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════
          VISTA DETALLE (REPORTES DINÁMICOS)
          ═════════════════════════════════════════════════════════════════════════════ */}
      {vistaReportes === 'detalle' && (
        <div className="flex-1 flex flex-col p-6 md:p-8 min-h-0 overflow-hidden bg-[#f4f7fb]/90 backdrop-blur-xl animate-fade-in">
          {/* ── TABLA Y VISTA DEL REPORTE A ANCHO COMPLETO ── */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm relative before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-amber-400 before:via-orange-500 before:to-red-700 flex-1">

              {/* ═══ ENCABEZADO UNIFICADO ═══ */}
              <div className="relative flex shrink-0 items-center justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-white via-white/95 to-white/40 px-6 py-5">
                <div className="min-w-0">
                  <h3 className="text-[20px] font-extrabold tracking-tight text-gray-900">{tituloReporteActivo}</h3>
                  <p className="mt-1 text-[11.5px] text-gray-500">
                    {tipoReporte === 'Horarios' && 'Cada aula se coloca después de la anterior, agrupada por edificio.'}
                    {tipoReporte === 'Docentes' && 'Horas semanales por docente, materias y distribución de clases.'}
                    {tipoReporte === 'Historial' && 'Bitácora de auditoría de descargas y reportes generados.'}
                    {tipoReporte === 'Disponibilidad' && 'Consulta y reporte de aulas y laboratorios libres por día y horario.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVistaReportes('inicio')}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1e293b] px-4 py-2.5 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#0f172a] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver
                </button>
              </div>

              {/* ═══ BARRA DE FILTROS SUPERIORES ═══ */}
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-6 py-4">
                {/* Filtros para Horarios */}
                {tipoReporte === 'Horarios' && (
                  <>
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={busquedaHorarios}
                        onChange={e => setBusquedaHorarios(e.target.value)}
                        placeholder="Buscar aula o docente..."
                        className="w-full h-[42px] rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-[12px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200/50 transition-all"
                      />
                    </div>
                    <select
                      value={alcanceHorarios}
                      onChange={e => setAlcanceHorarios(e.target.value as 'edificio' | 'facultad')}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-gray-700 outline-none cursor-pointer"
                    >
                      <option value="edificio">Por edificio</option>
                      <option value="facultad">Toda la facultad</option>
                    </select>
                    {alcanceHorarios === 'edificio' && (
                      <select
                        value={edificioHorariosVigente}
                        onChange={e => setEdificioHorariosId(e.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-gray-700 outline-none cursor-pointer max-w-[220px]"
                      >
                        {edificiosConHorario.length === 0 && <option value="">Sin edificios con horarios</option>}
                        {edificiosConHorario.map(edificio => (
                          <option key={edificio.id} value={edificio.id}>{edificio.nombre}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => setFiltroEstadoHorarios(filtroEstadoHorarios === 'todos' ? 'listo' : filtroEstadoHorarios === 'listo' ? 'disponible' : 'todos')}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[11.5px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Filter className="w-4 h-4 text-blue-500" />
                      Estado: {filtroEstadoHorarios === 'todos' ? 'Todos' : filtroEstadoHorarios === 'listo' ? 'Listo' : 'Disponible'}
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalExportar({ abierto: true, tipo: 'Horarios', formato: 'PDF', modo: 'config' })}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[11.5px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      title="Configurar opciones de formato de exportación"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
                      <span className="hidden sm:inline">Formato</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBusquedaHorarios(''); setFiltroEstadoHorarios('todos'); setAulasSeleccionadas(new Set()); }}
                      className="inline-flex items-center gap-1.5 bg-transparent text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors px-2 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Limpiar
                    </button>

                    {/* Botones de exportación masiva condicional */}
                    {aulasSeleccionadas.size > 0 && (
                      <div className="flex items-center gap-2 pl-3 border-l border-gray-200 animate-fade-in flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-espoch-red bg-red-50 border border-red-200/60 rounded-xl px-2.5 py-2 shadow-2xs">
                          {aulasSeleccionadas.size} sel.
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalExportar({ abierto: true, tipo: 'Horarios', formato: 'PDF', modo: 'masivo' })}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> Exportar PDF ({aulasSeleccionadas.size})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalExportar({ abierto: true, tipo: 'Horarios', formato: 'Word', modo: 'masivo' })}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] hover:bg-black text-white px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Exportar Word ({aulasSeleccionadas.size})
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Filtros para Docentes */}
                {tipoReporte === 'Docentes' && (
                  <>
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={busquedaDocente}
                        onChange={e => setBusquedaDocente(e.target.value)}
                        placeholder="Buscar docente o materia..."
                        className="w-full h-[42px] rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-[12px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200/50 transition-all"
                      />
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[11.5px] font-semibold text-gray-700">
                      <Users className="w-4 h-4 text-espoch-red" />
                      Total: {docentesFiltrados.length} docentes
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalExportar({ abierto: true, tipo: 'Docentes', formato: 'PDF', modo: 'config' })}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[11.5px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      title="Configurar opciones de formato de exportación"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
                      <span className="hidden sm:inline">Formato</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBusquedaDocente(''); setDocentesSeleccionados([]); }}
                      className="inline-flex items-center gap-1.5 bg-transparent text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors px-2 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Limpiar
                    </button>

                    {/* Botones de exportación masiva para Docentes */}
                    {docentesSeleccionados.length > 0 && (
                      <div className="flex items-center gap-2 pl-3 border-l border-gray-200 animate-fade-in flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-espoch-red bg-red-50 border border-red-200/60 rounded-xl px-2.5 py-2 shadow-2xs">
                          {docentesSeleccionados.length} sel.
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalExportar({ abierto: true, tipo: 'Docentes', formato: 'PDF', modo: 'masivo' })}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> Exportar PDF ({docentesSeleccionados.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalExportar({ abierto: true, tipo: 'Docentes', formato: 'Word', modo: 'masivo' })}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] hover:bg-black text-white px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Exportar Word ({docentesSeleccionados.length})
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Filtros para Historial */}
                {tipoReporte === 'Historial' && (
                  <>
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={busquedaHistorial}
                        onChange={e => setBusquedaHistorial(e.target.value)}
                        placeholder="Buscar en bitácora..."
                        className="w-full h-[42px] rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-[12px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200/50 transition-all"
                      />
                    </div>
                    <select
                      value={filtroTipoHistorial}
                      onChange={e => setFiltroTipoHistorial(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-gray-700 outline-none cursor-pointer"
                    >
                      <option value="todos">Todos los tipos</option>
                      <option value="Horarios">Horarios por aula</option>
                      <option value="Docentes">Carga docente</option>
                      <option value="Disponibilidad">Espacios disponibles</option>
                    </select>
                    <select
                      value={filtroFormatoHistorial}
                      onChange={e => setFiltroFormatoHistorial(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-gray-700 outline-none cursor-pointer"
                    >
                      <option value="todos">Todos los formatos</option>
                      <option value="PDF">PDF</option>
                      <option value="Word">Word</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setModalExportar({ abierto: true, tipo: 'Historial', formato: 'PDF', modo: 'config' })}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[11.5px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      title="Configurar opciones de formato de exportación"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
                      <span className="hidden sm:inline">Formato</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBusquedaHistorial(''); setFiltroTipoHistorial('todos'); setFiltroFormatoHistorial('todos'); setHistorialSeleccionados(new Set()); }}
                      className="inline-flex items-center gap-1.5 bg-transparent text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors px-2 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Limpiar
                    </button>

                    {/* Botones de exportación masiva condicional para Historial */}
                    {historialSeleccionados.size > 0 && (
                      <div className="flex items-center gap-2 pl-3 border-l border-gray-200 animate-fade-in flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-espoch-red bg-red-50 border border-red-200/60 rounded-xl px-2.5 py-2 shadow-2xs">
                          {historialSeleccionados.size} sel.
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalExportar({ abierto: true, tipo: 'Historial', formato: 'PDF', modo: 'masivo' })}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> Exportar PDF ({historialSeleccionados.size})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalExportar({ abierto: true, tipo: 'Historial', formato: 'Word', modo: 'masivo' })}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] hover:bg-black text-white px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Exportar Word ({historialSeleccionados.size})
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Filtros para Disponibilidad de Espacios */}
                {tipoReporte === 'Disponibilidad' && (
                  <>
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={busquedaDisponibilidad}
                        onChange={e => setBusquedaDisponibilidad(e.target.value)}
                        placeholder="Buscar espacio o edificio..."
                        className="w-full h-[42px] rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-[12px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200/50 transition-all"
                      />
                    </div>
                    <select
                      value={diaDisponibilidad}
                      onChange={e => setDiaDisponibilidad(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-gray-700 outline-none cursor-pointer"
                    >
                      {dias.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select
                      value={edificioDisponibilidadId}
                      onChange={e => setEdificioDisponibilidadId(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-gray-700 outline-none cursor-pointer max-w-[200px]"
                    >
                      <option value="">Todos los edificios</option>
                      {edificios.map(edificio => <option key={edificio.id} value={edificio.id}>{edificio.nombre}</option>)}
                    </select>
                    <select
                      value={tipoEspacioDisponibilidad}
                      onChange={e => setTipoEspacioDisponibilidad(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-gray-700 outline-none cursor-pointer"
                    >
                      <option value="">Todos los tipos</option>
                      <option value="aula">Aulas</option>
                      <option value="laboratorio">Laboratorios</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setModalExportar({ abierto: true, tipo: 'Disponibilidad', formato: 'PDF', modo: 'config' })}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[11.5px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      title="Configurar opciones de formato de exportación"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
                      <span className="hidden sm:inline">Formato</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBusquedaDisponibilidad(''); setEdificioDisponibilidadId(''); setTipoEspacioDisponibilidad(''); setEspaciosSeleccionados(new Set()); }}
                      className="inline-flex items-center gap-1.5 bg-transparent text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors px-2 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Limpiar
                    </button>

                    {/* Botones de exportación masiva condicional para Espacios */}
                    {espaciosSeleccionados.size > 0 && (
                      <div className="flex items-center gap-2 pl-3 border-l border-gray-200 animate-fade-in flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-espoch-red bg-red-50 border border-red-200/60 rounded-xl px-2.5 py-2 shadow-2xs">
                          {espaciosSeleccionados.size} sel.
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalExportar({ abierto: true, tipo: 'Disponibilidad', formato: 'PDF', modo: 'masivo' })}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> Exportar PDF ({espaciosSeleccionados.size})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalExportar({ abierto: true, tipo: 'Disponibilidad', formato: 'Word', modo: 'masivo' })}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] hover:bg-black text-white px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Exportar Word ({espaciosSeleccionados.size})
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ═══ CONTENEDOR SCROLLABLE DE TABLAS ═══ */}
              <div className="min-w-0 min-h-0 flex-1 overflow-auto custom-scrollbar bg-white">

                {/* 1. TABLA DE HORARIOS */}
                {tipoReporte === 'Horarios' && (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-left">
                      <thead>
                        <tr>
                          <th className="w-[44px] px-4 py-3.5 border-b border-gray-200">
                            <input
                              type="checkbox"
                              checked={masterCheckHorarios}
                              onChange={toggleMasterHorarios}
                              className="w-[17px] h-[17px] rounded accent-espoch-red cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Aula</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Edificio</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Período</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Clases cargadas</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Estado</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filasHorariosVisibles.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-[11px] text-gray-400 italic">No hay aulas con clases para esta selección.</td>
                          </tr>
                        ) : filasHorariosVisibles.map(fila => (
                          <tr key={fila.id} className="group transition-colors hover:bg-gray-50/70">
                            <td className="px-4 py-3 border-b border-gray-100">
                              <input
                                type="checkbox"
                                checked={aulasSeleccionadas.has(fila.id)}
                                onChange={() => toggleFilaHorarios(fila.id)}
                                className="w-[17px] h-[17px] rounded accent-espoch-red cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-[12px] font-bold text-gray-900 whitespace-nowrap">{fila.aula}</td>
                            <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-500 whitespace-nowrap">{fila.edificio}</td>
                            <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-500 whitespace-nowrap">{fila.periodo}</td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center">
                              <span className="text-[13px] font-extrabold text-gray-900">{fila.clasesCargadas}</span>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold ${
                                fila.estado === 'listo'
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${fila.estado === 'listo' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                {fila.estado === 'listo' ? 'Listo' : 'Disponible'}
                              </span>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setAulaPrevia(fila)}
                                  title="Previsualización del horario"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-blue-600 transition-all cursor-pointer shadow-2xs hover:scale-105"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalExportar({ abierto: true, tipo: 'Horarios', formato: 'PDF', modo: 'individual', item: fila })}
                                  disabled={isGenerating}
                                  title="Exportar horario en PDF"
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200/60 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalExportar({ abierto: true, tipo: 'Horarios', formato: 'Word', modo: 'individual', item: fila })}
                                  disabled={isGenerating}
                                  title="Exportar horario en Word"
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-2.5 py-1 text-[11px] font-bold text-blue-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> Word
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 2. TABLA DE DOCENTES */}
                {tipoReporte === 'Docentes' && (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-left">
                      <thead>
                        <tr>
                          <th className="w-[44px] px-4 py-3.5 border-b border-gray-200">
                            <input
                              type="checkbox"
                              checked={masterCheckDocentes}
                              onChange={toggleMasterDocentes}
                              className="w-[17px] h-[17px] rounded accent-espoch-red cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Docente</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Materias asignadas</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Horas / sem</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Clases</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Estado</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docentesVisibles.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-[11px] text-gray-400 italic">No se encontraron docentes con carga académica.</td>
                          </tr>
                        ) : docentesVisibles.map(docente => (
                          <tr key={docente.idDocente} className="group transition-colors hover:bg-gray-50/70">
                            <td className="px-4 py-3 border-b border-gray-100">
                              <input
                                type="checkbox"
                                checked={docentesSeleccionados.includes(docente.idDocente)}
                                onChange={() => toggleDocente(docente.idDocente)}
                                className="w-[17px] h-[17px] rounded accent-espoch-red cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-red-50 text-espoch-red font-bold text-[11px] flex items-center justify-center border border-red-100">
                                  {docente.docente.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                                <span className="text-[12px] font-bold text-gray-900">{docente.docente}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-[11.5px] text-gray-600 max-w-[320px] truncate" title={docente.materias.join(', ')}>
                              {docente.materias.join(' · ')}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                                <Clock className="w-3 h-3" /> {docente.horasSemana} h
                              </span>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center font-extrabold text-[12px] text-gray-800">
                              {docente.bloques.length}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100">
                              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold bg-green-50 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Con carga
                              </span>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDocentePrevia(docente)}
                                  title="Ver detalle de horario docente"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-blue-600 transition-all cursor-pointer shadow-2xs hover:scale-105"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalExportar({ abierto: true, tipo: 'Docentes', formato: 'PDF', modo: 'individual', item: docente })}
                                  disabled={isGenerating}
                                  title="Descargar carga docente en PDF"
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200/60 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalExportar({ abierto: true, tipo: 'Docentes', formato: 'Word', modo: 'individual', item: docente })}
                                  disabled={isGenerating}
                                  title="Descargar carga docente en Word"
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-2.5 py-1 text-[11px] font-bold text-blue-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> Word
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. TABLA DE HISTORIAL */}
                {tipoReporte === 'Historial' && (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[950px] border-collapse text-left">
                      <thead>
                        <tr>
                          <th className="w-[44px] px-4 py-3.5 border-b border-gray-200">
                            <input
                              type="checkbox"
                              checked={masterCheckHistorial}
                              onChange={toggleMasterHistorial}
                              className="w-[17px] h-[17px] rounded accent-espoch-red cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider w-[50px] text-center">#</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Tipo de reporte</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Formato</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Generado por</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Registros</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-right">Fecha y hora</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialVisible.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-[11px] text-gray-400 italic">No hay registros de reportes en la bitácora.</td>
                          </tr>
                        ) : historialVisible.map((r, i) => (
                          <tr key={r.id} className="group transition-colors hover:bg-gray-50/70">
                            <td className="px-4 py-3 border-b border-gray-100">
                              <input
                                type="checkbox"
                                checked={historialSeleccionados.has(r.id)}
                                onChange={() => toggleFilaHistorial(r.id)}
                                className="w-[17px] h-[17px] rounded accent-espoch-red cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center text-[11px] font-bold text-gray-400">
                              {(paginaHistorial - 1) * filasPorPaginaHistorial + i + 1}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-[12px] font-bold text-gray-900">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                                r.tipo === 'Horarios' ? 'bg-blue-50 text-blue-700' :
                                r.tipo === 'Docentes' ? 'bg-red-50 text-red-700' :
                                'bg-emerald-50 text-emerald-700'
                              }`}>
                                {r.tipo === 'Horarios' ? 'Horarios por aula' :
                                 r.tipo === 'Docentes' ? 'Carga docente' :
                                 r.tipo === 'Disponibilidad' ? 'Espacios disponibles' : r.tipo}
                              </span>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center">
                              <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10.5px] font-extrabold ${
                                r.formato === 'PDF' ? 'bg-red-50 text-red-600 border border-red-200/60' : 'bg-blue-50 text-blue-600 border border-blue-200/60'
                              }`}>
                                <FileText className="w-3 h-3" /> {r.formato}
                              </span>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-[12px] font-medium text-gray-700">
                              {r.generadoPorNombre || 'Usuario del sistema'}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center text-[11.5px] font-bold text-gray-700">
                              {r.filas ? `${r.filas} filas` : '—'}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-right text-[11.5px] text-gray-500 whitespace-nowrap">
                              {formatearFecha(r.created_at)}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setHistorialDetalle(r)}
                                  title="Ver detalle del reporte"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-blue-600 transition-all cursor-pointer shadow-2xs hover:scale-105"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalExportar({ abierto: true, tipo: 'Historial', formato: 'PDF', modo: 'individual', item: r })}
                                  disabled={isGenerating}
                                  title="Exportar registro en PDF"
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200/60 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalExportar({ abierto: true, tipo: 'Historial', formato: 'Word', modo: 'individual', item: r })}
                                  disabled={isGenerating}
                                  title="Exportar registro en Word"
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-2.5 py-1 text-[11px] font-bold text-blue-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> Word
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. TABLA DE ESPACIOS DISPONIBLES */}
                {tipoReporte === 'Disponibilidad' && (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[950px] border-collapse text-left">
                      <thead>
                        <tr>
                          <th className="w-[44px] px-4 py-3.5 border-b border-gray-200">
                            <input
                              type="checkbox"
                              checked={masterCheckEspacios}
                              onChange={toggleMasterEspacios}
                              className="w-[17px] h-[17px] rounded accent-espoch-red cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Espacio / Aula</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Edificio</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Horas libres</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Franjas horarias disponibles</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                          <th className="px-4 py-3.5 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {espaciosDisponiblesVisibles.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-[11px] text-gray-400 italic">No se encontraron espacios para los filtros seleccionados.</td>
                          </tr>
                        ) : espaciosDisponiblesVisibles.map(espacio => (
                          <tr key={espacio.id} className="group transition-colors hover:bg-gray-50/70">
                            <td className="px-4 py-3 border-b border-gray-100">
                              <input
                                type="checkbox"
                                checked={espaciosSeleccionados.has(espacio.id)}
                                onChange={() => toggleFilaEspacio(espacio.id)}
                                className="w-[17px] h-[17px] rounded accent-espoch-red cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-[12px] font-bold text-gray-900 whitespace-nowrap">
                              {espacio.nombre}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-500 whitespace-nowrap">
                              {espacio.edificio}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-[11.5px] text-gray-600">
                              {espacio.tipo?.toLowerCase().includes('laboratorio') ? 'Laboratorio' : 'Aula'}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                espacio.horasLibres > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                <Clock className="w-3 h-3" /> {espacio.horasLibres} h
                              </span>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100">
                              <div className="flex flex-wrap gap-1.5 max-w-[420px]">
                                {espacio.tramosLibres.length > 0 ? (
                                  espacio.tramosLibres.map(tramo => (
                                    <span key={tramo} className="rounded-md border border-emerald-200 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                      {tramo}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10.5px] text-gray-400 italic">Sin disponibilidad este día</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold ${
                                espacio.horasLibres > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${espacio.horasLibres > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                                {espacio.horasLibres > 0 ? 'Disponible' : (espacio.motivo || 'Ocupado')}
                              </span>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEspacioDetalle(espacio)}
                                  title="Ver disponibilidad detallada"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-blue-600 transition-all cursor-pointer shadow-2xs hover:scale-105"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalExportar({ abierto: true, tipo: 'Disponibilidad', formato: 'PDF', modo: 'individual', item: espacio })}
                                  disabled={isGenerating}
                                  title="Exportar espacio en PDF"
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200/60 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalExportar({ abierto: true, tipo: 'Disponibilidad', formato: 'Word', modo: 'individual', item: espacio })}
                                  disabled={isGenerating}
                                  title="Exportar espacio en Word"
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-2.5 py-1 text-[11px] font-bold text-blue-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> Word
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ═══ PIE DE TABLA Y PAGINACIÓN ACOPLADA AL FONDO (SIN ESPACIOS EXTRA) ═══ */}
              {tipoReporte === 'Horarios' && filasTablaHorarios.length > 0 && (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-3.5 text-[12px] text-gray-500">
                  <div className="flex items-center gap-5">
                    <span>{(paginaHorarios - 1) * filasPorPaginaHorarios + 1}-{Math.min(paginaHorarios * filasPorPaginaHorarios, filasTablaHorarios.length)} de {filasTablaHorarios.length}</span>
                    <div className="flex items-center gap-2">
                      <span>Filas:</span>
                      <select
                        value={filasPorPaginaHorarios}
                        onChange={e => setFilasPorPaginaHorarios(Number(e.target.value))}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-[12px] text-gray-700 outline-none cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaginaHorarios(p => Math.max(1, p - 1))}
                      disabled={paginaHorarios <= 1}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {obtenerPaginasVisibles(paginaHorarios, totalPaginasHorarios).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPaginaHorarios(p)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors cursor-pointer ${
                          p === paginaHorarios ? 'bg-espoch-red text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPaginaHorarios(p => Math.min(totalPaginasHorarios, p + 1))}
                      disabled={paginaHorarios >= totalPaginasHorarios}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {tipoReporte === 'Docentes' && docentesFiltrados.length > 0 && (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-3.5 text-[12px] text-gray-500">
                  <div className="flex items-center gap-5">
                    <span>{(paginaDocente - 1) * filasPorPaginaDocente + 1}-{Math.min(paginaDocente * filasPorPaginaDocente, docentesFiltrados.length)} de {docentesFiltrados.length}</span>
                    <div className="flex items-center gap-2">
                      <span>Filas:</span>
                      <select
                        value={filasPorPaginaDocente}
                        onChange={e => setFilasPorPaginaDocente(Number(e.target.value))}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-[12px] text-gray-700 outline-none cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaginaDocente(p => Math.max(1, p - 1))}
                      disabled={paginaDocente <= 1}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {obtenerPaginasVisibles(paginaDocente, totalPaginasDocente).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPaginaDocente(p)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors cursor-pointer ${
                          p === paginaDocente ? 'bg-espoch-red text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPaginaDocente(p => Math.min(totalPaginasDocente, p + 1))}
                      disabled={paginaDocente >= totalPaginasDocente}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {tipoReporte === 'Historial' && historialFiltrado.length > 0 && (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-3.5 text-[12px] text-gray-500">
                  <div className="flex items-center gap-5">
                    <span>{(paginaHistorial - 1) * filasPorPaginaHistorial + 1}-{Math.min(paginaHistorial * filasPorPaginaHistorial, historialFiltrado.length)} de {historialFiltrado.length}</span>
                    <div className="flex items-center gap-2">
                      <span>Filas:</span>
                      <select
                        value={filasPorPaginaHistorial}
                        onChange={e => setFilasPorPaginaHistorial(Number(e.target.value))}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-[12px] text-gray-700 outline-none cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaginaHistorial(p => Math.max(1, p - 1))}
                      disabled={paginaHistorial <= 1}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {obtenerPaginasVisibles(paginaHistorial, totalPaginasHistorial).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPaginaHistorial(p)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors cursor-pointer ${
                          p === paginaHistorial ? 'bg-espoch-red text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPaginaHistorial(p => Math.min(totalPaginasHistorial, p + 1))}
                      disabled={paginaHistorial >= totalPaginasHistorial}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {tipoReporte === 'Disponibilidad' && espaciosDisponiblesData.length > 0 && (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-3.5 text-[12px] text-gray-500">
                  <div className="flex items-center gap-5">
                    <span>{(paginaDisponibilidad - 1) * filasPorPaginaDisponibilidad + 1}-{Math.min(paginaDisponibilidad * filasPorPaginaDisponibilidad, espaciosDisponiblesData.length)} de {espaciosDisponiblesData.length}</span>
                    <div className="flex items-center gap-2">
                      <span>Filas:</span>
                      <select
                        value={filasPorPaginaDisponibilidad}
                        onChange={e => setFilasPorPaginaDisponibilidad(Number(e.target.value))}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-[12px] text-gray-700 outline-none cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaginaDisponibilidad(p => Math.max(1, p - 1))}
                      disabled={paginaDisponibilidad <= 1}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {obtenerPaginasVisibles(paginaDisponibilidad, totalPaginasDisponibilidad).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPaginaDisponibilidad(p)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors cursor-pointer ${
                          p === paginaDisponibilidad ? 'bg-espoch-red text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPaginaDisponibilidad(p => Math.min(totalPaginasDisponibilidad, p + 1))}
                      disabled={paginaDisponibilidad >= totalPaginasDisponibilidad}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════
          MODAL DE PREVISUALIZACIÓN DE HORARIO DE AULA (PLANTILLAPDF)
          ═════════════════════════════════════════════════════════════════════════════ */}
      {aulaPrevia && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="relative z-10 w-full max-w-[95vw] xl:max-w-[1100px] max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">
                    Vista previa de horario · {aulaPrevia.aula}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {aulaPrevia.edificio} · {aulaPrevia.clasesCargadas} clases asignadas · Período {horarioConfig.exportPeriodo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void exportarAulaIndividual(aulaPrevia, 'PDF')}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 text-[11px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => void exportarAulaIndividual(aulaPrevia, 'Word')}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] hover:bg-black text-white px-3 py-1.5 text-[11px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Word
                </button>
                <button
                  type="button"
                  onClick={() => setAulaPrevia(null)}
                  className="ml-2 text-gray-400 hover:text-gray-700 bg-white shadow-sm border border-gray-200 rounded-full p-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-100/60 custom-scrollbar">
              <div className="bg-white shadow-lg rounded-xl overflow-hidden p-4 max-w-full">
                <PlantillaPDF
                  pdfZoom={0.9}
                  orientation={horarioConfig.orientation}
                  paperSize={horarioConfig.paperSize}
                  typography={horarioConfig.typography}
                  headerImg={localStorage.getItem('espoch_header_img') || ''}
                  footerImg={localStorage.getItem('espoch_footer_img') || ''}
                  documentFontSize={horarioConfig.documentFontSize}
                  exportAula={aulaPrevia.aula}
                  exportAulaId={aulaPrevia.id}
                  exportEdificio={aulaPrevia.edificio}
                  exportPeriodo={horarioConfig.exportPeriodo}
                  clases={clases}
                  includeFooter={horarioConfig.includeFooter}
                  camposClase={horarioConfig.camposClase}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════
          MODAL DE HORARIO DETALLADO DE DOCENTE
          ═════════════════════════════════════════════════════════════════════════════ */}
      {docentePrevia && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="relative z-10 w-full max-w-[900px] max-h-[88vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-espoch-red flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">
                    Carga horaria · {docentePrevia.docente}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {docentePrevia.horasSemana} horas semanales · {docentePrevia.materias.length} materias asignadas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void exportarDocenteIndividual(docentePrevia, 'PDF')}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 text-[11px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => void exportarDocenteIndividual(docentePrevia, 'Word')}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] hover:bg-black text-white px-3 py-1.5 text-[11px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Word
                </button>
                <button
                  type="button"
                  onClick={() => setDocentePrevia(null)}
                  className="ml-2 text-gray-400 hover:text-gray-700 bg-white shadow-sm border border-gray-200 rounded-full p-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                    <th className="pb-3">Día</th>
                    <th className="pb-3">Hora</th>
                    <th className="pb-3">Materia</th>
                    <th className="pb-3">PAO / Paralelo</th>
                    <th className="pb-3">Carrera</th>
                    <th className="pb-3">Aula</th>
                    <th className="pb-3">Edificio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11.5px] text-gray-800">
                  {docentePrevia.bloques.map((b, idx) => (
                    <tr key={`${b.dia}-${b.horaInicio}-${idx}`} className="hover:bg-gray-50/60">
                      <td className="py-2.5 font-bold text-gray-900">{b.dia}</td>
                      <td className="py-2.5 whitespace-nowrap text-blue-700 font-semibold">{b.horaInicio} – {b.horaFin}</td>
                      <td className="py-2.5 font-semibold text-gray-900">{b.materia}</td>
                      <td className="py-2.5 text-gray-500">{etiquetaPaoParalelo(b.pao, b.paralelo) || '—'}</td>
                      <td className="py-2.5 text-gray-500">{b.carrera || '—'}</td>
                      <td className="py-2.5 font-bold">{b.aula}</td>
                      <td className="py-2.5 text-gray-500">{nombreEdificio(b.edificio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════
          MODAL DE DETALLE DE ESPACIO DISPONIBLE
          ═════════════════════════════════════════════════════════════════════════════ */}
      {espacioDetalle && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="relative z-10 w-full max-w-[850px] max-h-[88vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">
                    Disponibilidad · {espacioDetalle.nombre}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {espacioDetalle.edificio} · {espacioDetalle.tipo} · Día: {diaDisponibilidad}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void exportarEspacioIndividual(espacioDetalle, 'PDF')}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 text-[11px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => void exportarEspacioIndividual(espacioDetalle, 'Word')}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] hover:bg-black text-white px-3 py-1.5 text-[11px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Word
                </button>
                <button
                  type="button"
                  onClick={() => setEspacioDetalle(null)}
                  className="ml-2 text-gray-400 hover:text-gray-700 bg-white shadow-sm border border-gray-200 rounded-full p-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Horas Libres</span>
                  <p className="mt-1 text-[20px] font-extrabold text-emerald-900">{espacioDetalle.horasLibres} h</p>
                  <p className="text-[11px] text-emerald-700">De 14h jornada operativa</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800">Estado</span>
                  <p className="mt-1 text-[16px] font-extrabold text-blue-900 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${espacioDetalle.horasLibres > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                    {espacioDetalle.horasLibres > 0 ? 'Disponible' : 'Ocupado'}
                  </p>
                  <p className="text-[11px] text-blue-700">{espacioDetalle.edificio}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-600">Franjas libres</span>
                  <p className="mt-1 text-[20px] font-extrabold text-gray-900">{espacioDetalle.tramosLibres.length}</p>
                  <p className="text-[11px] text-gray-500">Bloques continuos libres</p>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-extrabold text-gray-900 uppercase tracking-wider mb-2">Franjas horarias disponibles</h4>
                {espacioDetalle.tramosLibres.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {espacioDetalle.tramosLibres.map((tramo: string) => (
                      <span key={tramo} className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-[12px] font-bold text-emerald-800 shadow-2xs">
                        {tramo}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-gray-400 italic">No tiene franjas disponibles en este día.</p>
                )}
              </div>

              <div>
                <h4 className="text-[12px] font-extrabold text-gray-900 uppercase tracking-wider mb-2">Franjas ocupadas / con clases asignadas</h4>
                {espacioDetalle.tramosOcupados && espacioDetalle.tramosOcupados.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {espacioDetalle.tramosOcupados.map((tramo: string) => (
                      <span key={tramo} className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-[12px] font-bold text-red-700 shadow-2xs">
                        {tramo}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-gray-400 italic">No hay clases asignadas para este día.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════
          MODAL DE DETALLE DE AUDITORÍA DE HISTORIAL
          ═════════════════════════════════════════════════════════════════════════════ */}
      {historialDetalle && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="relative z-10 w-full max-w-[700px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">
                    Detalle de registro de auditoría
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
                    ID: {historialDetalle.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void exportarHistorialIndividual(historialDetalle, 'PDF')}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 text-[11px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => void exportarHistorialIndividual(historialDetalle, 'Word')}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] hover:bg-black text-white px-3 py-1.5 text-[11px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Word
                </button>
                <button
                  type="button"
                  onClick={() => setHistorialDetalle(null)}
                  className="ml-2 text-gray-400 hover:text-gray-700 bg-white shadow-sm border border-gray-200 rounded-full p-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Tipo de reporte</span>
                  <p className="mt-1 text-[13px] font-bold text-gray-900">
                    {historialDetalle.tipo === 'Horarios' ? 'Horarios por aula' :
                     historialDetalle.tipo === 'Docentes' ? 'Carga docente' :
                     historialDetalle.tipo === 'Disponibilidad' ? 'Espacios disponibles' : historialDetalle.tipo}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Formato generado</span>
                  <p className="mt-1 text-[13px] font-bold text-gray-900">
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[11px] font-extrabold ${
                      historialDetalle.formato === 'PDF' ? 'bg-red-50 text-red-600 border border-red-200/60' : 'bg-blue-50 text-blue-600 border border-blue-200/60'
                    }`}>
                      <FileText className="w-3 h-3" /> {historialDetalle.formato}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Generado por</span>
                  <p className="mt-1 text-[13px] font-bold text-gray-900">
                    {historialDetalle.generadoPorNombre || 'Usuario del sistema'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Filas / Registros</span>
                  <p className="mt-1 text-[13px] font-bold text-gray-900">
                    {historialDetalle.filas ? `${historialDetalle.filas} filas procesadas` : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 sm:col-span-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Fecha y hora de generación</span>
                  <p className="mt-1 text-[13px] font-bold text-gray-900">
                    {formatearFecha(historialDetalle.created_at)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-[11px] text-emerald-800 leading-relaxed">
                <span className="font-bold block mb-1">Certificación de auditoría institucional</span>
                Este registro certifica la generación del informe desde el Sistema de Gestión de Horarios y Espacios de la ESPOCH (FIE). Puede volver a exportar la bitácora en PDF o Word con los botones superiores.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════
          MODAL DE CONFIGURACIÓN Y VISTA PREVIA DEL REPORTE (2 COLUMNAS - ESTILO INSTITUCIONAL ESPOCH)
          ═════════════════════════════════════════════════════════════════════════════ */}
      {modalExportar?.abierto && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 md:p-6 bg-slate-900/65 backdrop-blur-sm animate-fade-in">
          <div className={`relative z-10 w-full ${
            vistaPreviaFullscreen ? 'max-w-[98vw] h-[96vh]' : 'max-w-[1380px] max-h-[92vh]'
          } bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 transition-all duration-300`}>

            {/* Modal Global Top Bar */}
            <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-espoch-red animate-pulse" />
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-gray-800">
                  Sistema de Reportes · FIE ESPOCH
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-[12px] font-semibold text-gray-500">
                  {tituloReporteActivo} ({modalExportar.formato})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVistaPreviaFullscreen(prev => !prev)}
                  className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl p-1.5 transition-colors cursor-pointer"
                  title={vistaPreviaFullscreen ? 'Restaurar tamaño' : 'Pantalla completa'}
                >
                  {vistaPreviaFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setModalExportar(null)}
                  className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl p-1.5 transition-colors cursor-pointer"
                  title="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[480px_minmax(0,1fr)] xl:grid-cols-[510px_minmax(0,1fr)] divide-y lg:divide-y-0 lg:divide-x divide-gray-100 overflow-hidden">

              {/* ── COLUMNA 1: CONFIGURACIÓN DEL REPORTE ── */}
              <div className="flex flex-col min-h-0 bg-white">
                {/* Col Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 text-espoch-red flex items-center justify-center shrink-0 border border-red-100/80 shadow-2xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">Configuración del reporte</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Personaliza los parámetros del reporte antes de generar la vista previa.</p>
                  </div>
                </div>

                {/* Form Controls (Scrollable) */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-4 text-gray-700">
                  {/* Grid 2 columnas de campos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Período Académico */}
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600 flex items-center gap-1">
                        Período académico <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={horarioConfig.exportPeriodo}
                          onChange={e => setHorarioConfig(actual => ({ ...actual, exportPeriodo: e.target.value }))}
                          placeholder="MARZO 2026 - SEPTIEMBRE 2026"
                          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-[11.5px] font-semibold text-gray-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                        />
                      </div>
                    </div>

                    {/* Sede / Edificio */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-gray-400" /> Sede / Edificio
                      </label>
                      <select
                        value={edificioHorariosVigente}
                        onChange={e => setEdificioHorariosId(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2 text-[11.5px] font-semibold text-gray-800 outline-none cursor-pointer"
                      >
                        {edificios.map(e => (
                          <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Alcance / Qué horarios incluir */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600">
                        Qué horarios incluir
                      </label>
                      <select
                        value={alcanceHorarios}
                        onChange={e => setAlcanceHorarios(e.target.value as 'edificio' | 'facultad')}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2 text-[11.5px] font-semibold text-gray-800 outline-none cursor-pointer"
                      >
                        <option value="edificio">Todas las aulas de un edificio</option>
                        <option value="facultad">Toda la facultad, por edificio</option>
                      </select>
                    </div>

                    {/* Formato de archivo */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600">
                        Formato de archivo
                      </label>
                      <select
                        value={modalExportar.formato}
                        onChange={e => setModalExportar(actual => actual ? ({ ...actual, formato: e.target.value as 'PDF' | 'Word' }) : null)}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2 text-[11.5px] font-semibold text-gray-800 outline-none cursor-pointer"
                      >
                        <option value="PDF">PDF (recomendado)</option>
                        <option value="Word">Word (.docx)</option>
                      </select>
                    </div>

                    {/* Tamaño de papel */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600">
                        Tamaño de papel
                      </label>
                      <select
                        value={horarioConfig.paperSize}
                        onChange={e => setHorarioConfig(actual => ({ ...actual, paperSize: e.target.value as 'A4' | 'Carta' }))}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2 text-[11.5px] font-semibold text-gray-800 outline-none cursor-pointer"
                      >
                        <option value="A4">A4 (210 x 297 mm)</option>
                        <option value="Carta">Carta (Letter)</option>
                      </select>
                    </div>

                    {/* Tamaño de letra y Tipografía */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600">
                        Tamaño letra (pt)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="20"
                        value={horarioConfig.documentFontSize}
                        onChange={e => setHorarioConfig(actual => ({ ...actual, documentFontSize: Number(e.target.value) || 6 }))}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2 text-[11.5px] font-semibold text-gray-800 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600">
                        Tipografía
                      </label>
                      <select
                        value={horarioConfig.typography}
                        onChange={e => setHorarioConfig(actual => ({ ...actual, typography: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2 text-[11.5px] font-semibold text-gray-800 outline-none cursor-pointer"
                      >
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Arial">Arial</option>
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                      </select>
                    </div>
                  </div>

                  {/* Orientación (Botones estilo pestaña como en la imagen) */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600">
                      Orientación del documento
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setHorarioConfig(actual => ({ ...actual, orientation: 'vertical' }))}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-[11.5px] font-bold transition-all cursor-pointer ${
                          horarioConfig.orientation === 'vertical'
                            ? 'border-espoch-red bg-red-50/80 text-espoch-red shadow-2xs ring-1 ring-espoch-red/30'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <FileText className="w-4 h-4" /> Vertical
                      </button>
                      <button
                        type="button"
                        onClick={() => setHorarioConfig(actual => ({ ...actual, orientation: 'horizontal' }))}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-[11.5px] font-bold transition-all cursor-pointer ${
                          horarioConfig.orientation === 'horizontal'
                            ? 'border-espoch-red bg-red-50/80 text-espoch-red shadow-2xs ring-1 ring-espoch-red/30'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <LayoutGrid className="w-4 h-4" /> Horizontal
                      </button>
                    </div>
                  </div>

                  {/* Switches de formato: Logo y Firma */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                    <label className="flex items-center justify-between p-2 rounded-xl border border-gray-100 hover:bg-gray-50/60 transition-colors cursor-pointer">
                      <span className="text-[11px] font-bold text-gray-700">Incluir logo institucional</span>
                      <input
                        type="checkbox"
                        checked={incluirLogo}
                        onChange={e => setIncluirLogo(e.target.checked)}
                        className="w-4 h-4 rounded accent-espoch-red cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-xl border border-gray-100 hover:bg-gray-50/60 transition-colors cursor-pointer">
                      <span className="text-[11px] font-bold text-gray-700">Incluir firma responsable / pie de página</span>
                      <input
                        type="checkbox"
                        checked={incluirFirma}
                        onChange={e => {
                          setIncluirFirma(e.target.checked);
                          setHorarioConfig(actual => ({ ...actual, includeFooter: e.target.checked }));
                        }}
                        className="w-4 h-4 rounded accent-espoch-red cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Datos en casillas (PAO, Carrera, Docente) */}
                  {modalExportar.tipo === 'Horarios' && (
                    <div className="flex flex-col gap-2 p-3 rounded-2xl border border-gray-100 bg-gray-50/60">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                        Datos visibles en las casillas
                      </span>
                      <div className="flex flex-wrap gap-4 pt-0.5">
                        {([
                          ['paoParalelo', 'PAO y paralelo'],
                          ['carrera', 'Carrera'],
                          ['docente', 'Docente'],
                        ] as const).map(([clave, etiqueta]) => (
                          <label key={clave} className="flex items-center gap-2 text-[11px] font-bold text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={horarioConfig.camposClase[clave]}
                              onChange={e => setHorarioConfig(actual => ({
                                ...actual,
                                camposClase: { ...actual.camposClase, [clave]: e.target.checked },
                              }))}
                              className="w-4 h-4 rounded accent-espoch-red cursor-pointer"
                            />
                            {etiqueta}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Left Bottom Action Buttons (Guardar configuración & Generar vista previa) */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/70 flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem('horario-export-prefs', JSON.stringify(horarioConfig));
                        setGuardadoExitoso(true);
                        setTimeout(() => setGuardadoExitoso(false), 2500);
                      } catch { /* ignorar */ }
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      guardadoExitoso
                        ? 'border-green-300 bg-green-50 text-green-700 shadow-2xs'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 shadow-2xs'
                    }`}
                  >
                    {guardadoExitoso ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" /> ¡Configuración guardada!
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4 text-gray-500" /> Guardar configuración
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // Trigger preview visual refresh
                      setZoomPrevia(100);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-espoch-red hover:bg-[#a80c1d] text-white text-[11.5px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer hover:shadow-md"
                  >
                    <Eye className="w-4 h-4" /> Generar vista previa
                  </button>
                </div>
              </div>

              {/* ── COLUMNA 2: VISTA PREVIA DEL REPORTE ── */}
              <div className="flex flex-col min-h-0 bg-[#f8fafc]">
                {/* Col Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">Vista previa del reporte</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">Revisa el resultado antes de exportar o imprimir.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                      {horarioConfig.paperSize} · {horarioConfig.orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
                    </span>
                  </div>
                </div>

                {/* Sheet Canvas: Renderiza la maqueta EXACTA idéntica al documento exportado */}
                <div className="flex-1 min-h-0 overflow-auto p-4 md:p-8 flex justify-center items-start bg-[#525659] custom-scrollbar">
                  {modalExportar.tipo === 'Horarios' && (
                    <div className="flex justify-center items-start py-2">
                      <PlantillaPDF
                        pdfZoom={Math.round((zoomPrevia / 100) * (horarioConfig.orientation === 'horizontal' ? 70 : 96))}
                        orientation={horarioConfig.orientation}
                        paperSize={horarioConfig.paperSize}
                        typography={horarioConfig.typography}
                        headerImg={localStorage.getItem('espoch_header_img') || ''}
                        footerImg={localStorage.getItem('espoch_footer_img') || ''}
                        documentFontSize={horarioConfig.documentFontSize}
                        exportAula={aulaParaPrevia?.aula || 'AULA 102'}
                        exportAulaId={aulaParaPrevia?.id || ''}
                        exportEdificio={aulaParaPrevia?.edificio || (edificios.find(e => e.id === edificioHorariosVigente)?.nombre || 'EDIFICIO DE AULAS')}
                        exportCarrera=""
                        exportPeriodo={horarioConfig.exportPeriodo}
                        clases={clases}
                        includeFooter={incluirFirma}
                        includeLogo={incluirLogo}
                        camposClase={horarioConfig.camposClase}
                      />
                    </div>
                  )}

                  {modalExportar.tipo === 'Docentes' && (
                    <div
                      style={{
                        transform: `scale(${(zoomPrevia / 120) * (horarioConfig.orientation === 'horizontal' ? 0.70 : 0.96)})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="flex-shrink-0 py-2"
                    >
                      <div
                        className={`bg-white shadow-[0_30px_60px_rgba(0,0,0,0.12)] px-[70px] pb-8 pt-6 flex flex-col text-gray-900 transition-all ${
                          horarioConfig.orientation === 'vertical' ? 'w-[800px] min-h-[1132px]' : 'w-[1300px] min-h-[919px]'
                        }`}
                        style={{ fontFamily: getFontFamily(horarioConfig.typography) }}
                      >
                        {/* HEADER AS A TABLE FOR WORD/PDF COMPATIBILITY */}
                        <table width="100%" style={{ borderCollapse: 'collapse', border: 'none', borderBottom: '1px solid #ef4444', marginBottom: '12px' }}>
                          <tbody>
                            <tr>
                              <td width="200" align="left" valign="top" style={{ padding: 0 }}>
                                {incluirLogo && (
                                  <img src={localStorage.getItem('espoch_header_img') || banderaEspoch} alt="Escudo ESPOCH" style={{ height: '115px', width: '175px', display: 'block', margin: 0 }} />
                                )}
                              </td>
                              <td align="center" valign="middle" style={{ paddingBottom: '4px' }}>
                                <h1 style={{ fontSize: `${horarioConfig.documentFontSize + 7}pt`, fontWeight: '900', letterSpacing: '2px', color: '#0f172a', margin: '0 0 12px 0', textTransform: 'uppercase', fontFamily: getFontFamily(horarioConfig.typography) }}>
                                  ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO
                                </h1>
                                <h2 style={{ fontSize: `${horarioConfig.documentFontSize + 3}pt`, fontWeight: '600', letterSpacing: '1px', color: '#475569', margin: '0', textTransform: 'uppercase', fontFamily: getFontFamily(horarioConfig.typography) }}>
                                  FACULTAD DE INFORMÁTICA Y ELECTRÓNICA
                                </h2>
                              </td>
                              <td width="150"></td>
                            </tr>
                          </tbody>
                        </table>

                        {/* DETAILS SECTION (LEFT ALIGNED) */}
                        <div className="mb-2 text-[#0f172a] block text-left" style={{ fontFamily: getFontFamily(horarioConfig.typography) }}>
                          <div className="block mb-2">
                            <span className="font-black uppercase tracking-wide inline-block pb-0.5 pr-10" style={{ fontSize: `${horarioConfig.documentFontSize + 4}pt`, borderBottom: '2px solid black', fontFamily: getFontFamily(horarioConfig.typography) }}>
                              {docenteParaPrevia?.docente || 'SELECCIONE UN DOCENTE'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 text-[11px] font-black uppercase text-[#0f172a]" style={{ fontSize: `${horarioConfig.documentFontSize + 1}pt` }}>
                            <div>TOTAL DE HORAS SEMANALES: {docenteParaPrevia?.horasSemana || 0}</div>
                            <div>{(docenteParaPrevia?.materias || []).length} {docenteParaPrevia?.materias.length === 1 ? 'MATERIA' : 'MATERIAS'}: {(docenteParaPrevia?.materias || []).join(' · ')}</div>
                            <div>{horarioConfig.exportPeriodo}</div>
                          </div>
                        </div>

                        {/* HORARIO TABLE */}
                        <div className="mt-3 flex-grow">
                          <table width="100%" style={{ borderCollapse: 'collapse', border: '1.5px solid #222222', tableLayout: 'fixed' }}>
                            <thead>
                              <tr style={{ background: '#ffffff' }}>
                                <th style={{ border: '1.5px solid #222222', width: '130px', padding: '6px 4px', textAlign: 'center', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize}pt`, textTransform: 'uppercase', color: '#0f172a' }}>
                                  HORA
                                </th>
                                {diasFormales.map(dia => (
                                  <th key={dia} style={{ border: '1.5px solid #222222', padding: '6px 4px', textAlign: 'center', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize}pt`, textTransform: 'uppercase', color: '#0f172a' }}>
                                    {dia}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {horas.map(franja => (
                                <tr key={franja}>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                    {franja.replace(/:00/g, 'H00')}
                                  </td>
                                  {diasFormales.map(dia => {
                                    const bloque = (docenteParaPrevia?.bloques || []).find((b: any) => mismoDia(b.dia, dia) && rangoIncluyeBloque(`${b.horaInicio} - ${b.horaFin}`, franja));
                                    return (
                                      <td key={dia} style={{ border: '1.5px solid #222222', padding: '3px 4px', textAlign: 'center', verticalAlign: 'middle', height: '44px' }}>
                                        {bloque ? (
                                          <div className="flex flex-col gap-0.5 leading-tight justify-center items-center">
                                            <span style={{ fontSize: `${horarioConfig.documentFontSize}pt` }} className="font-black text-[#0f172a] uppercase block w-full text-center">
                                              {bloque.materia}
                                            </span>
                                            {horarioConfig.camposClase.paoParalelo && bloque.pao != null && (
                                              <span style={{ fontSize: `${horarioConfig.documentFontSize}pt` }} className="uppercase font-medium text-[#475569] block w-full text-center">
                                                {etiquetaPaoParalelo(bloque.pao, bloque.paralelo)}
                                              </span>
                                            )}
                                            {horarioConfig.camposClase.carrera && (
                                              <span style={{ fontSize: `${horarioConfig.documentFontSize}pt` }} className="uppercase font-medium text-[#475569] block w-full text-center">
                                                {[bloque.aula, bloque.carrera].filter(Boolean).join(' · ')}
                                              </span>
                                            )}
                                          </div>
                                        ) : null}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* FOOTER */}
                        {incluirFirma && (
                          <div className="mt-auto pt-6 text-center text-[10px] text-gray-500 font-medium tracking-wide block w-full" style={{ fontFamily: getFontFamily(horarioConfig.typography) }}>
                            Panamericana Sur Km. 1 ½. | Teléfono: 593 (03) 2 998-200 | Telefax: (03) 2 317-001 | Código Postal: EC060155. Riobamba - Ecuador
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {modalExportar.tipo === 'Disponibilidad' && (
                    <div
                      style={{
                        transform: `scale(${(zoomPrevia / 120) * (horarioConfig.orientation === 'horizontal' ? 0.70 : 0.96)})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="flex-shrink-0 py-2"
                    >
                      <div
                        className={`bg-white shadow-[0_30px_60px_rgba(0,0,0,0.12)] px-[70px] pb-8 pt-6 flex flex-col text-gray-900 transition-all ${
                          horarioConfig.orientation === 'vertical' ? 'w-[800px] min-h-[1132px]' : 'w-[1300px] min-h-[919px]'
                        }`}
                        style={{ fontFamily: getFontFamily(horarioConfig.typography) }}
                      >
                        <table width="100%" style={{ borderCollapse: 'collapse', border: 'none', borderBottom: '1px solid #ef4444', marginBottom: '12px' }}>
                          <tbody>
                            <tr>
                              <td width="200" align="left" valign="top" style={{ padding: 0 }}>
                                {incluirLogo && (
                                  <img src={localStorage.getItem('espoch_header_img') || banderaEspoch} alt="Escudo ESPOCH" style={{ height: '115px', width: '175px', display: 'block', margin: 0 }} />
                                )}
                              </td>
                              <td align="center" valign="middle" style={{ paddingBottom: '4px' }}>
                                <h1 style={{ fontSize: `${horarioConfig.documentFontSize + 7}pt`, fontWeight: '900', letterSpacing: '2px', color: '#0f172a', margin: '0 0 12px 0', textTransform: 'uppercase', fontFamily: getFontFamily(horarioConfig.typography) }}>
                                  ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO
                                </h1>
                                <h2 style={{ fontSize: `${horarioConfig.documentFontSize + 3}pt`, fontWeight: '600', letterSpacing: '1px', color: '#475569', margin: '0', textTransform: 'uppercase', fontFamily: getFontFamily(horarioConfig.typography) }}>
                                  FACULTAD DE INFORMÁTICA Y ELECTRÓNICA
                                </h2>
                              </td>
                              <td width="150"></td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="mb-3 text-[#0f172a] block text-left" style={{ fontFamily: getFontFamily(horarioConfig.typography) }}>
                          <div className="block mb-2">
                            <span className="font-black uppercase tracking-wide inline-block pb-0.5 pr-10" style={{ fontSize: `${horarioConfig.documentFontSize + 4}pt`, borderBottom: '2px solid black', fontFamily: getFontFamily(horarioConfig.typography) }}>
                              REPORTE DE DISPONIBILIDAD DE ESPACIOS
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 text-[11px] font-black uppercase text-[#0f172a]" style={{ fontSize: `${horarioConfig.documentFontSize + 1}pt` }}>
                            <div>EDIFICIO: {edificios.find(e => e.id === edificioHorariosVigente)?.nombre || 'TODOS LOS EDIFICIOS'}</div>
                            <div>PERÍODO: {horarioConfig.exportPeriodo} · TOTAL ESPACIOS: {espaciosDisponiblesData.length}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex-grow">
                          <table width="100%" style={{ borderCollapse: 'collapse', border: '1.5px solid #222222', tableLayout: 'fixed' }}>
                            <thead>
                              <tr style={{ background: '#ffffff' }}>
                                <th style={{ border: '1.5px solid #222222', padding: '6px 6px', textAlign: 'left', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize + 1}pt`, textTransform: 'uppercase', color: '#0f172a', width: '22%' }}>ESPACIO</th>
                                <th style={{ border: '1.5px solid #222222', padding: '6px 6px', textAlign: 'left', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize + 1}pt`, textTransform: 'uppercase', color: '#0f172a', width: '24%' }}>EDIFICIO</th>
                                <th style={{ border: '1.5px solid #222222', padding: '6px 6px', textAlign: 'center', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize + 1}pt`, textTransform: 'uppercase', color: '#0f172a', width: '18%' }}>TIPO</th>
                                <th style={{ border: '1.5px solid #222222', padding: '6px 6px', textAlign: 'center', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize + 1}pt`, textTransform: 'uppercase', color: '#0f172a', width: '18%' }}>HORAS LIBRES</th>
                                <th style={{ border: '1.5px solid #222222', padding: '6px 6px', textAlign: 'center', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize + 1}pt`, textTransform: 'uppercase', color: '#0f172a', width: '18%' }}>ESTADO</th>
                              </tr>
                            </thead>
                            <tbody>
                              {espaciosDisponiblesData.slice(0, 15).map(esp => (
                                <tr key={esp.id}>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 6px', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#0f172a' }}>{esp.nombre}</td>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 6px', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#334155' }}>{esp.edificio}</td>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 6px', textAlign: 'center', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#334155' }}>{esp.tipo}</td>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 6px', textAlign: 'center', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#0f172a' }}>{esp.horasLibres} H / SEM</td>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#15803d' }}>DISPONIBLE</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {incluirFirma && (
                          <div className="mt-auto pt-6 text-center text-[10px] text-gray-500 font-medium tracking-wide block w-full" style={{ fontFamily: getFontFamily(horarioConfig.typography) }}>
                            Panamericana Sur Km. 1 ½. | Teléfono: 593 (03) 2 998-200 | Telefax: (03) 2 317-001 | Código Postal: EC060155. Riobamba - Ecuador
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {modalExportar.tipo === 'Historial' && (
                    <div
                      style={{
                        transform: `scale(${(zoomPrevia / 120) * (horarioConfig.orientation === 'horizontal' ? 0.70 : 0.96)})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="flex-shrink-0 py-2"
                    >
                      <div
                        className={`bg-white shadow-[0_30px_60px_rgba(0,0,0,0.12)] px-[70px] pb-8 pt-6 flex flex-col text-gray-900 transition-all ${
                          horarioConfig.orientation === 'vertical' ? 'w-[800px] min-h-[1132px]' : 'w-[1300px] min-h-[919px]'
                        }`}
                        style={{ fontFamily: getFontFamily(horarioConfig.typography) }}
                      >
                        <table width="100%" style={{ borderCollapse: 'collapse', border: 'none', borderBottom: '1px solid #ef4444', marginBottom: '12px' }}>
                          <tbody>
                            <tr>
                              <td width="200" align="left" valign="top" style={{ padding: 0 }}>
                                {incluirLogo && (
                                  <img src={localStorage.getItem('espoch_header_img') || banderaEspoch} alt="Escudo ESPOCH" style={{ height: '115px', width: '175px', display: 'block', margin: 0 }} />
                                )}
                              </td>
                              <td align="center" valign="middle" style={{ paddingBottom: '4px' }}>
                                <h1 style={{ fontSize: `${horarioConfig.documentFontSize + 7}pt`, fontWeight: '900', letterSpacing: '2px', color: '#0f172a', margin: '0 0 12px 0', textTransform: 'uppercase', fontFamily: getFontFamily(horarioConfig.typography) }}>
                                  ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO
                                </h1>
                                <h2 style={{ fontSize: `${horarioConfig.documentFontSize + 3}pt`, fontWeight: '600', letterSpacing: '1px', color: '#475569', margin: '0', textTransform: 'uppercase', fontFamily: getFontFamily(horarioConfig.typography) }}>
                                  FACULTAD DE INFORMÁTICA Y ELECTRÓNICA
                                </h2>
                              </td>
                              <td width="150"></td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="mb-3 text-[#0f172a] block text-left" style={{ fontFamily: getFontFamily(horarioConfig.typography) }}>
                          <div className="block mb-2">
                            <span className="font-black uppercase tracking-wide inline-block pb-0.5 pr-10" style={{ fontSize: `${horarioConfig.documentFontSize + 4}pt`, borderBottom: '2px solid black', fontFamily: getFontFamily(horarioConfig.typography) }}>
                              REGISTRO DE AUDITORÍA E HISTORIAL DE REPORTES
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 text-[11px] font-black uppercase text-[#0f172a]" style={{ fontSize: `${horarioConfig.documentFontSize + 1}pt` }}>
                            <div>SISTEMA INSTITUCIONAL DE GESTIÓN HORARIA FIE</div>
                            <div>FECHA DE EMISIÓN: {new Date().toLocaleDateString('es-EC')} · TOTAL REGISTROS: {historial.length}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex-grow">
                          <table width="100%" style={{ borderCollapse: 'collapse', border: '1.5px solid #222222', tableLayout: 'fixed' }}>
                            <thead>
                              <tr style={{ background: '#ffffff' }}>
                                <th style={{ border: '1.5px solid #222222', padding: '6px 6px', textAlign: 'left', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize + 1}pt`, textTransform: 'uppercase', color: '#0f172a', width: '22%' }}>FECHA</th>
                                <th style={{ border: '1.5px solid #222222', padding: '6px 6px', textAlign: 'left', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize + 1}pt`, textTransform: 'uppercase', color: '#0f172a', width: '26%' }}>TIPO DE REPORTE</th>
                                <th style={{ border: '1.5px solid #222222', padding: '6px 6px', textAlign: 'center', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize + 1}pt`, textTransform: 'uppercase', color: '#0f172a', width: '16%' }}>FORMATO</th>
                                <th style={{ border: '1.5px solid #222222', padding: '6px 6px', textAlign: 'left', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize + 1}pt`, textTransform: 'uppercase', color: '#0f172a', width: '22%' }}>GENERADO POR</th>
                                <th style={{ border: '1.5px solid #222222', padding: '6px 6px', textAlign: 'center', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize + 1}pt`, textTransform: 'uppercase', color: '#0f172a', width: '14%' }}>ESTADO</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historial.slice(0, 15).map(h => (
                                <tr key={h.id}>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 6px', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#0f172a', whiteSpace: 'nowrap' }}>{formatearFecha(h.created_at)}</td>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 6px', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#0f172a' }}>{h.tipo}</td>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 6px', textAlign: 'center', fontWeight: '900', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#c91024' }}>{h.formato}</td>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 6px', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#334155' }}>{h.generadoPorNombre || 'Administrador'}</td>
                                  <td style={{ border: '1.5px solid #222222', padding: '5px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: `${horarioConfig.documentFontSize}pt`, color: '#15803d' }}>OFICIAL</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {incluirFirma && (
                          <div className="mt-auto pt-6 text-center text-[10px] text-gray-500 font-medium tracking-wide block w-full" style={{ fontFamily: getFontFamily(horarioConfig.typography) }}>
                            Panamericana Sur Km. 1 ½. | Teléfono: 593 (03) 2 998-200 | Telefax: (03) 2 317-001 | Código Postal: EC060155. Riobamba - Ecuador
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Bottom Footer: Zoom, Paginación y Botones de Exportar / Imprimir */}
                <div className="p-4 border-t border-gray-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
                  {/* Paginación y Zoom */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setPaginaPrevia(p => Math.max(1, p - 1))}
                        disabled={paginaPrevia <= 1}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-bold text-gray-700 px-1.5">
                        {paginaPrevia} / 1
                      </span>
                      <button
                        type="button"
                        onClick={() => setPaginaPrevia(p => p + 1)}
                        disabled={true}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setZoomPrevia(z => Math.max(60, z - 10))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white cursor-pointer"
                        title="Reducir zoom"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-bold text-gray-700 px-1 min-w-[42px] text-center">
                        {zoomPrevia}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomPrevia(z => Math.min(140, z + 10))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white cursor-pointer"
                        title="Aumentar zoom"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Botones de acción principales (PDF, Word, Imprimir) */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => void confirmarExportacionModal('PDF')}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-[11.5px] font-bold shadow-xs transition-all cursor-pointer disabled:opacity-40"
                    >
                      <FileText className="w-4 h-4 text-espoch-red" /> Exportar PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => void confirmarExportacionModal('Word')}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-[11.5px] font-bold shadow-xs transition-all cursor-pointer disabled:opacity-40"
                    >
                      <Download className="w-4 h-4 text-blue-600" /> Exportar Word
                    </button>

                    <button
                      type="button"
                      onClick={() => void confirmarExportacionModal('PDF')}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-espoch-red hover:bg-[#a80c1d] text-white text-[11.5px] font-bold shadow-sm transition-all cursor-pointer hover:shadow-md disabled:opacity-40"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCcw className="w-4 h-4 animate-spin" /> Procesando...
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" /> Imprimir
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
