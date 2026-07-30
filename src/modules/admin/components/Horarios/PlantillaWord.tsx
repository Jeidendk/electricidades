import React from 'react';
import { diasFormales, horas, rangoIncluyeBloque } from './horariosData';
import banderaEspoch from '../../../../assets/Bandera-ESPOCH-HORARIOS.webp';

interface PlantillaWordProps {
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

export const PlantillaWord: React.FC<PlantillaWordProps> = ({
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
    <div id="documento-word-oficial" style={{ fontFamily: getFontFamily(typography), color: '#000000' }}>
      
      {/* HEADER */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse', border: 'none', marginBottom: '5px' }}>
        <tbody>
          <tr>
            <td width="200" align="left" valign="middle" style={{ paddingBottom: '10px', borderBottom: '2px solid #ef4444' }}>
              <img src={headerImg || banderaEspoch} alt="Escudo ESPOCH" width="160" style={{ display: 'block' }} />
            </td>
            <td align="center" valign="middle" style={{ paddingBottom: '10px', borderBottom: '2px solid #ef4444' }}>
              <p style={{ fontSize: getHeader1Size(), fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase', fontFamily: getFontFamily(typography) }}>
                ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO
              </p>
              <p style={{ fontSize: getHeader2Size(), fontWeight: 'bold', margin: '0', textTransform: 'uppercase', color: '#475569', fontFamily: getFontFamily(typography) }}>
                FACULTAD DE INFORMÁTICA Y ELECTRÓNICA
              </p>
            </td>
            <td width="50" style={{ borderBottom: '2px solid #ef4444' }}></td>
          </tr>
        </tbody>
      </table>

      {/* DETAILS */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse', border: 'none', marginBottom: '10px' }}>
        <tbody>
          <tr>
            <td align="left" style={{ padding: '5px 0' }}>
              <div style={{ paddingBottom: '5px', fontSize: getAulaSize(), fontWeight: 'bold', textTransform: 'uppercase', fontFamily: getFontFamily(typography) }}>
                <span style={{ borderBottom: '2px solid black', paddingBottom: '2px' }}>
                  {exportAula || 'SELECCIONE UN AULA'}
                </span>
              </div>
              <div style={{ paddingBottom: '4px', fontSize: getSubtitleSize(), fontWeight: 'bold', textTransform: 'uppercase', fontFamily: getFontFamily(typography) }}>
                {exportEdificio 
                  ? (exportEdificio.toUpperCase().startsWith('EDIFICIO') ? exportEdificio.toUpperCase() : `EDIFICIO ${exportEdificio.toUpperCase()}`) 
                  : 'UBICACIÓN: NO SELECCIONADA'}
              </div>
              <div style={{ fontSize: getSubtitleSize(), fontWeight: 'bold', textTransform: 'uppercase', fontFamily: getFontFamily(typography) }}>
                {exportPeriodo || 'MARZO 2026 - SEPTIEMBRE 2026'}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* SCHEDULE TABLE */}
      <table width="100%" cellPadding="3" cellSpacing="0" style={{ fontSize: getTableSize(), borderCollapse: 'collapse', width: '100%', border: '1.5px solid black', fontFamily: getFontFamily(typography) }}>
        <thead>
          <tr>
            <th style={{ width: '120px', border: '1.5px solid black', padding: '5px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', backgroundColor: '#ffffff' }}>HORA</th>
            {diasFormales.map(d => (
              <th key={d} style={{ border: '1.5px solid black', padding: '5px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', backgroundColor: '#ffffff' }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horas.map((hora) => (
            <tr key={hora} style={{ height: '35px' }}>
              <td style={{ border: '1.5px solid black', padding: '5px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {hora.replace(':', 'H').replace(':', 'H')}
              </td>
              {diasFormales.map((dia) => {
                const claseExport = getClaseParaExportacion(dia, hora, exportAula);
                return (
                  <td key={`${dia}-${hora}`} style={{ border: '1.5px solid black', padding: '5px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {claseExport ? (
                      <div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: getTitleSize(), marginBottom: '3px' }}>
                          {claseExport.materia}
                        </div>
                        <div style={{ textTransform: 'uppercase', fontSize: getSubSize() }}>
                          DOCENTE: {(claseExport.docente || '').replace('Ing. ', '').replace('Dr. ', '')}
                        </div>
                      </div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* FOOTER */}
      {includeFooter && (
        <>
          <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse', borderTop: '1.5px solid #ef4444', marginTop: '10px' }}>
            <tbody>
              <tr>
                <td align="center" style={{ paddingTop: '15px' }}>
                {footerImg ? (
                  <img src={footerImg} alt="Pie de Página" height="45" />
                ) : (
                  <p style={{ margin: '0', fontSize: '10px', color: '#666666', textAlign: 'center', fontFamily: getFontFamily(typography) }}>
                    Panamericana Sur Km. 1 ½. | Teléfono: 593 (03) 2 998-200 | Telefax: (03) 2 317-001 | Código Postal: EC060155.<br/>
                    Riobamba - Ecuador
                  </p>
                )}
              </td>
            </tr>
          </tbody>
        </table>
        </>
      )}
    </div>
  );
};
