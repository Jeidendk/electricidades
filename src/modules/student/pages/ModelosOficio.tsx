import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronRight, Download, FileText, Folder, GraduationCap, Home, Printer, Search, UserRound, X } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useFormatosStore } from '../../../store/formatosStore';
import { construirArbol, idsConDescendientes, rutaHasta, useSeriesFormatosStore } from '../../../store/seriesFormatosStore';
import { perfilesRepositorio } from '../../admin/data/repositorioElectricidad';
import { generatePreviewDOCX, generatePreviewPDF, type DocumentParams } from '../../admin/utils/documentGenerator';
import type { Database } from '../../../lib/database.types';
import { supabase } from '../../../lib/supabase';
import { componerNombreCompleto } from '../../../lib/texto';

type FormatoRow = Database['public']['Tables']['formatos']['Row'];

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
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [plantillaActiva, setPlantillaActiva] = useState<FormatoRow | null>(null);
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
  const categoriaSeleccionada = useMemo(
    () => categoriasEstudiantes.find(serie => serie.id === categoriaActiva) || null,
    [categoriaActiva, categoriasEstudiantes],
  );
  const subcategorias = useMemo(() => {
    if (!categoriaActiva) return arbolCategorias;
    const buscar = (ramas: typeof arbolCategorias): typeof arbolCategorias => {
      for (const rama of ramas) {
        if (rama.id === categoriaActiva) return rama.hijas;
        const resultado = buscar(rama.hijas);
        if (resultado.length) return resultado;
      }
      return [];
    };
    return buscar(arbolCategorias);
  }, [arbolCategorias, categoriaActiva]);
  const rutaCategorias = useMemo(() => rutaHasta(categoriasEstudiantes, categoriaActiva), [categoriaActiva, categoriasEstudiantes]);

  const plantillasEstudiantes = useMemo(() => formatos.filter(formato => formato.tipo === 'DINAMICO'
    && formato.estado === 'activo'
    && !!formato.id_serie
    && idsEstudiantes.has(formato.id_serie)), [formatos, idsEstudiantes]);

  const plantillas = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase('es');
    if (consulta) return plantillasEstudiantes.filter(formato => `${formato.nombre} ${formato.descripcion || ''}`.toLocaleLowerCase('es').includes(consulta));
    if (!categoriaActiva) return [];
    return plantillasEstudiantes.filter(formato => formato.id_serie === categoriaActiva);
  }, [busqueda, categoriaActiva, plantillasEstudiantes]);

  const cantidadModelos = (categoriaId: string) => {
    const nodo = (() => {
      const buscar = (ramas: typeof arbolCategorias): (typeof arbolCategorias)[number] | null => {
        for (const rama of ramas) {
          if (rama.id === categoriaId) return rama;
          const hallada = buscar(rama.hijas);
          if (hallada) return hallada;
        }
        return null;
      };
      return buscar(arbolCategorias);
    })();
    if (!nodo) return 0;
    const ids = new Set(idsConDescendientes(nodo));
    return plantillasEstudiantes.filter(formato => formato.id_serie && ids.has(formato.id_serie)).length;
  };

  const abrirPlantilla = (plantilla: FormatoRow) => {
    const datos = (plantilla.datos && typeof plantilla.datos === 'object' ? plantilla.datos : {}) as unknown as Partial<OficioValues>;
    const nombre = usuario?.nombre || datos.nombresApellidos || '';
    setValues({
      ...valoresIniciales,
      ...datos,
      nombreFormato: plantilla.nombre,
      fechaOficio: new Date().toISOString().slice(0, 10),
      nombresApellidos: nombre,
      nombreFirma: nombre,
      carrera: usuario?.carreraNombre || datos.carrera || '',
      facultad: usuario?.facultadNombre || datos.facultad || '',
      numeroPao: usuario?.pao ? `PAO ${usuario.pao}` : (datos.numeroPao || ''),
      headerImg: datos.headerImg || localStorage.getItem('espoch_header_img') || '',
      footerImg: datos.footerImg || localStorage.getItem('espoch_footer_img') || '',
    });
    setPlantillaActiva(plantilla);
  };

  const cuerpo = `Reciba un cordial saludo. Por la presente, Yo, ${values.nombresApellidos}, con C.I: ${values.ci} y código estudiantil ${values.codigoEstudiantil}, estudiante del ${values.numeroPao} de la carrera de ${values.carrera} correspondiente a la ${values.facultad}, solicito amablemente, ${values.descripcion || 'lo que se solicita.'}`;
  const fechaFormateada = `${values.ciudadOficio}, ${new Date(values.fechaOficio + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const parametrosDocumento = (): DocumentParams => ({
    headerImgBase64: values.headerImg,
    footerImgBase64: values.footerImg,
    tituloAutoridad: values.tituloAutoridad === 'Otro' ? values.tituloAutoridadOtro : values.tituloAutoridad,
    nombreAutoridad: values.nombreAutoridad,
    cargo: values.cargoDestinatario,
    lugarFecha: fechaFormateada,
    cuerpo,
    studentName: values.nombreFirma,
    studentCI: values.ciFirma,
  });

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
      <div className="relative flex min-h-[92px] shrink-0 items-center overflow-hidden border-b border-gray-800 bg-[#1a1f26] px-6 py-4 shadow-sm lg:px-12">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/95 to-[#1a1f26]/80" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-espoch-red text-white shadow-lg"><FileText className="h-7 w-7" /></div>
          <div><h1 className="text-sm font-extrabold text-white">Modelos de oficio</h1><p className="mt-1 text-[11px] text-gray-400">Completa un modelo institucional y descárgalo para imprimir y entregar.</p></div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 lg:p-8">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <Search className="ml-2 h-4 w-4 text-gray-400" />
          <input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar un modelo de oficio…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold text-gray-500">{busqueda ? plantillas.length : plantillasEstudiantes.length} modelos</span>
        </div>

        {loading ? <div className="py-20 text-center text-sm text-gray-400">Cargando modelos…</div> : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">No se pudieron consultar los modelos disponibles.</div>
        ) : categoriasEstudiantes.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Folder className="mb-4 h-12 w-12 text-gray-300" /><h2 className="font-extrabold text-gray-700">No hay modelos publicados</h2><p className="mt-2 max-w-md text-xs text-gray-400">El administrador debe guardar una plantilla dinámica dentro de una categoría para estudiantes.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {!busqueda && (
              <nav className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-gray-500" aria-label="Ruta de categorías">
                {categoriaActiva && <button type="button" onClick={() => setCategoriaActiva(categoriaSeleccionada?.idPadre || null)} className="mr-2 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50"><ArrowLeft className="h-3.5 w-3.5" /> Volver</button>}
                <button type="button" onClick={() => setCategoriaActiva(null)} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white hover:text-gray-800"><Home className="h-3.5 w-3.5" /> Categorías</button>
                {rutaCategorias.map(categoria => <span key={categoria.id} className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-gray-300" /><button type="button" onClick={() => setCategoriaActiva(categoria.id)} className={`rounded-md px-2 py-1 hover:bg-white hover:text-gray-800 ${categoria.id === categoriaActiva ? 'font-extrabold text-gray-900' : ''}`}>{categoria.nombre}</button></span>)}
              </nav>
            )}

            {!busqueda && subcategorias.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-gray-500">{categoriaActiva ? 'Subcategorías' : 'Categorías de documentos'}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {subcategorias.map(categoria => {
                    const cantidad = cantidadModelos(categoria.id);
                    return <button type="button" key={categoria.id} onClick={() => setCategoriaActiva(categoria.id)} className="group flex min-h-[112px] items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><Folder className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-extrabold text-gray-800">{categoria.nombre}</h3><p className="mt-1 text-[10px] font-semibold text-gray-400">{cantidad} {cantidad === 1 ? 'modelo' : 'modelos'}</p></div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-espoch-red" />
                    </button>;
                  })}
                </div>
              </section>
            )}

            {plantillas.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-gray-500">{busqueda ? 'Resultados de búsqueda' : 'Modelos de esta categoría'}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {plantillas.map(plantilla => {
                    const categoria = series.find(serie => serie.id === plantilla.id_serie)?.nombre || 'Oficios';
                    return <article key={plantilla.id} className="flex min-h-[190px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-espoch-red"><FileText className="h-5 w-5" /></div>
                      <h2 className="text-sm font-extrabold text-gray-900">{plantilla.nombre}</h2>
                      <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{plantilla.descripcion || 'Modelo institucional listo para completar.'}</p>
                      <div className="mt-auto flex items-center justify-between pt-5"><span className="max-w-[55%] truncate text-[9px] font-bold uppercase tracking-wide text-gray-400">{categoria}</span><button onClick={() => abrirPlantilla(plantilla)} className="rounded-lg bg-[#0f172a] px-4 py-2 text-[11px] font-bold text-white hover:bg-black">Usar modelo</button></div>
                    </article>;
                  })}
                </div>
              </section>
            )}

            {((busqueda && plantillas.length === 0) || (!busqueda && categoriaActiva && subcategorias.length === 0 && plantillas.length === 0)) && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center"><FileText className="mx-auto mb-3 h-9 w-9 text-gray-300" /><p className="text-sm font-bold text-gray-600">{busqueda ? 'No encontramos modelos con esa búsqueda.' : 'Esta categoría todavía no contiene modelos.'}</p></div>
            )}
          </div>
        )}
      </div>

      {plantillaActiva && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
          <div className="flex h-[95vh] w-full max-w-[1450px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4"><div><h2 className="text-lg font-extrabold text-gray-900">{values.nombreFormato}</h2><p className="text-xs text-gray-400">Completa tus datos. Esto no crea una solicitud de equipos.</p></div><button onClick={() => setPlantillaActiva(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></header>
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <div className="w-full overflow-y-auto border-r border-gray-200 p-6 lg:w-[48%]">
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
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-slate-100 p-5 lg:p-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-extrabold text-gray-700">Vista previa</h3><div className="flex gap-2"><button onClick={() => void descargar('pdf')} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold"><Download className="h-4 w-4" /> PDF</button><button onClick={() => void descargar('docx')} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold"><FileText className="h-4 w-4" /> Word</button><button onClick={abrirParaImprimir} className="flex items-center gap-2 rounded-lg bg-espoch-red px-4 py-2 text-xs font-bold text-white"><Printer className="h-4 w-4" /> Imprimir</button></div></div>
                <div className="mx-auto aspect-[1/1.414] w-full max-w-[650px] overflow-y-auto bg-white p-10 font-serif text-[12px] leading-relaxed shadow-xl lg:p-14">
                  <div className="mb-7 flex items-center justify-between border-b border-gray-300 pb-4"><div className="flex h-16 w-20 items-center justify-center">{values.headerImg ? <img src={values.headerImg} alt="Sello" className="max-h-full max-w-full object-contain" /> : <GraduationCap className="h-8 w-8 text-gray-300" />}</div><div className="flex-1 px-4 text-center font-sans"><strong>ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO</strong><div className="mt-1 text-[10px] text-gray-500">{values.facultad}</div></div><div className="w-20" /></div>
                  <p className="mb-8 text-right">{fechaFormateada}</p><div className="mb-7 leading-tight"><p>{values.tituloAutoridad} {values.nombreAutoridad}</p><p className="font-bold">{values.cargoDestinatario}</p><p>{values.enSuDespacho}</p></div><p className="mb-5">De mi consideración:</p><p className="mb-7 text-justify">{cuerpo}</p><p>{values.despedida}</p><div className="mt-10 text-center"><p className="mb-8">{values.cierre}</p><div className="mx-auto mb-2 w-56 border-b border-gray-800" /><p className="font-bold">{values.nombreFirma}</p><p>C.I: {values.ciFirma}</p></div>{values.footerImg && <div className="mt-10 border-t border-gray-300 pt-3"><img src={values.footerImg} alt="Pie institucional" className="mx-auto h-10 max-w-full object-contain" /></div>}
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
