import { useEffect, useMemo, useState } from 'react';
import { Clock, X, CalendarDays } from 'lucide-react';
import { useClasesStore } from '../../../store/clasesStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { SearchInput } from '../../../components/ui/SearchInput';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { CrudModal } from '../../../components/ui/CrudModal';
import { mapearClases } from './Horarios/mapearClases';
import { resumirDocentes, filtrarResumenes, type ResumenDocente } from '../data/reporteDocentes';
import { etiquetaPaoParalelo } from './Horarios/horariosData';

interface ReporteDocentesProps {
  /** Ids marcados. Los gestiona la página, porque el panel de generación también los usa. */
  seleccionados: string[];
  onCambiarSeleccion: (ids: string[]) => void;
  /** Informa el listado ya calculado hacia arriba, para no repetir el cálculo en la página. */
  onResumenes: (resumenes: ResumenDocente[]) => void;
  /** Traduce el id de edificio a su nombre; vive en la página porque la exportación lo comparte. */
  nombreEdificio: (id: string) => string;
}

/**
 * Listado de carga docente: horas semanales, materias y horario completo de cada docente.
 *
 * Usa el mismo mapeo de clases que la pantalla Horarios, así que lo que aquí se informa es
 * exactamente lo que allí se ve. La tabla es la estándar del admin, con su orden y paginación.
 */
export const ReporteDocentes = ({
  seleccionados, onCambiarSeleccion, onResumenes, nombreEdificio,
}: ReporteDocentesProps) => {
  const { clases: rawClases, fetchClases } = useClasesStore();
  const { carreras, fetchAll: fetchFacultades } = useFacultadesStore();
  const { fetchEdificios } = useEdificiosStore();

  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState<ResumenDocente | null>(null);

  useEffect(() => {
    fetchClases();
    fetchFacultades();
    fetchEdificios();
  }, []);

  const resumenes = useMemo(
    () => resumirDocentes(mapearClases(rawClases, carreras as any)),
    [rawClases, carreras],
  );
  const visibles = useMemo(() => filtrarResumenes(resumenes, busqueda), [resumenes, busqueda]);

  useEffect(() => { onResumenes(resumenes); }, [resumenes]);

  const marcados = new Set(seleccionados);
  /** Solo mira lo visible: con un filtro activo, "seleccionar todos" marca lo que se ve. */
  const todosVisiblesMarcados = visibles.length > 0 && visibles.every(r => marcados.has(r.idDocente));

  const alternarUno = (id: string) => {
    const siguiente = new Set(marcados);
    if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
    onCambiarSeleccion([...siguiente]);
  };

  const alternarVisibles = () => {
    const siguiente = new Set(marcados);
    for (const resumen of visibles) {
      if (todosVisiblesMarcados) siguiente.delete(resumen.idDocente);
      else siguiente.add(resumen.idDocente);
    }
    onCambiarSeleccion([...siguiente]);
  };

  const columnas: DataTableColumn<ResumenDocente>[] = [
    {
      key: 'seleccion',
      width: '44px',
      align: 'center',
      header: (
        <input
          type="checkbox"
          checked={todosVisiblesMarcados}
          onChange={alternarVisibles}
          disabled={visibles.length === 0}
          title={todosVisiblesMarcados ? 'Quitar selección' : 'Seleccionar todos'}
          className="w-3.5 h-3.5 rounded accent-espoch-red cursor-pointer disabled:cursor-not-allowed"
        />
      ),
      render: resumen => (
        <input
          type="checkbox"
          checked={marcados.has(resumen.idDocente)}
          onChange={() => alternarUno(resumen.idDocente)}
          onClick={event => event.stopPropagation()}
          className="w-3.5 h-3.5 rounded accent-espoch-red cursor-pointer"
        />
      ),
    },
    {
      key: 'docente',
      header: 'Docente y materias',
      width: '2.4fr',
      sortValue: resumen => resumen.docente,
      render: resumen => (
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-bold text-gray-900 truncate">{resumen.docente}</span>
          <span className="text-[10px] text-gray-500 font-medium truncate">{resumen.materias.join(' · ')}</span>
        </div>
      ),
    },
    {
      key: 'materias',
      header: 'Materias',
      width: '90px',
      align: 'center',
      sortValue: resumen => resumen.materias.length,
      render: resumen => (
        <span className="text-[11px] font-bold text-gray-600 bg-gray-100 rounded-md px-2 py-0.5">
          {resumen.materias.length}
        </span>
      ),
    },
    {
      key: 'horas',
      header: 'Horas/sem',
      width: '110px',
      align: 'center',
      sortValue: resumen => resumen.horasSemana,
      render: resumen => (
        <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2 py-0.5 inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-400" /> {resumen.horasSemana} h
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[16px] font-extrabold text-gray-900">Carga docente</h3>
          <p className="text-[11px] font-medium text-gray-500 mt-0.5">
            {visibles.length} {visibles.length === 1 ? 'docente' : 'docentes'} ·{' '}
            {visibles.reduce((suma, r) => suma + r.horasSemana, 0)} h/semana · abre una fila para ver su horario
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SearchInput
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar docente o materia..."
            className="w-full sm:w-[280px]"
          />
        </div>
      </div>

      <DataTable
        columns={columnas}
        rows={visibles}
        rowKey={resumen => resumen.idDocente}
        onRowClick={setDetalle}
        minWidthClass="min-w-[600px]"
        defaultPerPage={8}
        emptyState={
          <p className="py-10 text-center text-[12px] text-gray-400 font-medium">
            {resumenes.length === 0
              ? 'Todavía no hay clases asignadas a ningún docente.'
              : 'Ningún docente coincide con la búsqueda.'}
          </p>
        }
      />

      <CrudModal
        open={detalle !== null}
        icon={CalendarDays}
        title={detalle?.docente || ''}
        subtitle={detalle
          ? `${detalle.horasSemana} h/semana · ${detalle.materias.length} ${detalle.materias.length === 1 ? 'materia' : 'materias'}`
          : ''}
        onClose={() => setDetalle(null)}
        maxWidthClass="max-w-[860px]"
        footer={
          <button
            onClick={() => setDetalle(null)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-[12px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <X className="w-3.5 h-3.5" /> Cerrar
          </button>
        }
      >
        <div className="overflow-x-auto">
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
              {detalle?.bloques.map((bloque, indice) => (
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
      </CrudModal>
    </div>
  );
};
