/**
 * Asistente institucional — fase 1.
 *
 * La conversación está construida pero NO hay motor: `servicioAsistente` responde que no está
 * configurado y la pantalla lo dice. No se simulan respuestas, porque una respuesta inventada
 * sobre un trámite académico es peor que ninguna: el estudiante la seguiría.
 *
 * Lo que sí funciona hoy es "Buscar documentos", que es búsqueda por palabras sobre el
 * repositorio real, separada de la conversación para que nadie la confunda con IA.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Check, Copy, Database, FileText, Folder, MessageSquare,
  PanelLeft, Plus, Search, Send, Trash2, X,
} from 'lucide-react';

import { PageHero } from '../../../components/ui/PageHero';
import { useFormatosStore } from '../../../store/formatosStore';
import { useSeriesFormatosStore, rutaHasta } from '../../../store/seriesFormatosStore';
import { useAuthStore } from '../../../store/authStore';
import { useAsistenteStore } from '../../../store/asistenteStore';
import { procesosRepositorio } from '../data/repositorioElectricidad';
import { coincideConsulta, terminosConsulta } from '../../../lib/busquedaAsistente';
import { servicioAsistente, sugerenciasPorRol } from '../../../lib/asistente/servicioAsistente';
import { clasificarDocumento, contarPorEstado, ETIQUETA_ESTADO } from '../../../lib/asistente/baseConocimiento';
import type { ContextoUsuario, EstadoMotor } from '../../../lib/asistente/tipos';

type Pestana = 'conversacion' | 'documentos' | 'conocimiento';

/** Colores de la insignia de estado. `indexado` es el único verde, y hoy nadie lo lleva. */
const COLOR_ESTADO: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  procesando: 'bg-blue-50 text-blue-600',
  indexado: 'bg-emerald-50 text-emerald-600',
  'requiere-ocr': 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-espoch-red',
  excluido: 'bg-gray-100 text-gray-400',
  'sin-acceso': 'bg-amber-50 text-amber-700',
};

export function Asistente() {
  const { formatos, fetchFormatos, loading: cargandoDocumentos, error: errorDocumentos } = useFormatosStore();
  const { series, fetchSeries, loading: cargandoCarpetas, error: errorCarpetas } = useSeriesFormatosStore();
  const usuario = useAuthStore(estado => estado.user);
  const {
    conversaciones, activaId, consultando,
    nuevaConversacion, abrirConversacion, eliminarConversacion,
    registrarPregunta, registrarRespuesta, setConsultando,
  } = useAsistenteStore();

  const prefijo = useLocation().pathname.startsWith('/tecnico') ? '/tecnico' : '/admin';
  const esStaff = usuario?.role === 'admin' || usuario?.role === 'tecnico';

  const [pestana, setPestana] = useState<Pestana>('conversacion');
  const [texto, setTexto] = useState('');
  const [consulta, setConsulta] = useState('');
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [motor, setMotor] = useState<EstadoMotor | null>(null);
  /** Documentos que el administrador dejó fuera del asistente. En memoria hasta que exista el motor. */
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const cancelacion = useRef<AbortController | null>(null);

  useEffect(() => { void fetchFormatos(); void fetchSeries(); }, [fetchFormatos, fetchSeries]);

  // El estado del motor se PREGUNTA al servicio; no se asume ni se pinta un punto verde fijo.
  useEffect(() => { void servicioAsistente.estadoMotor().then(setMotor); }, []);

  const contexto: ContextoUsuario = useMemo(() => ({
    rol: (usuario?.role as ContextoUsuario['rol']) ?? 'student',
    carreraId: usuario?.carreraId,
    pao: usuario?.pao,
    paralelo: usuario?.paralelo,
  }), [usuario]);

  const conversacion = conversaciones.find(c => c.id === activaId) ?? null;
  const sugerencias = useMemo(() => sugerenciasPorRol(contexto.rol), [contexto.rol]);

  const preguntar = async (pregunta: string) => {
    const limpia = pregunta.trim();
    if (!limpia || consultando) return;
    const conversacionId = registrarPregunta(limpia);
    setTexto('');
    setConsultando(true);
    cancelacion.current = new AbortController();
    try {
      const respuesta = await servicioAsistente.preguntar(limpia, contexto, cancelacion.current.signal);
      registrarRespuesta(conversacionId, respuesta);
    } catch (error: any) {
      registrarRespuesta(conversacionId, {
        texto: error?.name === 'AbortError'
          ? 'Consulta cancelada.'
          : 'No se pudo completar la consulta. Inténtalo de nuevo.',
        origen: 'error',
        documentos: [],
        datos: [],
      });
    } finally {
      setConsultando(false);
      cancelacion.current = null;
    }
  };

  const copiar = async (id: string, contenido: string) => {
    await navigator.clipboard.writeText(contenido);
    setCopiado(id);
    window.setTimeout(() => setCopiado(actual => (actual === id ? null : actual)), 1800);
  };

  // ── Buscar documentos (funciona hoy: es búsqueda por palabras, no IA) ──────────────────
  const terminos = useMemo(() => terminosConsulta(consulta), [consulta]);
  const carpetasHalladas = useMemo(() => series.filter(s => coincideConsulta(s.nombre, terminos)), [series, terminos]);
  const documentosHallados = useMemo(
    () => formatos.filter((f: any) => coincideConsulta(`${f.nombre} ${f.descripcion || ''}`, terminos)),
    [formatos, terminos],
  );
  const procesosHallados = useMemo(
    () => procesosRepositorio.filter(p => coincideConsulta(`${p.titulo} ${p.descripcion}`, terminos)),
    [terminos],
  );
  const enlaceRepositorio = (id: string | null, q = '') =>
    `${prefijo}/formatos?${new URLSearchParams({ ...(id ? { carpeta: id } : {}), ...(q ? { q } : {}) })}`;

  // ── Base de conocimiento ──────────────────────────────────────────────────────────────
  const documentosConocimiento = useMemo(
    () => (formatos as any[]).map(fila => clasificarDocumento(
      fila,
      excluidos,
      rutaHasta(series, fila.id_serie).map(s => s.nombre).join(' / ') || 'Sin clasificar',
    )),
    [formatos, series, excluidos],
  );
  const conteoEstados = useMemo(() => contarPorEstado(documentosConocimiento), [documentosConocimiento]);

  const alternarExclusion = (id: string) => setExcluidos(actuales => {
    const siguientes = new Set(actuales);
    if (siguientes.has(id)) siguientes.delete(id); else siguientes.add(id);
    return siguientes;
  });

  const cargando = cargandoDocumentos || cargandoCarpetas;
  const errorDatos = errorDocumentos || errorCarpetas;

  const PESTANAS: { id: Pestana; etiqueta: string; Icono: typeof MessageSquare }[] = [
    { id: 'conversacion', etiqueta: 'Asistente', Icono: MessageSquare },
    { id: 'documentos', etiqueta: 'Buscar documentos', Icono: Search },
    ...(esStaff ? [{ id: 'conocimiento' as Pestana, etiqueta: 'Base de conocimiento', Icono: Database }] : []),
  ];

  return (
    <div className="flex h-full flex-col bg-[#f4f7fb]">
      <PageHero icon={MessageSquare} title="Asistente" subtitle="Orientación sobre procesos, documentos y datos del sistema." />

      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {PESTANAS.map(({ id, etiqueta, Icono }) => (
            <button
              key={id}
              onClick={() => setPestana(id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-bold transition-colors ${
                pestana === id ? 'bg-[#0f172a] text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icono className="h-3.5 w-3.5" /> {etiqueta}
            </button>
          ))}
        </div>

        {/* El estado del motor se muestra tal como lo reporta el servicio. */}
        {motor && !motor.configurado && pestana !== 'documentos' && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-[12px] font-extrabold text-amber-800">Motor local pendiente de configuración</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">{motor.detalle}</p>
            </div>
          </div>
        )}

        {pestana === 'conversacion' && (
          <div className="relative flex min-h-0 flex-1 gap-4">
            {/* Historial plegable: se consulta a ratos, así que se superpone en vez de fijarse. */}
            {historialAbierto && (
              <>
                <button aria-label="Cerrar historial" onClick={() => setHistorialAbierto(false)} className="absolute inset-0 z-20 cursor-default rounded-2xl bg-black/5" />
                <aside className="absolute inset-y-0 left-0 z-30 flex w-[260px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                  <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h3 className="text-[13px] font-extrabold text-gray-800">Conversaciones</h3>
                    <button onClick={() => setHistorialAbierto(false)} aria-label="Cerrar" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </header>
                  <div className="flex-1 overflow-y-auto p-2">
                    {conversaciones.length === 0 && (
                      <p className="px-2 py-6 text-center text-[11px] text-gray-400">Todavía no hay conversaciones en esta sesión.</p>
                    )}
                    {conversaciones.map(c => (
                      <div key={c.id} className={`group flex items-center gap-1 rounded-xl px-2 ${c.id === activaId ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                        <button onClick={() => { abrirConversacion(c.id); setHistorialAbierto(false); }} className="min-w-0 flex-1 py-2.5 text-left">
                          <span className={`block truncate text-[12px] font-bold ${c.id === activaId ? 'text-espoch-red' : 'text-gray-700'}`}>{c.titulo}</span>
                          <span className="block text-[10px] text-gray-400">{new Date(c.creadaEn).toLocaleString('es-EC')}</span>
                        </button>
                        <button onClick={() => eliminarConversacion(c.id)} aria-label={`Eliminar ${c.titulo}`} className="rounded-lg p-1 text-gray-300 opacity-0 transition-opacity hover:text-espoch-red group-hover:opacity-100">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <footer className="border-t border-gray-100 p-2 text-[10px] leading-relaxed text-gray-400">
                    Las conversaciones viven solo durante esta sesión: no se guardan en el servidor.
                  </footer>
                </aside>
              </>
            )}

            <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                <button
                  onClick={() => setHistorialAbierto(abierto => !abierto)}
                  aria-expanded={historialAbierto}
                  title="Conversaciones"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
                <h2 className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-gray-800">
                  {conversacion?.titulo ?? 'Nueva consulta'}
                </h2>
                <button
                  onClick={() => { nuevaConversacion(); setTexto(''); }}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Nueva
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-5">
                {!conversacion ? (
                  <div className="mx-auto max-w-xl py-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-espoch-red">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <h3 className="text-[15px] font-extrabold text-gray-900">¿Sobre qué necesitas orientación?</h3>
                    <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-gray-500">
                      Podrás preguntar por trámites y documentos de la carrera, y por datos de tu propio
                      expediente: horario, aulas y solicitudes. El asistente no realiza trámites ni aprueba
                      solicitudes.
                    </p>
                    <div className="mt-5 grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
                      {sugerencias.map(sugerencia => (
                        <button
                          key={sugerencia}
                          onClick={() => setTexto(sugerencia)}
                          className="flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                        >
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" /> {sugerencia}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-3xl flex-col gap-4">
                    {conversacion.mensajes.map(mensaje => (
                      <article
                        key={mensaje.id}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          mensaje.autor === 'usuario'
                            ? 'self-end bg-[#0f172a] text-white'
                            : 'self-start border border-gray-200 bg-gray-50 text-gray-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{mensaje.texto}</p>

                        {mensaje.autor === 'asistente' && (
                          <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                              {mensaje.respuesta?.origen === 'documentos' && 'Basado en documentos'}
                              {mensaje.respuesta?.origen === 'sistema' && 'Datos del sistema'}
                              {mensaje.respuesta?.origen === 'sin-evidencia' && 'Sin evidencia suficiente'}
                              {mensaje.respuesta?.origen === 'motor-no-configurado' && 'Motor no configurado'}
                              {mensaje.respuesta?.origen === 'error' && 'Error'}
                            </span>
                            <button
                              onClick={() => void copiar(mensaje.id, mensaje.texto)}
                              className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-gray-800"
                            >
                              {copiado === mensaje.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copiado === mensaje.id ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                    {consultando && (
                      <p className="self-start text-[12px] font-semibold text-gray-400">Consultando…</p>
                    )}
                  </div>
                )}
              </div>

              <footer className="border-t border-gray-100 p-4">
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <textarea
                    value={texto}
                    onChange={evento => setTexto(evento.target.value)}
                    onKeyDown={evento => {
                      // Enter envía; Shift+Enter escribe otra línea, como en cualquier chat.
                      if (evento.key === 'Enter' && !evento.shiftKey) {
                        evento.preventDefault();
                        void preguntar(texto);
                      }
                    }}
                    rows={2}
                    placeholder="Escribe tu consulta…"
                    aria-label="Consulta"
                    className="min-h-[52px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] outline-none focus:border-blue-400"
                  />
                  {consultando ? (
                    <button
                      onClick={() => cancelacion.current?.abort()}
                      className="flex h-[52px] items-center gap-2 rounded-xl border border-gray-200 px-4 text-[12px] font-bold text-gray-600 hover:bg-gray-50"
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </button>
                  ) : (
                    <button
                      onClick={() => void preguntar(texto)}
                      disabled={!texto.trim()}
                      className="flex h-[52px] items-center gap-2 rounded-xl bg-espoch-red px-5 text-[12px] font-bold text-white transition-colors hover:bg-[#8b0000] disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" /> Enviar
                    </button>
                  )}
                </div>
              </footer>
            </section>
          </div>
        )}

        {pestana === 'documentos' && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                value={texto}
                onChange={evento => setTexto(evento.target.value)}
                onKeyDown={evento => { if (evento.key === 'Enter') setConsulta(texto.trim()); }}
                placeholder="Busca un documento o un proceso…"
                aria-label="Buscar documentos"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
              />
              <button onClick={() => setConsulta(texto.trim())} className="rounded-lg bg-[#0f172a] px-4 py-2 text-[11px] font-bold text-white hover:bg-black">
                Buscar
              </button>
            </div>

            {cargando && <p className="py-10 text-center text-[12px] text-gray-400">Cargando el repositorio…</p>}
            {errorDatos && <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-[12px] font-semibold text-red-700">No se pudo consultar el repositorio.</p>}

            {!cargando && consulta && (
              <div className="flex flex-col gap-5">
                {procesosHallados.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-gray-500">Procesos</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {procesosHallados.map(proceso => (
                        <article key={proceso.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                          <h4 className="text-[13px] font-extrabold text-gray-900">{proceso.titulo}</h4>
                          <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{proceso.orientacion}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {documentosHallados.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-gray-500">Documentos</h3>
                    <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                      {documentosHallados.slice(0, 12).map((documento: any) => (
                        <li key={documento.id}>
                          <Link to={enlaceRepositorio(documento.id_serie, documento.nombre)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                            <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-bold text-gray-800">{documento.nombre}</span>
                              <span className="block truncate text-[11px] text-gray-500">
                                {rutaHasta(series, documento.id_serie).map(s => s.nombre).join(' / ') || 'Sin clasificar'}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {carpetasHalladas.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-gray-500">Categorías</h3>
                    <div className="flex flex-wrap gap-2">
                      {carpetasHalladas.slice(0, 10).map(carpeta => (
                        <Link key={carpeta.id} to={enlaceRepositorio(carpeta.id)} className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-50">
                          <Folder className="h-3.5 w-3.5 text-espoch-yellow" /> {carpeta.nombre}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {procesosHallados.length === 0 && documentosHallados.length === 0 && carpetasHalladas.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-[12px] text-gray-500">
                    No encontramos nada con esas palabras en el repositorio.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {pestana === 'conocimiento' && esStaff && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-[12px] leading-relaxed text-gray-600">
                Estos son los documentos del repositorio que el asistente podría citar. La indexación
                está deshabilitada porque todavía no hay motor de embeddings: ningún documento figura
                como indexado, y no lo hará hasta que exista extracción y vectores reales.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(conteoEstados)
                  .filter(([, cantidad]) => cantidad > 0)
                  .map(([estado, cantidad]) => (
                    <span key={estado} className={`rounded-full px-3 py-1 text-[11px] font-bold ${COLOR_ESTADO[estado]}`}>
                      {ETIQUETA_ESTADO[estado as keyof typeof ETIQUETA_ESTADO]}: {cantidad}
                    </span>
                  ))}
              </div>
            </div>

            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {documentosConocimiento.map(documento => (
                <li key={documento.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-gray-800">{documento.titulo}</span>
                    <span className="block truncate text-[11px] text-gray-500">{documento.categoria}</span>
                    {documento.detalle && <span className="mt-0.5 block text-[10px] text-gray-400">{documento.detalle}</span>}
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${COLOR_ESTADO[documento.estado]}`}>
                    {ETIQUETA_ESTADO[documento.estado]}
                  </span>
                  <button
                    onClick={() => alternarExclusion(documento.id)}
                    className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
                  >
                    {documento.estado === 'excluido' ? 'Incluir' : 'Excluir'}
                  </button>
                  <button
                    disabled
                    title="Se habilitará cuando el motor de embeddings esté configurado en el servidor."
                    className="shrink-0 cursor-not-allowed rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-400 opacity-60"
                  >
                    Indexar
                  </button>
                </li>
              ))}
              {documentosConocimiento.length === 0 && (
                <li className="px-4 py-10 text-center text-[12px] text-gray-400">El repositorio todavía no tiene documentos.</li>
              )}
            </ul>

            <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
              Excluir un documento solo lo deja fuera del asistente: sigue disponible en el repositorio.
              En esta fase la exclusión vive en memoria, hasta decidir dónde se guarda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
