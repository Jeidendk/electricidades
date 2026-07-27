import React, { useMemo } from 'react';
import { X, Plus, BookOpen } from 'lucide-react';
import { dias, horas } from './horariosData';
import { useMateriasStore } from '../../../../store/materiasStore';
import { useUsuariosStore } from '../../../../store/usuariosStore';
import { useFacultadesStore } from '../../../../store/facultadesStore';
import { useEdificiosStore } from '../../../../store/edificiosStore';
import { useEspaciosStore } from '../../../../store/espaciosStore';

interface AsignacionModalProps {
  isModalOpen?: boolean;
  setIsModalOpen: (val: boolean) => void;
  modalMode: 'create' | 'edit';
  formValues: any;
  setFormValues: (val: any) => void;
  handleSaveClase: (e: React.FormEvent) => void;
  handleDeleteClase: () => void;
  isReadOnly?: boolean;
  creadoPor?: string;
  currentUser?: any;
}

export const AsignacionModal: React.FC<AsignacionModalProps> = ({
  isModalOpen = true,
  setIsModalOpen,
  modalMode,
  formValues,
  setFormValues,
  handleSaveClase,
  handleDeleteClase,
  isReadOnly,
  creadoPor
}) => {
  if (!isModalOpen) return null;

  const { materias } = useMateriasStore();
  const { items: usuarios } = useUsuariosStore();
  const { facultades, carreras } = useFacultadesStore();
  const { items: edificios } = useEdificiosStore();
  const { items: espacios } = useEspaciosStore();

  const carrerasFiltradas = useMemo(() => {
    if (!formValues.idFacultad) return [];
    return carreras.filter(c => c.id_facultad === formValues.idFacultad);
  }, [formValues.idFacultad, carreras]);

  const materiasFiltradas = useMemo(() => {
    if (!formValues.idCarrera) return [];
    return materias.filter(m => m.id_carrera === formValues.idCarrera);
  }, [formValues.idCarrera, materias]);

  const espaciosFiltrados = useMemo(() => {
    if (!formValues.idEdificio) return [];
    let filtrados = espacios.filter(e => e.id_edificio === formValues.idEdificio);
    if (formValues.tipoEspacio) {
      filtrados = filtrados.filter(e => e.tipo === formValues.tipoEspacio);
    }
    return filtrados;
  }, [formValues.idEdificio, formValues.tipoEspacio, espacios]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in no-print">
      <div className="bg-white rounded-3xl w-full max-w-[500px] relative animate-scale-in flex flex-col p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh]">
        <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full hover:bg-gray-100 z-10">
          <X className="w-4 h-4"/>
        </button>
        <div className="flex items-center gap-4 mb-4 shrink-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isReadOnly ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-700'}`}>
              {modalMode === 'create' ? <Plus className="w-6 h-6"/> : <BookOpen className="w-6 h-6"/>}
            </div>
            <div>
              <h3 className="text-[18px] font-extrabold text-gray-900 tracking-tight">
                {modalMode === 'create' ? 'Nueva Asignación' : isReadOnly ? 'Clase Asignada' : 'Editar Asignación'}
              </h3>
              <p className="text-[12px] font-medium text-gray-500">
                {modalMode === 'create' ? 'Registre una clase en el horario semestral.' : isReadOnly ? 'Vista de solo lectura.' : 'Modifique o elimine esta clase.'}
              </p>
            </div>
        </div>

        {isReadOnly && (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0 border border-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-gray-800">Bloqueado por sistema</span>
              <span className="text-[10px] text-gray-500 leading-tight">Esta clase fue asignada por otro técnico ({creadoPor}). No tienes permisos para editarla ni eliminarla.</span>
            </div>
          </div>
        )}
        
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 -mr-2">
          <form id="asignacionForm" onSubmit={handleSaveClase} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Facultad</label>
                      <select required value={formValues.idFacultad} onChange={e => setFormValues({...formValues, idFacultad: e.target.value, idCarrera: '', idMateria: ''})} disabled={isReadOnly} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-red-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-60">
                          <option value="">Seleccione Facultad</option>
                          {facultades.map(f => <option key={f.id} value={f.id}>{f.siglas} - {f.nombre}</option>)}
                      </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Carrera</label>
                      <select required value={formValues.idCarrera} onChange={e => setFormValues({...formValues, idCarrera: e.target.value, idMateria: ''})} disabled={!formValues.idFacultad || isReadOnly} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-red-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-60">
                          <option value="">Seleccione Carrera</option>
                          {carrerasFiltradas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                  </div>
              </div>

              <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Materia</label>
                  <select required value={formValues.idMateria} onChange={e => setFormValues({...formValues, idMateria: e.target.value})} disabled={!formValues.idCarrera || isReadOnly} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-red-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-60">
                      <option value="">Seleccione Materia</option>
                      {materiasFiltradas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
              </div>
              
              <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Docente</label>
                  <select
                      required
                      value={formValues.idDocente}
                      onChange={e => setFormValues({...formValues, idDocente: e.target.value})}
                      disabled={isReadOnly}
                      className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-red-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-60"
                  >
                      <option value="">Seleccione Docente</option>
                      {usuarios.filter(u => u.id_rol !== 1).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Tipo de Espacio</label>
                      <select required value={formValues.tipoEspacio} onChange={e => setFormValues({...formValues, tipoEspacio: e.target.value})} disabled={isReadOnly} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-red-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-60">
                          <option value="">Seleccione Tipo</option>
                          <option value="Academica">Aula</option>
                          <option value="Laboratorio Tecnico">Laboratorio Técnico</option>
                          <option value="Laboratorio de Informatica">Laboratorio Informático</option>
                      </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Edificio</label>
                      <select required value={formValues.idEdificio} onChange={e => setFormValues({...formValues, idEdificio: e.target.value, idEspacio: ''})} disabled={isReadOnly} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-red-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-60">
                          <option value="">Seleccione Edificio</option>
                          {edificios.map(ed => <option key={ed.id} value={ed.id}>{ed.nombre}</option>)}
                      </select>
                  </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Aula / Laboratorio</label>
                  <select required value={formValues.idEspacio} onChange={e => setFormValues({...formValues, idEspacio: e.target.value})} disabled={!formValues.idEdificio || isReadOnly} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-red-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-60">
                      <option value="">Seleccione un espacio</option>
                      {espaciosFiltrados.map(esp => <option key={esp.id} value={esp.id}>{esp.nombre} (Piso {esp.piso})</option>)}
                  </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Día</label>
                      <select value={formValues.dia} onChange={e => setFormValues({...formValues, dia: e.target.value})} disabled={isReadOnly} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-red-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-60">
                          {dias.map(d => <option key={d} value={d === 'Miércoles' ? 'Miercoles' : d}>{d}</option>)}
                      </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Hora</label>
                      <select value={formValues.hora} onChange={e => setFormValues({...formValues, hora: e.target.value})} disabled={isReadOnly} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-red-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-60">
                          {horas.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                  </div>
              </div>
          </form>
        </div>

        <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100 shrink-0">
            {isReadOnly ? (
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">Cerrar Vista</button>
            ) : (
              <>
                {modalMode === 'edit' && (
                  <button type="button" onClick={handleDeleteClase} className="flex-1 py-3 rounded-xl border border-red-200 text-[13px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">Eliminar</button>
                )}
                <button type="submit" form="asignacionForm" className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-800 text-white text-[13px] font-bold shadow-md transition-all transform hover:-translate-y-0.5">{modalMode === 'create' ? 'Asignar Clase' : 'Guardar Cambios'}</button>
              </>
            )}
        </div>

      </div>
    </div>
  );
};
