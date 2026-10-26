import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph,
  Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import type { Reporte } from '../../../store/reportesStore';

const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-EC', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export const exportarPdfHistorial = async (
  reportes: Reporte[],
  tituloExtra: string = 'TODOS LOS REGISTROS',
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
  doc.text(`BITÁCORA DE AUDITORÍA Y HISTORIAL DE REPORTES · ${tituloExtra.toUpperCase()}`, 14, 18);

  const filas = reportes.map((r, index) => [
    String(index + 1),
    r.tipo === 'Horarios' ? 'Horarios por aula' :
    r.tipo === 'Docentes' ? 'Carga docente' :
    r.tipo === 'Disponibilidad' ? 'Espacios disponibles' : r.tipo,
    r.formato,
    r.generadoPorNombre || 'Usuario del sistema',
    r.filas ? `${r.filas} filas` : '—',
    formatearFecha(r.created_at),
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['#', 'Tipo de reporte', 'Formato', 'Generado por', 'Registros', 'Fecha y hora']],
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
      0: { halign: 'center', cellWidth: 12 },
      1: { fontStyle: 'bold', cellWidth: 55 },
      2: { halign: 'center', cellWidth: 30 },
      3: { cellWidth: 70 },
      4: { halign: 'center', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 50 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const fecha = new Date().toLocaleDateString('es-EC');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 150, 160);
  doc.text(`Generado el ${fecha} desde el Sistema de Gestión Institucional`, 14, 202);

  doc.save(`Bitacora_Reportes_ESPOCH_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportarWordHistorial = async (
  reportes: Reporte[],
  tituloExtra: string = 'TODOS LOS REGISTROS',
) => {
  const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const bordeGris = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' };
  const bordesCelda = { top: bordeGris, bottom: bordeGris, left: sinBorde, right: sinBorde };

  const encabezadoTabla = new TableRow({
    tableHeader: true,
    children: ['#', 'Tipo de reporte', 'Formato', 'Generado por', 'Registros', 'Fecha y hora'].map(
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

  const filasTabla = reportes.map((r, index) => new TableRow({
    children: [
      String(index + 1),
      r.tipo === 'Horarios' ? 'Horarios por aula' :
      r.tipo === 'Docentes' ? 'Carga docente' :
      r.tipo === 'Disponibilidad' ? 'Espacios disponibles' : r.tipo,
      r.formato,
      r.generadoPorNombre || 'Usuario del sistema',
      r.filas ? `${r.filas} filas` : '—',
      formatearFecha(r.created_at),
    ].map((val, idx) => new TableCell({
      borders: bordesCelda,
      shading: index % 2 === 1 ? { fill: 'F8FAFC' } : undefined,
      children: [new Paragraph({
        children: [new TextRun({
          text: val,
          bold: idx === 1,
          size: 17,
          color: idx === 2 ? (val === 'PDF' ? 'DC2626' : '2563EB') : '334155',
        })],
        alignment: idx === 0 || idx === 2 || idx === 4 ? AlignmentType.CENTER : (idx === 5 ? AlignmentType.RIGHT : AlignmentType.LEFT),
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
          children: [new TextRun({ text: `BITÁCORA DE AUDITORÍA Y HISTORIAL DE REPORTES · ${tituloExtra.toUpperCase()}`, size: 18, color: '64748B' })],
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
  a.download = `Bitacora_Reportes_ESPOCH_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
