import { useEffect, useMemo } from 'react';
import {
  LayoutGrid, Clock3, Building2, Users, CalendarDays, Sparkles, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell,
} from 'recharts';
import { PageHero } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { useAuthStore, ETIQUETA_ROL } from '../../../store/authStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { useClasesStore } from '../../../store/clasesStore';
import { mapearClases } from '../../admin/components/Horarios/mapearClases';
import { esAula, esLaboratorio } from '../../admin/data/espaciosData';
import { diasFormales } from '../../admin/components/Horarios/horariosData';
import { normalizarTexto, mismoDia } from '../../../lib/texto';

const COLORES = ['#c21f1f', '#f59e0b', '#10b981'];
const COLORES_EDIFICIOS = ['#0ea5e9', '#ef233c', '#4f46e5', '#f59e0b', '#a855f7', '#10b981'];
const HORAS_DISPONIBLES_SEMANA = 60; // lunes a viernes, de 07:00 a 19:00

const horasEntre = (inicio: string, fin: string): number => {
  const aMinutos = (valor: string) => {
    const [hora, minuto] = valor.split(':').map(Number);
    return (hora || 0) * 60 + (minuto || 0);
  };
  return Math.max(0, (aMinutos(fin) - aMinutos(inicio)) / 60);
};

export const AutoridadDashboard = () => {
  const usuario = useAuthStore(s => s.user);
  const { items: edificios, fetchEdificios } = useEdificiosStore();
  const { items: espacios, fetchEspacios } = useEspaciosStore();
  const { carreras, facultades, fetchAll } = useFacultadesStore();
  const { clases: rawClases, fetchClases } = useClasesStore();

  useEffect(() => {
    fetchAll();
    fetchClases();
    fetchEdificios();
    fetchEspacios();
  }, []);

  const clases = useMemo(() => mapearClases(rawClases, carreras as any), [rawClases, carreras]);
  const esCoordinador = usuario?.role === 'coordinador';
  const esAdministrativo = usuario?.role === 'administrativo';

  const facultadPropia = useMemo(() => {
    const buscada = normalizarTexto(usuario?.facultadNombre);
    if (!buscada) return undefined;
    return facultades.find((facultad: any) =>
      normalizarTexto(facultad.nombre) === buscada ||
      normalizarTexto(facultad.siglas) === buscada,
    );
  }, [facultades, usuario?.facultadNombre]);

  const carreraPropia = useMemo(() => {
    if (!esCoordinador) return undefined;
    const buscada = normalizarTexto(usuario?.carreraNombre);
    if (!buscada) return undefined;
    return carreras.find((carrera: any) => normalizarTexto(carrera.nombre) === buscada);
  }, [carreras, esCoordinador, usuario?.carreraNombre]);

  const carrerasAmbito = useMemo(() => {
    if (esAdministrativo) return carreras;
    if (esCoordinador) return carreraPropia ? [carreraPropia] : [];
    if (!facultadPropia) return [];
    return carreras.filter((carrera: any) => carrera.id_facultad === facultadPropia.id);
  }, [carreras, carreraPropia, esAdministrativo, esCoordinador, facultadPropia]);

  const clasesVisibles = useMemo(() => {
    const ids = new Set(carrerasAmbito.map((carrera: any) => carrera.id));
    return clases.filter(clase => ids.has(clase.idCarrera));
  }, [clases, carrerasAmbito]);

  const espaciosVisibles = useMemo(() => {
    const ids = new Set(clasesVisibles.map(clase => clase.idEspacio).filter(Boolean));
    return espacios.filter(espacio => ids.has(espacio.id));
  }, [clasesVisibles, espacios]);

  const edificiosVisibles = useMemo(() => {
    const ids = new Set(espaciosVisibles.map(espacio => espacio.id_edificio));
    return edificios.filter(edificio => ids.has(edificio.id));
  }, [edificios, espaciosVisibles]);

  const porDia = useMemo(() => diasFormales.map(dia => ({
    dia: dia.slice(0, 3),
    nombre: dia,
    clases: clasesVisibles.filter(clase => mismoDia(clase.dia, dia)).length,
  })), [clasesVisibles]);

  const docentesDistintos = useMemo(
    () => new Set(clasesVisibles.map(clase => clase.idDocente).filter(Boolean)).size,
    [clasesVisibles],
  );

  const horasTotales = useMemo(
    () => clasesVisibles.reduce((total, clase) => total + horasEntre(clase.horaInicio, clase.horaFin), 0),
    [clasesVisibles],
  );

  const diaPico = porDia.reduce(
    (mejor, dia) => dia.clases > mejor.clases ? dia : mejor,
    porDia[0] ?? { dia: '—', nombre: 'Sin datos', clases: 0 },
  );

  const ocupacionEdificios = useMemo(() => edificiosVisibles.map((edificio, indice) => {
    const espaciosEdificio = espaciosVisibles.filter(espacio => espacio.id_edificio === edificio.id);
    const ids = new Set(espaciosEdificio.map(espacio => espacio.id));
    const horas = clasesVisibles
      .filter(clase => ids.has(clase.idEspacio))
      .reduce((total, clase) => total + horasEntre(clase.horaInicio, clase.horaFin), 0);
    const capacidad = Math.max(1, espaciosEdificio.length * HORAS_DISPONIBLES_SEMANA);
    return {
      id: edificio.id,
      nombre: edificio.nombre,
      horas,
      porcentaje: Math.min(100, Math.round((horas / capacidad) * 100)),
      color: COLORES_EDIFICIOS[indice % COLORES_EDIFICIOS.length],
    };
  }).sort((a, b) => b.porcentaje - a.porcentaje), [edificiosVisibles, espaciosVisibles, clasesVisibles]);

  const distribucionEspacios = useMemo(() => {
    const aulas = espaciosVisibles.filter(espacio => esAula(espacio.tipo)).length;
    const laboratorios = espaciosVisibles.filter(espacio => esLaboratorio(espacio.tipo)).length;
    const otros = Math.max(0, espaciosVisibles.length - aulas - laboratorios);
    return [
      { nombre: 'Aulas teóricas', valor: aulas },
      { nombre: 'Laboratorios', valor: laboratorios },
      { nombre: 'Otros espacios', valor: otros },
    ].filter(item => item.valor > 0);
  }, [espaciosVisibles]);

  const espaciosDemandados = useMemo(() => {
    const resumen = new Map<string, { id: string; nombre: string; edificio: string; horas: number }>();
    clasesVisibles.forEach(clase => {
      if (!clase.idEspacio) return;
      const edificio = edificios.find(item => item.id === clase.edificio)?.nombre || 'Sin edificio';
      const actual = resumen.get(clase.idEspacio) ?? {
        id: clase.idEspacio,
        nombre: clase.aula || 'Sin aula',
        edificio,
        horas: 0,
      };
      actual.horas += horasEntre(clase.horaInicio, clase.horaFin);
      resumen.set(clase.idEspacio, actual);
    });
    return [...resumen.values()].sort((a, b) => b.horas - a.horas).slice(0, 5);
  }, [clasesVisibles, edificios]);

  const rol = ETIQUETA_ROL[usuario?.role ?? 'decano'];
  const alcance = esAdministrativo ? 'toda la institución' : esCoordinador ? carreraPropia?.nombre : facultadPropia?.nombre;
  const sinAmbito = !alcance;

  const kpis = [
    {
      titulo: 'Total clases semanales', valor: clasesVisibles.length, Icono: Clock3,
      color: 'border-t-indigo-500 text-indigo-500', detalle: `${horasTotales} horas programadas`,
    },
    {
      titulo: 'Docentes con asignación', valor: docentesDistintos, Icono: Users,
      color: 'border-t-amber-500 text-amber-500', detalle: `${carrerasAmbito.length} ${carrerasAmbito.length === 1 ? 'carrera incluida' : 'carreras incluidas'}`,
    },
    {
      titulo: 'Espacios utilizados', valor: espaciosVisibles.length, Icono: Building2,
      color: 'border-t-emerald-500 text-emerald-500', detalle: `${edificiosVisibles.length} ${edificiosVisibles.length === 1 ? 'edificio' : 'edificios'} con actividad`,
    },
    {
      titulo: 'Día con más clases', valor: clasesVisibles.length ? diaPico.nombre : 'Sin datos', Icono: CalendarDays,
      color: 'border-t-rose-500 text-rose-500', detalle: `${diaPico.clases} ${diaPico.clases === 1 ? 'clase programada' : 'clases programadas'}`,
    },
  ];

  return (
    <div className="flex h-full flex-col bg-[#f4f7fb]">
      <PageHero
        icon={LayoutGrid}
        title={`Dashboard de ${rol}`}
        subtitle={alcance ? `Indicadores académicos de ${alcance}` : 'Indicadores académicos de tu ámbito asignado'}
        backgroundImage={HERO_BG.dashboard}
      />

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5 lg:p-6 xl:overflow-hidden">
        {sinAmbito && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-semibold text-amber-900">
            Tu cuenta no tiene {esCoordinador ? 'una carrera' : 'una facultad'} asignada. Un administrador debe completar ese dato para mostrar indicadores sin mezclar información de otros ámbitos.
          </div>
        )}

        {esAdministrativo && (
          <section className="relative mb-4 shrink-0 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-[#eef2ff] via-white to-[#f5f3ff] px-5 py-4 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-indigo-200/30 blur-2xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-500">Resumen institucional</p>
                  <h2 className="mt-0.5 text-[18px] font-black tracking-tight text-slate-900">Todo el campus, en una sola vista</h2>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">Consulta horarios, espacios y actividad académica sin modificar registros.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-[10px] font-bold text-slate-600 ring-1 ring-indigo-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Datos actualizados
                <ArrowUpRight className="h-3.5 w-3.5 text-indigo-500" />
              </div>
            </div>
          </section>
        )}

        <section aria-label="Indicadores principales" className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ titulo, valor, Icono, color, detalle }) => (
            <article key={titulo} className={`rounded-2xl border border-gray-200 border-t-[4px] bg-white px-4 py-3.5 shadow-sm ${color}`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[12px] font-bold text-slate-700">{titulo}</h2>
                <Icono className="h-4 w-4" />
              </div>
              <p className="mt-2 truncate text-[28px] font-black leading-none text-slate-950">{valor}</p>
              <p className="mt-2 text-[10px] font-semibold text-slate-500">{detalle}</p>
            </article>
          ))}
        </section>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-12 xl:grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="order-1 flex min-h-[310px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-8 xl:min-h-0">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-extrabold text-slate-900">Tendencia semanal de clases</h2>
              <span className="font-mono text-[10px] font-semibold text-slate-400">{clasesVisibles.length} clases totales</span>
            </div>
            <div className="mt-4 min-h-[220px] flex-1 xl:min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={porDia} margin={{ top: 12, right: 10, left: -25, bottom: 0 }}>
                  <defs><linearGradient id="tendenciaAutoridad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0284c7" stopOpacity={0.22} /><stop offset="100%" stopColor="#0284c7" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="#e8eef5" vertical={false} />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <RechartsTooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} formatter={value => [value, 'Clases']} />
                  <Area type="monotone" dataKey="clases" stroke="#0284c7" strokeWidth={2.5} fill="url(#tendenciaAutoridad)" dot={{ r: 4, fill: '#fff', stroke: '#0284c7', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#f59e0b', stroke: '#d97706' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="order-3 min-h-[255px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-5 xl:min-h-0">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-extrabold text-slate-900">Ocupación por edificios</h2>
              <span className="text-[10px] font-bold text-blue-600">{edificiosVisibles.length} {edificiosVisibles.length === 1 ? 'edificio' : 'edificios'}</span>
            </div>
            <div className="mt-7 space-y-3.5">
              {ocupacionEdificios.length === 0 ? (
                <p className="py-12 text-center text-[11px] text-slate-400">No hay edificios con clases en este ámbito.</p>
              ) : ocupacionEdificios.slice(0, 5).map(edificio => (
                <div key={edificio.id} className="grid grid-cols-[125px_minmax(0,1fr)_38px] items-center gap-3">
                  <span className="truncate text-right text-[10px] font-semibold text-slate-600" title={edificio.nombre}>{edificio.nombre}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${edificio.porcentaje}%`, backgroundColor: edificio.color }} /></div>
                  <span className="text-right text-[10px] font-extrabold text-slate-900">{edificio.porcentaje}%</span>
                </div>
              ))}
            </div>
          </section>
          <section className="order-2 flex min-h-[310px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-4 xl:min-h-0">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-extrabold text-slate-900">Distribución de espacios</h2>
              <span className="font-mono text-[10px] font-semibold text-slate-500">{espaciosVisibles.length} espacios totales</span>
            </div>
            <div className="mt-3 grid flex-1 grid-cols-1 items-center gap-3 sm:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[210px_minmax(0,1fr)]">
              <div className="relative mx-auto h-[210px] w-full max-w-[230px] xl:h-full xl:max-h-[210px] xl:min-h-[150px]">
                {distribucionEspacios.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribucionEspacios} dataKey="valor" nameKey="nombre" innerRadius={64} outerRadius={92} paddingAngle={3}>{distribucionEspacios.map((item, indice) => <Cell key={item.nombre} fill={COLORES[indice]} />)}</Pie></PieChart></ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] font-bold text-slate-400">TOTAL</span><span className="text-[28px] font-black text-slate-900">{espaciosVisibles.length}</span></div>
                  </>
                ) : <div className="flex h-full items-center justify-center text-[10px] text-slate-400">Sin espacios</div>}
              </div>
              <div className="space-y-3">
                {distribucionEspacios.map((item, indice) => (
                  <div key={item.nombre} className="grid grid-cols-[10px_minmax(0,1fr)_28px_42px] items-center gap-2 text-[10px]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORES[indice] }} />
                    <span className="truncate font-semibold text-slate-700">{item.nombre}</span>
                    <span className="text-right font-extrabold text-slate-900">{item.valor}</span>
                    <span className="text-right font-semibold text-slate-400">{espaciosVisibles.length ? Math.round((item.valor / espaciosVisibles.length) * 100) : 0}%</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-500"><span>{edificiosVisibles.length} edificios</span><span>{alcance || 'Ámbito sin asignar'}</span></div>
              </div>
            </div>
          </section>

          <section className="order-4 min-h-[255px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-7 xl:min-h-0">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-extrabold text-slate-900">Top 5 espacios más demandados</h2>
              <span className="text-[10px] font-bold text-blue-600">Horas de ocupación</span>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
              <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(120px,1fr)_75px] gap-3 bg-slate-50 px-3 py-2 text-[9px] font-bold text-slate-500"><span>Espacio / Aula</span><span>Edificio</span><span className="text-right">Horas sem.</span></div>
              {espaciosDemandados.length === 0 ? (
                <p className="py-12 text-center text-[11px] text-slate-400">No hay ocupación registrada.</p>
              ) : espaciosDemandados.map((espacio, indice) => (
                <div key={espacio.id} className="grid grid-cols-[minmax(0,1.35fr)_minmax(120px,1fr)_75px] items-center gap-3 border-t border-slate-100 px-3 py-2.5 text-[10px]">
                  <span className="flex min-w-0 items-center gap-2 font-extrabold text-slate-800"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORES_EDIFICIOS[indice % COLORES_EDIFICIOS.length] }} /><span className="truncate">{espacio.nombre}</span></span>
                  <span className="truncate text-slate-500">{espacio.edificio}</span>
                  <span className="text-right font-mono font-extrabold text-slate-900">{espacio.horas} h</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AutoridadDashboard;
