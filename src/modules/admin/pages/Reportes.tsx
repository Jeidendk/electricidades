import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, BookOpen, Clock, Download, BarChart2,
  Users, Calendar, ChevronRight, Eye, Trash2, X, Building2,
  Search, ArrowLeft, Filter, RefreshCcw, ChevronLeft, ChevronDown,
  LayoutGrid, Armchair, CheckCircle2, SlidersHorizontal,
} from 'lucide-react';
import { useReportesStore } from '../../../store/reportesStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { useClasesStore } from '../../../store/clasesStore';
import { mapearClases } from '../components/Horarios/mapearClases';
import { CAMPOS_CLASE_POR_DEFECTO, dias, etiquetaPaoParalelo } from '../components/Horarios/horariosData';
import { PlantillaPDF } from '../components/Horarios/PlantillaPDF';
import { exportarHorariosWord, imprimirHorariosPdf, ubicacionesConClases, type OpcionesHorario } from '../data/exportarHorarios';
import { resumirDocentes, type ResumenDocente } from '../data/reporteDocentes';
import { exportarPdfDocentes, exportarWordDocentes } from '../data/exportarReporteDocentes';
import { calcularDisponibilidad, minutosHora, mostrarHora } from '../../../lib/disponibilidadEspacios';
import { normalizarTexto } from '../../../lib/texto';
import { exportarPdfDisponibilidad, exportarWordDisponibilidad } from '../data/exportarDisponibilidad';
import { exportarPdfHistorial, exportarWordHistorial } from '../data/exportarHistorial';
import { avisoError } from '../../../lib/aviso';
import fondoCargaDocente from '../../../assets/reportes/carga-docente.webp';
import fondoHorariosAula from '../../../assets/reportes/horarios-aula.webp';
import fondoHistorialReportes from '../../../assets/reportes/historial-reportes.webp';
import fondoInventario from '../../../assets/reportes/inventario.webp';
import fondoInfraestructura from '../../../assets/reportes/infraestructura.webp';
import fondoMantenimiento from '../../../assets/reportes/mantenimiento.webp';

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

  const confirmarExportacionModal = async () => {
    if (!modalExportar) return;
    const { tipo, formato, modo, item } = modalExportar;
    setModalExportar(null);
    if (tipo === 'Horarios') {
      if (modo === 'masivo') await exportarAulasSeleccionadas(formato);
      else if (item) await exportarAulaIndividual(item, formato);
    } else if (tipo === 'Docentes') {
      if (modo === 'masivo') await exportarDocentesSeleccionados(formato);
      else if (item) await exportarDocenteIndividual(item, formato);
    } else if (tipo === 'Disponibilidad') {
      if (modo === 'masivo') await exportarEspaciosSeleccionados(formato);
      else if (item) await exportarEspacioIndividual(item, formato);
    } else if (tipo === 'Historial') {
      if (modo === 'masivo') await exportarHistorialSeleccionados(formato);
      else if (item) await exportarHistorialIndividual(item, formato);
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
          <div className={tipoReporte === 'Historial' ? 'flex flex-col flex-1 min-h-0' : 'grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] 2xl:grid-cols-[430px_minmax(0,1fr)] gap-6 flex-1 min-h-0'}>

            {/* ── COLUMNA IZQUIERDA: CONFIGURACIÓN DEL REPORTE (NO APLICA PARA HISTORIAL) ── */}
            {tipoReporte !== 'Historial' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-6 flex flex-col min-h-0">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-espoch-red flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-extrabold text-gray-900 leading-tight">Configuración del reporte</h3>
                    <p className="text-[10.5px] text-gray-500 mt-0.5">Parámetros de formato, alcance y filtros de exportación.</p>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-5 pr-1">
                  {/* Parámetros para Horarios */}
                  {tipoReporte === 'Horarios' && (
                    <div className="flex flex-col gap-3">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Qué horarios incluir</label>
                      <select value={alcanceHorarios} onChange={e => setAlcanceHorarios(e.target.value as 'edificio' | 'facultad')} className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-[12px] font-semibold text-gray-800">
                        <option value="edificio">Todas las aulas de un edificio</option>
                        <option value="facultad">Toda la facultad, por edificio</option>
                      </select>
                      {alcanceHorarios === 'edificio' && (
                        <select value={edificioHorariosVigente} onChange={e => setEdificioHorariosId(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-[12px] font-semibold text-gray-800">
                          {edificiosConHorario.length === 0 && <option value="">Sin edificios con horarios</option>}
                          {edificiosConHorario.map(edificio => <option key={edificio.id} value={edificio.id}>{edificio.nombre}</option>)}
                        </select>
                      )}
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Período académico</label>
                      <input value={horarioConfig.exportPeriodo} onChange={e => setHorarioConfig(actual => ({ ...actual, exportPeriodo: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-[11px] font-semibold text-gray-800" />
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
                          <select value={horarioConfig.typography} onChange={e => setHorarioConfig(actual => ({ ...actual, typography: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-[11px]"><option>Times New Roman</option><option>Arial</option><option>Inter</option><option>Roboto</option></select>
                        </label>
                      </div>
                      <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-3">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Datos en casillas</span>
                        {([
                          ['paoParalelo', 'PAO y paralelo'], ['carrera', 'Carrera'], ['docente', 'Docente'],
                        ] as const).map(([clave, etiqueta]) => (
                          <label key={clave} className="flex items-center gap-2 text-[10.5px] font-semibold text-gray-700">
                            <input type="checkbox" checked={horarioConfig.camposClase[clave]} onChange={e => setHorarioConfig(actual => ({ ...actual, camposClase: { ...actual.camposClase, [clave]: e.target.checked } }))} className="accent-espoch-red" />{etiqueta}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parámetros para Carga Docente */}
                  {tipoReporte === 'Docentes' && (
                    <div className="flex flex-col gap-4">
                      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Resumen de carga</span>
                        <p className="mt-1 text-[12px] font-bold text-gray-800">{todosDocentes.length} docentes registrados</p>
                        <p className="text-[11px] text-gray-500">{todosDocentes.reduce((acc, d) => acc + d.horasSemana, 0)} horas semanales asignadas</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Período académico</label>
                        <input value={horarioConfig.exportPeriodo} onChange={e => setHorarioConfig(actual => ({ ...actual, exportPeriodo: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-[11px] font-semibold text-gray-800" />
                      </div>

                      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                        <label className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Acciones rápidas</label>
                        <button
                          type="button"
                          onClick={() => setDocentesSeleccionados([])}
                          disabled={docentesSeleccionados.length === 0}
                          className="w-full py-2 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-[11px] font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" /> Limpiar selección ({docentesSeleccionados.length})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Parámetros para Disponibilidad de Espacios */}
                  {tipoReporte === 'Disponibilidad' && (
                    <div className="flex flex-col gap-3">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Día de la semana</label>
                      <select value={diaDisponibilidad} onChange={e => setDiaDisponibilidad(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-[12px] font-semibold text-gray-800">
                        {dias.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>

                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Edificio</label>
                      <select value={edificioDisponibilidadId} onChange={e => setEdificioDisponibilidadId(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-[12px] font-semibold text-gray-800">
                        <option value="">Todos los edificios</option>
                        {edificios.map(edificio => <option key={edificio.id} value={edificio.id}>{edificio.nombre}</option>)}
                      </select>

                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Tipo de espacio</label>
                      <select value={tipoEspacioDisponibilidad} onChange={e => setTipoEspacioDisponibilidad(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-[12px] font-semibold text-gray-800">
                        <option value="">Todos los tipos</option>
                        <option value="aula">Aulas</option>
                        <option value="laboratorio">Laboratorios</option>
                      </select>

                      <div className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-[10.5px] text-amber-800">
                        <span className="font-bold block">Jornada horaria:</span>
                        07:00 a 21:00 (14 horas operativas por día)
                      </div>

                      {espaciosSeleccionados.size > 0 && (
                        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Acciones rápidas</label>
                          <button
                            type="button"
                            onClick={() => setEspaciosSeleccionados(new Set())}
                            className="w-full py-2 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-[11px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" /> Limpiar selección ({espaciosSeleccionados.size})
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── COLUMNA DERECHA: TABLA Y VISTA DEL REPORTE ── */}
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
                        placeholder="Buscar aula o edificio..."
                        className="w-full h-[42px] rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-[12px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200/50 transition-all"
                      />
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[11.5px] font-semibold text-gray-700">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="hidden sm:inline">Período:</span> {horarioConfig.exportPeriodo}
                    </span>
                    {alcanceHorarios === 'edificio' && edificioHorariosVigente && (
                      <span className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-[11.5px] font-semibold text-blue-700">
                        <Building2 className="w-4 h-4" />
                        <span className="truncate max-w-[180px]">{edificios.find(e => e.id === edificioHorariosVigente)?.nombre || 'Edificio'}</span>
                      </span>
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
                      onClick={() => { setBusquedaHorarios(''); setFiltroEstadoHorarios('todos'); setAulasSeleccionadas(new Set()); }}
                      className="inline-flex items-center gap-1.5 bg-transparent text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors px-2 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Limpiar filtros
                    </button>

                    {/* Botones de exportación masiva condicional */}
                    {aulasSeleccionadas.size > 0 && (
                      <div className="flex items-center gap-2 pl-3 border-l border-gray-200 animate-fade-in flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-espoch-red bg-red-50 border border-red-200/60 rounded-xl px-2.5 py-2 shadow-2xs">
                          {aulasSeleccionadas.size} sel.
                        </span>
                        <button
                          type="button"
                          onClick={() => void exportarAulasSeleccionadas('PDF')}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> Exportar PDF ({aulasSeleccionadas.size})
                        </button>
                        <button
                          type="button"
                          onClick={() => void exportarAulasSeleccionadas('Word')}
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
                      onClick={() => { setBusquedaDocente(''); setDocentesSeleccionados([]); }}
                      className="inline-flex items-center gap-1.5 bg-transparent text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors px-2 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Limpiar filtros
                    </button>

                    {/* Botones de exportación masiva para Docentes */}
                    {docentesSeleccionados.length > 0 && (
                      <div className="flex items-center gap-2 pl-3 border-l border-gray-200 animate-fade-in flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-espoch-red bg-red-50 border border-red-200/60 rounded-xl px-2.5 py-2 shadow-2xs">
                          {docentesSeleccionados.length} sel.
                        </span>
                        <button
                          type="button"
                          onClick={() => void exportarDocentesSeleccionados('PDF')}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> Exportar PDF ({docentesSeleccionados.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => void exportarDocentesSeleccionados('Word')}
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
                      onClick={() => { setBusquedaHistorial(''); setFiltroTipoHistorial('todos'); setFiltroFormatoHistorial('todos'); setHistorialSeleccionados(new Set()); }}
                      className="inline-flex items-center gap-1.5 bg-transparent text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors px-2 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Limpiar filtros
                    </button>

                    {/* Botones de exportación masiva condicional para Historial */}
                    {historialSeleccionados.size > 0 && (
                      <div className="flex items-center gap-2 pl-3 border-l border-gray-200 animate-fade-in flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-espoch-red bg-red-50 border border-red-200/60 rounded-xl px-2.5 py-2 shadow-2xs">
                          {historialSeleccionados.size} sel.
                        </span>
                        <button
                          type="button"
                          onClick={() => void exportarHistorialSeleccionados('PDF')}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> Exportar PDF ({historialSeleccionados.size})
                        </button>
                        <button
                          type="button"
                          onClick={() => void exportarHistorialSeleccionados('Word')}
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
                        placeholder="Buscar espacio..."
                        className="w-full h-[42px] rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-[12px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200/50 transition-all"
                      />
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[11.5px] font-semibold text-gray-700">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      Día: {diaDisponibilidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setBusquedaDisponibilidad(''); setEspaciosSeleccionados(new Set()); }}
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
                          onClick={() => void exportarEspaciosSeleccionados('PDF')}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3.5 py-2 text-[11.5px] font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> Exportar PDF ({espaciosSeleccionados.size})
                        </button>
                        <button
                          type="button"
                          onClick={() => void exportarEspaciosSeleccionados('Word')}
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
                                  onClick={() => void exportarAulaIndividual(fila, 'PDF')}
                                  disabled={isGenerating}
                                  title="Exportar horario en PDF"
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200/60 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void exportarAulaIndividual(fila, 'Word')}
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
                                  onClick={() => void exportarDocenteIndividual(docente, 'PDF')}
                                  disabled={isGenerating}
                                  title="Descargar carga docente en PDF"
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200/60 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void exportarDocenteIndividual(docente, 'Word')}
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
                                  onClick={() => void exportarHistorialIndividual(r, 'PDF')}
                                  disabled={isGenerating}
                                  title="Exportar registro en PDF"
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200/60 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void exportarHistorialIndividual(r, 'Word')}
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
                                  onClick={() => void exportarEspacioIndividual(espacio, 'PDF')}
                                  disabled={isGenerating}
                                  title="Exportar espacio en PDF"
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200/60 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void exportarEspacioIndividual(espacio, 'Word')}
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
                    {Array.from({ length: totalPaginasHorarios }, (_, i) => i + 1).map(p => (
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
                    {Array.from({ length: totalPaginasDocente }, (_, i) => i + 1).map(p => (
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
                    {Array.from({ length: totalPaginasHistorial }, (_, i) => i + 1).map(p => (
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
                    {Array.from({ length: totalPaginasDisponibilidad }, (_, i) => i + 1).map(p => (
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
    </div>
  );
};
