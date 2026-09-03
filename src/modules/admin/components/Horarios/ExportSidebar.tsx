import React from 'react';
import { X, Download, ChevronDown, Clock, Building2, Users, Printer, RefreshCcw } from 'lucide-react';
import { useEdificiosStore } from '../../../../store/edificiosStore';
import { useEspaciosStore } from '../../../../store/espaciosStore';
import type { CamposClase } from './horariosData';

/** Orden y rótulo de cada casilla del checklist. Agregar una línea opcional se hace aquí. */
const CAMPOS_OPCIONALES: { clave: keyof CamposClase; etiqueta: string }[] = [
  { clave: 'paoParalelo', etiqueta: 'PAO y paralelo' },
  { clave: 'carrera', etiqueta: 'Carrera' },
  { clave: 'docente', etiqueta: 'Docente' },
];

interface ExportSidebarProps {
  setIsExportModalOpen: (val: boolean) => void;
  exportEdificio: string;
  setExportEdificio: (val: string) => void;
  exportAula: string;
  setExportAula: (val: string) => void;
  exportPeriodo: string;
  setExportPeriodo: (val: string) => void;
  orientation: 'vertical' | 'horizontal';
  setOrientation: (val: 'vertical' | 'horizontal') => void;
  paperSize: 'A4' | 'Carta';
  setPaperSize: (val: 'A4' | 'Carta') => void;
  includeFooter: boolean;
  setIncludeFooter: (val: boolean) => void;
  camposClase: CamposClase;
  setCamposClase: (val: CamposClase) => void;
  documentFontSize: number;
  setDocumentFontSize: (val: number) => void;
  typography: string;
  setTypography: (val: string) => void;
  formattedDate: string;
  formattedTime: string;
  handlePrint: () => void;
  handleResetFilters: () => void;
}

export const ExportSidebar: React.FC<ExportSidebarProps> = ({
  setIsExportModalOpen,
  exportEdificio,
  setExportEdificio,
  exportAula,
  setExportAula,
  exportPeriodo,
  setExportPeriodo,
  orientation,
  setOrientation,
  paperSize,
  setPaperSize,
  includeFooter,
  setIncludeFooter,
  camposClase,
  setCamposClase,
  documentFontSize,
  setDocumentFontSize,
  typography,
  setTypography,
  formattedDate,
  formattedTime,
  handlePrint,
  handleResetFilters
}) => {
  const edificios = useEdificiosStore(state => state.items);
  const espacios = useEspaciosStore(state => state.items);
  const edificioSeleccionado = edificios.find(edificio => edificio.nombre === exportEdificio);
  const espaciosDisponibles = espacios
    .filter(espacio => espacio.id_edificio === edificioSeleccionado?.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return (
    <div className="w-full lg:w-[350px] bg-white rounded-[20px] shadow-sm border border-gray-200/60 flex flex-col shrink-0 overflow-hidden lg:h-full">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-[14px]">
          <Download className="w-5 h-5 text-red-600" />
          Generar Formato
        </h3>
        <button onClick={() => setIsExportModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"><X className="w-4 h-4"/></button>
      </div>
      
      <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Edificio / Ubicación</label>
            <div className="relative">
              <select value={exportEdificio} onChange={e => { setExportEdificio(e.target.value); setExportAula(''); }} className="bg-white text-xs text-gray-800 rounded-xl py-3 pl-4 pr-10 outline-none border border-gray-200 focus:border-red-500 font-semibold cursor-pointer w-full appearance-none shadow-sm transition-all hover:border-gray-300">
                <option value="">Seleccione Ubicación...</option>
                {[...edificios].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(edificio => (
                  <option key={edificio.id} value={edificio.nombre}>{edificio.nombre}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Aula o Laboratorio</label>
            <div className="relative">
              <select value={exportAula} onChange={e => setExportAula(e.target.value)} disabled={!exportEdificio} className="bg-white text-xs text-gray-800 rounded-xl py-3 pl-4 pr-10 outline-none border border-gray-200 focus:border-red-500 font-semibold cursor-pointer w-full appearance-none shadow-sm transition-all hover:border-gray-300 disabled:opacity-50 disabled:bg-gray-50">
                <option value="">Seleccione Espacio...</option>
                {espaciosDisponibles.map(espacio => <option key={espacio.id} value={espacio.nombre}>{espacio.nombre}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Período Académico</label>
            <input 
              type="text" 
              value={exportPeriodo} 
              onChange={e => setExportPeriodo(e.target.value)} 
              placeholder="Ej: MARZO 2026 - SEPTIEMBRE 2026"
              className="bg-white text-xs text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-red-500 font-semibold w-full shadow-sm transition-all hover:border-gray-300 placeholder:text-gray-300"
            />
          </div>

          {/* Qué líneas se imprimen dentro de cada casilla. La materia no es opcional:
              sin ella el horario no dice nada. */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Datos de clase</label>
            <div className="flex flex-col gap-1.5 bg-gray-50/60 border border-gray-200/60 rounded-xl p-2.5">
              {CAMPOS_OPCIONALES.map(({ clave, etiqueta }) => (
                <label key={clave} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={camposClase[clave]}
                    onChange={e => setCamposClase({ ...camposClase, [clave]: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-espoch-red cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{etiqueta}</span>
                </label>
              ))}
            </div>
          </div>


          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Orientación</label>
            <div className="flex items-center bg-gray-50 p-0.5 rounded-xl border border-gray-200/60 w-full shadow-inner">
              <button onClick={() => setOrientation('vertical')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all ${orientation === 'vertical' ? 'bg-[#1e2733] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>
                <Clock className="w-3.5 h-3.5 rotate-90" /> Vertical
              </button>
              <button onClick={() => setOrientation('horizontal')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all ${orientation === 'horizontal' ? 'bg-[#1e2733] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>
                <Clock className="w-3.5 h-3.5" /> Horizontal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Tamaño de papel</label>
              <div className="flex items-center bg-gray-50 p-0.5 rounded-xl border border-gray-200/60 w-full shadow-inner">
                <button onClick={() => setPaperSize('A4')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${paperSize === 'A4' ? 'bg-[#1e2733] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>A4</button>
                <button onClick={() => setPaperSize('Carta')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${paperSize === 'Carta' ? 'bg-[#1e2733] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>Carta</button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Pie institucional</label>
              <button onClick={() => setIncludeFooter(!includeFooter)} className={`w-full py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all border ${includeFooter ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-200/60'}`}>
                {includeFooter ? <><span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">✓</span> Sí</> : 'No'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Tamaño de fuente</label>
              <div className="flex items-center bg-white rounded-xl border border-gray-200/60 w-full shadow-sm overflow-hidden focus-within:border-red-500 transition-colors">
                <input 
                  type="number" 
                  value={documentFontSize} 
                  onChange={(e) => setDocumentFontSize(Number(e.target.value) || 11)} 
                  className="w-full bg-transparent text-[11px] font-black text-center py-1.5 outline-none text-gray-700" 
                  min="5" 
                  max="30"
                />
                <span className="text-[10px] font-bold text-gray-400 pr-3 select-none">pt</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Tipografía</label>
              <div className="relative">
                <select value={typography} onChange={(e: any) => setTypography(e.target.value)} className="w-full bg-white text-[10px] font-black text-gray-700 rounded-xl py-2 pl-3 pr-8 outline-none border border-gray-200/60 shadow-sm appearance-none cursor-pointer hover:border-gray-300 transition-colors">
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Tahoma">Tahoma</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#fcf8f8] rounded-2xl border border-red-50/50 p-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Resumen de Selección</h4>
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-500 font-semibold"><Building2 className="w-3.5 h-3.5 text-gray-400" /> Edificio / Ubicación</span>
              <span className="font-extrabold text-gray-900 truncate max-w-[150px]">{exportEdificio || '-'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-red-100/30 pt-2.5">
              <span className="flex items-center gap-2 text-gray-500 font-semibold"><Users className="w-3.5 h-3.5 text-gray-400" /> Aula o laboratorio</span>
              <span className="font-extrabold text-gray-900 truncate max-w-[150px]">{exportAula || '-'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-red-100/30 pt-2.5">
              <span className="flex items-center gap-2 text-gray-500 font-semibold"><Clock className="w-3.5 h-3.5 text-gray-400" /> Generado el</span>
              <span className="font-extrabold text-gray-500 text-[11px]">{formattedDate}, {formattedTime}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-2 shrink-0">
        <button onClick={handlePrint} className="w-full py-2.5 rounded-xl bg-[#1e2733] hover:bg-black text-white text-[10px] font-black shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 cursor-pointer">
          <Printer className="w-3.5 h-3.5" /> Imprimir
        </button>
        <button onClick={handleResetFilters} className="w-full py-1.5 text-gray-400 hover:text-gray-600 text-[10px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
          <RefreshCcw className="w-3 h-3" /> Restablecer parámetros
        </button>
      </div>
    </div>
  );
};
