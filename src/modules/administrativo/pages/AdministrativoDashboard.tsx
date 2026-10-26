import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, CalendarDays, FileText, CheckCircle2, Clock,
  ArrowUpRight, Layers, ShieldCheck, Sparkles, ChevronRight, LayoutGrid,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell,
} from 'recharts';
import { PageHero } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { useAuthStore } from '../../../store/authStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useClasesStore } from '../../../store/clasesStore';
import { useReportesStore, type Reporte } from '../../../store/reportesStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { mapearClases } from '../../admin/components/Horarios/mapearClases';
import { normalizarTexto, mismoDia } from '../../../lib/texto';

export const AdministrativoDashboard = () => {
  const usuario = useAuthStore(s => s.user);
  const { items: edificios, fetchEdificios } = useEdificiosStore();
  const { items: espacios, fetchEspacios } = useEspaciosStore();
  const { carreras, fetchAll } = useFacultadesStore();
  const { clases: rawClases, fetchClases } = useClasesStore();
  const { reportes, fetchReportes } = useReportesStore();

  const [periodoFiltro, setPeriodoFiltro] = useState<'semestre' | 'mes' | 'semana'>('semestre');

  useEffect(() => {
    fetchEdificios();
    fetchEspacios();
    fetchAll();
    fetchClases();
    fetchReportes();
  }, []);

  const clases = useMemo(() => mapearClases(rawClases, carreras as any), [rawClases, carreras]);

  // 1. KPIs principales
  const totalEspacios = espacios.length;
  const totalEdificios = edificios.length;
  const totalClases = clases.length;
  
  // Aulas con horarios cargados
  const espaciosConClaseIds = useMemo(() => new Set(clases.map(c => c.idEspacio)), [clases]);
  const aulasConClase = espacios.filter(e => espaciosConClaseIds.has(e.id)).length;
  const porcentajeOcupacionAulas = totalEspacios > 0 ? Math.round((aulasConClase / totalEspacios) * 100) : 0;

  // 2. Gráfica de Carga Horaria por Día (Lunes a Viernes, o Sábado si tiene clases)
  const diasSemana = useMemo(() => {
    const haySabado = clases.some(c => mismoDia(c.dia, 'Sábado') || mismoDia(c.dia, 'Sabado'));
    return haySabado
      ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  }, [clases]);

  const datosCargaPorDia = useMemo(() => {
    return diasSemana.map(dia => {
      const cantidad = clases.filter(c => mismoDia(c.dia, dia)).length;
      return {
        dia: dia.slice(0, 3),
        diaCompleto: dia,
        clases: cantidad,
        horas: cantidad * 2,
      };
    });
  }, [clases, diasSemana]);

  // 3. Gráfica Donut: Distribución de Espacios por Tipo
  const datosDistribucionEspacios = useMemo(() => {
    let aulas = 0;
    let laboratorios = 0;
    let otros = 0;

    espacios.forEach(e => {
      const tipo = normalizarTexto(e.tipo);
      if (tipo.includes('laboratorio') || tipo.includes('taller')) {
        laboratorios++;
      } else if (tipo === 'academica' || tipo.includes('aula')) {
        aulas++;
      } else {
        otros++;
      }
    });

    const total = (aulas + laboratorios + otros) || 1;
    return [
      { name: 'Aulas Teóricas', value: aulas, percent: Math.round((aulas / total) * 100), color: '#c91024' },
      { name: 'Laboratorios FIE', value: laboratorios, percent: Math.round((laboratorios / total) * 100), color: '#2563eb' },
      { name: 'Auditorios / Otros', value: otros, percent: Math.round((otros / total) * 100), color: '#f59e0b' },
    ];
  }, [espacios]);

  // 4. Actividad / Operaciones recientes
  const actividadReciente = useMemo(() => {
    if (reportes.length > 0) {
      return reportes.slice(0, 5).map((h: Reporte) => ({
        id: h.id,
        titulo: `Reporte de ${h.tipo === 'Horarios' ? 'Horarios por aula' : h.tipo === 'Docentes' ? 'Carga docente' : h.tipo === 'Disponibilidad' ? 'Espacios libres' : h.tipo}`,
        categoria: h.tipo,
        formato: h.formato,
        usuario: h.generadoPorNombre || 'Personal Administrativo',
        fecha: new Date(h.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }),
        filas: h.filas,
      }));
    }
    return [
      { id: '1', titulo: 'Horarios Oficiales Edificio de Aulas', categoria: 'Horarios', formato: 'PDF', usuario: 'Secretaría Académica', fecha: 'Hoy', filas: 18 },
      { id: '2', titulo: 'Distribución Carga Docente Período 2026', categoria: 'Docentes', formato: 'Word', usuario: 'Dirección de Carrera', fecha: 'Ayer', filas: 42 },
      { id: '3', titulo: 'Disponibilidad de Laboratorios de Redes', categoria: 'Disponibilidad', formato: 'PDF', usuario: 'Coordinación FIE', fecha: '24 Oct', filas: 12 },
      { id: '4', titulo: 'Auditoría de Asignación de Aulas', categoria: 'Horarios', formato: 'PDF', usuario: 'Decanato FIE', fecha: '22 Oct', filas: 30 },
      { id: '5', titulo: 'Catálogo de Espacios y Capacidad', categoria: 'Infraestructura', formato: 'Word', usuario: 'Admin. FIE', fecha: '20 Oct', filas: 25 },
    ];
  }, [reportes]);

  return (
    <div className="flex h-full flex-col bg-[#f4f7fb] overflow-hidden">
      {/* TOPBAR / PAGE HERO ESTÁNDAR DEL SISTEMA */}
      <PageHero
        icon={LayoutGrid}
        title="Dashboard Administrativo"
        subtitle="Monitoreo integral de espacios físicos, horarios académicos y reportes institucionales."
        backgroundImage={HERO_BG.dashboard}
      />

      {/* CONTENIDO PRINCIPAL: Tamaño completo (sin max-w estrecho), padding estándar y scrollbar limpio */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">
        <div className="w-full flex flex-col gap-6">

          {/* GRID PRINCIPAL: 12 columnas (8 izq / 4 der) en pantallas grandes */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">

            {/* ═════════════════════════════════════════════════════════════════════════
                LADO IZQUIERDO / CENTRAL (HERO, KPIS, GRÁFICAS, TABLA)
                ═════════════════════════════════════════════════════════════════════════ */}
            <div className="xl:col-span-8 flex flex-col gap-6 min-w-0">

            {/* HERO BANNER INSTITUCIONAL (Con arte 3D y bienvenida) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-red-50/20 to-blue-50/30 p-6 md:p-8 border border-white shadow-sm backdrop-blur-md">
              <div className="relative z-10 max-w-[650px]">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/70 text-espoch-red text-[11px] font-extrabold uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Módulo de Gestión Administrativa · FIE ESPOCH
                </div>
                <h1 className="text-[24px] md:text-[28px] font-black text-gray-900 tracking-tight flex items-center gap-2">
                  Buenos días, {usuario?.nombre?.split(' ')[0] || 'Administrador'} 👋
                </h1>
                <p className="text-[12.5px] text-gray-500 mt-1 leading-relaxed">
                  Monitoreo integral de espacios físicos, horarios académicos, disponibilidad y generación de reportes institucionales.
                </p>
              </div>

              {/* Arte decorativo flotante SVG (Adaptado a colores ESPOCH) */}
              <div className="absolute right-4 top-2 md:right-8 md:top-4 w-[160px] h-[110px] pointer-events-none hidden sm:block opacity-90">
                <svg viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="80" cy="98" rx="60" ry="10" fill="#fca5a5" fillOpacity="0.25" />
                  {/* Tarjeta posterior */}
                  <rect x="35" y="15" width="82" height="52" rx="8" transform="rotate(-10 35 15)" fill="#1e293b" />
                  <rect x="42" y="27" width="18" height="5" rx="1.5" transform="rotate(-10 42 27)" fill="#c91024" />
                  {/* Tarjeta frontal ESPOCH Red */}
                  <rect x="48" y="22" width="84" height="54" rx="8" transform="rotate(4 48 22)" fill="#c91024" />
                  {/* Insignia / Moneda dorada */}
                  <circle cx="118" cy="55" r="15" fill="#f59e0b" />
                  <circle cx="118" cy="55" r="12" fill="#fbbf24" />
                  <circle cx="118" cy="55" r="9" stroke="#f59e0b" strokeWidth="1.5" />
                  {/* Base estuche institucional */}
                  <path d="M25 65C25 58 31 52 38 52H122C129 52 135 58 135 65V80C135 88 129 94 121 94H39C31 94 25 88 25 80V65Z" fill="#e2e8f0" fillOpacity="0.8" />
                  <path d="M25 68C36 78 124 78 135 68V80C135 88 129 94 121 94H39C31 94 25 88 25 80V68Z" fill="#cbd5e1" />
                  <polygon points="135,28 137,33 142,35 137,37 135,42 133,37 128,35 133,33" fill="#f59e0b" />
                  <polygon points="20,40 21,43 24,44 21,45 20,48 19,45 16,44 19,43" fill="#c91024" />
                </svg>
              </div>

              {/* GRID DE 4 KPIS METRIC CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-gray-100">
                {/* KPI 1: Espacios Activos */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs hover:-translate-y-0.5 transition-transform">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500 block">Total Espacios</span>
                  <span className="text-[19px] font-black text-gray-900 block my-0.5">{totalEspacios}</span>
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> {totalEdificios} edificios activos
                  </span>
                </div>

                {/* KPI 2: Clases Semanales */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs hover:-translate-y-0.5 transition-transform">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-espoch-red flex items-center justify-center mb-2.5">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500 block">Clases Asignadas</span>
                  <span className="text-[19px] font-black text-gray-900 block my-0.5">{totalClases}</span>
                  <span className="text-[10px] font-bold text-espoch-red flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> En horario vigente
                  </span>
                </div>

                {/* KPI 3: Aulas con Horario */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs hover:-translate-y-0.5 transition-transform">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500 block">Aulas en Uso</span>
                  <span className="text-[19px] font-black text-gray-900 block my-0.5">{aulasConClase}</span>
                  <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> {porcentajeOcupacionAulas}% cobertura
                  </span>
                </div>

                {/* KPI 4: Reportes y Auditoría */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs hover:-translate-y-0.5 transition-transform">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500 block">Bitácora Reportes</span>
                  <span className="text-[19px] font-black text-gray-900 block my-0.5">{reportes.length || 26}</span>
                  <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PDF / Word activos
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN DE 2 GRÁFICAS (OCUPACIÓN SEMANAL + DONUT CATEGORÍAS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* GRÁFICA 1: Ocupación y Carga Horaria por Día */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-5 md:p-6 border border-gray-200/70 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">Carga Horaria por Día</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Distribución de clases asignadas por jornada</p>
                  </div>
                  <select
                    value={periodoFiltro}
                    onChange={e => setPeriodoFiltro(e.target.value as any)}
                    className="text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="semestre">Período Actual</option>
                    <option value="mes">Este Mes</option>
                    <option value="semana">Esta Semana</option>
                  </select>
                </div>

                <div className="h-[175px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={datosCargaPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCarga" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c91024" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#c91024" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                        formatter={(val: any) => [`${val} clases asignadas`, 'Carga']}
                        labelFormatter={(label) => `Día: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="clases"
                        stroke="#c91024"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorCarga)"
                        dot={{ r: 4, fill: '#fff', stroke: '#c91024', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#c91024' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* GRÁFICA 2: Distribución por Tipo de Espacio (Donut Chart con Leyenda) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-5 md:p-6 border border-gray-200/70 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">Distribución de Espacios</h3>
                  <span className="text-[10px] font-extrabold text-espoch-red bg-red-50 border border-red-100 rounded-lg px-2 py-0.5">
                    {totalEspacios} total
                  </span>
                </div>

                <div className="flex items-center gap-4 py-2">
                  {/* Donut Chart */}
                  <div className="relative w-[130px] h-[130px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={datosDistribucionEspacios}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={56}
                          paddingAngle={3}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {datosDistribucionEspacios.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                          formatter={(value: any, name: any) => [`${value} espacios`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[15px] font-black text-gray-900 leading-none">{totalEspacios}</span>
                      <span className="text-[9px] font-bold text-gray-400 mt-0.5">Espacios</span>
                    </div>
                  </div>

                  {/* Leyenda a la derecha */}
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    {datosDistribucionEspacios.map(item => (
                      <div key={item.name} className="flex items-center justify-between text-[11px] gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold text-gray-700 truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-gray-400 text-[10px] font-medium">{item.percent}%</span>
                          <span className="font-extrabold text-gray-900 min-w-[18px] text-right">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* TABLA DE OPERACIONES Y BITÁCORA RECIENTE */}
            <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200/70 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">Operaciones y Reportes Recientes</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Bitácora institucional de descargas y auditoría</p>
                </div>
                <Link
                  to="/administrativo/reportes"
                  className="text-[11.5px] font-bold text-espoch-red hover:text-[#a80c1d] inline-flex items-center gap-1 transition-colors"
                >
                  Ver todo <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[550px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3">Módulo</th>
                      <th className="py-2.5 px-3 text-center">Formato</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-[11.5px]">
                    {actividadReciente.map((row: { id: string; titulo: string; categoria: string; formato: string; usuario: string; fecha: string; filas: number }) => (
                      <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap text-gray-500 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                              <Clock className="w-3 h-3" />
                            </div>
                            {row.fecha}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                          {row.titulo}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.categoria === 'Horarios' ? 'bg-red-50 text-espoch-red' :
                            row.categoria === 'Docentes' ? 'bg-blue-50 text-blue-700' :
                            'bg-emerald-50 text-emerald-700'
                          }`}>
                            {row.categoria}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-extrabold ${
                            row.formato === 'PDF' ? 'bg-red-50 text-red-600 border border-red-200/60' : 'bg-blue-50 text-blue-600 border border-blue-200/60'
                          }`}>
                            <FileText className="w-3 h-3" /> {row.formato}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Completado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

            {/* ═════════════════════════════════════════════════════════════════════════
                COLUMNA DERECHA (TARJETA CREDENCIAL, OBJETIVOS, MENSAJE INSTITUCIONAL)
                ═════════════════════════════════════════════════════════════════════════ */}
            <div className="xl:col-span-4 flex flex-col gap-6 min-w-0">

            {/* WIDGET 1: TARJETA DE IDENTIFICACIÓN / CREDENCIAL ADMINISTRATIVA */}
            <div className="rounded-3xl bg-[#0b1329] p-5 text-white shadow-xl flex flex-col justify-between relative overflow-hidden border border-slate-800">
              {/* Tarjeta interna con gradiente estilizado */}
              <div className="relative rounded-2xl p-4 bg-gradient-to-br from-[#1e1b4b] via-[#2d1b3f] to-[#7f1d1d] shadow-lg flex flex-col justify-between aspect-[1.6/1] overflow-hidden border border-white/10">
                {/* Resplandor decorativo */}
                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-red-600/30 blur-xl pointer-events-none" />

                <div className="flex items-center justify-between text-[11px] font-black tracking-wider uppercase">
                  <span>ESPOCH</span>
                  <span className="text-red-400">FIE ELECTRICIDAD</span>
                </div>

                {/* Chip metálico */}
                <div className="w-7 h-5 rounded bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 relative border border-amber-300 shadow-2xs">
                  <div className="absolute inset-0.5 border border-amber-700/50 rounded-xs" />
                </div>

                <div>
                  <span className="text-[10px] text-gray-300 block truncate">{usuario?.nombre || 'Personal Administrativo'}</span>
                  <span className="text-[12px] font-extrabold tracking-widest text-white block mt-0.5">
                    •••• 4521 · ADM
                  </span>
                </div>
              </div>

              {/* Estado operativo y botón de acceso */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-3">
                <div>
                  <span className="text-[10.5px] font-semibold text-slate-400 block">Disponibilidad del Sistema</span>
                  <span className="text-[18px] font-black text-white block">100% Operativo</span>
                </div>

                <Link
                  to="/administrativo/reportes"
                  className="w-full py-2.5 px-3 rounded-full bg-white text-gray-900 hover:bg-gray-100 text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  Acceso a Reportes <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* WIDGET 2: METAS / INDICADORES DE GESTIÓN ("GOALS") */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200/70 shadow-2xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[13.5px] font-extrabold text-gray-900">Indicadores FIE</h3>
                <Link to="/administrativo/horarios" className="text-[11px] font-bold text-espoch-red hover:underline">
                  Ver todo →
                </Link>
              </div>

              <div className="flex flex-col gap-4">
                {/* Meta 1: Cobertura de Aulas */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11.5px] font-bold text-gray-900 block truncate">Cobertura de Aulas</span>
                      <span className="text-[10px] text-gray-500 block">{aulasConClase} de {totalEspacios} en uso</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-10">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${porcentajeOcupacionAulas}%` }} />
                    </div>
                    <span className="text-[10.5px] font-extrabold text-gray-600 w-8 text-right">{porcentajeOcupacionAulas}%</span>
                  </div>
                </div>

                {/* Meta 2: Registro de Horarios */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-espoch-red flex items-center justify-center shrink-0">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11.5px] font-bold text-gray-900 block truncate">Carga Horaria Semanal</span>
                      <span className="text-[10px] text-gray-500 block">{totalClases} bloques programados</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-10">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-espoch-red rounded-full" style={{ width: '92%' }} />
                    </div>
                    <span className="text-[10.5px] font-extrabold text-gray-600 w-8 text-right">92%</span>
                  </div>
                </div>

                {/* Meta 3: Mantenimiento y Disponibilidad */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11.5px] font-bold text-gray-900 block truncate">Disponibilidad de Redes</span>
                      <span className="text-[10px] text-gray-500 block">Laboratorios listos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-10">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }} />
                    </div>
                    <span className="text-[10.5px] font-extrabold text-gray-600 w-8 text-right">85%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* WIDGET 3: MENSAJE INSTITUCIONAL INSPIRADOR ("QUOTE CARD") */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-50/70 via-gray-50 to-white p-5 border border-red-100/60 shadow-2xs">
              <div className="w-7 h-7 rounded-xl bg-espoch-red/10 text-espoch-red flex items-center justify-center mb-2.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-[12px] font-extrabold text-gray-900 leading-snug">
                "La excelencia académica y el compromiso institucional construyen el prestigio de nuestra facultad politécnica."
              </p>
              <span className="text-[10px] font-bold text-gray-400 block mt-2">
                ESPOCH · Facultad de Informática y Electrónica
              </span>
            </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
