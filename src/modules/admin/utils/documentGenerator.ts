import jsPDF from 'jspdf';

interface DocumentParams {
  headerImgBase64?: string;
  footerImgBase64?: string;
  tituloAutoridad: string;
  nombreAutoridad: string;
  cargo: string;
  lugarFecha: string;
  cuerpo: string;
  studentName: string;
  studentCI: string;
}

export const generatePreviewPDF = (params: DocumentParams): Blob => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Margins
  const marginX = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginX - marginRight;

  // 2. Insert Header Image
  if (params.headerImgBase64) {
    try {
      const props = doc.getImageProperties(params.headerImgBase64);
      const maxW = 80;
      const maxH = 45;
      let targetW = props.width;
      let targetH = props.height;
      const ratio = Math.min(maxW / targetW, maxH / targetH);
      targetW *= ratio;
      targetH *= ratio;
      doc.addImage(params.headerImgBase64, 'PNG', marginX, 0, targetW, targetH);
    } catch (e) {
      doc.addImage(params.headerImgBase64, 'PNG', marginX, 0, 60, 40);
    }
  }

  // 3. Insert Footer Image
  if (params.footerImgBase64) {
    try {
      const props = doc.getImageProperties(params.footerImgBase64);
      const maxW = pageWidth - (marginX * 2);
      const maxH = 25;
      let targetW = props.width;
      let targetH = props.height;
      const ratio = Math.min(maxW / targetW, maxH / targetH);
      targetW *= ratio;
      targetH *= ratio;
      
      const x = (pageWidth - targetW) / 2;
      const y = pageHeight - targetH - 10;
      doc.addImage(params.footerImgBase64, 'PNG', x, y, targetW, targetH);
    } catch (e) {
      doc.addImage(params.footerImgBase64, 'PNG', marginX, pageHeight - 30, pageWidth - (marginX * 2), 20);
    }
  }

  // Set default font to Times New Roman
  doc.setFont('times', 'normal');

  // 4. Date (Right aligned)
  doc.setFontSize(11);
  doc.text(params.lugarFecha, pageWidth - marginRight, 40, { align: 'right' });

  let cursorY = 60;

  // 5. Destinatario Block
  doc.text(params.tituloAutoridad, marginX, cursorY);
  cursorY += 6;
  doc.setFont('times', 'bold');
  doc.text(params.nombreAutoridad.toUpperCase(), marginX, cursorY);
  cursorY += 6;
  doc.text(params.cargo.toUpperCase(), marginX, cursorY);
  cursorY += 6;
  doc.setFont('times', 'normal');
  doc.text('En su despacho,', marginX, cursorY);
  cursorY += 15;

  // 6. Body
  doc.text('De mi consideración:', marginX, cursorY);
  cursorY += 10;

  // Justified body text with 1.5 line spacing
  // Pass the raw string to let jsPDF handle splitting and line height natively
  doc.text(params.cuerpo, marginX, cursorY, { align: 'justify', maxWidth: contentWidth, lineHeightFactor: 1.5 });
  
  // Calculate new Y cursor position
  // 11pt * 1.5 = 16.5pt. 16.5pt in mm = 16.5 * 0.352778 = 5.82 mm per line
  const splitBody = doc.splitTextToSize(params.cuerpo, contentWidth);
  const lineHeightMm = doc.getFontSize() * 1.5 * 0.352778;
  cursorY += (splitBody.length * lineHeightMm) + 15;

  // 7. Closing
  doc.text('Agradezco de antemano la atención brindada y quedo atento a su respuesta.', marginX, cursorY);
  cursorY += 15;
  doc.text('Atentamente,', marginX, cursorY);
  
  cursorY += 30;

  // 8. Signature Block
  const sigLine = '_________________________________';
  const sigX = pageWidth / 2;
  
  doc.text(sigLine, sigX, cursorY, { align: 'center' });
  cursorY += 6;
  doc.setFont('times', 'bold');
  doc.text(params.studentName, sigX, cursorY, { align: 'center' });
  cursorY += 6;
  doc.text(`C.I: ${params.studentCI}`, sigX, cursorY, { align: 'center' });

  return doc.output('blob');
};

export const downloadPDF = (params: DocumentParams, filename: string = 'Documento_Oficial.pdf') => {
  const blob = generatePreviewPDF(params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
