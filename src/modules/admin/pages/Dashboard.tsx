import {
  Building2, MonitorPlay, FileText, PieChart as PieChartIcon,
  Info, ArrowRight, CheckCircle, AlertCircle, AlertTriangle, LayoutGrid
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';

const usoHorarioData = [
  { time: '00:00', uso: 10, promedio: 20 },
  { time: '06:00', uso: 25, promedio: 22 },
  { time: '12:00', uso: 80, promedio: 25 },
  { time: '18:00', uso: 15, promedio: 15 },
  { time: '00:00 ', uso: 60, promedio: 18 },
  { time: '06:00 ', uso: 75, promedio: 20 },
  { time: '12:00 ', uso: 20, promedio: 15 },
];

const tiposSolicitudesData = [
  { name: 'Reserva de espacios', value: 60, percentage: '50%', color: '#b00000' },
  { name: 'Mantenimiento', value: 36, percentage: '30%', color: '#F59E0B' },
  { name: 'Préstamo de equipos', value: 24, percentage: '20%', color: '#10B981' },
];

const equiposSolicitados = [
  { name: 'Proyectores', value: 90, max: 100 },
  { name: 'Laptops', value: 84, max: 100 },
  { name: 'Kits Arduino', value: 62, max: 100 },
  { name: 'Osciloscopios', value: 41, max: 100 },
  { name: 'Micrófonos', value: 35, max: 100 },
];

const estadoInventario = [
  { name: 'Operativos', value: 257, percent: '78%', color: 'bg-green-500' },
  { name: 'En reparación', value: 32, percent: '10%', color: 'bg-yellow-400' },
  { name: 'Dañados', value: 21, percent: '6%', color: 'bg-orange-500' },
  { name: 'Extraviados', value: 16, percent: '6%', color: 'bg-red-500' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 rounded shadow border border-gray-100">
        <p className="text-[10px] font-bold text-gray-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5 text-[10px] font-medium text-gray-600 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name === 'uso' ? 'Uso' : 'Promedio'}:</span>
            <span className="font-bold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { PageHero, type HeroStat } from '../../../components/ui/PageHero';

export const Dashboard = () => {
  // `null` = no se pudo obtener. Se distingue de 0 para no mostrar un dato falso como si fuera real.
  const [counts, setCounts] = useState<{
    edificios: number | null;
    aulasActivas: number | null;
    solicitudesPendientes: number | null;
    ocupacionTasa: number;
  }>({
    edificios: null,
    aulasActivas: null,
    solicitudesPendientes: null,
    ocupacionTasa: 78, // Mocked for now or can be computed
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /** Devuelve el conteo, o null si la consulta falló: así un error no se muestra como "0". */
    const contar = ({ count, error }: { count: number | null; error: { message: string } | null }, que: string) => {
      if (error) {
        console.error(`No se pudo contar ${que}:`, error.message);
        return null;
      }
      return count ?? 0;
    };

    const sumarDisponibles = (...valores: (number | null)[]) =>
      valores.every(v => v === null) ? null : valores.reduce<number>((total, v) => total + (v ?? 0), 0);

    async function fetchMetrics() {
      const [edificios, espaciosOperativos, tramitesPendientes, equiposPendientes] = await Promise.all([
        supabase.from('edificios').select('*', { count: 'exact', head: true }),
        // "Activas" = todo espacio que no esté fuera de servicio (enum: disponible | ocupada | mantenimiento).
        supabase.from('espacios').select('*', { count: 'exact', head: true }).neq('estado', 'mantenimiento'),
        // Pendientes de atender, sumando los dos tipos de solicitud que maneja el admin.
        supabase.from('solicitudes_admin').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabase.from('solicitudes_equipo').select('*', { count: 'exact', head: true }).eq('estado', 'Pendiente'),
      ]);

      setCounts({
        edificios: contar(edificios, 'los edificios'),
        aulasActivas: contar(espaciosOperativos, 'los espacios activos'),
        solicitudesPendientes: sumarDisponibles(
          contar(tramitesPendientes, 'los trámites pendientes'),
          contar(equiposPendientes, 'las solicitudes de equipos pendientes'),
        ),
        ocupacionTasa: 78,
      });
      setLoading(false);
    }

    fetchMetrics();
  }, []);

  /** "..." mientras carga y "—" si el dato no se pudo obtener; nunca un 0 inventado. */
  const mostrarConteo = (valor: number | null) => (loading ? '...' : valor === null ? '—' : valor);

  const { currentUser } = useOutletContext<any>();
  const nombreUsuario = String(currentUser?.nombre || '').trim();
  const tituloBienvenida = nombreUsuario ? `Bienvenido, ${nombreUsuario}` : 'Panel de Control';

  // Las variaciones "vs. ayer" son valores de maqueta: todavía no se calculan contra datos reales.
  const heroStats: HeroStat[] = [
    { Icon: Building2, value: mostrarConteo(counts.edificios), label: 'Edificios', trend: { label: '11% vs. ayer', direction: 'up' } },
    { Icon: MonitorPlay, value: mostrarConteo(counts.aulasActivas), label: 'Aulas activas', trend: { label: '3% vs. ayer', direction: 'up' } },
    { Icon: FileText, value: mostrarConteo(counts.solicitudesPendientes), label: 'Solicitudes pendientes', trend: { label: '5% vs. ayer', direction: 'down' } },
    { Icon: PieChartIcon, value: `${counts.ocupacionTasa}%`, label: 'Tasa de ocupación', trend: { label: '4% vs. ayer', direction: 'up' } },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb] overflow-hidden">

      {/* Banner a todo el ancho, igual que el resto de pantallas admin. */}
      <PageHero
        icon={LayoutGrid}
        title={tituloBienvenida}
        subtitle="Resumen general del sistema de gestión de aulas y recursos."
        stats={heroStats}
        backgroundImage={HERO_BG.dashboard}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 lg:p-5 flex flex-col gap-3 lg:gap-4">

      {/* FILA 3: GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 shrink-0">
        
        {/* Horas pico de uso */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col h-[180px]">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2">
               <h3 className="text-xs font-bold text-gray-800">Horas pico de uso</h3>
               <Info className="w-3.5 h-3.5 text-gray-400" />
             </div>
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 hidden sm:flex">
                 <div className="w-3 h-1 bg-espoch-red rounded-full"></div>
                 <span className="text-[9px] font-medium text-gray-600">Uso promedio</span>
               </div>
               <div className="flex items-center gap-2 hidden sm:flex">
                 <div className="w-3 h-0 border-b border-dashed border-espoch-red/50"></div>
                 <span className="text-[9px] font-medium text-gray-600">Semanal</span>
               </div>
               <select className="text-[9px] font-medium border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 outline-none">
                 <option>Por día y hora</option>
               </select>
             </div>
          </div>

          <div className="w-full flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usoHorarioData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8' }} 
                  dy={5} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8' }} 
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="uso" stroke="#b00000" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="promedio" stroke="#e08a8a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tipos de solicitudes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col h-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-bold text-gray-800">Tipos de solicitudes</h3>
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </div>
          
          <div className="flex-1 flex flex-row items-center justify-center gap-4">
            <div className="w-[100px] h-[100px] relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tiposSolicitudesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {tiposSolicitudesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[8px] font-bold text-gray-400 mb-0.5">Total</span>
                <span className="text-sm font-bold text-gray-800 leading-none">120</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              {tiposSolicitudesData.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[9px] font-medium text-gray-700 truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-bold text-gray-900">{item.percentage}</span>
                    <span className="text-[8px] text-gray-400 w-5 text-right">({item.value})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* FILA 4: ESTADO Y ALERTAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
        
        {/* Equipos más solicitados */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-gray-800">Equipos más solicitados</h3>
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="flex flex-col gap-2.5">
            {equiposSolicitados.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[9px] font-medium text-gray-600 w-20 truncate">{item.name}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-espoch-red rounded-full"
                    style={{ width: `${(item.value / item.max) * 100}%` }}
                  ></div>
                </div>
                <span className="text-[9px] font-bold text-gray-900 w-5 text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Estado del inventario */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-gray-800">Estado del inventario</h3>
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="flex flex-col gap-2.5">
            {estadoInventario.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`}></div>
                <span className="text-[9px] font-medium text-gray-600 flex-1 truncate">{item.name}</span>
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full`} 
                    style={{ width: item.percent }}
                  ></div>
                </div>
                <span className="text-[9px] font-bold text-gray-900 w-6 text-right">{item.value}</span>
                <span className="text-[8px] text-gray-400 w-6 text-right">({item.percent})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-800">Alertas</h3>
              <Info className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <button className="text-[9px] font-medium text-espoch-red hover:underline flex items-center gap-0.5">
              Ver todas <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar">
            
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-3 h-3 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-800">Solo quedan 2 marcadores</p>
                <p className="text-[8px] text-gray-500">Inventario bajo en Lab. de Informática</p>
              </div>
              <span className="text-[8px] text-gray-400 font-medium shrink-0">Hace 15m</span>
            </div>

            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3 h-3 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-800">Faltan sillas en Aula 102</p>
                <p className="text-[8px] text-gray-500">Se requiere 8 sillas adicionales</p>
              </div>
              <span className="text-[8px] text-gray-400 font-medium shrink-0">Hace 47m</span>
            </div>

          </div>
        </div>

      </div>

      {/* FILA 5: TABLAS DE RESUMEN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        
        {/* Actividad Reciente */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h3 className="text-xs font-bold text-gray-800">Actividad reciente</h3>
            <button className="text-[9px] font-medium text-espoch-red hover:underline flex items-center gap-0.5">
              Ver todas <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100">
                  <th className="pb-1.5 text-[9px] font-semibold text-gray-500 uppercase">Actividad</th>
                  <th className="pb-1.5 text-[9px] font-semibold text-gray-500 uppercase">Usuario</th>
                  <th className="pb-1.5 text-[9px] font-semibold text-gray-500 uppercase">Detalle</th>
                  <th className="pb-1.5 text-[9px] font-semibold text-gray-500 uppercase">Ubicación</th>
                  <th className="pb-1.5 text-[9px] font-semibold text-gray-500 uppercase text-right">Tiempo</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="font-medium text-gray-800 whitespace-nowrap">Reserva aprobada</span>
                  </td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">Juan Pérez</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">Aula 402</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">Aula 402</td>
                  <td className="py-2 text-gray-400 text-right whitespace-nowrap">Hace 10 min</td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="py-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-medium text-gray-800 whitespace-nowrap">Préstamo registrado</span>
                  </td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">Ana Torres</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">Proyector Epson</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">Lab. de Redes</td>
                  <td className="py-2 text-gray-400 text-right whitespace-nowrap">Hace 25 min</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Próximos mantenimientos */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h3 className="text-xs font-bold text-gray-800">Próximos mantenimientos</h3>
            <button className="text-[9px] font-medium text-espoch-red hover:underline flex items-center gap-0.5">
              Ver todas <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100">
                  <th className="pb-1.5 text-[9px] font-semibold text-gray-500 uppercase">ID</th>
                  <th className="pb-1.5 text-[9px] font-semibold text-gray-500 uppercase">Equipo</th>
                  <th className="pb-1.5 text-[9px] font-semibold text-gray-500 uppercase">Ubicación</th>
                  <th className="pb-1.5 text-[9px] font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="pb-1.5 text-[9px] font-semibold text-gray-500 uppercase text-right">Prioridad</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 font-medium text-gray-800 whitespace-nowrap">MNT-01</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">Aire Acondicionado</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">Lab. de Redes</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">18-jun-2026</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <span className="inline-block px-1.5 py-0.5 bg-red-50 text-red-600 font-bold rounded">Alta</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="py-2 font-medium text-gray-800 whitespace-nowrap">MNT-02</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">Servidor Principal</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">Data Center</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">20-jun-2026</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded">Crítica</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      </div>

    </div>
  );
};
