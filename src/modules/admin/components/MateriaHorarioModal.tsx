import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, Clock, MapPin, User } from 'lucide-react';
import { useClasesStore } from '../../../store/clasesStore';
import { useUsuariosStore } from '../../../store/usuariosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

interface Props {
  open: boolean;
  materia: { id: string; nombre: string; codigo?: string } | null;
  onClose: () => void;
}

// Gestión del horario de UNA materia (paso 1): bloques día/hora/docente.
// El aula es opcional aquí y se asigna luego en la pantalla Horarios.
export const MateriaHorarioModal = ({ open, materia, onClose }: Props) => {
  const clases = useClasesStore(s => s.clases);
  const fetchClases = useClasesStore(s => s.fetchClases);
  const addClase = useClasesStore(s => s.addClase);
  const removeClase = useClasesStore(s => s.removeClase);
  const usuarios = useUsuariosStore(s => s.items);
  const fetchUsuarios = useUsuariosStore(s => s.fetchUsuarios);
  const espacios = useEspaciosStore(s => s.items);
  const fetchEspacios = useEspaciosStore(s => s.fetchEspacios);

  const [dia, setDia] = useState('Lunes');
  const [horaInicio, setHoraInicio] = useState('07:00');
  const [horaFin, setHoraFin] = useState('09:00');
  const [docente, setDocente] = useState('');
  const [aula, setAula] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (clases.length === 0) fetchClases();
      if (usuarios.length === 0) fetchUsuarios();
      if (espacios.length === 0) fetchEspacios();
    }
  }, [open]);

  const bloques = useMemo(
    () => clases.filter((c: any) => c.id_materia === materia?.id),
    [clases, materia],
  );

  if (!open || !materia) return null;

  const nombreDocente = (id: string) => usuarios.find((u: any) => u.id === id)?.nombre || '—';
  const nombreAula = (id: string | null) => (id ? espacios.find((e: any) => e.id === id)?.nombre || '—' : 'Sin aula');

  const handleAdd = async () => {
    if (!docente) { setError('Selecciona un docente.'); return; }
    if (horaFin <= horaInicio) { setError('La hora fin debe ser mayor que la de inicio.'); return; }
    setSaving(true); setError(null);
    try {
      await addClase({
        id: `CLS${Date.now()}`,
        id_materia: materia.id,
        id_docente: docente,
        id_espacio: aula || null,
        dia,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      } as any);
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-[560px] p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Horario — {materia.nombre}</h3>
            <p className="text-xs text-gray-500">{materia.codigo} · día / hora / docente. El aula es opcional.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        {/* Bloques existentes */}
        <div className="flex flex-col gap-2 my-4">
          {bloques.length === 0 && <p className="text-[12px] text-gray-400 py-3 text-center">Aún no hay bloques de horario.</p>}
          {bloques.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
              <div className="flex items-center gap-3 min-w-0 text-[12px]">
                <span className="font-bold text-gray-800 w-[70px] shrink-0">{c.dia}</span>
                <span className="flex items-center gap-1 text-gray-600"><Clock className="w-3.5 h-3.5 text-gray-400" />{(c.hora_inicio || '').slice(0, 5)}–{(c.hora_fin || '').slice(0, 5)}</span>
                <span className="flex items-center gap-1 text-gray-600 truncate"><User className="w-3.5 h-3.5 text-gray-400" />{c.usuarios?.nombre || nombreDocente(c.id_docente)}</span>
                <span className="flex items-center gap-1 text-gray-500 truncate"><MapPin className="w-3.5 h-3.5 text-gray-400" />{c.espacios?.nombre || nombreAula(c.id_espacio)}</span>
              </div>
              <button onClick={() => removeClase(c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Nuevo bloque */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">Agregar bloque</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <select value={dia} onChange={e => setDia(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-medium outline-none focus:border-indigo-400 col-span-2 sm:col-span-1">
              {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-medium outline-none focus:border-indigo-400" />
            <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-medium outline-none focus:border-indigo-400" />
            <select value={docente} onChange={e => setDocente(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-medium outline-none focus:border-indigo-400 col-span-2 sm:col-span-2">
              <option value="">Docente…</option>
              {usuarios.map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
            <select value={aula} onChange={e => setAula(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-medium outline-none focus:border-indigo-400 col-span-2 sm:col-span-1">
              <option value="">Aula (opcional)</option>
              {espacios.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          {error && <p className="text-[11px] text-red-600 font-semibold mt-2">{error}</p>}
          <button onClick={handleAdd} disabled={saving} className="mt-3 w-full bg-espoch-ink hover:bg-black text-white text-[12px] font-bold py-2.5 rounded-full flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
            <Plus className="w-4 h-4" /> {saving ? 'Guardando…' : 'Agregar bloque'}
          </button>
        </div>
      </div>
    </div>
  );
};
