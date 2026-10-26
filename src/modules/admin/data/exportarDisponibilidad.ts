import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph,
  Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';

export interface EspacioDisponibleExport {
  id: string;
  nombre: string;
  edificio: string;
  tipo: string;
  libre: boolean;
  minutosLibres: number;
  horasLibres: number;
  tramosLibres: string[];
  motivo?: string;
}

export const exportarPdfDisponibilidad = async (
  espacios: EspacioDisponibleExport[],
  dia: string,
  edificioNombre: string,
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Cabecera institucional
  doc.setFillColor(26, 31, 38);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ESPOCH - FACULTAD DE INFORMÁTICA Y ELECTRÓNICA', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 210, 220);
  doc.text(`REPORTE DE ESPACIOS DISPONIBLES · DÍA: ${dia.toUpperCase()} · ${edificioNombre.toUpperCase()}`, 14, 18);

  const filas = espacios.map((e, index) => [
    String(index + 1),
    e.nombre,
    e.edificio,
    e.tipo?.toLowerCase().includes('laboratorio') ? 'Laboratorio' : 'Aula',
    `${e.horasLibres} horas`,
    e.tramosLibres.length > 0 ? e.tramosLibres.join(', ') : 'Sin disponibilidad',
    e.minutosLibres > 0 ? 'Disponible' : (e.motivo || 'Ocupado'),
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['#', 'Espacio / Aula', 'Edificio', 'Tipo', 'Horas libres', 'Franjas horarias disponibles', 'Estado']],
    body: filas,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [176, 0, 0], // espoch red
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 35 },
      2: { cellWidth: 40 },
      3: { halign: 'center', cellWidth: 28 },
      4: { halign: 'center', cellWidth: 26 },
      5: { cellWidth: 108 },
      6: { halign: 'center', cellWidth: 28 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const fecha = new Date().toLocaleDateString('es-EC');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 150, 160);
  doc.text(`Generado el ${fecha} desde el Sistema de Gestión de Horarios`, 14, 202);

  doc.save(`Disponibilidad_Espacios_${dia}_${edificioNombre.replace(/\s+/g, '_')}.pdf`);
};

export const exportarWordDisponibilidad = async (
  espacios: EspacioDisponibleExport[],
  dia: string,
  edificioNombre: string,
) => {
  const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const bordeGris = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' };
  const bordesCelda = { top: bordeGris, bottom: bordeGris, left: sinBorde, right: sinBorde };

  const encabezadoTabla = new TableRow({
    tableHeader: true,
    children: ['#', 'Espacio / Aula', 'Edificio', 'Tipo', 'Horas libres', 'Franjas disponibles', 'Estado'].map(
      texto => new TableCell({
        borders: bordesCelda,
        shading: { fill: '1A1F26' },
        children: [new Paragraph({
          children: [new TextRun({ text: texto, bold: true, color: 'FFFFFF', size: 18 })],
          alignment: AlignmentType.CENTER,
        })],
      }),
    ),
  });

  const filasTabla = espacios.map((e, index) => new TableRow({
    children: [
      String(index + 1),
      e.nombre,
      e.edificio,
      e.tipo?.toLowerCase().includes('laboratorio') ? 'Laboratorio' : 'Aula',
      `${e.horasLibres} h`,
      e.tramosLibres.length > 0 ? e.tramosLibres.join(', ') : 'Sin disponibilidad',
      e.minutosLibres > 0 ? 'Disponible' : (e.motivo || 'Ocupado'),
    ].map((val, idx) => new TableCell({
      borders: bordesCelda,
      shading: index % 2 === 1 ? { fill: 'F8FAFC' } : undefined,
      children: [new Paragraph({
        children: [new TextRun({
          text: val,
          bold: idx === 1,
          size: 17,
          color: idx === 6 && e.minutosLibres > 0 ? '16A34A' : '334155',
        })],
        alignment: idx === 0 || idx === 3 || idx === 4 || idx === 6 ? AlignmentType.CENTER : AlignmentType.LEFT,
      })],
    })),
  }));

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: 'landscape' as any,
          },
        },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'ESPOCH - FACULTAD DE INFORMÁTICA Y ELECTRÓNICA', bold: true, size: 24, color: 'B00000' })],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `REPORTE DE ESPACIOS DISPONIBLES · DÍA: ${dia.toUpperCase()} · ${edificioNombre.toUpperCase()}`, size: 18, color: '64748B' })],
          spacing: { after: 180 },
        }),
        new Table({
          rows: [encabezadoTabla, ...filasTabla],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Disponibilidad_Espacios_${dia}_${edificioNombre.replace(/\s+/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
