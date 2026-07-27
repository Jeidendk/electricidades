import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFItem {
  nombre: string;
  serie: string;
  categoria: string;
  cantidad: number;
}

export interface PDFRequestData {
  numeroSolicitud: string;
  fecha: string;
  nombre: string;
  cedula: string;
  carrera: string;
  asignatura: string;
  tipoMovimiento: string;
  items: PDFItem[];
}

export const generarPDFComprobante = (data: PDFRequestData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Setup fonts - we'll use Times as a default serif font available in jsPDF
  const fontTitle = 'times';
  
  // Header Text
  doc.setFont(fontTitle, 'bold');
  doc.setFontSize(18);
  doc.text('ESCUELA SUPERIOR POLITÉCNICA', 105, 20, { align: 'center' });
  doc.text('DE CHIMBORAZO', 105, 28, { align: 'center' });
  
  doc.setFont(fontTitle, 'normal');
  doc.setFontSize(12);
  doc.text('FACULTAD DE INFORMÁTICA Y ELECTRÓNICA', 105, 36, { align: 'center' });
  doc.text('CARRERA DE ELECTRICIDAD', 105, 42, { align: 'center' });
  
  // Separator Line
  doc.setLineWidth(0.5);
  doc.line(15, 46, 195, 46);
  
  // Title Box
  doc.setFillColor(240, 240, 240); // Light gray
  doc.setDrawColor(0);
  doc.roundedRect(15, 52, 180, 12, 2, 2, 'FD'); // Fill and Draw
  doc.setFont(fontTitle, 'bold');
  doc.setFontSize(14);
  doc.text('SOLICITUD DE EQUIPAMIENTO DE LABORATORIO', 105, 60, { align: 'center' });
  
  // Request Info
  doc.setFontSize(12);
  doc.text(`Nº: ${data.numeroSolicitud}`, 15, 75);
  doc.text(`Fecha: ${data.fecha}`, 195, 75, { align: 'right' });
  
  // Applicant Data Box
  doc.setDrawColor(0);
  doc.roundedRect(15, 80, 180, 40, 2, 2, 'S'); // Stroke only
  
  doc.setFont(fontTitle, 'bold');
  doc.setFontSize(11);
  doc.text('DATOS DEL SOLICITANTE', 20, 88);
  
  // Two columns for applicant data
  const col1X = 20;
  const col2X = 110;
  
  doc.setFont(fontTitle, 'bold');
  doc.text('Nombre:', col1X, 98);
  doc.setFont(fontTitle, 'normal');
  doc.text(data.nombre, col1X + 18, 98);
  
  doc.setFont(fontTitle, 'bold');
  doc.text('Cédula:', col2X, 98);
  doc.setFont(fontTitle, 'normal');
  doc.text(data.cedula, col2X + 18, 98);
  
  doc.setFont(fontTitle, 'bold');
  doc.text('Carrera:', col1X, 108);
  doc.setFont(fontTitle, 'normal');
  doc.text(data.carrera, col1X + 18, 108);
  
  doc.setFont(fontTitle, 'bold');
  doc.text('Asignatura:', col2X, 108);
  doc.setFont(fontTitle, 'normal');
  doc.text(data.asignatura, col2X + 24, 108);
  
  doc.setFont(fontTitle, 'bold');
  doc.text('Tipo de Movimiento:', col1X, 118);
  doc.setFont(fontTitle, 'normal');
  doc.text(data.tipoMovimiento, col1X + 38, 118);
  
  // Items Table
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.nombre,
    item.serie,
    item.categoria,
    item.cantidad.toString()
  ]);
  
  autoTable(doc, {
    startY: 130,
    head: [['#', 'Nombre del ítem', 'Nº Serie', 'Categoría', 'Cant.']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [0, 0, 0], // Black header
      textColor: [255, 255, 255], 
      font: 'times',
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      font: 'times',
      textColor: [0, 0, 0],
      halign: 'center'
    },
    columnStyles: {
      1: { halign: 'left' } // Left align item name
    },
    styles: { 
      fontSize: 11, 
      cellPadding: 4,
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    }
  });
  
  // Observaciones
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.setFont(fontTitle, 'bold');
  doc.text('OBSERVACIONES:', 15, finalY + 15);
  
  // Signatures
  // We place them at the bottom of the page
  const pageHeight = doc.internal.pageSize.height;
  const signatureY = pageHeight - 40;
  
  // Estudiante Signature
  doc.setDrawColor(0);
  doc.line(25, signatureY, 85, signatureY);
  doc.setFont(fontTitle, 'bold');
  doc.text(data.nombre, 55, signatureY + 6, { align: 'center' });
  doc.setFont(fontTitle, 'normal');
  doc.setFontSize(10);
  doc.text('Estudiante', 55, signatureY + 12, { align: 'center' });
  
  // Laboratorio Signature
  doc.line(125, signatureY, 185, signatureY);
  doc.setFont(fontTitle, 'bold');
  doc.setFontSize(11);
  doc.text('Responsable de Laboratorio', 155, signatureY + 6, { align: 'center' });
  doc.setFont(fontTitle, 'normal');
  doc.setFontSize(10);
  doc.text('Firma y Sello', 155, signatureY + 12, { align: 'center' });
  
  doc.save(`Solicitud_${data.numeroSolicitud}.pdf`);
};
