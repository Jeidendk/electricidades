// GENERADO por scripts/transcribir-solicitudes.mjs — no editar a mano.
//
// Transcripción literal de las solicitudes del repositorio de la Carrera de Electricidad.
// Los marcadores entre corchetes son los del documento original y se rellenan al generar.
// Regenerar con:  node scripts/transcribir-solicitudes.mjs

export interface PlantillaSolicitud {
  /** Nombre del documento en el repositorio. */
  nombre: string;
  /** Líneas del destinatario, tal como están escritas en el oficio. */
  destinatario: string[];
  asunto: string;
  /** Párrafos del cuerpo, con sus marcadores [ASÍ] sin tocar. */
  cuerpo: string[];
  /** Lista de "Documentos adjuntos"; vacía si el oficio no pide ninguno. */
  adjuntos: string[];
  /** Nota final de norma y plazo, cuando el documento la trae. */
  referencia: string;
  /** El original incluye una tabla que el generador todavía no dibuja. */
  tieneTabla: boolean;
  /** Documento de origen, para volver a compararlo. */
  docId: string;
}

export const plantillasSolicitudes: PlantillaSolicitud[] = [
  {
    "nombre": "Justificacion Inasistencia 6 a 20 dias",
    "destinatario": [
      "SEÑOR/A DECANO/A DE LA FACULTAD DE INFORMÁTICA Y ELECTRÓNICA"
    ],
    "asunto": "Justificación de inasistencia a clases del sexto al vigésimo día",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE], con cédula de identidad [NÚMERO DE CÉDULA], código estudiantil [CÓDIGO ESTUDIANTIL], estudiante del PAO [NÚMERO DE PAO] de la Carrera de Electricidad, solicito se justifiquen mis inasistencias comprendidas entre el [FECHA DE INICIO] y el [FECHA DE FIN], equivalentes a [NÚMERO] días.",
      "La inasistencia se produjo por [DESCRIBIR EL MOTIVO]. Me reincorporé a clases el [FECHA DE REINCORPORACIÓN]. Adjunto los documentos que sustentan mi petición y solicito se comunique la resolución a la Coordinación de Carrera y a los profesores de las asignaturas afectadas.",
      "Asignaturas afectadas:"
    ],
    "adjuntos": [
      "Documento(s) que justifica(n) la inasistencia.",
      "Copia de la cédula de identidad."
    ],
    "referencia": "Referencia normativa y plazo: RRA ESPOCH, art. 38 lit. c). Desde el sexto hasta el vigésimo día de inasistencia, la justificación corresponde al Decanato de Facultad y debe presentarse dentro de los cinco (5) días término posteriores a la reincorporación a clases.",
    "tieneTabla": true,
    "docId": "1R1lrDo-4yyxTl_pfRRh4gbk4lBob7hzy"
  },
  {
    "nombre": "Justificacion Inasistencia Examen Complexivo",
    "destinatario": [
      "MIEMBROS DE LA COMISIÓN DE TITULACIÓN DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Justificación de inasistencia al Examen de carácter complexivo",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], justifico mi inasistencia al Examen de carácter complexivo programado para el [FECHA] a las [HORA].",
      "La inasistencia se produjo por [DESCRIBIR LA CAUSA FORTUITA O DE FUERZA MAYOR], circunstancia que acredito con la documentación adjunta. Solicito se suspenda la evaluación prevista y se fije una nueva fecha para su rendición.",
      "Documento adjunto:",
      "1. Documentación que acredita la causa fortuita o de fuerza mayor."
    ],
    "adjuntos": [],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1LW9hgQmUXJWOqhEn35P0KgSTECRZBjVH"
  },
  {
    "nombre": "Justificacion Inasistencia Gira",
    "destinatario": [
      "Ingeniero Andrés Morocho, Mgs.",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Justificación de inasistencia a gira de observación o visita de campo",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], estudiante del PAO [NÚMERO], justifico mi imposibilidad de participar en la gira de observación o visita de campo de la asignatura [ASIGNATURA], programada para el [FECHA] en [LUGAR].",
      "La inasistencia se debe a [DESCRIBIR LA RAZÓN EXCEPCIONAL]. Adjunto la documentación de respaldo y solicito se comunique la justificación al profesor de la asignatura para la aplicación del componente de evaluación que corresponda."
    ],
    "adjuntos": [
      "Documentación que acredita la razón excepcional."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1P1ck6FfmhjfU39WXAKypXJEVSmv2kTJ0"
  },
  {
    "nombre": "Justificacion Inasistencia hasta 5 dias",
    "destinatario": [
      "Ing. Andrés Fernando Morocho Caiza",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Justificación de inasistencia a clases hasta por cinco días",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE], con cédula de identidad [NÚMERO DE CÉDULA], código estudiantil [CÓDIGO ESTUDIANTIL], estudiante del PAO [NÚMERO DE PAO] de la Carrera de Electricidad, solicito se justifiquen mis inasistencias comprendidas entre el [FECHA DE INICIO] y el [FECHA DE FIN], equivalentes a [NÚMERO DE DÍAS] día(s).",
      "La inasistencia se produjo por [DESCRIBIR EL MOTIVO]. Me reincorporé a clases el [FECHA DE REINCORPORACIÓN]. Adjunto los documentos que sustentan mi petición.",
      "Asignaturas afectadas:"
    ],
    "adjuntos": [
      "Documento(s) que justifica(n) la inasistencia.",
      "Copia de la cédula de identidad."
    ],
    "referencia": "Referencia normativa y plazo: RRA ESPOCH, art. 38 lit. c). Para inasistencias de hasta cinco (5) días, la justificación se presenta ante la Coordinación de Carrera dentro de los cinco (5) días término posteriores a la reincorporación a clases.",
    "tieneTabla": true,
    "docId": "12yt8bnBihW7s6toPXPBd4AYFVdCpkq49"
  },
  {
    "nombre": "Justificacion Inasistencia Sustentacion",
    "destinatario": [
      "MIEMBROS DE LA COMISIÓN DE TITULACIÓN DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Justificación de inasistencia a la sustentación del Trabajo de Titulación",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], autor/a del Trabajo de Titulación denominado “[TÍTULO]”, justifico mi inasistencia a la sustentación programada para el [FECHA] a las [HORA].",
      "La inasistencia se produjo por [DESCRIBIR EL CASO FORTUITO O FUERZA MAYOR], circunstancia que acredito con la documentación adjunta. Solicito se acepte la justificación, se suspenda la sustentación prevista y se establezca una nueva fecha.",
      "Documento adjunto:",
      "1. Documentación que acredita el caso fortuito o fuerza mayor."
    ],
    "adjuntos": [],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1T9WCs7auefeslwEr2kevMAdbC3dWURsb"
  },
  {
    "nombre": "Solicitud Adelanto Practicas Preprofesionales",
    "destinatario": [
      "Señores/as",
      "MIEMBROS DE LA COMISIÓN DE CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de adelanto de prácticas preprofesionales",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], estudiante del [PAO/NIVEL] de la Carrera de Electricidad, solicito a la Comisión de Carrera autorizar el adelanto de mis prácticas preprofesionales en el componente [PRÁCTICAS LABORALES / SERVICIO COMUNITARIO], durante el período académico [PERÍODO].",
      "La solicitud tiene como finalidad [MOTIVO ACADÉMICO DEL ADELANTO]. Declaro conocer que la autorización está sujeta al análisis de la Comisión de Carrera, a la naturaleza de la Carrera, a los resultados de aprendizaje y a los requisitos previstos en la Guía de Prácticas Preprofesionales.",
      "Para prácticas de servicio comunitario, declaro haber aprobado todas las asignaturas del PAO 2. Para prácticas laborales, solicito se verifique que cumplo el PAO mínimo definido por la Comisión de Carrera. Asimismo, conozco que, si desisto o incumplo las actividades planificadas del proceso de adelanto, no podré solicitar nuevamente este mecanismo."
    ],
    "adjuntos": [
      "Récord académico actualizado.",
      "Documentación adicional que sustente el pedido, si corresponde: [DETALLAR]."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1heRERgpdDWWFXuz2T8beqIrnae-O0D8q"
  },
  {
    "nombre": "Solicitud Concluir Proceso Titulacion",
    "destinatario": [
      "[NOMBRES Y APELLIDOS DE LA AUTORIDAD]",
      "DECANO/A DE LA FACULTAD DE INFORMÁTICA Y ELECTRÓNICA"
    ],
    "asunto": "Solicitud para concluir el proceso de titulación después del plazo establecido",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], manifiesto que he cumplido los requisitos académicos y administrativos establecidos por la Carrera para la graduación; sin embargo, no concluí el proceso de titulación dentro del plazo establecido.",
      "El incumplimiento se produjo por [EXPONER LOS MOTIVOS DEBIDAMENTE JUSTIFICADOS, FECHAS Y GESTIONES REALIZADAS]. Por lo expuesto, solicito se autorice la conclusión de mi proceso de titulación."
    ],
    "adjuntos": [
      "Documentación que justifica el incumplimiento del plazo.",
      "Constancias del estado del proceso de titulación."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1E7KauWnfzX3vKlu3s7E3aNk1jtDF2oQj"
  },
  {
    "nombre": "Solicitud de Cambio Director Trabajo Titulacion",
    "destinatario": [
      "MIEMBROS DE LA COMISIÓN DE TITULACIÓN DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de cambio de Director/a del Trabajo de Titulación",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], autor/a del Trabajo de Titulación denominado “[TÍTULO]”, solicito el cambio del/de la Director/a [NOMBRE DEL DIRECTOR/A ACTUAL].",
      "La petición se fundamenta en [EXPLICAR DE MANERA OBJETIVA Y DOCUMENTADA LAS RAZONES]. El estado actual del trabajo es [DESCRIBIR AVANCE, ACTIVIDADES PENDIENTES Y FECHAS RELEVANTES]. Solicito se designe un/a nuevo/a Director/a para garantizar la continuidad del proceso."
    ],
    "adjuntos": [
      "Documentos que sustentan las razones de la solicitud.",
      "Evidencias del avance del Trabajo de Titulación."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1kkbNbDD_GbReXHohM-j0spGuVwz0rfHh"
  },
  {
    "nombre": "Solicitud Devolucion Valores",
    "destinatario": [
      "Ingeniero Andrés Morocho, Mgs.",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de devolución de valores",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], solicito la devolución del valor de [VALOR] pagado el [FECHA DE PAGO], correspondiente a la factura No. [NÚMERO], por concepto de [CONCEPTO].",
      "La devolución se solicita con sustento en la anulación de matrícula autorizada por el Consejo Politécnico mediante Resolución [NÚMERO Y FECHA], por la causa [INDICAR]. Solicito se emita el informe correspondiente a la Dirección Financiera."
    ],
    "adjuntos": [
      "Factura.",
      "Comprobante del banco.",
      "Formulario SPI de la Dirección Financiera.",
      "Certificación bancaria de cuenta activa del estudiante.",
      "Copia de la cédula de identidad."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1x07zhNu4c_fbwMTf0nlbYsbf1Yangs4L"
  },
  {
    "nombre": "Solicitud Evaluacion Medios Tecnologicos",
    "destinatario": [
      "Ingeniero Pablo Lozada",
      "SUBDECANO DE LA FACULTAD DE INFORMÁTICA Y ELECTRÓNICA"
    ],
    "asunto": "Solicitud excepcional para rendir evaluación utilizando medios tecnológicos",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], estudiante del PAO [NÚMERO], solicito autorización excepcional para rendir utilizando medios tecnológicos la evaluación de [MEDIO CICLO / FIN DE CICLO / RECUPERACIÓN] de la asignatura [ASIGNATURA], prevista para el [FECHA] a las [HORA].",
      "La petición se fundamenta en [DESCRIBIR LA CIRCUNSTANCIA EXCEPCIONAL]. Adjunto la documentación de respaldo y manifiesto mi disposición para cumplir las condiciones institucionales que se establezcan."
    ],
    "adjuntos": [
      "Documentación que acredita la circunstancia excepcional.",
      "Copia de la cédula de identidad."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1pWDYA6ghwUu6VHvkc9o2sjwX55jYflt-"
  },
  {
    "nombre": "Solicitud Examen Recuperacion Complexivo",
    "destinatario": [
      "MIEMBROS DE LA COMISIÓN DE TITULACIÓN DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de examen de grado de recuperación de carácter complexivo",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], solicito se autorice y programe el examen de grado de recuperación de carácter complexivo.",
      "El primer examen fue receptado el [FECHA] y obtuve la calificación promedio de [NOTA] sobre diez, inferior a la calificación mínima requerida. Solicito se me notifique la fecha, hora y lugar de la evaluación de recuperación."
    ],
    "adjuntos": [],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1DTLpEasFRl3Z9OjJrvEtOwApcNIQWY9f"
  },
  {
    "nombre": "Solicitud Habilitacion Matricula Pendiente",
    "destinatario": [
      "Ingeniero Andrés Morocho, Mgs.",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de habilitación y legalización de matrícula pendiente por responsabilidad administrativa",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], solicito se gestione la habilitación y legalización de mi matrícula pendiente correspondiente al período académico [PERÍODO].",
      "La matrícula no fue legalizada por la siguiente circunstancia administrativa no atribuible a mi responsabilidad: [DESCRIBIR EL HECHO, LAS GESTIONES REALIZADAS Y LAS FECHAS]. Solicito se motive el pedido a través del Subdecanato ante el Consejo Politécnico y, de aprobarse, se habilite el sistema académico institucional YANKAY para la legalización correspondiente."
    ],
    "adjuntos": [
      "Documentos, capturas, comunicaciones o constancias que evidencien la responsabilidad administrativa.",
      "Copia de la cédula de identidad."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1AwlOvbhAIbeXtFLlYKR9Uj0RkyyYpRkg"
  },
  {
    "nombre": "Solicitud Homologacion Asignaturas",
    "destinatario": [
      "Ingeniero",
      "Andrés Fernando Morocho Caiza, Mgs.",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de homologación de asignaturas",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad No. [NÚMERO DE CÉDULA], código estudiantil [CÓDIGO ESTUDIANTIL], estudiante de la Carrera de Electricidad, solicito se analice la homologación de la(s) asignatura(s) detallada(s) a continuación, con base en los estudios aprobados en la carrera o institución de origen y conforme al Reglamento de Régimen Académico de la ESPOCH.",
      "INFORMACIÓN DEL ESTUDIANTE Y DE LA MOVILIDAD",
      "Tipo de movilidad",
      "☐ Externa (otra IES)",
      "ASIGNATURAS PARA HOMOLOGACIÓN",
      "DOCUMENTOS QUE ADJUNTO",
      "☐ Sílabos o contenidos mínimos certificados por la institución de origen.",
      "Declaro que las asignaturas indicadas fueron aprobadas y que la información y documentación presentada son auténticas."
    ],
    "adjuntos": [],
    "referencia": "",
    "tieneTabla": true,
    "docId": "1Mq6MlMMmScXX9Nv10p4ZA41yXghONeTJ"
  },
  {
    "nombre": "Solicitud Homologacion Practicas Preprofesionales",
    "destinatario": [
      "Ing. Andrés Fernando Morocho Caiza",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de convalidación de prácticas preprofesionales por actividad laboral o extracurricular",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE], con cédula de identidad [NÚMERO DE CÉDULA], código estudiantil [CÓDIGO ESTUDIANTIL], solicito se verifique y valide la documentación adjunta para la homologación/convalidación de prácticas preprofesionales por una actividad laboral o extracurricular pertinente al perfil de la Carrera de Electricidad.",
      "COMPONENTE SOLICITADO",
      "[PRÁCTICAS LABORALES / PRÁCTICAS DE SERVICIO COMUNITARIO]",
      "ACTIVIDAD QUE SUSTENTA LA SOLICITUD",
      "• [FUNCIONES DESEMPEÑADAS EN EMPRESA PÚBLICA, PRIVADA U ORGANIZACIÓN].",
      "• [PARTICIPACIÓN EN CONCURSO NACIONAL O INTERNACIONAL COMO REPRESENTANTE INSTITUCIONAL].",
      "• [UNIDAD DE NEGOCIO O PRODUCTIVA CON AL MENOS UN AÑO DE FUNCIONAMIENTO].",
      "• [ACTIVIDAD PERMANENTE DEL CENTRO DE ARTE, CULTURA E INTERCULTURALIDAD].",
      "• [PARTICIPACIÓN EN CLUB ESTUDIANTIL INSTITUCIONAL RECONOCIDO].",
      "• [AYUDANTÍA DE DOCENCIA O INVESTIGACIÓN, CUANDO CORRESPONDA].",
      "• [OTRA ACTIVIDAD EXTRACURRICULAR PERTINENTE PREVISTA EN LA NORMATIVA].",
      "Campo"
    ],
    "adjuntos": [
      "[COPIA NOTARIZADA DEL DOCUMENTO QUE ACREDITA LA ACTIVIDAD LABORAL O EXTRACURRICULAR, CUANDO CORRESPONDA].",
      "[CERTIFICADO INSTITUCIONAL CON FECHAS, HORAS Y ACTIVIDADES REALIZADAS].",
      "[INFORMES, PLANES, PRODUCTOS O EVIDENCIAS VERIFICABLES].",
      "[CERTIFICADO DEL CENTRO DE ARTE, CULTURA E INTERCULTURALIDAD O DEL CLUB INSTITUCIONAL, SI CORRESPONDE].",
      "[DOCUMENTACIÓN DE AYUDANTÍA, SI CORRESPONDE].",
      "[OTROS DOCUMENTOS DE RESPALDO]."
    ],
    "referencia": "Referencia normativa y plazo: RRA ESPOCH, art. 202 lit. g), y Guía de Prácticas Preprofesionales, sección 6. La actividad laboral o extracurricular debe aportar al desarrollo de competencias profesionales y estar debidamente documentada. La guía dispone que el trámite de convalidación puede realizarse hasta antes de finalizar el penúltimo PAO del plan de estudios.",
    "tieneTabla": true,
    "docId": "1j4GYNoTpe4v7KVjkDgnG93pk1waJRtwk"
  },
  {
    "nombre": "Solicitud Inicio Practicas Preprofesionales",
    "destinatario": [
      "Ing. Andrés Fernando Morocho Caiza",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de inicio del proceso de prácticas preprofesionales y emisión del Anexo A",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE], con cédula de identidad [NÚMERO DE CÉDULA], código estudiantil [CÓDIGO ESTUDIANTIL], solicito iniciar el proceso de prácticas preprofesionales y gestionar la emisión del Anexo A dirigido a la entidad receptora, con base en la información siguiente.",
      "Campo",
      "Área o actividades previstas: [DESCRIBIR BREVEMENTE EL ÁREA Y LAS ACTIVIDADES QUE SE PREVÉ DESARROLLAR].",
      "DOCUMENTO HABILITANTE",
      "• [EXISTE CONVENIO VIGENTE: indicar número de convenio, oficio o resolución y adjuntar evidencia de vigencia].",
      "• [LAS PRÁCTICAS SE EJECUTARÁN EN UN PROYECTO APROBADO: adjuntar resolución/documento de aprobación].",
      "• [NO EXISTE CONVENIO NI PROYECTO APROBADO: adjuntar los documentos requeridos para gestionar la Carta de Intención, incluido el documento habilitante del representante legal]."
    ],
    "adjuntos": [],
    "referencia": "Referencia normativa y plazo: Guía de Prácticas Preprofesionales ESPOCH, fase 1.3 y Anexo A. La solicitud institucional a la organización debe gestionarse hasta veinte (20) días antes del inicio del PAO; la autorización de la entidad receptora es requisito para iniciar las prácticas y debe obtenerse hasta el último día de matrículas extraordinarias. Este formato es una ficha interna para que el estudiante entregue a Coordinación los datos necesarios; no reemplaza el Anexo A oficial.",
    "tieneTabla": true,
    "docId": "1RotmrafYU5lEePmlQxCTNwQXX7KFM5l_"
  },
  {
    "nombre": "Solicitud Matricula Especial",
    "destinatario": [
      "SEÑORES MIEMBROS DEL CONSEJO POLITÉCNICO"
    ],
    "asunto": "Solicitud de matrícula especial",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE], con cédula de identidad [NÚMERO DE CÉDULA], código estudiantil [CÓDIGO ESTUDIANTIL], estudiante de la Carrera de Electricidad, solicito se me conceda matrícula especial para el período académico [PERÍODO ACADÉMICO].",
      "No pude matricularme de manera ordinaria ni extraordinaria debido a la siguiente circunstancia de caso fortuito o fuerza mayor: [DESCRIBIR EL HECHO, LAS FECHAS Y LA FORMA EN QUE IMPIDIÓ REALIZAR LA MATRÍCULA].",
      "Solicito que se analicen los justificativos presentados y, de ser procedente, se autorice la matrícula especial en las asignaturas que correspondan conforme a mi situación académica."
    ],
    "adjuntos": [
      "Justificativos que demuestren las circunstancias de caso fortuito o fuerza mayor.",
      "Copia de la cédula de identidad.",
      "Otros documentos de respaldo que correspondan."
    ],
    "referencia": "Referencia normativa y plazo: RRA ESPOCH (codificado con reforma 450.CP.2026), art. 153 lit. c). Puede gestionarse hasta quince (15) días término posteriores a la culminación de matrículas extraordinarias; deben adjuntarse justificativos de caso fortuito o fuerza mayor. Concedida la matrícula, existe un término de cinco (5) días para hacerla efectiva.",
    "tieneTabla": false,
    "docId": "1QcqbeHCYhVF0yxuIG6lVur1c25xoYJ6j"
  },
  {
    "nombre": "Solicitud Movilidad Excepcional Asignatura",
    "destinatario": [
      "Ingeniero Andrés Morocho, Mgs.",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud justificada para cursar asignatura(s) con movilidad en otra carrera",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], estudiante del PAO [NÚMERO], solicito se analice la posibilidad de cursar con movilidad la(s) asignatura(s) [ASIGNATURA(S)] en la Carrera [CARRERA RECEPTORA].",
      "La petición corresponde a un caso excepcional por mantener arrastre(s) y se fundamenta en [EXPLICAR]. La asignatura propuesta en la carrera receptora es [ASIGNATURA], con horario [HORARIO]. Solicito que se verifique la similitud mínima del ochenta por ciento (80%) de los contenidos y, de ser procedente, se tramite la autorización del Decano/a de Facultad."
    ],
    "adjuntos": [
      "Sílabo o contenidos de la asignatura de la carrera receptora, si se dispone.",
      "Horario de la asignatura propuesta.",
      "Documentación que sustenta el caso excepcional."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1BBNx4fQmEUV8hsfLj9n_6K_6gm0TRUVb"
  },
  {
    "nombre": "Solicitud Nueva Fecha Sustentacion",
    "destinatario": [
      "MIEMBROS DE LA COMISIÓN DE TITULACIÓN DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de nueva fecha para la sustentación del Trabajo de Titulación",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], autor/a del Trabajo de Titulación denominado “[TÍTULO]”, solicito se fije una nueva fecha para la sustentación.",
      "La primera sustentación se realizó el [FECHA] y obtuve la calificación promedio de [NOTA] sobre diez, inferior a la mínima requerida. Solicito se programe la segunda oportunidad y se me notifique la fecha, hora y lugar."
    ],
    "adjuntos": [],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1SlJwpFTclkSumuyXfgHq5NlyrHsRmjNa"
  },
  {
    "nombre": "Solicitud Recalificacion Evaluacion",
    "destinatario": [
      "Ing. Pablo Lozada",
      "SUBDECANO DE LA FACULTAD DE INFORMÁTICA Y ELECTRÓNICA"
    ],
    "asunto": "Solicitud de recalificación de evaluación",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE], con cédula de identidad [NÚMERO DE CÉDULA], código estudiantil [CÓDIGO ESTUDIANTIL], estudiante del PAO [NÚMERO DE PAO], solicito la recalificación de la evaluación de [MEDIO CICLO / FIN DE CICLO / RECUPERACIÓN] de la asignatura [ASIGNATURA], impartida por [PROFESOR/A].",
      "El acta de calificaciones fue registrada en el sistema académico institucional el [FECHA]. La petición se fundamenta en los siguientes aspectos concretos: [DETALLAR PREGUNTAS, CRITERIOS, PUNTAJES O COMPONENTES QUE SOLICITA REVISAR]."
    ],
    "adjuntos": [
      "Documentación de respaldo que el estudiante considere pertinente, si dispone de ella."
    ],
    "referencia": "Referencia normativa y plazo: RRA ESPOCH, art. 37 lit. a). La solicitud de recalificación se presenta al Subdecanato dentro de los dos (2) días término subsiguientes al registro del acta de calificaciones en YANKAY.",
    "tieneTabla": false,
    "docId": "131-rr5NF5IzzHHdEq4WZ07uHqzn6K4UY"
  },
  {
    "nombre": "Solicitud Recalificacion Examen Complexivo",
    "destinatario": [
      "Ingeniero Andrés Morocho, Mgs.",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de recalificación del examen de grado de carácter complexivo",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], solicito la recalificación del examen complexivo [INICIAL / DE RECUPERACIÓN], cuyos resultados fueron publicados el [FECHA].",
      "La petición se fundamenta en los siguientes aspectos concretos: [DETALLAR COMPONENTES, PREGUNTAS, CRITERIOS O PUNTAJES OBJETO DE RECALIFICACIÓN]."
    ],
    "adjuntos": [],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1HS1DM4RmiRFdC1Rs9HXmJCb7sQdE0fC_"
  },
  {
    "nombre": "Solicitud Reingreso Carrera",
    "destinatario": [
      "Ing. Andrés Fernando Morocho Caiza",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de reingreso a la Carrera de Electricidad",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE], con cédula de identidad [NÚMERO DE CÉDULA], código estudiantil [CÓDIGO ESTUDIANTIL], solicito autorice mi reingreso a la Carrera de Electricidad para el período académico [PERÍODO DE REINGRESO].",
      "Mi último período académico legalmente matriculado fue [PERÍODO ACADÉMICO]; cursé el PAO [NÚMERO DE PAO] y la interrupción de mis estudios se produjo desde [FECHA O PERÍODO]. El motivo de la interrupción fue [INDICAR BREVEMENTE].",
      "Para el análisis de mi situación académica, solicito se determine el PAO y la malla curricular que me correspondan, considerando la fecha del último período cursado, las asignaturas aprobadas y, cuando proceda, la homologación, acreditación, tabla de transición o validación de conocimientos.",
      "De aprobarse el reingreso, solicito se notifique al Decanato Académico para que se active mi cupo en el sistema académico institucional YANKAY."
    ],
    "adjuntos": [
      "Copia de la cédula de identidad.",
      "Documentación relacionada con la interrupción de estudios, cuando corresponda."
    ],
    "referencia": "Referencia normativa y plazo: RRA ESPOCH, art. 180. La solicitud de reingreso se presenta en las fechas establecidas para matrículas ordinarias; la interrupción de estudios no debe exceder diez (10) años desde el último período académico cursado.",
    "tieneTabla": false,
    "docId": "1YhpeXV2tRFHjkUqoYclQgU48EHG3rLth"
  },
  {
    "nombre": "Solicitud Reingreso Modulo Titulacion",
    "destinatario": [
      "Ingeniero Andrés Morocho, Mgs.",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de reingreso al Módulo de Titulación",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], solicito autorice mi reingreso al Módulo de Titulación y el registro correspondiente en el sistema académico institucional YANKAY.",
      "Causa del reingreso: [NO OBTUVE LA TITULACIÓN DENTRO DEL PRIMER PLAZO / NO APROBÉ EL EXAMEN COMPLEXIVO DE RECUPERACIÓN Y DEBO ACOGERME A UNA MODALIDAD DE TRABAJO DE TITULACIÓN]. El plazo o proceso anterior concluyó el [FECHA]. Mi opción o modalidad es [INDICAR] y el tema registrado o propuesto es [TEMA].",
      "Solicito se emita el informe académico, se autorice el registro que corresponda y, cuando aplique, se notifique al Decanato Académico para mi activación en el sistema."
    ],
    "adjuntos": [
      "Comprobante de pago del valor correspondiente, cuando aplique.",
      "Documentación del proceso de titulación.",
      "Propuesta de Trabajo de Titulación con tema, objetivo general, modalidad, línea de investigación y ODS, cuando corresponda."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "14ajDfKqPYIlGNKnfV_XFaizM2aCMDSfP"
  },
  {
    "nombre": "Solicitud Rendir Evaluacion Atrasada",
    "destinatario": [
      "Ing. Andrés Fernando Morocho Caiza",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud para rendir evaluación atrasada",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE], con cédula de identidad [NÚMERO DE CÉDULA], código estudiantil [CÓDIGO ESTUDIANTIL], estudiante del PAO [NÚMERO DE PAO], solicito autorización para rendir la evaluación atrasada de [MEDIO CICLO / FIN DE CICLO / RECUPERACIÓN] de la asignatura [ASIGNATURA], a cargo de [PROFESOR/A].",
      "La evaluación fue receptada el [FECHA] a las [HORA] y no pude presentarme por [IMPOSIBILIDAD FÍSICA POR MOTIVOS DE SALUD / FALLECIMIENTO DE FAMILIAR HASTA SEGUNDO GRADO DE CONSANGUINIDAD Y PRIMERO DE AFINIDAD / OTRO CASO QUE SE CONSIDERE PERTINENTE]. Adjunto los documentos que justifican mi inasistencia."
    ],
    "adjuntos": [
      "Documentos que justifiquen la inasistencia.",
      "Copia de la cédula de identidad."
    ],
    "referencia": "Referencia normativa y plazo: RRA ESPOCH, art. 32 lit. h). La solicitud para rendir evaluación atrasada debe presentarse a la Coordinación de Carrera dentro de un máximo de tres (3) días laborables desde la fecha de la evaluación, con documentos justificativos. La evaluación autorizada se recepta dentro del término previsto en el mismo artículo.",
    "tieneTabla": false,
    "docId": "1RRtOTZG6i4NtJeMnbXy-DYsO3hijhwLj"
  },
  {
    "nombre": "Solicitud Retiro Asignaturas",
    "destinatario": [
      "Ingeniero Andrés Morocho, Mgs.",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de retiro de una o varias asignaturas",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], estudiante legalmente matriculado en el período académico [PERÍODO], solicito autorización para retirarme de la(s) asignatura(s) detallada(s) a continuación.",
      "Motivo de la solicitud: [EXPLICAR]. Declaro conocer que no puedo solicitar retiro de asignaturas con arrastre y que el retiro de una asignatura puede realizarse una sola vez.",
      "Asignaturas afectadas:"
    ],
    "adjuntos": [],
    "referencia": "",
    "tieneTabla": true,
    "docId": "1MT3DEM38e4fb_1mNb0om8CJu6-Cr_FJx"
  },
  {
    "nombre": "Solicitud Retiro Matricula PAO",
    "destinatario": [
      "Ingeniero Pablo Lozada",
      "SUBDECANO DE LA FACULTAD DE INFORMÁTICA Y ELECTRÓNICA"
    ],
    "asunto": "Solicitud de retiro de matrícula del período académico",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], estudiante legalmente matriculado en el período académico [PERÍODO], solicito autorice el retiro de todas las asignaturas matriculadas en el período académico vigente.",
      "La petición se fundamenta en [ENFERMEDAD GRAVE / CALAMIDAD DOMÉSTICA / ACCIDENTE QUE REQUIERA HOSPITALIZACIÓN O TRATAMIENTO PERMANENTE]. El hecho ocurrió el [FECHA] y ha impedido el desarrollo normal de mis actividades académicas. Adjunto la documentación de respaldo."
    ],
    "adjuntos": [
      "Documentación que acredita el caso de excepción.",
      "Certificados médicos emitidos por el médico especialista, cuando corresponda, con firma, sello y número de cédula del profesional, y exámenes que corroboren el diagnóstico.",
      "Copia de la cédula de identidad."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1zt1b3-CXhWipmBm0nejUaM7rNSs0_sXT"
  },
  {
    "nombre": "Solicitud Retiro Matricula PAO mas 20 dias",
    "destinatario": [
      "Ing. Andrés Fernando Morocho Caiza",
      "COORDINADOR DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de retiro de matrícula de todo el PAO por inasistencia superior a veinte días",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE], con cédula de identidad [NÚMERO DE CÉDULA], código estudiantil [CÓDIGO ESTUDIANTIL], estudiante del PAO [NÚMERO DE PAO] y legalmente matriculado/a en el período académico [PERÍODO ACADÉMICO], solicito autorice el retiro de la matrícula correspondiente a todo el PAO, es decir, de todas las asignaturas en las que me encuentro matriculado/a.",
      "La presente solicitud se fundamenta en una inasistencia superior a veinte (20) días, comprendida entre [FECHA DE INICIO] y [FECHA DE FIN O FECHA ACTUAL], originada por [DESCRIBIR EL MOTIVO]. Adjunto los justificativos correspondientes para que se analice la procedencia del retiro.",
      "Solicito se verifique mi matrícula y asistencia en el sistema académico institucional y se disponga el trámite que corresponda."
    ],
    "adjuntos": [
      "[JUSTIFICATIVOS QUE ACREDITAN EL MOTIVO Y EL PERÍODO DE INASISTENCIA].",
      "[DOCUMENTACIÓN ADICIONAL DE RESPALDO, SI CORRESPONDE]."
    ],
    "referencia": "Referencia normativa y plazo: RRA ESPOCH, art. 176 lit. a), en concordancia con el art. 38 lit. c). Si la inasistencia supera veinte (20) días, puede tramitarse el retiro de todo el PAO. El art. 176 lit. a) no fija un plazo autónomo para esta solicitud; debe sustentarse con los justificativos correspondientes durante el período académico vigente.",
    "tieneTabla": false,
    "docId": "1vWFV6fFC0gl937yz0BlKRoyFUWLTQweT"
  },
  {
    "nombre": "Solicitud Sustentacion Individual",
    "destinatario": [
      "MIEMBROS DE LA COMISIÓN DE TITULACIÓN DE LA CARRERA DE ELECTRICIDAD"
    ],
    "asunto": "Solicitud de sustentación individual de Trabajo de Titulación desarrollado conjuntamente",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], coautor/a del Trabajo de Titulación denominado “[TÍTULO]”, desarrollado juntamente con [NOMBRE(S) DEL/DE LOS COAUTOR(ES)], solicito se autorice mi sustentación individual.",
      "La imposibilidad de realizar la sustentación conjunta se debe a [DESCRIBIR LA CIRCUNSTANCIA ACADÉMICA, CASO FORTUITO O FUERZA MAYOR]. Adjunto la documentación de respaldo y solicito continuar con el proceso con los mismos derechos establecidos en la normativa."
    ],
    "adjuntos": [
      "Documentación que justifica la imposibilidad de sustentar conjuntamente.",
      "Copia de la cédula de identidad."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "1fQX05rVqZla7Idp7PHGymdtzVH83MEZ7"
  },
  {
    "nombre": "Solicitud Tercera Matricula",
    "destinatario": [
      "Señor/a [NOMBRE DE LA AUTORIDAD]",
      "DECANO/A DE LA FACULTAD DE INFORMÁTICA Y ELECTRÓNICA"
    ],
    "asunto": "Solicitud de concesión de tercera matrícula",
    "cuerpo": [
      "Yo, [NOMBRES Y APELLIDOS], con cédula de identidad [NÚMERO], código estudiantil [CÓDIGO], estudiante de la Carrera de Electricidad, solicito se me conceda tercera matrícula en la(s) asignatura(s): [ASIGNATURA(S)], correspondiente(s) al [PAO/NIVEL], para el período académico [PERÍODO].",
      "Fundamento mi solicitud en la condición prevista en el artículo 164 del Reglamento de Régimen Académico: [INDICAR: RENDIMIENTO ACADÉMICO / ENFERMEDAD / CALAMIDAD DOMÉSTICA / ACCIDENTE CON HOSPITALIZACIÓN O TRATAMIENTO PERMANENTE / ALUMBRAMIENTO, PUERPERIO O VULNERABILIDAD DURANTE LA LACTANCIA]. Los hechos ocurrieron durante el período en que cursé la(s) asignatura(s) cuya tercera matrícula solicito y se sustentan con la documentación adjunta: [DESCRIBIR BREVEMENTE].",
      "De corresponder al criterio de rendimiento académico, declaro que mi promedio general de carrera en las asignaturas aprobadas es [PROMEDIO] y adjunto el récord académico. Cuando la causal sea médica, adjunto la certificación y los respaldos exigidos por la normativa."
    ],
    "adjuntos": [
      "Récord académico, cuando corresponda.",
      "Documentos justificativos de la causal invocada.",
      "En caso de causal médica: certificado emitido por médico especialista, con firma, sello y número de cédula profesional, y exámenes que corroboren el diagnóstico, según corresponda."
    ],
    "referencia": "",
    "tieneTabla": false,
    "docId": "14Vjkam0FKhWvGP5ES8WresonYVIMKwsc"
  }
];
