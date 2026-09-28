import jsPDF from 'jspdf';
import JSZip from 'jszip';

export interface DocumentParams {
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

const escaparXml = (valor: string) => valor
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

interface ImagenWord {
  base64: string;
  extension: 'png' | 'jpg';
  contentType: 'image/png' | 'image/jpeg';
  anchoEmu: number;
  altoEmu: number;
}

const cargarImagenWord = async (
  dataUrl: string | undefined,
  maxAnchoMm: number,
  maxAltoMm: number,
): Promise<ImagenWord | null> => {
  if (!dataUrl) return null;
  const coincidencia = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i);
  if (!coincidencia) return null;

  const dimensiones = await new Promise<{ ancho: number; alto: number }>((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve({ ancho: imagen.naturalWidth, alto: imagen.naturalHeight });
    imagen.onerror = () => reject(new Error('No se pudo leer una imagen institucional.'));
    imagen.src = dataUrl;
  });

  const escala = Math.min(maxAnchoMm / dimensiones.ancho, maxAltoMm / dimensiones.alto);
  const emuPorMm = 36000;
  const mime = coincidencia[1].toLowerCase();
  return {
    base64: coincidencia[2],
    extension: mime === 'image/png' ? 'png' : 'jpg',
    contentType: mime === 'image/png' ? 'image/png' : 'image/jpeg',
    anchoEmu: Math.round(dimensiones.ancho * escala * emuPorMm),
    altoEmu: Math.round(dimensiones.alto * escala * emuPorMm),
  };
};

const dibujoWord = (relacionId: string, imagen: ImagenWord, id: number, nombre: string) => `
  <w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
    <wp:extent cx="${imagen.anchoEmu}" cy="${imagen.altoEmu}"/>
    <wp:docPr id="${id}" name="${nombre}"/>
    <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <pic:pic>
        <pic:nvPicPr><pic:cNvPr id="${id}" name="${nombre}"/><pic:cNvPicPr/></pic:nvPicPr>
        <pic:blipFill><a:blip r:embed="${relacionId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
        <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${imagen.anchoEmu}" cy="${imagen.altoEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
      </pic:pic>
    </a:graphicData></a:graphic>
  </wp:inline></w:drawing></w:r>`;

const parteImagenWord = (tipo: 'header' | 'footer', imagen: ImagenWord) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:${tipo === 'header' ? 'hdr' : 'ftr'}
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
    <w:p><w:pPr><w:jc w:val="${tipo === 'header' ? 'left' : 'center'}"/></w:pPr>${dibujoWord('rId1', imagen, tipo === 'header' ? 1 : 2, tipo === 'header' ? 'Sello institucional' : 'Pie institucional')}</w:p>
  </w:${tipo === 'header' ? 'hdr' : 'ftr'}>`;

const parrafoWord = (texto: string, opciones?: { negrita?: boolean; alineacion?: 'left' | 'right' | 'center' | 'both'; espacioDespues?: number }) => `
  <w:p>
    <w:pPr>
      <w:jc w:val="${opciones?.alineacion || 'left'}"/>
      <w:spacing w:after="${opciones?.espacioDespues ?? 120}" w:line="360" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:rPr>${opciones?.negrita ? '<w:b/>' : ''}<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr>
      <w:t xml:space="preserve">${escaparXml(texto)}</w:t>
    </w:r>
  </w:p>`;

/** Documento OOXML editable. Word, LibreOffice y Google Docs pueden abrirlo directamente. */
export const generatePreviewDOCX = async (params: DocumentParams): Promise<Blob> => {
  const zip = new JSZip();
  const [imagenEncabezado, imagenPie] = await Promise.all([
    cargarImagenWord(params.headerImgBase64, 80, 35),
    cargarImagenWord(params.footerImgBase64, 160, 20),
  ]);

  const tiposImagen = new Map<string, string>();
  if (imagenEncabezado) tiposImagen.set(imagenEncabezado.extension, imagenEncabezado.contentType);
  if (imagenPie) tiposImagen.set(imagenPie.extension, imagenPie.contentType);
  const tiposPredeterminados = [...tiposImagen.entries()]
    .map(([extension, contentType]) => `<Default Extension="${extension}" ContentType="${contentType}"/>`)
    .join('');

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      ${tiposPredeterminados}
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
      ${imagenEncabezado ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ''}
      ${imagenPie ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : ''}
    </Types>`);
  zip.folder('_rels')!.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`);
  zip.folder('word')!.file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr></w:style>
    </w:styles>`);
  const relacionesDocumento = [
    imagenEncabezado ? '<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' : '',
    imagenPie ? '<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' : '',
  ].join('');
  zip.folder('word')!.folder('_rels')!.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relacionesDocumento}</Relationships>`);

  if (imagenEncabezado) {
    zip.folder('word')!.file('header1.xml', parteImagenWord('header', imagenEncabezado));
    zip.folder('word')!.folder('_rels')!.file('header1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/header.${imagenEncabezado.extension}"/></Relationships>`);
    zip.folder('word')!.folder('media')!.file(`header.${imagenEncabezado.extension}`, imagenEncabezado.base64, { base64: true });
  }
  if (imagenPie) {
    zip.folder('word')!.file('footer1.xml', parteImagenWord('footer', imagenPie));
    zip.folder('word')!.folder('_rels')!.file('footer1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/footer.${imagenPie.extension}"/></Relationships>`);
    zip.folder('word')!.folder('media')!.file(`footer.${imagenPie.extension}`, imagenPie.base64, { base64: true });
  }

  const contenido = [
    parrafoWord(params.lugarFecha, { alineacion: 'right', espacioDespues: 360 }),
    parrafoWord(params.tituloAutoridad, { espacioDespues: 0 }),
    parrafoWord(params.nombreAutoridad.toUpperCase(), { negrita: true, espacioDespues: 0 }),
    parrafoWord(params.cargo.toUpperCase(), { negrita: true, espacioDespues: 0 }),
    parrafoWord('En su despacho,', { espacioDespues: 360 }),
    parrafoWord('De mi consideración:', { espacioDespues: 240 }),
    parrafoWord(params.cuerpo, { alineacion: 'both', espacioDespues: 300 }),
    parrafoWord('Agradezco de antemano la atención brindada y quedo atento a su respuesta.', { espacioDespues: 300 }),
    parrafoWord('Atentamente,', { espacioDespues: 600 }),
    parrafoWord('_________________________________', { alineacion: 'center', espacioDespues: 60 }),
    parrafoWord(params.studentName, { negrita: true, alineacion: 'center', espacioDespues: 0 }),
    parrafoWord(`C.I: ${params.studentCI}`, { negrita: true, alineacion: 'center' }),
  ].join('');

  zip.folder('word')!.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <w:body>${contenido}<w:sectPr>
        ${imagenEncabezado ? '<w:headerReference w:type="default" r:id="rIdHeader"/>' : ''}
        ${imagenPie ? '<w:footerReference w:type="default" r:id="rIdFooter"/>' : ''}
        <w:pgSz w:w="11906" w:h="16838"/>
        <w:pgMar w:top="1701" w:right="1417" w:bottom="1134" w:left="1417" w:header="283" w:footer="283"/>
      </w:sectPr></w:body>
    </w:document>`);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
};

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
