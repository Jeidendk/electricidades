import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, BookOpen, Calendar, ArrowRight,
  DoorOpen, GraduationCap, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell,
} from 'recharts';
import { PageHero } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { useAuthStore } from '../../../store/authStore';
import { useClasesStore } from '../../../store/clasesStore';
import { useMateriasStore } from '../../../store/materiasStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { componerNombreCompleto } from '../../../lib/texto';
import {
  calcularKpisDocente,
  horasPorDiaSemana,
  distribucionPorMateria,
  type ClaseDocente,
} from '../utils/docenteDashboardMetrics';
import { DocenteScheduleCard, type AsignaturaDocenteItem } from '../components/DocenteScheduleCard';
import { DocenteQuickActions } from '../components/DocenteQuickActions';

const TituloTarjeta = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <h3 className="text-xs font-bold text-gray-800">{children}</h3>
    <Info className="w-3.5 h-3.5 text-gray-400" />
  </div>
);

const TooltipGrafico = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-2.5 rounded-xl shadow-lg border border-gray-100">
      <p className="text-[11px] font-bold text-gray-800 mb-1">{label}</p>
      {payload.map((entrada: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px] font-medium text-gray-600 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entrada.color || entrada.fill }} />
          <span>{entrada.name}:</span>
          <span className="font-bold text-gray-900">{entrada.value} hrs</span>
        </div>
      ))}
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

  // Si el usuario autenticado es docente, filtrar por su ID o nombre; si es admin en modo inspección, mostrar todas o las asignadas
  const misClases = useMemo<ClaseDocente[]>(() => {
    const listado = (clases as any[]) || [];

    let filtradas = listado;
    if (authUser?.role === 'docente' && authUser.id) {
      const docenteId = authUser.id;
      const nombreUsuario = (authUser.nombre || '').toLowerCase();

      const porId = listado.filter(c => c.id_docente === docenteId);
      if (porId.length > 0) {
        filtradas = porId;
      } else {
        // Fallback por nombre si el id no coincide directamente
        filtradas = listado.filter(c => {
          const docNom = [c.docentes?.nombre, c.docentes?.apellido].filter(Boolean).join(' ').toLowerCase();
          return docNom && (docNom.includes(nombreUsuario) || nombreUsuario.includes(docNom));
        });
        if (filtradas.length === 0) filtradas = listado; // fallback demostrativo para vista previa
      }
    }

    return filtradas.map(c => ({
      id: String(c.id),
      id_docente: c.id_docente || '',
      docente_nombre: [c.docentes?.titulo, componerNombreCompleto(c.docentes?.nombre, c.docentes?.apellido)].filter(Boolean).join(' ') || 'Docente',
      materia_id: c.id_materia || '',
      materia_nombre: c.materias?.nombre || 'Materia sin asignar',
      materia_codigo: c.materias?.codigo || 'MAT-000',
      espacio_nombre: c.espacios?.nombre || 'Aula por asignar',
      espacio_tipo: c.espacios?.tipo || 'Aula',
      edificio_nombre: c.espacios?.id_edificio || 'Campus',
      dia: c.dia || 'Lunes',
      hora_inicio: (c.hora_inicio || '07:00').slice(0, 5),
      hora_fin: (c.hora_fin || '09:00').slice(0, 5),
      paralelo: c.paralelo || 1,
      semestre: c.materias?.semestre,
    }));
  }, [clases, authUser]);

  const kpis = useMemo(() => calcularKpisDocente(misClases), [misClases]);
  const horasPorDia = useMemo(() => horasPorDiaSemana(misClases), [misClases]);
  const repartoMaterias = useMemo(() => distribucionPorMateria(misClases), [misClases]);

  const nombreDocente = authUser?.nombre ? authUser.nombre.split(' ')[0] : 'Docente';

  // Obtener materias agrupadas para tarjetas de cursos
  const asignaturasUnicas = useMemo<AsignaturaDocenteItem[]>(() => {
    const mapa = new Map<string, AsignaturaDocenteItem>();

    for (const c of misClases) {
      const key = c.materia_nombre;
      if (!mapa.has(key)) {
        mapa.set(key, {
          codigo: c.materia_codigo,
          nombre: c.materia_nombre,
          clasesCount: 0,
          espacios: new Set(),
          paralelos: new Set(),
        });
      }
      const entry = mapa.get(key)!;
      entry.clasesCount += 1;
      if (c.espacio_nombre) entry.espacios.add(c.espacio_nombre);
      if (c.paralelo) entry.paralelos.add(c.paralelo);
    }

    return Array.from(mapa.values());
  }, [misClases]);

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb] overflow-hidden">
      <PageHero
        icon={GraduationCap}
        title={`Bienvenido, Profesor ${nombreDocente}`}
        subtitle="Planificación académica, gestión de clases, asignación de laboratorios y recursos docentes."
        stats={[
          { Icon: Clock, value: `${kpis.totalHorasSemanales}h`, label: 'Carga Semanal' },
          { Icon: BookOpen, value: kpis.totalMaterias, label: 'Materias' },
          { Icon: Calendar, value: kpis.totalClases, label: 'Clases' },
          { Icon: DoorOpen, value: kpis.totalEspacios, label: 'Aulas / Labs' },
        ]}
        backgroundImage={HERO_BG.docente}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 lg:p-5 flex flex-col gap-3 lg:gap-4">

        {/* FILA 1: GRÁFICOS ANALÍTICOS DE LA CARGA DOCENTE */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 shrink-0">

          {/* Gráfico de Horas por Día */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col h-[220px]">
            <div className="flex items-center justify-between mb-2">
              <TituloTarjeta>Carga Horaria Semanal por Día</TituloTarjeta>
              <span className="text-[10px] font-semibold text-gray-400">Total: {kpis.totalHorasSemanales} horas / semana</span>
            </div>

            {misClases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Clock className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-[11px] font-bold text-gray-500">No hay horarios registrados</p>
              </div>
            ) : (
              <div className="w-full flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={horasPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                    <RechartsTooltip content={<TooltipGrafico />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="horas" name="Horas" fill="#B00020" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Distribución por Materia */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col h-[220px]">
            <div className="mb-2">
              <TituloTarjeta>Distribución por Asignatura</TituloTarjeta>
            </div>

            {misClases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <BookOpen className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-[11px] font-bold text-gray-500">Sin asignaturas registradas</p>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-3 min-h-0">
                <div className="relative w-[110px] h-[110px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={repartoMaterias} cx="50%" cy="50%" innerRadius={34} outerRadius={52} paddingAngle={3} dataKey="horas" stroke="none">
                        {repartoMaterias.map((porcion, i) => <Cell key={i} fill={porcion.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[8px] font-bold text-gray-400 mb-0.5">Materias</span>
                    <span className="text-sm font-bold text-gray-800 leading-none">{kpis.totalMaterias}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full overflow-y-auto max-h-[140px] custom-scrollbar pr-1">
                  {repartoMaterias.map(porcion => (
                    <div key={porcion.name} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: porcion.color }} />
                        <span className="text-[10px] font-medium text-gray-700 truncate" title={porcion.name}>{porcion.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-bold text-gray-900">{porcion.horas}h</span>
                        <span className="text-[9px] text-gray-400">({porcion.porcentaje})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FILA 2: MIS CURSOS / ASIGNATURAS ACTIVAS */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Mis Asignaturas y Aulas Asignadas</h3>
              <span className="bg-red-50 text-espoch-red border border-red-200/50 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {asignaturasUnicas.length} asignaturas
              </span>
            </div>
            <button
              onClick={() => navigate('/docente/horarios')}
              className="text-[11px] font-bold text-espoch-red hover:underline flex items-center gap-1"
            >
              Ver grilla de horarios <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {asignaturasUnicas.length === 0 ? (
            <p className="text-[11px] text-gray-400 py-4 text-center">No se han registrado asignaturas asociadas a este docente.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {asignaturasUnicas.map(asig => (
                <DocenteScheduleCard key={asig.nombre} asignatura={asig} />
              ))}
            </div>
          )}
        </div>

        {/* FILA 3: ACCESOS DIRECTOS Y HERRAMIENTAS DOCENTES */}
        <DocenteQuickActions />

      </div>
    </div>
  );
};
