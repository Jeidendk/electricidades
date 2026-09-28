import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, ArrowRight, Search, FileText, Folder, RotateCcw } from 'lucide-react';
import { PageHero } from '../../../components/ui/PageHero';
import { useFormatosStore } from '../../../store/formatosStore';
import { useSeriesFormatosStore, rutaHasta } from '../../../store/seriesFormatosStore';
import { procesosRepositorio } from '../data/repositorioElectricidad';
import { coincideConsulta, terminosConsulta } from '../../../lib/busquedaAsistente';

export function Asistente() {
  const { formatos, fetchFormatos, loading: cargandoDocumentos, error: errorDocumentos } = useFormatosStore();
  const { series, fetchSeries, loading: cargandoCarpetas, error: errorCarpetas } = useSeriesFormatosStore();
  const [texto, setTexto] = useState('');
  const [consulta, setConsulta] = useState('');
  const prefijo = useLocation().pathname.startsWith('/tecnico') ? '/tecnico' : '/admin';
  useEffect(() => { void fetchFormatos(); void fetchSeries(); }, [fetchFormatos, fetchSeries]);
  const terminos = useMemo(() => terminosConsulta(consulta), [consulta]);
  const carpetas = useMemo(() => series.filter(s => coincideConsulta(s.nombre, terminos)), [series, terminos]);
  const documentos = useMemo(() => formatos.filter(f => coincideConsulta(`${f.nombre} ${f.descripcion || ''}`, terminos)), [formatos, terminos]);
  const procesos = useMemo(() => procesosRepositorio.filter(p => coincideConsulta(`${p.titulo} ${p.descripcion}`, terminos)), [terminos]);
  const esHorario = coincideConsulta('horario horarios aula aulas laboratorio laboratorios disponibilidad espacios vacios vacias', terminos);
  const cargando = cargandoDocumentos || cargandoCarpetas;
  const error = errorDocumentos || errorCarpetas;
  const enlace = (id: string | null, q = '') => `${prefijo}/formatos?${new URLSearchParams({ ...(id ? { carpeta: id } : {}), ...(q ? { q } : {}) })}`;
  const consultar = (pregunta: string) => { setTexto(pregunta); setConsulta(pregunta.trim()); };

  return <div className="flex h-full flex-col bg-[#f4f7fb]">
    <PageHero icon={MessageSquare} title="Asistente" subtitle="Orientación académica y ayuda para encontrar documentos." />
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center justify-between gap-3 text-xs text-gray-500">
          <span>Asistente documental · Carrera de Electricidad</span>
          {consulta && <button onClick={() => { setTexto(''); setConsulta(''); }} className="flex items-center gap-1 font-semibold hover:text-gray-900"><RotateCcw className="h-3.5 w-3.5" /> Nueva consulta</button>}
        </div>
        <section className="rounded-[20px] border border-gray-200 bg-white p-5 shadow-sm md:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-espoch-red"><MessageSquare className="h-6 w-6" /></div>
          <h3 className="text-2xl font-extrabold text-gray-900">¿En qué necesitas ayuda?</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">Escribe el tema que buscas. Te indicaré documentos, categorías y orientaciones relacionadas.</p>
          <form onSubmit={e => { e.preventDefault(); consultar(texto); }} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1"><span className="sr-only">Tu consulta</span><Search className="absolute left-4 top-4 h-4 w-4 text-gray-400" /><input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Ej.: ¿dónde encuentro los formatos de titulación?" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-red-400 focus:bg-white" /></label>
            <button disabled={!texto.trim()} className="rounded-xl bg-[#0f172a] px-6 py-3 text-sm font-bold text-white disabled:opacity-40">Consultar <ArrowRight className="ml-1 inline h-4 w-4" /></button>
          </form>
          {!consulta && <div className="mt-4 flex flex-wrap gap-2">{['Justificar una inasistencia', 'Prácticas preprofesionales', 'Proceso de titulación', 'Aulas disponibles'].map(p => <button key={p} onClick={() => consultar(p)} className="rounded-full border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-red-200 hover:bg-red-50">{p}</button>)}</div>}
        </section>
        {consulta && <section aria-live="polite" className="mt-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Resultados para «{consulta}»</p>
          {cargando ? <p role="status" className="rounded-xl bg-white p-5 text-sm text-gray-500">Consultando el catálogo…</p> : error ? <p role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-700">No se pudo consultar el catálogo. <button className="font-bold underline" onClick={() => { void fetchFormatos(); void fetchSeries(); }}>Reintentar</button></p> : <>
            {esHorario && <Link to={`${prefijo}/horarios`} className="block rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900"><strong>Consulta la disponibilidad en Horarios</strong><p className="mt-1">En la pestaña Disponibilidad puedes elegir día, horas y tipo de espacio.</p><span className="mt-3 block font-bold">Abrir Horarios →</span></Link>}
            {procesos.slice(0, 3).map(p => {
              const carpeta = series.find(s => s.codigo === p.carpeta);
              return <article key={p.id} className="rounded-2xl border border-gray-200 bg-white p-5"><h4 className="text-sm font-bold text-gray-900">{p.titulo}</h4><p className="mt-2 text-sm leading-relaxed text-gray-600">{p.orientacion}</p><p className="mt-2 text-[11px] text-gray-400">Guía de ubicación documental. Confirma requisitos y vigencia con la carrera.</p>{carpeta && <Link to={enlace(carpeta.id, p.busqueda)} className="mt-3 inline-block text-xs font-bold text-espoch-red">Abrir categoría del proceso →</Link>}</article>;
            })}
            {(documentos.length > 0 || carpetas.length > 0) && <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Coincidencias en el repositorio</h4>
              <ul className="divide-y divide-gray-100">
                {documentos.slice(0, 8).map(d => <li key={d.id}><Link to={enlace(d.id_serie, d.nombre)} className="flex gap-3 py-3 hover:text-espoch-red"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><span className="min-w-0 text-sm font-semibold">{d.nombre}<span className="mt-1 block text-xs font-normal text-gray-500">{rutaHasta(series, d.id_serie).map(c => c.nombre).join(' / ') || 'Sin clasificar'}</span></span></Link></li>)}
                {carpetas.slice(0, 4).map(c => <li key={c.id}><Link to={enlace(c.id)} className="flex gap-3 py-3 text-sm hover:text-espoch-red"><Folder className="h-4 w-4 shrink-0 text-amber-500" /><span>{rutaHasta(series, c.id).map(s => s.nombre).join(' / ')}</span></Link></li>)}
              </ul>
              {(documentos.length > 8 || carpetas.length > 4) && <p className="mt-3 text-xs text-gray-500">Se muestran hasta 8 documentos y 4 carpetas. Añade un término más específico para afinar la consulta.</p>}
            </div>}
            {!documentos.length && !carpetas.length && !procesos.length && !esHorario && <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">No encontré coincidencias. Escribe el nombre del trámite, documento o tema, por ejemplo «sílabos» o «titulación».</div>}
          </>}
        </section>}
        <p className="px-2 py-5 text-xs leading-relaxed text-gray-500">La consulta local busca en los nombres del catálogo y las guías de orientación. No analiza el contenido de los archivos ni emite aprobaciones académicas.</p>
      </div>
    </div>
  </div>;
}
