import React, { useState } from 'react';
import { Download, Upload, Trash2, Plus, BookOpen, FileText, User, Info, Search, Building2, ChevronRight, DoorOpen, Layers, Hash } from 'lucide-react';
import { dias, horas, availableIcons, rangoIncluyeBloque, etiquetaPaoParalelo, PARALELO_POR_DEFECTO } from './horariosData';
import { mismoDia } from '../../../../lib/texto';
import { SearchInput } from '../../../../components/ui/SearchInput';

interface HorarioVistaProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterEdificio: string;
  setFilterEdificio: (val: string) => void;
  filterAula: string;
  setFilterAula: (val: string) => void;
  setIsExportModalOpen: (val: boolean) => void;
  setExportEdificio: (val: string) => void;
  setExportAula: (val: string) => void;
  setModalMode: (val: 'create' | 'edit') => void;
  setFormValues: (val: any) => void;
  setIsModalOpen: (val: boolean) => void;
  clases: any[];
  carreras: any[];
  edificios: any[];
  espacios: any[];
  setSelectedClaseId: (val: string | null) => void;
  handleFormatAll: () => void;
  canFormatAll: boolean;
  handleImportar: () => void;
  handleBorrarClasesDelAula: () => void;
  canBorrarAula: boolean;
  /** Cuántas clases tiene el aula filtrada: en 0 no se ofrece borrar (evita un borrado vacío). */
  clasesEnAulaSeleccionada: number;
}

const hexToRgba = (hex: string, opacity: number) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` : `rgba(0,0,0,${opacity})`;
};

export const HorarioVista: React.FC<HorarioVistaProps> = ({
  searchQuery,
  setSearchQuery,
  filterEdificio,
  setFilterEdificio,
  filterAula,
  setFilterAula,
  setIsExportModalOpen,
  setExportEdificio,
  setExportAula,
  setModalMode,
  setFormValues,
  setIsModalOpen,
  clases,
  carreras,
  edificios,
  espacios,
  setSelectedClaseId,
  handleFormatAll,
  canFormatAll,
  handleImportar,
  handleBorrarClasesDelAula,
  canBorrarAula,
  clasesEnAulaSeleccionada,
}) => {
  const getClaseEnCasilla = (dia: string, hora: string) => {
    const q = searchQuery.trim().toLowerCase();
    return clases.find(c => mismoDia(c.dia, dia) && rangoIncluyeBloque(c.hora, hora) && (
      // Al buscar por clase/docente se IGNORA el filtro de edificio/aula: así se ve
      // dónde dicta ese docente (o materia) en todas sus aulas. Sin búsqueda, filtra por ubicación.
      q
        ? (c.materia.toLowerCase().includes(q) || c.docente.toLowerCase().includes(q))
        : ((filterEdificio === '' || c.edificio === filterEdificio) && (filterAula === '' || c.idEspacio === filterAula))
    ));
  };

  const nombreEdificioFiltrado = edificios.find(edificio => edificio.id === filterEdificio)?.nombre;
  const nombreAulaFiltrada = espacios.find(espacio => espacio.id === filterAula)?.nombre;
  const pisoActual = espacios.find(espacio => espacio.id === filterAula)?.piso;

  // Sin aula seleccionada o sin clases no hay nada que borrar: el botón queda inactivo.
  const puedeBorrarAulaActual = filterAula !== '' && clasesEnAulaSeleccionada > 0;

  // Al buscar (clase/docente) se ignora el filtro de ubicación: la grilla muestra dónde dicta
  // en varios edificios/pisos/aulas. Los chips se colapsan a un guion y las tarjetas muestran
  // edificio + piso para que el docente pueda ubicar/imprimir cada clase.
  const searchActive = searchQuery.trim() !== '';
  const nombreEdificioDeClase = (c: any) => edificios.find(e => e.id === c.edificio)?.nombre;
  const pisoDeClase = (c: any) => espacios.find(e => e.id === c.idEspacio)?.piso;

  // Panel "Ubicaciones" — maestro/detalle: Edificios (izq) → Pisos y aulas (der).
  const [navOpen, setNavOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [openPiso, setOpenPiso] = useState<string | null>(null);
  const edificiosNav = [...edificios].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const [navEd, setNavEd] = useState<string>('');
  const openNav = () => { setNavEd(filterEdificio || edificiosNav[0]?.id || ''); setOpenPiso(null); setNavSearch(''); setNavOpen(true); };
  const togglePiso = (key: string) => setOpenPiso(p => (p === key ? null : key));
  const selectAula = (edId: string, aulaId: string) => { setFilterEdificio(edId); setFilterAula(aulaId); setNavOpen(false); };

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-xl rounded-[20px] shadow-sm border border-gray-200/60 p-4 md:p-5 flex flex-col overflow-hidden animate-fade-in">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-700 via-amber-400 to-red-700 opacity-80"></div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-4 shrink-0 w-full relative z-[60]">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => (navOpen ? setNavOpen(false) : openNav())}
            title="Ubicaciones (edificios, pisos y aulas)"
            className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${navOpen ? 'bg-[#0f172a] text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Building2 className="w-4 h-4" />
          </button>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar clase, docente..."
            className="w-full sm:w-[220px] shrink-0"
          />
          {/* Selección actual (se cambia desde el panel Ubicaciones). Al buscar docente/clase se
              colapsan a un guion: indica que la grilla traza sus clases en varios edificios/pisos/aulas. */}
          {searchActive ? (
            <span title="Buscando en todos los edificios, pisos y aulas" className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"><Search className="w-3.5 h-3.5 text-gray-400 shrink-0" /> —</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap max-w-[180px]"><Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" /> <span className="truncate">{nombreEdificioFiltrado || 'Sin edificio'}</span></span>
              <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"><Layers className="w-3.5 h-3.5 text-gray-500 shrink-0" /> {pisoActual != null ? `Piso ${pisoActual}` : 'Sin piso'}</span>
              <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap max-w-[160px]"><DoorOpen className="w-3.5 h-3.5 text-gray-500 shrink-0" /> <span className="truncate">{nombreAulaFiltrada || 'Sin aula'}</span></span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {canFormatAll && (
            <button onClick={handleFormatAll} className="text-gray-600 hover:text-red-700 hover:bg-red-50 bg-white border border-gray-200 font-bold text-[12px] px-3 py-2 rounded-full flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
              <FileText className="w-3.5 h-3.5" /> Formatear todos
            </button>
          )}
          {canBorrarAula && (
            <button
              onClick={handleBorrarClasesDelAula}
              disabled={!puedeBorrarAulaActual}
              title={
                !filterAula
                  ? 'Selecciona un aula para borrar su horario'
                  : clasesEnAulaSeleccionada === 0
                    ? `${nombreAulaFiltrada || 'Esta aula'} no tiene clases que borrar`
                    : `Borrar las ${clasesEnAulaSeleccionada} clases de ${nombreAulaFiltrada}`
              }
              className="text-red-700 bg-white border border-red-200 font-bold text-[12px] px-3 py-2 rounded-full flex items-center gap-2 shadow-sm transition-all hover:bg-red-50 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" /> Borrar aula
              {clasesEnAulaSeleccionada > 0 && (
                <span className="bg-red-50 text-red-700 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none">{clasesEnAulaSeleccionada}</span>
              )}
            </button>
          )}
          <button onClick={handleImportar} title="Importar horario desde Excel o CSV" className="text-gray-600 hover:text-gray-900 bg-white border border-gray-200 font-bold text-[12px] px-3 py-2 rounded-full flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:bg-gray-50">
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>
          <button onClick={() => { setIsExportModalOpen(true); if (nombreEdificioFiltrado) setExportEdificio(nombreEdificioFiltrado); if (nombreAulaFiltrada) setExportAula(nombreAulaFiltrada); }} className="text-gray-600 hover:text-gray-900 bg-white border border-gray-200 font-bold text-[12px] px-3 py-2 rounded-full flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          <button onClick={() => { setModalMode('create'); setFormValues({ idMateria: '', idDocente: '', idFacultad: '', idCarrera: '', idEdificio: filterEdificio, tipoEspacio: espacios.find(e => e.id === filterAula)?.tipo || '', idEspacio: filterAula, paralelo: PARALELO_POR_DEFECTO, dia: 'Lunes', horaInicio: '07:00', horaFin: '08:00' }); setIsModalOpen(true); }} className="bg-[#0f172a] hover:bg-black text-white font-bold text-[12px] px-4 py-2 rounded-full flex items-center gap-2 shadow-sm transition-all border border-gray-800">
            <Plus className="w-3.5 h-3.5" /> Nueva Clase
          </button>
        </div>
      </div>

      {edificios.length === 0 && (
        <div className="mb-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-[12px] font-semibold text-amber-700 shrink-0">
          No hay edificios registrados. Crea uno en <b>Infraestructura</b> para poder asignar horarios por edificio y aula.
        </div>
      )}
      <div className="flex-1 min-h-0 relative overflow-hidden">
      <div className="absolute inset-0 overflow-auto custom-scrollbar border border-gray-100 rounded-[16px] shadow-sm bg-white">
        <table className="w-full min-w-[900px] border-collapse bg-white">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="w-24 p-3 border border-gray-200 text-center text-[10px] font-extrabold text-gray-800 uppercase tracking-widest bg-gray-50/50">HORA</th>
              {dias.map(d => (
                <th key={d} className="p-3 border border-gray-200 text-center text-[11px] font-extrabold text-gray-800 uppercase tracking-widest bg-gray-50/50 backdrop-blur-sm">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horas.map(hora => (
              <tr key={hora} className="group">
                <td className="w-24 p-2 text-center border border-gray-200 bg-white text-[10px] font-semibold text-gray-700 group-hover:bg-gray-50/50 transition-colors">{hora}</td>
                {dias.map(dia => {
                  const clase = getClaseEnCasilla(dia, hora);
                  let bgStyle = {};
                  let borderStyle = {};
                  let textColor = "#4b5563"; // default gray
                  let hexColor = "#9ca3af";
                  let IconoCarrera = null;
                  let customSvgContent: string | null = null;
                  let carreraNombre = '';

                  if (clase && clase.idCarrera) {
                    const carreraInfo = carreras.find(c => c.id === clase.idCarrera);
                    if (carreraInfo) {
                      hexColor = carreraInfo.color_hex || '#9ca3af';
                      bgStyle = { backgroundColor: hexToRgba(hexColor, 0.1) };
                      borderStyle = { borderColor: hexToRgba(hexColor, 0.4) };
                      textColor = hexColor;
                      carreraNombre = carreraInfo.nombre;
                      
                      if (carreraInfo.customSvg) {
                         customSvgContent = carreraInfo.customSvg;
                      } else if (carreraInfo.icono && availableIcons[carreraInfo.icono]) {
                         IconoCarrera = availableIcons[carreraInfo.icono];
                      }
                    }
                  } else if (clase) {
                     // Fallback for old data structure if still exists
                     bgStyle = { backgroundColor: '#f3f4f6' };
                  }
                  
                  return (
                    <td key={`${dia}-${hora}`} className="p-0 border border-gray-200 relative w-[calc(100%/6)] h-[132px] group/cell hover:bg-gray-50/50 transition-colors">
                      {clase ? (
                        <div className="w-full h-full p-2.5 flex items-center justify-center relative z-10">
                          <div 
                            onClick={() => { 
                              setSelectedClaseId(clase.id); 
                              setFormValues({ 
                                idMateria: clase.idMateria, 
                                idDocente: clase.idDocente, 
                                idFacultad: clase.idFacultad,
                                idCarrera: clase.idCarrera,
                                tipoEspacio: clase.tipoEspacio,
                                idEdificio: clase.edificio, 
                                idEspacio: clase.idEspacio, 
                                paralelo: clase.paralelo != null ? String(clase.paralelo) : '',
                                dia: clase.dia, 
                                horaInicio: clase.horaInicio,
                                horaFin: clase.horaFin,
                              }); 
                              setModalMode('edit'); 
                              setIsModalOpen(true); 
                            }}
                            className={`w-full h-full p-2.5 rounded-[8px] border flex flex-col justify-center gap-1 cursor-pointer shadow-sm hover:shadow-md transition-all relative overflow-hidden`}
                            style={{ ...bgStyle, ...borderStyle }}
                          >
                            <div className="flex items-start gap-2 mb-0.5" style={{ color: textColor }}>
                              <div className="mt-0.5 shrink-0">
                                {customSvgContent ? (
                                  <div className="w-4 h-4 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: customSvgContent.replace(/<svg/, `<svg fill="${textColor}"`) }} />
                                ) : IconoCarrera ? (
                                  <IconoCarrera className="w-4 h-4" strokeWidth={2.5}/>
                                ) : (
                                  <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: hexColor }}></span>
                                )}
                              </div>
                              <span className="text-[13px] font-bold leading-tight truncate">{clase.materia}</span>
                            </div>
                            {carreraNombre && (
                              <div className="pl-[24px] mb-1">
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full truncate inline-block max-w-full" style={{ backgroundColor: hexToRgba(hexColor, 0.15), color: textColor }}>{carreraNombre}</span>
                              </div>
                            )}
                            <div className="pl-[24px] flex flex-col gap-1">
                              {searchActive && nombreEdificioDeClase(clase) && (
                                <span className="text-[10.5px] font-medium text-gray-600 flex items-center gap-1.5 truncate"><Building2 className="w-[12px] h-[12px] text-gray-400 shrink-0"/> {nombreEdificioDeClase(clase)}</span>
                              )}
                              {searchActive && pisoDeClase(clase) != null && (
                                <span className="text-[10.5px] font-medium text-gray-600 flex items-center gap-1.5 truncate"><Layers className="w-[12px] h-[12px] text-gray-400 shrink-0"/> Piso {pisoDeClase(clase)}</span>
                              )}
                              <span className="text-[10.5px] font-medium text-gray-600 flex items-center gap-1.5 truncate"><BookOpen className="w-[12px] h-[12px] text-gray-400 shrink-0"/> {clase.aula}</span>
                              {etiquetaPaoParalelo(clase.pao, clase.paralelo) && (
                                <span className="text-[10.5px] font-medium text-gray-600 flex items-center gap-1.5 truncate"><Hash className="w-[12px] h-[12px] text-gray-400 shrink-0"/> {etiquetaPaoParalelo(clase.pao, clase.paralelo)}</span>
                              )}
                              <span className="text-[10.5px] font-medium text-gray-600 flex items-center gap-1.5 truncate"><User className="w-[12px] h-[12px] text-gray-400 shrink-0"/> {clase.docente}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity z-0">
                          <button 
                            onClick={() => {
                              setModalMode('create');
                              setFormValues({
                                idMateria: '', idDocente: '', idFacultad: '', idCarrera: '', idEdificio: filterEdificio, tipoEspacio: espacios.find(e => e.id === filterAula)?.tipo || '',
                                idEspacio: filterAula, paralelo: PARALELO_POR_DEFECTO, dia: dia, horaInicio: hora.split(' - ')[0], horaFin: hora.split(' - ')[1],
                              });
                              setIsModalOpen(true);
                            }}
                            className="w-10 h-10 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center hover:bg-red-100 hover:scale-110 shadow-sm transition-all"
                            title={`Asignar clase el ${dia} a las ${hora}`}
                          >
                            <Plus className="w-5 h-5" strokeWidth={2.5} />
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PANEL UBICACIONES — maestro/detalle, overlay sobre la tabla (cierra al hacer clic fuera) */}
      {navOpen && <div className="absolute inset-0 z-[30] bg-transparent" onClick={() => setNavOpen(false)} />}
      <div className={`absolute inset-y-0 left-0 z-[40] w-[560px] max-w-[92%] flex flex-col transition-transform duration-300 pointer-events-none ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-3 pt-3 pb-2 shrink-0 pointer-events-auto">
          <div className="relative w-[250px] max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={navSearch} onChange={e => setNavSearch(e.target.value)} placeholder="Buscar edificio, piso o aula..." className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[12.5px] text-gray-700 outline-none shadow-sm focus:bg-white focus:border-espoch-red/40 focus:ring-2 focus:ring-espoch-red/10 transition-colors" />
          </div>
        </div>
        <div className="flex-1 min-h-0 flex items-start gap-3 px-3 pb-3 pointer-events-none">
          {/* Izquierda: Edificios (tarjeta propia, se acopla al contenido) */}
          <div className="w-[250px] shrink-0 max-h-full overflow-y-auto custom-scrollbar border border-gray-200 rounded-2xl bg-white p-1.5 flex flex-col gap-0.5 pointer-events-auto">
            <div className="px-2 py-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Building2 className="w-3 h-3" /> Edificios</div>
            {edificiosNav
              .filter(ed => { const q = navSearch.toLowerCase(); return !q || ed.nombre.toLowerCase().includes(q) || espacios.some(e => e.id_edificio === ed.id && e.nombre.toLowerCase().includes(q)); })
              .map(ed => {
                const total = espacios.filter(e => e.id_edificio === ed.id).length;
                const activo = navEd === ed.id;
                return (
                  <button key={ed.id} onClick={() => { setNavEd(ed.id); setOpenPiso(null); }} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] font-bold transition-colors border ${activo ? 'bg-espoch-red/10 text-espoch-red border-espoch-red/20' : 'text-gray-700 hover:bg-gray-50 border-transparent'}`}>
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${activo ? 'text-espoch-red' : 'text-gray-400'}`} />
                    <span className="truncate flex-1">{ed.nombre}</span>
                    <span className={`text-[9px] font-bold rounded-full px-1.5 shrink-0 ${activo ? 'bg-espoch-red/15 text-espoch-red' : 'bg-gray-100 text-gray-400'}`}>{total}</span>
                  </button>
                );
              })}
            {edificiosNav.length === 0 && <span className="text-[12px] text-gray-400 px-2 py-3">No hay edificios.</span>}
          </div>
          {/* Derecha: Pisos y aulas (tarjeta propia, se acopla al contenido) */}
          <div className="w-[230px] shrink-0 max-h-full overflow-y-auto custom-scrollbar border border-gray-200 rounded-2xl bg-white p-1.5 flex flex-col gap-1 pointer-events-auto">
            <div className="px-2 py-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Layers className="w-3 h-3" /> Pisos y aulas</div>
            {(() => {
              const q = navSearch.toLowerCase();
              const aulasEd = espacios.filter(e => e.id_edificio === navEd && (!q || e.nombre.toLowerCase().includes(q)));
              if (!navEd) return <span className="text-[12px] text-gray-400 px-2 py-3">Elige un edificio.</span>;
              const pisos = [...new Set(aulasEd.map(a => a.piso ?? 1))].sort((x, y) => x - y);
              if (pisos.length === 0) return <span className="text-[12px] text-gray-400 px-2 py-3">Sin aulas.</span>;
              return pisos.map(piso => {
                const pisoKey = `${navEd}::${piso}`;
                const aulasPiso = aulasEd.filter(a => (a.piso ?? 1) === piso).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
                const abierto = openPiso === pisoKey || !!navSearch;
                return (
                  <div key={pisoKey} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button onClick={() => togglePiso(pisoKey)} className={`w-full flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold transition-colors ${abierto ? 'bg-espoch-red/5 text-espoch-red' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${abierto ? 'rotate-90' : ''}`} />
                      <span className="flex-1 text-left">Piso {piso}</span>
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 rounded-full px-1.5">{aulasPiso.length}</span>
                    </button>
                    {abierto && (
                      <div className="p-1.5 flex flex-col gap-0.5 border-t border-gray-100">
                        {aulasPiso.map(a => {
                          const activo = filterAula === a.id;
                          return (
                            <div key={a.id} onClick={() => selectAula(navEd, a.id)} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-[12px] ${activo ? 'bg-espoch-red/10 text-espoch-red font-bold' : 'text-gray-700 hover:bg-gray-50'}`}>
                              <DoorOpen className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{a.nombre}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between shrink-0 bg-white p-3 rounded-xl border border-gray-100 gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {carreras.map(carrera => {
            const Icon = carrera.icono ? availableIcons[carrera.icono] : null;
            return (
              <div key={carrera.id} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: carrera.color_hex || '#9ca3af' }}></span>
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                  {carrera.customSvg ? (
                    <div className="w-3 h-3 opacity-60" dangerouslySetInnerHTML={{ __html: carrera.customSvg }} />
                  ) : Icon ? (
                    <Icon className="w-3 h-3 opacity-60" />
                  ) : null}
                  {carrera.nombre}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 shrink-0">
          <Info className="w-3.5 h-3.5" /> Los horarios se muestran en hora local
        </div>
      </div>
    </div>
  );
};
