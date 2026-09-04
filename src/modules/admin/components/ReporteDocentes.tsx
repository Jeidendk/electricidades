import { useEffect, useMemo, useState } from 'react';
import { Download, Search, ChevronRight, Clock, BookOpen } from 'lucide-react';
import { useClasesStore } from '../../../store/clasesStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useReportesStore } from '../../../store/reportesStore';
import { mapearClases } from './Horarios/mapearClases';
import { resumirDocentes, filtrarResumenes, type ResumenDocente } from '../data/reporteDocentes';
import { etiquetaPaoParalelo } from './Horarios/horariosData';
import { descargarCsv } from '../../../lib/descargarCsv';

const CABECERAS_CSV = [
  'Docente', 'Día', 'Hora inicio', 'Hora fin', 'Horas',
  'Materia', 'PAO', 'Paralelo', 'Carrera', 'Aula', 'Edificio',
];

/**
 * Reporte de carga docente: horas semanales, materias que dicta y su horario completo.
 *
 * Se apoya en el mismo mapeo de clases que usa la pantalla Horarios, así que lo que aquí se
 * informa es exactamente lo que allí se ve.
 */
export const ReporteDocentes = () => {
  const { clases: rawClases, fetchClases } = useClasesStore();
  const { carreras, fetchAll: fetchFacultades } = useFacultadesStore();
  const { items: edificios, fetchEdificios } = useEdificiosStore();
  const registrarReporte = useReportesStore(s => s.registrarReporte);
  const fetchReportes = useReportesStore(s => s.fetchReportes);

  const [busqueda, setBusqueda] = useState('');
  const [docenteAbierto, setDocenteAbierto] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    fetchClases();
    fetchFacultades();
    fetchEdificios();
  }, []);

  const nombreEdificio = (id: string) => edificios.find((e: any) => e.id === id)?.nombre || id || '—';

  const resumenes = useMemo(
    () => resumirDocentes(mapearClases(rawClases, carreras as any)),
    [rawClases, carreras],
  );
  const visibles = useMemo(() => filtrarResumenes(resumenes, busqueda), [resumenes, busqueda]);

  const totalHoras = visibles.reduce((suma, resumen) => suma + resumen.horasSemana, 0);

  /** Una fila por bloque de clase: es el detalle que sirve para revisar o archivar. */
  const filasCsv = (lista: ResumenDocente[]) =>
    lista.flatMap(resumen =>
      resumen.bloques.map(bloque => [
        resumen.docente, bloque.dia, bloque.horaInicio, bloque.horaFin, String(bloque.horas),
        bloque.materia,
        bloque.pao != null ? String(bloque.pao) : '',
        bloque.paralelo != null ? String(bloque.paralelo) : '',
        bloque.carrera, bloque.aula, nombreEdificio(bloque.edificio),
      ]),
    );

  const exportar = async () => {
    const filas = filasCsv(visibles);
    setExportando(true);
    try {
      descargarCsv('reporte-docentes.csv', CABECERAS_CSV, filas);
      // El historial es una bitácora: que falle no debe deshacer la descarga, que ya ocurrió.
      await registrarReporte({
        tipo: 'Docentes',
        formato: 'CSV',
        filtros: busqueda ? { busqueda } : {},
        filas: filas.length,
      }).catch(() => {});
      fetchReportes();
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="bg-white rounded-[20px] border border-gray-200/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-gray-900">Carga docente</span>
          <span className="text-[11px] text-gray-500 font-medium">
            {visibles.length} {visibles.length === 1 ? 'docente' : 'docentes'} · {totalHoras} h/semana en total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar docente o materia..."
              className="bg-gray-50/60 text-[12px] text-gray-800 rounded-xl py-2 pl-8 pr-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium w-full sm:w-[240px] transition-all"
            />
          </div>
          <button
            onClick={exportar}
            disabled={exportando || visibles.length === 0}
            className="bg-[#0f172a] hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[11px] px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="px-5 py-10 text-center text-[12px] text-gray-400 font-medium">
          {resumenes.length === 0
            ? 'Todavía no hay clases asignadas a ningún docente.'
            : 'Ningún docente coincide con la búsqueda.'}
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {visibles.map(resumen => {
            const abierto = docenteAbierto === resumen.idDocente;
            return (
              <div key={resumen.idDocente}>
                <button
                  onClick={() => setDocenteAbierto(abierto ? null : resumen.idDocente)}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50/70 transition-colors text-left"
                >
                  <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${abierto ? 'rotate-90' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-bold text-gray-900 block truncate">{resumen.docente}</span>
                    <span className="text-[10px] text-gray-500 font-medium block truncate">
                      {resumen.materias.join(' · ')}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 flex items-center gap-1.5 shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" /> {resumen.materias.length}
                  </span>
                  <span className="text-[10px] font-extrabold text-blue-600 flex items-center gap-1.5 shrink-0 w-[70px] justify-end">
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> {resumen.horasSemana} h
                  </span>
                </button>

                {abierto && (
                  <div className="px-5 pb-4 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left border-collapse">
                      <thead>
                        <tr className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">
                          <th className="py-2 pr-3">Día</th>
                          <th className="py-2 pr-3">Hora</th>
                          <th className="py-2 pr-3">Materia</th>
                          <th className="py-2 pr-3">PAO / Paralelo</th>
                          <th className="py-2 pr-3">Carrera</th>
                          <th className="py-2 pr-3">Aula</th>
                          <th className="py-2">Edificio</th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px] text-gray-700 font-medium">
                        {resumen.bloques.map((bloque, indice) => (
                          <tr key={`${bloque.dia}-${bloque.horaInicio}-${indice}`} className="border-t border-gray-100">
                            <td className="py-2 pr-3 font-semibold">{bloque.dia}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">{bloque.horaInicio} – {bloque.horaFin}</td>
                            <td className="py-2 pr-3">{bloque.materia}</td>
                            <td className="py-2 pr-3 text-gray-500">{etiquetaPaoParalelo(bloque.pao, bloque.paralelo) || '—'}</td>
                            <td className="py-2 pr-3 text-gray-500">{bloque.carrera || '—'}</td>
                            <td className="py-2 pr-3">{bloque.aula}</td>
                            <td className="py-2 text-gray-500">{nombreEdificio(bloque.edificio)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
