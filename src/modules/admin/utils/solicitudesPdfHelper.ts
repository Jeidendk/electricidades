import jsPDF from 'jspdf';
import 'jspdf-autotable';
import JSZip from 'jszip';

export const generarPdfSolicitud = (solicitud: any): Blob => {
  const doc = new jsPDF();

  // Color Institucional
  const rojoEspoch = '#b00000';

  // 1. Encabezado Oficial
  doc.setFillColor(rojoEspoch);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO', 105, 14, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('FACULTAD DE INFORMÁTICA Y ELECTRÓNICA - CARRERA DE ELECTRICIDAD', 105, 22, { align: 'center' });

  // 2. Título del Documento
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('REPORTE DE SOLICITUD', 105, 45, { align: 'center' });
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 50, 190, 50);

  // 3. Información Principal
  doc.setFontSize(11);
  
  // Columna 1
  doc.setFont('helvetica', 'bold'); doc.text('ID Solicitud:', 20, 65);
  doc.setFont('helvetica', 'normal'); doc.text(solicitud.id, 55, 65);

  doc.setFont('helvetica', 'bold'); doc.text('Solicitante:', 20, 75);
  doc.setFont('helvetica', 'normal'); doc.text(solicitud.solicitante, 55, 75);

  // Columna 2
  doc.setFont('helvetica', 'bold'); doc.text('Fecha:', 130, 65);
  doc.setFont('helvetica', 'normal'); 
  doc.text(new Date(solicitud.fecha).toLocaleDateString('es-ES'), 150, 65);

  doc.setFont('helvetica', 'bold'); doc.text('Estado:', 130, 75);
  doc.setFont('helvetica', 'normal'); doc.text(solicitud.estado.toUpperCase(), 150, 75);

  doc.setFont('helvetica', 'bold'); doc.text('Tipo:', 20, 85);
  doc.setFont('helvetica', 'normal'); doc.text(solicitud.tipo, 55, 85);

  // 4. Detalle / Asunto
  doc.setFont('helvetica', 'bold'); 
  doc.text('Asunto:', 20, 100);
  doc.setFont('helvetica', 'normal'); 
  
  const splitAsunto = doc.splitTextToSize(solicitud.asunto, 170);
  doc.text(splitAsunto, 20, 107);
  
  let currentY = 107 + (splitAsunto.length * 6) + 5;

  doc.setFont('helvetica', 'bold'); 
  doc.text('Descripción Detallada:', 20, currentY);
  doc.setFont('helvetica', 'normal'); 
  
  const splitDesc = doc.splitTextToSize(solicitud.descripcion, 170);
  doc.text(splitDesc, 20, currentY + 7);
  
  currentY = currentY + 7 + (splitDesc.length * 6) + 20;

  // 5. Firmas
  if (currentY > 230) {
    doc.addPage();
    currentY = 40;
  }
  
  doc.line(40, currentY + 20, 90, currentY + 20); // Línea Firma 1
  doc.line(120, currentY + 20, 170, currentY + 20); // Línea Firma 2
  
  doc.setFontSize(9);
  doc.text('Firma Solicitante', 65, currentY + 25, { align: 'center' });
  doc.text(solicitud.solicitante, 65, currentY + 30, { align: 'center' });
  
  doc.text('Firma Autoridad (Revisión)', 145, currentY + 25, { align: 'center' });

  // 6. Pie de Página
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text('Sistema de Gestión FIE - Área de Electricidad', 20, 285);
    doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
  }

  // Devolver el Blob en lugar de descargar directamente
  return doc.output('blob');
};

export const exportarSolicitudes = async (solicitudes: any[]) => {
  if (solicitudes.length === 1) {
    // Solo descargar 1 PDF
    const blob = generarPdfSolicitud(solicitudes[0]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${solicitudes[0].id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    // Crear ZIP
    const zip = new JSZip();
    
    // Carpeta interna opcional
    const folder = zip.folder("Solicitudes_FIE");
    
    for (let sol of solicitudes) {
      const blob = generarPdfSolicitud(sol);
      folder?.file(`${sol.id}_${sol.tipo.replace(/ /g, '_')}.pdf`, blob);
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Solicitudes_Exportadas.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
