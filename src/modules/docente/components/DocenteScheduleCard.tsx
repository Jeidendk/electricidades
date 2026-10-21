import { DoorOpen, Users } from 'lucide-react';

export interface AsignaturaDocenteItem {
  codigo: string;
  nombre: string;
  clasesCount: number;
  espacios: Set<string>;
  paralelos: Set<number>;
}

export const DocenteScheduleCard = ({ asignatura }: { asignatura: AsignaturaDocenteItem }) => {
  return (
    <div className="p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all bg-slate-50/50 flex flex-col justify-between gap-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest bg-gray-200/60 px-1.5 py-0.5 rounded">
            {asignatura.codigo}
          </span>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/40">
            {asignatura.clasesCount} {asignatura.clasesCount === 1 ? 'bloque' : 'bloques'}
          </span>
        </div>
        <h4 className="text-xs font-bold text-gray-900 line-clamp-1" title={asignatura.nombre}>
          {asignatura.nombre}
        </h4>
      </div>

      <div className="flex flex-col gap-1 text-[10px] text-gray-600 border-t border-gray-200/40 pt-2">
        <div className="flex items-center gap-1.5">
          <DoorOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">
            {Array.from(asignatura.espacios).join(', ') || 'Aula por asignar'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>
            Paralelo(s): {Array.from(asignatura.paralelos).sort().join(', ') || '1'}
          </span>
        </div>
      </div>
    </div>
  );
};
