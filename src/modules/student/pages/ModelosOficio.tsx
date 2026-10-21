import { useEffect, useMemo, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Clock, Download, ExternalLink, FileText, Folder, GraduationCap, LayoutGrid, List, Printer, Save, Search, Send, Trash2, Upload, UserRound, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useFormatosStore } from '../../../store/formatosStore';
import { construirArbol, idsConDescendientes, useSeriesFormatosStore } from '../../../store/seriesFormatosStore';
import { perfilesRepositorio } from '../../admin/data/repositorioElectricidad';
import { generatePreviewDOCX, generatePreviewPDF, type DocumentParams } from '../../admin/utils/documentGenerator';
import { useTramitesStore } from '../../../store/tramitesStore';
import { cargarDestinosDelEstudiante, type DestinoInstitucional } from '../../../lib/destinatariosInstitucionales';
import { eliminarFirma, guardarFirma, leerFirma, motivoDeRechazoDeFirma } from '../../../lib/firmaEstudiante';
import { puedeEditarloElEstudiante, type DocumentoPresentado } from '../../../lib/tramitesAcademicos';
import { avisoError, avisoExito, avisoInfo, confirmarAccion } from '../../../lib/aviso';
import { friendlyDbError } from '../../../lib/notifyError';
import type { Database } from '../../../lib/database.types';
import { supabase } from '../../../lib/supabase';
import { componerNombreCompleto } from '../../../lib/texto';
import { esUrlSegura } from '../../../lib/urlSegura';
import {
  esMarcadorDePerfil,
  destinatarioDe,
  marcadoresDe,
  plantillaDe,
  prellenarDesdePerfil,
  rellenarMarcadores,
  type PlantillaOficio,
} from '../../../lib/plantillaOficio';

type FormatoRow = Database['public']['Tables']['formatos']['Row'];

/**
 * Qué ve el estudiante: las plantillas que rellena aquí (`DINAMICO`) y los documentos que la
 * facultad publica como enlace (`ENLACE`). Antes solo entraban las primeras, así que un
 * documento enlazado dentro de una categoría suya no aparecía en ninguna parte.
 */
const TIPOS_VISIBLES = ['DINAMICO', 'ENLACE'];

interface Destinatario {
  id: string;
  nombre: string;
  titulo: string;
  cargo: string;
  origen: string;
}

interface OficioValues {
  nombreFormato: string;
  ciudadOficio: string;
  fechaOficio: string;
  tituloAutoridad: string;
  tituloAutoridadOtro: string;
  nombreAutoridad: string;
  cargoDestinatario: string;
  enSuDespacho: string;
  nombresApellidos: string;
  ci: string;
  codigoEstudiantil: string;
  numeroPao: string;
  carrera: string;
  facultad: string;
  descripcion: string;
  despedida: string;
  cierre: string;
  nombreFirma: string;
  ciFirma: string;
  headerImg: string;
  footerImg: string;
}

const valoresIniciales: OficioValues = {
  nombreFormato: '', ciudadOficio: 'Riobamba', fechaOficio: new Date().toISOString().slice(0, 10),
  tituloAutoridad: 'Ing.', tituloAutoridadOtro: '', nombreAutoridad: '',
  cargoDestinatario: 'DIRECTOR DE LA CARRERA DE ELECTRICIDAD', enSuDespacho: 'En su despacho,',
  nombresApellidos: '', ci: '', codigoEstudiantil: '', numeroPao: '', carrera: '', facultad: '',
  descripcion: '', despedida: 'Agradezco de antemano la atención brindada y quedo atento a su respuesta.',
  cierre: 'Atentamente,', nombreFirma: '', ciFirma: '', headerImg: '', footerImg: '',
};

const descargarBlob = (blob: Blob, nombre: string) => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
};

function formatearFecha(fechaStr?: string | null): string {
  if (!fechaStr) return '29/9/2026';
  const partes = fechaStr.slice(0, 10).split('-');
  if (partes.length === 3) {
    return `${Number(partes[2])}/${Number(partes[1])}/${partes[0]}`;
  }
  return fechaStr;
}

function tiempoRelativo(dateStr?: string | null): string {
  if (!dateStr) return 'Hace unos días';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Hace unos días';
  const diff = Math.max(0, Date.now() - time);
  const min = Math.floor(diff / 60000);
  if (min < 60) return `Hace ${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} hora${h !== 1 ? 's' : ''}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Hace ${d} día${d !== 1 ? 's' : ''}`;
  const m = Math.floor(d / 30);
  if (m < 12) return `Hace ${m} mes${m !== 1 ? 'es' : ''}`;
  const y = Math.floor(m / 12);
  return `Hace ${y} año${y !== 1 ? 's' : ''}`;
}

export const ModelosOficio = () => {
  const usuario = useAuthStore(state => state.user);
  const { formatos, loading, error, fetchFormatos } = useFormatosStore();
  const { series, fetchSeries } = useSeriesFormatosStore();
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<'recientes' | 'nombre'>('recientes');
  const [vista, setVista] = useState<'tarjetas' | 'lista'>('tarjetas');
  const [categoriaMostrada, setCategoriaMostrada] = useState<string | null>(null);
  const [plantillaActiva, setPlantillaActiva] = useState<FormatoRow | null>(null);
  const [catFiltros, setCatFiltros] = useState<string[]>([]);
  const [formatoFiltros, setFormatoFiltros] = useState<string[]>([]);
  const [vigenciaFiltros, setVigenciaFiltros] = useState<string[]>([]);
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    tipo: true,
    formato: true,
    vigencia: true,
  });

  const toggleFilter = (setter: Dispatch<SetStateAction<string[]>>, val: string) => {
    setter(prev => (prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]));
  };

  const clearFiltros = () => {
    setCatFiltros([]);
    setFormatoFiltros([]);
    setVigenciaFiltros([]);
    setBusqueda('');
  };

  const filtrosActivos = catFiltros.length + formatoFiltros.length + vigenciaFiltros.length;

  /**
   * Lo que el estudiante escribe en los huecos de una plantilla transcrita, por marcador.
   * Las plantillas hechas a mano en el generador no tienen marcadores y siguen el camino de
   * siempre: los campos fijos del formulario.
   */
  const [marcadores, setMarcadores] = useState<Record<string, string>>({});

  const plantillaTranscrita = useMemo(
    () => (plantillaActiva ? plantillaDe(plantillaActiva.datos) : null),
    [plantillaActiva],
  );

  /** Los huecos que pide el documento, separados por quién puede responderlos. */
  const datosPersonales = useMemo(
    () => (plantillaTranscrita ? marcadoresDe(plantillaTranscrita).filter(esMarcadorDePerfil) : []),
    [plantillaTranscrita],
  );
  const detallesSolicitud = useMemo(
    () => (plantillaTranscrita ? marcadoresDe(plantillaTranscrita).filter(m => !esMarcadorDePerfil(m)) : []),
    [plantillaTranscrita],
  );

  const [values, setValues] = useState<OficioValues>(valoresIniciales);
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);

  // --- Trámite en curso -----------------------------------------------------
  // Descargar, guardar y presentar son tres cosas distintas: descargar no envía nada, y
  // presentar no obliga a descargar antes.
  const guardarBorradorTramite = useTramitesStore(estado => estado.guardarBorrador);
  const enviarTramite = useTramitesStore(estado => estado.enviar);
  const tramites = useTramitesStore(estado => estado.tramites);
  const fetchTramites = useTramitesStore(estado => estado.fetchTramites);
  const [tramiteId, setTramiteId] = useState<number | null>(null);
  const [numeroTramite, setNumeroTramite] = useState<string>('');
  const [versionTramite, setVersionTramite] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // --- Destino del trámite --------------------------------------------------
  const [destinos, setDestinos] = useState<DestinoInstitucional[]>([]);
  const [destinoId, setDestinoId] = useState<string>('');
  const destinoElegido = useMemo(
    () => destinos.find(destino => destino.id === destinoId) ?? null,
    [destinos, destinoId],
  );

  // --- Imagen de firma ------------------------------------------------------
  // Opcional siempre: sin ella el documento deja el espacio en blanco para firmar a mano.
  const [firmaImagen, setFirmaImagen] = useState<string | null>(null);
  const [incluirFirma, setIncluirFirma] = useState(false);
  const [firmaOcupada, setFirmaOcupada] = useState(false);

  useEffect(() => {
    void fetchFormatos();
    void fetchSeries();
    if (usuario?.id) {
      void fetchTramites(usuario.id);
    }
  }, [fetchFormatos, fetchSeries, fetchTramites, usuario?.id]);

  useEffect(() => {
    const cargarDestinatarios = async () => {
      const [usuariosResult, carrerasResult, facultadesResult] = await Promise.all([
        supabase.from('usuarios').select('id, nombre, apellido, titulo, estado, facultad_nombre, roles(nombre)').eq('estado', 'activo'),
        supabase.from('carreras').select('id, nombre, director').eq('estado', 'activo'),
        supabase.from('facultades').select('id, nombre, decano').eq('estado', 'activo'),
      ]);

      type UsuarioDirectorio = { id: string; nombre: string; apellido: string; titulo: string | null; facultad_nombre: string | null; roles: { nombre: string } | { nombre: string }[] | null };
      type CarreraDirectorio = { id: string; nombre: string; director: string };
      type FacultadDirectorio = { id: string; nombre: string; decano: string };
      const usuarios = (usuariosResult.data || []) as unknown as UsuarioDirectorio[];
      const carreras = (carrerasResult.data || []) as unknown as CarreraDirectorio[];
      const facultades = (facultadesResult.data || []) as unknown as FacultadDirectorio[];

      const desdeUsuarios: Destinatario[] = usuarios.flatMap(usuario => {
        const rol = Array.isArray(usuario.roles) ? usuario.roles[0]?.nombre : usuario.roles?.nombre;
        if (!rol || /estudiante/i.test(rol)) return [];
        return [{
          id: `usuario-${usuario.id}`,
          nombre: componerNombreCompleto(usuario.nombre, usuario.apellido),
          titulo: usuario.titulo || '',
          cargo: rol.toLocaleUpperCase('es'),
          origen: usuario.facultad_nombre || rol,
        }];
      });

      const separarTitulo = (texto: string) => {
        const coincidencia = texto.trim().match(/^(Ing\.|Lic\.|Mgs\.|MSc\.|PhD\.|Dr\.|Dra\.)\s+(.+)$/i);
        return coincidencia ? { titulo: coincidencia[1], nombre: coincidencia[2] } : { titulo: '', nombre: texto.trim() };
      };
      const desdeCarreras: Destinatario[] = carreras.filter(carrera => carrera.director?.trim()).map(carrera => {
        const persona = separarTitulo(carrera.director);
        return { id: `carrera-${carrera.id}`, nombre: persona.nombre, titulo: persona.titulo, cargo: `DIRECTOR/A DE LA CARRERA DE ${carrera.nombre.toLocaleUpperCase('es')}`, origen: carrera.nombre };
      });
      const desdeFacultades: Destinatario[] = facultades.filter(facultad => facultad.decano?.trim()).map(facultad => {
        const persona = separarTitulo(facultad.decano);
        return { id: `facultad-${facultad.id}`, nombre: persona.nombre, titulo: persona.titulo, cargo: `DECANO/A DE ${facultad.nombre.toLocaleUpperCase('es')}`, origen: facultad.nombre };
      });

      const unicos = new Map<string, Destinatario>();
      for (const persona of [...desdeCarreras, ...desdeFacultades, ...desdeUsuarios]) {
        unicos.set(`${persona.nombre.toLocaleLowerCase('es')}|${persona.cargo.toLocaleLowerCase('es')}`, persona);
      }
      setDestinatarios([...unicos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    };
    void cargarDestinatarios();
  }, []);

  /**
   * Reabrir un borrador o una corrección: `?tramite=<id>`.
   *
   * Sin esto, "Corregir" desde Mis trámites obligaba a rellenar el oficio entero otra vez, que
   * es exactamente lo que el coordinador NO pidió cambiar.
   */
  const [parametrosUrl, setParametrosUrl] = useSearchParams();
  const idTramiteUrl = parametrosUrl.get('tramite');

  useEffect(() => {
    if (!idTramiteUrl || !usuario?.id) return;
    let vigente = true;

    void supabase
      .from('solicitudes_admin')
      .select('id, numero, version, estado, id_formato, id_destinatario, borrador')
      .eq('id', Number(idTramiteUrl))
      .maybeSingle()
      .then(({ data }) => {
        const fila = data as any;
        if (!vigente || !fila) return;
        if (!puedeEditarloElEstudiante(fila.estado)) {
          void avisoInfo(
            'Este trámite ya no se edita',
            'Solo puedes corregir un borrador o un trámite que el coordinador te haya devuelto.',
          );
          return;
        }

        setTramiteId(fila.id);
        setNumeroTramite(fila.numero);
        setVersionTramite(fila.version ?? 0);

        const documento = fila.borrador as DocumentoPresentado | null;
        if (documento?.valores) {
          setValues(actual => ({ ...actual, ...documento.valores } as OficioValues));
          setMarcadores(documento.marcadores ?? {});
          // La firma se vuelve a elegir a propósito: que el documento anterior la llevara no
          // significa que el estudiante quiera incorporarla otra vez sin decirlo.
        }
        const formato = formatos.find(candidato => candidato.id === fila.id_formato);
        if (formato) setPlantillaActiva(formato);
      });

    return () => { vigente = false; };
  }, [idTramiteUrl, usuario?.id, formatos]);

  // Los destinos posibles del estudiante: el coordinador de su carrera y el decano. Si ninguno
  // tiene cuenta configurada, la pantalla lo dice y no deja presentar.
  useEffect(() => {
    let vigente = true;
    void cargarDestinosDelEstudiante(usuario?.carreraId, usuario?.facultadNombre).then(lista => {
      if (!vigente) return;
      setDestinos(lista);
      const conCuenta = lista.find(destino => destino.idUsuario);
      if (conCuenta) setDestinoId(conCuenta.id);
    });
    return () => { vigente = false; };
  }, [usuario?.carreraId, usuario?.facultadNombre]);

  // La firma vive en el bucket privado `firmas`, no en localStorage: la clave compartida hacía
  // que en un equipo del laboratorio el siguiente estudiante heredara la firma del anterior.
  useEffect(() => {
    let vigente = true;
    if (!usuario?.id) return;
    void supabase
      .from('usuarios')
      .select('firma_path')
      .eq('id', usuario.id)
      .maybeSingle()
      .then(async ({ data }) => {
        const imagen = await leerFirma((data as { firma_path?: string } | null)?.firma_path);
        if (vigente) setFirmaImagen(imagen);
      });
    return () => { vigente = false; };
  }, [usuario?.id]);

  const categoriasEstudiantes = useMemo(() => {
    const codigos = perfilesRepositorio.find(perfil => perfil.id === 'estudiantes')?.codigos || [];
    return series.filter(serie => {
      if (serie.publico) return serie.publico === 'estudiantes';
      const codigo = serie.codigo || '';
      return codigos.some(base => codigo === base || codigo.startsWith(`${base}.`));
    });
  }, [series]);

  const idsEstudiantes = useMemo(() => new Set(categoriasEstudiantes.map(serie => serie.id)), [categoriasEstudiantes]);
  const arbolCategorias = useMemo(() => construirArbol(categoriasEstudiantes), [categoriasEstudiantes]);
  const plantillasEstudiantes = useMemo(() => formatos.filter(formato => TIPOS_VISIBLES.includes(formato.tipo)
    && formato.estado === 'activo'
    && !!formato.id_serie
    && idsEstudiantes.has(formato.id_serie)), [formatos, idsEstudiantes]);

  /**
   * El árbol aplanado para la barra lateral: cada categoría con su nivel de anidamiento y el
   * número de modelos que contiene, **contando los de sus subcategorías**. Es lo que espera
   * quien lee el número: si una categoría dice 4, abrirla tiene que mostrar 4.
   */
  const categoriasPlanas = useMemo(() => {
    const filas: { id: string; nombre: string; nivel: number; ids: string[] }[] = [];
    const recorrer = (ramas: typeof arbolCategorias, nivel: number) => {
      for (const rama of ramas) {
        filas.push({ id: rama.id, nombre: rama.nombre, nivel, ids: idsConDescendientes(rama) });
        recorrer(rama.hijas, nivel + 1);
      }
    };
    recorrer(arbolCategorias, 0);
    return filas.map(fila => {
      const ids = new Set(fila.ids);
      return { ...fila, cantidad: plantillasEstudiantes.filter(f => f.id_serie && ids.has(f.id_serie)).length };
    });
  }, [arbolCategorias, plantillasEstudiantes]);

  /**
   * Estadísticas de modelos de oficio para el hero banner.
   */
  const estadisticas = useMemo(() => {
    const total = plantillasEstudiantes.length;
    let titulacion = 0;
    let practicas = 0;
    let docx = 0;
    let pptx = 0;

    for (const f of plantillasEstudiantes) {
      const nombre = (f.nombre + ' ' + (f.descripcion || '')).toLowerCase();
      if (nombre.includes('titula') || nombre.includes('grado')) titulacion++;
      else if (nombre.includes('práctica') || nombre.includes('practica') || nombre.includes('laboral')) practicas++;

      if (f.tipo !== 'ENLACE' || nombre.includes('.docx') || f.enlace?.includes('.docx')) docx++;
      if (nombre.includes('.pptx') || f.enlace?.includes('.pptx')) pptx++;
    }

    const generales = Math.max(0, total - titulacion - practicas);
    const vigentes = total;

    return { total, titulacion, practicas, generales, docx, pptx, vigentes };
  }, [plantillasEstudiantes]);

  interface ItemActividad {
    id: string;
    tipo: 'TRAMITE' | 'FORMATO';
    nombre: string;
    subtitulo: string;
    fecha: string;
    colorPunto: string;
    badge?: string;
    esEnlace?: boolean;
    onClick: () => void;
  }

  const actividadReciente = useMemo<ItemActividad[]>(() => {
    const lista: ItemActividad[] = [];

    // 1. Trámites ocupados o guardados por el estudiante
    for (const t of tramites) {
      let subtitulo = 'Trámite presentado';
      let colorPunto = 'bg-amber-500';
      if (t.estado === 'aprobado') {
        subtitulo = 'Trámite aprobado';
        colorPunto = 'bg-emerald-500';
      } else if (t.estado === 'rechazado') {
        subtitulo = 'Trámite con observaciones';
        colorPunto = 'bg-red-500';
      } else if (t.estado === 'cambios_solicitados') {
        subtitulo = 'Cambios solicitados';
        colorPunto = 'bg-red-500';
      } else if (t.estado === 'borrador') {
        subtitulo = 'Borrador guardado';
        colorPunto = 'bg-blue-500';
      } else if (t.estado === 'pendiente') {
        subtitulo = 'Trámite presentado / en revisión';
        colorPunto = 'bg-amber-500';
      }

      const formatoAsociado = t.idFormato
        ? plantillasEstudiantes.find(f => f.id === t.idFormato)
        : null;

      lista.push({
        id: `tramite-${t.id}`,
        tipo: 'TRAMITE',
        nombre: t.asunto || (formatoAsociado?.nombre ?? `Trámite ${t.numero}`),
        subtitulo,
        fecha: t.enviadaEn || t.fecha || '',
        colorPunto,
        badge: 'MI TRÁMITE',
        onClick: () => {
          if (formatoAsociado) {
            abrirPlantilla(formatoAsociado);
          }
        },
      });
    }

    // 2. Formatos y modelos subidos o actualizados
    for (const f of plantillasEstudiantes) {
      const fueActualizado = Boolean(f.updated_at && f.created_at && f.updated_at !== f.created_at);
      const subtitulo = fueActualizado
        ? 'Modelo actualizado'
        : f.tipo === 'ENLACE'
          ? 'Documento publicado'
          : 'Nuevo formato subido';

      const colorPunto = fueActualizado
        ? 'bg-emerald-500'
        : f.tipo === 'ENLACE'
          ? 'bg-blue-500'
          : 'bg-emerald-500';

      lista.push({
        id: `formato-${f.id}`,
        tipo: 'FORMATO',
        nombre: f.nombre,
        subtitulo,
        fecha: f.updated_at || f.created_at || '',
        colorPunto,
        badge: f.tipo === 'ENLACE' ? 'ENLACE' : 'OFICIO',
        esEnlace: f.tipo === 'ENLACE',
        onClick: () => {
          if (f.tipo === 'ENLACE') abrirEnlace(f.enlace);
          else abrirPlantilla(f);
        },
      });
    }

    // Ordenar de más reciente a más antiguo y mostrar solo los últimos 8
    return lista
      .filter(item => Boolean(item.fecha))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 8);
  }, [tramites, plantillasEstudiantes]);

  const nombreDeLoMostrado = useMemo(() => {
    if (catFiltros.length === 1) {
      return categoriasPlanas.find(fila => fila.id === catFiltros[0] || fila.nombre === catFiltros[0])?.nombre || 'Modelos seleccionados';
    }
    if (catFiltros.length > 1) {
      return `${catFiltros.length} categorías seleccionadas`;
    }
    return 'Todos los modelos';
  }, [categoriasPlanas, catFiltros]);

  const plantillas = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase('es');
    let lista = [...plantillasEstudiantes];

    // Filtro por checkboxes de categorías
    if (catFiltros.length > 0) {
      const selectedIds = new Set(
        categoriasPlanas.filter(c => catFiltros.includes(c.id) || catFiltros.includes(c.nombre)).flatMap(c => c.ids),
      );
      lista = lista.filter(f => f.id_serie && selectedIds.has(f.id_serie));
    }

    // Filtro por formato de archivo
    if (formatoFiltros.length > 0) {
      lista = lista.filter(f => {
        const str = (f.nombre + ' ' + (f.enlace || '')).toLowerCase();
        if (formatoFiltros.includes('docx') && (f.tipo !== 'ENLACE' || str.includes('.docx'))) return true;
        if (formatoFiltros.includes('pptx') && str.includes('.pptx')) return true;
        if (formatoFiltros.includes('pdf') && str.includes('.pdf')) return true;
        return false;
      });
    }

    // Filtro por búsqueda
    if (consulta) {
      lista = lista.filter(f => {
        const cat = series.find(s => s.id === f.id_serie)?.nombre || '';
        return `${f.nombre} ${f.descripcion || ''} ${cat}`.toLocaleLowerCase('es').includes(consulta);
      });
    }

    return lista.sort((a, b) => (orden === 'nombre'
      ? a.nombre.localeCompare(b.nombre, 'es')
      : (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '')));
  }, [busqueda, catFiltros, formatoFiltros, categoriasPlanas, series, orden, plantillasEstudiantes]);

  /**
   * Sin "Todas las categorías", la pantalla necesita abrir en alguna parte: la primera del
   * árbol. Si agrupa otras se despliega, para que la siguiente elección esté a la vista.
   */
  useEffect(() => {
    if (categoriaMostrada || arbolCategorias.length === 0) return;
    const buscarHoja = (ramas: typeof arbolCategorias): { id: string } | null => {
      for (const rama of ramas) {
        if (rama.hijas.length === 0) return { id: rama.id };
        const hallada = buscarHoja(rama.hijas);
        if (hallada) return hallada;
      }
      return null;
    };
    const hoja = buscarHoja(arbolCategorias);
    if (!hoja) return;
    setCategoriaMostrada(hoja.id);
  }, [arbolCategorias, categoriaMostrada]);

  /** El documento vive fuera del sistema: se abre en otra pestaña, no se descarga de aquí. */
  const abrirEnlace = (url: string | null) => {
    if (!esUrlSegura(url)) return;
    window.open(url!, '_blank', 'noopener,noreferrer');
  };

  /** Los valores de un modelo, ya completados con los datos del estudiante. */
  const valoresDe = (plantilla: FormatoRow): OficioValues => {
    const datos = (plantilla.datos && typeof plantilla.datos === 'object' ? plantilla.datos : {}) as unknown as Partial<OficioValues>;
    const nombre = usuario?.nombre || datos.nombresApellidos || '';
    return {
      ...valoresIniciales,
      ...datos,
      nombreFormato: plantilla.nombre,
      fechaOficio: new Date().toISOString().slice(0, 10),
      nombresApellidos: nombre,
      nombreFirma: nombre,
      carrera: usuario?.carreraNombre || datos.carrera || '',
      facultad: usuario?.facultadNombre || datos.facultad || '',
      numeroPao: usuario?.pao ? `PAO ${usuario.pao}` : (datos.numeroPao || ''),
      // Las imágenes institucionales son configuración, no parte del documento: se leen de
      // "Logos y Sellos" y nunca de lo que la plantilla traiga copiado, o quitarlas ahí no las
      // quitaría de las plantillas ya guardadas.
      headerImg: localStorage.getItem('espoch_header_img') || '',
      footerImg: localStorage.getItem('espoch_footer_img') || '',
    };
  };

  /** Datos del estudiante que sirven para prellenar huecos. La cédula no se guarda en el perfil. */
  const perfilParaOficio = {
    nombreCompleto: usuario?.nombre || '',
    codigoInstitucional: usuario?.codigoInstitucional || '',
    carrera: usuario?.carreraNombre || '',
    facultad: usuario?.facultadNombre || '',
    pao: usuario?.pao,
  };

  const abrirPlantilla = (plantilla: FormatoRow) => {
    setValues(valoresDe(plantilla));
    const transcrita = plantillaDe(plantilla.datos);
    setMarcadores(transcrita ? prellenarDesdePerfil(marcadoresDe(transcrita), perfilParaOficio) : {});
    setPlantillaActiva(plantilla);
  };

  const cuerpoDe = (v: OficioValues) => `Reciba un cordial saludo. Por la presente, Yo, ${v.nombresApellidos}, con C.I: ${v.ci} y código estudiantil ${v.codigoEstudiantil}, estudiante del ${v.numeroPao} de la carrera de ${v.carrera} correspondiente a la ${v.facultad}, solicito amablemente, ${v.descripcion || 'lo que se solicita.'}`;
  const fechaDe = (v: OficioValues) => `${v.ciudadOficio}, ${new Date(v.fechaOficio + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  /** Los parámetros del documento para UNOS valores, no necesariamente los del formulario:
   *  así la vista previa de una tarjeta no pisa lo que el estudiante esté escribiendo. */
  const parametrosDe = (v: OficioValues): DocumentParams => ({
    headerImgBase64: v.headerImg,
    footerImgBase64: v.footerImg,
    tituloAutoridad: v.tituloAutoridad === 'Otro' ? v.tituloAutoridadOtro : v.tituloAutoridad,
    nombreAutoridad: v.nombreAutoridad,
    cargo: v.cargoDestinatario,
    lugarFecha: fechaDe(v),
    cuerpo: cuerpoDe(v),
    studentName: v.nombreFirma,
    studentCI: v.ciFirma,
  });


  /** El texto de la plantilla con los huecos ya rellenados, listo para imprimir o previsualizar. */
  const documentoDePlantilla = (
    plantilla: PlantillaOficio,
    valores: Record<string, string>,
    base: OficioValues,
  ): DocumentParams => {
    const { titulo, nombre, cargo } = destinatarioDe(plantilla.destinatario);
    const rellenar = (texto: string) => rellenarMarcadores(texto, valores);
    return {
      headerImgBase64: base.headerImg,
      footerImgBase64: base.footerImg,
      tituloAutoridad: titulo,
      nombreAutoridad: nombre,
      cargo,
      lugarFecha: fechaDe(base),
      asunto: rellenar(plantilla.asunto),
      // "Presente." es lo que escriben estos oficios; el generador a mano usa otra fórmula.
      presente: 'Presente.',
      cuerpo: plantilla.parrafos.map(rellenar),
      adjuntos: plantilla.adjuntos.map(rellenar),
      cierre: 'Por la atención dispensada, anticipo mi agradecimiento.',
      studentName: base.nombreFirma,
      studentCI: base.ciFirma,
    };
  };

  /** Los parámetros de un formato cualquiera: transcrito o armado con los campos fijos. */
  const parametrosDeFormato = (
    formato: FormatoRow,
    valores: Record<string, string>,
    base: OficioValues,
  ): DocumentParams => {
    const plantilla = plantillaDe(formato.datos);
    return plantilla ? documentoDePlantilla(plantilla, valores, base) : parametrosDe(base);
  };

  const parametrosDocumento = (): DocumentParams => ({
    ...(plantillaActiva ? parametrosDeFormato(plantillaActiva, marcadores, values) : parametrosDe(values)),
    // Nunca se inserta sola: aunque haya firma guardada, hace falta marcarlo aquí.
    firmaImagen: incluirFirma ? firmaImagen : null,
  });

  /**
   * Lo que se guarda de un envío: el documento resuelto, no una referencia a la plantilla.
   * Si mañana cambia la plantilla, el logo o la firma del perfil, esto sigue diciendo lo mismo.
   */
  const documentoPresentado = (numero: string, version: number): DocumentoPresentado => {
    const doc = parametrosDocumento();
    return {
      idFormato: plantillaActiva?.id ?? null,
      nombreFormato: values.nombreFormato || plantillaActiva?.nombre || 'Oficio',
      destinatario: { titulo: doc.tituloAutoridad, nombre: doc.nombreAutoridad, cargo: doc.cargo },
      valores: { ...values },
      marcadores: { ...marcadores },
      contenido: {
        asunto: doc.asunto || values.nombreFormato || 'Trámite académico',
        parrafos: Array.isArray(doc.cuerpo) ? doc.cuerpo : [doc.cuerpo],
        adjuntos: doc.adjuntos ?? [],
      },
      firmaImagen: doc.firmaImagen ?? null,
      encabezadoImagen: values.headerImg || null,
      pieImagen: values.footerImg || null,
      numero,
      version,
      generadoEn: new Date().toISOString(),
    };
  };

  const asuntoDelTramite = () => {
    const doc = parametrosDocumento();
    return (doc.asunto || values.nombreFormato || 'Trámite académico').slice(0, 180);
  };

  /** Guarda sin presentar. El coordinador no ve nada todavía. */
  const guardarBorrador = async (): Promise<number | null> => {
    if (guardando || enviando) return null;
    setGuardando(true);
    try {
      const guardado = await guardarBorradorTramite({
        id: tramiteId,
        asunto: asuntoDelTramite(),
        tipo: 'Oficio',
        idDestinatario: destinoElegido?.idUsuario ?? null,
        idFormato: plantillaActiva?.id ?? null,
        documento: documentoPresentado(numeroTramite, versionTramite),
        descripcion: values.descripcion || null,
      });
      setTramiteId(guardado.id);
      setNumeroTramite(guardado.numero);
      setVersionTramite(guardado.version);
      return guardado.id;
    } catch (err: any) {
      const amigable = friendlyDbError(err);
      void avisoError(amigable.title, err?.message || amigable.text);
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const onGuardarBorrador = async () => {
    const id = await guardarBorrador();
    if (id !== null) void avisoExito('Borrador guardado', 'Puedes seguir editándolo desde Mis trámites.');
  };

  /**
   * Presenta el trámite: guarda primero y envía después, para no anunciar un envío que no
   * ocurrió. Si el envío falla, el borrador queda guardado y se puede reintentar sin duplicar:
   * el servidor exige que siga en borrador para aceptarlo.
   */
  const onEnviar = async () => {
    if (guardando || enviando) return;
    if (!usuario?.id) {
      void avisoInfo('Sesión no válida', 'Vuelve a iniciar sesión para presentar el trámite.');
      return;
    }
    if (!destinoElegido?.idUsuario) {
      void avisoInfo(
        'Sin coordinador configurado',
        'Tu carrera todavía no tiene una cuenta de coordinador asociada, así que el trámite no '
        + 'tiene a quién llegar. Puedes descargar el documento e imprimirlo mientras tanto.',
      );
      return;
    }
    if (!values.descripcion.trim() && !plantillaActiva) {
      void avisoInfo('Falta el detalle', 'Describe lo que solicitas antes de presentar el trámite.');
      return;
    }

    const confirmado = await confirmarAccion({
      title: '¿Presentar el trámite?',
      text: `Se enviará a ${destinoElegido.nombre || 'el coordinador'} y no podrás editarlo mientras lo revisa.`,
      confirmar: 'Sí, presentar',
    });
    if (!confirmado) return;

    const id = await guardarBorrador();
    if (id === null) return;

    setEnviando(true);
    try {
      const siguiente = versionTramite + 1;
      const enviado = await enviarTramite(id, documentoPresentado(numeroTramite, siguiente));
      if (enviado) {
        setVersionTramite(siguiente);
        if (idTramiteUrl) setParametrosUrl({}, { replace: true });
        void avisoExito('Trámite presentado', 'Puedes seguir su estado en Mis trámites.');
      }
    } catch (err: any) {
      const amigable = friendlyDbError(err);
      void avisoError(amigable.title, err?.message || amigable.text);
    } finally {
      setEnviando(false);
    }
  };

  const onSubirFirma = async (archivo: File | undefined) => {
    if (!archivo || !usuario?.id) return;
    const motivo = motivoDeRechazoDeFirma(archivo);
    if (motivo) {
      void avisoError('Imagen no válida', motivo);
      return;
    }
    setFirmaOcupada(true);
    try {
      const { dataUrl } = await guardarFirma(usuario.id, archivo);
      setFirmaImagen(dataUrl);
      void avisoExito('Imagen de firma guardada');
    } catch (err: any) {
      void avisoError('No se pudo guardar la firma', err?.message || 'Vuelve a intentarlo.');
    } finally {
      setFirmaOcupada(false);
    }
  };

  const onEliminarFirma = async () => {
    if (!usuario?.id) return;
    const confirmado = await confirmarAccion({
      title: '¿Eliminar tu imagen de firma?',
      text: 'Los trámites que ya presentaste conservan la copia que llevaban: esto solo afecta a los próximos.',
      confirmar: 'Sí, eliminar',
    });
    if (!confirmado) return;
    setFirmaOcupada(true);
    try {
      await eliminarFirma(usuario.id);
      setFirmaImagen(null);
      setIncluirFirma(false);
    } catch (err: any) {
      void avisoError('No se pudo eliminar', err?.message || 'Vuelve a intentarlo.');
    } finally {
      setFirmaOcupada(false);
    }
  };

  const descargar = async (tipo: 'pdf' | 'docx') => {
    const base = (values.nombreFormato || 'Oficio').replace(/[^a-z0-9áéíóúñ]+/gi, '_');
    const blob = tipo === 'pdf' ? generatePreviewPDF(parametrosDocumento()) : await generatePreviewDOCX(parametrosDocumento());
    descargarBlob(blob, `${base}.${tipo}`);
  };

  const abrirParaImprimir = () => {
    const url = URL.createObjectURL(generatePreviewPDF(parametrosDocumento()));
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const cambiar = (campo: keyof OficioValues, valor: string) => setValues(actual => ({ ...actual, [campo]: valor }));
  const seleccionarDestinatario = (destinatario: Destinatario) => setValues(actual => ({
    ...actual,
    tituloAutoridad: destinatario.titulo,
    tituloAutoridadOtro: '',
    nombreAutoridad: destinatario.nombre,
    cargoDestinatario: destinatario.cargo,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f7fb]">
      {/* ── HERO BANNER CONSISTENTE CON EL DISEÑO ───────────────────── */}
      <div className="relative flex min-h-[92px] shrink-0 items-center overflow-hidden border-b border-gray-800 bg-[#121721] px-6 py-4 shadow-sm lg:px-10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#121721] via-[#121721]/95 to-[#121721]/80" />
        
        <div className="relative z-10 flex w-full items-center justify-between flex-wrap gap-4">
          {/* Título & Icono */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-espoch-red text-white shadow-lg shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight">Modelos de oficio</h1>
              <p className="mt-0.5 text-[11px] text-gray-400 font-medium">Completa un modelo institucional y descárgalo para imprimir y entregar.</p>
            </div>
          </div>

          {/* Estadísticas Centrales del Hero */}
          <div className="hidden lg:flex items-center gap-6 bg-white/[0.04] rounded-xl px-5 py-2.5 border border-white/5 shadow-inner">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[14px] font-black text-white leading-tight">{estadisticas.total}</span>
                <span className="text-[9px] font-medium text-gray-400 leading-none">Total oficios</span>
              </div>
            </div>
            
            <div className="w-px h-6 bg-white/10" />

            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-4 h-4 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[14px] font-black text-white leading-tight">{estadisticas.titulacion}</span>
                <span className="text-[9px] font-medium text-gray-400 leading-none">Titulación</span>
              </div>
            </div>

            <div className="w-px h-6 bg-white/10" />

            <div className="flex items-center gap-2.5">
              <Briefcase className="w-4 h-4 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[14px] font-black text-white leading-tight">{estadisticas.practicas}</span>
                <span className="text-[9px] font-medium text-gray-400 leading-none">Prácticas</span>
              </div>
            </div>

            <div className="w-px h-6 bg-white/10" />

            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[14px] font-black text-white leading-tight">{estadisticas.generales}</span>
                <span className="text-[9px] font-medium text-gray-400 leading-none">Generales</span>
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center gap-2 text-[11px] font-bold tracking-wider">
            <span className="text-slate-400">INICIO</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-amber-400 font-black">FORMATOS</span>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL: 3 COLUMNAS ─────────────────────────── */}
      <div className="flex-1 flex w-full p-5 lg:p-8 gap-6 items-stretch overflow-hidden min-h-0">
        
        {/* COLUMNA 1: SIDEBAR FILTRAR FORMATOS */}
        <aside
          className="w-[245px] shrink-0 hidden lg:flex flex-col gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          
          {/* Header filtros + limpiar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">FILTRAR FORMATOS</h3>
            <button
              onClick={clearFiltros}
              disabled={filtrosActivos === 0}
              className="text-xs font-semibold text-slate-400 hover:text-red-600 disabled:text-slate-300 disabled:hover:text-slate-300 disabled:cursor-default transition-colors cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>

          {/* Acordeón 1: Tipo de trámite */}
          <div className="flex flex-col pb-3 border-b border-slate-100">
            <button
              onClick={() => setSeccionesAbiertas(prev => ({ ...prev, tipo: !prev.tipo }))}
              className="flex items-center justify-between text-left py-1 text-xs font-bold text-slate-900 group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-slate-500" />
                <span className="uppercase tracking-wider">Tipo de trámite</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${seccionesAbiertas.tipo ? 'rotate-180' : ''}`} />
            </button>
            
            {seccionesAbiertas.tipo && (
              <div className="flex flex-col gap-2 mt-3 pl-1">
                {categoriasPlanas.map(cat => {
                  const isChecked = catFiltros.includes(cat.id) || catFiltros.includes(cat.nombre);
                  return (
                    <label key={cat.id} className="flex items-center justify-between gap-2 cursor-pointer group">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={isChecked}
                          onChange={() => toggleFilter(setCatFiltros, cat.id)}
                        />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                          {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]" />}
                        </div>
                        <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate">{cat.nombre}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">{cat.cantidad}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acordeón 2: Formato de archivo */}
          <div className="flex flex-col pb-3 border-b border-slate-100">
            <button
              onClick={() => setSeccionesAbiertas(prev => ({ ...prev, formato: !prev.formato }))}
              className="flex items-center justify-between text-left py-1 text-xs font-bold text-slate-900 group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="uppercase tracking-wider">Formato de archivo</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${seccionesAbiertas.formato ? 'rotate-180' : ''}`} />
            </button>
            
            {seccionesAbiertas.formato && (
              <div className="flex flex-col gap-2 mt-3 pl-1">
                {[
                  { id: 'docx', label: 'Documento Word (.DOCX)', count: estadisticas.docx },
                  { id: 'pptx', label: 'Presentación (.PPTX)', count: estadisticas.pptx },
                  { id: 'pdf', label: 'Plantilla PDF (.PDF)', count: estadisticas.total },
                ].map(fmt => {
                  const isChecked = formatoFiltros.includes(fmt.id);
                  return (
                    <label key={fmt.id} className="flex items-center justify-between gap-2 cursor-pointer group">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={isChecked}
                          onChange={() => toggleFilter(setFormatoFiltros, fmt.id)}
                        />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                          {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]" />}
                        </div>
                        <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate">{fmt.label}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">{fmt.count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acordeón 3: Vigencia */}
          <div className="flex flex-col">
            <button
              onClick={() => setSeccionesAbiertas(prev => ({ ...prev, vigencia: !prev.vigencia }))}
              className="flex items-center justify-between text-left py-1 text-xs font-bold text-slate-900 group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
                <span className="uppercase tracking-wider">Vigencia</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${seccionesAbiertas.vigencia ? 'rotate-180' : ''}`} />
            </button>
            
            {seccionesAbiertas.vigencia && (
              <div className="flex flex-col gap-2 mt-3 pl-1">
                {[
                  { id: 'vigente', label: 'Vigente Periodo 2026', count: estadisticas.vigentes },
                  { id: 'referencia', label: 'Guías de referencia', count: Math.max(1, Math.round(estadisticas.total * 0.15)) },
                ].map(vig => {
                  const isChecked = vigenciaFiltros.includes(vig.id);
                  return (
                    <label key={vig.id} className="flex items-center justify-between gap-2 cursor-pointer group">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={isChecked}
                          onChange={() => toggleFilter(setVigenciaFiltros, vig.id)}
                        />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                          {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]" />}
                        </div>
                        <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate">{vig.label}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">{vig.count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

        </aside>

        {/* COLUMNA 2: CONTENIDO CENTRAL */}
        <div className="flex-1 flex flex-col min-w-0 gap-5 h-full overflow-y-auto pr-1 pb-8" style={{ scrollbarWidth: 'thin' }}>
          
          {/* Barra Superior de Búsqueda + Herramientas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 shadow-xs flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={event => setBusqueda(event.target.value)}
                placeholder="Buscar modelos de oficio..."
                className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-800 rounded-xl py-2.5 pl-10 pr-9 outline-none border border-slate-200/70 focus:border-red-500 transition-all font-medium placeholder:text-slate-400"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <select
                  value={orden}
                  onChange={event => setOrden(event.target.value as typeof orden)}
                  className="appearance-none bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-bold py-2.5 pl-3.5 pr-8 rounded-xl outline-none cursor-pointer transition"
                >
                  <option value="recientes">Más recientes</option>
                  <option value="nombre">Nombre (A-Z)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setVista('tarjetas')}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${vista === 'tarjetas' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Ver en cuadrícula"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setVista('lista')}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${vista === 'lista' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Ver en lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Encabezado de la Sección de Modelos */}
          <div className="flex items-end justify-between pt-1">
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{nombreDeLoMostrado}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Selecciona un modelo, complétalo y genera tu oficio.</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Mostrando {plantillas.length} {plantillas.length === 1 ? 'modelo' : 'modelos'}
            </span>
          </div>

          {/* Contenido Grid / Lista */}
          {loading ? (
            <div className="py-20 text-center text-sm font-semibold text-slate-400">Cargando modelos…</div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">
              No se pudieron consultar los modelos disponibles.
            </div>
          ) : plantillas.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <Folder className="mb-3 h-10 w-10 text-slate-300" />
              <h3 className="font-bold text-slate-700 text-sm">
                {busqueda ? 'No encontramos modelos con esa búsqueda' : 'No hay modelos disponibles aquí'}
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Prueba seleccionando otra categoría o limpiando los filtros activos.
              </p>
            </div>
          ) : (
            <div className={vista === 'tarjetas' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5' : 'flex flex-col gap-3'}>
              {plantillas.map(plantilla => {
                const categoria = series.find(serie => serie.id === plantilla.id_serie)?.nombre || 'Guías y cronogramas';
                const esPlantilla = plantilla.tipo !== 'ENLACE';
                const esEnlace = !esPlantilla;
                const actualizado = (plantilla.updated_at || plantilla.created_at || '').slice(0, 10);
                const descripcion = plantilla.descripcion || (esEnlace ? 'Documento publicado por la facultad disponible para descarga.' : 'Modelo institucional listo para completar y generar.');

                if (vista === 'lista') {
                  return (
                    <article key={plantilla.id} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:shadow-md">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                        {esEnlace ? <ExternalLink className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-xs sm:text-[13px] font-bold text-slate-900">{plantilla.nombre}</h3>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${esEnlace ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'}`}>
                            {esEnlace ? 'ENLACE' : 'PLANTILLA'}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-slate-500 mt-0.5">{descripcion}</p>
                      </div>
                      <span className="hidden sm:inline-block bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                        {categoria}
                      </span>
                      <button
                        onClick={() => (esEnlace ? abrirEnlace(plantilla.enlace) : abrirPlantilla(plantilla))}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> Abrir documento
                      </button>
                    </article>
                  );
                }

                // Vista Cuadrícula (Cards)
                return (
                  <article
                    key={plantilla.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md hover:-translate-y-0.5 min-h-[225px]"
                  >
                    <div>
                      {/* Top: Icon + Title + ENLACE badge */}
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mt-0.5">
                          <ExternalLink className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <h3 className="line-clamp-2 text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                              {plantilla.nombre}
                            </h3>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${esEnlace ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'}`}>
                              {esEnlace ? 'ENLACE' : 'PLANTILLA'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Category Badge */}
                      <div className="mt-2.5">
                        <span className="inline-block bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full leading-tight">
                          {categoria}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500 font-normal">
                        {descripcion}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                      {/* Updated Date */}
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        <span>Actualizado: {formatearFecha(actualizado)}</span>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => (esEnlace ? abrirEnlace(plantilla.enlace) : abrirPlantilla(plantilla))}
                        className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> Abrir documento
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

        </div>

        {/* COLUMNA 3: SIDEBAR DERECHO (A la misma altura, sin barrera espaciadora) */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 hidden xl:flex flex-col min-h-0">
          
          {/* Tarjeta de Actividad reciente */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">Actividad reciente</h3>
              </div>
              <button
                onClick={clearFiltros}
                className="text-xs font-semibold text-red-600 hover:text-red-700 transition cursor-pointer"
              >
                Ver todas
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {actividadReciente.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center p-4">
                  <Clock className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Sin actividad reciente registrada</p>
                </div>
              ) : (
                actividadReciente.map(item => (
                  <div
                    key={item.id}
                    onClick={item.onClick}
                    className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/80 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.tipo === 'TRAMITE' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'}`}>
                        {item.esEnlace ? <ExternalLink className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-red-600 transition" title={item.nombre}>
                          {item.nombre}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.badge && (
                            <span className={`text-[8.5px] font-black uppercase tracking-wider px-1 py-0.2 rounded shrink-0 ${item.tipo === 'TRAMITE' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-700'}`}>
                              {item.badge}
                            </span>
                          )}
                          <p className="text-[10px] text-slate-500 leading-tight truncate">
                            {item.subtitulo}
                          </p>
                        </div>
                        <span className="text-[9.5px] text-slate-400 block mt-0.5 font-medium">
                          {tiempoRelativo(item.fecha)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 pr-1">
                      <span className={`w-2 h-2 rounded-full block ${item.colorPunto}`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </aside>

      </div>

      {plantillaActiva && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
          <div className="flex h-[95vh] w-full max-w-[1450px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4"><div><h2 className="text-lg font-extrabold text-gray-900">{values.nombreFormato}</h2><p className="text-xs text-gray-400">Completa tus datos. Esto no crea una solicitud de equipos.</p></div><button onClick={() => setPlantillaActiva(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></header>
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <div className="w-full overflow-y-auto border-r border-gray-200 p-6 lg:w-[48%]">
                {plantillaTranscrita ? (
                  <div className="flex flex-col gap-4">
                    <Seccion numero={1} titulo="Datos del oficio" Icono={FileText}>
                      <div className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-blue-500">Asunto</p>
                        <p className="mt-0.5 text-[13px] font-semibold text-gray-800">{plantillaTranscrita.asunto}</p>
                      </div>
                      <Campo label="Ciudad" value={values.ciudadOficio} onChange={valor => cambiar('ciudadOficio', valor)} />
                      <Campo label="Fecha" type="date" value={values.fechaOficio} onChange={valor => cambiar('fechaOficio', valor)} />
                    </Seccion>

                    {/* Un campo por hueco del documento: salen del texto y no de una lista
                        aparte, así que no pueden quedar desfasados de lo que se imprime. Se
                        separan los datos personales de lo que solo el estudiante puede
                        responder, que es donde de verdad hay que detenerse. */}
                    {datosPersonales.length > 0 && (
                      <Seccion numero={2} titulo="Datos del estudiante" Icono={UserRound}>
                        {datosPersonales.map(marcador => (
                          <Campo
                            key={marcador}
                            label={marcador.slice(1, -1).toLocaleLowerCase('es')}
                            value={marcadores[marcador] ?? ''}
                            onChange={valor => setMarcadores(actuales => ({ ...actuales, [marcador]: valor }))}
                          />
                        ))}
                      </Seccion>
                    )}

                    {detallesSolicitud.length > 0 && (
                      <Seccion numero={datosPersonales.length > 0 ? 3 : 2} titulo="Detalles de la solicitud" Icono={GraduationCap}>
                        {detallesSolicitud.map(marcador => (
                          <Campo
                            key={marcador}
                            className="sm:col-span-2"
                            label={marcador.slice(1, -1).toLocaleLowerCase('es')}
                            value={marcadores[marcador] ?? ''}
                            onChange={valor => setMarcadores(actuales => ({ ...actuales, [marcador]: valor }))}
                          />
                        ))}
                      </Seccion>
                    )}

                    <Seccion numero={(datosPersonales.length > 0 ? 1 : 0) + (detallesSolicitud.length > 0 ? 1 : 0) + 2} titulo="Firma del estudiante" Icono={Check}>
                      <Campo label="Nombre para la firma" value={values.nombreFirma} onChange={valor => cambiar('nombreFirma', valor)} />
                      <Campo label="Cédula para la firma" value={values.ciFirma} onChange={valor => cambiar('ciFirma', valor)} />
                    </Seccion>

                    {plantillaTranscrita.referencia && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-800">
                        {plantillaTranscrita.referencia}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <Seccion numero={1} titulo="Datos del oficio" Icono={FileText}>
                      <Campo label="Ciudad" value={values.ciudadOficio} onChange={valor => cambiar('ciudadOficio', valor)} />
                      <Campo label="Fecha" type="date" value={values.fechaOficio} onChange={valor => cambiar('fechaOficio', valor)} />
                      <SelectorDestinatario
                        opciones={destinatarios}
                        cargoActual={values.cargoDestinatario}
                        nombreActual={values.nombreAutoridad ? [values.tituloAutoridad, values.nombreAutoridad].filter(Boolean).join(' ') : ''}
                        onSelect={seleccionarDestinatario}
                        className="sm:col-span-2"
                      />

                      {/* Lo de arriba es el texto que se IMPRIME. Esto es a qué cuenta llega el
                          trámite, que es lo que decide quién puede revisarlo. */}
                      <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Destino del trámite</p>
                        {destinos.some(destino => destino.idUsuario) ? (
                          <>
                            <select
                              value={destinoId}
                              onChange={event => {
                                setDestinoId(event.target.value);
                                const elegido = destinos.find(destino => destino.id === event.target.value);
                                if (elegido) {
                                  seleccionarDestinatario({
                                    id: elegido.id, nombre: elegido.nombre, titulo: elegido.titulo,
                                    cargo: elegido.cargo, origen: elegido.origen,
                                  });
                                }
                              }}
                              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-blue-400"
                            >
                              {destinos.map(destino => (
                                <option key={destino.id} value={destino.id} disabled={!destino.idUsuario}>
                                  {destino.cargo} · {destino.nombre || 'Sin nombre'}
                                  {destino.idUsuario ? '' : ' (sin cuenta configurada)'}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1.5 text-[10.5px] text-gray-500">
                              Recibirá el trámite en su bandeja y será quien lo revise.
                            </p>
                          </>
                        ) : (
                          <p className="mt-1.5 text-[11px] text-amber-700">
                            Tu carrera todavía no tiene una cuenta de coordinador configurada, así que el
                            trámite no puede presentarse por el sistema. El documento sí se puede descargar
                            e imprimir para entregarlo en ventanilla.
                          </p>
                        )}
                      </div>
                    </Seccion>

                    <Seccion numero={2} titulo="Datos del estudiante" Icono={UserRound}>
                      <Campo label="Nombres y apellidos" value={values.nombresApellidos} onChange={valor => { cambiar('nombresApellidos', valor); cambiar('nombreFirma', valor); }} />
                      <Campo label="Cédula" value={values.ci} onChange={valor => { cambiar('ci', valor); cambiar('ciFirma', valor); }} />
                      <Campo label="Código estudiantil" value={values.codigoEstudiantil} onChange={valor => cambiar('codigoEstudiantil', valor)} />
                      <Campo label="PAO" value={values.numeroPao} onChange={valor => cambiar('numeroPao', valor)} />
                      <Campo label="Carrera" value={values.carrera} onChange={valor => cambiar('carrera', valor)} />
                      <Campo label="Facultad" value={values.facultad} onChange={valor => cambiar('facultad', valor)} />
                    </Seccion>

                    <Seccion numero={3} titulo="Detalles de la solicitud" Icono={GraduationCap}>
                      <label className="sm:col-span-2 flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">Solicitud
                        <textarea value={values.descripcion} onChange={event => cambiar('descripcion', event.target.value)} rows={5} className="resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-medium normal-case tracking-normal text-gray-800 outline-none focus:border-blue-400" placeholder="Describe claramente lo que solicitas…" />
                      </label>
                    </Seccion>

                    <Seccion numero={4} titulo="Firma del estudiante" Icono={Check}>
                      <Campo label="Nombre para la firma" value={values.nombreFirma} onChange={valor => cambiar('nombreFirma', valor)} />
                      <Campo label="Cédula para la firma" value={values.ciFirma} onChange={valor => cambiar('ciFirma', valor)} />

                      {/* La firma NUNCA es obligatoria: sin imagen el documento deja el espacio
                          en blanco, que es como se ha firmado siempre. */}
                      <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Imagen de firma (opcional)</p>
                            <p className="mt-0.5 text-[10.5px] text-gray-500">
                              Es una imagen de tu firma, no una firma electrónica certificada.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 ${firmaOcupada ? 'opacity-50' : 'hover:bg-gray-50'}`}>
                              <Upload className="h-3.5 w-3.5" />
                              {firmaImagen ? 'Reemplazar' : 'Subir imagen'}
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                disabled={firmaOcupada}
                                onChange={event => { void onSubirFirma(event.target.files?.[0]); event.target.value = ''; }}
                              />
                            </label>
                            {firmaImagen && (
                              <button
                                type="button"
                                onClick={() => void onEliminarFirma()}
                                disabled={firmaOcupada}
                                className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar
                              </button>
                            )}
                          </div>
                        </div>

                        {firmaImagen ? (
                          <div className="mt-3 flex items-center gap-4">
                            <img src={firmaImagen} alt="Imagen de firma guardada" className="h-12 max-w-[160px] rounded border border-gray-200 bg-white object-contain p-1" />
                            <label className="flex items-center gap-2 text-[11.5px] font-semibold text-gray-700">
                              <input
                                type="checkbox"
                                checked={incluirFirma}
                                onChange={event => setIncluirFirma(event.target.checked)}
                                className="h-4 w-4 accent-espoch-red"
                              />
                              Incorporarla en este documento
                            </label>
                          </div>
                        ) : (
                          <p className="mt-2 text-[10.5px] text-gray-400">
                            Sin imagen guardada. El documento saldrá con el espacio para firmar a mano.
                          </p>
                        )}
                      </div>
                    </Seccion>
                  </div>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-slate-100 p-5 lg:p-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-700">Vista previa</h3>
                    {numeroTramite && (
                      <p className="text-[10.5px] text-gray-500">
                        Trámite {numeroTramite}{versionTramite > 0 ? ` · versión ${versionTramite}` : ' · borrador'}
                      </p>
                    )}
                  </div>
                  {/* Descargar no presenta nada, y presentar no obliga a descargar: son botones
                      distintos y lo dicen. */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void descargar('pdf')} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold"><Download className="h-4 w-4" /> PDF</button>
                    <button onClick={() => void descargar('docx')} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold"><FileText className="h-4 w-4" /> Word</button>
                    <button onClick={abrirParaImprimir} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold"><Printer className="h-4 w-4" /> Imprimir</button>
                    <button
                      onClick={() => void onGuardarBorrador()}
                      disabled={guardando || enviando}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" /> {guardando ? 'Guardando…' : 'Guardar borrador'}
                    </button>
                    <button
                      onClick={() => void onEnviar()}
                      disabled={guardando || enviando}
                      className="flex items-center gap-2 rounded-lg bg-espoch-red px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" /> {enviando ? 'Presentando…' : 'Presentar al coordinador'}
                    </button>
                  </div>
                </div>
                <div className="mx-auto aspect-[1/1.414] w-full max-w-[650px] overflow-y-auto bg-white p-10 font-serif text-[12px] leading-relaxed shadow-xl lg:p-14">
                  {/* Sin sello no se dibuja cabecera: un recuadro vacío con el nombre de la
                      ESPOCH no es el membrete institucional, solo lo aparenta. */}
                  {values.headerImg && (
                    <div className="mb-7 flex items-center justify-between border-b border-gray-300 pb-4">
                      <div className="flex h-16 w-20 items-center justify-center">
                        <img src={values.headerImg} alt="Sello institucional" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex-1 px-4 text-center font-sans">
                        <strong>ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO</strong>
                        <div className="mt-1 text-[10px] text-gray-500">{values.facultad}</div>
                      </div>
                      <div className="w-20" />
                    </div>
                  )}
                  {/* La vista previa se dibuja con los MISMOS parámetros que el PDF y el Word: antes
                      cada uno armaba el documento por su lado y podían decir cosas distintas. */}
                  {(() => {
                    const doc = parametrosDocumento();
                    const parrafos = Array.isArray(doc.cuerpo) ? doc.cuerpo : [doc.cuerpo];
                    return (
                      <>
                        <p className="mb-8 text-right">{doc.lugarFecha}</p>
                        <div className="mb-7 leading-tight">
                          {doc.tituloAutoridad && <p>{doc.tituloAutoridad}</p>}
                          {doc.nombreAutoridad && <p>{doc.nombreAutoridad}</p>}
                          <p className="font-bold">{doc.cargo}</p>
                          <p>{doc.presente || values.enSuDespacho}</p>
                        </div>
                        {doc.asunto && <p className="mb-5 font-bold">Asunto: {doc.asunto}</p>}
                        <p className="mb-5">De mi consideración:</p>
                        {parrafos.map((parrafo, indice) => (
                          <p key={indice} className="mb-4 text-justify">{parrafo}</p>
                        ))}
                        {!!doc.adjuntos?.length && (
                          <div className="mb-5">
                            <p className="font-bold">Documentos adjuntos:</p>
                            <ol className="list-inside list-decimal">
                              {doc.adjuntos.map((adjunto, indice) => <li key={indice}>{adjunto}</li>)}
                            </ol>
                          </div>
                        )}
                        <p>{doc.cierre || values.despedida}</p>
                        <div className="mt-10 text-center">
                          <p className="mb-8">{values.cierre}</p>
                          {/* Con imagen se ve sobre la línea; sin ella queda el hueco en blanco,
                              igual que en el PDF y en el Word. */}
                          {doc.firmaImagen
                            ? <img src={doc.firmaImagen} alt="Imagen de firma" className="mx-auto mb-1 h-14 max-w-[200px] object-contain" />
                            : <div className="h-14" />}
                          <div className="mx-auto mb-2 w-56 border-b border-gray-800" />
                          <p className="font-bold">{doc.studentName}</p>
                          <p>C.I: {doc.studentCI}</p>
                        </div>
                      </>
                    );
                  })()}{values.footerImg && <div className="mt-10 border-t border-gray-300 pt-3"><img src={values.footerImg} alt="Pie institucional" className="mx-auto h-10 max-w-full object-contain" /></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const normalizarBusqueda = (texto: string) => texto
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es');

const SelectorDestinatario = ({ opciones, cargoActual, nombreActual, onSelect, className = '' }: {
  opciones: Destinatario[];
  cargoActual: string;
  nombreActual: string;
  onSelect: (destinatario: Destinatario) => void;
  className?: string;
}) => {
  const [consulta, setConsulta] = useState(cargoActual);
  const [abierto, setAbierto] = useState(false);

  const opcionesFiltradas = useMemo(() => {
    const termino = normalizarBusqueda(consulta.trim());
    if (!termino || consulta === cargoActual) return opciones;
    return opciones.filter(opcion => normalizarBusqueda(
      `${opcion.titulo} ${opcion.nombre} ${opcion.cargo} ${opcion.origen}`,
    ).includes(termino));
  }, [cargoActual, consulta, opciones]);

  const elegir = (opcion: Destinatario) => {
    onSelect(opcion);
    setConsulta(opcion.cargo);
    setAbierto(false);
  };

  return (
    <div className={`${className} relative`}>
      <label htmlFor="destinatario-oficio" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
        Cargo destinatario
      </label>
      <div className={`flex items-center rounded-xl border bg-gray-50 transition ${abierto ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
        <UserRound className="ml-3 h-4 w-4 shrink-0 text-gray-400" />
        <input
          id="destinatario-oficio"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={abierto}
          value={consulta}
          onFocus={() => setAbierto(true)}
          onChange={event => { setConsulta(event.target.value); setAbierto(true); }}
          onBlur={() => window.setTimeout(() => { setAbierto(false); setConsulta(cargoActual); }, 150)}
          placeholder="Buscar y seleccionar un cargo…"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-gray-800 outline-none"
        />
        <button type="button" aria-label="Mostrar destinatarios" onMouseDown={event => event.preventDefault()} onClick={() => setAbierto(actual => !actual)} className="mr-2 rounded-lg p-1.5 text-gray-400 hover:bg-gray-200">
          <ChevronDown className={`h-4 w-4 transition ${abierto ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {nombreActual && <p className="mt-1.5 truncate text-[10px] font-semibold normal-case tracking-normal text-gray-400">Se completará para: <span className="text-gray-600">{nombreActual}</span></p>}

      {abierto && (
        <div role="listbox" className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
          {opcionesFiltradas.length ? opcionesFiltradas.map(opcion => {
            const texto = [opcion.titulo, opcion.nombre].filter(Boolean).join(' ');
            const seleccionado = texto === nombreActual && opcion.cargo === cargoActual;
            return (
              <button
                type="button"
                role="option"
                aria-selected={seleccionado}
                key={opcion.id}
                onMouseDown={event => event.preventDefault()}
                onClick={() => elegir(opcion)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-espoch-red"><UserRound className="h-3.5 w-3.5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-gray-800">{opcion.cargo}</p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-gray-500">{texto}</p>
                  <p className="truncate text-[9px] text-gray-400">{opcion.origen}</p>
                </div>
                {seleccionado && <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />}
              </button>
            );
          }) : (
            <div className="px-4 py-6 text-center text-xs text-gray-400">No se encontraron personas con ese nombre o cargo.</div>
          )}
        </div>
      )}
    </div>
  );
};

/** Bloque numerado del formulario, como las secciones del generador de oficios del admin. */
const Seccion = ({ numero, titulo, Icono, children }: {
  numero: number;
  titulo: string;
  Icono: LucideIcon;
  children: ReactNode;
}) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <header className="mb-4 flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        <Icono className="h-3.5 w-3.5" />
      </span>
      <h3 className="text-[13px] font-extrabold text-gray-800">{numero}. {titulo}</h3>
    </header>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  </section>
);

const Campo = ({ label, value, onChange, type = 'text', className = '' }: { label: string; value: string; onChange: (valor: string) => void; type?: string; className?: string }) => (
  <label className={`${className} flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500`}>{label}
    <input type={type} value={value} onChange={event => onChange(event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-gray-800 outline-none focus:border-blue-400" />
  </label>
);
