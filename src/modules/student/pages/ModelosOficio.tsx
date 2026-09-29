import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronRight, Download, ExternalLink, Eye, FileText, Folder, LayoutGrid, List, Printer, Search, UserRound, X } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useFormatosStore } from '../../../store/formatosStore';
import { construirArbol, idsConDescendientes, useSeriesFormatosStore } from '../../../store/seriesFormatosStore';
import { perfilesRepositorio } from '../../admin/data/repositorioElectricidad';
import { generatePreviewDOCX, generatePreviewPDF, type DocumentParams } from '../../admin/utils/documentGenerator';
import type { Database } from '../../../lib/database.types';
import { supabase } from '../../../lib/supabase';
import { componerNombreCompleto } from '../../../lib/texto';
import { esUrlSegura } from '../../../lib/urlSegura';
import {
  destinatarioDe,
  marcadoresDe,
  plantillaDe,
  prellenarDesdePerfil,
  rellenarMarcadores,
  type PlantillaOficio,
} from '../../../lib/plantillaOficio';
import { BotonPanelLateral, PanelLateral } from '../../../components/ui/PanelLateral';

type FormatoRow = Database['public']['Tables']['formatos']['Row'];

/**
 * Qué ve el estudiante: las plantillas que rellena aquí (`DINAMICO`) y los documentos que la
 * facultad publica como enlace (`ENLACE`). Antes solo entraban las primeras, así que un
 * documento enlazado dentro de una categoría suya no aparecía en ninguna parte.
 */
const TIPOS_VISIBLES = ['DINAMICO', 'ENLACE'];

/** Colores de la insignia de categoría. Se elige por el NOMBRE y no por su posición en la
 *  lista, para que crear una categoría nueva no recoloree a todas las demás. */
const COLORES_CATEGORIA = [
  { fondo: 'bg-red-50', texto: 'text-espoch-red' },
  { fondo: 'bg-blue-50', texto: 'text-blue-600' },
  { fondo: 'bg-emerald-50', texto: 'text-emerald-600' },
  { fondo: 'bg-amber-50', texto: 'text-amber-600' },
  { fondo: 'bg-purple-50', texto: 'text-purple-600' },
  { fondo: 'bg-sky-50', texto: 'text-sky-600' },
];

const indiceEstable = (texto: string) => {
  let suma = 0;
  for (const caracter of texto) suma = (suma + caracter.codePointAt(0)!) % COLORES_CATEGORIA.length;
  return suma;
};

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

export const ModelosOficio = () => {
  const usuario = useAuthStore(state => state.user);
  const { formatos, loading, error, fetchFormatos } = useFormatosStore();
  const { series, fetchSeries } = useSeriesFormatosStore();
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<'recientes' | 'nombre'>('recientes');
  /**
   * Camino de categorías abiertas: la posición del arreglo es el nivel. Guardarlo así hace que
   * abrir una rama cierre a sus hermanas sin tener que buscarlas, que es el "una a la vez" de
   * Infraestructura; con una lista suelta, 26 subcategorías abiertas vuelven a la lista larga.
   */
  const [ramasAbiertas, setRamasAbiertas] = useState<string[]>([]);
  /** Las categorías se consultan a ratos: el panel se superpone en vez de quedarse fijo. */
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [vista, setVista] = useState<'tarjetas' | 'lista'>('tarjetas');
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [plantillaActiva, setPlantillaActiva] = useState<FormatoRow | null>(null);
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
  const [values, setValues] = useState<OficioValues>(valoresIniciales);
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);

  useEffect(() => {
    void fetchFormatos();
    void fetchSeries();
  }, [fetchFormatos, fetchSeries]);

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

  /** Cuántos modelos tiene cada categoría, contando los de sus subcategorías. */
  const cantidadPorCategoria = useMemo(
    () => new Map(categoriasPlanas.map(fila => [fila.id, fila.cantidad])),
    [categoriasPlanas],
  );



  /**
   * La categoría cuyos modelos se están listando, aparte de la resaltada en el árbol: una
   * categoría que agrupa otras no tiene listado propio, así que pulsarla solo despliega la rama
   * y la lista conserva lo último que sí tenía modelos.
   */
  const [categoriaMostrada, setCategoriaMostrada] = useState<string | null>(null);

  const nombreDeLoMostrado = useMemo(
    () => categoriasPlanas.find(fila => fila.id === categoriaMostrada)?.nombre || 'Modelos de oficio',
    [categoriasPlanas, categoriaMostrada],
  );

  const plantillas = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase('es');
    /*
     * Se lista la categoría abierta y nada más. Buscando es al revés: la búsqueda es intención
     * explícita, así que abarca la rama resaltada completa, subcategorías incluidas.
     */
    const resaltada = categoriasPlanas.find(fila => fila.id === categoriaActiva);
    const ids = consulta
      ? new Set(resaltada ? resaltada.ids : [])
      : new Set(categoriaMostrada ? [categoriaMostrada] : []);
    const visibles = plantillasEstudiantes.filter(formato => {
      if (!(formato.id_serie && ids.has(formato.id_serie))) return false;
      if (!consulta) return true;
      return `${formato.nombre} ${formato.descripcion || ''}`.toLocaleLowerCase('es').includes(consulta);
    });
    return [...visibles].sort((a, b) => orden === 'nombre'
      ? a.nombre.localeCompare(b.nombre, 'es')
      : (b.updated_at || '').localeCompare(a.updated_at || ''));
  }, [busqueda, categoriaActiva, categoriaMostrada, categoriasPlanas, orden, plantillasEstudiantes]);

  /**
   * Sin "Todas las categorías", la pantalla necesita abrir en alguna parte: la primera del
   * árbol. Si agrupa otras se despliega, para que la siguiente elección esté a la vista.
   */
  useEffect(() => {
    if (categoriaMostrada || arbolCategorias.length === 0) return;
    // La primera categoría SIN subcategorías: es la primera que tiene modelos propios que
    // mostrar. Se abre el camino hasta ella para que se vea dónde está.
    const buscarHoja = (
      ramas: typeof arbolCategorias,
      camino: string[],
    ): { id: string; camino: string[] } | null => {
      for (const rama of ramas) {
        if (rama.hijas.length === 0) return { id: rama.id, camino };
        const hallada = buscarHoja(rama.hijas, [...camino, rama.id]);
        if (hallada) return hallada;
      }
      return null;
    };
    const hoja = buscarHoja(arbolCategorias, []);
    if (!hoja) return;
    setCategoriaMostrada(hoja.id);
    setCategoriaActiva(actual => actual ?? hoja.id);
    setRamasAbiertas(hoja.camino);
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

  /** Muestra el modelo tal como saldrá impreso, sin abrir el formulario ni pisar lo escrito. */
  const vistaPrevia = (plantilla: FormatoRow) => {
    const transcrita = plantillaDe(plantilla.datos);
    const valores = transcrita ? prellenarDesdePerfil(marcadoresDe(transcrita), perfilParaOficio) : {};
    const url = URL.createObjectURL(
      generatePreviewPDF(parametrosDeFormato(plantilla, valores, valoresDe(plantilla))),
    );
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

  const parametrosDocumento = (): DocumentParams =>
    plantillaActiva ? parametrosDeFormato(plantillaActiva, marcadores, values) : parametrosDe(values);

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

  const alternarRama = (id: string, nivel: number) =>
    setRamasAbiertas(actual => (actual[nivel] === id ? actual.slice(0, nivel) : [...actual.slice(0, nivel), id]));

  /** Dibuja una categoría y, si está abierta, sus subcategorías debajo. */
  const dibujarRama = (rama: (typeof arbolCategorias)[number], nivel: number): ReactNode => {
    const activa = rama.id === categoriaActiva;
    const abierta = ramasAbiertas[nivel] === rama.id;
    const tieneHijas = rama.hijas.length > 0;
    return (
      <div key={rama.id} className="flex flex-col">
        <button
          type="button"
          onClick={() => {
            setCategoriaActiva(rama.id);
            if (tieneHijas) { alternarRama(rama.id, nivel); return; }
            setCategoriaMostrada(rama.id);
            setPanelAbierto(false);
          }}
          style={{ paddingLeft: `${12 + nivel * 14}px` }}
          className={`flex items-center gap-2 rounded-xl py-2.5 pr-3 text-left text-[12px] font-bold transition ${activa ? 'bg-espoch-red text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          {/* El espacio de la flecha se reserva siempre: sin él, las hojas y las ramas no
              alinean sus nombres y la sangría deja de leerse. */}
          <span className="w-3 shrink-0">
            {tieneHijas && <ChevronRight className={`h-3 w-3 transition-transform ${abierta ? 'rotate-90' : ''}`} />}
          </span>
          <Folder className={`h-4 w-4 shrink-0 ${activa ? '' : 'text-gray-400'}`} />
          <span className="flex-1 truncate" title={rama.nombre}>{rama.nombre}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${activa ? 'bg-white/20' : 'bg-gray-200/70 text-gray-600'}`}>
            {cantidadPorCategoria.get(rama.id) ?? 0}
          </span>
        </button>
        {abierta && rama.hijas.map(hija => dibujarRama(hija, nivel + 1))}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f7fb]">
      <div className="relative flex min-h-[92px] shrink-0 items-center overflow-hidden border-b border-gray-800 bg-[#1a1f26] px-6 py-4 shadow-sm lg:px-12">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/95 to-[#1a1f26]/80" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-espoch-red text-white shadow-lg"><FileText className="h-7 w-7" /></div>
          <div><h1 className="text-sm font-extrabold text-white">Modelos de oficio</h1><p className="mt-1 text-[11px] text-gray-400">Completa un modelo institucional y descárgalo para imprimir y entregar.</p></div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 gap-5 p-5 lg:gap-6 lg:p-8">
        {/* El árbol de categorías se superpone y lo abre un botón: se consulta un momento y se
            deja de mirar, así que reservarle 240px fijos se los quitaba siempre a los modelos. */}
        <PanelLateral abierto={panelAbierto} onCerrar={() => setPanelAbierto(false)} titulo="Categorías">
          <div className="flex flex-col gap-1 p-3">
            {arbolCategorias.map(rama => dibujarRama(rama, 0))}
          </div>
        </PanelLateral>

        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2.5">
            <BotonPanelLateral abierto={panelAbierto} onClick={() => setPanelAbierto(abierto => !abierto)} titulo="Categorías" />
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar modelos de oficio…" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
            </div>

            <select
              value={orden}
              onChange={event => setOrden(event.target.value as typeof orden)}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[12px] font-bold text-gray-600 shadow-sm outline-none"
            >
              <option value="recientes">Más recientes</option>
              <option value="nombre">Nombre (A-Z)</option>
            </select>

            <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              {([['tarjetas', LayoutGrid], ['lista', List]] as const).map(([modo, Icono]) => (
                <button
                  key={modo}
                  type="button"
                  onClick={() => setVista(modo)}
                  aria-label={modo === 'tarjetas' ? 'Ver en tarjetas' : 'Ver en lista'}
                  className={`rounded-lg p-2 transition ${vista === modo ? 'bg-espoch-red text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <Icono className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-extrabold text-gray-900">{nombreDeLoMostrado}</h2>
              <p className="mt-0.5 text-[11px] text-gray-500">Selecciona un modelo, complétalo y genera tu oficio.</p>
            </div>
            <span className="text-[11px] font-semibold text-gray-400">Mostrando {plantillas.length} {plantillas.length === 1 ? 'modelo' : 'modelos'}</span>
          </div>

          {loading ? <div className="py-20 text-center text-sm text-gray-400">Cargando modelos…</div> : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">No se pudieron consultar los modelos disponibles.</div>
          ) : plantillas.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <Folder className="mb-4 h-12 w-12 text-gray-300" />
              <h3 className="font-extrabold text-gray-700">
                {busqueda ? 'No encontramos modelos con esa búsqueda' : 'Todavía no hay modelos aquí'}
              </h3>
              <p className="mt-2 max-w-md text-xs text-gray-400">
                {busqueda
                  ? 'Prueba con otra palabra o elige otra categoría.'
                  : 'El administrador debe publicar una plantilla o un documento dentro de una categoría para estudiantes.'}
              </p>
            </div>
          ) : (
            <div className={vista === 'tarjetas' ? 'grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'flex flex-col gap-2.5 pb-2'}>
              {plantillas.map(plantilla => {
                const categoria = series.find(serie => serie.id === plantilla.id_serie)?.nombre || 'Oficios';
                const esEnlace = plantilla.tipo === 'ENLACE';
                const color = COLORES_CATEGORIA[indiceEstable(categoria)];
                const actualizado = (plantilla.updated_at || plantilla.created_at || '').slice(0, 10);
                const descripcion = plantilla.descripcion || (esEnlace ? 'Documento publicado por la facultad.' : 'Modelo institucional listo para completar.');

                if (vista === 'lista') {
                  return (
                    <article key={plantilla.id} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color.fondo} ${color.texto}`}>
                        {esEnlace ? <ExternalLink className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[13px] font-extrabold text-gray-900">{plantilla.nombre}</h3>
                        <p className="truncate text-[11px] text-gray-500">{descripcion}</p>
                      </div>
                      <span className={`hidden shrink-0 rounded-md px-2 py-1 text-[10px] font-bold sm:inline ${color.fondo} ${color.texto}`}>{categoria}</span>
                      {esEnlace ? (
                        <button onClick={() => abrirEnlace(plantilla.enlace)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-espoch-red px-3.5 py-2 text-[11px] font-bold text-white hover:bg-[#8b0000]">
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir
                        </button>
                      ) : (
                        <button onClick={() => abrirPlantilla(plantilla)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-espoch-red px-3.5 py-2 text-[11px] font-bold text-white hover:bg-[#8b0000]">
                          <FileText className="h-3.5 w-3.5" /> Usar modelo
                        </button>
                      )}
                    </article>
                  );
                }

                return (
                  <article key={plantilla.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color.fondo} ${color.texto}`}>
                        {esEnlace ? <ExternalLink className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-[13px] font-extrabold text-gray-900">{plantilla.nombre}</h3>
                        <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${color.fondo} ${color.texto}`}>{categoria}</span>
                      </div>
                      {/* Los formatos que SÍ produce este modelo: un enlace no genera archivo. */}
                      <div className="flex shrink-0 flex-col gap-1">
                        {esEnlace ? (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-600">ENLACE</span>
                        ) : (
                          <>
                            <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-extrabold text-sky-600">DOCX</span>
                            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-extrabold text-espoch-red">PDF</span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{descripcion}</p>

                    {actualizado && (
                      <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-gray-400">
                        <CalendarDays className="h-3.5 w-3.5" /> Actualizado: {new Date(`${actualizado}T12:00:00`).toLocaleDateString('es-EC')}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                      {esEnlace ? (
                        <button onClick={() => abrirEnlace(plantilla.enlace)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-espoch-red px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#8b0000]">
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir documento
                        </button>
                      ) : (
                        <>
                          <button onClick={() => vistaPrevia(plantilla)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-bold text-gray-600 transition hover:bg-gray-50">
                            <Eye className="h-3.5 w-3.5" /> Vista previa
                          </button>
                          <button onClick={() => abrirPlantilla(plantilla)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-espoch-red px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#8b0000]">
                            <FileText className="h-3.5 w-3.5" /> Usar modelo
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {plantillaActiva && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
          <div className="flex h-[95vh] w-full max-w-[1450px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4"><div><h2 className="text-lg font-extrabold text-gray-900">{values.nombreFormato}</h2><p className="text-xs text-gray-400">Completa tus datos. Esto no crea una solicitud de equipos.</p></div><button onClick={() => setPlantillaActiva(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></header>
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <div className="w-full overflow-y-auto border-r border-gray-200 p-6 lg:w-[48%]">
                {plantillaTranscrita ? (
                  <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Asunto</p>
                      <p className="mt-1 text-[13px] font-semibold text-gray-800">{plantillaTranscrita.asunto}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Campo label="Ciudad" value={values.ciudadOficio} onChange={valor => cambiar('ciudadOficio', valor)} />
                      <Campo label="Fecha" type="date" value={values.fechaOficio} onChange={valor => cambiar('fechaOficio', valor)} />
                      {/* Un campo por hueco del documento. Salen del texto y no de una lista
                          aparte, así que no pueden quedar desfasados de lo que se imprime. */}
                      {marcadoresDe(plantillaTranscrita).map(marcador => (
                        <Campo
                          key={marcador}
                          label={marcador.slice(1, -1).toLocaleLowerCase('es')}
                          value={marcadores[marcador] ?? ''}
                          onChange={valor => setMarcadores(actuales => ({ ...actuales, [marcador]: valor }))}
                        />
                      ))}
                      <Campo label="Nombre para la firma" value={values.nombreFirma} onChange={valor => cambiar('nombreFirma', valor)} />
                      <Campo label="Cédula para la firma" value={values.ciFirma} onChange={valor => cambiar('ciFirma', valor)} />
                    </div>

                    {plantillaTranscrita.referencia && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                        {plantillaTranscrita.referencia}
                      </p>
                    )}
                  </div>
                ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="Ciudad" value={values.ciudadOficio} onChange={valor => cambiar('ciudadOficio', valor)} />
                  <Campo label="Fecha" type="date" value={values.fechaOficio} onChange={valor => cambiar('fechaOficio', valor)} />
                  <SelectorDestinatario
                    opciones={destinatarios}
                    cargoActual={values.cargoDestinatario}
                    nombreActual={values.nombreAutoridad ? [values.tituloAutoridad, values.nombreAutoridad].filter(Boolean).join(' ') : ''}
                    onSelect={seleccionarDestinatario}
                    className="sm:col-span-2"
                  />
                  <Campo label="Nombres y apellidos" value={values.nombresApellidos} onChange={valor => { cambiar('nombresApellidos', valor); cambiar('nombreFirma', valor); }} />
                  <Campo label="Cédula" value={values.ci} onChange={valor => { cambiar('ci', valor); cambiar('ciFirma', valor); }} />
                  <Campo label="Código estudiantil" value={values.codigoEstudiantil} onChange={valor => cambiar('codigoEstudiantil', valor)} />
                  <Campo label="PAO" value={values.numeroPao} onChange={valor => cambiar('numeroPao', valor)} />
                  <Campo label="Carrera" value={values.carrera} onChange={valor => cambiar('carrera', valor)} />
                  <Campo label="Facultad" value={values.facultad} onChange={valor => cambiar('facultad', valor)} />
                  <label className="sm:col-span-2 flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">Solicitud
                    <textarea value={values.descripcion} onChange={event => cambiar('descripcion', event.target.value)} rows={5} className="resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-medium normal-case tracking-normal text-gray-800 outline-none focus:border-blue-400" placeholder="Describe claramente lo que solicitas…" />
                  </label>
                </div>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-slate-100 p-5 lg:p-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-extrabold text-gray-700">Vista previa</h3><div className="flex gap-2"><button onClick={() => void descargar('pdf')} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold"><Download className="h-4 w-4" /> PDF</button><button onClick={() => void descargar('docx')} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold"><FileText className="h-4 w-4" /> Word</button><button onClick={abrirParaImprimir} className="flex items-center gap-2 rounded-lg bg-espoch-red px-4 py-2 text-xs font-bold text-white"><Printer className="h-4 w-4" /> Imprimir</button></div></div>
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

const Campo = ({ label, value, onChange, type = 'text', className = '' }: { label: string; value: string; onChange: (valor: string) => void; type?: string; className?: string }) => (
  <label className={`${className} flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500`}>{label}
    <input type={type} value={value} onChange={event => onChange(event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-gray-800 outline-none focus:border-blue-400" />
  </label>
);
