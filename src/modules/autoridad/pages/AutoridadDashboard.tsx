import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Clock, Building2, GraduationCap, BookOpen, DoorOpen, Microscope,
  ChevronRight, CalendarDays, Eye,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { PageHero } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { AcentoTarjeta } from '../../../components/ui/AcentoTarjeta';
import { useAuthStore, ETIQUETA_ROL } from '../../../store/authStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { useMateriasStore } from '../../../store/materiasStore';
import { useClasesStore } from '../../../store/clasesStore';
import { mapearClases } from '../../admin/components/Horarios/mapearClases';
import { esAula, esLaboratorio } from '../../admin/data/espaciosData';
import { diasFormales } from '../../admin/components/Horarios/horariosData';
import { normalizarTexto, mismoDia } from '../../../lib/texto';

const Titulo = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">{children}</h3>
);

const Vacio = ({ mensaje }: { mensaje: string }) => (
  <div className="flex flex-1 items-center justify-center">
    <p className="text-[11.5px] italic text-gray-400">{mensaje}</p>
  </div>
);

export const AutoridadDashboard = () => {
  const navigate = useNavigate();
  const usuario = useAuthStore(s => s.user);

  const edificios = useEdificiosStore(s => s.items);
  const espacios = useEspaciosStore(s => s.items);
  const { carreras, facultades, fetchAll } = useFacultadesStore();
  const { materias, fetchMaterias } = useMateriasStore();
  const { clases: rawClases, fetchClases } = useClasesStore();

  useEffect(() => { fetchAll(); fetchMaterias(); fetchClases(); }, []);

  const clases = useMemo(() => mapearClases(rawClases, carreras as any), [rawClases, carreras]);

  /**
   * El coordinador ve SOLO su carrera; decano y subdecano, toda la facultad. Se resuelve por
   * `carrera_nombre` normalizado, igual que en Estructura Académica: con igualdad exacta un
   * acento distinto lo dejaba sin carrera.
   */
  const carreraPropia = useMemo(() => {
    if (usuario?.role !== 'coordinador') return undefined;
    const buscada = normalizarTexto(usuario?.carreraNombre);
    if (!buscada) return undefined;
    return carreras.find((c: any) => normalizarTexto(c.nombre) === buscada);
  }, [carreras, usuario?.role, usuario?.carreraNombre]);

  const acotado = usuario?.role === 'coordinador';
  const sinCarreraAsignada = acotado && !carreraPropia;

  const materiasVisibles = useMemo(
    () => (carreraPropia ? materias.filter((m: any) => m.id_carrera === carreraPropia.id) : acotado ? [] : materias),
    [materias, carreraPropia, acotado],
  );

  const clasesVisibles = useMemo(
    () => (carreraPropia ? clases.filter(c => c.idCarrera === carreraPropia.id) : acotado ? [] : clases),
    [clases, carreraPropia, acotado],
  );

  const carrerasVisibles = carreraPropia ? 1 : acotado ? 0 : carreras.length;

  const aulas = espacios.filter((e: any) => esAula(e.tipo)).length;
  const laboratorios = espacios.filter((e: any) => esLaboratorio(e.tipo)).length;

  // Cuántas clases hay cada día: responde "qué día está más cargado" de un vistazo.
  const porDia = useMemo(
    () => diasFormales.map(dia => ({
      dia: dia.slice(0, 3),
      clases: clasesVisibles.filter(c => mismoDia(c.dia, dia)).length,
    })),
    [clasesVisibles],
  );

  const docentesDistintos = useMemo(
    () => new Set(clasesVisibles.map(c => c.docente).filter(d => d && d !== 'Sin docente')).size,
    [clasesVisibles],
  );

  const accesos = [
    { to: '/autoridad/horarios', titulo: 'Horarios', detalle: 'Grilla semanal y exportación', Icon: Clock },
    { to: '/autoridad/infraestructura', titulo: 'Infraestructura', detalle: 'Edificios, aulas y laboratorios', Icon: Building2 },
    { to: '/autoridad/estructura-academica', titulo: 'Estructura Académica', detalle: 'Carreras y materias', Icon: GraduationCap },
    { to: '/autoridad/reportes', titulo: 'Reportes', detalle: 'Carga docente e informes', Icon: CalendarDays },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      <PageHero
        icon={LayoutGrid}
        title={`Hola, ${(usuario?.nombre || '').split(' ')[0] || ETIQUETA_ROL[usuario?.role ?? 'decano']}`}
        subtitle={carreraPropia
          ? `Resumen de ${carreraPropia.nombre}.`
          : 'Resumen académico y de infraestructura de la facultad.'}
        backgroundImage={HERO_BG.dashboard}
        stats={[
          { Icon: DoorOpen, value: aulas, label: 'Aulas' },
          { Icon: Microscope, value: laboratorios, label: 'Laboratorios' },
          { Icon: BookOpen, value: materiasVisibles.length, label: 'Materias' },
          { Icon: Clock, value: clasesVisibles.length, label: 'Clases' },
        ]}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-5 lg:p-6 flex flex-col gap-4">

        {/* Que el panel es de consulta se dice de entrada. */}
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-2.5 shrink-0">
          <Eye className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[11.5px] font-semibold leading-snug text-amber-900">
            Modo consulta: puedes ver y exportar la información, pero no modificarla.
          </p>
        </div>

        {sinCarreraAsignada && (
          <div className="flex items-center gap-2.5 rounded-xl border border-red-200/60 bg-red-50/60 px-4 py-2.5 shrink-0">
            <GraduationCap className="h-4 w-4 shrink-0 text-red-600" />
            <p className="text-[11.5px] font-semibold leading-snug text-red-900">
              Tu cuenta todavía no tiene una carrera asignada, así que no hay nada que mostrar.
              Pídele a un administrador que la complete en Usuarios.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Clases por día */}
          <div className="relative lg:col-span-2 overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm flex flex-col h-[260px]">
            <AcentoTarjeta />
            <div className="mb-3 flex items-center justify-between">
              <Titulo>Clases por día</Titulo>
              <span className="text-[10px] font-bold text-gray-400">{clasesVisibles.length} en total</span>
            </div>
            {clasesVisibles.length === 0 ? (
              <Vacio mensaje="Todavía no hay clases registradas." />
            ) : (
              <div className="min-h-0 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porDia} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="clases" radius={[6, 6, 0, 0]}>
                      {porDia.map((d, i) => <Cell key={i} fill={d.clases > 0 ? '#b00000' : '#e5e7eb'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Resumen en números */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm flex flex-col h-[260px]">
            <AcentoTarjeta />
            <Titulo>Resumen</Titulo>
            <div className="mt-3 flex flex-col divide-y divide-gray-100">
              {[
                { etiqueta: 'Edificios', valor: edificios.length, Icon: Building2 },
                { etiqueta: 'Espacios', valor: espacios.length, Icon: DoorOpen },
                { etiqueta: carreraPropia ? 'Tu carrera' : 'Carreras', valor: carrerasVisibles, Icon: GraduationCap },
                { etiqueta: 'Docentes con clase', valor: docentesDistintos, Icon: BookOpen },
                ...(carreraPropia ? [] : [{ etiqueta: 'Facultades', valor: facultades.length, Icon: Building2 }]),
              ].map(({ etiqueta, valor, Icon }) => (
                <div key={etiqueta} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-[12px] font-semibold text-gray-600">{etiqueta}</span>
                  <span className="text-[15px] font-extrabold text-gray-900">{valor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Accesos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {accesos.map(({ to, titulo, detalle, Icon }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="group flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-espoch-red/30 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-espoch-red/10 text-espoch-red">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-extrabold text-gray-900">{titulo}</span>
                <span className="block truncate text-[11px] text-gray-500">{detalle}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-espoch-red" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AutoridadDashboard;
