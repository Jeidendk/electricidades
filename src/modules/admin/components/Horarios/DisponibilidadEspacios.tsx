import { useEffect, useMemo, useState } from 'react';
import {
  Building2, RefreshCcw, Search, RotateCcw, CalendarDays, Clock,
  LayoutGrid, Armchair, FlaskConical, ChevronDown, ArrowUpDown, ArrowLeft, BookOpen,
} from 'lucide-react';
import { useClasesStore } from '../../../../store/clasesStore';
import { useEspaciosStore } from '../../../../store/espaciosStore';
import { useEdificiosStore } from '../../../../store/edificiosStore';
import { calcularDisponibilidad, minutosHora, mostrarHora, type Tramo } from '../../../../lib/disponibilidadEspacios';
import { mismoDia, normalizarTexto } from '../../../../lib/texto';
import { AcentoTarjeta } from '../../../../components/ui/AcentoTarjeta';
import { Pagination } from '../../../../components/ui/Pagination';
import { dias, horasSeleccionables } from './horariosData';
import { formatoPiso } from '../../data/espaciosData';

const primeraHora = horasSeleccionables[0];
const ultimaHora = horasSeleccionables[horasSeleccionables.length - 1];
const jornada = { inicio: minutosHora(primeraHora), fin: minutosHora(ultimaHora) };
const minutosJornada = jornada.fin - jornada.inicio;

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

interface BloqueVisual {
  id: string;
  inicio: number;
  fin: number;
  materia: string;
  carreraId: string;
  carrera: string;
  color: string;
}

interface CarreraVisual {
  id: string;
  nombre: string;
  color_hex: string | null;
}

const colorConAlpha = (hex: string, alpha: number): string => {
  const limpio = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(limpio)) return `rgba(100, 116, 139, ${alpha})`;
  const valor = Number.parseInt(limpio, 16);
  return `rgba(${(valor >> 16) & 255}, ${(valor >> 8) & 255}, ${valor & 255}, ${alpha})`;
};

/** Convierte el color de carrera en un pastel opaco: el fondo gris nunca se transparenta. */
const colorPastelSolido = (hex: string): string => {
  const limpio = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(limpio)) return 'rgb(226, 232, 240)';
  const valor = Number.parseInt(limpio, 16);
  const mezclar = (canal: number) => Math.round(canal * 0.18 + 255 * 0.82);
  return `rgb(${mezclar((valor >> 16) & 255)}, ${mezclar((valor >> 8) & 255)}, ${mezclar(valor & 255)})`;
};

/** Regla de horas. Va una sola vez en la cabecera: repetirla en cada fila sería ruido. */
const ReglaDeHoras = () => (
  <div className="relative h-5 w-full">
    {horasEnPunto.map((minuto, i) => (
      i % 2 === 0 && (
        <span
          key={minuto}
          className="absolute top-0 -translate-x-1/2 text-[10px] font-extrabold tabular-nums text-slate-500"
          style={{ left: `${porcentaje(minuto)}%` }}
        >
          {String(Math.floor(minuto / 60)).padStart(2, '0')}
        </span>
      )
    ))}
  </div>
);

/**
 * Barra del día: gris como base, verde solo en tramos libres y el color de carrera en clases.
 *
 * Las divisiones horarias son lo que la hace legible: sin ellas se ve QUE hay un hueco, pero
 * no A QUÉ HORA, que es justo lo que se viene a averiguar. Con la regla de la cabecera encima,
 * cada segmento se sitúa en el reloj sin tener que leer ningún número.
 */
const BarraDelDia = ({ bloques, libres }: { bloques: BloqueVisual[]; libres: Tramo[] }) => (
  <div className="relative h-[72px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
    {libres.map(tramo => (
      <span
        key={`${tramo.inicio}-${tramo.fin}`}
        className="absolute inset-y-0 bg-emerald-100"
        style={{
          left: `${porcentaje(tramo.inicio)}%`,
          width: `${((tramo.fin - tramo.inicio) / minutosJornada) * 100}%`,
        }}
        title={`Libre de ${mostrarHora(tramo.inicio)} a ${mostrarHora(tramo.fin)}`}
      />
    ))}
    {bloques.map(bloque => (
      <div
        key={bloque.id}
        className="absolute inset-y-1.5 z-10 overflow-hidden rounded-lg border border-l-4 px-2.5 py-1.5 shadow-sm"
        style={{
          left: `${porcentaje(bloque.inicio)}%`,
          width: `${((bloque.fin - bloque.inicio) / minutosJornada) * 100}%`,
          borderColor: colorConAlpha(bloque.color, 0.55),
          borderLeftColor: bloque.color,
          backgroundColor: colorPastelSolido(bloque.color),
          color: bloque.color,
        }}
        title={`${bloque.materia} · ${bloque.carrera}: ${mostrarHora(bloque.inicio)}–${mostrarHora(bloque.fin)}`}
      >
        <div className="flex h-full min-w-0 items-center gap-2">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/55 min-[1450px]:flex">
            <BookOpen className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-extrabold leading-tight">{bloque.materia}</div>
            <div className="mt-1.5 flex items-center gap-1 whitespace-nowrap text-[8.5px] font-semibold opacity-75">
              <Clock className="h-3 w-3 shrink-0" /> {mostrarHora(bloque.inicio)}–{mostrarHora(bloque.fin)}
            </div>
          </div>
        </div>
      </div>
    ))}
    {horasEnPunto.slice(1, -1).map(minuto => (
      <span
        key={minuto}
        className="absolute inset-y-0 z-20 w-px bg-white/65"
        style={{ left: `${porcentaje(minuto)}%` }}
      />
    ))}
  </div>
);

export function DisponibilidadEspacios({ onVerHorario, onVolver, carreras }: {
  onVerHorario: (edificioId: string, espacioId: string) => void;
  /** Vuelve al horario de distribución. */
  onVolver?: () => void;
  carreras: CarreraVisual[];
}) {
  const { clases, loading: cargandoClases, error: errorClases, fetchClases } = useClasesStore();
  const { items: espacios, loading: cargandoEspacios, error: errorEspacios, fetchEspacios } = useEspaciosStore();
  const { items: edificios, loading: cargandoEdificios, error: errorEdificios, fetchEdificios } = useEdificiosStore();
  const [iniciando, setIniciando] = useState(true);
  const [dia, setDia] = useState(() => dias[new Date().getDay() - 1] || dias[0]);
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

  const resultados = useMemo(() => {
    const porEdificio = new Map(edificios.map(e => [e.id, e]));
    const carreraPorId = new Map(carreras.map(carrera => [carrera.id, carrera]));
    return espacios.filter(e => {
      const tipoNormal = normalizarTexto(e.tipo);
      const esLaboratorio = tipoNormal.includes('laboratorio');
      const esAula = tipoNormal === 'academica' || tipoNormal === 'aula';
      return (esLaboratorio || esAula) && (!edificioId || e.id_edificio === edificioId) &&
        (!tipo || (tipo === 'laboratorio' ? esLaboratorio : esAula)) &&
        normalizarTexto(`${e.nombre} ${porEdificio.get(e.id_edificio)?.nombre || ''}`).includes(normalizarTexto(busqueda));
    }).map(espacio => {
      const edificio = porEdificio.get(espacio.id_edificio);
      const disponibilidad = calcularDisponibilidad(espacio, edificio?.estado, clases, dia, jornada);
      const minutosLibres = disponibilidad.libres.reduce((suma, t) => suma + (t.fin - t.inicio), 0);
      const clasesConMateria = clases as Array<(typeof clases)[number] & {
        materias?: { nombre?: string | null; id_carrera?: string | null } | null;
      }>;
      const bloques: BloqueVisual[] = clasesConMateria
        .filter(clase => clase.id_espacio === espacio.id && mismoDia(clase.dia, dia))
        .map(clase => {
          const carreraId = clase.materias?.id_carrera || '';
          const carrera = carreraPorId.get(carreraId);
          return {
            id: clase.id,
            inicio: Math.max(jornada.inicio, minutosHora(clase.hora_inicio)),
            fin: Math.min(jornada.fin, minutosHora(clase.hora_fin)),
            materia: clase.materias?.nombre?.trim() || 'Clase programada',
            carreraId,
            carrera: carrera?.nombre || 'Sin carrera',
            color: carrera?.color_hex || '#64748b',
          };
        })
        .filter(bloque => Number.isFinite(bloque.inicio) && Number.isFinite(bloque.fin) && bloque.inicio < bloque.fin)
        .sort((a, b) => a.inicio - b.inicio);
      return { espacio, edificio, minutosLibres, bloques, ...disponibilidad };
    }).sort((a, b) => Number(b.libre) - Number(a.libre) || b.minutosLibres - a.minutosLibres ||
      `${a.edificio?.nombre} ${a.espacio.nombre}`.localeCompare(`${b.edificio?.nombre} ${b.espacio.nombre}`, 'es', { numeric: true }));
  }, [espacios, edificios, clases, carreras, dia, edificioId, tipo, busqueda]);

  /**
   * Un espacio que no sirve para lo que se pregunta no se lista. Antes esto era una casilla
   * que había que marcar, es decir: por defecto se enseñaba ruido.
   *
   * Se listan únicamente espacios con al menos un tramo libre durante la jornada elegida.
   */
  const visibles = useMemo(() => {
    const lista = resultados.filter(r => r.minutosLibres > 0);
    if (!ordenCol) return lista;
    const signo = ordenAsc ? 1 : -1;
    return [...lista].sort((a, b) => signo * (ordenCol === 'libres'
      ? a.minutosLibres - b.minutosLibres
      : `${a.espacio.nombre}`.localeCompare(b.espacio.nombre, 'es', { numeric: true })));
  }, [resultados, ordenCol, ordenAsc]);

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  // Al filtrar, la página en la que estabas puede dejar de existir: sin esto la tabla
  // se queda en blanco y parece que no hay resultados.
  const paginaActual = Math.min(pagina, totalPaginas);
  const enPagina = visibles.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);
  const carrerasEnPagina = useMemo(() => {
    const unicas = new Map<string, { nombre: string; color: string }>();
    for (const resultado of enPagina) {
      for (const bloque of resultado.bloques) {
        const clave = bloque.carreraId || `sin-carrera-${bloque.carrera}`;
        if (!unicas.has(clave)) unicas.set(clave, { nombre: bloque.carrera, color: bloque.color });
      }
    }
    return [...unicas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [enPagina]);

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
    setOrdenCol('');
  };

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[20px] border border-gray-200/60 bg-white p-4 shadow-sm md:p-6">
      <AcentoTarjeta />

      {/* Barra única: navegación, día consultado y actualización permanecen en el mismo nivel. */}
      <div className="availability-day-tabs mb-4 shrink-0 overflow-x-auto custom-scrollbar">
        <div className="availability-day-tabs__side availability-day-tabs__side--start">
          {onVolver && (
            <button
              onClick={onVolver}
              className="flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </button>
          )}
        </div>

        <nav className="availability-day-tabs__group" aria-label="Día de la semana">
          {dias.map(d => {
            const activo = dia === d;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={activo}
                onClick={() => { setDia(d); setPagina(1); }}
                className={`availability-day-tab ${activo ? 'active' : ''}`}
              >
                <CalendarDays className="h-4 w-4" />
                <span>{d}</span>
              </button>
            );
          })}
        </nav>

        <div className="availability-day-tabs__side availability-day-tabs__side--end">
          <button
            disabled={cargando}
            onClick={recargar}
            className="flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${cargando ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>
      </div>

      {/* Barra compacta con los filtros secundarios. */}
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

        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
      {cargando ? <p role="status" className="py-14 text-center text-[13px] font-medium text-gray-500">Consultando clases y espacios...</p>
        : error ? <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-5 text-[13px] font-medium text-espoch-red">No se pudo comprobar la disponibilidad. Pulsa Actualizar para volver a intentarlo.</p>
        : <>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-100 custom-scrollbar">
            <table className="w-full min-w-[1380px] table-fixed text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[9px] font-extrabold uppercase tracking-widest text-gray-500">
                  <th className="w-[11%] p-4">
                    <button onClick={() => ordenarPor('espacio')} className="flex items-center gap-1.5 uppercase transition-colors hover:text-gray-700">
                      Espacio <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="w-[11%] p-4">Edificio</th>
                  <th className="w-[10%] p-4">Tipo y capacidad</th>
                  <th className="w-[47%] p-4 pb-2">
                    <div className="mb-1">Disponibilidad · {dia}</div>
                    <ReglaDeHoras />
                  </th>
                  <th className="w-[7%] p-3">
                    <button onClick={() => ordenarPor('libres')} className="flex items-center gap-1.5 uppercase transition-colors hover:text-gray-700">
                      Horas libres <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="w-[8%] p-3">Franjas libres</th>
                  <th className="w-[6%] p-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {enPagina.map(r => <tr key={r.espacio.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-espoch-red">
                        {normalizarTexto(r.espacio.tipo).includes('laboratorio')
                          ? <FlaskConical className="h-4 w-4" />
                          : <Armchair className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 text-[12px] font-extrabold leading-tight text-gray-900">{r.espacio.nombre}</div>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-start gap-2 text-[10px] font-bold uppercase leading-snug text-gray-600">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                        <Building2 className="h-3.5 w-3.5" />
                      </span>
                      <span>{r.edificio?.nombre || 'Sin edificio'}</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="text-[11px] font-bold text-gray-700">{r.espacio.tipo}</div>
                    <div className="mt-1 text-[10px] font-medium leading-relaxed text-gray-400">
                      {formatoPiso(r.espacio.piso)} · {r.espacio.capacidad} personas
                    </div>
                  </td>

                  <td className="p-4">
                    {r.libres.length || r.ocupados.length ? (
                      <BarraDelDia bloques={r.bloques} libres={r.libres} />
                    ) : (
                      <span className="flex w-max items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[9px] font-extrabold text-gray-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> {r.motivo}
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-700">
                      <Clock className="h-3 w-3" /> {duracion(r.minutosLibres)}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex max-h-[58px] flex-wrap gap-1.5 overflow-y-auto custom-scrollbar">
                    {r.libres.map(t => <span key={t.inicio}
                      className="flex items-center gap-1 rounded-lg border border-green-200/70 bg-green-50 px-2 py-1 text-[9px] font-bold text-green-700">
                      {mostrarHora(t.inicio)}–{mostrarHora(t.fin)}
                    </span>)}
                    {r.libres.length === 0 && <span className="text-[11px] font-medium text-gray-400">Ninguna</span>}
                    </div>
                  </td>

                  <td className="p-2 text-right">
                    <button
                      onClick={() => onVerHorario(r.espacio.id_edificio, r.espacio.id)}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      <CalendarDays className="h-3 w-3" /> Ver horario
                    </button>
                  </td>
                </tr>)}
                {enPagina.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-[12px] font-medium text-gray-400">{resultados.length ? 'Ningún espacio tiene horas libres durante este día.' : 'No hay aulas o laboratorios que coincidan con estos filtros.'}</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="relative shrink-0">
            <Pagination
              page={paginaActual}
              totalPages={totalPaginas}
              onChange={setPagina}
              total={visibles.length}
              perPage={porPagina}
              onPerPageChange={setPorPagina}
            />

            <div className="mt-3 flex max-w-full flex-nowrap items-center justify-center gap-4 overflow-x-auto whitespace-nowrap px-2 text-[10px] font-semibold text-gray-500 custom-scrollbar xl:absolute xl:left-1/2 xl:top-4 xl:mt-0 xl:max-w-[58%] xl:-translate-x-1/2">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-emerald-300 bg-emerald-300" /> Libre
              </span>
              {carrerasEnPagina.length > 0 && (
                <span className="h-4 w-px shrink-0 bg-gray-200" aria-hidden="true" />
              )}
              {carrerasEnPagina.length > 0 && (
                <span className="shrink-0 font-extrabold uppercase tracking-wider text-gray-400">Clases por carrera</span>
              )}
              {carrerasEnPagina.map(carrera => (
                <span key={carrera.nombre} className="flex shrink-0 items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: carrera.color }} />
                  {carrera.nombre}
                </span>
              ))}
            </div>
          </div>

        </>}
      </div>
    </section>
  );
}
