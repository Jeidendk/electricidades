import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface RecursoActa {
  tipo: string;        // Recurso / Espacio / Edificio
  nombre: string;
  ubicacion: string;
  estado: string;
}

export interface TecnicoActa {
  nombre: string;
  email: string;
  departamento: string;
}

const ROJO = '#b00000';

const encabezado = (doc: jsPDF) => {
  doc.setFillColor(ROJO);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO', 105, 13, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('FACULTAD DE INFORMÁTICA Y ELECTRÓNICA - CARRERA DE ELECTRICIDAD', 105, 21, { align: 'center' });
};

const infoTecnico = (doc: jsPDF, tecnico: TecnicoActa, y: number) => {
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold'); doc.text('Técnico responsable:', 20, y);
  doc.setFont('helvetica', 'normal'); doc.text(tecnico.nombre, 70, y);
  doc.setFont('helvetica', 'bold'); doc.text('Departamento:', 20, y + 7);
  doc.setFont('helvetica', 'normal'); doc.text(tecnico.departamento, 70, y + 7);
  doc.setFont('helvetica', 'bold'); doc.text('Correo:', 20, y + 14);
  doc.setFont('helvetica', 'normal'); doc.text(tecnico.email, 70, y + 14);
  doc.setFont('helvetica', 'bold'); doc.text('Fecha:', 130, y);
  doc.setFont('helvetica', 'normal'); doc.text(new Date().toLocaleDateString('es-EC'), 150, y);
};

const tablaRecursos = (doc: jsPDF, recursos: RecursoActa[], startY: number) => {
  autoTable(doc, {
    startY,
    head: [['#', 'Tipo', 'Recurso', 'Ubicación', 'Estado']],
    body: recursos.map((r, i) => [String(i + 1), r.tipo, r.nombre, r.ubicacion, r.estado]),
    theme: 'grid',
    headStyles: { fillColor: [176, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 251] },
    margin: { left: 20, right: 20 },
  });
  // @ts-expect-error lastAutoTable lo agrega el plugin
  return doc.lastAutoTable.finalY as number;
};

// Acta formal de entrega-recepción (con firmas)
export const generarActaAsignacion = (tecnico: TecnicoActa, recursos: RecursoActa[]) => {
  const doc = new jsPDF();
  encabezado(doc);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ACTA DE ENTREGA-RECEPCIÓN DE RECURSOS', 105, 42, { align: 'center' });
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 47, 190, 47);

  infoTecnico(doc, tecnico, 58);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Por medio del presente documento se deja constancia de la entrega de los siguientes recursos al técnico responsable, quien se compromete a su custodia y buen uso.',
    20, 80, { maxWidth: 170 }
  );

  const finalY = tablaRecursos(doc, recursos, 90);

  const firmaY = Math.min(finalY + 35, 260);
  doc.setFontSize(9);
  doc.line(30, firmaY, 90, firmaY);
  doc.text('Entregado por', 60, firmaY + 5, { align: 'center' });
  doc.line(120, firmaY, 180, firmaY);
  doc.text(tecnico.nombre, 150, firmaY + 5, { align: 'center' });
  doc.text('Recibido por (Técnico)', 150, firmaY + 10, { align: 'center' });

  doc.save(`acta_${tecnico.nombre.replace(/\s+/g, '_')}.pdf`);
};

// Reporte simple de recursos asignados
export const exportarAsignacionesPdf = (tecnico: TecnicoActa, recursos: RecursoActa[]) => {
  const doc = new jsPDF();
  encabezado(doc);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('REPORTE DE RECURSOS ASIGNADOS', 105, 42, { align: 'center' });
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 47, 190, 47);

  infoTecnico(doc, tecnico, 58);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(`Total asignados: ${recursos.length}`, 130, 72);

  tablaRecursos(doc, recursos, 82);
  doc.save(`recursos_${tecnico.nombre.replace(/\s+/g, '_')}.pdf`);
};
