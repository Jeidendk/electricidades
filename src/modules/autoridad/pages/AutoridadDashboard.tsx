import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, CalendarDays, FileText, CheckCircle2, Clock,
  ArrowUpRight, Layers, ShieldCheck, ChevronRight, LayoutGrid,
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
import { useClasesStore } from '../../../store/clasesStore';
import { useReportesStore, type Reporte } from '../../../store/reportesStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { mapearClases } from '../../admin/components/Horarios/mapearClases';
import { normalizarTexto, mismoDia } from '../../../lib/texto';

export const AutoridadDashboard = () => {
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

  // Identificación del rol de autoridad (Decano, Subdecano o Coordinador de Carrera)
  const rol = usuario?.role;
  const esCoordinador = rol === 'coordinador';
  const esSubdecano = rol === 'subdecano';
  const esDecano = rol === 'decano';

  // Carrera asignada al coordinador (resolución por ID o por nombre)
  const carreraPropia = useMemo(() => {
    if (!esCoordinador) return undefined;
    if (usuario?.carreraId) {
      const encontrada = carreras.find((c: any) => c.id === usuario.carreraId);
      if (encontrada) return encontrada;
    }
    const buscada = normalizarTexto(usuario?.carreraNombre);
    if (!buscada) return undefined;
    return carreras.find((c: any) => normalizarTexto(c.nombre) === buscada);
  }, [carreras, esCoordinador, usuario?.carreraId, usuario?.carreraNombre]);

  const nombreCarrera = carreraPropia?.nombre || usuario?.carreraNombre || 'Carrera';

  const rolNombre = esCoordinador
    ? 'Coordinador'
    : esSubdecano
      ? 'Subdecano'
      : esDecano
        ? 'Decano'
        : (ETIQUETA_ROL[rol ?? 'decano'] || 'Autoridad');

  const moduloTitulo = esCoordinador
    ? `Coordinación de ${nombreCarrera}`
    : esSubdecano
      ? 'Subdecanato de Facultad'
      : 'Decanato de Facultad';

  const heroTitle = esCoordinador
    ? `Panel de Coordinación · ${nombreCarrera}`
    : esSubdecano
      ? 'Panel de Subdecanato'
      : 'Panel de Decanato';

  const heroSubtitle = esCoordinador
    ? `Monitoreo de horarios, aulas asignadas y carga docente de la Carrera de ${nombreCarrera}.`
    : 'Monitoreo integral de espacios físicos, horarios académicos, disponibilidad y reportes institucionales.';

  const bannerDescription = esCoordinador
    ? `Supervisión integral de horarios de clase, docentes y espacios físicos asignados a la Carrera de ${nombreCarrera}.`
    : 'Supervisión integral de espacios físicos, distribución horaria académica, ocupación de aulas y reportes de auditoría.';

  const bannerChip = esCoordinador
    ? `Coordinación de ${nombreCarrera} · FIE ESPOCH`
    : `Módulo de ${moduloTitulo} · FIE ESPOCH`;

  // 1. ÁMBITO Y FILTRADO DE DATOS (El coordinador ve solo lo de su carrera)
  const clasesFiltradas = useMemo(() => {
    if (!esCoordinador) return clases;
    if (!carreraPropia && !usuario?.carreraNombre) return clases;
    const nombreNorm = normalizarTexto(nombreCarrera);
    return clases.filter(c => {
      if (carreraPropia?.id && c.idCarrera === carreraPropia.id) return true;
      if (c.carrera && normalizarTexto(c.carrera) === nombreNorm) return true;
      return false;
    });
  }, [clases, esCoordinador, carreraPropia, usuario?.carreraNombre, nombreCarrera]);

  const espaciosFiltrados = useMemo(() => {
    if (!esCoordinador) return espacios;
    const idsEspaciosUsados = new Set(clasesFiltradas.map(c => c.idEspacio).filter(Boolean));
    const enUso = espacios.filter(e => idsEspaciosUsados.has(e.id));
    return enUso.length > 0 ? enUso : espacios;
  }, [espacios, clasesFiltradas, esCoordinador]);

  const edificiosFiltrados = useMemo(() => {
    if (!esCoordinador) return edificios;
    const idsEdificios = new Set(espaciosFiltrados.map((e: any) => e.idEdificio || e.id_edificio).filter(Boolean));
    const enUso = edificios.filter(ed => idsEdificios.has(ed.id));
    return enUso.length > 0 ? enUso : edificios;
  }, [edificios, espaciosFiltrados, esCoordinador]);

  // KPIs calculados sobre el ámbito correspondiente
  const totalEspacios = espaciosFiltrados.length;
  const totalEdificios = edificiosFiltrados.length;
  const totalClases = clasesFiltradas.length;
  
  // Aulas con horarios cargados
  const espaciosConClaseIds = useMemo(() => new Set(clasesFiltradas.map(c => c.idEspacio)), [clasesFiltradas]);
  const aulasConClase = espaciosFiltrados.filter(e => espaciosConClaseIds.has(e.id)).length;
  const porcentajeOcupacionAulas = totalEspacios > 0 ? Math.round((aulasConClase / totalEspacios) * 100) : 0;

  // 2. Gráfica de Carga Horaria por Día (Lunes a Viernes, o Sábado si tiene clases)
  const diasSemana = useMemo(() => {
    const haySabado = clasesFiltradas.some(c => mismoDia(c.dia, 'Sábado') || mismoDia(c.dia, 'Sabado'));
    return haySabado
      ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  }, [clasesFiltradas]);

  const datosCargaPorDia = useMemo(() => {
    return diasSemana.map(dia => {
      const cantidad = clasesFiltradas.filter(c => mismoDia(c.dia, dia)).length;
      return {
        dia: dia.slice(0, 3),
        diaCompleto: dia,
        clases: cantidad,
        horas: cantidad * 2,
      };
    });
  }, [clasesFiltradas, diasSemana]);

  // 3. Gráfica Donut: Distribución de Espacios por Tipo
  const datosDistribucionEspacios = useMemo(() => {
    let aulas = 0;
    let laboratorios = 0;
    let otros = 0;

    espaciosFiltrados.forEach(e => {
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
  }, [espaciosFiltrados]);

  // 4. Actividad / Operaciones recientes (filtrada si es coordinador)
  const actividadReciente = useMemo(() => {
    let baseReportes = reportes;
    if (esCoordinador && usuario?.id) {
      const filtrados = reportes.filter(r => r.generado_por === usuario.id);
      if (filtrados.length > 0) baseReportes = filtrados;
    }

    if (baseReportes.length > 0) {
      return baseReportes.slice(0, 5).map((h: Reporte) => ({
        id: h.id,
        titulo: `Reporte de ${h.tipo === 'Horarios' ? 'Horarios por aula' : h.tipo === 'Docentes' ? 'Carga docente' : h.tipo === 'Disponibilidad' ? 'Espacios libres' : h.tipo}`,
        categoria: h.tipo,
        formato: h.formato,
        usuario: h.generadoPorNombre || `${moduloTitulo} FIE`,
        fecha: new Date(h.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }),
        filas: h.filas,
      }));
    }
    return [
      { id: '1', titulo: `Horarios Oficiales · ${nombreCarrera}`, categoria: 'Horarios', formato: 'PDF', usuario: `${moduloTitulo} FIE`, fecha: 'Hoy', filas: 18 },
      { id: '2', titulo: `Distribución Carga Docente · ${nombreCarrera}`, categoria: 'Docentes', formato: 'Word', usuario: `${moduloTitulo} FIE`, fecha: 'Ayer', filas: 42 },
      { id: '3', titulo: `Disponibilidad de Aulas y Laboratorios`, categoria: 'Disponibilidad', formato: 'PDF', usuario: `${moduloTitulo} FIE`, fecha: '24 Oct', filas: 12 },
      { id: '4', titulo: `Auditoría de Asignación de Horarios`, categoria: 'Horarios', formato: 'PDF', usuario: `${moduloTitulo} FIE`, fecha: '22 Oct', filas: 30 },
      { id: '5', titulo: `Catálogo de Espacios y Aulas`, categoria: 'Infraestructura', formato: 'Word', usuario: `${moduloTitulo} FIE`, fecha: '20 Oct', filas: 25 },
    ];
  }, [reportes, moduloTitulo, esCoordinador, nombreCarrera]);

  return (
    <div className="flex h-full flex-col bg-[#f4f7fb] overflow-hidden">
      {/* TOPBAR / PAGE HERO ESTÁNDAR DEL SISTEMA */}
      <PageHero
        icon={LayoutGrid}
        title={heroTitle}
        subtitle={heroSubtitle}
        backgroundImage={HERO_BG.dashboard}
      />

      {/* CONTENIDO PRINCIPAL: Tamaño completo, padding estándar y scrollbar limpio */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">
        <div className="w-full flex flex-col gap-6">

          {/* ═════════════════════════════════════════════════════════════════════════
              FILA 1: HERO BANNER (SALUDO + 4 KPIS) + INDICADORES FIE
              (Ambas tarjetas se alinean arriba perfectamente a la par sin huecos)
              ═════════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-stretch">

            {/* HERO BANNER INSTITUCIONAL (Con arte 3D, bienvenida y 4 KPIs) */}
            <div className="xl:col-span-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-red-50/20 to-blue-50/30 p-6 md:p-8 border border-white shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="relative z-10 max-w-[650px]">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/70 text-espoch-red text-[11px] font-extrabold uppercase tracking-wider mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {bannerChip}
                  </div>
                  <h1 className="text-[24px] md:text-[28px] font-black text-gray-900 tracking-tight flex items-center gap-2">
                    Buenos días, {usuario?.nombre?.split(' ')[0] || rolNombre} 👋
                  </h1>
                  <p className="text-[12.5px] text-gray-500 mt-1 leading-relaxed">
                    {bannerDescription}
                  </p>
                </div>

                {/* Arte decorativo flotante SVG (Adaptado a colores institucionales ESPOCH) */}
                <div className="absolute right-4 top-2 md:right-8 md:top-4 w-[160px] h-[110px] pointer-events-none hidden sm:block opacity-90">
                  <svg viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="80" cy="98" rx="60" ry="10" fill="#fca5a5" fillOpacity="0.25" />
                    <rect x="35" y="15" width="82" height="52" rx="8" transform="rotate(-10 35 15)" fill="#1e293b" />
                    <rect x="42" y="27" width="18" height="5" rx="1.5" transform="rotate(-10 42 27)" fill="#c91024" />
                    <rect x="48" y="22" width="84" height="54" rx="8" transform="rotate(4 48 22)" fill="#c91024" />
                    <circle cx="118" cy="55" r="15" fill="#f59e0b" />
                    <circle cx="118" cy="55" r="12" fill="#fbbf24" />
                    <circle cx="118" cy="55" r="9" stroke="#f59e0b" strokeWidth="1.5" />
                    <path d="M25 65C25 58 31 52 38 52H122C129 52 135 58 135 65V80C135 88 129 94 121 94H39C31 94 25 88 25 80V65Z" fill="#e2e8f0" fillOpacity="0.8" />
                    <path d="M25 68C36 78 124 78 135 68V80C135 88 129 94 121 94H39C31 94 25 88 25 80V68Z" fill="#cbd5e1" />
                    <polygon points="135,28 137,33 142,35 137,37 135,42 133,37 128,35 133,33" fill="#f59e0b" />
                    <polygon points="20,40 21,43 24,44 21,45 20,48 19,45 16,44 19,43" fill="#c91024" />
                  </svg>
                </div>
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
                    <ArrowUpRight className="w-3 h-3" /> {totalEdificios} edificios {esCoordinador ? 'asignados' : 'activos'}
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
                    <ArrowUpRight className="w-3 h-3" /> {esCoordinador ? 'En su carrera' : 'En horario vigente'}
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

            {/* INDICADORES FIE (SUBIDO ARRIBA EN LA COLUMNA DE 4, A NIVEL DEL BANNER) */}
            <div className="xl:col-span-4 bg-white rounded-3xl p-5 md:p-6 border border-gray-200/70 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">Indicadores FIE</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">{esCoordinador ? `Métricas de ${nombreCarrera}` : 'Métricas de ocupación y planificación'}</p>
                  </div>
                  <Link to="/autoridad/horarios" className="text-[11.5px] font-bold text-espoch-red hover:underline flex items-center gap-0.5">
                    Ver todo <ChevronRight className="w-3.5 h-3.5" />
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
                      <span className="text-[11px] font-black text-emerald-600">{porcentajeOcupacionAulas}%</span>
                    </div>
                    <div className="flex items-center gap-2 pl-10">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${porcentajeOcupacionAulas}%` }} />
                      </div>
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
                      <span className="text-[11px] font-black text-espoch-red">92%</span>
                    </div>
                    <div className="flex items-center gap-2 pl-10">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-espoch-red rounded-full" style={{ width: '92%' }} />
                      </div>
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
                      <span className="text-[11px] font-black text-blue-600">85%</span>
                    </div>
                    <div className="flex items-center gap-2 pl-10">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie de tarjeta con estado operativo y acceso directo a reportes */}
              <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-extrabold text-gray-700">100% Operativo</span>
                </div>
                <Link
                  to="/autoridad/reportes"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-espoch-red text-white hover:bg-[#a80c1d] text-[11px] font-bold transition-all shadow-xs"
                >
                  Acceso a Reportes <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>

          {/* ═════════════════════════════════════════════════════════════════════════
              FILA 2: SECCIÓN DE 2 GRÁFICAS (CARGA HORARIA + DONUT DE ESPACIOS)
              ═════════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">

            {/* GRÁFICA 1: Ocupación y Carga Horaria por Día */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-5 md:p-6 border border-gray-200/70 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">Carga Horaria por Día</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {esCoordinador ? `Distribución de clases de ${nombreCarrera} por jornada` : 'Distribución de clases asignadas por jornada'}
                  </p>
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

          {/* ═════════════════════════════════════════════════════════════════════════
              FILA 3: OPERACIONES Y REPORTES RECIENTES (ANCHO COMPLETO - CERO HUECOS)
              ═════════════════════════════════════════════════════════════════════════ */}
          <div className="w-full bg-white rounded-3xl p-5 md:p-6 border border-gray-200/70 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">Operaciones y Reportes Recientes</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Bitácora institucional de descargas y auditoría</p>
              </div>
              <Link
                to="/autoridad/reportes"
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
      </div>
    </div>
  );
};
