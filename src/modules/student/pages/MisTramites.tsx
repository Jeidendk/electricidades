import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Clock, CheckCircle2, PencilLine, FileText, Download, History, AlertTriangle, Send,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useTramitesStore, type EventoTramite, type Tramite, type VersionTramite } from '../../../store/tramitesStore';
import {
  ETIQUETA_ACCION_TRAMITE, ETIQUETA_ESTADO_TRAMITE, esReenvio, puedeEditarloElEstudiante,
  type DocumentoPresentado,
} from '../../../lib/tramitesAcademicos';
import { generatePreviewDOCX, generatePreviewPDF, type DocumentParams } from '../../admin/utils/documentGenerator';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/ui/Pagination';
import { EmptyState } from '../../../components/ui/EmptyState';
import { avisoError } from '../../../lib/aviso';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';

/**
 * Los trámites académicos del estudiante: lo que presentó al coordinador y en qué va.
 *
 * Es otra cosa que "Mis reservas", que son los equipos. Se llaman distinto a propósito: dos
 * opciones tituladas "Mis solicitudes" obligaban a entrar en las dos para saber cuál era cuál.
 */

const POR_PAGINA = 8;

/** Reconstruye el documento tal como se presentó, sin depender de la plantilla actual. */
const parametrosDeVersion = (documento: DocumentoPresentado): DocumentParams => ({
  headerImgBase64: documento.encabezadoImagen || undefined,
  footerImgBase64: documento.pieImagen || undefined,
  tituloAutoridad: documento.destinatario?.titulo || '',
  nombreAutoridad: documento.destinatario?.nombre || '',
  cargo: documento.destinatario?.cargo || '',
  lugarFecha: documento.valores?.ciudadOficio
    ? `${documento.valores.ciudadOficio}, ${documento.valores.fechaOficio || ''}`
    : (documento.generadoEn || '').slice(0, 10),
  asunto: documento.contenido?.asunto,
  cuerpo: documento.contenido?.parrafos ?? [],
  adjuntos: documento.contenido?.adjuntos ?? [],
  studentName: documento.valores?.nombreFirma || '',
  studentCI: documento.valores?.ciFirma || '',
  firmaImagen: documento.firmaImagen,
});

const descargarBlob = (blob: Blob, nombre: string) => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
};

const fechaCorta = (valor?: string | null) => (valor ? valor.slice(0, 10).split('-').reverse().join('/') : '—');

const InsigniaEstado = ({ estado }: { estado: string }) => {
  const estilos: Record<string, string> = {
    borrador: 'bg-gray-100 border-gray-200 text-gray-600',
    cambios_solicitados: 'bg-amber-50 border-amber-100 text-amber-700',
    pendiente: 'bg-yellow-50 border-yellow-100 text-yellow-700',
    aprobado: 'bg-green-50 border-green-100 text-green-600',
    rechazado: 'bg-red-50 border-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${estilos[estado] || estilos.borrador}`}>
      {ETIQUETA_ESTADO_TRAMITE[estado as keyof typeof ETIQUETA_ESTADO_TRAMITE] ?? estado}
    </span>
  );
};

export const MisTramites = () => {
  const usuario = useAuthStore(estado => estado.user);
  const tramites = useTramitesStore(estado => estado.tramites);
  const cargando = useTramitesStore(estado => estado.loading);
  const error = useTramitesStore(estado => estado.error);
  const fetchTramites = useTramitesStore(estado => estado.fetchTramites);
  const cargarHistorial = useTramitesStore(estado => estado.cargarHistorial);

  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<Tramite | null>(null);
  const [historial, setHistorial] = useState<{ versiones: VersionTramite[]; eventos: EventoTramite[] } | null>(null);

  useEffect(() => {
    if (usuario?.id) void fetchTramites(usuario.id);
  }, [usuario?.id, fetchTramites]);

  useEffect(() => {
    if (!abierto) { setHistorial(null); return; }
    let vigente = true;
    void cargarHistorial(abierto.id)
      .then(datos => { if (vigente) setHistorial(datos); })
      .catch((err: any) => void avisoError('No se pudo cargar el historial', err?.message || ''));
    return () => { vigente = false; };
  }, [abierto, cargarHistorial]);

  const filtrados = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    if (!consulta) return tramites;
    return tramites.filter(tramite =>
      tramite.numero.toLowerCase().includes(consulta)
      || tramite.asunto.toLowerCase().includes(consulta)
      || (tramite.destinatario || '').toLowerCase().includes(consulta));
  }, [tramites, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  const contadores = useMemo(() => ({
    enRevision: tramites.filter(t => t.estado === 'pendiente').length,
    porCorregir: tramites.filter(t => t.estado === 'cambios_solicitados').length,
    aprobados: tramites.filter(t => t.estado === 'aprobado').length,
  }), [tramites]);

  const descargarVersion = async (version: VersionTramite, tipo: 'pdf' | 'docx') => {
    try {
      const parametros = parametrosDeVersion(version.documento);
      const blob = tipo === 'pdf' ? generatePreviewPDF(parametros) : await generatePreviewDOCX(parametros);
      const base = (version.documento.numero || 'Tramite').replace(/[^a-z0-9-]+/gi, '_');
      descargarBlob(blob, `${base}_v${version.version}.${tipo}`);
    } catch (err: any) {
      // El documento sigue guardado aunque falle la descarga: hay que decirlo así.
      void avisoError(
        'No se pudo generar el archivo',
        'El trámite sigue registrado. Vuelve a intentar la descarga en un momento.',
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden bg-[#f4f7fb]">
      <div className="relative flex w-full shrink-0 items-center overflow-hidden border-b border-gray-800 bg-espoch-hero px-6 py-5 shadow-sm lg:px-12">
        <div className="absolute inset-0 bg-cover bg-center opacity-[0.25]" style={{ backgroundImage: `url('${HERO_BG.tramites}')` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-espoch-hero via-espoch-hero/95 to-espoch-hero/80" />
        <div className="relative z-10 flex w-full flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-espoch-red text-white shadow-lg">
              <ClipboardList className="h-7 w-7" strokeWidth={2} />
            </div>
            <div>
              <h2 className="mb-1.5 text-[12px] font-extrabold leading-none tracking-tight text-white">Mis trámites</h2>
              <p className="text-[11px] font-medium text-gray-400">Oficios y solicitudes presentados al coordinador de carrera.</p>
            </div>
          </div>
          <div className="hidden items-center gap-6 rounded-xl border border-white/5 bg-espoch-herocard px-6 py-3 shadow-inner md:flex">
            {[
              { Icono: Clock, valor: contadores.enRevision, etiqueta: 'En revisión' },
              { Icono: PencilLine, valor: contadores.porCorregir, etiqueta: 'Por corregir' },
              { Icono: CheckCircle2, valor: contadores.aprobados, etiqueta: 'Aprobados' },
            ].map(({ Icono, valor, etiqueta }) => (
              <div key={etiqueta} className="flex items-center gap-3">
                <Icono className="h-6 w-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black leading-tight text-white">{valor}</span>
                  <span className="text-[10px] font-medium leading-none text-gray-400">{etiqueta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full flex-1 flex-col min-h-0 p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 shrink-0 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-[12px] font-extrabold text-red-800">No se pudo cargar tu historial</p>
            <p className="mt-0.5 text-[11px] text-red-700">{error}</p>
          </div>
        )}

        <div className="relative flex flex-1 flex-col min-h-0 overflow-hidden rounded-[24px] border border-gray-200/60 bg-white shadow-sm">
          <div className="absolute left-0 top-0 z-20 h-1.5 w-full bg-gradient-to-r from-espoch-yellow via-orange-500 to-espoch-red" />

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5 pt-7">
            <SearchInput
              value={busqueda}
              onChange={valor => { setBusqueda(valor); setPagina(1); }}
              placeholder="Buscar número, asunto o destinatario…"
              className="w-full sm:w-[300px]"
            />
            <Link
              to="/student/oficios"
              className="flex items-center gap-2 rounded-full bg-espoch-red px-5 py-2.5 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-espoch-darkred"
            >
              <FileText className="h-4 w-4" /> Nuevo trámite
            </Link>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            {visibles.length === 0 ? (
              <div className="flex h-full items-center justify-center p-10">
                <EmptyState
                  icon={ClipboardList}
                  title={cargando ? 'Cargando tus trámites…' : 'Todavía no has presentado ningún trámite'}
                  description={
                    error
                      ? 'La consulta falló: lo que ves puede estar incompleto.'
                      : 'Elige un modelo de oficio, complétalo y preséntalo desde "Modelos de oficio".'
                  }
                />
              </div>
            ) : (
              <table className="w-full min-w-[820px] text-left">
                <thead className="sticky top-0 z-10 bg-white text-[9px] font-extrabold uppercase tracking-widest text-gray-500">
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3">Número</th>
                    <th className="px-4 py-3">Asunto</th>
                    <th className="px-4 py-3">Destinatario</th>
                    <th className="px-4 py-3">Presentado</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map(tramite => (
                    <tr key={tramite.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/60">
                      <td className="px-5 py-4">
                        <button onClick={() => setAbierto(tramite)} className="text-[12px] font-extrabold text-espoch-red hover:underline">
                          {tramite.numero}
                        </button>
                        {esReenvio(tramite.version) && (
                          <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold text-indigo-600">
                            v{tramite.version}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-4 text-[12px] text-gray-700">{tramite.asunto}</td>
                      <td className="px-4 py-4 text-[11.5px] text-gray-600">{tramite.destinatario || 'Sin asignar'}</td>
                      <td className="px-4 py-4 text-[11px] text-gray-500">{fechaCorta(tramite.enviadaEn) }</td>
                      <td className="px-4 py-4">
                        <InsigniaEstado estado={tramite.estado} />
                        {tramite.observaciones && (
                          <p className="mt-1 max-w-[220px] text-[10.5px] text-gray-500">{tramite.observaciones}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {puedeEditarloElEstudiante(tramite.estado) && (
                            <Link
                              to={`/student/oficios?tramite=${tramite.id}`}
                              className="flex h-8 items-center gap-1 rounded-lg border border-amber-100 bg-amber-50 px-2.5 text-[10.5px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
                              title="Corregir y volver a presentar"
                            >
                              <PencilLine className="h-3.5 w-3.5" /> Corregir
                            </Link>
                          )}
                          <button
                            onClick={() => setAbierto(tramite)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50"
                            title="Ver historial y descargar"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            page={paginaSegura}
            totalPages={totalPaginas}
            onChange={setPagina}
            total={filtrados.length}
            perPage={POR_PAGINA}
            className="border-t border-gray-100 px-5 py-3"
          />
        </div>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[4px]" onClick={() => setAbierto(null)}>
          <div className="max-h-[85vh] w-full max-w-[620px] overflow-y-auto rounded-2xl bg-white shadow-[0_25px_60px_rgba(0,0,0,0.3)]" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Trámite académico</p>
                <h3 className="text-[18px] font-extrabold text-gray-900">{abierto.numero}</h3>
                <p className="mt-0.5 text-[12px] text-gray-600">{abierto.asunto}</p>
              </div>
              <InsigniaEstado estado={abierto.estado} />
            </div>

            <div className="flex flex-col gap-5 p-6">
              {abierto.observaciones && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> Observaciones del coordinador
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[12px] text-amber-900">{abierto.observaciones}</p>
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Versiones presentadas</p>
                {!historial ? (
                  <p className="text-[12px] text-gray-400">Cargando…</p>
                ) : historial.versiones.length === 0 ? (
                  <p className="text-[12px] text-gray-400">Todavía es un borrador: no se ha presentado ninguna versión.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {historial.versiones.map(version => (
                      <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-2.5">
                        <div>
                          <p className="text-[12px] font-bold text-gray-800">Versión {version.version}</p>
                          <p className="text-[10.5px] text-gray-500">Presentada el {fechaCorta(version.creadaEn)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => void descargarVersion(version, 'pdf')}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-gray-700 hover:bg-gray-50"
                          >
                            <Download className="h-3.5 w-3.5" /> PDF
                          </button>
                          <button
                            onClick={() => void descargarVersion(version, 'docx')}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-gray-700 hover:bg-gray-50"
                          >
                            <FileText className="h-3.5 w-3.5" /> Word
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Historial</p>
                {!historial ? (
                  <p className="text-[12px] text-gray-400">Cargando…</p>
                ) : (
                  <ol className="flex flex-col gap-2 border-l border-gray-200 pl-4">
                    {historial.eventos.map(evento => (
                      <li key={evento.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-gray-300" />
                        <p className="text-[12px] font-semibold text-gray-800">
                          {ETIQUETA_ACCION_TRAMITE[evento.accion] ?? evento.accion}
                          {evento.actor ? ` · ${evento.actor}` : ''}
                        </p>
                        <p className="text-[10.5px] text-gray-500">{fechaCorta(evento.creadoEn)}</p>
                        {evento.observaciones && (
                          <p className="mt-0.5 text-[11.5px] text-gray-600">{evento.observaciones}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {puedeEditarloElEstudiante(abierto.estado) && (
                <Link
                  to={`/student/oficios?tramite=${abierto.id}`}
                  className="flex items-center justify-center gap-2 rounded-full bg-espoch-red px-5 py-2.5 text-[12px] font-bold text-white hover:bg-espoch-darkred"
                >
                  <Send className="h-4 w-4" /> Corregir y volver a presentar
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisTramites;
