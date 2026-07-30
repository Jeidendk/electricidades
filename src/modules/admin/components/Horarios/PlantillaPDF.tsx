import React from 'react';
import { diasFormales, horas, rangoIncluyeBloque } from './horariosData';
import banderaEspoch from '../../../../assets/Bandera-ESPOCH-HORARIOS.webp';

interface PlantillaPDFProps {
  pdfZoom: number;
  orientation: 'vertical' | 'horizontal';
  typography: string;
  headerImg: string;
  footerImg: string;
  exportAula: string;
  exportEdificio: string;
  exportPeriodo: string;
  clases: any[];
  includeFooter: boolean;
  documentFontSize: number;
}

export const PlantillaPDF: React.FC<PlantillaPDFProps> = ({
  pdfZoom,
  orientation,
  typography,
  headerImg,
  footerImg,
  exportAula,
  exportEdificio,
  exportPeriodo,
  clases,
  includeFooter,
  documentFontSize,
}) => {
  const getFontFamily = (font: string) => {
    switch (font) {
      case 'Inter': return '"Inter", sans-serif';
      case 'Roboto': return '"Roboto", sans-serif';
      case 'Montserrat': return '"Montserrat", sans-serif';
      case 'Open Sans': return '"Open Sans", sans-serif';
      case 'Times New Roman': return '"Times New Roman", Times, serif';
      case 'Arial': return 'Arial, Helvetica, sans-serif';
      case 'Helvetica': return 'Helvetica, Arial, sans-serif';
      case 'Courier New': return '"Courier New", Courier, monospace';
      case 'Verdana': return 'Verdana, Geneva, sans-serif';
      case 'Tahoma': return 'Tahoma, Geneva, sans-serif';
      default: return '"Inter", sans-serif';
    }
  };

  const getClaseParaExportacion = (dia: string, hora: string, aulaTarget: string) => {
    return clases.find(c => c.dia.toUpperCase() === dia.toUpperCase() && rangoIncluyeBloque(c.hora, hora) && c.aula === aulaTarget);
  };

  const getHeader1Size = () => `${documentFontSize + 7}px`;
  const getHeader2Size = () => `${documentFontSize + 3}px`;
  const getAulaSize = () => `${documentFontSize + 4}px`;
  const getSubtitleSize = () => `${documentFontSize + 1}px`;
  const getTableSize = () => `${documentFontSize + 2}px`;

  const getTitleSize = () => `${documentFontSize}px`;
  const getSubSize = () => `${Math.max(6, documentFontSize - 2)}px`;

  return (
    <div style={{ transform: `scale(${pdfZoom / 120})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }} className="flex-shrink-0">
      <div 
        id="documento-pdf-oficial" 
        className={`bg-white shadow-[0_60px_50px_rgba(0,0,0,0.08)] px-[80px] pb-8 pt-0 printable-area flex flex-col text-gray-900 relative transition-all ${
          orientation === 'vertical' 
            ? 'w-[800px] h-auto' 
            : 'w-[1300px] h-auto'
        }`}
        style={{ fontFamily: getFontFamily(typography) }}
      >
        {/* HEADER AS A TABLE FOR WORD/EXCEL COMPATIBILITY */}
        <table width="100%" style={{ borderCollapse: 'collapse', border: 'none', borderBottom: '1px solid #ef4444', marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td width="200" align="left" valign="top" style={{ padding: 0 }}>
                <img src={headerImg || banderaEspoch} alt="Escudo ESPOCH" style={{ height: '150px', width: '150px', display: 'block', margin: 0 }} />
              </td>
              <td align="center" valign="middle" style={{ paddingBottom: '4px' }}>
                <h1 style={{ fontSize: getHeader1Size(), fontWeight: '900', letterSpacing: '2px', color: '#0f172a', margin: '0 0 12px 0', textTransform: 'uppercase', fontFamily: getFontFamily(typography) }}>
                  ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO
                </h1>
                <h2 style={{ fontSize: getHeader2Size(), fontWeight: '600', letterSpacing: '1px', color: '#475569', margin: '0', textTransform: 'uppercase', fontFamily: getFontFamily(typography) }}>
                  FACULTAD DE INFORMÁTICA Y ELECTRÓNICA
                </h2>
              </td>
              <td width="150"></td>
            </tr>
          </tbody>
        </table>

        {/* DETAILS SECTION (LEFT ALIGNED) */}
        <div className="mb-1 text-[#0f172a] block text-left" style={{ fontFamily: getFontFamily(typography) }}>
          <div className="block mb-4">
            <span className="font-black uppercase tracking-wide inline-block pb-0.5 pr-10" style={{ fontSize: getAulaSize(), borderBottom: '2px solid black', fontFamily: getFontFamily(typography) }}>
              {exportAula || 'SELECCIONE UN AULA'}
            </span>
          </div>
          
          <div className="flex flex-col gap-1.5" style={{ fontFamily: getFontFamily(typography) }}>
            <div className="uppercase font-black tracking-wider block" style={{ fontSize: getSubtitleSize() }}>
              {exportEdificio 
                ? (exportEdificio.toUpperCase().startsWith('EDIFICIO') ? exportEdificio.toUpperCase() : `EDIFICIO ${exportEdificio.toUpperCase()}`) 
                : 'UBICACIÓN: NO SELECCIONADA'}
            </div>
            <div className="uppercase tracking-wider font-black block" style={{ fontSize: getSubtitleSize() }}>
              {exportPeriodo || 'MARZO 2026 - SEPTIEMBRE 2026'}
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full mt-1 block">
          <table className="schedule-table w-full border-collapse border-[1.5px] border-black" style={{ fontSize: getTableSize(), borderCollapse: 'collapse', border: '1.5px solid black', fontFamily: getFontFamily(typography) }}>
            <thead>
              <tr>
                <th className="border-[1.5px] border-black p-1 font-black uppercase w-[120px] bg-white text-center tracking-wider text-[#0f172a]" style={{ border: '1.5px solid black', fontFamily: getFontFamily(typography) }}>HORA</th>
                {diasFormales.map(d => (
                  <th key={d} className="border-[1.5px] border-black p-1 font-black uppercase tracking-wider bg-white text-center text-[#0f172a]" style={{ border: '1.5px solid black', fontFamily: getFontFamily(typography) }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horas.map((hora) => (
                <tr key={hora} className="h-[50px]">
                  <td className="border-[1.5px] border-black p-0.5 text-center font-bold whitespace-nowrap bg-white align-middle text-[#0f172a]" style={{ border: '1.5px solid black', fontFamily: getFontFamily(typography) }}>
                    {hora.replace(':', 'H').replace(':', 'H')}
                  </td>
                  {diasFormales.map((dia) => {
                    const claseExport = getClaseParaExportacion(dia, hora, exportAula);
                    return (
                      <td key={`${dia}-${hora}`} className="border-[1.5px] border-black p-1 relative align-middle min-w-[15px] text-center" style={{ border: '1.5px solid black', fontFamily: getFontFamily(typography) }}>
                        {claseExport ? (
                          <div className="flex flex-col items-center justify-center w-full h-full gap-1">
                            <span className="font-black uppercase leading-tight text-[#0f172a]" style={{ fontSize: getTitleSize() }}>
                              {claseExport.materia}
                            </span>
                            <span className="uppercase font-medium leading-none text-[#475569]" style={{ fontSize: getSubSize() }}>
                              DOCENTE: {(claseExport.docente || '').replace('Ing. ', '').replace('Dr. ', '')}
                            </span>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        {includeFooter && (
          <div className="mt-12 border-t-[1px] border-[#ef4444] pt-8 text-center text-[10px] text-gray-500 font-medium tracking-wide block w-full" style={{ fontFamily: getFontFamily(typography) }}>
            {footerImg ? (
              <img src={footerImg} alt="Pie de Página" className="w-auto mx-auto object-contain" style={{ height: '45px', maxHeight: '45px' }} />
            ) : (
              <>
                Panamericana Sur Km. 1 ½. | Teléfono: 593 (03) 2 998-200 | Telefax: (03) 2 317-001 | Código Postal: EC060155.<br/>
                Riobamba - Ecuador
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
