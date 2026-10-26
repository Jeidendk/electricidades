import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Calendar, CheckCircle, Clock, DoorOpen,
  GraduationCap, MapPin,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { PageHero } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { useAuthStore } from '../../../store/authStore';
import { useClasesStore } from '../../../store/clasesStore';
import { useMateriasStore } from '../../../store/materiasStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { componerNombreCompleto, normalizarTexto } from '../../../lib/texto';
import {
  calcularKpisDocente, distribucionPorMateria, horasPorDiaSemana,
  type ClaseDocente,
} from '../utils/docenteDashboardMetrics';

const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const INDICE_HOY = [6, 0, 1, 2, 3, 4, 5];

const minutosDe = (hora: string) => {
  const [horas, minutos] = hora.split(':').map(Number);
  return (horas || 0) * 60 + (minutos || 0);
};

const TooltipCarga = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const dato = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[10px] font-extrabold text-slate-800">{label}</p>
      <p className="mt-1 text-[9px] font-semibold text-blue-600">{dato?.horas ?? 0} horas</p>
      <p className="text-[9px] text-slate-500">{dato?.clases ?? 0} clases</p>
    </div>
  );
};

export const DocenteDashboard = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore(s => s.user);
  const clases = useClasesStore(s => s.clases);
  const fetchClases = useClasesStore(s => s.fetchClases);
  const fetchMaterias = useMateriasStore(s => s.fetchMaterias);
  const fetchEspacios = useEspaciosStore(s => s.fetchEspacios);

  useEffect(() => {
    fetchClases();
    fetchMaterias();
    fetchEspacios();
  }, [fetchClases, fetchMaterias, fetchEspacios]);

  const misClases = useMemo<ClaseDocente[]>(() => {
    const listado = (clases as any[]) || [];
    let filtradas = listado;

    if (authUser?.role === 'docente') {
      const porId = listado.filter(clase => clase.id_docente === authUser.id);
      if (porId.length > 0) {
        filtradas = porId;
      } else {
        const nombreUsuario = normalizarTexto(authUser.nombre || '');
        filtradas = listado.filter(clase => {
          const nombreClase = normalizarTexto(
            [clase.docentes?.nombre, clase.docentes?.apellido].filter(Boolean).join(' '),
          );
          return Boolean(nombreUsuario && nombreClase) &&
            (nombreClase.includes(nombreUsuario) || nombreUsuario.includes(nombreClase));
        });
      }
    }

    return filtradas.map(clase => ({
      id: String(clase.id),
      id_docente: clase.id_docente || '',
      docente_nombre: [
        clase.docentes?.titulo,
        componerNombreCompleto(clase.docentes?.nombre, clase.docentes?.apellido),
      ].filter(Boolean).join(' ') || 'Docente',
      materia_id: clase.id_materia || '',
      materia_nombre: clase.materias?.nombre || 'Materia sin asignar',
      materia_codigo: clase.materias?.codigo || 'MAT-000',
      espacio_nombre: clase.espacios?.nombre || 'Aula por asignar',
      espacio_tipo: clase.espacios?.tipo || 'Aula',
      edificio_nombre: clase.espacios?.id_edificio || 'Campus',
      dia: clase.dia || 'Lunes',
      hora_inicio: (clase.hora_inicio || '07:00').slice(0, 5),
      hora_fin: (clase.hora_fin || '09:00').slice(0, 5),
      paralelo: clase.paralelo || 1,
      semestre: clase.materias?.semestre,
    }));
  }, [clases, authUser]);

  const kpis = useMemo(() => calcularKpisDocente(misClases), [misClases]);
  const horasPorDia = useMemo(() => horasPorDiaSemana(misClases), [misClases]);
  const repartoMaterias = useMemo(() => distribucionPorMateria(misClases), [misClases]);

  const asignaturas = useMemo(() => {
    const mapa = new Map<string, {
      codigo: string;
      nombre: string;
      clases: number;
      espacios: Set<string>;
      paralelos: Set<number>;
    }>();
    misClases.forEach(clase => {
      const clave = clase.materia_id || clase.materia_nombre;
      const actual = mapa.get(clave) ?? {
        codigo: clase.materia_codigo,
        nombre: clase.materia_nombre,
        clases: 0,
        espacios: new Set<string>(),
        paralelos: new Set<number>(),
      };
      actual.clases += 1;
      if (clase.espacio_nombre) actual.espacios.add(clase.espacio_nombre);
      if (clase.paralelo) actual.paralelos.add(clase.paralelo);
      mapa.set(clave, actual);
    });
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [misClases]);

  const proximasClases = useMemo(() => {
    const ahora = new Date();
    const diaActual = INDICE_HOY[ahora.getDay()];
    const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();
    return [...misClases].sort((a, b) => {
      const posicion = (clase: ClaseDocente) => {
        const indiceDia = Math.max(0, ORDEN_DIAS.indexOf(normalizarTexto(clase.dia)));
        let dias = (indiceDia - diaActual + 7) % 7;
        const minuto = minutosDe(clase.hora_inicio);
        if (dias === 0 && minuto < minutoActual) dias = 7;
        return dias * 1440 + minuto;
      };
      return posicion(a) - posicion(b);
    }).slice(0, 5);
  }, [misClases]);

  const nombreDocente = authUser?.nombre?.split(' ')[0] || 'Docente';
  const tarjetas = [
    {
      titulo: 'Carga semanal', valor: `${kpis.totalHorasSemanales}h`,
      detalle: 'Horas programadas', Icono: Clock,
      fondo: 'from-[#b00000] to-[#d33131]', sombra: 'shadow-red-900/15',
    },
    {
      titulo: 'Materias asignadas', valor: kpis.totalMaterias,
      detalle: `${asignaturas.length} asignaturas activas`, Icono: BookOpen,
      fondo: 'from-amber-500 to-orange-500', sombra: 'shadow-orange-900/15',
    },
    {
      titulo: 'Clases semanales', valor: kpis.totalClases,
      detalle: 'Bloques en el horario', Icono: Calendar,
      fondo: 'from-blue-600 to-cyan-500', sombra: 'shadow-blue-900/15',
    },
    {
      titulo: 'Aulas y laboratorios', valor: kpis.totalEspacios,
      detalle: 'Espacios utilizados', Icono: DoorOpen,
      fondo: 'from-emerald-600 to-teal-500', sombra: 'shadow-emerald-900/15',
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f7fb]">
      <PageHero
        icon={GraduationCap}
        title={`Hola, ${nombreDocente}`}
        subtitle="Resumen de tu carga académica, asignaturas y próximas clases."
        backgroundImage={HERO_BG.docente}
      />

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5 lg:p-6 xl:grid xl:grid-rows-[minmax(0,1.14fr)_92px_minmax(0,0.86fr)] xl:gap-3 xl:overflow-hidden">
        <div className="grid gap-4 xl:min-h-0 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.65fr)]">
          <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-espoch-red">Actividad académica</p>
                <h2 className="mt-1 text-[18px] font-extrabold text-slate-900">Carga horaria semanal</h2>
                <p className="mt-1 text-[10px] font-medium text-slate-500">Horas y clases asignadas de lunes a sábado.</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-2 text-right">
                <p className="text-[9px] font-semibold text-slate-400">Horas totales</p>
                <p className="text-[22px] font-black leading-none text-slate-900">{kpis.totalHorasSemanales}h</p>
              </div>
            </div>
            <div className="mt-4 h-[230px] xl:min-h-0 xl:flex-1">
              {misClases.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <Clock className="h-9 w-9 text-slate-200" />
                  <p className="mt-2 text-[10px] font-semibold">No tienes horarios registrados</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={horasPorDia} margin={{ top: 12, right: 12, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="docenteCarga" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b00000" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#b00000" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e8eef5" strokeDasharray="3 4" />
                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <RechartsTooltip content={<TooltipCarga />} />
                    <Area
                      type="monotone" dataKey="horas" name="Horas" stroke="#b00000" strokeWidth={2.5}
                      fill="url(#docenteCarga)" dot={{ r: 3, fill: '#fff', stroke: '#b00000', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Distribución académica</p>
            <h2 className="mt-1 text-[18px] font-extrabold text-slate-900">Horas por asignatura</h2>
            <div className="relative mx-auto mt-3 h-[180px] w-full max-w-[230px] xl:min-h-[120px] xl:flex-1">
              {repartoMaterias.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={repartoMaterias} dataKey="horas" nameKey="name" innerRadius={56} outerRadius={78} paddingAngle={3} stroke="none">
                        {repartoMaterias.map(porcion => <Cell key={porcion.name} fill={porcion.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold text-slate-400">MATERIAS</span>
                    <span className="text-[28px] font-black text-slate-900">{kpis.totalMaterias}</span>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-slate-400">Sin asignaturas</div>
              )}
            </div>
            <div className="custom-scrollbar max-h-[72px] space-y-1.5 overflow-y-auto pr-1 xl:max-h-[54px]">
              {repartoMaterias.map(porcion => (
                <div key={porcion.name} className="flex items-center justify-between gap-2 text-[9px]">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-600">
                    <i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: porcion.color }} />
                    <span className="truncate">{porcion.name}</span>
                  </span>
                  <span className="shrink-0 font-extrabold text-slate-800">{porcion.horas}h · {porcion.porcentaje}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section aria-label="Resumen académico" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:mt-0 xl:min-h-0 xl:grid-cols-4">
          {tarjetas.map(({ titulo, valor, detalle, Icono, fondo, sombra }) => (
            <article key={titulo} className={`relative min-h-[112px] overflow-hidden rounded-2xl bg-gradient-to-br ${fondo} p-4 text-white shadow-lg ${sombra} xl:h-full xl:min-h-0`}>
              <div className="absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-white/80">{titulo}</p>
                  <p className="mt-2 text-[26px] font-black leading-none">{valor}</p>
                  <p className="mt-2 text-[9px] font-medium text-white/75">{detalle}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <Icono className="h-4 w-4" />
                </span>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-4 grid gap-4 xl:mt-0 xl:min-h-0 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.65fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-espoch-red">Agenda semanal</p>
                <h2 className="mt-1 text-[15px] font-extrabold text-slate-900">Próximas clases</h2>
              </div>
              <button onClick={() => navigate('/docente/horarios')} className="text-[9px] font-bold text-espoch-red hover:underline">Ver horario</button>
            </div>
            <div className="custom-scrollbar mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {proximasClases.length === 0 ? (
                <div className="flex min-h-[190px] flex-col items-center justify-center text-slate-400">
                  <CheckCircle className="h-8 w-8 text-emerald-300" />
                  <p className="mt-2 text-[10px] font-semibold">No hay clases asignadas</p>
                </div>
              ) : proximasClases.map(clase => (
                <div key={clase.id} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-espoch-red">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-extrabold text-slate-800">{clase.materia_nombre}</p>
                    <p className="mt-0.5 text-[9px] font-semibold text-slate-500">{clase.dia} · {clase.hora_inicio}–{clase.hora_fin}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[8.5px] text-slate-400">
                      <MapPin className="h-3 w-3 shrink-0" /> {clase.espacio_nombre}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-espoch-red">Planificación docente</p>
                <h2 className="mt-1 text-[15px] font-extrabold text-slate-900">Mis asignaturas y aulas</h2>
              </div>
              <button onClick={() => navigate('/docente/horarios')} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-[9px] font-bold text-white transition-colors hover:bg-black">
                Ver grilla <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="custom-scrollbar mt-4 min-h-0 flex-1 overflow-auto">
              <div className="min-w-[650px] overflow-hidden rounded-xl border border-slate-100">
                <div className="grid grid-cols-[90px_minmax(190px,1.5fr)_minmax(150px,1fr)_90px_70px] gap-3 bg-slate-900 px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-white">
                  <span>Código</span><span>Asignatura</span><span>Aulas</span><span>Paralelos</span><span className="text-right">Clases</span>
                </div>
                {asignaturas.length === 0 ? (
                  <p className="py-14 text-center text-[11px] text-slate-400">Todavía no tienes asignaturas asociadas.</p>
                ) : asignaturas.slice(0, 7).map(asignatura => (
                  <div key={asignatura.codigo + asignatura.nombre} className="grid grid-cols-[90px_minmax(190px,1.5fr)_minmax(150px,1fr)_90px_70px] items-center gap-3 border-t border-slate-100 px-3 py-3 text-[9px]">
                    <span className="truncate font-bold text-blue-600">{asignatura.codigo}</span>
                    <span className="truncate font-extrabold text-slate-800">{asignatura.nombre}</span>
                    <span className="truncate text-slate-500">{[...asignatura.espacios].join(', ') || 'Sin aula'}</span>
                    <span className="text-slate-500">{[...asignatura.paralelos].join(', ') || '—'}</span>
                    <span className="text-right font-extrabold text-slate-800">{asignatura.clases}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};

export default DocenteDashboard;
