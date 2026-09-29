import { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Search, Trash2, X, AlertTriangle, Layers, Download, ArrowUpDown, Settings, Image as ImageIcon, ChevronDown, User, FileEdit, PenTool, Edit2, FileDown, CheckCircle, RotateCcw,
  Folder, FolderPlus, Plus, ChevronRight, Home, MoreVertical, Link2 as LinkIcon, FolderTree, ExternalLink
} from 'lucide-react';
import { generatePreviewDOCX, generatePreviewPDF, type DocumentParams } from '../utils/documentGenerator';
import { useFormatosStore } from '../../../store/formatosStore';
import { AcentoTarjeta } from '../../../components/ui/AcentoTarjeta';
import { Pagination } from '../../../components/ui/Pagination';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { normalizarTexto } from '../../../lib/texto';
import {
  useSeriesFormatosStore, construirArbol, idsConDescendientes, rutaHasta,
  type SerieConHijas,
} from '../../../store/seriesFormatosStore';
import {
  urlDescargaFormato, borrarArchivoFormato, formatearTamano, extensionDe,
} from '../../../lib/archivosFormatos';
import { perfilesRepositorio, type PerfilRepositorioId } from '../data/repositorioElectricidad';
import { enMayusculas } from '../../../lib/texto';
import { esUrlSegura } from '../../../lib/urlSegura';
import { ImportarCatalogo } from '../components/ImportarCatalogo';
import { useAuthStore } from '../../../store/authStore';

/** Valor de `tipo` de las plantillas que genera el sistema; el resto son archivos subidos. */
const TIPO_DINAMICO = 'DINAMICO';

/** Valor de `tipo` de los documentos que viven fuera (OneDrive, Drive): se guarda la URL. */
const TIPO_ENLACE = 'ENLACE';

/** Clave del chip "Archivos". No es un valor de `tipo`: agrupa todo lo que no es dinámico. */
const FILTRO_ARCHIVOS = 'ARCHIVOS';


export const Formatos = () => {
  const esAdmin = useAuthStore(s => s.user?.role === 'admin');
  const [importandoCatalogo, setImportandoCatalogo] = useState(false);
  const { formatos, fetchFormatos, addFormato, updateFormato, removeFormato, error: errorFormatos } = useFormatosStore();
  const { series, fetchSeries, addSerie, renameSerie, removeSerie, error: errorSeries } = useSeriesFormatosStore();
  const [params, setParams] = useSearchParams();
  const prefijoRuta = useLocation().pathname.startsWith('/tecnico') ? '/tecnico' : '/admin';

  useEffect(() => { fetchFormatos(); fetchSeries(); }, []);

  // Mapear campos de BD al formato del componente
  const data = useMemo(() => formatos.map((f: any) => ({
    id: f.id,
    nombre: f.nombre,
    tipo: f.tipo,
    fecha: f.created_at?.slice(0, 10) || '',
    estado: f.estado,
    descripcion: f.descripcion || '',
    data: f.datos ?? null,
    idSerie: f.id_serie ?? null,
    archivoPath: f.archivo_path ?? null,
    archivoNombre: f.archivo_nombre ?? null,
    // Peso real del archivo. Antes esta columna mostraba un guion fijo para todas las filas.
    tamanoBytes: f.tamano_bytes ?? null,
    size: formatearTamano(f.tamano_bytes),
    enlace: f.enlace ?? null,
    esDinamico: f.tipo === TIPO_DINAMICO,
    esEnlace: f.tipo === TIPO_ENLACE,
    /** Lo que se ve en la columna TIPO: "Dinámico", "Enlace", o la extensión del archivo. */
    etiquetaTipo: f.tipo === TIPO_DINAMICO ? 'Dinámico'
      : f.tipo === TIPO_ENLACE ? 'Enlace'
      : extensionDe(f.archivo_nombre),
  })), [formatos]);

  /** Categoría abierta. `null` = todas, que es como arranca la pantalla. */
  const [serieSel, setSerieSel] = useState<string | null>(params.get('carpeta'));
  const perfilParam = params.get('perfil');
  const perfilSel: PerfilRepositorioId = perfilesRepositorio.some(perfil => perfil.id === perfilParam)
    ? perfilParam as PerfilRepositorioId
    : 'todos';
  const [busquedaSerie, setBusquedaSerie] = useState('');
  /**
   * El árbol de categorías se SUPERPONE en vez de empujar la tabla, igual que el panel
   * "Ubicaciones" de Horarios: se consulta un momento y se cierra, así que no tiene por qué
   * quitarle 280px de ancho a la tabla de forma permanente.
   */
  const [panelCategoriasAbierto, setPanelCategoriasAbierto] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [modalSerie, setModalSerie] = useState<null | 'crear' | 'menu' | 'renombrar' | 'borrar'>(null);
  const [serieEnEdicion, setSerieEnEdicion] = useState<SerieConHijas | null>(null);
  const [nombreSerie, setNombreSerie] = useState('');
  const [padreNuevaSerie, setPadreNuevaSerie] = useState<string | null>(null);
  const [guardandoSerie, setGuardandoSerie] = useState(false);

  const [modalEnlace, setModalEnlace] = useState(false);
  const [nombreEnlace, setNombreEnlace] = useState('');
  const [urlEnlace, setUrlEnlace] = useState('');
  const [serieDestino, setSerieDestino] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  const perfilActual = perfilesRepositorio.find(perfil => perfil.id === perfilSel) ?? perfilesRepositorio[0];

  /** Categorías del perfil más sus ancestros, para conservar el camino completo en el árbol. */
  const idsCategoriasPerfil = useMemo(() => {
    if (perfilSel === 'todos') return null;
    const permitidas = new Set<string>();
    for (const serie of series) {
      const codigo = serie.codigo || '';
      // En categorías personalizadas manda el público guardado. Las categorías institucionales
      // conservan su clasificación por código porque varias pertenecen a más de una vista.
      const perteneceAlPerfil = serie.publico
        ? serie.publico === perfilSel
        : perfilActual.codigos.some(base => codigo === base || codigo.startsWith(`${base}.`));
      if (perteneceAlPerfil) {
        permitidas.add(serie.id);
        for (const ancestro of rutaHasta(series, serie.id)) permitidas.add(ancestro.id);
      }
    }
    return permitidas;
  }, [perfilActual, perfilSel, series]);

  const arbolSeriesCompleto = useMemo(() => construirArbol(series), [series]);
  const arbolSeries = useMemo(() => {
    if (!idsCategoriasPerfil) return arbolSeriesCompleto;
    const filtrar = (nodos: SerieConHijas[]): SerieConHijas[] => nodos.flatMap(nodo => {
      const hijas = filtrar(nodo.hijas);
      return idsCategoriasPerfil.has(nodo.id) || hijas.length ? [{ ...nodo, hijas }] : [];
    });
    return filtrar(arbolSeriesCompleto);
  }, [arbolSeriesCompleto, idsCategoriasPerfil]);

  const dataPerfil = useMemo(
    // Un documento SIN categoría no pertenece a ningún perfil, así que este filtro lo escondía
    // en todos: lo que sale del Generador nace sin clasificar y desaparecía nada más crearlo.
    () => idsCategoriasPerfil
      ? data.filter(formato => !formato.idSerie || idsCategoriasPerfil.has(formato.idSerie))
      : data,
    [data, idsCategoriasPerfil],
  );

  const kpi = useMemo(() => ({
    total: dataPerfil.length,
    activos: dataPerfil.filter(f => f.estado === 'activo').length,
    dinamicos: dataPerfil.filter(f => f.esDinamico).length,
    estaticos: dataPerfil.filter(f => !f.esDinamico).length,
  }), [dataPerfil]);

  /** Aplanado con su profundidad, que es como se dibuja el árbol y como se llena el select. */
  const seriesPlanas = useMemo(() => {
    const salida: { serie: SerieConHijas; nivel: number }[] = [];
    const recorrer = (nodos: SerieConHijas[], nivel: number) => {
      for (const serie of nodos) {
        salida.push({ serie, nivel });
        recorrer(serie.hijas, nivel + 1);
      }
    };
    recorrer(arbolSeries, 0);
    return salida;
  }, [arbolSeries]);

  /**
   * Qué filas del árbol se ven.
   *
   * Sin búsqueda, una serie se muestra si todos sus ancestros están desplegados. Con búsqueda
   * se aplana: se listan las coincidencias sin importar si su padre está abierto, porque
   * obligar a desplegar para encontrar algo es justo lo contrario de buscar.
   */
  const filasArbol = useMemo(() => {
    const q = busquedaSerie.trim().toLowerCase();
    if (q) {
      return seriesPlanas
        .filter(({ serie }) => serie.nombre.toLowerCase().includes(q))
        .map(fila => ({ ...fila, nivel: 0 }));
    }
    const visibles = new Set(arbolSeries.map(s => s.id));
    for (const { serie } of seriesPlanas) {
      if (visibles.has(serie.id) && expandidas.has(serie.id)) for (const hija of serie.hijas) visibles.add(hija.id);
    }
    return seriesPlanas.filter(({ serie }) => visibles.has(serie.id));
  }, [seriesPlanas, arbolSeries, expandidas, busquedaSerie]);

  /**
   * Cuántos formatos cuelgan de cada serie, contando los de sus subseries.
   * Es lo que espera quien ve el número: el total de lo que hay dentro, no solo el primer nivel.
   */
  const conteoPorSerie = useMemo(() => {
    const directos = new Map<string, number>();
    for (const formato of dataPerfil) {
      if (formato.idSerie) directos.set(formato.idSerie, (directos.get(formato.idSerie) || 0) + 1);
    }
    const total = new Map<string, number>();
    const sumar = (serie: SerieConHijas): number => {
      const suma = (directos.get(serie.id) || 0) + serie.hijas.reduce((acc, h) => acc + sumar(h), 0);
      total.set(serie.id, suma);
      return suma;
    };
    for (const raiz of arbolSeries) sumar(raiz);
    return total;
  }, [dataPerfil, arbolSeries]);

  /** Serie abierta y su camino desde la raíz, para el rastro de navegación. */
  const rutaSerie = useMemo(() => rutaHasta(series, serieSel), [series, serieSel]);

  const [searchQuery, setSearchQuery] = useState(params.get('q') || '');

  const serieSeleccionada = useMemo(
    () => seriesPlanas.find(({ serie }) => serie.id === serieSel)?.serie ?? null,
    [serieSel, seriesPlanas],
  );

  /** True cuando la categoría abierta es un contenedor: hay que bajar un nivel más. */
  const seleccionEsContenedor = !!serieSeleccionada && serieSeleccionada.hijas.length > 0;

  /**
   * Qué series entran en la tabla.
   *
   * Una categoría CON subcategorías no lista nada: se elige primero la subcategoría. Abrirla
   * volcaba de golpe los 26 documentos de toda la rama y la tabla se redibujaba entera en cada
   * clic del árbol, sin que nadie hubiera pedido ese listado.
   *
   * Buscando es al revés: la búsqueda es intención explícita, así que abarca la rama completa.
   */
  const idsDeLaSeleccion = useMemo(() => {
    if (!serieSeleccionada) return new Set<string>();
    if (searchQuery.trim()) return new Set(idsConDescendientes(serieSeleccionada));
    return seleccionEsContenedor ? new Set<string>() : new Set([serieSeleccionada.id]);
  }, [serieSeleccionada, seleccionEsContenedor, searchQuery]);

  /**
   * Sin "Todas", la pantalla necesita abrir en alguna parte: la primera categoría del árbol.
   * Si tiene subcategorías se despliega, para que la siguiente elección esté a la vista.
   */
  useEffect(() => {
    if (serieSel || arbolSeries.length === 0) return;
    const primera = arbolSeries[0];
    setSerieSel(primera.id);
    if (primera.hijas.length) setExpandidas(previas => new Set(previas).add(primera.id));
  }, [arbolSeries, serieSel]);

  const alternarExpandida = (id: string) => {
    setExpandidas(previas => {
      const siguientes = new Set(previas);
      if (siguientes.has(id)) siguientes.delete(id); else siguientes.add(id);
      return siguientes;
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortCol, setSortCol] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [tipoFilter, setTipoFilter] = useState('Todos');

  const abrirRepositorio = (id: string | null, busqueda = '') => {
    setSerieSel(id);
    setSearchQuery(busqueda);
    setTipoFilter('Todos');
    setCurrentPage(1);
    setSelectedIds([]);
    setExpandidas(prev => new Set([...prev, ...rutaHasta(series, id).map(s => s.id)]));

  };

  // Settings: Imágenes institucionales (Base64)
  const [headerImg, setHeaderImg] = useState<string>('');
  const [footerImg, setFooterImg] = useState<string>('');

  useEffect(() => {
    const savedH = localStorage.getItem('espoch_header_img');
    const savedF = localStorage.getItem('espoch_footer_img');
    if (savedH) setHeaderImg(savedH);
    if (savedF) setFooterImg(savedF);
  }, []);

  const saveSettings = (h: string, f: string) => {
    localStorage.setItem('espoch_header_img', h);
    localStorage.setItem('espoch_footer_img', f);
    setHeaderImg(h);
    setFooterImg(f);
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalType, setModalType] = useState<null | 'create' | 'delete' | 'bulkDelete' | 'view' | 'settings' | 'edit'>(null);
  const [selectedFmt, setSelectedFmt] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoriaGenerador, setCategoriaGenerador] = useState('');
  
  // New state for Detail Side Panel
  const [selectedFormatForDetail, setSelectedFormatForDetail] = useState<any>(null);

  const defaultGenValues = {
    nombreFormato: '',
    ciudadOficio: 'Riobamba',
    fechaOficio: new Date().toISOString().split('T')[0],
    tituloAutoridad: 'Ing.',
    tituloAutoridadOtro: '',
    nombreAutoridad: 'NOMBRE DE A QUIEN VA EL OFICIO',
    cargoDestinatario: 'DIRECTOR DE LA CARRERA DE ELECTRICIDAD',
    enSuDespacho: 'En su despacho,',
    nombresApellidos: 'NOMBRES Y APELLIDOS',
    ci: '1234567890',
    codigoEstudiantil: '123',
    numeroPao: 'PAO 1',
    carrera: 'NOMBRE DE LA CARRERA',
    facultad: 'FACULTAD CORRESPONDIENTE',
    descripcion: 'LO QUE SE SOLICITA',
    despedida: 'Agradezco de antemano la atención brindada y quedo atento a su respuesta.',
    cierre: 'Atentamente,',
    nombreFirma: 'NOMBRE DEL ESTUDIANTE Y FIRMA',
    ciFirma: '1234567890'
  };

  // GENERATOR FORM STATE
  const [genValues, setGenValues] = useState(defaultGenValues);

  const handleGenChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setGenValues({ ...genValues, [e.target.name]: e.target.value });
  };

  const clearForm = () => {
    setGenValues(defaultGenValues);
  };

  const buildBodyString = (values = genValues) => {
    return `Reciba un cordial saludo. Por la presente, Yo, ${values.nombresApellidos}, con C.I: ${values.ci} y código estudiantil ${values.codigoEstudiantil}, estudiante del ${values.numeroPao} de la carrera de ${values.carrera} correspondiente a la ${values.facultad}, solicito amablemente, ${values.descripcion || 'lo que se solicita.'}`;
  };

  const formattedLugarFecha = `${genValues.ciudadOficio}, ${new Date(genValues.fechaOficio + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const parametrosDocumentoActual = (): DocumentParams => ({
      headerImgBase64: headerImg,
      footerImgBase64: footerImg,
      tituloAutoridad: genValues.tituloAutoridad === 'Otro' ? genValues.tituloAutoridadOtro : genValues.tituloAutoridad,
      nombreAutoridad: genValues.nombreAutoridad,
      cargo: genValues.cargoDestinatario,
      lugarFecha: formattedLugarFecha,
      cuerpo: buildBodyString(),
      studentName: genValues.nombreFirma,
      studentCI: genValues.ciFirma
  });

  const descargarBlob = (blob: Blob, nombre: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadGenerated = async (formato: 'pdf' | 'docx') => {
    const nombre = `Oficio_${genValues.nombresApellidos.replace(/\s+/g, '_')}`;
    const parametros = parametrosDocumentoActual();
    const blob = formato === 'pdf'
      ? generatePreviewPDF(parametros)
      : await generatePreviewDOCX(parametros);
    descargarBlob(blob, `${nombre}.${formato}`);
  };

  /** La misma maqueta se usa en el panel de detalle y en el generador. */
  const renderVistaDocumento = (values: typeof defaultGenValues, compacta = false) => {
    const fecha = `${values.ciudadOficio}, ${new Date(values.fechaOficio + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    const titulo = values.tituloAutoridad === 'Otro' ? values.tituloAutoridadOtro : values.tituloAutoridad;
    return (
      <div className={`flex min-h-full w-full flex-col bg-white font-serif text-gray-800 ${compacta ? 'p-5 text-[10px] leading-[1.5]' : 'p-12 lg:p-16 text-[13px] leading-relaxed'}`}>
        <div className={`flex items-center justify-between border-b border-gray-300 ${compacta ? 'pb-3 mb-4' : 'pb-5 mb-7'}`}>
          <div className={`${compacta ? 'h-10 w-10' : 'h-20 w-24'} flex shrink-0 items-center justify-center rounded bg-gray-50`}>
            {headerImg ? <img src={headerImg} alt="Sello institucional" className="max-h-full max-w-full object-contain" /> : <ImageIcon className={`${compacta ? 'h-5 w-5' : 'h-8 w-8'} text-gray-300`} />}
          </div>
          <div className={`${compacta ? 'px-2' : 'px-6'} flex-1 text-center font-sans`}>
            <div className={`${compacta ? 'text-[12px]' : 'text-[16px]'} font-extrabold leading-tight`}>ESCUELA SUPERIOR<br className={compacta ? '' : 'hidden'} /> POLITÉCNICA DE CHIMBORAZO</div>
            <div className={`${compacta ? 'text-[10px]' : 'mt-1 text-[11px]'} uppercase text-gray-500`}>{values.facultad}</div>
          </div>
          <div className={`${compacta ? 'h-10 w-10' : 'h-20 w-24'} flex shrink-0 items-center justify-center rounded bg-gray-50`}>
            {headerImg ? <img src={headerImg} alt="Sello institucional" className="max-h-full max-w-full object-contain" /> : <ImageIcon className={`${compacta ? 'h-5 w-5' : 'h-8 w-8'} text-gray-300`} />}
          </div>
        </div>

        <div className={compacta ? 'mb-6 text-right' : 'mb-10 text-right'}>{fecha}</div>
        <div className={compacta ? 'mb-6' : 'mb-8 leading-tight'}>
          <div>{titulo} {values.nombreAutoridad}</div>
          <div className="font-bold">{values.cargoDestinatario}</div>
          <div>{values.enSuDespacho}</div>
        </div>
        <div className={compacta ? 'mb-6' : 'mb-6'}>De mi consideración:</div>
        <div className={`${compacta ? 'mb-6' : 'mb-8 leading-[1.5]'} whitespace-pre-wrap text-justify`}>{buildBodyString(values)}</div>
        <div className={compacta ? 'mb-8' : 'mb-8'}>{values.despedida}</div>
        <div className="mt-auto text-center">
          <div className={compacta ? 'mb-6' : 'mb-8'}>{values.cierre}</div>
          <div className={`${compacta ? 'w-32' : 'w-60'} mx-auto mb-1.5 border-b border-gray-800`} />
          <div className="font-bold">{values.nombreFirma}</div>
          <div>C.I: {values.ciFirma}</div>
        </div>
        {footerImg && (
          <div className={`${compacta ? 'mt-8 pt-2' : 'mt-10 pt-3'} flex justify-center border-t border-gray-300`}>
            <img src={footerImg} alt="Pie institucional" className={`${compacta ? 'h-6' : 'h-12'} max-w-full object-contain`} />
          </div>
        )}
      </div>
    );
  };

  // Filtering & Sorting
  const filteredData = useMemo(() => {
    let result = [...dataPerfil];
    if (searchQuery.trim()) {
      const palabras = normalizarTexto(searchQuery).split(/\s+/);
      result = result.filter(f => {
        const texto = normalizarTexto(`${f.nombre} ${f.descripcion} ${f.id} ${series.find(s => s.id === f.idSerie)?.nombre || ''}`);
        return palabras.every(p => texto.includes(p));
      });
    }
    result = result.filter(f => f.idSerie && idsDeLaSeleccion.has(f.idSerie));
    // El chip "Archivos" agrupa todo lo que NO es dinámico. Antes comparaba `tipo === 'PDF'`
    // mientras el contador usaba `tipo !== 'DINAMICO'`: con un .docx real, el KPI lo contaba
    // y el filtro no lo mostraba.
    if (tipoFilter === TIPO_DINAMICO) result = result.filter(f => f.esDinamico);
    else if (tipoFilter === FILTRO_ARCHIVOS) result = result.filter(f => !f.esDinamico);
    if (sortCol) {
      result.sort((a: any, b: any) => {
        const va = a[sortCol] || '';
        const vb = b[sortCol] || '';
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return result;
  }, [dataPerfil, searchQuery, sortCol, sortAsc, tipoFilter, idsDeLaSeleccion, series]);

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const start = (currentPage - 1) * perPage;
  const pageData = filteredData.slice(start, start + perPage);



  const guardarSerie = async () => {
    const nombre = nombreSerie.trim();
    if (!nombre) return;
    setGuardandoSerie(true);
    try {
      if (modalSerie === 'renombrar' && serieEnEdicion) await renameSerie(serieEnEdicion.id, nombre);
      else {
        const publicoPadre = series.find(serie => serie.id === padreNuevaSerie)?.publico ?? null;
        const publico = publicoPadre || (perfilSel === 'todos' ? null : perfilSel);
        await addSerie(nombre, padreNuevaSerie, publico);
      }
      if (padreNuevaSerie) setExpandidas(prev => new Set(prev).add(padreNuevaSerie));
      setModalSerie(null);
      setSerieEnEdicion(null);
      setNombreSerie('');
    } catch {
      // El store ya avisó del motivo (nombre repetido, permisos…).
    } finally {
      setGuardandoSerie(false);
    }
  };

  /**
   * Borra la serie, no sus formatos: la clave foránea es `on delete set null`, así que quedan
   * sin clasificar y siguen visibles en "Todas". Si tiene subseries, la base lo rechaza
   * (`on delete restrict`) y aquí ni se ofrece: llevarse un subárbol por delante desde un menú
   * es demasiado fácil de hacer por error.
   */
  const borrarSerie = async () => {
    if (!serieEnEdicion) return;
    setGuardandoSerie(true);
    try {
      await removeSerie(serieEnEdicion.id);
      if (serieSel === serieEnEdicion.id) setSerieSel(null);
      setModalSerie(null);
      setSerieEnEdicion(null);
      await fetchFormatos();
    } catch {
      // Ya avisado por el store.
    } finally {
      setGuardandoSerie(false);
    }
  };

  /** Sube el archivo al bucket privado y crea su fila. El nombre visible es el del archivo. */
  /**
   * Registra un documento que vive en OneDrive. El repositorio guarda el ENLACE, no el archivo:
   * los documentos ya están allí, y copiarlos aquí obligaría a mantener dos versiones al día.
   */
  const guardarEnlace = async () => {
    const nombre = nombreEnlace.trim();
    const url = urlEnlace.trim();
    if (!nombre || !url) return;
    const S = (await import('sweetalert2')).default;
    if (!esUrlSegura(url)) {
      S.fire({ icon: 'warning', title: 'Enlace no válido', text: 'Pega la dirección completa del documento, empezando por https://', confirmButtonColor: '#B00020' });
      return;
    }
    setSubiendo(true);
    try {
      await addFormato({
        nombre,
        tipo: TIPO_ENLACE,
        estado: 'activo',
        id_serie: serieDestino || null,
        enlace: url,
      } as any);
      setModalEnlace(false);
      S.fire({ icon: 'success', title: 'Documento agregado', timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      S.fire({ icon: 'error', title: 'No se pudo agregar', text: error?.message || 'Inténtalo otra vez.', confirmButtonColor: '#B00020' });
    } finally {
      setSubiendo(false);
    }
  };

  /** Aviso de "falta elegir categoría". El resto del sistema usa SweetAlert, no `alert()`. */
  const avisarSinCategoria = async (accion: string) => {
    const S = (await import('sweetalert2')).default;
    S.fire({
      icon: 'info',
      title: 'Elige una categoría',
      text: `Abre la categoría donde quieres ${accion} y vuelve a intentarlo.`,
      confirmButtonColor: '#B00020',
    });
  };

  /** El documento vive fuera del sistema: se abre en otra pestaña, no se descarga de aquí. */
  const abrirEnlace = async (url: string) => {
    if (!esUrlSegura(url)) {
      const S = (await import('sweetalert2')).default;
      S.fire({ icon: 'error', title: 'Enlace no válido', text: 'La dirección guardada no es una URL web.', confirmButtonColor: '#B00020' });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  /** El bucket es privado: la descarga necesita un enlace firmado que caduca al minuto. */
  const descargarArchivo = async (path: string) => {
    const S = (await import('sweetalert2')).default;
    try {
      const url = await urlDescargaFormato(path);
      window.open(url, '_blank');
    } catch {
      S.fire({ icon: 'error', title: 'No se pudo descargar', text: 'El archivo ya no está disponible.', confirmButtonColor: '#B00020' });
    }
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleExportSelected = () => {
    const toExport = selectedIds.length > 0 ? data.filter(s => selectedIds.includes(s.id)) : filteredData;
    const csvContent = "ID,Nombre,Tipo,Fecha Creado,Tamanio,Estado\n" + 
      toExport.map(s => `${s.id},${s.nombre},${s.tipo},${s.fecha},${s.size},${s.estado}`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelos_exportados.csv';
    a.click();
    URL.revokeObjectURL(url);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pageData.length) setSelectedIds([]);
    else setSelectedIds(pageData.map(f => f.id));
  };

  const saveModel = async () => {
    const S = (await import('sweetalert2')).default;
    if (!genValues.nombreFormato.trim()) {
      S.fire({ icon: 'info', title: 'Falta el nombre', text: 'Ponle un nombre a la plantilla antes de guardarla.', confirmButtonColor: '#B00020' });
      return;
    }
    if (!categoriaGenerador) {
      S.fire({ icon: 'info', title: 'Falta la categoría', text: 'Elige la categoría documental donde se guardará la plantilla.', confirmButtonColor: '#B00020' });
      return;
    }

    const descripcion = `Oficio para: ${genValues.descripcion.substring(0, 50)}...`;

    if (editingId) {
      // Actualizar modelo existente (persiste en Supabase)
      await updateFormato(editingId, {
        nombre: genValues.nombreFormato,
        descripcion,
        datos: { ...genValues, headerImg, footerImg },
        id_serie: categoriaGenerador,
      });
    } else {
      // Crear nuevo modelo (id y created_at los genera la BD)
      await addFormato({
        nombre: genValues.nombreFormato,
        tipo: 'DINAMICO',
        estado: 'activo',
        descripcion,
        datos: { ...genValues, headerImg, footerImg },
        id_serie: categoriaGenerador,
      });
    }
    setModalType(null);
    setEditingId(null);
  };

  // Redimensiona la imagen antes de guardarla: los sellos se usan a ~100px de alto
  // en el PDF, pero los archivos originales (1024px+) en Base64 revientan la cuota
  // de localStorage (~5MB) y el guardado fallaba en silencio.
  const resizeToDataURL = (file: File, maxDim: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });

  const handleDuplicate = async (format: any) => {
    await addFormato({
      nombre: `${format.nombre} (Copia)`,
      tipo: format.tipo,
      estado: format.estado,
      descripcion: format.descripcion,
      datos: format.data ?? null,
      id_serie: format.idSerie ?? null,
    });
  };

  const downloadFormat = async (format: any, formato: 'pdf' | 'docx') => {
    if (format.tipo === 'DINAMICO') {
      const gv = format.data || { ...defaultGenValues, nombreFormato: format.nombre };
      const parametros: DocumentParams = {
        headerImgBase64: gv.headerImg || headerImg,
        footerImgBase64: gv.footerImg || footerImg,
        tituloAutoridad: gv.tituloAutoridad === 'Otro' ? gv.tituloAutoridadOtro : gv.tituloAutoridad,
        nombreAutoridad: gv.nombreAutoridad,
        cargo: gv.cargoDestinatario,
        lugarFecha: `${gv.ciudadOficio}, ${new Date(gv.fechaOficio + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        cuerpo: `Reciba un cordial saludo. Por la presente, Yo, ${gv.nombresApellidos}, con C.I: ${gv.ci} y código estudiantil ${gv.codigoEstudiantil}, estudiante del ${gv.numeroPao} de la carrera de ${gv.carrera} correspondiente a la ${gv.facultad}, solicito amablemente, ${gv.descripcion || 'lo que se solicita.'}`,
        studentName: gv.nombreFirma,
        studentCI: gv.ciFirma
      };
      const blob = formato === 'pdf'
        ? generatePreviewPDF(parametros)
        : await generatePreviewDOCX(parametros);
      descargarBlob(blob, `Plantilla_${gv.nombreFormato.replace(/\s+/g, '_')}.${formato}`);
    } else {
      const S = (await import('sweetalert2')).default;
      S.fire({ icon: 'info', title: 'Solo para plantillas', text: 'Word y PDF se generan desde las plantillas dinámicas. Este documento se abre con su enlace.', confirmButtonColor: '#B00020' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
        {/* HERO SECTION */}
        <div className="w-full min-h-[92px] bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-4 border-b border-gray-800">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554774853-a50f402377ad?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
          
          <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
                <FileText className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <nav aria-label="Ubicación actual" className="mb-1.5 flex max-w-[720px] items-center gap-1.5 overflow-hidden text-[9px] font-extrabold uppercase tracking-widest text-gray-400">
                  <Link to={`${prefijoRuta}/recursos`} className="shrink-0 transition-colors hover:text-white">Recursos</Link>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <Link to={`${prefijoRuta}/formatos${perfilSel === 'todos' ? '' : `?perfil=${perfilSel}`}`} className="shrink-0 transition-colors hover:text-white">Repositorio</Link>
                  {perfilSel !== 'todos' && (
                    <>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="shrink-0 text-espoch-yellow">{perfilActual.nombre}</span>
                    </>
                  )}
                  {rutaSerie.length > 0 && (
                    <>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="truncate text-white" title={rutaSerie[rutaSerie.length - 1].nombre}>{rutaSerie[rutaSerie.length - 1].nombre}</span>
                    </>
                  )}
                </nav>
                <p className="text-[11px] text-gray-400 font-medium">
                  {perfilSel === 'todos' ? 'Organiza documentos, normativa y evidencias en un solo lugar.' : perfilActual.descripcion}
                </p>
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
                <FileEdit className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.dinamicos}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Plantillas</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.estaticos}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Archivos</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.activos}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Activos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* PANEL SPLIT */}

      <div className="flex-1 overflow-y-auto p-4 md:p-5 min-h-0 relative bg-[#f4f7fb]/90 backdrop-blur-xl h-full animate-fade-in flex flex-col">
        <div className="flex flex-1 flex-row min-h-0 gap-4 relative">
        
        {/* PANEL DE CATEGORÍAS · capa flotante sobre la tabla, no ocupa sitio en la fila.
            El fondo cierra al pulsar fuera, que es lo que espera cualquiera con un panel así. */}
        {panelCategoriasAbierto && (
          <button
            aria-label="Cerrar categorías"
            onClick={() => setPanelCategoriasAbierto(false)}
            className="absolute inset-0 z-20 cursor-default rounded-[20px] bg-black/5"
          />
        )}
        <div className={`absolute inset-y-0 left-0 z-30 w-[280px] flex-col overflow-hidden rounded-[20px] border border-gray-200/60 bg-white shadow-2xl transition-all duration-200 ${panelCategoriasAbierto ? 'flex opacity-100 translate-x-0' : 'hidden -translate-x-3 opacity-0'}`}>
          <AcentoTarjeta />
          <div className="p-5 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-extrabold text-gray-900">Categorías de documentos</h3>
              <button
                onClick={() => setPanelCategoriasAbierto(false)}
                title="Cerrar"
                className="ml-auto mr-1 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setNombreSerie(''); setPadreNuevaSerie(null); setSerieEnEdicion(null); setModalSerie('crear'); }}
                title="Nueva categoría"
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={busquedaSerie}
                onChange={e => setBusquedaSerie(e.target.value)}
                placeholder="Buscar categoría..."
                className="w-full bg-gray-50 border border-gray-200 text-[12px] rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-400 transition-colors placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5 min-h-0 custom-scrollbar">
            {filasArbol.map(({ serie, nivel }) => {
              const activa = serieSel === serie.id;
              const tieneHijas = serie.hijas.length > 0;
              const abierta = expandidas.has(serie.id);
              return (
                <div
                  key={serie.id}
                  onClick={() => {
                    setSerieSel(serie.id);
                    setCurrentPage(1);
                    if (tieneHijas) setExpandidas(previas => new Set(previas).add(serie.id));
                    else setPanelCategoriasAbierto(false);
                  }}
                  style={{ paddingLeft: `${nivel * 14 + 8}px` }}
                  className={`flex items-center justify-between py-2 pr-2 rounded-lg cursor-pointer group transition-colors ${activa ? 'bg-red-50/80 border-l-4 border-espoch-red -ml-1' : 'hover:bg-gray-50'}`}
                >
                  <span className="flex items-center gap-1 min-w-0">
                    {tieneHijas ? (
                      <button
                        onClick={e => { e.stopPropagation(); alternarExpandida(serie.id); }}
                        title={abierta ? 'Contraer' : 'Desplegar'}
                        className="p-0.5 rounded text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                      >
                        <ChevronRight className={`w-3 h-3 transition-transform ${abierta ? 'rotate-90' : ''}`} />
                      </button>
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    <Folder className="w-4 h-4 text-espoch-yellow shrink-0" />
                    <span className={`text-[12.5px] truncate ml-1 ${activa ? 'font-bold text-espoch-red' : 'font-medium text-gray-600'}`} title={serie.nombre}>{serie.nombre}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="bg-gray-100 text-gray-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full">{conteoPorSerie.get(serie.id) || 0}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setSerieEnEdicion(serie); setNombreSerie(serie.nombre); setModalSerie('menu'); }}
                      title="Opciones de la categoría"
                      className="p-0.5 rounded text-gray-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-gray-700 transition-opacity"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              );
            })}

            {series.length === 0 && (
              <div className="px-2 py-8 text-center">
                <FolderPlus className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-[11px] text-gray-400 font-medium">Todavía no hay categorías.</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Crea una con el botón de arriba.</p>
              </div>
            )}
            {series.length > 0 && filasArbol.length === 0 && (
              <p className="px-2 py-6 text-center text-[11px] text-gray-400 font-medium">Ninguna categoría coincide.</p>
            )}
          </div>
        </div>

        {/* PANEL IZQUIERDO */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative overflow-hidden flex-1 min-w-0 transition-all duration-300">
          <AcentoTarjeta />

          {/* Dónde estoy: RECURSOS / FORMATOS / serie / subserie */}
          <label className="mb-4 block shrink-0 text-xs font-bold text-gray-600 lg:hidden">Categoría
            <select value={serieSel || ''} onChange={e => abrirRepositorio(e.target.value || null)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
              <option value="">Todas las categorías</option>
              {seriesPlanas.map(({ serie, nivel }) => <option key={serie.id} value={serie.id}>{'— '.repeat(nivel)}{serie.nombre}</option>)}
            </select>
          </label>
          {(errorSeries || errorFormatos) && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">No se pudo cargar el repositorio. <button className="font-bold underline" onClick={() => { void fetchSeries(); void fetchFormatos(); }}>Reintentar</button></p>}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 shrink-0 flex-wrap">
            <Home className="w-3 h-3" />
            <span>Recursos</span>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => abrirRepositorio(null)} className="hover:text-gray-600 transition-colors uppercase">Repositorio</button>
            {rutaSerie.map((serie, indice) => (
              <span key={serie.id} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3" />
                <button
                  onClick={() => setSerieSel(serie.id)}
                  className={`truncate max-w-[200px] uppercase transition-colors ${indice === rutaSerie.length - 1 ? 'text-espoch-yellow' : 'hover:text-gray-600'}`}
                  title={serie.nombre}
                >
                  {serie.nombre}
                </button>
              </span>
            ))}
          </div>

        {/* TOOLBAR
            Dos grupos que se envuelven COMO BLOQUES: antes cada uno llevaba `flex-wrap` dentro
            de un `justify-between`, así que se partían por su cuenta y las líneas se
            entrelazaban —el buscador arriba con los botones, y los chips abajo con el botón
            principal—. Ahora, o caben en una fila, o filtros arriba y acciones debajo. */}
        <div className="mb-6 flex shrink-0 flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">

          {/* Filtrar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPanelCategoriasAbierto(a => !a)}
              title="Categorías de documentos"
              className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border transition-colors ${panelCategoriasAbierto ? 'border-transparent bg-[#0f172a] text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <FolderTree className="h-4 w-4" />
            </button>
            <div className="relative w-full shrink-0 sm:w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar documentos..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-white text-[13px] text-gray-700 rounded-xl py-2 pl-10 pr-4 outline-none border border-gray-200 focus:border-blue-500 transition-all font-medium placeholder:text-gray-400 shadow-sm" />
            </div>

            {[
              { key: 'Todos', label: 'Todos', count: kpi.total },
              { key: TIPO_DINAMICO, label: 'Plantillas', count: kpi.dinamicos },
              { key: FILTRO_ARCHIVOS, label: 'Archivos', count: kpi.estaticos }
            ].map(({ key, label, count }) => {
              const isActive = tipoFilter === key;
              return (
                <button key={key} onClick={() => { setTipoFilter(key); setCurrentPage(1); }}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11.5px] font-bold transition-all ${isActive ? 'bg-[#1e2733] text-white border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'}`}>
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${isActive ? 'bg-espoch-yellow text-gray-900' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                </button>
              );
            })}

            <button
              onClick={() => { setParams(perfilSel === 'todos' ? {} : { perfil: perfilSel }); setSearchQuery(''); setTipoFilter('Todos'); setSerieSel(null); setCurrentPage(1); setSelectedIds([]); }}
              className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-700"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpiar filtros
            </button>
          </div>

          {/* Hacer. Mismo tamaño en las cuatro secundarias -antes mezclaban px-5/px-4 y
              text-xs/text-[12px]- y la acción principal, oscura, al final. */}
          <div className="flex flex-wrap items-center justify-end gap-2 2xl:shrink-0">
            {esAdmin && <button onClick={() => setImportandoCatalogo(true)} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[12px] font-bold text-gray-600 transition-colors hover:bg-gray-50">
              <FolderPlus className="w-3.5 h-3.5" /> Importar catálogo
            </button>}
            {importandoCatalogo && <ImportarCatalogo onClose={() => setImportandoCatalogo(false)} onComplete={async () => { await Promise.all([fetchFormatos(), fetchSeries()]); }} />}
            <button onClick={handleExportSelected} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[12px] font-bold text-gray-600 transition-colors hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" /> Exportar{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </button>
            <button onClick={() => setModalType('settings')} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[12px] font-bold text-gray-600 transition-colors hover:bg-gray-50">
              <Settings className="w-3.5 h-3.5" /> Logos y Sellos
            </button>
            <button
              onClick={() => {
                if (!serieSel) { void avisarSinCategoria('guardar el documento'); return; }
                setNombreEnlace(''); setUrlEnlace(''); setSerieDestino(serieSel); setModalEnlace(true);
              }}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[12px] font-bold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <LinkIcon className="w-3.5 h-3.5" /> Agregar enlace
            </button>
            <button onClick={() => {
              if (!serieSel) { void avisarSinCategoria('guardar la plantilla'); return; }
              clearForm(); setEditingId(null); setCategoriaGenerador(serieSel); setModalType('create');
            }} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-800 bg-[#0f172a] px-5 py-2.5 text-[12px] font-bold text-white shadow-lg transition-all hover:bg-black">
              <FileText className="w-3.5 h-3.5" /> Generador de Oficios
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full overflow-auto flex-1 flex flex-col min-h-0 relative custom-scrollbar">
          <div className="min-w-[900px] grid grid-cols-[40px_1fr_100px_120px_100px_80px_100px] gap-4 px-4 pb-3 border-b border-gray-100 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest sticky top-0 bg-white z-10 shrink-0">
            <div className="flex items-center justify-center"><input type="checkbox" checked={pageData.length > 0 && selectedIds.length === pageData.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('nombre')}>NOMBRE <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('tipo')}>TIPO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('fecha')}>FECHA CREADO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('size')}>TAMAÑO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('estado')}>ESTADO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="text-right">ACCIONES</div>
          </div>
          
          <div className="flex flex-col min-w-[900px]">
            {pageData.length === 0 && (
              <div className="px-6 py-14 text-center">
                <Folder className="mx-auto mb-3 h-9 w-9 text-gray-200" />
                <p className="text-[13px] font-bold text-gray-600">
                  {seleccionEsContenedor
                    ? `Elige una subcategoría de ${serieSeleccionada?.nombre} para ver sus documentos.`
                    : searchQuery.trim()
                      ? 'Ningún documento coincide con la búsqueda.'
                      : 'Esta categoría todavía no tiene documentos.'}
                </p>
              </div>
            )}
            {pageData.map((f, i) => (
              <div 
                key={f.id} 
                onClick={() => setSelectedFormatForDetail(f)}
                className={`grid grid-cols-[40px_1fr_100px_120px_100px_80px_100px] gap-4 px-4 py-3 border-b border-gray-50 transition-colors items-center animate-fade-in cursor-pointer ${selectedIds.includes(f.id) || selectedFormatForDetail?.id === f.id ? 'bg-indigo-50/40' : 'hover:bg-gray-50/50'}`} 
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div 
                  className="flex items-center justify-center h-full w-full cursor-pointer" 
                  onClick={e => { 
                    e.stopPropagation(); 
                    toggleSelect(f.id); 
                    if (!selectedIds.includes(f.id)) setSelectedFormatForDetail(f); 
                    else if (selectedFormatForDetail?.id === f.id) setSelectedFormatForDetail(null); 
                  }}
                >
                  <input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => {}} className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow pointer-events-none" />
                </div>
                <div 
                  className="flex flex-col min-w-0 h-full justify-center w-full cursor-pointer" 
                  onClick={e => { 
                    e.stopPropagation(); 
                    toggleSelect(f.id); 
                    if (!selectedIds.includes(f.id)) setSelectedFormatForDetail(f); 
                    else if (selectedFormatForDetail?.id === f.id) setSelectedFormatForDetail(null); 
                  }}
                >
                  <span className="text-[13px] font-bold text-gray-900 truncate">{f.nombre}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{f.id}</span>
                </div>
                <div><span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${f.esDinamico ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{f.etiquetaTipo}</span></div>
                <div className="text-[11px] text-gray-500 font-medium">{new Date(f.fecha).toLocaleDateString('es-ES')}</div>
                <div className="text-[11px] text-gray-500 font-medium">{f.size}</div>
                <div><span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 w-max bg-green-50 text-green-600 border-green-200/50`}><span className={`w-1.5 h-1.5 rounded-full bg-green-500`}></span>Activo</span></div>
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  {f.enlace && (
                    <button
                      onClick={() => void abrirEnlace(f.enlace!)}
                      title="Abrir el documento"
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {f.archivoPath && (
                    <button
                      onClick={() => descargarArchivo(f.archivoPath!)}
                      title={`Descargar ${f.archivoNombre}`}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => { 
                    setSelectedFmt(f); 
                    if (f.esDinamico) {
                      setGenValues(f.data || { ...defaultGenValues, nombreFormato: f.nombre });
                      setEditingId(f.id);
                      setCategoriaGenerador(f.idSerie || '');
                      setModalType('create');
                    } else {
                      setModalType('edit'); 
                    }
                  }} className="w-7 h-7 flex items-center justify-center rounded-md bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setSelectedFmt(f); setModalType('delete'); }} className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setCurrentPage}
          total={filteredData.length}
          perPage={perPage}
          onPerPageChange={setPerPage}
          className="pt-4 border-t border-gray-100/60"
        />
      </div>
        
      {/* PANEL DERECHO (Detalle del modelo) */}
      {(selectedFormatForDetail && selectedIds.length <= 1) && (
          <div className="w-1/4 min-w-[300px] bg-white rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative shrink-0 overflow-hidden animate-fade-in z-10">
            <button onClick={() => setSelectedFormatForDetail(null)} className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Detalle del modelo</p>
            <h2 className="text-sm font-bold text-gray-900 leading-tight mb-1">{selectedFormatForDetail.nombre}</h2>
            <p className="text-[10px] text-gray-400 font-mono mb-4">{selectedFormatForDetail.id}</p>

            <div className="w-full flex-1 bg-white rounded-xl border border-gray-200 flex flex-col mb-6 relative overflow-hidden shadow-sm p-3 min-h-0">
              {selectedFormatForDetail.tipo === 'DINAMICO' ? (
                <div className="w-full h-full bg-white overflow-y-auto border border-gray-100 shadow-inner rounded-sm custom-scrollbar relative z-10 pointer-events-auto">
                  {renderVistaDocumento({ ...defaultGenValues, ...(selectedFormatForDetail.data || {}) }, true)}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gray-50/50 rounded-lg z-10 px-4">
                  {selectedFormatForDetail.enlace ? (
                    <>
                      <ExternalLink className="w-12 h-12 text-blue-300 mb-2" strokeWidth={1.5} />
                      <span className="text-[9px] font-bold text-blue-500 tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">ENLACE</span>
                      {/* La URL completa, no solo el botón: quien administra necesita ver a dónde
                          apunta antes de abrirla, y copiarla para corregirla si está mal. */}
                      <span className="text-[8px] text-gray-400 mt-2 text-center break-all">{selectedFormatForDetail.enlace}</span>
                      <button
                        onClick={() => void abrirEnlace(selectedFormatForDetail.enlace)}
                        className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-black"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir documento
                      </button>
                    </>
                  ) : (
                    <>
                      <FileText className="w-12 h-12 text-red-300 mb-2" strokeWidth={1.5} />
                      <span className="text-[9px] font-bold text-red-500 tracking-widest bg-red-50 px-2 py-0.5 rounded-md border border-red-100">ARCHIVO</span>
                      <span className="text-[8px] text-gray-400 mt-2 text-center">Este documento es un archivo estático subido al sistema.</span>
                    </>
                  )}
                </div>
              )}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/10 pointer-events-none rounded-xl"></div>
            </div>

            <div className="flex items-center gap-2 mt-auto shrink-0">
               <button 
                  onClick={() => {
                    setSelectedFmt(selectedFormatForDetail);
                    if (selectedFormatForDetail.tipo === 'DINAMICO') {
                      setGenValues(selectedFormatForDetail.data || { ...defaultGenValues, nombreFormato: selectedFormatForDetail.nombre });
                      setEditingId(selectedFormatForDetail.id);
                      setCategoriaGenerador(selectedFormatForDetail.idSerie || '');
                      setModalType('create');
                    } else {
                      setModalType('edit');
                    }
                  }} 
                  className="flex-1 bg-[#0f172a] hover:bg-black text-white text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
               >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
               </button>
               <button onClick={() => handleDuplicate(selectedFormatForDetail)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                  <Layers className="w-3.5 h-3.5" /> Duplicar
               </button>
            </div>
            {selectedFormatForDetail.tipo === 'DINAMICO' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => void downloadFormat(selectedFormatForDetail, 'pdf')} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => void downloadFormat(selectedFormatForDetail, 'docx')} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                  <FileText className="w-3.5 h-3.5" /> Word
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      {modalType && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in overflow-hidden">
          
          {/* GENERADOR DE OFICIOS (FULL SCREEN MODAL) */}
          {modalType === 'create' && (
            <div className="bg-[#f8fafc] rounded-xl shadow-2xl w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col relative animate-scale-in border border-gray-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-xl shrink-0">
                <h2 className="text-xl font-bold text-[#0f172a]">{editingId ? 'Editar Modelo de Oficio' : 'Generador de Modelos de Oficio'}</h2>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto p-6 bg-white border-r border-gray-200 custom-scrollbar">
                  <div className="max-w-[600px] mx-auto flex flex-col gap-4 pb-20">
                    <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
                      <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-gray-900 select-none hover:bg-gray-50">
                        <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" /> 1. Datos del Oficio</div>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-4 border-t border-gray-100 flex flex-col gap-4 bg-gray-50/50">
                        <div className="flex flex-col gap-1.5 mb-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <label className="text-[10px] font-bold text-blue-800">Nombre para guardar esta plantilla / modelo *</label>
                          <input name="nombreFormato" value={genValues.nombreFormato} onChange={handleGenChange} placeholder="Ej. Oficio de retiro de carrera" className="text-xs p-2.5 border border-blue-200 rounded-lg outline-none focus:border-blue-400 bg-white text-blue-900 font-bold" />
                          {editingId && (
                            <>
                              <label className="mt-1 text-[10px] font-bold text-blue-800">Categoría documental *</label>
                              <select value={categoriaGenerador} onChange={e => setCategoriaGenerador(e.target.value)} className="cursor-pointer rounded-lg border border-blue-200 bg-white p-2.5 text-xs font-bold text-blue-900 outline-none focus:border-blue-400">
                                <option value="">Seleccione una categoría</option>
                                {seriesPlanas.map(({ serie, nivel }) => (
                                  <option key={serie.id} value={serie.id}>{'— '.repeat(nivel)}{serie.nombre}</option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                        <div className="grid grid-cols-[1fr_150px] gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-600">Ciudad *</label>
                            <input name="ciudadOficio" value={genValues.ciudadOficio} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-600">Fecha *</label>
                            <input type="date" name="fechaOficio" value={genValues.fechaOficio} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white cursor-pointer" />
                          </div>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-600">Título</label>
                            <select name="tituloAutoridad" value={genValues.tituloAutoridad} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white cursor-pointer">
                              <option value="Ing.">Ing.</option>
                              <option value="Phd.">Phd.</option>
                              <option value="Otro">Otro</option>
                            </select>
                            {genValues.tituloAutoridad === 'Otro' && (
                              <input 
                                name="tituloAutoridadOtro" 
                                value={genValues.tituloAutoridadOtro} 
                                onChange={handleGenChange} 
                                placeholder="Especifique..."
                                className="mt-1 text-xs p-2.5 border border-blue-200 rounded-lg outline-none focus:border-blue-400 bg-blue-50 text-blue-900 animate-fade-in" 
                              />
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-600">Nombre Autoridad *</label>
                            <input type="text" name="nombreAutoridad" value={genValues.nombreAutoridad} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" placeholder="Ej. Juan Pérez" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Cargo destinatario *</label>
                          <select name="cargoDestinatario" value={genValues.cargoDestinatario} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white cursor-pointer">
                            <option value="DECANO">DECANO</option>
                            <option value="DIRECTOR DE LA CARRERA DE ELECTRICIDAD">DIRECTOR DE LA CARRERA DE ELECTRICIDAD</option>
                            <option value="COORDINADOR ACADÉMICO">COORDINADOR ACADÉMICO</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">En su despacho</label>
                          <input name="enSuDespacho" value={genValues.enSuDespacho} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                      </div>
                    </details>
                    <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
                      <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-gray-900 select-none hover:bg-gray-50">
                        <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-500" /> 2. Datos del Estudiante</div>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Nombres y apellidos *</label>
                          <input name="nombresApellidos" value={genValues.nombresApellidos} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">C.I. *</label>
                          <input name="ci" value={genValues.ci} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Código estudiantil *</label>
                          <input name="codigoEstudiantil" value={genValues.codigoEstudiantil} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Número de PAO *</label>
                          <select name="numeroPao" value={genValues.numeroPao} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white cursor-pointer">
                            {[1,2,3,4,5,6,7,8,9].map(num => (
                              <option key={num} value={`PAO ${num}`}>PAO {num}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Carrera *</label>
                          <input name="carrera" value={genValues.carrera} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Facultad *</label>
                          <input name="facultad" value={genValues.facultad} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                      </div>
                    </details>
                    <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
                      <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-gray-900 select-none hover:bg-gray-50">
                        <div className="flex items-center gap-2"><FileEdit className="w-4 h-4 text-gray-500" /> 3. Detalles de la Solicitud</div>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-4 border-t border-gray-100 flex flex-col gap-4 bg-gray-50/50">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Descripción de la solicitud *</label>
                          <textarea name="descripcion" value={genValues.descripcion} onChange={handleGenChange} rows={3} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white resize-none"></textarea>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Despedida *</label>
                          <input name="despedida" value={genValues.despedida} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Cierre *</label>
                          <input name="cierre" value={genValues.cierre} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                      </div>
                    </details>
                    <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
                      <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-gray-900 select-none hover:bg-gray-50">
                        <div className="flex items-center gap-2"><PenTool className="w-4 h-4 text-gray-500" /> 4. Firma del Estudiante</div>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Nombre para la firma *</label>
                          <input name="nombreFirma" value={genValues.nombreFirma} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">C.I. para la firma *</label>
                          <input name="ciFirma" value={genValues.ciFirma} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                      </div>
                    </details>
                  </div>
                </div>

                <div className="flex-1 bg-[#f1f5f9] p-6 lg:p-10 flex flex-col items-center overflow-y-auto custom-scrollbar relative">
                  <div className="w-full max-w-[700px] flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-sm text-gray-700">Vista Previa del Documento</h4>
                    <div className="flex items-center gap-2">
                      <button onClick={() => void downloadGenerated('pdf')} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-sm transition-colors">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button onClick={() => void downloadGenerated('docx')} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-sm transition-colors">
                        <FileText className="w-3.5 h-3.5" /> Word
                      </button>
                    </div>
                  </div>
                  <div className="w-full max-w-[700px] aspect-[1/1.414] bg-white shadow-xl relative overflow-hidden text-gray-900">
                    {renderVistaDocumento(genValues)}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 flex justify-between items-center z-10 rounded-bl-xl rounded-br-xl shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <button onClick={clearForm} className="px-5 py-2.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Limpiar campos
                </button>
                <button onClick={saveModel} className="bg-[#0f172a] hover:bg-black text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> {editingId ? 'Actualizar Modelo' : 'Guardar Modelo'}
                </button>
              </div>
            </div>
          )}

          {modalType === 'settings' && (
            <div className="bg-white rounded-[20px] p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[500px] relative animate-scale-in">
              <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors bg-transparent p-1 z-10"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">Logos y Sellos Oficiales</h3>
              <p className="text-xs text-gray-500 mb-6">Suba las imágenes institucionales para los documentos PDF y Word.</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const hFile = fd.get('header') as File;
                const fFile = fd.get('footer') as File;
                try {
                  let hBase64 = headerImg;
                  let fBase64 = footerImg;
                  if (hFile.size > 0) hBase64 = await resizeToDataURL(hFile, 600);
                  if (fFile.size > 0) fBase64 = await resizeToDataURL(fFile, 1200);
                  saveSettings(hBase64, fBase64);
                  setModalType(null);
                } catch (err: any) {
                  const Swal = (await import('sweetalert2')).default;
                  const esCuota = /quota|exceeded/i.test(err?.name || '') || /quota|exceeded/i.test(err?.message || '');
                  Swal.fire({
                    icon: 'error',
                    title: 'No se pudieron guardar las imágenes',
                    text: esCuota
                      ? 'Las imágenes ocupan demasiado espacio en el navegador. Usa archivos más livianos (PNG/JPG pequeños).'
                      : (err?.message || 'Error desconocido al procesar la imagen.'),
                    confirmButtonColor: '#b00000',
                  });
                }
              }} className="flex flex-col gap-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">1. Sello Superior (Franja Izquierda)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center gap-4 bg-gray-50">
                    {headerImg ? <img src={headerImg} alt="Header" className="h-16 object-contain rounded" /> : <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-400"/></div>}
                    <input type="file" name="header" accept="image/*" className="text-xs w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">2. Pie de Página Institucional</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col gap-4 bg-gray-50">
                    {footerImg ? <img src={footerImg} alt="Footer" className="h-10 w-full object-contain rounded" /> : <div className="w-full h-10 bg-gray-200 rounded flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-400"/></div>}
                    <input type="file" name="footer" accept="image/*" className="text-xs w-full" />
                  </div>
                </div>
                <div className="flex gap-3 mt-2 justify-end">
                  <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                  <button type="submit" className="bg-[#0f172a] hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all border border-gray-800">Guardar Imágenes</button>
                </div>
              </form>
            </div>
          )}

          {modalType === 'edit' && selectedFmt && (
            <div className="bg-white rounded-[20px] p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[400px] relative animate-scale-in">
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">Editar Modelo</h3>
              <p className="text-xs text-gray-500 mb-6">Modifica los detalles del modelo o plantilla.</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                await updateFormato(selectedFmt.id, {
                  nombre: fd.get('nombre') as string,
                  descripcion: fd.get('descripcion') as string,
                  estado: fd.get('estado') as string,
                  id_serie: (fd.get('id_serie') as string) || null,
                });
                setModalType(null);
              }} className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nombre del documento</label>
                  <input name="nombre" defaultValue={selectedFmt.nombre} required className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-blue-400 font-medium" />
                </div>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-600">Categoría documental
                  <select name="id_serie" defaultValue={selectedFmt.idSerie || ''} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                    <option value="">Sin clasificar</option>
                    {seriesPlanas.map(({ serie, nivel }) => <option key={serie.id} value={serie.id}>{'— '.repeat(nivel)}{serie.nombre}</option>)}
                  </select>
                </label>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Descripción</label>
                  <textarea name="descripcion" defaultValue={selectedFmt.descripcion} required rows={3} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-blue-400 font-medium resize-none"></textarea>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado</label>
                  <select name="estado" defaultValue={selectedFmt.estado} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-blue-400 font-medium cursor-pointer">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-4 justify-end">
                  <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                  <button type="submit" className="bg-[#0f172a] hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all border border-gray-800">Guardar Cambios</button>
                </div>
              </form>
            </div>
          )}

          {(modalType === 'delete' || modalType === 'bulkDelete') && (
            <div className="bg-white rounded-[20px] p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[420px] relative animate-scale-in text-center py-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-[18px] font-extrabold text-gray-900 mb-2">Eliminar documento</h3>
              <p className="text-[13px] text-gray-500 mb-7 leading-relaxed">
                {modalType === 'bulkDelete' 
                  ? `Se eliminarán permanentemente los ${selectedIds.length} documentos seleccionados.`
                  : `¿Está seguro que desea eliminar "${selectedFmt?.nombre}" permanentemente?`}
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setModalType(null)} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={async () => {
                  // Primero la fila y despues el archivo: al reves, si fallara el borrado de
                  // la fila quedaria apuntando a un archivo que ya no existe.
                  const rutas = modalType === 'bulkDelete'
                    ? data.filter(f => selectedIds.includes(f.id)).map(f => f.archivoPath)
                    : [data.find(f => f.id === selectedFmt.id)?.archivoPath];
                  if (modalType === 'bulkDelete') { await Promise.all(selectedIds.map(id => removeFormato(id))); setSelectedIds([]); }
                  else { await removeFormato(selectedFmt.id); }
                  for (const ruta of rutas) if (ruta) await borrarArchivoFormato(ruta);
                  setModalType(null);
                }} className="flex-1 py-3 rounded-xl border border-transparent bg-espoch-red hover:bg-espoch-darkred text-white font-bold text-[13px] shadow-[0_0_12px_rgba(176,0,0,0.4)] transition-colors">Confirmar</button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODALES DE CATEGORÍA */}
      {modalSerie && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-[420px] p-8 shadow-2xl animate-scale-in">
            {modalSerie === 'menu' ? (
              <>
                <h3 className="text-[17px] font-extrabold text-gray-900 mb-1 truncate">{serieEnEdicion?.nombre}</h3>
                <p className="text-[12px] text-gray-500 mb-6">
                  {serieEnEdicion?.hijas.length
                    ? `Contiene ${serieEnEdicion.hijas.length} ${serieEnEdicion.hijas.length === 1 ? 'subcategoría' : 'subcategorías'}.`
                    : 'Sin subcategorías.'}
                </p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { setNombreSerie(''); setPadreNuevaSerie(serieEnEdicion?.id ?? null); setModalSerie('crear'); }} className="w-full py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <FolderPlus className="w-3.5 h-3.5" /> Nueva subcategoría aquí
                  </button>
                  <button onClick={() => setModalSerie('renombrar')} className="w-full py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <Edit2 className="w-3.5 h-3.5" /> Renombrar
                  </button>
                  {serieEnEdicion?.hijas.length ? (
                    <p className="text-[11px] text-gray-400 text-center leading-relaxed px-2 py-1">
                      Para eliminarla, borra antes sus subcategorías.
                    </p>
                  ) : (
                    <button onClick={() => setModalSerie('borrar')} className="w-full py-3 rounded-xl border border-red-100 bg-red-50 font-bold text-[13px] text-espoch-red hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  )}
                  <button onClick={() => { setModalSerie(null); setSerieEnEdicion(null); }} className="w-full py-3 rounded-xl font-bold text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">Cancelar</button>
                </div>
              </>
            ) : modalSerie === 'borrar' ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-espoch-red flex items-center justify-center mb-4 mx-auto">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h3 className="text-[17px] font-extrabold text-gray-900 text-center mb-2">Eliminar categoría</h3>
                <p className="text-[12px] text-gray-500 text-center mb-6 leading-relaxed">
                  Se eliminará <b>{serieEnEdicion?.nombre}</b>. Los documentos que contiene <b>no se borran</b>:
                  quedan sin clasificar y siguen apareciendo en Todas.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setModalSerie('menu')} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                  <button onClick={borrarSerie} disabled={guardandoSerie} className="flex-1 py-3 rounded-xl bg-espoch-red hover:bg-espoch-darkred text-white font-bold text-[13px] transition-colors disabled:opacity-60">
                    {guardandoSerie ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-[17px] font-extrabold text-gray-900 mb-1">
                  {modalSerie === 'renombrar' ? 'Renombrar categoría' : 'Nueva categoría'}
                </h3>
                <p className="text-[12px] text-gray-500 mb-6">Organiza documentos relacionados dentro del repositorio.</p>

                <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Nombre</label>
                <input
                  autoFocus
                  value={nombreSerie}
                  onChange={e => setNombreSerie(enMayusculas(e.target.value))}
                  onKeyDown={e => { if (e.key === 'Enter') guardarSerie(); }}
                  placeholder="Ej. 02_SILABOS"
                  className="w-full mt-1.5 mb-5 bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium transition-all"
                />

                {modalSerie === 'crear' && (
                  <>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Categoría superior</label>
                    <select
                      value={padreNuevaSerie ?? ''}
                      onChange={e => setPadreNuevaSerie(e.target.value || null)}
                      className="w-full mt-1.5 mb-6 bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium cursor-pointer transition-all"
                    >
                      <option value="">Primer nivel</option>
                      {seriesPlanas.map(({ serie, nivel }) => (
                        <option key={serie.id} value={serie.id}>{'\u00A0'.repeat(nivel * 3)}{serie.nombre}</option>
                      ))}
                    </select>
                  </>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setModalSerie(null); setSerieEnEdicion(null); }} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                  <button onClick={guardarSerie} disabled={!nombreSerie.trim() || guardandoSerie} className="flex-1 py-3 rounded-xl bg-[#0f172a] hover:bg-black text-white font-bold text-[13px] transition-colors disabled:opacity-40">
                    {guardandoSerie ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE SUBIDA */}
      {modalEnlace && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-[460px] p-8 shadow-2xl animate-scale-in">
            <h3 className="text-[17px] font-extrabold text-gray-900 mb-1">Agregar documento</h3>
            <p className="text-[12px] text-gray-500 mb-6">
              Pega el enlace de OneDrive. El repositorio guarda la dirección, no una copia del archivo.
            </p>

            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Nombre</label>
            <input
              autoFocus
              value={nombreEnlace}
              onChange={e => setNombreEnlace(enMayusculas(e.target.value))}
              placeholder="Ej. ANEXO A SOLICITUD"
              className="w-full mt-1.5 mb-5 bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium transition-all"
            />

            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Enlace</label>
            <input
              type="url"
              value={urlEnlace}
              onChange={e => setUrlEnlace(e.target.value)}
              placeholder="https://espoch-my.sharepoint.com/..."
              className="w-full mt-1.5 mb-5 bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium transition-all"
            />

            <div className="flex gap-3">
              <button onClick={() => setModalEnlace(false)} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={guardarEnlace} disabled={!nombreEnlace.trim() || !urlEnlace.trim() || subiendo} className="flex-1 py-3 rounded-xl bg-[#0f172a] hover:bg-black text-white font-bold text-[13px] transition-colors disabled:opacity-40">
                {subiendo ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
    </div>
  );
};
