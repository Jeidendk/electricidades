import React from 'react';
import { Download, Plus, BookOpen, FileText, User, Info } from 'lucide-react';
import { dias, horas, availableIcons, rangoIncluyeBloque } from './horariosData';
import { SearchInput } from '../../../../components/ui/SearchInput';
import { FilterDropdown } from '../../../../components/ui/FilterDropdown';

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
}) => {
  const getClaseEnCasilla = (dia: string, hora: string) => {
    return clases.find(c => c.dia === dia && rangoIncluyeBloque(c.hora, hora) &&
      (filterEdificio === '' || c.edificio === filterEdificio) &&
      (filterAula === '' || c.idEspacio === filterAula) &&
      (searchQuery === '' || c.materia.toLowerCase().includes(searchQuery.toLowerCase()) || c.docente.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  // Sin opción "Todos": siempre un edificio concreto (como una pestaña de Excel).
  const edificioOpts = [...edificios]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map(edificio => ({ key: edificio.id, label: edificio.nombre }));

  // Sin opción "Todas": aulas del edificio seleccionado; se muestra una a la vez.
  const aulaOpts = espacios
    .filter(espacio => !filterEdificio || espacio.id_edificio === filterEdificio)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map(espacio => ({ key: espacio.id, label: espacio.nombre }));

  const nombreEdificioFiltrado = edificios.find(edificio => edificio.id === filterEdificio)?.nombre;
  const nombreAulaFiltrada = espacios.find(espacio => espacio.id === filterAula)?.nombre;

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-xl rounded-[20px] shadow-sm border border-gray-200/60 p-4 md:p-5 flex flex-col overflow-hidden animate-fade-in">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-700 via-amber-400 to-red-700 opacity-80"></div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-4 shrink-0 w-full relative z-[60]">
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar clase, docente..."
            className="w-full sm:w-[220px] shrink-0"
          />
          <FilterDropdown
            label="Edificio"
            value={filterEdificio}
            options={edificioOpts}
            onChange={(k) => { setFilterEdificio(k); setFilterAula(''); }}
          />
          <FilterDropdown
            label="Aula"
            value={filterAula}
            options={aulaOpts}
            onChange={(k) => setFilterAula(k)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canFormatAll && (
            <button onClick={handleFormatAll} className="text-gray-600 hover:text-red-700 hover:bg-red-50 bg-white border border-gray-200 font-bold text-[12px] px-3 py-2 rounded-full flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
              <FileText className="w-3.5 h-3.5" /> Formatear todos
            </button>
          )}
          <button onClick={() => { setIsExportModalOpen(true); if (nombreEdificioFiltrado) setExportEdificio(nombreEdificioFiltrado); if (nombreAulaFiltrada) setExportAula(nombreAulaFiltrada); }} className="text-gray-600 hover:text-gray-900 bg-white border border-gray-200 font-bold text-[12px] px-3 py-2 rounded-full flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          <button onClick={() => { setModalMode('create'); setFormValues({ idMateria: '', idDocente: '', idFacultad: '', idCarrera: '', idEdificio: filterEdificio, tipoEspacio: espacios.find(e => e.id === filterAula)?.tipo || '', idEspacio: filterAula, dia: 'Lunes', horaInicio: '07:00', horaFin: '08:00' }); setIsModalOpen(true); }} className="bg-[#0f172a] hover:bg-black text-white font-bold text-[12px] px-4 py-2 rounded-full flex items-center gap-2 shadow-sm transition-all border border-gray-800">
            <Plus className="w-3.5 h-3.5" /> Nueva Clase
          </button>
        </div>
      </div>

      {edificios.length === 0 && (
        <div className="mb-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-[12px] font-semibold text-amber-700 shrink-0">
          No hay edificios registrados. Crea uno en <b>Infraestructura</b> para poder asignar horarios por edificio y aula.
        </div>
      )}
      <div className="flex-1 overflow-auto custom-scrollbar border border-gray-100 rounded-[16px] shadow-sm bg-white">
        <table className="w-full min-w-[900px] border-collapse bg-white">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="w-24 p-3 border border-gray-100 text-center text-[10px] font-extrabold text-gray-800 uppercase tracking-widest bg-gray-50/50">HORA</th>
              {dias.map(d => (
                <th key={d} className="p-3 border border-gray-100 text-center text-[11px] font-extrabold text-gray-800 uppercase tracking-widest bg-gray-50/50 backdrop-blur-sm">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horas.map(hora => (
              <tr key={hora} className="group">
                <td className="w-24 p-2 text-center border border-gray-100 bg-white text-[10px] font-semibold text-gray-700 group-hover:bg-gray-50/50 transition-colors">{hora}</td>
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
                    <td key={`${dia}-${hora}`} className="p-0 border border-gray-100 relative w-[calc(100%/6)] h-[132px] group/cell hover:bg-gray-50/50 transition-colors">
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
                              <span className="text-[10.5px] font-medium text-gray-600 flex items-center gap-1.5 truncate"><BookOpen className="w-[12px] h-[12px] text-gray-400 shrink-0"/> {clase.aula}</span>
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
                                idEspacio: filterAula, dia: dia, horaInicio: hora.split(' - ')[0], horaFin: hora.split(' - ')[1],
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
