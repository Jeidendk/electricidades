import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, ChevronLeft, BookOpen, User, Clock, Info, FlaskConical, Users, MapPin } from 'lucide-react';
import { dias, horas } from '../../admin/components/Horarios/horariosData';
import { mismoDia } from '../../../lib/texto';
import { studentInfo, materiaColors } from '../data/studentSchedule';
import { useAuthStore } from '../../../store/authStore';
import { useHorarioEstudianteStore, type HorarioEstudianteItem } from '../../../store/horarioEstudianteStore';
import Swal from 'sweetalert2';

const hexToRgba = (hex: string, opacity: number) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` : `rgba(0,0,0,${opacity})`;
};

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const tipoIcons: Record<string, any> = {
  'normal': BookOpen,
  'laboratorio': FlaskConical,
  'tutoría': Users,
};

const tipoLabels: Record<string, string> = {
  'normal': 'Clase teórica',
  'laboratorio': 'Laboratorio',
  'tutoría': 'Tutoría',
};

export const HorariosEstudiante = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return d >= 1 && d <= 5 ? d - 1 : 0;
  });
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const today = new Date();

  const { user } = useAuthStore();
  const { items: clases, fetchHorario, fetchHorarioAuto } = useHorarioEstudianteStore();

  // Encabezado con datos reales del estudiante (fallback al mock si faltan).
  const periodo = studentInfo.periodo;
  const carreraLabel = user?.carreraNombre || studentInfo.carrera;
  const paoLabel = user?.pao != null ? `PAO ${user.pao}` : studentInfo.semestre;

  useEffect(() => {
    if (user?.carreraId && user?.pao != null) {
      // Horario automático por carrera + PAO (no requiere inscripción manual).
      fetchHorarioAuto(user.carreraId, user.pao);
    } else if (user?.id) {
      // Fallback: inscripciones manuales (horario_estudiante).
      fetchHorario(user.id);
    }
  }, [user, fetchHorario, fetchHorarioAuto]);

  // Mini calendar helpers
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();

  const calendarGrid = useMemo(() => {
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
  }, [calMonth, calYear, daysInMonth, firstDayOfMonth]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  // Summaries
  const materiaSummary = useMemo(() => {
    const summary: Record<string, { count: number, horas: number }> = {};
    clases.forEach(c => {
      if (!summary[c.materia]) {
        summary[c.materia] = { count: 0, horas: 0 };
      }
      summary[c.materia].count++;
      
      const start = new Date(`1970-01-01T${c.horaInicio}:00Z`);
      const end = new Date(`1970-01-01T${c.horaFin}:00Z`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      summary[c.materia].horas += hours;
    });
    return summary;
  }, [clases]);
  const totalClases = clases.length;
  const totalMaterias = Object.keys(materiaSummary).length;
  const labCount = clases.filter(c => c.tipo === 'laboratorio').length;
  const normalCount = clases.filter(c => c.tipo === 'normal').length;
  const tutoriaCount = clases.filter(c => c.tipo === 'tutoría').length;

  // Workload
  const maxHours = horas.length * dias.length;
  const workloadPercent = Math.round((totalClases / maxHours) * 100);

  // Visible columns
  const visibleDays = viewMode === 'week' ? dias : [dias[selectedDay]];

  // Get classes for a specific day
  const getClasesForDay = (dia: string) => clases.filter(c => mismoDia(c.dia, dia));

  /** Pide confirmación antes de salir del horario y abrir el mapa en ese espacio. */
  const confirmarIrAlAula = async (aula: string, tipo: HorarioEstudianteItem['tipo']) => {
    if (!aula || aula === 'Sin aula') {
      Swal.fire({
        icon: 'info',
        title: 'Sin aula asignada',
        text: 'Esta clase todavía no tiene un espacio asignado, así que no se puede ubicar en el mapa.',
        confirmButtonColor: '#B00020',
      });
      return;
    }

    const esLaboratorio = tipo === 'laboratorio';
    const confirmacion = await Swal.fire({
      icon: 'question',
      title: `¿Ir a ${aula}?`,
      text: `Te llevamos al mapa para ubicar ${esLaboratorio ? 'este laboratorio' : 'esta aula'}.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, ver en el mapa',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B00020',
      cancelButtonColor: '#64748b',
    });

    if (confirmacion.isConfirmed) navigate(`/student/map?aula=${encodeURIComponent(aula)}`);
  };

  // Donut chart by materia
  const DonutChart = () => {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const entries = Object.entries(materiaSummary);

    return (
      <svg viewBox="0 0 120 120" className="w-[120px] h-[120px]">
        {entries.map(([materia, data]) => {
          const color = materiaColors[materia] || '#9ca3af';
          const pct = data.count / totalClases;
          const dashLength = pct * circumference;
          const segment = (
            <circle
              key={materia}
              cx="60" cy="60" r={radius}
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset}
              className="transition-all duration-700"
            />
          );
          offset += dashLength;
          return segment;
        })}
        <text x="60" y="54" textAnchor="middle" className="fill-gray-900 text-[26px] font-black">{totalClases}</text>
        <text x="60" y="72" textAnchor="middle" className="fill-gray-500 text-[10px] font-bold">Clases</text>
      </svg>
    );
  };

  return (
    <div className="flex-1 flex min-h-0 relative overflow-hidden h-full">
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 bg-[#f4f7fb]">

        {/* HERO BANNER - UNIFIED */}
        <div className="w-full bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-5 border-b border-gray-800">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
          
          <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
                <CalendarDays className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[21px] md:text-[25px] font-black text-white tracking-tight leading-none mb-1.5">
                  Mi Horario
                </h2>
                <p className="text-[13px] text-gray-400 font-medium">
                  {carreraLabel} — {paoLabel} — {periodo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">{totalClases}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Total clases</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/10 mx-1"></div>
              
              <div className="flex items-center gap-3">
                <FlaskConical className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">{labCount}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Prácticas</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">{workloadPercent}%</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Carga semanal</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-[#212730] px-4 py-2 rounded-full border border-white/5">
              <span className="hover:text-gray-200 cursor-pointer transition-colors">INICIO</span>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <span className="text-espoch-yellow">HORARIOS</span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex w-full p-6 lg:p-8 gap-6 items-start overflow-hidden">

          {/* SIDEBAR */}
          <aside className="w-[260px] shrink-0 hidden lg:flex flex-col gap-5 h-full overflow-y-auto custom-scrollbar pr-1">

            {/* Mini Calendar */}
            <div className="bg-white/70 backdrop-blur-xl border border-gray-200/60 shadow-sm rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-black text-gray-900">{MONTH_NAMES[calMonth]} {calYear}</h3>
                <div className="flex items-center gap-1">
                  <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {DAY_LABELS.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">{d}</div>
                ))}
                {calendarGrid.map((day, i) => {
                  const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                  return (
                    <div
                      key={i}
                      className={`text-center text-[11px] font-bold py-1.5 rounded-lg cursor-pointer transition-all
                        ${!day ? '' : isToday ? 'bg-espoch-red text-white shadow-md scale-105' : 'text-gray-700 hover:bg-gray-100'}
                      `}
                    >
                      {day || ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Class Summary */}
            <div className="bg-white/70 backdrop-blur-xl border border-gray-200/60 shadow-sm rounded-2xl p-5">
              <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-wider mb-1">Resumen de clases</h3>
              <p className="text-[11px] text-gray-500 font-medium mb-4">Periodo {studentInfo.periodo}</p>
              <div className="flex justify-center mb-4">
                <DonutChart />
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(materiaSummary).map(([materia, data]) => {
                  const color = materiaColors[materia] || '#9ca3af';
                  return (
                    <div key={materia} className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }}></span>
                      <span className="text-[10px] font-bold text-gray-600 flex-1 truncate" title={materia}>{materia}</span>
                      <span className="text-[10px] font-black text-gray-900">{data.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Class types breakdown */}
            <div className="bg-white/70 backdrop-blur-xl border border-gray-200/60 shadow-sm rounded-2xl p-5">
              <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-wider mb-3">Tipo de actividad</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-gray-800 block">Clases teóricas</span>
                    <span className="text-[10px] text-gray-500 font-medium">{normalCount} horas/semana</span>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center">{normalCount}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-gray-800 block">Laboratorios</span>
                    <span className="text-[10px] text-gray-500 font-medium">{labCount} horas/semana</span>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center">{labCount}</span>
                </div>
                {tutoriaCount > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[11px] font-bold text-gray-800 block">Tutorías</span>
                      <span className="text-[10px] text-gray-500 font-medium">{tutoriaCount} hora/semana</span>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-[10px] font-black flex items-center justify-center">{tutoriaCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Workload */}
            <div className="bg-white/70 backdrop-blur-xl border border-gray-200/60 shadow-sm rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-wider">Carga horaria</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  workloadPercent > 60 ? 'bg-amber-100 text-amber-700' : workloadPercent > 40 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {workloadPercent > 60 ? 'Alta' : workloadPercent > 40 ? 'Moderada' : 'Ligera'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mb-3">
                {totalClases} hrs/semana — {totalMaterias} materias
              </p>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    workloadPercent > 60 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : workloadPercent > 40 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  }`}
                  style={{ width: `${workloadPercent}%` }}
                ></div>
              </div>
              <span className="text-[11px] font-bold text-gray-400 mt-1.5 block">{workloadPercent}% de capacidad semanal</span>
              {workloadPercent > 50 && (
                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-semibold text-amber-700 leading-relaxed">Tu horario está bastante cargado. Recuerda organizar tus tiempos de estudio.</p>
                </div>
              )}
            </div>
          </aside>

          {/* CALENDAR GRID */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

            {/* Toolbar */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-sm p-4 mb-4 shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const todayIdx = new Date().getDay();
                    const mapped = todayIdx >= 1 && todayIdx <= 5 ? todayIdx - 1 : 0;
                    setSelectedDay(mapped);
                  }}
                  className="px-4 py-2 bg-white rounded-xl text-[12px] font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Hoy
                </button>
                <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedDay(Math.min(dias.length - 1, selectedDay + 1))}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[14px] font-black text-gray-900 ml-1">
                  {viewMode === 'day' ? dias[selectedDay] : 'Semana Académica'} — Periodo {studentInfo.periodo}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 shadow-sm p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                    viewMode === 'day' ? 'bg-espoch-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  Día
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                    viewMode === 'week' ? 'bg-espoch-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  Semana
                </button>
              </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">

              {/* Day Headers */}
              <div className="flex shrink-0 border-b border-gray-200">
                <div className="w-[72px] shrink-0 px-3 py-4 text-center text-[10px] font-bold text-gray-400 uppercase bg-gray-50/70 border-r border-gray-200 flex items-center justify-center">
                  GMT-5
                </div>
                {visibleDays.map((dia, idx) => {
                  const dayIndex = viewMode === 'week' ? idx : selectedDay;
                  const todayDayIdx = today.getDay() >= 1 && today.getDay() <= 5 ? today.getDay() - 1 : -1;
                  const isSelectedToday = dayIndex === todayDayIdx;
                  const clasesCount = getClasesForDay(dia).length;
                  const dateNum = today.getDate() + dayIndex - todayDayIdx;
                  return (
                    <div
                      key={dia}
                      className={`flex-1 px-4 py-3 border-r border-gray-200 last:border-r-0 cursor-pointer transition-colors flex items-center gap-3 ${
                        isSelectedToday ? 'bg-espoch-red/5' : 'bg-gray-50/70 hover:bg-gray-100/50'
                      }`}
                      onClick={() => { setSelectedDay(dayIndex); if (viewMode === 'week') setViewMode('day'); }}
                    >
                      <span className={`text-[13px] font-black uppercase ${isSelectedToday ? 'text-espoch-red' : 'text-gray-800'}`}>
                        {dia.substring(0, 3).toUpperCase()}
                      </span>
                      <span className={`text-[15px] font-black inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                        isSelectedToday ? 'bg-espoch-red text-white shadow-md' : 'text-gray-700'
                      }`}>
                        {dateNum}
                      </span>
                      {clasesCount > 0 && (
                        <span className="text-[11px] font-bold text-gray-400">{clasesCount} clases</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time Grid */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="flex min-h-full pt-3">

                  {/* Time labels column */}
                  <div className="w-[72px] shrink-0 border-r border-gray-200 relative">
                    {horas.map((hora) => (
                      <div key={hora} className="h-[115px] relative">
                        <span className="absolute -top-[8px] right-3 text-[10px] font-bold text-gray-400">{hora.split(' - ')[0]}</span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {visibleDays.map((dia) => {
                    const clasesDelDia = getClasesForDay(dia);
                    return (
                      <div key={dia} className="flex-1 border-r border-gray-200 last:border-r-0 relative">
                        {/* Hour grid lines */}
                        {horas.map((hora) => (
                          <div key={hora} className="h-[115px] border-b border-gray-100 hover:bg-gray-50/30 transition-colors"></div>
                        ))}

                        {/* Class cards */}
                        {clasesDelDia.map(clase => {
                          const horaIndex = horas.indexOf(clase.horaInicio);
                          if (horaIndex === -1) return null;

                          const color = materiaColors[clase.materia] || '#9ca3af';
                          const TipoIcon = tipoIcons[clase.tipo] || BookOpen;
                          const top = horaIndex * 115 + 4;

                          return (
                            <div
                              key={clase.id}
                              className="absolute left-1 right-1 rounded-xl border-l-[3px] p-2 cursor-default hover:shadow-lg transition-all group z-10"
                              style={{
                                top: `${top}px`,
                                height: '107px',
                                backgroundColor: hexToRgba(color, 0.07),
                                borderLeftColor: color,
                              }}
                            >
                              <div className="flex flex-col h-full justify-center gap-1 overflow-hidden">
                                <div className="flex items-center gap-1.5">
                                  <TipoIcon className="w-3.5 h-3.5 shrink-0" style={{ color }} strokeWidth={2.5} />
                                  <span className="text-[12px] font-black truncate leading-tight" style={{ color }} title={clase.materia}>
                                    {clase.materia}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 ml-5">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); confirmarIrAlAula(clase.aula, clase.tipo); }}
                                    title={`Ver ${clase.aula} en el mapa`}
                                    className="text-[10px] font-semibold text-gray-600 flex items-center gap-1 truncate rounded-md px-1 -ml-1 hover:bg-white hover:text-espoch-red hover:underline transition-colors"
                                  >
                                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" /> {clase.aula}
                                  </button>
                                  <span
                                    className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                    style={{ backgroundColor: hexToRgba(color, 0.12), color }}
                                  >
                                    {tipoLabels[clase.tipo]}
                                  </span>
                                </div>
                                <span className="text-[10px] font-semibold text-gray-600 flex items-center gap-1 truncate ml-5" title={clase.docente}>
                                  <User className="w-3 h-3 text-gray-400 shrink-0" /> {clase.docente}
                                </span>
                                <span className="text-[9px] font-bold flex items-center gap-1 ml-5" style={{ color }}>
                                  <Clock className="w-3 h-3 shrink-0" /> {clase.horaInicio} - {clase.horaFin}
                                </span>
                              </div>
                              {/* Hover: Go to map button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); confirmarIrAlAula(clase.aula, clase.tipo); }}
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:scale-110 bg-white border border-gray-200 text-gray-500 hover:text-espoch-red hover:border-espoch-red/30"
                                title={`Ver ${clase.aula} en el mapa`}
                              >
                                <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
