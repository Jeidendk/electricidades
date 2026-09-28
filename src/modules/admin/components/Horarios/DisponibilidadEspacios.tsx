import { useEffect, useMemo, useState } from 'react';
import {
  Building2, DoorOpen, RefreshCcw, Search, RotateCcw, CalendarDays, Clock,
  LayoutGrid, Armchair, FlaskConical, ChevronDown, ArrowUpDown, ArrowLeft,
} from 'lucide-react';
import { useClasesStore } from '../../../../store/clasesStore';
import { useEspaciosStore } from '../../../../store/espaciosStore';
import { useEdificiosStore } from '../../../../store/edificiosStore';
import { calcularDisponibilidad, minutosHora, mostrarHora, type Tramo } from '../../../../lib/disponibilidadEspacios';
import { normalizarTexto } from '../../../../lib/texto';
import { AcentoTarjeta } from '../../../../components/ui/AcentoTarjeta';
import { Pagination } from '../../../../components/ui/Pagination';
import { dias, horasSeleccionables } from './horariosData';

const primeraHora = horasSeleccionables[0];
const ultimaHora = horasSeleccionables[horasSeleccionables.length - 1];
const jornada = { inicio: minutosHora(primeraHora), fin: minutosHora(ultimaHora) };
const minutosJornada = jornada.fin - jornada.inicio;

/** Mismo campo que los formularios del resto del admin: fondo tenue y foco azul. */
const control = 'mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-[13px] font-medium text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white';
/** Igual que `control`, pero con sitio para el icono que va dentro del campo. */
const controlConIcono = 'w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-[13px] font-medium text-gray-900 shadow-sm outline-none transition-all focus:border-blue-500';
const etiqueta = 'text-[10px] font-extrabold uppercase tracking-widest text-gray-500';

/** Chips de tipo de espacio: el mismo lenguaje que los filtros de Formatos y Trámites. */
const TIPOS = [
  { key: '', label: 'Todos', Icono: LayoutGrid },
  { key: 'aula', label: 'Aulas', Icono: Armchair },
  { key: 'laboratorio', label: 'Laboratorios', Icono: FlaskConical },
];

/** "3 h", "1 h 30 min", "45 min". Sin decimales: nadie lee "2.75 h". */
const duracion = (minutos: number): string => {
  const horas = Math.floor(minutos / 60);
  const resto = Math.round(minutos % 60);
  if (!horas) return `${resto} min`;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
};

/** Horas en punto de la jornada, para la regla y las divisiones de la barra. */
const horasEnPunto = Array.from(
  { length: Math.floor(minutosJornada / 60) + 1 },
  (_, i) => jornada.inicio + i * 60,
);

const porcentaje = (minutos: number) => ((minutos - jornada.inicio) / minutosJornada) * 100;

/** Regla de horas. Va una sola vez en la cabecera: repetirla en cada fila sería ruido. */
const ReglaDeHoras = () => (
  <div className="relative h-4 w-full">
    {horasEnPunto.map((minuto, i) => (
      i % 2 === 0 && (
        <span
          key={minuto}
          className="absolute top-0 -translate-x-1/2 text-[9px] font-bold tabular-nums text-gray-400"
          style={{ left: `${porcentaje(minuto)}%` }}
        >
          {String(Math.floor(minuto / 60)).padStart(2, '0')}
        </span>
      )
    ))}
  </div>
);

/**
 * Barra del día: verde lo libre, rojo lo que tiene clase.
 *
 * Las divisiones horarias son lo que la hace legible: sin ellas se ve QUE hay un hueco, pero
 * no A QUÉ HORA, que es justo lo que se viene a averiguar. Con la regla de la cabecera encima,
 * cada segmento se sitúa en el reloj sin tener que leer ningún número.
 */
const BarraDelDia = ({ ocupados }: { ocupados: Tramo[] }) => (
  <div className="relative h-7 w-full overflow-hidden rounded-md bg-green-200/70 ring-1 ring-inset ring-green-300/60">
    {ocupados.map(tramo => (
      <div
        key={tramo.inicio}
        className="absolute inset-y-0 bg-espoch-red/70"
        style={{
          left: `${porcentaje(tramo.inicio)}%`,
          width: `${((tramo.fin - tramo.inicio) / minutosJornada) * 100}%`,
        }}
        title={`Con clase de ${mostrarHora(tramo.inicio)} a ${mostrarHora(tramo.fin)}`}
      />
    ))}
    {horasEnPunto.slice(1, -1).map(minuto => (
      <span
        key={minuto}
        className="absolute inset-y-0 w-px bg-white/60"
        style={{ left: `${porcentaje(minuto)}%` }}
      />
    ))}
  </div>
);

export function DisponibilidadEspacios({ onVerHorario, onVolver }: {
  onVerHorario: (edificioId: string, espacioId: string) => void;
  /** Vuelve al horario de distribución. */
  onVolver?: () => void;
}) {
  const { clases, loading: cargandoClases, error: errorClases, fetchClases } = useClasesStore();
  const { items: espacios, loading: cargandoEspacios, error: errorEspacios, fetchEspacios } = useEspaciosStore();
  const { items: edificios, loading: cargandoEdificios, error: errorEdificios, fetchEdificios } = useEdificiosStore();
  const [iniciando, setIniciando] = useState(true);
  const [dia, setDia] = useState(() => dias[new Date().getDay() - 1] || dias[0]);
  /**
   * La franja es OPCIONAL y arranca apagada: de entrada se ven todas las horas libres de cada
   * espacio. Obligar a elegir un rango antes de mirar convierte la consulta en una adivinanza.
   */
  const [usarFranja, setUsarFranja] = useState(false);
  const [inicio, setInicio] = useState(primeraHora);
  const [fin, setFin] = useState(horasSeleccionables[1]);
  const [edificioId, setEdificioId] = useState('');
  const [tipo, setTipo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  /** Vacío = el orden por defecto (primero lo libre, luego lo que más horas tiene). */
  const [ordenCol, setOrdenCol] = useState<'' | 'espacio' | 'libres'>('');
  const [ordenAsc, setOrdenAsc] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(5);

  useEffect(() => {
    let vigente = true;
    void Promise.all([fetchClases(), fetchEspacios({ forzar: true }), fetchEdificios({ forzar: true })])
      .finally(() => { if (vigente) setIniciando(false); });
    return () => { vigente = false; };
  }, [fetchClases, fetchEspacios, fetchEdificios]);

  const cargando = iniciando || cargandoClases || cargandoEspacios || cargandoEdificios;
  const error = errorClases || errorEspacios || errorEdificios;
  const consulta = usarFranja ? { inicio: minutosHora(inicio), fin: minutosHora(fin) } : undefined;
  const valido = !consulta || (Number.isFinite(consulta.inicio) && Number.isFinite(consulta.fin) &&
    consulta.inicio < consulta.fin && consulta.inicio >= jornada.inicio && consulta.fin <= jornada.fin);

  const resultados = useMemo(() => {
    const porEdificio = new Map(edificios.map(e => [e.id, e]));
    const rango = usarFranja ? { inicio: minutosHora(inicio), fin: minutosHora(fin) } : undefined;
    return espacios.filter(e => {
      const tipoNormal = normalizarTexto(e.tipo);
      const esLaboratorio = tipoNormal.includes('laboratorio');
      const esAula = tipoNormal === 'academica' || tipoNormal === 'aula';
      return (esLaboratorio || esAula) && (!edificioId || e.id_edificio === edificioId) &&
        (!tipo || (tipo === 'laboratorio' ? esLaboratorio : esAula)) &&
        normalizarTexto(`${e.nombre} ${porEdificio.get(e.id_edificio)?.nombre || ''}`).includes(normalizarTexto(busqueda));
    }).map(espacio => {
      const edificio = porEdificio.get(espacio.id_edificio);
      const disponibilidad = calcularDisponibilidad(espacio, edificio?.estado, clases, dia, jornada, rango);
      const minutosLibres = disponibilidad.libres.reduce((suma, t) => suma + (t.fin - t.inicio), 0);
      return { espacio, edificio, minutosLibres, ...disponibilidad };
    }).sort((a, b) => Number(b.libre) - Number(a.libre) || b.minutosLibres - a.minutosLibres ||
      `${a.edificio?.nombre} ${a.espacio.nombre}`.localeCompare(`${b.edificio?.nombre} ${b.espacio.nombre}`, 'es', { numeric: true }));
  }, [espacios, edificios, clases, dia, inicio, fin, edificioId, tipo, busqueda, usarFranja]);

  /**
   * Un espacio que no sirve para lo que se pregunta no se lista. Antes esto era una casilla
   * que había que marcar, es decir: por defecto se enseñaba ruido.
   *
   * Con filtro de horas, "no sirve" es estar ocupado a esa hora; sin él, estar ocupado toda
   * la jornada. La pregunta cambia, y el criterio de descarte tiene que cambiar con ella.
   */
  const visibles = useMemo(() => {
    const lista = resultados.filter(r => (usarFranja ? r.libre : r.minutosLibres > 0));
    if (!ordenCol) return lista;
    const signo = ordenAsc ? 1 : -1;
    return [...lista].sort((a, b) => signo * (ordenCol === 'libres'
      ? a.minutosLibres - b.minutosLibres
      : `${a.espacio.nombre}`.localeCompare(b.espacio.nombre, 'es', { numeric: true })));
  }, [resultados, usarFranja, ordenCol, ordenAsc]);
  const ocultos = resultados.length - visibles.length;

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  // Al filtrar, la página en la que estabas puede dejar de existir: sin esto la tabla
  // se queda en blanco y parece que no hay resultados.
  const paginaActual = Math.min(pagina, totalPaginas);
  const enPagina = visibles.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  const recargar = () => {
    void Promise.all([fetchClases(), fetchEspacios({ forzar: true }), fetchEdificios({ forzar: true })]);
  };

  const ordenarPor = (columna: 'espacio' | 'libres') => {
    if (ordenCol === columna) setOrdenAsc(!ordenAsc);
    else { setOrdenCol(columna); setOrdenAsc(columna === 'espacio'); }
  };

  const limpiarFiltros = () => {
    setEdificioId('');
    setTipo('');
    setBusqueda('');
    setUsarFranja(false);
    setOrdenCol('');
  };

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[20px] border border-gray-200/60 bg-white p-4 shadow-sm md:p-6">
      <AcentoTarjeta />

      {/* Volver a la izquierda, título centrado y recargar a la derecha: los dos laterales
          ocupan lo mismo, así el título queda centrado de verdad y no "casi". */}
      <div className="mb-5 flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex flex-1 justify-start">
          {onVolver && (
            <button
              onClick={onVolver}
              className="flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Horario de distribución
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-espoch-red text-white shadow-lg">
            <DoorOpen className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-[16px] font-extrabold text-gray-900">Disponibilidad de espacios</h3>
            <p className="mt-0.5 text-[11px] font-medium text-gray-500">Qué aulas y laboratorios están libres, según el horario registrado.</p>
          </div>
        </div>

        <div className="flex flex-1 justify-end">
          <button
            disabled={cargando}
            onClick={recargar}
            className="flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${cargando ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>
      </div>

      {/* Una sola barra con todos los filtros: antes eran dos bloques apilados. */}
      <div className="shrink-0 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="relative w-full self-end sm:w-auto sm:min-w-[200px] sm:flex-1">
            <span className="sr-only">Buscar espacio o edificio</span>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-[13px] font-medium text-gray-700 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-blue-500"
              placeholder="Buscar espacio o edificio..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </label>

          <label className={`${etiqueta} w-full shrink-0 sm:w-[150px]`}>Día
            <span className="relative mt-1.5 block">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select className={controlConIcono} value={dia} onChange={e => setDia(e.target.value)}>
                {dias.map(d => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </span>
          </label>

          <label className={`${etiqueta} w-full sm:w-auto sm:min-w-[230px] sm:flex-1`}>Edificio
            <span className="relative mt-1.5 block">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select className={controlConIcono} value={edificioId} onChange={e => setEdificioId(e.target.value)}>
                <option value="">Todos los edificios</option>
                {[...edificios].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </span>
          </label>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5 self-end">
            {TIPOS.map(({ key, label, Icono }) => {
              const activo = tipo === key;
              return (
                <button
                  key={key || 'todos'}
                  onClick={() => setTipo(key)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11.5px] font-bold transition-all ${activo ? 'border-transparent bg-[#1e2733] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                >
                  <Icono className="h-3.5 w-3.5" /> {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={limpiarFiltros}
            className="flex shrink-0 items-center gap-1.5 self-end py-2.5 text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-700 sm:ml-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Limpiar filtros
          </button>

          <label className="flex shrink-0 cursor-pointer items-center gap-2 self-end whitespace-nowrap py-2.5 text-[12px] font-bold text-gray-700">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 cursor-pointer rounded accent-espoch-red"
              checked={usarFranja}
              onChange={e => setUsarFranja(e.target.checked)}
            />
            Filtrar por horas
          </label>

          {usarFranja && (
            <>
              <label className={`${etiqueta} w-full sm:w-[130px]`}>Desde
                <input type="time" min={primeraHora} max={ultimaHora} className={control} value={inicio} onChange={e => setInicio(e.target.value)} />
              </label>
              <label className={`${etiqueta} w-full sm:w-[130px]`}>Hasta
                <input type="time" min={primeraHora} max={ultimaHora} className={control} value={fin} onChange={e => setFin(e.target.value)} />
              </label>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
      {cargando ? <p role="status" className="py-14 text-center text-[13px] font-medium text-gray-500">Consultando clases y espacios...</p>
        : error ? <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-5 text-[13px] font-medium text-espoch-red">No se pudo comprobar la disponibilidad. Pulsa Actualizar para volver a intentarlo.</p>
        : !valido ? <p role="alert" className="rounded-xl border border-amber-100 bg-amber-50 p-5 text-[13px] font-medium text-amber-800">Elige una hora final posterior al inicio, entre {primeraHora} y {ultimaHora}.</p>
        : <>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-100 custom-scrollbar">
            <table className="w-full min-w-[780px] text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[9px] font-extrabold uppercase tracking-widest text-gray-500">
                  <th className="p-4">
                    <button onClick={() => ordenarPor('espacio')} className="flex items-center gap-1.5 uppercase transition-colors hover:text-gray-700">
                      Espacio <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="p-4 pb-2 w-[34%]">
                    <div className="mb-1">El {dia.toLowerCase()}</div>
                    <ReglaDeHoras />
                  </th>
                  <th className="p-4">
                    <button onClick={() => ordenarPor('libres')} className="flex items-center gap-1.5 uppercase transition-colors hover:text-gray-700">
                      Horas libres <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="p-4"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {enPagina.map(r => <tr key={r.espacio.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="text-[13px] font-bold text-gray-900">{r.espacio.nombre}</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-gray-500"><Building2 className="h-3 w-3" /> {r.edificio?.nombre || 'Sin edificio'}</div>
                    <div className="mt-0.5 text-[10px] font-medium text-gray-400">{r.espacio.tipo} · Piso {r.espacio.piso} · {r.espacio.capacidad} personas</div>
                  </td>

                  <td className="p-4">
                    {r.libres.length || r.ocupados.length ? (
                      <BarraDelDia ocupados={r.ocupados} />
                    ) : (
                      <span className="flex w-max items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[9px] font-extrabold text-gray-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> {r.motivo}
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="mb-1.5 text-[11px] font-extrabold text-gray-700">{duracion(r.minutosLibres)}</div>
                    <div className="flex flex-wrap gap-1.5">
                    {r.libres.map(t => <button key={t.inicio} title="Buscar qué más hay libre en esta franja"
                      onClick={() => { setUsarFranja(true); setInicio(mostrarHora(t.inicio)); setFin(mostrarHora(t.fin)); }}
                      className="flex items-center gap-1 rounded-lg border border-green-200/70 bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700 transition-colors hover:bg-green-100">
                      <Clock className="h-2.5 w-2.5" /> {mostrarHora(t.inicio)}–{mostrarHora(t.fin)}
                    </button>)}
                    {r.libres.length === 0 && <span className="text-[11px] font-medium text-gray-400">Ninguna</span>}
                    </div>
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => onVerHorario(r.espacio.id_edificio, r.espacio.id)}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      <CalendarDays className="h-3 w-3" /> Ver horario
                    </button>
                  </td>
                </tr>)}
                {enPagina.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-[12px] font-medium text-gray-400">{resultados.length ? 'Ninguno queda libre con estos filtros. Prueba a cambiar la hora o a desmarcar el filtro de abajo a la derecha.' : 'No hay aulas o laboratorios que coincidan con estos filtros.'}</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="shrink-0">
          <Pagination
            page={paginaActual}
            totalPages={totalPaginas}
            onChange={setPagina}
            total={visibles.length}
            perPage={porPagina}
            onPerPageChange={setPorPagina}
          />

          <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] font-bold text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-green-200/70 ring-1 ring-inset ring-green-300/60" /> Libre</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-espoch-red/70" /> Con clase</span>
            {ocultos > 0 && (
              <span className="font-medium text-gray-400">
                {ocultos} {usarFranja ? 'con clase a esa hora' : 'sin ninguna hora libre'},{' '}
                {ocultos === 1 ? 'no se muestra' : 'no se muestran'}
              </span>
            )}
          </div>
          </div>

        </>}
      </div>
    </section>
  );
}
